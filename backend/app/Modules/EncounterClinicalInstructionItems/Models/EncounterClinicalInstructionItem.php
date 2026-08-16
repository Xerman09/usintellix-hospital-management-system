<?php

namespace App\Modules\EncounterClinicalInstructionItems\Models;

use App\Core\QueryBuilder;

class EncounterClinicalInstructionItem extends QueryBuilder
{
    protected string $table = 'encounter_clinical_instruction_items';

    protected string $primaryKey = 'id';
}
