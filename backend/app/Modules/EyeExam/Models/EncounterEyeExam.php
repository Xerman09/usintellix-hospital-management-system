<?php

namespace App\Modules\EyeExam\Models;

use App\Core\QueryBuilder;

class EncounterEyeExam extends QueryBuilder
{
    protected string $table = 'encounter_eye_exams';

    protected string $primaryKey = 'id';

    /**
     * Fields encrypted or handled as sensitive clinical data under HIPAA.
     */
    protected array $encryptedFields = [
        'chief_complaint',
        'new_dx'
    ];
}
