<?php

namespace App\Modules\EdiFiles\Models;

use App\Core\QueryBuilder;

class EdiFile extends QueryBuilder
{
    protected string $table = 'edi_files';

    protected string $primaryKey = 'id';
}
