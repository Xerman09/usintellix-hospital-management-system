<?php

namespace App\Modules\Rooms\Models;

use App\Core\QueryBuilder;

class Room extends QueryBuilder
{
    protected string $table = 'rooms';

    protected string $primaryKey = 'id';
}
