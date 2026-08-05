<?php

namespace App\Modules\Pharmacies\Models;

use App\Core\QueryBuilder;

class Pharmacy extends QueryBuilder
{
    protected string $table = 'pharmacies';

    protected string $primaryKey = 'id';
}
