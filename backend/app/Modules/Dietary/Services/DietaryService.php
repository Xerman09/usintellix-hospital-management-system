<?php

namespace App\Modules\Dietary\Services;

use App\Core\Database;
use PDO;
use RuntimeException;

class DietaryService
{
    /**
     * Standard Food Allergy Keywords to automatically detect from patient_allergies
     */
    private const FOOD_ALLERGEN_KEYWORDS = [
        'peanut', 'tree nut', 'nut', 'shellfish', 'shrimp', 'crab', 'lobster', 'prawn',
        'fish', 'egg', 'milk', 'dairy', 'lactose', 'wheat', 'gluten', 'soy', 'sesame',
        'mustard', 'celery', 'sulfite', 'sulphite', 'lupin', 'mollusc', 'clam', 'oyster'
    ];

    /**
     * Generate sequential Prescription Number: DIET-YYYY-XXXXX
     */
    public static function nextPrescriptionNumber(PDO $pdo, ?int $year = null): string
    {
        $year = $year ?: (int)date('Y');
        $stmt = $pdo->prepare("SELECT last_seq FROM dietary_prescription_counters WHERE prefix_year = ? FOR UPDATE");
        $stmt->execute([$year]);
        $seq = $stmt->fetchColumn();

        if ($seq === false) {
            $seq = 1;
            $ins = $pdo->prepare("INSERT INTO dietary_prescription_counters (prefix_year, last_seq) VALUES (?, ?)");
            $ins->execute([$year, $seq]);
        } else {
            $seq = (int)$seq + 1;
            $upd = $pdo->prepare("UPDATE dietary_prescription_counters SET last_seq = ? WHERE prefix_year = ?");
            $upd->execute([$seq, $year]);
        }

        return sprintf("DIET-%04d-%05d", $year, $seq);
    }

    /**
     * Generate sequential Meal Tray Number: TRAY-YYYY-XXXXX
     */
    public static function nextTrayNumber(PDO $pdo, ?int $year = null): string
    {
        $year = $year ?: (int)date('Y');
        $stmt = $pdo->prepare("SELECT last_seq FROM dietary_tray_counters WHERE prefix_year = ? FOR UPDATE");
        $stmt->execute([$year]);
        $seq = $stmt->fetchColumn();

        if ($seq === false) {
            $seq = 1;
            $ins = $pdo->prepare("INSERT INTO dietary_tray_counters (prefix_year, last_seq) VALUES (?, ?)");
            $ins->execute([$year, $seq]);
        } else {
            $seq = (int)$seq + 1;
            $upd = $pdo->prepare("UPDATE dietary_tray_counters SET last_seq = ? WHERE prefix_year = ?");
            $upd->execute([$seq, $year]);
        }

        return sprintf("TRAY-%04d-%05d", $year, $seq);
    }

    /**
     * Inspects patient documented allergies and extracts food-related allergies
     */
    public function getPatientFoodAllergies(int $patientId): array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare("
            SELECT pa.id,
                   COALESCE(a.name, pa.coding, 'Unknown Allergen') AS allergen_name,
                   pa.severity,
                   pa.reaction,
                   pa.verification_status,
                   pa.comments
            FROM patient_allergies pa
            LEFT JOIN allergies a ON pa.allergy_id = a.id
            WHERE pa.patient_id = ? AND (pa.deleted_at IS NULL)
        ");
        $stmt->execute([$patientId]);
        $allergies = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $foodAllergies = [];
        foreach ($allergies as $a) {
            $nameLower = strtolower($a['allergen_name']);
            $isFood = false;

            foreach (self::FOOD_ALLERGEN_KEYWORDS as $keyword) {
                if (str_contains($nameLower, $keyword)) {
                    $isFood = true;
                    break;
                }
            }

            $a['is_food_allergy'] = $isFood;
            if ($isFood) {
                $foodAllergies[] = $a;
            }
        }

        return [
            'all_allergies' => $allergies,
            'food_allergies' => $foodAllergies,
            'has_food_allergies' => count($foodAllergies) > 0,
            'alert_string' => implode(', ', array_map(function ($item) {
                $sev = !empty($item['severity']) ? " (" . ucfirst($item['severity']) . ")" : "";
                return $item['allergen_name'] . $sev;
            }, $foodAllergies))
        ];
    }

