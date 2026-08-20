<?php

namespace App\Modules\PatientDocuments\Models;

use App\Core\QueryBuilder;

class PatientDocument extends QueryBuilder
{
    protected string $table = 'patient_documents';

    protected string $primaryKey = 'id';
}
