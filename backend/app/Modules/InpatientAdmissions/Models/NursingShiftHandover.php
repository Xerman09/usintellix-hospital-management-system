<?php

namespace App\Modules\InpatientAdmissions\Models;

use App\Core\QueryBuilder;

class NursingShiftHandover extends QueryBuilder
{
    protected string $table = 'nursing_shift_handovers';

    protected string $primaryKey = 'id';
}
