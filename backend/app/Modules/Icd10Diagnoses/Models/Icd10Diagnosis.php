<?php

namespace App\Modules\Icd10Diagnoses\Models;

use App\Core\QueryBuilder;

class Icd10Diagnosis extends QueryBuilder
{
    protected string $table = 'icd10_diagnoses';

    protected string $primaryKey = 'id';
}
