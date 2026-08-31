<?php

namespace App\Modules\PatientMerge\Services;

use App\Core\Database;
use PDO;
use Throwable;

class PatientMergeService
{
    // Demographics/history/insurance "sections" -- per the merge rule,
    // the target chart's own data here is retained as-is and the
    // source's is discarded outright, never merged in.
    private const DISCARD_SOFT_DELETE = [
        'patient_contacts', 'patient_emergency_contacts', 'patient_employers',
        'patient_guardians', 'patient_sdoh_assessments', 'patient_insurances'
    ];

    // Same "discard" sections, but the table has no deleted_at column --
    // left in place under the now-soft-deleted source patient_id, which
    // is harmless since nothing queries a deleted patient's chart.
    private const DISCARD_LEAVE_ORPHANED = [
        'care_teams', 'patient_exams', 'patient_family_history',
        'patient_lifestyle', 'patient_relatives_history', 'patient_risk_factors',
        'patient_other_history'
    ];

    // Multi-row clinical/operational data -- "other data" that gets
    // merged (reassigned) onto the target chart. None of these have a
    // uniqueness constraint beyond their own primary key, so a plain
    // bulk UPDATE can't collide.
    private const MERGE_SIMPLE = [
        'amendments', 'appointments', 'disclosures', 'messages',
        'patient_dental_issues', 'patient_documents', 'patient_flow',
        'patient_health_concerns', 'patient_immunizations', 'patient_ledger_payments',
        'patient_medical_devices', 'patient_medical_problems', 'patient_medications',
        'patient_prescriptions', 'patient_procedure_orders', 'patient_surgeries',
        'patient_transactions', 'recalls', 'related_persons'
    ];

    // Merge tables where a UNIQUE(patient_id, key) constraint means a
    // straight reassignment can collide if both charts already have a
    // row for the same key -- reassigned row by row, discarding the
    // source's row only when the target already has that exact key.
    private const MERGE_KEYED = [
        'patient_allergies' => 'allergy_id',
        'patient_reminders' => 'practice_rule_id'
    ];

