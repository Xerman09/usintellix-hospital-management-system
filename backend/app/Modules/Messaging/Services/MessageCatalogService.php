<?php

namespace App\Modules\Messaging\Services;

use App\Core\Database;
use PDO;

/**
 * Shared CRUD for the message_types / message_statuses catalogs. Both
 * tables are simple {id, name, ...audit columns} lookups, so a single
 * service parameterized by table name avoids duplicating the same
 * validate/register/update/remove logic twice.
 */
class MessageCatalogService
{
    public function __construct(
        private readonly string $table,
        private readonly string $label
    ) {
    }

    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, created_at, updated_at
             FROM {$this->table}
             WHERE deleted_at IS NULL
             ORDER BY name"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

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

        $stmt = Database::connection()->prepare(
            "INSERT INTO {$this->table} (name, created_at, created_by)
             VALUES (:name, :created_at, :created_by)"
        );

        $stmt->execute([
            'name' => trim($data['name']),
            'created_at' => date('Y-m-d H:i:s'),
            'created_by' => $createdBy
        ]);

        return [
            'success' => true,
            'message' => "{$this->label} created successfully.",
            'data' => ['id' => (int) Database::connection()->lastInsertId()]
        ];
    }

    public function update(int $id, array $data, int $updatedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => "{$this->label} not found."
            ];
        }

        $errors = $this->validate($data, $id);

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $errors
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE {$this->table}
             SET name = :name, updated_at = :updated_at, updated_by = :updated_by
             WHERE id = :id"
        );

        $stmt->execute([
            'name' => trim($data['name']),
            'updated_at' => date('Y-m-d H:i:s'),
            'updated_by' => $updatedBy,
            'id' => $id
        ]);

        return [
            'success' => true,
            'message' => "{$this->label} updated successfully."
        ];
    }

    public function remove(int $id, int $deletedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => "{$this->label} not found."
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE {$this->table}
             SET deleted_at = :deleted_at, deleted_by = :deleted_by
             WHERE id = :id"
        );

        $stmt->execute([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy,
            'id' => $id
        ]);

        return [
            'success' => true,
            'message' => "{$this->label} deleted successfully."
        ];
    }

    private function find(int $id): ?array
    {
        $stmt = Database::connection()->prepare(
            "SELECT * FROM {$this->table} WHERE id = :id LIMIT 1"
        );

        $stmt->execute(['id' => $id]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];
        $name = trim((string) ($data['name'] ?? ''));

        if ($name === '') {
            $errors['name'] = 'Name is required.';
            return $errors;
        }

        $stmt = Database::connection()->prepare(
            "SELECT id FROM {$this->table}
             WHERE name = :name AND deleted_at IS NULL
             LIMIT 1"
        );

        $stmt->execute(['name' => $name]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existing && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['name'] = "A {$this->label} with this name already exists.";
        }

        return $errors;
    }
}
