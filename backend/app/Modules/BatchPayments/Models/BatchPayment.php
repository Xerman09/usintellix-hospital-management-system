<?php

namespace App\Modules\BatchPayments\Models;

use App\Core\QueryBuilder;

class BatchPayment extends QueryBuilder
{
    protected string $table = 'batch_payments';

    protected string $primaryKey = 'id';
}
