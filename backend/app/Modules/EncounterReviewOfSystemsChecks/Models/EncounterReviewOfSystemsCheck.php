<?php

namespace App\Modules\EncounterReviewOfSystemsChecks\Models;

use App\Core\QueryBuilder;

class EncounterReviewOfSystemsCheck extends QueryBuilder
{
    protected string $table = 'encounter_review_of_systems_checks';

    protected string $primaryKey = 'id';
}
