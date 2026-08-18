<?php

namespace App\Modules\EncounterSoapNotes\Services;

use App\Core\Database;
use App\Modules\EncounterSoapNotes\Models\EncounterSoapNote;
use App\Modules\EncounterSoapNotes\Models\EncounterSoapNoteSignature;
use App\Modules\Employees\Models\Employee;
use App\Modules\Roles\Models\Role;
use App\Modules\Users\Models\User;
use PDO;

class EncounterSoapNoteService
{
    private const DETAIL_FIELDS = ['subjective', 'objective', 'assessment', 'plan'];

    /**
     * All of an encounter's SOAP notes (newest first), each with its own
     * signature log -- every note is an independently locked/signed
     * card in the Encounter Summary, unlike the shared-lock sections.
     */
    public function list(int $encounterId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, encounter_id, author_name, subjective, objective, assessment, plan,
                    locked_at, created_at, updated_at
             FROM encounter_soap_notes
             WHERE encounter_id = :encounter_id AND deleted_at IS NULL
             ORDER BY created_at DESC, id DESC"
        );
        $stmt->execute(['encounter_id' => $encounterId]);

        $notes = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($notes as &$note) {
            $note['signatures'] = $this->signatures((int) $note['id']);
        }

        return $notes;
    }

    public function find(int $id): ?array
    {
        return (new EncounterSoapNote())->where('id', $id)->first();
    }

    public function findWithSignatures(int $id): ?array
    {
        $note = $this->find($id);

        if (!$note) {
            return null;
        }

        $note['signatures'] = $this->signatures($id);

        return $note;
    }

    public function store(int $encounterId, array $data, int $createdBy): array
    {
        $values = $this->filterDetails($data);
        $values['encounter_id'] = $encounterId;
        $values['author_name'] = $this->resolveAuthorName($createdBy);
        $values['created_at'] = date('Y-m-d H:i:s');
        $values['created_by'] = $createdBy;

        $id = (new EncounterSoapNote())->create($values);

        if (!$id) {
            return ['success' => false, 'message' => 'Failed to add SOAP note.'];
        }

        return ['success' => true, 'message' => 'SOAP note added successfully.', 'data' => ['id' => $id]];
    }

    public function update(int $id, array $data, int $updatedBy): array
    {
        $note = $this->find($id);

        if (!$note || $note['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'SOAP note not found.'];
        }

        if ($note['locked_at'] !== null) {
            return ['success' => false, 'message' => 'This SOAP note is locked. Sign it again to record further changes.'];
        }

        $values = $this->filterDetails($data);
        $values['updated_at'] = date('Y-m-d H:i:s');
        $values['updated_by'] = $updatedBy;

        (new EncounterSoapNote())->update($values, $id);

        return ['success' => true, 'message' => 'SOAP note updated successfully.'];
    }

    public function remove(int $id, int $deletedBy): array
    {
        $note = $this->find($id);

        if (!$note || $note['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'SOAP note not found.'];
        }

        if ($note['locked_at'] !== null) {
            return ['success' => false, 'message' => 'A signed SOAP note cannot be deleted.'];
        }

        (new EncounterSoapNote())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy
        ], $id);

        return ['success' => true, 'message' => 'SOAP note removed successfully.'];
    }

    /**
     * Electronically sign a single SOAP note: verify the signer's
     * password, log the signature, and lock the note if this is its
     * first signature. Mirrors EncounterSectionService::sign(), scoped
     * to one note instead of one encounter+section_type.
     */
    public function sign(int $id, string $password, ?string $amendment, array $currentUser): array
    {
        $note = $this->find($id);

        if (!$note || $note['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'SOAP note not found.'];
        }

        $user = (new User())->where('id', $currentUser['id'])->first();

        if (!$user || !User::verifyPassword($password, $user['password'])) {
            return ['success' => false, 'message' => 'Incorrect password.'];
        }

        $now = date('Y-m-d H:i:s');

        if ($note['locked_at'] === null) {
            (new EncounterSoapNote())->update([
                'locked_at' => $now,
                'updated_at' => $now,
                'updated_by' => $currentUser['id']
            ], $id);
        }

        $employee = (new Employee())->where('user_id', $user['id'])->first();
        $signerName = $employee
            ? trim($employee['first_name'] . ' ' . $employee['last_name'])
            : ($currentUser['username'] ?? 'Unknown');

        (new EncounterSoapNoteSignature())->create([
            'soap_note_id' => $id,
            'signer_user_id' => $user['id'],
            'signer_name' => $signerName,
            'signer_role' => $this->resolveRoleName((int) ($user['role_id'] ?? 0)),
            'amendment' => ($amendment === null || trim($amendment) === '') ? null : $amendment,
            'signed_at' => $now
        ]);

        return [
            'success' => true,
            'message' => 'Signed successfully.',
            'data' => $this->findWithSignatures($id)
        ];
    }

    private function resolveAuthorName(int $userId): string
    {
        $employee = (new Employee())->where('user_id', $userId)->first();

        if ($employee) {
            $firstName = trim((string) $employee['first_name']);
            $lastName = trim((string) $employee['last_name']);

            if (strcasecmp($firstName, $lastName) === 0) {
                return $firstName !== '' ? $firstName : 'Unknown';
            }

            $name = trim($firstName . ' ' . $lastName);

            if ($name !== '') {
                return $name;
            }
        }

        $user = (new User())->where('id', $userId)->first();

        return $user['username'] ?? 'Unknown';
    }

    private function resolveRoleName(int $roleId): ?string
    {
        if (!$roleId) {
            return null;
        }

        $role = (new Role())->where('id', $roleId)->first();

        return $role ? ucfirst(strtolower((string) $role['name'])) : null;
    }

    private function filterDetails(array $data): array
    {
        $result = [];

        foreach (self::DETAIL_FIELDS as $field) {
            if (array_key_exists($field, $data)) {
                $result[$field] = $data[$field] === '' ? null : $data[$field];
            }
        }

        return $result;
    }

    private function signatures(int $soapNoteId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, signer_name, signer_role, amendment, signed_at
             FROM encounter_soap_note_signatures
             WHERE soap_note_id = :soap_note_id
             ORDER BY signed_at ASC, id ASC"
        );
        $stmt->execute(['soap_note_id' => $soapNoteId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
