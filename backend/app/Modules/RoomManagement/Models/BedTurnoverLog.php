<?php

namespace App\Modules\RoomManagement\Models;

use App\Core\Model;

class BedTurnoverLog extends Model
{
    protected string $table = 'bed_turnover_logs';

    protected array $fillable = [
        'turnover_number',
        'bed_id',
        'room_id',
        'ward_id',
        'admission_id',
        'vacated_at',
        'vacated_by',
        'assigned_evs_staff_id',
        'assigned_evs_staff_name',
        'cleaning_priority',
        'cleaning_type',
        'status',
        'cleaning_started_at',
        'cleaning_completed_at',
        'cleaned_by',
        'checklist',
        'inspected_at',
        'inspected_by',
        'inspector_name',
        'inspection_status',
        'released_at',
        'cleaning_duration_minutes',
        'turnover_duration_minutes',
        'target_sla_minutes',
        'is_sla_breached',
        'notes'
    ];
}
