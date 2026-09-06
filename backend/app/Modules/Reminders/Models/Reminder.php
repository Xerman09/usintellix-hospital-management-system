<?php

namespace App\Modules\Reminders\Models;

use App\Core\QueryBuilder;

class Reminder extends QueryBuilder
{
    protected string $table = 'reminders';

    protected string $primaryKey = 'id';
}
