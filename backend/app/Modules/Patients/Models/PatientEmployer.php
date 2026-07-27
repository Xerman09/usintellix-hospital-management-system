<?php

namespace App\Modules\Patients\Models;

use App\Core\QueryBuilder;

class PatientEmployer extends QueryBuilder
{
    protected string $table = 'patient_employers';

    protected string $primaryKey = 'id';
}
