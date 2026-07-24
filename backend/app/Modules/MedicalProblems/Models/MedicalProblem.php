<?php

namespace App\Modules\MedicalProblems\Models;

use App\Core\QueryBuilder;

class MedicalProblem extends QueryBuilder
{
    protected string $table = 'medical_problems';

    protected string $primaryKey = 'id';
}
