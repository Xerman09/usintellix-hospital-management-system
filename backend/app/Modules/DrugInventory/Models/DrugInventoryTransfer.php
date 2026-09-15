<?php

namespace App\Modules\DrugInventory\Models;

use App\Core\QueryBuilder;

class DrugInventoryTransfer extends QueryBuilder
{
    protected string $table = 'drug_inventory_transfers';

    protected string $primaryKey = 'id';
}
