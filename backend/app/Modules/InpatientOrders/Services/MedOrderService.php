<?php

namespace App\Modules\InpatientOrders\Services;

use App\Core\Database;
use App\Modules\Alerts\Services\AlertService;
use App\Modules\NursingStaff\Services\NursingShiftService;
use PDO;

/**
 * Inpatient medicine orders: the doctor orders, the pharmacist verifies (allergy and
 * duplicate checks) or rejects, the doctor discontinues. Orders are not edited --
 * a change is a discontinue plus a new order. Every step is logged.
 */
class MedOrderService
{
    public const ROUTES = [
        'PO' => 'By mouth (PO)', 'SL' => 'Under the tongue (SL)', 'IV' => 'Intravenous (IV)', 'IM' => 'Intramuscular (IM)',
        'SC' => 'Subcutaneous (SC)', 'ID' => 'Intradermal (ID)', 'INH' => 'Inhaled (INH)', 'NEB' => 'Nebulised (NEB)',
        'NAS' => 'Nasal', 'TOP' => 'On the skin (TOP)', 'TD' => 'Patch (TD)', 'OPH' => 'Eye (OPH)', 'OT' => 'Ear (OT)',
        'PR' => 'Rectal (PR)', 'PV' => 'Vaginal (PV)', 'NG' => 'Feeding tube (NG)', 'OTHER' => 'Other',
    ];
    public const UNITS = ['mg', 'g', 'mcg', 'mL', 'L', 'IU', 'units', 'mmol', 'mEq', 'tablet', 'capsule', 'puff', 'drop', 'sachet',
        'nebule', 'suppository', 'patch', 'application', 'vial', 'ampule'];
    /** Scheduled frequencies and their default times. */
    public const FREQUENCIES = [
        'OD' => ['Once a day', ['08:00']], 'BID' => ['Twice a day', ['08:00', '20:00']], 'TID' => ['Three times a day', ['08:00', '14:00', '20:00']],
        'QID' => ['Four times a day', ['08:00', '12:00', '16:00', '20:00']], 'Q4H' => ['Every 4 hours', ['02:00', '06:00', '10:00', '14:00', '18:00', '22:00']],
        'Q6H' => ['Every 6 hours', ['00:00', '06:00', '12:00', '18:00']], 'Q8H' => ['Every 8 hours', ['06:00', '14:00', '22:00']],
        'Q12H' => ['Every 12 hours', ['08:00', '20:00']], 'HS' => ['At bedtime', ['21:00']],
    ];
    public const ORDERERS = ['admin', 'doctor'];
    public const VERIFIERS = ['admin', 'pharmacist'];
    private const ACTIVE_ADM = "('Admitted', 'Pending Discharge')";

    private MedSafetyService $safety;

    public function __construct()
    {
        $this->safety = new MedSafetyService();
    }

    public function options(): array
    {
        return [
            'routes' => self::ROUTES, 'units' => self::UNITS,
            'frequencies' => array_map(fn($f) => ['label' => $f[0], 'times' => $f[1]], self::FREQUENCIES),
        ];
    }

