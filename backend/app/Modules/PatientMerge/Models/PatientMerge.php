<?php

namespace App\Modules\PatientMerge\Models;

use App\Core\QueryBuilder;

class PatientMerge extends QueryBuilder
{
    protected string $table = 'patient_merges';

    protected string $primaryKey = 'id';
}
