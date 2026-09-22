<?php

declare(strict_types=1);

namespace App\Modules\PatientPsychiatricNotes\Models;

use App\Core\QueryBuilder;

class PatientPsychiatricNote extends QueryBuilder
{
    protected string $table = 'patient_psychiatric_notes';

    protected string $primaryKey = 'id';

    /**
     * Fields automatically encrypted at rest using AES-256-GCM (HIPAA § 164.312(a)(2)(iv)).
     */
    protected array $encryptedFields = [
        'symptoms',
        'psychiatric_notes',
        'treatment_plan',
        'confidential_remarks'
    ];
}
