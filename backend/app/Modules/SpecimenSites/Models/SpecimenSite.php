<?php

namespace App\Modules\SpecimenSites\Models;

use App\Core\QueryBuilder;

class SpecimenSite extends QueryBuilder
{
    protected string $table = 'specimen_sites';

    protected string $primaryKey = 'id';
}
