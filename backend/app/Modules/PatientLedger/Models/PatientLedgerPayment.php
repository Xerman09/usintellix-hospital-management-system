<?php

namespace App\Modules\PatientLedger\Models;

use App\Core\QueryBuilder;

class PatientLedgerPayment extends QueryBuilder
{
    protected string $table = 'patient_ledger_payments';

    protected string $primaryKey = 'id';

    /**
     * Fields automatically encrypted at rest using AES-256-GCM (HIPAA § 164.312(a)(2)(iv)).
     */
    protected array $encryptedFields = ['card_number', 'card_expiry', 'card_cvv'];
}
