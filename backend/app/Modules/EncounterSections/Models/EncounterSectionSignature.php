<?php

namespace App\Modules\EncounterSections\Models;

use App\Core\QueryBuilder;

class EncounterSectionSignature extends QueryBuilder
{
    protected string $table = 'encounter_section_signatures';

    protected string $primaryKey = 'id';
}
