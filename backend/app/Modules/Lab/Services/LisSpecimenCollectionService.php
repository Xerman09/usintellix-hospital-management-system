<?php

declare(strict_types=1);

namespace App\Modules\Lab\Services;

use App\Core\Database;
use PDO;

class LisSpecimenCollectionService
{
    /** Tube Color Configurations (CLSI H3-A6 standard) */
    public const TUBE_COLORS = [
        'Lavender EDTA' => [
            'label' => 'Lavender EDTA',
            'cap_color' => '#a855f7',
            'specimen_type' => 'Whole Blood',
            'default_tests' => 'Complete Blood Count (CBC), ESR, HbA1c, Blood Smear',
            'order_of_draw' => 5
        ],
        'SST Gold' => [
            'label' => 'SST Gold (Serum Separator)',
            'cap_color' => '#eab308',
            'specimen_type' => 'Serum',
            'default_tests' => 'Basic Metabolic Panel, LFT, Lipid Profile, Troponin, Thyroid',
            'order_of_draw' => 3
        ],
        'Light Blue Citrate' => [
            'label' => 'Light Blue Citrate (Coagulation)',
            'cap_color' => '#38bdf8',
            'specimen_type' => 'Plasma',
            'default_tests' => 'Prothrombin Time (PT/INR), aPTT, D-Dimer, Fibrinogen',
            'order_of_draw' => 2
        ],
        'Green Heparin' => [
            'label' => 'Green Heparin',
            'cap_color' => '#16a34a',
            'specimen_type' => 'Whole Blood / Plasma',
            'default_tests' => 'STAT Electrolytes, Blood Gas, Ammonia, Lactate',
            'order_of_draw' => 4
        ],
        'Red Plain' => [
            'label' => 'Red Plain (Clot Activator)',
            'cap_color' => '#dc2626',
            'specimen_type' => 'Serum',
            'default_tests' => 'Therapeutic Drug Monitoring (Vancomycin, Digoxin), Serology, Crossmatch',
            'order_of_draw' => 3
        ],
        'Grey Fluoride' => [
            'label' => 'Grey Fluoride / Oxalate',
            'cap_color' => '#9ca3af',
            'specimen_type' => 'Plasma',
            'default_tests' => 'Fasting Blood Sugar (FBS), Oral Glucose Tolerance Test (OGTT), Lactic Acid',
            'order_of_draw' => 6
        ],
        'Blood Culture' => [
            'label' => 'Blood Culture Bottles (Aerobic / Anaerobic)',
            'cap_color' => '#475569',
            'specimen_type' => 'Whole Blood',
            'default_tests' => 'Blood Culture & Sensitivity (Aerobic & Anaerobic)',
            'order_of_draw' => 1
        ],
        'Yellow ACD' => [
            'label' => 'Yellow ACD / SPS',
            'cap_color' => '#fde047',
            'specimen_type' => 'Whole Blood',
            'default_tests' => 'HLA Phenotyping, Flow Cytometry, DNA Testing',
            'order_of_draw' => 1
        ],
        'Urine Cup' => [
            'label' => 'Urine Container (Sterile)',
            'cap_color' => '#ca8a04',
            'specimen_type' => 'Urine',
            'default_tests' => 'Routine Urinalysis, Urine Microalbumin, Urine Culture',
            'order_of_draw' => 8
        ],
        'Swab / VTM' => [
            'label' => 'Swab / Viral Transport Media',
            'cap_color' => '#f97316',
            'specimen_type' => 'Swab',
            'default_tests' => 'Respiratory Viral Panel, Wound Culture, Throat Swab',
            'order_of_draw' => 9
        ]
    ];

    public const DRAW_STATUSES = [
        'Pending Draw',
        'Collected',
        'In Transit',
        'Received in Lab',
        'Hemolyzed / Rejected'
    ];

