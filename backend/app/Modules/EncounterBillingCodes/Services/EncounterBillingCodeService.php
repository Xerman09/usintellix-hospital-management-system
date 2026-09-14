<?php

namespace App\Modules\EncounterBillingCodes\Services;

use App\Core\Database;
use App\Modules\Encounters\Models\EncounterBillingCode;
use PDO;

/**
 * Incremental (add/edit/remove one row at a time) CRUD for a fee
 * sheet's charge lines -- the Fee Sheet screen's own read/write path.
 * This is deliberately separate from EncounterService::syncBillingCodes(),
 * which still does its own whole-encounter delete-then-reinsert when the
 * Add/Edit Encounter form is saved; both operate on the same
 * encounter_billing_codes table.
 */
class EncounterBillingCodeService
{
    /**
     * A fee sheet's charge lines, each with its justify list resolved
     * from a "1,2" id string into a real array for the frontend.
     */
    public function list(int $encounterId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, encounter_id, code_type, code, description, fee, units, modifier, justify, auth_number, created_at
             FROM encounter_billing_codes
             WHERE encounter_id = :encounter_id AND deleted_at IS NULL
             ORDER BY id ASC"
        );
        $stmt->execute(['encounter_id' => $encounterId]);

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(function (array $row) {
            $fee = $row['fee'] !== null ? (float) $row['fee'] : 0.0;
            $units = (int) $row['units'];

            $row['fee'] = $fee;
            $row['units'] = $units;
            $row['total'] = round($fee * $units, 2);
            $row['justify'] = $this->parseJustify($row['justify']);

            return $row;
        }, $rows);
    }

    public function store(int $encounterId, array $data, int $createdBy): array
    {
        $codeType = trim((string) ($data['code_type'] ?? ''));
        $code = trim((string) ($data['code'] ?? ''));

        if ($codeType === '' || $code === '') {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => ['code' => 'A code is required.']];
        }

        $units = isset($data['units']) && $data['units'] !== '' ? max(1, (int) $data['units']) : 1;
        $justifyError = null;
        $justify = $this->validateJustify($encounterId, $data['justify'] ?? null, $justifyError);

        if ($justifyError) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => ['justify' => $justifyError]];
        }

        $fee = $data['fee'] ?? null;

        $id = (new EncounterBillingCode())->create([
            'encounter_id' => $encounterId,
            'code_type' => $codeType,
            'code' => $code,
            'description' => $data['description'] ?? null,
            'fee' => ($fee === '' || $fee === null) ? null : $fee,
            'units' => $units,
            'modifier' => $data['modifier'] ?: null,
            'justify' => $justify,
            'auth_number' => $data['auth_number'] ?: null,
            'created_at' => date('Y-m-d H:i:s')
        ]);

        if (!$id) {
            return ['success' => false, 'message' => 'Failed to add charge.'];
        }

        return ['success' => true, 'message' => 'Charge added successfully.', 'data' => ['id' => $id]];
    }

    /**
     * Only units/modifier/justify/auth_number are editable after the
     * fact -- code_type/code/description/fee stay a fixed snapshot of
     * what was billed (remove and re-add to change the code itself).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Charge not found.'];
        }

        $values = [];

        if (array_key_exists('units', $data)) {
            $values['units'] = max(1, (int) $data['units']);
        }

        if (array_key_exists('modifier', $data)) {
            $values['modifier'] = $data['modifier'] !== '' ? $data['modifier'] : null;
        }

        if (array_key_exists('auth_number', $data)) {
            $values['auth_number'] = $data['auth_number'] !== '' ? $data['auth_number'] : null;
        }

        if (array_key_exists('justify', $data)) {
            $justifyError = null;
            $values['justify'] = $this->validateJustify((int) $record['encounter_id'], $data['justify'], $justifyError);

            if ($justifyError) {
                return ['success' => false, 'message' => 'Validation failed.', 'errors' => ['justify' => $justifyError]];
            }
        }

        if (empty($values)) {
            return ['success' => true, 'message' => 'Nothing to update.'];
        }

        (new EncounterBillingCode())->update($values, $id);

        return ['success' => true, 'message' => 'Charge updated successfully.'];
    }

    public function remove(int $id, int $deletedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Charge not found.'];
        }

        (new EncounterBillingCode())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy
        ], $id);

        return ['success' => true, 'message' => 'Charge removed successfully.'];
    }

    public function find(int $id): ?array
    {
        return (new EncounterBillingCode())->where('id', $id)->first();
    }

    private function parseJustify(?string $raw): array
    {
        if (!$raw) {
            return [];
        }

        return array_values(array_filter(array_map('intval', explode(',', $raw))));
    }

    /**
     * Accepts an array or comma-separated string of encounter_diagnoses
     * ids, verifies every one actually belongs to this encounter (and
     * isn't deleted), and returns a clean CSV string ready to store --
     * or null if the input was empty. Sets $error when a submitted id
     * doesn't resolve.
     */
    private function validateJustify(int $encounterId, mixed $raw, ?string &$error): ?string
    {
        if ($raw === null || $raw === '') {
            return null;
        }

        $ids = is_array($raw)
            ? array_map('intval', $raw)
            : array_values(array_filter(array_map('intval', explode(',', (string) $raw))));

        $ids = array_values(array_unique(array_filter($ids)));

        if (empty($ids)) {
            return null;
        }

        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = Database::connection()->prepare(
            "SELECT id FROM encounter_diagnoses
             WHERE encounter_id = ? AND deleted_at IS NULL AND id IN ({$placeholders})"
        );
        $stmt->execute(array_merge([$encounterId], $ids));

        $validIds = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));

        if (count($validIds) !== count($ids)) {
            $error = 'One or more selected diagnoses could not be found on this encounter.';
            return null;
        }

        return implode(',', $ids);
    }
}