    /** Catalog medicines for the order form. */
    public function searchDrugs(string $q): array
    {
        $db = Database::connection();
        $q = trim($q);
        $stmt = $db->prepare(
            "SELECT d.id, d.name, d.generic_name, d.strength, d.is_high_alert, d.controlled_class, c.name AS category
             FROM drugs d LEFT JOIN drug_categories c ON c.id = d.category_id
             WHERE d.deleted_at IS NULL AND d.is_active = 1 AND d.is_consumable = 0 AND COALESCE(c.name, '') <> 'Medical Supply'
               AND (:q = '' OR d.name LIKE :q1 OR d.generic_name LIKE :q2 OR d.brand_name LIKE :q3)
             ORDER BY d.name LIMIT 25"
        );
        $stmt->execute(['q' => $q, 'q1' => "%{$q}%", 'q2' => "%{$q}%", 'q3' => "%{$q}%"]);
        return array_map(fn($d) => ['id' => (int) $d['id'], 'name' => $d['name'], 'generic_name' => $d['generic_name'], 'strength' => $d['strength'],
            'category' => $d['category'], 'high_alert' => (int) $d['is_high_alert'] === 1, 'controlled' => $d['controlled_class'] !== 'None' ? $d['controlled_class'] : null],
            $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /** The checks for a medicine before ordering (live, in the form). data: admission_id, drug_id */
    public function preview(array $data): array
    {
        $adm = $this->admission((int) ($data['admission_id'] ?? 0));
        $drug = $this->drug((int) ($data['drug_id'] ?? 0));
        if (!$adm || !$drug) {
            return ['success' => false, 'message' => !$adm ? 'This patient is not admitted.' : 'Choose a medicine from the list.'];
        }
        return ['success' => true, 'message' => 'Checked.', 'data' => ['warnings' => $this->safety->check((int) $adm['patient_id'], (int) $adm['id'], $drug)]];
    }

    // ------------------------------------------------------------------
    // Order
    // ------------------------------------------------------------------

    /**
     * data: admission_id, drug_id, dose, dose_unit, route, order_type (scheduled|prn|once), frequency?, admin_times?,
     *       prn_indication?, prn_min_hours?, prn_max_per_day?, is_stat?, start_at?, stop_at?, instructions?,
     *       acknowledge? (warnings seen), override_reason? (allergy match)
     */
    public function create(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::ORDERERS, true)) {
            return ['success' => false, 'message' => 'Medicine orders are written by a doctor.', 'forbidden' => true];
        }
        $db = Database::connection();
        $errors = [];
        $adm = $this->admission((int) ($data['admission_id'] ?? 0));
        if (!$adm) {
            return ['success' => false, 'message' => 'This patient is not admitted (or was discharged).', 'not_found' => true];
        }
        $drug = $this->drug((int) ($data['drug_id'] ?? 0));
        if (!$drug) {
            $errors['drug_id'] = 'Choose a medicine from the list.';
        }
        $dose = filter_var($data['dose'] ?? null, FILTER_VALIDATE_FLOAT);
        if ($dose === false || $dose <= 0 || $dose > 100000) {
            $errors['dose'] = 'Enter the dose (a number above 0).';
        }
        $unit = (string) ($data['dose_unit'] ?? '');
        if (!in_array($unit, self::UNITS, true)) {
            $errors['dose_unit'] = 'Choose a unit.';
        }
        $route = (string) ($data['route'] ?? '');
        if (!array_key_exists($route, self::ROUTES)) {
            $errors['route'] = 'Choose a route.';
        }
        $type = (string) ($data['order_type'] ?? '');
        if (!in_array($type, ['scheduled', 'prn', 'once'], true)) {
            $errors['order_type'] = 'Choose scheduled, as needed, or once.';
        }

        $freq = $times = $prnFor = $prnHours = $prnMax = null;
        if ($type === 'scheduled') {
            $freq = (string) ($data['frequency'] ?? '');
            if (!array_key_exists($freq, self::FREQUENCIES)) {
                $errors['frequency'] = 'Choose how often.';
            } else {
                $times = $this->times($data['admin_times'] ?? null, $freq, $errors);
            }
        } elseif ($type === 'prn') {
            $prnFor = trim((string) ($data['prn_indication'] ?? ''));
            if ($prnFor === '') {
                $errors['prn_indication'] = 'Say what it is for (e.g. pain score 4 or more).';
            }
            if (($data['prn_min_hours'] ?? '') !== '' && $data['prn_min_hours'] !== null) {
                $prnHours = filter_var($data['prn_min_hours'], FILTER_VALIDATE_FLOAT);
                if ($prnHours === false || $prnHours < 0.5 || $prnHours > 72) {
                    $errors['prn_min_hours'] = 'Hours apart must be between 0.5 and 72.';
                }
            }
            if (($data['prn_max_per_day'] ?? '') !== '' && $data['prn_max_per_day'] !== null) {
                $prnMax = filter_var($data['prn_max_per_day'], FILTER_VALIDATE_INT);
                if ($prnMax === false || $prnMax < 1 || $prnMax > 24) {
                    $errors['prn_max_per_day'] = 'At most 1 to 24 doses a day.';
                }
            }
        }
        $stat = $type === 'once' && !empty($data['is_stat']);

        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $start = $this->dt($data['start_at'] ?? null) ?? $now;
        $stop = $type === 'once' ? null : $this->dt($data['stop_at'] ?? null);
        if (!empty($data['start_at']) && !$this->dt($data['start_at'])) {
            $errors['start_at'] = 'Invalid start.';
        } elseif (self::ts($start) < self::ts($now) - 86400) {
            $errors['start_at'] = 'The start can\'t be more than 24 hours ago.';
        }
        if (!empty($data['stop_at']) && $type !== 'once') {
            if (!$stop) {
                $errors['stop_at'] = 'Invalid stop.';
            } elseif (self::ts($stop) <= self::ts($start)) {
                $errors['stop_at'] = 'The stop must be after the start.';
            }
        }
        $instr = trim((string) ($data['instructions'] ?? ''));
        if (mb_strlen($instr) > 500) {
            $errors['instructions'] = 'Keep the instructions under 500 characters.';
        }
        if ($errors) {
            return ['success' => false, 'message' => reset($errors), 'errors' => $errors];
        }

        // Safety checks: an allergy match needs a reason; any other warning must be acknowledged.
        $warnings = $this->safety->check((int) $adm['patient_id'], (int) $adm['id'], $drug);
        $gate = $this->gate($warnings, $data, 'Say why this medicine is being ordered despite the allergy.');
        if ($gate) {
            return $gate;
        }

        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT med_order');
        try {
            $db->prepare(
                "INSERT INTO inpatient_med_orders (admission_id, patient_id, drug_id, drug_name, dose, dose_unit, route, order_type, frequency, admin_times,
                    prn_indication, prn_min_hours, prn_max_per_day, is_stat, start_at, stop_at, instructions, status, checks_json, doctor_ack_reason, ordered_by, ordered_at)
                 VALUES (:a, :p, :d, :dn, :dose, :u, :r, :t, :f, :times, :pf, :ph, :pm, :stat, :start, :stop, :i, 'pending', :checks, :ack, :by, NOW())"
            )->execute([
                'a' => $adm['id'], 'p' => $adm['patient_id'], 'd' => $drug['id'], 'dn' => $drug['name'], 'dose' => $dose, 'u' => $unit, 'r' => $route,
                't' => $type, 'f' => $freq, 'times' => $times ? implode(',', $times) : null, 'pf' => $prnFor ?: null, 'ph' => $prnHours ?: null,
                'pm' => $prnMax ?: null, 'stat' => $stat ? 1 : 0, 'start' => $start, 'stop' => $stop, 'i' => $instr !== '' ? $instr : null,
                'checks' => $warnings ? json_encode($warnings) : null, 'ack' => $this->ackReason($warnings, $data), 'by' => (int) $actor['id'],
            ]);
            $id = (int) $db->lastInsertId();
            $this->log($id, 'ordered', $warnings ? count($warnings) . ' warning(s) acknowledged' : null, (int) $actor['id']);
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT med_order');
        } catch (\Throwable $e) {
            $owns ? ($db->inTransaction() && $db->rollBack()) : $db->exec('ROLLBACK TO SAVEPOINT med_order');
            throw $e;
        }