    public const REJECTION_REASONS = [
        'Grossly Hemolyzed (Hemolysis Index > 300)' => 'Grossly Hemolyzed (Free hemoglobin interferes with Potassium/LDH/Enzymes)',
        'Clotted Specimen' => 'Clotted Specimen (Microclots consume platelets & clotting factors; invalidates CBC/Coagulation)',
        'Quantity Not Sufficient (QNS)' => 'Quantity Not Sufficient (QNS) - Insufficient volume to maintain accurate blood-to-anticoagulant ratio',
        'Wrong Tube / Container' => 'Wrong Tube / Container (e.g. EDTA used for Calcium testing, causing severe chelation artifact)',
        'Unlabelled / Mislabeled Specimen' => 'Unlabelled or Mislabeled Specimen (Violation of bedside positive patient identification)',
        'Temperature / Transport Excursion' => 'Temperature Excursion (Failed ambient/cold chain requirements or exceeded transit stability window)',
        'Contaminated / Leaking Container' => 'Contaminated / Leaking Container (Biohazard compromise or compromised sterility)'
    ];

    private static function userNameSql(string $column): string
    {
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))), ''), u.username)
                 FROM users u LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
                 WHERE u.id = {$column} LIMIT 1)";
    }

    /**
     * List specimen collection records with patient and collector context.
     */
    public function list(array $filters = []): array
    {
        $db = Database::connection();
        $where = ['1=1'];
        $params = [];

        if (!empty($filters['draw_status'])) {
            $where[] = 's.draw_status = :status';
            $params['status'] = $filters['draw_status'];
        }

        if (!empty($filters['tube_color'])) {
            $where[] = 's.tube_color = :tube_color';
            $params['tube_color'] = $filters['tube_color'];
        }

        if (!empty($filters['patient_id'])) {
            $where[] = 's.patient_id = :patient_id';
            $params['patient_id'] = (int) $filters['patient_id'];
        }

        if (!empty($filters['date_from'])) {
            $where[] = 'DATE(COALESCE(s.collection_time, s.created_at)) >= :date_from';
            $params['date_from'] = $filters['date_from'];
        }

        if (!empty($filters['date_to'])) {
            $where[] = 'DATE(COALESCE(s.collection_time, s.created_at)) <= :date_to';
            $params['date_to'] = $filters['date_to'];
        }

        if (!empty($filters['search'])) {
            $where[] = '(s.specimen_barcode LIKE :search OR s.test_names LIKE :search OR p.patient_no LIKE :search OR p.first_name LIKE :search OR p.last_name LIKE :search)';
            $params['search'] = '%' . $filters['search'] . '%';
        }

        $collectedByName = self::userNameSql('s.collected_by_user_id');
        $inTransitByName = self::userNameSql('s.in_transit_by_user_id');
        $receivedByName = self::userNameSql('s.received_by_user_id');
        $rejectedByName = self::userNameSql('s.rejected_by_user_id');

        $whereClause = implode(' AND ', $where);
        $limit = isset($filters['limit']) ? min(500, max(1, (int) $filters['limit'])) : 100;

        $stmt = $db->prepare("
            SELECT s.*,
                   p.patient_no,
                   p.first_name AS patient_first_name,
                   p.last_name AS patient_last_name,
                   CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) AS patient_name,
                   p.birthdate,
                   p.sex,
                   TIMESTAMPDIFF(YEAR, p.birthdate, CURDATE()) AS patient_age,
                   {$collectedByName} AS collected_by_name,
                   {$inTransitByName} AS in_transit_by_name,
                   {$receivedByName} AS received_by_name,
                   {$rejectedByName} AS rejected_by_name
            FROM lis_specimen_collections s
            JOIN patients p ON p.id = s.patient_id
            WHERE {$whereClause}
            ORDER BY 
                CASE s.draw_status
                    WHEN 'Pending Draw' THEN 1
                    WHEN 'Collected' THEN 2
                    WHEN 'In Transit' THEN 3
                    WHEN 'Hemolyzed / Rejected' THEN 4
                    WHEN 'Received in Lab' THEN 5
                    ELSE 6
                END ASC,
                s.id DESC
            LIMIT {$limit}
        ");
        $stmt->execute($params);

        return array_map(function ($row) {
            $row['id'] = (int) $row['id'];
            $row['patient_id'] = (int) $row['patient_id'];
            $row['two_identifier_checked'] = (bool) $row['two_identifier_checked'];
            $row['fasting_status'] = (bool) $row['fasting_status'];
            $row['recollection_ordered'] = (bool) $row['recollection_ordered'];
            $row['thermal_labels_printed'] = (int) $row['thermal_labels_printed'];
            return $row;
        }, $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * Get a single collection record with full audit trail.
     */
    public function get(int $id): ?array
    {
        $db = Database::connection();
        $collectedByName = self::userNameSql('s.collected_by_user_id');
        $inTransitByName = self::userNameSql('s.in_transit_by_user_id');
        $receivedByName = self::userNameSql('s.received_by_user_id');
        $rejectedByName = self::userNameSql('s.rejected_by_user_id');

        $stmt = $db->prepare("
            SELECT s.*,
                   p.patient_no,
                   p.first_name AS patient_first_name,
                   p.last_name AS patient_last_name,
                   CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) AS patient_name,
                   p.birthdate,
                   p.sex,
                   TIMESTAMPDIFF(YEAR, p.birthdate, CURDATE()) AS patient_age,
                   {$collectedByName} AS collected_by_name,
                   {$inTransitByName} AS in_transit_by_name,
                   {$receivedByName} AS received_by_name,
                   {$rejectedByName} AS rejected_by_name
            FROM lis_specimen_collections s
            JOIN patients p ON p.id = s.patient_id
            WHERE s.id = :id
            LIMIT 1
        ");
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        $row['id'] = (int) $row['id'];
        $row['patient_id'] = (int) $row['patient_id'];
        $row['two_identifier_checked'] = (bool) $row['two_identifier_checked'];
        $row['fasting_status'] = (bool) $row['fasting_status'];
        $row['recollection_ordered'] = (bool) $row['recollection_ordered'];
        $row['thermal_labels_printed'] = (int) $row['thermal_labels_printed'];
        return $row;
    }

    /**
     * Create a new specimen draw entry (e.g. from laboratory order or direct phlebotomy schedule).
     */
    public function create(array $data, int $actorUserId): array
    {
        $db = Database::connection();
        $patientId = (int) ($data['patient_id'] ?? 0);
        $tubeColor = trim((string) ($data['tube_color'] ?? 'Lavender EDTA'));
        $testNames = trim((string) ($data['test_names'] ?? ''));

        if ($patientId <= 0) {
            return ['success' => false, 'message' => 'Valid patient ID is required.'];
        }
        if ($testNames === '') {
            return ['success' => false, 'message' => 'Ordered tests description is required.'];
        }

        $tubeConfig = self::TUBE_COLORS[$tubeColor] ?? [
            'label' => $tubeColor,
            'cap_color' => '#a855f7',
            'specimen_type' => 'Whole Blood'
        ];

        $specimenType = trim((string) ($data['specimen_type'] ?? '')) ?: $tubeConfig['specimen_type'];
        $capColor = $tubeConfig['cap_color'];
        $storageTemp = trim((string) ($data['storage_temperature'] ?? 'Ambient (15-25°C)'));
        $site = trim((string) ($data['phlebotomy_site'] ?? 'Left Antecubital Fossa'));
        $method = trim((string) ($data['phlebotomy_method'] ?? 'Venipuncture'));
        $fasting = !empty($data['fasting_status']) ? 1 : 0;
        $twoIdChecked = !empty($data['two_identifier_checked']) ? 1 : 1;
        $isCollectedNow = !empty($data['mark_collected_now']);
        $drawStatus = $isCollectedNow ? 'Collected' : 'Pending Draw';
        $collectionTime = $isCollectedNow ? (!empty($data['collection_time']) ? $data['collection_time'] : date('Y-m-d H:i:s')) : null;
        $collectedBy = $isCollectedNow ? $actorUserId : null;
        $notes = trim((string) ($data['notes'] ?? ''));

        // Generate unique barcode: LIS-YYMMDD-XXXXX
        $barcode = 'LIS-' . date('ymd') . '-' . str_pad((string) mt_rand(1, 99999), 5, '0', STR_PAD_LEFT);

        $stmt = $db->prepare("
            INSERT INTO lis_specimen_collections (
                specimen_barcode, lab_request_id, order_id, patient_id,
                tube_color, tube_cap_color, specimen_type, test_names,
                draw_status, collection_time, collected_by_user_id,
                phlebotomy_site, phlebotomy_method, two_identifier_checked,
                fasting_status, storage_temperature, notes, created_at
            ) VALUES (
                :barcode, :req_id, :order_id, :patient_id,
                :tube_color, :cap_color, :specimen_type, :test_names,
                :draw_status, :collection_time, :collected_by,
                :phleb_site, :phleb_method, :two_id,
                :fasting, :storage_temp, :notes, NOW()
            )
        ");

        $stmt->execute([
            'barcode' => $barcode,
            'req_id' => !empty($data['lab_request_id']) ? (int) $data['lab_request_id'] : null,
            'order_id' => !empty($data['order_id']) ? (int) $data['order_id'] : null,
            'patient_id' => $patientId,
            'tube_color' => $tubeColor,
            'cap_color' => $capColor,
            'specimen_type' => $specimenType,
            'test_names' => $testNames,
            'draw_status' => $drawStatus,
            'collection_time' => $collectionTime,
            'collected_by' => $collectedBy,
            'phleb_site' => $site ?: null,
            'phleb_method' => $method ?: 'Venipuncture',
            'two_id' => $twoIdChecked,
            'fasting' => $fasting,
            'storage_temp' => $storageTemp,
            'notes' => $notes ?: null
        ]);

        $newId = (int) $db->lastInsertId();

        return [
            'success' => true,
            'message' => "Specimen collection {$barcode} ({$tubeColor}) created with status '{$drawStatus}'.",
            'id' => $newId,
            'specimen_barcode' => $barcode,
            'draw_status' => $drawStatus
        ];
    }

    /**
     * Mark specimen as successfully collected by nurse/phlebotomist at the bedside.
     */
    public function markCollected(int $id, array $data, int $actorUserId): array
    {
        $db = Database::connection();
        $rec = $this->get($id);
        if (!$rec) {
            return ['success' => false, 'message' => 'Specimen collection not found.'];
        }

        $twoId = !empty($data['two_identifier_checked']) ? 1 : 0;
        if (!$twoId) {
            return [
                'success' => false,
                'message' => "Bedside Patient Safety Alert: You must physically verify two patient identifiers (Name + DOB or MRN on wristband) before charting blood collection."
            ];
        }

        $collectionTime = !empty($data['collection_time']) ? $data['collection_time'] : date('Y-m-d H:i:s');
        $site = trim((string) ($data['phlebotomy_site'] ?? $rec['phlebotomy_site'] ?? 'Left Antecubital Fossa'));
        $method = trim((string) ($data['phlebotomy_method'] ?? $rec['phlebotomy_method'] ?? 'Venipuncture'));
        $fasting = isset($data['fasting_status']) ? (!empty($data['fasting_status']) ? 1 : 0) : $rec['fasting_status'];
        $notes = trim((string) ($data['notes'] ?? ''));

        $stmt = $db->prepare("
            UPDATE lis_specimen_collections
            SET draw_status = 'Collected',
                collection_time = :ctime,
                collected_by_user_id = :cby,
                phlebotomy_site = :site,
                phlebotomy_method = :method,
                two_identifier_checked = 1,
                fasting_status = :fasting,
                notes = COALESCE(NULLIF(:notes, ''), notes),
                updated_at = NOW()
            WHERE id = :id
        ");
        $stmt->execute([
            'ctime' => $collectionTime,
            'cby' => $actorUserId,
            'site' => $site,
            'method' => $method,
            'fasting' => $fasting ? 1 : 0,
            'notes' => $notes ?: null,
            'id' => $id
        ]);

        return [
            'success' => true,
            'message' => "Specimen {$rec['specimen_barcode']} successfully marked as Collected at {$collectionTime}.",
            'id' => $id,
            'draw_status' => 'Collected'
        ];
    }

    /**
     * Mark specimen as In Transit via pneumatic tube or courier transport to the central laboratory.
     */
    public function markInTransit(int $id, array $data, int $actorUserId): array
    {
        $db = Database::connection();
        $rec = $this->get($id);
        if (!$rec) {
            return ['success' => false, 'message' => 'Specimen collection not found.'];
        }

        $stmt = $db->prepare("
            UPDATE lis_specimen_collections
            SET draw_status = 'In Transit',
                in_transit_at = NOW(),
                in_transit_by_user_id = :uid,
                updated_at = NOW()
            WHERE id = :id
        ");
        $stmt->execute(['uid' => $actorUserId, 'id' => $id]);

        return [
            'success' => true,
            'message' => "Specimen {$rec['specimen_barcode']} dispatched In Transit to Central Lab.",
            'id' => $id,
            'draw_status' => 'In Transit'
        ];
    }

    /**
     * Medical Technologist marks specimen as Received in Lab after inspection and barcode scanning.
     */
    public function markReceivedInLab(int $id, array $data, int $actorUserId): array
    {
        $db = Database::connection();
        $rec = $this->get($id);
        if (!$rec) {
            return ['success' => false, 'message' => 'Specimen collection not found.'];
        }

        $stmt = $db->prepare("
            UPDATE lis_specimen_collections
            SET draw_status = 'Received in Lab',
                received_in_lab_at = NOW(),
                received_by_user_id = :uid,
                updated_at = NOW()
            WHERE id = :id
        ");
        $stmt->execute(['uid' => $actorUserId, 'id' => $id]);

        return [
            'success' => true,
            'message' => "Specimen {$rec['specimen_barcode']} accepted and Received in Lab for testing.",
            'id' => $id,
            'draw_status' => 'Received in Lab'
        ];
    }

    /**
     * Reject compromised specimen (Hemolyzed, Clotted, QNS, Wrong Tube) and optionally order immediate recollection.
     */
    public function rejectSpecimen(int $id, array $data, int $actorUserId): array
    {
        $db = Database::connection();
        $rec = $this->get($id);
        if (!$rec) {
            return ['success' => false, 'message' => 'Specimen collection not found.'];
        }

        $reason = trim((string) ($data['rejection_reason'] ?? ''));
        $notes = trim((string) ($data['rejection_notes'] ?? ''));
        $orderRecollect = !empty($data['recollection_ordered']);

        if ($reason === '') {
            return ['success' => false, 'message' => 'Laboratory rejection reason is required.'];
        }

        $stmt = $db->prepare("
            UPDATE lis_specimen_collections
            SET draw_status = 'Hemolyzed / Rejected',
                rejection_reason = :reason,
                rejection_notes = :notes,
                rejected_at = NOW(),
                rejected_by_user_id = :uid,
                recollection_ordered = :recollect,
                updated_at = NOW()
            WHERE id = :id
        ");
        $stmt->execute([
            'reason' => $reason,
            'notes' => $notes ?: null,
            'uid' => $actorUserId,
            'recollect' => $orderRecollect ? 1 : 0,
            'id' => $id
        ]);

        $newBarcode = null;
        if ($orderRecollect) {
            // Automatically spawn new Pending Draw recollection entry
            $recollectRes = $this->create([
                'patient_id' => $rec['patient_id'],
                'tube_color' => $rec['tube_color'],
                'specimen_type' => $rec['specimen_type'],
                'test_names' => $rec['test_names'] . ' [RECOLLECT]',
                'storage_temperature' => $rec['storage_temperature'],
                'phlebotomy_site' => $rec['phlebotomy_site'],
                'phlebotomy_method' => $rec['phlebotomy_method'],
                'notes' => "Replacement for rejected specimen {$rec['specimen_barcode']}: {$reason}"
            ], $actorUserId);
            $newBarcode = $recollectRes['specimen_barcode'] ?? null;
        }

        $msg = "Specimen {$rec['specimen_barcode']} flagged as Hemolyzed / Rejected ({$reason}).";
        if ($newBarcode) {
            $msg .= " Immediate recollection ordered with new barcode {$newBarcode}.";
        }

        return [
            'success' => true,
            'message' => $msg,
            'id' => $id,
            'draw_status' => 'Hemolyzed / Rejected',
            'recollection_barcode' => $newBarcode
        ];
    }

    /**
     * Get label data for printing thermal barcode stickers on specimen tubes.
     * Increments the thermal_labels_printed counter.
     */
    public function getLabelData(int $id): ?array
    {
        $db = Database::connection();
        $rec = $this->get($id);
        if (!$rec) {
            return null;
        }

        // Increment print count
        $db->prepare("
            UPDATE lis_specimen_collections
            SET thermal_labels_printed = thermal_labels_printed + 1,
                last_printed_at = NOW()
            WHERE id = :id
        ")->execute(['id' => $id]);

        return [
            'id' => $rec['id'],
            'specimen_barcode' => $rec['specimen_barcode'],
            'tube_color' => $rec['tube_color'],
            'tube_cap_color' => $rec['tube_cap_color'],
            'specimen_type' => $rec['specimen_type'],
            'test_names' => $rec['test_names'],
            'draw_status' => $rec['draw_status'],
            'collection_time' => $rec['collection_time'] ?: date('Y-m-d H:i:s'),
            'storage_temperature' => $rec['storage_temperature'],
            'fasting_status' => $rec['fasting_status'] ? 'FASTING' : 'RANDOM',
            'phlebotomy_site' => $rec['phlebotomy_site'],
            'patient_name' => $rec['patient_name'],
            'patient_first_name' => $rec['patient_first_name'],
            'patient_last_name' => $rec['patient_last_name'],
            'patient_no' => $rec['patient_no'],
            'birthdate' => $rec['birthdate'],
            'patient_age' => $rec['patient_age'],
            'sex' => strtoupper(substr((string) ($rec['sex'] ?? 'U'), 0, 1)),
            'collected_by_name' => $rec['collected_by_name'] ?: 'Staff',
            'thermal_labels_printed' => $rec['thermal_labels_printed'] + 1
        ];
    }

    /**
     * Phlebotomy collection KPI counters.
     */
    public function getStats(): array
    {
        $db = Database::connection();
        $stmt = $db->query("
            SELECT
                COUNT(*) AS total_specimens,
                SUM(CASE WHEN draw_status = 'Pending Draw' THEN 1 ELSE 0 END) AS pending_draw,
                SUM(CASE WHEN draw_status = 'Collected' THEN 1 ELSE 0 END) AS collected,
                SUM(CASE WHEN draw_status = 'In Transit' THEN 1 ELSE 0 END) AS in_transit,
                SUM(CASE WHEN draw_status = 'Received in Lab' THEN 1 ELSE 0 END) AS received_in_lab,
                SUM(CASE WHEN draw_status = 'Hemolyzed / Rejected' THEN 1 ELSE 0 END) AS hemolyzed_rejected,
                SUM(CASE WHEN DATE(COALESCE(collection_time, created_at)) = CURDATE() THEN 1 ELSE 0 END) AS today_draws
            FROM lis_specimen_collections
        ");
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

        return [
            'total_specimens' => (int) ($row['total_specimens'] ?? 0),
            'pending_draw' => (int) ($row['pending_draw'] ?? 0),
            'collected' => (int) ($row['collected'] ?? 0),
            'in_transit' => (int) ($row['in_transit'] ?? 0),
            'received_in_lab' => (int) ($row['received_in_lab'] ?? 0),
            'hemolyzed_rejected' => (int) ($row['hemolyzed_rejected'] ?? 0),
            'today_draws' => (int) ($row['today_draws'] ?? 0)
        ];
    }
}
