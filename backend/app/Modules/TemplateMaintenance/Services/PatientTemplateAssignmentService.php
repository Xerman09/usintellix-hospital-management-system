<?php

namespace App\Modules\TemplateMaintenance\Services;

use App\Core\Database;
use App\Modules\TemplateMaintenance\Models\PatientTemplateAssignment;
use PDO;

class PatientTemplateAssignmentService
{
    private const LIST_SQL =
        "SELECT a.id, a.patient_id, a.template_filename, a.category_id, c.name AS category_name, a.assigned_at
         FROM patient_template_assignments a
         LEFT JOIN template_categories c ON c.id = a.category_id AND c.deleted_at IS NULL";

    /**
     * "Default Patient Templates" -- assignments with no specific
     * patient, applied practice-wide.
     */
    public function listDefaults(): array
    {
        $stmt = Database::connection()->prepare(
            self::LIST_SQL . " WHERE a.patient_id IS NULL AND a.deleted_at IS NULL
             ORDER BY a.assigned_at DESC, a.id DESC"
        );
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * "Patient Assigned Templates" for one specific patient.
     */
    public function listForPatient(int $patientId): array
    {
        $stmt = Database::connection()->prepare(
            self::LIST_SQL . " WHERE a.patient_id = ? AND a.deleted_at IS NULL
             ORDER BY a.assigned_at DESC, a.id DESC"
        );
        $stmt->execute([$patientId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Assigns one or more repository templates to a scope -- $patientId
     * null means "Default Patient Templates" (every patient), otherwise
     * one specific patient. Skips filenames already actively assigned to
     * that same scope so re-clicking Assign on an overlapping selection
     * doesn't pile up duplicate rows.
     */
    public function assign(?int $patientId, array $filenames, ?int $categoryId, int $userId): array
    {
        $filenames = array_values(array_unique(array_filter($filenames, fn ($f) => trim((string) $f) !== '')));

        if (!$filenames) {
            return ['success' => false, 'message' => 'Select at least one template to assign.'];
        }

        $existingStmt = Database::connection()->prepare(
            "SELECT template_filename FROM patient_template_assignments
             WHERE " . ($patientId === null ? "patient_id IS NULL" : "patient_id = ?") . "
               AND deleted_at IS NULL
               AND template_filename IN (" . implode(',', array_fill(0, count($filenames), '?')) . ")"
        );
        $existingStmt->execute($patientId === null ? $filenames : array_merge([$patientId], $filenames));
        $already = array_column($existingStmt->fetchAll(PDO::FETCH_ASSOC), 'template_filename');

        $toInsert = array_diff($filenames, $already);

        $stmt = Database::connection()->prepare(
            "INSERT INTO patient_template_assignments
                (patient_id, template_filename, category_id, assigned_at, created_at, created_by)
             VALUES (?, ?, ?, ?, ?, ?)"
        );

        $now = date('Y-m-d H:i:s');

        foreach ($toInsert as $filename) {
            $stmt->execute([$patientId, $filename, $categoryId, $now, $now, $userId]);
        }

        $count = count($toInsert);
        $skipped = count($filenames) - $count;

        $message = $count > 0
            ? ($count === 1 ? '1 template assigned.' : "{$count} templates assigned.")
            : 'Already assigned.';

        if ($skipped > 0 && $count > 0) {
            $message .= " ({$skipped} already assigned, skipped.)";
        }

        return ['success' => true, 'message' => $message, 'data' => ['assigned' => $count, 'skipped' => $skipped]];
    }

    public function unassign(int $id, int $userId): array
    {
        (new PatientTemplateAssignment())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $userId
        ], $id);

        return ['success' => true, 'message' => 'Template unassigned.'];
    }
}
