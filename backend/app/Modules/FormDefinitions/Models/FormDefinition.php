<?php

namespace App\Modules\FormDefinitions\Models;

use App\Core\QueryBuilder;

class FormDefinition extends QueryBuilder
{
    protected string $table = 'form_definitions';

    protected string $primaryKey = 'id';
}
