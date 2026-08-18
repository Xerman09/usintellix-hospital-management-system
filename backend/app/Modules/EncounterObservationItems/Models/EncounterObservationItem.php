<?php

namespace App\Modules\EncounterObservationItems\Models;

use App\Core\QueryBuilder;

class EncounterObservationItem extends QueryBuilder
{
    protected string $table = 'encounter_observation_items';

    protected string $primaryKey = 'id';
}
