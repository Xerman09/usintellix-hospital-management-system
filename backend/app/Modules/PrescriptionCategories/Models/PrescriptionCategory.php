<?php

namespace App\Modules\PrescriptionCategories\Models;

use App\Core\QueryBuilder;

class PrescriptionCategory extends QueryBuilder
{
    protected string $table = 'prescription_categories';

    protected string $primaryKey = 'id';
}
