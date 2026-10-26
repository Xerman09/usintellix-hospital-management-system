<?php

namespace App\Modules\EquipmentAssets\Models;

use App\Core\QueryBuilder;

class BiomedWorkOrder extends QueryBuilder
{
    protected string $table = 'biomed_work_orders';

    protected string $primaryKey = 'id';
}
