<?php

namespace App\Modules\VoidReasons\Models;

use App\Core\QueryBuilder;

class VoidReason extends QueryBuilder
{
    protected string $table = 'void_reasons';

    protected string $primaryKey = 'id';
}
