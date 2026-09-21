<?php

use App\Core\Env;

return [
    'host' => Env::get('MAIL_HOST', ''),
    'port' => (int) Env::get('MAIL_PORT', 465),
    'encryption' => Env::get('MAIL_ENCRYPTION', 'ssl'),
    'username' => Env::get('MAIL_USERNAME', ''),
    'password' => Env::get('MAIL_PASSWORD', ''),
    'from_name' => Env::get('MAIL_FROM_NAME', 'Intellix Hospital System'),
];
