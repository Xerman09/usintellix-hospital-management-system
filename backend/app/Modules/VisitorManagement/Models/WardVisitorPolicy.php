<?php

declare(strict_types=1);

namespace App\Modules\VisitorManagement\Models;

use App\Core\QueryBuilder;

class WardVisitorPolicy extends QueryBuilder
{
    protected string $table = 'ward_visitor_policies';
    protected string $primaryKey = 'id';
}
