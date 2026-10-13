<?php

namespace App\Modules\Radiology\Services;

use App\Core\Database;
use App\Modules\PatientProcedureResults\Services\PatientProcedureResultService;
use PDO;

/**
 * Radiology (module 15, Phase 2: the images and the radiologist's report).
 *
 *   * perform() -- the radiographer says the study was done: when, the technique actually used, whether contrast
 *     was given and the dose. The study then waits to be reported.
 *   * uploadImage() / images() -- the image files of the study (DICOM .dcm or JPEG / PNG captures). They open in
 *     the hospital's existing DICOM viewer, which is handed the study and its files.
 *   * queue() -- the reading worklist: studies performed and not reported yet (STAT first, then oldest), and the
 *     reports signed in the last week.
 *   * form() / save() -- the radiologist writes the report (technique, comparison, findings, impression,
 *     recommendation) and either keeps it as a draft or signs it. Signing writes the conclusion to the chart
 *     through PatientProcedureResultService::saveForOrder (kind 'imaging'), which delivers it to the results inbox
 *     (module 7), starts the sign-off clock and -- when the radiologist marks the finding critical -- raises the
 *     critical alert with read-back for the ordering doctor and the patient's nurse (module 6).
 *   * A signed report can be given an addendum or a correction: a new version, signed again; the inbox marks it
 *     corrected and an unacknowledged critical alert that no longer applies is closed.
 *   * staff() / saveStaff() -- which doctors are radiologists (admin). Only a radiologist may sign.
 */
