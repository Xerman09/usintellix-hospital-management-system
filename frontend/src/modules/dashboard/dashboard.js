import { getUser, clearSession } from "../../core/session.js";
import { renderAvatar } from "../../core/avatar.js";
import { initBranding } from "../../core/branding.js";
import { logout } from "../auth/auth.service.js?v=2";
import { TabManager } from "../../core/tabs.js?v=2";
import { DashboardHomeView } from "./dashboard-home.view.js";
import { initDashboardHome } from "./dashboard-home.js";
import { AddEmployeeView } from "../employees/add-employee.view.js";
import { initAddEmployee } from "../employees/add-employee.js";
import { RoleManagementView } from "../role-management/role-management.view.js";
import { initRoleManagement } from "../role-management/role-management.js";
import { PatientsListView } from "../patients/patients-list.view.js?v=9";
import { initPatientsList } from "../patients/patients-list.js?v=10";
import { PatientFinderView } from "../patients/patient-finder.view.js";
import { initPatientFinder } from "../patients/patient-finder.js";
import { ProvidersView } from "../providers/providers.view.js";
import { initProviders } from "../providers/providers.js";
import { ProviderCategoriesView } from "../provider-categories/provider-categories.view.js";
import { initProviderCategories } from "../provider-categories/provider-categories.js";
import { VisitCategoriesView } from "../visit-categories/visit-categories.view.js";
import { initVisitCategories } from "../visit-categories/visit-categories.js";
import { PrescriptionCategoriesView } from "../prescription-categories/prescription-categories.view.js";
import { initPrescriptionCategories } from "../prescription-categories/prescription-categories.js";
import { ClassesView } from "../classes/classes.view.js";
import { initClasses } from "../classes/classes.js";
import { VisitTypesView } from "../visit-types/visit-types.view.js";
import { initVisitTypes } from "../visit-types/visit-types.js";
import { FacilitiesView } from "../facilities/facilities.view.js";
import { initFacilities } from "../facilities/facilities.js";
import { FacilityBillingsView } from "../facility-billings/facility-billings.view.js";
import { initFacilityBillings } from "../facility-billings/facility-billings.js";
import { AllergiesView } from "../allergies/allergies.view.js";
import { initAllergies } from "../allergies/allergies.js";
import { MedicalProblemsView } from "../medical-problems/medical-problems.view.js";
import { initMedicalProblems } from "../medical-problems/medical-problems.js";
import { MedicationsView } from "../medications/medications.view.js";
import { initMedications } from "../medications/medications.js";
import { PayerTypesView } from "../payer-types/payer-types.view.js";
import { initPayerTypes } from "../payer-types/payer-types.js";
import { X12PartnersView } from "../x12-partners/x12-partners.view.js";
import { initX12Partners } from "../x12-partners/x12-partners.js";
import { CqmSourceOfPaymentsView } from "../cqm-source-of-payments/cqm-source-of-payments.view.js";
import { initCqmSourceOfPayments } from "../cqm-source-of-payments/cqm-source-of-payments.js";
import { InsurancesView } from "../insurances/insurances.view.js";
import { initInsurances } from "../insurances/insurances.js";
import { OrganizationTypesView } from "../organization-types/organization-types.view.js";
import { initOrganizationTypes } from "../organization-types/organization-types.js";
import { PosCodesView } from "../pos-codes/pos-codes.view.js";
import { initPosCodes } from "../pos-codes/pos-codes.js";
import { AppointmentsListView } from "../appointments/appointments-list.view.js?v=7";
import { initAppointmentsList } from "../appointments/appointments-list.js?v=7";
import { DoctorCalendarView } from "../appointments/doctor-calendar.view.js?v=7";
import { initDoctorCalendar } from "../appointments/doctor-calendar.js?v=7";
import { HealthSummaryView } from "../health-records/health-summary.view.js?v=2";
import { initHealthSummary } from "../health-records/health-summary.js?v=2";
import { AppearanceView } from "../appearance/appearance.view.js";
import { initAppearance } from "../appearance/appearance.js";
import { ProfileView } from "../profile/profile.view.js";
import { initProfile } from "../profile/profile.js";
import { BusinessSettingsView } from "../business-settings/business-settings.view.js";
import { initBusinessSettings } from "../business-settings/business-settings.js";
import { RecallsView } from "../recalls/recalls.view.js";
import { initRecalls } from "../recalls/recalls.js";
import { PatientFlowView } from "../patient-flow/patient-flow.view.js";
import { initPatientFlow } from "../patient-flow/patient-flow.js";
import { hasPendingPatientView } from "../../core/pending-patient-view.js";
import { Icd10DiagnosesView } from "../icd10-diagnoses/icd10-diagnoses.view.js";
import { initIcd10Diagnoses } from "../icd10-diagnoses/icd10-diagnoses.js";
import { CvxCodesView } from "../cvx-codes/cvx-codes.view.js";
import { initCvxCodes } from "../cvx-codes/cvx-codes.js";
import { ImmunizationsView } from "../immunizations/immunizations.view.js";
import { initImmunizations } from "../immunizations/immunizations.js";
import { AdministrationRoutesView } from "../administration-routes/administration-routes.view.js";
import { initAdministrationRoutes } from "../administration-routes/administration-routes.js";
import { AdministrationSitesView } from "../administration-sites/administration-sites.view.js";
import { initAdministrationSites } from "../administration-sites/administration-sites.js";
import { AmountUnitsView } from "../amount-units/amount-units.view.js";
import { initAmountUnits } from "../amount-units/amount-units.js";
import { CqmValuesetsView } from "../cqm-valuesets/cqm-valuesets.view.js";
import { initCqmValuesets } from "../cqm-valuesets/cqm-valuesets.js";
import { PreferenceTypesView } from "../preference-types/preference-types.view.js";
import { initPreferenceTypes } from "../preference-types/preference-types.js";
import { CodesView } from "../codes/codes.view.js";
import { initCodes } from "../codes/codes.js";
import { MessagesView } from "../messages/messages.view.js?v=2";
import { initMessages } from "../messages/messages.js";

