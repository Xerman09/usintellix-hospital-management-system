<?php

namespace App\Modules\PatientExternalData\Services;

use App\Core\Database;
use App\Modules\PatientExternalData\Models\PatientExternalDataRecord;
use PDO;

class PatientExternalDataService
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
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => 'xlsx',
        'text/xml' => 'xml',
        'application/xml' => 'xml'
    ];

    private const MAX_SIZE_BYTES = 10 * 1024 * 1024;

    /**
     * Every externally-received record on file for a patient, newest
     * first, with the name of whoever logged it into this system resolved
     * the same way patient_documents resolves an uploader's name.
     */
    public function listForPatient(int $patientId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT ped.id, ped.title, ped.source_name, ped.document_type, ped.received_at,
                    ped.original_filename, ped.file_path, ped.mime_type, ped.file_size,
                    ped.description, ped.created_at,
                    COALESCE(NULLIF(TRIM(CONCAT(emp.first_name, ' ', emp.last_name)), ''), u.username) AS added_by_name
             FROM patient_external_data ped
             LEFT JOIN users u ON u.id = ped.created_by
             LEFT JOIN employees emp ON emp.user_id = ped.created_by
             WHERE ped.patient_id = :patient_id AND ped.deleted_at IS NULL
             ORDER BY COALESCE(ped.received_at, ped.created_at) DESC, ped.id DESC"
        );
        $stmt->execute(['patient_id' => $patientId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Save an uploaded external record's file to disk and log it against
     * the patient.
     */
    public function upload(int $patientId, array $file, array $data, int $userId): array
    {
        if (empty($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            return ['success' => false, 'message' => 'No file was uploaded.'];
        }

        $errors = [];

        if (empty(trim($data['title'] ?? ''))) {
            $errors['title'] = 'Title is required.';
        }

        if (empty(trim($data['source_name'] ?? ''))) {
            $errors['source_name'] = 'Source is required.';
        }

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $mimeType = mime_content_type($file['tmp_name']);

        if (!isset(self::ALLOWED_TYPES[$mimeType])) {
            return ['success' => false, 'message' => 'Unsupported file type. Allowed: PDF, JPG, PNG, GIF, WEBP, DOC, DOCX, XLS, XLSX, XML.'];
        }

        if ($file['size'] > self::MAX_SIZE_BYTES) {
            return ['success' => false, 'message' => 'File must be 10MB or smaller.'];
        }

        $uploadDir = dirname(__DIR__, 4) . '/public/uploads/patient_external_data';

        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $extension = self::ALLOWED_TYPES[$mimeType];
        $storedFilename = 'ext_' . $patientId . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $extension;
        $destination = $uploadDir . '/' . $storedFilename;

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            return ['success' => false, 'message' => 'Failed to save the uploaded file.'];
        }

        $id = (new PatientExternalDataRecord())->create([
            'patient_id' => $patientId,
            'title' => trim($data['title']),
            'source_name' => trim($data['source_name']),
            'document_type' => $data['document_type'] ?: null,
            'received_at' => $data['received_at'] ?: null,
            'original_filename' => $file['name'],
            'stored_filename' => $storedFilename,
            'file_path' => '/uploads/patient_external_data/' . $storedFilename,
            'mime_type' => $mimeType,
            'file_size' => (int) $file['size'],
            'description' => $data['description'] ?: null,
            'created_at' => date('Y-m-d H:i:s'),
            'created_by' => $userId
        ]);

        if (!$id) {
            return ['success' => false, 'message' => 'Failed to record the external data.'];
        }

        return ['success' => true, 'message' => 'External data recorded successfully.', 'data' => ['id' => $id]];
    }

    /**
     * Soft-delete an external data record. The file itself is left on
     * disk, matching this app's soft-delete-everywhere convention.
     */
    public function remove(int $id, int $patientId, int $userId): array
    {
        $record = (new PatientExternalDataRecord())->where('id', $id)->first();

        if (!$record || (int) $record['patient_id'] !== $patientId || $record['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'External data record not found.'];
        }

        (new PatientExternalDataRecord())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $userId
        ], $id);

        return ['success' => true, 'message' => 'External data record deleted successfully.'];
    }
}
