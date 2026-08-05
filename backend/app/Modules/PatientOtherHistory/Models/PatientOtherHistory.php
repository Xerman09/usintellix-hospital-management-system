<?php

namespace App\Modules\PatientOtherHistory\Models;

use App\Core\QueryBuilder;

class PatientOtherHistory extends QueryBuilder
{
    protected string $table = 'patient_other_history';

    protected string $primaryKey = 'id';
}
