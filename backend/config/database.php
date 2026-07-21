<?php

$envPath = __DIR__ . '/../.env';
$env = file_exists($envPath) ? parse_ini_file($envPath) : [];

return [
    'host' => $env['DB_HOST'] ?? 'localhost',
    'port' => $env['DB_PORT'] ?? 3306,
    'database' => $env['DB_DATABASE'] ?? 'usintellix_hospital_management_system',
    'username' => $env['DB_USERNAME'] ?? 'root',
    'password' => $env['DB_PASSWORD'] ?? '',
    'charset' => $env['DB_CHARSET'] ?? 'utf8mb4',
];