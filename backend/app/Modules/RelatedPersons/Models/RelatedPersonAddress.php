<?php

namespace App\Modules\RelatedPersons\Models;

use App\Core\QueryBuilder;

class RelatedPersonAddress extends QueryBuilder
{
    protected string $table = 'related_person_addresses';

    protected string $primaryKey = 'id';
}
