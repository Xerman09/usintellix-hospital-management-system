<?php

namespace App\Modules\Facilities\Models;

use App\Core\QueryBuilder;

class Facility extends QueryBuilder
{
    protected string $table = 'facilities';

    protected string $primaryKey = 'id';
}
