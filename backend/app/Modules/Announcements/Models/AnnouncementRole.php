<?php

namespace App\Modules\Announcements\Models;

use App\Core\QueryBuilder;

class AnnouncementRole extends QueryBuilder
{
    protected string $table = 'announcement_roles';

    protected string $primaryKey = 'id';
}