<?php

namespace App\Modules\MyChart\Services;

use App\Core\Database;
use App\Modules\Alerts\Services\AlertService;
use App\Modules\Encounters\Services\EncounterService;
use PDO;
use Throwable;

/**
 * Asynchronous e-visits (Phase M15a).
 *
 * A patient picks what is wrong, answers a structured questionnaire, and a
 * clinician reads it and replies in writing. No video, no appointment.
 *
 * This is the part of M15 that can be built without the decisions video needs
 * (which provider, what happens on a dropped call, how it is billed, what
 * bandwidth patients have). The plan's own advice was to do it first because it
 * reuses M13 and covers much of the demand. See the header of schema 340.
 *
 * THE RULE THAT MATTERS MOST
 *
 * An e-visit is not an emergency route, and the dangerous failure is not a
 * missed diagnosis -- it is a patient typing "crushing chest pain" into a form,
 * reading "a doctor will reply", and waiting at home. So:
 *
 *   submit() screens the red-flag answers BEFORE creating anything a clinician
 *   could pick up. A tripped flag refuses the submission outright. The row is
 *   kept with status 'refused' so the hospital can find it later, but it is in
 *   no queue, it produces no "we have received this" wording, and the patient
 *   is told to go now and that nobody is watching the message.
 *
 * An alert still goes to the care team, because a hospital should know one of
 * its patients reported chest pain through the portal. That alert is a record,
 * never a promise: nothing the patient is shown says anyone will call.
 *
 * THE CLINICAL RECORD
 *
 * reply() creates a real encounter through EncounterService::store(), under the
 * e-visit visit category from seed 080, and keeps the id on the e-visit row. The
 * note, orders and billing then live on the normal encounter path. A parallel
 * telehealth record would be a second source of truth, which the plan rules out.
 *
 * WHAT THIS DOES NOT DO
 *
 *   - It does not prescribe, and the patient is told so. A prescription from a
 *     questionnaire with no examination is a clinical governance decision.
 *   - It does not triage. The queue is ordered by how long somebody has waited
 *     and nothing else; sorting by a computed severity would be a clinical
 *     judgement made by code.
 *   - It does not accept an endless thread. One follow-up question inside
 *     portal_evisit_followup_days keeps a reply useful without becoming an
 *     open-ended consultation channel.
 */
class PortalEvisitService
{
    /** Who may read the queue. */
    public const REVIEW_ROLES = ['admin', 'doctor', 'clinician', 'nurse'];

    /** Who may answer one. Answering is a clinical act and creates an encounter. */
    public const ANSWER_ROLES = ['admin', 'doctor', 'clinician'];

    /** Who may change what patients can raise an e-visit about. */
    public const EDIT_ROLES = ['admin', 'doctor'];

    public const OUTCOMES = ['advice', 'come_in', 'emergency', 'referred', 'test_ordered'];

    /**
     * The visit category every e-visit encounter is filed under, by name rather
     * than id because ids differ per deployment. Seeded by 080.
     */
    public const VISIT_CATEGORY = 'e-Visit (online, no examination)';

    private const DEFAULT_REPLY_HOURS = 24;
    private const DEFAULT_MAX_OPEN = 1;
    private const DEFAULT_FOLLOWUP_DAYS = 7;

    /**
     * What the patient is told on every e-visit, before they start and again
     * with the reply. One list so the app, the desk and any printed copy cannot
     * drift apart on what is being promised.
     */
    public const TERMS = [
        'This is not for anything urgent. If you feel very unwell, go to the emergency department or call for help.',
        'A doctor or nurse reads what you write. They cannot examine you, so sometimes the answer will be that you need to be seen.',
        'You will get a reply, but not straight away. There is no one reading this minute by minute.',
        'Do not stop or change a medicine while you wait unless you have been told to.',
    ];

    /**
     * Shown when a red-flag answer refuses the submission. Deliberately says
     * nobody is watching: a patient who waits for a reply instead of going is
     * the exact outcome this exists to prevent.
     */
    public const REFUSAL_TERMS = [
        'Go to the emergency department now, or call for emergency help.',
        'Do not wait for a reply to this. Nobody is reading it minute by minute.',
        'We have not opened an online visit for you, because this needs to be seen in person.',
    ];

    // ------------------------------------------------------------------
    // The patient
    // ------------------------------------------------------------------

    /** What a patient may raise an e-visit about. */
    public static function reasons(): array
    {
        $db = Database::connection();
        $settings = self::settings();

        if (!$settings['allow']) {
            return [
                'items' => [],
                'terms' => self::TERMS,
                'reply_hours' => $settings['reply_hours'],
                'blocked_reason' => 'Online visits are not available at the moment. Please book an appointment or call the clinic.',
            ];
        }

        $sql = "SELECT r.id, r.code, r.patient_label, r.patient_blurb, r.not_for_text,
                       r.questionnaire_id, q.code AS questionnaire_code
                FROM portal_evisit_reasons r
                LEFT JOIN portal_questionnaires q
                       ON q.id = r.questionnaire_id AND q.is_active = 1
                WHERE r.is_patient_visible = 1
                ORDER BY r.sequence, r.patient_label";

        $items = [];

        foreach ($db->query($sql)->fetchAll(PDO::FETCH_ASSOC) as $row) {
            // A reason whose questionnaire is missing or switched off is left
            // out rather than offered and then failing when they tap it.
            if ($row['questionnaire_code'] === null) {
                continue;
            }

            $items[] = [
                'id' => (int) $row['id'],
                'code' => $row['code'],
                'label' => $row['patient_label'],
                'blurb' => $row['patient_blurb'],
                'not_for' => $row['not_for_text'],
            ];
        }

        return [
            'items' => $items,
            'terms' => self::TERMS,
            'reply_hours' => $settings['reply_hours'],
            'blocked_reason' => null,
        ];
    }

    /**
     * The questions for one reason.
     *
     * The red-flag questions come back flagged so the app can show them as a
     * short safety check before the rest, rather than mixed in with the history.
     * What trips them is NOT sent to the device: screening happens on the server
     * at submit, and a client that knew the trigger answers could be made to
     * avoid them.
     */
    public static function form(int $patientId, string $reasonCode): ?array
    {
        $db = Database::connection();
        $settings = self::settings();

        if (!$settings['allow']) {
            return null;
        }

        $row = self::reasonByCode($db, $reasonCode);

        if (!$row) {
            return null;
        }

        $questionnaire = self::questionnaire($db, (int) $row['questionnaire_id']);

        if (!$questionnaire) {
            return null;
        }

        $questions = [];

        foreach (self::questionsOf($questionnaire) as $q) {
            $questions[] = [
                'key' => $q['key'],
                'label' => $q['label'],
                'type' => $q['type'] ?? 'text',
                'options' => $q['options'] ?? null,
                'required' => !empty($q['required']),
                'is_safety_check' => isset($q['red_flag']),
            ];
        }

        return [
            'reason_code' => $row['code'],
            'reason_label' => $row['patient_label'],
            'not_for' => $row['not_for_text'],
            'title' => $questionnaire['name'],
            'intro' => $questionnaire['intro'],
            'questions' => $questions,
            'terms' => self::TERMS,
            'reply_hours' => $settings['reply_hours'],
            'open_already' => self::openCount($db, $patientId),
            'max_open' => $settings['max_open'],
        ];
    }

