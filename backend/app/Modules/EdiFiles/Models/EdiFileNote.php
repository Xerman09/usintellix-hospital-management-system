<?php

namespace App\Modules\EdiFiles\Models;

use App\Core\QueryBuilder;

class EdiFileNote extends QueryBuilder
{
    protected string $table = 'edi_file_notes';

    protected string $primaryKey = 'id';
}
