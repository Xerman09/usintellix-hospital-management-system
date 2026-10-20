<?php

namespace App\Modules\OpdSpecialtyConsultations\Models;

use App\Core\QueryBuilder;

class OpdConsultationSpecialtyData extends QueryBuilder
{
    protected string $table = 'opd_consultation_specialty_data';

    protected string $primaryKey = 'id';

    /**
     * Fields automatically encrypted at rest using AES-256-GCM (HIPAA § 164.312(a)(2)(iv)).
     */
    protected array $encryptedFields = [
        'neurovascular_status',
        'special_orthopedic_tests',
        'clinical_data',
    ];
}
