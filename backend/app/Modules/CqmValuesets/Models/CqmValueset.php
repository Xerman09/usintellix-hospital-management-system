<?php

namespace App\Modules\CqmValuesets\Models;

use App\Core\QueryBuilder;

class CqmValueset extends QueryBuilder
{
    protected string $table = 'cqm_valuesets';

    protected string $primaryKey = 'id';
}
