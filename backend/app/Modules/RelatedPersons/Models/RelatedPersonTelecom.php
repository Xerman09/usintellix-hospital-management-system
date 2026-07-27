<?php

namespace App\Modules\RelatedPersons\Models;

use App\Core\QueryBuilder;

class RelatedPersonTelecom extends QueryBuilder
{
    protected string $table = 'related_person_telecoms';

    protected string $primaryKey = 'id';
}
