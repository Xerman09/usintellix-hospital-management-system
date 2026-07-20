<?php

namespace App\Modules\Roles\Models;

use App\Core\QueryBuilder;

class Role extends QueryBuilder
{
    protected string $table = 'roles';

    protected string $primaryKey = 'id';
}
