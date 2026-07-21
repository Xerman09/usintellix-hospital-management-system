<?php

namespace App\Modules\Providers\Models;

use App\Core\QueryBuilder;

class Provider extends QueryBuilder
{
    protected string $table = 'providers';

    protected string $primaryKey = 'id';
}
