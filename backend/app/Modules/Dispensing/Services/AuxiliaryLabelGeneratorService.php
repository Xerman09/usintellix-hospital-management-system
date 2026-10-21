<?php

namespace App\Modules\Dispensing\Services;

use App\Core\Database;
use PDO;

/**
 * Dynamic Standardized Dosing & Auxiliary Label Generator Service
 *
 * - Converts clinical SIG shorthand (OD, BID, TID, QID, Q8H, Q12H, PRN, HS, PC, AC)
 *   into plain-language patient dosing instructions and a 4-period Universal
 *   Medication Schedule (Morning / Noon / Evening / Bedtime).
 * - Automatically assigns standardized auxiliary warning stickers with icons
 *   ("Take with food", "Finish entire course of antibiotics", "Avoid sunlight",
 *   "Do not crush", etc.) formatted for thermal label printers.
 * - Persists pharmacist customizations in `prescription_auxiliary_labels`.
 */
class AuxiliaryLabelGeneratorService
{
    public const AUXILIARY_STICKERS = [
        'TAKE_WITH_FOOD' => [
            'code' => 'TAKE_WITH_FOOD',
            'icon' => '🍽️',
            'short_label' => 'Take with food',
            'banner_text' => 'TAKE WITH FOOD OR MILK TO PREVENT STOMACH UPSET',
            'bg_color' => '#fef3c7',
            'border_color' => '#d97706',
            'text_color' => '#92400e',
        ],
        'FINISH_ANTIBIOTIC' => [
            'code' => 'FINISH_ANTIBIOTIC',
            'icon' => '💊',
            'short_label' => 'Finish entire course of antibiotics',
            'banner_text' => 'FINISH ENTIRE COURSE OF ANTIBIOTICS — DO NOT STOP EARLY',
            'bg_color' => '#dbeafe',
            'border_color' => '#2563eb',
            'text_color' => '#1e3a8a',
        ],
        'AVOID_SUNLIGHT' => [
            'code' => 'AVOID_SUNLIGHT',
            'icon' => '☀️',
            'short_label' => 'Avoid sunlight',
            'banner_text' => 'AVOID PROLONGED SUNLIGHT OR TANNING LAMPS (PHOTOSENSITIVITY)',
            'bg_color' => '#ffedd5',
            'border_color' => '#ea580c',
            'text_color' => '#9a3412',
        ],
        'DO_NOT_CRUSH' => [
            'code' => 'DO_NOT_CRUSH',
            'icon' => '🚫',
            'short_label' => 'Do not crush',
            'banner_text' => 'SWALLOW WHOLE — DO NOT CRUSH, CHEW, OR BREAK',
            'bg_color' => '#fee2e2',
            'border_color' => '#dc2626',
            'text_color' => '#991b1b',
        ],
        'EMPTY_STOMACH' => [
            'code' => 'EMPTY_STOMACH',
            'icon' => '⏳',
            'short_label' => 'Take on empty stomach',
            'banner_text' => 'TAKE ON AN EMPTY STOMACH (1 HR BEFORE OR 2 HRS AFTER MEALS)',
            'bg_color' => '#e0f2fe',
            'border_color' => '#0284c7',
            'text_color' => '#075985',
        ],
        'MAY_CAUSE_DROWSINESS' => [
            'code' => 'MAY_CAUSE_DROWSINESS',
            'icon' => '⚠️',
            'short_label' => 'May cause drowsiness',
            'banner_text' => 'MAY CAUSE DROWSINESS OR DIZZINESS — USE CAUTION WHEN DRIVING',
            'bg_color' => '#fef9c3',
            'border_color' => '#ca8a04',
            'text_color' => '#854d0e',
        ],
        'NO_ALCOHOL' => [
            'code' => 'NO_ALCOHOL',
            'icon' => '🍷',
            'short_label' => 'Avoid alcohol',
            'banner_text' => 'DO NOT DRINK ALCOHOLIC BEVERAGES WHILE TAKING THIS MEDICATION',
            'bg_color' => '#fce7f3',
            'border_color' => '#db2777',
            'text_color' => '#831843',
        ],
        'SHAKE_WELL' => [
            'code' => 'SHAKE_WELL',
            'icon' => '🔄',
            'short_label' => 'Shake well before use',
            'banner_text' => 'SHAKE WELL BEFORE MEASURING EACH DOSE',
            'bg_color' => '#ecfdf5',
            'border_color' => '#059669',
            'text_color' => '#065f46',
        ],
        'REFRIGERATE' => [
            'code' => 'REFRIGERATE',
            'icon' => '❄️',
            'short_label' => 'Keep refrigerated',
            'banner_text' => 'KEEP REFRIGERATED (2°C–8°C) — DO NOT FREEZE',
            'bg_color' => '#eff6ff',
            'border_color' => '#3b82f6',
            'text_color' => '#1d4ed8',
        ],
        'EXTERNAL_USE_ONLY' => [
            'code' => 'EXTERNAL_USE_ONLY',
            'icon' => '🧴',
            'short_label' => 'For external use only',
            'banner_text' => 'FOR EXTERNAL USE ONLY — DO NOT SWALLOW',
            'bg_color' => '#f3e8ff',
            'border_color' => '#9333ea',
            'text_color' => '#581c87',
        ],
        'HIGH_ALERT' => [
            'code' => 'HIGH_ALERT',
            'icon' => '🚨',
            'short_label' => 'High-alert medication',
            'banner_text' => 'HIGH-ALERT MEDICATION — VERIFY EXACT DOSE & SCHEDULE',
            'bg_color' => '#fef2f2',
            'border_color' => '#b91c1c',
            'text_color' => '#7f1d1d',
        ],
        'DANGEROUS_DRUG' => [
            'code' => 'DANGEROUS_DRUG',
            'icon' => '🔒',
            'short_label' => 'Controlled / Dangerous Drug',
            'banner_text' => 'CONTROLLED / DANGEROUS DRUG — TRANSFER TO OTHERS IS PROHIBITED',
            'bg_color' => '#1e293b',
            'border_color' => '#0f172a',
            'text_color' => '#f8fafc',
        ],
    ];

