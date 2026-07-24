<?php

namespace App\Modules\PosCodes\Models;

use App\Core\QueryBuilder;

class PosCode extends QueryBuilder
{
    protected string $table = 'pos_codes';

    protected string $primaryKey = 'id';
}
