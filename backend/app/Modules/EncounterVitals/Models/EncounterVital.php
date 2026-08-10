<?php

namespace App\Modules\EncounterVitals\Models;

use App\Core\QueryBuilder;

class EncounterVital extends QueryBuilder
{
    protected string $table = 'encounter_vitals';

    protected string $primaryKey = 'id';
}
