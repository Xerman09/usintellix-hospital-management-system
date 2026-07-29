<?php

namespace App\Modules\Amendments\Models;

use App\Core\QueryBuilder;

class Amendment extends QueryBuilder
{
    protected string $table = 'amendments';

    protected string $primaryKey = 'id';
}
