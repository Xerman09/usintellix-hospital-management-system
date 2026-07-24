<?php

namespace App\Modules\X12Partners\Models;

use App\Core\QueryBuilder;

class X12Partner extends QueryBuilder
{
    protected string $table = 'x12_partners';

    protected string $primaryKey = 'id';
}
