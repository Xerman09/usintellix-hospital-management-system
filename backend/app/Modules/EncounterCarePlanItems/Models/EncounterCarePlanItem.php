<?php

namespace App\Modules\EncounterCarePlanItems\Models;

use App\Core\QueryBuilder;

class EncounterCarePlanItem extends QueryBuilder
{
    protected string $table = 'encounter_care_plan_items';

    protected string $primaryKey = 'id';
}
