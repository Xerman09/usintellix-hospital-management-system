<?php

namespace App\Modules\Phq9\Models;

use App\Core\QueryBuilder;

class EncounterPhq9 extends QueryBuilder
{
    protected string $table = 'encounter_phq9';

    protected string $primaryKey = 'id';
}
