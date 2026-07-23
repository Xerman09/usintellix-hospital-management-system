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
require_once __DIR__ . '/../app/Modules/Employees/routes.php';
require_once __DIR__ . '/../app/Modules/Roles/routes.php';
require_once __DIR__ . '/../app/Modules/Departments/routes.php';
require_once __DIR__ . '/../app/Modules/Patients/routes.php';
require_once __DIR__ . '/../app/Modules/Providers/routes.php';
require_once __DIR__ . '/../app/Modules/Appointments/routes.php';
require_once __DIR__ . '/../app/Modules/VisitCategories/routes.php';
require_once __DIR__ . '/../app/Modules/Classes/routes.php';
require_once __DIR__ . '/../app/Modules/VisitTypes/routes.php';
// Future modules
// require_once __DIR__ . '/../app/Modules/Doctors/routes.php';

return $router;