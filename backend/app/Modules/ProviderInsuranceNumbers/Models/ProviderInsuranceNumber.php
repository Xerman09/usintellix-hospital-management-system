<?php

namespace App\Modules\ProviderInsuranceNumbers\Models;

use App\Core\QueryBuilder;

class ProviderInsuranceNumber extends QueryBuilder
{
    protected string $table = 'provider_insurance_numbers';

    protected string $primaryKey = 'id';
}
