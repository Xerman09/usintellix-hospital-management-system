<?php

namespace App\Modules\CarePlanReasonCodes\Models;

use App\Core\QueryBuilder;

class CarePlanReasonCode extends QueryBuilder
{
    protected string $table = 'care_plan_reason_codes';

    protected string $primaryKey = 'id';
}
