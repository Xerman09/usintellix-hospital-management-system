<?php

namespace App\Modules\Announcements\Models;

use App\Core\QueryBuilder;

class Announcement extends QueryBuilder
{
    protected string $table = 'announcements';

    protected string $primaryKey = 'id';
}