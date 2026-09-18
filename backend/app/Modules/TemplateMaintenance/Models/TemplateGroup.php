<?php

namespace App\Modules\TemplateMaintenance\Models;

use App\Core\QueryBuilder;

class TemplateGroup extends QueryBuilder
{
    protected string $table = 'template_groups';

    protected string $primaryKey = 'id';
}
