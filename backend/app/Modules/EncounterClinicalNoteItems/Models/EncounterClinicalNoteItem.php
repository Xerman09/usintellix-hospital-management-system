<?php

namespace App\Modules\EncounterClinicalNoteItems\Models;

use App\Core\QueryBuilder;

class EncounterClinicalNoteItem extends QueryBuilder
{
    protected string $table = 'encounter_clinical_note_items';

    protected string $primaryKey = 'id';
}
