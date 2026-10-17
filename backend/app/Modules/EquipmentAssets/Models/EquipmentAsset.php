<?php

namespace App\Modules\EquipmentAssets\Models;

use App\Core\QueryBuilder;

class EquipmentAsset extends QueryBuilder
{
    protected string $table = 'hospital_equipment_assets';

    protected string $primaryKey = 'id';
}
