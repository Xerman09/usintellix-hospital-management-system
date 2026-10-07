<?php

namespace App\Modules\InpatientOrders\Services;

use App\Core\Database;
use PDO;

/**
 * Medicine safety checks for an order: the patient's allergies (direct match and
 * cross-reactivity), the same medicine already ordered, two medicines of the same class,
 * and high-alert / controlled drugs.
 *
 * Each warning: ['type', 'severity' (block|warn|info), 'message'].
 *  - block: a direct allergy match. The doctor must give a reason to order it; the
 *    pharmacist must give a reason to verify it.
 *  - warn:  cross-reactivity, duplicates. Must be acknowledged.
 *  - info:  high-alert / controlled drug reminders.
 */
class MedSafetyService
{
    /**
     * Allergen (name on the allergy list, lower case) => [direct ingredient patterns, cross-reactive patterns, cross-reactivity note].
     * Patterns match whole words of the medicine's ingredients; a trailing * matches a word start.
     */
    public const ALLERGY_RULES = [
        'penicillin' => [['penicillin*', 'amoxicillin', 'ampicillin', 'cloxacillin', 'flucloxacillin', 'dicloxacillin', 'oxacillin', 'piperacillin', 'nafcillin'],
            ['cef*', 'ceph*', '*penem'], 'cephalosporins and carbapenems can cross-react with penicillin'],
        'amoxicillin' => [['amoxicillin'], ['penicillin*', 'ampicillin', 'cloxacillin', 'flucloxacillin', 'piperacillin'], 'other penicillins cross-react with amoxicillin'],
        'sulfa drugs (sulfonamides)' => [['sulfamethoxazole', 'sulfadiazine', 'sulfasalazine', 'cotrimoxazole', 'co-trimoxazole', 'sulfacetamide', 'sulfisoxazole'], [], ''],
        'aspirin' => [['aspirin', 'acetylsalicylic'], ['@NSAID'], 'NSAIDs can cause reactions in people allergic to aspirin'],
        'ibuprofen' => [['ibuprofen'], ['@NSAID'], 'other NSAIDs can cross-react with ibuprofen'],
        'cephalosporins' => [['cef*', 'ceph*'], ['penicillin*', 'amoxicillin', 'ampicillin', '*penem'], 'penicillins and carbapenems can cross-react with cephalosporins'],
        'codeine' => [['codeine'], ['@Opioid Analgesic'], 'other opioids may cross-react with codeine'],
        'morphine' => [['morphine'], ['@Opioid Analgesic'], 'other opioids may cross-react with morphine'],
        'local anesthetics' => [['lidocaine', 'lignocaine', 'bupivacaine', 'levobupivacaine', 'ropivacaine', 'mepivacaine', 'prilocaine', 'articaine', 'procaine', 'tetracaine', 'benzocaine'], [], ''],
        'contrast dye (iodine-based)' => [['iohexol', 'iopamidol', 'iodixanol', 'ioversol', 'iopromide', 'diatrizoate', 'iomeprol'], [], ''],
        'insulin' => [['insulin'], [], ''],
        'tetracycline' => [['tetracycline', 'doxycycline', 'minocycline', 'oxytetracycline'], [], ''],
        'erythromycin' => [['erythromycin'], ['azithromycin', 'clarithromycin', 'roxithromycin'], 'other macrolides can cross-react with erythromycin'],
        'vancomycin' => [['vancomycin'], [], ''],
        'eggs' => [[], ['propofol'], 'propofol contains egg lecithin; most egg-allergic patients tolerate it, but check'],
        'soy' => [[], ['propofol'], 'propofol contains soybean oil; check'],
        'sulfites' => [[], ['metabisulfite'], 'some injections contain sulfite preservatives'],
    ];

    /** Classes where two active medicines at once are a therapeutic duplicate worth flagging. */
    public const DUPLICATE_CLASSES = ['NSAID', 'Opioid Analgesic', 'Anticoagulant / Antiplatelet', 'Antibiotic', 'Antihypertensive',
        'Antidiabetic', 'Corticosteroid', 'Anxiolytic / Sedative', 'Antipsychotic', 'Antidepressant', 'Anticonvulsant', 'Antiemetic',
        'Antacid / Anti-ulcer', 'Lipid-lowering Agent', 'Analgesic / Antipyretic', 'Antihistamine'];

    /** Salt / form words dropped when comparing ingredients ("Losartan Potassium" = "losartan"). */
    private const SALTS = ['hydrochloride', 'hcl', 'sulfate', 'sulphate', 'bisulfate', 'sodium', 'potassium', 'calcium', 'magnesium', 'besilate',
        'besylate', 'maleate', 'tartrate', 'succinate', 'citrate', 'phosphate', 'acetate', 'mesylate', 'fumarate', 'bromide', 'chloride',
        'dihydrate', 'monohydrate', 'trihydrate', 'enteric-coated', 'enteric', 'coated', 'extended-release', 'er', 'sr', 'xr'];

