<?php

namespace App\Modules\OpdSpecialtyConsultations\Models;

use App\Core\QueryBuilder;

class OpdSpecialtyConsultationTemplate extends QueryBuilder
{
    protected string $table = 'opd_specialty_consultation_templates';

    protected string $primaryKey = 'id';
}
