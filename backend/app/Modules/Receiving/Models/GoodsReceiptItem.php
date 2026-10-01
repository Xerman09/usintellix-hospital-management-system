<?php

namespace App\Modules\Receiving\Models;

use App\Core\QueryBuilder;

class GoodsReceiptItem extends QueryBuilder
{
    protected string $table = 'goods_receipt_items';

    protected string $primaryKey = 'id';
}
