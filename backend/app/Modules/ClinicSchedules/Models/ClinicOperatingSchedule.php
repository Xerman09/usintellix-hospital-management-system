<?php

namespace App\Modules\ClinicSchedules\Models;

use App\Core\QueryBuilder;

class ClinicOperatingSchedule extends QueryBuilder
{
    protected string $table = 'clinic_operating_schedules';

    protected string $primaryKey = 'id';
}
