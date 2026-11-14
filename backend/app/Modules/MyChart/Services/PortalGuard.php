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
    public const CAP_SELF_TRACKING = 'mychart_self_tracking';
    public const CAP_APPOINTMENT_MANAGE = 'mychart_appointment_manage';

    // Backfilled in Phase M9.5. These features shipped ungated, which meant a
    // hospital could not switch them off per deployment while everything else
    // could. Granted to the patient role by seed 068 -- a deployment that has not
    // run that seed denies them, because hasPermission() treats a missing row as
    // not granted.
    public const CAP_VISITS_VIEW = 'mychart_visits_view';
    public const CAP_BILLING_VIEW = 'mychart_billing_view';
    public const CAP_ACCOUNT_VIEW = 'mychart_account_view';
    public const CAP_NOTIFICATIONS = 'mychart_notifications';
    public const CAP_DIAGNOSIS_GUIDES = 'mychart_diagnosis_guides';
    public const CAP_APPOINTMENTS_VIEW = 'mychart_appointments_view';
    public const CAP_UPLOADS = 'mychart_uploads';
    public const CAP_INSURANCE = 'mychart_insurance';
    public const CAP_QUESTIONNAIRES = 'mychart_questionnaires';

    /**
     * Two patient actions are deliberately left ungated, and should stay that way:
     *
     *   - Revoking someone's proxy access to your record. A patient must always be
     *     able to cut off access to their own chart; a capability switch could
     *     otherwise trap them with a proxy they no longer want.
     *   - Confirming attendance at an appointment. It changes nothing about the
     *     booking, and it is most useful to the desk precisely when rescheduling
     *     and cancelling have closed.
     */

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
