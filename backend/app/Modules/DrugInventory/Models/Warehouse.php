<?php

namespace App\Modules\DrugInventory\Models;

use App\Core\QueryBuilder;

class Warehouse extends QueryBuilder
{
    protected string $table = 'warehouses';

    protected string $primaryKey = 'id';
}
