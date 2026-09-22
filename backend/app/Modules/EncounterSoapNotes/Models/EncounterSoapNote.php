<?php

namespace App\Modules\EncounterSoapNotes\Models;

use App\Core\QueryBuilder;

class EncounterSoapNote extends QueryBuilder
{
    protected string $table = 'encounter_soap_notes';

    protected string $primaryKey = 'id';

    /**
     * Fields automatically encrypted at rest using AES-256-GCM (HIPAA § 164.312(a)(2)(iv)).
     */
    protected array $encryptedFields = ['subjective', 'objective', 'assessment', 'plan'];
}
