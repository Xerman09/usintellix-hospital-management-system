<?php

namespace App\Modules\PatientTransactions\Models;

use App\Core\QueryBuilder;

class PatientTransaction extends QueryBuilder
{
    protected string $table = 'patient_transactions';

    protected string $primaryKey = 'id';
}