class RadReportService
{
    public const PERFORM_ROLES = ['admin', 'radiologic_technologist'];
    public const REPORT_ROLES = ['admin', 'doctor', 'clinician'];
    /** Only a doctor marked as a radiologist signs a report (an admin never does). */
    public const SIGN_ROLES = ['doctor', 'clinician'];
    public const CONCLUSIONS = ['normal' => 'Normal', 'abnormal' => 'Abnormal', 'critical' => 'Critical finding'];
    /** Minutes after the study was performed when a report counts as overdue. */
    public const OVERDUE = ['stat' => 60, 'urgent' => 240, 'routine' => 1440];
    private const EDITABLE = ['draft'];
    private const IMAGE_TYPES = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif',
        'application/dicom' => 'dcm', 'application/octet-stream' => 'dcm', 'application/pdf' => 'pdf'];
    private const MAX_IMAGE_BYTES = 40 * 1024 * 1024;

    // ------------------------------------------------------------------
    // Performing the study
    // ------------------------------------------------------------------

    /** data: id (booking), performed_at (blank = now), technique, contrast_given, contrast_detail, dose. */
    public function perform(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::PERFORM_ROLES, true)) {
            return ['success' => false, 'message' => 'Radiology records what was done.', 'forbidden' => true];
        }
        $db = Database::connection();
        $b = $this->booking($db, (int) ($data['id'] ?? 0));
        if (!$b || !in_array($b['status'], ['booked', 'arrived'], true)) {
            return ['success' => false, 'message' => $b && $b['status'] === 'performed' ? 'This study is already recorded as done.' : 'Booking not found.',
                'not_found' => !$b];
        }
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $at = trim(str_replace('T', ' ', (string) ($data['performed_at'] ?? '')));
        $errors = [];
        if ($at === '') {
            $at = $now;
        } elseif (!preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/', $at) || !strtotime($at)) {
            $errors['performed_at'] = 'Use a real date and time.';
        } else {
            $at = substr($at, 0, 16) . ':00';
            if ($at > $now) {
                $errors['performed_at'] = 'Not in the future.';
            }
        }
        $technique = trim((string) ($data['technique'] ?? ''));
        if (mb_strlen($technique) > 500) {
            $errors['technique'] = 'At most 500 characters.';
        }
        foreach (['contrast_detail' => 255, 'dose' => 50] as $k => $max) {
            if (mb_strlen(trim((string) ($data[$k] ?? ''))) > $max) {
                $errors[$k] = "At most {$max} characters.";
            }
        }
        if ($errors) {
            return ['success' => false, 'message' => reset($errors), 'errors' => $errors];
        }
        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT rad_perform');
        try {
            $db->prepare(
                "UPDATE rad_bookings SET status = 'performed', performed_at = :at, performed_by = :u, technique = :t, contrast_given = :cg,
                        contrast_detail = :cd, dose = :d, arrived_at = COALESCE(arrived_at, :at2) WHERE id = :id AND status IN ('booked', 'arrived')"
            )->execute(['at' => $at, 'u' => (int) $actor['id'], 't' => $technique !== '' ? $technique : null, 'cg' => (int) !empty($data['contrast_given']),
                'cd' => self::text($data['contrast_detail'] ?? null, 255), 'd' => self::text($data['dose'] ?? null, 50), 'at2' => $at, 'id' => $b['id']]);
            $db->prepare("UPDATE patient_procedure_orders SET status = 'performed', updated_at = NOW(), updated_by = :u WHERE id = :id AND status = 'scheduled'")
                ->execute(['u' => (int) $actor['id'], 'id' => $b['order_id']]);
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT rad_perform');
        } catch (\Throwable $e) {
            $owns ? $db->rollBack() : $db->exec('ROLLBACK TO SAVEPOINT rad_perform');
            throw $e;
        }
        return ['success' => true, 'message' => "{$b['study_name']}: done. Upload the images, then it waits for the radiologist.",
            'data' => ['order_id' => (int) $b['order_id']]];
    }

    // ------------------------------------------------------------------
    // Images
    // ------------------------------------------------------------------

    /** data: order_id, series_desc, is_key, notes; file: one uploaded image (DICOM, JPEG, PNG, WEBP, GIF or PDF). */
    public function uploadImage(array $data, array $file, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::PERFORM_ROLES, true)) {
            return ['success' => false, 'message' => 'Images are uploaded by radiology.', 'forbidden' => true];
        }
        $db = Database::connection();
        $o = $this->study($db, (int) ($data['order_id'] ?? 0));
        if (!$o || !$o['rad_request_id']) {
            return ['success' => false, 'message' => 'Study not found.', 'not_found' => true];
        }
        if (empty($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            return ['success' => false, 'message' => 'Choose the image file to upload.', 'errors' => ['file' => 'Required.']];
        }
        if ((int) ($file['size'] ?? 0) > self::MAX_IMAGE_BYTES) {
            return ['success' => false, 'message' => 'Each file must be 40 MB or smaller.'];
        }
        $mime = (string) (@mime_content_type($file['tmp_name']) ?: 'application/octet-stream');
        $ext = strtolower(pathinfo((string) ($file['name'] ?? ''), PATHINFO_EXTENSION));
        if (in_array($ext, ['dcm', 'ima', 'dic'], true)) {
            $mime = 'application/dicom';
        }
        if (!isset(self::IMAGE_TYPES[$mime])) {
            return ['success' => false, 'message' => 'Only DICOM (.dcm), JPEG, PNG, WEBP, GIF or PDF files can be uploaded.'];
        }
        $dir = dirname(__DIR__, 4) . '/public/uploads/rad_images';
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            return ['success' => false, 'message' => 'Could not open the image folder on the server.'];
        }
        $stored = 'rad_' . (int) $o['id'] . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . self::IMAGE_TYPES[$mime];
        $dest = $dir . '/' . $stored;
        if (!@move_uploaded_file($file['tmp_name'], $dest) && !@copy($file['tmp_name'], $dest)) {
            return ['success' => false, 'message' => 'Could not save the uploaded file.'];
        }
        $next = $db->prepare("SELECT COALESCE(MAX(instance_no), 0) + 1 FROM rad_images WHERE order_id = :o AND deleted_at IS NULL");
        $next->execute(['o' => $o['id']]);
        $db->prepare(
            "INSERT INTO rad_images (order_id, booking_id, patient_id, series_desc, instance_no, is_key, original_filename, stored_filename, file_path,
                    mime_type, file_size, notes, uploaded_by, created_at)
             VALUES (:o, :b, :p, :s, :i, :k, :of, :sf, :fp, :m, :sz, :n, :u, NOW())"
        )->execute([
            'o' => $o['id'], 'b' => $o['rad_booking_id'] ?: null, 'p' => $o['patient_id'], 's' => self::text($data['series_desc'] ?? null, 150),
            'i' => (int) $next->fetchColumn(), 'k' => (int) !empty($data['is_key']), 'of' => mb_substr((string) ($file['name'] ?? ''), 0, 255),
            'sf' => $stored, 'fp' => '/uploads/rad_images/' . $stored, 'm' => $mime, 'sz' => (int) ($file['size'] ?? 0),
            'n' => self::text($data['notes'] ?? null, 255), 'u' => (int) $actor['id'],
        ]);
        $id = (int) $db->lastInsertId();
        return ['success' => true, 'message' => 'Image uploaded.', 'data' => ['id' => $id, 'images' => $this->imageRows($db, (int) $o['id'])]];
    }

    /** The study's images, with what the DICOM viewer needs to show them. */
    public function images(int $orderId, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', RadiologyService::VIEW_ROLES, true)) {
            return ['success' => false, 'message' => 'Not allowed.', 'forbidden' => true];
        }
        $db = Database::connection();
        $o = $this->study($db, $orderId);
        if (!$o || !$o['rad_request_id']) {
            return ['success' => false, 'message' => 'Study not found.', 'not_found' => true];
        }
        $p = $db->prepare("SELECT patient_no, first_name, middle_name, last_name, sex, birthdate FROM patients WHERE id = :id");
        $p->execute(['id' => $o['patient_id']]);
        $pt = $p->fetch(PDO::FETCH_ASSOC) ?: [];
        return ['success' => true, 'message' => 'Ready.', 'data' => [
            'order_id' => (int) $o['id'], 'study' => $o['name'], 'code' => $o['identifying_code'], 'modality' => $o['rad_modality'],
            'modality_label' => RadiologyService::MODALITIES[$o['rad_modality']] ?? $o['rad_modality'],
            'performed_at' => $o['performed_at'], 'technique' => $o['technique'],
            'patient' => ['id' => (int) $o['patient_id'], 'name' => trim(preg_replace('/\s+/', ' ', ($pt['first_name'] ?? '') . ' ' . ($pt['middle_name'] ?? '') . ' ' . ($pt['last_name'] ?? ''))),
                'mrn' => $pt['patient_no'] ?? null, 'sex' => $pt['sex'] ?? null, 'birthdate' => $pt['birthdate'] ?? null],
            'images' => $this->imageRows($db, (int) $o['id']),
        ]];
    }

    /** data: id, reason -- remove an image uploaded by mistake (radiology; the person who uploaded it or an admin). */
    public function deleteImage(array $data, array $actor): array
    {
        $db = Database::connection();
        $st = $db->prepare("SELECT * FROM rad_images WHERE id = :id AND deleted_at IS NULL");
        $st->execute(['id' => (int) ($data['id'] ?? 0)]);
        $img = $st->fetch(PDO::FETCH_ASSOC);
        if (!$img) {
            return ['success' => false, 'message' => 'Image not found.', 'not_found' => true];
        }
        $mine = (int) $img['uploaded_by'] === (int) ($actor['id'] ?? 0);
        if (!$mine && !in_array($actor['role'] ?? '', ['admin', 'radiologic_technologist'], true)) {
            return ['success' => false, 'message' => 'Only radiology or an admin can remove an image.', 'forbidden' => true];
        }
        $reason = trim((string) ($data['reason'] ?? ''));
        if ($reason === '' || mb_strlen($reason) > 255) {
            return ['success' => false, 'message' => 'Why remove it?', 'errors' => ['reason' => 'Required.']];
        }
        $db->prepare("UPDATE rad_images SET deleted_at = NOW(), deleted_by = :u, delete_reason = :r WHERE id = :id")
            ->execute(['u' => (int) $actor['id'], 'r' => $reason, 'id' => $img['id']]);
        return ['success' => true, 'message' => 'Image removed from the study.', 'data' => ['images' => $this->imageRows($db, (int) $img['order_id'])]];
    }

    private function imageRows(PDO $db, int $orderId): array
    {
        $st = $db->prepare(
            "SELECT i.*, " . RadiologyService::nameSql('i.uploaded_by') . " AS uploaded_by_name FROM rad_images i
             WHERE i.order_id = :o AND i.deleted_at IS NULL ORDER BY i.instance_no, i.id"
        );
        $st->execute(['o' => $orderId]);
        return array_map(fn($i) => ['id' => (int) $i['id'], 'series_desc' => $i['series_desc'], 'instance_no' => (int) $i['instance_no'],
            'is_key' => (bool) $i['is_key'], 'file_path' => $i['file_path'], 'original_filename' => $i['original_filename'],
            'mime_type' => $i['mime_type'], 'file_size' => (int) $i['file_size'], 'is_dicom' => $i['mime_type'] === 'application/dicom',
            'notes' => $i['notes'], 'uploaded_by' => $i['uploaded_by_name'], 'created_at' => $i['created_at']], $st->fetchAll(PDO::FETCH_ASSOC));
    }

    // ------------------------------------------------------------------
    // The reading worklist
    // ------------------------------------------------------------------

    /** view: read (to report) | reported (signed, last 7 days); filters: modality, q. */
    public function queue(string $view, array $f, array $actor): array
    {
        $db = Database::connection();
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $view = $view === 'reported' ? 'reported' : 'read';
        $modality = isset(RadiologyService::MODALITIES[$f['modality'] ?? '']) ? (string) $f['modality'] : '';
        $q = trim((string) ($f['q'] ?? ''));
        $sql = $view === 'read'
            ? "SELECT o.id FROM patient_procedure_orders o
               JOIN rad_bookings b ON b.id = o.rad_booking_id AND b.status = 'performed'
               WHERE o.deleted_at IS NULL AND o.rad_request_id IS NOT NULL
                 AND NOT EXISTS (SELECT 1 FROM rad_reports r WHERE r.order_id = o.id AND r.status = 'signed')
               ORDER BY b.performed_at"
            : "SELECT DISTINCT o.id FROM patient_procedure_orders o
               JOIN rad_reports r ON r.order_id = o.id AND r.status IN ('signed', 'superseded')
               WHERE o.deleted_at IS NULL AND o.rad_request_id IS NOT NULL AND r.signed_at >= NOW() - INTERVAL 7 DAY
               ORDER BY (SELECT MAX(x.signed_at) FROM rad_reports x WHERE x.order_id = o.id) DESC LIMIT 200";
        $items = [];
        foreach ($db->query($sql)->fetchAll(PDO::FETCH_COLUMN) as $orderId) {
            $x = $this->studyOut($db, (int) $orderId, $now);
            if (!$x || ($modality !== '' && $x['modality'] !== $modality)) {
                continue;
            }
            if ($q !== '' && !str_contains(strtolower("{$x['patient']['name']} {$x['patient']['mrn']} {$x['request_no']} {$x['study']}"), strtolower($q))) {
                continue;
            }
            $items[] = $x;
        }
        if ($view === 'read') {
            usort($items, fn($a, $b) => [self::rank($a['priority']), $a['performed_at']] <=> [self::rank($b['priority']), $b['performed_at']]);
        }
        $c = $db->query(
            "SELECT
               (SELECT COUNT(*) FROM patient_procedure_orders o JOIN rad_bookings b ON b.id = o.rad_booking_id AND b.status = 'performed'
                  WHERE o.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM rad_reports r WHERE r.order_id = o.id AND r.status = 'signed')) AS to_report,
               (SELECT COUNT(*) FROM patient_procedure_orders o JOIN rad_bookings b ON b.id = o.rad_booking_id AND b.status = 'performed'
                  JOIN rad_requests rq ON rq.id = o.rad_request_id
                  WHERE o.deleted_at IS NULL AND rq.priority = 'stat'
                    AND NOT EXISTS (SELECT 1 FROM rad_reports r WHERE r.order_id = o.id AND r.status = 'signed')) AS stat,
               (SELECT COUNT(*) FROM patient_procedure_orders o JOIN rad_bookings b ON b.id = o.rad_booking_id AND b.status = 'performed'
                  JOIN rad_requests rq ON rq.id = o.rad_request_id
                  WHERE o.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM rad_reports r WHERE r.order_id = o.id AND r.status = 'signed')
                    AND TIMESTAMPDIFF(MINUTE, b.performed_at, NOW()) > CASE rq.priority WHEN 'stat' THEN " . self::OVERDUE['stat']
                    . " WHEN 'urgent' THEN " . self::OVERDUE['urgent'] . " ELSE " . self::OVERDUE['routine'] . " END) AS overdue,
               (SELECT COUNT(*) FROM rad_reports WHERE status = 'draft') AS drafts,
               (SELECT COUNT(*) FROM rad_reports WHERE status IN ('signed', 'superseded') AND signed_at >= CURDATE()) AS signed_today,
               (SELECT COUNT(*) FROM rad_reports WHERE status = 'signed' AND conclusion = 'critical' AND signed_at >= NOW() - INTERVAL 7 DAY) AS critical_week"
        )->fetch(PDO::FETCH_ASSOC);
        return ['view' => $view, 'now' => $now, 'items' => $items, 'counts' => array_map('intval', $c),
            'can_report' => in_array($actor['role'] ?? '', self::REPORT_ROLES, true), 'can_sign' => $this->canSign($db, $actor),
            'is_admin' => ($actor['role'] ?? '') === 'admin', 'conclusions' => self::CONCLUSIONS,
            'modalities' => RadiologyService::MODALITIES, 'priorities' => RadiologyService::PRIORITIES];
    }

    /** One study for the reading list: the request, what was done, the images and the report so far. */
    private function studyOut(PDO $db, int $orderId, string $now): ?array
    {
        $o = $this->study($db, $orderId);
        if (!$o) {
            return null;
        }
        $r = $db->prepare(
            "SELECT rq.*, p.patient_no, p.first_name, p.middle_name, p.last_name, p.sex, p.birthdate,
                    " . RadiologyService::nameSql('rq.ordering_user_id') . " AS ordering_doctor
             FROM rad_requests rq JOIN patients p ON p.id = rq.patient_id WHERE rq.id = :id"
        );
        $r->execute(['id' => $o['rad_request_id']]);
        $rq = $r->fetch(PDO::FETCH_ASSOC);
        if (!$rq) {
            return null;
        }
        $report = $this->latest($db, $orderId);
        $age = $rq['birthdate'] ? (new \DateTimeImmutable($rq['birthdate']))->diff(new \DateTimeImmutable('today'))->y : null;
        $waited = $o['performed_at'] ? intdiv(self::ts($now) - self::ts($o['performed_at']), 60) : 0;
        return [
            'order_id' => $orderId, 'study' => $o['name'], 'code' => $o['identifying_code'], 'modality' => $o['rad_modality'],
            'modality_label' => RadiologyService::MODALITIES[$o['rad_modality']] ?? $o['rad_modality'],
            'request_id' => (int) $rq['id'], 'request_no' => $rq['request_no'], 'priority' => $rq['priority'], 'indication' => $rq['indication'],
            'location' => $rq['location'], 'source_label' => RadiologyService::SOURCES[$rq['source']] ?? $rq['source'],
            'ordering_doctor' => $rq['ordering_doctor'], 'ordered_at' => $rq['ordered_at'],
            'safety' => ['pregnancy' => $rq['pregnancy'], 'contrast_allergy' => $rq['contrast_allergy'], 'implants' => $rq['implants'],
                'creatinine' => $rq['creatinine'] !== null ? (float) $rq['creatinine'] : null, 'sedation' => (bool) $rq['sedation'], 'isolation' => $rq['isolation']],
            'patient' => ['id' => (int) $rq['patient_id'], 'name' => trim(preg_replace('/\s+/', ' ', "{$rq['first_name']} {$rq['middle_name']} {$rq['last_name']}")),
                'mrn' => $rq['patient_no'], 'sex' => $rq['sex'], 'birthdate' => $rq['birthdate'], 'age' => $age],
            'performed_at' => $o['performed_at'], 'performed_by' => $o['performed_by'] ? $this->userName($db, (int) $o['performed_by']) : null,
            'technique' => $o['technique'], 'contrast_given' => (bool) $o['contrast_given'], 'contrast_detail' => $o['contrast_detail'], 'dose' => $o['dose'],
            'room' => $o['room_name'], 'minutes_waiting' => max(0, $waited),
            'overdue' => $report === null || $report['status'] !== 'signed' ? $waited > (self::OVERDUE[$rq['priority']] ?? 1440) : false,
            'images' => $this->imageRows($db, $orderId),
            'report' => $report ? $this->reportOut($db, $report) : null,
            'versions' => $this->versions($db, $orderId),
        ];
    }

    private function reportOut(PDO $db, array $r): array
    {
        return ['id' => (int) $r['id'], 'version' => (int) $r['version'], 'status' => $r['status'], 'technique' => $r['technique'],
            'comparison' => $r['comparison'], 'findings' => $r['findings'], 'impression' => $r['impression'], 'recommendation' => $r['recommendation'],
            'conclusion' => $r['conclusion'], 'conclusion_label' => self::CONCLUSIONS[$r['conclusion']] ?? $r['conclusion'],
            'critical_note' => $r['critical_note'], 'change_reason' => $r['change_reason'], 'is_addendum' => (bool) $r['is_addendum'],
            'saved_at' => $r['saved_at'], 'saved_by' => $r['saved_by'] ? $this->userName($db, (int) $r['saved_by']) : null,
            'signed_at' => $r['signed_at'], 'signed_by' => $r['signed_by'] ? $this->userName($db, (int) $r['signed_by']) : null,
            'signed_by_license' => $r['signed_by'] ? $this->license($db, (int) $r['signed_by']) : null];
    }

    private function versions(PDO $db, int $orderId): array
    {
        $st = $db->prepare("SELECT * FROM rad_reports WHERE order_id = :o AND status IN ('signed', 'superseded') ORDER BY version");
        $st->execute(['o' => $orderId]);
        return array_map(fn($r) => $this->reportOut($db, $r), $st->fetchAll(PDO::FETCH_ASSOC));
    }

    // ------------------------------------------------------------------
    // Writing the report
    // ------------------------------------------------------------------

    /** The report form for a study. amend = add to or correct a signed report. */
    public function form(int $orderId, bool $amend, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::REPORT_ROLES, true)) {
            return ['success' => false, 'message' => 'Reports are written by the radiologists.', 'forbidden' => true];
        }
        $db = Database::connection();
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $x = $this->studyOut($db, $orderId, $now);
        if (!$x) {
            return ['success' => false, 'message' => 'Study not found.', 'not_found' => true];
        }
        if (!$x['performed_at']) {
            return ['success' => false, 'message' => 'This study has not been done yet.'];
        }
        $cur = $x['report'];
        $signed = $cur && $cur['status'] === 'signed';
        if ($signed && !$amend) {
            return ['success' => false, 'message' => "{$x['study']} is already reported. Use “Addendum / correct” to change it."];
        }
        $draft = $signed
            ? ['technique' => $cur['technique'], 'comparison' => $cur['comparison'], 'findings' => $cur['findings'], 'impression' => $cur['impression'],
                'recommendation' => $cur['recommendation'], 'conclusion' => $cur['conclusion'], 'critical_note' => $cur['critical_note'],
                'change_reason' => null, 'is_addendum' => true, 'version' => $cur['version'] + 1, 'amending' => true]
            : ($cur
                ? $cur + ['amending' => (int) $cur['version'] > 1]
                : ['technique' => $x['technique'] ?: null, 'comparison' => null, 'findings' => null, 'impression' => null, 'recommendation' => null,
                    'conclusion' => 'normal', 'critical_note' => null, 'change_reason' => null, 'is_addendum' => false, 'version' => 1, 'amending' => false]);
        return ['success' => true, 'message' => 'Ready.', 'data' => $x + [
            'draft' => $draft,
            'previous' => $this->previousReports($db, (int) $x['patient']['id'], $orderId),
            'can_sign' => $this->canSign($db, $actor),
            'conclusions' => self::CONCLUSIONS,
        ]];
    }

    /**
     * data: order_id, technique, comparison, findings, impression, recommendation, conclusion, critical_note,
     * change_reason, is_addendum, sign (1 = sign it, else keep as a draft).
     */
    public function save(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::REPORT_ROLES, true)) {
            return ['success' => false, 'message' => 'Reports are written by the radiologists.', 'forbidden' => true];
        }
        $db = Database::connection();
        $sign = !empty($data['sign']);
        if ($sign && !$this->canSign($db, $actor)) {
            return ['success' => false, 'message' => 'A report is signed by a radiologist (set up under Radiologists).', 'forbidden' => true];
        }
        $o = $this->study($db, (int) ($data['order_id'] ?? 0));
        if (!$o || !$o['rad_request_id']) {
            return ['success' => false, 'message' => 'Study not found.', 'not_found' => true];
        }
        if (!$o['performed_at']) {
            return ['success' => false, 'message' => 'This study has not been done yet.'];
        }
        $cur = $this->latest($db, (int) $o['id']);
        $signed = $cur && $cur['status'] === 'signed';
        $amending = $signed || ($cur && (int) $cur['version'] > 1 && in_array($cur['status'], self::EDITABLE, true));
        $errors = [];
        $conclusion = (string) ($data['conclusion'] ?? '');
        if (!isset(self::CONCLUSIONS[$conclusion])) {
            $errors['conclusion'] = 'Normal, abnormal or a critical finding?';
        }
        $findings = trim((string) ($data['findings'] ?? ''));
        $impression = trim((string) ($data['impression'] ?? ''));
        if ($sign && $impression === '') {
            $errors['impression'] = 'The impression is what the doctor reads first: write it.';
        }
        if (mb_strlen($findings) > 20000 || mb_strlen($impression) > 20000) {
            $errors[mb_strlen($findings) > 20000 ? 'findings' : 'impression'] = 'That is too long.';
        }
        $criticalNote = trim((string) ($data['critical_note'] ?? ''));
        if ($conclusion === 'critical' && $sign && $criticalNote === '') {
            $errors['critical_note'] = 'Say the critical finding in one line: it is what the alert shows the doctor.';
        }
        $changeReason = trim((string) ($data['change_reason'] ?? ($cur['change_reason'] ?? '')));
        if ($amending && $sign && ($changeReason === '' || mb_strlen($changeReason) > 255)) {
            $errors['change_reason'] = 'Why is the report changed?';
        }
        foreach (['technique' => 500, 'comparison' => 500, 'recommendation' => 500] as $k => $max) {
            if (mb_strlen(trim((string) ($data[$k] ?? ''))) > $max) {
                $errors[$k] = "At most {$max} characters.";
            }
        }
        if ($errors) {
            return ['success' => false, 'message' => reset($errors), 'errors' => $errors];
        }

        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT rad_report');
        try {
            if (!$cur || $signed) {
                $version = $cur ? (int) $cur['version'] + 1 : 1;
                $db->prepare("INSERT INTO rad_reports (order_id, version, status, created_at) VALUES (:o, :v, 'draft', NOW())")
                    ->execute(['o' => $o['id'], 'v' => $version]);
                $rid = (int) $db->lastInsertId();
            } else {
                $rid = (int) $cur['id'];
            }
            $db->prepare(
                "UPDATE rad_reports SET technique = :t, comparison = :c, findings = :f, impression = :i, recommendation = :r, conclusion = :cl,
                        critical_note = :cn, change_reason = :cr, is_addendum = :ad, saved_by = :u, saved_at = NOW() WHERE id = :id"
            )->execute([
                't' => self::text($data['technique'] ?? null, 500), 'c' => self::text($data['comparison'] ?? null, 500),
                'f' => $findings !== '' ? $findings : null, 'i' => $impression !== '' ? $impression : null,
                'r' => self::text($data['recommendation'] ?? null, 500), 'cl' => $conclusion,
                'cn' => $conclusion === 'critical' ? ($criticalNote !== '' ? mb_substr($criticalNote, 0, 255) : null) : null,
                'cr' => $amending && $changeReason !== '' ? mb_substr($changeReason, 0, 255) : null,
                'ad' => (int) (!empty($data['is_addendum']) && $amending), 'u' => (int) $actor['id'], 'id' => $rid,
            ]);
            if (!$sign) {
                $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT rad_report');
                return ['success' => true, 'message' => 'Draft saved. It is not in the chart until you sign it.', 'data' => ['order_id' => (int) $o['id']]];
            }
            // ---- signing: the conclusion goes to the chart, the inbox, and the alert when it is critical
            $row = [
                'code' => $o['identifying_code'], 'name' => $o['name'], 'value' => self::CONCLUSIONS[$conclusion],
                'flag' => $conclusion === 'normal' ? 'normal' : $conclusion,
                'flag_detail' => $conclusion === 'critical' ? $criticalNote : ($conclusion === 'abnormal' ? mb_substr($impression, 0, 150) : null),
                'result_date' => (string) $db->query("SELECT CURDATE()")->fetchColumn(),
            ];
            $res = (new PatientProcedureResultService())->saveForOrder((int) $o['id'], [$row], (int) $actor['id'], 'imaging');
            if (!$res['success']) {
                $owns ? $db->rollBack() : $db->exec('ROLLBACK TO SAVEPOINT rad_report');
                return $res;
            }
            $db->prepare("UPDATE rad_reports SET status = 'superseded' WHERE order_id = :o AND status = 'signed' AND id <> :id")
                ->execute(['o' => $o['id'], 'id' => $rid]);
            $db->prepare("UPDATE rad_reports SET status = 'signed', signed_by = :u, signed_at = NOW() WHERE id = :id")
                ->execute(['u' => (int) $actor['id'], 'id' => $rid]);
            $this->closeRequest($db, (int) $o['rad_request_id']);
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT rad_report');
        } catch (\Throwable $e) {
            $owns ? $db->rollBack() : $db->exec('ROLLBACK TO SAVEPOINT rad_report');
            throw $e;
        }
        $what = $amending ? (!empty($data['is_addendum']) ? 'Addendum signed' : 'Corrected report signed') : 'Report signed';
        return ['success' => true, 'message' => "{$o['name']}: {$what}. " . preg_replace('/^Report filed\.\s*/', '', $res['message'])
            . ' It is in the chart and in the results inbox.', 'data' => ($res['data'] ?? []) + ['order_id' => (int) $o['id']]];
    }

    /** The signed report (and its earlier versions) for reading or printing. */
    public function report(int $orderId, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', RadiologyService::VIEW_ROLES, true)) {
            return ['success' => false, 'message' => 'Not allowed.', 'forbidden' => true];
        }
        $db = Database::connection();
        $x = $this->studyOut($db, $orderId, (string) $db->query("SELECT NOW()")->fetchColumn());
        if (!$x) {
            return ['success' => false, 'message' => 'Study not found.', 'not_found' => true];
        }
        return ['success' => true, 'message' => 'Ready.', 'data' => $x];
    }

    // ------------------------------------------------------------------
    // Radiologists
    // ------------------------------------------------------------------

    public function staff(): array
    {
        return Database::connection()->query(
            "SELECT u.id, " . RadiologyService::nameSql('u.id') . " AS name, u.username, r.name AS role,
                    COALESCE(rs.radiologist, 0) AS radiologist, rs.license_no
             FROM users u JOIN roles r ON r.id = u.role_id LEFT JOIN rad_staff rs ON rs.user_id = u.id
             WHERE u.deleted_at IS NULL AND r.name IN ('doctor', 'clinician') ORDER BY name"
        )->fetchAll(PDO::FETCH_ASSOC);
    }

    /** data: user_id, radiologist, license_no (required for a radiologist). Admin. */
    public function saveStaff(array $data, array $actor): array
    {
        if (($actor['role'] ?? '') !== 'admin') {
            return ['success' => false, 'message' => 'Radiologists are set up by an admin.', 'forbidden' => true];
        }
        $uid = (int) ($data['user_id'] ?? 0);
        if (!in_array($uid, array_map(fn($s) => (int) $s['id'], $this->staff()), true)) {
            return ['success' => false, 'message' => 'Choose a doctor.', 'errors' => ['user_id' => 'Required.']];
        }
        $isRad = (int) !empty($data['radiologist']);
        $lic = trim((string) ($data['license_no'] ?? ''));
        if ($isRad && ($lic === '' || mb_strlen($lic) > 50)) {
            return ['success' => false, 'message' => 'A radiologist needs a licence number.', 'errors' => ['license_no' => 'Required.']];
        }
        Database::connection()->prepare(
            "INSERT INTO rad_staff (user_id, radiologist, license_no, updated_by, updated_at) VALUES (:u, :r, :l, :by, NOW())
             ON DUPLICATE KEY UPDATE radiologist = VALUES(radiologist), license_no = VALUES(license_no), updated_by = VALUES(updated_by), updated_at = NOW()"
        )->execute(['u' => $uid, 'r' => $isRad, 'l' => $lic !== '' ? $lic : null, 'by' => (int) $actor['id']]);
        return ['success' => true, 'message' => $isRad ? 'Radiologist: may read and sign imaging reports.' : 'Not a radiologist: cannot sign imaging reports.'];
    }

    public function canSign(PDO $db, array $actor): bool
    {
        if (!in_array($actor['role'] ?? '', self::SIGN_ROLES, true)) {
            return false;
        }
        $st = $db->prepare("SELECT radiologist FROM rad_staff WHERE user_id = :u");
        $st->execute(['u' => (int) ($actor['id'] ?? 0)]);
        return (int) $st->fetchColumn() === 1;
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    /** The patient's last signed imaging reports (other studies), for the comparison line. */
    private function previousReports(PDO $db, int $patientId, int $orderId): array
    {
        $st = $db->prepare(
            "SELECT r.id, r.version, r.impression, r.conclusion, r.signed_at, c.name AS study, c.rad_modality, o.id AS order_id
             FROM rad_reports r JOIN patient_procedure_orders o ON o.id = r.order_id
             JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
             WHERE o.patient_id = :p AND o.id <> :o AND o.deleted_at IS NULL AND r.status = 'signed'
             ORDER BY r.signed_at DESC LIMIT 5"
        );
        $st->execute(['p' => $patientId, 'o' => $orderId]);
        return array_map(fn($r) => ['order_id' => (int) $r['order_id'], 'study' => $r['study'],
            'modality_label' => RadiologyService::MODALITIES[$r['rad_modality']] ?? $r['rad_modality'], 'signed_at' => $r['signed_at'],
            'conclusion' => $r['conclusion'], 'impression' => $r['impression']], $st->fetchAll(PDO::FETCH_ASSOC));
    }

    /** Everything of the request reported or cancelled: the request is done. */
    private function closeRequest(PDO $db, int $requestId): void
    {
        $st = $db->prepare(
            "SELECT SUM(status IN ('pending', 'scheduled', 'performed')) AS open_, SUM(status IN ('resulted', 'reviewed')) AS done
             FROM patient_procedure_orders WHERE rad_request_id = :r AND deleted_at IS NULL"
        );
        $st->execute(['r' => $requestId]);
        $c = $st->fetch(PDO::FETCH_ASSOC);
        if ((int) $c['open_'] === 0 && (int) $c['done'] > 0) {
            $db->prepare("UPDATE rad_requests SET status = 'done' WHERE id = :id")->execute(['id' => $requestId]);
        }
    }

    private function study(PDO $db, int $orderId): ?array
    {
        $st = $db->prepare(
            "SELECT o.*, c.name, c.identifying_code, c.rad_modality, c.rad_contrast,
                    b.performed_at, b.performed_by, b.technique, b.contrast_given, b.contrast_detail, b.dose, b.start_at, b.status AS booking_status,
                    (SELECT rr.name FROM rad_rooms rr WHERE rr.id = b.room_id) AS room_name
             FROM patient_procedure_orders o JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
             LEFT JOIN rad_bookings b ON b.id = o.rad_booking_id
             WHERE o.id = :id AND o.deleted_at IS NULL"
        );
        $st->execute(['id' => $orderId]);
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

    private function latest(PDO $db, int $orderId): ?array
    {
        $st = $db->prepare("SELECT * FROM rad_reports WHERE order_id = :o AND status <> 'superseded' ORDER BY version DESC LIMIT 1");
        $st->execute(['o' => $orderId]);
        return $st->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function license(PDO $db, int $userId): ?string
    {
        $st = $db->prepare("SELECT license_no FROM rad_staff WHERE user_id = :u");
        $st->execute(['u' => $userId]);
        return $st->fetchColumn() ?: null;
    }

    private function userName(PDO $db, int $id): ?string
    {
        $st = $db->prepare("SELECT " . RadiologyService::nameSql(':id'));
        $st->execute(['id' => $id]);
        return $st->fetchColumn() ?: null;
    }

    private static function rank(?string $p): int
    {
        return ['stat' => 0, 'urgent' => 1][$p] ?? 2;
    }

    private static function text($value, int $max): ?string
    {
        if (is_array($value)) {
            return null;
        }
        $value = trim((string) ($value ?? ''));
        return $value === '' ? null : mb_substr($value, 0, $max);
    }

    private static function ts(string $dt): int
    {
        return (new \DateTimeImmutable(substr($dt, 0, 19), new \DateTimeZone('UTC')))->getTimestamp();
    }
}
