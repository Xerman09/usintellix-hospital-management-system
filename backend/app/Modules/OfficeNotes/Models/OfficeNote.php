<?php

namespace App\Modules\OfficeNotes\Models;

use App\Core\QueryBuilder;

class OfficeNote extends QueryBuilder
{
    protected string $table = 'office_notes';

    protected string $primaryKey = 'id';
}
