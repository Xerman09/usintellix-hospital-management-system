<?php

namespace App\Modules\OrManagement\Services;

use App\Core\Database;
use App\Modules\DrugInventory\Services\StockLedgerService;
use PDO;
use Throwable;

/**
 * The case record on the day of surgery (Surgery Phase 4).
 *
 *   * The WHO Surgical Safety Checklist, built into the case:
 *       Sign-In  -- before the patient goes into the room;
 *       Time-Out -- in the room, before the incision (the incision can't
 *                   be stamped without it);
 *       Sign-Out -- before the patient leaves the room, with the sponge,
 *                   needle and instrument counts.
 *     Each phase is saved once, with who and when. The Sign-Out also
 *     files the case in the Surgical Safety Checklist report.
 *   * Intra-op record: anesthesia start/end, vitals, medicines, fluids,
 *     blood, blood loss, urine output, specimens and implants (with lot
 *     numbers).
 *   * Anything taken from stock (a medicine, fluid, supply or implant
 *     from the drug catalog) is deducted from a storage location, earliest
 *     expiry first, never expired, and written to the medicine ledger as
 *     'dispensed' (source or_case_item_lots). Undoing it puts the stock
 *     back ('dispense_voided').
 */
class OrIntraopService
{
    public const ROLES = OrSchedulingService::ROLES;

    public const COUNT_STATUSES = [
        'correct' => 'Correct',
        'resolved' => 'Discrepancy resolved on recount',
        'unresolved' => 'Unresolved — X-ray ordered',
        'na' => 'Not applicable'
    ];

    /**
     * The WHO checklist. type: check (must be ticked), choice (one of the
     * options; detail_on asks for details for that answer), count (status
     * + optional numbers), text. 'if' limits an item to some cases.
     */
    public const CHECKLIST = [
        'sign_in' => [
            'label' => 'Sign-In',
            'when' => 'Before the patient goes into the room (before induction)',
            'items' => [
                ['key' => 'identity_confirmed', 'type' => 'check', 'label' => 'Patient has confirmed identity, site, procedure and consent'],
                ['key' => 'site_marked', 'type' => 'choice', 'label' => 'Site marked', 'options' => ['yes' => 'Yes', 'na' => 'Not applicable']],
                ['key' => 'anesthesia_check', 'type' => 'check', 'label' => 'Anesthesia machine and medication check complete'],
                ['key' => 'pulse_oximeter', 'type' => 'check', 'label' => 'Pulse oximeter on the patient and working'],
                ['key' => 'allergy', 'type' => 'choice', 'label' => 'Does the patient have a known allergy?', 'options' => ['no' => 'No', 'yes' => 'Yes'], 'detail_on' => 'yes'],
                ['key' => 'difficult_airway', 'type' => 'choice', 'label' => 'Difficult airway or aspiration risk?', 'options' => ['no' => 'No', 'yes' => 'Yes, and equipment / assistance available']],
                ['key' => 'blood_loss_risk', 'type' => 'choice', 'label' => 'Risk of more than 500 mL blood loss (7 mL/kg in children)?',
                    'options' => ['no' => 'No', 'yes' => 'Yes, and two IVs / central access and fluids planned']]
            ]
        ],
        'time_out' => [
            'label' => 'Time-Out',
            'when' => 'In the room, before the skin incision',
            'items' => [
                ['key' => 'team_introduced', 'type' => 'check', 'label' => 'All team members have introduced themselves by name and role'],
                ['key' => 'verbal_confirmation', 'type' => 'check', 'label' => 'Surgeon, anesthesiologist and nurse confirm the patient, site and procedure aloud'],
                ['key' => 'antibiotic', 'type' => 'choice', 'label' => 'Antibiotic prophylaxis given within the last 60 minutes?', 'options' => ['yes' => 'Yes', 'na' => 'Not applicable']],
                ['key' => 'surgeon_review', 'type' => 'check', 'label' => 'Surgeon: critical or non-routine steps, case duration, anticipated blood loss'],
                ['key' => 'anesthesia_review', 'type' => 'check', 'label' => 'Anesthesia: patient-specific concerns reviewed'],
                ['key' => 'nursing_review', 'type' => 'check', 'label' => 'Nursing: sterility (with indicator results) confirmed; equipment issues or concerns raised'],
                ['key' => 'imaging', 'type' => 'choice', 'label' => 'Essential imaging displayed?', 'options' => ['yes' => 'Yes', 'na' => 'Not applicable']],
                ['key' => 'implants_verified', 'type' => 'check', 'label' => 'Implants and hardware available and verified', 'if' => 'implants']
            ]
        ],
        'sign_out' => [
            'label' => 'Sign-Out',
            'when' => 'Before the patient leaves the room',
            'items' => [
                ['key' => 'procedure_performed', 'type' => 'text', 'label' => 'Name of the procedure, as recorded'],
                ['key' => 'sponge_count', 'type' => 'count', 'label' => 'Sponge count'],
                ['key' => 'needle_count', 'type' => 'count', 'label' => 'Needle / sharps count'],
                ['key' => 'instrument_count', 'type' => 'count', 'label' => 'Instrument count'],
                ['key' => 'specimen_labelled', 'type' => 'choice', 'label' => 'Specimens labelled (read aloud, with the patient\'s name)', 'options' => ['yes' => 'Yes', 'na' => 'No specimens']],
                ['key' => 'equipment_problems', 'type' => 'choice', 'label' => 'Any equipment problems to be addressed?', 'options' => ['no' => 'No', 'yes' => 'Yes'], 'detail_on' => 'yes'],
                ['key' => 'near_miss', 'type' => 'choice', 'label' => 'Was a near miss caught during this case?', 'options' => ['no' => 'No', 'yes' => 'Yes'], 'detail_on' => 'yes'],
                ['key' => 'recovery_reviewed', 'type' => 'check', 'label' => 'Surgeon, anesthesiologist and nurse review the key concerns for recovery'],
                ['key' => 'recovery_concerns', 'type' => 'text', 'label' => 'Key concerns for recovery', 'optional' => true]
            ]
        ]
    ];

    public const ITEM_KINDS = ['medicine' => 'Medicine', 'fluid' => 'IV fluid', 'blood' => 'Blood product', 'supply' => 'Supply', 'implant' => 'Implant'];

    public const SPECIMEN_TYPES = ['Histopathology', 'Frozen section', 'Culture', 'Cytology', 'Other'];

    public const ROUTES = ['IV', 'IM', 'SC', 'Inhalation', 'Epidural', 'Spinal', 'Local infiltration', 'Topical', 'Oral', 'Other'];

    /** From Pre-Op Holding on, medicines can be recorded (e.g. the antibiotic). */
    private const RECORDING_STAGES = ['Pre-Op Holding', 'In Room / Induction', 'Incision / In Progress', 'Closing / Extubation', 'In PACU', 'Transferred / Discharged'];

    private const EPSILON = 0.0005;

    /* ---------------------------------------------------------------
     * The case record
     * ------------------------------------------------------------- */

