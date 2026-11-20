<?php

namespace App\Modules\Roles\Services;

use App\Core\Database;
use App\Modules\BusinessModules\Services\BusinessModuleService;
use App\Modules\Roles\Models\Role;
use PDO;
use Throwable;

class RoleService
{
    /**
     * List all active (non-deleted) roles.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, description, created_at, updated_at
             FROM roles
             WHERE deleted_at IS NULL
             ORDER BY name"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new role (admin-only).
     */
    public function register(array $data, int $createdBy): array
    {
        $errors = $this->validate($data);

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $errors
            ];
        }

        try {
            $roleId = (new Role())->create([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'created_at'  => date('Y-m-d H:i:s'),
                'created_by'  => $createdBy
            ]);

            if (!$roleId) {
                throw new \RuntimeException('Failed to create role record.');
            }

            return [
                'success' => true,
                'message' => 'Role created successfully.',
                'data' => [
                    'role_id' => $roleId
                ]
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create role.'
            ];
        }
    }

    /**
     * Update an existing role (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $role = (new Role())->where('id', $id)->first();

        if (!$role || $role['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Role not found.'
            ];
        }

        $errors = $this->validate($data, $id);

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $errors
            ];
        }

        $updated = (new Role())->update([
            'name'        => $data['name'],
            'description' => $data['description'] ?? null,
            'updated_at'  => date('Y-m-d H:i:s'),
            'updated_by'  => $updatedBy
        ], $id);

        if (!$updated) {
            return [
                'success' => false,
                'message' => 'Failed to update role.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Role updated successfully.'
        ];
    }

    /**
     * Soft-delete a role (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $role = (new Role())->where('id', $id)->first();

        if (!$role || $role['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Role not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE roles
             SET deleted_at = :deleted_at, deleted_by = :deleted_by
             WHERE id = :id"
        );

        $stmt->execute([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy,
            'id'         => $id
        ]);

        return [
            'success' => true,
            'message' => 'Role deleted successfully.'
        ];
    }

    /**
     * Validate role input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
            return $errors;
        }

        $existing = (new Role())->where('name', $data['name'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['name'] = 'A role with this name already exists.';
        }

        return $errors;
    }

    /**
     * Maps each RBAC capability key to the business_modules key(s) required
     * for it to be accessible to this organization. When an array is given,
     * the capability is available if ANY of the listed business modules is enabled.
     */
    private const CAPABILITY_BUSINESS_MODULES = [
        // admin subsystem
        'admin_users'            => 'core_admin',
        'admin_roles'            => 'core_admin',
        'admin_facilities'       => 'core_admin',
        'admin_equipment'        => 'equipment_facilities',
        'admin_departments'      => 'core_admin',
        'admin_clinic_schedules' => 'scheduling',
        'admin_department_org'   => 'equipment_facilities',
        'admin_audit_logs'       => 'hipaa_compliance',
        'admin_audit_diffs'      => 'hipaa_compliance',
        'admin_system_logs'      => 'core_admin',
        'admin_settings'         => 'core_admin',

        // pas subsystem
        'pas_view_patients'      => 'core_patients',
        'pas_register_patient'   => 'core_patients',
        'pas_appointments'       => 'scheduling',
        'pas_admissions'         => 'inpatient_adt',
        'pas_discharges'         => 'inpatient_adt',
        'pas_transfers'          => 'inpatient_adt',

        // clinical_ehr subsystem
        'ehr_view_chart'         => 'core_patients',
        'ehr_soap_notes'         => 'core_patients',
        'ehr_vital_signs'        => 'inpatient_adt',
        'ehr_problems_allergies' => 'core_patients',
        'ehr_cpoe_orders'        => 'core_patients',
        'ehr_nursing_care'       => 'inpatient_adt',
        'ehr_or_live'            => 'operating_room',

        // pharmacy subsystem
        'pharmacy_prescribe'     => 'pharmacy',
        'pharmacy_verify'        => 'pharmacy',
        'pharmacy_dispense'      => 'pharmacy',
        'pharmacy_emar'          => 'pharmacy',
        'pharmacy_inventory'     => 'pharmacy',

        // diagnostics subsystem
        'lab_orders'             => 'laboratory',
        'lab_specimens'          => 'laboratory',
        'lab_results'            => 'laboratory',
        'rad_orders'             => 'radiology',
        'rad_worklist'           => 'radiology',
        'rad_reporting'          => 'radiology',
        'blood_bank'             => 'blood_bank',
        'dietary_services'       => 'dietary',

        // billing subsystem
        'billing_view'           => 'billing_finance',
        'billing_charges'        => 'billing_finance',
        'billing_cashier'        => 'billing_finance',
        'billing_claims'         => 'billing_finance',
        'billing_tariffs'        => 'billing_finance',

        // hr subsystem
        'hr_staff_profiles'      => 'core_admin',
        'hr_scheduling'          => 'scheduling',
        'hr_leave_requests'      => 'hr_workforce',
        'hr_payroll'             => 'hr_workforce',
        'hr_cme_training'        => 'hr_workforce',

        // supply_chain subsystem
        'supply_inventory'       => 'procurement_supplies',
        'supply_procurement'     => 'procurement_supplies',
        'supply_cssd'            => 'procurement_supplies',
        'supply_biomedical'      => 'equipment_facilities',

        // analytics subsystem
        'analytics_clinical'     => 'reports_analytics',
        'analytics_financial'    => 'reports_analytics',
        'analytics_compliance'   => 'reports_analytics',

        // doctor_portal subsystem
        'doc_workspace'          => 'core_patients',
        'doc_schedule'           => 'scheduling',
        'doc_critical_inbox'     => ['laboratory', 'radiology'],
        'doc_signoff'            => 'core_patients',
    ];

    /**
     * Get the master capabilities catalog for all 10 subsystems.
     */
    public function getCapabilitiesCatalog(): array
    {
        $path = dirname(__DIR__, 4) . '/config/capabilities.php';
        if (file_exists($path)) {
            return require $path;
        }
        return [];
    }

    /**
     * Determine whether a capability is allowed by the business's enabled modules.
     */
    private function isCapabilityAllowedForBusiness(string $capKey, array $enabledModules): bool
    {
        if (empty($enabledModules) || !isset(self::CAPABILITY_BUSINESS_MODULES[$capKey])) {
            return true;
        }

        $required = self::CAPABILITY_BUSINESS_MODULES[$capKey];
        if (is_array($required)) {
            foreach ($required as $modKey) {
                if (($enabledModules[$modKey] ?? true) === true) {
                    return true;
                }
            }
            return false;
        }

        return ($enabledModules[$required] ?? true) === true;
    }

    /**
     * Get the capabilities catalog filtered strictly to modules enabled for this business.
     * Subsystems with zero enabled capabilities are omitted.
     */
    public function getAllowedCapabilitiesCatalog(): array
    {
        $catalog = $this->getCapabilitiesCatalog();
        $enabledModules = (new BusinessModuleService())->getEnabledModuleKeys();

        $filtered = [];
        foreach ($catalog as $subsystemKey => $subsystem) {
            $allowedCaps = [];
            foreach ($subsystem['capabilities'] ?? [] as $capKey => $capData) {
                if ($this->isCapabilityAllowedForBusiness($capKey, $enabledModules)) {
                    $allowedCaps[$capKey] = $capData;
                }
            }

            if (!empty($allowedCaps)) {
                $subsystem['capabilities'] = $allowedCaps;
                $filtered[$subsystemKey] = $subsystem;
            }
        }

        return $filtered;
    }

    /**
     * Get the permissions matrix across all roles, scoped strictly to modules
     * enabled for this business.
     */
    public function getPermissionsMatrix(): array
    {
        $fullCatalog = $this->getCapabilitiesCatalog();
        $catalog = $this->getAllowedCapabilitiesCatalog();
        $roles = $this->list();

        $allowedCapSet = [];
        foreach ($catalog as $subsystem) {
            foreach (array_keys($subsystem['capabilities'] ?? []) as $capKey) {
                $allowedCapSet[$capKey] = true;
            }
        }

        $totalCapsCount = 0;
        foreach ($fullCatalog as $subsystem) {
            $totalCapsCount += count($subsystem['capabilities'] ?? []);
        }

        $stmt = Database::connection()->query(
            "SELECT role_id, capability 
             FROM role_permissions 
             WHERE is_granted = 1"
        );
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $matrix = [];
        foreach ($roles as $r) {
            $matrix[$r['id']] = [];
        }

        foreach ($rows as $row) {
            $cap = (string) $row['capability'];
            if (!isset($allowedCapSet[$cap])) {
                continue;
            }
            $rId = (int) $row['role_id'];
            if (!isset($matrix[$rId])) {
                $matrix[$rId] = [];
            }
            $matrix[$rId][] = $cap;
        }

        $allowedCapsCount = count($allowedCapSet);

        return [
            'modules' => $catalog,
            'roles' => $roles,
            'matrix' => $matrix,
            'business_scope' => [
                'allowed_capabilities' => $allowedCapsCount,
                'total_capabilities'   => $totalCapsCount,
                'hidden_capabilities'  => max(0, $totalCapsCount - $allowedCapsCount),
                'allowed_subsystems'   => count($catalog),
                'total_subsystems'     => count($fullCatalog),
            ],
        ];
    }

    /**
     * Get granted capabilities for a single role.
     */
    public function getRolePermissions(int $roleId): array
    {
        $role = (new Role())->where('id', $roleId)->first();
        if (!$role || $role['deleted_at'] !== null) {
            return [];
        }

        $stmt = Database::connection()->prepare(
            "SELECT capability FROM role_permissions WHERE role_id = :role_id AND is_granted = 1"
        );
        $stmt->execute(['role_id' => $roleId]);

        return $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
    }

    /**
     * Update granted capabilities for a role.
     * Preserves any existing capabilities belonging to currently disabled
     * business modules so re-enabling a module later restores prior grants.
     */
    public function updateRolePermissions(int $roleId, array $capabilities, int $updatedBy): array
    {
        $role = (new Role())->where('id', $roleId)->first();
        if (!$role || $role['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Role not found.',
            ];
        }

        $fullCatalog = $this->getCapabilitiesCatalog();
        $allowedCatalog = $this->getAllowedCapabilitiesCatalog();

        $capToModule = [];
        foreach ($fullCatalog as $moduleKey => $moduleData) {
            foreach ($moduleData['capabilities'] as $capKey => $capData) {
                $capToModule[$capKey] = $moduleKey;
            }
        }

        $allowedCapSet = [];
        foreach ($allowedCatalog as $moduleData) {
            foreach (array_keys($moduleData['capabilities']) as $capKey) {
                $allowedCapSet[$capKey] = true;
            }
        }

        // Preserve any previously granted capabilities that are currently hidden
        // because their business module is turned off.
        $existingCaps = $this->getRolePermissions($roleId);
        $preservedHiddenCaps = array_values(array_filter(
            $existingCaps,
            static fn(string $cap): bool => !isset($allowedCapSet[$cap])
        ));

        // Only accept submitted capabilities that belong to currently allowed modules
        $submittedAllowedCaps = [];
        foreach ($capabilities as $cap) {
            $cap = trim((string) $cap);
            if ($cap !== '' && isset($allowedCapSet[$cap])) {
                $submittedAllowedCaps[] = $cap;
            }
        }

        $finalCaps = array_values(array_unique(array_merge($preservedHiddenCaps, $submittedAllowedCaps)));

        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            $delStmt = $pdo->prepare("DELETE FROM role_permissions WHERE role_id = :role_id");
            $delStmt->execute(['role_id' => $roleId]);

            if (!empty($finalCaps)) {
                $insertStmt = $pdo->prepare(
                    "INSERT INTO role_permissions (role_id, module, capability, is_granted, created_by, updated_by, created_at, updated_at)
                     VALUES (:role_id, :module, :capability, 1, :created_by, :updated_by, NOW(), NOW())"
                );

                foreach ($finalCaps as $cap) {
                    $module = $capToModule[$cap] ?? 'general';
                    $insertStmt->execute([
                        'role_id' => $roleId,
                        'module' => $module,
                        'capability' => $cap,
                        'created_by' => $updatedBy,
                        'updated_by' => $updatedBy,
                    ]);
                }
            }

            $pdo->commit();
            \App\Core\RoleAccess::clearPermissionsCache();

            return [
                'success' => true,
                'message' => 'Role permissions updated successfully.',
                'data' => [
                    'role_id' => $roleId,
                    'capabilities' => $submittedAllowedCaps,
                ],
            ];
        } catch (Throwable $e) {
            $pdo->rollBack();
            return [
                'success' => false,
                'message' => 'Failed to update role permissions: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Get effective user permissions by user role, intersected with enabled business modules.
     */
    public function getUserPermissions(string $roleName): array
    {
        $allowedCatalog = $this->getAllowedCapabilitiesCatalog();
        $allowedCaps = [];
        foreach ($allowedCatalog as $module) {
            foreach (array_keys($module['capabilities']) as $capKey) {
                $allowedCaps[] = $capKey;
            }
        }
        $allowedCaps = array_values(array_unique($allowedCaps));

        if (strtolower($roleName) === 'admin') {
            return $allowedCaps;
        }

        $roleCaps = \App\Core\RoleAccess::getPermissionsForRole($roleName);
        return array_values(array_intersect($roleCaps, $allowedCaps));
    }
}
