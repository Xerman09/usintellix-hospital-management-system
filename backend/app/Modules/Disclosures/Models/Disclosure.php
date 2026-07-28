<?php

namespace App\Modules\Disclosures\Models;

use App\Core\QueryBuilder;

class Disclosure extends QueryBuilder
{
    protected string $table = 'disclosures';

    protected string $primaryKey = 'id';
}
