<?php

namespace App\Modules\DrugInventory\Models;

use App\Core\QueryBuilder;

class DrugPrescriptionTemplate extends QueryBuilder
{
    protected string $table = 'drug_prescription_templates';

    protected string $primaryKey = 'id';
}
