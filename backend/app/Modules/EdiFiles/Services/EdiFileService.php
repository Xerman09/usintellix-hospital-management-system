<?php

namespace App\Modules\EdiFiles\Services;

use App\Core\Database;
use App\Modules\EdiFiles\Models\EdiFile;
use App\Modules\EdiFiles\Models\EdiFileNote;
use PDO;

/**
 * File-management layer behind the "EDI History" screen: upload, list,
 * preview, note, and archive raw EDI files (835/837/any payer file).
 *
 * Deliberately NOT built: the real screen's "Process new files for CSV
 * records" step (parsing an 835/837 into structured claim/payment line
 * items). That requires a real X12 EDI parser and payer/clearinghouse
 * conventions this app has no infrastructure for -- faking it would
 * mean inventing numbers that look like real remittance data but
 * aren't, which is worse than not having the feature.
 *
 * The "CSV Tables" tab, though, doesn't have to depend on that parser to
 * be real: in real OpenEMR it browses the *result* of processing --
 * tabular claim/payment records for a date range or one encounter. This
 * app already has real tabular billing data (encounter_billing_codes,
 * patient_ledger_payments) from every other billing feature built this
 * session, so csvTable() browses *that* instead of fabricating parsed-EDI
 * rows. It's an honest reinterpretation, not the original feature: the
 * frontend labels the two table choices "Charges" / "Payments" rather
 * than implying they came from a processed EDI file.
 */
class EdiFileService
{
    private const MAX_SIZE_BYTES = 20 * 1024 * 1024;

    // EDI files don't have a standard MIME type (servers commonly report
    // plain-text ones as text/plain and everything else as
    // application/octet-stream), so files are accepted by extension
    // instead of sniffing content type, same as this app validates other
    // non-standard file kinds it can't MIME-sniff reliably.
    private const ALLOWED_EXTENSIONS = ['txt', 'edi', 'x12', 'dat', '835', '837'];

    private const PREVIEW_MAX_BYTES = 65536;

    public function list(string $status): array
    {
        $where = ['deleted_at IS NULL'];
        $params = [];

        if ($status === 'new' || $status === 'archived') {
            $where[] = 'status = :status';
            $params['status'] = $status;
        }

        $stmt = Database::connection()->prepare(
            "SELECT ef.*, COALESCE(NULLIF(TRIM(CONCAT(emp.first_name, ' ', emp.last_name)), ''), u.username) AS uploaded_by_name,
                    (SELECT COUNT(*) FROM edi_file_notes n WHERE n.edi_file_id = ef.id AND n.deleted_at IS NULL) AS note_count
             FROM edi_files ef
             LEFT JOIN users u ON u.id = ef.created_by
             LEFT JOIN employees emp ON emp.user_id = ef.created_by
             WHERE " . implode(' AND ', $where) . "
             ORDER BY ef.created_at DESC, ef.id DESC"
        );
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function find(int $id): ?array
    {
        $file = (new EdiFile())->where('id', $id)->first();

        return ($file && $file['deleted_at'] === null) ? $file : null;
    }

    /**
     * Uploads one or more files (from a normalized list of PHP $_FILES
     * entries, one per file -- see EdiFileController::normalizeFiles()).
     * Best-effort: a bad file among several doesn't block the good ones.
     */
    public function upload(array $files, int $userId): array
    {
        if (empty($files)) {
            return ['success' => false, 'message' => 'Select at least one file to upload.'];
        }

        $uploadDir = dirname(__DIR__, 4) . '/public/uploads/edi_files';

        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $uploaded = [];
        $failed = [];

        foreach ($files as $file) {
            if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
                $failed[] = ($file['name'] ?? 'file') . ': upload failed.';
                continue;
            }

            $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

            if (!in_array($extension, self::ALLOWED_EXTENSIONS, true)) {
                $failed[] = $file['name'] . ': unsupported file type.';
                continue;
            }

            if ($file['size'] > self::MAX_SIZE_BYTES) {
                $failed[] = $file['name'] . ': file must be 20MB or smaller.';
                continue;
            }

            $storedFilename = 'edi_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $extension;
            $destination = $uploadDir . '/' . $storedFilename;

            if (!move_uploaded_file($file['tmp_name'], $destination)) {
                $failed[] = $file['name'] . ': failed to save.';
                continue;
            }

            $id = (new EdiFile())->create([
                'original_filename' => $file['name'],
                'stored_filename' => $storedFilename,
                'file_path' => '/uploads/edi_files/' . $storedFilename,
                'mime_type' => mime_content_type($destination) ?: null,
                'file_size' => (int) $file['size'],
                'status' => 'new',
                'created_at' => date('Y-m-d H:i:s'),
                'created_by' => $userId
            ]);

            if ($id) {
                $uploaded[] = ['id' => $id, 'filename' => $file['name']];
            } else {
                $failed[] = $file['name'] . ': failed to record.';
            }
        }

        if (empty($uploaded)) {
            return ['success' => false, 'message' => implode(' ', $failed) ?: 'Failed to upload the file(s).'];
        }

        $message = count($uploaded) . ' file(s) uploaded successfully.';

        if (!empty($failed)) {
            $message .= ' ' . implode(' ', $failed);
        }

        return ['success' => true, 'message' => $message, 'data' => $uploaded];
    }

