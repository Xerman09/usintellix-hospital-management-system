<?php

namespace App\Modules\PatientLedger\Models;

use App\Core\QueryBuilder;

class PatientLedgerPayment extends QueryBuilder
{
    protected string $table = 'patient_ledger_payments';

    protected string $primaryKey = 'id';
}
