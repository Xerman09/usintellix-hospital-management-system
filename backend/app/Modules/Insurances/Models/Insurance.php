<?php

namespace App\Modules\Insurances\Models;

use App\Core\QueryBuilder;

class Insurance extends QueryBuilder
{
    protected string $table = 'insurances';

    protected string $primaryKey = 'id';
}
