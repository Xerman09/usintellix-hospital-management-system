<?php

namespace App\Modules\VisitCategories\Models;

use App\Core\QueryBuilder;

class VisitCategory extends QueryBuilder
{
    protected string $table = 'visit_categories';

    protected string $primaryKey = 'id';
}
