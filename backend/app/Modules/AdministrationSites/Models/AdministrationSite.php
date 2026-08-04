<?php

namespace App\Modules\AdministrationSites\Models;

use App\Core\QueryBuilder;

class AdministrationSite extends QueryBuilder
{
    protected string $table = 'administration_sites';

    protected string $primaryKey = 'id';
}
