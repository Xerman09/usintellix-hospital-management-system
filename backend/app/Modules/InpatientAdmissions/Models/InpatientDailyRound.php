<?php

namespace App\Modules\InpatientAdmissions\Models;

use App\Core\QueryBuilder;

class InpatientDailyRound extends QueryBuilder
{
    protected string $table = 'inpatient_daily_rounds';

    protected string $primaryKey = 'id';
}
