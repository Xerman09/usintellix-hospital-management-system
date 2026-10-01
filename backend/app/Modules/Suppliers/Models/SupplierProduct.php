<?php

namespace App\Modules\Suppliers\Models;

use App\Core\QueryBuilder;

class SupplierProduct extends QueryBuilder
{
    protected string $table = 'supplier_products';

    protected string $primaryKey = 'id';
}
