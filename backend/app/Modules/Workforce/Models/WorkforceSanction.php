<?php

declare(strict_types=1);

namespace App\Modules\Workforce\Models;

use App\Core\QueryBuilder;

class WorkforceSanction extends QueryBuilder
{
    protected string $table = 'hipaa_workforce_sanctions';

    protected string $primaryKey = 'id';
}
