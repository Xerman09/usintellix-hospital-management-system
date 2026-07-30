<?php

namespace App\Modules\Encounters\Models;

use App\Core\QueryBuilder;

class EncounterIssue extends QueryBuilder
{
    protected string $table = 'encounter_issues';

    protected string $primaryKey = 'id';
}
