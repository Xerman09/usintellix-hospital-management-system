<?php

namespace App\Modules\EquipmentAssets\Models;

use App\Core\QueryBuilder;

class BiomedMaintenanceSchedule extends QueryBuilder
{
    protected string $table = 'biomed_maintenance_schedules';

    protected string $primaryKey = 'id';
}
