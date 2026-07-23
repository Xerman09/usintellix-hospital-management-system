<?php

namespace App\Modules\FacilityBillings\Models;

use App\Core\QueryBuilder;

class FacilityBilling extends QueryBuilder
{
    protected string $table = 'facility_billings';

    protected string $primaryKey = 'id';
}
