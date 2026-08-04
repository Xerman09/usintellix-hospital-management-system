<?php

namespace App\Modules\Codes\Models;

use App\Core\QueryBuilder;

class Code extends QueryBuilder
{
    protected string $table = 'codes';

    protected string $primaryKey = 'id';
}
