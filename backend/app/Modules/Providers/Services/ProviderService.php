<?php

namespace App\Modules\Providers\Services;

use App\Core\Database;
use App\Modules\Employees\Models\Employee;
use App\Modules\Providers\Models\Provider;
use App\Modules\Roles\Models\Role;
use App\Modules\Users\Models\User;
use PDO;
use Throwable;

class ProviderService
{
    /**
     * List all active (non-deleted) providers, with their employee identity.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT p.id, p.employee_id, p.specialty, p.npi_number, p.license_number, p.dea_number,
                    p.ptr_number, p.ptr_date, p.s2_number, p.s2_expiry_date,
                    p.created_at, p.deleted_at,
                    e.first_name, e.middle_name, e.last_name, e.suffix, e.email, e.phone,
                    d.name AS department_name
             FROM providers p
             JOIN employees e ON e.id = p.employee_id
             LEFT JOIN departments d ON d.id = e.department_id
             WHERE p.deleted_at IS NULL
             ORDER BY e.last_name, e.first_name"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Find the provider record belonging to a logged-in user (e.g. a doctor), if any.
     */
    public function findByUserId(int $userId): ?array
    {
        $stmt = Database::connection()->prepare(
            "SELECT p.*
             FROM providers p
             JOIN employees e ON e.id = p.employee_id
             WHERE e.user_id = :user_id AND p.deleted_at IS NULL
             LIMIT 1"
        );

        $stmt->execute(['user_id' => $userId]);

        $provider = $stmt->fetch(PDO::FETCH_ASSOC);

        return $provider ?: null;
    }

    /**
     * Find the user_id (login account) behind a provider record, e.g. to
     * route a patient-initiated message to that provider's inbox.
     */
    public function findUserIdByProviderId(int $providerId): ?int
    {
        $stmt = Database::connection()->prepare(
            "SELECT e.user_id
             FROM providers p
             JOIN employees e ON e.id = p.employee_id
             WHERE p.id = :provider_id AND p.deleted_at IS NULL
             LIMIT 1"
        );

        $stmt->execute(['provider_id' => $providerId]);

        $userId = $stmt->fetchColumn();

        return $userId !== false ? (int) $userId : null;
    }

