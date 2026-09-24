<?php

namespace App\Modules\Encounters\Models;

use App\Core\QueryBuilder;

class HitechRestriction extends QueryBuilder
{
    protected string $table = 'hipaa_hitech_restrictions';

    protected string $primaryKey = 'id';
}
