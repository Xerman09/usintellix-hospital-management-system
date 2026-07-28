<?php

namespace App\Modules\ProviderCategories\Models;

use App\Core\QueryBuilder;

class ProviderCategory extends QueryBuilder
{
    protected string $table = 'provider_categories';

    protected string $primaryKey = 'id';
}
