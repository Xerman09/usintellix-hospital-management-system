<?php

namespace App\Modules\PatientHealthConcerns\Models;

use App\Core\QueryBuilder;

class PatientHealthConcern extends QueryBuilder
{
    protected string $table = 'patient_health_concerns';

    protected string $primaryKey = 'id';
}
