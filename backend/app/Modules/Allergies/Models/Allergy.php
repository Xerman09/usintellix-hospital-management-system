<?php

namespace App\Modules\Allergies\Models;

use App\Core\QueryBuilder;

class Allergy extends QueryBuilder
{
    protected string $table = 'allergies';

    protected string $primaryKey = 'id';
}
