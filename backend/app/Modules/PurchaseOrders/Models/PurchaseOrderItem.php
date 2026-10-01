<?php

namespace App\Modules\PurchaseOrders\Models;

use App\Core\QueryBuilder;

class PurchaseOrderItem extends QueryBuilder
{
    protected string $table = 'purchase_order_items';

    protected string $primaryKey = 'id';
}
