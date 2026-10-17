<?php

declare(strict_types=1);

namespace App\Modules\Roles\Models;

use App\Core\QueryBuilder;

class RolePermission extends QueryBuilder
{
    protected string $table = 'role_permissions';

    protected string $primaryKey = 'id';
}
