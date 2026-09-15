<?php

namespace App\Modules\DrugInventory\Models;

use App\Core\QueryBuilder;

class DrugInventoryLot extends QueryBuilder
{
    protected string $table = 'drug_inventory_lots';

    protected string $primaryKey = 'id';
}
