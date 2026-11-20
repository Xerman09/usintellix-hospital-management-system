<?php

namespace App\Modules\BusinessModules\Services;

use App\Core\Database;
use PDO;

class BusinessModuleService
{
    /**
     * Master catalog of all configurable hospital/clinic business modules.
     * Core modules (is_core = 1) remain always enabled so admins can never
     * lock themselves out of core EHR or system administration.
     */
    public const DEFAULT_MODULES = [
        // Core Platform
        [
            'module_key'  => 'core_patients',
            'name'        => 'Patient Management & EHR Core',
            'category'    => 'Core Platform',
            'description' => 'Patient directory, finder, flow board, active patient charts, encounters, messaging, and My Work.',
            'is_enabled'  => 1,
            'is_core'     => 1,
            'sort_order'  => 10,
        ],
        [
            'module_key'  => 'core_admin',
            'name'        => 'System Administration & RBAC',
            'category'    => 'Core Platform',
            'description' => 'Hospital settings, staff accounts, roles & permissions (RBAC), facilities, master coding dictionaries, and module management.',
            'is_enabled'  => 1,
            'is_core'     => 1,
            'sort_order'  => 20,
        ],

        // Clinical & Inpatient
        [
            'module_key'  => 'scheduling',
            'name'        => 'Appointments & Scheduling',
            'category'    => 'Clinical & Inpatient',
            'description' => 'Master appointment calendar, clinic operating schedules, doctor on-call duty rosters, recalls, and patient reminders.',
            'is_enabled'  => 1,
            'is_core'     => 0,
            'sort_order'  => 30,
        ],
        [
            'module_key'  => 'inpatient_adt',
            'name'        => 'Inpatient & Bed Management (ADT)',
            'category'    => 'Clinical & Inpatient',
            'description' => 'Inpatient admissions, discharge/transfer (ADT), room & bed availability, daily census, vital signs, nursing shift assignments, and visitor passes.',
            'is_enabled'  => 1,
            'is_core'     => 0,
            'sort_order'  => 40,
        ],
        [
            'module_key'  => 'emergency_room',
            'name'        => 'Emergency Room (ER) & Code Blue',
            'category'    => 'Clinical & Inpatient',
            'description' => 'Emergency department triage, ER tracking & reports, and Code Blue resuscitation response logging.',
            'is_enabled'  => 1,
            'is_core'     => 0,
            'sort_order'  => 50,
        ],
        [
            'module_key'  => 'icu',
            'name'        => 'ICU & Critical Care',
            'category'    => 'Clinical & Inpatient',
            'description' => 'Intensive Care Unit flowsheets, critical care monitoring, and ICU clinical reports.',
            'is_enabled'  => 1,
            'is_core'     => 0,
            'sort_order'  => 60,
        ],
        [
            'module_key'  => 'operating_room',
            'name'        => 'Operating Room (OR) & Surgery',
            'category'    => 'Clinical & Inpatient',
            'description' => 'OR live board, surgical schedules, OR suite management, surgery requests, and operative reports.',
            'is_enabled'  => 1,
            'is_core'     => 0,
            'sort_order'  => 70,
        ],
        [
            'module_key'  => 'care_coordination',
            'name'        => 'Care Coordination',
            'category'    => 'Clinical & Inpatient',
            'description' => 'Cross-department care plans, clinical continuity of care, and care team coordination.',
            'is_enabled'  => 1,
            'is_core'     => 0,
            'sort_order'  => 80,
        ],

        // Diagnostics & Ancillary
        [
            'module_key'  => 'laboratory',
            'name'        => 'Laboratory & Pathology',
            'category'    => 'Diagnostics & Ancillary',
            'description' => 'Lab worklist, specimen tracking, batch results entry, critical alert ranges, compendiums, and electronic lab reports.',
            'is_enabled'  => 1,
            'is_core'     => 0,
            'sort_order'  => 90,
        ],
        [
            'module_key'  => 'radiology',
            'name'        => 'Radiology & DICOM Imaging',
            'category'    => 'Diagnostics & Ancillary',
            'description' => 'Radiology worklists, imaging reports, and integrated DICOM viewer.',
            'is_enabled'  => 1,
            'is_core'     => 0,
            'sort_order'  => 100,
        ],
        [
            'module_key'  => 'blood_bank',
            'name'        => 'Blood Bank & Donors',
            'category'    => 'Diagnostics & Ancillary',
            'description' => 'Blood inventory, donor registry, cross-matching, and transfusion management.',
            'is_enabled'  => 1,
            'is_core'     => 0,
            'sort_order'  => 110,
        ],
        [
            'module_key'  => 'dietary',
            'name'        => 'Dietary & Nutrition Services',
            'category'    => 'Diagnostics & Ancillary',
            'description' => 'Inpatient meal orders, therapeutic diets, nutrition screening, and dietary kitchen tracking.',
            'is_enabled'  => 1,
            'is_core'     => 0,
            'sort_order'  => 120,
        ],

        // Pharmacy & Supply Chain
        [
            'module_key'  => 'pharmacy',
            'name'        => 'Pharmacy, Dispensing & MAR',
            'category'    => 'Pharmacy & Supply Chain',
            'description' => 'Pharmacy dashboard, prescription dispensing, order verification, MAR medication rounds, DD controlled register, ward cabinets, and drug catalog.',
            'is_enabled'  => 1,
            'is_core'     => 0,
            'sort_order'  => 130,
        ],
        [
            'module_key'  => 'procurement_supplies',
            'name'        => 'Procurement, Supplies & CSSD',
            'category'    => 'Pharmacy & Supply Chain',
            'description' => 'Non-pharma supply catalog, GRN, CSSD sterilization trays, purchase requests/POs, vendors, accounts payable, stock transfers, and lot tracing.',
            'is_enabled'  => 1,
            'is_core'     => 0,
            'sort_order'  => 140,
        ],

        // Billing & Revenue Cycle
        [
            'module_key'  => 'billing_finance',
            'name'        => 'Billing, Cashiering & Revenue Cycle',
            'category'    => 'Billing & Revenue Cycle',
            'description' => 'Inpatient master folio, split-tender cashiering, fee sheets, checkout, advance deposits, refunds, claims manager, denials, AR aging, tariffs, and EDI.',
            'is_enabled'  => 1,
            'is_core'     => 0,
            'sort_order'  => 150,
        ],

        // Reports & Governance
        [
            'module_key'  => 'reports_analytics',
            'name'        => 'Reports, Executive BI & Regulatory',
            'category'    => 'Reports & Governance',
            'description' => 'Clinical quality scorecards, executive financial BI (RevPAB), departmental profitability, encounter/visit analytics, AHSR, and disease surveillance.',
            'is_enabled'  => 1,
            'is_core'     => 0,
            'sort_order'  => 160,
        ],
        [
            'module_key'  => 'hipaa_compliance',
            'name'        => 'HIPAA Compliance & Security Governance',
            'category'    => 'Reports & Governance',
            'description' => 'HIPAA officers, tamper-evident audit logs, granular diffs, breach incidents, BAA registry, DRS pipeline, PHI amendments, DR recovery, and safe harbor de-ID.',
            'is_enabled'  => 1,
            'is_core'     => 0,
            'sort_order'  => 170,
        ],

        // Operations, HR & Portal
        [
            'module_key'  => 'hr_workforce',
            'name'        => 'Human Resources & Payroll',
            'category'    => 'Operations, HR & Portal',
            'description' => 'Staff attendance time clock, leave management, salary structures, hospital payroll & payslips, CME/CPD credits, BLS/ACLS certifications, and appraisals.',
            'is_enabled'  => 1,
            'is_core'     => 0,
            'sort_order'  => 180,
        ],
        [
            'module_key'  => 'equipment_facilities',
            'name'        => 'Biomedical Assets & TV Queue Displays',
            'category'    => 'Operations, HR & Portal',
            'description' => 'Biomedical & capital equipment asset tracking, waiting-room TV queue displays, and department org mapping.',
            'is_enabled'  => 1,
            'is_core'     => 0,
            'sort_order'  => 190,
        ],
        [
            'module_key'  => 'patient_portal',
            'name'        => 'Patient Portal & Online Check-in',
            'category'    => 'Operations, HR & Portal',
            'description' => 'Online check-ins, proxy record access, patient uploads, e-visits, intake questionnaires, cost estimates, fastpass slots, and imported readings.',
            'is_enabled'  => 1,
            'is_core'     => 0,
            'sort_order'  => 200,
        ],
    ];

