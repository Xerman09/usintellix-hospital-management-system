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
                SET meal_order_id = ?,
                    status = 'prep_in_kitchen',
                    kitchen_prep_notes = CONCAT(COALESCE(kitchen_prep_notes, ''), ' [Meal Order Placed: ', ?, ']'),
                    updated_at = NOW()
                WHERE prescription_id = ? AND meal_date = ? AND meal_type = ?
            ");
            $updTray->execute([$orderId, $orderNo, $activeRx['id'], $mealDate, $mealType]);

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

    /**
     * Compile Hospital-Wide Kitchen Batch Prep Census & Item Counts
     * Compiles meal counts (e.g., 90 Regular, 45 Diabetic, 30 Renal, 12 NPO)
     */
    public function getKitchenBatchPrepCensus(string $mealDate, ?string $mealType = null, ?string $ward = null): array
    {
        $pdo = Database::connection();

        $dietDefs = [
            'regular' => ['label' => 'Regular General Diet', 'color' => '#10b981', 'code' => 'REG', 'badge' => 'regular', 'desc' => 'Standard balanced hospital nutrition'],
            'diabetic' => ['label' => 'Diabetic / Low Carb', 'color' => '#2563eb', 'code' => 'DM', 'badge' => 'diabetic', 'desc' => 'Consistent carbohydrate & glycemic control'],
            'low_sodium' => ['label' => 'Cardiac / Low Sodium', 'color' => '#ec4899', 'code' => 'CARD', 'badge' => 'low_sodium', 'desc' => 'DASH protocol (<2000mg Na/day)'],
            'renal' => ['label' => 'Renal (Low K/Phos/Na)', 'color' => '#8b5cf6', 'code' => 'REN', 'badge' => 'renal', 'desc' => 'Low potassium, phosphorus, protein restricted'],
            'pureed_soft' => ['label' => 'Dysphagia Pureed / Soft', 'color' => '#f59e0b', 'code' => 'PUR', 'badge' => 'pureed_soft', 'desc' => 'IDDSI Level 4/5 mechanical soft'],
            'full_liquid' => ['label' => 'Full Liquid Diet', 'color' => '#0d9488', 'code' => 'FLIQ', 'badge' => 'full_liquid', 'desc' => 'Strained soups, milk, smooth puddings'],
            'clear_liquid' => ['label' => 'Clear Liquid Diet', 'color' => '#06b6d4', 'code' => 'CLIQ', 'badge' => 'clear_liquid', 'desc' => 'Broth, clear fruit juices, gelatin'],
            'npo' => ['label' => 'Strict NPO Fasting (Locked)', 'color' => '#ef4444', 'code' => 'NPO', 'badge' => 'npo', 'desc' => 'Nil Per Os: Pre-op / procedural hold'],
            'enteral_tube' => ['label' => 'Enteral Tube Feed', 'color' => '#64748b', 'code' => 'TUBE', 'badge' => 'enteral_tube', 'desc' => 'Nasogastric / PEG specialized formula'],
            'low_fat' => ['label' => 'Low Fat / Hepatic', 'color' => '#6366f1', 'code' => 'LFAT', 'badge' => 'low_fat', 'desc' => 'Gallbladder / hepatic lipid restriction'],
            'high_protein' => ['label' => 'High Protein / Wound', 'color' => '#ea580c', 'code' => 'HPRO', 'badge' => 'high_protein', 'desc' => 'Surgical recovery & wound repair'],
            'custom' => ['label' => 'Custom Clinical Diet', 'color' => '#6b7280', 'code' => 'CUST', 'badge' => 'custom', 'desc' => 'Physician individualized nutrition prescription'],
        ];

        $textureDefs = [
            'regular' => 'IDDSI 7 - Regular',
            'soft_bite_sized' => 'IDDSI 6 - Soft & Bite-Sized',
            'minced_moist' => 'IDDSI 5 - Minced & Moist',
            'pureed' => 'IDDSI 4 - Pureed',
            'liquidized' => 'IDDSI 3 - Liquidized'
        ];

        $liquidDefs = [
            'thin' => 'IDDSI 0 - Thin Liquids',
            'mildly_thick_nectar' => 'IDDSI 2 - Nectar-Thick',
            'moderately_thick_honey' => 'IDDSI 3 - Honey-Thick',
            'extremely_thick_pudding' => 'IDDSI 4 - Pudding-Thick'
        ];

        // 1. Fetch matching trays
        $where = ["dmt.meal_date = ?"];
        $params = [$mealDate];

        if (!empty($mealType) && $mealType !== 'all') {
            $where[] = "dmt.meal_type = ?";
            $params[] = $mealType;
        }

        if (!empty($ward) && $ward !== 'all') {
            $where[] = "(dmt.ward_room_bed LIKE ? OR hw.ward_name LIKE ? OR hw.ward_code LIKE ?)";
            $params[] = "%{$ward}%";
            $params[] = "%{$ward}%";
            $params[] = "%{$ward}%";
        }

        $whereSql = implode(' AND ', $where);

        $stmt = $pdo->prepare("
            SELECT dmt.*,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   p.patient_no AS patient_mrn,
                   p.birthdate AS patient_dob,
                   p.sex AS patient_gender,
                   hw.ward_name,
                   hw.ward_code,
                   hb.room_number,
                   hb.bed_number,
                   pdp.prescription_number,
                   pdp.clinical_indication,
                   pdp.special_instructions,
                   pdp.prescribing_doctor_name,
                   pdp.calorie_target_kcal,
                   pdp.sodium_limit_mg,
                   pdp.fluid_restriction_ml
            FROM dietary_meal_trays dmt
            JOIN patients p ON dmt.patient_id = p.id
            JOIN patient_diet_prescriptions pdp ON dmt.prescription_id = pdp.id
            LEFT JOIN inpatient_admissions ia ON dmt.admission_id = ia.id
            LEFT JOIN hospital_wards hw ON ia.ward_id = hw.id
            LEFT JOIN hospital_beds hb ON ia.bed_id = hb.id
            WHERE {$whereSql}
            ORDER BY (dmt.has_food_allergies = 1) DESC, dmt.ward_room_bed ASC, dmt.id ASC
        ");
        $stmt->execute($params);
        $trays = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $totalTrays = count($trays);
        $npoCount = 0;
        $allergyCount = 0;
        $deliveredCount = 0;
        $assembledCount = 0;
        $prepCount = 0;
        $scheduledCount = 0;

        $dietCountsMap = [];
        foreach (array_keys($dietDefs) as $dk) {
            $dietCountsMap[$dk] = 0;
        }

        $textureCountsMap = [];
        foreach (array_keys($textureDefs) as $tk) {
            $textureCountsMap[$tk] = 0;
        }

        $liquidCountsMap = [];
        foreach (array_keys($liquidDefs) as $lk) {
            $liquidCountsMap[$lk] = 0;
        }

        $allergenTally = [];
        $wardTally = [];
        $allergyTraysList = [];

        foreach ($trays as $t) {
            $cat = $t['diet_category'] ?? 'regular';
            if (isset($dietCountsMap[$cat])) {
                $dietCountsMap[$cat]++;
            } else {
                $dietCountsMap['custom'] = ($dietCountsMap['custom'] ?? 0) + 1;
            }

            $tex = $t['texture_consistency'] ?? 'regular';
            if (isset($textureCountsMap[$tex])) {
                $textureCountsMap[$tex]++;
            }

            $liq = $t['liquid_consistency'] ?? 'thin';
            if (isset($liquidCountsMap[$liq])) {
                $liquidCountsMap[$liq]++;
            }

            if ($cat === 'npo' || $t['status'] === 'held_npo') {
                $npoCount++;
            }

            if (!empty($t['has_food_allergies'])) {
                $allergyCount++;
                $allergyTraysList[] = [
                    'tray_id' => $t['id'],
                    'tray_number' => $t['tray_number'],
                    'patient_name' => $t['patient_name'],
                    'patient_mrn' => $t['patient_mrn'],
                    'ward_room_bed' => $t['ward_room_bed'],
                    'diet_category' => $cat,
                    'allergy_alerts' => $t['allergy_alerts'],
                    'cleared_by_kitchen' => (bool)$t['allergy_cleared_by_kitchen']
                ];

                // Parse allergens into tally
                $rawAllergens = explode(',', (string)$t['allergy_alerts']);
                foreach ($rawAllergens as $raw) {
                    $cleaned = trim(preg_replace('/\s*\(.*?\)\s*/', '', $raw));
                    if (!empty($cleaned)) {
                        $cleanedUpper = ucwords(strtolower($cleaned));
                        $allergenTally[$cleanedUpper] = ($allergenTally[$cleanedUpper] ?? 0) + 1;
                    }
                }
            }

            switch ($t['status']) {
                case 'delivered':
                    $deliveredCount++;
                    break;
                case 'tray_assembled':
                    $assembledCount++;
                    break;
                case 'prep_in_kitchen':
                    $prepCount++;
                    break;
                default:
                    $scheduledCount++;
                    break;
            }

            // Ward grouping
            $wardLabel = $t['ward_name'] ?? 'General Inpatient';
            if (empty($wardLabel) || $wardLabel === 'General Inpatient') {
                if (preg_match('/(ICU|SURG|MED|PED|ISOL|Ward\s*\d+|Bay\s*\d+)/i', (string)$t['ward_room_bed'], $m)) {
                    $wardLabel = strtoupper($m[1]);
                }
            }

            if (!isset($wardTally[$wardLabel])) {
                $wardTally[$wardLabel] = [
                    'ward_name' => $wardLabel,
                    'total_trays' => 0,
                    'regular_count' => 0,
                    'diabetic_count' => 0,
                    'renal_count' => 0,
                    'cardiac_count' => 0,
                    'pureed_count' => 0,
                    'npo_count' => 0,
                    'allergy_count' => 0
                ];
            }
            $wardTally[$wardLabel]['total_trays']++;
            if ($cat === 'regular') $wardTally[$wardLabel]['regular_count']++;
            if ($cat === 'diabetic') $wardTally[$wardLabel]['diabetic_count']++;
            if ($cat === 'renal') $wardTally[$wardLabel]['renal_count']++;
            if ($cat === 'low_sodium') $wardTally[$wardLabel]['cardiac_count']++;
            if ($cat === 'pureed_soft') $wardTally[$wardLabel]['pureed_count']++;
            if ($cat === 'npo') $wardTally[$wardLabel]['npo_count']++;
            if (!empty($t['has_food_allergies'])) $wardTally[$wardLabel]['allergy_count']++;
        }

        // Format Diet counts with percentages and styling
        $compiledDietCounts = [];
        foreach ($dietDefs as $key => $meta) {
            $cnt = $dietCountsMap[$key] ?? 0;
            $pct = $totalTrays > 0 ? round(($cnt / $totalTrays) * 100, 1) : 0;
            $compiledDietCounts[] = [
                'category' => $key,
                'label' => $meta['label'],
                'code' => $meta['code'],
                'color' => $meta['color'],
                'badge' => $meta['badge'],
                'description' => $meta['desc'],
                'count' => $cnt,
                'percentage' => $pct
            ];
        }

        // Texture counts
        $compiledTextureCounts = [];
        foreach ($textureDefs as $key => $label) {
            $cnt = $textureCountsMap[$key] ?? 0;
            $compiledTextureCounts[] = [
                'texture' => $key,
                'label' => $label,
                'count' => $cnt,
                'percentage' => $totalTrays > 0 ? round(($cnt / $totalTrays) * 100, 1) : 0
            ];
        }

        // Liquid counts
        $compiledLiquidCounts = [];
        foreach ($liquidDefs as $key => $label) {
            $cnt = $liquidCountsMap[$key] ?? 0;
            $compiledLiquidCounts[] = [
                'liquid' => $key,
                'label' => $label,
                'count' => $cnt,
                'percentage' => $totalTrays > 0 ? round(($cnt / $totalTrays) * 100, 1) : 0
            ];
        }

        // 2. Production Kitchen Batch Prep List (Cook & Portion Item Aggregates)
        $itemWhere = ["pmo.meal_date = ?", "pmo.status != 'CANCELLED'"];
        $itemParams = [$mealDate];
        if (!empty($mealType) && $mealType !== 'all') {
            $itemWhere[] = "pmo.meal_type = ?";
            $itemParams[] = $mealType;
        }
        $itemWhereSql = implode(' AND ', $itemWhere);

        $itemStmt = $pdo->prepare("
            SELECT pmoi.menu_item_id,
                   dmi.item_code,
                   pmoi.item_name,
                   pmoi.item_category,
                   dmi.texture_level,
                   dmi.liquid_level,
                   SUM(pmoi.quantity) AS batch_portions,
                   SUM(pmoi.calories * pmoi.quantity) AS total_calories,
                   dmi.allowed_diabetic,
                   dmi.allowed_renal,
                   dmi.allowed_low_sodium,
                   dmi.allowed_pureed_soft,
                   dmi.allowed_clear_liquid,
                   dmi.contains_peanuts,
                   dmi.contains_shellfish,
                   dmi.contains_milk,
                   dmi.contains_wheat_gluten
            FROM patient_meal_order_items pmoi
            JOIN patient_meal_orders pmo ON pmoi.meal_order_id = pmo.id
            LEFT JOIN dietary_menu_items dmi ON pmoi.menu_item_id = dmi.id
            WHERE {$itemWhereSql}
            GROUP BY pmoi.menu_item_id, dmi.item_code, pmoi.item_name, pmoi.item_category, dmi.texture_level, dmi.liquid_level,
                     dmi.allowed_diabetic, dmi.allowed_renal, dmi.allowed_low_sodium, dmi.allowed_pureed_soft, dmi.allowed_clear_liquid,
                     dmi.contains_peanuts, dmi.contains_shellfish, dmi.contains_milk, dmi.contains_wheat_gluten
            ORDER BY batch_portions DESC, pmoi.item_category ASC
        ");
        $itemStmt->execute($itemParams);
        $productionPrepList = $itemStmt->fetchAll(PDO::FETCH_ASSOC);

        // Sort allergens descending
        arsort($allergenTally);
        $allergenList = [];
        foreach ($allergenTally as $name => $cnt) {
            $allergenList[] = ['allergen' => $name, 'count' => $cnt];
        }

        return [
            'meal_date' => $mealDate,
            'meal_type' => $mealType ?: 'all',
            'ward_filter' => $ward ?: 'all',
            'summary' => [
                'total_scheduled_trays' => $totalTrays,
                'meals_to_cook_and_prep' => max(0, $totalTrays - $npoCount),
                'npo_fasting_locked' => $npoCount,
                'trays_with_food_allergies' => $allergyCount,
                'in_kitchen_prep' => $prepCount,
                'trays_assembled' => $assembledCount,
                'trays_delivered' => $deliveredCount,
                'pending_scheduled' => $scheduledCount
            ],
            'diet_counts' => $compiledDietCounts,
            'texture_counts' => $compiledTextureCounts,
            'liquid_counts' => $compiledLiquidCounts,
            'allergy_summary' => [
                'total_allergy_trays' => $allergyCount,
                'top_allergens' => $allergenList,
                'allergy_trays' => $allergyTraysList
            ],
            'ward_distribution' => array_values($wardTally),
            'production_prep_list' => $productionPrepList
        ];
    }

    /**
     * Retrieve Printable Bedside Meal Tray Delivery Slips
     * Includes patient details, ward/bed, diet category, allergy warning banners, and menu items.
     */
    public function getBedsideTraySlips(array $filters = []): array
    {
        $pdo = Database::connection();
        $where = [];
        $params = [];

        $mealDate = !empty($filters['meal_date']) ? $filters['meal_date'] : date('Y-m-d');
        $where[] = "dmt.meal_date = ?";
        $params[] = $mealDate;

        if (!empty($filters['tray_id'])) {
            $where[] = "dmt.id = ?";
            $params[] = (int)$filters['tray_id'];
        }

        if (!empty($filters['meal_type']) && $filters['meal_type'] !== 'all') {
            $where[] = "dmt.meal_type = ?";
            $params[] = $filters['meal_type'];
        }

        if (!empty($filters['diet_category']) && $filters['diet_category'] !== 'all') {
            $where[] = "dmt.diet_category = ?";
            $params[] = $filters['diet_category'];
        }

        if (isset($filters['has_food_allergies']) && $filters['has_food_allergies'] !== '') {
            $where[] = "dmt.has_food_allergies = ?";
            $params[] = (int)$filters['has_food_allergies'];
        }

        if (!empty($filters['ward']) && $filters['ward'] !== 'all') {
            $where[] = "(dmt.ward_room_bed LIKE ? OR hw.ward_name LIKE ? OR hw.ward_code LIKE ?)";
            $params[] = "%{$filters['ward']}%";
            $params[] = "%{$filters['ward']}%";
            $params[] = "%{$filters['ward']}%";
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

        $whereSql = implode(' AND ', $where);

        $sql = "
            SELECT dmt.*,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   p.patient_no AS patient_mrn,
                   p.birthdate AS patient_dob,
                   p.sex AS patient_gender,
                   ia.admission_number,
                   hw.ward_name,
                   hw.ward_code,
                   hb.room_number,
                   hb.bed_number,
                   pdp.prescription_number,
                   pdp.clinical_indication,
                   pdp.special_instructions,
                   pdp.prescribing_doctor_name,
                   pdp.effective_from AS prescribed_at,
                   pdp.calorie_target_kcal,
                   pdp.sodium_limit_mg,
                   pdp.fluid_restriction_ml,
                   pdp.protein_limit_g,
                   pdp.potassium_limit_mg,
                   pdp.phosphorus_limit_mg,
                   pmo.id AS order_id,
                   pmo.order_number,
                   pmo.total_calories AS order_calories,
                   pmo.total_sodium_mg AS order_sodium,
                   pmo.total_carbs_g AS order_carbs,
                   pmo.total_protein_g AS order_protein,
                   pmo.total_potassium_mg AS order_potassium
            FROM dietary_meal_trays dmt
            JOIN patients p ON dmt.patient_id = p.id
            JOIN patient_diet_prescriptions pdp ON dmt.prescription_id = pdp.id
            LEFT JOIN inpatient_admissions ia ON dmt.admission_id = ia.id
            LEFT JOIN hospital_wards hw ON ia.ward_id = hw.id
            LEFT JOIN hospital_beds hb ON ia.bed_id = hb.id
            LEFT JOIN patient_meal_orders pmo 
                   ON (dmt.meal_order_id = pmo.id OR (dmt.patient_id = pmo.patient_id AND dmt.meal_date = pmo.meal_date AND dmt.meal_type = pmo.meal_type AND pmo.status != 'CANCELLED'))
            WHERE {$whereSql}
            ORDER BY dmt.ward_room_bed ASC, dmt.id ASC
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $dietLabels = [
            'regular' => 'REGULAR GENERAL HOSPITAL DIET',
            'diabetic' => 'DIABETIC / CARB-CONTROLLED DIET',
            'low_sodium' => 'CARDIAC / LOW SODIUM DIET (DASH)',
            'renal' => 'RENAL DIET (LOW K / PHOS / NA)',
            'pureed_soft' => 'DYSPHAGIA PUREED / SOFT DIET (IDDSI 4/5)',
            'full_liquid' => 'FULL LIQUID DIET',
            'clear_liquid' => 'CLEAR LIQUID DIET',
            'npo' => 'STRICT NPO - DO NOT SERVE (NOTHING BY MOUTH)',
            'enteral_tube' => 'ENTERAL TUBE FEEDING FORMULA',
            'low_fat' => 'LOW FAT / HEPATIC DIET',
            'high_protein' => 'HIGH PROTEIN / WOUND HEALING DIET',
            'custom' => 'CUSTOM CLINICAL DIET FORMULA'
        ];

        $textureLabels = [
            'regular' => 'IDDSI 7 - Regular',
            'soft_bite_sized' => 'IDDSI 6 - Soft & Bite-Sized',
            'minced_moist' => 'IDDSI 5 - Minced & Moist',
            'pureed' => 'IDDSI 4 - Pureed',
            'liquidized' => 'IDDSI 3 - Liquidized'
        ];

        $liquidLabels = [
            'thin' => 'IDDSI 0 - Thin Liquids',
            'mildly_thick_nectar' => 'IDDSI 2 - Nectar-Thick Liquids',
            'moderately_thick_honey' => 'IDDSI 3 - Honey-Thick Liquids',
            'extremely_thick_pudding' => 'IDDSI 4 - Pudding-Thick Liquids'
        ];

        $slips = [];
        foreach ($rows as $r) {
            $isNpo = ($r['diet_category'] === 'npo' || $r['status'] === 'held_npo');
            $patientAge = null;
            if (!empty($r['patient_dob'])) {
                try {
                    $dob = new \DateTime($r['patient_dob']);
                    $now = new \DateTime();
                    $patientAge = $now->diff($dob)->y;
                } catch (\Throwable $e) {
                    $patientAge = null;
                }
            }

            // Fetch tray items
            $items = [];
            $nutritionTotals = [
                'calories' => (int)($r['order_calories'] ?? 0),
                'sodium_mg' => (int)($r['order_sodium'] ?? 0),
                'carbs_g' => (float)($r['order_carbs'] ?? 0),
                'protein_g' => (float)($r['order_protein'] ?? 0),
                'potassium_mg' => (int)($r['order_potassium'] ?? 0),
            ];

            if (!empty($r['order_id'])) {
                $itemStmt = $pdo->prepare("
                    SELECT pmoi.*, dmi.item_code, dmi.texture_level, dmi.liquid_level
                    FROM patient_meal_order_items pmoi
                    LEFT JOIN dietary_menu_items dmi ON pmoi.menu_item_id = dmi.id
                    WHERE pmoi.meal_order_id = ?
                ");
                $itemStmt->execute([$r['order_id']]);
                $items = $itemStmt->fetchAll(PDO::FETCH_ASSOC);
            } elseif (!$isNpo) {
                // Default clinical tray items based on diet
                $items = $this->getDefaultTrayItemsForDiet($r['diet_category'], $r['meal_type']);
                foreach ($items as $it) {
                    $nutritionTotals['calories'] += ($it['calories'] ?? 0);
                    $nutritionTotals['sodium_mg'] += ($it['sodium_mg'] ?? 0);
                    $nutritionTotals['carbs_g'] += ($it['carbs_g'] ?? 0);
                    $nutritionTotals['protein_g'] += ($it['protein_g'] ?? 0);
                    $nutritionTotals['potassium_mg'] += ($it['potassium_mg'] ?? 0);
                }
            }

            $slips[] = [
                'tray_id' => (int)$r['id'],
                'tray_number' => $r['tray_number'],
                'order_number' => $r['order_number'] ?: 'STANDARD-PREP',
                'meal_date' => $r['meal_date'],
                'meal_type' => $r['meal_type'],
                'meal_type_display' => ucfirst($r['meal_type']),
                'status' => $r['status'],
                'patient_id' => (int)$r['patient_id'],
                'patient_name' => $r['patient_name'],
                'patient_mrn' => $r['patient_mrn'],
                'patient_dob' => $r['patient_dob'],
                'patient_age' => $patientAge,
                'patient_gender' => ucfirst((string)$r['patient_gender']),
                'admission_number' => $r['admission_number'] ?: 'INP-ACTIVE',
                'ward_room_bed' => $r['ward_room_bed'] ?: 'Ward Delivery',
                'ward_name' => $r['ward_name'] ?: 'Inpatient Unit',
                'room_number' => $r['room_number'] ?: 'Bedside',
                'bed_number' => $r['bed_number'] ?: 'N/A',
                'diet_category' => $r['diet_category'],
                'diet_category_display' => $dietLabels[$r['diet_category']] ?? strtoupper(str_replace('_', ' ', $r['diet_category'])),
                'texture_consistency' => $r['texture_consistency'],
                'texture_display' => $textureLabels[$r['texture_consistency']] ?? ucfirst($r['texture_consistency']),
                'liquid_consistency' => $r['liquid_consistency'],
                'liquid_display' => $liquidLabels[$r['liquid_consistency']] ?? ucfirst($r['liquid_consistency']),
                'is_npo' => $isNpo,
                'has_food_allergies' => (bool)$r['has_food_allergies'],
                'allergy_alerts' => $r['allergy_alerts'],
                'allergy_cleared_by_kitchen' => (bool)$r['allergy_cleared_by_kitchen'],
                'special_instructions' => $r['special_instructions'],
                'clinical_indication' => $r['clinical_indication'],
                'prescribing_doctor_name' => $r['prescribing_doctor_name'],
                'prescription_number' => $r['prescription_number'],
                'prescribed_at' => $r['prescribed_at'],
                'nutritional_limits' => [
                    'calorie_target_kcal' => $r['calorie_target_kcal'],
                    'sodium_limit_mg' => $r['sodium_limit_mg'],
                    'fluid_restriction_ml' => $r['fluid_restriction_ml'],
                    'protein_limit_g' => $r['protein_limit_g'],
                    'potassium_limit_mg' => $r['potassium_limit_mg'],
                    'phosphorus_limit_mg' => $r['phosphorus_limit_mg']
                ],
                'items' => $items,
                'nutritional_totals' => $nutritionTotals,
                'prepared_by' => $r['prepared_by'],
                'delivered_by' => $r['delivered_by'],
                'delivered_at' => $r['delivered_at'],
                'kitchen_prep_notes' => $r['kitchen_prep_notes'],
                'barcode_string' => '*' . $r['tray_number'] . '*'
            ];
        }

        return $slips;
    }

    /**
     * Default standard hospital tray line items for trays without custom bedside orders
     */
    private function getDefaultTrayItemsForDiet(string $dietCategory, string $mealType): array
    {
        switch ($dietCategory) {
            case 'diabetic':
                return [
                    ['item_name' => 'Grilled Chicken Breast & Steamed White Rice', 'quantity' => 1, 'item_category' => 'entree', 'calories' => 380, 'sodium_mg' => 240, 'carbs_g' => 32, 'protein_g' => 38, 'potassium_mg' => 320],
                    ['item_name' => 'Diced Canned Peaches (Light Juice)', 'quantity' => 1, 'item_category' => 'side', 'calories' => 60, 'sodium_mg' => 5, 'carbs_g' => 14, 'protein_g' => 1, 'potassium_mg' => 110],
                    ['item_name' => 'Chilled Spring Water', 'quantity' => 1, 'item_category' => 'beverage', 'calories' => 0, 'sodium_mg' => 5, 'carbs_g' => 0, 'protein_g' => 0, 'potassium_mg' => 0]
                ];
            case 'renal':
                return [
                    ['item_name' => 'Pureed Roast Turkey Breast & White Rice', 'quantity' => 1, 'item_category' => 'entree', 'calories' => 310, 'sodium_mg' => 190, 'carbs_g' => 28, 'protein_g' => 28, 'potassium_mg' => 220],
                    ['item_name' => 'Diced Canned Peaches (Low K)', 'quantity' => 1, 'item_category' => 'side', 'calories' => 60, 'sodium_mg' => 5, 'carbs_g' => 14, 'protein_g' => 1, 'potassium_mg' => 110],
                    ['item_name' => 'Apple Juice 200mL', 'quantity' => 1, 'item_category' => 'beverage', 'calories' => 95, 'sodium_mg' => 10, 'carbs_g' => 24, 'protein_g' => 0, 'potassium_mg' => 120]
                ];
            case 'low_sodium':
                return [
                    ['item_name' => 'Grilled Herb Chicken (No Added Salt) & Brown Rice', 'quantity' => 1, 'item_category' => 'entree', 'calories' => 360, 'sodium_mg' => 110, 'carbs_g' => 34, 'protein_g' => 36, 'potassium_mg' => 290],
                    ['item_name' => 'Diced Peaches & Steamed Veggies', 'quantity' => 1, 'item_category' => 'side', 'calories' => 70, 'sodium_mg' => 15, 'carbs_g' => 16, 'protein_g' => 2, 'potassium_mg' => 160],
                    ['item_name' => 'Chilled Spring Water 250mL', 'quantity' => 1, 'item_category' => 'beverage', 'calories' => 0, 'sodium_mg' => 5, 'carbs_g' => 0, 'protein_g' => 0, 'potassium_mg' => 0]
                ];
            case 'pureed_soft':
                return [
                    ['item_name' => 'Pureed Roast Turkey Breast (IDDSI Level 4)', 'quantity' => 1, 'item_category' => 'entree', 'calories' => 210, 'sodium_mg' => 180, 'carbs_g' => 8, 'protein_g' => 26, 'potassium_mg' => 240],
                    ['item_name' => 'Strained Creamy Potato Soup', 'quantity' => 1, 'item_category' => 'soup', 'calories' => 130, 'sodium_mg' => 210, 'carbs_g' => 18, 'protein_g' => 3, 'potassium_mg' => 190],
                    ['item_name' => 'Vanilla Custard Cup', 'quantity' => 1, 'item_category' => 'dessert', 'calories' => 140, 'sodium_mg' => 110, 'carbs_g' => 22, 'protein_g' => 4, 'potassium_mg' => 150]
                ];
            case 'clear_liquid':
                return [
                    ['item_name' => 'Clear Vegetable Broth (IDDSI Level 0)', 'quantity' => 1, 'item_category' => 'soup', 'calories' => 25, 'sodium_mg' => 380, 'carbs_g' => 4, 'protein_g' => 1, 'potassium_mg' => 60],
                    ['item_name' => 'Apple Juice 200mL', 'quantity' => 1, 'item_category' => 'beverage', 'calories' => 95, 'sodium_mg' => 10, 'carbs_g' => 24, 'protein_g' => 0, 'potassium_mg' => 120],
                    ['item_name' => 'Lemon Gelatin Cup', 'quantity' => 1, 'item_category' => 'dessert', 'calories' => 70, 'sodium_mg' => 45, 'carbs_g' => 17, 'protein_g' => 2, 'potassium_mg' => 5]
                ];
            case 'full_liquid':
                return [
                    ['item_name' => 'Strained Creamy Potato Soup', 'quantity' => 1, 'item_category' => 'soup', 'calories' => 130, 'sodium_mg' => 210, 'carbs_g' => 18, 'protein_g' => 3, 'potassium_mg' => 190],
                    ['item_name' => 'Skim Milk 250mL (IDDSI 0)', 'quantity' => 1, 'item_category' => 'beverage', 'calories' => 85, 'sodium_mg' => 125, 'carbs_g' => 12, 'protein_g' => 8, 'potassium_mg' => 380],
                    ['item_name' => 'Vanilla Custard Cup', 'quantity' => 1, 'item_category' => 'dessert', 'calories' => 140, 'sodium_mg' => 110, 'carbs_g' => 22, 'protein_g' => 4, 'potassium_mg' => 150]
                ];
            case 'regular':
            default:
                if ($mealType === 'breakfast') {
                    return [
                        ['item_name' => 'Farm Fresh Scrambled Eggs', 'quantity' => 1, 'item_category' => 'entree', 'calories' => 160, 'sodium_mg' => 210, 'carbs_g' => 2, 'protein_g' => 13, 'potassium_mg' => 140],
                        ['item_name' => 'Steel-Cut Oatmeal with Honey', 'quantity' => 1, 'item_category' => 'breakfast', 'calories' => 150, 'sodium_mg' => 25, 'carbs_g' => 28, 'protein_g' => 5, 'potassium_mg' => 120],
                        ['item_name' => 'Skim Milk 250mL', 'quantity' => 1, 'item_category' => 'beverage', 'calories' => 85, 'sodium_mg' => 125, 'carbs_g' => 12, 'protein_g' => 8, 'potassium_mg' => 380]
                    ];
                }
                return [
                    ['item_name' => 'Grilled Chicken Breast & Steamed White Rice', 'quantity' => 1, 'item_category' => 'entree', 'calories' => 420, 'sodium_mg' => 320, 'carbs_g' => 42, 'protein_g' => 38, 'potassium_mg' => 340],
                    ['item_name' => 'Diced Canned Peaches (Light Juice)', 'quantity' => 1, 'item_category' => 'side', 'calories' => 60, 'sodium_mg' => 5, 'carbs_g' => 14, 'protein_g' => 1, 'potassium_mg' => 110],
                    ['item_name' => 'Chilled Spring Water 250mL', 'quantity' => 1, 'item_category' => 'beverage', 'calories' => 0, 'sodium_mg' => 5, 'carbs_g' => 0, 'protein_g' => 0, 'potassium_mg' => 0]
                ];
        }
    }

    /**
     * Bulk update status for multiple meal trays (e.g. batch advance to prep, assembly, or delivered)
     */
    public function batchUpdateTrayStatus(array $trayIds, string $status, ?string $actorName = null, ?string $notes = null): array
    {
        $pdo = Database::connection();
        $validStatuses = ['scheduled', 'prep_in_kitchen', 'tray_assembled', 'in_transit', 'delivered', 'patient_refused', 'held_npo'];

        if (!in_array($status, $validStatuses, true)) {
            throw new RuntimeException("Invalid tray status: '{$status}'.");
        }

        $cleanIds = array_filter(array_map('intval', $trayIds));
        if (empty($cleanIds)) {
            throw new RuntimeException("No valid tray IDs provided for batch update.");
        }

        $inClause = implode(',', $cleanIds);
        $pdo->beginTransaction();
        try {
            if ($status === 'delivered') {
                $stmt = $pdo->prepare("
                    UPDATE dietary_meal_trays
                    SET status = 'delivered',
                        delivered_by = COALESCE(?, delivered_by, 'Dietary Aide'),
                        delivered_at = NOW(),
                        kitchen_prep_notes = CASE WHEN ? IS NOT NULL THEN CONCAT(COALESCE(kitchen_prep_notes, ''), ' [', ?, ']') ELSE kitchen_prep_notes END,
                        updated_at = NOW()
                    WHERE id IN ({$inClause})
                ");
                $stmt->execute([$actorName, $notes, $notes]);
            } elseif ($status === 'tray_assembled') {
                $stmt = $pdo->prepare("
                    UPDATE dietary_meal_trays
                    SET status = 'tray_assembled',
                        allergy_cleared_by_kitchen = 1,
                        prepared_by = COALESCE(?, prepared_by, 'Kitchen Chef'),
                        kitchen_prep_notes = CASE WHEN ? IS NOT NULL THEN CONCAT(COALESCE(kitchen_prep_notes, ''), ' [', ?, ']') ELSE kitchen_prep_notes END,
                        updated_at = NOW()
                    WHERE id IN ({$inClause})
                ");
                $stmt->execute([$actorName, $notes, $notes]);
            } else {
                $stmt = $pdo->prepare("
                    UPDATE dietary_meal_trays
                    SET status = ?,
                        prepared_by = CASE WHEN ? = 'prep_in_kitchen' THEN COALESCE(?, prepared_by, 'Kitchen Tech') ELSE prepared_by END,
                        kitchen_prep_notes = CASE WHEN ? IS NOT NULL THEN CONCAT(COALESCE(kitchen_prep_notes, ''), ' [', ?, ']') ELSE kitchen_prep_notes END,
                        updated_at = NOW()
                    WHERE id IN ({$inClause})
                ");
                $stmt->execute([$status, $status, $actorName, $notes, $notes]);
            }

            $affected = $stmt->rowCount();
            $pdo->commit();

            return [
                'updated_count' => $affected,
                'status' => $status,
                'tray_ids' => $cleanIds
            ];
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Seeds realistic hospital inpatient census and trays for today if tray volume is low
     */
    public function seedHospitalCensusDemoData(?string $targetDate = null): array
    {
        $pdo = Database::connection();
        $targetDate = $targetDate ?: date('Y-m-d');

        // Check current trays count
        $cnt = (int)$pdo->query("SELECT COUNT(*) FROM dietary_meal_trays WHERE meal_date = '{$targetDate}'")->fetchColumn();
        if ($cnt >= 18) {
            return ['seeded' => false, 'existing_trays' => $cnt, 'message' => "Target date already has {$cnt} trays scheduled."];
        }

        // Fetch patients to assign
        $patients = $pdo->query("SELECT id, patient_no, first_name, last_name, birthdate, sex FROM patients ORDER BY id ASC LIMIT 30")->fetchAll(PDO::FETCH_ASSOC);
        if (empty($patients)) {
            return ['seeded' => false, 'message' => 'No patients in database to seed.'];
        }

        $dietsSpec = [
            ['diet' => 'regular', 'tex' => 'regular', 'liq' => 'thin', 'ward' => 'Surgical Inpatient · Room 201 · Bed A', 'doc' => 'Dr. Elizabeth Chen, MD', 'ind' => 'Post-op Day 3 Laparoscopic Cholecystectomy', 'allergy' => 'None'],
            ['diet' => 'regular', 'tex' => 'regular', 'liq' => 'thin', 'ward' => 'Surgical Inpatient · Room 202 · Bed B', 'doc' => 'Dr. Mark Vance, MD', 'ind' => 'Orthopedic Hip Replacement Recovery', 'allergy' => 'None'],
            ['diet' => 'diabetic', 'tex' => 'regular', 'liq' => 'thin', 'ward' => 'Medical Inpatient · Room 301 · Bed A', 'doc' => 'Dr. Robert Miller, MD', 'ind' => 'Type 2 Diabetes Mellitus with Hyperglycemia', 'allergy' => 'None', 'cal' => 1800, 'na' => 2000],
            ['diet' => 'diabetic', 'tex' => 'regular', 'liq' => 'thin', 'ward' => 'Medical Inpatient · Room 302 · Bed B', 'doc' => 'Dr. Robert Miller, MD', 'ind' => 'Type 1 Diabetes Glycemic Optimization', 'allergy' => 'Tree Nuts (Moderate)', 'cal' => 2000, 'na' => 2000],
            ['diet' => 'renal', 'tex' => 'regular', 'liq' => 'thin', 'ward' => 'Medical Inpatient · Room 304 · Bed A', 'doc' => 'Dr. Susan Lin, MD (Nephrology)', 'ind' => 'Stage 4 CKD with Hyperkalemia Risk', 'allergy' => 'Peanuts (Severe - Anaphylaxis)', 'na' => 1500, 'prot' => 55, 'k' => 2000, 'phos' => 800, 'fl' => 1500],
            ['diet' => 'renal', 'tex' => 'regular', 'liq' => 'thin', 'ward' => 'Intensive Care Unit (ICU) · Bed 02', 'doc' => 'Dr. Susan Lin, MD (Nephrology)', 'ind' => 'Acute Kidney Injury on Hemodialysis', 'allergy' => 'None', 'na' => 1500, 'prot' => 60, 'k' => 1800, 'phos' => 800, 'fl' => 1200],
            ['diet' => 'low_sodium', 'tex' => 'regular', 'liq' => 'thin', 'ward' => 'Medical Inpatient · Room 305 · Bed A', 'doc' => 'Dr. Carlos Mendoza, MD (Cardiology)', 'ind' => 'Congestive Heart Failure NYHA Class III', 'allergy' => 'None', 'na' => 1500, 'fl' => 1500],
            ['diet' => 'low_sodium', 'tex' => 'regular', 'liq' => 'thin', 'ward' => 'Medical Inpatient · Room 306 · Bed B', 'doc' => 'Dr. Carlos Mendoza, MD (Cardiology)', 'ind' => 'Severe Essential Hypertension', 'allergy' => 'Shellfish (Crab/Lobster - Severe)', 'na' => 1800],
            ['diet' => 'pureed_soft', 'tex' => 'pureed', 'liq' => 'mildly_thick_nectar', 'ward' => 'Medical Inpatient · Room 307 · Bed A', 'doc' => 'Dr. Karen White, MD (Neurology)', 'ind' => 'Post-CVA Acute Dysphagia with Aspiration Risk', 'allergy' => 'None', 'cal' => 1600],
            ['diet' => 'pureed_soft', 'tex' => 'minced_moist', 'liq' => 'thin', 'ward' => 'Surgical Inpatient · Room 204 · Bed A', 'doc' => 'Dr. Elizabeth Chen, MD', 'ind' => 'Maxillofacial Surgery Wired Jaw Healing', 'allergy' => 'None'],
            ['diet' => 'clear_liquid', 'tex' => 'liquidized', 'liq' => 'thin', 'ward' => 'Surgical Inpatient · Room 205 · Bed A', 'doc' => 'Dr. Mark Vance, MD', 'ind' => 'Post-Colectomy Step-Down Day 1', 'allergy' => 'None'],
            ['diet' => 'full_liquid', 'tex' => 'liquidized', 'liq' => 'thin', 'ward' => 'Surgical Inpatient · Room 206 · Bed B', 'doc' => 'Dr. Mark Vance, MD', 'ind' => 'Partial Gastrectomy Transition Phase', 'allergy' => 'Dairy / Lactose (Severe GI)', 'na' => 2000],
            ['diet' => 'npo', 'tex' => 'regular', 'liq' => 'thin', 'ward' => 'Intensive Care Unit (ICU) · Bed 01', 'doc' => 'Dr. Alan Ross, MD (Surgery)', 'ind' => 'Scheduled Coronary Artery Bypass (CABG) 06:00', 'allergy' => 'Penicillin (Anaphylaxis)', 'inst' => 'Strict NPO after midnight. IV D5W maint only.'],
            ['diet' => 'npo', 'tex' => 'regular', 'liq' => 'thin', 'ward' => 'Surgical Inpatient · Room 208 · Bed A', 'doc' => 'Dr. Elizabeth Chen, MD', 'ind' => 'Pre-Op Upper Endoscopy & Biopsy', 'allergy' => 'None', 'inst' => 'Strict NPO 8 hours prior to procedure.'],
            ['diet' => 'enteral_tube', 'tex' => 'liquidized', 'liq' => 'thin', 'ward' => 'Intensive Care Unit (ICU) · Bed 04', 'doc' => 'Dr. Alan Ross, MD', 'ind' => 'Comatose Post-Trauma PEG Tube Feeding', 'allergy' => 'None', 'inst' => 'Jevity 1.5 Cal @ 65 mL/hr continuous pump'],
            ['diet' => 'regular', 'tex' => 'regular', 'liq' => 'thin', 'ward' => 'Pediatric Care Unit · Room 101 · Bed A', 'doc' => 'Dr. Wendy Taylor, MD (Pediatrics)', 'ind' => 'Asthma Exacerbation Stabilized', 'allergy' => 'Peanuts (Severe)', 'cal' => 1500],
            ['diet' => 'regular', 'tex' => 'regular', 'liq' => 'thin', 'ward' => 'Isolation Negative Pressure · Suite 401', 'doc' => 'Dr. Gregory House, MD', 'ind' => 'Active Pulmonary TB Negative Pressure', 'allergy' => 'None', 'inst' => 'Disposable tray only with double-bagging'],
            ['diet' => 'diabetic', 'tex' => 'regular', 'liq' => 'thin', 'ward' => 'Surgical Inpatient · Room 209 · Bed A', 'doc' => 'Dr. Robert Miller, MD', 'ind' => 'Diabetic Foot Ulcer Healing', 'allergy' => 'None', 'cal' => 1900]
        ];

        $pdo->beginTransaction();
        try {
            $createdCount = 0;
            $meals = ['breakfast', 'lunch', 'dinner'];

            foreach ($dietsSpec as $idx => $spec) {
                if (!isset($patients[$idx])) break;
                $p = $patients[$idx];
                $pid = (int)$p['id'];

                // Deactivate old
                $pdo->prepare("UPDATE patient_diet_prescriptions SET status = 'completed' WHERE patient_id = ? AND status = 'active'")->execute([$pid]);

                $rxNo = self::nextPrescriptionNumber($pdo);
                $insRx = $pdo->prepare("
                    INSERT INTO patient_diet_prescriptions (
                        prescription_number, patient_id, ward_room_bed, diet_category,
                        texture_consistency, liquid_consistency, calorie_target_kcal,
                        sodium_limit_mg, fluid_restriction_ml, protein_limit_g, potassium_limit_mg, phosphorus_limit_mg,
                        clinical_indication, special_instructions, prescribing_doctor_name,
                        effective_from, status, created_at, updated_at
                    ) VALUES (
                        ?, ?, ?, ?,
                        ?, ?, ?,
                        ?, ?, ?, ?, ?,
                        ?, ?, ?,
                        NOW(), 'active', NOW(), NOW()
                    )
                ");
                $insRx->execute([
                    $rxNo, $pid, $spec['ward'], $spec['diet'],
                    $spec['tex'], $spec['liq'], $spec['cal'] ?? null,
                    $spec['na'] ?? null, $spec['fl'] ?? null, $spec['prot'] ?? null, $spec['k'] ?? null, $spec['phos'] ?? null,
                    $spec['ind'], $spec['inst'] ?? null, $spec['doc']
                ]);
                $rxId = (int)$pdo->lastInsertId();

                $hasAllergy = ($spec['allergy'] !== 'None');
                $allergyStr = $hasAllergy ? $spec['allergy'] : null;

                foreach ($meals as $m) {
                    $trayNo = self::nextTrayNumber($pdo);
                    $trayStatus = ($spec['diet'] === 'npo') ? 'held_npo' : ($m === 'breakfast' ? 'delivered' : ($m === 'lunch' ? 'prep_in_kitchen' : 'scheduled'));
                    $cleared = ($hasAllergy && $trayStatus === 'delivered') ? 1 : 0;
                    $prepNotes = $hasAllergy ? "Prepared in allergen-controlled sterile zone." : null;

                    $insTray = $pdo->prepare("
                        INSERT INTO dietary_meal_trays (
                            tray_number, prescription_id, patient_id, ward_room_bed,
                            meal_date, meal_type, diet_category, texture_consistency, liquid_consistency,
                            has_food_allergies, allergy_alerts, status, allergy_cleared_by_kitchen,
                            kitchen_prep_notes, prepared_by, delivered_by, delivered_at, created_at, updated_at
                        ) VALUES (
                            ?, ?, ?, ?,
                            ?, ?, ?, ?, ?,
                            ?, ?, ?, ?,
                            ?, ?, ?, ?, NOW(), NOW()
                        )
                    ");
                    $deliveredAt = ($trayStatus === 'delivered') ? date('Y-m-d 08:30:00') : null;
                    $deliveredBy = ($trayStatus === 'delivered') ? 'Dietary Aide Johnson' : null;
                    $preparedBy = ($trayStatus !== 'scheduled') ? 'Chef Marcus' : null;

                    $insTray->execute([
                        $trayNo, $rxId, $pid, $spec['ward'],
                        $targetDate, $m, $spec['diet'], $spec['tex'], $spec['liq'],
                        $hasAllergy ? 1 : 0, $allergyStr, $trayStatus, $cleared,
                        $prepNotes, $preparedBy, $deliveredBy, $deliveredAt
                    ]);
                    $createdCount++;
                }
            }

            $pdo->commit();
            return ['seeded' => true, 'created_trays' => $createdCount, 'target_date' => $targetDate];
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }
}
