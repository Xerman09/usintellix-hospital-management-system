<?php

namespace App\Modules\PatientDocuments\Services;

use App\Core\Database;
use App\Modules\PatientDocuments\Models\PatientDocument;
use PDO;

class PatientDocumentService
{
    private const ALLOWED_TYPES = [
        'application/pdf' => 'pdf',
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
        'application/msword' => 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
        'application/vnd.ms-excel' => 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => 'xlsx'
    ];

    private const MAX_SIZE_BYTES = 10 * 1024 * 1024;

    /**
     * Every document on file for a patient, newest first, with the
     * uploader's name resolved the same way encounter eSign log entries
     * resolve a signer's name (employee record, falling back to username).
     */
    public function listForPatient(int $patientId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT pd.id, pd.category, pd.original_filename, pd.file_path, pd.mime_type, pd.file_size,
                    pd.description, pd.created_at,
                    COALESCE(NULLIF(TRIM(CONCAT(emp.first_name, ' ', emp.last_name)), ''), u.username) AS uploaded_by_name
             FROM patient_documents pd
             LEFT JOIN users u ON u.id = pd.created_by
             LEFT JOIN employees emp ON emp.user_id = pd.created_by
             WHERE pd.patient_id = :patient_id AND pd.deleted_at IS NULL
             ORDER BY pd.created_at DESC, pd.id DESC"
        );
        $stmt->execute(['patient_id' => $patientId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Every "Lab Result" document on file across all patients, optionally
     * narrowed to a date range, for the admin "Lab Documents" screen.
     * Note: this app has no encounter_id column on patient_documents, so
     * there's no real encounter to attach to each row.
     */
    public function listLabDocuments(?string $from, ?string $to): array
    {
        $sql = "SELECT pd.id, pd.original_filename, pd.file_path, pd.description, pd.created_at,
                       CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name, p.suffix) AS patient_name,
                       p.patient_no
                FROM patient_documents pd
                JOIN patients p ON p.id = pd.patient_id
                WHERE pd.deleted_at IS NULL
                  AND pd.category = 'Lab Result'";

        $params = [];

        if (!empty($from)) {
            $sql .= " AND DATE(pd.created_at) >= :from";
            $params['from'] = $from;
        }

        if (!empty($to)) {
            $sql .= " AND DATE(pd.created_at) <= :to";
            $params['to'] = $to;
        }

        $sql .= " ORDER BY pd.created_at DESC, pd.id DESC";

        $stmt = Database::connection()->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Save an uploaded file to disk and record it against the patient.
     */
    public function upload(int $patientId, array $file, array $data, int $userId): array
    {
        if (empty($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            return ['success' => false, 'message' => 'No file was uploaded.'];
        }

        $mimeType = mime_content_type($file['tmp_name']);

        if (!isset(self::ALLOWED_TYPES[$mimeType])) {
            return ['success' => false, 'message' => 'Unsupported file type. Allowed: PDF, JPG, PNG, GIF, WEBP, DOC, DOCX, XLS, XLSX.'];
        }

        if ($file['size'] > self::MAX_SIZE_BYTES) {
            return ['success' => false, 'message' => 'File must be 10MB or smaller.'];
        }

        $uploadDir = dirname(__DIR__, 4) . '/public/uploads/patient_documents';

        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $extension = self::ALLOWED_TYPES[$mimeType];
        $storedFilename = 'doc_' . $patientId . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $extension;
        $destination = $uploadDir . '/' . $storedFilename;

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            return ['success' => false, 'message' => 'Failed to save the uploaded file.'];
        }

        $id = (new PatientDocument())->create([
            'patient_id' => $patientId,
            'category' => $data['category'] ?: null,
            'original_filename' => $file['name'],
            'stored_filename' => $storedFilename,
            'file_path' => '/uploads/patient_documents/' . $storedFilename,
            'mime_type' => $mimeType,
            'file_size' => (int) $file['size'],
            'description' => $data['description'] ?: null,
            'created_at' => date('Y-m-d H:i:s'),
            'created_by' => $userId
        ]);

        if (!$id) {
            return ['success' => false, 'message' => 'Failed to record the document.'];
        }

        return ['success' => true, 'message' => 'Document uploaded successfully.', 'data' => ['id' => $id]];
    }

    /**
     * Soft-delete a document. The file itself is left on disk, matching
     * this app's soft-delete-everywhere convention (nothing is ever
     * hard-deleted from a patient's record).
     */
    public function remove(int $id, int $patientId, int $userId): array
    {
        $document = (new PatientDocument())->where('id', $id)->first();

        if (!$document || (int) $document['patient_id'] !== $patientId || $document['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Document not found.'];
        }

        (new PatientDocument())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $userId
        ], $id);

        return ['success' => true, 'message' => 'Document deleted successfully.'];
    }
}
