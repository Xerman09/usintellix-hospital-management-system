<?php

namespace App\Modules\MyChart\Services;

use App\Core\Database;
use PDO;

/**
 * A patient's own insurance in My Chart (Phase M12): what the hospital holds, and
 * asking for it to be added, corrected or removed.
 *
 * The rule comes from e-check-in, which already says it: a patient never edits
 * the insurance record itself -- the desk does that with the card in hand. What
 * e-check-in could capture was one sentence, on one appointment, inside the 48
 * hours before it. This gives that the same standing at any time: a request
 * carrying the proposed values, which a staff member applies or declines.
 *
 * So nothing here writes patient_insurances except review() on an apply. A
 * patient saying they have PhilHealth does not make it so, and coverage is what
 * the hospital will bill against.
 *
 * Reading the coverage is separate from requesting a change, deliberately: where
 * a hospital wants changes handled at the desk it switches the requests off, and
 * a patient can still see what will be billed.
 */
class PortalInsuranceService
{
    /** Who works the request queue, and who may apply one. */
    public const REVIEW_ROLES = ['admin', 'receptionist', 'doctor', 'clinician', 'nurse'];
    public const DECIDE_ROLES = ['admin', 'receptionist'];

    private const ACTIONS = ['add', 'update', 'remove'];
    private const TYPES = ['primary', 'secondary', 'tertiary'];

    private const DEFAULT_MAX_PENDING = 3;

    // ------------------------------------------------------------------
    // The patient's side
    // ------------------------------------------------------------------

    /** The coverage on file, this patient's own requests, and the payer list. */
    public static function mine(int $patientId): array
    {
        $db = Database::connection();
        $settings = self::settings();

        $coverage = $db->prepare(
            "SELECT pi.id, pi.insurance_type, pi.policy_number, pi.group_number, pi.subscriber_name,
                    pi.effective_date, pi.term_date, i.name AS insurer, i.phone AS insurer_phone
             FROM patient_insurances pi
             LEFT JOIN insurances i ON i.id = pi.insurance_id
             WHERE pi.patient_id = :p AND pi.deleted_at IS NULL
             ORDER BY FIELD(pi.insurance_type, 'primary', 'secondary', 'tertiary'), pi.id DESC"
        );
        $coverage->execute(['p' => $patientId]);

        $today = date('Y-m-d');

        $items = array_map(static fn(array $r) => [
            'id' => (int) $r['id'],
            'type' => $r['insurance_type'],
            'insurer' => $r['insurer'],
            'insurer_phone' => $r['insurer_phone'],
            'policy_number' => $r['policy_number'],
            'group_number' => $r['group_number'],
            'subscriber_name' => $r['subscriber_name'],
            'effective_date' => $r['effective_date'],
            'term_date' => $r['term_date'],
            // Said plainly, because "term_date: 2025-01-01" means nothing to most
            // people and an expired card at the counter is an unpleasant surprise.
            'is_active' => ($r['term_date'] === null || $r['term_date'] >= $today)
                && ($r['effective_date'] === null || $r['effective_date'] <= $today),
            'status_text' => self::statusText($r, $today),
        ], $coverage->fetchAll(PDO::FETCH_ASSOC));

        $requests = $db->prepare(
            "SELECT r.id, r.action, r.patient_insurance_id, r.insurer_name_text, r.insurance_type,
                    r.policy_number, r.group_number, r.subscriber_name, r.effective_date, r.note,
                    r.status, r.review_note, r.reviewed_at, r.created_at, r.upload_id,
                    i.name AS insurer
             FROM patient_insurance_requests r
             LEFT JOIN insurances i ON i.id = r.insurance_id
             WHERE r.patient_id = :p AND r.deleted_at IS NULL
             ORDER BY r.created_at DESC, r.id DESC
             LIMIT 50"
        );
        $requests->execute(['p' => $patientId]);

        $myRequests = array_map(static fn(array $r) => $r + [
            'insurer_shown' => $r['insurer'] ?: $r['insurer_name_text'],
            'can_withdraw' => $r['status'] === 'pending',
        ], $requests->fetchAll(PDO::FETCH_ASSOC));

        $pending = count(array_filter($myRequests, static fn(array $r) => $r['status'] === 'pending'));

        return [
            'coverage' => $items,
            'requests' => $myRequests,
            'insurers' => self::payers(),
            'types' => self::TYPES,
            'can_request' => $settings['allow_requests'] && $pending < $settings['max_pending'],
            'blocked_reason' => !$settings['allow_requests']
                ? 'This clinic asks that insurance changes go through the desk, where your card can be checked.'
                : ($pending >= $settings['max_pending']
                    ? sprintf('You already have %d request waiting. The clinic will look at it before you send another.', $pending)
                    : null),
        ];
    }

