<?php

declare(strict_types=1);

namespace App\Core;

use App\Core\Database;
use App\Core\Session;
use App\Modules\Patients\Models\Patient;
use App\Modules\Providers\Services\ProviderService;
use PDO;

class PhiAccessGuard
{
    /**
     * Authorized clinical roles permitted to access clinical charts
     * (SOAP notes, diagnoses, psychiatric evaluations, encounters).
     */
    public const CLINICAL_ROLES = [
        'admin',
        'doctor',
        'clinician',
        'nurse'
    ];

    /**
     * Roles permitted to access laboratory orders and results.
     */
    public const LAB_ROLES = [
        'admin',
        'doctor',
        'clinician',
        'nurse',
        'lab_technician'
    ];

    /**
     * Non-clinical roles strictly restricted from sensitive clinical charts.
     */
    public const NON_CLINICAL_ROLES = [
        'receptionist',
        'accountant',
        'staff',
        'patient'
    ];

    /**
     * Check if a role has general clinical privileges.
     */
    public static function isClinicalRole(?string $role): bool
    {
        if ($role === null) {
            return false;
        }

        return in_array(strtolower(trim($role)), self::CLINICAL_ROLES, true);
    }

    /**
     * Check if a role is permitted to view/manage laboratory results.
     */
    public static function isLabRole(?string $role): bool
    {
        if ($role === null) {
            return false;
        }

        return in_array(strtolower(trim($role)), self::LAB_ROLES, true);
    }

    /**
     * Check if a role is a doctor/clinician subject to patient assignment boundaries.
     */
    public static function isDoctorRole(?string $role): bool
    {
        if ($role === null) {
            return false;
        }

        return in_array(strtolower(trim($role)), ['doctor', 'clinician'], true);
    }

    /**
     * Assert that the current user has clinical privileges.
     * Throws a 403 JSON error under HIPAA § 164.502(b) if not.
     */
    public static function assertClinicalAccess(?array $user, string $resourceName = 'clinical chart'): void
    {
        $role = $user['role'] ?? null;

        if (!self::isClinicalRole($role)) {
            self::respondForbidden([
                'success' => false,
                'message' => "HIPAA Minimum Necessary Violation (§ 164.502(b)): Access to {$resourceName} is restricted to authorized clinical healthcare providers.",
                'code'    => 'HIPAA_NON_CLINICAL_RESTRICTED',
                'role'    => $role
            ]);
        }
    }

    /**
     * Assert that the current user has lab privileges.
     */
    public static function assertLabAccess(?array $user): void
    {
        $role = $user['role'] ?? null;

        if (!self::isLabRole($role)) {
            self::respondForbidden([
                'success' => false,
                'message' => 'HIPAA Minimum Necessary Violation (§ 164.502(b)): Access to clinical laboratory results is restricted to authorized clinicians and laboratory staff.',
                'code'    => 'HIPAA_LAB_RESTRICTED',
                'role'    => $role
            ]);
        }
    }

    /**
     * Determine if a doctor/clinician is assigned to the specified patient,
     * or has an active Emergency Break-Glass grant.
     */
    public static function isAssignedToPatient(array $user, int $patientId): bool
    {
        $role = $user['role'] ?? '';

        // Non-doctor clinical staff (admin, nurse) have institutional clinical access
        if (!self::isDoctorRole($role)) {
            return true;
        }

        if ($patientId <= 0) {
            return false;
        }

        // 1. Check active Emergency Break-Glass grant in session
        $emergencyGrants = Session::get('break_glass_patients') ?? [];
        if (is_array($emergencyGrants) && in_array($patientId, $emergencyGrants, true)) {
            return true;
        }

        // 2. Resolve doctor's provider ID
        $providerService = new ProviderService();
        $provider = $providerService->findByUserId((int) ($user['id'] ?? 0));
        $providerId = $provider ? (int) $provider['id'] : 0;

        if ($providerId <= 0) {
            return false;
        }

        $db = Database::getInstance()->getConnection();

        // 3. Primary assigned provider check
        $stmt = $db->prepare("SELECT id FROM patients WHERE id = :patient_id AND provider_id = :provider_id AND deleted_at IS NULL LIMIT 1");
        $stmt->execute(['patient_id' => $patientId, 'provider_id' => $providerId]);
        if ($stmt->fetch()) {
            return true;
        }

        // 4. Scheduled appointment provider check
        $stmt = $db->prepare("SELECT id FROM appointments WHERE patient_id = :patient_id AND provider_id = :provider_id AND deleted_at IS NULL LIMIT 1");
        $stmt->execute(['patient_id' => $patientId, 'provider_id' => $providerId]);
        if ($stmt->fetch()) {
            return true;
        }

        // 5. Encounter provider check
        $stmt = $db->prepare("SELECT id FROM encounters WHERE patient_id = :patient_id AND encounter_provider_id = :provider_id AND deleted_at IS NULL LIMIT 1");
        $stmt->execute(['patient_id' => $patientId, 'provider_id' => $providerId]);
        if ($stmt->fetch()) {
            return true;
        }

        return false;
    }

