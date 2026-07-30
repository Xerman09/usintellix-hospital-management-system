<?php

namespace App\Modules\CareTeams\Models;

use App\Core\QueryBuilder;

class CareTeamMember extends QueryBuilder
{
    protected string $table = 'care_team_members';

    protected string $primaryKey = 'id';
}
