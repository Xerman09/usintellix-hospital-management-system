<?php

namespace App\Modules\PatientFlow\Models;

use App\Core\QueryBuilder;

class AppointmentQueueToken extends QueryBuilder
{
    protected string $table = 'appointment_queue_tokens';

    protected string $primaryKey = 'id';
}
