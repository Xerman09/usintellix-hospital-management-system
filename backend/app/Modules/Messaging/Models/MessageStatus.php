<?php

namespace App\Modules\Messaging\Models;

use App\Core\QueryBuilder;

class MessageStatus extends QueryBuilder
{
    protected string $table = 'message_statuses';

    protected string $primaryKey = 'id';
}
