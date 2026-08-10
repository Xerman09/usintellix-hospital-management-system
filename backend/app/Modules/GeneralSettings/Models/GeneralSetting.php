<?php

namespace App\Modules\GeneralSettings\Models;

use App\Core\QueryBuilder;

class GeneralSetting extends QueryBuilder
{
    protected string $table = 'general_settings';

    protected string $primaryKey = 'id';
}
