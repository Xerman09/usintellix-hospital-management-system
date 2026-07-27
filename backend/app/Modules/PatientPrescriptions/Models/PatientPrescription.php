<?php

namespace App\Modules\PatientPrescriptions\Models;

use App\Core\QueryBuilder;

class PatientPrescription extends QueryBuilder
{
    protected string $table = 'patient_prescriptions';

    protected string $primaryKey = 'id';
}
