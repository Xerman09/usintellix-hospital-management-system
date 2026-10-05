<?php

namespace App\Modules\SurgeryRequests\Services;

use App\Core\Database;
use App\Modules\Providers\Services\ProviderService;
use App\Modules\Specializations\Services\SpecializationService;
use App\Modules\Surgeries\Services\SurgeryService;
use PDO;
use Throwable;

/**
 * Surgery requests: a doctor asks for a surgery from the patient's chart
 * (or a visit), then the team gets the patient ready for it.
 *
 *   * create() / update() -- specialization, surgery type (filtered to it)
 *     or a procedure not in the catalog, side, ICD-10 diagnosis, surgeon
 *     (doctors of that specialization; anyone else needs a reason),
 *     priority, preferred date, expected duration and anesthesia
 *   * saveCheck() -- the pre-op readiness checklist (CHECK_ITEMS): each
 *     item done or not needed, with its details, who confirmed it, when
 *   * status follows the checklist: requested (nothing confirmed) ->
 *     planning (some) -> ready (every required item). An Emergency can be
 *     made ready early with a reason (readyOverride). Phase 3 books ready
 *     requests into the OR (scheduled). cancel() stops a request.
 *
 * Which items are required depends on the request: anesthesia clearance
 * unless local anesthesia, blood when the surgery usually needs it,
 * implants likewise, site marking when a side is given.
 */
class SurgeryRequestService
{
    public const VIEW_ROLES = ['admin', 'receptionist', 'doctor'];

    /** Who can request surgery and change or cancel a request. */
    public const REQUEST_ROLES = ['admin', 'doctor'];

    public const PRIORITIES = ['Elective', 'Urgent', 'Emergency / STAT'];

    public const STATUS_LABELS = [
        'requested' => 'Requested', 'planning' => 'Planning', 'ready' => 'Ready for scheduling',
        'scheduled' => 'Scheduled', 'cancelled' => 'Cancelled'
    ];

    public const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

    public const CONSENT_RELATIONSHIPS = ['Self', 'Parent', 'Spouse', 'Child', 'Sibling', 'Guardian', 'Other'];

    /**
     * The readiness checklist. required: always | anesthesia (not local) |
     * blood | implants | side | optional. can_skip: may be marked "not
     * needed" (with a note). fields: details recorded with it.
     */
    public const CHECK_ITEMS = [
        'medical_clearance' => ['label' => 'Medical / cardio clearance', 'hint' => 'Internist or cardiologist cleared the patient for surgery.',
            'required' => 'always', 'can_skip' => true, 'fields' => ['cleared_by' => 'Cleared by']],
        'anesthesia_clearance' => ['label' => 'Anesthesia clearance', 'hint' => 'Pre-anesthesia evaluation done.',
            'required' => 'anesthesia', 'can_skip' => true, 'fields' => ['cleared_by' => 'Evaluated by']],
        'labs' => ['label' => 'Laboratory tests', 'hint' => 'e.g. CBC, PT/PTT, creatinine, blood sugar — results reviewed.',
            'required' => 'always', 'can_skip' => true, 'fields' => ['tests' => 'Tests done']],
        'imaging' => ['label' => 'Imaging and ECG', 'hint' => 'e.g. chest X-ray, ultrasound, ECG — results available.',
            'required' => 'optional', 'can_skip' => true, 'fields' => ['tests' => 'Studies done']],
        'consent' => ['label' => 'Informed consent signed', 'hint' => 'Surgery and anesthesia explained; consent form signed.',
            'required' => 'always', 'can_skip' => false, 'fields' => ['signed_by' => 'Signed by', 'relationship' => 'Relationship', 'signed_date' => 'Date signed']],
        'blood' => ['label' => 'Blood typing / crossmatch', 'hint' => 'Blood type known; units crossmatched and reserved.',
            'required' => 'blood', 'can_skip' => true, 'fields' => ['blood_type' => 'Blood type', 'units' => 'Units crossmatched']],
        'implants' => ['label' => 'Implants arranged', 'hint' => 'Implants / hardware ordered and available.',
            'required' => 'implants', 'can_skip' => true, 'fields' => ['details' => 'Implants']],
        'npo' => ['label' => 'NPO instructions given', 'hint' => 'Patient told when to stop eating and drinking.',
            'required' => 'always', 'can_skip' => true, 'fields' => ['npo_from' => 'Nothing by mouth from']],
        'site_marking' => ['label' => 'Surgical site marked', 'hint' => 'The surgeon marked the site / side.',
            'required' => 'side', 'can_skip' => true, 'fields' => []],
        'allergies' => ['label' => 'Allergies reviewed', 'hint' => 'Allergies checked against the chart and confirmed with the patient.',
            'required' => 'always', 'can_skip' => false, 'fields' => []]
    ];

    /* ---------------------------------------------------------------
     * Reading
     * ------------------------------------------------------------- */