function renderPlaceholderTab(title) {
    return `<div style="padding: 20px;">
        <h2>${title}</h2>
        <p>This module is currently under development or loading...</p>
    </div>`;
}

export function Dashboard()
{
    const user = getUser();

    if (!user) {
        window.location.hash = "#/login";
        return;
    }

    const app = document.getElementById("app");

    initBranding();

    // Read saved state BEFORE openTab('dashboard') overwrites it
    const savedStateStr = localStorage.getItem('tabsState');
    let savedState = null;
    if (savedStateStr) {
        try {
            savedState = JSON.parse(savedStateStr);
        } catch(e) {}
    }

    // Initialize the tab manager and expose to window for inline onclicks
    const tabManager = new TabManager('tabBar', 'tabContent');
    window.tabManager = tabManager;

    // Open default dashboard tab
    tabManager.openTab('dashboard', 'Dashboard', () => {
        setTimeout(() => initDashboardHome(user), 0);
        return DashboardHomeView(user);
    });

    // Opens (or, when restoring saved tabs, merely registers) a dashboard
    // tab by id. `activate` controls whether it's actually rendered into
    // the shared tab-content area right now: TabManager.switchTab() swaps
    // that single container's innerHTML synchronously, so restoring
    // several saved tabs must only activate the one that ends up visible
    // -- activating each of them in turn would render, then immediately
    // clobber, every earlier tab's DOM before its deferred init() runs.
    function openDashboardTab(tabId, title, activate = true) {
        if (tabId === 'patients') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initPatientsList, 0);
                return PatientsListView(user);
            }, activate);
        } else if (tabId === 'patient_finder') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initPatientFinder, 0);
                return PatientFinderView();
            }, activate);
        } else if (tabId === 'employees') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initAddEmployee, 0);
                return AddEmployeeView();
            }, activate);
        } else if (tabId === 'role_management') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initRoleManagement, 0);
                return RoleManagementView();
            }, activate);
        } else if (tabId === 'providers') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initProviders, 0);
                return ProvidersView();
            }, activate);
        } else if (tabId === 'provider_categories') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initProviderCategories, 0);
                return ProviderCategoriesView();
            }, activate);
        } else if (tabId === 'visit_categories') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initVisitCategories, 0);
                return VisitCategoriesView();
            }, activate);
        } else if (tabId === 'classes') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initClasses, 0);
                return ClassesView();
            }, activate);
        } else if (tabId === 'visit_types') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initVisitTypes, 0);
                return VisitTypesView();
            }, activate);
        } else if (tabId === 'facilities') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initFacilities, 0);
                return FacilitiesView();
            }, activate);
        } else if (tabId === 'facility_billings') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initFacilityBillings, 0);
                return FacilityBillingsView();
            }, activate);
        } else if (tabId === 'allergies') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initAllergies, 0);
                return AllergiesView();
            }, activate);
        } else if (tabId === 'medical_problems') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initMedicalProblems, 0);
                return MedicalProblemsView();
            }, activate);
        } else if (tabId === 'medication_management') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initMedications, 0);
                return MedicationsView();
            }, activate);
        } else if (tabId === 'prescription_categories') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initPrescriptionCategories, 0);
                return PrescriptionCategoriesView();
            }, activate);
        } else if (tabId === 'payer_types') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initPayerTypes, 0);
                return PayerTypesView();
            }, activate);
        } else if (tabId === 'x12_partners') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initX12Partners, 0);
                return X12PartnersView();
            }, activate);
        } else if (tabId === 'cqm_source_of_payments') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initCqmSourceOfPayments, 0);
                return CqmSourceOfPaymentsView();
            }, activate);
        } else if (tabId === 'insurances') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initInsurances, 0);
                return InsurancesView();
            }, activate);
        } else if (tabId === 'organization_types') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initOrganizationTypes, 0);
                return OrganizationTypesView();
            }, activate);
        } else if (tabId === 'pos_codes') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initPosCodes, 0);
                return PosCodesView();
            }, activate);
        } else if (tabId === 'icd10_diagnoses') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initIcd10Diagnoses, 0);
                return Icd10DiagnosesView();
            }, activate);
        } else if (tabId === 'cvx_codes') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initCvxCodes, 0);
                return CvxCodesView();
            }, activate);
        } else if (tabId === 'immunizations') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initImmunizations, 0);
                return ImmunizationsView();
            }, activate);
        } else if (tabId === 'administration_routes') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initAdministrationRoutes, 0);
                return AdministrationRoutesView();
            }, activate);
        } else if (tabId === 'administration_sites') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initAdministrationSites, 0);
                return AdministrationSitesView();
            }, activate);
        } else if (tabId === 'amount_units') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initAmountUnits, 0);
                return AmountUnitsView();
            }, activate);
        } else if (tabId === 'cqm_valuesets') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initCqmValuesets, 0);
                return CqmValuesetsView();
            }, activate);
        } else if (tabId === 'preference_types') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initPreferenceTypes, 0);
                return PreferenceTypesView();
            }, activate);
        } else if (tabId === 'codes') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initCodes, 0);
                return CodesView();
            }, activate);
        } else if (tabId === 'appointments' && user.role === 'doctor') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initDoctorCalendar, 0);
                return DoctorCalendarView();
            }, activate);
        } else if (tabId === 'appointments' && ['admin', 'receptionist'].includes(user.role)) {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initAppointmentsList, 0);
                return AppointmentsListView(user);
            }, activate);
        } else if (tabId === 'messaging') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initMessages, 0);
                return MessagesView();
            }, activate);
        } else if (tabId === 'recalls') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initRecalls, 0);
                return RecallsView();
            }, activate);
        } else if (tabId === 'patient_flow') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initPatientFlow, 0);
                return PatientFlowView();
            }, activate);
        } else if (tabId === 'profile') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initProfile, 0);
                return ProfileView();
            }, activate);
        } else if (tabId === 'business_settings' && user.role === 'admin') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(initBusinessSettings, 0);
                return BusinessSettingsView();
            }, activate);
        } else if (tabId === 'health_records' && user.role === 'patient') {
            tabManager.openTab(tabId, title, () => {
                setTimeout(() => initHealthSummary({}), 0);
                return HealthSummaryView();
            }, activate);
        } else {
            tabManager.openTab(tabId, title, () => renderPlaceholderTab(title), activate);
        }
    }

    // Attach navigation listeners
    const navLinks = document.querySelectorAll('#navbarLinks a[data-tab]');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = link.getAttribute('data-tab');
            const title = link.textContent.trim();

            openDashboardTab(tabId, title);
        });
    });

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to logout?')) {
                await logout();
                clearSession();
                window.location.hash = "#/login";
            }
        });
    }

    // Profile Tab Hook
    const profileBtn = document.querySelector('a[data-tab="profile"]');
    if (profileBtn) {
        profileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openDashboardTab('profile', 'Profile');
        });
    }

    // Settings Tab Hook
    const settingsBtn = document.querySelector('a[data-tab="settings"]');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            tabManager.openTab('settings', 'Settings', () => renderPlaceholderTab('Settings'));
        });
    }

    // Appearance Tab Hook
    const appearanceBtn = document.querySelector('a[data-tab="appearance"]');
    if (appearanceBtn) {
        appearanceBtn.addEventListener('click', (e) => {
            e.preventDefault();
            tabManager.openTab('appearance', 'Appearance', () => {
                setTimeout(initAppearance, 0);
                return AppearanceView();
            });
        });
    }

    // Profile dropdown: click-to-toggle instead of CSS hover, so moving the
    // mouse from the avatar down to a menu item can't cause it to close
    // mid-click (a hover-only dropdown is fragile to real mouse movement).
    const navProfile = document.querySelector('.nav-profile');
    const avatarEl = document.getElementById('avatarLetter');

    if (navProfile && avatarEl) {
        avatarEl.addEventListener('click', (e) => {
            e.stopPropagation();
            navProfile.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
            if (!navProfile.contains(e.target)) {
                navProfile.classList.remove('open');
            }
        });

        navProfile.querySelectorAll('.dropdown-content a').forEach((link) => {
            link.addEventListener('click', () => {
                navProfile.classList.remove('open');
            });
        });
    }

    // Set avatar and profile details
    renderAvatar(document.getElementById('avatarLetter'), user);
    
    const profileName = document.getElementById('profileName');
    if (profileName) profileName.textContent = `${user.first_name} ${user.last_name}` || "User";
    
    const profileRole = document.getElementById('profileRole');
    if (profileRole) profileRole.textContent = user.role || "patient";

    // Restore tabs from the state we saved before initialization. Only the
    // tab that ends up active is actually rendered+initialized; the rest
    // are just re-registered in the tab bar (see openDashboardTab above).
    if (savedState) {
        try {
            if (savedState.tabs) {
                savedState.tabs.forEach(tabId => {
                    if (tabId === 'dashboard') return;
                    const link = document.querySelector(`a[data-tab="${tabId}"]`);
                    if (link) openDashboardTab(tabId, link.textContent.trim(), false);
                });
            }
            if (savedState.active) {
                if (savedState.active === 'dashboard') {
                    tabManager.switchTab('dashboard');
                } else {
                    const activeLink = document.querySelector(`a[data-tab="${savedState.active}"]`);
                    if (activeLink) openDashboardTab(savedState.active, activeLink.textContent.trim(), true);
                }
            }
        } catch(e) {
            console.error('Failed to restore tabs:', e);
        }
    }

    // A Flow-board "open patient in new window" click leaves a pending
    // patient chart request for this fresh window to pick up -- jump
    // straight to the Patients tab so its own init can consume it.
    if (hasPendingPatientView()) {
        openDashboardTab('patients', 'Patients');
    }
}
