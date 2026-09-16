<?php

namespace App\Modules\PatientLetters\Models;

use App\Core\QueryBuilder;

class PatientLetter extends QueryBuilder
{
    protected string $table = 'patient_letters';

    protected string $primaryKey = 'id';
}
