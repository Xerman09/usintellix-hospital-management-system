<?php

namespace App\Modules\ProcedureOrderConfigs\Models;

use App\Core\QueryBuilder;

class ProcedureOrderConfig extends QueryBuilder
{
    protected string $table = 'procedure_order_configs';

    protected string $primaryKey = 'id';
}
