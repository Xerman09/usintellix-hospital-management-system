<?php

use App\Core\Router;

// Create router instance
$router = new Router();

/*
|--------------------------------------------------------------------------
| Module Routes
|--------------------------------------------------------------------------
*/

require_once __DIR__ . '/../app/Modules/Auth/routes.php';
require_once __DIR__ . '/../app/Modules/Dashboard/routes.php';
// Future modules
// require_once __DIR__ . '/../app/Modules/Dashboard/routes.php';
// require_once __DIR__ . '/../app/Modules/Patients/routes.php';
// require_once __DIR__ . '/../app/Modules/Doctors/routes.php';

return $router;