<?php

namespace App\Modules\EncounterFunctionalCognitiveStatusItems\Models;

use App\Core\QueryBuilder;

class EncounterFunctionalCognitiveStatusItem extends QueryBuilder
{
    protected string $table = 'encounter_functional_cognitive_status_items';

    protected string $primaryKey = 'id';
}
