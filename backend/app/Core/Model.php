<?php

namespace App\Core;

use PDO;

abstract class Model
{
    /**
     * Database connection.
     */
    protected PDO $db;

    /**
     * Database table.
     */
    protected string $table;

    /**
     * Primary key.
     */
    protected string $primaryKey = 'id';

    public function __construct()
    {
        $this->db = Database::connection();
    }

    /**
     * Get the PDO instance.
     */
    protected function db(): PDO
    {
        return $this->db;
    }

    /**
     * Get the table name.
     */
    public function getTable(): string
    {
        return $this->table;
    }

    /**
     * Get the primary key.
     */
    public function getPrimaryKey(): string
    {
        return $this->primaryKey;
    }
}