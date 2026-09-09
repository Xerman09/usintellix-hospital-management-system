<?php

namespace App\Modules\DischargeDispositions\Services;

use App\Core\Cache;
use App\Core\Database;
use PDO;

class DischargeDispositionService
{
    /**
     * List all active (non-deleted) discharge dispositions, cached since
     * this lookup table rarely changes and is fetched on every encounter
     * form load.
     */
    public function list(): array
    {
        return Cache::remember('discharge_dispositions:list', 3600, function () {
            $stmt = Database::connection()->prepare(
                "SELECT id, name FROM discharge_dispositions
                 WHERE deleted_at IS NULL
                 ORDER BY name"
            );

            $stmt->execute();

            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        });
    }
}
