<?php

namespace App\Modules\Patients\Services;

use App\Core\Session;
use App\Modules\Patients\Models\Patient;
use App\Modules\RelatedPersons\Models\RelatedPerson;

/**
 * Resolves which patient a logged-in "patient" role user is currently
 * acting as -- either their own chart, or (after switching) a chart
 * they hold an active proxy grant for via related_persons.proxy_user_id.
 *
 * This is the single choke point for "self vs. proxy" resolution. Every
 * patient-locked controller across the app should resolve through here
 * instead of looking up `patients.user_id` directly, so a proxy grant
 * takes effect everywhere at once and a revoked grant is shut off
 * everywhere at once.
 */
class PatientAccessService
{
    /**
     * The patient record the logged-in user is currently acting as. The
     * switch is re-validated on every call (not just trusted from
     * session state) so a grant revoked mid-session stops working on
     * the very next request.
     */
    public function resolveEffectivePatient(array $user): ?array
    {
        $own = $this->ownPatient((int) $user['id']);
        $actingId = Session::get('acting_patient_id');

        if ($actingId === null) {
            return $own;
        }

        if ($own && (int) $own['id'] === (int) $actingId) {
            return $own;
        }

        if (!$this->hasActiveGrant((int) $user['id'], (int) $actingId)) {
            Session::forget('acting_patient_id');
            return $own;
        }

        return (new Patient())->where('id', (int) $actingId)->first();
    }

    public function resolveEffectivePatientId(array $user): ?int
    {
        $patient = $this->resolveEffectivePatient($user);

        return $patient ? (int) $patient['id'] : null;
    }

    /**
     * Every patient this user may act as: their own record (if any),
     * plus every patient with an active, non-revoked proxy grant to
     * this user. Flags which one is currently active in session.
     */
    public function listAccessiblePatients(int $userId): array
    {
        $actingId = Session::get('acting_patient_id');
        $results = [];

        $own = $this->ownPatient($userId);

        if ($own) {
            $results[] = [
                'patient_id'   => (int) $own['id'],
                'first_name'   => $own['first_name'],
                'last_name'    => $own['last_name'],
                'relationship' => 'Self',
                'is_active'    => $actingId === null || (int) $actingId === (int) $own['id']
            ];
        }

        $grants = (new RelatedPerson())
            ->where('proxy_user_id', $userId)
            ->where('proxy_status', 'active')
            ->get();

        foreach ($grants as $grant) {
            if ($grant['deleted_at'] !== null) {
                continue;
            }

            $patient = (new Patient())->where('id', (int) $grant['patient_id'])->first();

            if (!$patient || $patient['deleted_at'] !== null) {
                continue;
            }

            $results[] = [
                'patient_id'   => (int) $patient['id'],
                'first_name'   => $patient['first_name'],
                'last_name'    => $patient['last_name'],
                'relationship' => $grant['relationship'] ?: 'Authorized representative',
                'is_active'    => $actingId !== null && (int) $actingId === (int) $patient['id']
            ];
        }

        return $results;
    }

    /**
     * Switch the logged-in user's acting patient. Returns the patient
     * row on success, or null if the requested patient is neither the
     * caller's own record nor an active grant.
     */
    public function switchTo(array $user, int $patientId): ?array
    {
        $own = $this->ownPatient((int) $user['id']);

        if ($own && (int) $own['id'] === $patientId) {
            Session::put('acting_patient_id', $patientId);
            return $own;
        }

        if (!$this->hasActiveGrant((int) $user['id'], $patientId)) {
            return null;
        }

        $patient = (new Patient())->where('id', $patientId)->first();

        if (!$patient || $patient['deleted_at'] !== null) {
            return null;
        }

        Session::put('acting_patient_id', $patientId);

        return $patient;
    }

    private function ownPatient(int $userId): ?array
    {
        return (new Patient())->where('user_id', $userId)->first();
    }

    private function hasActiveGrant(int $userId, int $patientId): bool
    {
        $grant = (new RelatedPerson())
            ->where('proxy_user_id', $userId)
            ->where('patient_id', $patientId)
            ->where('proxy_status', 'active')
            ->first();

        return $grant !== null && $grant['deleted_at'] === null;
    }
}
