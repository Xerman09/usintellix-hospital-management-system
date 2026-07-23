<?php

namespace App\Modules\VisitTypes\Models;

use App\Core\QueryBuilder;

class VisitType extends QueryBuilder
{
    protected string $table = 'visit_types';

    protected string $primaryKey = 'id';
}
