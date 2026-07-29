<?php

namespace App\Modules\Recalls\Models;

use App\Core\QueryBuilder;

class Recall extends QueryBuilder
{
    protected string $table = 'recalls';

    protected string $primaryKey = 'id';
}
