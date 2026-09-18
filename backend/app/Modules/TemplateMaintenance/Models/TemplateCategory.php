<?php

namespace App\Modules\TemplateMaintenance\Models;

use App\Core\QueryBuilder;

class TemplateCategory extends QueryBuilder
{
    protected string $table = 'template_categories';

    protected string $primaryKey = 'id';
}
