<?php

namespace App\Modules\PatientReminders\Models;

use App\Core\QueryBuilder;

class PatientReminder extends QueryBuilder
{
    protected string $table = 'patient_reminders';

    protected string $primaryKey = 'id';
}
