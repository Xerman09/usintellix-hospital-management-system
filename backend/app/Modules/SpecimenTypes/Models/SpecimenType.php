<?php

namespace App\Modules\SpecimenTypes\Models;

use App\Core\QueryBuilder;

class SpecimenType extends QueryBuilder
{
    protected string $table = 'specimen_types';

    protected string $primaryKey = 'id';
}
