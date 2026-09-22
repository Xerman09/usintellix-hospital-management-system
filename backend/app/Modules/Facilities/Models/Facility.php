<?php

namespace App\Modules\Facilities\Models;

use App\Core\QueryBuilder;

class Facility extends QueryBuilder
{
    protected string $table = 'facilities';

    protected string $primaryKey = 'id';

    /**
     * Fields automatically encrypted at rest using AES-256-GCM (HIPAA § 164.312(a)(2)(iv)).
     */
    protected array $encryptedFields = ['tax_id', 'iban'];
}
