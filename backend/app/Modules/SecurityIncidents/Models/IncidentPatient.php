<?php

namespace App\Modules\SecurityIncidents\Models;

use App\Core\QueryBuilder;

class IncidentPatient extends QueryBuilder
{
    protected string $table = 'hipaa_incident_patients';

    protected string $primaryKey = 'id';
}
