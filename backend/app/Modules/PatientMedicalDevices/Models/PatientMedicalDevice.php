<?php

namespace App\Modules\PatientMedicalDevices\Models;

use App\Core\QueryBuilder;

class PatientMedicalDevice extends QueryBuilder
{
    protected string $table = 'patient_medical_devices';

    protected string $primaryKey = 'id';
}
