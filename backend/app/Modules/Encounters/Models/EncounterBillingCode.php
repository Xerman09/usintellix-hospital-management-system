<?php

namespace App\Modules\Encounters\Models;

use App\Core\QueryBuilder;

class EncounterBillingCode extends QueryBuilder
{
    protected string $table = 'encounter_billing_codes';

    protected string $primaryKey = 'id';
}
