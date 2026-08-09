<?php

namespace App\Modules\PatientDentalIssues\Models;

use App\Core\QueryBuilder;

class PatientDentalIssue extends QueryBuilder
{
    protected string $table = 'patient_dental_issues';

    protected string $primaryKey = 'id';
}
