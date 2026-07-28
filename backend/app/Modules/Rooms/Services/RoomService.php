<?php

namespace App\Modules\Rooms\Services;

use App\Core\Database;
use PDO;

class RoomService
{
    /**
     * List all active (non-deleted) rooms.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, facility_id, description, created_at, updated_at
             FROM rooms
             WHERE deleted_at IS NULL
             ORDER BY name"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