    /** Worklist. Filters: view (open | ready | scheduled | cancelled | all), specialization_id?, q? */
    public function list(array $filters): array
    {
        $db = Database::connection();
        $view = $filters['view'] ?? 'open';
        $where = ['1 = 1'];
        $params = [];

        $statuses = ['open' => ['requested', 'planning'], 'ready' => ['ready'], 'scheduled' => ['scheduled'], 'cancelled' => ['cancelled']];
        if (isset($statuses[$view])) {
            $where[] = "r.status IN ('" . implode("','", $statuses[$view]) . "')";
        } else {
            $view = 'all';
        }
        if (!empty($filters['specialization_id'])) {
            $where[] = 'r.specialization_id = :spec';
            $params['spec'] = (int) $filters['specialization_id'];
        }
        if (!empty($filters['patient_id'])) {
            $where[] = 'r.patient_id = :patient';
            $params['patient'] = (int) $filters['patient_id'];
        }
        $q = trim((string) ($filters['q'] ?? ''));
        if ($q !== '') {
            $like = '%' . addcslashes($q, '%_\\') . '%';
            $where[] = "(r.request_number LIKE :q1 OR r.procedure_name LIKE :q2 OR pt.patient_no LIKE :q3
                         OR CONCAT_WS(' ', pt.first_name, pt.middle_name, pt.last_name) LIKE :q4 OR CONCAT_WS(' ', pt.last_name, pt.first_name) LIKE :q5)";
            $params += ['q1' => $like, 'q2' => $like, 'q3' => $like, 'q4' => $like, 'q5' => $like];
        }

        // Emergencies first, then urgent; then by preferred date, oldest request first.
        $stmt = $db->prepare(
            "SELECT r.*, " . self::rowSql() . "
             FROM surgery_requests r
             JOIN patients pt ON pt.id = r.patient_id
             LEFT JOIN specializations s ON s.id = r.specialization_id
             WHERE " . implode(' AND ', $where) . "
             ORDER BY FIELD(r.priority, 'Emergency / STAT', 'Urgent', 'Elective'), r.preferred_date IS NULL, r.preferred_date, r.created_at
             LIMIT 500"
        );
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $checks = $this->checksFor(array_column($rows, 'id'));

        $counts = $db->query(
            "SELECT SUM(status IN ('requested', 'planning')) AS open_count, SUM(status = 'ready') AS ready, SUM(status = 'scheduled') AS scheduled
             FROM surgery_requests"
        )->fetch(PDO::FETCH_ASSOC);