    /** The insurers a patient can pick from. Small enough to send whole. */
    private static function payers(): array
    {
        return Database::connection()->query(
            "SELECT id, name FROM insurances WHERE deleted_at IS NULL ORDER BY name LIMIT 300"
        )->fetchAll(PDO::FETCH_ASSOC);
    }

    /** The coverage's state in words a patient can act on. */
    private static function statusText(array $row, string $today): string
    {
        if ($row['term_date'] !== null && $row['term_date'] < $today) {
            return 'Expired on ' . $row['term_date'] . '. Please send an update so billing is correct.';
        }

        if ($row['effective_date'] !== null && $row['effective_date'] > $today) {
            return 'Starts on ' . $row['effective_date'] . '.';
        }

        if ($row['term_date'] !== null) {
            return 'Active until ' . $row['term_date'] . '.';
        }

        return 'Active.';
    }

    /**
     * Ask for coverage to be added, corrected or removed.
     *
     * Nothing is written to patient_insurances here. The request carries the
     * proposed values so the desk can apply it in one click rather than retyping
     * them out of a paragraph.
     */
    public static function request(int $patientId, array $input, ?array $user): array
    {
        $settings = self::settings();

        if (!$settings['allow_requests']) {
            return self::fail('This clinic asks that insurance changes go through the desk, where your card can be checked.');
        }

        $action = (string) ($input['action'] ?? '');

        if (!in_array($action, self::ACTIONS, true)) {
            return self::fail('Say whether you are adding, correcting or removing cover.');
        }

        $db = Database::connection();

        if (self::pendingCount($patientId) >= $settings['max_pending']) {
            return self::fail(sprintf(
                'You already have %d request waiting. The clinic will look at it before you send another.',
                $settings['max_pending']
            ));
        }

        // Correcting or removing has to name coverage that is actually theirs.
        $coverageId = isset($input['patient_insurance_id']) ? (int) $input['patient_insurance_id'] : 0;

        if ($action === 'add') {
            $coverageId = 0;
        } else {
            if ($coverageId <= 0 || !self::ownsCoverage($patientId, $coverageId)) {
                return self::fail('Choose which cover you mean.', false, ['patient_insurance_id' => 'That cover is not on your record.']);
            }
        }

        $note = trim((string) ($input['note'] ?? ''));

        if ($action === 'remove') {
            // Removing is the one case with no proposed values, so the reason is
            // all the desk has to go on.
            if ($note === '') {
                return self::fail('Tell us why this cover should come off.', false, ['note' => 'A reason is required.']);
            }

            return self::insert($db, $patientId, $user, [
                'action' => 'remove',
                'patient_insurance_id' => $coverageId,
                'note' => $note,
            ], 'Thank you. The clinic will check and take it off your record.');
        }

        // Adding or correcting: a policy number is the one thing billing cannot do
        // without, and an insurer has to be identifiable one way or the other.
        $policy = trim((string) ($input['policy_number'] ?? ''));

        if ($policy === '') {
            return self::fail('The policy or member number is needed.', false, ['policy_number' => 'Please enter the number on your card.']);
        }

        $insurerId = isset($input['insurance_id']) && (int) $input['insurance_id'] > 0 ? (int) $input['insurance_id'] : null;
        $insurerText = trim((string) ($input['insurer_name_text'] ?? ''));

        if ($insurerId !== null && !self::payerExists($insurerId)) {
            return self::fail('That insurer is not one we recognise.', false, ['insurance_id' => 'Pick one from the list, or type the name.']);
        }

        if ($insurerId === null && $insurerText === '') {
            return self::fail('Which insurer is it?', false, ['insurance_id' => 'Pick your insurer, or type the name if it is not listed.']);
        }

        $type = in_array($input['insurance_type'] ?? '', self::TYPES, true) ? $input['insurance_type'] : 'primary';
        $effective = self::date($input['effective_date'] ?? null);

        if (($input['effective_date'] ?? '') !== '' && $effective === null) {
            return self::fail('That start date does not look right.', false, ['effective_date' => 'Use the date on your card.']);
        }

        $uploadId = isset($input['upload_id']) ? (int) $input['upload_id'] : 0;

        if ($uploadId > 0 && !self::ownsCardUpload($patientId, $uploadId)) {
            return self::fail('That card photo is not one of yours.', false, ['upload_id' => 'Send the photo again.']);
        }

        return self::insert($db, $patientId, $user, [
            'action' => $action,
            'patient_insurance_id' => $coverageId ?: null,
            'insurance_id' => $insurerId,
            'insurer_name_text' => $insurerId === null ? mb_substr($insurerText, 0, 255) : null,
            'insurance_type' => $type,
            'policy_number' => mb_substr($policy, 0, 100),
            'group_number' => mb_substr(trim((string) ($input['group_number'] ?? '')), 0, 100) ?: null,
            'subscriber_name' => mb_substr(trim((string) ($input['subscriber_name'] ?? '')), 0, 255) ?: null,
            'effective_date' => $effective,
            'note' => $note === '' ? null : mb_substr($note, 0, 500),
            'upload_id' => $uploadId ?: null,
        ], $action === 'add'
            ? 'Thank you. The clinic will check it and add it to your record.'
            : 'Thank you. The clinic will check it and correct your record.');
    }

