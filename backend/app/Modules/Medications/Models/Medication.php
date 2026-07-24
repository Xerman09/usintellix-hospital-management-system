<?php

namespace App\Modules\Medications\Models;

use App\Core\QueryBuilder;

class Medication extends QueryBuilder
{
    protected string $table = 'medications';

    protected string $primaryKey = 'id';
}
