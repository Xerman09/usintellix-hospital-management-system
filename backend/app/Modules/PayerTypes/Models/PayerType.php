<?php

namespace App\Modules\PayerTypes\Models;

use App\Core\QueryBuilder;

class PayerType extends QueryBuilder
{
    protected string $table = 'payer_types';

    protected string $primaryKey = 'id';
}
