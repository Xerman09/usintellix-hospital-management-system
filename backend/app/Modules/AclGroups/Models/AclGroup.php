<?php

namespace App\Modules\AclGroups\Models;

use App\Core\QueryBuilder;

class AclGroup extends QueryBuilder
{
    protected string $table = 'acl_groups';

    protected string $primaryKey = 'id';
}
