<?php

namespace App\Modules\Er\Services;

use App\Core\Database;
use App\Modules\Alerts\Services\AlertService;
use App\Modules\Lab\Services\LabService;
use App\Modules\Radiology\Services\RadiologyService;
use PDO;

class ErResuscitationBundleService
{
    public const ROLES = ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse'];

    public const BUNDLES = [
        'mtp_activation' => [
            'code' => 'mtp_activation',
            'title' => 'Massive Transfusion Protocol (MTP — Cooler #1 STAT)',
            'category' => 'Massive Transfusion Protocol (MTP)',
            'badge_color' => '#b91c1c',
            'icon' => '🩸',
            'description' => '1:1:1 Balanced Resuscitation Pack (4u PRBC, 4u FFP, 1u Apheresis Platelets, Cryoprecipitate) + TXA 1g IV + Calcium + STAT Type & Crossmatch.',
            'blood_bank_status' => 'MTP Activated — Cooler #1 Dispatched (4u O-Neg PRBC + 4u FFP + 1u Plt)',
            'items' => [
                ['type' => 'Blood Product', 'code' => 'MTP-PRBC-4U', 'name' => '4 Units Uncrossed O-Negative / Type-Specific PRBC (Packed Red Blood Cells)'],
                ['type' => 'Blood Product', 'code' => 'MTP-FFP-4U', 'name' => '4 Units Thawed AB / Type-Specific Fresh Frozen Plasma (FFP)'],
                ['type' => 'Blood Product', 'code' => 'MTP-PLT-1U', 'name' => '1 Unit Apheresis Platelets (6-Pack Equivalent)'],
                ['type' => 'Blood Product', 'code' => 'MTP-CRYO-10U', 'name' => '10 Units Cryoprecipitate Pool (Fibrinogen Replacement)'],
                ['type' => 'Resuscitation Med', 'code' => 'TXA-1G-IV', 'name' => 'Tranexamic Acid (TXA) 1g IV Bolus over 10 min, then 1g IV over 8 hr'],
                ['type' => 'Resuscitation Med', 'code' => 'CACL2-1G-IV', 'name' => 'Calcium Chloride 1g IV / Calcium Gluconate 3g IV (Citrate Toxicity Prophylaxis)'],
                ['type' => 'Blood Bank Lab', 'code' => 'BB-TYPCROSS', 'name' => 'STAT ABO/Rh Type & Crossmatch (6 Units) + Direct Antiglobulin'],
                ['type' => 'Coagulation Lab', 'code' => 'LAB-FIBR', 'name' => 'STAT Fibrinogen, PT/INR, aPTT & Ionized Calcium']
            ],
            'lab_specs' => [
                ['code' => 'BB-TYPCROSS', 'name' => 'Type & Crossmatch (STAT MTP)', 'section' => 'blood_bank', 'container' => 'edta', 'specimen' => 'Blood'],
                ['code' => 'LAB-FIBR', 'name' => 'Fibrinogen & Coagulation Profile (PT/INR/aPTT)', 'section' => 'coagulation', 'container' => 'citrate', 'specimen' => 'Blood']
            ],
            'rad_specs' => []
        ],
        'trauma_lab_panel' => [
            'code' => 'trauma_lab_panel',
            'title' => 'STAT Trauma & Resuscitation Lab Panel',
            'category' => 'Trauma Lab Panel',
            'badge_color' => '#0284c7',
            'icon' => '🧪',
            'description' => 'One-click STAT trauma blood work: Type & Screen, CBC, PT/INR/aPTT, Fibrinogen, Arterial Blood Gas + Lactate, CMP, Troponin, & Urine Tox/hCG.',
            'blood_bank_status' => null,
            'items' => [
                ['type' => 'Blood Bank', 'code' => 'TRM-TYPESCR', 'name' => 'STAT ABO/Rh Type & Screen / Crossmatch'],
                ['type' => 'Hematology', 'code' => 'TRM-CBC', 'name' => 'Complete Blood Count (CBC) with Differential & Serial Hgb/Hct'],
                ['type' => 'Coagulation', 'code' => 'TRM-COAG', 'name' => 'Coagulation Panel (PT, INR, aPTT) + Fibrinogen'],
                ['type' => 'Blood Gas', 'code' => 'TRM-ABGLAC', 'name' => 'Arterial Blood Gas (ABG) + Base Deficit + Venous/Arterial Lactate'],
                ['type' => 'Chemistry', 'code' => 'TRM-CMP', 'name' => 'Comprehensive Metabolic Panel (CMP — Na, K, Cl, CO2, BUN, Cr, Glucose, Ca)'],
                ['type' => 'Toxicology/Point-of-Care', 'code' => 'TRM-TOXBHCG', 'name' => 'Serum Ethanol, Urine Drug Screen & STAT Qualitative Beta-hCG']
            ],
            'lab_specs' => [
                ['code' => 'TRM-TYPESCR', 'name' => 'Type & Screen (Trauma STAT)', 'section' => 'blood_bank', 'container' => 'edta', 'specimen' => 'Blood'],
                ['code' => 'TRM-CBC', 'name' => 'CBC with Differential (Trauma STAT)', 'section' => 'hematology', 'container' => 'edta', 'specimen' => 'Blood'],
                ['code' => 'TRM-COAG', 'name' => 'PT / INR / aPTT & Fibrinogen (Trauma STAT)', 'section' => 'coagulation', 'container' => 'citrate', 'specimen' => 'Blood'],
                ['code' => 'TRM-ABGLAC', 'name' => 'Arterial Blood Gas (ABG) & Serum Lactate', 'section' => 'blood_gas', 'container' => 'abg', 'specimen' => 'Blood'],
                ['code' => 'TRM-CMP', 'name' => 'Comprehensive Metabolic Panel (CMP)', 'section' => 'chemistry', 'container' => 'sst', 'specimen' => 'Blood'],
                ['code' => 'TRM-TOXBHCG', 'name' => 'Serum Ethanol & Trauma Toxicology / Beta-hCG', 'section' => 'chemistry', 'container' => 'sst', 'specimen' => 'Blood']
            ],
            'rad_specs' => []
        ],
        'emergency_bedside_imaging' => [
            'code' => 'emergency_bedside_imaging',
            'title' => 'STAT Emergency Bedside & Trauma Imaging Bundle',
            'category' => 'Emergency Bedside Imaging',
            'badge_color' => '#7c3aed',
            'icon' => '🩻',
            'description' => 'One-click STAT Portable AP Chest X-Ray, Portable AP Pelvis X-Ray, Bedside eFAST Ultrasound, and Trauma CT Pan-Scan (Head, C-Spine, Chest/Abd/Pelvis).',
            'blood_bank_status' => null,
            'items' => [
                ['type' => 'Portable X-Ray', 'code' => 'RAD-PCXR', 'name' => 'Portable AP Supine Chest X-Ray (Resuscitation Bay Bedside)'],
                ['type' => 'Portable X-Ray', 'code' => 'RAD-PPELV', 'name' => 'Portable AP Pelvis X-Ray (Resuscitation Bay Bedside)'],
                ['type' => 'Bedside Ultrasound', 'code' => 'RAD-EFAST', 'name' => 'STAT Bedside eFAST Ultrasound (Pericardial, RUQ, LUQ, Pelvis, Thorax)'],
                ['type' => 'Trauma CT Scan', 'code' => 'RAD-CTHEADCS', 'name' => 'CT Head Non-Contrast + CT Cervical Spine (Trauma Pan-Scan)'],
                ['type' => 'Trauma CT Scan', 'code' => 'RAD-CTCAP', 'name' => 'CT Chest / Abdomen / Pelvis with IV Contrast (Trauma Pan-Scan)']
            ],
            'lab_specs' => [],
            'rad_specs' => [
                ['code' => 'RAD-PCXR', 'name' => 'Portable Chest X-Ray (AP Supine Bedside)', 'modality' => 'xray', 'contrast' => 'none', 'portable' => 1, 'minutes' => 10],
                ['code' => 'RAD-PPELV', 'name' => 'Portable Pelvis X-Ray (AP Bedside)', 'modality' => 'xray', 'contrast' => 'none', 'portable' => 1, 'minutes' => 10],
                ['code' => 'RAD-EFAST', 'name' => 'Bedside eFAST Trauma Ultrasound', 'modality' => 'ultrasound', 'contrast' => 'none', 'portable' => 1, 'minutes' => 10],
                ['code' => 'RAD-CTHEADCS', 'name' => 'CT Head & Cervical Spine Non-Contrast (Trauma)', 'modality' => 'ct', 'contrast' => 'none', 'portable' => 0, 'minutes' => 15],
                ['code' => 'RAD-CTCAP', 'name' => 'CT Chest / Abdomen / Pelvis (Trauma Pan-Scan)', 'modality' => 'ct', 'contrast' => 'none', 'portable' => 0, 'minutes' => 20]
            ]
        ],
        'full_trauma_megabundle' => [
            'code' => 'full_trauma_megabundle',
            'title' => 'Full Trauma Resuscitation Mega-Bundle (MTP + Trauma Labs + Bedside Imaging)',
            'category' => 'Full Trauma Resuscitation Mega-Bundle',
            'badge_color' => '#dc2626',
            'icon' => '🚨',
            'description' => 'Simultaneous 1-click activation of Massive Transfusion Protocol (MTP Cooler #1), STAT Trauma Lab Panel, and STAT Portable/Trauma Imaging.',
            'blood_bank_status' => 'MTP Activated — Cooler #1 Dispatched + STAT Trauma Labs & Imaging Ordered',
            'items' => [], // Populated dynamically from the 3 component bundles
            'lab_specs' => [],
            'rad_specs' => []
        ]
    ];

    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
        $this->ensureTableExists();
    }

    private function ensureTableExists(): void
    {
        $sql = "
        CREATE TABLE IF NOT EXISTS `er_resuscitation_bundle_orders` (
            `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `bundle_order_no` VARCHAR(40) NOT NULL,
            `visit_id` INT UNSIGNED NOT NULL,
            `patient_id` INT UNSIGNED NOT NULL,
            `bundle_code` VARCHAR(50) NOT NULL,
            `bundle_title` VARCHAR(140) NOT NULL,
            `bundle_category` ENUM(
                'Massive Transfusion Protocol (MTP)',
                'Trauma Lab Panel',
                'Emergency Bedside Imaging',
                'Full Trauma Resuscitation Mega-Bundle'
            ) NOT NULL,
            `priority` VARCHAR(20) NOT NULL DEFAULT 'STAT',
            `ordered_items_json` TEXT NOT NULL,
            `linked_lab_request_id` INT UNSIGNED NULL DEFAULT NULL,
            `linked_lab_request_no` VARCHAR(40) NULL DEFAULT NULL,
            `linked_rad_request_id` INT UNSIGNED NULL DEFAULT NULL,
            `linked_rad_request_no` VARCHAR(40) NULL DEFAULT NULL,
            `blood_bank_status` VARCHAR(100) NULL DEFAULT NULL,
            `clinical_indication` VARCHAR(500) NULL DEFAULT NULL,
            `status` ENUM(
                'Ordered - STAT',
                'Dispatched / In Progress',
                'Completed',
                'Cancelled'
            ) NOT NULL DEFAULT 'Ordered - STAT',
            `ordered_by_id` INT UNSIGNED NULL DEFAULT NULL,
            `ordered_by_name` VARCHAR(120) NOT NULL,
            `ordered_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            UNIQUE KEY `uq_er_resus_bundle_order_no` (`bundle_order_no`),
            KEY `idx_erbo_visit_id` (`visit_id`),
            KEY `idx_erbo_patient_id` (`patient_id`),
            KEY `idx_erbo_bundle_code` (`bundle_code`),
            KEY `idx_erbo_ordered_at` (`ordered_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ";
        $this->db->exec($sql);
    }

    /**
     * Get catalog and ordered resuscitation bundles for an ER visit
     */
    public function listByVisit(int $visitId): array
    {
        $stmt = $this->db->prepare("
            SELECT *
            FROM `er_resuscitation_bundle_orders`
            WHERE `visit_id` = :visit_id
            ORDER BY `ordered_at` DESC, `id` DESC
        ");
        $stmt->execute([':visit_id' => $visitId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        foreach ($rows as &$r) {
            $r['id'] = (int)$r['id'];
            $r['visit_id'] = (int)$r['visit_id'];
            $r['patient_id'] = (int)$r['patient_id'];
            $r['ordered_items'] = !empty($r['ordered_items_json'])
                ? json_decode($r['ordered_items_json'], true)
                : [];
        }
        unset($r);

        return [
            'orders' => $rows,
            'count' => count($rows),
            'catalog' => array_values($this->getResolvedCatalog())
        ];
    }

    private function getResolvedCatalog(): array
    {
        $catalog = self::BUNDLES;
        $catalog['full_trauma_megabundle']['items'] = array_merge(
            $catalog['mtp_activation']['items'],
            $catalog['trauma_lab_panel']['items'],
            $catalog['emergency_bedside_imaging']['items']
        );
        $catalog['full_trauma_megabundle']['lab_specs'] = array_merge(
            $catalog['mtp_activation']['lab_specs'],
            $catalog['trauma_lab_panel']['lab_specs']
        );
        $catalog['full_trauma_megabundle']['rad_specs'] = $catalog['emergency_bedside_imaging']['rad_specs'];
        return $catalog;
    }

    /**
     * Execute a 1-click STAT Resuscitation Order Bundle
     */
    public function orderBundle(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::ROLES, true)) {
            return ['success' => false, 'message' => 'Permission denied to order STAT resuscitation bundles.', 'forbidden' => true];
        }

        $visitId = (int)($data['visit_id'] ?? 0);
        $bundleCode = trim((string)($data['bundle_code'] ?? ''));

        $catalog = $this->getResolvedCatalog();
        if ($visitId <= 0 || !isset($catalog[$bundleCode])) {
            return ['success' => false, 'message' => 'Choose a valid ER visit and STAT resuscitation bundle.'];
        }

        $vStmt = $this->db->prepare("
            SELECT v.*, p.first_name, p.last_name, p.sex, b.name AS bed_name
            FROM `er_visits` v
            JOIN `patients` p ON p.id = v.patient_id
            LEFT JOIN `er_beds` b ON b.id = v.er_bed_id
            WHERE v.id = :id
            LIMIT 1
        ");
        $vStmt->execute([':id' => $visitId]);
        $visit = $vStmt->fetch(PDO::FETCH_ASSOC);
        if (!$visit) {
            return ['success' => false, 'message' => 'ER visit not found.', 'not_found' => true];
        }

        $bundle = $catalog[$bundleCode];
        $patientId = (int)$visit['patient_id'];
        $indication = trim((string)($data['clinical_indication'] ?? $visit['chief_complaint'] ?? 'Emergency Trauma / Resuscitation STAT Protocol'));
        if ($indication === '') {
            $indication = 'Emergency Trauma / Resuscitation STAT Protocol';
        }

        $actorId = !empty($actor['id']) ? (int)$actor['id'] : null;
        $actorName = trim((string)($actor['full_name'] ?? $actor['name'] ?? $actor['username'] ?? 'ER Clinician'));

        // Resolve ordering doctor ID for LabService / RadiologyService compatibility
        $orderingDoctorId = $this->resolveOrderingDoctorId($visit, $actor);
        $isDoctor = in_array($actor['role'] ?? '', ['admin', 'doctor', 'clinician'], true);
        $orderMode = $isDoctor ? 'written' : 'protocol';

        $linkedLabReqId = null;
        $linkedLabReqNo = null;
        $linkedRadReqId = null;
        $linkedRadReqNo = null;

        // 1. Dispatch STAT Lab Requisition if bundle includes lab_specs
        if (!empty($bundle['lab_specs']) && $orderingDoctorId > 0) {
            try {
                $labTestIds = $this->ensureLabConfigs($bundle['lab_specs']);
                if (!empty($labTestIds)) {
                    $labRes = (new LabService())->order([
                        'er_visit_id' => $visitId,
                        'tests' => $labTestIds,
                        'priority' => 'stat',
                        'clinical_info' => "[{$bundle['title']}] {$indication}",
                        'fasting' => 0,
                        'order_mode' => $orderMode,
                        'ordering_user_id' => $orderingDoctorId,
                        'confirm' => 1
                    ], $actor);

                    if (!empty($labRes['success']) && !empty($labRes['data'])) {
                        $linkedLabReqId = (int)($labRes['data']['id'] ?? 0) ?: null;
                        $linkedLabReqNo = $labRes['data']['request_no'] ?? null;
                    }
                }
            } catch (\Throwable $e) {
                error_log('STAT Resuscitation Lab dispatch notice: ' . $e->getMessage());
            }
        }

        // 2. Dispatch STAT Bedside/Trauma Imaging Requisition if bundle includes rad_specs
        if (!empty($bundle['rad_specs']) && $orderingDoctorId > 0) {
            try {
                $radStudyIds = $this->ensureRadConfigs($bundle['rad_specs']);
                if (!empty($radStudyIds)) {
                    $radRes = (new RadiologyService())->order([
                        'er_visit_id' => $visitId,
                        'studies' => $radStudyIds,
                        'priority' => 'stat',
                        'indication' => "[{$bundle['title']}] {$indication}",
                        'transport' => 'portable',
                        'pregnancy' => 'no',
                        'contrast_allergy' => 'no',
                        'implants' => 'no',
                        'order_mode' => $orderMode,
                        'ordering_user_id' => $orderingDoctorId,
                        'confirm' => 1
                    ], $actor);

                    if (!empty($radRes['success']) && !empty($radRes['data'])) {
                        $linkedRadReqId = (int)($radRes['data']['id'] ?? 0) ?: null;
                        $linkedRadReqNo = $radRes['data']['request_no'] ?? null;
                    }
                }
            } catch (\Throwable $e) {
                error_log('STAT Resuscitation Imaging dispatch notice: ' . $e->getMessage());
            }
        }

        // 3. Record in er_resuscitation_bundle_orders
        $prefix = $bundleCode === 'mtp_activation' ? 'STAT-MTP'
            : ($bundleCode === 'trauma_lab_panel' ? 'STAT-LAB'
            : ($bundleCode === 'emergency_bedside_imaging' ? 'STAT-IMG' : 'STAT-MEGA'));
        $bundleOrderNo = $prefix . '-' . date('Ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(2)), 0, 4));

        $stmt = $this->db->prepare("
            INSERT INTO `er_resuscitation_bundle_orders` (
                `bundle_order_no`, `visit_id`, `patient_id`,
                `bundle_code`, `bundle_title`, `bundle_category`, `priority`,
                `ordered_items_json`, `linked_lab_request_id`, `linked_lab_request_no`,
                `linked_rad_request_id`, `linked_rad_request_no`, `blood_bank_status`,
                `clinical_indication`, `status`, `ordered_by_id`, `ordered_by_name`, `ordered_at`
            ) VALUES (
                :no, :visit_id, :patient_id,
                :code, :title, :cat, 'STAT',
                :items_json, :lab_id, :lab_no,
                :rad_id, :rad_no, :bb_status,
                :ind, 'Dispatched / In Progress', :by_id, :by_name, NOW()
            )
        ");
        $stmt->execute([
            ':no' => $bundleOrderNo,
            ':visit_id' => $visitId,
            ':patient_id' => $patientId,
            ':code' => $bundle['code'],
            ':title' => $bundle['title'],
            ':cat' => $bundle['category'],
            ':items_json' => json_encode($bundle['items']),
            ':lab_id' => $linkedLabReqId,
            ':lab_no' => $linkedLabReqNo,
            ':rad_id' => $linkedRadReqId,
            ':rad_no' => $linkedRadReqNo,
            ':bb_status' => $bundle['blood_bank_status'],
            ':ind' => $indication,
            ':by_id' => $actorId,
            ':by_name' => $actorName
        ]);

        // Raise high-priority STAT alert for MTP activation
        if (in_array($bundleCode, ['mtp_activation', 'full_trauma_megabundle'], true)) {
            try {
                $ptName = trim(($visit['first_name'] ?? '') . ' ' . ($visit['last_name'] ?? ''));
                $loc = $visit['bed_name'] ?: 'ER Resuscitation Bay';
                AlertService::raise([
                    'type' => 'er_mtp_stat',
                    'urgency' => 'critical',
                    'title' => "🩸 MASSIVE TRANSFUSION PROTOCOL (MTP) ACTIVATED — {$ptName} ({$loc})",
                    'body' => "{$bundleOrderNo}: Dispatch Cooler #1 (4u O-Neg PRBC, 4u FFP, 1u Platelets) + TXA 1g IV immediately.",
                    'patient_id' => $patientId,
                    'link' => ['tab' => 'er'],
                    'targets' => [['role' => 'lab_technician'], ['role' => 'charge_nurse'], ['role' => 'doctor']],
                    'source_type' => 'er_resuscitation_bundle_orders',
                    'source_id' => (int)$this->db->lastInsertId(),
                    'dedupe_key' => "mtp:{$bundleOrderNo}"
                ]);
            } catch (\Throwable $e) {
                // Non-blocking
            }
        }

        $dispatchedRefs = array_filter([
            $bundleOrderNo,
            $linkedLabReqNo ? "Lab {$linkedLabReqNo}" : null,
            $linkedRadReqNo ? "Imaging {$linkedRadReqNo}" : null
        ]);

        return [
            'success' => true,
            'message' => "⚡ {$bundle['title']} ordered STAT (" . implode(' · ', $dispatchedRefs) . ')!',
            'data' => $this->listByVisit($visitId)
        ];
    }

    private function resolveOrderingDoctorId(array $visit, array $actor): int
    {
        if (in_array($actor['role'] ?? '', ['admin', 'doctor', 'clinician'], true) && !empty($actor['id'])) {
            // Verify user is in doctors list or return visit doctor
            $st = $this->db->prepare("SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = :id AND r.name IN ('doctor', 'clinician') AND u.deleted_at IS NULL");
            $st->execute([':id' => (int)$actor['id']]);
            if ($id = $st->fetchColumn()) {
                return (int)$id;
            }
        }
        if (!empty($visit['doctor_user_id'])) {
            return (int)$visit['doctor_user_id'];
        }
        $doc = $this->db->query("SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name IN ('doctor', 'clinician') AND u.deleted_at IS NULL ORDER BY u.id LIMIT 1")->fetchColumn();
        return (int)($doc ?: ($actor['id'] ?? 1));
    }

    /**
     * Ensure procedure_order_configs rows exist for the STAT Trauma Lab tests
     */
    private function ensureLabConfigs(array $specs): array
    {
        $ids = [];
        foreach ($specs as $s) {
            $st = $this->db->prepare("
                SELECT id FROM `procedure_order_configs`
                WHERE `deleted_at` IS NULL
                  AND `procedure_tier` = 'procedure_order'
                  AND (`identifying_code` = :code OR `name` = :name)
                LIMIT 1
            ");
            $st->execute([':code' => $s['code'], ':name' => $s['name']]);
            $existingId = $st->fetchColumn();
            if ($existingId) {
                $ids[] = (int)$existingId;
                continue;
            }
            $ins = $this->db->prepare("
                INSERT INTO `procedure_order_configs` (
                    `procedure_tier`, `name`, `identifying_code`, `order_test_type`,
                    `order_from`, `specimen_type`, `lab_container`, `lab_section`, `sequence`, `created_at`
                ) VALUES (
                    'procedure_order', :name, :code, 'Laboratory',
                    'Clinical Laboratory', :specimen, :container, :section, 10, NOW()
                )
            ");
            $ins->execute([
                ':name' => $s['name'],
                ':code' => $s['code'],
                ':specimen' => $s['specimen'],
                ':container' => $s['container'],
                ':section' => $s['section']
            ]);
            $ids[] = (int)$this->db->lastInsertId();
        }
        return $ids;
    }

    /**
     * Ensure procedure_order_configs rows exist for the STAT Emergency Bedside Imaging studies
     */
    private function ensureRadConfigs(array $specs): array
    {
        $ids = [];
        foreach ($specs as $s) {
            $st = $this->db->prepare("
                SELECT id FROM `procedure_order_configs`
                WHERE `deleted_at` IS NULL
                  AND `procedure_tier` = 'procedure_order'
                  AND (`identifying_code` = :code OR `name` = :name)
                LIMIT 1
            ");
            $st->execute([':code' => $s['code'], ':name' => $s['name']]);
            $existingId = $st->fetchColumn();
            if ($existingId) {
                $ids[] = (int)$existingId;
                continue;
            }
            $ins = $this->db->prepare("
                INSERT INTO `procedure_order_configs` (
                    `procedure_tier`, `name`, `identifying_code`, `order_test_type`,
                    `order_from`, `rad_modality`, `rad_contrast`, `rad_portable`, `rad_minutes`, `sequence`, `created_at`
                ) VALUES (
                    'procedure_order', :name, :code, 'Imaging',
                    'Radiology Department', :mod, :contrast, :port, :mins, 10, NOW()
                )
            ");
            $ins->execute([
                ':name' => $s['name'],
                ':code' => $s['code'],
                ':mod' => $s['modality'],
                ':contrast' => $s['contrast'],
                ':port' => $s['portable'],
                ':mins' => $s['minutes']
            ]);
            $ids[] = (int)$this->db->lastInsertId();
        }
        return $ids;
    }
}
