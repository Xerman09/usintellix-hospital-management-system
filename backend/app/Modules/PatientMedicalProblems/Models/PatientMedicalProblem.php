<?php

namespace App\Modules\PatientMedicalProblems\Models;

use App\Core\QueryBuilder;

class PatientMedicalProblem extends QueryBuilder
{
    protected string $table = 'patient_medical_problems';

    protected string $primaryKey = 'id';
}
