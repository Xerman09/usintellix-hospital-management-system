<?php

namespace App\Modules\TemplateMaintenance\Models;

use App\Core\QueryBuilder;

class TemplateProfile extends QueryBuilder
{
    protected string $table = 'template_profiles';

    protected string $primaryKey = 'id';
}
