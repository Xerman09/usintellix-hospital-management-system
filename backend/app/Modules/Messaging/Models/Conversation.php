<?php

namespace App\Modules\Messaging\Models;

use App\Core\QueryBuilder;

class Conversation extends QueryBuilder
{
    protected string $table = 'conversations';

    protected string $primaryKey = 'id';
}
