<?php

namespace App\Modules\Messaging\Models;

use App\Core\QueryBuilder;

class MessageType extends QueryBuilder
{
    protected string $table = 'message_types';

    protected string $primaryKey = 'id';
}
