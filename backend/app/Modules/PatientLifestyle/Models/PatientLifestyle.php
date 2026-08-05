<?php

namespace App\Modules\PatientLifestyle\Models;

use App\Core\QueryBuilder;

class PatientLifestyle extends QueryBuilder
{
    protected string $table = 'patient_lifestyle';

    protected string $primaryKey = 'id';
}
