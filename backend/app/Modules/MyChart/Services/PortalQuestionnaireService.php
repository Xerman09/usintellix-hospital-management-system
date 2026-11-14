<?php

namespace App\Modules\MyChart\Services;

use App\Core\Database;
use App\Modules\Alerts\Services\AlertService;
use App\Modules\Gad7\Services\Gad7Service;
use App\Modules\Phq9\Services\Phq9Service;
use PDO;
use Throwable;

/**
 * Questionnaires sent out between visits (Phase M13).
 *
 * The engine built for e-check-in only ran in the two days before an appointment.
 * This is the other half: a clinician sends a questionnaire with a due date, it
 * appears in the patient's To-Do list, the patient answers it at home, and the
 * answers come back to the people looking after them.
 *
 * Two kinds of questionnaire go through here, and the difference matters:
 *
 *   unscored   the questions live in portal_questionnaires (seed 072). The answers
 *              are read as words -- nobody adds them up.
 *   scored     PHQ-9 and GAD-7. The questions and the scoring bands come from
 *              Phq9Service and Gad7Service, the same code the clinical screens
 *              use, so a home score and an in-visit score can never be computed
 *              two different ways.
 *
 * A scored answer that crosses the instrument's band raises a real alert to the
 * patient's care team through AlertService -- the same path a nurse keying the
 * same score in would take. PHQ-9 item 9 (thoughts of being better off dead) is
 * treated as critical on its own, whatever the total, because a low total with a
 * positive item 9 is exactly the case a threshold on the total would miss.
 *
 * Nothing here decides anything clinical. A severity band is the instrument's own
 * label, not a diagnosis, and the patient is never shown a score -- they are told
 * their answers have gone to their team, which is the only thing that is true.
 */
class PortalQuestionnaireService
{
    /** Who may send a questionnaire out. */
    public const ASSIGN_ROLES = ['admin', 'doctor', 'clinician', 'nurse'];

    /** Who may read what came back. */
    public const REVIEW_ROLES = ['admin', 'doctor', 'clinician', 'nurse'];

    private const DEFAULT_GRACE_DAYS = 14;

    /**
     * The four-point scale both scored instruments use. The patient picks a
     * label; what is stored and scored is the index, 0 to 3.
     */
    public const SCALE = [
        'Not at all',
        'Several days',
        'More than half the days',
        'Nearly every day',
    ];

    /**
     * The scored instruments. `urgent_at` is the total at which the care team is
     * told; `critical_item` is a single answer that tells them on its own.
     *
     * The thresholds are the instruments' own published bands: 15 is where PHQ-9
     * becomes "moderately severe" and GAD-7 "severe". They are not a clinical
     * judgement made here -- a hospital that wants different ones changes them
     * in one place.
     */
    public const INSTRUMENTS = [
        'phq9' => [
            'label' => 'PHQ-9 (low mood)',
            'title' => 'How your mood has been',
            'intro' => 'Over the last two weeks, how often have you been bothered by any of the following? There are no wrong answers, and your care team is the only one who reads this.',
            'urgent_at' => 15,
            'critical_item' => 'q9_better_off_dead',
            'max' => 27,
        ],
        'gad7' => [
            'label' => 'GAD-7 (worry and anxiety)',
            'title' => 'How you have been feeling',
            'intro' => 'Over the last two weeks, how often have you been bothered by any of the following? There are no wrong answers, and your care team is the only one who reads this.',
            'urgent_at' => 15,
            'critical_item' => null,
            'max' => 21,
        ],
    ];

    // ------------------------------------------------------------------
    // The patient's side
    // ------------------------------------------------------------------

