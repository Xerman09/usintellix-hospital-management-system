<?php

use App\Core\Env;

return [

    'name' => Env::get('APP_NAME', 'Hospital System'),

    'environment' => Env::get('APP_ENV', 'development'),

    'debug' => Env::get('APP_DEBUG', true),

    'url' => Env::get('APP_URL', 'http://localhost'),

    'timezone' => 'Asia/Manila',

];