<?php

namespace App\Modules\BusinessSettings\Models;

use App\Core\QueryBuilder;

class BusinessSetting extends QueryBuilder
{
    protected string $table = 'business_settings';

    protected string $primaryKey = 'id';
}