    public static function ensureTableExists(?PDO $db = null): void
    {
        $db = $db ?: Database::connection();
        $db->exec("
            CREATE TABLE IF NOT EXISTS `prescription_auxiliary_labels` (
                `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                `dispense_id` INT UNSIGNED NOT NULL,
                `prescription_item_id` INT UNSIGNED NOT NULL,
                `standardized_sig` VARCHAR(500) NOT NULL,
                `ums_schedule_json` TEXT NULL,
                `auxiliary_codes_json` TEXT NOT NULL,
                `custom_warning_note` VARCHAR(255) NULL,
                `label_format` VARCHAR(40) NOT NULL DEFAULT 'thermal_80x50',
                `updated_by` INT UNSIGNED NULL,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY `uq_dispense_item_aux_label` (`dispense_id`, `prescription_item_id`),
                INDEX `idx_aux_label_dispense` (`dispense_id`),
                INDEX `idx_aux_label_rx_item` (`prescription_item_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    /**
     * Load saved auxiliary label overrides keyed by prescription_item_id for a dispense batch.
     */
    public function getSavedForDispense(int $dispenseId): array
    {
        $db = Database::connection();
        self::ensureTableExists($db);

        $stmt = $db->prepare("SELECT * FROM prescription_auxiliary_labels WHERE dispense_id = :id");
        $stmt->execute(['id' => $dispenseId]);

        $map = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $map[(int) $row['prescription_item_id']] = $row;
        }
        return $map;
    }

    /**
     * Enrich a single dispense line item with standardized dosing instructions,
     * Universal Medication Schedule (UMS) 4-period grid, and auxiliary warning stickers.
     */
    public function generateForDispenseItem(array $item, ?array $savedRow = null): array
    {
        $auto = $this->computeAutoDosingAndStickers($item);

        $standardizedSig = !empty($savedRow['standardized_sig'])
            ? (string) $savedRow['standardized_sig']
            : $auto['standardized_sig'];

        $umsSchedule = $auto['ums_schedule'];
        if (!empty($savedRow['ums_schedule_json'])) {
            $decodedUms = json_decode((string) $savedRow['ums_schedule_json'], true);
            if (is_array($decodedUms)) {
                $umsSchedule = array_merge($umsSchedule, $decodedUms);
            }
        }

        $selectedCodes = $auto['auxiliary_codes'];
        if ($savedRow && isset($savedRow['auxiliary_codes_json'])) {
            $decodedCodes = json_decode((string) $savedRow['auxiliary_codes_json'], true);
            if (is_array($decodedCodes)) {
                $selectedCodes = array_values(array_filter($decodedCodes, fn($c) => isset(self::AUXILIARY_STICKERS[$c])));
            }
        }

        $stickers = array_values(array_map(
            fn(string $code) => self::AUXILIARY_STICKERS[$code],
            array_filter($selectedCodes, fn($c) => isset(self::AUXILIARY_STICKERS[$c]))
        ));

        return [
            'standardized_sig' => $standardizedSig,
            'ums_schedule' => $umsSchedule,
            'auxiliary_codes' => $selectedCodes,
            'auxiliary_stickers' => $stickers,
            'custom_warning_note' => $savedRow['custom_warning_note'] ?? '',
            'label_format' => $savedRow['label_format'] ?? 'thermal_80x50',
            'is_customized' => $savedRow !== null,
        ];
    }

    /**
     * Save customized standardized dosing & auxiliary stickers for a dispense item.
     */
    public function saveCustomLabel(array $payload, ?int $userId = null): array
    {
        $db = Database::connection();
        self::ensureTableExists($db);

        $dispenseId = (int) ($payload['dispense_id'] ?? 0);
        $rxItemId = (int) ($payload['prescription_item_id'] ?? 0);
        if ($dispenseId <= 0 || $rxItemId <= 0) {
            return ['success' => false, 'message' => 'dispense_id and prescription_item_id are required.'];
        }

        $standardizedSig = trim((string) ($payload['standardized_sig'] ?? ''));
        if ($standardizedSig === '') {
            $standardizedSig = 'Take as directed by your physician.';
        }

        $umsSchedule = is_array($payload['ums_schedule'] ?? null)
            ? [
                'morning' => trim((string) ($payload['ums_schedule']['morning'] ?? '')),
                'noon' => trim((string) ($payload['ums_schedule']['noon'] ?? '')),
                'evening' => trim((string) ($payload['ums_schedule']['evening'] ?? '')),
                'bedtime' => trim((string) ($payload['ums_schedule']['bedtime'] ?? '')),
            ]
            : ['morning' => '', 'noon' => '', 'evening' => '', 'bedtime' => ''];

        $rawCodes = is_array($payload['auxiliary_codes'] ?? null) ? $payload['auxiliary_codes'] : [];
        $validCodes = array_values(array_unique(array_filter(
            array_map('strval', $rawCodes),
            fn(string $code) => isset(self::AUXILIARY_STICKERS[$code])
        )));

        $customWarningNote = trim((string) ($payload['custom_warning_note'] ?? '')) ?: null;
        $labelFormat = in_array($payload['label_format'] ?? '', ['thermal_80x50', 'thermal_100x60', 'a4_sheet'], true)
            ? (string) $payload['label_format']
            : 'thermal_80x50';

        $stmt = $db->prepare("
            INSERT INTO prescription_auxiliary_labels
                (dispense_id, prescription_item_id, standardized_sig, ums_schedule_json, auxiliary_codes_json, custom_warning_note, label_format, updated_by)
            VALUES
                (:dispense_id, :rx_item_id, :sig, :ums, :codes, :note, :fmt, :updated_by)
            ON DUPLICATE KEY UPDATE
                standardized_sig = VALUES(standardized_sig),
                ums_schedule_json = VALUES(ums_schedule_json),
                auxiliary_codes_json = VALUES(auxiliary_codes_json),
                custom_warning_note = VALUES(custom_warning_note),
                label_format = VALUES(label_format),
                updated_by = VALUES(updated_by)
        ");

        $stmt->execute([
            'dispense_id' => $dispenseId,
            'rx_item_id' => $rxItemId,
            'sig' => $standardizedSig,
            'ums' => json_encode($umsSchedule, JSON_UNESCAPED_UNICODE),
            'codes' => json_encode($validCodes, JSON_UNESCAPED_UNICODE),
            'note' => $customWarningNote,
            'fmt' => $labelFormat,
            'updated_by' => $userId ?: null,
        ]);

        return [
            'success' => true,
            'message' => 'Standardized dosing and auxiliary warning labels saved.',
            'data' => [
                'dispense_id' => $dispenseId,
                'prescription_item_id' => $rxItemId,
                'standardized_sig' => $standardizedSig,
                'ums_schedule' => $umsSchedule,
                'auxiliary_codes' => $validCodes,
                'auxiliary_stickers' => array_values(array_map(fn($c) => self::AUXILIARY_STICKERS[$c], $validCodes)),
                'custom_warning_note' => $customWarningNote ?? '',
                'label_format' => $labelFormat,
            ],
        ];
    }

    /**
     * Automatically expand SIG and infer auxiliary warning stickers from drug metadata.
     */
    private function computeAutoDosingAndStickers(array $item): array
    {
        $dosage = trim((string) ($item['dosage'] ?? ''));
        $frequency = trim((string) ($item['frequency'] ?? ''));
        $route = trim((string) ($item['route'] ?? 'Oral'));
        $directions = trim((string) ($item['directions'] ?? ''));
        $dosageForm = trim((string) ($item['dosage_form'] ?? ''));

        $verb = 'TAKE';
        $routeUpper = strtoupper($route);
        if (str_contains($routeUpper, 'TOPICAL') || str_contains($routeUpper, 'SKIN') || str_contains($routeUpper, 'EXTERNAL')) {
            $verb = 'APPLY';
        } elseif (str_contains($routeUpper, 'OPHTH') || str_contains($routeUpper, 'EYE') || str_contains($routeUpper, 'OTIC') || str_contains($routeUpper, 'EAR') || str_contains($routeUpper, 'NASAL')) {
            $verb = 'INSTILL';
        } elseif (str_contains($routeUpper, 'INHAL')) {
            $verb = 'INHALE';
        } elseif (str_contains($routeUpper, 'INJ') || str_contains($routeUpper, 'SC') || str_contains($routeUpper, 'SUBCUT') || str_contains($routeUpper, 'IM') || str_contains($routeUpper, 'IV')) {
            $verb = 'INJECT';
        } elseif (str_contains($routeUpper, 'RECTAL') || str_contains($routeUpper, 'VAGINAL')) {
            $verb = 'INSERT';
        }

        $dosePhrase = $dosage !== '' ? strtoupper($dosage) : ('1 ' . strtoupper($dosageForm ?: 'DOSE'));

        [$freqPlain, $ums] = $this->parseFrequencyAndUms($frequency, $dosage !== '' ? $dosage : '1 dose', $directions);

        $routePhrase = ($route !== '' && strcasecmp($route, 'Oral') !== 0)
            ? ' (' . strtoupper($route) . ')'
            : ' BY MOUTH';
        if ($verb !== 'TAKE') {
            $routePhrase = $route !== '' ? ' (' . strtoupper($route) . ')' : '';
        }

        $standardizedSig = trim("{$verb} {$dosePhrase}{$routePhrase} {$freqPlain}");
        if ($directions !== '') {
            $standardizedSig .= ' — ' . strtoupper($directions);
        }

        $codes = $this->detectAuxiliaryCodes($item);

        return [
            'standardized_sig' => $standardizedSig,
            'ums_schedule' => $ums,
            'auxiliary_codes' => $codes,
        ];
    }

    private function parseFrequencyAndUms(string $frequency, string $doseLabel, string $directions): array
    {
        $f = strtoupper(trim($frequency));
        $dir = strtoupper(trim($directions));
        $ums = ['morning' => '', 'noon' => '', 'evening' => '', 'bedtime' => ''];

        if ($f === '' || $f === 'AS DIRECTED') {
            return ['AS DIRECTED BY PHYSICIAN', $ums];
        }

        if (preg_match('/\b(OD|ONCE DAILY|EVERY DAY|DAILY|Q24H|QD)\b/', $f)) {
            if (str_contains($f, 'BEDTIME') || str_contains($f, 'HS') || str_contains($f, 'NIGHT') || str_contains($dir, 'BEDTIME') || str_contains($dir, 'NIGHT')) {
                $ums['bedtime'] = $doseLabel;
                return ['ONCE DAILY AT BEDTIME', $ums];
            }
            $ums['morning'] = $doseLabel;
            return ['ONCE DAILY IN THE MORNING', $ums];
        }

        if (preg_match('/\b(BID|TWICE DAILY|2X DAILY|Q12H|EVERY 12 HOURS)\b/', $f)) {
            $ums['morning'] = $doseLabel;
            $ums['evening'] = $doseLabel;
            return ['TWICE DAILY (EVERY 12 HOURS — MORNING & EVENING)', $ums];
        }

        if (preg_match('/\b(TID|THREE TIMES DAILY|3X DAILY|Q8H|EVERY 8 HOURS)\b/', $f)) {
            $ums['morning'] = $doseLabel;
            $ums['noon'] = $doseLabel;
            $ums['evening'] = $doseLabel;
            return ['THREE TIMES DAILY (EVERY 8 HOURS — MORNING, NOON & EVENING)', $ums];
        }

        if (preg_match('/\b(QID|FOUR TIMES DAILY|4X DAILY|Q6H|EVERY 6 HOURS)\b/', $f)) {
            $ums['morning'] = $doseLabel;
            $ums['noon'] = $doseLabel;
            $ums['evening'] = $doseLabel;
            $ums['bedtime'] = $doseLabel;
            return ['FOUR TIMES DAILY (EVERY 6 HOURS — MORNING, NOON, EVENING & BEDTIME)', $ums];
        }

        if (preg_match('/\b(Q4H|EVERY 4 HOURS)\b/', $f)) {
            $ums['morning'] = $doseLabel;
            $ums['noon'] = $doseLabel;
            $ums['evening'] = $doseLabel;
            $ums['bedtime'] = $doseLabel;
            return ['EVERY 4 HOURS AROUND THE CLOCK', $ums];
        }

        if (preg_match('/\b(HS|QHS|AT BEDTIME|BEDTIME)\b/', $f)) {
            $ums['bedtime'] = $doseLabel;
            return ['AT BEDTIME', $ums];
        }

        if (preg_match('/\b(PRN|AS NEEDED)\b/', $f)) {
            return [$f . ' (AS NEEDED FOR SYMPTOMS)', $ums];
        }

        return [$f, $ums];
    }

    /**
     * Auto-detect standardized auxiliary stickers ("Take with food", "Finish entire course of antibiotics",
     * "Avoid sunlight", "Do not crush", etc.) from drug attributes and directions.
     */
    private function detectAuxiliaryCodes(array $item): array
    {
        $codes = [];

        $haystack = strtolower(implode(' ', [
            $item['title'] ?? '',
            $item['drug_name'] ?? '',
            $item['generic_name'] ?? '',
            $item['brand_name'] ?? '',
            $item['dosage_form'] ?? '',
            $item['route'] ?? '',
            $item['frequency'] ?? '',
            $item['directions'] ?? '',
        ]));

        $formLower = strtolower((string) ($item['dosage_form'] ?? ''));
        $routeLower = strtolower((string) ($item['route'] ?? ''));
        $dirLower = strtolower((string) ($item['directions'] ?? '') . ' ' . ($item['frequency'] ?? ''));

        // 1. "Finish entire course of antibiotics" (FINISH_ANTIBIOTIC)
        $antibioticKeywords = [
            'amoxicillin', 'co-amoxiclav', 'augmentin', 'azithromycin', 'cefuroxime', 'cephalexin',
            'cefixime', 'ceftriaxone', 'cefdinir', 'ciprofloxacin', 'levofloxacin', 'moxifloxacin',
            'doxycycline', 'tetracycline', 'clindamycin', 'metronidazole', 'clarithromycin',
            'erythromycin', 'cotrimoxazole', 'trimethoprim', 'sulfamethoxazole', 'nitrofurantoin',
            'penicillin', 'ampicillin', 'cloxacillin', 'vancomycin', 'linezolid', 'rifampicin', 'antibiotic'
        ];
        foreach ($antibioticKeywords as $kw) {
            if (str_contains($haystack, $kw)) {
                $codes[] = 'FINISH_ANTIBIOTIC';
                break;
            }
        }

        // 2. "Take with food" (TAKE_WITH_FOOD)
        $withFoodKeywords = [
            'ibuprofen', 'naproxen', 'diclofenac', 'meloxicam', 'celecoxib', 'ketorolac',
            'aspirin', 'mefenamic', 'prednisone', 'prednisolone', 'dexamethasone', 'hydrocortisone',
            'metformin', 'co-amoxiclav', 'augmentin', 'metronidazole', 'doxycycline', 'nitrofurantoin',
            'potassium', 'ferrous', 'iron', 'allopurinol', 'carbamazepine', 'with food', 'after meal', 'with meal', 'pc'
        ];
        foreach ($withFoodKeywords as $kw) {
            if (str_contains($haystack, $kw)) {
                $codes[] = 'TAKE_WITH_FOOD';
                break;
            }
        }

        // 3. "Avoid sunlight" (AVOID_SUNLIGHT)
        $sunlightKeywords = [
            'doxycycline', 'tetracycline', 'minocycline', 'ciprofloxacin', 'levofloxacin',
            'moxifloxacin', 'ofloxacin', 'cotrimoxazole', 'sulfamethoxazole', 'furosemide',
            'hydrochlorothiazide', 'amiodarone', 'isotretinoin', 'tretinoin', 'methotrexate',
            'voriconazole', 'promethazine', 'chlorpromazine', 'sunlight', 'photosensitiv'
        ];
        foreach ($sunlightKeywords as $kw) {
            if (str_contains($haystack, $kw)) {
                $codes[] = 'AVOID_SUNLIGHT';
                break;
            }
        }

        // 4. "Do not crush" (DO_NOT_CRUSH)
        $doNotCrushKeywords = [
            'extended release', 'extended-release', 'sustained release', 'modified release',
            'delayed release', 'enteric', 'omeprazole', 'esomeprazole', 'pantoprazole',
            'lansoprazole', 'rabeprazole', 'nifedipine', 'diltiazem', 'verapamil', 'tamsulosin',
            'oxycodone', 'morphine', 'divalproex', 'valproate', 'do not crush', 'swallow whole'
        ];
        $hasErSuffix = (bool) preg_match('/\b(er|xr|sr|cr|mr|xl|dr|ec)\b/i', (string) ($item['drug_name'] ?? '') . ' ' . ($item['title'] ?? '') . ' ' . $formLower);
        if ($hasErSuffix) {
            $codes[] = 'DO_NOT_CRUSH';
        } else {
            foreach ($doNotCrushKeywords as $kw) {
                if (str_contains($haystack, $kw)) {
                    $codes[] = 'DO_NOT_CRUSH';
                    break;
                }
            }
        }

        // 5. "Take on empty stomach" (EMPTY_STOMACH)
        $emptyStomachKeywords = [
            'levothyroxine', 'alendronate', 'omeprazole', 'pantoprazole', 'esomeprazole',
            'lansoprazole', 'ampicillin', 'cloxacillin', 'rifampicin', 'isoniazid',
            'empty stomach', 'before meal', 'before breakfast', 'ac'
        ];
        foreach ($emptyStomachKeywords as $kw) {
            if (str_contains($haystack, $kw)) {
                $codes[] = 'EMPTY_STOMACH';
                // Avoid conflicting TAKE_WITH_FOOD if explicitly empty stomach
                $codes = array_values(array_diff($codes, ['TAKE_WITH_FOOD']));
                break;
            }
        }

        // 6. "May cause drowsiness" (MAY_CAUSE_DROWSINESS)
        $drowsinessKeywords = [
            'cetirizine', 'levocetirizine', 'diphenhydramine', 'chlorphenamine', 'chlorpheniramine',
            'hydroxyzine', 'promethazine', 'loratadine', 'diazepam', 'lorazepam', 'alprazolam',
            'clonazepam', 'midazolam', 'zolpidem', 'tramadol', 'morphine', 'codeine', 'fentanyl',
            'oxycodone', 'gabapentin', 'pregabalin', 'amitriptyline', 'quetiapine', 'olanzapine',
            'risperidone', 'haloperidol', 'baclofen', 'tizanidine', 'cyclobenzaprine', 'cinnarizine', 'drows'
        ];
        foreach ($drowsinessKeywords as $kw) {
            if (str_contains($haystack, $kw)) {
                $codes[] = 'MAY_CAUSE_DROWSINESS';
                break;
            }
        }

        // 7. "Avoid alcohol" (NO_ALCOHOL)
        $noAlcoholKeywords = [
            'metronidazole', 'tinidazole', 'diazepam', 'lorazepam', 'alprazolam', 'clonazepam',
            'zolpidem', 'tramadol', 'morphine', 'codeine', 'oxycodone', 'fentanyl', 'paracetamol',
            'acetaminophen', 'isoniazid', 'methotrexate', 'warfarin', 'glimepiride', 'gliclazide', 'metformin'
        ];
        foreach ($noAlcoholKeywords as $kw) {
            if (str_contains($haystack, $kw)) {
                $codes[] = 'NO_ALCOHOL';
                break;
            }
        }

        // 8. "Shake well" (SHAKE_WELL)
        if (str_contains($formLower, 'suspension') || str_contains($formLower, 'emulsion') || str_contains($haystack, 'suspension') || str_contains($haystack, 'shake well')) {
            $codes[] = 'SHAKE_WELL';
        }

        // 9. "Keep refrigerated" (REFRIGERATE)
        if (str_contains($haystack, 'insulin') || str_contains($haystack, 'vaccine') || str_contains($haystack, 'refrigerat') || str_contains($haystack, 'epoetin') || str_contains($haystack, 'filgrastim') || str_contains($haystack, 'oxytocin')) {
            $codes[] = 'REFRIGERATE';
        }

        // 10. "For external use only" (EXTERNAL_USE_ONLY)
        if (
            str_contains($routeLower, 'topical') ||
            str_contains($routeLower, 'external') ||
            str_contains($formLower, 'ointment') ||
            str_contains($formLower, 'cream') ||
            str_contains($formLower, 'lotion') ||
            str_contains($formLower, 'gel')
        ) {
            $codes[] = 'EXTERNAL_USE_ONLY';
        }

        // 11. High-alert & Dangerous Drug stickers
        if (!empty($item['is_high_alert'])) {
            $codes[] = 'HIGH_ALERT';
        }
        if (!empty($item['controlled_class']) && strtolower((string) $item['controlled_class']) !== 'none') {
            $codes[] = 'DANGEROUS_DRUG';
        }

        // Ensure every oral medication gets at least one meaningful auxiliary guidance if none matched
        if (empty($codes) && ($routeLower === '' || str_contains($routeLower, 'oral'))) {
            if (str_contains($dirLower, 'meal') || str_contains($dirLower, 'food')) {
                $codes[] = 'TAKE_WITH_FOOD';
            }
        }

        return array_values(array_unique($codes));
    }
}
