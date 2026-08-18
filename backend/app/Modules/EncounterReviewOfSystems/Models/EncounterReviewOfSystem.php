<?php

namespace App\Modules\EncounterReviewOfSystems\Models;

use App\Core\QueryBuilder;

class EncounterReviewOfSystem extends QueryBuilder
{
    protected string $table = 'encounter_review_of_systems';

    protected string $primaryKey = 'id';
}
