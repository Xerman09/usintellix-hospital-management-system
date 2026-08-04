<?php

namespace App\Modules\AmountUnits\Models;

use App\Core\QueryBuilder;

class AmountUnit extends QueryBuilder
{
    protected string $table = 'amount_units';

    protected string $primaryKey = 'id';
}
