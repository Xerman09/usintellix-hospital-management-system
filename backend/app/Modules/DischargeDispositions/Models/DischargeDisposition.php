<?php

namespace App\Modules\DischargeDispositions\Models;

use App\Core\QueryBuilder;

class DischargeDisposition extends QueryBuilder
{
    protected string $table = 'discharge_dispositions';

    protected string $primaryKey = 'id';
}
