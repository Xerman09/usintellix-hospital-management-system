<?php

namespace App\Modules\Users\Models;

use App\Core\QueryBuilder;

class User extends QueryBuilder
{
    protected string $table = 'users';

    protected string $primaryKey = 'id';
}