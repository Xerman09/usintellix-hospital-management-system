<?php

namespace App\Modules\BatchPayments\Models;

use App\Core\QueryBuilder;

class BatchPaymentAllocation extends QueryBuilder
{
    protected string $table = 'batch_payment_allocations';

    protected string $primaryKey = 'id';
}
