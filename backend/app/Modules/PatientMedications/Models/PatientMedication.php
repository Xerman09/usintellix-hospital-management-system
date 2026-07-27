<?php

namespace App\Modules\PatientMedications\Models;

use App\Core\QueryBuilder;

class PatientMedication extends QueryBuilder
{
    protected string $table = 'patient_medications';

    protected string $primaryKey = 'id';
}