        $order = $this->order($id);
        AlertService::raise([
            'type' => 'medication', 'urgency' => $stat ? 'urgent' : 'info',
            'title' => ($stat ? 'STAT order to verify: ' : 'Order to verify: ') . "{$order['summary']} — {$adm['patient_name']} ({$adm['ward_name']} {$adm['bed_number']})",
            'body' => $warnings ? 'Warnings: ' . implode(' ', array_column($warnings, 'message')) : 'No allergy or duplicate warnings.',
            'patient_id' => $adm['patient_id'], 'link' => ['tab' => 'med_verification'],
            'targets' => [['role' => 'pharmacist']], 'source_type' => 'inpatient_med_orders', 'source_id' => $id, 'dedupe_key' => "medorder:{$id}",
        ], (int) $actor['id']);

        return ['success' => true, 'message' => 'Order sent to the pharmacy for verification.', 'data' => $order];
    }

    // ------------------------------------------------------------------
    // Pharmacy: verify / reject
    // ------------------------------------------------------------------

    /** data: note?, acknowledge?, override_reason? -- the checks are run again now. */
    public function verify(int $id, array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::VERIFIERS, true)) {
            return ['success' => false, 'message' => 'Orders are verified by a pharmacist.', 'forbidden' => true];
        }
        $db = Database::connection();
        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT med_verify');
        try {
            $o = $this->lock($db, $id);
            if (!$o) {
                $this->rollBack($db, $owns, 'med_verify');
                return ['success' => false, 'message' => 'Order not found.', 'not_found' => true];
            }
            if ($o['status'] !== 'pending') {
                $this->rollBack($db, $owns, 'med_verify');
                return ['success' => false, 'message' => "This order is already {$o['status']}."];
            }
            if ((int) $o['ordered_by'] === (int) $actor['id'] && ($actor['role'] ?? '') !== 'admin') {
                $this->rollBack($db, $owns, 'med_verify');
                return ['success' => false, 'message' => 'An order can\'t be verified by the person who wrote it.'];
            }
            $drug = $this->drug((int) $o['drug_id'], true);
            $warnings = $this->safety->check((int) $o['patient_id'], (int) $o['admission_id'], $drug, $id);
            $gate = $this->gate($warnings, $data, 'Say why it is safe to give despite the allergy.');
            if ($gate) {
                $this->rollBack($db, $owns, 'med_verify');
                return $gate;
            }
            $note = trim(implode(' — ', array_filter([trim((string) ($data['override_reason'] ?? '')) ? 'Allergy override: ' . trim((string) $data['override_reason']) : '', trim((string) ($data['note'] ?? ''))])));
            $db->prepare("UPDATE inpatient_med_orders SET status = 'verified', verified_by = :by, verified_at = NOW(), verify_note = :n WHERE id = :id")
                ->execute(['by' => (int) $actor['id'], 'n' => $note !== '' ? mb_substr($note, 0, 500) : null, 'id' => $id]);
            $this->log($id, 'verified', $note ?: ($warnings ? count($warnings) . ' warning(s) acknowledged' : null), (int) $actor['id']);
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT med_verify');
        } catch (\Throwable $e) {
            $this->rollBack($db, $owns, 'med_verify');
            throw $e;
        }

        AlertService::resolveByKey("medorder:{$id}", (int) $actor['id'], 'Verified');
        $this->closeOverrideAlerts($id, (int) $actor['id'], 'Order verified');
        $order = $this->order($id);
        if ($order['is_stat']) {
            // Give now: tell the patient's nurse.
            AlertService::raise([
                'type' => 'medication', 'urgency' => 'urgent',
                'title' => "STAT: give {$order['summary']} now — {$order['patient_name']} ({$order['bed']})",
                'body' => 'Verified by the pharmacy.' . ($order['instructions'] ? " Instructions: {$order['instructions']}" : ''),
                'patient_id' => $order['patient_id'], 'link' => ['patient_id' => $order['patient_id']],
                'targets' => $this->nurseTargets((int) $order['admission_id']), 'source_type' => 'inpatient_med_orders', 'source_id' => $id,
                'dedupe_key' => "medstat:{$id}",
            ], (int) $actor['id']);
        }
        return ['success' => true, 'message' => 'Order verified.', 'data' => $order];
    }

    public function reject(int $id, string $reason, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::VERIFIERS, true)) {
            return ['success' => false, 'message' => 'Orders are verified by a pharmacist.', 'forbidden' => true];
        }
        $reason = trim($reason);
        if ($reason === '') {
            return ['success' => false, 'message' => 'Say why it is rejected, so the doctor can re-order.', 'errors' => ['reason' => 'Required.']];
        }
        $db = Database::connection();
        $o = $this->order($id);
        if (!$o) {
            return ['success' => false, 'message' => 'Order not found.', 'not_found' => true];
        }
        $stmt = $db->prepare("UPDATE inpatient_med_orders SET status = 'rejected', verified_by = :by, verified_at = NOW(), rejected_reason = :r WHERE id = :id AND status = 'pending'");
        $stmt->execute(['by' => (int) $actor['id'], 'r' => mb_substr($reason, 0, 500), 'id' => $id]);
        if (!$stmt->rowCount()) {
            return ['success' => false, 'message' => "This order is already {$o['status']}."];
        }
        $this->log($id, 'rejected', $reason, (int) $actor['id']);
        AlertService::resolveByKey("medorder:{$id}", (int) $actor['id'], 'Rejected');
        $this->closeOverrideAlerts($id, (int) $actor['id'], 'Order rejected');
        if ($o['ordered_by']) {
            AlertService::raise([
                'type' => 'medication', 'urgency' => 'urgent',
                'title' => "Order rejected by pharmacy: {$o['summary']} — {$o['patient_name']}",
                'body' => "Reason: {$reason}", 'patient_id' => $o['patient_id'], 'link' => ['patient_id' => $o['patient_id']],
                'targets' => [['user' => $o['ordered_by']]], 'source_type' => 'inpatient_med_orders', 'source_id' => $id, 'dedupe_key' => "medreject:{$id}",
            ], (int) $actor['id']);
        }
        return ['success' => true, 'message' => 'Order rejected; the doctor was told.', 'data' => $this->order($id)];
    }

    /** The doctor stops an order (pending or verified). */
    public function discontinue(int $id, string $reason, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::ORDERERS, true)) {
            return ['success' => false, 'message' => 'Orders are stopped by a doctor.', 'forbidden' => true];
        }
        $reason = trim($reason);
        if ($reason === '') {
            return ['success' => false, 'message' => 'Say why it is stopped.', 'errors' => ['reason' => 'Required.']];
        }
        $db = Database::connection();
        $stmt = $db->prepare(
            "UPDATE inpatient_med_orders SET status = 'discontinued', discontinued_by = :by, discontinued_at = NOW(), discontinue_reason = :r
             WHERE id = :id AND status IN ('pending', 'verified')"
        );
        $stmt->execute(['by' => (int) $actor['id'], 'r' => mb_substr($reason, 0, 255), 'id' => $id]);
        if (!$stmt->rowCount()) {
            $o = $this->order($id);
            return ['success' => false, 'message' => $o ? "This order is already {$o['status']}." : 'Order not found.', 'not_found' => !$o];
        }
        $this->log($id, 'discontinued', $reason, (int) $actor['id']);
        AlertService::resolveByKey("medorder:{$id}", (int) $actor['id'], 'Discontinued');
        return ['success' => true, 'message' => 'Order stopped.', 'data' => $this->order($id)];
    }

    // ------------------------------------------------------------------
    // Lists
    // ------------------------------------------------------------------

    /** All orders of an admission, plus the patient's allergies. */
    public function forAdmission(int $admissionId): ?array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT a.id, a.patient_id, a.patient_name, a.patient_mrn, a.status, a.patient_age, a.gender, w.ward_name, b.bed_number, b.room_number
             FROM inpatient_admissions a JOIN hospital_wards w ON w.id = a.ward_id JOIN hospital_beds b ON b.id = a.bed_id WHERE a.id = :id"
        );
        $stmt->execute(['id' => $admissionId]);
        $a = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$a) {
            return null;
        }
        $ids = $db->prepare("SELECT id FROM inpatient_med_orders WHERE admission_id = :a ORDER BY FIELD(status, 'pending', 'verified', 'rejected', 'discontinued'), ordered_at DESC");
        $ids->execute(['a' => $admissionId]);
        $orders = array_map(fn($id) => $this->order((int) $id), $ids->fetchAll(PDO::FETCH_COLUMN));
        return [
            'admission' => ['id' => (int) $a['id'], 'patient_id' => $a['patient_id'] !== null ? (int) $a['patient_id'] : null, 'patient_name' => $a['patient_name'],
                'patient_mrn' => $a['patient_mrn'], 'age' => $a['patient_age'], 'sex' => $a['gender'], 'status' => $a['status'],
                'ward' => $a['ward_name'], 'room' => $a['room_number'], 'bed' => $a['bed_number'],
                'active' => in_array($a['status'], ['Admitted', 'Pending Discharge'], true)],
            'allergies' => $this->allergies((int) $a['patient_id']),
            'orders' => $orders,
            // Last pain medicine and when the next dose is allowed.
            'pain' => (new MarService())->painSummary((int) $a['id']),
        ];
    }

    /** The chart widget. */
    public function forPatient(int $patientId): ?array
    {
        $stmt = Database::connection()->prepare("SELECT id FROM inpatient_admissions WHERE patient_id = :p AND status IN " . self::ACTIVE_ADM . " ORDER BY id DESC LIMIT 1");
        $stmt->execute(['p' => $patientId]);
        $id = $stmt->fetchColumn();
        return $id ? $this->forAdmission((int) $id) : null;
    }

    /** Pharmacy queue: orders waiting for verification (STAT first, then oldest), with the checks run now. */
    public function queue(): array
    {
        $db = Database::connection();
        $ids = $db->query("SELECT id FROM inpatient_med_orders WHERE status = 'pending' ORDER BY is_stat DESC, ordered_at ASC LIMIT 200")->fetchAll(PDO::FETCH_COLUMN);
        $now = self::ts((string) $db->query("SELECT NOW()")->fetchColumn());
        $rows = [];
        foreach ($ids as $id) {
            $o = $this->order((int) $id);
            $drug = $this->drug($o['drug_id'], true);
            $o['warnings_now'] = $drug ? $this->safety->check((int) $o['patient_id'], $o['admission_id'], $drug, $o['id']) : [];
            $o['waiting_minutes'] = max(0, (int) round(($now - self::ts($o['ordered_at'])) / 60));
            $o['allergies'] = $this->allergies((int) $o['patient_id']);
            $rows[] = $o;
        }
        return ['orders' => $rows, 'count' => count($rows), 'stat' => count(array_filter($rows, fn($r) => $r['is_stat']))];
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    public function order(int $id): ?array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT o.*, a.patient_name, a.patient_mrn, w.ward_name, b.bed_number, b.room_number, d.generic_name, d.strength, d.is_high_alert, d.controlled_class,
                    " . self::nameSql('o.ordered_by') . " AS ordered_by_name, " . self::nameSql('o.verified_by') . " AS verified_by_name,
                    " . self::nameSql('o.discontinued_by') . " AS discontinued_by_name,
                    (o.status = 'verified' AND o.stop_at IS NOT NULL AND o.stop_at <= NOW()) AS ended
             FROM inpatient_med_orders o
             JOIN inpatient_admissions a ON a.id = o.admission_id
             JOIN hospital_wards w ON w.id = a.ward_id JOIN hospital_beds b ON b.id = a.bed_id
             JOIN drugs d ON d.id = o.drug_id
             WHERE o.id = :id"
        );
        $stmt->execute(['id' => $id]);
        $o = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$o) {
            return null;
        }
        $ev = $db->prepare("SELECT action, note, created_at, " . self::nameSql('user_id') . " AS user_name FROM inpatient_med_order_events WHERE order_id = :id ORDER BY id");
        $ev->execute(['id' => $id]);
        $dose = rtrim(rtrim(number_format((float) $o['dose'], 3, '.', ''), '0'), '.');
        $how = $o['order_type'] === 'prn' ? 'as needed' . ($o['prn_indication'] ? " for {$o['prn_indication']}" : '')
            : ($o['order_type'] === 'once' ? ($o['is_stat'] ? 'STAT (once, now)' : 'once') : (self::FREQUENCIES[$o['frequency']][0] ?? $o['frequency']));
        return [
            'id' => (int) $o['id'], 'admission_id' => (int) $o['admission_id'], 'patient_id' => $o['patient_id'] !== null ? (int) $o['patient_id'] : null,
            'patient_name' => $o['patient_name'], 'patient_mrn' => $o['patient_mrn'], 'ward' => $o['ward_name'], 'bed' => $o['bed_number'], 'room' => $o['room_number'],
            'drug_id' => (int) $o['drug_id'], 'drug_name' => $o['drug_name'], 'generic_name' => $o['generic_name'], 'strength' => $o['strength'],
            'high_alert' => (int) $o['is_high_alert'] === 1, 'controlled' => $o['controlled_class'] !== 'None' ? $o['controlled_class'] : null,
            'dose' => (float) $o['dose'], 'dose_text' => $dose, 'dose_unit' => $o['dose_unit'], 'route' => $o['route'], 'route_label' => self::ROUTES[$o['route']] ?? $o['route'],
            'order_type' => $o['order_type'], 'frequency' => $o['frequency'], 'admin_times' => $o['admin_times'] ? explode(',', $o['admin_times']) : [],
            'prn_indication' => $o['prn_indication'], 'prn_min_hours' => $o['prn_min_hours'] !== null ? (float) $o['prn_min_hours'] : null,
            'prn_max_per_day' => $o['prn_max_per_day'] !== null ? (int) $o['prn_max_per_day'] : null,
            'is_stat' => (int) $o['is_stat'] === 1, 'start_at' => $o['start_at'], 'stop_at' => $o['stop_at'], 'instructions' => $o['instructions'],
            'status' => $o['status'], 'state' => $o['status'] === 'verified' ? ((int) $o['ended'] === 1 ? 'ended' : 'active') : $o['status'],
            'summary' => "{$o['drug_name']} {$dose} {$o['dose_unit']} {$o['route']} {$how}",
            'how' => $how,
            'checks' => $o['checks_json'] ? json_decode($o['checks_json'], true) : [], 'doctor_ack_reason' => $o['doctor_ack_reason'],
            'ordered_by' => $o['ordered_by'] !== null ? (int) $o['ordered_by'] : null, 'ordered_by_name' => $o['ordered_by'] ? $o['ordered_by_name'] : null, 'ordered_at' => $o['ordered_at'],
            'verified_by_name' => $o['verified_by'] ? $o['verified_by_name'] : null, 'verified_at' => $o['verified_at'], 'verify_note' => $o['verify_note'],
            'rejected_reason' => $o['rejected_reason'],
            'discontinued_by_name' => $o['discontinued_by'] ? $o['discontinued_by_name'] : null, 'discontinued_at' => $o['discontinued_at'], 'discontinue_reason' => $o['discontinue_reason'],
            'events' => $ev->fetchAll(PDO::FETCH_ASSOC),
        ];
    }

    /** A block needs a reason; warnings need acknowledging. Returns an error result, or null when cleared. */
    private function gate(array $warnings, array $data, string $reasonPrompt): ?array
    {
        $blocks = array_filter($warnings, fn($w) => $w['severity'] === 'block');
        $warns = array_filter($warnings, fn($w) => $w['severity'] === 'warn');
        if ($blocks && trim((string) ($data['override_reason'] ?? '')) === '') {
            return ['success' => false, 'message' => $reasonPrompt, 'needs_reason' => true, 'warnings' => $warnings,
                'errors' => ['override_reason' => 'Required for an allergy match.']];
        }
        if (($blocks || $warns) && empty($data['acknowledge'])) {
            return ['success' => false, 'message' => 'Check the warnings, then confirm.', 'needs_ack' => true, 'warnings' => $warnings];
        }
        return null;
    }

    private function ackReason(array $warnings, array $data): ?string
    {
        $r = trim((string) ($data['override_reason'] ?? ''));
        return array_filter($warnings, fn($w) => $w['severity'] === 'block') && $r !== '' ? mb_substr($r, 0, 255) : null;
    }

    private function times($raw, string $freq, array &$errors): array
    {
        if ($raw === null || $raw === '' || $raw === []) {
            return self::FREQUENCIES[$freq][1];
        }
        $list = is_array($raw) ? $raw : explode(',', (string) $raw);
        $out = [];
        foreach ($list as $t) {
            $t = trim((string) $t);
            if (!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $t)) {
                $errors['admin_times'] = 'Times must look like 08:00, 20:00.';
                return [];
            }
            $out[] = $t;
        }
        $out = array_values(array_unique($out));
        sort($out);
        if (count($out) !== count(self::FREQUENCIES[$freq][1])) {
            $errors['admin_times'] = self::FREQUENCIES[$freq][0] . ' needs ' . count(self::FREQUENCIES[$freq][1]) . ' time(s).';
        }
        return $out;
    }

    private function admission(int $id): ?array
    {
        $stmt = Database::connection()->prepare(
            "SELECT a.id, a.patient_id, a.patient_name, w.ward_name, b.bed_number FROM inpatient_admissions a
             JOIN hospital_wards w ON w.id = a.ward_id JOIN hospital_beds b ON b.id = a.bed_id
             WHERE a.id = :id AND a.status IN " . self::ACTIVE_ADM
        );
        $stmt->execute(['id' => $id]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function drug(int $id, bool $anyState = false): ?array
    {
        $stmt = Database::connection()->prepare(
            "SELECT d.*, c.name AS category FROM drugs d LEFT JOIN drug_categories c ON c.id = d.category_id
             WHERE d.id = :id" . ($anyState ? '' : " AND d.deleted_at IS NULL AND d.is_active = 1")
        );
        $stmt->execute(['id' => $id]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function allergies(int $patientId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT a.name, pa.reaction, pa.severity FROM patient_allergies pa JOIN allergies a ON a.id = pa.allergy_id
             WHERE pa.patient_id = :p AND pa.deleted_at IS NULL AND (pa.end_date IS NULL OR pa.end_date >= CURDATE()) ORDER BY a.name"
        );
        $stmt->execute(['p' => $patientId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /** The nurse assigned this shift, else the ward's nurses, else all nurses. */
    public function nurseTargets(int $admissionId): array
    {
        $db = Database::connection();
        $cur = (new NursingShiftService())->current();
        $stmt = $db->prepare("SELECT nurse_user_id FROM nurse_patient_assignments WHERE admission_id = :a AND shift_date = :d AND shift_id = :s AND nurse_user_id IS NOT NULL");
        $stmt->execute(['a' => $admissionId, 'd' => $cur['date'], 's' => $cur['shift']['id'] ?? 0]);
        if ($n = $stmt->fetchColumn()) {
            return [['user' => (int) $n]];
        }
        $stmt = $db->prepare(
            "SELECT x.user_id FROM nurse_ward_assignments x JOIN inpatient_admissions a ON a.ward_id = x.ward_id AND a.id = :a
             JOIN users u ON u.id = x.user_id AND u.deleted_at IS NULL JOIN roles r ON r.id = u.role_id WHERE r.name IN ('nurse', 'charge_nurse')"
        );
        $stmt->execute(['a' => $admissionId]);
        $ids = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
        return $ids ? array_map(fn($u) => ['user' => $u], $ids) : [['role' => 'nurse']];
    }

    /** Overrides taken for this order (cabinet, before verification): the pharmacy has now acted on it. */
    private function closeOverrideAlerts(int $orderId, int $userId, string $note): void
    {
        $stmt = Database::connection()->prepare("SELECT id FROM cabinet_withdrawals WHERE order_id = :o AND is_override = 1");
        $stmt->execute(['o' => $orderId]);
        foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $wid) {
            AlertService::resolveByKey("override:{$wid}", $userId, $note);
        }
    }

    private function lock(PDO $db, int $id): ?array
    {
        $stmt = $db->prepare("SELECT * FROM inpatient_med_orders WHERE id = :id FOR UPDATE");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function rollBack(PDO $db, bool $owns, string $sp): void
    {
        $owns ? ($db->inTransaction() && $db->rollBack()) : $db->exec("ROLLBACK TO SAVEPOINT {$sp}");
    }

    private function log(int $orderId, string $action, ?string $note, int $userId): void
    {
        Database::connection()->prepare("INSERT INTO inpatient_med_order_events (order_id, action, note, user_id, created_at) VALUES (:o, :a, :n, :u, NOW())")
            ->execute(['o' => $orderId, 'a' => $action, 'n' => $note !== null ? mb_substr($note, 0, 500) : null, 'u' => $userId ?: null]);
    }

    private function dt($v): ?string
    {
        if (!is_string($v) || trim($v) === '') {
            return null;
        }
        try {
            return (new \DateTimeImmutable(str_replace('T', ' ', trim($v)), new \DateTimeZone('UTC')))->format('Y-m-d H:i:s');
        } catch (\Exception $e) {
            return null;
        }
    }

    /** DB time -> seconds, read as UTC (PHP's own timezone has daylight saving; the DB clock doesn't). */
    private static function ts(string $dt): int
    {
        return (new \DateTimeImmutable($dt, new \DateTimeZone('UTC')))->getTimestamp();
    }

    private static function nameSql(string $column): string
    {
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(ne.first_name, ''), ' ', COALESCE(ne.last_name, ''))), ''), nu.username)
                 FROM users nu LEFT JOIN employees ne ON ne.user_id = nu.id AND ne.deleted_at IS NULL
                 WHERE nu.id = {$column} LIMIT 1)";
    }
}
