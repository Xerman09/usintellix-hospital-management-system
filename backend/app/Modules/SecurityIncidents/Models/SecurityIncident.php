<?php

namespace App\Modules\SecurityIncidents\Models;

use App\Core\QueryBuilder;

class SecurityIncident extends QueryBuilder
{
    protected string $table = 'hipaa_security_incidents';

    protected string $primaryKey = 'id';
}
