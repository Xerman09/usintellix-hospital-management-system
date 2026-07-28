<?php

declare(strict_types=1);

require_once __DIR__ . '/../app/Core/Autoload.php';


use App\Core\Cors;


Cors::handle();


$router = require __DIR__ . '/../routes/web.php';


$basePath = str_replace('/index.php', '', $_SERVER['SCRIPT_NAME']);
$requestUri = $_SERVER['REQUEST_URI'];

if (strpos($requestUri, $basePath) === 0) {
    $requestUri = substr($requestUri, strlen($basePath));
}

if (empty($requestUri)) {
    $requestUri = '/';
}

$router->dispatch(
    $_SERVER['REQUEST_METHOD'],
    $requestUri
);