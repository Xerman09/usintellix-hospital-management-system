<?php

namespace App\Modules\Patients\Models;

use App\Core\QueryBuilder;

class Patient extends QueryBuilder
{
    protected string $table = 'patients';

    protected string $primaryKey = 'id';

    /**
     * Fields automatically encrypted at rest using AES-256-GCM (HIPAA § 164.312(a)(2)(iv)).
     */
    protected array $encryptedFields = ['ssn', 'national_id'];
}
