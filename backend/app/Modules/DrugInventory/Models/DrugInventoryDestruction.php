<?php

namespace App\Modules\DrugInventory\Models;

use App\Core\QueryBuilder;

class DrugInventoryDestruction extends QueryBuilder
{
    protected string $table = 'drug_inventory_destructions';

    protected string $primaryKey = 'id';
}
