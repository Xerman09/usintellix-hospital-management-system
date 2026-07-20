<?php

namespace App\Modules\Employees\Models;

use App\Core\QueryBuilder;

class Employee extends QueryBuilder
{
    protected string $table = 'employees';

    protected string $primaryKey = 'id';
}
