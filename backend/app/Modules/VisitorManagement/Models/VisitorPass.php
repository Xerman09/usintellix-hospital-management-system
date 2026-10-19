<?php

declare(strict_types=1);

namespace App\Modules\VisitorManagement\Models;

use App\Core\QueryBuilder;

class VisitorPass extends QueryBuilder
{
    protected string $table = 'visitor_passes';
    protected string $primaryKey = 'id';
}
