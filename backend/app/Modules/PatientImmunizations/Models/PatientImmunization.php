<?php

namespace App\Modules\PatientImmunizations\Models;

use App\Core\QueryBuilder;

class PatientImmunization extends QueryBuilder
{
    protected string $table = 'patient_immunizations';

    protected string $primaryKey = 'id';
}
