<?php

namespace App\Modules\Immunizations\Models;

use App\Core\QueryBuilder;

class Immunization extends QueryBuilder
{
    protected string $table = 'immunizations';

    protected string $primaryKey = 'id';
}
