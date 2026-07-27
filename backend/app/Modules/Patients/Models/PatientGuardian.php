<?php

namespace App\Modules\Patients\Models;

use App\Core\QueryBuilder;

class PatientGuardian extends QueryBuilder
{
    protected string $table = 'patient_guardians';

    protected string $primaryKey = 'id';
}
