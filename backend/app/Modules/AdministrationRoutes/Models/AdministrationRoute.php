<?php

namespace App\Modules\AdministrationRoutes\Models;

use App\Core\QueryBuilder;

class AdministrationRoute extends QueryBuilder
{
    protected string $table = 'administration_routes';

    protected string $primaryKey = 'id';
}