    public function record(int $caseId): ?array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT c.*, s.suite_code, s.status AS suite_status, su.name AS surgery_name,
                    " . self::userNameSql('c.cancelled_by') . " AS cancelled_by_name
             FROM or_surgical_cases c
             LEFT JOIN or_suites s ON s.id = c.or_suite_id
             LEFT JOIN surgeries su ON su.id = c.surgery_id
             WHERE c.id = :id"
        );
        $stmt->execute(['id' => $caseId]);
        $case = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$case) {
            return null;
        }
        $stage = $case['perioperative_stage'];

        $stmt = $db->prepare(
            "SELECT s.*, " . self::userNameSql('s.user_id') . " AS user_name, " . self::userNameSql('s.undone_by') . " AS undone_by_name
             FROM or_case_stages s WHERE s.case_id = :c ORDER BY s.stage_at, s.id"
        );
        $stmt->execute(['c' => $caseId]);
        $stages = array_map(fn($s) => [
            'stage' => $s['stage'], 'label' => OrLiveService::LABELS[$s['stage']] ?? $s['stage'], 'at' => $s['stage_at'], 'user_name' => $s['user_name'],
            'notes' => $s['notes'], 'undone_at' => $s['undone_at'], 'undone_by_name' => $s['undone_by_name'], 'undo_reason' => $s['undo_reason']
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        $stmt = $db->prepare("SELECT k.*, " . self::userNameSql('k.completed_by') . " AS completed_by_name FROM or_case_safety_checks k WHERE k.case_id = :c");
        $stmt->execute(['c' => $caseId]);
        $done = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $k) {
            $done[$k['phase']] = ['answers' => json_decode($k['answers'], true) ?: [], 'notes' => $k['notes'], 'completed_at' => $k['completed_at'], 'completed_by_name' => $k['completed_by_name']];
        }

        $stmt = $db->prepare(
            "SELECT v.*, " . self::userNameSql('v.created_by') . " AS recorded_by FROM or_case_vitals v
             WHERE v.case_id = :c AND v.removed_at IS NULL ORDER BY v.recorded_at, v.id"
        );
        $stmt->execute(['c' => $caseId]);
        $vitals = array_map(fn($v) => [
            'id' => (int) $v['id'], 'recorded_at' => $v['recorded_at'], 'heart_rate' => self::int($v['heart_rate']), 'bp_systolic' => self::int($v['bp_systolic']),
            'bp_diastolic' => self::int($v['bp_diastolic']), 'spo2' => self::int($v['spo2']), 'etco2' => self::int($v['etco2']), 'resp_rate' => self::int($v['resp_rate']),
            'temperature' => $v['temperature'] !== null ? (float) $v['temperature'] : null, 'notes' => $v['notes'], 'recorded_by' => $v['recorded_by']
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        $stmt = $db->prepare(
            "SELECT i.*, w.name AS warehouse_name, du.name AS unit_name, d.controlled_class, d.is_high_alert,
                    " . self::userNameSql('i.given_by') . " AS given_by_name, " . self::userNameSql('i.created_by') . " AS recorded_by,
                    " . self::userNameSql('i.voided_by') . " AS voided_by_name
             FROM or_case_items i
             LEFT JOIN warehouses w ON w.id = i.warehouse_id
             LEFT JOIN drugs d ON d.id = i.drug_id
             LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             WHERE i.case_id = :c ORDER BY COALESCE(i.given_at, i.created_at), i.id"
        );
        $stmt->execute(['c' => $caseId]);
        $itemRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $lots = [];
        if ($itemRows) {
            foreach ($db->query(
                "SELECT il.item_id, il.quantity, l.lot_number, l.expires_date FROM or_case_item_lots il JOIN drug_inventory_lots l ON l.id = il.lot_id
                 WHERE il.item_id IN (" . implode(',', array_map(fn($i) => (int) $i['id'], $itemRows)) . ") ORDER BY il.id"
            )->fetchAll(PDO::FETCH_ASSOC) as $l) {
                $lots[(int) $l['item_id']][] = ['lot_number' => $l['lot_number'], 'expires_date' => $l['expires_date'], 'quantity' => (float) $l['quantity']];
            }
        }
        $items = array_map(fn($i) => [
            'id' => (int) $i['id'], 'kind' => $i['kind'], 'kind_label' => self::ITEM_KINDS[$i['kind']] ?? $i['kind'],
            'drug_id' => $i['drug_id'] !== null ? (int) $i['drug_id'] : null, 'name' => $i['name'],
            'quantity' => $i['quantity'] !== null ? (float) $i['quantity'] : null, 'unit_name' => $i['unit_name'],
            'warehouse_name' => $i['warehouse_name'], 'dose' => $i['dose'], 'route' => $i['route'], 'given_at' => $i['given_at'],
            'given_by_name' => $i['given_by_name'], 'manufacturer' => $i['manufacturer'], 'catalog_no' => $i['catalog_no'],
            'lot_number' => $i['lot_number'], 'serial_number' => $i['serial_number'], 'expires_date' => $i['expires_date'], 'size' => $i['size'],
            'body_site' => $i['body_site'], 'notes' => $i['notes'], 'lots' => $lots[(int) $i['id']] ?? [],
            'is_controlled' => ($i['controlled_class'] ?? 'None') !== 'None' && $i['controlled_class'] !== null, 'is_high_alert' => (bool) $i['is_high_alert'],
            'recorded_by' => $i['recorded_by'], 'created_at' => $i['created_at'],
            'voided_at' => $i['voided_at'], 'voided_by_name' => $i['voided_by_name'], 'void_reason' => $i['void_reason']
        ], $itemRows);

        $stmt = $db->prepare(
            "SELECT sp.*, " . self::userNameSql('sp.created_by') . " AS recorded_by FROM or_case_specimens sp WHERE sp.case_id = :c AND sp.removed_at IS NULL ORDER BY sp.id"
        );
        $stmt->execute(['c' => $caseId]);
        $specimens = array_map(fn($s) => [
            'id' => (int) $s['id'], 'specimen_type' => $s['specimen_type'], 'description' => $s['description'], 'body_site' => $s['body_site'],
            'container_count' => (int) $s['container_count'], 'sent_to' => $s['sent_to'], 'collected_at' => $s['collected_at'], 'notes' => $s['notes'],
            'recorded_by' => $s['recorded_by']
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        $preference = [];
        if ($case['surgery_id']) {
            $stmt = $db->prepare(
                "SELECT p.item_type, p.drug_id, COALESCE(d.name, p.name) AS name, p.quantity, du.name AS unit_name, p.notes
                 FROM surgery_preference_items p
                 LEFT JOIN drugs d ON d.id = p.drug_id AND d.deleted_at IS NULL AND d.is_active = 1
                 LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
                 WHERE p.surgery_id = :s ORDER BY p.sort_order, p.id"
            );
            $stmt->execute(['s' => $case['surgery_id']]);
            $preference = array_map(fn($p) => [
                'item_type' => $p['item_type'], 'drug_id' => $p['drug_id'] !== null ? (int) $p['drug_id'] : null, 'name' => $p['name'],
                'quantity' => (float) $p['quantity'], 'unit_name' => $p['unit_name'], 'notes' => $p['notes']
            ], $stmt->fetchAll(PDO::FETCH_ASSOC));
        }

        $history = (new OrSchedulingService())->caseDetail($caseId)['history'] ?? [];
        $next = $stage === 'Cancelled' ? null : OrLiveService::nextStage($stage);
        $gate = $next ? (OrLiveService::GATES[$next] ?? null) : null;
        $recording = in_array($stage, self::RECORDING_STAGES, true);

        return [
            'case' => $case + ['stage_label' => OrLiveService::LABELS[$stage] ?? $stage],
            'allergies' => $this->allergies($case['patient_id'] ? (int) $case['patient_id'] : null),
            'stages' => $stages,
            'next_stage' => $next,
            'next_label' => $next ? OrLiveService::LABELS[$next] : null,
            'next_needs' => $gate && !isset($done[$gate]) ? $gate : null,
            'can_undo' => !in_array($stage, ['Scheduled', 'Cancelled'], true),
            'can_cancel' => in_array($stage, ['Scheduled', 'Pre-Op Holding', 'In Room / Induction'], true),
            'checklist' => [
                'definition' => $this->definition($case),
                'done' => (object) $done,
                'available' => [
                    'sign_in' => !isset($done['sign_in']) && $this->checkWindow($case, 'sign_in', $done) === null,
                    'time_out' => !isset($done['time_out']) && $this->checkWindow($case, 'time_out', $done) === null,
                    'sign_out' => !isset($done['sign_out']) && $this->checkWindow($case, 'sign_out', $done) === null
                ],
                'blocked_reason' => [
                    'sign_in' => isset($done['sign_in']) ? null : $this->checkWindow($case, 'sign_in', $done),
                    'time_out' => isset($done['time_out']) ? null : $this->checkWindow($case, 'time_out', $done),
                    'sign_out' => isset($done['sign_out']) ? null : $this->checkWindow($case, 'sign_out', $done)
                ],
                'count_statuses' => self::COUNT_STATUSES
            ],
            'can_record' => $recording,
            'vitals' => $vitals,
            'items' => $items,
            'specimens' => $specimens,
            'preference_items' => $preference,
            'history' => $history,
            'options' => [
                'item_kinds' => self::ITEM_KINDS,
                'specimen_types' => self::SPECIMEN_TYPES,
                'routes' => self::ROUTES,
                'warehouses' => $db->query("SELECT id, name FROM warehouses WHERE deleted_at IS NULL AND is_active = 1 ORDER BY name")->fetchAll(PDO::FETCH_ASSOC),
                'team' => $this->team($case)
            ]
        ];
    }

    /* ---------------------------------------------------------------
     * WHO safety checklist
     * ------------------------------------------------------------- */

    /** The checklist with the items that apply to this case. */
    private function definition(array $case): array
    {
        $out = [];
        foreach (self::CHECKLIST as $phase => $def) {
            $items = array_values(array_filter($def['items'], fn($i) => !isset($i['if']) || ($i['if'] === 'implants' && (int) $case['implants_required'])));
            $out[$phase] = ['label' => $def['label'], 'when' => $def['when'], 'items' => $items];
        }
        return $out;
    }

    /** Null when the phase can be done now, else why not. */
    private function checkWindow(array $case, string $phase, array $done): ?string
    {
        $stage = $case['perioperative_stage'];
        if ($stage === 'Cancelled') {
            return 'The case was cancelled.';
        }
        switch ($phase) {
            case 'sign_in':
                if (isset($done['time_out'])) {
                    return 'The Time-Out was already done.';
                }
                if (in_array($stage, ['Scheduled', 'Pre-Op Holding'], true) && $case['scheduled_date'] !== date('Y-m-d')) {
                    return 'The Sign-In is done on the day of surgery.';
                }
                // In the room already (a case from before the checklist): it can still be recorded, late.
                return in_array($stage, ['Scheduled', 'Pre-Op Holding', 'In Room / Induction'], true) ? null : 'The patient is past the Sign-In.';
            case 'time_out':
                if (!isset($done['sign_in'])) {
                    return 'Do the Sign-In first.';
                }
                return $stage === 'In Room / Induction' ? null : ($stage === 'Scheduled' || $stage === 'Pre-Op Holding'
                    ? 'The Time-Out is done once the patient is in the room.' : 'The Time-Out is done before the incision.');
            case 'sign_out':
                return in_array($stage, ['Incision / In Progress', 'Closing / Extubation'], true) ? null
                    : (in_array($stage, ['In PACU', 'Transferred / Discharged'], true) ? 'The patient has left the room.' : 'The Sign-Out is done at the end of the surgery, before leaving the room.');
        }
        return 'Unknown checklist phase.';
    }

    /** data: phase, answers {key: true | option | text | {status, before?, after?}, key_detail?}, notes? */
    public function saveCheck(int $caseId, array $data, int $userId): array
    {
        $phase = (string) ($data['phase'] ?? '');
        if (!isset(self::CHECKLIST[$phase])) {
            return ['success' => false, 'message' => 'Choose Sign-In, Time-Out or Sign-Out.'];
        }
        $answers = is_array($data['answers'] ?? null) ? $data['answers'] : [];
        $notes = self::text($data['notes'] ?? null, 1000);

        $db = Database::connection();
        $owns = $this->begin($db);
        try {
            $stmt = $db->prepare("SELECT * FROM or_surgical_cases WHERE id = :id FOR UPDATE");
            $stmt->execute(['id' => $caseId]);
            $case = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$case) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => 'Surgical case not found.', 'not_found' => true];
            }

            $stmt = $db->prepare("SELECT phase, completed_at, " . self::userNameSql('completed_by') . " AS by_name FROM or_case_safety_checks WHERE case_id = :c");
            $stmt->execute(['c' => $caseId]);
            $done = [];
            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
                $done[$r['phase']] = $r;
            }
            $label = self::CHECKLIST[$phase]['label'];
            if (isset($done[$phase])) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => "The {$label} was already done by {$done[$phase]['by_name']} at " . date('g:i A', strtotime($done[$phase]['completed_at'])) . '.'];
            }
            $why = $this->checkWindow($case, $phase, $done);
            if ($why !== null) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => $why];
            }

            [$clean, $errors] = $this->validateAnswers($case, $phase, $answers);
            if ($errors) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => "The {$label} isn't complete.", 'errors' => $errors];
            }

            $now = date('Y-m-d H:i:s');
            $db->prepare(
                "INSERT INTO or_case_safety_checks (case_id, phase, answers, notes, completed_at, completed_by) VALUES (:c, :p, :a, :n, :now, :u)"
            )->execute(['c' => $caseId, 'p' => $phase, 'a' => json_encode($clean), 'n' => $notes, 'now' => $now, 'u' => $userId ?: null]);

            $late = $phase === 'sign_in' && $case['perioperative_stage'] === 'In Room / Induction';
            if ($phase === 'sign_out') {
                $countIssue = (bool) array_filter(['sponge_count', 'needle_count', 'instrument_count'], fn($k) => in_array($clean[$k]['status'], ['resolved', 'unresolved'], true));
                $db->prepare("UPDATE or_surgical_cases SET procedure_performed = :p, count_issue = :ci, revision = revision + 1 WHERE id = :id")
                    ->execute(['p' => $clean['procedure_performed'], 'ci' => $countIssue ? 1 : 0, 'id' => $caseId]);
                $this->fileReport($db, $caseId, $done, $clean, $notes);
            }
            (new OrSchedulingService())->log($caseId, 'checklist', ['phase' => $phase, 'label' => $label] + ($late ? ['late' => true] : []), null, $userId ?: null);

            $this->commit($db, $owns);
        } catch (Throwable $e) {
            $this->rollBack($db, $owns);
            throw $e;
        }

        return ['success' => true, 'message' => "{$label} done." . ($late ? ' (Recorded after the patient went into the room.)' : '')];
    }

    /** [clean answers, errors by key]. */
    private function validateAnswers(array $case, string $phase, array $answers): array
    {
        $clean = [];
        $errors = [];
        foreach ($this->definition($case)[$phase]['items'] as $item) {
            $key = $item['key'];
            $value = $answers[$key] ?? null;
            switch ($item['type']) {
                case 'check':
                    if ($value !== true && $value !== 1 && $value !== '1' && $value !== 'true') {
                        $errors[$key] = 'Tick this when it\'s done.';
                        break;
                    }
                    $clean[$key] = true;
                    break;
                case 'choice':
                    if (!is_string($value) || !isset($item['options'][$value])) {
                        $errors[$key] = 'Choose an answer.';
                        break;
                    }
                    $clean[$key] = $value;
                    if (($item['detail_on'] ?? null) === $value) {
                        $detail = self::text($answers["{$key}_detail"] ?? null, 500);
                        if ($detail === null) {
                            $errors[$key] = 'Give the details.';
                            break;
                        }
                        $clean["{$key}_detail"] = $detail;
                    }
                    break;
                case 'text':
                    $text = self::text($value, 255);
                    if ($text === null && empty($item['optional'])) {
                        $errors[$key] = 'Fill this in.';
                        break;
                    }
                    $clean[$key] = $text;
                    break;
                case 'count':
                    $status = is_array($value) ? (string) ($value['status'] ?? '') : '';
                    if (!isset(self::COUNT_STATUSES[$status])) {
                        $errors[$key] = 'Choose the count result.';
                        break;
                    }
                    $num = fn($k) => is_array($value) && isset($value[$k]) && $value[$k] !== '' && $value[$k] !== null ? (int) $value[$k] : null;
                    $before = $num('before');
                    $after = $num('after');
                    if (($before !== null && $before < 0) || ($after !== null && $after < 0)) {
                        $errors[$key] = 'Counts can\'t be negative.';
                        break;
                    }
                    if ($status === 'correct' && $before !== null && $after !== null && $before !== $after) {
                        $errors[$key] = "The counts differ ({$before} before, {$after} after). Recount, or choose a discrepancy result.";
                        break;
                    }
                    $clean[$key] = ['status' => $status, 'before' => $before, 'after' => $after];
                    break;
            }
        }

        // Cross-checks with the chart and the case.
        if ($phase === 'sign_in') {
            if (($clean['site_marked'] ?? null) === 'na' && $case['laterality']) {
                $errors['site_marked'] = "This is a {$case['laterality']}-side case; the site must be marked.";
            }
            $allergies = $this->allergies($case['patient_id'] ? (int) $case['patient_id'] : null);
            if (($clean['allergy'] ?? null) === 'no' && $allergies) {
                $errors['allergy'] = 'The chart lists allergies: ' . implode(', ', array_column($allergies, 'name')) . '.';
            }
        }
        if ($phase === 'sign_out') {
            $unresolved = array_filter(['sponge_count', 'needle_count', 'instrument_count'], fn($k) => ($clean[$k]['status'] ?? null) === 'unresolved');
            if ($unresolved && !self::text($answers['count_notes'] ?? null, 500)) {
                $errors['count_notes'] = 'Say what was done about the count that doesn\'t match (e.g. X-ray ordered, result).';
            } elseif ($unresolved) {
                $clean['count_notes'] = self::text($answers['count_notes'], 500);
            }
            $stmt = Database::connection()->prepare("SELECT COUNT(*) FROM or_case_specimens WHERE case_id = :c AND removed_at IS NULL");
            $stmt->execute(['c' => $case['id']]);
            if (($clean['specimen_labelled'] ?? null) === 'na' && (int) $stmt->fetchColumn() > 0) {
                $errors['specimen_labelled'] = 'Specimens are recorded for this case; confirm they are labelled.';
            }
        }

        return [$clean, $errors];
    }

    /** The completed checklist goes into the Surgical Safety Checklist report (one row per case). */
    private function fileReport(PDO $db, int $caseId, array $done, array $signOut, ?string $notes): void
    {
        $stmt = $db->prepare("SELECT phase, answers, completed_at FROM or_case_safety_checks WHERE case_id = :c");
        $stmt->execute(['c' => $caseId]);
        $phases = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $phases[$r['phase']] = ['answers' => json_decode($r['answers'], true) ?: [], 'at' => $r['completed_at']];
        }
        $in = $phases['sign_in']['answers'] ?? [];
        $to = $phases['time_out']['answers'] ?? [];
        $stmt = $db->prepare("SELECT * FROM or_surgical_cases WHERE id = :id");
        $stmt->execute(['id' => $caseId]);
        $c = $stmt->fetch(PDO::FETCH_ASSOC);

        $counts = array_map(fn($k) => $signOut[$k]['status'], ['sponge_count', 'needle_count', 'instrument_count']);
        $countStatus = in_array('unresolved', $counts, true) ? 'Unresolved Discrepancy - X-Ray Ordered'
            : (in_array('resolved', $counts, true) ? 'Discrepancy Resolved on Recount'
            : (count(array_unique($counts)) === 1 && $counts[0] === 'na' ? 'Not Applicable' : 'Correct & Reconciled'));
        $complete = isset($phases['sign_in'], $phases['time_out']);
        $nearMiss = ($signOut['near_miss'] ?? 'no') === 'yes';
        $equipment = ($signOut['equipment_problems'] ?? 'no') === 'yes';
        $status = !$complete ? 'Non-Compliant Protocol Breach'
            : ($nearMiss ? 'Completed - Near-Miss Caught' : ($equipment || $countStatus === 'Unresolved Discrepancy - X-Ray Ordered' ? 'Completed - Minor Variance' : 'Completed - Fully Compliant'));
        $gender = in_array($c['gender'], ['Male', 'Female'], true) ? $c['gender'] : 'Other';

        $row = [
            'case_number' => $c['case_number'], 'surgery_date' => $c['scheduled_date'], 'or_suite' => mb_substr($c['or_suite_name'], 0, 50),
            'patient_id' => $c['patient_id'], 'patient_name' => mb_substr($c['patient_name'], 0, 200), 'patient_mrn' => $c['patient_mrn'] ?: '—',
            'patient_age' => max(0, (int) $c['patient_age']), 'gender' => $gender,
            'procedure_planned' => $c['procedure_name'], 'procedure_actual' => $signOut['procedure_performed'] ?? null,
            'surgical_specialty' => $c['surgical_specialty'], 'operating_surgeon' => $c['lead_surgeon'], 'anesthesiologist' => $c['anesthesiologist'],
            'circulating_nurse' => $c['circulating_nurse'] ?: '—', 'scrub_nurse' => $c['scrub_nurse'],
            'patient_identity_confirmed' => !empty($in['identity_confirmed']) ? 1 : 0, 'surgical_consent_confirmed' => !empty($in['identity_confirmed']) ? 1 : 0,
            'site_marking_required' => ($in['site_marked'] ?? 'na') === 'yes' ? 1 : 0, 'site_marked_by_surgeon' => ($in['site_marked'] ?? null) === 'yes' ? 1 : 0,
            'anesthesia_safety_check_done' => !empty($in['anesthesia_check']) ? 1 : 0, 'pulse_oximeter_functioning' => !empty($in['pulse_oximeter']) ? 1 : 0,
            'allergy_check_done' => isset($in['allergy']) ? 1 : 0, 'airway_aspiration_risk' => ($in['difficult_airway'] ?? 'no') === 'yes' ? 1 : 0,
            'blood_loss_risk_over_500ml' => ($in['blood_loss_risk'] ?? 'no') === 'yes' ? 1 : 0,
            'time_out_performed' => isset($phases['time_out']) ? 1 : 0,
            'time_out_timestamp' => isset($phases['time_out']) ? substr($phases['time_out']['at'], 11, 5) : null,
            'team_members_introduced' => !empty($to['team_introduced']) ? 1 : 0,
            'patient_name_verbally_confirmed' => !empty($to['verbal_confirmation']) ? 1 : 0, 'procedure_verbally_confirmed' => !empty($to['verbal_confirmation']) ? 1 : 0,
            'site_laterality_verbally_confirmed' => !empty($to['verbal_confirmation']) ? 1 : 0, 'patient_position_confirmed' => !empty($to['verbal_confirmation']) ? 1 : 0,
            'antibiotic_prophylaxis_given' => ($to['antibiotic'] ?? null) === 'yes' ? 1 : 0, 'antibiotic_timing_within_60min' => ($to['antibiotic'] ?? null) === 'yes' ? 1 : 0,
            'essential_imaging_displayed' => ($to['imaging'] ?? null) === 'yes' ? 1 : 0, 'implants_hardware_verified' => !empty($to['implants_verified']) ? 1 : 0,
            'near_miss_caught' => $nearMiss ? 1 : 0, 'near_miss_details' => $signOut['near_miss_detail'] ?? null,
            'sign_out_performed' => 1, 'procedure_recorded_accurately' => 1, 'sponge_needle_count_status' => $countStatus,
            'specimen_labeled_correctly' => ($signOut['specimen_labelled'] ?? 'na') === 'yes' ? 1 : 0,
            'equipment_malfunction_noted' => $equipment ? 1 : 0, 'equipment_issues_details' => $signOut['equipment_problems_detail'] ?? null,
            'postop_recovery_concerns' => $signOut['recovery_concerns'] ?? null,
            'universal_protocol_compliant' => $complete ? 1 : 0,
            'non_compliance_reason' => $complete ? null : 'Sign-In or Time-Out not recorded in the case (case started before the built-in checklist).',
            'status' => $status, 'notes' => $notes
        ];
        $cols = array_keys($row);
        $db->prepare(
            "INSERT INTO surgical_safety_checklists (" . implode(', ', $cols) . ", created_at) VALUES (:" . implode(', :', $cols) . ", NOW())
             ON DUPLICATE KEY UPDATE " . implode(', ', array_map(fn($k) => "{$k} = VALUES({$k})", $cols)) . ", id = LAST_INSERT_ID(id)"
        )->execute($row);
        $reportId = (int) $db->lastInsertId();
        $db->prepare("UPDATE or_surgical_cases SET safety_checklist_id = :r WHERE id = :id")->execute(['r' => $reportId, 'id' => $caseId]);
    }

    /* ---------------------------------------------------------------
     * Anesthesia times, blood loss, urine output
     * ------------------------------------------------------------- */

    /** data: revision, anesthesia_start_time?, anesthesia_end_time?, estimated_blood_loss_ml?, urine_output_ml? (only the keys sent change) */
    public function saveTimes(int $caseId, array $data, int $userId): array
    {
        $db = Database::connection();
        $owns = $this->begin($db);
        try {
            $stmt = $db->prepare("SELECT * FROM or_surgical_cases WHERE id = :id FOR UPDATE");
            $stmt->execute(['id' => $caseId]);
            $case = $stmt->fetch(PDO::FETCH_ASSOC);
            $fail = function (string $message, array $errors = []) use ($db, $owns) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => $message, 'errors' => $errors ?: null];
            };
            if (!$case) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => 'Surgical case not found.', 'not_found' => true];
            }
            if (!in_array($case['perioperative_stage'], self::RECORDING_STAGES, true)) {
                return $fail('The intra-op record opens once the patient is in pre-op holding.');
            }
            if (isset($data['revision']) && (int) $data['revision'] !== (int) $case['revision']) {
                return $fail('Someone else just updated this case. Reload it and enter your change again.');
            }

            $sets = [];
            $params = ['id' => $caseId];
            $errors = [];
            $values = [];
            foreach (['anesthesia_start_time', 'anesthesia_end_time'] as $k) {
                if (!array_key_exists($k, $data)) {
                    $values[$k] = $case[$k];
                    continue;
                }
                if ($data[$k] === '' || $data[$k] === null) {
                    $values[$k] = null;
                } else {
                    $v = OrLiveService::validDateTime((string) $data[$k]);
                    if ($v === null) {
                        $errors[$k] = 'Enter a valid date and time.';
                        continue;
                    }
                    if ($v > date('Y-m-d H:i:s', time() + 60)) {
                        $errors[$k] = 'That time is in the future.';
                        continue;
                    }
                    $values[$k] = $v;
                }
                $sets[] = "{$k} = :{$k}";
                $params[$k] = $values[$k];
            }
            if (!$errors && $values['anesthesia_end_time'] && !$values['anesthesia_start_time']) {
                $errors['anesthesia_start_time'] = 'Enter when anesthesia started.';
            }
            if (!$errors && $values['anesthesia_start_time'] && $values['anesthesia_end_time'] && $values['anesthesia_end_time'] < $values['anesthesia_start_time']) {
                $errors['anesthesia_end_time'] = 'The end is before the start.';
            }
            foreach (['estimated_blood_loss_ml' => 50000, 'urine_output_ml' => 20000] as $k => $max) {
                if (!array_key_exists($k, $data)) {
                    continue;
                }
                if ($data[$k] === '' || $data[$k] === null) {
                    $sets[] = "{$k} = NULL";
                    continue;
                }
                if (!is_numeric($data[$k]) || (int) $data[$k] < 0 || (int) $data[$k] > $max) {
                    $errors[$k] = "Enter mL (0 to {$max}).";
                    continue;
                }
                $sets[] = "{$k} = :{$k}";
                $params[$k] = (int) $data[$k];
            }
            if ($errors) {
                return $fail('Check the highlighted fields.', $errors);
            }
            if (!$sets) {
                $this->rollBack($db, $owns);
                return ['success' => true, 'message' => 'Nothing changed.'];
            }
            $db->prepare("UPDATE or_surgical_cases SET " . implode(', ', $sets) . ", revision = revision + 1, updated_at = NOW() WHERE id = :id")->execute($params);
            $this->commit($db, $owns);
        } catch (Throwable $e) {
            $this->rollBack($db, $owns);
            throw $e;
        }

        return ['success' => true, 'message' => 'Saved.'];
    }

    /* ---------------------------------------------------------------
     * Vitals
     * ------------------------------------------------------------- */

    private const VITAL_RANGES = [
        'heart_rate' => [20, 300, 'Heart rate'], 'bp_systolic' => [30, 300, 'Systolic BP'], 'bp_diastolic' => [10, 200, 'Diastolic BP'],
        'spo2' => [30, 100, 'SpO2'], 'etco2' => [0, 150, 'EtCO2'], 'resp_rate' => [0, 80, 'Respiratory rate'], 'temperature' => [25, 45, 'Temperature']
    ];

    /** data: case_id, recorded_at?, heart_rate?, bp_systolic?, bp_diastolic?, spo2?, etco2?, resp_rate?, temperature?, notes? */
    public function addVitals(array $data, int $userId): array
    {
        $caseId = (int) ($data['case_id'] ?? 0);
        $case = $this->caseRow($caseId);
        if (!$case) {
            return ['success' => false, 'message' => 'Surgical case not found.', 'not_found' => true];
        }
        if (!in_array($case['perioperative_stage'], ['In Room / Induction', 'Incision / In Progress', 'Closing / Extubation', 'In PACU', 'Transferred / Discharged'], true)) {
            return ['success' => false, 'message' => 'Vitals are recorded once the patient is in the room.'];
        }

        $errors = [];
        $row = [];
        foreach (self::VITAL_RANGES as $k => [$min, $max, $label]) {
            $v = $data[$k] ?? null;
            if ($v === null || $v === '') {
                $row[$k] = null;
                continue;
            }
            if (!is_numeric($v) || (float) $v < $min || (float) $v > $max) {
                $errors[$k] = "{$label}: {$min} to {$max}.";
                continue;
            }
            $row[$k] = $k === 'temperature' ? round((float) $v, 1) : (int) round((float) $v);
        }
        if (!$errors && !array_filter($row, fn($v) => $v !== null)) {
            return ['success' => false, 'message' => 'Enter at least one reading.'];
        }
        if (!$errors && $row['bp_systolic'] !== null && $row['bp_diastolic'] !== null && $row['bp_diastolic'] >= $row['bp_systolic']) {
            $errors['bp_diastolic'] = 'The diastolic must be lower than the systolic.';
        }
        $at = date('Y-m-d H:i:s');
        if (!empty($data['recorded_at'])) {
            $at = OrLiveService::validDateTime((string) $data['recorded_at']);
            if ($at === null) {
                $errors['recorded_at'] = 'Enter a valid time.';
            } elseif ($at > date('Y-m-d H:i:s', time() + 60)) {
                $errors['recorded_at'] = 'That time is in the future.';
            } elseif ($case['actual_in_room_time'] && $at < date('Y-m-d H:i:s', strtotime($case['actual_in_room_time']) - 3600)) {
                $errors['recorded_at'] = 'That is well before the patient went into the room.';
            }
        }
        if ($errors) {
            return ['success' => false, 'message' => 'Check the readings.', 'errors' => $errors];
        }

        Database::connection()->prepare(
            "INSERT INTO or_case_vitals (case_id, recorded_at, heart_rate, bp_systolic, bp_diastolic, spo2, etco2, resp_rate, temperature, notes, created_at, created_by)
             VALUES (:c, :at, :heart_rate, :bp_systolic, :bp_diastolic, :spo2, :etco2, :resp_rate, :temperature, :notes, :now, :u)"
        )->execute($row + ['c' => $caseId, 'at' => $at, 'notes' => self::text($data['notes'] ?? null, 255), 'now' => date('Y-m-d H:i:s'), 'u' => $userId ?: null]);

        return ['success' => true, 'message' => 'Vitals recorded.'];
    }

    public function removeVitals(int $id, int $userId): array
    {
        $stmt = Database::connection()->prepare("UPDATE or_case_vitals SET removed_at = NOW(), removed_by = :u WHERE id = :id AND removed_at IS NULL");
        $stmt->execute(['u' => $userId ?: null, 'id' => $id]);
        return $stmt->rowCount() ? ['success' => true, 'message' => 'Reading removed.'] : ['success' => false, 'message' => 'That reading was already removed.', 'not_found' => true];
    }

    /* ---------------------------------------------------------------
     * Medicines, fluids, blood, supplies, implants
     * ------------------------------------------------------------- */

    /** Catalog items with usable stock at a location (for the picker). q? matches name / generic / brand. */
    public function stock(int $warehouseId, string $q = ''): array
    {
        $db = Database::connection();
        $params = ['wh' => $warehouseId, 'today' => date('Y-m-d')];
        $where = ['d.deleted_at IS NULL', 'd.is_active = 1', 'd.allow_inventory = 1'];
        if (trim($q) !== '') {
            $where[] = '(d.name LIKE :q OR d.generic_name LIKE :q2 OR d.brand_name LIKE :q3)';
            $params['q'] = $params['q2'] = $params['q3'] = '%' . trim($q) . '%';
        }
        $stmt = $db->prepare(
            "SELECT d.id, d.name, d.generic_name, d.strength, d.product_type, d.controlled_class, d.is_high_alert, du.name AS unit_name,
                    COALESCE(SUM(l.quantity_on_hand), 0) AS usable
             FROM drugs d
             LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             LEFT JOIN drug_inventory_lots l ON l.drug_id = d.id AND l.warehouse_id = :wh AND l.deleted_at IS NULL AND l.is_active = 1
                  AND l.quantity_on_hand > 0 AND (l.expires_date IS NULL OR l.expires_date >= :today)
             WHERE " . implode(' AND ', $where) . "
             GROUP BY d.id ORDER BY COALESCE(SUM(l.quantity_on_hand), 0) > 0 DESC, d.name LIMIT 40"
        );
        $stmt->execute($params);
        $drugs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $lots = [];
        if ($drugs) {
            $stmt = $db->prepare(
                "SELECT id, drug_id, lot_number, expires_date, quantity_on_hand FROM drug_inventory_lots
                 WHERE warehouse_id = :wh AND deleted_at IS NULL AND is_active = 1 AND quantity_on_hand > 0 AND (expires_date IS NULL OR expires_date >= :today)
                   AND drug_id IN (" . implode(',', array_map(fn($d) => (int) $d['id'], $drugs)) . ")
                 ORDER BY expires_date IS NULL, expires_date, id"
            );
            $stmt->execute(['wh' => $warehouseId, 'today' => date('Y-m-d')]);
            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $l) {
                $lots[(int) $l['drug_id']][] = ['id' => (int) $l['id'], 'lot_number' => $l['lot_number'], 'expires_date' => $l['expires_date'], 'quantity' => (float) $l['quantity_on_hand']];
            }
        }

        return array_map(fn($d) => [
            'id' => (int) $d['id'], 'name' => $d['name'], 'generic_name' => $d['generic_name'], 'strength' => $d['strength'], 'product_type' => $d['product_type'],
            'unit_name' => $d['unit_name'], 'usable' => (float) $d['usable'], 'is_controlled' => $d['controlled_class'] !== 'None', 'is_high_alert' => (bool) $d['is_high_alert'],
            'lots' => $lots[(int) $d['id']] ?? []
        ], $drugs);
    }

    /**
     * data: case_id, kind, name? (free text, not from stock) or drug_id +
     * warehouse_id + quantity (+ lot_id?), dose?, route?, given_at?,
     * given_by?, notes?; implants: lot_number (typed, when not from
     * stock), manufacturer?, catalog_no?, serial_number?, expires_date?,
     * size?, body_site?
     */
    public function addItem(array $data, int $userId): array
    {
        $caseId = (int) ($data['case_id'] ?? 0);
        $kind = (string) ($data['kind'] ?? '');
        $db = Database::connection();
        $errors = [];
        if (!isset(self::ITEM_KINDS[$kind])) {
            return ['success' => false, 'message' => 'Choose what is being recorded.', 'errors' => ['kind' => 'Choose one.']];
        }

        $owns = $this->begin($db);
        try {
            $fail = function (string $message, array $errors = [], bool $notFound = false) use ($db, $owns) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => $message, 'errors' => $errors ?: null] + ($notFound ? ['not_found' => true] : []);
            };
            $stmt = $db->prepare("SELECT * FROM or_surgical_cases WHERE id = :id FOR UPDATE");
            $stmt->execute(['id' => $caseId]);
            $case = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$case) {
                return $fail('Surgical case not found.', [], true);
            }
            if (!in_array($case['perioperative_stage'], self::RECORDING_STAGES, true)) {
                return $fail($case['perioperative_stage'] === 'Cancelled' ? 'The case was cancelled.' : 'Items are recorded from pre-op holding on.');
            }

            $drugId = (int) ($data['drug_id'] ?? 0) ?: null;
            $warehouseId = (int) ($data['warehouse_id'] ?? 0) ?: null;
            $lotId = (int) ($data['lot_id'] ?? 0) ?: null;
            $quantity = isset($data['quantity']) && $data['quantity'] !== '' ? (float) $data['quantity'] : null;
            $name = self::text($data['name'] ?? null, 255);
            $drug = null;
            $warehouse = null;

            if ($drugId) {
                $stmt = $db->prepare(
                    "SELECT d.id, d.name, d.allow_inventory, d.is_active, du.name AS unit_name FROM drugs d
                     LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id WHERE d.id = :id AND d.deleted_at IS NULL"
                );
                $stmt->execute(['id' => $drugId]);
                $drug = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$drug || !(int) $drug['is_active'] || !(int) $drug['allow_inventory']) {
                    $errors['drug_id'] = 'Choose an item from the catalog.';
                }
                $stmt = $db->prepare("SELECT id, name FROM warehouses WHERE id = :id AND deleted_at IS NULL AND is_active = 1");
                $stmt->execute(['id' => (int) $warehouseId]);
                $warehouse = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$warehouse) {
                    $errors['warehouse_id'] = 'Choose the storage location it is taken from.';
                }
                if ($quantity === null || $quantity <= 0 || $quantity > 100000) {
                    $errors['quantity'] = 'Enter how many were used.';
                }
                $name = $drug['name'] ?? $name;
            } elseif ($name === null) {
                $errors['name'] = 'Choose an item from stock or type what was used.';
            }

            $givenAt = null;
            if (in_array($kind, ['medicine', 'fluid', 'blood'], true)) {
                $givenAt = date('Y-m-d H:i:s');
                if (!empty($data['given_at'])) {
                    $givenAt = OrLiveService::validDateTime((string) $data['given_at']);
                    if ($givenAt === null) {
                        $errors['given_at'] = 'Enter a valid time.';
                    } elseif ($givenAt > date('Y-m-d H:i:s', time() + 60)) {
                        $errors['given_at'] = 'That time is in the future.';
                    }
                }
                if (!$drugId && self::text($data['dose'] ?? null, 100) === null) {
                    $errors['dose'] = 'Enter the dose or volume given.';
                }
            }
            $route = self::text($data['route'] ?? null, 50);
            if ($route !== null && !in_array($route, self::ROUTES, true)) {
                $errors['route'] = 'Choose the route.';
            }

            $givenBy = (int) ($data['given_by'] ?? 0) ?: $userId;
            if ($givenBy !== $userId && !in_array($givenBy, array_column($this->team($case), 'user_id'), true)) {
                $errors['given_by'] = 'Choose someone on the case team.';
            }

            // Implant traceability: a lot number always (from the stock lot, or typed).
            $implant = ['manufacturer' => null, 'catalog_no' => null, 'lot_number' => null, 'serial_number' => null, 'expires_date' => null, 'size' => null, 'body_site' => null];
            if ($kind === 'implant') {
                foreach (['manufacturer' => 150, 'catalog_no' => 100, 'serial_number' => 100, 'size' => 50, 'body_site' => 150] as $k => $max) {
                    $implant[$k] = self::text($data[$k] ?? null, $max);
                }
                if (!$drugId) {
                    $implant['lot_number'] = self::text($data['lot_number'] ?? null, 100);
                    if ($implant['lot_number'] === null) {
                        $errors['lot_number'] = 'Enter the implant\'s lot number.';
                    }
                    if (!empty($data['expires_date'])) {
                        $exp = OrLiveService::validDate($data['expires_date']);
                        if ($exp === null) {
                            $errors['expires_date'] = 'Enter a valid date.';
                        } elseif ($exp < date('Y-m-d')) {
                            $errors['expires_date'] = 'This implant is expired. Don\'t use it.';
                        }
                        $implant['expires_date'] = $exp;
                    }
                    $quantity = $quantity ?? 1;
                } elseif (!$lotId) {
                    $errors['lot_id'] = 'Choose the lot the implant came from.';
                }
            }

            if ($errors) {
                return $fail('Check the highlighted fields.', $errors);
            }

            // Stock: the chosen lot, else earliest expiry first; expired lots never. Locked until the end.
            $plan = [];
            if ($drugId) {
                $stmt = $db->prepare(
                    "SELECT id, lot_number, expires_date, quantity_on_hand FROM drug_inventory_lots
                     WHERE drug_id = :drug AND warehouse_id = :wh AND deleted_at IS NULL AND is_active = 1 AND quantity_on_hand > 0
                       AND (expires_date IS NULL OR expires_date >= :today)" . ($lotId ? " AND id = :lot" : "") . "
                     ORDER BY expires_date IS NULL, expires_date, id FOR UPDATE"
                );
                $stmt->execute(['drug' => $drugId, 'wh' => $warehouseId, 'today' => date('Y-m-d')] + ($lotId ? ['lot' => $lotId] : []));
                $lots = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $available = array_sum(array_map(fn($l) => (float) $l['quantity_on_hand'], $lots));
                if ($quantity > $available + self::EPSILON) {
                    return $fail('Not enough stock.', ['quantity' => $lotId && !$lots
                        ? 'That lot can\'t be used (expired, empty or at another location).'
                        : 'Only ' . self::qty($available) . ' ' . ($drug['unit_name'] ?: 'units') . " usable at {$warehouse['name']}" . ($lotId ? ' in that lot' : '') . '.']);
                }
                $left = $quantity;
                foreach ($lots as $lot) {
                    if ($left <= self::EPSILON) {
                        break;
                    }
                    $take = round(min($left, (float) $lot['quantity_on_hand']), 3);
                    $plan[] = ['lot' => $lot, 'quantity' => $take];
                    $left = round($left - $take, 3);
                }
                if ($kind === 'implant') {
                    $implant['lot_number'] = $lots[0]['lot_number'];
                    $implant['expires_date'] = $lots[0]['expires_date'];
                }
            }

            $now = date('Y-m-d H:i:s');
            $db->prepare(
                "INSERT INTO or_case_items (case_id, kind, drug_id, warehouse_id, name, quantity, dose, route, given_at, given_by,
                        manufacturer, catalog_no, lot_number, serial_number, expires_date, size, body_site, notes, created_at, created_by)
                 VALUES (:c, :kind, :drug, :wh, :name, :qty, :dose, :route, :given_at, :given_by,
                        :manufacturer, :catalog_no, :lot_number, :serial_number, :expires_date, :size, :body_site, :notes, :now, :u)"
            )->execute($implant + [
                'c' => $caseId, 'kind' => $kind, 'drug' => $drugId, 'wh' => $drugId ? $warehouseId : null, 'name' => $name, 'qty' => $quantity,
                'dose' => self::text($data['dose'] ?? null, 100), 'route' => $route, 'given_at' => $givenAt, 'given_by' => $givenBy ?: null,
                'notes' => self::text($data['notes'] ?? null, 500), 'now' => $now, 'u' => $userId ?: null
            ]);
            $itemId = (int) $db->lastInsertId();

            $insertLot = $db->prepare("INSERT INTO or_case_item_lots (item_id, lot_id, quantity, unit_cost, created_at) VALUES (:i, :l, :q, :cost, :now)");
            $deduct = $db->prepare("UPDATE drug_inventory_lots SET quantity_on_hand = quantity_on_hand - :q, updated_at = :now, updated_by = :u WHERE id = :id");
            foreach ($plan as $p) {
                $cost = StockLedgerService::lotCost((int) $p['lot']['id'], $drugId);
                $insertLot->execute(['i' => $itemId, 'l' => $p['lot']['id'], 'q' => $p['quantity'], 'cost' => $cost, 'now' => $now]);
                $lotRowId = (int) $db->lastInsertId();
                $deduct->execute(['q' => $p['quantity'], 'now' => $now, 'u' => $userId ?: null, 'id' => $p['lot']['id']]);
                StockLedgerService::record((int) $p['lot']['id'], 'dispensed', -$p['quantity'], 'or_case_item_lots', $lotRowId, $userId, [
                    'unit_cost' => $cost, 'reference_no' => $case['case_number'], 'counterparty' => $case['patient_name'],
                    'notes' => 'Used in surgery: ' . $case['procedure_name']
                ]);
            }

            if ($kind === 'implant') {
                $this->syncImplantSummary($db, $caseId);
            }
            $this->commit($db, $owns);
        } catch (Throwable $e) {
            $this->rollBack($db, $owns);
            throw $e;
        }

        return ['success' => true, 'message' => self::ITEM_KINDS[$kind] . " recorded: {$name}" . ($plan ? ' (' . self::qty($quantity) . ' ' . ($drug['unit_name'] ?: 'units') . " taken from {$warehouse['name']})" : '') . '.'];
    }

    /** Undo a recorded item; anything taken from stock goes back to its lots. */
    public function voidItem(int $itemId, string $reason, int $userId): array
    {
        $reason = trim($reason);
        if ($reason === '') {
            return ['success' => false, 'message' => 'Enter why it is being removed.', 'errors' => ['reason' => 'Enter a reason.']];
        }
        $db = Database::connection();
        $owns = $this->begin($db);
        try {
            $stmt = $db->prepare("SELECT i.*, c.case_number, c.patient_name FROM or_case_items i JOIN or_surgical_cases c ON c.id = i.case_id WHERE i.id = :id FOR UPDATE");
            $stmt->execute(['id' => $itemId]);
            $item = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$item || $item['voided_at']) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => $item ? 'That item was already removed.' : 'Item not found.', 'not_found' => !$item];
            }
            $now = date('Y-m-d H:i:s');
            $db->prepare("UPDATE or_case_items SET voided_at = :now, voided_by = :u, void_reason = :r WHERE id = :id")
                ->execute(['now' => $now, 'u' => $userId ?: null, 'r' => mb_substr($reason, 0, 255), 'id' => $itemId]);

            $stmt = $db->prepare("SELECT il.* FROM or_case_item_lots il WHERE il.item_id = :i ORDER BY il.id");
            $stmt->execute(['i' => $itemId]);
            $restore = $db->prepare("UPDATE drug_inventory_lots SET quantity_on_hand = quantity_on_hand + :q, updated_at = :now, updated_by = :u WHERE id = :id");
            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $il) {
                $db->prepare("SELECT id FROM drug_inventory_lots WHERE id = :id FOR UPDATE")->execute(['id' => $il['lot_id']]);
                $restore->execute(['q' => $il['quantity'], 'now' => $now, 'u' => $userId ?: null, 'id' => $il['lot_id']]);
                StockLedgerService::record((int) $il['lot_id'], 'dispense_voided', (float) $il['quantity'], 'or_case_item_lots', (int) $il['id'], $userId, [
                    'unit_cost' => $il['unit_cost'], 'reference_no' => $item['case_number'], 'counterparty' => $item['patient_name'], 'reason' => $reason
                ]);
            }
            if ($item['kind'] === 'implant') {
                $this->syncImplantSummary($db, (int) $item['case_id']);
            }
            $this->commit($db, $owns);
        } catch (Throwable $e) {
            $this->rollBack($db, $owns);
            throw $e;
        }

        return ['success' => true, 'message' => "{$item['name']} removed" . ($item['drug_id'] ? '; the stock is back at its location.' : '.')];
    }

    /** The old implant_details text, kept in step for the older views. */
    private function syncImplantSummary(PDO $db, int $caseId): void
    {
        $stmt = $db->prepare("SELECT name, lot_number, serial_number FROM or_case_items WHERE case_id = :c AND kind = 'implant' AND voided_at IS NULL ORDER BY id");
        $stmt->execute(['c' => $caseId]);
        $lines = array_map(fn($i) => $i['name'] . ' (lot ' . $i['lot_number'] . ($i['serial_number'] ? ", S/N {$i['serial_number']}" : '') . ')', $stmt->fetchAll(PDO::FETCH_ASSOC));
        if ($lines) {
            $db->prepare("UPDATE or_surgical_cases SET implant_details = :d WHERE id = :id")->execute(['d' => mb_substr('Used: ' . implode('; ', $lines), 0, 2000), 'id' => $caseId]);
        }
    }

    /* ---------------------------------------------------------------
     * Specimens
     * ------------------------------------------------------------- */

    /** data: case_id, specimen_type, description, body_site?, container_count?, sent_to?, collected_at?, notes? */
    public function addSpecimen(array $data, int $userId): array
    {
        $caseId = (int) ($data['case_id'] ?? 0);
        $case = $this->caseRow($caseId);
        if (!$case) {
            return ['success' => false, 'message' => 'Surgical case not found.', 'not_found' => true];
        }
        if (!in_array($case['perioperative_stage'], ['In Room / Induction', 'Incision / In Progress', 'Closing / Extubation', 'In PACU', 'Transferred / Discharged'], true)) {
            return ['success' => false, 'message' => 'Specimens are recorded once the patient is in the room.'];
        }
        $errors = [];
        $type = (string) ($data['specimen_type'] ?? '');
        if (!in_array($type, self::SPECIMEN_TYPES, true)) {
            $errors['specimen_type'] = 'Choose the type.';
        }
        $description = self::text($data['description'] ?? null, 255);
        if ($description === null) {
            $errors['description'] = 'Describe the specimen.';
        }
        $containers = (int) ($data['container_count'] ?? 1);
        if ($containers < 1 || $containers > 50) {
            $errors['container_count'] = '1 to 50.';
        }
        $at = date('Y-m-d H:i:s');
        if (!empty($data['collected_at'])) {
            $at = OrLiveService::validDateTime((string) $data['collected_at']);
            if ($at === null || $at > date('Y-m-d H:i:s', time() + 60)) {
                $errors['collected_at'] = 'Enter a valid time, not in the future.';
            }
        }
        if ($errors) {
            return ['success' => false, 'message' => 'Check the highlighted fields.', 'errors' => $errors];
        }

        $db = Database::connection();
        $db->prepare(
            "INSERT INTO or_case_specimens (case_id, specimen_type, description, body_site, container_count, sent_to, collected_at, notes, created_at, created_by)
             VALUES (:c, :t, :d, :site, :n, :to, :at, :notes, :now, :u)"
        )->execute([
            'c' => $caseId, 't' => $type, 'd' => $description, 'site' => self::text($data['body_site'] ?? null, 150), 'n' => $containers,
            'to' => self::text($data['sent_to'] ?? null, 150), 'at' => $at, 'notes' => self::text($data['notes'] ?? null, 500), 'now' => date('Y-m-d H:i:s'), 'u' => $userId ?: null
        ]);
        $this->syncSpecimenSummary($caseId);

        return ['success' => true, 'message' => 'Specimen recorded.'];
    }

    public function removeSpecimen(int $id, int $userId): array
    {
        $db = Database::connection();
        $stmt = $db->prepare("SELECT case_id FROM or_case_specimens WHERE id = :id AND removed_at IS NULL");
        $stmt->execute(['id' => $id]);
        $caseId = (int) $stmt->fetchColumn();
        if (!$caseId) {
            return ['success' => false, 'message' => 'That specimen was already removed.', 'not_found' => true];
        }
        $db->prepare("UPDATE or_case_specimens SET removed_at = NOW(), removed_by = :u WHERE id = :id")->execute(['u' => $userId ?: null, 'id' => $id]);
        $this->syncSpecimenSummary($caseId);
        return ['success' => true, 'message' => 'Specimen removed.'];
    }

    /** The old specimens_sent text, kept in step for the older views. */
    private function syncSpecimenSummary(int $caseId): void
    {
        $db = Database::connection();
        $stmt = $db->prepare("SELECT specimen_type, description FROM or_case_specimens WHERE case_id = :c AND removed_at IS NULL ORDER BY id");
        $stmt->execute(['c' => $caseId]);
        $lines = array_map(fn($s) => "{$s['description']} ({$s['specimen_type']})", $stmt->fetchAll(PDO::FETCH_ASSOC));
        $db->prepare("UPDATE or_surgical_cases SET specimens_sent = :s WHERE id = :id")
            ->execute(['s' => $lines ? mb_substr(implode('; ', $lines), 0, 255) : null, 'id' => $caseId]);
    }

    /* ---------------------------------------------------------------
     * Helpers
     * ------------------------------------------------------------- */

    private function caseRow(int $id): ?array
    {
        $stmt = Database::connection()->prepare("SELECT * FROM or_surgical_cases WHERE id = :id");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /** The patient's current allergies from the chart. */
    public function allergies(?int $patientId): array
    {
        if (!$patientId) {
            return [];
        }
        $stmt = Database::connection()->prepare(
            "SELECT a.name, pa.reaction, pa.severity FROM patient_allergies pa JOIN allergies a ON a.id = pa.allergy_id
             WHERE pa.patient_id = :p AND pa.deleted_at IS NULL AND (pa.end_date IS NULL OR pa.end_date >= CURDATE()) ORDER BY a.name"
        );
        $stmt->execute(['p' => $patientId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /** The case team, for "given by". */
    private function team(array $case): array
    {
        $out = [];
        foreach (['lead_surgeon' => 'Surgeon', 'assistant_surgeon' => 'Assistant', 'anesthesiologist' => 'Anesthesiologist', 'scrub_nurse' => 'Scrub nurse', 'circulating_nurse' => 'Circulating nurse'] as $field => $role) {
            $id = (int) ($case["{$field}_user_id"] ?? 0);
            if ($id && !isset($out[$id])) {
                $out[$id] = ['user_id' => $id, 'name' => $case[$field], 'role' => $role];
            }
        }
        return array_values($out);
    }

    private static function int($v): ?int
    {
        return $v === null ? null : (int) $v;
    }

    private static function qty(float $v): string
    {
        return rtrim(rtrim(number_format($v, 3, '.', ','), '0'), '.');
    }

    private static function text($value, int $max): ?string
    {
        if (is_array($value)) {
            return null;
        }
        $value = trim((string) ($value ?? ''));
        return $value === '' ? null : mb_substr($value, 0, $max);
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
        $db->exec('SAVEPOINT or_intraop_step');
        return false;
    }

    private function commit(PDO $db, bool $owns): void
    {
        $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT or_intraop_step');
    }

    private function rollBack(PDO $db, bool $owns): void
    {
        if ($owns) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            return;
        }
        $db->exec('ROLLBACK TO SAVEPOINT or_intraop_step');
    }
}
