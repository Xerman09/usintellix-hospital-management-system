<?php

namespace App\Modules\PatientProcedureResults\Models;

use App\Core\QueryBuilder;

class PatientProcedureResult extends QueryBuilder
{
    protected string $table = 'patient_procedure_results';

    protected string $primaryKey = 'id';
}
