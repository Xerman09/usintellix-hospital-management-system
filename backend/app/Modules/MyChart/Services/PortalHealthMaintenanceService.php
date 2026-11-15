<?php

namespace App\Modules\MyChart\Services;

use App\Core\Database;
use App\Modules\PatientReminders\Services\PatientReminderService;
use PDO;
use Throwable;

/**
 * What you are due for (Phase M14).
 *
 * The rules engine already decides who should be reminded of what
 * (practice_rules), records that a given patient is currently due
 * (patient_reminders), and keeps a log of staff having addressed it
 * (patient_reminder_actions). None of that was ever shown to a patient, and
 * three things stood in the way -- schema 338's header sets them out in full,
 * but in short: there was no recurrence interval anywhere, item_label is
 * clinical text, and most seeded rules carry no demographic criteria at all, so
 * every patient "matches" the diabetes and administrative ones.
 *
 * portal_health_maintenance_items is the per-rule answer to all three. This
 * service reads it, and nothing reaches a patient unless:
 *
 *   - the rule's own is_patient_reminder flag is on (the hospital's switch), and
 *   - the item's is_patient_visible is on (the wording has been written), and
 *   - needs_condition is off -- a rule that only applies to patients with a
 *     condition is never shown from demographics alone, because demographics is
 *     all the engine checks.
 *
 * The next-due date is computed here, on read, from the last completed action
 * plus the item's interval. It is deliberately not stored: patient_reminders
 * already keeps a derived due_status that goes stale between runs, and a wrong
 * "you are up to date" on a cancer screening is the one error in this feature
 * that could cost somebody something.
 *
 * Where there is no record of the item ever being done, this says exactly that
 * rather than guessing. It does NOT infer "done" from lab or imaging orders:
 * matching "Cancer Screening: Pap Smear" to an order name is a guess, and a
 * guess in the direction of "up to date" is the dangerous direction. A hospital
 * that wants that needs an explicit rule-to-order mapping, which is its own
 * piece of work.
 */
class PortalHealthMaintenanceService
{
    /** Who may read the queue of what patients have asked about. */
    public const REVIEW_ROLES = ['admin', 'receptionist', 'doctor', 'clinician', 'nurse'];

    /** Who may accept or decline one. */
    public const DECIDE_ROLES = ['admin', 'receptionist', 'doctor', 'clinician', 'nurse'];

    /** Who may change the patient wording and the intervals. A clinical act. */
    public const EDIT_ROLES = ['admin', 'doctor'];

    public const UNITS = ['Day', 'Week', 'Month', 'Year'];

    private const DEFAULT_MAX_PENDING = 5;

    // ------------------------------------------------------------------
    // The patient's side
    // ------------------------------------------------------------------

