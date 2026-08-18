<?php

namespace App\Modules\EncounterSoapNotes\Models;

use App\Core\QueryBuilder;

class EncounterSoapNoteSignature extends QueryBuilder
{
    protected string $table = 'encounter_soap_note_signatures';

    protected string $primaryKey = 'id';
}
