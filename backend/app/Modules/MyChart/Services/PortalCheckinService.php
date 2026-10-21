<?php

namespace App\Modules\MyChart\Services;

use App\Core\Database;
use PDO;
use Throwable;

/**
 * e-Check-in (My Chart Phase 5): the paperwork done at home in the two days before
 * an appointment, so arriving is one tap at the desk.
 *
 * Five steps, each recorded with the time it was done: confirm the contact details,
 * confirm the insurance, sign the consents, answer the visit questionnaire, and
 * (optionally) show an ID. None of it is clinical and none of it verifies anyone --
 * an uploaded ID only moves the patient to "Pending Verification"; a member of staff
 * still does the verifying under the columns migration 298 added.
 *
 * Editing an address never overwrites history: the old contact row is closed off in
 * patient_contact_histories with change_reason 'Patient e-check-in' before the new
 * details are written.
 */
class PortalCheckinService
{
    /** How long before the appointment e-check-in opens. */
    public const OPENS_HOURS = 48;

    /** Roles that work the desk's e-check-in list. */
    public const DESK_ROLES = ['admin', 'receptionist', 'nurse', 'charge_nurse'];

    /** Why a contact change was made, written into the history. */
    public const CHANGE_REASON = 'Patient e-check-in';

    /** The steps that must be done before a check-in counts as complete. */
    private const REQUIRED = ['demographics_confirmed_at', 'insurance_confirmed_at', 'consents_signed_at', 'questionnaire_done_at'];

    // ------------------------------------------------------------------
    // What is open
    // ------------------------------------------------------------------

    /** Appointments the patient may check in for now, with how far they have got. */
    public static function open(int $patientId): array
    {
        $db = Database::connection();
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();

        $stmt = $db->prepare(
            "SELECT a.id, a.appointment_date, a.appointment_time, a.is_all_day, a.reason, a.status,
                    f.name AS facility, vc.name AS visit_category, d.name AS department,
                    NULLIF(TRIM(CONCAT(COALESCE(pe.first_name, ''), ' ', COALESCE(pe.last_name, ''))), '') AS doctor,
                    c.id AS checkin_id, c.status AS checkin_status, c.demographics_confirmed_at, c.insurance_confirmed_at,
                    c.consents_signed_at, c.questionnaire_done_at, c.id_document_at, c.copay_paid_at, c.completed_at
             FROM appointments a
             LEFT JOIN facilities f ON f.id = a.facility_id
             LEFT JOIN visit_categories vc ON vc.id = a.visit_category_id
             LEFT JOIN providers pr ON pr.id = a.provider_id
             LEFT JOIN employees pe ON pe.id = pr.employee_id
             LEFT JOIN departments d ON d.id = pe.department_id
             LEFT JOIN portal_checkins c ON c.appointment_id = a.id
             WHERE a.patient_id = :p AND a.deleted_at IS NULL AND a.is_provider_block = 0 AND a.status = 'scheduled'
               AND TIMESTAMP(a.appointment_date, COALESCE(a.appointment_time, '00:00:00')) BETWEEN NOW() AND NOW() + INTERVAL :hrs HOUR
             ORDER BY a.appointment_date, a.appointment_time"
        );
        $stmt->bindValue('p', $patientId, PDO::PARAM_INT);
        $stmt->bindValue('hrs', self::OPENS_HOURS, PDO::PARAM_INT);
        $stmt->execute();

        return [
            'items' => array_map(static fn(array $r) => self::shapeAppointment($r), $stmt->fetchAll(PDO::FETCH_ASSOC)),
            'opens_hours' => self::OPENS_HOURS,
            'server_time' => $now,
        ];
    }

    private static function shapeAppointment(array $r): array
    {
        $steps = [
            'demographics' => $r['demographics_confirmed_at'],
            'insurance' => $r['insurance_confirmed_at'],
            'consents' => $r['consents_signed_at'],
            'questionnaire' => $r['questionnaire_done_at'],
            'id_document' => $r['id_document_at'],
            'copay' => $r['copay_paid_at'],
        ];

        $doneRequired = count(array_filter(self::REQUIRED, static fn($k) => !empty($r[$k])));

        return [
            'appointment_id' => (int) $r['id'],
            'when' => trim($r['appointment_date'] . ' ' . ((int) $r['is_all_day'] === 1 ? '' : (string) $r['appointment_time'])),
            'all_day' => (int) $r['is_all_day'] === 1,
            'title' => $r['visit_category'] ?: 'Appointment',
            'facility' => $r['facility'],
            'department' => $r['department'],
            'doctor' => $r['doctor'],
            'reason' => $r['reason'],
            'checkin_status' => $r['checkin_status'] ?? null,
            'completed_at' => $r['completed_at'],
            'steps' => $steps,
            'done' => $doneRequired,
            'of' => count(self::REQUIRED),
        ];
    }

