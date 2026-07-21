<?php

namespace App\Modules\Patients\Models;

use App\Core\QueryBuilder;

class PatientContact extends QueryBuilder
{
    protected string $table = 'patient_contacts';

    protected string $primaryKey = 'id';
}