    /**
     * Raise an e-visit.
     *
     * The order of the checks is the safety property. Red-flag screening runs
     * before anything is written that a clinician could pick up, and a tripped
     * flag never produces a queued case.
     */
    public static function submit(int $patientId, array $input, ?array $user = null): array
    {
        $db = Database::connection();
        $settings = self::settings();

        if (!$settings['allow']) {
            return self::fail('Online visits are not available at the moment. Please book an appointment or call the clinic.');
        }

        $reasonCode = trim((string) ($input['reason_code'] ?? ''));
        $row = self::reasonByCode($db, $reasonCode);

        if (!$row) {
            return self::fail('That is not something we can deal with online.', true);
        }

        $questionnaire = self::questionnaire($db, (int) $row['questionnaire_id']);

        if (!$questionnaire) {
            return self::fail('That form is not available at the moment.', true);
        }

        $open = self::openCount($db, $patientId);

        if ($open >= $settings['max_open']) {
            return self::fail(sprintf(
                $settings['max_open'] === 1
                    ? 'You already have an online visit open. We will reply to that one first.'
                    : 'You already have %d online visits open. We will reply to those first.',
                $open
            ));
        }

        $questions = self::questionsOf($questionnaire);
        $answers = is_array($input['answers'] ?? null) ? $input['answers'] : [];
        $errors = self::validate($questions, $answers);

        if ($errors) {
            return self::fail('Please answer the questions marked as needed.', false, $errors);
        }

        // ---- The screening. Nothing above this line has been written. ----
        $tripped = self::screen($questions, $answers);
        $snapshot = self::snapshot($questions, $answers);

        if ($tripped) {
            return self::refuse($db, $patientId, $row, $questionnaire, $snapshot, $tripped, $user);
        }

        $replyHours = $settings['reply_hours'];

        try {
            $db->beginTransaction();

            $evisitNo = self::nextEvisitNo($db);

            $stmt = $db->prepare(
                "INSERT INTO portal_evisits
                    (patient_id, evisit_no, reason_id, reason_code, reason_label,
                     questionnaire_id, questionnaire_code, answers, status,
                     submitted_at, due_by, created_at)
                 VALUES
                    (:p, :no, :rid, :rcode, :rlabel,
                     :qid, :qcode, :answers, 'submitted',
                     NOW(), DATE_ADD(NOW(), INTERVAL :hours HOUR), NOW())"
            );
            $stmt->execute([
                'p' => $patientId,
                'no' => $evisitNo,
                'rid' => (int) $row['id'],
                'rcode' => $row['code'],
                'rlabel' => $row['patient_label'],
                'qid' => (int) $questionnaire['id'],
                'qcode' => $questionnaire['code'],
                'answers' => json_encode($snapshot, JSON_UNESCAPED_UNICODE),
                'hours' => $replyHours,
            ]);

            $id = (int) $db->lastInsertId();

            $db->commit();
        } catch (Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }

            error_log('evisit submit failed: ' . $e->getMessage());

            return self::fail('That could not be sent. Please try again.');
        }

        PortalAudit::action(
            $user,
            $patientId,
            'e-Visit Raised',
            sprintf('Patient raised e-visit %s about "%s".', $evisitNo, $row['patient_label'])
        );

