<?php

namespace App\Modules\RelatedPersons\Models;

use App\Core\QueryBuilder;

class RelatedPerson extends QueryBuilder
{
    protected string $table = 'related_persons';

    protected string $primaryKey = 'id';
}
