<?php

namespace App\Modules\DocumentCategories\Models;

use App\Core\QueryBuilder;

class DocumentCategory extends QueryBuilder
{
    protected string $table = 'document_categories';

    protected string $primaryKey = 'id';
}
