<?php

namespace App\Modules\Patients\Models;

use App\Core\QueryBuilder;

class PatientContactHistory extends QueryBuilder
{
    protected string $table = 'patient_contact_histories';

    protected string $primaryKey = 'id';
}