    /** Take back a request nobody has reviewed yet. */
    public static function withdraw(int $patientId, int $requestId, ?array $user): array
    {
        $stmt = Database::connection()->prepare(
            "UPDATE patient_insurance_requests
                SET deleted_at = NOW(), deleted_by = :by
              WHERE id = :id AND patient_id = :p AND status = 'pending' AND deleted_at IS NULL"
        );
        $stmt->execute(['by' => isset($user['id']) ? (int) $user['id'] : null, 'id' => $requestId, 'p' => $patientId]);

        if ($stmt->rowCount() === 0) {
            return self::fail('That request is not available, or the clinic has already looked at it.', true);
        }

        PortalAudit::action($user, $patientId, 'Insurance Request Withdrawn', sprintf('Patient withdrew insurance request #%d.', $requestId));

        return ['success' => true, 'message' => 'That request has been cancelled.'];
    }

    // ------------------------------------------------------------------
    // The desk
    // ------------------------------------------------------------------

    /** Requests waiting, oldest first. */
    public static function queue(string $status = 'pending', string $q = ''): array
    {
        $status = in_array($status, ['pending', 'applied', 'declined', 'all'], true) ? $status : 'pending';

        $where = ['r.deleted_at IS NULL'];
        $params = [];

        if ($status !== 'all') {
            $where[] = 'r.status = :status';
            $params['status'] = $status;
        }

        if ($q !== '') {
            $where[] = '(p.first_name LIKE :q OR p.last_name LIKE :q2 OR p.patient_no LIKE :q3 OR r.policy_number LIKE :q4)';
            $params += ['q' => "%{$q}%", 'q2' => "%{$q}%", 'q3' => "%{$q}%", 'q4' => "%{$q}%"];
        }

        $stmt = Database::connection()->prepare(
            "SELECT r.*, i.name AS insurer, p.patient_no,
                    NULLIF(TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))), '') AS patient_name,
                    cur.policy_number AS current_policy_number, cur.group_number AS current_group_number,
                    cur.insurance_type AS current_type, curi.name AS current_insurer
             FROM patient_insurance_requests r
             LEFT JOIN insurances i ON i.id = r.insurance_id
             LEFT JOIN patients p ON p.id = r.patient_id
             LEFT JOIN patient_insurances cur ON cur.id = r.patient_insurance_id
             LEFT JOIN insurances curi ON curi.id = cur.insurance_id
             WHERE " . implode(' AND ', $where) . "
             ORDER BY (r.status = 'pending') DESC, r.created_at ASC
             LIMIT 200"
        );
        $stmt->execute($params);

        $counts = Database::connection()->query(
            "SELECT status, COUNT(*) AS n FROM patient_insurance_requests WHERE deleted_at IS NULL GROUP BY status"
        )->fetchAll(PDO::FETCH_KEY_PAIR);

        return [
            'items' => array_map(static fn(array $r) => $r + ['insurer_shown' => $r['insurer'] ?: $r['insurer_name_text']],
                $stmt->fetchAll(PDO::FETCH_ASSOC)),
            'counts' => [
                'pending' => (int) ($counts['pending'] ?? 0),
                'applied' => (int) ($counts['applied'] ?? 0),
                'declined' => (int) ($counts['declined'] ?? 0),
            ],
        ];
    }

    /**
     * Apply a request to the record, or decline it.
     *
     * Applying is the only path in this service that touches patient_insurances.
     * It runs in a transaction: a request marked applied whose coverage was never
     * written, or coverage written against a request still showing pending, would
     * both be worse than a failure the desk can retry.
     */
    public static function review(int $requestId, array $input, int $actorId): array
    {
        $decision = (string) ($input['decision'] ?? '');
        $note = trim((string) ($input['note'] ?? ''));

        if (!in_array($decision, ['apply', 'decline'], true)) {
            return self::fail('Apply it or decline it.');
        }

        $db = Database::connection();

        $stmt = $db->prepare("SELECT * FROM patient_insurance_requests WHERE id = :id AND deleted_at IS NULL LIMIT 1");
        $stmt->execute(['id' => $requestId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return self::fail('That request no longer exists.', true);
        }

        if ($row['status'] !== 'pending') {
            return self::fail('Somebody has already dealt with this one.');
        }

        // A decline the patient cannot act on sends them back round the same loop.
        if ($decision === 'decline' && $note === '') {
            return self::fail('Say why, so the patient knows what to do next.', false, ['note' => 'A reason is required when declining.']);
        }

        if ($decision === 'decline') {
            return self::close($db, $requestId, 'declined', $actorId, $note, null)
                ? ['success' => true, 'message' => 'Declined. The patient will see your reason.']
                : self::fail('Somebody has already dealt with this one.');
        }

        // Applying 'add' or 'update' needs a real payer. A request that only named
        // an insurer in free text cannot be applied as it stands: somebody has to
        // decide which payer that is, or add it to the list first.
        if ($row['action'] !== 'remove' && $row['insurance_id'] === null) {
            return self::fail(
                'This request names an insurer that is not in the list ("' . (string) $row['insurer_name_text'] . '"). '
                . 'Add that insurer first, or enter the cover by hand and decline this with a note.'
            );
        }

        try {
            $db->beginTransaction();

            $appliedId = match ($row['action']) {
                'add' => self::applyAdd($db, $row, $actorId),
                'update' => self::applyUpdate($db, $row, $actorId),
                'remove' => self::applyRemove($db, $row, $actorId),
            };

            if ($appliedId === null) {
                $db->rollBack();

                return self::fail('The cover could not be changed. It may have been edited at the desk in the meantime.');
            }

            if (!self::close($db, $requestId, 'applied', $actorId, $note === '' ? null : $note, $appliedId)) {
                $db->rollBack();

                return self::fail('Somebody has already dealt with this one.');
            }

            $db->commit();
        } catch (\Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }

            return self::fail('The cover could not be changed. Please try again.');
        }

        return ['success' => true, 'message' => 'Applied to the patient\'s record.'];
    }

    private static function applyAdd(PDO $db, array $row, int $actorId): ?int
    {
        $stmt = $db->prepare(
            "INSERT INTO patient_insurances
                (patient_id, insurance_id, insurance_type, policy_number, group_number,
                 subscriber_name, effective_date, created_at, created_by)
             VALUES (:p, :ins, :type, :policy, :grp, :sub, :eff, NOW(), :by)"
        );
        $stmt->execute([
            'p' => (int) $row['patient_id'],
            'ins' => (int) $row['insurance_id'],
            'type' => $row['insurance_type'] ?: 'primary',
            'policy' => $row['policy_number'],
            'grp' => $row['group_number'],
            'sub' => $row['subscriber_name'],
            'eff' => $row['effective_date'],
            'by' => $actorId,
        ]);

        $id = (int) $db->lastInsertId();

        return $id > 0 ? $id : null;
    }

    private static function applyUpdate(PDO $db, array $row, int $actorId): ?int
    {
        $target = (int) $row['patient_insurance_id'];

        $stmt = $db->prepare(
            "UPDATE patient_insurances
                SET insurance_id = :ins, insurance_type = :type, policy_number = :policy,
                    group_number = :grp, subscriber_name = :sub, effective_date = :eff,
                    updated_at = NOW(), updated_by = :by
              WHERE id = :id AND patient_id = :p AND deleted_at IS NULL"
        );
        $stmt->execute([
            'ins' => (int) $row['insurance_id'],
            'type' => $row['insurance_type'] ?: 'primary',
            'policy' => $row['policy_number'],
            'grp' => $row['group_number'],
            'sub' => $row['subscriber_name'],
            'eff' => $row['effective_date'],
            'by' => $actorId,
            'id' => $target,
            'p' => (int) $row['patient_id'],
        ]);

        // Zero rows means the coverage was deleted or reassigned since the patient
        // asked, so the request no longer applies to anything.
        return $stmt->rowCount() > 0 ? $target : null;
    }

    private static function applyRemove(PDO $db, array $row, int $actorId): ?int
    {
        $target = (int) $row['patient_insurance_id'];

        $stmt = $db->prepare(
            "UPDATE patient_insurances
                SET deleted_at = NOW(), deleted_by = :by
              WHERE id = :id AND patient_id = :p AND deleted_at IS NULL"
        );
        $stmt->execute(['by' => $actorId, 'id' => $target, 'p' => (int) $row['patient_id']]);

        return $stmt->rowCount() > 0 ? $target : null;
    }

    /** Close a request, only while it is still pending -- two desks cannot both decide it. */
    private static function close(PDO $db, int $requestId, string $status, int $actorId, ?string $note, ?int $appliedId): bool
    {
        $stmt = $db->prepare(
            "UPDATE patient_insurance_requests
                SET status = :status, reviewed_by = :by, reviewed_at = NOW(),
                    review_note = :note, applied_insurance_id = :applied
              WHERE id = :id AND status = 'pending' AND deleted_at IS NULL"
        );
        $stmt->execute([
            'status' => $status,
            'by' => $actorId,
            'note' => $note === null ? null : mb_substr($note, 0, 255),
            'applied' => $appliedId,
            'id' => $requestId,
        ]);

        return $stmt->rowCount() > 0;
    }

    // ------------------------------------------------------------------
    // Plumbing
    // ------------------------------------------------------------------

    private static function insert(PDO $db, int $patientId, ?array $user, array $fields, string $message): array
    {
        $cols = array_merge(['patient_id' => $patientId, 'requested_by' => isset($user['id']) ? (int) $user['id'] : null], $fields);
        $names = implode(', ', array_keys($cols));
        $binds = ':' . implode(', :', array_keys($cols));

        $stmt = $db->prepare("INSERT INTO patient_insurance_requests ({$names}, status, created_at) VALUES ({$binds}, 'pending', NOW())");
        $stmt->execute($cols);

        PortalAudit::action(
            $user,
            $patientId,
            'Insurance Change Requested',
            sprintf('Patient asked to %s insurance cover.', $fields['action'])
        );

        return ['success' => true, 'message' => $message, 'data' => ['id' => (int) $db->lastInsertId()]];
    }

    private static function ownsCoverage(int $patientId, int $coverageId): bool
    {
        $stmt = Database::connection()->prepare(
            "SELECT 1 FROM patient_insurances WHERE id = :id AND patient_id = :p AND deleted_at IS NULL LIMIT 1"
        );
        $stmt->execute(['id' => $coverageId, 'p' => $patientId]);

        return (bool) $stmt->fetchColumn();
    }

    /** The card photograph has to be this patient's, and has to be a card. */
    private static function ownsCardUpload(int $patientId, int $uploadId): bool
    {
        $stmt = Database::connection()->prepare(
            "SELECT 1 FROM patient_uploads
              WHERE id = :id AND patient_id = :p AND deleted_at IS NULL AND kind = 'insurance_card' LIMIT 1"
        );
        $stmt->execute(['id' => $uploadId, 'p' => $patientId]);

        return (bool) $stmt->fetchColumn();
    }

    private static function payerExists(int $insuranceId): bool
    {
        $stmt = Database::connection()->prepare("SELECT 1 FROM insurances WHERE id = :id AND deleted_at IS NULL LIMIT 1");
        $stmt->execute(['id' => $insuranceId]);

        return (bool) $stmt->fetchColumn();
    }

    private static function pendingCount(int $patientId): int
    {
        $stmt = Database::connection()->prepare(
            "SELECT COUNT(*) FROM patient_insurance_requests
              WHERE patient_id = :p AND status = 'pending' AND deleted_at IS NULL"
        );
        $stmt->execute(['p' => $patientId]);

        return (int) $stmt->fetchColumn();
    }

    /** A date, or null. Rejects anything that is not a real calendar day. */
    private static function date(?string $value): ?string
    {
        $value = trim((string) $value);

        if ($value === '' || !preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $value, $m)) {
            return null;
        }

        return checkdate((int) $m[2], (int) $m[3], (int) $m[1]) ? $value : null;
    }

    private static function settings(): array
    {
        try {
            $row = Database::connection()->query(
                "SELECT portal_allow_insurance_requests, portal_insurance_max_pending
                 FROM general_settings ORDER BY id LIMIT 1"
            )->fetch(PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            $row = null;
        }

        $max = (int) ($row['portal_insurance_max_pending'] ?? self::DEFAULT_MAX_PENDING);

        return [
            'allow_requests' => (int) ($row['portal_allow_insurance_requests'] ?? 1) === 1,
            'max_pending' => ($max >= 1 && $max <= 20) ? $max : self::DEFAULT_MAX_PENDING,
        ];
    }

    private static function fail(string $message, bool $notFound = false, ?array $errors = null): array
    {
        return array_filter([
            'success' => false,
            'message' => $message,
            'errors' => $errors,
            'not_found' => $notFound ?: null,
        ], static fn($v) => $v !== null);
    }
}
