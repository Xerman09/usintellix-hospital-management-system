<?php

namespace App\Modules\RoomManagement\Models;

use App\Core\Model;

class Building extends Model
{
    protected string $table = 'hospital_buildings';

    protected array $fillable = [
        'facility_id',
        'building_code',
        'building_name',
        'total_floors',
        'location_description',
        'is_active',
        'created_by'
    ];
}
