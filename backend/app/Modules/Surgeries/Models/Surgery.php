<?php

namespace App\Modules\Surgeries\Models;

use App\Core\QueryBuilder;

class Surgery extends QueryBuilder
{
    protected string $table = 'surgeries';

    protected string $primaryKey = 'id';
}
