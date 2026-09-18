<?php

namespace App\Modules\TemplateMaintenance\Models;

use App\Core\QueryBuilder;

class PatientTemplateAssignment extends QueryBuilder
{
    protected string $table = 'patient_template_assignments';

    protected string $primaryKey = 'id';
}
