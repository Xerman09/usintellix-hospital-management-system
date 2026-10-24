<?php

namespace App\Modules\Radiology\Services;

use App\Core\Database;
use PDO;
use RuntimeException;

class RisImagingOrderService
{
    public const MODALITIES = [
        'ct' => 'Computed Tomography (CT)',
        'mri' => 'Magnetic Resonance Imaging (MRI)',
        'xray' => 'General Radiography (X-Ray)',
        'ultrasound' => 'Ultrasound (US)',
        'mammography' => 'Mammography',
        'fluoroscopy' => 'Fluoroscopy'
    ];

    public const SAFETY_STATUSES = [
        'pending_review' => 'Pending Safety Review',
        'cleared' => 'Cleared for Scan',
        'flagged_risk' => 'High Risk / Needs Clearance',
        'rejected' => 'Rejected / Contraindicated'
    ];

    /**
     * Generate accession number: RAD-YYYY-XXXXX
     */
    public static function nextAccessionNo(PDO $db, ?int $year = null): string
    {
        $year = $year ?: (int) date('Y');
        $st = $db->prepare("SELECT last_seq FROM ris_counters WHERE prefix_year = :yr FOR UPDATE");
        $st->execute(['yr' => $year]);
        $row = $st->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $next = ((int) $row['last_seq']) + 1;
            $upd = $db->prepare("UPDATE ris_counters SET last_seq = :seq WHERE prefix_year = :yr");
            $upd->execute(['seq' => $next, 'yr' => $year]);
        } else {
            $next = 1;
            $ins = $db->prepare("INSERT INTO ris_counters (prefix_year, last_seq) VALUES (:yr, 1)");
            $ins->execute(['yr' => $year]);
        }

