<?php

declare(strict_types=1);

namespace App\Modules\Deidentification\Models;

use App\Core\QueryBuilder;

class DeidentifiedExport extends QueryBuilder
{
    protected string $table = 'hipaa_deidentified_exports';

    protected string $primaryKey = 'id';
}
