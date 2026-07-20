<?php

namespace App\Core;

use PDO;
use PDOStatement;

class QueryBuilder extends Model
{
    protected array $where = [];
    protected array $bindings = [];

    /**
     * Get all records.
     */
    public function all(): array
    {
        $sql = "SELECT * FROM {$this->table}";

        $stmt = $this->prepareWithConditions($sql);
        $stmt->execute();

        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $this->reset();

        return $result;
    }

    /**
     * Get records using the current conditions.
     */
    public function get(string|array $columns = ['*']): array
    {
        $selectedColumns = is_array($columns)
            ? implode(', ', $columns)
            : $columns;

        $sql = "SELECT {$selectedColumns} FROM {$this->table}";

        $stmt = $this->prepareWithConditions($sql);
        $stmt->execute();

        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $this->reset();

        return $result;
    }

    /**
     * Find a record by primary key.
     */
    public function find(int|string $id): ?array
    {
        $sql = "SELECT * FROM {$this->table}
                WHERE {$this->primaryKey} = :id
                LIMIT 1";

        $stmt = $this->db()->prepare($sql);
        $stmt->bindValue(':id', $id);
        $stmt->execute();

        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        return $result ?: null;
    }

    /**
     * Create a new record.
     */
    public function create(array $data): int|false
    {
        if (empty($data)) {
            return false;
        }

        $columns = array_keys($data);
        $placeholders = array_map(fn($column) => ':' . $column, $columns);

        $sql = "INSERT INTO {$this->table} (" . implode(', ', $columns) . ") VALUES (" . implode(', ', $placeholders) . ")";

        $stmt = $this->db()->prepare($sql);

        foreach ($data as $column => $value) {
            $stmt->bindValue(':' . $column, $value);
        }

        if ($stmt->execute()) {
            return (int) $this->db()->lastInsertId();
        }

        return false;
    }

    /**
     * Alias for create().
     */
    public function insert(array $data): int|false
    {
        return $this->create($data);
    }

    /**
     * Update records.
     */
    public function update(array $data, int|string|null $id = null): bool
    {
        if (empty($data)) {
            return false;
        }

        if ($id !== null) {
            $this->where($this->primaryKey, $id);
        }

        $setParts = [];

        foreach ($data as $column => $value) {
            $setParts[] = "{$column} = :{$column}";
        }

        $sql = "UPDATE {$this->table} SET " . implode(', ', $setParts);

        if (!empty($this->where)) {
            $sql .= " WHERE " . implode(' AND ', $this->where);
        }

        $stmt = $this->db()->prepare($sql);

        foreach ($data as $column => $value) {
            $stmt->bindValue(':' . $column, $value);
        }

        foreach ($this->bindings as $placeholder => $value) {
            $stmt->bindValue($placeholder, $value);
        }

        $result = $stmt->execute();
        $this->reset();

        return $result;
    }

    /**
     * Delete records.
     */
    public function delete(int|string|null $id = null): bool
    {
        if ($id !== null) {
            $this->where($this->primaryKey, $id);
        }

        $sql = "DELETE FROM {$this->table}";

        if (!empty($this->where)) {
            $sql .= " WHERE " . implode(' AND ', $this->where);
        }

        $stmt = $this->db()->prepare($sql);

        foreach ($this->bindings as $placeholder => $value) {
            $stmt->bindValue($placeholder, $value);
        }

        $result = $stmt->execute();
        $this->reset();

        return $result;
    }

    /**
     * Add a WHERE condition.
     */
    public function where(
        string $column,
        mixed $value,
        string $operator = '='
    ): static {

        $placeholder = ':w' . count($this->bindings);

        $this->where[] =
            "{$column} {$operator} {$placeholder}";

        $this->bindings[$placeholder] = $value;

        return $this;
    }

    /**
     * Return the first matching record.
     */
    public function first(): ?array
    {
        $sql = "SELECT * FROM {$this->table}";

        $stmt = $this->prepareWithConditions($sql, true);
        $stmt->execute();

        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        $this->reset();

        return $result ?: null;
    }

    /**
     * Prepare a statement and bind current builder conditions.
     */
    protected function prepareWithConditions(string $sql, bool $limitOne = false): PDOStatement
    {
        if (!empty($this->where)) {
            $sql .= " WHERE " . implode(' AND ', $this->where);
        }

        if ($limitOne) {
            $sql .= " LIMIT 1";
        }

        $stmt = $this->db()->prepare($sql);

        foreach ($this->bindings as $placeholder => $value) {
            $stmt->bindValue($placeholder, $value);
        }

        return $stmt;
    }

    /**
     * Reset builder state.
     */
    protected function reset(): void
    {
        $this->where = [];
        $this->bindings = [];
    }
}