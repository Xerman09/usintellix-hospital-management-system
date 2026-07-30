<?php

namespace App\Modules\CareTeams\Models;

use App\Core\QueryBuilder;

class CareTeam extends QueryBuilder
{
    protected string $table = 'care_teams';

    protected string $primaryKey = 'id';
}
