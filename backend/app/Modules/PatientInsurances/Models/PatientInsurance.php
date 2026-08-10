<?php

namespace App\Modules\PatientInsurances\Models;

use App\Core\QueryBuilder;

class PatientInsurance extends QueryBuilder
{
    protected string $table = 'patient_insurances';

    protected string $primaryKey = 'id';
}
