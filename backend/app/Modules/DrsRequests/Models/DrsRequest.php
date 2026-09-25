<?php

namespace App\Modules\DrsRequests\Models;

use App\Core\QueryBuilder;

class DrsRequest extends QueryBuilder
{
    protected string $table = 'hipaa_drs_access_requests';

    protected string $primaryKey = 'id';
}
