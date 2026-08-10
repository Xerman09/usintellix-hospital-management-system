<?php

namespace App\Modules\Auth\Models;

use App\Core\QueryBuilder;

class TwoFactorCode extends QueryBuilder
{
    protected string $table = 'two_factor_codes';

    protected string $primaryKey = 'id';
}
