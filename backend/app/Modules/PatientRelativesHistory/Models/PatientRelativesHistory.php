<?php

namespace App\Modules\PatientRelativesHistory\Models;

use App\Core\QueryBuilder;

class PatientRelativesHistory extends QueryBuilder
{
    protected string $table = 'patient_relatives_history';

    protected string $primaryKey = 'id';
}
