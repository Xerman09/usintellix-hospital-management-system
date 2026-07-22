<?php

namespace App\Modules\Appointments\Models;

use App\Core\QueryBuilder;

class Appointment extends QueryBuilder
{
    protected string $table = 'appointments';

    protected string $primaryKey = 'id';
}
