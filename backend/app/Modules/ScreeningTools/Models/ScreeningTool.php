<?php

namespace App\Modules\ScreeningTools\Models;

use App\Core\QueryBuilder;

class ScreeningTool extends QueryBuilder
{
    protected string $table = 'screening_tools';

    protected string $primaryKey = 'id';
}