    /**
     * Everything this patient is due for, up to date on, or has asked about.
     *
     * The rules are run for this patient first, so the panel reflects their age
     * today rather than whenever the last batch ran -- the same thing
     * PortalTodoService does, and for the same reason.
     */
    public static function mine(int $patientId): array
    {
        $db = Database::connection();
        $settings = self::settings();

        if (!$settings['allow']) {
            return [
                'items' => [],
                'requests' => [],
                'counts' => ['overdue' => 0, 'due' => 0, 'up_to_date' => 0],
                'allow_requests' => false,
                'blocked_reason' => 'This part of My Chart is switched off at the moment. Your care team still tracks what you are due for.',
                'server_time' => (string) $db->query("SELECT NOW()")->fetchColumn(),
            ];
        }

        self::refreshRules($patientId);

        $today = (string) $db->query("SELECT CURDATE()")->fetchColumn();
        $rows = self::rowsFor($db, $patientId);
        $requests = self::requestsFor($db, $patientId);

        // The pending request for a given reminder, so an item can say "you have
        // already asked" instead of offering the same button again.
        $pendingBy = [];

        foreach ($requests as $r) {
            if ($r['status'] === 'pending') {
                $pendingBy[$r['patient_reminder_id']] = $r;
            }
        }

        $items = [];

        foreach ($rows as $row) {
            $state = self::stateFor($row, $today);
            $pending = $pendingBy[(int) $row['reminder_id']] ?? null;

            $items[] = [
                'id' => (int) $row['reminder_id'],
                'label' => $row['patient_label'],
                'what_it_is' => $row['what_it_is'],
                'why_it_matters' => $row['why_it_matters'],
                'how_to_get_it' => $row['how_to_get_it'],
                'every' => self::everyText((int) $row['recurrence_val'], (string) $row['recurrence_unit']),
                'status' => $state['status'],
                'status_text' => $state['text'],
                'last_done_on' => $row['last_done_on'],
                'next_due_date' => $state['next_due'],
                'ever_done' => $row['last_done_on'] !== null,
                'pending_request' => $pending ? [
                    'id' => $pending['id'],
                    'action' => $pending['action'],
                    'text' => $pending['action'] === 'book'
                        ? 'You have asked the clinic to arrange this. They will contact you.'
                        : 'You have told us you had this done. The clinic is checking it.',
                ] : null,
                'can_request' => $settings['allow_requests'] && $pending === null && $state['status'] !== 'up_to_date',
            ];
        }

        // Overdue first, then due, then what is already in hand.
        $rank = ['overdue' => 0, 'due' => 1, 'up_to_date' => 2];
        usort($items, static fn($a, $b) => [$rank[$a['status']] ?? 3, $a['label']] <=> [$rank[$b['status']] ?? 3, $b['label']]);

        $blocked = null;

        if (!$settings['allow_requests']) {
            $blocked = 'Asking through the app is switched off at the moment. Please bring these up at your next visit.';
        } elseif (count($pendingBy) >= $settings['max_pending']) {
            $blocked = 'You have ' . count($pendingBy) . ' requests waiting. The clinic will work through those first.';

            foreach ($items as &$item) {
                $item['can_request'] = false;
            }

            unset($item);
        }

        return [
            'items' => $items,
            'requests' => $requests,
            'counts' => [
                'overdue' => count(array_filter($items, static fn($i) => $i['status'] === 'overdue')),
                'due' => count(array_filter($items, static fn($i) => $i['status'] === 'due')),
                'up_to_date' => count(array_filter($items, static fn($i) => $i['status'] === 'up_to_date')),
            ],
            'allow_requests' => $settings['allow_requests'],
            'blocked_reason' => $blocked,
            'server_time' => (string) $db->query("SELECT NOW()")->fetchColumn(),
        ];
    }

    /**
     * Only what is due or overdue, for the To-Do list. The panel and the To-Do
     * list read the same rows through the same rules, so they cannot disagree
     * about what somebody is due for.
     */
    public static function dueFor(int $patientId): array
    {
        $settings = self::settings();

        if (!$settings['allow']) {
            return [];
        }

        $db = Database::connection();
        self::refreshRules($patientId);

        $today = (string) $db->query("SELECT CURDATE()")->fetchColumn();
        $out = [];

        // A patient who has already asked is not told again -- the To-Do list is
        // for things they still have to do.
        $asked = self::pendingReminderIds($db, $patientId);

        foreach (self::rowsFor($db, $patientId) as $row) {
            $state = self::stateFor($row, $today);

            if ($state['status'] === 'up_to_date' || in_array((int) $row['reminder_id'], $asked, true)) {
                continue;
            }

            $out[] = [
                'id' => (int) $row['reminder_id'],
                'label' => $row['patient_label'],
                'status' => $state['status'],
                'text' => $state['text'],
                'next_due_date' => $state['next_due'],
            ];
        }

        return $out;
    }

