<?php

namespace App\Modules\PatientReminders\Models;

use App\Core\QueryBuilder;

class PatientReminderAction extends QueryBuilder
{
    protected string $table = 'patient_reminder_actions';

    protected string $primaryKey = 'id';
}
