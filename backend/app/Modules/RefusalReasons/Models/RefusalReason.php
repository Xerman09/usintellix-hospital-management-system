<?php

namespace App\Modules\RefusalReasons\Models;

use App\Core\QueryBuilder;

class RefusalReason extends QueryBuilder
{
    protected string $table = 'refusal_reasons';

    protected string $primaryKey = 'id';
}
