<?php

namespace App\Modules\EncounterSections\Models;

use App\Core\QueryBuilder;

class EncounterSection extends QueryBuilder
{
    protected string $table = 'encounter_sections';

    protected string $primaryKey = 'id';
}
