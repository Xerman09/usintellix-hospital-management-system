<?php

namespace App\Modules\MyChart\Services;

use App\Core\RoleAccess;
use App\Modules\Patients\Services\PatientAccessService;

/**
 * The front door for every My Chart endpoint.
 *
 * Three questions each portal request has to answer, in one place:
 *   1. which patient may this user act as?      patientFor()
 *   2. is this part of My Chart switched on?    can()
 *   3. did we record that they looked?          PortalAudit (via enter())
 *
 * The "self or proxy" answer is not re-implemented here -- it delegates to
 * PatientAccessService, which is already the choke point the rest of the app
 * uses, and which re-validates the proxy grant on every call so a revoked grant
 * stops working on the next request. This class exists so a new My Chart
 * controller is one line away from doing all three correctly.
 */
class PortalGuard
{
    public const CAP_RESULTS_VIEW = 'mychart_results_view';
    public const CAP_BILLING_PAY = 'mychart_billing_pay';
    public const CAP_CHECKIN = 'mychart_checkin';
    public const CAP_PROXY_REQUEST = 'mychart_proxy_request';
    public const CAP_RECORDS_SHARE = 'mychart_records_share';

    /**
     * The patient this user may act as: their own record, or the one they switched
     * to with an active proxy grant. Null when the user is not a portal user or
     * has no patient record at all.
     */
    public static function patientFor(array $user): ?int
    {
        if (($user['role'] ?? '') !== 'patient') {
            return null;
        }

        return (new PatientAccessService())->resolveEffectivePatientId($user);
    }

    /**
     * Is this capability granted to the caller's role? Admins hold everything
     * (RoleAccess::hasPermission), which keeps support able to see what a patient
     * would see. Dotted spellings ("mychart.results.view") are accepted and
     * normalised, since the capability matrix stores snake_case.
     */
    public static function can(array $user, string $capability): bool
    {
        $role = (string) ($user['role'] ?? '');

        if ($role === '') {
            return false;
        }

        return RoleAccess::hasPermission($role, str_replace('.', '_', $capability));
    }

    /**
     * Everything a My Chart page needs before it does any work: resolve the
     * patient, check the capability, write the audit row. Returns the patient id,
     * or null when the caller must be refused -- in which case the refusal has
     * already been logged and the caller only has to answer.
     *
     * @param string      $event      the page, in plain words: "Test Results Viewed"
     * @param string|null $capability null for a page that needs no capability
     */
    public static function enter(array $user, string $event, ?string $capability = null): ?int
    {
        $patientId = self::patientFor($user);

        if ($patientId === null) {
            PortalAudit::denied($user, null, $event, 'No patient record is linked to this portal account.');
            return null;
        }

        if ($capability !== null && !self::can($user, $capability)) {
            PortalAudit::denied($user, $patientId, $event, "This part of My Chart is switched off for this account ({$capability}).");
            return null;
        }

        PortalAudit::view($user, $patientId, $event);

        return $patientId;
    }
}
