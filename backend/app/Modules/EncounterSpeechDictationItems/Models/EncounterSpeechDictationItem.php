<?php

namespace App\Modules\EncounterSpeechDictationItems\Models;

use App\Core\QueryBuilder;

class EncounterSpeechDictationItem extends QueryBuilder
{
    protected string $table = 'encounter_speech_dictation_items';

    protected string $primaryKey = 'id';
}
