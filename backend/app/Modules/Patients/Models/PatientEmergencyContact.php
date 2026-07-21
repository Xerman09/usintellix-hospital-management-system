<?php

namespace App\Modules\Patients\Models;

use App\Core\QueryBuilder;

class PatientEmergencyContact extends QueryBuilder
{
    protected string $table = 'patient_emergency_contacts';

    protected string $primaryKey = 'id';
}
