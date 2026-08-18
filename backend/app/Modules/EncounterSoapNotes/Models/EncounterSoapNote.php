<?php

namespace App\Modules\EncounterSoapNotes\Models;

use App\Core\QueryBuilder;

class EncounterSoapNote extends QueryBuilder
{
    protected string $table = 'encounter_soap_notes';

    protected string $primaryKey = 'id';
}
