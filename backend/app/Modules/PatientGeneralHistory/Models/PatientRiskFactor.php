<?php

namespace App\Modules\PatientGeneralHistory\Models;

use App\Core\QueryBuilder;

class PatientRiskFactor extends QueryBuilder
{
    protected string $table = 'patient_risk_factors';

    protected string $primaryKey = 'id';
}