        return sprintf('RAD-%d-%05d', $year, $next);
    }

    /**
     * Calculate estimated Glomerular Filtration Rate (eGFR) using CKD-EPI formula
     * Requires creatinine (mg/dL), age (years), sex ('male'|'female').
     */
    public static function calculateEgfr(?float $creatinine, ?int $age, ?string $sex): ?float
    {
        if ($creatinine === null || $creatinine <= 0 || $age === null || $age <= 0) {
            return null;
        }

        $isFemale = strtolower((string) $sex) === 'female';
        $kappa = $isFemale ? 0.7 : 0.9;
        $alpha = $isFemale ? -0.241 : -0.302;
        $genderMultiplier = $isFemale ? 1.012 : 1.0;

        $scrKappa = $creatinine / $kappa;
        $min = min($scrKappa, 1.0);
        $max = max($scrKappa, 1.0);

        // CKD-EPI 2021 formula: 142 * (min(Scr/k, 1)^alpha) * (max(Scr/k, 1)^-1.200) * (0.9938^Age) * genderMultiplier
        $egfr = 142 * pow($min, $alpha) * pow($max, -1.200) * pow(0.9938, $age) * $genderMultiplier;
        return round($egfr, 1);
    }

    /**
     * Automatically evaluate renal safety for IV contrast administration.
     * Guideline: eGFR >= 45 is safe; 30-44 is borderline (needs hydration protocol); <30 is high risk/contraindicated.
     */
    public static function evaluateRenalClearance(string $contrastType, ?float $creatinine, ?float $egfr): array
    {
        $needsIvContrast = in_array($contrastType, ['iv', 'both'], true);
        if (!$needsIvContrast) {
            return [
                'cleared' => true,
                'status' => 'cleared',
                'notes' => 'No IV iodinated/gadolinium contrast required for this exam.'
            ];
        }

        if ($egfr !== null) {
            if ($egfr >= 45.0) {
                return [
                    'cleared' => true,
                    'status' => 'cleared',
                    'notes' => sprintf('Normal/adequate renal clearance (eGFR %s mL/min/1.73m²). Cleared for IV contrast.', $egfr)
                ];
            } elseif ($egfr >= 30.0) {
                return [
                    'cleared' => false,
                    'status' => 'flagged_risk',
                    'notes' => sprintf('Borderline renal impairment (eGFR %s mL/min/1.73m²). Pre-scan IV hydration protocol required.', $egfr)
                ];
            } else {
                return [
                    'cleared' => false,
                    'status' => 'flagged_risk',
                    'notes' => sprintf('Severe renal impairment (eGFR %s mL/min/1.73m²). Contrast-Induced Nephropathy (CIN) risk; consult radiologist.', $egfr)
                ];
            }
        }

        if ($creatinine !== null) {
            if ($creatinine <= 1.4) {
                return [
                    'cleared' => true,
                    'status' => 'cleared',
                    'notes' => sprintf('Creatinine within safe limits (%s mg/dL). Cleared for IV contrast.', $creatinine)
                ];
            } else {
                return [
                    'cleared' => false,
                    'status' => 'flagged_risk',
                    'notes' => sprintf('Elevated serum creatinine (%s mg/dL). High risk of contrast nephrotoxicity; consult radiologist.', $creatinine)
                ];
            }
        }

        return [
            'cleared' => false,
            'status' => 'flagged_risk',
            'notes' => 'IV contrast requested but no recent Serum Creatinine / eGFR lab values found on file.'
        ];
    }

    /**
     * List RIS imaging orders with scheduling and safety filters
     */
    public function listOrders(array $filters): array
    {
        $db = Database::connection();
        $where = ['1=1'];
        $params = [];

        if (!empty($filters['modality'])) {
            $where[] = 'rio.modality = :modality';
            $params['modality'] = $filters['modality'];
        }

        if (!empty($filters['safety_status'])) {
            $where[] = 'rio.safety_status = :safety_status';
            $params['safety_status'] = $filters['safety_status'];
        }

        if (!empty($filters['study_status'])) {
            $where[] = 'rio.study_status = :study_status';
            $params['study_status'] = $filters['study_status'];
        }

        if (!empty($filters['room_id'])) {
            $where[] = 'rio.room_id = :room_id';
            $params['room_id'] = (int) $filters['room_id'];
        }

        if (!empty($filters['patient_id'])) {
            $where[] = 'rio.patient_id = :patient_id';
            $params['patient_id'] = (int) $filters['patient_id'];
        }

        if (!empty($filters['q'])) {
            $q = '%' . trim($filters['q']) . '%';
            $where[] = '(rio.accession_no LIKE :q1 OR p.patient_no LIKE :q2 OR CONCAT(p.first_name, " ", p.last_name) LIKE :q3 OR cfg.name LIKE :q4)';
            $params['q1'] = $q;
            $params['q2'] = $q;
            $params['q3'] = $q;
            $params['q4'] = $q;
        }

        $sql = "SELECT rio.*,
                       p.patient_no, p.first_name, p.last_name, p.birthdate, p.sex,
                       cfg.name AS study_name, cfg.identifying_code AS study_code,
                       rm.name AS room_name, rm.modality AS room_modality,
                       req.request_no, req.priority, req.indication, req.location AS patient_location,
                       u_tech.username AS technologist_username,
                       u_clear.username AS cleared_by_username
                FROM ris_imaging_orders rio
                JOIN patients p ON p.id = rio.patient_id
                JOIN patient_procedure_orders ppo ON ppo.id = rio.order_id
                JOIN procedure_order_configs cfg ON cfg.id = ppo.procedure_order_config_id
                LEFT JOIN rad_rooms rm ON rm.id = rio.room_id
                LEFT JOIN rad_requests req ON req.id = rio.rad_request_id
                LEFT JOIN users u_tech ON u_tech.id = rio.technologist_user_id
                LEFT JOIN users u_clear ON u_clear.id = rio.safety_cleared_by
                WHERE " . implode(' AND ', $where) . "
                ORDER BY rio.id DESC
                LIMIT 100";

        $st = $db->prepare($sql);
        $st->execute($params);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC);

        $now = date('Y-m-d');
        foreach ($rows as &$r) {
            $r['patient_name'] = trim($r['first_name'] . ' ' . $r['last_name']);
            if ($r['birthdate']) {
                $r['age'] = (int) date_diff(date_create($r['birthdate']), date_create($now))->y;
            } else {
                $r['age'] = null;
            }
            $r['modality_label'] = self::MODALITIES[$r['modality']] ?? strtoupper($r['modality']);
            $r['safety_status_label'] = self::SAFETY_STATUSES[$r['safety_status']] ?? $r['safety_status'];
        }

        return $rows;
    }

    /**
     * Get detail of a specific RIS imaging order
     */
    public function getOrderDetail(int $id): ?array
    {
        $db = Database::connection();
        $sql = "SELECT rio.*,
                       p.patient_no, p.first_name, p.last_name, p.birthdate, p.sex,
                       cfg.name AS study_name, cfg.identifying_code AS study_code, cfg.rad_prep,
                       rm.name AS room_name, rm.location AS room_location,
                       req.request_no, req.priority, req.indication, req.location AS patient_location,
                       u_tech.username AS technologist_username,
                       u_clear.username AS cleared_by_username
                FROM ris_imaging_orders rio
                JOIN patients p ON p.id = rio.patient_id
                JOIN patient_procedure_orders ppo ON ppo.id = rio.order_id
                JOIN procedure_order_configs cfg ON cfg.id = ppo.procedure_order_config_id
                LEFT JOIN rad_rooms rm ON rm.id = rio.room_id
                LEFT JOIN rad_requests req ON req.id = rio.rad_request_id
                LEFT JOIN users u_tech ON u_tech.id = rio.technologist_user_id
                LEFT JOIN users u_clear ON u_clear.id = rio.safety_cleared_by
                WHERE rio.id = :id
                LIMIT 1";

        $st = $db->prepare($sql);
        $st->execute(['id' => $id]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }

        $now = date('Y-m-d');
        $row['patient_name'] = trim($row['first_name'] . ' ' . $row['last_name']);
        if ($row['birthdate']) {
            $row['age'] = (int) date_diff(date_create($row['birthdate']), date_create($now))->y;
        } else {
            $row['age'] = null;
        }
        $row['modality_label'] = self::MODALITIES[$row['modality']] ?? strtoupper($row['modality']);
        $row['safety_status_label'] = self::SAFETY_STATUSES[$row['safety_status']] ?? $row['safety_status'];

        return $row;
    }

    /**
     * Create RIS Imaging Order record for a study (assigning accession number and performing safety checks)
     */
    public function createRisOrder(int $orderId, array $data, array $actor): array
    {
        $db = Database::connection();

        // Check if an existing RIS record exists
        $check = $db->prepare("SELECT id, accession_no FROM ris_imaging_orders WHERE order_id = :oid LIMIT 1");
        $check->execute(['oid' => $orderId]);
        $existing = $check->fetch(PDO::FETCH_ASSOC);
        if ($existing) {
            return [
                'success' => true,
                'message' => 'RIS imaging order already exists for this study.',
                'accession_no' => $existing['accession_no'],
                'id' => (int) $existing['id']
            ];
        }

        // Fetch study details
        $st = $db->prepare(
            "SELECT ppo.id, ppo.patient_id, ppo.rad_request_id, ppo.rad_booking_id,
                    cfg.rad_modality, cfg.rad_contrast,
                    p.birthdate, p.sex, p.first_name, p.last_name,
                    req.creatinine, req.creatinine_at, req.contrast_allergy, req.contrast_allergy_detail,
                    req.implants, req.implants_detail, req.pregnancy
             FROM patient_procedure_orders ppo
             JOIN procedure_order_configs cfg ON cfg.id = ppo.procedure_order_config_id
             JOIN patients p ON p.id = ppo.patient_id
             LEFT JOIN rad_requests req ON req.id = ppo.rad_request_id
             WHERE ppo.id = :oid
             LIMIT 1"
        );
        $st->execute(['oid' => $orderId]);
        $order = $st->fetch(PDO::FETCH_ASSOC);
        if (!$order) {
            return ['success' => false, 'message' => 'Study order not found.'];
        }

        $modality = $order['rad_modality'] ?: ($data['modality'] ?? 'xray');
        $contrastType = $order['rad_contrast'] ?: ($data['contrast_type'] ?? 'none');
        $creatinine = $order['creatinine'] !== null ? (float) $order['creatinine'] : (isset($data['creatinine']) && is_numeric($data['creatinine']) ? (float) $data['creatinine'] : null);
        $creatinineDate = $order['creatinine_at'] ?: ($data['creatinine_date'] ?? null);

        $now = date('Y-m-d');
        $age = $order['birthdate'] ? (int) date_diff(date_create($order['birthdate']), date_create($now))->y : null;
        $egfr = self::calculateEgfr($creatinine, $age, $order['sex']);

        $renalEval = self::evaluateRenalClearance($contrastType, $creatinine, $egfr);

        // Contrast Allergy Assessment
        $allergyRaw = $order['contrast_allergy'] ?? ($data['contrast_allergy'] ?? 'no');
        $allergyStatus = 'no_allergy';
        $allergyNotes = $order['contrast_allergy_detail'] ?? ($data['contrast_allergy_notes'] ?? null);
        if ($allergyRaw === 'yes') {
            $allergyStatus = 'previous_reaction';
        } elseif ($allergyRaw === 'unknown') {
            $allergyStatus = 'unknown';
        }

        // MRI Safety Assessment
        $mriStatus = 'not_applicable';
        $implantsNotes = $order['implants_detail'] ?? ($data['implants_notes'] ?? null);
        if ($modality === 'mri') {
            $implantsRaw = $order['implants'] ?? ($data['implants'] ?? 'no');
            if ($implantsRaw === 'yes') {
                $mriStatus = 'pending_check'; // Requires implant safety verification (conditional vs unsafe)
            } elseif ($implantsRaw === 'no') {
                $mriStatus = 'mri_safe';
            } else {
                $mriStatus = 'pending_check';
            }
        }

        // Pregnancy Assessment
        $pregRaw = $order['pregnancy'] ?? ($data['pregnancy'] ?? 'not_applicable');
        $pregStatus = 'not_applicable';
        $pregCleared = 1;
        if (in_array($modality, ['xray', 'ct', 'fluoroscopy', 'mammography'], true)) {
            if ($pregRaw === 'yes') {
                $pregStatus = 'pregnant';
                $pregCleared = 0; // Radiation risk flag
            } elseif ($pregRaw === 'unknown') {
                $pregStatus = 'unknown';
                $pregCleared = 0;
            } elseif ($pregRaw === 'no') {
                $pregStatus = 'not_pregnant';
                $pregCleared = 1;
            }
        }

        // Overall safety status
        $safetyStatus = 'cleared';
        if (!$renalEval['cleared'] || $allergyStatus === 'previous_reaction' || $mriStatus === 'pending_check' || $mriStatus === 'mri_unsafe' || !$pregCleared) {
            $safetyStatus = 'flagged_risk';
        }

        $accessionNo = self::nextAccessionNo($db);

        $roomId = !empty($data['room_id']) ? (int) $data['room_id'] : null;
        $startAt = !empty($data['start_at']) ? $data['start_at'] : null;
        $endAt = !empty($data['end_at']) ? $data['end_at'] : null;
        $bookingId = $order['rad_booking_id'] ?: (!empty($data['booking_id']) ? (int) $data['booking_id'] : null);

        $ins = $db->prepare(
            "INSERT INTO ris_imaging_orders (
                order_id, rad_request_id, booking_id, patient_id, accession_no, modality, room_id,
                scheduled_start_at, scheduled_end_at, safety_status, contrast_type, contrast_allergy_status,
                contrast_allergy_notes, creatinine_value, creatinine_date, egfr_value, renal_cleared,
                renal_clearance_notes, mri_safe_status, implants_notes, pregnancy_status, pregnancy_cleared,
                pregnancy_notes, safety_cleared_by, safety_cleared_at, study_status, created_at
            ) VALUES (
                :oid, :rid, :bid, :pid, :acc, :mod, :room,
                :start_at, :end_at, :safety_status, :contrast_type, :allergy_status,
                :allergy_notes, :creat_val, :creat_date, :egfr, :renal_cleared,
                :renal_notes, :mri_status, :imp_notes, :preg_status, :preg_cleared,
                :preg_notes, :cleared_by, :cleared_at, :study_status, NOW()
            )"
        );

        $clearedBy = $safetyStatus === 'cleared' ? (int) $actor['id'] : null;
        $clearedAt = $safetyStatus === 'cleared' ? date('Y-m-d H:i:s') : null;

        $ins->execute([
            'oid' => $orderId,
            'rid' => $order['rad_request_id'],
            'bid' => $bookingId,
            'pid' => $order['patient_id'],
            'acc' => $accessionNo,
            'mod' => $modality,
            'room' => $roomId,
            'start_at' => $startAt,
            'end_at' => $endAt,
            'safety_status' => $safetyStatus,
            'contrast_type' => $contrastType,
            'allergy_status' => $allergyStatus,
            'allergy_notes' => $allergyNotes,
            'creat_val' => $creatinine,
            'creat_date' => $creatinineDate,
            'egfr' => $egfr,
            'renal_cleared' => $renalEval['cleared'] ? 1 : 0,
            'renal_notes' => $renalEval['notes'],
            'mri_status' => $mriStatus,
            'imp_notes' => $implantsNotes,
            'preg_status' => $pregStatus,
            'preg_cleared' => $pregCleared,
            'preg_notes' => $pregRaw === 'yes' ? 'Radiation exposure warning: patient pregnant' : null,
            'cleared_by' => $clearedBy,
            'cleared_at' => $clearedAt,
            'study_status' => $bookingId ? 'scheduled' : 'ordered'
        ]);

        $risId = (int) $db->lastInsertId();

        // Update accession_no on patient_procedure_orders & rad_bookings
        $updPpo = $db->prepare("UPDATE patient_procedure_orders SET accession_no = :acc WHERE id = :oid");
        $updPpo->execute(['acc' => $accessionNo, 'oid' => $orderId]);

        if ($bookingId) {
            $updBk = $db->prepare("UPDATE rad_bookings SET accession_no = :acc WHERE id = :bid");
            $updBk->execute(['acc' => $accessionNo, 'bid' => $bookingId]);
        }

        return [
            'success' => true,
            'message' => "Accession {$accessionNo} assigned and safety profile generated.",
            'id' => $risId,
            'accession_no' => $accessionNo,
            'safety_status' => $safetyStatus,
            'egfr' => $egfr,
            'renal_cleared' => $renalEval['cleared']
        ];
    }

    /**
     * Clinically override or confirm safety clearance (e.g. RadTech or Radiologist review)
     */
    public function updateSafetyClearance(int $risId, array $data, array $actor): array
    {
        $db = Database::connection();
        $order = $this->getOrderDetail($risId);
        if (!$order) {
            return ['success' => false, 'message' => 'RIS order not found.'];
        }

        $safetyStatus = $data['safety_status'] ?? 'cleared';
        if (!isset(self::SAFETY_STATUSES[$safetyStatus])) {
            return ['success' => false, 'message' => 'Invalid safety clearance status.'];
        }

        $renalCleared = isset($data['renal_cleared']) ? (int) $data['renal_cleared'] : (int) $order['renal_cleared'];
        $mriStatus = $data['mri_safe_status'] ?? $order['mri_safe_status'];
        $notes = trim((string) ($data['clearance_notes'] ?? ''));

        $techLicense = trim((string) ($data['technologist_license_no'] ?? $order['technologist_license_no'] ?? ''));
        $techUserId = !empty($data['technologist_user_id']) ? (int) $data['technologist_user_id'] : (int) $actor['id'];

        $upd = $db->prepare(
            "UPDATE ris_imaging_orders
             SET safety_status = :status,
                 renal_cleared = :renal,
                 mri_safe_status = :mri,
                 renal_clearance_notes = CASE WHEN :notes <> '' THEN :notes2 ELSE renal_clearance_notes END,
                 safety_cleared_by = :uid,
                 safety_cleared_at = NOW(),
                 technologist_user_id = :tech_uid,
                 technologist_license_no = :tech_lic,
                 updated_at = NOW()
             WHERE id = :id"
        );

        $upd->execute([
            'status' => $safetyStatus,
            'renal' => $renalCleared,
            'mri' => $mriStatus,
            'notes' => $notes,
            'notes2' => $notes,
            'uid' => (int) $actor['id'],
            'tech_uid' => $techUserId,
            'tech_lic' => $techLicense,
            'id' => $risId
        ]);

        return [
            'success' => true,
            'message' => "Safety clearance updated for Accession {$order['accession_no']}.",
            'safety_status' => $safetyStatus
        ];
    }

    /**
     * Schedule or assign modality room to an existing RIS imaging order
     */
    public function scheduleRoom(int $risId, array $data, array $actor): array
    {
        $db = Database::connection();
        $order = $this->getOrderDetail($risId);
        if (!$order) {
            return ['success' => false, 'message' => 'RIS order not found.'];
        }

        $roomId = (int) ($data['room_id'] ?? 0);
        if ($roomId <= 0) {
            return ['success' => false, 'message' => 'Modality suite room is required.'];
        }

        $roomSt = $db->prepare("SELECT id, name, modality FROM rad_rooms WHERE id = :id AND is_active = 1 LIMIT 1");
        $roomSt->execute(['id' => $roomId]);
        $room = $roomSt->fetch(PDO::FETCH_ASSOC);
        if (!$room) {
            return ['success' => false, 'message' => 'Selected modality room is invalid or inactive.'];
        }

        if ($room['modality'] !== $order['modality']) {
            return [
                'success' => false,
                'message' => "Modality mismatch: Exam requires {$order['modality_label']}, but selected room is {$room['name']} ({$room['modality']})."
            ];
        }

        $startAt = trim((string) ($data['start_at'] ?? ''));
        $endAt = trim((string) ($data['end_at'] ?? ''));
        if (empty($startAt) || empty($endAt)) {
            return ['success' => false, 'message' => 'Start and end times are required for modality scheduling.'];
        }

        $techUserId = !empty($data['technologist_user_id']) ? (int) $data['technologist_user_id'] : (int) $actor['id'];
        $techLicense = trim((string) ($data['technologist_license_no'] ?? ''));

        $upd = $db->prepare(
            "UPDATE ris_imaging_orders
             SET room_id = :room,
                 scheduled_start_at = :start_at,
                 scheduled_end_at = :end_at,
                 technologist_user_id = :tech,
                 technologist_license_no = :lic,
                 study_status = 'scheduled',
                 updated_at = NOW()
             WHERE id = :id"
        );
        $upd->execute([
            'room' => $roomId,
            'start_at' => $startAt,
            'end_at' => $endAt,
            'tech' => $techUserId,
            'lic' => $techLicense,
            'id' => $risId
        ]);

        return [
            'success' => true,
            'message' => "Exam {$order['accession_no']} scheduled in {$room['name']} from {$startAt} to {$endAt}."
        ];
    }

    /**
     * Dashboard statistics for RIS Queue
     */
    public function getStats(): array
    {
        $db = Database::connection();
        $totalOrders = (int) $db->query("SELECT COUNT(*) FROM ris_imaging_orders")->fetchColumn();
        $pendingSafety = (int) $db->query("SELECT COUNT(*) FROM ris_imaging_orders WHERE safety_status = 'pending_review'")->fetchColumn();
        $flaggedRisks = (int) $db->query("SELECT COUNT(*) FROM ris_imaging_orders WHERE safety_status = 'flagged_risk'")->fetchColumn();
        $cleared = (int) $db->query("SELECT COUNT(*) FROM ris_imaging_orders WHERE safety_status = 'cleared'")->fetchColumn();
        $scheduledToday = (int) $db->query("SELECT COUNT(*) FROM ris_imaging_orders WHERE DATE(scheduled_start_at) = CURDATE()")->fetchColumn();
        $completedToday = (int) $db->query("SELECT COUNT(*) FROM ris_imaging_orders WHERE DATE(completed_at) = CURDATE()")->fetchColumn();

        return [
            'total_orders' => $totalOrders,
            'pending_safety' => $pendingSafety,
            'flagged_risks' => $flaggedRisks,
            'cleared' => $cleared,
            'scheduled_today' => $scheduledToday,
            'completed_today' => $completedToday
        ];
    }
}
