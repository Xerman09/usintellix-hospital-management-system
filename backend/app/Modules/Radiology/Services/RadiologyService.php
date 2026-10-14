<?php

namespace App\Modules\Radiology\Services;

use App\Core\Database;
use App\Modules\Alerts\Services\AlertService;
use PDO;

/**
 * Radiology (module 15, Phase 1: imaging orders and scheduling).
 *
 *   * order() -- an imaging request from the clinic, the ER, a ward or the ICU: the studies (one
 *     patient_procedure_orders row each), the priority, the clinical question, when it is needed, how the patient
 *     travels, and the safety answers radiology must have before scanning -- pregnancy (anything with X-rays),
 *     kidney function and contrast allergy (intravenous contrast), metal and implants (MRI). Doctors order; nurses
 *     enter a verbal or protocol order for a named doctor. A STAT request alerts radiology.
 *   * prep() -- the patient's preparation instructions: each study's own (nil by mouth, full bladder, oral contrast
 *     an hour before ...) plus what the safety answers add. Shown when ordering, on the worklist and as a printable
 *     sheet for the patient or the ward (prepSheet()).
 *   * worklist() -- "to schedule" (studies waiting, STAT first, overdue flagged) and the day's bookings per machine.
 *     slots() offers the free times on a machine for a day.
 *   * schedule() -- books studies on a machine at a time (back to back when there are several), checking the
 *     machine's modality, its working hours and that nothing else is booked then. reschedule(), cancelBooking(),
 *     arrived() and cancelStudy() for the rest of the day's changes.
 */
class RadiologyService
{
    public const ORDER_ROLES = ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse'];
    public const DOCTOR_ROLES = ['admin', 'doctor', 'clinician'];
    public const SCHEDULE_ROLES = ['admin', 'radiologic_technologist'];
    public const VIEW_ROLES = ['admin', 'radiologic_technologist', 'doctor', 'clinician', 'nurse', 'charge_nurse'];
    public const PRIORITIES = ['stat' => 'STAT', 'urgent' => 'Urgent', 'routine' => 'Routine'];
    /** Minutes after the order when a study still not booked counts as overdue. */
    public const OVERDUE = ['stat' => 30, 'urgent' => 120, 'routine' => 1440];
    public const SOURCES = ['clinic' => 'Clinic', 'er' => 'ER', 'ward' => 'Ward', 'icu' => 'ICU', 'other' => 'Other'];
    public const MODES = ['written' => 'Doctor', 'verbal' => 'Verbal order', 'protocol' => 'Protocol / standing order'];
    public const MODALITIES = ['xray' => 'X-ray', 'ultrasound' => 'Ultrasound', 'ct' => 'CT scan', 'mri' => 'MRI',
        'fluoroscopy' => 'Fluoroscopy', 'mammography' => 'Mammography'];
    public const CONTRAST = ['none' => 'No contrast', 'oral' => 'Oral contrast', 'iv' => 'Contrast into a vein',
        'both' => 'Oral and intravenous contrast', 'optional' => 'Contrast only if needed'];
    public const TRANSPORT = ['walking' => 'Walks to the department', 'wheelchair' => 'Wheelchair', 'stretcher' => 'Stretcher / trolley',
        'portable' => 'Cannot leave the bed (portable machine)'];
    public const ANSWERS = ['no' => 'No', 'yes' => 'Yes', 'unknown' => 'Not known'];
    /** Studies with X-rays: pregnancy must be asked. */
    public const IONISING = ['xray', 'ct', 'fluoroscopy', 'mammography'];
    /** A booking that holds its slot: still to do, or already done (Phase 2) -- only a cancellation frees the time. */
    public const BOOKING_LIVE = "('booked', 'arrived', 'performed')";
    private const OPEN_ER = "('waiting', 'triaged')";
    private const ACTIVE_ADM = "('Admitted', 'Pending Discharge')";

    // ------------------------------------------------------------------
    // Ordering
    // ------------------------------------------------------------------

    /** The orderable imaging studies, by modality / group. */
    public function catalog(): array
    {
        $rows = Database::connection()->query(
            "SELECT c.id, c.name, c.identifying_code, c.rad_modality, c.rad_minutes, c.rad_contrast, c.rad_portable, c.rad_prep,
                    g.name AS group_name, c.sequence, g.sequence AS group_seq
             FROM procedure_order_configs c LEFT JOIN procedure_order_configs g ON g.id = c.parent_id AND g.deleted_at IS NULL
             WHERE c.deleted_at IS NULL AND c.procedure_tier = 'procedure_order' AND (c.rad_modality IS NOT NULL OR c.order_test_type = 'Radiology')
             ORDER BY COALESCE(g.sequence, 999), g.name, c.sequence, c.name"
        )->fetchAll(PDO::FETCH_ASSOC);
        return array_map(fn($t) => self::studyOut($t), $rows);
    }

    private static function studyOut(array $t): array
    {
        $modality = $t['rad_modality'] && isset(self::MODALITIES[$t['rad_modality']]) ? $t['rad_modality'] : 'xray';
        return ['id' => (int) $t['id'], 'name' => $t['name'], 'code' => $t['identifying_code'], 'group' => $t['group_name'] ?? 'Other imaging',
            'modality' => $modality, 'modality_label' => self::MODALITIES[$modality], 'minutes' => (int) ($t['rad_minutes'] ?: 15),
            'contrast' => $t['rad_contrast'] ?: 'none', 'contrast_label' => self::CONTRAST[$t['rad_contrast'] ?? 'none'] ?? 'No contrast',
            'portable' => (bool) $t['rad_portable'], 'prep' => $t['rad_prep']];
    }

    /** The machines (optionally of one modality). */
    public function rooms(?string $modality = null, bool $activeOnly = true): array
    {
        $db = Database::connection();
        $where = [];
        if ($activeOnly) {
            $where[] = 'is_active = 1';
        }
        if ($modality !== null && isset(self::MODALITIES[$modality])) {
            $where[] = 'modality = ' . $db->quote($modality);
        }
        $rows = $db->query("SELECT * FROM rad_rooms" . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . " ORDER BY sequence, id")->fetchAll(PDO::FETCH_ASSOC);
        return array_map(fn($r) => ['id' => (int) $r['id'], 'name' => $r['name'], 'modality' => $r['modality'],
            'modality_label' => self::MODALITIES[$r['modality']] ?? $r['modality'], 'location' => $r['location'], 'slot_minutes' => (int) $r['slot_minutes'],
            'open_from' => substr($r['open_from'], 0, 5), 'open_to' => substr($r['open_to'], 0, 5), 'open_days' => $r['open_days'],
            'around_the_clock' => (bool) $r['around_the_clock'], 'portable' => (bool) $r['portable'], 'notes' => $r['notes'],
            'is_active' => (bool) $r['is_active']], $rows);
    }

    /** What the order dialog needs: the patient, where they are, studies already waiting, the catalog, the doctors. */
    public function orderContext(array $q, array $actor): ?array
    {
        $db = Database::connection();
        $ctx = $this->context($db, $q);
        if (!$ctx) {
            return null;
        }
        $pid = $ctx['patient']['id'];
        $waiting = $db->prepare(
            "SELECT o.procedure_order_config_id AS study_id, c.name, o.status, r.request_no, r.ordered_at,
                    (SELECT b.start_at FROM rad_bookings b WHERE b.order_id = o.id AND b.status IN " . self::BOOKING_LIVE . " ORDER BY b.id DESC LIMIT 1) AS start_at
             FROM patient_procedure_orders o JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
             LEFT JOIN rad_requests r ON r.id = o.rad_request_id
             WHERE o.patient_id = :p AND o.deleted_at IS NULL AND o.rad_request_id IS NOT NULL AND o.status IN ('pending', 'scheduled')
               AND o.created_at >= NOW() - INTERVAL 2 DAY ORDER BY o.id DESC"
        );
        $waiting->execute(['p' => $pid]);
        return $ctx + [
            'waiting' => $waiting->fetchAll(PDO::FETCH_ASSOC),
            'catalog' => $this->catalog(),
            'rooms' => $this->rooms(),
            'doctors' => $this->doctors($db),
            'is_doctor' => in_array($actor['role'] ?? '', self::DOCTOR_ROLES, true),
            'last' => $this->lastValues($db, $pid),
            'options' => self::options(),
            'now' => (string) $db->query("SELECT NOW()")->fetchColumn(),
        ];
    }

