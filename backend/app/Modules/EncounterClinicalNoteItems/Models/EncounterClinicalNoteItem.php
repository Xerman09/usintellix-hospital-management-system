<?php

namespace App\Modules\EncounterClinicalNoteItems\Models;

use App\Core\QueryBuilder;

class EncounterClinicalNoteItem extends QueryBuilder
{
    protected string $table = 'encounter_clinical_note_items';

    protected string $primaryKey = 'id';

    /**
     * Fields automatically encrypted at rest using AES-256-GCM (HIPAA § 164.312(a)(2)(iv)).
     */
    protected array $encryptedFields = ['narrative'];
}
