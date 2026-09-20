<?php

namespace App\Modules\RoomManagement\Models;

use App\Core\Model;

class Room extends Model
{
    protected string $table = 'hospital_rooms';

    protected array $fillable = [
        'building_id',
        'ward_id',
        'floor_number',
        'room_number',
        'room_name',
        'room_type',
        'daily_rate',
        'max_beds',
        'gender_restriction',
        'status',
        'amenities',
        'is_active'
    ];
}
