<?php

namespace App\Modules\PatientFamilyHistory\Models;

use App\Core\QueryBuilder;

class PatientFamilyHistory extends QueryBuilder
{
    protected string $table = 'patient_family_history';

    protected string $primaryKey = 'id';
}
