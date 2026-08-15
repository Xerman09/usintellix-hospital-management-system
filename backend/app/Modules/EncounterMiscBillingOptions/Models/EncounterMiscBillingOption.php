<?php

namespace App\Modules\EncounterMiscBillingOptions\Models;

use App\Core\QueryBuilder;

class EncounterMiscBillingOption extends QueryBuilder
{
    protected string $table = 'encounter_misc_billing_options';

    protected string $primaryKey = 'id';
}
