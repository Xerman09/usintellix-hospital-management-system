<?php

namespace App\Modules\Receiving\Models;

use App\Core\QueryBuilder;

class GoodsReceipt extends QueryBuilder
{
    protected string $table = 'goods_receipts';

    protected string $primaryKey = 'id';
}
