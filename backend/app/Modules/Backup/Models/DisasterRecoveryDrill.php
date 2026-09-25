<?php

declare(strict_types=1);

namespace App\Modules\Backup\Models;

use App\Core\QueryBuilder;

class DisasterRecoveryDrill extends QueryBuilder
{
    protected string $table = 'hipaa_disaster_recovery_drills';

    protected string $primaryKey = 'id';
}