    /**
     * Ask the clinic to arrange one, or tell them it was done elsewhere.
     *
     * Neither writes the record. "Done elsewhere" especially: a patient who
     * misremembers must not be able to close their own cancer screening
     * reminder, so the claim waits for somebody to accept it.
     */
    public static function request(int $patientId, array $input, ?array $user = null): array
    {
        $db = Database::connection();
        $settings = self::settings();

        if (!$settings['allow'] || !$settings['allow_requests']) {
            return self::fail('Asking through the app is switched off at the moment. Please bring it up at your next visit.');
        }

        $reminderId = (int) ($input['id'] ?? 0);
        $action = trim((string) ($input['action'] ?? ''));
        $errors = [];

        if (!in_array($action, ['book', 'report_done'], true)) {
            $errors['action'] = 'Choose whether to ask us to arrange it or to tell us it is done.';
        }

        // The reminder must be this patient's own, and must be an item they are
        // allowed to see at all -- otherwise an id guessed from another chart
        // would let somebody ask about a reminder that is not theirs.
        $row = self::oneRow($db, $patientId, $reminderId);

        if (!$row) {
            return self::fail('That is not one of the things on your list.', true);
        }

        $note = trim((string) ($input['note'] ?? ''));

        if (mb_strlen($note) > 500) {
            $errors['note'] = 'Keep it under 500 characters.';
        }

        $doneOn = null;
        $doneWhere = trim((string) ($input['done_where'] ?? ''));

        if ($action === 'report_done') {
            $given = trim((string) ($input['done_on'] ?? ''));

            if ($given === '') {
                $errors['done_on'] = 'Roughly when was it done?';
            } elseif (!self::isRealDay($given)) {
                $errors['done_on'] = 'That is not a date we can read.';
            } else {
                $doneOn = date('Y-m-d', (int) strtotime($given));

                if ($doneOn > date('Y-m-d')) {
                    $errors['done_on'] = 'That date is in the future.';
                }
            }

            if (mb_strlen($doneWhere) > 255) {
                $errors['done_where'] = 'Keep the place under 255 characters.';
            }
        }

        if ($errors) {
            return self::fail('That could not be sent.', false, $errors);
        }

        $pending = self::pendingReminderIds($db, $patientId);

        if (in_array($reminderId, $pending, true)) {
            return self::fail('You have already asked about this one, and the clinic has not looked at it yet.');
        }

        if (count($pending) >= $settings['max_pending']) {
            return self::fail('You have ' . count($pending) . ' requests waiting already. The clinic will work through those first.');
        }

        try {
            $db->prepare(
                "INSERT INTO portal_care_gap_requests
                    (patient_id, patient_reminder_id, item_label, action, note, done_on, done_where,
                     status, created_at)
                 VALUES (:p, :r, :label, :a, :note, :on, :where, 'pending', NOW())"
            )->execute([
                'p' => $patientId,
                'r' => $reminderId,
                'label' => mb_substr((string) $row['patient_label'], 0, 255),
                'a' => $action,
                'note' => $note !== '' ? $note : null,
                'on' => $doneOn,
                'where' => $doneWhere !== '' ? $doneWhere : null,
            ]);

            $id = (int) $db->lastInsertId();
        } catch (Throwable $e) {
            error_log('care gap request failed: ' . $e->getMessage());

            return self::fail('That could not be sent. Please try again.');
        }

        return [
            'success' => true,
            'message' => $action === 'book'
                ? 'Sent. The clinic will contact you to arrange it.'
                : 'Thank you. The clinic will check this and update your record -- until they do, it still shows as due.',
            'data' => ['id' => $id],
        ];
    }

    /** Take back a request nobody has looked at yet. */
    public static function withdraw(int $patientId, int $requestId): array
    {
        $stmt = Database::connection()->prepare(
            "UPDATE portal_care_gap_requests
                SET status = 'withdrawn', updated_at = NOW()
              WHERE id = :i AND patient_id = :p AND status = 'pending' AND deleted_at IS NULL"
        );
        $stmt->execute(['i' => $requestId, 'p' => $patientId]);

        if ($stmt->rowCount() === 0) {
            return self::fail('That request is not waiting any more -- the clinic has already looked at it.', true);
        }

        return ['success' => true, 'message' => 'Taken back.', 'data' => ['id' => $requestId]];
    }

    // ------------------------------------------------------------------
    // The clinic's side
    // ------------------------------------------------------------------

    /** What patients have asked about. */
    public static function queue(string $status = 'pending', string $q = ''): array
    {
        $db = Database::connection();
        $where = ['g.deleted_at IS NULL'];
        $params = [];

        if (in_array($status, ['pending', 'accepted', 'declined', 'withdrawn'], true)) {
            $where[] = 'g.status = :s';
            $params['s'] = $status;
        } else {
            $status = 'all';
        }

        $q = trim($q);

        if ($q !== '') {
            $where[] = "(p.patient_no LIKE :q OR CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) LIKE :q2 OR g.item_label LIKE :q3)";
            $params['q'] = "%{$q}%";
            $params['q2'] = "%{$q}%";
            $params['q3'] = "%{$q}%";
        }

        $stmt = $db->prepare(
            "SELECT g.id, g.patient_reminder_id, g.item_label, g.action, g.note, g.done_on, g.done_where,
                    g.status, g.review_note, g.reviewed_at, g.action_id, g.created_at,
                    p.id AS patient_id, p.patient_no,
                    TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) AS patient_name,
                    NULLIF(TRIM(CONCAT(COALESCE(re.first_name, ''), ' ', COALESCE(re.last_name, ''))), '') AS reviewed_by_name,
                    r.due_status
             FROM portal_care_gap_requests g
             JOIN patients p ON p.id = g.patient_id
             LEFT JOIN patient_reminders r ON r.id = g.patient_reminder_id
             LEFT JOIN employees re ON re.user_id = g.reviewed_by AND re.deleted_at IS NULL
             WHERE " . implode(' AND ', $where) . "
             ORDER BY g.status = 'pending' DESC, g.created_at DESC, g.id DESC
             LIMIT 300"
        );
        $stmt->execute($params);

