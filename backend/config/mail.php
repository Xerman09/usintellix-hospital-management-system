<?php

$envPath = __DIR__ . '/../.env';
$env = file_exists($envPath) ? parse_ini_file($envPath) : [];

return [
    'host' => $env['MAIL_HOST'] ?? '',
    'port' => (int) ($env['MAIL_PORT'] ?? 465),
    'encryption' => $env['MAIL_ENCRYPTION'] ?? 'ssl',
    'username' => $env['MAIL_USERNAME'] ?? '',
    'password' => $env['MAIL_PASSWORD'] ?? '',
    'from_name' => $env['MAIL_FROM_NAME'] ?? 'Intellix Hospital System',
];
