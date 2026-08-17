<?php

namespace App\Modules\SpecimenMethods\Models;

use App\Core\QueryBuilder;

class SpecimenMethod extends QueryBuilder
{
    protected string $table = 'specimen_methods';

    protected string $primaryKey = 'id';
}
