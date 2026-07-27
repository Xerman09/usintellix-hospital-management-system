<?php

namespace App\Modules\RelatedPersons\Services;

use App\Core\Database;
use App\Modules\RelatedPersons\Models\RelatedPerson;
use App\Modules\RelatedPersons\Models\RelatedPersonAddress;
use App\Modules\RelatedPersons\Models\RelatedPersonTelecom;
use PDO;

class RelatedPersonService
{
    private const FOLLOW_UP_FIELDS = [
        'relationship', 'role', 'contact_priority',
        'relationship_start_date', 'relationship_end_date',
        'is_primary_contact', 'is_emergency_contact',
        'can_make_medical_decisions', 'can_receive_medical_info'
    ];

    private const BASIC_FIELDS = [
        'first_name', 'middle_name', 'last_name', 'phone', 'date_of_birth', 'gender', 'notes'
    ];

    private const TELECOM_FIELDS = [
        'type', 'contact_use', 'rank_order', 'is_primary', 'value', 'active_from', 'notes'
    ];

    private const ADDRESS_FIELDS = [
        'address_use', 'address_type', 'start_date', 'end_date', 'address_line',
        'city', 'county_district', 'state_province', 'postal_code', 'country',
        'priority', 'notes'
    ];

    /**
     * List a patient's related persons, each with their telecom/address counts.
     */
    public function list(int $patientId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT rp.*,
                    (SELECT COUNT(*) FROM related_person_telecoms t WHERE t.related_person_id = rp.id AND t.deleted_at IS NULL) AS telecom_count,
                    (SELECT COUNT(*) FROM related_person_addresses a WHERE a.related_person_id = rp.id AND a.deleted_at IS NULL) AS address_count
             FROM related_persons rp
             WHERE rp.patient_id = :patient_id AND rp.deleted_at IS NULL
             ORDER BY rp.last_name, rp.first_name"
        );

