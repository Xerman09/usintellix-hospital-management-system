<?php

declare(strict_types=1);

namespace App\Modules\Deidentification\Models;

use App\Core\QueryBuilder;

class ReidentificationVault extends QueryBuilder
{
    protected string $table = 'hipaa_reidentification_vault';

    protected string $primaryKey = 'id';
}
