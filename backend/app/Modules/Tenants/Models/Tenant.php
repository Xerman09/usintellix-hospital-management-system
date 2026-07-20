<?php

namespace App\Modules\Tenants\Models;

use App\Core\QueryBuilder;

class Tenant extends QueryBuilder
{
    protected string $table = 'tenants';

    protected string $primaryKey = 'id';
}