    /**
     * Everything this patient has been sent: what is still waiting, and what they
     * have already answered. No score and no severity goes out here -- a number
     * the patient cannot interpret is worse than no number.
     */
    public static function mine(int $patientId): array
    {
        $db = Database::connection();
        $settings = self::settings();
        $today = (string) $db->query("SELECT CURDATE()")->fetchColumn();

        $stmt = $db->prepare(
            "SELECT a.id, a.instrument, a.questionnaire_id, a.title, a.reason, a.due_date, a.status,
                    a.assigned_at, a.opened_at, a.completed_at, q.questions,
                    NULLIF(TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))), '') AS assigned_by_name
             FROM portal_questionnaire_assignments a
             LEFT JOIN portal_questionnaires q ON q.id = a.questionnaire_id
             LEFT JOIN employees e ON e.user_id = a.assigned_by AND e.deleted_at IS NULL
             WHERE a.patient_id = :p AND a.deleted_at IS NULL AND a.status <> 'cancelled'
             ORDER BY a.status = 'pending' DESC, COALESCE(a.due_date, a.assigned_at) ASC, a.id DESC"
        );
        $stmt->execute(['p' => $patientId]);

        $waiting = [];
        $done = [];

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $item = [
                'id' => (int) $r['id'],
                'title' => $r['title'],
                'reason' => $r['reason'],
                'due_date' => $r['due_date'],
                'status' => $r['status'],
                'assigned_at' => $r['assigned_at'],
                'assigned_by' => $r['assigned_by_name'],
                'completed_at' => $r['completed_at'],
                'started' => $r['opened_at'] !== null,
                'question_count' => count(self::questionsFor($r)),
            ];

            if ($r['status'] === 'completed') {
                $item['can_answer'] = false;
                $item['status_text'] = 'Answered on ' . substr((string) $r['completed_at'], 0, 10)
                    . '. Your care team can see it.';
                $done[] = $item;
                continue;
            }

            $closed = self::closed($r['due_date'], $today, $settings['grace_days']);
            $item['overdue'] = $r['due_date'] !== null && $r['due_date'] < $today;
            $item['can_answer'] = !$closed && $settings['allow'];

            if (!$settings['allow']) {
                $item['status_text'] = 'Answering questionnaires at home is switched off at the moment. Please bring it up at your next visit.';
            } elseif ($closed) {
                $item['status_text'] = 'This one has closed. Please mention it at your next visit instead.';
            } elseif ($item['overdue']) {
                $item['status_text'] = 'This was due on ' . $r['due_date'] . '. You can still answer it.';
            } elseif ($r['due_date'] !== null) {
                $item['status_text'] = 'Please answer this by ' . $r['due_date'] . '.';
            } else {
                $item['status_text'] = 'Answer this whenever it suits you.';
            }

            $waiting[] = $item;
        }

        return [
            'waiting' => $waiting,
            'answered' => $done,
            'counts' => [
                'waiting' => count($waiting),
                'overdue' => count(array_filter($waiting, static fn($i) => !empty($i['overdue']))),
            ],
            'allow_answering' => $settings['allow'],
            'server_time' => (string) $db->query("SELECT NOW()")->fetchColumn(),
        ];
    }

    /**
     * The questions of one questionnaire this patient was sent, ready to answer.
     * Opening it is recorded, so a clinician can tell "never looked at it" from
     * "looked and did not finish".
     */
    public static function form(int $patientId, int $assignmentId): array
    {
        $row = self::own($patientId, $assignmentId);

        if (!$row) {
            return self::fail('That questionnaire is not one of yours.', true);
        }

        if ($row['status'] === 'completed') {
            return self::fail('You have already answered this one.');
        }

        $settings = self::settings();
        $db = Database::connection();
        $today = (string) $db->query("SELECT CURDATE()")->fetchColumn();

        if (!$settings['allow']) {
            return self::fail('Answering questionnaires at home is switched off at the moment.');
        }

        if (self::closed($row['due_date'], $today, $settings['grace_days'])) {
            return self::fail('This questionnaire has closed. Please mention it at your next visit instead.');
        }

        if ($row['opened_at'] === null) {
            try {
                $db->prepare(
                    "UPDATE portal_questionnaire_assignments SET opened_at = NOW()
                      WHERE id = :i AND opened_at IS NULL"
                )->execute(['i' => $assignmentId]);
            } catch (Throwable $e) {
                // Recording that they looked must not stop them answering.
                error_log('questionnaire opened_at failed: ' . $e->getMessage());
            }
        }

        return [
            'success' => true,
            'message' => 'Questionnaire retrieved successfully.',
            'data' => [
                'id' => (int) $row['id'],
                'title' => $row['title'],
                'reason' => $row['reason'],
                'intro' => self::introFor($row),
                'due_date' => $row['due_date'],
                'scored' => isset(self::INSTRUMENTS[$row['instrument']]),
                'questions' => self::questionsFor($row),
            ],
        ];
    }

    /**
     * The patient's answers. Everything happens in one transaction: the response
     * row, the assignment, and the score. The alert is raised after it commits --
     * an alert about a row that was rolled back would send someone looking for
     * answers that do not exist.
     */
    public static function submit(int $patientId, int $assignmentId, array $answers, ?array $user = null): array
    {
        $row = self::own($patientId, $assignmentId);

        if (!$row) {
            return self::fail('That questionnaire is not one of yours.', true);
        }

        if ($row['status'] === 'completed') {
            return self::fail('You have already answered this one.');
        }

        $settings = self::settings();
        $db = Database::connection();
        $today = (string) $db->query("SELECT CURDATE()")->fetchColumn();

        if (!$settings['allow']) {
            return self::fail('Answering questionnaires at home is switched off at the moment.');
        }

        if (self::closed($row['due_date'], $today, $settings['grace_days'])) {
            return self::fail('This questionnaire has closed. Please mention it at your next visit instead.');
        }

        $questions = self::questionsFor($row);

        if (!$questions) {
            return self::fail('This questionnaire has no questions to answer. Please tell the clinic.');
        }

        [$clean, $errors] = self::validate($questions, $answers);

        if ($errors) {
            return self::fail('Please answer the questions marked as needed.', false, $errors);
        }

        $scored = isset(self::INSTRUMENTS[$row['instrument']]);
        $score = $scored ? self::score((string) $row['instrument'], $clean) : null;
        $userId = isset($user['id']) ? (int) $user['id'] : null;

        $db->beginTransaction();

        try {
            $db->prepare(
                "INSERT INTO portal_questionnaire_responses
                    (patient_id, appointment_id, form_definition_id, questionnaire_id, assignment_id,
                     answers, submitted_at, created_by)
                 VALUES (:p, NULL, :fd, :q, :a, :answers, NOW(), :u)"
            )->execute([
                'p' => $patientId,
                'fd' => self::formDefinitionFor($row),
                'q' => $row['questionnaire_id'] !== null ? (int) $row['questionnaire_id'] : null,
                'a' => $assignmentId,
                'answers' => json_encode($clean, JSON_UNESCAPED_UNICODE),
                'u' => $userId,
            ]);

            $responseId = (int) $db->lastInsertId();

            // AND status = 'pending' so two taps on a slow connection cannot both land.
            $stmt = $db->prepare(
                "UPDATE portal_questionnaire_assignments
                    SET status = 'completed', completed_at = NOW(), response_id = :r,
                        total_score = :score, severity = :sev
                  WHERE id = :i AND patient_id = :p AND status = 'pending' AND deleted_at IS NULL"
            );
            $stmt->execute([
                'r' => $responseId,
                'score' => $score['total_score'] ?? null,
                'sev' => $score['severity'] ?? null,
                'i' => $assignmentId,
                'p' => $patientId,
            ]);

            if ($stmt->rowCount() === 0) {
                $db->rollBack();

                return self::fail('You have already answered this one.');
            }

            $db->commit();
        } catch (Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }

            error_log('questionnaire submit failed: ' . $e->getMessage());

            return self::fail('Your answers could not be saved. Please try again.');
        }

        $told = false;

        if ($scored) {
            $told = self::escalate($patientId, $assignmentId, $row, $score, $clean, $userId);
        }

        return [
            'success' => true,
            'message' => $told
                ? 'Thank you. Your answers are saved, and your care team has been told about them today.'
                : 'Thank you. Your answers are saved and your care team can see them.',
            'data' => ['id' => $assignmentId, 'response_id' => $responseId, 'team_notified' => $told],
        ];
    }

    /** What is waiting for this patient, for the To-Do list. Cheap on purpose. */
    public static function pendingFor(int $patientId): array
    {
        $db = Database::connection();
        $settings = self::settings();

        if (!$settings['allow']) {
            return [];
        }

        $stmt = $db->prepare(
            "SELECT id, title, due_date, opened_at,
                    CASE WHEN due_date IS NOT NULL AND due_date < CURDATE() THEN 1 ELSE 0 END AS is_overdue
             FROM portal_questionnaire_assignments
             WHERE patient_id = :p AND status = 'pending' AND deleted_at IS NULL
               AND (due_date IS NULL OR due_date >= DATE_SUB(CURDATE(), INTERVAL :g DAY))
             ORDER BY is_overdue DESC, due_date IS NULL, due_date, id"
        );
        $stmt->bindValue('p', $patientId, PDO::PARAM_INT);
        $stmt->bindValue('g', $settings['grace_days'], PDO::PARAM_INT);
        $stmt->execute();

        return array_map(static fn(array $r) => [
            'id' => (int) $r['id'],
            'title' => $r['title'],
            'due_date' => $r['due_date'],
            'overdue' => (int) $r['is_overdue'] === 1,
            'started' => $r['opened_at'] !== null,
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    // ------------------------------------------------------------------
    // The clinician's side
    // ------------------------------------------------------------------

    /** What can be sent: the follow-up questionnaires, plus the scored instruments. */
    public static function catalogue(): array
    {
        $rows = Database::connection()->query(
            "SELECT id, code, name, intro, specialty, questions
             FROM portal_questionnaires
             WHERE is_active = 1 AND use_context IN ('followup', 'both')
             ORDER BY name, id"
        )->fetchAll(PDO::FETCH_ASSOC);

        $items = array_map(static function (array $r) {
            $q = json_decode((string) $r['questions'], true);

            return [
                'kind' => 'questionnaire',
                'value' => 'questionnaire:' . (int) $r['id'],
                'questionnaire_id' => (int) $r['id'],
                'instrument' => 'questionnaire',
                'code' => $r['code'],
                'label' => $r['name'],
                'specialty' => $r['specialty'],
                'intro' => $r['intro'],
                'question_count' => is_array($q) ? count($q) : 0,
                'scored' => false,
            ];
        }, $rows);

        foreach (self::INSTRUMENTS as $key => $meta) {
            $items[] = [
                'kind' => 'instrument',
                'value' => 'instrument:' . $key,
                'questionnaire_id' => null,
                'instrument' => $key,
                'code' => $key,
                'label' => $meta['label'],
                'specialty' => null,
                'intro' => $meta['intro'],
                'question_count' => count(self::instrumentQuestions($key)),
                'scored' => true,
                'alerts_at' => $meta['urgent_at'],
                'max' => $meta['max'],
            ];
        }

        return $items;
    }

    /**
     * Patients to send one to, by name or hospital number.
     *
     * This exists rather than reusing GET /patients because that route answers
     * admin, receptionist and doctor only, while a nurse and a clinician may
     * send a questionnaire. Widening that route would hand the whole patient
     * list to roles that have no other reason to hold it; this returns at most
     * twenty rows, and only once two characters have been typed.
     */
    public static function findPatients(string $q): array
    {
        $q = trim($q);

        if (mb_strlen($q) < 2) {
            return [];
        }

        $stmt = Database::connection()->prepare(
            "SELECT id, patient_no,
                    TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))) AS name,
                    birthdate
             FROM patients
             WHERE deleted_at IS NULL
               AND (patient_no LIKE :a
                    OR CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')) LIKE :b)
             ORDER BY last_name, first_name
             LIMIT 20"
        );
        $stmt->execute(['a' => "%{$q}%", 'b' => "%{$q}%"]);

        return array_map(static fn(array $r) => [
            'id' => (int) $r['id'],
            'name' => $r['name'] !== '' ? $r['name'] : 'Unnamed record',
            'mrn' => $r['patient_no'],
            'dob' => $r['birthdate'],
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * Send a questionnaire to a patient. The title is copied in rather than
     * referenced, so renaming the questionnaire later cannot change what the
     * patient was told they were answering.
     */
    public static function assign(array $input, int $actorId): array
    {
        $db = Database::connection();
        $errors = [];

        $patientId = (int) ($input['patient_id'] ?? 0);

        if ($patientId <= 0) {
            $errors['patient_id'] = 'Choose a patient.';
        } else {
            $stmt = $db->prepare("SELECT id FROM patients WHERE id = :p AND deleted_at IS NULL");
            $stmt->execute(['p' => $patientId]);

            if (!$stmt->fetchColumn()) {
                $errors['patient_id'] = 'Patient not found.';
            }
        }

        $instrument = trim((string) ($input['instrument'] ?? 'questionnaire'));
        $questionnaireId = !empty($input['questionnaire_id']) ? (int) $input['questionnaire_id'] : null;
        $title = null;

        if (isset(self::INSTRUMENTS[$instrument])) {
            $questionnaireId = null;
            $title = self::INSTRUMENTS[$instrument]['title'];
        } elseif ($instrument === 'questionnaire') {
            if (!$questionnaireId) {
                $errors['questionnaire_id'] = 'Choose which questionnaire to send.';
            } else {
                $stmt = $db->prepare(
                    "SELECT name FROM portal_questionnaires
                     WHERE id = :q AND is_active = 1 AND use_context IN ('followup', 'both')"
                );
                $stmt->execute(['q' => $questionnaireId]);
                $name = $stmt->fetchColumn();

                if ($name === false) {
                    $errors['questionnaire_id'] = 'That questionnaire cannot be sent between visits.';
                } else {
                    $title = (string) $name;
                }
            }
        } else {
            $errors['instrument'] = 'Choose what to send.';
        }

        $reason = trim((string) ($input['reason'] ?? ''));

        if (mb_strlen($reason) > 500) {
            $errors['reason'] = 'Keep the reason under 500 characters.';
        }

        $dueDate = trim((string) ($input['due_date'] ?? ''));

        if ($dueDate !== '') {
            $ts = strtotime($dueDate);

            if ($ts === false) {
                $errors['due_date'] = 'That is not a date we can read.';
            } else {
                $dueDate = date('Y-m-d', $ts);

                if ($dueDate < date('Y-m-d')) {
                    $errors['due_date'] = 'A due date in the past gives the patient nothing to do.';
                }
            }
        } else {
            $dueDate = null;
        }

        $encounterId = !empty($input['encounter_id']) ? (int) $input['encounter_id'] : null;

        if ($encounterId) {
            $stmt = $db->prepare("SELECT id FROM encounters WHERE id = :e AND patient_id = :p");
            $stmt->execute(['e' => $encounterId, 'p' => $patientId]);

            if (!$stmt->fetchColumn()) {
                $errors['encounter_id'] = 'That visit does not belong to this patient.';
            }
        }

        if (!$errors) {
            // The same questionnaire twice while the first is unanswered is almost
            // always a double tap, and two identical rows in a To-Do list read as a
            // mistake the patient has to resolve.
            $stmt = $db->prepare(
                "SELECT id FROM portal_questionnaire_assignments
                 WHERE patient_id = :p AND status = 'pending' AND deleted_at IS NULL
                   AND instrument = :i AND COALESCE(questionnaire_id, 0) = COALESCE(:q, 0)
                 LIMIT 1"
            );
            $stmt->execute(['p' => $patientId, 'i' => $instrument, 'q' => $questionnaireId]);
            $open = $stmt->fetchColumn();

            if ($open !== false) {
                return [
                    'success' => false,
                    'message' => 'This patient already has that questionnaire waiting, so nothing was sent again.',
                    'data' => ['id' => (int) $open, 'duplicate' => true],
                ];
            }
        }

        if ($errors) {
            return self::fail('The questionnaire could not be sent.', false, $errors);
        }

        try {
            $db->prepare(
                "INSERT INTO portal_questionnaire_assignments
                    (patient_id, instrument, questionnaire_id, title, reason, encounter_id, due_date,
                     status, assigned_by, assigned_at, created_at)
                 VALUES (:p, :i, :q, :t, :r, :e, :d, 'pending', :by, NOW(), NOW())"
            )->execute([
                'p' => $patientId, 'i' => $instrument, 'q' => $questionnaireId,
                't' => mb_substr((string) $title, 0, 150), 'r' => $reason !== '' ? $reason : null,
                'e' => $encounterId, 'd' => $dueDate, 'by' => $actorId ?: null,
            ]);

            $id = (int) $db->lastInsertId();
        } catch (Throwable $e) {
            error_log('questionnaire assign failed: ' . $e->getMessage());

            return self::fail('The questionnaire could not be sent.');
        }

        // Telling the patient is the point of sending it, but a notification that
        // cannot be queued must not undo an assignment already in their list.
        try {
            PortalNotificationService::queue($patientId, 'questionnaire_assigned', [
                'what' => (string) $title,
                'date' => $dueDate ?: 'whenever it suits you',
            ], 'questionnaire:' . $id);
        } catch (Throwable $e) {
            error_log('questionnaire notification failed: ' . $e->getMessage());
        }

        return [
            'success' => true,
            'message' => 'Sent. It is in the patient\'s To-Do list now.',
            'data' => ['id' => $id, 'duplicate' => false],
        ];
    }

    /** Take back a questionnaire nobody has answered. Answered ones stay. */
    public static function cancel(int $assignmentId, array $input, int $actorId): array
    {
        $reason = trim((string) ($input['reason'] ?? ''));

        $stmt = Database::connection()->prepare(
            "UPDATE portal_questionnaire_assignments
                SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = :by, cancel_reason = :r
              WHERE id = :i AND status = 'pending' AND deleted_at IS NULL"
        );
        $stmt->execute([
            'by' => $actorId ?: null,
            'r' => $reason !== '' ? mb_substr($reason, 0, 255) : null,
            'i' => $assignmentId,
        ]);

        if ($stmt->rowCount() === 0) {
            return self::fail('That questionnaire is not waiting any more -- it has been answered or already taken back.', true);
        }

        return [
            'success' => true,
            'message' => 'Taken back. It has gone from the patient\'s list.',
            'data' => ['id' => $assignmentId],
        ];
    }

    /**
     * The review queue. 'answered' is what came back and nobody has read yet,
     * which is the list a clinic actually works from.
     */
    public static function queue(string $status = 'answered', string $q = ''): array
    {
        $db = Database::connection();
        $where = ['a.deleted_at IS NULL'];
        $params = [];

        switch ($status) {
            case 'answered':
                $where[] = "a.status = 'completed' AND a.reviewed_at IS NULL";
                break;
            case 'pending':
                $where[] = "a.status = 'pending'";
                break;
            case 'overdue':
                $where[] = "a.status = 'pending' AND a.due_date IS NOT NULL AND a.due_date < CURDATE()";
                break;
            case 'flagged':
                $where[] = "a.status = 'completed' AND a.alert_id IS NOT NULL";
                break;
            case 'reviewed':
                $where[] = "a.status = 'completed' AND a.reviewed_at IS NOT NULL";
                break;
            default:
                $status = 'all';
                break;
        }

        $q = trim($q);

        if ($q !== '') {
            $where[] = "(p.patient_no LIKE :q OR CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) LIKE :q2 OR a.title LIKE :q3)";
            $params['q'] = "%{$q}%";
            $params['q2'] = "%{$q}%";
            $params['q3'] = "%{$q}%";
        }

        $stmt = $db->prepare(
            "SELECT a.id, a.instrument, a.title, a.reason, a.due_date, a.status, a.assigned_at,
                    a.opened_at, a.completed_at, a.total_score, a.severity, a.alert_id, a.reviewed_at,
                    a.response_id, a.cancel_reason,
                    p.id AS patient_id, p.patient_no,
                    TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) AS patient_name,
                    NULLIF(TRIM(CONCAT(COALESCE(ae.first_name, ''), ' ', COALESCE(ae.last_name, ''))), '') AS assigned_by_name,
                    NULLIF(TRIM(CONCAT(COALESCE(re.first_name, ''), ' ', COALESCE(re.last_name, ''))), '') AS reviewed_by_name
             FROM portal_questionnaire_assignments a
             JOIN patients p ON p.id = a.patient_id
             LEFT JOIN employees ae ON ae.user_id = a.assigned_by AND ae.deleted_at IS NULL
             LEFT JOIN employees re ON re.user_id = a.reviewed_by AND re.deleted_at IS NULL
             WHERE " . implode(' AND ', $where) . "
             ORDER BY a.alert_id IS NULL, COALESCE(a.completed_at, a.due_date, a.assigned_at) DESC, a.id DESC
             LIMIT 300"
        );
        $stmt->execute($params);

        $items = array_map(static fn(array $r) => [
            'id' => (int) $r['id'],
            'instrument' => $r['instrument'],
            'scored' => isset(self::INSTRUMENTS[$r['instrument']]),
            'title' => $r['title'],
            'reason' => $r['reason'],
            'due_date' => $r['due_date'],
            'status' => $r['status'],
            'assigned_at' => $r['assigned_at'],
            'assigned_by' => $r['assigned_by_name'],
            'opened' => $r['opened_at'] !== null,
            'completed_at' => $r['completed_at'],
            'score' => $r['total_score'] !== null ? (int) $r['total_score'] : null,
            'severity' => $r['severity'],
            'flagged' => $r['alert_id'] !== null,
            'alert_id' => $r['alert_id'] !== null ? (int) $r['alert_id'] : null,
            'reviewed_at' => $r['reviewed_at'],
            'reviewed_by' => $r['reviewed_by_name'],
            'response_id' => $r['response_id'] !== null ? (int) $r['response_id'] : null,
            'cancel_reason' => $r['cancel_reason'],
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
     * What one patient answered, question by question. The labels come from the
     * questionnaire as it is now -- which is why the title is snapshotted on the
     * assignment and the answers are stored by key.
     */
    public static function show(int $assignmentId): ?array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT a.*, r.answers, r.submitted_at, q.questions, q.intro,
                    p.patient_no,
                    TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) AS patient_name,
                    NULLIF(TRIM(CONCAT(COALESCE(ae.first_name, ''), ' ', COALESCE(ae.last_name, ''))), '') AS assigned_by_name
             FROM portal_questionnaire_assignments a
             JOIN patients p ON p.id = a.patient_id
             LEFT JOIN portal_questionnaire_responses r ON r.id = a.response_id
             LEFT JOIN portal_questionnaires q ON q.id = a.questionnaire_id
             LEFT JOIN employees ae ON ae.user_id = a.assigned_by AND ae.deleted_at IS NULL
             WHERE a.id = :i AND a.deleted_at IS NULL"
        );
        $stmt->execute(['i' => $assignmentId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        $answers = json_decode((string) ($row['answers'] ?? ''), true);
        $answers = is_array($answers) ? $answers : [];
        $questions = self::questionsFor($row);
        $instrument = (string) $row['instrument'];
        $scored = isset(self::INSTRUMENTS[$instrument]);

        $items = [];

        foreach ($questions as $q) {
            $v = $answers[$q['key']] ?? null;

            if ($v === null || $v === '' || $v === []) {
                continue;
            }

            if ($q['type'] === 'scale') {
                $idx = (int) $v;
                $items[] = [
                    'label' => $q['label'],
                    'answer' => self::SCALE[$idx] ?? (string) $v,
                    'points' => $idx,
                ];
                continue;
            }

            $items[] = [
                'label' => $q['label'],
                'answer' => is_array($v) ? implode(', ', array_map('strval', $v)) : (string) $v,
                'points' => null,
            ];
        }

        $unanswered = [];

        foreach ($questions as $q) {
            $v = $answers[$q['key']] ?? null;

            if ($v === null || $v === '' || $v === []) {
                $unanswered[] = $q['label'];
            }
        }

        return [
            'id' => (int) $row['id'],
            'title' => $row['title'],
            'reason' => $row['reason'],
            'instrument' => $instrument,
            'scored' => $scored,
            'status' => $row['status'],
            'due_date' => $row['due_date'],
            'assigned_at' => $row['assigned_at'],
            'assigned_by' => $row['assigned_by_name'],
            'opened_at' => $row['opened_at'],
            'completed_at' => $row['completed_at'],
            'submitted_at' => $row['submitted_at'],
            'score' => $row['total_score'] !== null ? (int) $row['total_score'] : null,
            'max_score' => $scored ? self::INSTRUMENTS[$instrument]['max'] : null,
            'severity' => $row['severity'],
            'alert_id' => $row['alert_id'] !== null ? (int) $row['alert_id'] : null,
            'alerted_at' => $row['alerted_at'],
            'reviewed_at' => $row['reviewed_at'],
            'cancel_reason' => $row['cancel_reason'],
            'patient' => [
                'id' => (int) $row['patient_id'],
                'name' => $row['patient_name'],
                'mrn' => $row['patient_no'],
            ],
            'items' => $items,
            'unanswered' => $unanswered,
            'history' => $scored ? self::scoreHistory((int) $row['patient_id'], $instrument) : [],
        ];
    }

    /** Mark that a clinician has read it. Nothing clinical -- it clears the queue. */
    public static function markReviewed(int $assignmentId, int $actorId): array
    {
        $stmt = Database::connection()->prepare(
            "UPDATE portal_questionnaire_assignments
                SET reviewed_by = :by, reviewed_at = NOW()
              WHERE id = :i AND status = 'completed' AND reviewed_at IS NULL AND deleted_at IS NULL"
        );
        $stmt->execute(['by' => $actorId ?: null, 'i' => $assignmentId]);

        if ($stmt->rowCount() === 0) {
            return self::fail('That one is not waiting to be read.', true);
        }

        return ['success' => true, 'message' => 'Marked as read.', 'data' => ['id' => $assignmentId]];
    }

    /**
     * One timeline of a patient's scores for an instrument: what a clinician
     * recorded at a visit, and what the patient answered at home, each labelled
     * with where it came from.
     *
     * This exists because the two cannot live in one table. encounter_phq9 and
     * encounter_gad7 are keyed to an encounter, one row per encounter, and a
     * questionnaire answered at home has no encounter -- see the note in schema
     * 337. Merging on read is what makes the trend readable without either
     * overwriting an in-visit score or inventing a visit that never happened.
     */
    public static function scoreHistory(int $patientId, string $instrument): array
    {
        if (!isset(self::INSTRUMENTS[$instrument])) {
            return [];
        }

        $db = Database::connection();
        $table = $instrument === 'phq9' ? 'encounter_phq9' : 'encounter_gad7';
        $rows = [];

        try {
            $stmt = $db->prepare(
                "SELECT total_score, severity, COALESCE(updated_at, created_at) AS at, encounter_id
                 FROM {$table}
                 WHERE patient_id = :p AND deleted_at IS NULL
                 ORDER BY COALESCE(updated_at, created_at) DESC, id DESC
                 LIMIT 20"
            );
            $stmt->execute(['p' => $patientId]);

            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
                $rows[] = [
                    'source' => 'visit',
                    'source_text' => 'Recorded at a visit',
                    'score' => (int) $r['total_score'],
                    'severity' => $r['severity'],
                    'at' => $r['at'],
                    'encounter_id' => $r['encounter_id'] !== null ? (int) $r['encounter_id'] : null,
                ];
            }
        } catch (Throwable $e) {
            // A deployment without the instrument's table should still show the
            // home scores rather than nothing at all.
            error_log("score history from {$table} failed: " . $e->getMessage());
        }

        $stmt = $db->prepare(
            "SELECT id, total_score, severity, completed_at, alert_id
             FROM portal_questionnaire_assignments
             WHERE patient_id = :p AND instrument = :i AND status = 'completed'
               AND total_score IS NOT NULL AND deleted_at IS NULL
             ORDER BY completed_at DESC, id DESC
             LIMIT 20"
        );
        $stmt->execute(['p' => $patientId, 'i' => $instrument]);

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $rows[] = [
                'source' => 'home',
                'source_text' => 'Answered at home through My Chart',
                'score' => (int) $r['total_score'],
                'severity' => $r['severity'],
                'at' => $r['completed_at'],
                'assignment_id' => (int) $r['id'],
                'flagged' => $r['alert_id'] !== null,
            ];
        }

        usort($rows, static fn($a, $b) => strcmp((string) $b['at'], (string) $a['at']));

        return array_slice($rows, 0, 20);
    }

    // ------------------------------------------------------------------
    // Scoring and escalation
    // ------------------------------------------------------------------

    /** The instrument's own scoring, from the instrument's own service. */
    public static function score(string $instrument, array $answers): ?array
    {
        if ($instrument === 'phq9') {
            return Phq9Service::calculateScoreAndSeverity($answers);
        }

        if ($instrument === 'gad7') {
            return Gad7Service::calculateScoreAndSeverity($answers);
        }

        return null;
    }

    /**
     * Does this answer need somebody today, and how urgently? Returns null when
     * it does not.
     *
     * Item 9 of the PHQ-9 is checked on its own. A patient can answer "nearly
     * every day" to thoughts of being better off dead and still total under 15,
     * and that is the one case a threshold on the total must not be allowed to
     * swallow.
     */
    public static function urgencyFor(string $instrument, ?array $score, array $answers): ?string
    {
        $meta = self::INSTRUMENTS[$instrument] ?? null;

        if (!$meta || !$score) {
            return null;
        }

        $item = $meta['critical_item'];

        if ($item !== null && isset($answers[$item]) && (int) $answers[$item] >= 1) {
            return 'critical';
        }

        if ((int) ($score['total_score'] ?? 0) >= (int) $meta['urgent_at']) {
            return 'urgent';
        }

        return null;
    }

    /**
     * Tell the care team, through the same AlertService path a nurse keying the
     * score in would take. Returns whether anyone was told, because the patient
     * is given a different sentence when they were.
     */
    private static function escalate(
        int $patientId,
        int $assignmentId,
        array $row,
        ?array $score,
        array $answers,
        ?int $userId
    ): bool {
        $instrument = (string) $row['instrument'];
        $urgency = self::urgencyFor($instrument, $score, $answers);

        if ($urgency === null) {
            return false;
        }

        $meta = self::INSTRUMENTS[$instrument];
        $targets = PortalSelfReadingService::careTeamTargets($patientId);

        if (!$targets) {
            return false;
        }

        $body = [
            'The patient answered this at home through My Chart, between visits. It is self-reported.',
            '',
            $meta['label'] . ': ' . (int) $score['total_score'] . ' of ' . $meta['max'] . ' -- ' . $score['severity'],
        ];

        if ($urgency === 'critical' && $meta['critical_item'] !== null) {
            $idx = (int) ($answers[$meta['critical_item']] ?? 0);
            $body[] = '';
            $body[] = 'They answered "' . (self::SCALE[$idx] ?? $idx)
                . '" to thoughts of being better off dead or of hurting themselves.';
        }

        $body[] = '';
        $body[] = 'The patient has been told their care team was notified today. They have not been shown a score.';

        try {
            $res = AlertService::raise([
                'type' => 'patient_questionnaire',
                'urgency' => $urgency,
                'title' => $meta['label'] . ' ' . (int) $score['total_score']
                    . ' answered at home (' . $score['severity'] . ')',
                'body' => implode("\n", $body),
                'patient_id' => $patientId,
                'link' => ['patient_id' => $patientId, 'tab' => 'portal_questionnaires'],
                'targets' => $targets,
                'source_type' => 'portal_questionnaire_assignments',
                'source_id' => $assignmentId,
                'dedupe_key' => 'portal_questionnaire:' . $assignmentId,
            ], $userId);
        } catch (Throwable $e) {
            error_log('questionnaire escalation failed: ' . $e->getMessage());

            return false;
        }

        if (empty($res['success'])) {
            return false;
        }

        try {
            Database::connection()->prepare(
                "UPDATE portal_questionnaire_assignments SET alert_id = :a, alerted_at = NOW() WHERE id = :i"
            )->execute(['a' => $res['data']['id'] ?? null, 'i' => $assignmentId]);
        } catch (Throwable $e) {
            error_log('questionnaire alert stamp failed: ' . $e->getMessage());
        }

        return true;
    }

    // ------------------------------------------------------------------
    // Questions
    // ------------------------------------------------------------------

    /**
     * The questions of whatever this assignment row is for. A row that already
     * carries the questionnaire's `questions` column (every query here joins it)
     * costs no extra read.
     */
    public static function questionsFor(array $row): array
    {
        $instrument = (string) ($row['instrument'] ?? 'questionnaire');

        if (isset(self::INSTRUMENTS[$instrument])) {
            return self::instrumentQuestions($instrument);
        }

        $questions = $row['questions'] ?? null;

        if ($questions === null && !empty($row['questionnaire_id'])) {
            $stmt = Database::connection()->prepare("SELECT questions FROM portal_questionnaires WHERE id = :q");
            $stmt->execute(['q' => (int) $row['questionnaire_id']]);
            $fetched = $stmt->fetchColumn();
            $questions = $fetched !== false ? $fetched : null;
        }

        $decoded = json_decode((string) $questions, true);

        if (!is_array($decoded)) {
            return [];
        }

        $out = [];

        foreach ($decoded as $q) {
            // A question with no key has nowhere to store its answer.
            if (!is_array($q) || empty($q['key'])) {
                continue;
            }

            $out[] = [
                'key' => (string) $q['key'],
                'label' => (string) ($q['label'] ?? $q['key']),
                'type' => (string) ($q['type'] ?? 'text'),
                'options' => array_values(array_map('strval', (array) ($q['options'] ?? []))),
                'required' => !empty($q['required']),
            ];
        }

        return $out;
    }

    /** PHQ-9 and GAD-7, built from the services the clinical screens use. */
    public static function instrumentQuestions(string $instrument): array
    {
        $map = match ($instrument) {
            'phq9' => Phq9Service::QUESTIONS,
            'gad7' => Gad7Service::QUESTIONS,
            default => [],
        };

        $out = [];

        foreach ($map as $key => $label) {
            $out[] = [
                'key' => $key,
                'label' => $label,
                'type' => 'scale',
                'options' => self::SCALE,
                'required' => true,
            ];
        }

        return $out;
    }

    private static function introFor(array $row): ?string
    {
        $instrument = (string) ($row['instrument'] ?? 'questionnaire');

        if (isset(self::INSTRUMENTS[$instrument])) {
            return self::INSTRUMENTS[$instrument]['intro'];
        }

        if (isset($row['intro']) && $row['intro'] !== null && $row['intro'] !== '') {
            return (string) $row['intro'];
        }

        return null;
    }

    /** The form registry row to stamp on the response, where there is one. */
    private static function formDefinitionFor(array $row): ?int
    {
        if (empty($row['questionnaire_id'])) {
            return null;
        }

        $stmt = Database::connection()->prepare(
            "SELECT form_definition_id FROM portal_questionnaires WHERE id = :q"
        );
        $stmt->execute(['q' => (int) $row['questionnaire_id']]);
        $id = $stmt->fetchColumn();

        return ($id === false || $id === null) ? null : (int) $id;
    }

    /**
     * Keep what this questionnaire asked and nothing else, and refuse what is
     * missing or out of range.
     *
     * @return array{0: array<string, mixed>, 1: array<string, string>}
     */
    private static function validate(array $questions, array $answers): array
    {
        $clean = [];
        $errors = [];

        foreach ($questions as $q) {
            $key = $q['key'];
            $given = $answers[$key] ?? null;
            $type = $q['type'];

            if ($type === 'scale') {
                if ($given === null || $given === '' || is_array($given)) {
                    if ($q['required']) {
                        $errors["answers.{$key}"] = 'This one is needed.';
                    }

                    continue;
                }

                if (!is_numeric($given) || (int) $given < 0 || (int) $given > count(self::SCALE) - 1) {
                    $errors["answers.{$key}"] = 'Choose one of the answers offered.';

                    continue;
                }

                $clean[$key] = (int) $given;

                continue;
            }

            if ($type === 'checkboxes') {
                $list = array_values(array_filter(
                    array_map('strval', (array) ($given ?? [])),
                    static fn($v) => $v !== ''
                ));

                if (!$list) {
                    if ($q['required']) {
                        $errors["answers.{$key}"] = 'This one is needed.';
                    }

                    continue;
                }

                if ($q['options']) {
                    $list = array_values(array_intersect($list, $q['options']));

                    if (!$list) {
                        $errors["answers.{$key}"] = 'Choose from the answers offered.';

                        continue;
                    }
                }

                $clean[$key] = $list;

                continue;
            }

            $value = is_array($given) ? '' : trim((string) ($given ?? ''));

            if ($value === '') {
                if ($q['required']) {
                    $errors["answers.{$key}"] = 'This one is needed.';
                }

                continue;
            }

            if ($type === 'choice' || $type === 'yesno') {
                $allowed = $type === 'yesno' ? ['Yes', 'No'] : $q['options'];

                if ($allowed && !in_array($value, $allowed, true)) {
                    $errors["answers.{$key}"] = 'Choose one of the answers offered.';

                    continue;
                }
            }

            $clean[$key] = mb_substr($value, 0, 2000);
        }

        return [$clean, $errors];
    }

    // ------------------------------------------------------------------
    // Small helpers
    // ------------------------------------------------------------------

    /** One assignment, only if it is this patient's. */
    private static function own(int $patientId, int $assignmentId): ?array
    {
        $stmt = Database::connection()->prepare(
            "SELECT a.*, q.questions, q.intro
             FROM portal_questionnaire_assignments a
             LEFT JOIN portal_questionnaires q ON q.id = a.questionnaire_id
             WHERE a.id = :i AND a.patient_id = :p AND a.deleted_at IS NULL AND a.status <> 'cancelled'"
        );
        $stmt->execute(['i' => $assignmentId, 'p' => $patientId]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /** Past the due date plus the grace period the hospital allows. */
    public static function closed(?string $dueDate, string $today, int $graceDays): bool
    {
        if ($dueDate === null || $dueDate === '') {
            return false;
        }

        return strtotime($dueDate . ' +' . $graceDays . ' days') < strtotime($today);
    }

    private static function counts(PDO $db): array
    {
        try {
            $row = $db->query(
                "SELECT
                    SUM(status = 'completed' AND reviewed_at IS NULL) AS answered,
                    SUM(status = 'pending') AS pending,
                    SUM(status = 'pending' AND due_date IS NOT NULL AND due_date < CURDATE()) AS overdue,
                    SUM(status = 'completed' AND alert_id IS NOT NULL) AS flagged
                 FROM portal_questionnaire_assignments WHERE deleted_at IS NULL"
            )->fetch(PDO::FETCH_ASSOC);
        } catch (Throwable $e) {
            $row = null;
        }

        $row = is_array($row) ? $row : [];

        return [
            'answered' => (int) ($row['answered'] ?? 0),
            'pending' => (int) ($row['pending'] ?? 0),
            'overdue' => (int) ($row['overdue'] ?? 0),
            'flagged' => (int) ($row['flagged'] ?? 0),
        ];
    }

    private static function settings(): array
    {
        try {
            $row = Database::connection()->query(
                "SELECT portal_allow_questionnaires, portal_questionnaire_grace_days
                 FROM general_settings ORDER BY id LIMIT 1"
            )->fetch(PDO::FETCH_ASSOC);
        } catch (Throwable $e) {
            $row = null;
        }

        $row = is_array($row) ? $row : [];
        $grace = (int) ($row['portal_questionnaire_grace_days'] ?? self::DEFAULT_GRACE_DAYS);

        return [
            'allow' => (int) ($row['portal_allow_questionnaires'] ?? 1) === 1,
            'grace_days' => ($grace >= 0 && $grace <= 180) ? $grace : self::DEFAULT_GRACE_DAYS,
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
