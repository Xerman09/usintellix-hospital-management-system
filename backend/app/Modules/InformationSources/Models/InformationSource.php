<?php

namespace App\Modules\InformationSources\Models;

use App\Core\QueryBuilder;

class InformationSource extends QueryBuilder
{
    protected string $table = 'information_sources';

    protected string $primaryKey = 'id';
}