        $items = array_map(static fn(array $r) => [
            'id' => (int) $r['id'],
            'reminder_id' => (int) $r['patient_reminder_id'],
            'item_label' => $r['item_label'],
            'action' => $r['action'],
            'note' => $r['note'],
            'done_on' => $r['done_on'],
            'done_where' => $r['done_where'],
            'status' => $r['status'],
            'review_note' => $r['review_note'],
            'reviewed_at' => $r['reviewed_at'],
            'reviewed_by' => $r['reviewed_by_name'],
            'action_id' => $r['action_id'] !== null ? (int) $r['action_id'] : null,
            'created_at' => $r['created_at'],
            'due_status' => $r['due_status'],
            'patient' => [
                'id' => (int) $r['patient_id'],
                'name' => $r['patient_name'],
                'mrn' => $r['patient_no'],
            ],
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        return [
            'status' => $status,
            'q' => $q,
            'items' => $items,
            'counts' => self::counts($db),
        ];
    }

    /**
     * Accept or decline one.
     *
     * Accepting a "done elsewhere" claim writes a patient_reminder_actions row
     * through PatientReminderService::addAction(), which is the module's own way
     * of recording that an item was addressed and which closes the reminder as a
     * side effect. Going through it rather than writing due_status directly is
     * the point: there stays one path by which a reminder is satisfied, whether
     * a nurse logged it or a patient reported it.
     *
     * Accepting a "please arrange it" request records the decision and nothing
     * else -- the booking itself happens on the appointments screen, because a
     * desk booking needs a doctor, a date and a slot that this queue does not
     * ask for.
     */
    public static function review(int $requestId, array $input, int $actorId): array
    {
        $db = Database::connection();
        $decision = trim((string) ($input['decision'] ?? ''));
        $note = trim((string) ($input['review_note'] ?? $input['note'] ?? ''));

        if (!in_array($decision, ['accept', 'decline'], true)) {
            return self::fail('Choose whether to accept or decline this.');
        }

        $stmt = $db->prepare(
            "SELECT g.*, p.id AS pid
             FROM portal_care_gap_requests g
             JOIN patients p ON p.id = g.patient_id
             WHERE g.id = :i AND g.status = 'pending' AND g.deleted_at IS NULL"
        );
        $stmt->execute(['i' => $requestId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return self::fail('That request is not waiting for a decision.', true);
        }

        if ($decision === 'decline' && $note === '') {
            return self::fail('Say why, so the patient knows what to do next.', false, ['review_note' => 'A reason is needed.']);
        }

        if ($decision === 'decline') {
            return self::close($db, $requestId, 'declined', $actorId, $note, null)
                ? ['success' => true, 'message' => 'Declined, and the patient can see your reason.', 'data' => ['id' => $requestId]]
                : self::fail('That decision could not be saved.');
        }

        // Accepting a booking request: a decision, no record change.
        if ($row['action'] === 'book') {
            return self::close($db, $requestId, 'accepted', $actorId, $note, null)
                ? [
                    'success' => true,
                    'message' => 'Accepted. Book the appointment on the appointments screen -- this only records that you took it on.',
                    'data' => ['id' => $requestId, 'patient_id' => (int) $row['patient_id']],
                ]
                : self::fail('That decision could not be saved.');
        }

        // Accepting a "done elsewhere" claim: write it as a real action.
        $actionId = null;

        try {
            $res = (new PatientReminderService())->addAction(
                (int) $row['patient_reminder_id'],
                [
                    'action_date' => (string) ($row['done_on'] ?: date('Y-m-d')),
                    'completed' => 'yes',
                    'details' => trim(
                        'Reported by the patient through My Chart'
                        . ($row['done_where'] ? ' as done at: ' . $row['done_where'] : '')
                        . ($row['note'] ? '. Their note: ' . $row['note'] : '')
                        . ($note !== '' ? '. Accepted with: ' . $note : '')
                    ),
                ],
                $actorId
            );

            if (empty($res['success'])) {
                return self::fail($res['message'] ?? 'The record could not be updated.');
            }

            $actionId = isset($res['data']['id']) ? (int) $res['data']['id'] : null;
        } catch (Throwable $e) {
            error_log('care gap accept failed: ' . $e->getMessage());

            return self::fail('The record could not be updated.');
        }

        if (!self::close($db, $requestId, 'accepted', $actorId, $note, $actionId)) {
            // The action landed but the request did not close. Say so plainly --
            // the alternative is a desk that accepts the same claim twice.
            return self::fail('The record was updated but this request did not close. Please refresh and check it.');
        }

        return [
            'success' => true,
            'message' => 'Accepted and recorded. It no longer shows as due for the patient.',
            'data' => ['id' => $requestId, 'action_id' => $actionId],
        ];
    }

    /**
     * The item catalogue for the staff screen: every rule's patient wording and
     * interval, including the ones deliberately not shown.
     */
    public static function items(string $q = ''): array
    {
        $db = Database::connection();
        $where = [];
        $params = [];

        $q = trim($q);

        if ($q !== '') {
            $where[] = '(i.patient_label LIKE :q OR r.title LIKE :q2)';
            $params['q'] = "%{$q}%";
            $params['q2'] = "%{$q}%";
        }

        $stmt = $db->prepare(
            "SELECT i.*, r.title AS rule_title, r.type AS rule_type, r.is_patient_reminder,
                    r.demographics_criteria
             FROM portal_health_maintenance_items i
             JOIN practice_rules r ON r.id = i.practice_rule_id AND r.deleted_at IS NULL
             " . ($where ? 'WHERE ' . implode(' AND ', $where) : '') . "
             ORDER BY i.sequence, i.patient_label"
        );
        $stmt->execute($params);

        $items = array_map(static function (array $r) {
            $criteria = json_decode((string) ($r['demographics_criteria'] ?? '[]'), true);
            $criteria = is_array($criteria) ? $criteria : [];

            return [
                'id' => (int) $r['id'],
                'practice_rule_id' => (int) $r['practice_rule_id'],
                'rule_title' => $r['rule_title'],
                'rule_type' => $r['rule_type'],
                'rule_flag_on' => (int) $r['is_patient_reminder'] === 1,
                'patient_label' => $r['patient_label'],
                'what_it_is' => $r['what_it_is'],
                'why_it_matters' => $r['why_it_matters'],
                'how_to_get_it' => $r['how_to_get_it'],
                'recurrence_val' => (int) $r['recurrence_val'],
                'recurrence_unit' => $r['recurrence_unit'],
                'every' => self::everyText((int) $r['recurrence_val'], (string) $r['recurrence_unit']),
                'grace_days' => (int) $r['grace_days'],
                'needs_condition' => (int) $r['needs_condition'] === 1,
                'condition_note' => $r['condition_note'],
                'is_patient_visible' => (int) $r['is_patient_visible'] === 1,
                'sequence' => (int) $r['sequence'],
                // What actually decides whether a patient sees it, spelled out,
                // because three switches are easy to get wrong one at a time.
                'shown_to_patients' => (int) $r['is_patient_visible'] === 1
                    && (int) $r['is_patient_reminder'] === 1
                    && (int) $r['needs_condition'] === 0,
                'has_criteria' => count($criteria) > 0,
            ];
        }, $stmt->fetchAll(PDO::FETCH_ASSOC));

        return ['items' => $items, 'q' => $q, 'units' => self::UNITS];
    }

    /** Change an item's wording, interval or visibility. */
    public static function saveItem(array $data, int $actorId): array
    {
        $db = Database::connection();
        $id = (int) ($data['id'] ?? 0);
        $errors = [];

        if ($id <= 0) {
            return self::fail('Which item?', true);
        }

        $stmt = $db->prepare("SELECT id, needs_condition FROM portal_health_maintenance_items WHERE id = :i");
        $stmt->execute(['i' => $id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            return self::fail('That item could not be found.', true);
        }

        $label = trim((string) ($data['patient_label'] ?? ''));

        if ($label === '') {
            $errors['patient_label'] = 'Give it a name the patient will recognise.';
        } elseif (mb_strlen($label) > 150) {
            $errors['patient_label'] = 'Keep the name under 150 characters.';
        }

        foreach (['what_it_is', 'why_it_matters', 'how_to_get_it'] as $field) {
            if (mb_strlen(trim((string) ($data[$field] ?? ''))) > 500) {
                $errors[$field] = 'Keep this under 500 characters.';
            }
        }

        $val = (int) ($data['recurrence_val'] ?? 0);

        if ($val < 1 || $val > 120) {
            $errors['recurrence_val'] = 'How often, between 1 and 120.';
        }

        $unit = (string) ($data['recurrence_unit'] ?? 'Year');

        if (!in_array($unit, self::UNITS, true)) {
            $errors['recurrence_unit'] = 'Days, weeks, months or years.';
        }

        $grace = (int) ($data['grace_days'] ?? 30);

        if ($grace < 0 || $grace > 365) {
            $errors['grace_days'] = 'Between 0 and 365 days.';
        }

        $visible = !empty($data['is_patient_visible']);

        // Switching on an item the engine cannot decide correctly would put a
        // diabetic eye exam in a healthy patient's list. Clearing needs_condition
        // is a separate, deliberate act.
        if ($visible && (int) $existing['needs_condition'] === 1) {
            $errors['is_patient_visible'] = 'This one only applies to patients who have the condition, and the rules engine matches on age and sex alone. Clear "needs a condition" first, and only if the rule really does identify the right patients.';
        }

        if ($errors) {
            return self::fail('That could not be saved.', false, $errors);
        }

        try {
            $db->prepare(
                "UPDATE portal_health_maintenance_items
                    SET patient_label = :label, what_it_is = :what, why_it_matters = :why,
                        how_to_get_it = :how, recurrence_val = :val, recurrence_unit = :unit,
                        grace_days = :grace, is_patient_visible = :vis,
                        needs_condition = :cond, sequence = :seq, updated_by = :by
                  WHERE id = :i"
            )->execute([
                'label' => $label,
                'what' => self::nullable($data['what_it_is'] ?? null, 500),
                'why' => self::nullable($data['why_it_matters'] ?? null, 500),
                'how' => self::nullable($data['how_to_get_it'] ?? null, 500),
                'val' => $val,
                'unit' => $unit,
                'grace' => $grace,
                'vis' => $visible ? 1 : 0,
                'cond' => !empty($data['needs_condition']) ? 1 : 0,
                'seq' => max(0, min(9999, (int) ($data['sequence'] ?? 100))),
                'by' => $actorId ?: null,
                'i' => $id,
            ]);
        } catch (Throwable $e) {
            error_log('health maintenance item save failed: ' . $e->getMessage());

            return self::fail('That could not be saved.');
        }

        return ['success' => true, 'message' => 'Saved.', 'data' => ['id' => $id]];
    }

    // ------------------------------------------------------------------
    // Working out where each item stands
    // ------------------------------------------------------------------

    /**
     * Due, overdue or up to date, and the sentence the patient reads.
     *
     * With no record of it ever being done there is no baseline to count from,
     * so this says so rather than inventing a date. It falls back to the rules
     * engine's own due_status to tell "never done, and the engine already thinks
     * you are late" from "never done, and it has only just come round".
     *
     * @return array{status: string, text: string, next_due: ?string}
     */
    public static function stateFor(array $row, string $today): array
    {
        $label = (string) $row['patient_label'];
        $grace = max(0, (int) $row['grace_days']);
        $lastDone = $row['last_done_on'] ?? null;

        if ($lastDone === null || $lastDone === '') {
            $late = ($row['due_status'] ?? '') === 'past_due';

            return [
                'status' => $late ? 'overdue' : 'due',
                'text' => $late
                    ? 'We have no record of you having this, and by our records it is overdue. Please ask us about it.'
                    : 'We have no record of you having this. If you have had it elsewhere, you can tell us.',
                'next_due' => null,
            ];
        }

        $lastDone = substr((string) $lastDone, 0, 10);
        $nextDue = self::addInterval($lastDone, (int) $row['recurrence_val'], (string) $row['recurrence_unit']);

        if ($nextDue === null) {
            return [
                'status' => 'due',
                'text' => 'Last done on ' . $lastDone . '. Ask us when the next one is due.',
                'next_due' => null,
            ];
        }

        if ($nextDue > $today) {
            return [
                'status' => 'up_to_date',
                'text' => 'Done on ' . $lastDone . '. The next one is due around ' . $nextDue . '.',
                'next_due' => $nextDue,
            ];
        }

        $graceEnd = date('Y-m-d', strtotime($nextDue . ' +' . $grace . ' days'));

        if ($graceEnd >= $today) {
            return [
                'status' => 'due',
                'text' => 'Due now. The last one was on ' . $lastDone . '.',
                'next_due' => $nextDue,
            ];
        }

        return [
            'status' => 'overdue',
            'text' => 'This was due on ' . $nextDue . '. The last one was on ' . $lastDone . '.',
            'next_due' => $nextDue,
        ];
    }

    /** "every year", "every 3 years", "every 3 months". */
    public static function everyText(int $val, string $unit): string
    {
        if ($val < 1 || !in_array($unit, self::UNITS, true)) {
            return '';
        }

        $word = strtolower($unit);

        return $val === 1 ? "every {$word}" : "every {$val} {$word}s";
    }

    /**
     * Date arithmetic by calendar rather than by multiplying days out, so three
     * years from a leap day lands where a person would expect.
     */
    public static function addInterval(string $date, int $val, string $unit): ?string
    {
        if ($val < 1 || !in_array($unit, self::UNITS, true)) {
            return null;
        }

        $ts = strtotime($date . ' +' . $val . ' ' . strtolower($unit));

        return $ts === false ? null : date('Y-m-d', $ts);
    }

    // ------------------------------------------------------------------
    // Reading the rows
    // ------------------------------------------------------------------

    /**
     * This patient's reminders for items they are allowed to see, each with the
     * date of the last completed action.
     *
     * The three gates are in the WHERE clause rather than in PHP so there is no
     * code path on which an item the hospital has not approved can be returned.
     */
    private static function rowsFor(PDO $db, int $patientId): array
    {
        $stmt = $db->prepare(
            "SELECT pr.id AS reminder_id, pr.item_label, pr.due_status,
                    i.patient_label, i.what_it_is, i.why_it_matters, i.how_to_get_it,
                    i.recurrence_val, i.recurrence_unit, i.grace_days,
                    (SELECT MAX(a.action_date) FROM patient_reminder_actions a
                      WHERE a.patient_reminder_id = pr.id AND a.completed = 'yes' AND a.deleted_at IS NULL
                    ) AS last_done_on
             FROM patient_reminders pr
             JOIN practice_rules r ON r.id = pr.practice_rule_id AND r.deleted_at IS NULL
             JOIN portal_health_maintenance_items i ON i.practice_rule_id = r.id
             WHERE pr.patient_id = :p AND pr.deleted_at IS NULL
               AND r.is_patient_reminder = 1
               AND i.is_patient_visible = 1
               AND i.needs_condition = 0
             ORDER BY i.sequence, i.patient_label"
        );
        $stmt->execute(['p' => $patientId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /** One of those rows, by reminder id. Used before accepting a request about it. */
    private static function oneRow(PDO $db, int $patientId, int $reminderId): ?array
    {
        foreach (self::rowsFor($db, $patientId) as $row) {
            if ((int) $row['reminder_id'] === $reminderId) {
                return $row;
            }
        }

        return null;
    }

    /** This patient's own requests, newest first. */
    private static function requestsFor(PDO $db, int $patientId): array
    {
        $stmt = $db->prepare(
            "SELECT id, patient_reminder_id, item_label, action, note, done_on, done_where,
                    status, review_note, reviewed_at, created_at
             FROM portal_care_gap_requests
             WHERE patient_id = :p AND deleted_at IS NULL AND status <> 'withdrawn'
             ORDER BY status = 'pending' DESC, created_at DESC, id DESC
             LIMIT 50"
        );
        $stmt->execute(['p' => $patientId]);

        return array_map(static fn(array $r) => [
            'id' => (int) $r['id'],
            'patient_reminder_id' => (int) $r['patient_reminder_id'],
            'item_label' => $r['item_label'],
            'action' => $r['action'],
            'note' => $r['note'],
            'done_on' => $r['done_on'],
            'done_where' => $r['done_where'],
            'status' => $r['status'],
            'review_note' => $r['review_note'],
            'reviewed_at' => $r['reviewed_at'],
            'created_at' => $r['created_at'],
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /** Reminder ids this patient has an unanswered request about. */
    private static function pendingReminderIds(PDO $db, int $patientId): array
    {
        $stmt = $db->prepare(
            "SELECT patient_reminder_id FROM portal_care_gap_requests
             WHERE patient_id = :p AND status = 'pending' AND deleted_at IS NULL"
        );
        $stmt->execute(['p' => $patientId]);

        return array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    /**
     * Run the rules for this patient so the panel reflects their age today.
     * A rule that cannot be evaluated must not take the whole panel down.
     */
    private static function refreshRules(int $patientId): void
    {
        try {
            (new PatientReminderService())->processForPatient($patientId);
        } catch (Throwable $e) {
            error_log('health maintenance rule refresh failed: ' . $e->getMessage());
        }
    }

    // ------------------------------------------------------------------
    // Small helpers
    // ------------------------------------------------------------------

    /** AND status = 'pending' so two desks cannot both decide the same request. */
    private static function close(PDO $db, int $id, string $status, int $actorId, string $note, ?int $actionId): bool
    {
        $stmt = $db->prepare(
            "UPDATE portal_care_gap_requests
                SET status = :s, reviewed_by = :by, reviewed_at = NOW(),
                    review_note = :note, action_id = :aid, updated_at = NOW()
              WHERE id = :i AND status = 'pending' AND deleted_at IS NULL"
        );
        $stmt->execute([
            's' => $status,
            'by' => $actorId ?: null,
            'note' => $note !== '' ? mb_substr($note, 0, 255) : null,
            'aid' => $actionId,
            'i' => $id,
        ]);

        return $stmt->rowCount() > 0;
    }

    private static function counts(PDO $db): array
    {
        try {
            $row = $db->query(
                "SELECT
                    SUM(status = 'pending') AS pending,
                    SUM(status = 'accepted') AS accepted,
                    SUM(status = 'declined') AS declined,
                    SUM(status = 'pending' AND action = 'book') AS to_book
                 FROM portal_care_gap_requests WHERE deleted_at IS NULL"
            )->fetch(PDO::FETCH_ASSOC);
        } catch (Throwable $e) {
            $row = null;
        }

        $row = is_array($row) ? $row : [];

        return [
            'pending' => (int) ($row['pending'] ?? 0),
            'accepted' => (int) ($row['accepted'] ?? 0),
            'declined' => (int) ($row['declined'] ?? 0),
            'to_book' => (int) ($row['to_book'] ?? 0),
        ];
    }

    private static function settings(): array
    {
        try {
            $row = Database::connection()->query(
                "SELECT portal_allow_health_maintenance, portal_allow_care_gap_requests, portal_care_gap_max_pending
                 FROM general_settings ORDER BY id LIMIT 1"
            )->fetch(PDO::FETCH_ASSOC);
        } catch (Throwable $e) {
            $row = null;
        }

        $row = is_array($row) ? $row : [];
        $max = (int) ($row['portal_care_gap_max_pending'] ?? self::DEFAULT_MAX_PENDING);

        return [
            'allow' => (int) ($row['portal_allow_health_maintenance'] ?? 1) === 1,
            'allow_requests' => (int) ($row['portal_allow_care_gap_requests'] ?? 1) === 1,
            'max_pending' => ($max >= 1 && $max <= 50) ? $max : self::DEFAULT_MAX_PENDING,
        ];
    }

    /**
     * A date somebody typed, and the day they meant.
     *
     * strtotime('2026-02-30') does not fail -- it rolls forward to 2 March. For
     * a free-typed date that is not a correction, it is a different day from
     * the one they meant, and "I had my smear on 30 February" silently becoming
     * 2 March is a date in somebody's record that nobody chose. So a plain
     * Y-m-d has to be a day that exists; anything else is left to strtotime,
     * which is what accepts the other formats a phone keyboard produces.
     */
    private static function isRealDay(string $given): bool
    {
        if (preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})$/', trim($given), $m)) {
            return checkdate((int) $m[2], (int) $m[3], (int) $m[1]);
        }

        return strtotime($given) !== false;
    }

    private static function nullable($value, int $max): ?string
    {
        $v = trim((string) ($value ?? ''));

        return $v === '' ? null : mb_substr($v, 0, $max);
    }

    private static function fail(string $message, bool $notFound = false, ?array $errors = null): array
    {
        $out = ['success' => false, 'message' => $message];

        if ($notFound) {
            $out['not_found'] = true;
        }

        if ($errors) {
            $out['errors'] = $errors;
        }

        return $out;
    }
}
