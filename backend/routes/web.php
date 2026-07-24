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
require_once __DIR__ . '/../app/Modules/Facilities/routes.php';
require_once __DIR__ . '/../app/Modules/FacilityBillings/routes.php';
require_once __DIR__ . '/../app/Modules/Allergies/routes.php';
require_once __DIR__ . '/../app/Modules/MedicalProblems/routes.php';
require_once __DIR__ . '/../app/Modules/Medications/routes.php';
require_once __DIR__ . '/../app/Modules/PayerTypes/routes.php';
require_once __DIR__ . '/../app/Modules/X12Partners/routes.php';
require_once __DIR__ . '/../app/Modules/CqmSourceOfPayments/routes.php';
require_once __DIR__ . '/../app/Modules/Insurances/routes.php';
require_once __DIR__ . '/../app/Modules/OrganizationTypes/routes.php';
require_once __DIR__ . '/../app/Modules/PosCodes/routes.php';
// Future modules
// require_once __DIR__ . '/../app/Modules/Doctors/routes.php';

return $router;