        return [
            'success' => true,
            'message' => sprintf(
                'Sent. A doctor or nurse will reply, usually within %d hours. Your reference is %s.',
                $replyHours,
                $evisitNo
            ),
            'data' => ['id' => $id, 'evisit_no' => $evisitNo, 'reply_hours' => $replyHours],
        ];
    }

    /**
     * A red-flag answer stops the submission.
     *
     * The row is written so that somebody can find it afterwards -- a patient
     * who was turned away and did not go to hospital is exactly the case that
     * needs to be findable -- but it is created with status 'refused', which no
     * queue reads.
     *
     * The alert is raised after the row is committed and its failure is
     * swallowed: a care team that cannot be notified must not turn into an
     * error page telling an unwell patient to try again.
     */
    private static function refuse(
        PDO $db,
        int $patientId,
        array $reason,
        array $questionnaire,
        array $snapshot,
        array $tripped,
        ?array $user
    ): array {
        $keys = array_column($tripped, 'key');
        $because = array_values(array_unique(array_column($tripped, 'because')));
        $evisitId = 0;
        $evisitNo = '';

        try {
            $evisitNo = self::nextEvisitNo($db);

            $stmt = $db->prepare(
                "INSERT INTO portal_evisits
                    (patient_id, evisit_no, reason_id, reason_code, reason_label,
                     questionnaire_id, questionnaire_code, answers, status,
                     submitted_at, due_by,
                     red_flag_triggered, red_flag_keys, red_flag_note, created_at)
                 VALUES
                    (:p, :no, :rid, :rcode, :rlabel,
                     :qid, :qcode, :answers, 'refused',
                     NOW(), NULL,
                     1, :keys, :note, NOW())"
            );
            $stmt->execute([
                'p' => $patientId,
                'no' => $evisitNo,
                'rid' => (int) $reason['id'],
                'rcode' => $reason['code'],
                'rlabel' => $reason['patient_label'],
                'qid' => (int) $questionnaire['id'],
                'qcode' => $questionnaire['code'],
                'answers' => json_encode($snapshot, JSON_UNESCAPED_UNICODE),
                'keys' => mb_substr(implode(', ', $keys), 0, 500),
                'note' => mb_substr(implode(' ', $because), 0, 500),
            ]);

            $evisitId = (int) $db->lastInsertId();
        } catch (Throwable $e) {
            // Recording the refusal is useful, not essential. The patient still
            // gets told to go, which is the part that matters.
            error_log('evisit refusal could not be recorded: ' . $e->getMessage());
        }

        try {
            PortalAudit::action(
                $user,
                $patientId,
                'e-Visit Refused On Red Flag',
                sprintf('Patient answered a red-flag question (%s) and was told to seek care in person.', implode(', ', $keys))
            );
        } catch (Throwable $e) {
            error_log('evisit refusal audit failed: ' . $e->getMessage());
        }

        if ($evisitId > 0) {
            self::alertRedFlag($patientId, $evisitId, $evisitNo, $reason, $tripped);
        }

        return [
            'success' => false,
            'refused' => true,
            'message' => 'This needs to be seen in person, now.',
            'urgent' => [
                'headline' => 'Please get help now',
                'because' => $because,
                'terms' => self::REFUSAL_TERMS,
            ],
        ];
    }

    /**
     * Tell the care team. A record and a chance, never a promise -- nothing the
     * patient sees says anybody will call.
     */
    private static function alertRedFlag(
        int $patientId,
        int $evisitId,
        string $evisitNo,
        array $reason,
        array $tripped
    ): void {
        try {
            $targets = PortalSelfReadingService::careTeamTargets($patientId);

            if (!$targets) {
                return;
            }

            $body = [
                'A patient started an online visit through My Chart and answered a red-flag',
                'screening question. The e-visit was REFUSED and is in no queue.',
                '',
                'They were told to go to the emergency department now, and told that nobody is',
                'reading the message. They were NOT told that anyone would contact them.',
                '',
                'What they were asked about: ' . $reason['patient_label'],
                '',
                'Flags:',
            ];

            foreach ($tripped as $t) {
                $body[] = '  - ' . $t['label'] . ' -> ' . $t['answer'];
            }

            $body[] = '';
            $body[] = 'Reference ' . $evisitNo . '. This is self-reported and was not examined.';

            $res = AlertService::raise([
                'type' => 'portal_evisit_red_flag',
                'urgency' => 'critical',
                'title' => 'Online visit refused on a red-flag answer (' . $evisitNo . ')',
                'body' => implode("\n", $body),
                'patient_id' => $patientId,
                'link' => ['patient_id' => $patientId, 'tab' => 'portal_evisits'],
                'targets' => $targets,
                'source_type' => 'portal_evisits',
                'source_id' => $evisitId,
                'dedupe_key' => 'portal_evisit:' . $evisitId,
            ]);

            if (!empty($res['success']) && !empty($res['data']['id'])) {
                Database::connection()
                    ->prepare('UPDATE portal_evisits SET alert_id = ? WHERE id = ?')
                    ->execute([(int) $res['data']['id'], $evisitId]);
            }
        } catch (Throwable $e) {
            error_log('evisit red-flag alert failed: ' . $e->getMessage());
        }
    }

    /** This patient's e-visits. */
    public static function mine(int $patientId): array
    {
        $db = Database::connection();
        $settings = self::settings();

        $stmt = $db->prepare(
            "SELECT * FROM portal_evisits
              WHERE patient_id = :p AND deleted_at IS NULL
              ORDER BY submitted_at DESC, id DESC
              LIMIT 40"
        );
        $stmt->execute(['p' => $patientId]);

        $now = (string) $db->query('SELECT NOW()')->fetchColumn();
        $items = [];

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            // A refused case is not shown back to the patient as an open item.
            // It was refused on screen at the time, and listing it as though it
            // were in progress is the confusion this phase exists to avoid.
            if ($row['status'] === 'refused') {
                continue;
            }

            $items[] = self::present($row, $now, $settings, false);
        }

        return [
            'items' => $items,
            'terms' => self::TERMS,
            'reply_hours' => $settings['reply_hours'],
            'allow' => $settings['allow'],
            'can_raise' => $settings['allow'] && self::openCount($db, $patientId) < $settings['max_open'],
            'blocked_reason' => $settings['allow']
                ? null
                : 'Online visits are not available at the moment. Please book an appointment or call the clinic.',
            'server_time' => $now,
        ];
    }

    /** One e-visit with its thread, after proving it is this patient's. */
    public static function show(int $patientId, int $evisitId): ?array
    {
        $db = Database::connection();

        $stmt = $db->prepare(
            "SELECT * FROM portal_evisits
              WHERE id = :i AND patient_id = :p AND deleted_at IS NULL
                AND status <> 'refused'
              LIMIT 1"
        );
        $stmt->execute(['i' => $evisitId, 'p' => $patientId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        $now = (string) $db->query('SELECT NOW()')->fetchColumn();

        return self::present($row, $now, self::settings(), true);
    }

    /**
     * One follow-up question after a reply.
     *
     * Bounded two ways: the case must have been answered, and it must be inside
     * the follow-up window. A patient with a new problem raises a new e-visit,
     * which is a case somebody is paid to look at rather than a comment on an
     * old one.
     */
    public static function followUp(int $patientId, int $evisitId, array $input, ?array $user = null): array
    {
        $db = Database::connection();
        $settings = self::settings();
        $body = trim((string) ($input['body'] ?? ''));

        if ($body === '') {
            return self::fail('Type your question first.', false, ['body' => 'A question is required.']);
        }

        if (mb_strlen($body) > 2000) {
            return self::fail('Keep it under 2000 characters.', false, ['body' => 'Too long.']);
        }

        $stmt = $db->prepare(
            "SELECT * FROM portal_evisits
              WHERE id = :i AND patient_id = :p AND deleted_at IS NULL LIMIT 1"
        );
        $stmt->execute(['i' => $evisitId, 'p' => $patientId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return self::fail('That is not available for this account.', true);
        }

        if ($row['status'] !== 'answered') {
            return self::fail(
                $row['status'] === 'submitted'
                    ? 'Nobody has replied yet. You will see the reply here.'
                    : 'This one is finished. Please raise a new online visit.'
            );
        }

        $deadline = date('Y-m-d H:i:s', strtotime((string) $row['answered_at'] . ' +' . $settings['followup_days'] . ' days'));

        if (date('Y-m-d H:i:s') > $deadline) {
            return self::fail(sprintf(
                'It has been more than %d days since the reply, so this one is closed. Please raise a new online visit.',
                $settings['followup_days']
            ));
        }

        $asked = self::patientMessageCount($db, $evisitId);

        if ($asked >= 1) {
            return self::fail('You have already asked a follow-up question on this one. Please raise a new online visit if there is more.');
        }

        $db->prepare(
            "INSERT INTO portal_evisit_messages (evisit_id, author_type, author_user_id, body, created_at)
             VALUES (:e, 'patient', :u, :b, NOW())"
        )->execute([
            'e' => $evisitId,
            'u' => isset($user['id']) ? (int) $user['id'] : null,
            'b' => $body,
        ]);

        // Back into the queue, with a fresh clock. A follow-up nobody is
        // measured against is a follow-up that waits for ever.
        $db->prepare(
            "UPDATE portal_evisits
                SET status = 'submitted', due_by = DATE_ADD(NOW(), INTERVAL :h HOUR),
                    claimed_by = NULL, claimed_at = NULL
              WHERE id = :i"
        )->execute(['h' => $settings['reply_hours'], 'i' => $evisitId]);

        PortalAudit::action($user, $patientId, 'e-Visit Follow-up Asked', sprintf('Patient asked a follow-up on e-visit %s.', $row['evisit_no']));

        return ['success' => true, 'message' => 'Sent. You will see the reply here.'];
    }

    /** Take back an e-visit nobody has replied to. */
    public static function withdraw(int $patientId, int $evisitId, ?array $user = null): array
    {
        $db = Database::connection();

        $stmt = $db->prepare(
            "UPDATE portal_evisits
                SET status = 'withdrawn', withdrawn_at = NOW()
              WHERE id = :i AND patient_id = :p AND status = 'submitted' AND deleted_at IS NULL"
        );
        $stmt->execute(['i' => $evisitId, 'p' => $patientId]);

        if ($stmt->rowCount() === 0) {
            return self::fail('That is not available, or somebody has already replied to it.', true);
        }

        PortalAudit::action($user, $patientId, 'e-Visit Withdrawn', sprintf('Patient withdrew e-visit #%d before it was answered.', $evisitId));

        return ['success' => true, 'message' => 'That has been taken back.'];
    }

    // ------------------------------------------------------------------
    // The clinician
    // ------------------------------------------------------------------

    /**
     * The queue.
     *
     * Ordered by due_by -- how long somebody has waited against what the
     * hospital promised -- and by nothing else. Ordering by a computed severity
     * would be code deciding who is sickest from a questionnaire, which is the
     * judgement a clinician is there to make.
     *
     * Refused cases are reachable under their own status but are never in
     * 'waiting'. They are a log, not work.
     */
    public static function queue(string $status = 'waiting', string $q = ''): array
    {
        $db = Database::connection();
        $status = in_array($status, ['waiting', 'answered', 'refused', 'closed', 'all'], true) ? $status : 'waiting';

        $where = ['e.deleted_at IS NULL'];
        $params = [];

        switch ($status) {
            case 'waiting':
                $where[] = "e.status = 'submitted'";
                break;
            case 'answered':
                $where[] = "e.status = 'answered'";
                break;
            case 'refused':
                $where[] = "e.status = 'refused'";
                break;
            case 'closed':
                $where[] = "e.status IN ('closed', 'withdrawn')";
                break;
            default:
                break;
        }

        $q = trim($q);

        if ($q !== '') {
            $where[] = "(p.patient_no LIKE :q OR CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) LIKE :q2 OR e.evisit_no LIKE :q3 OR e.reason_label LIKE :q4)";
            $params['q'] = "%{$q}%";
            $params['q2'] = "%{$q}%";
            $params['q3'] = "%{$q}%";
            $params['q4'] = "%{$q}%";
        }

        $stmt = $db->prepare(
            "SELECT e.*, p.patient_no, p.sex, p.birthdate,
                    TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) AS patient_name,
                    NULLIF(TRIM(CONCAT(COALESCE(ce.first_name, ''), ' ', COALESCE(ce.last_name, ''))), '') AS claimed_by_name,
                    NULLIF(TRIM(CONCAT(COALESCE(ae.first_name, ''), ' ', COALESCE(ae.last_name, ''))), '') AS answered_by_name,
                    TIMESTAMPDIFF(MINUTE, e.submitted_at, NOW()) AS waiting_minutes,
                    (e.due_by IS NOT NULL AND e.due_by < NOW()) AS overdue
             FROM portal_evisits e
             JOIN patients p ON p.id = e.patient_id
             LEFT JOIN employees ce ON ce.user_id = e.claimed_by AND ce.deleted_at IS NULL
             LEFT JOIN employees ae ON ae.user_id = e.answered_by AND ae.deleted_at IS NULL
             WHERE " . implode(' AND ', $where) . "
             ORDER BY e.due_by IS NULL, e.due_by ASC, e.submitted_at ASC
             LIMIT 300"
        );
        $stmt->execute($params);

        $items = array_map(static fn(array $r) => [
            'id' => (int) $r['id'],
            'evisit_no' => $r['evisit_no'],
            'reason' => $r['reason_label'],
            'status' => $r['status'],
            'submitted_at' => $r['submitted_at'],
            'due_by' => $r['due_by'],
            'overdue' => (int) $r['overdue'] === 1,
            'waiting_minutes' => (int) $r['waiting_minutes'],
            'claimed_by' => $r['claimed_by'] !== null ? (int) $r['claimed_by'] : null,
            'claimed_by_name' => $r['claimed_by_name'],
            'answered_by_name' => $r['answered_by_name'],
            'answered_at' => $r['answered_at'],
            'outcome' => $r['outcome'],
            'encounter_id' => $r['encounter_id'] !== null ? (int) $r['encounter_id'] : null,
            'red_flag' => (int) $r['red_flag_triggered'] === 1,
            'red_flag_keys' => $r['red_flag_keys'],
            'patient' => [
                'id' => (int) $r['patient_id'],
                'name' => $r['patient_name'],
                'mrn' => $r['patient_no'],
                'sex' => $r['sex'],
                'birthdate' => $r['birthdate'],
            ],
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        return [
            'status' => $status,
            'q' => $q,
            'items' => $items,
            'counts' => self::counts($db),
            'reply_hours' => self::settings()['reply_hours'],
        ];
    }

    /** One e-visit in full for a clinician: the answers, the thread, the history. */
    public static function open(int $evisitId): ?array
    {
        $db = Database::connection();

        $stmt = $db->prepare(
            "SELECT e.*, p.patient_no, p.sex, p.birthdate,
                    TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) AS patient_name
             FROM portal_evisits e
             JOIN patients p ON p.id = e.patient_id
             WHERE e.id = :i AND e.deleted_at IS NULL LIMIT 1"
        );
        $stmt->execute(['i' => $evisitId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        $snapshot = json_decode((string) $row['answers'], true);
        $snapshot = is_array($snapshot) ? $snapshot : [];

        // Split so the clinician reads the history, with the screening visible
        // but out of the way. It is shown rather than hidden because "we did ask
        // about chest pain and they said no" is part of the record.
        $safety = array_values(array_filter($snapshot, static fn($a) => !empty($a['is_safety_check'])));
        $history = array_values(array_filter($snapshot, static fn($a) => empty($a['is_safety_check'])));

        return [
            'id' => (int) $row['id'],
            'evisit_no' => $row['evisit_no'],
            'status' => $row['status'],
            'reason' => $row['reason_label'],
            'questionnaire_code' => $row['questionnaire_code'],
            'submitted_at' => $row['submitted_at'],
            'due_by' => $row['due_by'],
            'answered_at' => $row['answered_at'],
            'outcome' => $row['outcome'],
            'encounter_id' => $row['encounter_id'] !== null ? (int) $row['encounter_id'] : null,
            'claimed_by' => $row['claimed_by'] !== null ? (int) $row['claimed_by'] : null,
            'red_flag' => (int) $row['red_flag_triggered'] === 1,
            'red_flag_keys' => $row['red_flag_keys'],
            'red_flag_note' => $row['red_flag_note'],
            'safety_checks' => $safety,
            'history' => $history,
            'messages' => self::messages($db, $evisitId),
            'outcomes' => self::OUTCOMES,
            'patient' => [
                'id' => (int) $row['patient_id'],
                'name' => $row['patient_name'],
                'mrn' => $row['patient_no'],
                'sex' => $row['sex'],
                'birthdate' => $row['birthdate'],
            ],
        ];
    }

    /**
     * Claim it, so two clinicians do not both write a reply.
     *
     * Advisory, not a lock: the UPDATE only succeeds when nobody holds it, but
     * nothing stops a second clinician replying anyway. A hard lock on clinical
     * work goes wrong the first time somebody goes home with a case claimed.
     */
    public static function claim(int $evisitId, int $actorId): array
    {
        $db = Database::connection();

        $stmt = $db->prepare(
            "UPDATE portal_evisits
                SET claimed_by = :u, claimed_at = NOW()
              WHERE id = :i AND status = 'submitted' AND deleted_at IS NULL
                AND (claimed_by IS NULL OR claimed_by = :u2)"
        );
        $stmt->execute(['u' => $actorId, 'i' => $evisitId, 'u2' => $actorId]);

        if ($stmt->rowCount() === 0) {
            return self::fail('Somebody else is already looking at this one.');
        }

        return ['success' => true, 'message' => 'Yours.'];
    }

    /** Put it back. */
    public static function release(int $evisitId, int $actorId): array
    {
        $db = Database::connection();

        $stmt = $db->prepare(
            "UPDATE portal_evisits
                SET claimed_by = NULL, claimed_at = NULL
              WHERE id = :i AND claimed_by = :u AND deleted_at IS NULL"
        );
        $stmt->execute(['i' => $evisitId, 'u' => $actorId]);

        if ($stmt->rowCount() === 0) {
            return self::fail('That one is not yours to release.');
        }

        return ['success' => true, 'message' => 'Put back in the queue.'];
    }

    /**
     * Reply to an e-visit, which is where it becomes part of the record.
     *
     * Creates a real encounter through EncounterService::store() under the
     * e-visit visit category, and keeps the id. If the category is missing the
     * reply is refused rather than filed under something else: an encounter in
     * the wrong category is worse than one that has not been written yet,
     * because nobody will know to look for it.
     */
    public static function reply(int $evisitId, array $input, int $actorId): array
    {
        $db = Database::connection();

        $body = trim((string) ($input['body'] ?? ''));
        $outcome = (string) ($input['outcome'] ?? '');
        $errors = [];

        if ($body === '') {
            $errors['body'] = 'A reply is required.';
        }

        if (mb_strlen($body) > 8000) {
            $errors['body'] = 'Keep the reply under 8000 characters.';
        }

        if (!in_array($outcome, self::OUTCOMES, true)) {
            $errors['outcome'] = 'Say what you have decided.';
        }

        if ($errors) {
            return self::fail('That reply could not be sent.', false, $errors);
        }

        $stmt = $db->prepare(
            "SELECT * FROM portal_evisits
              WHERE id = :i AND deleted_at IS NULL AND status = 'submitted' LIMIT 1"
        );
        $stmt->execute(['i' => $evisitId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return self::fail('That one is not waiting for a reply.', true);
        }

        $categoryId = self::visitCategoryId($db);

        if ($categoryId === null) {
            return self::fail(
                'The e-visit visit category is missing, so this cannot be filed into the record. '
                . 'Seed 080 has not been applied. Please tell IT rather than replying another way.'
            );
        }

        $patientId = (int) $row['patient_id'];

        // One encounter per e-visit, not one per reply.
        //
        // A reply to a follow-up question is part of the same consultation, so
        // it belongs on the encounter that already exists. Creating a second one
        // would leave a stray encounter in the patient's record linked to
        // nothing -- the UPDATE below keeps the first id with COALESCE, so the
        // new one would simply be orphaned, and nobody reading the chart could
        // tell what it was for.
        $encounterId = $row['encounter_id'] !== null ? (int) $row['encounter_id'] : null;

        if ($encounterId === null) {
            try {
                $encounter = (new EncounterService())->store($patientId, $actorId, [
                    'visit_category_id' => $categoryId,
                    // The database's clock, not PHP's. Every other timestamp on
                    // these rows comes from NOW(), and the two are not
                    // necessarily in the same timezone -- stamping the encounter
                    // from PHP put it seven hours away from the reply that
                    // created it.
                    'date_of_service' => (string) $db->query('SELECT NOW()')->fetchColumn(),
                    'encounter_provider_id' => self::providerIdFor($db, $actorId),
                    'reason_for_visit' => 'e-Visit (' . $row['evisit_no'] . '): ' . $row['reason_label'],
                ]);

                if (empty($encounter['success'])) {
                    return self::fail(
                        'The encounter could not be created, so the reply has not been sent. '
                        . ($encounter['message'] ?? '')
                    );
                }

                $encounterId = (int) ($encounter['data']['id'] ?? 0);
            } catch (Throwable $e) {
                error_log('evisit encounter failed: ' . $e->getMessage());

                return self::fail('The encounter could not be created, so the reply has not been sent.');
            }
        }

        try {
            $db->beginTransaction();

            $db->prepare(
                "INSERT INTO portal_evisit_messages (evisit_id, author_type, author_user_id, body, created_at)
                 VALUES (:e, 'clinician', :u, :b, NOW())"
            )->execute(['e' => $evisitId, 'u' => $actorId, 'b' => $body]);

            // answered_by/answered_at are only set on the FIRST reply, so the
            // follow-up window is measured from when the patient first had an
            // answer rather than from the most recent message.
            $db->prepare(
                "UPDATE portal_evisits
                    SET status = 'answered',
                        outcome = :o,
                        encounter_id = COALESCE(encounter_id, :enc),
                        answered_by = COALESCE(answered_by, :u),
                        answered_at = COALESCE(answered_at, NOW())
                  WHERE id = :i AND status = 'submitted'"
            )->execute(['o' => $outcome, 'enc' => $encounterId, 'u' => $actorId, 'i' => $evisitId]);

            $db->commit();
        } catch (Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }

            error_log('evisit reply failed: ' . $e->getMessage());

            return self::fail(
                'The reply could not be saved. An encounter (#' . $encounterId . ') was created and should be '
                . 'cancelled or used, because it is now in the patient record.'
            );
        }

        // No clinical content in the message. See seed 082.
        try {
            PortalNotificationService::queue($patientId, 'evisit_answered', [
                'ref' => (string) $row['evisit_no'],
            ], 'evisit:' . $evisitId);
        } catch (Throwable $e) {
            error_log('evisit notification failed: ' . $e->getMessage());
        }

        return [
            'success' => true,
            'message' => 'Replied, and filed as encounter #' . $encounterId . '.',
            'data' => ['encounter_id' => $encounterId],
        ];
    }

    /** Finish it, so no further follow-up is accepted. */
    public static function close(int $evisitId, int $actorId): array
    {
        $db = Database::connection();

        $stmt = $db->prepare(
            "UPDATE portal_evisits
                SET status = 'closed', closed_at = NOW(), closed_by = :u
              WHERE id = :i AND status = 'answered' AND deleted_at IS NULL"
        );
        $stmt->execute(['u' => $actorId, 'i' => $evisitId]);

        if ($stmt->rowCount() === 0) {
            return self::fail('That one cannot be closed yet.', true);
        }

        return ['success' => true, 'message' => 'Closed.'];
    }

    /** The reasons, as the desk sees them, with their questionnaires. */
    public static function reasonsForDesk(): array
    {
        $db = Database::connection();

        $sql = "SELECT r.*, q.code AS questionnaire_code, q.name AS questionnaire_name,
                       q.is_active AS questionnaire_active, q.questions
                FROM portal_evisit_reasons r
                LEFT JOIN portal_questionnaires q ON q.id = r.questionnaire_id
                ORDER BY r.sequence, r.patient_label";

        $items = [];

        foreach ($db->query($sql)->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $questions = json_decode((string) $row['questions'], true);
            $questions = is_array($questions) ? $questions : [];
            $flags = array_values(array_filter($questions, static fn($q) => isset($q['red_flag'])));

            $items[] = [
                'id' => (int) $row['id'],
                'code' => $row['code'],
                'patient_label' => $row['patient_label'],
                'patient_blurb' => $row['patient_blurb'],
                'not_for_text' => $row['not_for_text'],
                'is_patient_visible' => (int) $row['is_patient_visible'] === 1,
                'hide_reason' => $row['hide_reason'],
                'sequence' => (int) $row['sequence'],
                'questionnaire' => $row['questionnaire_id'] !== null ? [
                    'id' => (int) $row['questionnaire_id'],
                    'code' => $row['questionnaire_code'],
                    'name' => $row['questionnaire_name'],
                    'active' => (int) $row['questionnaire_active'] === 1,
                    'question_count' => count($questions),
                    'red_flag_count' => count($flags),
                    'red_flags' => array_map(static fn($f) => [
                        'key' => $f['key'] ?? '',
                        'label' => $f['label'] ?? '',
                        'when' => $f['red_flag']['when'] ?? [],
                        'because' => $f['red_flag']['because'] ?? '',
                    ], $flags),
                ] : null,
                'reaches_patients' => self::reachesPatients($row, count($flags)),
            ];
        }

        return ['items' => $items, 'settings' => self::settings()];
    }

    /** Change what patients can raise an e-visit about. */
    public static function saveReason(array $data, int $actorId): array
    {
        $db = Database::connection();

        $id = (int) ($data['id'] ?? 0);
        $label = trim((string) ($data['patient_label'] ?? ''));
        $blurb = trim((string) ($data['patient_blurb'] ?? ''));
        $notFor = trim((string) ($data['not_for_text'] ?? ''));
        $visible = !empty($data['is_patient_visible']);
        $hideReason = trim((string) ($data['hide_reason'] ?? ''));
        $sequence = (int) ($data['sequence'] ?? 0);
        $errors = [];

        $stmt = $db->prepare('SELECT * FROM portal_evisit_reasons WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return self::fail('That reason is not on file.', true);
        }

        if ($label === '') {
            $errors['patient_label'] = 'A patient-facing name is required.';
        }

        if (mb_strlen($label) > 255) {
            $errors['patient_label'] = 'Keep the name under 255 characters.';
        }

        if (mb_strlen($blurb) > 500) {
            $errors['patient_blurb'] = 'Keep the description under 500 characters.';
        }

        if (mb_strlen($notFor) > 500) {
            $errors['not_for_text'] = 'Keep this under 500 characters.';
        }

        // A reason cannot be offered to patients without a questionnaire that
        // screens for red flags. Everything else here is wording; this is the
        // safety property, and it is enforced rather than documented.
        if ($visible) {
            $questionnaire = $row['questionnaire_id'] !== null
                ? self::questionnaire($db, (int) $row['questionnaire_id'])
                : null;

            if (!$questionnaire) {
                $errors['is_patient_visible'] = 'This has no active questionnaire, so it cannot be offered to patients.';
            } else {
                $flags = array_filter(self::questionsOf($questionnaire), static fn($q) => isset($q['red_flag']));

                if (!$flags) {
                    $errors['is_patient_visible'] =
                        'That questionnaire has no red-flag screening questions, so it cannot be offered to patients.';
                }
            }
        }

        if ($errors) {
            return self::fail('That could not be saved.', false, $errors);
        }

        $db->prepare(
            "UPDATE portal_evisit_reasons
                SET patient_label = :label, patient_blurb = :blurb, not_for_text = :notfor,
                    is_patient_visible = :vis, hide_reason = :hide, sequence = :seq,
                    updated_at = NOW(), updated_by = :by
              WHERE id = :i"
        )->execute([
            'label' => $label,
            'blurb' => $blurb !== '' ? $blurb : null,
            'notfor' => $notFor !== '' ? $notFor : null,
            'vis' => $visible ? 1 : 0,
            'hide' => $hideReason !== '' ? mb_substr($hideReason, 0, 255) : null,
            'seq' => $sequence,
            'by' => $actorId,
            'i' => $id,
        ]);

        return ['success' => true, 'message' => 'Saved.'];
    }

    // ------------------------------------------------------------------
    // Screening
    // ------------------------------------------------------------------

    /**
     * Which red flags this set of answers trips.
     *
     * Comparison is case-insensitive and whitespace-trimmed, because a client
     * sending "yes" instead of "Yes" must not slip past a safety check. An
     * unanswered red-flag question does NOT trip -- required-ness is validated
     * separately, and treating a missing answer as positive would refuse
     * everybody who skipped a question.
     *
     * @return array<int, array{key:string, label:string, answer:string, because:string}>
     */
    public static function screen(array $questions, array $answers): array
    {
        $tripped = [];

        foreach ($questions as $q) {
            if (!isset($q['red_flag']['when']) || !is_array($q['red_flag']['when'])) {
                continue;
            }

            $key = (string) ($q['key'] ?? '');

            if ($key === '' || !array_key_exists($key, $answers)) {
                continue;
            }

            $given = trim((string) $answers[$key]);

            if ($given === '') {
                continue;
            }

            foreach ($q['red_flag']['when'] as $trigger) {
                if (strcasecmp($given, trim((string) $trigger)) !== 0) {
                    continue;
                }

                $tripped[] = [
                    'key' => $key,
                    'label' => (string) ($q['label'] ?? $key),
                    'answer' => $given,
                    'because' => (string) ($q['red_flag']['because'] ?? 'This needs to be seen in person.'),
                ];

                break;
            }
        }

        return $tripped;
    }

    /** Required answers that are missing, keyed for the form. */
    private static function validate(array $questions, array $answers): array
    {
        $errors = [];

        foreach ($questions as $q) {
            if (empty($q['required'])) {
                continue;
            }

            $key = (string) ($q['key'] ?? '');

            if ($key === '') {
                continue;
            }

            $given = trim((string) ($answers[$key] ?? ''));

            if ($given === '') {
                $errors['answers.' . $key] = 'This one is needed.';
                continue;
            }

            // A choice answer has to be one of the offered options. Otherwise a
            // crafted request could answer "No" to a question whose options are
            // the red-flag triggers and never match one.
            if (($q['type'] ?? '') === 'choice' && !empty($q['options']) && is_array($q['options'])) {
                $match = false;

                foreach ($q['options'] as $option) {
                    if (strcasecmp($given, trim((string) $option)) === 0) {
                        $match = true;
                        break;
                    }
                }

                if (!$match) {
                    $errors['answers.' . $key] = 'Pick one of the answers offered.';
                }
            }

            if (($q['type'] ?? '') === 'yesno' && !in_array(strtolower($given), ['yes', 'no'], true)) {
                $errors['answers.' . $key] = 'Answer yes or no.';
            }
        }

        return $errors;
    }

    /**
     * The answers with their question labels, for storage.
     *
     * The labels travel with the answers for the same reason M13 snapshots its
     * assignment title and M16 snapshots its prices: a questionnaire edited next
     * month must not silently change what a patient appears to have been asked.
     */
    private static function snapshot(array $questions, array $answers): array
    {
        $out = [];

        foreach ($questions as $q) {
            $key = (string) ($q['key'] ?? '');

            if ($key === '') {
                continue;
            }

            $given = trim((string) ($answers[$key] ?? ''));

            $out[] = [
                'key' => $key,
                'label' => (string) ($q['label'] ?? $key),
                'type' => (string) ($q['type'] ?? 'text'),
                'answer' => $given,
                'is_safety_check' => isset($q['red_flag']),
            ];
        }

        return $out;
    }

    // ------------------------------------------------------------------
    // Presentation
    // ------------------------------------------------------------------

    private static function present(array $row, string $now, array $settings, bool $withThread): array
    {
        $status = (string) $row['status'];
        $overdue = $row['due_by'] !== null && (string) $row['due_by'] < $now;

        $statusText = match ($status) {
            'submitted' => $overdue
                // Said plainly. A patient who has waited longer than the
                // hospital promised should be told so, not shown a cheerful
                // "we will reply soon" that has stopped being true.
                ? 'This has been waiting longer than we aim for. If it cannot wait, please call the clinic.'
                : sprintf('Waiting for a doctor or nurse to read it. We aim to reply within %d hours.', $settings['reply_hours']),
            'answered' => 'There is a reply for you below.',
            'withdrawn' => 'You took this back.',
            'closed' => 'This one is finished.',
            default => '',
        };

        $out = [
            'id' => (int) $row['id'],
            'evisit_no' => $row['evisit_no'],
            'reason' => $row['reason_label'],
            'status' => $status,
            'status_text' => $statusText,
            'submitted_at' => $row['submitted_at'],
            'due_by' => $row['due_by'],
            'overdue' => $overdue,
            'answered_at' => $row['answered_at'],
            'can_withdraw' => $status === 'submitted',
            'terms' => self::TERMS,
        ];

        if ($status === 'answered') {
            $deadline = date('Y-m-d H:i:s', strtotime((string) $row['answered_at'] . ' +' . $settings['followup_days'] . ' days'));
            $db = Database::connection();

            $out['can_follow_up'] = $now <= $deadline && self::patientMessageCount($db, (int) $row['id']) < 1;
            $out['follow_up_until'] = substr($deadline, 0, 10);
        } else {
            $out['can_follow_up'] = false;
            $out['follow_up_until'] = null;
        }

        if ($withThread) {
            $out['messages'] = self::messages(Database::connection(), (int) $row['id']);
            $snapshot = json_decode((string) $row['answers'], true);
            // The patient sees what they themselves wrote, minus the safety
            // screening -- re-reading six questions about stroke symptoms serves
            // nobody once the case has been accepted.
            $out['what_you_told_us'] = array_values(array_filter(
                is_array($snapshot) ? $snapshot : [],
                static fn($a) => empty($a['is_safety_check']) && ($a['answer'] ?? '') !== ''
            ));
        }

        return $out;
    }

    private static function messages(PDO $db, int $evisitId): array
    {
        $stmt = $db->prepare(
            "SELECT m.author_type, m.body, m.created_at,
                    NULLIF(TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))), '') AS author_name
             FROM portal_evisit_messages m
             LEFT JOIN employees e ON e.user_id = m.author_user_id AND e.deleted_at IS NULL
             WHERE m.evisit_id = ?
             ORDER BY m.created_at, m.id"
        );
        $stmt->execute([$evisitId]);

        return array_map(static fn(array $r) => [
            'from' => $r['author_type'],
            'author' => $r['author_type'] === 'clinician' ? ($r['author_name'] ?? 'Your care team') : 'You',
            'body' => $r['body'],
            'at' => $r['created_at'],
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    // ------------------------------------------------------------------
    // Plumbing
    // ------------------------------------------------------------------

    private static function reachesPatients(array $row, int $flagCount): array
    {
        if ($row['questionnaire_id'] === null || (int) $row['questionnaire_active'] !== 1) {
            return ['reaches' => false, 'why' => 'No -- there is no active questionnaire behind it.'];
        }

        if ($flagCount === 0) {
            return ['reaches' => false, 'why' => 'No -- its questionnaire has no red-flag screening questions.'];
        }

        if ((int) $row['is_patient_visible'] !== 1) {
            return [
                'reaches' => false,
                'why' => 'No -- it is switched off for patients'
                    . ($row['hide_reason'] ? ': ' . $row['hide_reason'] : '.'),
            ];
        }

        return ['reaches' => true, 'why' => 'Yes.'];
    }

    private static function reasonByCode(PDO $db, string $code): ?array
    {
        $stmt = $db->prepare(
            'SELECT * FROM portal_evisit_reasons WHERE code = ? AND is_patient_visible = 1 LIMIT 1'
        );
        $stmt->execute([$code]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private static function questionnaire(PDO $db, int $id): ?array
    {
        $stmt = $db->prepare(
            "SELECT * FROM portal_questionnaires
              WHERE id = ? AND is_active = 1 AND use_context = 'evisit' LIMIT 1"
        );
        $stmt->execute([$id]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /** The questions array, or empty when the JSON is unusable. */
    public static function questionsOf(array $questionnaire): array
    {
        $decoded = json_decode((string) ($questionnaire['questions'] ?? ''), true);

        if (!is_array($decoded)) {
            return [];
        }

        return array_values(array_filter($decoded, static fn($q) => is_array($q) && !empty($q['key'])));
    }

    private static function openCount(PDO $db, int $patientId): int
    {
        $stmt = $db->prepare(
            "SELECT COUNT(*) FROM portal_evisits
              WHERE patient_id = ? AND status = 'submitted' AND deleted_at IS NULL"
        );
        $stmt->execute([$patientId]);

        return (int) $stmt->fetchColumn();
    }

    private static function patientMessageCount(PDO $db, int $evisitId): int
    {
        $stmt = $db->prepare(
            "SELECT COUNT(*) FROM portal_evisit_messages WHERE evisit_id = ? AND author_type = 'patient'"
        );
        $stmt->execute([$evisitId]);

        return (int) $stmt->fetchColumn();
    }

    /** The e-visit visit category, by name. Null when seed 080 has not run. */
    public static function visitCategoryId(?PDO $db = null): ?int
    {
        $db = $db ?? Database::connection();

        try {
            $stmt = $db->prepare('SELECT id FROM visit_categories WHERE name = ? AND deleted_at IS NULL LIMIT 1');
            $stmt->execute([self::VISIT_CATEGORY]);
            $id = $stmt->fetchColumn();

            return $id === false ? null : (int) $id;
        } catch (Throwable $e) {
            return null;
        }
    }

    /**
     * The providers row for a user, for encounter_provider_id. Null is fine --
     * the column is nullable, and a missing provider record must not stop a
     * clinician answering a patient.
     */
    private static function providerIdFor(PDO $db, int $userId): ?int
    {
        try {
            $stmt = $db->prepare(
                'SELECT pr.id FROM providers pr
                 JOIN employees e ON e.id = pr.employee_id
                 WHERE e.user_id = ? AND e.deleted_at IS NULL
                 LIMIT 1'
            );
            $stmt->execute([$userId]);
            $id = $stmt->fetchColumn();

            return $id === false ? null : (int) $id;
        } catch (Throwable $e) {
            return null;
        }
    }

    /**
     * EV-<year>-<sequence>. Its own sequence, not borrowed from the hospital's
     * document counters, for the reason M16 gives about estimate numbers.
     */
    private static function nextEvisitNo(PDO $db): string
    {
        $year = (int) date('Y');

        $stmt = $db->prepare(
            'SELECT evisit_no FROM portal_evisits WHERE evisit_no LIKE :like ORDER BY id DESC LIMIT 1'
        );
        $stmt->execute(['like' => "EV-{$year}-%"]);
        $last = (string) ($stmt->fetchColumn() ?: '');

        $next = 1;

        if ($last !== '' && preg_match('/-(\d+)$/', $last, $m)) {
            $next = ((int) $m[1]) + 1;
        }

        return sprintf('EV-%d-%04d', $year, $next);
    }

    private static function counts(PDO $db): array
    {
        $out = ['waiting' => 0, 'overdue' => 0, 'answered' => 0, 'refused' => 0];

        try {
            $out['waiting'] = (int) $db->query(
                "SELECT COUNT(*) FROM portal_evisits WHERE status = 'submitted' AND deleted_at IS NULL"
            )->fetchColumn();
            $out['overdue'] = (int) $db->query(
                "SELECT COUNT(*) FROM portal_evisits WHERE status = 'submitted' AND due_by < NOW() AND deleted_at IS NULL"
            )->fetchColumn();
            $out['answered'] = (int) $db->query(
                "SELECT COUNT(*) FROM portal_evisits WHERE status = 'answered' AND deleted_at IS NULL"
            )->fetchColumn();
            $out['refused'] = (int) $db->query(
                "SELECT COUNT(*) FROM portal_evisits WHERE status = 'refused' AND deleted_at IS NULL"
            )->fetchColumn();
        } catch (Throwable $e) {
            // Decoration on a queue; a failure here must not stop it loading.
        }

        return $out;
    }

    private static function settings(): array
    {
        try {
            $row = Database::connection()->query(
                'SELECT portal_allow_evisits, portal_evisit_reply_hours,
                        portal_evisit_max_open, portal_evisit_followup_days
                 FROM general_settings ORDER BY id LIMIT 1'
            )->fetch(PDO::FETCH_ASSOC);
        } catch (Throwable $e) {
            $row = null;
        }

        $row = is_array($row) ? $row : [];

        $hours = (int) ($row['portal_evisit_reply_hours'] ?? self::DEFAULT_REPLY_HOURS);
        $maxOpen = (int) ($row['portal_evisit_max_open'] ?? self::DEFAULT_MAX_OPEN);
        $followup = (int) ($row['portal_evisit_followup_days'] ?? self::DEFAULT_FOLLOWUP_DAYS);

        return [
            // Defaults to NOT allowed. Everything else in My Chart defaults on;
            // this one puts clinical triage in front of a patient, so it waits
            // for somebody to say yes.
            'allow' => (int) ($row['portal_allow_evisits'] ?? 0) === 1,
            'reply_hours' => ($hours >= 1 && $hours <= 336) ? $hours : self::DEFAULT_REPLY_HOURS,
            'max_open' => ($maxOpen >= 1 && $maxOpen <= 10) ? $maxOpen : self::DEFAULT_MAX_OPEN,
            'followup_days' => ($followup >= 1 && $followup <= 90) ? $followup : self::DEFAULT_FOLLOWUP_DAYS,
        ];
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
