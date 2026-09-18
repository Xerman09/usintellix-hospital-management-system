<?php

namespace App\Modules\TemplateMaintenance\Models;

use App\Core\QueryBuilder;

class TemplateGroupTemplate extends QueryBuilder
{
    protected string $table = 'template_group_templates';

    protected string $primaryKey = 'id';
}