    /**
     * A capped raw-text preview of the file's contents, for the "EDI
     * File" tab. Safe for any file since it's read-only and truncated --
     * the frontend renders it as plain escaped text, never executed.
     */
    public function preview(int $id): array
    {
        $file = $this->find($id);

        if (!$file) {
            return ['success' => false, 'message' => 'File not found.'];
        }

        $fullPath = dirname(__DIR__, 4) . '/public' . $file['file_path'];

        if (!is_file($fullPath)) {
            return ['success' => false, 'message' => 'File is missing from storage.'];
        }

        $content = file_get_contents($fullPath, false, null, 0, self::PREVIEW_MAX_BYTES);
        $truncated = filesize($fullPath) > self::PREVIEW_MAX_BYTES;

        return [
            'success' => true,
            'data' => [
                'content' => $content === false ? '' : $content,
                'truncated' => $truncated
            ]
        ];
    }

    public function listNotes(int $ediFileId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT efn.*, COALESCE(NULLIF(TRIM(CONCAT(emp.first_name, ' ', emp.last_name)), ''), u.username) AS created_by_name
             FROM edi_file_notes efn
             LEFT JOIN users u ON u.id = efn.created_by
             LEFT JOIN employees emp ON emp.user_id = efn.created_by
             WHERE efn.edi_file_id = :edi_file_id AND efn.deleted_at IS NULL
             ORDER BY efn.created_at ASC, efn.id ASC"
        );
        $stmt->execute(['edi_file_id' => $ediFileId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function addNote(int $ediFileId, string $note, int $userId): array
    {
        if (trim($note) === '') {
            return ['success' => false, 'message' => 'Note text is required.'];
        }

        if (!$this->find($ediFileId)) {
            return ['success' => false, 'message' => 'File not found.'];
        }

        $id = (new EdiFileNote())->create([
            'edi_file_id' => $ediFileId,
            'note' => trim($note),
            'created_at' => date('Y-m-d H:i:s'),
            'created_by' => $userId
        ]);

        if (!$id) {
            return ['success' => false, 'message' => 'Failed to save the note.'];
        }

        return ['success' => true, 'message' => 'Note added.', 'data' => ['id' => $id]];
    }

    public function setArchived(int $id, bool $archived, int $userId): array
    {
        $file = $this->find($id);

        if (!$file) {
            return ['success' => false, 'message' => 'File not found.'];
        }

        (new EdiFile())->update([
            'status' => $archived ? 'archived' : 'new',
            'archived_at' => $archived ? date('Y-m-d H:i:s') : null,
            'archived_by' => $archived ? $userId : null
        ], $id);

        return ['success' => true, 'message' => $archived ? 'File archived.' : 'File restored.'];
    }

    /**
     * "View CSV tables" / "Per Encounter": real charge or payment rows,
     * filtered by a date range or a specific encounter number. See the
     * class doc-comment for why this queries real billing tables instead
     * of parsed-EDI output.
     */
    public function csvTable(string $table, ?string $from, ?string $to, ?int $encounterId): array
    {
        if ($table === 'payments') {
            return $this->paymentsCsvTable($from, $to, $encounterId);
        }

        return $this->chargesCsvTable($from, $to, $encounterId);
    }

    private function chargesCsvTable(?string $from, ?string $to, ?int $encounterId): array
    {
        $where = ['ebc.deleted_at IS NULL', 'e.deleted_at IS NULL'];
        $params = [];

        if ($encounterId) {
            $where[] = 'e.id = :encounter_id';
            $params['encounter_id'] = $encounterId;
        } else {
            if ($from) {
                $where[] = 'e.date_of_service >= :from';
                $params['from'] = $from;
            }
            if ($to) {
                $where[] = 'e.date_of_service <= :to';
                $params['to'] = $to . ' 23:59:59';
            }
        }

        $stmt = Database::connection()->prepare(
            "SELECT ebc.id, e.id AS encounter_id, e.date_of_service,
                    p.patient_no, TRIM(CONCAT(p.first_name, ' ', p.last_name)) AS patient_name,
                    ebc.code_type, ebc.code, ebc.description, ebc.fee, ebc.units,
                    (ebc.fee * ebc.units) AS total
             FROM encounter_billing_codes ebc
             JOIN encounters e ON e.id = ebc.encounter_id
             JOIN patients p ON p.id = e.patient_id AND p.deleted_at IS NULL
             WHERE " . implode(' AND ', $where) . "
             ORDER BY e.date_of_service DESC, ebc.id DESC
             LIMIT 500"
        );
        $stmt->execute($params);

        return ['columns' => ['Date of Service', 'Patient', 'Chart ID', 'Encounter', 'Type', 'Code', 'Description', 'Fee', 'Units', 'Total'],
                'rows' => array_map(fn ($r) => [
                    substr((string) $r['date_of_service'], 0, 10), $r['patient_name'], $r['patient_no'], $r['encounter_id'],
                    $r['code_type'], $r['code'], $r['description'], round((float) $r['fee'], 2), (int) $r['units'], round((float) $r['total'], 2)
                ], $stmt->fetchAll(PDO::FETCH_ASSOC))];
    }

    private function paymentsCsvTable(?string $from, ?string $to, ?int $encounterId): array
    {
        $where = ['plp.deleted_at IS NULL'];
        $params = [];

        if ($encounterId) {
            $where[] = 'plp.encounter_id = :encounter_id';
            $params['encounter_id'] = $encounterId;
        } else {
            if ($from) {
                $where[] = 'plp.payment_date >= :from';
                $params['from'] = $from;
            }
            if ($to) {
                $where[] = 'plp.payment_date <= :to';
                $params['to'] = $to;
            }
        }

        $stmt = Database::connection()->prepare(
            "SELECT plp.id, plp.payment_date, plp.encounter_id,
                    p.patient_no, TRIM(CONCAT(p.first_name, ' ', p.last_name)) AS patient_name,
                    plp.payer_type, plp.payment_type, plp.payment_amount, plp.adjustment_amount, plp.notes
             FROM patient_ledger_payments plp
             JOIN patients p ON p.id = plp.patient_id AND p.deleted_at IS NULL
             WHERE " . implode(' AND ', $where) . "
             ORDER BY plp.payment_date DESC, plp.id DESC
             LIMIT 500"
        );
        $stmt->execute($params);

        return ['columns' => ['Payment Date', 'Patient', 'Chart ID', 'Encounter', 'Payer', 'Type', 'Payment', 'Adjustment', 'Notes'],
                'rows' => array_map(fn ($r) => [
                    substr((string) $r['payment_date'], 0, 10), $r['patient_name'], $r['patient_no'], $r['encounter_id'] ?: '-',
                    ucfirst($r['payer_type']), $r['payment_type'], round((float) $r['payment_amount'], 2), round((float) $r['adjustment_amount'], 2), $r['notes'] ?: ''
                ], $stmt->fetchAll(PDO::FETCH_ASSOC))];
    }
}
