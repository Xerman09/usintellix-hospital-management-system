<?php

namespace App\Modules\AclGroups\Models;

use App\Core\QueryBuilder;

class AclGroupMember extends QueryBuilder
{
    protected string $table = 'acl_group_members';

    protected string $primaryKey = 'id';
}
