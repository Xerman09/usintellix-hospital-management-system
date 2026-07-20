<?php

namespace App\Modules\Patients\Models;

use App\Core\QueryBuilder;

class Patient extends QueryBuilder
{
    protected string $table = 'patients';

    protected string $primaryKey = 'id';
}
