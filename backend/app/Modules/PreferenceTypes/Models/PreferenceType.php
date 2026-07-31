<?php

namespace App\Modules\PreferenceTypes\Models;

use App\Core\QueryBuilder;

class PreferenceType extends QueryBuilder
{
    protected string $table = 'preference_types';

    protected string $primaryKey = 'id';
}