    /**
     * Prescribe a Clinical Diet for a Patient
     */
    public function prescribeDiet(array $data, ?int $userId = null): array
    {
        $pdo = Database::connection();
        $patientId = (int)($data['patient_id'] ?? 0);
        $dietCategory = trim($data['diet_category'] ?? 'regular');
        $doctorName = trim($data['prescribing_doctor_name'] ?? '');

        if ($patientId <= 0) {
            throw new RuntimeException("Patient ID is required.");
        }

        if (empty($doctorName)) {
            throw new RuntimeException("Prescribing doctor name is required.");
        }

        $validDiets = [
            'regular', 'diabetic', 'low_sodium', 'renal', 'pureed_soft',
            'full_liquid', 'clear_liquid', 'npo', 'enteral_tube', 'low_fat', 'high_protein', 'custom'
        ];
        if (!in_array($dietCategory, $validDiets, true)) {
            throw new RuntimeException("Invalid diet category: '{$dietCategory}'.");
        }

        // Get patient food allergies
        $allergyInfo = $this->getPatientFoodAllergies($patientId);

        // Resolve active admission and ward/room/bed if available
        $admissionId = !empty($data['admission_id']) ? (int)$data['admission_id'] : null;
        $wardRoomBed = !empty($data['ward_room_bed']) ? trim($data['ward_room_bed']) : null;

        if (!$wardRoomBed) {
            $admStmt = $pdo->prepare("
                SELECT ia.id, ia.ward_id, ia.bed_id, hb.bed_number, hb.room_number
                FROM inpatient_admissions ia
                LEFT JOIN hospital_beds hb ON ia.bed_id = hb.id
                WHERE ia.patient_id = ? AND ia.status IN ('Admitted', 'Pending Discharge')
                ORDER BY ia.id DESC LIMIT 1
            ");
            $admStmt->execute([$patientId]);
            $adm = $admStmt->fetch(PDO::FETCH_ASSOC);

            if ($adm) {
                $admissionId = $admissionId ?: (int)$adm['id'];
                $wardRoomBed = "Ward " . ($adm['ward_id'] ?? 'Main') . " · Room " . ($adm['room_number'] ?? 'N/A') . " · Bed " . ($adm['bed_number'] ?? 'N/A');
            } else {
                $wardRoomBed = "Outpatient / Day Stay";
            }
        }

        $pdo->beginTransaction();
        try {
            // Supersede / complete any previous active diet prescription
            $supStmt = $pdo->prepare("
                UPDATE patient_diet_prescriptions
                SET status = 'completed', effective_to = NOW(), updated_at = NOW()
                WHERE patient_id = ? AND status = 'active'
            ");
            $supStmt->execute([$patientId]);

            $rxNumber = self::nextPrescriptionNumber($pdo);
            $effectiveFrom = !empty($data['effective_from']) ? $data['effective_from'] : date('Y-m-d H:i:s');
            $status = ($dietCategory === 'npo') ? 'active' : 'active';

            $insStmt = $pdo->prepare("
                INSERT INTO patient_diet_prescriptions (
                    prescription_number, patient_id, admission_id, ward_room_bed,
                    diet_category, texture_consistency, liquid_consistency,
                    calorie_target_kcal, sodium_limit_mg, fluid_restriction_ml,
                    protein_limit_g, potassium_limit_mg, phosphorus_limit_mg,
                    clinical_indication, special_instructions,
                    prescribed_by, prescribing_doctor_name,
                    effective_from, effective_to, status,
                    created_at, updated_at
                ) VALUES (
                    ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    ?, ?,
                    ?, ?,
                    ?, ?, ?,
                    NOW(), NOW()
                )
            ");

            $insStmt->execute([
                $rxNumber,
                $patientId,
                $admissionId,
                $wardRoomBed,
                $dietCategory,
                $data['texture_consistency'] ?? 'regular',
                $data['liquid_consistency'] ?? 'thin',
                !empty($data['calorie_target_kcal']) ? (int)$data['calorie_target_kcal'] : null,
                !empty($data['sodium_limit_mg']) ? (int)$data['sodium_limit_mg'] : null,
                !empty($data['fluid_restriction_ml']) ? (int)$data['fluid_restriction_ml'] : null,
                !empty($data['protein_limit_g']) ? (int)$data['protein_limit_g'] : null,
                !empty($data['potassium_limit_mg']) ? (int)$data['potassium_limit_mg'] : null,
                !empty($data['phosphorus_limit_mg']) ? (int)$data['phosphorus_limit_mg'] : null,
                $data['clinical_indication'] ?? null,
                $data['special_instructions'] ?? null,
                $userId,
                $doctorName,
                $effectiveFrom,
                !empty($data['effective_to']) ? $data['effective_to'] : null,
                $status
            ]);

            $rxId = (int)$pdo->lastInsertId();

            // Auto-generate upcoming meal trays for today (Breakfast, Lunch, Dinner)
            $this->generateUpcomingTraysForPrescription($pdo, $rxId, [
                'patient_id' => $patientId,
                'admission_id' => $admissionId,
                'ward_room_bed' => $wardRoomBed,
                'diet_category' => $dietCategory,
                'texture_consistency' => $data['texture_consistency'] ?? 'regular',
                'liquid_consistency' => $data['liquid_consistency'] ?? 'thin',
                'allergy_alerts' => $allergyInfo['alert_string'],
                'has_food_allergies' => $allergyInfo['has_food_allergies'] ? 1 : 0,
                'is_npo' => ($dietCategory === 'npo')
            ]);

            $pdo->commit();

            return $this->getPrescriptionDetail($rxId);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Auto-generate upcoming meal trays for today and tomorrow linked directly to patient food allergies
     */
    private function generateUpcomingTraysForPrescription(PDO $pdo, int $rxId, array $p): void
    {
        $dates = [date('Y-m-d'), date('Y-m-d', strtotime('+1 day'))];
        $meals = ['breakfast', 'lunch', 'dinner'];

        $insTray = $pdo->prepare("
            INSERT INTO dietary_meal_trays (
                tray_number, prescription_id, patient_id, admission_id, ward_room_bed,
                meal_date, meal_type, diet_category, texture_consistency, liquid_consistency,
                has_food_allergies, allergy_alerts, status, created_at, updated_at
            ) VALUES (
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, NOW(), NOW()
            )
        ");

        $trayStatus = !empty($p['is_npo']) ? 'held_npo' : 'scheduled';

        foreach ($dates as $date) {
            foreach ($meals as $m) {
                // Check if already created
                $check = $pdo->prepare("SELECT id FROM dietary_meal_trays WHERE patient_id = ? AND meal_date = ? AND meal_type = ?");
                $check->execute([$p['patient_id'], $date, $m]);
                $existing = $check->fetchColumn();

                if ($existing) {
                    // Update existing tray to new prescription diet & allergies
                    $upd = $pdo->prepare("
                        UPDATE dietary_meal_trays
                        SET prescription_id = ?,
                            diet_category = ?,
                            texture_consistency = ?,
                            liquid_consistency = ?,
                            has_food_allergies = ?,
                            allergy_alerts = ?,
                            status = CASE WHEN ? = 1 THEN 'held_npo' ELSE status END,
                            updated_at = NOW()
                        WHERE id = ?
                    ");
                    $upd->execute([
                        $rxId,
                        $p['diet_category'],
                        $p['texture_consistency'],
                        $p['liquid_consistency'],
                        $p['has_food_allergies'],
                        $p['allergy_alerts'],
                        !empty($p['is_npo']) ? 1 : 0,
                        $existing
                    ]);
                } else {
                    $trayNo = self::nextTrayNumber($pdo);
                    $insTray->execute([
                        $trayNo,
                        $rxId,
                        $p['patient_id'],
                        $p['admission_id'],
                        $p['ward_room_bed'],
                        $date,
                        $m,
                        $p['diet_category'],
                        $p['texture_consistency'],
                        $p['liquid_consistency'],
                        $p['has_food_allergies'],
                        $p['allergy_alerts'],
                        $trayStatus
                    ]);
                }
            }
        }
    }

    /**
     * Discontinue a Diet Prescription
     */
    public function discontinueDiet(int $prescriptionId, string $reason, ?int $userId = null): array
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("SELECT * FROM patient_diet_prescriptions WHERE id = ? FOR UPDATE");
            $stmt->execute([$prescriptionId]);
            $rx = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$rx) {
                throw new RuntimeException("Diet prescription record not found.");
            }

            $upd = $pdo->prepare("
                UPDATE patient_diet_prescriptions
                SET status = 'discontinued',
                    discontinued_at = NOW(),
                    discontinued_by = ?,
                    discontinuation_reason = ?,
                    effective_to = COALESCE(effective_to, NOW()),
                    updated_at = NOW()
                WHERE id = ?
            ");
            $upd->execute([$userId, $reason, $prescriptionId]);

            // Cancel any scheduled future trays for this prescription
            $cancelTrays = $pdo->prepare("
                UPDATE dietary_meal_trays
                SET status = 'patient_refused',
                    kitchen_prep_notes = CONCAT(COALESCE(kitchen_prep_notes, ''), ' [Diet Discontinued: ', ?, ']')
                WHERE prescription_id = ? AND status = 'scheduled'
            ");
            $cancelTrays->execute([$reason, $prescriptionId]);

            $pdo->commit();
            return $this->getPrescriptionDetail($prescriptionId);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Update Kitchen Meal Tray Lifecycle Status
     */
    public function updateTrayStatus(int $trayId, string $status, array $extra = []): array
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("SELECT * FROM dietary_meal_trays WHERE id = ? FOR UPDATE");
            $stmt->execute([$trayId]);
            $tray = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$tray) {
                throw new RuntimeException("Meal tray not found.");
            }

            $validStatuses = ['scheduled', 'prep_in_kitchen', 'tray_assembled', 'in_transit', 'delivered', 'patient_refused', 'held_npo'];
            if (!in_array($status, $validStatuses, true)) {
                throw new RuntimeException("Invalid tray status: '{$status}'.");
            }

            $allergyCleared = !empty($extra['allergy_cleared_by_kitchen']) ? 1 : $tray['allergy_cleared_by_kitchen'];
            $preparedBy = $extra['prepared_by'] ?? $tray['prepared_by'];
            $deliveredBy = $extra['delivered_by'] ?? $tray['delivered_by'];
            $deliveredAt = ($status === 'delivered') ? date('Y-m-d H:i:s') : $tray['delivered_at'];
            $notes = $extra['kitchen_prep_notes'] ?? $tray['kitchen_prep_notes'];

            $upd = $pdo->prepare("
                UPDATE dietary_meal_trays
                SET status = ?,
                    allergy_cleared_by_kitchen = ?,
                    prepared_by = ?,
                    delivered_by = ?,
                    delivered_at = ?,
                    kitchen_prep_notes = ?,
                    updated_at = NOW()
                WHERE id = ?
            ");
            $upd->execute([
                $status,
                $allergyCleared,
                $preparedBy,
                $deliveredBy,
                $deliveredAt,
                $notes,
                $trayId
            ]);

            $pdo->commit();

            return $this->getTrayDetail($trayId);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Get Prescription Detail with patient demographics, food allergies, and tray log
     */
    public function getPrescriptionDetail(int $prescriptionId): ?array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare("
            SELECT pdp.*,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   p.patient_no AS patient_mrn,
                   p.birthdate AS patient_dob,
                   p.sex AS patient_gender,
                   p.blood_type AS patient_blood_type,
                   ia.admission_number,
                   ia.admitting_diagnosis
            FROM patient_diet_prescriptions pdp
            JOIN patients p ON pdp.patient_id = p.id
            LEFT JOIN inpatient_admissions ia ON pdp.admission_id = ia.id
            WHERE pdp.id = ?
        ");
        $stmt->execute([$prescriptionId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        // Attach active allergies
        $row['allergies'] = $this->getPatientFoodAllergies((int)$row['patient_id']);

        // Attach recent trays
        $trayStmt = $pdo->prepare("
            SELECT * FROM dietary_meal_trays
            WHERE prescription_id = ?
            ORDER BY meal_date DESC, id DESC
            LIMIT 10
        ");
        $trayStmt->execute([$prescriptionId]);
        $row['recent_trays'] = $trayStmt->fetchAll(PDO::FETCH_ASSOC);

        return $row;
    }

    /**
     * Get Tray Detail
     */
    public function getTrayDetail(int $trayId): ?array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare("
            SELECT dmt.*,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   p.patient_no AS patient_mrn,
                   p.birthdate AS patient_dob,
                   pdp.prescription_number,
                   pdp.special_instructions,
                   pdp.calorie_target_kcal,
                   pdp.sodium_limit_mg,
                   pdp.fluid_restriction_ml
            FROM dietary_meal_trays dmt
            JOIN patients p ON dmt.patient_id = p.id
            JOIN patient_diet_prescriptions pdp ON dmt.prescription_id = pdp.id
            WHERE dmt.id = ?
        ");
        $stmt->execute([$trayId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * List Clinical Diet Prescriptions with filters and search
     */
    public function listPrescriptions(array $filters = [], int $page = 1, int $perPage = 20): array
    {
        $pdo = Database::connection();
        $where = [];
        $params = [];

        if (!empty($filters['patient_id'])) {
            $where[] = "pdp.patient_id = ?";
            $params[] = (int)$filters['patient_id'];
        }

        if (!empty($filters['diet_category'])) {
            $where[] = "pdp.diet_category = ?";
            $params[] = $filters['diet_category'];
        }

        if (!empty($filters['status'])) {
            $where[] = "pdp.status = ?";
            $params[] = $filters['status'];
        }

        if (!empty($filters['search'])) {
            $term = '%' . trim($filters['search']) . '%';
            $where[] = "(pdp.prescription_number LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ? OR p.patient_no LIKE ? OR pdp.ward_room_bed LIKE ?)";
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        $whereClause = count($where) ? 'WHERE ' . implode(' AND ', $where) : '';

        // Total count
        $countSql = "
            SELECT COUNT(*)
            FROM patient_diet_prescriptions pdp
            JOIN patients p ON pdp.patient_id = p.id
            {$whereClause}
        ";
        $cStmt = $pdo->prepare($countSql);
        $cStmt->execute($params);
        $total = (int)$cStmt->fetchColumn();

        $offset = max(0, ($page - 1) * $perPage);
        $sql = "
            SELECT pdp.*,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   p.patient_no AS patient_mrn,
                   p.birthdate AS patient_dob,
                   p.sex AS patient_gender,
                   p.blood_type AS patient_blood_type,
                   ia.admission_number
            FROM patient_diet_prescriptions pdp
            JOIN patients p ON pdp.patient_id = p.id
            LEFT JOIN inpatient_admissions ia ON pdp.admission_id = ia.id
            {$whereClause}
            ORDER BY (pdp.status = 'active') DESC, pdp.id DESC
            LIMIT {$perPage} OFFSET {$offset}
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Enrich with food allergies count & alert text
        foreach ($items as &$item) {
            $allInfo = $this->getPatientFoodAllergies((int)$item['patient_id']);
            $item['food_allergies'] = $allInfo['food_allergies'];
            $item['has_food_allergies'] = $allInfo['has_food_allergies'];
            $item['allergy_alert_string'] = $allInfo['alert_string'];
        }

        return [
            'items' => $items,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'last_page' => (int)ceil($total / max(1, $perPage))
        ];
    }

    /**
     * List Kitchen Meal Trays with filters for Meal Date & Meal Type
     */
    public function listKitchenMealTrays(array $filters = [], int $page = 1, int $perPage = 50): array
    {
        $pdo = Database::connection();
        $where = [];
        $params = [];

        $mealDate = !empty($filters['meal_date']) ? $filters['meal_date'] : date('Y-m-d');
        $where[] = "dmt.meal_date = ?";
        $params[] = $mealDate;

        if (!empty($filters['meal_type'])) {
            $where[] = "dmt.meal_type = ?";
            $params[] = $filters['meal_type'];
        }

        if (!empty($filters['status'])) {
            $where[] = "dmt.status = ?";
            $params[] = $filters['status'];
        }

        if (isset($filters['has_food_allergies']) && $filters['has_food_allergies'] !== '') {
            $where[] = "dmt.has_food_allergies = ?";
            $params[] = (int)$filters['has_food_allergies'];
        }

        if (!empty($filters['diet_category'])) {
            $where[] = "dmt.diet_category = ?";
            $params[] = $filters['diet_category'];
        }

        if (!empty($filters['search'])) {
            $term = '%' . trim($filters['search']) . '%';
            $where[] = "(dmt.tray_number LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ? OR p.patient_no LIKE ? OR dmt.ward_room_bed LIKE ?)";
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        $whereClause = 'WHERE ' . implode(' AND ', $where);

        $countSql = "
            SELECT COUNT(*)
            FROM dietary_meal_trays dmt
            JOIN patients p ON dmt.patient_id = p.id
            {$whereClause}
        ";
        $cStmt = $pdo->prepare($countSql);
        $cStmt->execute($params);
        $total = (int)$cStmt->fetchColumn();

        $offset = max(0, ($page - 1) * $perPage);
        $sql = "
            SELECT dmt.*,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   p.patient_no AS patient_mrn,
                   pdp.special_instructions,
                   pdp.prescribing_doctor_name
            FROM dietary_meal_trays dmt
            JOIN patients p ON dmt.patient_id = p.id
            JOIN patient_diet_prescriptions pdp ON dmt.prescription_id = pdp.id
            {$whereClause}
            ORDER BY (dmt.has_food_allergies = 1) DESC, dmt.ward_room_bed ASC, dmt.id ASC
            LIMIT {$perPage} OFFSET {$offset}
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'items' => $items,
            'total' => $total,
            'meal_date' => $mealDate,
            'page' => $page,
            'per_page' => $perPage,
            'last_page' => (int)ceil($total / max(1, $perPage))
        ];
    }

    /**
     * Statistics for KPI banner
     */
    public static function getStats(): array
    {
        $pdo = Database::connection();
        $today = date('Y-m-d');

        $activePrescriptions = (int)$pdo->query("SELECT COUNT(*) FROM patient_diet_prescriptions WHERE status = 'active'")->fetchColumn();
        $npoCount = (int)$pdo->query("SELECT COUNT(*) FROM patient_diet_prescriptions WHERE status = 'active' AND diet_category = 'npo'")->fetchColumn();
        $diabeticCount = (int)$pdo->query("SELECT COUNT(*) FROM patient_diet_prescriptions WHERE status = 'active' AND diet_category = 'diabetic'")->fetchColumn();
        $renalCount = (int)$pdo->query("SELECT COUNT(*) FROM patient_diet_prescriptions WHERE status = 'active' AND diet_category = 'renal'")->fetchColumn();
        $cardiacCount = (int)$pdo->query("SELECT COUNT(*) FROM patient_diet_prescriptions WHERE status = 'active' AND diet_category = 'low_sodium'")->fetchColumn();

        // Trays today
        $traysToday = (int)$pdo->query("SELECT COUNT(*) FROM dietary_meal_trays WHERE meal_date = '{$today}'")->fetchColumn();
        $allergiesToday = (int)$pdo->query("SELECT COUNT(*) FROM dietary_meal_trays WHERE meal_date = '{$today}' AND has_food_allergies = 1")->fetchColumn();
        $deliveredToday = (int)$pdo->query("SELECT COUNT(*) FROM dietary_meal_trays WHERE meal_date = '{$today}' AND status = 'delivered'")->fetchColumn();
        $pendingPrep = (int)$pdo->query("SELECT COUNT(*) FROM dietary_meal_trays WHERE meal_date = '{$today}' AND status IN ('scheduled', 'prep_in_kitchen')")->fetchColumn();

        return [
            'active_prescriptions' => $activePrescriptions,
            'npo_fasting_patients' => $npoCount,
            'diabetic_patients' => $diabeticCount,
            'renal_patients' => $renalCount,
            'cardiac_patients' => $cardiacCount,
            'trays_today' => $traysToday,
            'trays_with_food_allergies' => $allergiesToday,
            'trays_delivered_today' => $deliveredToday,
            'trays_pending_prep' => $pendingPrep
        ];
    }
}
