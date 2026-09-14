<?php

namespace App\Modules\EncounterDiagnoses\Models;

use App\Core\QueryBuilder;

class EncounterDiagnosis extends QueryBuilder
{
    protected string $table = 'encounter_diagnoses';

    protected string $primaryKey = 'id';
}
