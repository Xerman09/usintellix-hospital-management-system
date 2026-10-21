<?php

namespace App\Modules\PatientPrescriptions\Services;

use App\Core\Database;
use PDO;

/**
 * Automated Duplicate Therapy Screen Service (`pharmacological_classes`)
 *
 * Screens prescription medication lines against pharmacological classes
 * (e.g., two NSAIDs, two Proton-Pump Inhibitors, two Opioids, two Statins,
 * two RAAS blockers, etc.) across:
 *   1. Intra-Prescription lines (multiple drugs from the same pharmacological
 *      class on the same prescription slip).
 *   2. Cross-Prescription / Multi-Doctor Active Medications (co-prescribed
 *      active drugs from the same pharmacological class written on other
 *      active prescriptions for the same patient).
 */
class DuplicateTherapyScreenService
{
    public static function ensureTableAndSeed(?PDO $db = null): void
    {
        $db = $db ?: Database::connection();

        $db->exec("
            CREATE TABLE IF NOT EXISTS `pharmacological_classes` (
                `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                `class_code` VARCHAR(60) NOT NULL,
                `class_name` VARCHAR(160) NOT NULL,
                `therapeutic_category` VARCHAR(120) NOT NULL,
                `severity` ENUM('critical', 'high', 'moderate') NOT NULL DEFAULT 'high',
                `member_keywords_json` TEXT NOT NULL,
                `mapped_category_id` INT UNSIGNED NULL,
                `duplicate_clinical_risk` VARCHAR(500) NOT NULL,
                `clinical_recommendation` VARCHAR(500) NOT NULL,
                `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY `uq_pharmacological_class_code` (`class_code`),
                INDEX `idx_pharm_class_category` (`mapped_category_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        $count = (int) $db->query("SELECT COUNT(*) FROM `pharmacological_classes`")->fetchColumn();
        if ($count === 0) {
            $schemaFile = dirname(__DIR__, 4) . '/database/schema/298_pharmacological_classes_duplicate_therapy.sql';
            if (is_file($schemaFile)) {
                $sql = file_get_contents($schemaFile);
                if ($sql) {
                    $db->exec($sql);
                }
            }
        }
    }

    /**
     * Return all active pharmacological classes with parsed keyword arrays.
     */
    public function getAllClasses(): array
    {
        $db = Database::connection();
        self::ensureTableAndSeed($db);

        $rows = $db->query("
            SELECT * FROM `pharmacological_classes`
            WHERE `is_active` = 1
            ORDER BY `id` ASC
        ")->fetchAll(PDO::FETCH_ASSOC);

        return array_map(function (array $r): array {
            $keywords = json_decode((string) ($r['member_keywords_json'] ?? '[]'), true);
            return [
                'id' => (int) $r['id'],
                'class_code' => $r['class_code'],
                'class_name' => $r['class_name'],
                'therapeutic_category' => $r['therapeutic_category'],
                'severity' => $r['severity'],
                'member_keywords' => is_array($keywords) ? array_values($keywords) : [],
                'mapped_category_id' => $r['mapped_category_id'] !== null ? (int) $r['mapped_category_id'] : null,
                'duplicate_clinical_risk' => $r['duplicate_clinical_risk'],
                'clinical_recommendation' => $r['clinical_recommendation'],
            ];
        }, $rows);
    }

    /**
     * Classify a medication into one or more pharmacological classes.
     */
    public function classifyDrug(
        string $titleOrName,
        ?string $genericName = null,
        ?int $categoryId = null,
        ?array $allClasses = null
    ): array {
        $classes = $allClasses ?? $this->getAllClasses();
        $haystack = strtolower(trim(($genericName ?? '') . ' ' . $titleOrName));

        $matched = [];
        $matchedCodes = [];

        if ($haystack !== '') {
            foreach ($classes as $cls) {
                foreach ($cls['member_keywords'] as $kw) {
                    $kwLower = strtolower(trim((string) $kw));
                    if ($kwLower !== '' && str_contains($haystack, $kwLower)) {
                        $matched[] = $cls;
                        $matchedCodes[$cls['class_code']] = true;
                        break;
                    }
                }
            }
        }

        // Fallback to mapped_category_id if no specific keyword matched
        if (empty($matched) && $categoryId !== null && $categoryId > 0) {
            foreach ($classes as $cls) {
                if ($cls['mapped_category_id'] === $categoryId && !isset($matchedCodes[$cls['class_code']])) {
                    $matched[] = $cls;
                    $matchedCodes[$cls['class_code']] = true;
                }
            }
        }

        return $matched;
    }

    /**
     * Fetch all currently active medications for a patient across active prescriptions
     * (excluding the slip currently being edited, if any), enriched with their pharmacological classes.
     */
    public function getActivePatientMedications(
        int $patientId,
        ?int $excludePrescriptionId = null,
        ?array $allClasses = null
    ): array {
        if ($patientId <= 0) {
            return [];
        }

        $db = Database::connection();
        $classes = $allClasses ?? $this->getAllClasses();
        $today = date('Y-m-d');

        $sql = "
            SELECT pp.id AS prescription_item_id,
                   pp.prescription_id,
                   pp.drug_id,
                   pp.title,
                   pp.dosage,
                   pp.frequency,
                   pp.route,
                   pp.begin_date,
                   pp.end_date,
                   rx.rx_number,
                   rx.prescribed_date,
                   rx.valid_until,
                   rx.dispense_status,
                   d.name AS drug_name,
                   d.generic_name,
                   d.brand_name,
                   d.strength,
                   d.category_id,
                   (SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))), ''), u.username)
                    FROM users u LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
                    WHERE u.id = rx.prescriber_user_id LIMIT 1) AS prescriber_name
            FROM patient_prescriptions pp
            JOIN prescriptions rx ON rx.id = pp.prescription_id
            LEFT JOIN drugs d ON d.id = pp.drug_id
            WHERE pp.patient_id = :patient_id
              AND pp.deleted_at IS NULL
              AND rx.deleted_at IS NULL
              AND rx.status = 'active'
              AND COALESCE(rx.dispense_status, 'pending') <> 'closed'
              AND (rx.valid_until IS NULL OR rx.valid_until >= :today1)
              AND (pp.end_date IS NULL OR pp.end_date >= :today2)
        ";

        $params = [
            'patient_id' => $patientId,
            'today1' => $today,
            'today2' => $today,
        ];

        if ($excludePrescriptionId !== null && $excludePrescriptionId > 0) {
            $sql .= " AND rx.id <> :exclude_id";
            $params['exclude_id'] = $excludePrescriptionId;
        }

        $sql .= " ORDER BY rx.prescribed_date DESC, pp.id DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $out = [];
        foreach ($rows as $r) {
            $matchedClasses = $this->classifyDrug(
                (string) ($r['title'] ?: ($r['drug_name'] ?? '')),
                $r['generic_name'] ?? null,
                isset($r['category_id']) ? (int) $r['category_id'] : null,
                $classes
            );

            $out[] = [
                'prescription_item_id' => (int) $r['prescription_item_id'],
                'prescription_id' => (int) $r['prescription_id'],
                'rx_number' => $r['rx_number'],
                'prescribed_date' => $r['prescribed_date'],
                'prescriber_name' => $r['prescriber_name'] ?: 'Prescribing Physician',
                'drug_id' => $r['drug_id'] !== null ? (int) $r['drug_id'] : null,
                'title' => $r['title'] ?: $r['drug_name'],
                'generic_name' => $r['generic_name'],
                'dosage' => $r['dosage'],
                'frequency' => $r['frequency'],
                'pharmacological_classes' => array_map(fn($c) => [
                    'class_code' => $c['class_code'],
                    'class_name' => $c['class_name'],
                    'therapeutic_category' => $c['therapeutic_category'],
                    'severity' => $c['severity'],
                ], $matchedClasses),
            ];
        }

        return $out;
    }

    /**
     * Screen an array of prescription lines against:
     *   1. Intra-prescription duplicates (same pharmacological class within $lines)
     *   2. Cross-prescription duplicates (same pharmacological class in active patient medications)
     */
    public function screenPrescriptionLines(
        int $patientId,
        array $lines,
        ?int $excludePrescriptionId = null,
        ?array $drugsById = null,
        ?array $allClasses = null
    ): array {
        $classes = $allClasses ?? $this->getAllClasses();
        $classesByCode = [];
        foreach ($classes as $c) {
            $classesByCode[$c['class_code']] = $c;
        }

        $activeMeds = $this->getActivePatientMedications($patientId, $excludePrescriptionId, $classes);

        // Classify each line on the current slip
        $lineClasses = [];
        foreach ($lines as $idx => $line) {
            $drugId = !empty($line['drug_id']) ? (int) $line['drug_id'] : null;
            $drug = ($drugId && isset($drugsById[$drugId])) ? $drugsById[$drugId] : null;
            $title = trim((string) ($line['title'] ?? ($drug['name'] ?? '')));
            $generic = $drug['generic_name'] ?? ($line['drug_generic_name'] ?? null);
            $catId = isset($drug['category_id']) ? (int) $drug['category_id'] : null;

            $lineClasses[$idx] = [
                'title' => $title ?: "Line #" . ($idx + 1),
                'drug_id' => $drugId,
                'classes' => $this->classifyDrug($title, $generic, $catId, $classes),
            ];
        }

        $lineDuplicates = [];
        $allAlerts = [];
        $hasCritical = false;

        foreach ($lines as $idx => $line) {
            $lineDuplicates[$idx] = [];
            $myInfo = $lineClasses[$idx];

            foreach ($myInfo['classes'] as $cls) {
                $code = $cls['class_code'];
                $fullClass = $classesByCode[$code] ?? $cls;

                // 1. Check Intra-Slip Duplicates (other lines on this same prescription)
                foreach ($lineClasses as $otherIdx => $otherInfo) {
                    if ($otherIdx === $idx) {
                        continue;
                    }
                    foreach ($otherInfo['classes'] as $otherCls) {
                        if ($otherCls['class_code'] === $code) {
                            if ($fullClass['severity'] === 'critical') {
                                $hasCritical = true;
                            }
                            $alert = [
                                'duplicate_type' => 'intra_slip',
                                'line_index' => $idx,
                                'conflicting_line_index' => $otherIdx,
                                'class_code' => $code,
                                'class_name' => $fullClass['class_name'],
                                'therapeutic_category' => $fullClass['therapeutic_category'],
                                'severity' => $fullClass['severity'],
                                'current_drug_title' => $myInfo['title'],
                                'conflicting_drug_title' => $otherInfo['title'],
                                'conflicting_rx_number' => null,
                                'conflicting_prescriber' => 'Same Prescription (Line #' . ($otherIdx + 1) . ')',
                                'duplicate_clinical_risk' => $fullClass['duplicate_clinical_risk'],
                                'clinical_recommendation' => $fullClass['clinical_recommendation'],
                                'summary' => sprintf(
                                    'Duplicate %s on this prescription: "%s" (Line #%d) + "%s" (Line #%d). %s',
                                    $fullClass['class_name'],
                                    $myInfo['title'],
                                    $idx + 1,
                                    $otherInfo['title'],
                                    $otherIdx + 1,
                                    $fullClass['duplicate_clinical_risk']
                                ),
                            ];
                            $lineDuplicates[$idx][] = $alert;
                            if ($idx < $otherIdx) {
                                $allAlerts[] = $alert;
                            }
                        }
                    }
                }

                // 2. Check Cross-Prescription / Multi-Doctor Active Medications
                foreach ($activeMeds as $activeMed) {
                    foreach ($activeMed['pharmacological_classes'] as $activeCls) {
                        if ($activeCls['class_code'] === $code) {
                            if ($fullClass['severity'] === 'critical') {
                                $hasCritical = true;
                            }
                            $alert = [
                                'duplicate_type' => 'cross_prescription',
                                'line_index' => $idx,
                                'conflicting_line_index' => null,
                                'class_code' => $code,
                                'class_name' => $fullClass['class_name'],
                                'therapeutic_category' => $fullClass['therapeutic_category'],
                                'severity' => $fullClass['severity'],
                                'current_drug_title' => $myInfo['title'],
                                'conflicting_drug_title' => $activeMed['title'],
                                'conflicting_rx_number' => $activeMed['rx_number'],
                                'conflicting_prescriber' => $activeMed['prescriber_name'],
                                'conflicting_prescribed_date' => $activeMed['prescribed_date'],
                                'duplicate_clinical_risk' => $fullClass['duplicate_clinical_risk'],
                                'clinical_recommendation' => $fullClass['clinical_recommendation'],
                                'summary' => sprintf(
                                    'Cross-Prescription Duplicate %s: "%s" conflicts with active %s ("%s", prescribed by %s on %s). %s',
                                    $fullClass['class_name'],
                                    $myInfo['title'],
                                    $activeMed['rx_number'],
                                    $activeMed['title'],
                                    $activeMed['prescriber_name'],
                                    $activeMed['prescribed_date'],
                                    $fullClass['duplicate_clinical_risk']
                                ),
                            ];
                            $lineDuplicates[$idx][] = $alert;
                            $allAlerts[] = $alert;
                        }
                    }
                }
            }
        }

        return [
            'has_duplicates' => !empty($allAlerts) || !empty(array_filter($lineDuplicates)),
            'has_critical_duplicates' => $hasCritical,
            'alerts' => $allAlerts,
            'line_duplicates' => $lineDuplicates,
            'active_patient_medications' => $activeMeds,
        ];
    }
}
