<?php

namespace App\Modules\Holidays\Models;

use App\Core\QueryBuilder;

class Holiday extends QueryBuilder
{
    protected string $table = 'holidays';

    protected string $primaryKey = 'id';
}
