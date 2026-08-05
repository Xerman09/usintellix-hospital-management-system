<?php

namespace App\Modules\PatientGeneralHistory\Models;

use App\Core\QueryBuilder;

class PatientExam extends QueryBuilder
{
    protected string $table = 'patient_exams';

    protected string $primaryKey = 'id';
}
