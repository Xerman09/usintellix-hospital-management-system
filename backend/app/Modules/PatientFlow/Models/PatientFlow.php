<?php

namespace App\Modules\PatientFlow\Models;

use App\Core\QueryBuilder;

class PatientFlow extends QueryBuilder
{
    protected string $table = 'patient_flow';

    protected string $primaryKey = 'id';
}
