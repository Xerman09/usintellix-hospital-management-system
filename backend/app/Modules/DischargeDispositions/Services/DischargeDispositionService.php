<?php

namespace App\Modules\DischargeDispositions\Services;

use App\Core\Database;
use PDO;

class DischargeDispositionService
{
    /**
     * List all active (non-deleted) discharge dispositions.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name FROM discharge_dispositions
             WHERE deleted_at IS NULL
             ORDER BY name"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
