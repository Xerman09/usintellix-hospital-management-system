<?php

namespace App\Modules\ChartTracker\Models;

use App\Core\QueryBuilder;

class ChartLocation extends QueryBuilder
{
    protected string $table = 'chart_locations';

    protected string $primaryKey = 'id';
}
