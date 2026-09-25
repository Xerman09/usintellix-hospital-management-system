<?php

declare(strict_types=1);

namespace App\Modules\Backup\Models;

use App\Core\QueryBuilder;

class BackupLog extends QueryBuilder
{
    protected string $table = 'hipaa_backup_logs';

    protected string $primaryKey = 'id';
}