    /**
     * Quick presets for common healthcare business types.
     */
    public const PRESETS = [
        'enable_all' => [
            'label'   => 'Full Hospital (All Modules)',
            'enabled' => null, // null = enable every module
        ],
        'outpatient_clinic' => [
            'label'   => 'Outpatient Clinic',
            'enabled' => [
                'core_patients',
                'core_admin',
                'scheduling',
                'laboratory',
                'pharmacy',
                'billing_finance',
                'reports_analytics',
                'hipaa_compliance',
                'patient_portal',
            ],
        ],
        'diagnostic_center' => [
            'label'   => 'Diagnostic & Lab Center',
            'enabled' => [
                'core_patients',
                'core_admin',
                'scheduling',
                'laboratory',
                'radiology',
                'billing_finance',
                'reports_analytics',
                'hipaa_compliance',
                'equipment_facilities',
            ],
        ],
        'minimal_ehr' => [
            'label'   => 'Minimal EHR Core',
            'enabled' => [
                'core_patients',
                'core_admin',
                'scheduling',
                'billing_finance',
                'hipaa_compliance',
            ],
        ],
    ];

    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
        $this->ensureTableAndSeed();
    }

    private function ensureTableAndSeed(): void
    {
        $this->db->exec("
            CREATE TABLE IF NOT EXISTS business_modules (
                id INT AUTO_INCREMENT PRIMARY KEY,
                module_key VARCHAR(64) NOT NULL,
                name VARCHAR(120) NOT NULL,
                category VARCHAR(64) NOT NULL,
                description VARCHAR(255) DEFAULT NULL,
                is_enabled TINYINT(1) NOT NULL DEFAULT 1,
                is_core TINYINT(1) NOT NULL DEFAULT 0,
                sort_order INT NOT NULL DEFAULT 0,
                updated_by INT NULL,
                updated_at DATETIME NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_business_modules_key (module_key)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        $stmt = $this->db->prepare("
            INSERT IGNORE INTO business_modules
                (module_key, name, category, description, is_enabled, is_core, sort_order, created_at)
            VALUES
                (:module_key, :name, :category, :description, :is_enabled, :is_core, :sort_order, NOW())
        ");

        foreach (self::DEFAULT_MODULES as $mod) {
            $stmt->execute([
                ':module_key'  => $mod['module_key'],
                ':name'        => $mod['name'],
                ':category'    => $mod['category'],
                ':description' => $mod['description'],
                ':is_enabled'  => $mod['is_enabled'],
                ':is_core'     => $mod['is_core'],
                ':sort_order'  => $mod['sort_order'],
            ]);
        }
    }

    public function listAll(): array
    {
        $stmt = $this->db->query("
            SELECT id, module_key, name, category, description, is_enabled, is_core, sort_order, updated_by, updated_at
            FROM business_modules
            ORDER BY sort_order ASC, id ASC
        ");

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        return array_map(static function (array $row): array {
            $row['id'] = (int) $row['id'];
            $row['is_enabled'] = (bool) ((int) $row['is_enabled']);
            $row['is_core'] = (bool) ((int) $row['is_core']);
            $row['sort_order'] = (int) $row['sort_order'];
            return $row;
        }, $rows);
    }

    /**
     * Batch update enabled states. Accepts either:
     *   ['modules' => ['pharmacy' => true, 'icu' => false, ...]]
     * or
     *   ['modules' => [['module_key' => 'pharmacy', 'is_enabled' => true], ...]]
     */
    public function updateModules(array $modulesInput, int $userId): array
    {
        $normalized = [];

        foreach ($modulesInput as $key => $val) {
            if (is_array($val) && isset($val['module_key'])) {
                $normalized[(string) $val['module_key']] = (bool) ($val['is_enabled'] ?? false);
            } elseif (is_string($key)) {
                $normalized[$key] = (bool) $val;
            }
        }

        if (empty($normalized)) {
            return [
                'success' => false,
                'message' => 'No valid module updates provided.',
            ];
        }

        $now = date('Y-m-d H:i:s');
        $stmt = $this->db->prepare("
            UPDATE business_modules
            SET is_enabled = CASE WHEN is_core = 1 THEN 1 ELSE :is_enabled END,
                updated_by = :updated_by,
                updated_at = :updated_at
            WHERE module_key = :module_key
        ");

        foreach ($normalized as $moduleKey => $enabled) {
            $stmt->execute([
                ':is_enabled' => $enabled ? 1 : 0,
                ':updated_by' => $userId,
                ':updated_at' => $now,
                ':module_key' => $moduleKey,
            ]);
        }

        return [
            'success' => true,
            'message' => 'Business module access updated successfully.',
            'data'    => $this->listAll(),
        ];
    }

    public function applyPreset(string $presetKey, int $userId): array
    {
        if (!isset(self::PRESETS[$presetKey])) {
            return [
                'success' => false,
                'message' => 'Unknown business preset: ' . $presetKey,
            ];
        }

        $preset = self::PRESETS[$presetKey];
        $enabledList = $preset['enabled'];
        $now = date('Y-m-d H:i:s');

        $all = $this->listAll();
        $stmt = $this->db->prepare("
            UPDATE business_modules
            SET is_enabled = CASE WHEN is_core = 1 THEN 1 ELSE :is_enabled END,
                updated_by = :updated_by,
                updated_at = :updated_at
            WHERE module_key = :module_key
        ");

        foreach ($all as $mod) {
            $shouldEnable = $enabledList === null
                ? true
                : in_array($mod['module_key'], $enabledList, true);

            $stmt->execute([
                ':is_enabled' => $shouldEnable ? 1 : 0,
                ':updated_by' => $userId,
                ':updated_at' => $now,
                ':module_key' => $mod['module_key'],
            ]);
        }

        return [
            'success' => true,
            'message' => 'Applied preset: ' . $preset['label'],
            'data'    => $this->listAll(),
        ];
    }
}