    public function findPatientOption(int $id): ?array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, patient_no, first_name, middle_name, last_name, sex, birthdate
             FROM patients
             WHERE id = ? AND deleted_at IS NULL"
        );
        $stmt->execute([$id]);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    /**
     * Validate a proposed target/source pair without merging anything.
     */
    public function validate(int $targetId, int $sourceId): array
    {
        $errors = [];

        if ($targetId <= 0 || $sourceId <= 0) {
            $errors['general'] = 'Select both a target and a source patient.';
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        if ($targetId === $sourceId) {
            $errors['source_patient_id'] = 'The source patient must be different from the target patient.';
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $target = $this->findPatientOption($targetId);
        $source = $this->findPatientOption($sourceId);

        if (!$target) {
            $errors['target_patient_id'] = 'Target patient not found.';
        }

        if (!$source) {
            $errors['source_patient_id'] = 'Source patient not found.';
        }

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        if (empty($target['birthdate']) || empty($source['birthdate'])) {
            $errors['general'] = 'Date of birth cannot be empty on either chart.';
        } elseif ($target['birthdate'] !== $source['birthdate']) {
            $errors['general'] = 'The merge will not run unless the date of birth is identical for both charts.';
        }

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        return ['success' => true, 'message' => 'Valid.', 'data' => ['target' => $target, 'source' => $source]];
    }

    /**
     * Merge source into target inside a single transaction: reassign
     * every "other data" table onto the target, discard the source's
     * demographics/history/insurance sections, optionally deduplicate
     * same-day encounters, then soft-delete the source chart itself.
     */
    public function merge(int $targetId, int $sourceId, bool $dedupeEncounters, int $userId): array
    {
        $validation = $this->validate($targetId, $sourceId);

        if (!$validation['success']) {
            return $validation;
        }

        $pdo = Database::connection();
        $now = date('Y-m-d H:i:s');

        try {
            $pdo->beginTransaction();

            foreach (self::DISCARD_SOFT_DELETE as $table) {
                $stmt = $pdo->prepare("UPDATE {$table} SET deleted_at = ?, deleted_by = ? WHERE patient_id = ? AND deleted_at IS NULL");
                $stmt->execute([$now, $userId, $sourceId]);
            }

            foreach (self::MERGE_SIMPLE as $table) {
                $stmt = $pdo->prepare("UPDATE {$table} SET patient_id = ? WHERE patient_id = ?");
                $stmt->execute([$targetId, $sourceId]);
            }

            $encountersDeduped = $this->mergeEncounters($pdo, $targetId, $sourceId, $dedupeEncounters, $now, $userId);

            foreach (self::MERGE_KEYED as $table => $keyColumn) {
                $this->reassignKeyedTable($pdo, $table, $keyColumn, $targetId, $sourceId, $now, $userId);
            }

            $softDelete = $pdo->prepare("UPDATE patients SET deleted_at = ?, deleted_by = ? WHERE id = ?");
            $softDelete->execute([$now, $userId, $sourceId]);

            $log = $pdo->prepare(
                "INSERT INTO patient_merges (target_patient_id, source_patient_id, dedupe_encounters, encounters_deduped, performed_at, performed_by)
                 VALUES (?, ?, ?, ?, ?, ?)"
            );
            $log->execute([$targetId, $sourceId, $dedupeEncounters ? 1 : 0, $encountersDeduped, $now, $userId]);

            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            return ['success' => false, 'message' => 'Merge failed: ' . $e->getMessage()];
        }

        return [
            'success' => true,
            'message' => 'Patients merged successfully.',
            'data' => ['target_patient_id' => $targetId, 'source_patient_id' => $sourceId, 'encounters_deduped' => $encountersDeduped]
        ];
    }

    /**
     * Encounters get their own handling because "Merge with Encounter
     * Deduplication" changes their outcome: a source encounter sharing
     * the same calendar date as one the target already has is discarded
     * instead of reassigned, so the merged chart doesn't end up with two
     * visits for the same day.
     */
    private function mergeEncounters(PDO $pdo, int $targetId, int $sourceId, bool $dedupe, string $now, int $userId): int
    {
        if (!$dedupe) {
            $stmt = $pdo->prepare("UPDATE encounters SET patient_id = ? WHERE patient_id = ?");
            $stmt->execute([$targetId, $sourceId]);
            return 0;
        }

        $targetDates = $pdo->prepare("SELECT DATE(date_of_service) AS d FROM encounters WHERE patient_id = ? AND deleted_at IS NULL");
        $targetDates->execute([$targetId]);
        $existingDates = $targetDates->fetchAll(PDO::FETCH_COLUMN);

        $sourceEncounters = $pdo->prepare("SELECT id, date_of_service FROM encounters WHERE patient_id = ? AND deleted_at IS NULL");
        $sourceEncounters->execute([$sourceId]);

        $deduped = 0;

        foreach ($sourceEncounters->fetchAll(PDO::FETCH_ASSOC) as $encounter) {
            $date = substr((string) $encounter['date_of_service'], 0, 10);

            if (in_array($date, $existingDates, true)) {
                $del = $pdo->prepare("UPDATE encounters SET deleted_at = ?, deleted_by = ? WHERE id = ?");
                $del->execute([$now, $userId, $encounter['id']]);
                $deduped++;
                continue;
            }

            $upd = $pdo->prepare("UPDATE encounters SET patient_id = ? WHERE id = ?");
            $upd->execute([$targetId, $encounter['id']]);
            $existingDates[] = $date;
        }

        // Encounters not carrying deleted_at IS NULL (already-deleted
        // history) still belong to the source chart's audit trail --
        // reassign them too so nothing is left dangling.
        $remaining = $pdo->prepare("UPDATE encounters SET patient_id = ? WHERE patient_id = ? AND deleted_at IS NOT NULL");
        $remaining->execute([$targetId, $sourceId]);

        return $deduped;
    }

    private function reassignKeyedTable(PDO $pdo, string $table, string $keyColumn, int $targetId, int $sourceId, string $now, int $userId): void
    {
        $rows = $pdo->prepare("SELECT id, {$keyColumn} AS key_value FROM {$table} WHERE patient_id = ? AND deleted_at IS NULL");
        $rows->execute([$sourceId]);

        foreach ($rows->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $exists = $pdo->prepare("SELECT id FROM {$table} WHERE patient_id = ? AND {$keyColumn} = ? AND deleted_at IS NULL");
            $exists->execute([$targetId, $row['key_value']]);

            if ($exists->fetch()) {
                $del = $pdo->prepare("UPDATE {$table} SET deleted_at = ?, deleted_by = ? WHERE id = ?");
                $del->execute([$now, $userId, $row['id']]);
                continue;
            }

            $upd = $pdo->prepare("UPDATE {$table} SET patient_id = ? WHERE id = ?");
            $upd->execute([$targetId, $row['id']]);
        }

        // Already-deleted historical rows for this key are left under
        // the source patient_id rather than reassigned: the UNIQUE(patient_id,
        // key) constraint isn't scoped by deleted_at, so a soft-deleted
        // row still occupies its key permanently and could collide with
        // an equally soft-deleted target row. Leaving them behind is
        // harmless -- they're inactive history under a now-deleted chart.
    }
}
