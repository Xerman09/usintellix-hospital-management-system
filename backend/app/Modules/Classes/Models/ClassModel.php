<?php

namespace App\Modules\Classes\Models;

use App\Core\QueryBuilder;

class ClassModel extends QueryBuilder
{
    protected string $table = 'classes';

    protected string $primaryKey = 'id';
}
