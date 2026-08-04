<?php

namespace App\Modules\CvxCodes\Models;

use App\Core\QueryBuilder;

class CvxCode extends QueryBuilder
{
    protected string $table = 'cvx_codes';

    protected string $primaryKey = 'id';
}
