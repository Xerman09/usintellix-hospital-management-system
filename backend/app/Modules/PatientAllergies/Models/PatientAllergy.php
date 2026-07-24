<?php

namespace App\Modules\PatientAllergies\Models;

use App\Core\QueryBuilder;

class PatientAllergy extends QueryBuilder
{
    protected string $table = 'patient_allergies';

    protected string $primaryKey = 'id';
}