    /**
     * Enforce patient assignment and minimum necessary boundaries for patient access.
     */
    public static function assertPatientAccess(array $user, int $patientId, bool $isClinical = true): void
    {
        if ($patientId <= 0) {
            self::respondNotFound('Patient is required.');
        }

        $patient = (new Patient())->where('id', $patientId)->first();
        if (!$patient || $patient['deleted_at'] !== null) {
            self::respondNotFound('Patient not found.');
        }

        // Non-clinical staff cannot access clinical resources
        if ($isClinical && !self::isClinicalRole($user['role'] ?? null)) {
            self::assertClinicalAccess($user);
        }

        // Doctors must be assigned or invoke break-glass
        if (self::isDoctorRole($user['role'] ?? null) && !self::isAssignedToPatient($user, $patientId)) {
            self::respondForbidden([
                'success'              => false,
                'message'              => 'HIPAA Minimum Necessary Violation (§ 164.502(b)): You are not the assigned provider for this patient. To access this clinical record for emergency care, you must invoke the Emergency Break-Glass protocol with clinical justification.',
                'code'                 => 'HIPAA_BREAK_GLASS_REQUIRED',
                'break_glass_required' => true,
                'patient_id'           => $patientId
            ]);
        }
    }

    /**
     * Enforce sensitivity access on encounters/notes (e.g. psychiatric evaluations).
     */
    public static function assertSensitivityAccess(array $user, ?string $sensitivity, int $patientId): void
    {
        $sensLower = strtolower(trim((string) $sensitivity));

        if ($sensLower === 'sensitive' || $sensLower === 'very sensitive') {
            // Non-clinical staff are strictly prohibited from sensitive charts
            if (!self::isClinicalRole($user['role'] ?? null)) {
                self::respondForbidden([
                    'success' => false,
                    'message' => 'HIPAA Minimum Necessary Violation (§ 164.502(b)): Sensitive psychiatric and clinical evaluations are strictly restricted from non-clinical personnel.',
                    'code'    => 'HIPAA_SENSITIVE_CHART_RESTRICTED'
                ]);
            }

            // Clinicians must be assigned or have emergency break-glass
            if (self::isDoctorRole($user['role'] ?? null) && !self::isAssignedToPatient($user, $patientId)) {
                self::respondForbidden([
                    'success'              => false,
                    'message'              => 'HIPAA Minimum Necessary Violation (§ 164.502(b)): Elevated clinical sensitivity record requires provider assignment or emergency break-glass authorization.',
                    'code'                 => 'HIPAA_BREAK_GLASS_REQUIRED',
                    'break_glass_required' => true,
                    'patient_id'           => $patientId
                ]);
            }
        }
    }

    /**
     * Filter patient dashboard summary under HIPAA § 164.502(b) Minimum Necessary Rule.
     */
    public static function filterDashboardSummary(array $user, int $patientId, array $summary): array
    {
        $role = $user['role'] ?? '';

        if (!self::isClinicalRole($role)) {
            $clinicalKeys = [
                'allergies',
                'problems',
                'health_concerns',
                'medications',
                'immunizations',
                'prescriptions',
                'encounters',
                'vitals_history',
                'soap_notes',
                'diagnoses',
                'procedure_results',
                'clinical_notes'
            ];

            foreach ($clinicalKeys as $key) {
                if (isset($summary[$key])) {
                    $summary[$key] = [];
                }
            }

            $summary['_hipaa_minimum_necessary'] = [
                'applied'           => true,
                'role'              => $role,
                'clinical_redacted' => true,
                'notice'            => 'Sensitive clinical chart records (SOAP notes, diagnoses, medications, and vitals) are restricted for non-clinical personnel under HIPAA § 164.502(b).'
            ];
        }

        return $summary;
    }

    private static function respondForbidden(array $payload): void
    {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode($payload);
        exit;
    }

    private static function respondNotFound(string $message): void
    {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'message' => $message
        ]);
        exit;
    }
}
