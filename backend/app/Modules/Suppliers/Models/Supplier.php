<?php

namespace App\Modules\Suppliers\Models;

use App\Core\QueryBuilder;

class Supplier extends QueryBuilder
{
    protected string $table = 'suppliers';

    protected string $primaryKey = 'id';
}
