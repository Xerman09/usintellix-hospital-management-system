<?php

namespace App\Modules\PatientSurgeries\Models;

use App\Core\QueryBuilder;

class PatientSurgery extends QueryBuilder
{
    protected string $table = 'patient_surgeries';

    protected string $primaryKey = 'id';
}
