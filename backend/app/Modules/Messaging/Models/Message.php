<?php

namespace App\Modules\Messaging\Models;

use App\Core\QueryBuilder;

class Message extends QueryBuilder
{
    protected string $table = 'messages';

    protected string $primaryKey = 'id';
}
