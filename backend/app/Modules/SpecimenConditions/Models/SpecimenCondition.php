<?php

namespace App\Modules\SpecimenConditions\Models;

use App\Core\QueryBuilder;

class SpecimenCondition extends QueryBuilder
{
    protected string $table = 'specimen_conditions';

    protected string $primaryKey = 'id';
}
