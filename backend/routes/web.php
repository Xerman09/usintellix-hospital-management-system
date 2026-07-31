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
require_once __DIR__ . '/../app/Modules/Rooms/routes.php';
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
require_once __DIR__ . '/../app/Modules/HealthRecords/routes.php';
require_once __DIR__ . '/../app/Modules/PatientAllergies/routes.php';
require_once __DIR__ . '/../app/Modules/PatientMedicalProblems/routes.php';
require_once __DIR__ . '/../app/Modules/PatientHealthConcerns/routes.php';
require_once __DIR__ . '/../app/Modules/Encounters/routes.php';
require_once __DIR__ . '/../app/Modules/DischargeDispositions/routes.php';
require_once __DIR__ . '/../app/Modules/PatientMedications/routes.php';
require_once __DIR__ . '/../app/Modules/PatientPrescriptions/routes.php';
require_once __DIR__ . '/../app/Modules/PrescriptionCategories/routes.php';
require_once __DIR__ . '/../app/Modules/Icd10Diagnoses/routes.php';
require_once __DIR__ . '/../app/Modules/CqmValuesets/routes.php';
require_once __DIR__ . '/../app/Modules/Messaging/routes.php';
require_once __DIR__ . '/../app/Modules/RelatedPersons/routes.php';
require_once __DIR__ . '/../app/Modules/Disclosures/routes.php';
require_once __DIR__ . '/../app/Modules/Amendments/routes.php';
require_once __DIR__ . '/../app/Modules/CareTeams/routes.php';
require_once __DIR__ . '/../app/Modules/PreferenceTypes/routes.php';
require_once __DIR__ . '/../app/Modules/Profile/routes.php';
require_once __DIR__ . '/../app/Modules/BusinessSettings/routes.php';
require_once __DIR__ . '/../app/Modules/Recalls/routes.php';
// Future modules
// require_once __DIR__ . '/../app/Modules/Doctors/routes.php';
require_once __DIR__ . '/../app/Modules/PracticeRules/routes.php';
require_once __DIR__ . '/../app/Modules/ProviderCategories/routes.php';

return $router;