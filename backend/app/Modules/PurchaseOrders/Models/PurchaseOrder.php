<?php

namespace App\Modules\PurchaseOrders\Models;

use App\Core\QueryBuilder;

class PurchaseOrder extends QueryBuilder
{
    protected string $table = 'purchase_orders';

    protected string $primaryKey = 'id';
}
