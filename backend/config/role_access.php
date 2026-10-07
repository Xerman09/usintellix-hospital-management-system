<?php

/*
|--------------------------------------------------------------------------
| Role access beyond each route's own role list
|--------------------------------------------------------------------------
| Most routes list the roles that may call them (RoleMiddleware). The nursing
| roles were added later, so instead of editing hundreds of route lists:
|
|  - inherits: a role also counts as these roles for every route that lists them
|    (a charge nurse can do everything a nurse can).
|  - grants:   extra routes a role may call, by HTTP method and path. A path
|    ending in "*" matches everything that starts with it. Only staff routes
|    are granted this way; admin-only and patient-only routes stay closed.
|
| Read by App\Core\RoleAccess.
*/

// Look-ups the clinical forms load (lists of allergies, drugs, units, ...): read only.
$lookups = [
    '/allergies', '/medications', '/medical-problems', '/immunizations', '/cvx-codes', '/icd10-diagnoses',
    '/providers', '/departments', '/facilities', '/rooms', '/specializations', '/surgeries', '/warehouses',
    '/amount-units', '/administration-routes', '/administration-sites', '/refusal-reasons', '/completion-statuses',
    '/information-sources', '/screening-tools', '/visit-categories', '/visit-types', '/discharge-dispositions',
    '/specimen-types', '/specimen-sites', '/specimen-methods', '/specimen-conditions', '/codes', '/codes/*',
];

// The patient chart, read only (no billing, merging, portal access or letters).
$chartRead = [
    '/patients', '/patients/dashboard-summary', '/patients/confidential-preferences', '/health-summary',
    '/patient-allergies', '/patient-medications', '/patient-medical-problems', '/patient-immunizations',
    '/patient-medical-devices', '/patient-health-concerns', '/patient-care-preferences', '/patient-documents',
    '/patient-documents/*', '/patient-family-history', '/patient-general-history', '/patient-lifestyle',
    '/patient-other-history', '/patient-relatives-history', '/patient-sdoh-assessments', '/patient-surgeries',
    '/patient-procedure-orders', '/patient-procedure-results', '/patient-prescriptions', '/patient-prescriptions/*',
    '/prescriptions', '/prescriptions/*', '/patient-reminders', '/patient-reminders/*', '/related-persons',
    '/related-persons/*', '/care-team', '/care-team/*', '/reports/patient-quality-summary',
    '/encounters', '/encounters/form-options', '/encounters/issues', '/encounters/summary', '/encounters/transfer-summary',
    '/encounters/hitech-restriction', '/encounter-*', '/patient-dental-issues', '/patient-external-data',
    '/surgeries/options', '/surgeries/show', '/care-plan-reason-codes', '/preference-types', '/cqm-valuesets/codes/search',
    '/messages/patient',
];

// Nursing documentation inside a visit (observations, nursing notes, care plan, PHQ-9/GAD-7)
// already lists nurse on its own routes; vital signs is the one that needs a grant.

$nurse = [
    'GET' => array_merge($lookups, $chartRead, [
        '/appointments', '/appointments/available-slots', '/patient-flow',
        '/or-live/board', '/or-live/case', '/or-live/stock', '/or-live/report/print',
        '/or-management/details', '/or-management/options', '/or-management/schedule', '/or-management/suites',
        '/or-schedule', '/or-schedule/blocks', '/or-schedule/case',
        '/surgery-requests', '/surgery-requests/*',
    ]),
    'POST' => [
        '/patient-allergies', '/patient-medications', '/patient-immunizations', '/patient-flow',
        // Circulating / scrub / recovery nurse on the OR Live Board (not charges, not the operative report).
        '/or-live/stage', '/or-live/stage/undo', '/or-live/delay', '/or-live/checklist', '/or-live/times',
        '/or-live/vitals', '/or-live/vitals/remove', '/or-live/items', '/or-live/items/void',
        '/or-live/specimens', '/or-live/specimens/remove', '/or-live/pacu', '/or-live/pacu/remove', '/or-live/release',
        '/or-management/suites/status',
    ],
    'PUT' => ['/encounter-vitals', '/patient-allergies', '/patient-medications', '/patient-immunizations', '/patient-flow'],
    'DELETE' => [],
];

return [
    'inherits' => [
        'charge_nurse' => ['nurse'],
    ],

    'grants' => [
        'nurse' => $nurse,

        // Charge nurse: everything a nurse can (inherited above), plus managing the ward's nursing staff
        // (those routes list charge_nurse themselves).
        'charge_nurse' => $nurse,

        // Pharmacist: reads the patient chart (allergies, medicines, problems, visits) to verify
        // medicine orders; verifying itself is on the /med-orders routes.
        'pharmacist' => [
            'GET' => array_merge($lookups, $chartRead, ['/inpatient-admissions/whiteboard', '/inpatient-admissions/details']),
            'POST' => [],
            'PUT' => [],
            'DELETE' => [],
        ],

        // CNA: looks up patients, records vital signs, rooms patients; no medicines or orders.
        'cna' => [
            'GET' => array_merge($lookups, [
                '/patients', '/patients/dashboard-summary', '/health-summary', '/patient-allergies',
                '/patient-care-preferences', '/patient-medical-devices', '/preference-types',
                '/encounters', '/encounters/summary', '/encounters/form-options', '/encounter-vitals', '/encounter-vitals/history',
                '/encounter-care-plan-items', '/encounter-observation-items', '/patient-flow',
            ]),
            'POST' => [],
            'PUT' => ['/encounter-vitals', '/patient-flow'],
            'DELETE' => [],
        ],
    ],

    // Readable names for screens.
    'labels' => [
        'admin' => 'Admin', 'receptionist' => 'Receptionist', 'doctor' => 'Doctor', 'nurse' => 'Nurse',
        'charge_nurse' => 'Charge Nurse', 'cna' => 'CNA', 'pharmacist' => 'Pharmacist', 'accountant' => 'Accountant',
        'clinician' => 'Clinician', 'lab_technician' => 'Lab Technician', 'staff' => 'Staff', 'patient' => 'Patient',
    ],

    // The roles that make up nursing staff (linked to wards).
    'nursing' => ['nurse', 'charge_nurse', 'cna'],
];
