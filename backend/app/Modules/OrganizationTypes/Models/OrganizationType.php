<?php

namespace App\Modules\OrganizationTypes\Models;

use App\Core\QueryBuilder;

class OrganizationType extends QueryBuilder
{
    protected string $table = 'organization_types';

    protected string $primaryKey = 'id';
}
