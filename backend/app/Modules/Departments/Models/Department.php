<?php

namespace App\Modules\Departments\Models;

use App\Core\QueryBuilder;

class Department extends QueryBuilder
{
    protected string $table = 'departments';

    protected string $primaryKey = 'id';
}
