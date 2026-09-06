<?php

namespace App\Modules\Reminders\Models;

use App\Core\QueryBuilder;

class ReminderRecipient extends QueryBuilder
{
    protected string $table = 'reminder_recipients';

    protected string $primaryKey = 'id';
}
