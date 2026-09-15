<?php

namespace App\Modules\DrugInventory\Models;

use App\Core\QueryBuilder;

class Drug extends QueryBuilder
{
    protected string $table = 'drugs';

    protected string $primaryKey = 'id';
}
