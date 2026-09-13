<?php

namespace App\Modules\EncounterClinicalInstructionItems\Services;

use App\Core\Database;
use App\Core\Mailer;
use App\Modules\Encounters\Models\Encounter;
use App\Modules\EncounterClinicalInstructionItems\Models\EncounterClinicalInstructionItem;
use App\Modules\EncounterSections\Services\EncounterSectionService;
use App\Modules\Employees\Models\Employee;
use App\Modules\Messaging\Services\MessagingService;
use App\Modules\Patients\Models\Patient;
use App\Modules\Patients\Models\PatientContact;
use App\Modules\Providers\Services\ProviderService;
use App\Modules\Users\Models\User;
use PDO;

class EncounterClinicalInstructionItemService
{
    private const DETAIL_FIELDS = ['author_name', 'instructions', 'item_date'];

    private EncounterSectionService $encounterSectionService;
    private MessagingService $messagingService;
    private ProviderService $providerService;

    public function __construct()
    {
        $this->encounterSectionService = new EncounterSectionService();
        $this->messagingService = new MessagingService();
        $this->providerService = new ProviderService();
    }

    public function list(int $encounterId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, encounter_id, author_name, instructions, item_date, created_at
             FROM encounter_clinical_instruction_items
             WHERE encounter_id = :encounter_id AND deleted_at IS NULL
             ORDER BY item_date DESC, id DESC"
        );
        $stmt->execute(['encounter_id' => $encounterId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function store(int $encounterId, array $data, int $createdBy): array
    {
        if ($this->encounterSectionService->isLocked($encounterId, 'clinical_instructions')) {
            return [
                'success' => false,
                'message' => 'Clinical Instructions is locked. Sign the section again to record further changes.'
            ];
        }

        $errors = $this->validate($data);

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $values = $this->filterDetails($data);
        $values['encounter_id'] = $encounterId;
        $values['author_name'] = $this->resolveAuthorName($createdBy);
        $values['created_at'] = date('Y-m-d H:i:s');
        $values['created_by'] = $createdBy;

        $id = (new EncounterClinicalInstructionItem())->create($values);

        if (!$id) {
            return ['success' => false, 'message' => 'Failed to add clinical instruction.'];
        }

        $this->notifyPatientAndDoctor($encounterId, (string) $values['instructions'], $createdBy);

        return ['success' => true, 'message' => 'Clinical instruction added successfully.', 'data' => ['id' => $id]];
    }

    public function update(int $id, array $data, int $updatedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Clinical instruction not found.'];
        }

        if ($this->encounterSectionService->isLocked((int) $record['encounter_id'], 'clinical_instructions')) {
            return [
                'success' => false,
                'message' => 'Clinical Instructions is locked. Sign the section again to record further changes.'
            ];
        }

        $errors = $this->validate($data);

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $values = $this->filterDetails($data);

        (new EncounterClinicalInstructionItem())->update($values, $id);

        $this->notifyPatientAndDoctor((int) $record['encounter_id'], (string) $values['instructions'], $updatedBy);

        return ['success' => true, 'message' => 'Clinical instruction updated successfully.'];
    }

    public function remove(int $id, int $deletedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Clinical instruction not found.'];
        }

        if ($this->encounterSectionService->isLocked((int) $record['encounter_id'], 'clinical_instructions')) {
            return [
                'success' => false,
                'message' => 'Clinical Instructions is locked. Sign the section again to record further changes.'
            ];
        }

        (new EncounterClinicalInstructionItem())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy
        ], $id);

        return ['success' => true, 'message' => 'Clinical instruction removed successfully.'];
    }

    public function find(int $id): ?array
    {
        return (new EncounterClinicalInstructionItem())->where('id', $id)->first();
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

    private function validate(array $data): array
    {
        $errors = [];

        if (empty($data['instructions'])) {
            $errors['instructions'] = 'Instructions is required.';
        }

        if (empty($data['item_date'])) {
            $errors['item_date'] = 'Date is required.';
        }

        return $errors;
    }

    private function filterDetails(array $data): array
    {
        $result = [];

        foreach (self::DETAIL_FIELDS as $field) {
            if (!array_key_exists($field, $data)) {
                continue;
            }

            $result[$field] = $data[$field] === '' ? null : $data[$field];
        }

        if (empty($result['author_name'])) {
            $result['author_name'] = 'Unknown';
        }

        return $result;
    }

    /**
     * Best-effort notification when clinical instructions are added or
     * changed: an in-app message to the patient and their assigned doctor
     * (skipping the doctor if they're the one who just saved it), plus an
     * email to the patient's on-file contact address. Never allowed to
     * fail the save that triggered it -- Mailer::send() already returns
     * false instead of throwing, and every failure path here is a no-op.
     */
    private function notifyPatientAndDoctor(int $encounterId, string $instructions, int $staffUserId): void
    {
        try {
            $encounter = (new Encounter())->where('id', $encounterId)->first();

            if (!$encounter) {
                return;
            }

            $patient = (new Patient())->where('id', (int) $encounter['patient_id'])->first();

            if (!$patient || $patient['deleted_at'] !== null) {
                return;
            }

            $patientName = trim(($patient['first_name'] ?? '') . ' ' . ($patient['last_name'] ?? '')) ?: 'the patient';
            $body = "New clinical instructions were recorded for {$patientName}'s visit:\n\n\"{$instructions}\"";

            $recipientIds = [];
            $patientUserId = !empty($patient['user_id']) ? (int) $patient['user_id'] : null;

            if ($patientUserId) {
                $recipientIds[] = $patientUserId;
            }

            if (!empty($patient['provider_id'])) {
                $doctorUserId = $this->providerService->findUserIdByProviderId((int) $patient['provider_id']);

                if ($doctorUserId && $doctorUserId !== $staffUserId) {
                    $recipientIds[] = $doctorUserId;
                }
            }

            if (!empty($recipientIds)) {
                $conversation = $this->messagingService->createConversation(
                    $staffUserId,
                    $recipientIds,
                    'Clinical Instructions Update'
                );

                if ($conversation['success']) {
                    $this->messagingService->sendMessage(
                        (int) $conversation['data']['conversation_id'],
                        $staffUserId,
                        $body,
                        ['patient_id' => (int) $patient['id']]
                    );
                }
            }

            if ($patientUserId) {
                $contact = (new PatientContact())->where('patient_id', (int) $patient['id'])->first();
                $email = $contact['email'] ?? null;

                if (!empty($email)) {
                    (new Mailer())->send(
                        $email,
                        'New Clinical Instructions',
                        "Dear {$patientName},\n\n{$body}\n\nPlease log in to your patient portal for more details."
                    );
                }
            }
        } catch (\Throwable $e) {
            error_log('notifyPatientAndDoctor failed: ' . $e->getMessage());
        }
    }
}
