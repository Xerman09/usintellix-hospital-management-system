<?php

namespace App\Modules\BusinessAssociates\Models;

use App\Core\QueryBuilder;

class BusinessAssociate extends QueryBuilder
{
    protected string $table = 'hipaa_business_associates';

    protected string $primaryKey = 'id';
}