    /** The appointment row, if this patient may check in for it now. */
    private static function appointmentFor(PDO $db, int $patientId, int $appointmentId): ?array
    {
        $stmt = $db->prepare(
            "SELECT a.*, d.name AS department
             FROM appointments a
             LEFT JOIN providers pr ON pr.id = a.provider_id
             LEFT JOIN employees pe ON pe.id = pr.employee_id
             LEFT JOIN departments d ON d.id = pe.department_id
             WHERE a.id = :id AND a.patient_id = :p AND a.deleted_at IS NULL AND a.is_provider_block = 0"
        );
        $stmt->execute(['id' => $appointmentId, 'p' => $patientId]);
        $a = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$a || $a['status'] !== 'scheduled') {
            return null;
        }

        $inWindow = $db->prepare(
            "SELECT TIMESTAMP(:d, COALESCE(:t, '00:00:00')) BETWEEN NOW() AND NOW() + INTERVAL " . self::OPENS_HOURS . " HOUR"
        );
        $inWindow->execute(['d' => $a['appointment_date'], 't' => $a['appointment_time']]);

        return (int) $inWindow->fetchColumn() === 1 ? $a : null;
    }

    // ------------------------------------------------------------------
    // Starting
    // ------------------------------------------------------------------

    /**
     * Everything the patient needs to check in for one appointment: what is on file
     * now, which consents are outstanding, and which questionnaire applies.
     */
    public static function start(int $patientId, int $appointmentId, int $userId): array
    {
        $db = Database::connection();
        $appointment = self::appointmentFor($db, $patientId, $appointmentId);

        if (!$appointment) {
            return ['success' => false, 'message' => 'That appointment is not open for check-in.', 'not_found' => true];
        }

        $checkin = self::row($db, $appointmentId, $patientId, $userId);

        return ['success' => true, 'message' => 'Ready.', 'data' => [
            'appointment' => [
                'id' => (int) $appointment['id'],
                'when' => trim($appointment['appointment_date'] . ' ' . (string) $appointment['appointment_time']),
                'reason' => $appointment['reason'],
                'department' => $appointment['department'],
            ],
            'checkin' => self::stepsOf($checkin),
            'contact' => self::contactOf($db, $patientId),
            'insurance' => self::insuranceOf($db, $patientId),
            'consents' => self::consentState($db, $patientId),
            'questionnaire' => self::questionnaireFor($db, $appointment['department'] ?? null),
            'identity_status' => (string) $db->query("SELECT identity_status FROM patients WHERE id = " . (int) $patientId)->fetchColumn(),
        ]];
    }

    private static function row(PDO $db, int $appointmentId, int $patientId, int $userId): array
    {
        $stmt = $db->prepare("SELECT * FROM portal_checkins WHERE appointment_id = :a");
        $stmt->execute(['a' => $appointmentId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            return $row;
        }

        $db->prepare(
            "INSERT INTO portal_checkins (appointment_id, patient_id, status, created_at, created_by)
             VALUES (:a, :p, 'started', NOW(), :u)"
        )->execute(['a' => $appointmentId, 'p' => $patientId, 'u' => $userId]);

        $stmt->execute(['a' => $appointmentId]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
    }

    private static function stepsOf(array $row): array
    {
        return [
            'id' => isset($row['id']) ? (int) $row['id'] : null,
            'status' => $row['status'] ?? 'started',
            'completed_at' => $row['completed_at'] ?? null,
            'steps' => [
                'demographics' => $row['demographics_confirmed_at'] ?? null,
                'insurance' => $row['insurance_confirmed_at'] ?? null,
                'consents' => $row['consents_signed_at'] ?? null,
                'questionnaire' => $row['questionnaire_done_at'] ?? null,
                'id_document' => $row['id_document_at'] ?? null,
                'copay' => $row['copay_paid_at'] ?? null,
            ],
        ];
    }

    private static function contactOf(PDO $db, int $patientId): array
    {
        $stmt = $db->prepare(
            "SELECT address_line, city, province, zip_code, home_phone, mobile_phone, work_phone, email
             FROM patient_contacts WHERE patient_id = :p AND deleted_at IS NULL ORDER BY id DESC LIMIT 1"
        );
        $stmt->execute(['p' => $patientId]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: [
            'address_line' => null, 'city' => null, 'province' => null, 'zip_code' => null,
            'home_phone' => null, 'mobile_phone' => null, 'work_phone' => null, 'email' => null,
        ];
    }

    private static function insuranceOf(PDO $db, int $patientId): array
    {
        $stmt = $db->prepare(
            "SELECT pi.id, pi.insurance_type, pi.policy_number, pi.group_number, pi.subscriber_name,
                    pi.effective_date, pi.term_date, i.name AS insurer
             FROM patient_insurances pi
             LEFT JOIN insurances i ON i.id = pi.insurance_id
             WHERE pi.patient_id = :p AND pi.deleted_at IS NULL
             ORDER BY pi.id DESC LIMIT 5"
        );
        $stmt->execute(['p' => $patientId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /** Whether the Notice of Privacy Practices has been acknowledged, and when. */
    private static function consentState(PDO $db, int $patientId): array
    {
        $stmt = $db->prepare(
            "SELECT acknowledged_at, npp_version FROM npp_consent_log
             WHERE patient_id = :p ORDER BY id DESC LIMIT 1"
        );
        $stmt->execute(['p' => $patientId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

        return [
            'npp_acknowledged_at' => $row['acknowledged_at'] ?? null,
            'npp_version' => $row['npp_version'] ?? null,
        ];
    }

    /** The questionnaire for this department, or the general one. */
    public static function questionnaireFor(PDO $db, ?string $department): ?array
    {
        $stmt = $db->prepare(
            "SELECT id, code, name, intro, questions, specialty
             FROM portal_questionnaires
             WHERE is_active = 1 AND (:dept IS NOT NULL AND specialty = :dept2)
             ORDER BY id LIMIT 1"
        );
        $stmt->execute(['dept' => $department, 'dept2' => $department]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            $row = $db->query(
                "SELECT id, code, name, intro, questions, specialty FROM portal_questionnaires
                 WHERE is_active = 1 AND specialty IS NULL ORDER BY id LIMIT 1"
            )->fetch(PDO::FETCH_ASSOC);
        }

        if (!$row) {
            return null;
        }

        return [
            'id' => (int) $row['id'],
            'code' => $row['code'],
            'name' => $row['name'],
            'intro' => $row['intro'],
            'specialty' => $row['specialty'],
            'questions' => json_decode((string) $row['questions'], true) ?: [],
        ];
    }

    // ------------------------------------------------------------------
    // The steps
    // ------------------------------------------------------------------

    /**
     * Confirm (and possibly correct) the contact details. The previous details are
     * closed off in patient_contact_histories first, so the address history stays whole.
     */
    public static function saveDemographics(int $patientId, int $appointmentId, array $data, int $userId): array
    {
        $db = Database::connection();

        if (!self::appointmentFor($db, $patientId, $appointmentId)) {
            return ['success' => false, 'message' => 'That appointment is not open for check-in.', 'not_found' => true];
        }

        $fields = ['address_line', 'city', 'province', 'zip_code', 'home_phone', 'mobile_phone', 'work_phone', 'email'];
        $new = [];
        foreach ($fields as $f) {
            $v = trim((string) ($data[$f] ?? ''));
            $new[$f] = $v === '' ? null : mb_substr($v, 0, 150);
        }

        if ($new['email'] !== null && !filter_var($new['email'], FILTER_VALIDATE_EMAIL)) {
            return ['success' => false, 'message' => 'That email address does not look right.', 'errors' => ['email' => 'Check the email address.']];
        }

        if ($new['mobile_phone'] === null && $new['home_phone'] === null) {
            return ['success' => false, 'message' => 'Please leave at least one telephone number.',
                'errors' => ['mobile_phone' => 'A mobile or home number is needed.']];
        }

        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT portal_checkin_demo');

        try {
            $current = self::contactOf($db, $patientId);
            $changed = false;
            foreach ($fields as $f) {
                if ((string) ($current[$f] ?? '') !== (string) ($new[$f] ?? '')) {
                    $changed = true;
                    break;
                }
            }

            if ($changed) {
                // Close the old details off in the history before replacing them.
                $db->prepare(
                    "UPDATE patient_contact_histories SET is_current = 0, effective_to = CURDATE(), updated_at = NOW(), updated_by = :u
                     WHERE patient_id = :p AND is_current = 1"
                )->execute(['p' => $patientId, 'u' => $userId]);

                $db->prepare(
                    "INSERT INTO patient_contact_histories
                        (patient_id, address_type, address_line, city, province, postal_code, country, home_phone, mobile_phone,
                         work_phone, email, effective_from, is_current, change_reason, created_at, created_by)
                     VALUES (:p, 'Home', :addr, :city, :prov, :zip, NULL, :home, :mobile, :work, :email, CURDATE(), 1, :why, NOW(), :u)"
                )->execute([
                    'p' => $patientId, 'addr' => $new['address_line'], 'city' => $new['city'], 'prov' => $new['province'],
                    'zip' => $new['zip_code'], 'home' => $new['home_phone'], 'mobile' => $new['mobile_phone'],
                    'work' => $new['work_phone'], 'email' => $new['email'], 'why' => self::CHANGE_REASON, 'u' => $userId,
                ]);

                $exists = $db->prepare("SELECT id FROM patient_contacts WHERE patient_id = :p AND deleted_at IS NULL ORDER BY id DESC LIMIT 1");
                $exists->execute(['p' => $patientId]);
                $contactId = (int) $exists->fetchColumn();

                if ($contactId) {
                    $db->prepare(
                        "UPDATE patient_contacts SET address_line = :addr, city = :city, province = :prov, zip_code = :zip,
                            home_phone = :home, mobile_phone = :mobile, work_phone = :work, email = :email,
                            updated_at = NOW(), updated_by = :u
                         WHERE id = :id"
                    )->execute([
                        'addr' => $new['address_line'], 'city' => $new['city'], 'prov' => $new['province'], 'zip' => $new['zip_code'],
                        'home' => $new['home_phone'], 'mobile' => $new['mobile_phone'], 'work' => $new['work_phone'],
                        'email' => $new['email'], 'u' => $userId, 'id' => $contactId,
                    ]);
                } else {
                    $db->prepare(
                        "INSERT INTO patient_contacts (patient_id, address_line, city, province, zip_code, home_phone, mobile_phone,
                            work_phone, email, created_at, created_by)
                         VALUES (:p, :addr, :city, :prov, :zip, :home, :mobile, :work, :email, NOW(), :u)"
                    )->execute([
                        'p' => $patientId, 'addr' => $new['address_line'], 'city' => $new['city'], 'prov' => $new['province'],
                        'zip' => $new['zip_code'], 'home' => $new['home_phone'], 'mobile' => $new['mobile_phone'],
                        'work' => $new['work_phone'], 'email' => $new['email'], 'u' => $userId,
                    ]);
                }
            }

            self::markStep($db, $appointmentId, $patientId, 'demographics_confirmed_at', $userId);
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT portal_checkin_demo');
        } catch (Throwable $e) {
            $owns ? ($db->inTransaction() && $db->rollBack()) : $db->exec('ROLLBACK TO SAVEPOINT portal_checkin_demo');
            error_log('e-check-in demographics failed: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Your details could not be saved.'];
        }

        return ['success' => true, 'message' => $changed ? 'Thank you, your details are updated.' : 'Thank you, your details are confirmed.',
            'data' => ['changed' => $changed]];
    }

    /** Confirm the insurance on file, or say there is none. */
    public static function saveInsurance(int $patientId, int $appointmentId, array $data, int $userId): array
    {
        $db = Database::connection();

        if (!self::appointmentFor($db, $patientId, $appointmentId)) {
            return ['success' => false, 'message' => 'That appointment is not open for check-in.', 'not_found' => true];
        }

        $note = trim((string) ($data['note'] ?? ''));
        $hasChange = !empty($data['has_changes']);

        if ($hasChange && $note === '') {
            return ['success' => false, 'message' => 'Tell us what changed about your insurance.',
                'errors' => ['note' => 'Please describe the change.']];
        }

        // A patient never edits the insurance record itself -- the desk does that with the
        // card in hand. What they say is kept on the check-in for reception to act on.
        self::markStep($db, $appointmentId, $patientId, 'insurance_confirmed_at', $userId);
        $db->prepare("UPDATE portal_checkins SET insurance_changed = :c, insurance_note = :n WHERE appointment_id = :a")
            ->execute(['c' => $hasChange ? 1 : 0, 'n' => $hasChange ? mb_substr($note, 0, 255) : null, 'a' => $appointmentId]);

        return ['success' => true, 'message' => $hasChange
            ? 'Thank you. Please bring your card so the desk can update it.'
            : 'Thank you, your insurance is confirmed.'];
    }

    /** Sign the Notice of Privacy Practices and the visit consent. */
    public static function signConsents(int $patientId, int $appointmentId, array $data, int $userId): array
    {
        $db = Database::connection();

        if (!self::appointmentFor($db, $patientId, $appointmentId)) {
            return ['success' => false, 'message' => 'That appointment is not open for check-in.', 'not_found' => true];
        }

        $name = trim((string) ($data['signature'] ?? ''));

        if ($name === '') {
            return ['success' => false, 'message' => 'Type your full name to sign.', 'errors' => ['signature' => 'Your name is needed to sign.']];
        }

        if (empty($data['npp']) || empty($data['treatment'])) {
            return ['success' => false, 'message' => 'Both consents need to be agreed before your visit.',
                'errors' => ['npp' => 'Please tick both boxes.']];
        }

        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT portal_checkin_consent');

        try {
            $db->prepare(
                "INSERT INTO npp_consent_log (user_id, patient_id, acknowledged_at, acknowledged_ip, signature_type, signature_data,
                    npp_version, captured_by, created_at)
                 VALUES (:u, :p, NOW(), :ip, 'typed', :sig, :ver, :u2, NOW())"
            )->execute([
                'u' => $userId, 'p' => $patientId,
                'ip' => mb_substr((string) ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'), 0, 45),
                'sig' => mb_substr($name, 0, 150), 'ver' => 'e-check-in', 'u2' => $userId,
            ]);

            self::markStep($db, $appointmentId, $patientId, 'consents_signed_at', $userId);
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT portal_checkin_consent');
        } catch (Throwable $e) {
            $owns ? ($db->inTransaction() && $db->rollBack()) : $db->exec('ROLLBACK TO SAVEPOINT portal_checkin_consent');
            error_log('e-check-in consent failed: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Your signature could not be saved.'];
        }

        return ['success' => true, 'message' => 'Thank you, your consents are signed.'];
    }

    /** Answer the visit questionnaire. */
    public static function saveQuestionnaire(int $patientId, int $appointmentId, array $data, int $userId): array
    {
        $db = Database::connection();
        $appointment = self::appointmentFor($db, $patientId, $appointmentId);

        if (!$appointment) {
            return ['success' => false, 'message' => 'That appointment is not open for check-in.', 'not_found' => true];
        }

        $questionnaire = self::questionnaireFor($db, $appointment['department'] ?? null);

        if (!$questionnaire) {
            return ['success' => false, 'message' => 'There is no questionnaire to answer.'];
        }

        $answers = is_array($data['answers'] ?? null) ? $data['answers'] : [];
        $missing = [];

        foreach ($questionnaire['questions'] as $q) {
            if (!empty($q['required'])) {
                $v = $answers[$q['key']] ?? '';
                if ((is_array($v) && !$v) || (!is_array($v) && trim((string) $v) === '')) {
                    $missing["answers.{$q['key']}"] = 'This one is needed.';
                }
            }
        }

        if ($missing) {
            return ['success' => false, 'message' => 'Please answer the questions marked as needed.', 'errors' => $missing];
        }

        // Keep only the questions this questionnaire actually asks.
        $keys = array_column($questionnaire['questions'], 'key');
        $clean = array_intersect_key($answers, array_flip($keys));

        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT portal_checkin_quest');

        try {
            $db->prepare(
                "INSERT INTO portal_questionnaire_responses (patient_id, appointment_id, form_definition_id, questionnaire_id,
                    answers, submitted_at, created_by)
                 VALUES (:p, :a, (SELECT form_definition_id FROM portal_questionnaires WHERE id = :q), :q2,
                    :answers, NOW(), :u)"
            )->execute([
                'p' => $patientId, 'a' => $appointmentId, 'q' => $questionnaire['id'], 'q2' => $questionnaire['id'],
                'answers' => json_encode($clean, JSON_UNESCAPED_UNICODE), 'u' => $userId,
            ]);

            self::markStep($db, $appointmentId, $patientId, 'questionnaire_done_at', $userId);
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT portal_checkin_quest');
        } catch (Throwable $e) {
            $owns ? ($db->inTransaction() && $db->rollBack()) : $db->exec('ROLLBACK TO SAVEPOINT portal_checkin_quest');
            error_log('e-check-in questionnaire failed: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Your answers could not be saved.'];
        }

        return ['success' => true, 'message' => 'Thank you, your answers are saved.'];
    }

    /**
     * The patient has uploaded a photo of an ID (through the documents endpoint). This
     * records the step and marks the record as waiting for staff to check the ID --
     * it never marks anyone verified.
     */
    public static function recordIdDocument(int $patientId, int $appointmentId, int $userId): array
    {
        $db = Database::connection();

        if (!self::appointmentFor($db, $patientId, $appointmentId)) {
            return ['success' => false, 'message' => 'That appointment is not open for check-in.', 'not_found' => true];
        }

        $has = $db->prepare(
            "SELECT COUNT(*) FROM patient_documents
             WHERE patient_id = :p AND deleted_at IS NULL AND category = 'Identification'
               AND created_at >= NOW() - INTERVAL 1 DAY"
        );
        $has->execute(['p' => $patientId]);

        if ((int) $has->fetchColumn() === 0) {
            return ['success' => false, 'message' => 'Upload a photo of your ID first.'];
        }

        // Only ever "pending": verifying an ID stays a staff act.
        $db->prepare(
            "UPDATE patients SET identity_status = 'Pending Verification', updated_at = NOW()
             WHERE id = :p AND identity_status = 'Unverified'"
        )->execute(['p' => $patientId]);

        self::markStep($db, $appointmentId, $patientId, 'id_document_at', $userId);

        return ['success' => true, 'message' => 'Thank you. The desk will check your ID when you arrive.'];
    }

    /** A copay paid through Phase 4 is recorded against the check-in. */
    public static function recordCopay(int $patientId, int $appointmentId, int $attemptId, int $userId): array
    {
        $db = Database::connection();

        if (!self::appointmentFor($db, $patientId, $appointmentId)) {
            return ['success' => false, 'message' => 'That appointment is not open for check-in.', 'not_found' => true];
        }

        self::markStep($db, $appointmentId, $patientId, 'copay_paid_at', $userId);
        $db->prepare("UPDATE portal_checkins SET copay_attempt_id = :a WHERE appointment_id = :ap")
            ->execute(['a' => $attemptId, 'ap' => $appointmentId]);

        return ['success' => true, 'message' => 'Thank you, your payment is recorded.'];
    }

    /** Finish: only once the four required steps are done. */
    public static function complete(int $patientId, int $appointmentId, int $userId): array
    {
        $db = Database::connection();

        if (!self::appointmentFor($db, $patientId, $appointmentId)) {
            return ['success' => false, 'message' => 'That appointment is not open for check-in.', 'not_found' => true];
        }

        $row = self::row($db, $appointmentId, $patientId, $userId);
        $missing = array_values(array_filter(self::REQUIRED, static fn($k) => empty($row[$k])));

        if ($missing) {
            return ['success' => false, 'message' => 'There are still steps to finish.',
                'errors' => ['steps' => implode(', ', array_map(static fn($k) => str_replace('_confirmed_at', '', str_replace('_at', '', $k)), $missing))]];
        }

        $db->prepare(
            "UPDATE portal_checkins SET status = 'completed', completed_at = COALESCE(completed_at, NOW()), updated_at = NOW(), updated_by = :u
             WHERE appointment_id = :a"
        )->execute(['a' => $appointmentId, 'u' => $userId]);

        return ['success' => true, 'message' => 'You are checked in. When you arrive, tell the desk your name — there is nothing else to fill in.'];
    }

    private static function markStep(PDO $db, int $appointmentId, int $patientId, string $column, int $userId): void
    {
        self::row($db, $appointmentId, $patientId, $userId);
        $db->prepare("UPDATE portal_checkins SET {$column} = NOW(), updated_at = NOW(), updated_by = :u WHERE appointment_id = :a")
            ->execute(['a' => $appointmentId, 'u' => $userId]);
    }

    // ------------------------------------------------------------------
    // The desk
    // ------------------------------------------------------------------

    /** Today's and tomorrow's appointments that the patient has checked in for. */
    public static function deskList(?string $date = null): array
    {
        $db = Database::connection();
        $day = $date ?: (string) $db->query("SELECT CURDATE()")->fetchColumn();

        $stmt = $db->prepare(
            "SELECT c.id, c.appointment_id, c.status, c.completed_at, c.demographics_confirmed_at, c.insurance_confirmed_at,
                    c.consents_signed_at, c.questionnaire_done_at, c.id_document_at, c.copay_paid_at, c.arrived_flow_id,
                    c.insurance_changed, c.insurance_note,
                    a.appointment_date, a.appointment_time, a.reason,
                    p.id AS patient_id, p.patient_no, p.identity_status,
                    TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) AS patient_name,
                    NULLIF(TRIM(CONCAT(COALESCE(pe.first_name, ''), ' ', COALESCE(pe.last_name, ''))), '') AS doctor,
                    (SELECT COUNT(*) FROM patient_flow pf WHERE pf.appointment_id = a.id AND pf.deleted_at IS NULL) AS already_in_flow,
                    (SELECT r.id FROM portal_questionnaire_responses r WHERE r.appointment_id = a.id ORDER BY r.id DESC LIMIT 1) AS response_id
             FROM portal_checkins c
             JOIN appointments a ON a.id = c.appointment_id AND a.deleted_at IS NULL
             JOIN patients p ON p.id = c.patient_id
             LEFT JOIN providers pr ON pr.id = a.provider_id
             LEFT JOIN employees pe ON pe.id = pr.employee_id
             WHERE a.appointment_date = :d
             ORDER BY a.appointment_time, c.id"
        );
        $stmt->execute(['d' => $day]);

        $items = array_map(static fn(array $r) => [
            'checkin_id' => (int) $r['id'],
            'appointment_id' => (int) $r['appointment_id'],
            'status' => $r['status'],
            'completed_at' => $r['completed_at'],
            'time' => $r['appointment_time'],
            'reason' => $r['reason'],
            'doctor' => $r['doctor'],
            'patient' => ['id' => (int) $r['patient_id'], 'name' => $r['patient_name'], 'mrn' => $r['patient_no'],
                'identity_status' => $r['identity_status']],
            'steps' => [
                'demographics' => $r['demographics_confirmed_at'], 'insurance' => $r['insurance_confirmed_at'],
                'consents' => $r['consents_signed_at'], 'questionnaire' => $r['questionnaire_done_at'],
                'id_document' => $r['id_document_at'], 'copay' => $r['copay_paid_at'],
            ],
            'insurance_changed' => (int) $r['insurance_changed'] === 1,
            'insurance_note' => $r['insurance_note'],
            'response_id' => $r['response_id'] !== null ? (int) $r['response_id'] : null,
            'arrived' => (int) $r['already_in_flow'] > 0,
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        return [
            'date' => $day,
            'items' => $items,
            'counts' => [
                'checked_in' => count(array_filter($items, static fn($x) => $x['status'] === 'completed')),
                'started' => count(array_filter($items, static fn($x) => $x['status'] === 'started')),
                'arrived' => count(array_filter($items, static fn($x) => $x['arrived'])),
            ],
        ];
    }

    /** What a patient answered, for the doctor and the desk to read. */
    public static function response(int $responseId): ?array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT r.id, r.answers, r.submitted_at, r.appointment_id, q.name, q.questions, q.specialty,
                    TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) AS patient_name, p.patient_no
             FROM portal_questionnaire_responses r
             LEFT JOIN portal_questionnaires q ON q.id = r.questionnaire_id
             JOIN patients p ON p.id = r.patient_id
             WHERE r.id = :id"
        );
        $stmt->execute(['id' => $responseId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        $answers = json_decode((string) $row['answers'], true) ?: [];
        $questions = json_decode((string) $row['questions'], true) ?: [];

        return [
            'id' => (int) $row['id'],
            'name' => $row['name'],
            'specialty' => $row['specialty'],
            'submitted_at' => $row['submitted_at'],
            'patient' => ['name' => $row['patient_name'], 'mrn' => $row['patient_no']],
            'items' => array_values(array_map(static function (array $q) use ($answers) {
                $v = $answers[$q['key']] ?? null;
                return [
                    'label' => $q['label'] ?? $q['key'],
                    'answer' => is_array($v) ? implode(', ', $v) : (string) ($v ?? ''),
                ];
            }, array_filter($questions, static fn($q) => isset($answers[$q['key']]) && $answers[$q['key']] !== ''))),
        ];
    }
}
