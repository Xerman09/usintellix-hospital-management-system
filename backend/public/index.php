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

// An uncaught exception anywhere in a controller/service (a missing
// table, a bad query, etc.) would otherwise print a raw PHP stack trace
// as the response body with a 200 status -- the frontend expects every
// response to be JSON, so that shows up as "Unexpected server response"
// instead of a real error message. Catch it here and always answer with
// the same {success, message} shape the rest of the API uses.
try {
    $router->dispatch(
        $_SERVER['REQUEST_METHOD'],
        $requestUri
    );
} catch (\Throwable $e) {
    error_log(
        'Unhandled exception: ' . $e->getMessage()
        . ' in ' . $e->getFile() . ':' . $e->getLine()
    );

    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json');
    }

    echo json_encode([
        'success' => false,
        'message' => 'Something went wrong. Please try again.'
    ]);
}