        $stmt->execute(['patient_id' => $patientId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function find(int $id): ?array
    {
        return (new RelatedPerson())->where('id', $id)->first();
    }

    /**
     * Create a related person from the basic-info step. Follow-up fields
     * (relationship/role/permissions/etc) are filled in afterward via update().
     */
    public function store(int $patientId, array $data, int $createdBy): array
    {
        $errors = $this->validateBasic($data);

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $payload = $this->filterFields($data, self::BASIC_FIELDS);
        $payload['patient_id'] = $patientId;
        $payload['created_at'] = date('Y-m-d H:i:s');
        $payload['created_by'] = $createdBy;

        $id = (new RelatedPerson())->create($payload);

        if (!$id) {
            return ['success' => false, 'message' => 'Failed to add related person.'];
        }

        return ['success' => true, 'message' => 'Related person added successfully.', 'data' => ['id' => $id]];
    }

    /**
     * Update basic info and/or follow-up fields on an existing related person.
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Related person not found.'];
        }

        $errors = $this->validateBasic($data, true);

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $payload = array_merge(
            $this->filterFields($data, self::BASIC_FIELDS),
            $this->filterFields($data, self::FOLLOW_UP_FIELDS)
        );

        $payload['updated_at'] = date('Y-m-d H:i:s');
        $payload['updated_by'] = $updatedBy;

        (new RelatedPerson())->update($payload, $id);

        return ['success' => true, 'message' => 'Related person updated successfully.'];
    }

    public function remove(int $id, int $deletedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Related person not found.'];
        }

        (new RelatedPerson())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy
        ], $id);

        return ['success' => true, 'message' => 'Related person removed successfully.'];
    }


    // ---- Telecom contacts ----

    public function listTelecoms(int $relatedPersonId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT * FROM related_person_telecoms
             WHERE related_person_id = :related_person_id AND deleted_at IS NULL
             ORDER BY is_primary DESC, rank_order IS NULL, rank_order"
        );

        $stmt->execute(['related_person_id' => $relatedPersonId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function storeTelecom(int $relatedPersonId, array $data, int $createdBy): array
    {
        if (trim((string) ($data['value'] ?? '')) === '') {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => ['value' => 'Value is required.']];
        }

        $payload = $this->filterFields($data, self::TELECOM_FIELDS);
        $payload['related_person_id'] = $relatedPersonId;
        $payload['created_at'] = date('Y-m-d H:i:s');
        $payload['created_by'] = $createdBy;

        $id = (new RelatedPersonTelecom())->create($payload);

        if (!$id) {
            return ['success' => false, 'message' => 'Failed to add telecom contact.'];
        }

        return ['success' => true, 'message' => 'Telecom contact added successfully.', 'data' => ['id' => $id]];
    }

    public function updateTelecom(int $id, array $data, int $updatedBy): array
    {
        $record = (new RelatedPersonTelecom())->where('id', $id)->first();

        if (!$record || $record['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Telecom contact not found.'];
        }

        if (array_key_exists('value', $data) && trim((string) $data['value']) === '') {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => ['value' => 'Value is required.']];
        }

        $payload = $this->filterFields($data, self::TELECOM_FIELDS);
        $payload['updated_at'] = date('Y-m-d H:i:s');
        $payload['updated_by'] = $updatedBy;

        (new RelatedPersonTelecom())->update($payload, $id);

        return ['success' => true, 'message' => 'Telecom contact updated successfully.'];
    }

    public function removeTelecom(int $id, int $deletedBy): array
    {
        $record = (new RelatedPersonTelecom())->where('id', $id)->first();

        if (!$record || $record['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Telecom contact not found.'];
        }

        (new RelatedPersonTelecom())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy
        ], $id);

        return ['success' => true, 'message' => 'Telecom contact removed successfully.'];
    }


    // ---- Addresses ----

    public function listAddresses(int $relatedPersonId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT * FROM related_person_addresses
             WHERE related_person_id = :related_person_id AND deleted_at IS NULL
             ORDER BY priority IS NULL, priority"
        );

        $stmt->execute(['related_person_id' => $relatedPersonId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function storeAddress(int $relatedPersonId, array $data, int $createdBy): array
    {
        if (trim((string) ($data['address_line'] ?? '')) === '') {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => ['address_line' => 'Address is required.']];
        }

        $payload = $this->filterFields($data, self::ADDRESS_FIELDS);
        $payload['related_person_id'] = $relatedPersonId;
        $payload['created_at'] = date('Y-m-d H:i:s');
        $payload['created_by'] = $createdBy;

        $id = (new RelatedPersonAddress())->create($payload);

        if (!$id) {
            return ['success' => false, 'message' => 'Failed to add address.'];
        }

        return ['success' => true, 'message' => 'Address added successfully.', 'data' => ['id' => $id]];
    }

    public function updateAddress(int $id, array $data, int $updatedBy): array
    {
        $record = (new RelatedPersonAddress())->where('id', $id)->first();

        if (!$record || $record['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Address not found.'];
        }

        if (array_key_exists('address_line', $data) && trim((string) $data['address_line']) === '') {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => ['address_line' => 'Address is required.']];
        }

        $payload = $this->filterFields($data, self::ADDRESS_FIELDS);
        $payload['updated_at'] = date('Y-m-d H:i:s');
        $payload['updated_by'] = $updatedBy;

        (new RelatedPersonAddress())->update($payload, $id);

        return ['success' => true, 'message' => 'Address updated successfully.'];
    }

    public function removeAddress(int $id, int $deletedBy): array
    {
        $record = (new RelatedPersonAddress())->where('id', $id)->first();

        if (!$record || $record['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Address not found.'];
        }

        (new RelatedPersonAddress())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy
        ], $id);

        return ['success' => true, 'message' => 'Address removed successfully.'];
    }


    private function validateBasic(array $data, bool $isUpdate = false): array
    {
        $errors = [];

        if (!$isUpdate || array_key_exists('first_name', $data)) {
            if (trim((string) ($data['first_name'] ?? '')) === '') {
                $errors['first_name'] = 'First name is required.';
            }
        }

        if (!$isUpdate || array_key_exists('last_name', $data)) {
            if (trim((string) ($data['last_name'] ?? '')) === '') {
                $errors['last_name'] = 'Last name is required.';
            }
        }

        return $errors;
    }

    /**
     * Keep only recognized fields, converting empty strings to NULL and
     * normalizing the boolean permission/flag fields to a strict 0/1.
     */
    private function filterFields(array $data, array $allowedFields): array
    {
        $booleanFields = ['is_primary_contact', 'is_emergency_contact', 'can_make_medical_decisions', 'can_receive_medical_info', 'is_primary'];

        $result = [];

        foreach ($allowedFields as $field) {
            if (!array_key_exists($field, $data)) {
                continue;
            }

            if (in_array($field, $booleanFields, true)) {
                $result[$field] = in_array($data[$field], [1, '1', true, 'true'], true) ? 1 : 0;
                continue;
            }

            $result[$field] = $data[$field] === '' ? null : $data[$field];
        }

        return $result;
    }
}
