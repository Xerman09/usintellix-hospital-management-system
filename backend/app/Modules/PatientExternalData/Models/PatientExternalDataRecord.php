<?php

namespace App\Modules\PatientExternalData\Models;

use App\Core\QueryBuilder;

class PatientExternalDataRecord extends QueryBuilder
{
    protected string $table = 'patient_external_data';

    protected string $primaryKey = 'id';
}
