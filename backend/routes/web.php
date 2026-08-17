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
require_once __DIR__ . '/../app/Modules/ScreeningTools/routes.php';
require_once __DIR__ . '/../app/Modules/Surgeries/routes.php';
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
require_once __DIR__ . '/../app/Modules/PriceLevels/routes.php';
require_once __DIR__ . '/../app/Modules/HealthRecords/routes.php';
require_once __DIR__ . '/../app/Modules/PatientAllergies/routes.php';
require_once __DIR__ . '/../app/Modules/PatientMedicalProblems/routes.php';
require_once __DIR__ . '/../app/Modules/PatientHealthConcerns/routes.php';
require_once __DIR__ . '/../app/Modules/PatientTransactions/routes.php';
require_once __DIR__ . '/../app/Modules/PatientMedicalDevices/routes.php';
require_once __DIR__ . '/../app/Modules/PatientSurgeries/routes.php';
require_once __DIR__ . '/../app/Modules/PatientDentalIssues/routes.php';
require_once __DIR__ . '/../app/Modules/GeneralSettings/routes.php';
require_once __DIR__ . '/../app/Modules/Encounters/routes.php';
require_once __DIR__ . '/../app/Modules/EncounterSections/routes.php';
require_once __DIR__ . '/../app/Modules/EncounterVitals/routes.php';
require_once __DIR__ . '/../app/Modules/EncounterCarePlanItems/routes.php';
require_once __DIR__ . '/../app/Modules/EncounterClinicalInstructionItems/routes.php';
require_once __DIR__ . '/../app/Modules/EncounterClinicalNoteItems/routes.php';
require_once __DIR__ . '/../app/Modules/EncounterMiscBillingOptions/routes.php';
require_once __DIR__ . '/../app/Modules/DischargeDispositions/routes.php';
require_once __DIR__ . '/../app/Modules/PatientMedications/routes.php';
require_once __DIR__ . '/../app/Modules/PatientInsurances/routes.php';
require_once __DIR__ . '/../app/Modules/PatientPrescriptions/routes.php';
require_once __DIR__ . '/../app/Modules/PrescriptionCategories/routes.php';
require_once __DIR__ . '/../app/Modules/Icd10Diagnoses/routes.php';
require_once __DIR__ . '/../app/Modules/CvxCodes/routes.php';
require_once __DIR__ . '/../app/Modules/Immunizations/routes.php';
require_once __DIR__ . '/../app/Modules/AdministrationRoutes/routes.php';
require_once __DIR__ . '/../app/Modules/AdministrationSites/routes.php';
require_once __DIR__ . '/../app/Modules/AmountUnits/routes.php';
require_once __DIR__ . '/../app/Modules/InformationSources/routes.php';
require_once __DIR__ . '/../app/Modules/RefusalReasons/routes.php';
require_once __DIR__ . '/../app/Modules/VoidReasons/routes.php';
require_once __DIR__ . '/../app/Modules/CarePlanReasonCodes/routes.php';
require_once __DIR__ . '/../app/Modules/SpecimenSites/routes.php';
require_once __DIR__ . '/../app/Modules/SpecimenMethods/routes.php';
require_once __DIR__ . '/../app/Modules/CompletionStatuses/routes.php';
require_once __DIR__ . '/../app/Modules/PatientImmunizations/routes.php';
require_once __DIR__ . '/../app/Modules/PatientGeneralHistory/routes.php';
require_once __DIR__ . '/../app/Modules/PatientFamilyHistory/routes.php';
require_once __DIR__ . '/../app/Modules/PatientRelativesHistory/routes.php';
require_once __DIR__ . '/../app/Modules/PatientLifestyle/routes.php';
require_once __DIR__ . '/../app/Modules/PatientOtherHistory/routes.php';
require_once __DIR__ . '/../app/Modules/PatientSdohAssessment/routes.php';
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
require_once __DIR__ . '/../app/Modules/PatientFlow/routes.php';
require_once __DIR__ . '/../app/Modules/Codes/routes.php';
require_once __DIR__ . '/../app/Modules/Pharmacies/routes.php';
// Future modules
// require_once __DIR__ . '/../app/Modules/Doctors/routes.php';
require_once __DIR__ . '/../app/Modules/PracticeRules/routes.php';
require_once __DIR__ . '/../app/Modules/ProviderCategories/routes.php';

return $router;