<?php

namespace App\Modules\InpatientAdmissions\Models;

use App\Core\QueryBuilder;

class InpatientProgressNote extends QueryBuilder
{
    protected string $table = 'inpatient_progress_notes';

    protected string $primaryKey = 'id';
}
