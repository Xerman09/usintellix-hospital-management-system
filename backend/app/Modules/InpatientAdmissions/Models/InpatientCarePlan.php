<?php

namespace App\Modules\InpatientAdmissions\Models;

use App\Core\QueryBuilder;

class InpatientCarePlan extends QueryBuilder
{
    protected string $table = 'inpatient_care_plans';

    protected string $primaryKey = 'id';
}