    /** The medicine's active ingredients, e.g. "Amoxicillin + Clavulanic Acid" -> ["amoxicillin", "clavulanic acid"]. */
    public static function ingredients(array $drug): array
    {
        $src = strtolower((string) ($drug['generic_name'] ?: $drug['name']));
        $src = preg_replace('/\([^)]*\)/', ' ', $src);
        $out = [];
        foreach (preg_split('/\s*(?:\+|\/|,|\band\b)\s*/', $src) as $part) {
            $words = array_values(array_filter(preg_split('/[^a-z0-9%.-]+/', $part), fn($w) => $w !== '' && !in_array($w, self::SALTS, true)
                && !preg_match('/^[0-9.%]+$/', $w)));
            if ($words) {
                $out[] = implode(' ', $words);
            }
        }
        return array_values(array_unique($out));
    }

    /**
     * @param array $drug  row from drugs (+ category name as `category`)
     * @param int|null $excludeOrderId  when re-checking an existing order
     */
    public function check(int $patientId, int $admissionId, array $drug, ?int $excludeOrderId = null): array
    {
        $db = Database::connection();
        $warnings = [];
        $ingr = self::ingredients($drug);
        $category = (string) ($drug['category'] ?? '');

        // Allergies
        $stmt = $db->prepare(
            "SELECT a.name, pa.reaction, pa.severity FROM patient_allergies pa JOIN allergies a ON a.id = pa.allergy_id
             WHERE pa.patient_id = :p AND pa.deleted_at IS NULL AND (pa.end_date IS NULL OR pa.end_date >= CURDATE())"
        );
        $stmt->execute(['p' => $patientId]);
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $al) {
            $name = strtolower(trim($al['name']));
            $react = trim(implode(', ', array_filter([$al['reaction'], $al['severity']])));
            $rule = self::ALLERGY_RULES[$name] ?? null;
            $direct = $rule ? $rule[0] : [preg_replace('/\s*\(.*$/', '', $name)];
            if ($this->matches($ingr, $category, $direct)) {
                $warnings[] = ['type' => 'allergy', 'severity' => 'block',
                    'message' => "Allergy: the patient is allergic to {$al['name']}" . ($react ? " ({$react})" : '') . " and {$drug['name']} contains it."];
                continue;
            }
            if ($rule && $rule[1] && $this->matches($ingr, $category, $rule[1])) {
                $warnings[] = ['type' => 'allergy_cross', 'severity' => 'warn',
                    'message' => "Possible cross-reaction: the patient is allergic to {$al['name']}" . ($react ? " ({$react})" : '') . "; {$rule[2]}."];
            }
        }

        // Duplicates among the admission's active orders (pending or verified, not stopped).
        $sql = "SELECT o.id, o.drug_name, o.dose, o.dose_unit, o.route, o.order_type, o.frequency, d.name, d.generic_name, c.name AS category
                FROM inpatient_med_orders o JOIN drugs d ON d.id = o.drug_id LEFT JOIN drug_categories c ON c.id = d.category_id
                WHERE o.admission_id = :a AND o.status IN ('pending', 'verified') AND (o.stop_at IS NULL OR o.stop_at > NOW())";
        $params = ['a' => $admissionId];
        if ($excludeOrderId) {
            $sql .= " AND o.id <> :x";
            $params['x'] = $excludeOrderId;
        }
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $o) {
            $other = self::ingredients($o);
            $desc = "{$o['drug_name']} " . rtrim(rtrim((string) $o['dose'], '0'), '.') . " {$o['dose_unit']} {$o['route']} " . ($o['order_type'] === 'prn' ? 'as needed' : ($o['frequency'] ?: 'once'));
            if (array_intersect($ingr, $other)) {
                $warnings[] = ['type' => 'duplicate', 'severity' => 'warn',
                    'message' => "Duplicate: {$desc} is already ordered (same medicine: " . implode(', ', array_intersect($ingr, $other)) . ').'];
            } elseif ($category !== '' && $category === $o['category'] && in_array($category, self::DUPLICATE_CLASSES, true)) {
                $warnings[] = ['type' => 'therapeutic', 'severity' => 'warn',
                    'message' => "Same class: {$desc} is already ordered (both {$category})."];
            }
        }

        if (!empty($drug['is_high_alert'])) {
            $warnings[] = ['type' => 'high_alert', 'severity' => 'info', 'message' => 'High-alert medicine: double-check dose and route.'];
        }
        if (($drug['controlled_class'] ?? 'None') !== 'None' && ($drug['controlled_class'] ?? '') !== '') {
            $warnings[] = ['type' => 'controlled', 'severity' => 'info', 'message' => "Controlled: {$drug['controlled_class']}."];
        }
        return $warnings;
    }

    /** Do any of the ingredients (or the class) match the patterns? "@Class" matches the drug class. */
    private function matches(array $ingr, string $category, array $patterns): bool
    {
        foreach ($patterns as $p) {
            if (str_starts_with($p, '@')) {
                if (strcasecmp(substr($p, 1), $category) === 0) {
                    return true;
                }
                continue;
            }
            $re = '/\b' . str_replace('\*', '[a-z]*', preg_quote($p, '/')) . '\b/';
            if (str_starts_with($p, '*')) {
                $re = '/[a-z]*' . preg_quote(substr($p, 1), '/') . '\b/';
            }
            foreach ($ingr as $i) {
                if (preg_match($re, $i)) {
                    return true;
                }
            }
        }
        return false;
    }
}
