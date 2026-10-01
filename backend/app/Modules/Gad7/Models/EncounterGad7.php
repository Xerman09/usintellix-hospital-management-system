<?php

namespace App\Modules\Gad7\Models;

use App\Core\QueryBuilder;

class EncounterGad7 extends QueryBuilder
{
    protected string $table = 'encounter_gad7';

    protected string $primaryKey = 'id';
}
