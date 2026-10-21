<?php

namespace App\Modules\InpatientAdmissions\Models;

use App\Core\QueryBuilder;

class InpatientFluidBalance extends QueryBuilder
{
    protected string $table = 'inpatient_fluid_balance';

    protected string $primaryKey = 'id';
}
