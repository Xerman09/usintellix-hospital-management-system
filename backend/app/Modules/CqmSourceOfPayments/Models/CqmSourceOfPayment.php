<?php

namespace App\Modules\CqmSourceOfPayments\Models;

use App\Core\QueryBuilder;

class CqmSourceOfPayment extends QueryBuilder
{
    protected string $table = 'cqm_source_of_payments';

    protected string $primaryKey = 'id';
}
