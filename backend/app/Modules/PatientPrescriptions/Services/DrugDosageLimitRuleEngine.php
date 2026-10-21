<?php

namespace App\Modules\PatientPrescriptions\Services;

use App\Core\Database;
use PDO;

/**
 * Automated Dosage Limits & Pediatric/Renal Thresholds Rules Engine
 * (`drug_dosage_limits`)
 *
 * Evaluates prescribed medication lines against:
 *  1. `max_single_dose_mg` (catches 10-fold single-dose errors, e.g. Paracetamol 40 g instead of 4 g / 1 g)
 *  2. `max_daily_dose_mg` (catches cumulative 24-hour overdoses across dosing frequencies)
 *  3. Pediatric `mg/kg/dose` and `mg/kg/day` limits based on patient weight & age
 *  4. Impaired renal clearance thresholds (`eGFR / CrCl` mL/min) with clinical adjustment prompts
 */
class DrugDosageLimitRuleEngine
{
    public static function ensureTableAndSeed(?PDO $db = null): void
    {
        $db = $db ?: Database::connection();

        $db->exec("
            CREATE TABLE IF NOT EXISTS `drug_dosage_limits` (
                `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                `drug_id` INT UNSIGNED NULL,
                `generic_keyword` VARCHAR(120) NOT NULL,
                `display_name` VARCHAR(160) NOT NULL,
                `default_unit_strength_mg` DECIMAL(10,2) NOT NULL DEFAULT 500.00,
                `max_single_dose_mg` DECIMAL(10,2) NOT NULL,
                `max_daily_dose_mg` DECIMAL(10,2) NOT NULL,
                `pediatric_mg_kg_per_dose` DECIMAL(8,2) NULL,
                `pediatric_max_mg_kg_per_dose` DECIMAL(8,2) NULL,
                `pediatric_max_mg_kg_per_day` DECIMAL(8,2) NULL,
                `renal_egfr_warning_threshold` DECIMAL(6,2) NULL DEFAULT 60.00,
                `renal_egfr_contraindicated_threshold` DECIMAL(6,2) NULL DEFAULT 30.00,
                `renal_adjustment_guidance` VARCHAR(500) NULL,
                `clinical_overdose_warning` VARCHAR(500) NULL,
                `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY `uq_drug_dosage_limit_keyword` (`generic_keyword`),
                INDEX `idx_drug_dosage_limit_drug_id` (`drug_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        $count = (int) $db->query("SELECT COUNT(*) FROM `drug_dosage_limits`")->fetchColumn();
        if ($count === 0) {
            $schemaFile = dirname(__DIR__, 4) . '/database/schema/297_drug_dosage_limits.sql';
            if (is_file($schemaFile)) {
                $sql = file_get_contents($schemaFile);
                if ($sql) {
                    $db->exec($sql);
                }
            }
        }
    }

    /**
     * Return all active drug dosage limit rules.
     */
    public function getAllLimits(): array
    {
        $db = Database::connection();
        self::ensureTableAndSeed($db);

        $rows = $db->query("
            SELECT * FROM `drug_dosage_limits`
            WHERE `is_active` = 1
            ORDER BY `display_name` ASC
        ")->fetchAll(PDO::FETCH_ASSOC);

        return array_map([$this, 'formatRuleRow'], $rows);
    }

    /**
     * Match a drug catalog item or free-text prescription title to a dosage limit rule.
     */
    public function findLimitForDrug(?int $drugId, string $titleOrName, ?string $genericName = null, ?array $allLimits = null): ?array
    {
        $limits = $allLimits ?? $this->getAllLimits();

        if ($drugId) {
            foreach ($limits as $rule) {
                if ($rule['drug_id'] !== null && (int) $rule['drug_id'] === $drugId) {
                    return $rule;
                }
            }
        }

        $haystack = strtolower(trim(($genericName ?? '') . ' ' . $titleOrName));
        if ($haystack === '') {
            return null;
        }

        foreach ($limits as $rule) {
            $kw = strtolower(trim((string) $rule['generic_keyword']));
            if ($kw !== '' && str_contains($haystack, $kw)) {
                return $rule;
            }
        }

        return null;
    }

    /**
     * Resolve the patient's age, pediatric status, latest weight (kg), and latest renal eGFR (mL/min).
     */
    public function getPatientDosingContext(int $patientId, array $overrides = []): array
    {
        $db = Database::connection();
        $ageYears = null;
        $sex = null;
        $birthdate = null;

        if ($patientId > 0) {
            $stmt = $db->prepare("SELECT birthdate, sex FROM patients WHERE id = :id LIMIT 1");
            $stmt->execute(['id' => $patientId]);
            $pt = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($pt) {
                $birthdate = $pt['birthdate'] ?? null;
                $sex = $pt['sex'] ?? null;
                if (!empty($birthdate)) {
                    try {
                        $ageYears = (new \DateTime($birthdate))->diff(new \DateTime())->y;
                    } catch (\Throwable $e) {
                        $ageYears = null;
                    }
                }
            }
        }

        // Try to get latest patient weight (kg)
        $weightKg = null;
        if (isset($overrides['patient_weight_kg']) && is_numeric($overrides['patient_weight_kg']) && (float) $overrides['patient_weight_kg'] > 0) {
            $weightKg = round((float) $overrides['patient_weight_kg'], 2);
        } elseif ($patientId > 0) {
            try {
                $stmt = $db->prepare("
                    SELECT weight_kg, weight_lbs
                    FROM form_vitals v
                    JOIN encounters e ON e.id = v.encounter_id
                    WHERE e.patient_id = :pid AND (v.weight_kg > 0 OR v.weight_lbs > 0)
                    ORDER BY v.id DESC LIMIT 1
                ");
                $stmt->execute(['pid' => $patientId]);
                $v = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($v) {
                    $weightKg = (float) ($v['weight_kg'] ?? 0) > 0
                        ? round((float) $v['weight_kg'], 2)
                        : round(((float) $v['weight_lbs']) * 0.45359237, 2);
                }
            } catch (\Throwable $e) {
                // fallback below
            }

            if (!$weightKg) {
                try {
                    $stmt = $db->prepare("
                        SELECT patient_weight_kg
                        FROM prescription_verifications
                        WHERE patient_id = :pid AND patient_weight_kg > 0
                        ORDER BY id DESC LIMIT 1
                    ");
                    $stmt->execute(['pid' => $patientId]);
                    $val = $stmt->fetchColumn();
                    if ($val !== false && (float) $val > 0) {
                        $weightKg = round((float) $val, 2);
                    }
                } catch (\Throwable $e) {
                    // ignore
                }
            }
        }

        // Try to get latest eGFR / CrCl (mL/min)
        $egfrMlMin = null;
        if (isset($overrides['patient_egfr_ml_min']) && is_numeric($overrides['patient_egfr_ml_min']) && (float) $overrides['patient_egfr_ml_min'] > 0) {
            $egfrMlMin = round((float) $overrides['patient_egfr_ml_min'], 1);
        } elseif ($patientId > 0) {
            try {
                $stmt = $db->prepare("
                    SELECT egfr_crcl_ml_min
                    FROM prescription_verifications
                    WHERE patient_id = :pid AND egfr_crcl_ml_min IS NOT NULL AND egfr_crcl_ml_min > 0
                    ORDER BY id DESC LIMIT 1
                ");
                $stmt->execute(['pid' => $patientId]);
                $val = $stmt->fetchColumn();
                if ($val !== false && (float) $val > 0) {
                    $egfrMlMin = round((float) $val, 1);
                }
            } catch (\Throwable $e) {
                // ignore
            }
        }

        $isPediatric = !empty($overrides['is_pediatric'])
            || ($ageYears !== null && $ageYears < 18)
            || ($weightKg !== null && $weightKg > 0 && $weightKg < 40);

        if ($weightKg === null || $weightKg <= 0) {
            if ($ageYears !== null && $ageYears < 18) {
                $weightKg = max(5.0, round(($ageYears + 4) * 2.0, 1));
            } else {
                $weightKg = 68.0;
            }
        }

        if ($egfrMlMin === null || $egfrMlMin <= 0) {
            $egfrMlMin = 90.0;
        }

        return [
            'patient_id' => $patientId,
            'age_years' => $ageYears,
            'sex' => $sex,
            'birthdate' => $birthdate,
            'is_pediatric' => $isPediatric,
            'patient_weight_kg' => $weightKg,
            'patient_egfr_ml_min' => $egfrMlMin,
        ];
    }

    /**
     * Evaluate a single prescription line item against `drug_dosage_limits`.
     */
    public function evaluateLine(array $line, array $patientContext, ?array $drugRecord = null, ?array $allLimits = null): array
    {
        $drugId = !empty($line['drug_id']) ? (int) $line['drug_id'] : null;
        $title = trim((string) ($line['title'] ?? ($drugRecord['name'] ?? '')));
        $genericName = $drugRecord['generic_name'] ?? ($line['drug_generic_name'] ?? null);
        $strengthStr = $drugRecord['strength'] ?? ($line['drug_strength'] ?? '');

        $rule = $this->findLimitForDrug($drugId, $title, $genericName, $allLimits);
        if (!$rule) {
            return [
                'matched_rule' => null,
                'has_violation' => false,
                'has_critical_block' => false,
                'severity' => 'ok',
                'alerts' => [],
                'metrics' => null,
            ];
        }

        $unitStrengthMg = $this->parseStrengthMg($strengthStr ?: $title) ?: (float) $rule['default_unit_strength_mg'];
        $singleDoseMg = $this->parsePrescribedSingleDoseMg((string) ($line['dosage'] ?? ''), $unitStrengthMg, $title);
        $dosesPerDay = $this->parseDosesPerDay((string) ($line['frequency'] ?? ''), (string) ($line['directions'] ?? ''));
        $dailyDoseMg = $singleDoseMg !== null ? round($singleDoseMg * $dosesPerDay, 2) : null;

        $weightKg = (float) ($patientContext['patient_weight_kg'] ?? 68.0);
        $egfrMlMin = (float) ($patientContext['patient_egfr_ml_min'] ?? 90.0);
        $isPediatric = !empty($patientContext['is_pediatric']) || ($weightKg > 0 && $weightKg < 40);

        $mgKgPerDose = ($singleDoseMg !== null && $weightKg > 0) ? round($singleDoseMg / $weightKg, 2) : null;
        $mgKgPerDay = ($dailyDoseMg !== null && $weightKg > 0) ? round($dailyDoseMg / $weightKg, 2) : null;

        $maxSingleMg = (float) $rule['max_single_dose_mg'];
        $maxDailyMg = (float) $rule['max_daily_dose_mg'];
        $pedRecMgKgDose = $rule['pediatric_mg_kg_per_dose'] !== null ? (float) $rule['pediatric_mg_kg_per_dose'] : null;
        $pedMaxMgKgDose = $rule['pediatric_max_mg_kg_per_dose'] !== null ? (float) $rule['pediatric_max_mg_kg_per_dose'] : null;
        $pedMaxMgKgDay = $rule['pediatric_max_mg_kg_per_day'] !== null ? (float) $rule['pediatric_max_mg_kg_per_day'] : null;

        $alerts = [];
        $hasCriticalBlock = false;
        $severity = 'ok';

        // 1. Check Single Dose vs max_single_dose_mg (including 10-fold / extreme overdoses like Paracetamol 40g)
        if ($singleDoseMg !== null && $maxSingleMg > 0 && $singleDoseMg > $maxSingleMg) {
            $foldSingle = round($singleDoseMg / $maxSingleMg, 1);
            $foldDaily = $maxDailyMg > 0 ? round($singleDoseMg / $maxDailyMg, 1) : $foldSingle;

            if ($foldSingle >= 2.0 || $foldDaily >= 2.0) {
                $hasCriticalBlock = true;
                $severity = 'critical_block';
                $tenfoldLabel = ($foldSingle >= 10.0 || $foldDaily >= 10.0)
                    ? "10-FOLD / MASSIVE OVERDOSE ERROR ({$foldSingle}× max single dose / {$foldDaily}× max daily dose)"
                    : "CRITICAL SINGLE-DOSE OVERDOSE ({$foldSingle}× max single dose)";
                $alerts[] = [
                    'code' => 'CRITICAL_SINGLE_OVERDOSE',
                    'level' => 'critical',
                    'title' => $tenfoldLabel,
                    'message' => sprintf(
                        '%s prescribed single dose is %s (%s mg), which exceeds the maximum safe single dose of %s mg (%s) by %s×. %s',
                        $rule['display_name'],
                        self::formatMgAndGrams($singleDoseMg),
                        number_format($singleDoseMg, 0),
                        number_format($maxSingleMg, 0),
                        self::formatMgAndGrams($maxSingleMg),
                        $foldSingle,
                        $rule['clinical_overdose_warning'] ?? ''
                    ),
                ];
            } else {
                $severity = 'high_warning';
                $alerts[] = [
                    'code' => 'EXCEEDS_MAX_SINGLE_DOSE',
                    'level' => 'danger',
                    'title' => 'Exceeds Max Single Dose (' . number_format($maxSingleMg, 0) . ' mg)',
                    'message' => sprintf(
                        'Prescribed single dose of %s mg exceeds max_single_dose (%s mg) for %s.',
                        number_format($singleDoseMg, 0),
                        number_format($maxSingleMg, 0),
                        $rule['display_name']
                    ),
                ];
            }
        }

        // 2. Check Cumulative 24-Hour Daily Dose vs max_daily_dose_mg
        if ($dailyDoseMg !== null && $maxDailyMg > 0 && $dailyDoseMg > $maxDailyMg) {
            $foldDaily = round($dailyDoseMg / $maxDailyMg, 1);
            if ($foldDaily >= 2.0) {
                $hasCriticalBlock = true;
                $severity = 'critical_block';
            } elseif ($severity !== 'critical_block') {
                $severity = 'high_warning';
            }

            $alerts[] = [
                'code' => 'EXCEEDS_MAX_DAILY_DOSE',
                'level' => $foldDaily >= 2.0 ? 'critical' : 'danger',
                'title' => $foldDaily >= 10.0
                    ? "10-FOLD DAILY OVERDOSE ({$foldDaily}× Max Daily Limit)"
                    : "Exceeds 24-Hour Max Daily Dose (" . self::formatMgAndGrams($maxDailyMg) . "/day)",
                'message' => sprintf(
                    'Calculated 24-hour total dose is %s/day (%s mg × %s doses/day), exceeding max_daily_dose of %s/day (%s× limit). %s',
                    self::formatMgAndGrams($dailyDoseMg),
                    number_format((float) $singleDoseMg, 0),
                    $dosesPerDay,
                    self::formatMgAndGrams($maxDailyMg),
                    $foldDaily,
                    $rule['clinical_overdose_warning'] ?? ''
                ),
            ];
        }

        // 3. Check Pediatric Weight-Based mg/kg/dose and mg/kg/day Limits
        if ($isPediatric && $mgKgPerDose !== null && $pedMaxMgKgDose !== null && $mgKgPerDose > $pedMaxMgKgDose) {
            $safePedSingleMg = round(($pedRecMgKgDose ?: $pedMaxMgKgDose) * $weightKg, 0);
            $maxPedSingleMg = min($maxSingleMg, round($pedMaxMgKgDose * $weightKg, 0));
            if ($mgKgPerDose >= $pedMaxMgKgDose * 2.0) {
                $hasCriticalBlock = true;
                $severity = 'critical_block';
            } elseif ($severity !== 'critical_block') {
                $severity = 'high_warning';
            }

            $alerts[] = [
                'code' => 'PEDIATRIC_MG_KG_OVERDOSE',
                'level' => $mgKgPerDose >= $pedMaxMgKgDose * 2.0 ? 'critical' : 'danger',
                'title' => "Pediatric Weight-Based Overdose ({$mgKgPerDose} mg/kg/dose > {$pedMaxMgKgDose} mg/kg/dose)",
                'message' => sprintf(
                    'For a %s kg pediatric patient, %s mg equals %s mg/kg/dose, exceeding the pediatric ceiling of %s mg/kg/dose (max %s mg/dose; recommended %s mg/dose at %s mg/kg/dose).',
                    $weightKg,
                    number_format((float) $singleDoseMg, 0),
                    $mgKgPerDose,
                    $pedMaxMgKgDose,
                    number_format($maxPedSingleMg, 0),
                    number_format($safePedSingleMg, 0),
                    $pedRecMgKgDose ?: $pedMaxMgKgDose
                ),
            ];
        } elseif ($isPediatric && $mgKgPerDay !== null && $pedMaxMgKgDay !== null && $mgKgPerDay > $pedMaxMgKgDay) {
            if ($severity !== 'critical_block') {
                $severity = 'high_warning';
            }
            $alerts[] = [
                'code' => 'PEDIATRIC_MG_KG_DAILY_OVERDOSE',
                'level' => 'danger',
                'title' => "Pediatric Daily Limit Exceeded ({$mgKgPerDay} mg/kg/day > {$pedMaxMgKgDay} mg/kg/day)",
                'message' => sprintf(
                    'For a %s kg pediatric patient, %s mg/day equals %s mg/kg/day, exceeding the maximum pediatric daily limit of %s mg/kg/day (%s mg/day).',
                    $weightKg,
                    number_format((float) $dailyDoseMg, 0),
                    $mgKgPerDay,
                    $pedMaxMgKgDay,
                    number_format(round($pedMaxMgKgDay * $weightKg, 0), 0)
                ),
            ];
        }

        // 4. Check Impaired Renal Clearance Thresholds (eGFR / CrCl)
        $renalContra = $rule['renal_egfr_contraindicated_threshold'];
        $renalWarn = $rule['renal_egfr_warning_threshold'];

        if ($renalContra !== null && $egfrMlMin > 0 && $egfrMlMin < $renalContra) {
            if ($severity === 'ok') {
                $severity = 'high_warning';
            }
            $alerts[] = [
                'code' => 'RENAL_CONTRAINDICATION',
                'level' => 'danger',
                'title' => "Severe Renal Impairment Alert (Patient eGFR {$egfrMlMin} mL/min < {$renalContra} mL/min)",
                'message' => $rule['renal_adjustment_guidance'] ?: "Severe renal clearance impairment (eGFR {$egfrMlMin} mL/min): Contraindicated or requires major renal dose reduction / interval extension.",
            ];
        } elseif ($renalWarn !== null && $egfrMlMin > 0 && $egfrMlMin < $renalWarn) {
            if ($severity === 'ok') {
                $severity = 'moderate_warning';
            }
            $alerts[] = [
                'code' => 'RENAL_IMPAIRMENT_WARNING',
                'level' => 'warning',
                'title' => "Impaired Renal Clearance Prompt (Patient eGFR {$egfrMlMin} mL/min < {$renalWarn} mL/min)",
                'message' => $rule['renal_adjustment_guidance'] ?: "Impaired renal clearance (eGFR {$egfrMlMin} mL/min): Verify renal dose adjustment or extended dosing interval.",
            ];
        }

        $recommendedPedDoseMg = ($pedRecMgKgDose !== null && $weightKg > 0)
            ? min($maxSingleMg, round($pedRecMgKgDose * $weightKg, 0))
            : null;

        return [
            'matched_rule' => $rule,
            'has_violation' => !empty($alerts),
            'has_critical_block' => $hasCriticalBlock,
            'severity' => $severity,
            'alerts' => $alerts,
            'metrics' => [
                'unit_strength_mg' => $unitStrengthMg,
                'single_dose_mg' => $singleDoseMg,
                'doses_per_day' => $dosesPerDay,
                'daily_dose_mg' => $dailyDoseMg,
                'mg_kg_per_dose' => $mgKgPerDose,
                'mg_kg_per_day' => $mgKgPerDay,
                'max_single_dose_mg' => $maxSingleMg,
                'max_daily_dose_mg' => $maxDailyMg,
                'pediatric_mg_kg_per_dose' => $pedRecMgKgDose,
                'pediatric_max_mg_kg_per_dose' => $pedMaxMgKgDose,
                'pediatric_max_mg_kg_per_day' => $pedMaxMgKgDay,
                'recommended_pediatric_single_dose_mg' => $recommendedPedDoseMg,
                'patient_weight_kg' => $weightKg,
                'patient_egfr_ml_min' => $egfrMlMin,
                'is_pediatric' => $isPediatric,
            ],
        ];
    }

    /**
     * Parse strength in mg from strings like "500 mg", "1 g", "250mg/5mL", "0.25 mg", "500 mcg".
     */
    public function parseStrengthMg(string $text): ?float
    {
        if (preg_match('/(\d+(?:\.\d+)?)\s*(mg|g|mcg|ug)\b/i', $text, $m)) {
            $val = (float) $m[1];
            $unit = strtolower($m[2]);
            if ($unit === 'g') {
                return $val * 1000.0;
            }
            if ($unit === 'mcg' || $unit === 'ug') {
                return $val / 1000.0;
            }
            return $val;
        }
        return null;
    }

    /**
     * Parse prescribed single dose in mg from the `dosage` field (or title if embedded).
     * Handles explicit weight units ("40 g", "4g", "1000 mg", "500mg", "250 mcg")
     * as well as unit counts ("2 tablets", "1.5 tabs", "1 capsule") multiplied by $unitStrengthMg.
     */
    public function parsePrescribedSingleDoseMg(string $dosage, float $unitStrengthMg, string $title = ''): ?float
    {
        $d = trim($dosage);
        if ($d !== '') {
            // Explicit mass unit in dosage field: e.g. "40 g", "40g", "1,000 mg", "500 mg"
            $normalized = str_replace(',', '', $d);
            if (preg_match('/(\d+(?:\.\d+)?)\s*(mg|g|gram|grams|mcg|ug)\b/i', $normalized, $m)) {
                $val = (float) $m[1];
                $unit = strtolower($m[2]);
                if ($unit === 'g' || $unit === 'gram' || $unit === 'grams') {
                    return round($val * 1000.0, 3);
                }
                if ($unit === 'mcg' || $unit === 'ug') {
                    return round($val / 1000.0, 4);
                }
                return round($val, 3);
            }

            // Unit count: e.g. "2 tablets", "1 capsule", "2", "1.5 tab"
            if (preg_match('/^(\d+(?:\.\d+)?)\s*(?:tab|tablet|tablets|cap|caps|capsule|capsules|pill|pills|vial|amp|ampule|dose|doses|sachet|suppository)?\b/i', $normalized, $m)) {
                $count = (float) $m[1];
                // If user typed a large raw number like "1000" or "4000" without units, treat >= 25 as mg
                if ($count >= 25 && !preg_match('/(tab|cap|pill|vial|amp|dose|sachet)/i', $normalized)) {
                    return round($count, 3);
                }
                if ($count > 0 && $unitStrengthMg > 0) {
                    return round($count * $unitStrengthMg, 3);
                }
            }
        }

        // Check if title itself contains an explicit massive dose override like "Paracetamol 40 g"
        $normTitle = str_replace(',', '', $title);
        if (preg_match('/(\d+(?:\.\d+)?)\s*(g|gram|grams)\b/i', $normTitle, $m)) {
            return round(((float) $m[1]) * 1000.0, 3);
        }

        return $unitStrengthMg > 0 ? round($unitStrengthMg, 3) : null;
    }

    /**
     * Parse daily administration frequency into number of doses per 24 hours.
     */
    public function parseDosesPerDay(string $frequency, string $directions = ''): float
    {
        $f = strtoupper(trim($frequency . ' ' . $directions));
        if ($f === '') {
            return 1.0;
        }

        if (preg_match('/\b(Q4H|EVERY 4 HOURS|6 TIMES A DAY|6X DAILY|6X\/DAY)\b/', $f)) {
            return 6.0;
        }
        if (preg_match('/\b(QID|Q6H|EVERY 6 HOURS|4 TIMES A DAY|FOUR TIMES A DAY|4X DAILY|4X\/DAY)\b/', $f)) {
            return 4.0;
        }
        if (preg_match('/\b(TID|Q8H|EVERY 8 HOURS|3 TIMES A DAY|THREE TIMES A DAY|3X DAILY|3X\/DAY)\b/', $f)) {
            return 3.0;
        }
        if (preg_match('/\b(BID|Q12H|EVERY 12 HOURS|2 TIMES A DAY|TWICE A DAY|TWICE DAILY|2X DAILY|2X\/DAY)\b/', $f)) {
            return 2.0;
        }
        if (preg_match('/\b(OD|QD|Q24H|EVERY 24 HOURS|ONCE A DAY|ONCE DAILY|DAILY|EVERY DAY|HS|AT BEDTIME)\b/', $f)) {
            return 1.0;
        }
        if (preg_match('/(\d+)\s*(?:TIMES|X)\s*(?:A|PER)?\s*DAY/', $f, $m)) {
            return max(1.0, (float) $m[1]);
        }
        if (preg_match('/EVERY\s*(\d+)\s*HOURS?/', $f, $m) && (int) $m[1] > 0) {
            return round(24.0 / (int) $m[1], 2);
        }

        return 1.0;
    }

    private static function formatMgAndGrams(float $mg): string
    {
        if ($mg >= 1000.0) {
            $g = round($mg / 1000.0, 2);
            return number_format($mg, 0) . " mg ({$g} g)";
        }
        return number_format($mg, $mg < 1 ? 2 : 0) . ' mg';
    }

    private function formatRuleRow(array $r): array
    {
        return [
            'id' => (int) $r['id'],
            'drug_id' => $r['drug_id'] !== null ? (int) $r['drug_id'] : null,
            'generic_keyword' => $r['generic_keyword'],
            'display_name' => $r['display_name'],
            'default_unit_strength_mg' => (float) $r['default_unit_strength_mg'],
            'max_single_dose_mg' => (float) $r['max_single_dose_mg'],
            'max_daily_dose_mg' => (float) $r['max_daily_dose_mg'],
            'pediatric_mg_kg_per_dose' => $r['pediatric_mg_kg_per_dose'] !== null ? (float) $r['pediatric_mg_kg_per_dose'] : null,
            'pediatric_max_mg_kg_per_dose' => $r['pediatric_max_mg_kg_per_dose'] !== null ? (float) $r['pediatric_max_mg_kg_per_dose'] : null,
            'pediatric_max_mg_kg_per_day' => $r['pediatric_max_mg_kg_per_day'] !== null ? (float) $r['pediatric_max_mg_kg_per_day'] : null,
            'renal_egfr_warning_threshold' => $r['renal_egfr_warning_threshold'] !== null ? (float) $r['renal_egfr_warning_threshold'] : null,
            'renal_egfr_contraindicated_threshold' => $r['renal_egfr_contraindicated_threshold'] !== null ? (float) $r['renal_egfr_contraindicated_threshold'] : null,
            'renal_adjustment_guidance' => $r['renal_adjustment_guidance'],
            'clinical_overdose_warning' => $r['clinical_overdose_warning'],
        ];
    }
}
