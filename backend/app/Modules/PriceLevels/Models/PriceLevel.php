<?php

namespace App\Modules\PriceLevels\Models;

use App\Core\QueryBuilder;

class PriceLevel extends QueryBuilder
{
    protected string $table = 'price_levels';

    protected string $primaryKey = 'id';
}
