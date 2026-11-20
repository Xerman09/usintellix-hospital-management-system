<?php

namespace App\Modules\BusinessModules\Models;

use App\Core\QueryBuilder;

class BusinessModule extends QueryBuilder
{
    protected string $table = 'business_modules';

    protected string $primaryKey = 'id';
}
