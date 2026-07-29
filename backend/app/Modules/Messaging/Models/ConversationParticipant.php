<?php

namespace App\Modules\Messaging\Models;

use App\Core\QueryBuilder;

class ConversationParticipant extends QueryBuilder
{
    protected string $table = 'conversation_participants';

    protected string $primaryKey = 'id';
}
