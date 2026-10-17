<?php

namespace App\Modules\EquipmentAssets\Models;

use App\Core\QueryBuilder;

class EquipmentMaintenanceLog extends QueryBuilder
{
    protected string $table = 'equipment_maintenance_logs';

    protected string $primaryKey = 'id';
}
