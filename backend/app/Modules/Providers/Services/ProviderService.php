<?php

namespace App\Modules\Providers\Services;

use App\Core\Database;
use App\Modules\Employees\Models\Employee;
use App\Modules\Providers\Models\Provider;
use App\Modules\Roles\Models\Role;
use App\Modules\Specializations\Services\SpecializationService;
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
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $specs = self::specializationsOf(array_column($rows, 'id'));

        return array_map(function ($r) use ($specs) {
            $mine = $specs[(int) $r['id']] ?? [];
            $primary = array_values(array_filter($mine, fn($s) => $s['is_primary']))[0] ?? null;
            return $r + [
                'primary_specialization_id' => $primary['id'] ?? null,
                'primary_specialization' => $primary['name'] ?? null,
                'sub_specialization_ids' => array_values(array_map(fn($s) => $s['id'], array_filter($mine, fn($s) => !$s['is_primary']))),
                'specializations' => $mine
            ];
        }, $rows);
    }

    /**
     * provider id => its specializations [{id, name, category, is_primary}], primary first.
     */
    public static function specializationsOf(array $providerIds): array
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $providerIds))));
        if (!$ids) {
            return [];
        }

        $out = [];
        foreach (Database::connection()->query(
            "SELECT ps.provider_id, s.id, s.name, s.category, ps.is_primary
             FROM provider_specializations ps JOIN specializations s ON s.id = ps.specialization_id
             WHERE ps.provider_id IN (" . implode(',', $ids) . ")
             ORDER BY ps.is_primary DESC, s.name"
        )->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $out[(int) $r['provider_id']][] = ['id' => (int) $r['id'], 'name' => $r['name'], 'category' => $r['category'], 'is_primary' => (bool) $r['is_primary']];
        }

        return $out;
    }

    /**
     * The primary specialization and sub-specializations asked for:
     * ['primary' => row, 'subs' => [ids]] or ['errors' => [...]].
     * A specialization switched off can stay on a doctor who already has it.
     */
    private function readSpecializations(array $data, ?int $providerId = null): array
    {
        $primaryId = (int) ($data['primary_specialization_id'] ?? 0);
        $subs = $data['sub_specialization_ids'] ?? [];
        if (is_string($subs)) {
            $subs = $subs === '' ? [] : explode(',', $subs);
        }
        $subs = array_values(array_unique(array_filter(array_map('intval', is_array($subs) ? $subs : []), fn($id) => $id > 0 && $id !== $primaryId)));

        if (!$primaryId) {
            return ['errors' => ['primary_specialization_id' => 'Choose the doctor\'s main specialization.']];
        }

        $current = $providerId ? array_column(self::specializationsOf([$providerId])[$providerId] ?? [], 'id') : [];
        $found = SpecializationService::byId(array_merge([$primaryId], $subs));
        $usable = fn($id) => isset($found[$id]) && ((int) $found[$id]['is_active'] === 1 || in_array($id, $current, true));

        if (!$usable($primaryId)) {
            return ['errors' => ['primary_specialization_id' => 'Choose a specialization from the list.']];
        }
        foreach ($subs as $id) {
            if (!$usable($id)) {
                return ['errors' => ['sub_specialization_ids' => 'One of the sub-specializations is no longer on the list. Reload and try again.']];
            }
        }

        return ['primary' => $found[$primaryId], 'subs' => $subs];
    }

    /** Replaces the doctor's specializations; providers.specialty follows the primary one (printouts read it). */
    private function saveSpecializations(int $providerId, array $spec, int $userId): void
    {
        $db = Database::connection();
        $db->prepare("DELETE FROM provider_specializations WHERE provider_id = :id")->execute(['id' => $providerId]);
        $insert = $db->prepare(
            "INSERT INTO provider_specializations (provider_id, specialization_id, is_primary, created_at, created_by) VALUES (:p, :s, :primary, :now, :u)"
        );
        $now = date('Y-m-d H:i:s');
        $insert->execute(['p' => $providerId, 's' => $spec['primary']['id'], 'primary' => 1, 'now' => $now, 'u' => $userId]);
        foreach ($spec['subs'] as $id) {
            $insert->execute(['p' => $providerId, 's' => $id, 'primary' => 0, 'now' => $now, 'u' => $userId]);
        }
        $db->prepare("UPDATE providers SET specialty = :name WHERE id = :id")->execute(['name' => $spec['primary']['name'], 'id' => $providerId]);
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
        $spec = $this->readSpecializations($data);
        if (isset($spec['errors'])) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $spec['errors']];
        }
        $data['specialty'] = $spec['primary']['name'];

        $errors = $this->validate($data);

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $errors
            ];
        }

        $db = Database::connection();
        $owns = !$db->inTransaction();

        try {
            if ($owns) {
                $db->beginTransaction();
            }
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

            $this->saveSpecializations((int) $providerId, $spec, $createdBy);
            if ($owns) {
                $db->commit();
            }

            return [
                'success' => true,
                'message' => 'Provider created successfully.',
                'data' => [
                    'provider_id' => $providerId
                ]
            ];
        } catch (Throwable $e) {
            if ($owns && $db->inTransaction()) {
                $db->rollBack();
            }
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

        $spec = $this->readSpecializations($data, $id);
        $errors = $spec['errors'] ?? [];
        if (!$errors) {
            $data['specialty'] = $spec['primary']['name'];
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

        $db = Database::connection();
        $owns = !$db->inTransaction();
        if ($owns) {
            $db->beginTransaction();
        }
        try {
            (new Provider())->update($values, $id);
            $this->saveSpecializations($id, $spec, $updatedBy);
            if ($owns) {
                $db->commit();
            }
        } catch (Throwable $e) {
            if ($owns) {
                $db->rollBack();
            }
            throw $e;
        }

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
