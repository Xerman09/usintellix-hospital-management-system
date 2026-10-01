<?php

namespace App\Modules\DrugInventory\Models;

use App\Core\QueryBuilder;

class DrugInventoryReceipt extends QueryBuilder
{
    protected string $table = 'drug_inventory_receipts';

    protected string $primaryKey = 'id';
}
