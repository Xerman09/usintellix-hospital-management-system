<?php

declare(strict_types=1);

namespace App\Modules\HipaaOfficers\Models;

use App\Core\QueryBuilder;

class HipaaOfficerDesignation extends QueryBuilder
{
    protected string $table = 'hipaa_officer_designations';

    protected string $primaryKey = 'id';
}
