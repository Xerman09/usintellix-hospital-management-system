<?php

$envPath = __DIR__ . '/../.env';
$env = file_exists($envPath) ? parse_ini_file($envPath) : [];

return [

    'name' => $env['APP_NAME'] ?? 'Hospital System',

    'environment' => $env['APP_ENV'] ?? 'development',

    'debug' => isset($env['APP_DEBUG']) ? filter_var($env['APP_DEBUG'], FILTER_VALIDATE_BOOLEAN) : true,

    'url' => $env['APP_URL'] ?? 'http://localhost',

    'timezone' => 'Asia/Manila',

];