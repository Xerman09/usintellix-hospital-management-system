<?php

declare(strict_types=1);

namespace App\Modules\Workforce\Models;

use App\Core\QueryBuilder;

class WorkforceTraining extends QueryBuilder
{
    protected string $table = 'hipaa_workforce_trainings';

    protected string $primaryKey = 'id';
}
