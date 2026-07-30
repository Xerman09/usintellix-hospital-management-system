<?php

namespace App\Modules\Encounters\Models;

use App\Core\QueryBuilder;

class Encounter extends QueryBuilder
{
    protected string $table = 'encounters';

    protected string $primaryKey = 'id';
}
