<?php

namespace App\Modules\PatientSdohAssessment\Models;

use App\Core\QueryBuilder;

class PatientSdohAssessment extends QueryBuilder
{
    protected string $table = 'patient_sdoh_assessment';

    protected string $primaryKey = 'id';
}
