<?php

namespace App\Modules\CompletionStatuses\Models;

use App\Core\QueryBuilder;

class CompletionStatus extends QueryBuilder
{
    protected string $table = 'completion_statuses';

    protected string $primaryKey = 'id';
}
