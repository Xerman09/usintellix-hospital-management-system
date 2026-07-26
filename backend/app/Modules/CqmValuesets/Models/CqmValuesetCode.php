<?php

namespace App\Modules\CqmValuesets\Models;

use App\Core\QueryBuilder;

class CqmValuesetCode extends QueryBuilder
{
    protected string $table = 'cqm_valueset_codes';

    protected string $primaryKey = 'id';
}