        return [
            'view' => $view,
            'counts' => ['open' => (int) $counts['open_count'], 'ready' => (int) $counts['ready'], 'scheduled' => (int) $counts['scheduled']],
            'rows' => array_map(fn($r) => $this->summary($r, $checks[(int) $r['id']] ?? []), $rows)
        ];
    }

    /** One request with its checklist, the patient's allergies and history. */
    public function get(int $id, ?int $viewerId = null): ?array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT r.*, " . self::rowSql() . ",
                    pt.birthdate, pt.sex,
                    e.date_of_service AS encounter_date,
                    " . self::userNameSql('r.ready_override_by') . " AS ready_override_by_name,
                    " . self::userNameSql('r.cancelled_by') . " AS cancelled_by_name,
                    su.requires_laterality, su.usually_needs_blood, su.usually_needs_implants, su.code AS surgery_code, su.category AS surgery_category
             FROM surgery_requests r
             JOIN patients pt ON pt.id = r.patient_id
             LEFT JOIN specializations s ON s.id = r.specialization_id
             LEFT JOIN surgeries su ON su.id = r.surgery_id
             LEFT JOIN encounters e ON e.id = r.encounter_id
             WHERE r.id = :id"
        );
        $stmt->execute(['id' => $id]);
        $r = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$r) {
            return null;
        }

        $checks = $this->checksFor([$id])[$id] ?? [];
        $required = self::requiredItems($r);
        $items = [];
        foreach (self::CHECK_ITEMS as $key => $def) {
            $c = $checks[$key] ?? null;
            $items[] = [
                'key' => $key, 'label' => $def['label'], 'hint' => $def['hint'], 'required' => $required[$key], 'can_skip' => $def['can_skip'],
                'fields' => array_map(fn($k, $v) => ['key' => $k, 'label' => $v], array_keys($def['fields']), $def['fields']),
                'status' => $c['status'] ?? 'pending', 'details' => $c['details'] ?? [], 'notes' => $c['notes'] ?? null,
                'confirmed_by_name' => $c['confirmed_by_name'] ?? null, 'confirmed_at' => $c['confirmed_at'] ?? null
            ];
        }

        $allergies = $db->prepare(
            "SELECT COALESCE(a.name, pa.coding) AS name, pa.reaction, pa.severity
             FROM patient_allergies pa LEFT JOIN allergies a ON a.id = pa.allergy_id
             WHERE pa.patient_id = :p AND pa.deleted_at IS NULL AND (pa.end_date IS NULL OR pa.end_date >= CURDATE())
             ORDER BY pa.id"
        );
        $allergies->execute(['p' => $r['patient_id']]);

        $open = in_array($r['status'], ['requested', 'planning', 'ready'], true);

        return $this->summary($r, $checks) + [
            'patient_sex' => $r['sex'],
            'patient_age' => $r['birthdate'] ? (new \DateTime($r['birthdate']))->diff(new \DateTime())->y : null,
            'encounter_id' => $r['encounter_id'] !== null ? (int) $r['encounter_id'] : null,
            'encounter_date' => $r['encounter_date'],
            'surgery_code' => $r['surgery_code'],
            'surgery_category' => $r['surgery_category'],
            'surgeon_override_reason' => $r['surgeon_override_reason'],
            'diagnosis_code' => $r['diagnosis_code'],
            'diagnosis_text' => $r['diagnosis_text'],
            'estimated_duration_minutes' => (int) $r['estimated_duration_minutes'],
            'anesthesia_type' => $r['anesthesia_type'],
            'notes' => $r['notes'],
            'ready_at' => $r['ready_at'],
            'ready_override_reason' => $r['ready_override_reason'],
            'ready_override_by_name' => $r['ready_override_by_name'],
            'cancelled_at' => $r['cancelled_at'],
            'cancelled_by_name' => $r['cancelled_by_name'],
            'cancel_reason' => $r['cancel_reason'],
            'checklist' => $items,
            'allergies' => $allergies->fetchAll(PDO::FETCH_ASSOC),
            'can_edit' => $open,
            'can_check' => $open,
            'can_override' => $open && $r['status'] !== 'ready' && $r['priority'] === 'Emergency / STAT',
            'version' => (int) $r['revision']
        ];
    }

    /** The patient chart's Surgeries widget: requests, OR cases and past surgeries. */
    public function patientSummary(int $patientId): array
    {
        $db = Database::connection();
        $requests = $this->list(['view' => 'all', 'patient_id' => $patientId])['rows'];

        $stmt = $db->prepare(
            "SELECT id, case_number, surgery_request_id, procedure_name, laterality, surgical_specialty, scheduled_date, scheduled_start_time,
                    or_suite_name, lead_surgeon, perioperative_stage, case_priority
             FROM or_surgical_cases WHERE patient_id = :p ORDER BY scheduled_date DESC, scheduled_start_time DESC LIMIT 50"
        );
        $stmt->execute(['p' => $patientId]);
        $cases = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmt = $db->prepare(
            "SELECT id, title, begin_date, outcome, comments, or_case_id FROM patient_surgeries
             WHERE patient_id = :p AND deleted_at IS NULL ORDER BY begin_date IS NULL, begin_date DESC, id DESC LIMIT 50"
        );
        $stmt->execute(['p' => $patientId]);

        return [
            'requests' => $requests,
            'cases' => array_map(fn($c) => [
                'id' => (int) $c['id'], 'case_number' => $c['case_number'],
                'surgery_request_id' => $c['surgery_request_id'] !== null ? (int) $c['surgery_request_id'] : null,
                'procedure_name' => $c['procedure_name'], 'laterality' => $c['laterality'], 'specialization' => $c['surgical_specialty'],
                'scheduled_date' => $c['scheduled_date'], 'scheduled_start_time' => $c['scheduled_start_time'], 'suite' => $c['or_suite_name'],
                'surgeon' => $c['lead_surgeon'], 'stage' => $c['perioperative_stage'], 'priority' => $c['case_priority']
            ], $cases),
            'history' => $stmt->fetchAll(PDO::FETCH_ASSOC)
        ];
    }

    /** For the request form: specializations, surgeries, doctors, the patient's visits, the default surgeon. */
    public function formOptions(int $patientId, array $user): array
    {
        $db = Database::connection();
        $doctors = $db->query(
            "SELECT p.id AS provider_id, e.user_id, e.first_name, e.last_name, e.suffix
             FROM providers p JOIN employees e ON e.id = p.employee_id AND e.deleted_at IS NULL
             WHERE p.deleted_at IS NULL ORDER BY e.last_name, e.first_name"
        )->fetchAll(PDO::FETCH_ASSOC);
        $specs = ProviderService::specializationsOf(array_column($doctors, 'provider_id'));

        $stmt = $db->prepare(
            "SELECT id, date_of_service, reason_for_visit FROM encounters
             WHERE patient_id = :p AND deleted_at IS NULL ORDER BY date_of_service DESC LIMIT 20"
        );
        $stmt->execute(['p' => $patientId]);

        $doctorList = array_map(function ($d) use ($specs) {
            $mine = $specs[(int) $d['provider_id']] ?? [];
            return ['user_id' => (int) $d['user_id'], 'name' => self::personName($d),
                'specialization_ids' => array_map(fn($s) => $s['id'], $mine), 'specializations' => array_map(fn($s) => $s['name'], $mine)];
        }, $doctors);

        return [
            'specializations' => (new SpecializationService())->list(),
            'surgeries' => (new SurgeryService())->list(),
            'doctors' => $doctorList,
            'encounters' => $stmt->fetchAll(PDO::FETCH_ASSOC),
            // The requesting doctor is the default surgeon when they qualify (the form checks the specialization).
            'current_user_id' => (int) $user['id'],
            'current_user_is_doctor' => in_array((int) $user['id'], array_column($doctorList, 'user_id'), true),
            'priorities' => self::PRIORITIES,
            'lateralities' => ['Left', 'Right', 'Bilateral'],
            'anesthesia_types' => array_map(fn($k, $v) => ['value' => $k, 'label' => $v], array_keys(SurgeryService::ANESTHESIA_TYPES), SurgeryService::ANESTHESIA_TYPES),
            'blood_types' => self::BLOOD_TYPES,
            'relationships' => self::CONSENT_RELATIONSHIPS
        ];
    }

    /* ---------------------------------------------------------------
     * Writing
     * ------------------------------------------------------------- */

    /** data: patient_id, encounter_id?, specialization_id, surgery_id? | procedure_name, laterality?, diagnosis_code?, diagnosis_text?,
     *  surgeon_user_id, surgeon_override_reason?, priority, preferred_date?, estimated_duration_minutes?, anesthesia_type?, notes? */
    public function create(array $data, array $user): array
    {
        $db = Database::connection();
        $patientId = (int) ($data['patient_id'] ?? 0);
        $stmt = $db->prepare("SELECT id FROM patients WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute(['id' => $patientId]);
        if (!$stmt->fetchColumn()) {
            return ['success' => false, 'message' => 'Patient not found.', 'not_found' => true];
        }

        [$values, $errors] = $this->validate($data, $patientId);
        if ($errors) {
            return ['success' => false, 'message' => 'Check the highlighted fields.', 'errors' => $errors];
        }

        $owns = $this->begin($db);
        try {
            $now = date('Y-m-d H:i:s');
            $values += ['request_number' => 'NEW-' . bin2hex(random_bytes(8)), 'patient_id' => $patientId, 'requested_by' => (int) $user['id'],
                'status' => 'requested', 'created_at' => $now, 'created_by' => (int) $user['id']];
            $cols = array_keys($values);
            $db->prepare("INSERT INTO surgery_requests (" . implode(', ', $cols) . ") VALUES (:" . implode(', :', $cols) . ")")->execute($values);
            $id = (int) $db->lastInsertId();
            $number = 'SR-' . date('Y') . '-' . str_pad((string) $id, 5, '0', STR_PAD_LEFT);
            $db->prepare("UPDATE surgery_requests SET request_number = :n WHERE id = :id")->execute(['n' => $number, 'id' => $id]);
            $this->commit($db, $owns);
        } catch (Throwable $e) {
            $this->rollBack($db, $owns);
            throw $e;
        }

        return ['success' => true, 'message' => "Surgery requested ({$number}). Work through the readiness checklist next.", 'data' => ['id' => $id, 'request_number' => $number]];
    }

    /** Same data as create(), plus version. Not once scheduled or cancelled. */
    public function update(int $id, array $data, array $user): array
    {
        $db = Database::connection();
        $owns = $this->begin($db);
        try {
            $r = $this->lock($id);
            $fail = function (string $message, array $extra = []) use ($db, $owns) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => $message] + $extra;
            };
            if (!$r) {
                return $fail('Surgery request not found.', ['not_found' => true]);
            }
            if (!in_array($r['status'], ['requested', 'planning', 'ready'], true)) {
                return $fail("This request is {$r['status']} and can no longer be changed.");
            }
            if (isset($data['version']) && (int) $data['version'] !== (int) $r['revision']) {
                return $fail('Someone else changed this request since you opened it. Reload it and try again.', ['stale' => true]);
            }

            [$values, $errors] = $this->validate($data, (int) $r['patient_id']);
            if ($errors) {
                return $fail('Check the highlighted fields.', ['errors' => $errors]);
            }

            $values += ['updated_at' => date('Y-m-d H:i:s'), 'updated_by' => (int) $user['id']];
            $set = implode(', ', array_map(fn($k) => "{$k} = :{$k}", array_keys($values)));
            $db->prepare("UPDATE surgery_requests SET {$set}, revision = revision + 1 WHERE id = :id")->execute($values + ['id' => $id]);
            // Changing the surgery, side or anesthesia changes what's required.
            $this->refreshStatus($id);
            $this->commit($db, $owns);
        } catch (Throwable $e) {
            $this->rollBack($db, $owns);
            throw $e;
        }

        return ['success' => true, 'message' => 'Surgery request updated.'];
    }

    /**
     * One checklist item. data: request_id, item_key, status (done |
     * not_needed | pending to undo), details {field: value}, notes?
     * "Not needed" needs a note saying why.
     */
    public function saveCheck(array $data, array $user): array
    {
        $key = (string) ($data['item_key'] ?? '');
        $def = self::CHECK_ITEMS[$key] ?? null;
        $status = (string) ($data['status'] ?? '');
        $notes = ($n = trim((string) ($data['notes'] ?? ''))) === '' ? null : mb_substr($n, 0, 500);

        if (!$def) {
            return ['success' => false, 'message' => 'Unknown checklist item.'];
        }
        if (!in_array($status, ['done', 'not_needed', 'pending'], true)) {
            return ['success' => false, 'message' => 'Choose done or not needed.'];
        }
        if ($status === 'not_needed' && !$def['can_skip']) {
            return ['success' => false, 'message' => "{$def['label']} can't be skipped.", 'errors' => ['status' => 'This item must be done.']];
        }
        if ($status === 'not_needed' && $notes === null) {
            return ['success' => false, 'message' => 'Say why it isn\'t needed.', 'errors' => ['notes' => 'Say why it isn\'t needed.']];
        }

        // Details: only this item's fields, checked where they have rules.
        $raw = is_array($data['details'] ?? null) ? $data['details'] : [];
        $details = [];
        $errors = [];
        if ($status === 'done') {
            foreach (array_keys($def['fields']) as $field) {
                $value = trim((string) ($raw[$field] ?? ''));
                if ($value !== '') {
                    $details[$field] = mb_substr($value, 0, 255);
                }
            }
            if ($key === 'consent') {
                if (empty($details['signed_by'])) {
                    $errors['signed_by'] = 'Enter who signed the consent.';
                }
                if (!empty($details['relationship']) && !in_array($details['relationship'], self::CONSENT_RELATIONSHIPS, true)) {
                    $errors['relationship'] = 'Choose the relationship from the list.';
                }
                if (!empty($details['signed_date']) && (!($d = \DateTime::createFromFormat('Y-m-d', $details['signed_date'])) || $d->format('Y-m-d') !== $details['signed_date'] || $details['signed_date'] > date('Y-m-d'))) {
                    $errors['signed_date'] = 'Enter the date it was signed (not in the future).';
                }
            }
            if ($key === 'blood') {
                if (empty($details['blood_type']) || !in_array($details['blood_type'], self::BLOOD_TYPES, true)) {
                    $errors['blood_type'] = 'Choose the blood type.';
                }
                if (isset($details['units']) && (filter_var($details['units'], FILTER_VALIDATE_INT) === false || (int) $details['units'] < 0 || (int) $details['units'] > 50)) {
                    $errors['units'] = 'Enter the number of units (0 to 50).';
                }
            }
        }
        if ($errors) {
            return ['success' => false, 'message' => 'Check the highlighted fields.', 'errors' => $errors];
        }

        $db = Database::connection();
        $owns = $this->begin($db);
        try {
            $r = $this->lock((int) ($data['request_id'] ?? 0));
            if (!$r) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => 'Surgery request not found.', 'not_found' => true];
            }
            if (!in_array($r['status'], ['requested', 'planning', 'ready'], true)) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => "This request is {$r['status']}; its checklist is closed."];
            }

            if ($status === 'pending') {
                $db->prepare("DELETE FROM surgery_request_checks WHERE request_id = :r AND item_key = :k")->execute(['r' => $r['id'], 'k' => $key]);
            } else {
                $db->prepare(
                    "INSERT INTO surgery_request_checks (request_id, item_key, status, details, notes, confirmed_by, confirmed_at)
                     VALUES (:r, :k, :s, :d, :n, :u, :now)
                     ON DUPLICATE KEY UPDATE status = VALUES(status), details = VALUES(details), notes = VALUES(notes),
                                             confirmed_by = VALUES(confirmed_by), confirmed_at = VALUES(confirmed_at)"
                )->execute(['r' => $r['id'], 'k' => $key, 's' => $status, 'd' => $details ? json_encode($details) : null, 'n' => $notes,
                    'u' => (int) $user['id'], 'now' => date('Y-m-d H:i:s')]);
            }
            $db->prepare("UPDATE surgery_requests SET revision = revision + 1 WHERE id = :id")->execute(['id' => $r['id']]);
            $newStatus = $this->refreshStatus((int) $r['id']);
            $this->commit($db, $owns);
        } catch (Throwable $e) {
            $this->rollBack($db, $owns);
            throw $e;
        }

        $message = $status === 'pending' ? "{$def['label']}: undone." : "{$def['label']}: " . ($status === 'done' ? 'done.' : 'not needed.');
        if ($newStatus === 'ready' && $r['status'] !== 'ready') {
            $message .= ' Every required item is done — the request is ready for scheduling.';
        }

        return ['success' => true, 'message' => $message, 'data' => ['status' => $newStatus]];
    }

    /** An Emergency goes to scheduling before every check is done. */
    public function readyOverride(int $id, string $reason, array $user): array
    {
        $reason = trim($reason);
        if ($reason === '') {
            return ['success' => false, 'message' => 'Say why it can\'t wait for the checklist.', 'errors' => ['reason' => 'Enter a reason.']];
        }

        $db = Database::connection();
        $owns = $this->begin($db);
        try {
            $r = $this->lock($id);
            if (!$r) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => 'Surgery request not found.', 'not_found' => true];
            }
            if ($r['priority'] !== 'Emergency / STAT') {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => 'Only an Emergency can skip the checklist. Finish the required items.'];
            }
            if (!in_array($r['status'], ['requested', 'planning'], true)) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => $r['status'] === 'ready' ? 'It is already ready for scheduling.' : "This request is {$r['status']}."];
            }

            $db->prepare(
                "UPDATE surgery_requests SET status = 'ready', ready_at = :now, ready_override_reason = :reason, ready_override_by = :u, revision = revision + 1
                 WHERE id = :id"
            )->execute(['now' => date('Y-m-d H:i:s'), 'reason' => mb_substr($reason, 0, 255), 'u' => (int) $user['id'], 'id' => $id]);
            $this->commit($db, $owns);
        } catch (Throwable $e) {
            $this->rollBack($db, $owns);
            throw $e;
        }

        return ['success' => true, 'message' => "{$r['request_number']} is ready for scheduling (emergency). The unfinished items stay on the checklist."];
    }

    public function cancel(int $id, string $reason, array $user): array
    {
        $reason = trim($reason);
        if ($reason === '') {
            return ['success' => false, 'message' => 'Enter why the request is cancelled.', 'errors' => ['reason' => 'Enter a reason.']];
        }

        $db = Database::connection();
        $owns = $this->begin($db);
        try {
            $r = $this->lock($id);
            if (!$r) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => 'Surgery request not found.', 'not_found' => true];
            }
            if (!in_array($r['status'], ['requested', 'planning', 'ready'], true)) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => $r['status'] === 'scheduled'
                    ? 'This request is already booked in the OR. Cancel the OR case instead.' : 'This request was already cancelled.'];
            }

            $db->prepare(
                "UPDATE surgery_requests SET status = 'cancelled', cancelled_at = :now, cancelled_by = :u, cancel_reason = :reason, revision = revision + 1
                 WHERE id = :id"
            )->execute(['now' => date('Y-m-d H:i:s'), 'u' => (int) $user['id'], 'reason' => mb_substr($reason, 0, 500), 'id' => $id]);
            $this->commit($db, $owns);
        } catch (Throwable $e) {
            $this->rollBack($db, $owns);
            throw $e;
        }

        return ['success' => true, 'message' => "{$r['request_number']} cancelled."];
    }

    /**
     * requested / planning / ready from the checklist. Scheduled and
     * cancelled stay; an emergency made ready by override stays ready.
     */
    public function refreshStatus(int $id): string
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT r.*, su.requires_laterality, su.usually_needs_blood, su.usually_needs_implants
             FROM surgery_requests r LEFT JOIN surgeries su ON su.id = r.surgery_id WHERE r.id = :id"
        );
        $stmt->execute(['id' => $id]);
        $r = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$r || in_array($r['status'], ['scheduled', 'cancelled'], true)) {
            return $r['status'] ?? 'missing';
        }
        if ($r['status'] === 'ready' && $r['ready_override_reason'] !== null) {
            return 'ready';
        }

        $checks = $this->checksFor([$id])[$id] ?? [];
        $missing = array_filter(self::requiredItems($r), fn($req, $key) => $req && !isset($checks[$key]), ARRAY_FILTER_USE_BOTH);
        $status = !$missing ? 'ready' : ($checks ? 'planning' : 'requested');

        if ($status !== $r['status']) {
            $db->prepare("UPDATE surgery_requests SET status = :s, ready_at = :at WHERE id = :id")
                ->execute(['s' => $status, 'at' => $status === 'ready' ? date('Y-m-d H:i:s') : null, 'id' => $id]);
        }

        return $status;
    }

    /* ---------------------------------------------------------------
     * Helpers
     * ------------------------------------------------------------- */

    /** item key => required? for this request. */
    public static function requiredItems(array $r): array
    {
        $out = [];
        foreach (self::CHECK_ITEMS as $key => $def) {
            $out[$key] = match ($def['required']) {
                'always' => true,
                'anesthesia' => ($r['anesthesia_type'] ?? null) !== 'Local',
                'blood' => (bool) ($r['usually_needs_blood'] ?? false),
                'implants' => (bool) ($r['usually_needs_implants'] ?? false),
                'side' => !empty($r['laterality']),
                default => false
            };
        }
        return $out;
    }

    /** [values, errors] for create / update. */
    private function validate(array $data, int $patientId): array
    {
        $db = Database::connection();
        $errors = [];
        $text = fn($key, $max = 255) => ($v = trim((string) ($data[$key] ?? ''))) === '' ? null : mb_substr($v, 0, $max);

        $surgery = null;
        if (!empty($data['surgery_id'])) {
            $surgery = (new SurgeryService())->get((int) $data['surgery_id']);
            if (!$surgery || !$surgery['is_active']) {
                $errors['surgery_id'] = 'Choose a surgery from the list.';
                $surgery = null;
            }
        }
        $specId = (int) ($data['specialization_id'] ?? 0) ?: (int) ($surgery['specialization_id'] ?? 0);
        $spec = $specId ? (SpecializationService::byId([$specId])[$specId] ?? null) : null;
        if (!$spec) {
            $errors['specialization_id'] = 'Choose the specialization.';
        } elseif ($surgery && $surgery['specialization_id'] && (int) $surgery['specialization_id'] !== (int) $spec['id']) {
            $errors['surgery_id'] = "{$surgery['name']} is a {$surgery['specialization_name']} surgery. Choose that specialization or another surgery.";
        }

        $procedure = $surgery['name'] ?? $text('procedure_name');
        if ($procedure === null && !isset($errors['surgery_id'])) {
            $errors['surgery_id'] = 'Choose the surgery, or type the procedure if it isn\'t in the list.';
        }

        $laterality = $text('laterality', 20);
        if ($laterality !== null && !in_array($laterality, ['Left', 'Right', 'Bilateral'], true)) {
            $errors['laterality'] = 'Choose Left, Right or Bilateral.';
        } elseif ($laterality === null && $surgery && $surgery['requires_laterality']) {
            $errors['laterality'] = "Say which side: {$surgery['name']} needs the side to be given.";
        }

        $code = $text('diagnosis_code', 20);
        $diagText = $text('diagnosis_text');
        if ($code !== null) {
            $stmt = $db->prepare("SELECT description FROM icd10_diagnoses WHERE code = :c AND deleted_at IS NULL LIMIT 1");
            $stmt->execute(['c' => $code]);
            $desc = $stmt->fetchColumn();
            if ($desc === false) {
                $errors['diagnosis_code'] = 'That ICD-10 code isn\'t in the list. Search for the diagnosis.';
            } else {
                $diagText = $diagText ?? $desc;
            }
        }
        if ($code === null && $diagText === null) {
            $errors['diagnosis_code'] = 'Enter the diagnosis (search ICD-10).';
        }

        // Surgeon: a doctor; outside the specialization needs a reason.
        $surgeonId = (int) ($data['surgeon_user_id'] ?? 0);
        $override = $text('surgeon_override_reason');
        if (!$surgeonId) {
            $errors['surgeon_user_id'] = 'Choose the surgeon.';
        } else {
            $stmt = $db->prepare(
                "SELECT p.id FROM providers p JOIN employees e ON e.id = p.employee_id AND e.deleted_at IS NULL
                 WHERE p.deleted_at IS NULL AND e.user_id = :u LIMIT 1"
            );
            $stmt->execute(['u' => $surgeonId]);
            $providerId = $stmt->fetchColumn();
            if (!$providerId) {
                $errors['surgeon_user_id'] = 'The surgeon must be a doctor (set up under Providers).';
            } elseif ($spec) {
                $theirs = array_column(ProviderService::specializationsOf([(int) $providerId])[(int) $providerId] ?? [], 'id');
                if (!in_array((int) $spec['id'], $theirs, true)) {
                    if ($override === null) {
                        $errors['surgeon_override_reason'] = "The surgeon isn't listed under {$spec['name']}. Give the reason or choose another surgeon.";
                    }
                } else {
                    $override = null;
                }
            }
        }

        $priority = (string) ($data['priority'] ?? 'Elective');
        if (!in_array($priority, self::PRIORITIES, true)) {
            $errors['priority'] = 'Choose the priority.';
        }

        $preferred = $text('preferred_date', 10);
        if ($preferred !== null) {
            $d = \DateTime::createFromFormat('Y-m-d', $preferred);
            if (!$d || $d->format('Y-m-d') !== $preferred) {
                $errors['preferred_date'] = 'Enter a valid date.';
            } elseif ($preferred < date('Y-m-d')) {
                $errors['preferred_date'] = 'The preferred date can\'t be in the past.';
            }
        }

        $duration = (int) ($data['estimated_duration_minutes'] ?? 0) ?: (int) ($surgery['default_duration_minutes'] ?? 60);
        if ($duration < 5 || $duration > 1440) {
            $errors['estimated_duration_minutes'] = 'Enter the duration in minutes (5 to 1440).';
        }

        $anesthesia = $text('anesthesia_type', 40) ?? ($surgery['default_anesthesia_type'] ?? null);
        if ($anesthesia !== null && !isset(SurgeryService::ANESTHESIA_TYPES[$anesthesia])) {
            $errors['anesthesia_type'] = 'Choose the anesthesia type.';
        }

        $encounterId = (int) ($data['encounter_id'] ?? 0) ?: null;
        if ($encounterId) {
            $stmt = $db->prepare("SELECT 1 FROM encounters WHERE id = :id AND patient_id = :p AND deleted_at IS NULL");
            $stmt->execute(['id' => $encounterId, 'p' => $patientId]);
            if (!$stmt->fetchColumn()) {
                $errors['encounter_id'] = 'That visit isn\'t this patient\'s.';
            }
        }

        return [[
            'encounter_id' => $encounterId,
            'specialization_id' => $spec['id'] ?? null,
            'surgery_id' => $surgery['id'] ?? null,
            'procedure_name' => $procedure,
            'laterality' => $laterality,
            'diagnosis_code' => $code,
            'diagnosis_text' => $diagText,
            'surgeon_user_id' => $surgeonId ?: null,
            'surgeon_override_reason' => $override,
            'priority' => $priority,
            'preferred_date' => $preferred,
            'estimated_duration_minutes' => $duration,
            'anesthesia_type' => $anesthesia,
            'notes' => $text('notes', 5000)
        ], $errors];
    }

    /** request id => item key => {status, details, notes, confirmed_by_name, confirmed_at} */
    private function checksFor(array $ids): array
    {
        $ids = array_values(array_filter(array_map('intval', $ids)));
        if (!$ids) {
            return [];
        }

        $out = [];
        foreach (Database::connection()->query(
            "SELECT c.*, " . self::userNameSql('c.confirmed_by') . " AS confirmed_by_name
             FROM surgery_request_checks c WHERE c.request_id IN (" . implode(',', $ids) . ")"
        )->fetchAll(PDO::FETCH_ASSOC) as $c) {
            $out[(int) $c['request_id']][$c['item_key']] = [
                'status' => $c['status'], 'details' => $c['details'] ? (json_decode($c['details'], true) ?: []) : [], 'notes' => $c['notes'],
                'confirmed_by_name' => $c['confirmed_by_name'], 'confirmed_at' => $c['confirmed_at']
            ];
        }

        return $out;
    }

    /** List row with its readiness count. */
    private function summary(array $r, array $checks): array
    {
        $required = self::requiredItems($r + $this->surgeryFlags($r));
        $requiredKeys = array_keys(array_filter($required));
        $doneRequired = count(array_filter($requiredKeys, fn($k) => isset($checks[$k])));

        return [
            'id' => (int) $r['id'],
            'request_number' => $r['request_number'],
            'patient_id' => (int) $r['patient_id'],
            'patient_no' => $r['patient_no'],
            'patient_name' => self::personName($r),
            'specialization_id' => (int) $r['specialization_id'],
            'specialization_name' => $r['specialization_name'],
            'surgery_id' => $r['surgery_id'] !== null ? (int) $r['surgery_id'] : null,
            'procedure_name' => $r['procedure_name'],
            'laterality' => $r['laterality'],
            'diagnosis' => trim(($r['diagnosis_code'] ? $r['diagnosis_code'] . ' ' : '') . ($r['diagnosis_text'] ?? '')),
            'surgeon_user_id' => (int) $r['surgeon_user_id'],
            'surgeon_name' => $r['surgeon_name'],
            'requested_by_name' => $r['requested_by_name'],
            'priority' => $r['priority'],
            'preferred_date' => $r['preferred_date'],
            'status' => $r['status'],
            'status_label' => self::STATUS_LABELS[$r['status']] ?? $r['status'],
            'readiness_done' => $doneRequired,
            'readiness_total' => count($requiredKeys),
            'or_case_id' => $r['or_case_id'] !== null ? (int) $r['or_case_id'] : null,
            'created_at' => $r['created_at']
        ];
    }

    /** The surgery's flags for requiredItems() (cached per surgery). */
    private function surgeryFlags(array $r): array
    {
        static $cache = [];
        if (array_key_exists('usually_needs_blood', $r) || !$r['surgery_id']) {
            return [];
        }
        $id = (int) $r['surgery_id'];
        if (!isset($cache[$id])) {
            $stmt = Database::connection()->prepare("SELECT usually_needs_blood, usually_needs_implants FROM surgeries WHERE id = :id");
            $stmt->execute(['id' => $id]);
            $cache[$id] = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
        }
        return $cache[$id];
    }

    private function lock(int $id): ?array
    {
        $stmt = Database::connection()->prepare("SELECT * FROM surgery_requests WHERE id = :id FOR UPDATE");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private static function rowSql(): string
    {
        return "pt.patient_no, pt.first_name, pt.middle_name, pt.last_name, pt.suffix, s.name AS specialization_name,
                " . self::userNameSql('r.surgeon_user_id') . " AS surgeon_name,
                " . self::userNameSql('r.requested_by') . " AS requested_by_name";
    }

    private static function personName(array $r): string
    {
        return preg_replace('/\s+/', ' ', trim(implode(' ', array_filter([$r['first_name'] ?? '', $r['middle_name'] ?? '', $r['last_name'] ?? '', $r['suffix'] ?? '']))));
    }

    private static function userNameSql(string $column): string
    {
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))), ''), u.username)
                 FROM users u LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
                 WHERE u.id = {$column} LIMIT 1)";
    }

    private function begin(PDO $db): bool
    {
        if (!$db->inTransaction()) {
            $db->beginTransaction();
            return true;
        }
        $db->exec('SAVEPOINT surgery_request_step');
        return false;
    }

    private function commit(PDO $db, bool $owns): void
    {
        $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT surgery_request_step');
    }

    private function rollBack(PDO $db, bool $owns): void
    {
        $owns ? $db->rollBack() : $db->exec('ROLLBACK TO SAVEPOINT surgery_request_step');
    }
}
