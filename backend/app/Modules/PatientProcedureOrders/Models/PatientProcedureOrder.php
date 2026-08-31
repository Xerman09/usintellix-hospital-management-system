<?php

namespace App\Modules\PatientProcedureOrders\Models;

use App\Core\QueryBuilder;

class PatientProcedureOrder extends QueryBuilder
{
    protected string $table = 'patient_procedure_orders';

    protected string $primaryKey = 'id';
}