    /**
     * Register a new provider from an existing employee (admin-only).
     */
    public function register(array $data, int $createdBy): array
    {
        $errors = $this->validate($data);

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $errors
            ];
        }

        try {
            $providerId = (new Provider())->create([
                'employee_id'    => (int) $data['employee_id'],
                'specialty'      => $data['specialty'],
                'npi_number'     => $data['npi_number'] ?? null,
                'license_number' => $data['license_number'] ?? null,
                'dea_number'     => $data['dea_number'] ?? null,
                'ptr_number'     => $this->blank($data['ptr_number'] ?? null),
                'ptr_date'       => $this->blank($data['ptr_date'] ?? null),
                's2_number'      => $this->blank($data['s2_number'] ?? null),
                's2_expiry_date' => $this->blank($data['s2_expiry_date'] ?? null),
                'created_at'     => date('Y-m-d H:i:s'),
                'created_by'     => $createdBy
            ]);

            if (!$providerId) {
                throw new \RuntimeException('Failed to create provider record.');
            }

            return [
                'success' => true,
                'message' => 'Provider created successfully.',
                'data' => [
                    'provider_id' => $providerId
                ]
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create provider.'
            ];
        }
    }

    /** Fields an admin can change on an existing provider. */
    public const EDITABLE_FIELDS = ['specialty', 'npi_number', 'license_number', 'dea_number', 'ptr_number', 'ptr_date', 's2_number', 's2_expiry_date'];

    /**
     * Change a provider's specialty and license details (admin-only) --
     * PTR numbers are renewed every year and S2 licenses expire.
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $provider = (new Provider())->where('id', $id)->first();

        if (!$provider || $provider['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Provider not found.', 'not_found' => true];
        }

        $errors = [];

        if (trim((string) ($data['specialty'] ?? '')) === '') {
            $errors['specialty'] = 'Specialty is required.';
        }

        $errors += $this->validateCredentials($data);

        $npi = $this->blank($data['npi_number'] ?? null);
        if ($npi !== null) {
            $stmt = Database::connection()->prepare("SELECT id FROM providers WHERE npi_number = :npi AND id <> :id LIMIT 1");
            $stmt->execute(['npi' => $npi, 'id' => $id]);
            if ($stmt->fetchColumn()) {
                $errors['npi_number'] = 'NPI number is already registered.';
            }
        }

        if ($errors) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $values = [];
        foreach (self::EDITABLE_FIELDS as $field) {
            $values[$field] = $this->blank($data[$field] ?? null);
        }
        $values['updated_at'] = date('Y-m-d H:i:s');
        $values['updated_by'] = $updatedBy;

        (new Provider())->update($values, $id);

        return ['success' => true, 'message' => 'Provider updated successfully.'];
    }

    /** PTR date / S2 expiry must be real dates; an S2 expiry needs an S2 number. */
    private function validateCredentials(array $data): array
    {
        $errors = [];

        foreach (['ptr_date' => 'PTR date', 's2_expiry_date' => 'S2 expiry'] as $field => $label) {
            $value = $this->blank($data[$field] ?? null);
            if ($value !== null) {
                $date = \DateTime::createFromFormat('Y-m-d', $value);
                if (!$date || $date->format('Y-m-d') !== $value) {
                    $errors[$field] = "Enter a valid {$label}.";
                }
            }
        }

        if ($this->blank($data['s2_expiry_date'] ?? null) !== null && $this->blank($data['s2_number'] ?? null) === null) {
            $errors['s2_number'] = 'Enter the S2 license number for this expiry date.';
        }

        foreach (['license_number', 'ptr_number', 's2_number', 'npi_number', 'dea_number'] as $field) {
            if (mb_strlen((string) ($data[$field] ?? '')) > 50) {
                $errors[$field] = 'Keep this to 50 characters or fewer.';
            }
        }

        return $errors;
    }

    private function blank($value): ?string
    {
        $value = trim((string) ($value ?? ''));

        return $value === '' ? null : $value;
    }

    /**
     * Soft-delete a provider (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $provider = (new Provider())
            ->where('id', $id)
            ->first();

        if (!$provider || $provider['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Provider not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE providers
             SET deleted_at = :deleted_at, deleted_by = :deleted_by
             WHERE id = :id"
        );

        $stmt->execute([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy,
            'id'         => $id
        ]);

        return [
            'success' => true,
            'message' => 'Provider deleted successfully.'
        ];
    }

    /**
     * Validate provider input.
     */
    private function validate(array $data): array
    {
        $errors = [];

        if (empty($data['employee_id'])) {
            $errors['employee_id'] = 'Employee is required.';
        }

        if (empty($data['specialty'])) {
            $errors['specialty'] = 'Specialty is required.';
        }

        if (!empty($errors)) {
            return $errors;
        }

        $employee = (new Employee())
            ->where('id', (int) $data['employee_id'])
            ->first();

        if (!$employee || $employee['deleted_at'] !== null) {
            $errors['employee_id'] = 'Selected employee does not exist.';
            return $errors;
        }

        $user = (new User())->find((int) $employee['user_id']);
        $role = ($user && !empty($user['role_id'])) ? (new Role())->find((int) $user['role_id']) : null;

        if (!$role || strtolower((string) $role['name']) !== 'doctor') {
            $errors['employee_id'] = 'Selected employee does not have the doctor role.';
            return $errors;
        }

        if ((new Provider())->where('employee_id', (int) $data['employee_id'])->first()) {
            $errors['employee_id'] = 'This employee is already registered as a provider.';
        }

        if (!empty($data['npi_number']) && (new Provider())->where('npi_number', $data['npi_number'])->first()) {
            $errors['npi_number'] = 'NPI number is already registered.';
        }

        return $errors + $this->validateCredentials($data);
    }
}