    /**
     * data: patient_id | er_visit_id | admission_id, studies [config ids], priority, indication, needed_by,
     * pregnancy, lmp, creatinine, creatinine_at, contrast_allergy (+ detail), implants (+ detail), weight_kg,
     * transport, isolation, sedation, order_mode + ordering_user_id (nurses), confirm.
     */
    public function order(array $data, array $actor): array
    {
        $role = $actor['role'] ?? '';
        if (!in_array($role, self::ORDER_ROLES, true)) {
            return ['success' => false, 'message' => 'Imaging is ordered by the doctors (or a nurse for a doctor).', 'forbidden' => true];
        }
        $db = Database::connection();
        $ctx = $this->context($db, $data);
        if (!$ctx) {
            return ['success' => false, 'message' => 'Patient not found.', 'not_found' => true];
        }
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $errors = [];
        $ids = array_values(array_unique(array_map('intval', (array) ($data['studies'] ?? []))));
        $catalog = [];
        foreach ($this->catalog() as $s) {
            $catalog[$s['id']] = $s;
        }
        $studies = array_values(array_filter(array_map(fn($id) => $catalog[$id] ?? null, $ids)));
        if (!$studies || count($studies) !== count($ids)) {
            $errors['studies'] = 'Choose the studies.';
        }
        $priority = (string) ($data['priority'] ?? 'routine');
        if (!isset(self::PRIORITIES[$priority])) {
            $errors['priority'] = 'Routine, urgent or STAT?';
        }
        $neededBy = trim(str_replace('T', ' ', (string) ($data['needed_by'] ?? '')));
        if ($neededBy === '') {
            $neededBy = null;
        } elseif (!preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/', $neededBy) || !strtotime($neededBy)) {
            $errors['needed_by'] = 'Use a real date and time.';
        } else {
            $neededBy = substr($neededBy, 0, 16) . ':00';
            if (self::ts($neededBy) > self::ts($now) + 30 * 86400) {
                $errors['needed_by'] = 'At most a month ahead.';
            }
        }
        $indication = trim((string) ($data['indication'] ?? ''));
        if ($indication === '') {
            $errors['indication'] = 'What should the scan answer? Radiology needs the clinical question.';
        } elseif (mb_strlen($indication) > 500) {
            $errors['indication'] = 'At most 500 characters.';
        }
        $isDoctor = in_array($role, self::DOCTOR_ROLES, true);
        $mode = $isDoctor ? (string) ($data['order_mode'] ?? 'written') : (string) ($data['order_mode'] ?? '');
        $orderingId = $isDoctor && $mode === 'written' ? (int) $actor['id'] : (int) ($data['ordering_user_id'] ?? 0);
        if (!isset(self::MODES[$mode]) || (!$isDoctor && $mode === 'written')) {
            $errors['order_mode'] = 'A verbal order or a protocol / standing order?';
        }
        if (!$isDoctor || $mode !== 'written') {
            if (!in_array($orderingId, array_map(fn($d) => (int) $d['id'], $this->doctors($db)), true)) {
                $errors['ordering_user_id'] = 'Which doctor ordered it?';
            }
        }
        $transport = (string) ($data['transport'] ?? '');
        if ($transport !== '' && !isset(self::TRANSPORT[$transport])) {
            $errors['transport'] = 'How does the patient travel?';
        }
        $weight = trim((string) ($data['weight_kg'] ?? ''));
        if ($weight !== '' && (!is_numeric($weight) || (float) $weight <= 0 || (float) $weight > 500)) {
            $errors['weight_kg'] = 'Enter the weight in kilograms.';
        }
        foreach (['isolation' => 100, 'contrast_allergy_detail' => 255, 'implants_detail' => 255] as $k => $max) {
            if (mb_strlen(trim((string) ($data[$k] ?? ''))) > $max) {
                $errors[$k] = "At most {$max} characters.";
            }
        }

        // ---- the safety answers each kind of study needs
        $modalities = array_values(array_unique(array_column($studies, 'modality')));
        $needsPregnancy = $this->childbearing($ctx['patient']) && array_intersect($modalities, self::IONISING);
        $needsContrast = (bool) array_filter($studies, fn($s) => in_array($s['contrast'], ['iv', 'both', 'optional'], true));
        $needsImplants = in_array('mri', $modalities, true);
        $pregnancy = (string) ($data['pregnancy'] ?? '');
        $allergy = (string) ($data['contrast_allergy'] ?? '');
        $implants = (string) ($data['implants'] ?? '');
        if ($pregnancy !== '' && !isset(self::ANSWERS[$pregnancy])) {
            $errors['pregnancy'] = 'Could the patient be pregnant?';
        } elseif ($needsPregnancy && $pregnancy === '') {
            $errors['pregnancy'] = 'X-rays: ask whether the patient could be pregnant.';
        }
        if ($allergy !== '' && !isset(self::ANSWERS[$allergy])) {
            $errors['contrast_allergy'] = 'Has the patient ever reacted to contrast?';
        } elseif ($needsContrast && $allergy === '') {
            $errors['contrast_allergy'] = 'This study can use contrast: has the patient ever reacted to contrast?';
        }
        if ($implants !== '' && !isset(self::ANSWERS[$implants])) {
            $errors['implants'] = 'Any pacemaker, clips, implants or metal?';
        } elseif ($needsImplants && $implants === '') {
            $errors['implants'] = 'MRI: ask about a pacemaker, clips, implants or metal in the body.';
        }
        $lmp = trim((string) ($data['lmp'] ?? ''));
        if ($lmp !== '' && (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $lmp) || $lmp > substr($now, 0, 10))) {
            $errors['lmp'] = 'Use a real date, not in the future.';
        }
        $creat = trim((string) ($data['creatinine'] ?? ''));
        if ($creat !== '' && (!is_numeric($creat) || (float) $creat <= 0 || (float) $creat > 50)) {
            $errors['creatinine'] = 'Enter the creatinine in mg/dL.';
        }
        $creatAt = trim((string) ($data['creatinine_at'] ?? ''));
        if ($creatAt !== '' && (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $creatAt) || $creatAt > substr($now, 0, 10))) {
            $errors['creatinine_at'] = 'Use a real date, not in the future.';
        }
        if ($errors) {
            return ['success' => false, 'message' => reset($errors), 'errors' => $errors];
        }

        // ---- things the person ordering must look at before it is sent
        $warnings = [];
        if ($pregnancy === 'yes' && array_intersect($modalities, self::IONISING)) {
            $warnings[] = 'The patient is pregnant and this study uses X-rays. Only order it if the benefit is worth the risk; radiology will shield the abdomen.';
        }
        if ($pregnancy === 'unknown' && array_intersect($modalities, self::IONISING)) {
            $warnings[] = 'It is not known whether the patient is pregnant. Radiology will ask again (and may do a pregnancy test) before scanning.';
        }
        if ($allergy === 'yes' && $needsContrast) {
            $warnings[] = 'The patient has reacted to contrast before. Radiology will check with the radiologist; premedication or a scan without contrast may be needed.';
        }
        if ($implants === 'yes' && $needsImplants) {
            $warnings[] = 'The patient has metal or an implant. MRI will screen it before the scan: bring the implant card if there is one.';
        }
        if ($creat !== '' && (float) $creat >= 1.5 && $needsContrast) {
            $warnings[] = "Creatinine {$creat} mg/dL: contrast into a vein may harm the kidneys. Radiology will check with the radiologist.";
        }
        $dupes = $db->prepare(
            "SELECT DISTINCT c.name FROM patient_procedure_orders o JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
             WHERE o.patient_id = :p AND o.deleted_at IS NULL AND o.rad_request_id IS NOT NULL AND o.status IN ('pending', 'scheduled')
               AND o.created_at >= NOW() - INTERVAL 2 DAY AND o.procedure_order_config_id IN (" . implode(',', array_map('intval', $ids)) . ")"
        );
        $dupes->execute(['p' => $ctx['patient']['id']]);
        $dup = $dupes->fetchAll(PDO::FETCH_COLUMN);
        if ($dup) {
            $warnings[] = 'Already ordered and not done yet: ' . implode(', ', $dup) . '.';
        }
        if ($warnings && empty($data['confirm'])) {
            return ['success' => false, 'message' => implode(' ', $warnings), 'needs_confirm' => true, 'warnings' => $warnings, 'duplicates' => $dup];
        }

        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT rad_order');
        try {
            $no = 'RX-' . $this->next($db, 'request', 3);
            $db->prepare(
                "INSERT INTO rad_requests (request_no, patient_id, source, er_visit_id, admission_id, location, priority, indication, needed_by, pregnancy, lmp,
                    creatinine, creatinine_at, contrast_allergy, contrast_allergy_detail, implants, implants_detail, weight_kg, transport, isolation, sedation,
                    order_mode, ordering_user_id, ordered_by, ordered_at, status, created_at)
                 VALUES (:no, :p, :src, :er, :adm, :loc, :pr, :ind, :need, :preg, :lmp, :creat, :creatat, :all, :alld, :imp, :impd, :w, :tr, :iso, :sed,
                    :mode, :ou, :by, NOW(), 'open', NOW())"
            )->execute([
                'no' => $no, 'p' => $ctx['patient']['id'], 'src' => $ctx['source'], 'er' => $ctx['er_visit_id'], 'adm' => $ctx['admission_id'], 'loc' => $ctx['location'],
                'pr' => $priority, 'ind' => $indication, 'need' => $neededBy, 'preg' => $pregnancy !== '' ? $pregnancy : null, 'lmp' => $lmp !== '' ? $lmp : null,
                'creat' => $creat !== '' ? round((float) $creat, 2) : null, 'creatat' => $creatAt !== '' ? $creatAt : null,
                'all' => $allergy !== '' ? $allergy : null, 'alld' => self::text($data['contrast_allergy_detail'] ?? null, 255),
                'imp' => $implants !== '' ? $implants : null, 'impd' => self::text($data['implants_detail'] ?? null, 255),
                'w' => $weight !== '' ? round((float) $weight, 2) : null, 'tr' => $transport !== '' ? $transport : null,
                'iso' => self::text($data['isolation'] ?? null, 100), 'sed' => (int) !empty($data['sedation']),
                'mode' => $mode, 'ou' => $orderingId ?: null, 'by' => (int) $actor['id'],
            ]);
            $rid = (int) $db->lastInsertId();
            $prov = $db->prepare("SELECT pr.id FROM providers pr JOIN employees e ON e.id = pr.employee_id WHERE e.user_id = :u AND pr.deleted_at IS NULL LIMIT 1");
            $prov->execute(['u' => $orderingId]);
            $providerId = $prov->fetchColumn() ?: null;
            $ins = $db->prepare(
                "INSERT INTO patient_procedure_orders (patient_id, procedure_order_config_id, provider_id, rad_request_id, priority, order_date, status, created_at, created_by)
                 VALUES (:p, :c, :pr, :r, :pri, CURDATE(), 'pending', NOW(), :u)"
            );
            foreach ($studies as $s) {
                $ins->execute(['p' => $ctx['patient']['id'], 'c' => $s['id'], 'pr' => $providerId, 'r' => $rid, 'pri' => $priority, 'u' => (int) $actor['id']]);
            }
            if ($priority === 'stat') {
                AlertService::raise([
                    'type' => 'imaging_stat', 'urgency' => 'urgent',
                    'title' => 'STAT imaging: ' . implode(', ', array_map(fn($s) => $s['code'] ?: $s['name'], $studies)) . " — {$ctx['patient']['name']}"
                        . ($ctx['location'] ? " ({$ctx['location']})" : ''),
                    'body' => "{$no}. {$indication} Scan within " . self::OVERDUE['stat'] . ' minutes.'
                        . ($transport !== '' ? ' ' . self::TRANSPORT[$transport] . '.' : ''),
                    'patient_id' => $ctx['patient']['id'], 'link' => ['tab' => 'rad_worklist'], 'targets' => [['role' => 'radiologic_technologist']],
                    'source_type' => 'rad_requests', 'source_id' => $rid, 'dedupe_key' => "radstat:{$rid}",
                ]);
            }
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT rad_order');
        } catch (\Throwable $e) {
            $owns ? $db->rollBack() : $db->exec('ROLLBACK TO SAVEPOINT rad_order');
            throw $e;
        }
        $n = count($studies);
        $request = $this->request($db, $rid);
        return ['success' => true, 'message' => "{$no}: {$n} " . ($n === 1 ? 'study' : 'studies') . ' sent to radiology to schedule.',
            'data' => ['id' => $rid, 'request_no' => $no, 'prep' => self::prep($studies, $request), 'warnings' => $warnings]];
    }

    /** data: order_id, reason -- cancel a study not done yet (its booking goes too). */
    public function cancelStudy(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', array_merge(self::ORDER_ROLES, self::SCHEDULE_ROLES), true)) {
            return ['success' => false, 'message' => 'Studies are cancelled by the doctors, nurses or radiology.', 'forbidden' => true];
        }
        $db = Database::connection();
        $st = $db->prepare("SELECT o.*, c.name FROM patient_procedure_orders o JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
            WHERE o.id = :id AND o.deleted_at IS NULL");
        $st->execute(['id' => (int) ($data['order_id'] ?? 0)]);
        $o = $st->fetch(PDO::FETCH_ASSOC);
        if (!$o || !$o['rad_request_id'] || !in_array($o['status'], ['pending', 'scheduled'], true)) {
            return ['success' => false, 'message' => 'Only a study that has not been done yet can be cancelled.', 'not_found' => true];
        }
        $reason = trim((string) ($data['reason'] ?? ''));
        if ($reason === '' || mb_strlen($reason) > 255) {
            return ['success' => false, 'message' => 'Why cancel it?', 'errors' => ['reason' => 'Required.']];
        }
        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT rad_cancel');
        try {
            $db->prepare("UPDATE rad_bookings SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = :u, cancel_reason = :r
                WHERE order_id = :o AND status IN " . self::BOOKING_LIVE)->execute(['u' => (int) $actor['id'], 'r' => "Study cancelled: {$reason}", 'o' => $o['id']]);
            $db->prepare("UPDATE patient_procedure_orders SET status = 'cancelled', cancel_reason = :r, rad_booking_id = NULL, updated_at = NOW(), updated_by = :u WHERE id = :id")
                ->execute(['r' => $reason, 'u' => (int) $actor['id'], 'id' => $o['id']]);
            $this->refreshRequest($db, (int) $o['rad_request_id'], (int) $actor['id'], $reason);
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT rad_cancel');
        } catch (\Throwable $e) {
            $owns ? $db->rollBack() : $db->exec('ROLLBACK TO SAVEPOINT rad_cancel');
            throw $e;
        }
        return ['success' => true, 'message' => "{$o['name']} cancelled."];
    }

    // ------------------------------------------------------------------
    // Preparation instructions
    // ------------------------------------------------------------------

    /**
     * The patient's preparation: each study's own instructions, then what the request's own answers add.
     * @return array ['studies' => [['name', 'modality_label', 'minutes', 'contrast_label', 'prep']], 'general' => [string]]
     */
    public static function prep(array $studies, ?array $request = null): array
    {
        $general = [];
        $modalities = array_values(array_unique(array_column($studies, 'modality')));
        $contrasts = array_values(array_unique(array_column($studies, 'contrast')));
        if (array_intersect(['iv', 'both'], $contrasts)) {
            $general[] = 'Contrast into a vein: a cannula is placed. The patient may feel warm and taste metal for a moment — that is normal.';
            $general[] = 'A creatinine from the last 30 days is needed before the contrast'
                . ($request && $request['creatinine'] !== null ? " (on file: {$request['creatinine']} mg/dL" . ($request['creatinine_at'] ? " of {$request['creatinine_at']}" : '') . ').' : '.');
            if ($request && ($request['contrast_allergy'] ?? null) === 'yes') {
                $general[] = 'The patient has reacted to contrast before' . ($request['contrast_allergy_detail'] ? " ({$request['contrast_allergy_detail']})" : '')
                    . ': the radiologist decides on premedication or a scan without contrast.';
            }
        }
        if (in_array('both', $contrasts, true)) {
            $general[] = 'Oral contrast is drunk in the department about an hour before the scan, so come early.';
        }
        if (in_array('mri', $modalities, true)) {
            $general[] = 'MRI: all metal comes off (jewellery, watch, hairpins, hearing aids, cards, clothing with zips).';
            if ($request && ($request['implants'] ?? null) === 'yes') {
                $general[] = 'The patient has metal or an implant' . ($request['implants_detail'] ? " ({$request['implants_detail']})" : '')
                    . ': MRI screens it before the scan. Bring the implant card.';
            }
        }
        if ($request && array_intersect($modalities, self::IONISING)) {
            if (($request['pregnancy'] ?? null) === 'yes') {
                $general[] = 'The patient is pregnant: radiology shields the abdomen and uses the lowest dose, and the radiologist checks the request first.';
            } elseif (($request['pregnancy'] ?? null) === 'unknown') {
                $general[] = 'Pregnancy is not known: radiology asks again before the scan and may do a pregnancy test.';
            }
        }
        if ($request && !empty($request['sedation'])) {
            $general[] = 'Sedation is planned: nothing to eat for 6 hours and nothing to drink for 2 hours before, and someone must stay with the patient afterwards.';
        }
        if ($request && !empty($request['isolation'])) {
            $general[] = "The patient is isolated ({$request['isolation']}): radiology books the last slot of the session and cleans the room afterwards.";
        }
        if ($request && ($request['transport'] ?? null)) {
            $general[] = 'Transport: ' . (self::TRANSPORT[$request['transport']] ?? $request['transport']) . '.';
        }
        $general[] = 'Bring the request, the chart and any previous films or reports of the same part of the body.';
        return [
            'studies' => array_map(fn($s) => ['name' => $s['name'], 'modality_label' => $s['modality_label'], 'minutes' => $s['minutes'],
                'contrast_label' => $s['contrast_label'], 'prep' => $s['prep'] ?: 'No special preparation.'], $studies),
            'general' => $general,
        ];
    }

    /** Everything a printable preparation sheet needs for one request. */
    public function prepSheet(int $requestId, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::VIEW_ROLES, true)) {
            return ['success' => false, 'message' => 'Not allowed.', 'forbidden' => true];
        }
        $db = Database::connection();
        $r = $this->request($db, $requestId);
        if (!$r) {
            return ['success' => false, 'message' => 'Request not found.', 'not_found' => true];
        }
        $row = $this->shapeRequest($db, $r, (string) $db->query("SELECT NOW()")->fetchColumn());
        $studies = array_values(array_filter($row['studies'], fn($s) => $s['status'] !== 'cancelled'));
        return ['success' => true, 'message' => 'Ready.', 'data' => $row + ['prep' => self::prep($studies, $r)]];
    }

    // ------------------------------------------------------------------
    // The worklist
    // ------------------------------------------------------------------

    /** filters: view (schedule | booked), date (booked), room_id, modality, q. */
    public function worklist(array $f, array $actor): array
    {
        $db = Database::connection();
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $view = ($f['view'] ?? 'schedule') === 'booked' ? 'booked' : 'schedule';
        $modality = isset(self::MODALITIES[$f['modality'] ?? '']) ? (string) $f['modality'] : '';
        $q = trim((string) ($f['q'] ?? ''));
        $out = ['view' => $view, 'now' => $now, 'rooms' => $this->rooms(), 'options' => self::options(),
            'can_schedule' => in_array($actor['role'] ?? '', self::SCHEDULE_ROLES, true),
            'can_order' => in_array($actor['role'] ?? '', self::ORDER_ROLES, true),
            'counts' => $this->counts($db)];
        if ($view === 'schedule') {
            $sql = "SELECT r.* FROM rad_requests r JOIN patients pt ON pt.id = r.patient_id WHERE r.status = 'open'
                    ORDER BY FIELD(r.priority, 'stat', 'urgent', 'routine'), COALESCE(r.needed_by, r.ordered_at), r.id";
            $rows = array_map(fn($r) => $this->shapeRequest($db, $r, $now), $db->query($sql)->fetchAll(PDO::FETCH_ASSOC));
            $rows = array_values(array_filter($rows, function ($x) use ($modality, $q) {
                $todo = array_values(array_filter($x['studies'], fn($s) => $s['status'] === 'pending'));
                if (!$todo) {
                    return false;
                }
                if ($modality !== '' && !array_filter($todo, fn($s) => $s['modality'] === $modality)) {
                    return false;
                }
                return $q === '' || self::matches($x, $q);
            }));
            $out['requests'] = $rows;
            return $out;
        }
        $date = (string) ($f['date'] ?? '');
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) || date('Y-m-d', strtotime($date)) !== $date) {
            $date = substr($now, 0, 10);
        }
        $roomId = (int) ($f['room_id'] ?? 0);
        $out['date'] = $date;
        $out['room_id'] = $roomId ?: null;
        $out['day'] = $this->day($db, $date, $roomId, $modality, $q, $now);
        return $out;
    }

    private function counts(PDO $db): array
    {
        $c = $db->query(
            "SELECT
               (SELECT COUNT(*) FROM patient_procedure_orders o JOIN rad_requests r ON r.id = o.rad_request_id
                  WHERE o.deleted_at IS NULL AND o.status = 'pending') AS to_schedule,
               (SELECT COUNT(*) FROM patient_procedure_orders o JOIN rad_requests r ON r.id = o.rad_request_id
                  WHERE o.deleted_at IS NULL AND o.status = 'pending' AND r.priority = 'stat') AS stat,
               (SELECT COUNT(*) FROM patient_procedure_orders o JOIN rad_requests r ON r.id = o.rad_request_id
                  WHERE o.deleted_at IS NULL AND o.status = 'pending'
                    AND TIMESTAMPDIFF(MINUTE, r.ordered_at, NOW()) > CASE r.priority WHEN 'stat' THEN " . self::OVERDUE['stat']
                    . " WHEN 'urgent' THEN " . self::OVERDUE['urgent'] . " ELSE " . self::OVERDUE['routine'] . " END) AS overdue,
               (SELECT COUNT(*) FROM rad_bookings WHERE status IN " . self::BOOKING_LIVE . " AND DATE(start_at) = CURDATE()) AS booked_today,
               (SELECT COUNT(*) FROM rad_bookings WHERE status = 'arrived') AS waiting_in_department"
        )->fetch(PDO::FETCH_ASSOC);
        return array_map('intval', $c);
    }

    /** One day per machine: its bookings (and how full it is). */
    private function day(PDO $db, string $date, int $roomId, string $modality, string $q, string $now): array
    {
        $out = [];
        foreach ($this->rooms() as $room) {
            if (($roomId && $room['id'] !== $roomId) || ($modality !== '' && $room['modality'] !== $modality)) {
                continue;
            }
            $st = $db->prepare(
                "SELECT b.*, c.name AS study_name, c.identifying_code, c.rad_modality, c.rad_contrast, o.status AS order_status,
                        (SELECT COUNT(*) FROM rad_images i WHERE i.order_id = o.id AND i.deleted_at IS NULL) AS images,
                        (SELECT r.status FROM rad_reports r WHERE r.order_id = o.id ORDER BY r.version DESC LIMIT 1) AS report_status,
                        r.request_no, r.priority, r.indication, r.location, r.transport, r.isolation, r.sedation, r.pregnancy, r.implants, r.contrast_allergy,
                        p.patient_no, p.first_name, p.middle_name, p.last_name, p.sex, p.birthdate,
                        " . self::nameSql('b.booked_by') . " AS booked_by_name
                 FROM rad_bookings b
                 JOIN patient_procedure_orders o ON o.id = b.order_id
                 JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
                 JOIN rad_requests r ON r.id = b.request_id
                 JOIN patients p ON p.id = b.patient_id
                 WHERE b.room_id = :room AND DATE(b.start_at) = :d AND b.status <> 'cancelled'
                 ORDER BY b.start_at, b.id"
            );
            $st->execute(['room' => $room['id'], 'd' => $date]);
            $bookings = [];
            $minutes = 0;
            foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $b) {
                $patient = self::patientOut(['id' => $b['patient_id']] + $b);
                if ($q !== '' && !str_contains(strtolower("{$patient['name']} {$patient['mrn']} {$b['request_no']} {$b['study_name']}"), strtolower($q))) {
                    continue;
                }
                $minutes += (int) $b['minutes'];
                $bookings[] = [
                    'id' => (int) $b['id'], 'order_id' => (int) $b['order_id'], 'request_id' => (int) $b['request_id'], 'request_no' => $b['request_no'],
                    'start_at' => $b['start_at'], 'end_at' => $b['end_at'], 'minutes' => (int) $b['minutes'], 'status' => $b['status'],
                    'study' => $b['study_name'], 'code' => $b['identifying_code'], 'modality' => $b['rad_modality'],
                    'contrast' => $b['rad_contrast'], 'contrast_label' => self::CONTRAST[$b['rad_contrast'] ?? 'none'] ?? null,
                    'priority' => $b['priority'], 'indication' => $b['indication'], 'location' => $b['location'],
                    'transport' => $b['transport'] ? (self::TRANSPORT[$b['transport']] ?? $b['transport']) : null, 'isolation' => $b['isolation'],
                    'sedation' => (bool) $b['sedation'], 'pregnancy' => $b['pregnancy'], 'implants' => $b['implants'], 'contrast_allergy' => $b['contrast_allergy'],
                    'prep_given' => (bool) $b['prep_given'], 'note' => $b['note'], 'booked_by' => $b['booked_by_name'], 'arrived_at' => $b['arrived_at'],
                    'performed_at' => $b['performed_at'], 'technique' => $b['technique'], 'contrast_given' => (bool) $b['contrast_given'],
                    'images' => (int) $b['images'], 'report_status' => $b['report_status'],
                    'patient' => $patient, 'late' => $b['status'] === 'booked' && $b['start_at'] < $now,
                ];
            }
            $open = $this->openMinutes($room, $date);
            $out[] = ['room' => $room, 'bookings' => $bookings, 'booked_minutes' => $minutes, 'open_minutes' => $open,
                'full_pct' => $open > 0 ? round(100 * $minutes / $open) : null, 'closed' => !$this->worksOn($room, $date)];
        }
        return $out;
    }

    /** The free start times on a machine for a day, in its own slot steps. */
    public function slots(int $roomId, string $date, int $minutes, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::VIEW_ROLES, true)) {
            return ['success' => false, 'message' => 'Not allowed.', 'forbidden' => true];
        }
        $db = Database::connection();
        $room = $this->room($db, $roomId);
        if (!$room) {
            return ['success' => false, 'message' => 'Machine not found.', 'not_found' => true];
        }
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) || date('Y-m-d', strtotime($date)) !== $date) {
            $date = substr($now, 0, 10);
        }
        $minutes = max(5, min(240, $minutes ?: $room['slot_minutes']));
        $step = max(5, $room['slot_minutes']);
        [$from, $to] = $this->hours($room, $date);
        $taken = $this->bookings($db, $roomId, $date);
        $free = [];
        for ($t = self::ts($from); $t + $minutes * 60 <= self::ts($to) + 60; $t += $step * 60) {
            $start = self::fmt($t);
            $end = self::fmt($t + $minutes * 60);
            $clash = false;
            foreach ($taken as $b) {
                if ($start < $b['end_at'] && $end > $b['start_at']) {
                    $clash = true;
                    break;
                }
            }
            $free[] = ['start_at' => $start, 'end_at' => $end, 'free' => !$clash, 'past' => $start < $now];
        }
        return ['success' => true, 'message' => 'Ready.', 'data' => ['room' => $room, 'date' => $date, 'minutes' => $minutes, 'now' => $now,
            'closed' => !$this->worksOn($room, $date), 'open_from' => substr($from, 11, 5), 'open_to' => substr($to, 11, 5),
            'slots' => $free, 'bookings' => array_map(fn($b) => ['start_at' => $b['start_at'], 'end_at' => $b['end_at'], 'study' => $b['study_name'],
                'patient' => trim("{$b['first_name']} {$b['last_name']}"), 'status' => $b['status']], $taken)]];
    }

    // ------------------------------------------------------------------
    // Booking
    // ------------------------------------------------------------------

    /**
     * data: order_ids (studies of one request), room_id, start_at, minutes (blank = the studies' own), prep_given, note.
     * Several studies are booked back to back on the same machine.
     */
    public function schedule(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::SCHEDULE_ROLES, true)) {
            return ['success' => false, 'message' => 'Imaging is scheduled by radiology.', 'forbidden' => true];
        }
        $db = Database::connection();
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $ids = array_values(array_unique(array_map('intval', (array) ($data['order_ids'] ?? []))));
        $room = $this->room($db, (int) ($data['room_id'] ?? 0));
        $errors = [];
        if (!$room || !$room['is_active']) {
            $errors['room_id'] = 'Choose the machine.';
        }
        $studies = [];
        $requestId = null;
        foreach ($ids as $id) {
            $o = $this->study($db, $id);
            if (!$o || !$o['rad_request_id'] || $o['status'] !== 'pending') {
                return ['success' => false, 'message' => 'Only a study waiting to be scheduled can be booked.', 'not_found' => true];
            }
            if ($requestId !== null && (int) $o['rad_request_id'] !== $requestId) {
                return ['success' => false, 'message' => 'Book the studies of one request at a time.'];
            }
            $requestId = (int) $o['rad_request_id'];
            $studies[] = $o;
        }
        if (!$studies) {
            $errors['order_ids'] = 'Tick the studies to book.';
        }
        if ($room) {
            foreach ($studies as $o) {
                $m = self::studyOut($o)['modality'];
                if ($m !== $room['modality']) {
                    $errors['room_id'] = "{$o['name']} is " . self::MODALITIES[$m] . ", so it cannot go on {$room['name']} (" . $room['modality_label'] . ').';
                }
            }
        }
        $start = trim(str_replace('T', ' ', (string) ($data['start_at'] ?? '')));
        if (!preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/', $start) || !strtotime($start)) {
            $errors['start_at'] = 'When is the scan?';
            $start = $now;
        } else {
            $start = substr($start, 0, 16) . ':00';
            if (self::ts($start) < self::ts($now) - 3600) {
                $errors['start_at'] = 'Not in the past.';
            } elseif (self::ts($start) > self::ts($now) + 180 * 86400) {
                $errors['start_at'] = 'At most six months ahead.';
            }
        }
        $minutes = (int) ($data['minutes'] ?? 0);
        $note = self::text($data['note'] ?? null, 255);
        if ($errors) {
            return ['success' => false, 'message' => reset($errors), 'errors' => $errors];
        }

        // Each study after the other, from the start time.
        $plan = [];
        $at = $start;
        foreach ($studies as $o) {
            $len = $minutes > 0 && count($studies) === 1 ? min(240, max(5, $minutes)) : max(5, self::studyOut($o)['minutes']);
            $plan[] = ['order' => $o, 'start_at' => $at, 'end_at' => self::fmt(self::ts($at) + $len * 60), 'minutes' => $len];
            $at = self::fmt(self::ts($at) + $len * 60);
        }
        $last = end($plan);
        [$from, $to] = $this->hours($room, substr($start, 0, 10));
        $outside = !$room['around_the_clock'] && (!$this->worksOn($room, substr($start, 0, 10)) || $start < $from || $last['end_at'] > self::fmt(self::ts($to) + 60));
        if ($outside && empty($data['confirm'])) {
            return ['success' => false, 'needs_confirm' => true,
                'message' => $this->worksOn($room, substr($start, 0, 10))
                    ? "{$room['name']} works {$room['open_from']}–{$room['open_to']} that day. Book outside its hours anyway?"
                    : "{$room['name']} does not work that day. Book it anyway?"];
        }
        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT rad_book');
        try {
            $clash = $db->prepare(
                "SELECT b.id, b.start_at, b.end_at, c.name FROM rad_bookings b JOIN patient_procedure_orders o ON o.id = b.order_id
                 JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
                 WHERE b.room_id = :room AND b.status IN " . self::BOOKING_LIVE . " AND b.start_at < :end AND b.end_at > :start FOR UPDATE"
            );
            $clash->execute(['room' => $room['id'], 'end' => $last['end_at'], 'start' => $start]);
            if ($busy = $clash->fetch(PDO::FETCH_ASSOC)) {
                $owns ? $db->rollBack() : $db->exec('ROLLBACK TO SAVEPOINT rad_book');
                return ['success' => false, 'message' => "{$room['name']} is already booked " . substr($busy['start_at'], 11, 5) . '–' . substr($busy['end_at'], 11, 5)
                    . " ({$busy['name']}). Choose another time.", 'errors' => ['start_at' => 'Taken.']];
            }
            $ins = $db->prepare(
                "INSERT INTO rad_bookings (order_id, request_id, patient_id, room_id, start_at, end_at, minutes, status, prep_given, note, booked_by, booked_at, created_at)
                 VALUES (:o, :r, :p, :room, :start, :end, :min, 'booked', :prep, :note, :u, NOW(), NOW())"
            );
            $upd = $db->prepare("UPDATE patient_procedure_orders SET status = 'scheduled', rad_booking_id = :b, updated_at = NOW(), updated_by = :u
                WHERE id = :id AND status = 'pending'");
            foreach ($plan as $p) {
                $ins->execute(['o' => $p['order']['id'], 'r' => $requestId, 'p' => $p['order']['patient_id'], 'room' => $room['id'], 'start' => $p['start_at'],
                    'end' => $p['end_at'], 'min' => $p['minutes'], 'prep' => (int) !empty($data['prep_given']), 'note' => $note, 'u' => (int) $actor['id']]);
                $bid = (int) $db->lastInsertId();
                $upd->execute(['b' => $bid, 'u' => (int) $actor['id'], 'id' => $p['order']['id']]);
                if ($upd->rowCount() !== 1) {
                    throw new \RuntimeException('A study was booked by someone else just now. Refresh and try again.');
                }
            }
            $this->refreshRequest($db, $requestId);
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT rad_book');
        } catch (\Throwable $e) {
            $owns ? $db->rollBack() : $db->exec('ROLLBACK TO SAVEPOINT rad_book');
            if ($e instanceof \RuntimeException && !($e instanceof \PDOException)) {
                return ['success' => false, 'message' => $e->getMessage()];
            }
            throw $e;
        }
        $n = count($plan);
        return ['success' => true, 'message' => ($n === 1 ? 'Booked' : "{$n} studies booked") . " on {$room['name']}, "
            . self::when($start) . ($n > 1 ? ' onwards' : '') . '.', 'data' => ['request_id' => $requestId]];
    }

    /** data: id (booking), room_id, start_at, minutes, note, reason -- move a booking. */
    public function reschedule(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::SCHEDULE_ROLES, true)) {
            return ['success' => false, 'message' => 'Imaging is scheduled by radiology.', 'forbidden' => true];
        }
        $db = Database::connection();
        $b = $this->booking($db, (int) ($data['id'] ?? 0));
        if (!$b || !in_array($b['status'], ['booked', 'arrived'], true)) {
            return ['success' => false, 'message' => 'Booking not found.', 'not_found' => true];
        }
        $reason = trim((string) ($data['reason'] ?? ''));
        if ($reason === '' || mb_strlen($reason) > 255) {
            return ['success' => false, 'message' => 'Why move it?', 'errors' => ['reason' => 'Required.']];
        }
        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT rad_move');
        try {
            // Put the study back, then book it again: the same checks as a new booking.
            $db->prepare("UPDATE rad_bookings SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = :u, cancel_reason = :r WHERE id = :id")
                ->execute(['u' => (int) $actor['id'], 'r' => "Moved: {$reason}", 'id' => $b['id']]);
            $db->prepare("UPDATE patient_procedure_orders SET status = 'pending', rad_booking_id = NULL WHERE id = :id")->execute(['id' => $b['order_id']]);
            $r = $this->schedule(['order_ids' => [$b['order_id']], 'room_id' => (int) ($data['room_id'] ?: $b['room_id']), 'start_at' => $data['start_at'] ?? '',
                'minutes' => (int) ($data['minutes'] ?? $b['minutes']), 'prep_given' => $data['prep_given'] ?? $b['prep_given'],
                'note' => $data['note'] ?? $b['note'], 'confirm' => $data['confirm'] ?? 0], $actor);
            if (!$r['success']) {
                $owns ? $db->rollBack() : $db->exec('ROLLBACK TO SAVEPOINT rad_move');
                return $r;
            }
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT rad_move');
        } catch (\Throwable $e) {
            $owns ? $db->rollBack() : $db->exec('ROLLBACK TO SAVEPOINT rad_move');
            throw $e;
        }
        return ['success' => true, 'message' => 'Moved. ' . $r['message'], 'data' => $r['data'] ?? null];
    }

    /** data: id, reason -- the booking is off; the study goes back to "to schedule". */
    public function cancelBooking(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::SCHEDULE_ROLES, true)) {
            return ['success' => false, 'message' => 'Bookings are cancelled by radiology.', 'forbidden' => true];
        }
        $db = Database::connection();
        $b = $this->booking($db, (int) ($data['id'] ?? 0));
        if (!$b || !in_array($b['status'], ['booked', 'arrived'], true)) {
            return ['success' => false, 'message' => 'Booking not found.', 'not_found' => true];
        }
        $reason = trim((string) ($data['reason'] ?? ''));
        if ($reason === '' || mb_strlen($reason) > 255) {
            return ['success' => false, 'message' => 'Why is it cancelled?', 'errors' => ['reason' => 'Required.']];
        }
        $noShow = !empty($data['no_show']);
        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT rad_unbook');
        try {
            $db->prepare("UPDATE rad_bookings SET status = :s, cancelled_at = NOW(), cancelled_by = :u, cancel_reason = :r WHERE id = :id")
                ->execute(['s' => $noShow ? 'no_show' : 'cancelled', 'u' => (int) $actor['id'], 'r' => $reason, 'id' => $b['id']]);
            $db->prepare("UPDATE patient_procedure_orders SET status = 'pending', rad_booking_id = NULL, updated_at = NOW(), updated_by = :u WHERE id = :id")
                ->execute(['u' => (int) $actor['id'], 'id' => $b['order_id']]);
            $this->refreshRequest($db, (int) $b['request_id']);
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT rad_unbook');
        } catch (\Throwable $e) {
            $owns ? $db->rollBack() : $db->exec('ROLLBACK TO SAVEPOINT rad_unbook');
            throw $e;
        }
        return ['success' => true, 'message' => ($noShow ? 'Marked as not arrived' : 'Booking cancelled')
            . ": {$b['study_name']} is back on the list to schedule."];
    }

    /** data: id -- the patient is in the department. */
    public function arrived(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::SCHEDULE_ROLES, true)) {
            return ['success' => false, 'message' => 'Only radiology marks a patient as arrived.', 'forbidden' => true];
        }
        $db = Database::connection();
        $b = $this->booking($db, (int) ($data['id'] ?? 0));
        if (!$b || $b['status'] !== 'booked') {
            return ['success' => false, 'message' => $b && $b['status'] === 'arrived' ? 'Already marked as arrived.' : 'Booking not found.', 'not_found' => !$b];
        }
        $db->prepare("UPDATE rad_bookings SET status = 'arrived', arrived_at = NOW(), arrived_by = :u WHERE id = :id AND status = 'booked'")
            ->execute(['u' => (int) $actor['id'], 'id' => $b['id']]);
        return ['success' => true, 'message' => "{$b['study_name']}: patient in the department."];
    }

    /** data: id, prep_given -- tick that the preparation instructions were given. */
    public function markPrep(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', array_merge(self::SCHEDULE_ROLES, ['nurse', 'charge_nurse']), true)) {
            return ['success' => false, 'message' => 'Not allowed.', 'forbidden' => true];
        }
        $db = Database::connection();
        $b = $this->booking($db, (int) ($data['id'] ?? 0));
        if (!$b || $b['status'] === 'cancelled') {
            return ['success' => false, 'message' => 'Booking not found.', 'not_found' => true];
        }
        $db->prepare("UPDATE rad_bookings SET prep_given = :p WHERE id = :id")->execute(['p' => (int) !empty($data['prep_given']), 'id' => $b['id']]);
        return ['success' => true, 'message' => empty($data['prep_given']) ? 'Preparation not given yet.' : 'Preparation instructions given.'];
    }

    public static function options(): array
    {
        return ['priorities' => self::PRIORITIES, 'sources' => self::SOURCES, 'modes' => self::MODES, 'modalities' => self::MODALITIES,
            'contrast' => self::CONTRAST, 'transport' => self::TRANSPORT, 'answers' => self::ANSWERS, 'overdue' => self::OVERDUE, 'ionising' => self::IONISING];
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    /** Patient, source and location from er_visit_id / admission_id / patient_id. */
    private function context(PDO $db, array $q): ?array
    {
        $erId = (int) ($q['er_visit_id'] ?? 0);
        $admId = (int) ($q['admission_id'] ?? 0);
        $pid = (int) ($q['patient_id'] ?? 0);
        $source = 'clinic';
        $location = null;
        if ($erId) {
            $st = $db->prepare("SELECT v.*, b.name AS bed_name FROM er_visits v LEFT JOIN er_beds b ON b.id = v.er_bed_id WHERE v.id = :id AND v.status IN " . self::OPEN_ER);
            $st->execute(['id' => $erId]);
            $v = $st->fetch(PDO::FETCH_ASSOC);
            if (!$v) {
                return null;
            }
            $pid = (int) $v['patient_id'];
            $source = 'er';
            $location = 'ER · ' . ($v['bed_name'] ?: 'waiting room');
        } elseif ($admId) {
            $st = $db->prepare(
                "SELECT a.*, w.ward_name, w.ward_type, b.bed_number FROM inpatient_admissions a JOIN hospital_wards w ON w.id = a.ward_id JOIN hospital_beds b ON b.id = a.bed_id
                 WHERE a.id = :id AND a.status IN " . self::ACTIVE_ADM
            );
            $st->execute(['id' => $admId]);
            $a = $st->fetch(PDO::FETCH_ASSOC);
            if (!$a || !$a['patient_id']) {
                return null;
            }
            $pid = (int) $a['patient_id'];
            $source = $a['ward_type'] === 'ICU' ? 'icu' : 'ward';
            $location = "{$a['ward_name']} · {$a['bed_number']}";
        }
        $p = $db->prepare("SELECT id, patient_no, first_name, middle_name, last_name, sex, birthdate FROM patients WHERE id = :id AND deleted_at IS NULL");
        $p->execute(['id' => $pid]);
        $pt = $p->fetch(PDO::FETCH_ASSOC);
        if (!$pt) {
            return null;
        }
        return ['patient' => self::patientOut($pt), 'source' => $source, 'source_label' => self::SOURCES[$source], 'location' => $location,
            'er_visit_id' => $erId ?: null, 'admission_id' => $admId ?: null];
    }

    /** The patient's latest creatinine and weight on file, so the order dialog does not ask for what is known. */
    private function lastValues(PDO $db, int $patientId): array
    {
        $st = $db->prepare(
            "SELECT r.value, COALESCE(o.reported_at, r.created_at) AS at FROM patient_procedure_results r
             JOIN patient_procedure_orders o ON o.id = r.patient_procedure_order_id
             WHERE o.patient_id = :p AND o.deleted_at IS NULL AND r.deleted_at IS NULL AND LOWER(r.name) LIKE '%creatinine%' AND r.value IS NOT NULL
             ORDER BY COALESCE(o.reported_at, r.created_at) DESC, r.id DESC LIMIT 1"
        );
        $st->execute(['p' => $patientId]);
        $creat = $st->fetch(PDO::FETCH_ASSOC) ?: null;
        // encounter_vitals keeps the weight in pounds (the BMI there is the imperial formula).
        $w = $db->prepare(
            "SELECT v.weight, v.created_at FROM encounter_vitals v JOIN encounters e ON e.id = v.encounter_id
             WHERE e.patient_id = :p AND e.deleted_at IS NULL AND v.weight IS NOT NULL AND v.weight > 0
             ORDER BY v.id DESC LIMIT 1"
        );
        $w->execute(['p' => $patientId]);
        $weight = $w->fetch(PDO::FETCH_ASSOC) ?: null;
        return [
            'creatinine' => $creat && is_numeric(preg_replace('/[^\d.]/', '', (string) $creat['value']))
                ? ['value' => preg_replace('/[^\d.]/', '', (string) $creat['value']), 'at' => substr((string) $creat['at'], 0, 10)] : null,
            'weight_kg' => $weight ? ['value' => round((float) $weight['weight'] * 0.45359237, 1), 'at' => substr((string) $weight['created_at'], 0, 10)] : null,
        ];
    }

    private function childbearing(array $patient): bool
    {
        $sex = strtolower((string) ($patient['sex'] ?? ''));
        $age = $patient['age'];
        return str_starts_with($sex, 'f') && ($age === null || ($age >= 12 && $age <= 55));
    }

    private static function patientOut(array $p): array
    {
        $age = null;
        if (!empty($p['birthdate'])) {
            $age = (new \DateTimeImmutable($p['birthdate']))->diff(new \DateTimeImmutable('today'))->y;
        }
        return ['id' => (int) ($p['id'] ?? $p['patient_id'] ?? 0), 'name' => trim(preg_replace('/\s+/', ' ', ($p['first_name'] ?? '') . ' ' . ($p['middle_name'] ?? '') . ' ' . ($p['last_name'] ?? ''))),
            'last_name' => $p['last_name'] ?? null, 'first_name' => $p['first_name'] ?? null, 'mrn' => $p['patient_no'] ?? null,
            'sex' => $p['sex'] ?? null, 'birthdate' => $p['birthdate'] ?? null, 'age' => $age];
    }

    /** A request for the worklist: patient, where they are now, studies, safety answers, overdue. */
    private function shapeRequest(PDO $db, array $r, string $now): array
    {
        $p = $db->prepare("SELECT id, patient_no, first_name, middle_name, last_name, sex, birthdate FROM patients WHERE id = :id");
        $p->execute(['id' => $r['patient_id']]);
        $patient = self::patientOut($p->fetch(PDO::FETCH_ASSOC) ?: []);
        $studies = $this->studies($db, (int) $r['id']);
        $late = intdiv(self::ts($now) - self::ts($r['ordered_at']), 60);
        return [
            'id' => (int) $r['id'], 'request_no' => $r['request_no'], 'priority' => $r['priority'], 'source' => $r['source'],
            'source_label' => self::SOURCES[$r['source']] ?? $r['source'], 'location' => $this->whereNow($db, $r) ?? $r['location'], 'ordered_location' => $r['location'],
            'indication' => $r['indication'], 'needed_by' => $r['needed_by'], 'ordered_at' => $r['ordered_at'], 'status' => $r['status'],
            'minutes_waiting' => max(0, $late), 'overdue' => $r['status'] === 'open' && $late > (self::OVERDUE[$r['priority']] ?? 1440),
            'order_mode' => $r['order_mode'], 'ordering_doctor' => $r['ordering_user_id'] ? $this->userName($db, (int) $r['ordering_user_id']) : null,
            'ordered_by' => $r['ordered_by'] ? $this->userName($db, (int) $r['ordered_by']) : null,
            'safety' => ['pregnancy' => $r['pregnancy'], 'lmp' => $r['lmp'], 'creatinine' => $r['creatinine'] !== null ? (float) $r['creatinine'] : null,
                'creatinine_at' => $r['creatinine_at'], 'contrast_allergy' => $r['contrast_allergy'], 'contrast_allergy_detail' => $r['contrast_allergy_detail'],
                'implants' => $r['implants'], 'implants_detail' => $r['implants_detail'], 'weight_kg' => $r['weight_kg'] !== null ? (float) $r['weight_kg'] : null,
                'sedation' => (bool) $r['sedation'], 'isolation' => $r['isolation'],
                'transport' => $r['transport'], 'transport_label' => $r['transport'] ? (self::TRANSPORT[$r['transport']] ?? $r['transport']) : null],
            'patient' => $patient, 'studies' => $studies,
            'studies_to_schedule' => count(array_filter($studies, fn($s) => $s['status'] === 'pending')),
        ];
    }

    private function studies(PDO $db, int $requestId): array
    {
        $st = $db->prepare(
            "SELECT o.id, o.status, o.cancel_reason, o.rad_booking_id, c.id AS study_id, c.name, c.identifying_code, c.rad_modality, c.rad_minutes,
                    c.rad_contrast, c.rad_portable, c.rad_prep,
                    b.start_at, b.end_at, b.status AS booking_status, b.prep_given, b.note, b.room_id, b.arrived_at,
                    (SELECT rr.name FROM rad_rooms rr WHERE rr.id = b.room_id) AS room_name
             FROM patient_procedure_orders o JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
             LEFT JOIN rad_bookings b ON b.id = o.rad_booking_id AND b.status IN " . self::BOOKING_LIVE . "
             WHERE o.rad_request_id = :r AND o.deleted_at IS NULL ORDER BY o.id"
        );
        $st->execute(['r' => $requestId]);
        return array_map(fn($s) => self::studyOut($s) + ['id' => (int) $s['id'], 'study_id' => (int) $s['study_id'], 'status' => $s['status'],
            'cancel_reason' => $s['cancel_reason'],
            'booking' => $s['rad_booking_id'] && $s['start_at'] ? ['id' => (int) $s['rad_booking_id'], 'start_at' => $s['start_at'], 'end_at' => $s['end_at'],
                'status' => $s['booking_status'], 'room_id' => (int) $s['room_id'], 'room' => $s['room_name'], 'prep_given' => (bool) $s['prep_given'],
                'note' => $s['note'], 'arrived_at' => $s['arrived_at']] : null], $st->fetchAll(PDO::FETCH_ASSOC));
    }

    /** Where the patient is now (ER bed / ward bed), when the request came from there. */
    private function whereNow(PDO $db, array $r): ?string
    {
        if ($r['admission_id']) {
            $st = $db->prepare("SELECT w.ward_name, b.bed_number, a.status FROM inpatient_admissions a JOIN hospital_wards w ON w.id = a.ward_id
                JOIN hospital_beds b ON b.id = a.bed_id WHERE a.id = :id");
            $st->execute(['id' => $r['admission_id']]);
            $a = $st->fetch(PDO::FETCH_ASSOC);
            return $a && in_array($a['status'], ['Admitted', 'Pending Discharge'], true) ? "{$a['ward_name']} · {$a['bed_number']}" : null;
        }
        if ($r['er_visit_id']) {
            $st = $db->prepare("SELECT v.status, b.name FROM er_visits v LEFT JOIN er_beds b ON b.id = v.er_bed_id WHERE v.id = :id");
            $st->execute(['id' => $r['er_visit_id']]);
            $v = $st->fetch(PDO::FETCH_ASSOC);
            return $v && in_array($v['status'], ['waiting', 'triaged'], true) ? 'ER · ' . ($v['name'] ?: 'waiting room') : null;
        }
        return null;
    }

    /** open / scheduled / cancelled from its studies; the STAT alert closes once nothing is waiting. */
    private function refreshRequest(PDO $db, int $id, ?int $by = null, ?string $reason = null): void
    {
        $st = $db->prepare("SELECT SUM(status = 'pending') AS todo, SUM(status NOT IN ('pending', 'cancelled')) AS done
            FROM patient_procedure_orders WHERE rad_request_id = :r AND deleted_at IS NULL");
        $st->execute(['r' => $id]);
        $c = $st->fetch(PDO::FETCH_ASSOC);
        $status = (int) $c['todo'] > 0 ? 'open' : ((int) $c['done'] > 0 ? 'scheduled' : 'cancelled');
        $db->prepare("UPDATE rad_requests SET status = :s, cancelled_at = IF(:s2 = 'cancelled', NOW(), NULL), cancelled_by = IF(:s3 = 'cancelled', :by, NULL),
            cancel_reason = IF(:s4 = 'cancelled', :r, NULL) WHERE id = :id")
            ->execute(['s' => $status, 's2' => $status, 's3' => $status, 'by' => $by, 's4' => $status, 'r' => $reason, 'id' => $id]);
        if ($status !== 'open') {
            $db->prepare("UPDATE alerts SET resolved_at = NOW(), resolve_note = :n WHERE dedupe_key = :k AND resolved_at IS NULL")
                ->execute(['n' => $status === 'scheduled' ? 'Scheduled' : 'Cancelled', 'k' => "radstat:{$id}"]);
        }
    }

    /** The machine's hours on a date as datetimes (around the clock: the whole day). */
    private function hours(array $room, string $date): array
    {
        if ($room['around_the_clock']) {
            return ["{$date} 00:00:00", "{$date} 23:59:00"];
        }
        return ["{$date} {$room['open_from']}:00", "{$date} {$room['open_to']}:00"];
    }

    private function worksOn(array $room, string $date): bool
    {
        return $room['around_the_clock'] || str_contains($room['open_days'], (string) ((int) date('N', strtotime($date))));
    }

    /** The minutes a machine works on a date (0 when it does not work that day). Used by the radiology report. */
    public function openMinutesOn(array $room, string $date): int
    {
        return $this->openMinutes($room, $date);
    }

    private function openMinutes(array $room, string $date): int
    {
        if (!$this->worksOn($room, $date)) {
            return 0;
        }
        [$from, $to] = $this->hours($room, $date);
        return max(0, intdiv(self::ts($to) + 60 - self::ts($from), 60));
    }

    private function bookings(PDO $db, int $roomId, string $date): array
    {
        $st = $db->prepare(
            "SELECT b.start_at, b.end_at, b.status, c.name AS study_name, p.first_name, p.last_name
             FROM rad_bookings b JOIN patient_procedure_orders o ON o.id = b.order_id JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
             JOIN patients p ON p.id = b.patient_id
             WHERE b.room_id = :room AND DATE(b.start_at) = :d AND b.status IN " . self::BOOKING_LIVE . " ORDER BY b.start_at"
        );
        $st->execute(['room' => $roomId, 'd' => $date]);
        return $st->fetchAll(PDO::FETCH_ASSOC);
    }

    private function room(PDO $db, int $id): ?array
    {
        foreach ($this->rooms(null, false) as $r) {
            if ($r['id'] === $id) {
                return $r;
            }
        }
        return null;
    }

    private function study(PDO $db, int $id): ?array
    {
        $st = $db->prepare(
            "SELECT o.*, c.name, c.identifying_code, c.rad_modality, c.rad_minutes, c.rad_contrast, c.rad_portable, c.rad_prep
             FROM patient_procedure_orders o JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id WHERE o.id = :id AND o.deleted_at IS NULL"
        );
        $st->execute(['id' => $id]);
        return $st->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function booking(PDO $db, int $id): ?array
    {
        $st = $db->prepare(
            "SELECT b.*, c.name AS study_name FROM rad_bookings b JOIN patient_procedure_orders o ON o.id = b.order_id
             JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id WHERE b.id = :id"
        );
        $st->execute(['id' => $id]);
        return $st->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function request(PDO $db, int $id): ?array
    {
        $st = $db->prepare("SELECT * FROM rad_requests WHERE id = :id");
        $st->execute(['id' => $id]);
        return $st->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function doctors(PDO $db): array
    {
        return $db->query(
            "SELECT u.id, " . self::nameSql('u.id') . " AS name FROM users u JOIN roles r ON r.id = u.role_id
             WHERE u.deleted_at IS NULL AND r.name IN ('doctor', 'clinician') ORDER BY name"
        )->fetchAll(PDO::FETCH_ASSOC);
    }

    private function userName(PDO $db, int $id): ?string
    {
        $st = $db->prepare("SELECT " . self::nameSql(':id'));
        $st->execute(['id' => $id]);
        return $st->fetchColumn() ?: null;
    }

    private static function matches(array $request, string $q): bool
    {
        $hay = strtolower("{$request['patient']['name']} {$request['patient']['mrn']} {$request['request_no']} "
            . implode(' ', array_column($request['studies'], 'name')));
        return str_contains($hay, strtolower($q));
    }

    /** The day's next number: "YYMMDD-NNN". */
    private function next(PDO $db, string $kind, int $digits): string
    {
        $db->prepare("INSERT INTO rad_counters (kind, day, last_no) VALUES (:k, CURDATE(), LAST_INSERT_ID(1)) ON DUPLICATE KEY UPDATE last_no = LAST_INSERT_ID(last_no + 1)")
            ->execute(['k' => $kind]);
        $n = (int) $db->query("SELECT LAST_INSERT_ID()")->fetchColumn();
        return $db->query("SELECT DATE_FORMAT(CURDATE(), '%y%m%d')")->fetchColumn() . '-' . str_pad((string) $n, $digits, '0', STR_PAD_LEFT);
    }

    private static function text($value, int $max): ?string
    {
        if (is_array($value)) {
            return null;
        }
        $value = trim((string) ($value ?? ''));
        return $value === '' ? null : mb_substr($value, 0, $max);
    }

    private static function when(string $dt): string
    {
        return date('j M H:i', strtotime(substr($dt, 0, 19)));
    }

    private static function ts(string $dt): int
    {
        return (new \DateTimeImmutable(substr($dt, 0, 19), new \DateTimeZone('UTC')))->getTimestamp();
    }

    private static function fmt(int $ts): string
    {
        return gmdate('Y-m-d H:i:s', $ts);
    }

    public static function nameSql(string $column): string
    {
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(ne.first_name, ''), ' ', COALESCE(ne.last_name, ''))), ''), nu.username)
                 FROM users nu LEFT JOIN employees ne ON ne.user_id = nu.id AND ne.deleted_at IS NULL WHERE nu.id = {$column} LIMIT 1)";
    }
}
