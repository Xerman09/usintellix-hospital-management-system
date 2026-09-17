<?php

namespace App\Modules\PatientCarePreferences\Models;

use App\Core\QueryBuilder;

class PatientCarePreference extends QueryBuilder
{
    protected string $table = 'patient_care_preferences';

    protected string $primaryKey = 'id';
}
