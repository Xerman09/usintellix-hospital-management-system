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

        $ordersToday = (int)$pdo->query("SELECT COUNT(*) FROM patient_meal_orders WHERE meal_date = '{$today}'")->fetchColumn();

        return [
            'active_prescriptions' => $activePrescriptions,
            'npo_fasting_patients' => $npoCount,
            'diabetic_patients' => $diabeticCount,
            'renal_patients' => $renalCount,
            'cardiac_patients' => $cardiacCount,
            'trays_today' => $traysToday,
            'trays_with_food_allergies' => $allergiesToday,
            'trays_delivered_today' => $deliveredToday,
            'trays_pending_prep' => $pendingPrep,
            'meal_orders_today' => $ordersToday
        ];
    }

    /**
     * Atomically generates sequential Meal Order Number: MO-YYYY-XXXXX
     */
    public static function nextMealOrderNumber(PDO $pdo, ?int $year = null): string
    {
        $year = $year ?: (int)date('Y');
        $stmt = $pdo->prepare("SELECT last_seq FROM dietary_meal_order_counters WHERE prefix_year = ? FOR UPDATE");
        $stmt->execute([$year]);
        $seq = $stmt->fetchColumn();

        if ($seq === false) {
            $seq = 1;
            $ins = $pdo->prepare("INSERT INTO dietary_meal_order_counters (prefix_year, last_seq) VALUES (?, ?)");
            $ins->execute([$year, $seq]);
        } else {
            $seq = (int)$seq + 1;
            $upd = $pdo->prepare("UPDATE dietary_meal_order_counters SET last_seq = ? WHERE prefix_year = ?");
            $upd->execute([$seq, $year]);
        }

        return sprintf("MO-%04d-%05d", $year, $seq);
    }

    /**
     * Get Hospital Menu with Automatic Lockout Evaluation for a Patient
     */
    public function getPatientMenuWithLockouts(int $patientId, ?string $mealType = null): array
    {
        $pdo = Database::connection();

        // 1. Fetch active prescription
        $rxStmt = $pdo->prepare("
            SELECT * FROM patient_diet_prescriptions
            WHERE patient_id = ? AND status = 'active'
            ORDER BY id DESC LIMIT 1
        ");
        $rxStmt->execute([$patientId]);
        $activeRx = $rxStmt->fetch(PDO::FETCH_ASSOC);

        $dietCategory = $activeRx['diet_category'] ?? 'regular';

        // 2. Fetch documented food allergies
        $allergyInfo = $this->getPatientFoodAllergies($patientId);
        $allergies = $allergyInfo['food_allergies'];

        // 3. Fetch menu items
        $sql = "SELECT * FROM dietary_menu_items WHERE is_active = 1";
        $params = [];
        if ($mealType && in_array($mealType, ['breakfast', 'lunch', 'dinner', 'snack_am', 'snack_pm', 'snack_hs'], true)) {
            $sql .= " AND (meal_availability = 'all' OR meal_availability LIKE ?)";
            $params[] = '%' . $mealType . '%';
        }
        $sql .= " ORDER BY category ASC, name ASC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 4. Evaluate lockout for each item
        $evaluatedItems = [];
        foreach ($items as $item) {
            $lockout = $this->evaluateItemLockout($item, $dietCategory, $activeRx, $allergies);
            $item['is_locked'] = $lockout['is_locked'];
            $item['lockout_reason'] = $lockout['reason'];
            $evaluatedItems[] = $item;
        }

        return [
            'patient_id' => $patientId,
            'diet_prescription' => $activeRx,
            'diet_category' => $dietCategory,
            'is_npo' => ($dietCategory === 'npo'),
            'food_allergies' => $allergyInfo,
            'menu_items' => $evaluatedItems
        ];
    }

    /**
     * Helper to evaluate diet plan compliance and allergen safety for a menu item
     */
    public function evaluateItemLockout(array $item, string $dietCategory, ?array $activeRx, array $foodAllergies): array
    {
        // 1. Hard safety block: NPO (Fasting)
        if ($dietCategory === 'npo') {
            return [
                'is_locked' => true,
                'reason' => 'LOCKED OUT: Patient has strict NPO (Nil Per Os) fasting order. All food & liquids prohibited.'
            ];
        }

        // 2. Allergen Lockouts
        foreach ($foodAllergies as $a) {
            $nameLower = strtolower($a['allergen_name']);

            if ((str_contains($nameLower, 'peanut')) && !empty($item['contains_peanuts'])) {
                return ['is_locked' => true, 'reason' => "ALLERGY LOCKOUT: Contains Peanuts (Patient has documented {$a['severity']} allergy)"];
            }
            if ((str_contains($nameLower, 'tree nut') || str_contains($nameLower, 'nut')) && !empty($item['contains_tree_nuts'])) {
                return ['is_locked' => true, 'reason' => "ALLERGY LOCKOUT: Contains Tree Nuts (Patient has documented allergy)"];
            }
            if ((str_contains($nameLower, 'shellfish') || str_contains($nameLower, 'shrimp') || str_contains($nameLower, 'crab')) && !empty($item['contains_shellfish'])) {
                return ['is_locked' => true, 'reason' => "ALLERGY LOCKOUT: Contains Shellfish (Patient has documented allergy)"];
            }
            if (str_contains($nameLower, 'fish') && !empty($item['contains_fish'])) {
                return ['is_locked' => true, 'reason' => "ALLERGY LOCKOUT: Contains Fish (Patient has documented allergy)"];
            }
            if (str_contains($nameLower, 'egg') && !empty($item['contains_eggs'])) {
                return ['is_locked' => true, 'reason' => "ALLERGY LOCKOUT: Contains Eggs (Patient has documented allergy)"];
            }
            if ((str_contains($nameLower, 'milk') || str_contains($nameLower, 'dairy') || str_contains($nameLower, 'lactose')) && !empty($item['contains_milk'])) {
                return ['is_locked' => true, 'reason' => "ALLERGY LOCKOUT: Contains Milk / Dairy (Patient has documented allergy)"];
            }
            if ((str_contains($nameLower, 'wheat') || str_contains($nameLower, 'gluten')) && !empty($item['contains_wheat_gluten'])) {
                return ['is_locked' => true, 'reason' => "ALLERGY LOCKOUT: Contains Wheat / Gluten (Patient has documented allergy)"];
            }
            if (str_contains($nameLower, 'soy') && !empty($item['contains_soy'])) {
                return ['is_locked' => true, 'reason' => "ALLERGY LOCKOUT: Contains Soy (Patient has documented allergy)"];
            }
            if (str_contains($nameLower, 'sesame') && !empty($item['contains_sesame'])) {
                return ['is_locked' => true, 'reason' => "ALLERGY LOCKOUT: Contains Sesame (Patient has documented allergy)"];
            }
        }

        // 3. Clinical Diet Category Lockouts
        if ($dietCategory === 'clear_liquid' && empty($item['allowed_clear_liquid'])) {
            return ['is_locked' => true, 'reason' => 'LOCKED OUT: Solid food or non-clear liquid prohibited on Clear Liquid Diet.'];
        }

        if ($dietCategory === 'full_liquid' && empty($item['allowed_full_liquid'])) {
            return ['is_locked' => true, 'reason' => 'LOCKED OUT: Solid food prohibited on Full Liquid Diet.'];
        }

        if ($dietCategory === 'pureed_soft' && empty($item['allowed_pureed_soft'])) {
            return ['is_locked' => true, 'reason' => 'LOCKED OUT: Texture prohibited on Dysphagia Pureed / Soft Diet.'];
        }

        if ($dietCategory === 'renal') {
            if (empty($item['allowed_renal']) || (int)$item['potassium_mg'] > 400 || (int)$item['phosphorus_mg'] > 300) {
                return [
                    'is_locked' => true,
                    'reason' => 'LOCKED OUT: High potassium (' . $item['potassium_mg'] . 'mg) or phosphorus (' . $item['phosphorus_mg'] . 'mg) strictly prohibited on Renal Diet.'
                ];
            }
        }

        if ($dietCategory === 'low_sodium') {
            if (empty($item['allowed_low_sodium']) || (int)$item['sodium_mg'] > 400) {
                return [
                    'is_locked' => true,
                    'reason' => 'LOCKED OUT: High sodium (' . $item['sodium_mg'] . 'mg > 400mg) prohibited on Cardiac / Low Sodium Diet.'
                ];
            }
        }

        if ($dietCategory === 'diabetic') {
            if (empty($item['allowed_diabetic']) || (float)$item['sugar_g'] > 12.0) {
                return [
                    'is_locked' => true,
                    'reason' => 'LOCKED OUT: High sugar content (' . $item['sugar_g'] . 'g) prohibited on Diabetic / Consistent Carb Plan.'
                ];
            }
        }

        if ($dietCategory === 'low_fat') {
            if (empty($item['allowed_low_fat']) || (float)$item['fat_g'] > 10.0) {
                return [
                    'is_locked' => true,
                    'reason' => 'LOCKED OUT: High fat content (' . $item['fat_g'] . 'g) prohibited on Low Fat / Gallbladder Diet.'
                ];
            }
        }

        return ['is_locked' => false, 'reason' => null];
    }

    /**
     * Place a Patient Meal Order with Strict Diet Compliance & Lockout Enforcement
     */
    public function placeMealOrder(array $data, ?int $userId = null): array
    {
        $pdo = Database::connection();
        $patientId = (int)($data['patient_id'] ?? 0);
        $mealDate = !empty($data['meal_date']) ? $data['meal_date'] : date('Y-m-d');
        $mealType = trim($data['meal_type'] ?? 'lunch');
        $items = $data['items'] ?? [];

        if ($patientId <= 0) {
            throw new RuntimeException("Patient ID is required.");
        }

        if (empty($items) || !is_array($items)) {
            throw new RuntimeException("Please select at least one menu item for the meal order.");
        }

        // Fetch active prescription
        $rxStmt = $pdo->prepare("
            SELECT * FROM patient_diet_prescriptions
            WHERE patient_id = ? AND status = 'active'
            ORDER BY id DESC LIMIT 1
        ");
        $rxStmt->execute([$patientId]);
        $activeRx = $rxStmt->fetch(PDO::FETCH_ASSOC);

        if (!$activeRx) {
            throw new RuntimeException("No active clinical diet prescription found for patient. A clinical diet must be prescribed before ordering meals.");
        }

        if ($activeRx['diet_category'] === 'npo') {
            throw new RuntimeException("SAFETY BLOCK: Patient is on active NPO (Nil Per Os) fasting status. Meal ordering is locked out by order of {$activeRx['prescribing_doctor_name']}.");
        }

        $allergyInfo = $this->getPatientFoodAllergies($patientId);
        $foodAllergies = $allergyInfo['food_allergies'];

        // Validate items and verify lockouts
        $totalCalories = 0;
        $totalSodium = 0;
        $totalCarbs = 0.0;
        $totalProtein = 0.0;
        $totalPotassium = 0;

        $validatedItems = [];
        foreach ($items as $req) {
            $itemId = (int)($req['menu_item_id'] ?? $req['id'] ?? 0);
            $qty = max(1, (int)($req['quantity'] ?? 1));

            $itemStmt = $pdo->prepare("SELECT * FROM dietary_menu_items WHERE id = ? AND is_active = 1");
            $itemStmt->execute([$itemId]);
            $menuItem = $itemStmt->fetch(PDO::FETCH_ASSOC);

            if (!$menuItem) {
                throw new RuntimeException("Menu item ID {$itemId} not found.");
            }

            $lockout = $this->evaluateItemLockout($menuItem, $activeRx['diet_category'], $activeRx, $foodAllergies);

            if ($lockout['is_locked']) {
                throw new RuntimeException("ORDER BLOCKED: '{$menuItem['name']}' is prohibited for this patient. {$lockout['reason']}");
            }

            $totalCalories += (int)$menuItem['calories'] * $qty;
            $totalSodium += (int)$menuItem['sodium_mg'] * $qty;
            $totalCarbs += (float)$menuItem['carbs_g'] * $qty;
            $totalProtein += (float)$menuItem['protein_g'] * $qty;
            $totalPotassium += (int)$menuItem['potassium_mg'] * $qty;

            $validatedItems[] = [
                'menu_item_id' => $itemId,
                'quantity' => $qty,
                'item_name' => $menuItem['name'],
                'item_category' => $menuItem['category'],
                'calories' => (int)$menuItem['calories'],
                'sodium_mg' => (int)$menuItem['sodium_mg'],
                'carbs_g' => (float)$menuItem['carbs_g'],
                'is_diet_compliant' => 1,
                'is_allergen_safe' => 1,
                'lockout_reason' => null
            ];
        }

        $pdo->beginTransaction();
        try {
            $orderNo = self::nextMealOrderNumber($pdo);

            $insOrder = $pdo->prepare("
                INSERT INTO patient_meal_orders (
                    order_number, patient_id, prescription_id, meal_date, meal_type,
                    ordered_by_type, ordered_by_user_id, ordered_by_name,
                    total_calories, total_sodium_mg, total_carbs_g, total_protein_g, total_potassium_mg,
                    status, diet_compliance_status, special_requests,
                    created_at, updated_at
                ) VALUES (
                    ?, ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    'submitted', 'compliant', ?,
                    NOW(), NOW()
                )
            ");

            $orderedByType = $data['ordered_by_type'] ?? 'patient_bedside';
            $orderedByName = $data['ordered_by_name'] ?? 'Bedside Patient';

            $insOrder->execute([
                $orderNo,
                $patientId,
                $activeRx['id'],
                $mealDate,
                $mealType,
                $orderedByType,
                $userId,
                $orderedByName,
                $totalCalories,
                $totalSodium,
                $totalCarbs,
                $totalProtein,
                $totalPotassium,
                $data['special_requests'] ?? null
            ]);

            $orderId = (int)$pdo->lastInsertId();

            $insLine = $pdo->prepare("
                INSERT INTO patient_meal_order_items (
                    meal_order_id, menu_item_id, quantity, item_name, item_category,
                    calories, sodium_mg, carbs_g, is_diet_compliant, is_allergen_safe,
                    lockout_reason, created_at
                ) VALUES (
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, 1, 1,
                    NULL, NOW()
                )
            ");

            foreach ($validatedItems as $line) {
                $insLine->execute([
                    $orderId,
                    $line['menu_item_id'],
                    $line['quantity'],
                    $line['item_name'],
                    $line['item_category'],
                    $line['calories'],
                    $line['sodium_mg'],
                    $line['carbs_g']
                ]);
            }

            // Sync with dietary_meal_trays for today/this meal
            $updTray = $pdo->prepare("
                UPDATE dietary_meal_trays
                SET status = 'prep_in_kitchen',
                    kitchen_prep_notes = CONCAT(COALESCE(kitchen_prep_notes, ''), ' [Meal Order Placed: ', ?, ']'),
                    updated_at = NOW()
                WHERE prescription_id = ? AND meal_date = ? AND meal_type = ?
            ");
            $updTray->execute([$orderNo, $activeRx['id'], $mealDate, $mealType]);

            $pdo->commit();

            return $this->getMealOrderDetail($orderId);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Get Meal Order Detail with items
     */
    public function getMealOrderDetail(int $orderId): ?array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare("
            SELECT pmo.*,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   p.patient_no AS patient_mrn,
                   p.birthdate AS patient_dob,
                   pdp.prescription_number,
                   pdp.diet_category,
                   pdp.ward_room_bed
            FROM patient_meal_orders pmo
            JOIN patients p ON pmo.patient_id = p.id
            JOIN patient_diet_prescriptions pdp ON pmo.prescription_id = pdp.id
            WHERE pmo.id = ?
        ");
        $stmt->execute([$orderId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        $itemsStmt = $pdo->prepare("
            SELECT pmoi.*, dmi.item_code, dmi.texture_level, dmi.liquid_level
            FROM patient_meal_order_items pmoi
            LEFT JOIN dietary_menu_items dmi ON pmoi.menu_item_id = dmi.id
            WHERE pmoi.meal_order_id = ?
        ");
        $itemsStmt->execute([$orderId]);
        $row['items'] = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);

        return $row;
    }

    /**
     * List Patient Meal Orders with search & filters
     */
    public function listMealOrders(array $filters = [], int $page = 1, int $perPage = 20): array
    {
        $pdo = Database::connection();
        $where = [];
        $params = [];

        if (!empty($filters['meal_date'])) {
            $where[] = "pmo.meal_date = ?";
            $params[] = $filters['meal_date'];
        }

        if (!empty($filters['meal_type'])) {
            $where[] = "pmo.meal_type = ?";
            $params[] = $filters['meal_type'];
        }

        if (!empty($filters['patient_id'])) {
            $where[] = "pmo.patient_id = ?";
            $params[] = (int)$filters['patient_id'];
        }

        if (!empty($filters['status'])) {
            $where[] = "pmo.status = ?";
            $params[] = $filters['status'];
        }

        if (!empty($filters['search'])) {
            $term = '%' . trim($filters['search']) . '%';
            $where[] = "(pmo.order_number LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ? OR p.patient_no LIKE ? OR pdp.ward_room_bed LIKE ?)";
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        $whereClause = count($where) ? 'WHERE ' . implode(' AND ', $where) : '';

        $countSql = "
            SELECT COUNT(*)
            FROM patient_meal_orders pmo
            JOIN patients p ON pmo.patient_id = p.id
            JOIN patient_diet_prescriptions pdp ON pmo.prescription_id = pdp.id
            {$whereClause}
        ";
        $cStmt = $pdo->prepare($countSql);
        $cStmt->execute($params);
        $total = (int)$cStmt->fetchColumn();

        $offset = max(0, ($page - 1) * $perPage);
        $sql = "
            SELECT pmo.*,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   p.patient_no AS patient_mrn,
                   pdp.prescription_number,
                   pdp.diet_category,
                   pdp.ward_room_bed,
                   (SELECT COUNT(*) FROM patient_meal_order_items WHERE meal_order_id = pmo.id) AS items_count
            FROM patient_meal_orders pmo
            JOIN patients p ON pmo.patient_id = p.id
            JOIN patient_diet_prescriptions pdp ON pmo.prescription_id = pdp.id
            {$whereClause}
            ORDER BY pmo.id DESC
            LIMIT {$perPage} OFFSET {$offset}
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'items' => $items,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'last_page' => (int)ceil($total / max(1, $perPage))
        ];
    }

    /**
     * Update Meal Order Status
     */
    public function updateMealOrderStatus(int $orderId, string $status): array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare("UPDATE patient_meal_orders SET status = ?, updated_at = NOW() WHERE id = ?");
        $stmt->execute([$status, $orderId]);
        return $this->getMealOrderDetail($orderId);
    }
}
