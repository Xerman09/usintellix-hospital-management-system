import { getUser, clearSession } from "../../core/session.js";
import { logout } from "../auth/auth.service.js?v=2";
import { TabManager } from "../../core/tabs.js";
import { DashboardHomeView } from "./dashboard-home.view.js";
import { initDashboardHome } from "./dashboard-home.js";
import { AddEmployeeView } from "../employees/add-employee.view.js";
import { initAddEmployee } from "../employees/add-employee.js";
import { PatientsListView } from "../patients/patients-list.view.js?v=6";
import { initPatientsList } from "../patients/patients-list.js?v=6";
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
import { AppointmentsListView } from "../appointments/appointments-list.view.js";
import { initAppointmentsList } from "../appointments/appointments-list.js";
import { DoctorCalendarView } from "../appointments/doctor-calendar.view.js";
import { initDoctorCalendar } from "../appointments/doctor-calendar.js";
import { HealthSummaryView } from "../health-records/health-summary.view.js?v=2";
import { initHealthSummary } from "../health-records/health-summary.js?v=2";
import { AppearanceView } from "../appearance/appearance.view.js";
import { initAppearance } from "../appearance/appearance.js";
import { Icd10DiagnosesView } from "../icd10-diagnoses/icd10-diagnoses.view.js";
import { initIcd10Diagnoses } from "../icd10-diagnoses/icd10-diagnoses.js";
import { CqmValuesetsView } from "../cqm-valuesets/cqm-valuesets.view.js";
import { initCqmValuesets } from "../cqm-valuesets/cqm-valuesets.js";

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

    // Attach navigation listeners
    const navLinks = document.querySelectorAll('#navbarLinks a[data-tab]');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = link.getAttribute('data-tab');
            const title = link.textContent.trim();
            
            if (tabId === 'patients') {
                tabManager.openTab(tabId, title, () => {
                    setTimeout(initPatientsList, 0);
                    return PatientsListView(user);
                });
            } else if (tabId === 'employees') {
                tabManager.openTab(tabId, title, () => {
                    setTimeout(initAddEmployee, 0);
                    return AddEmployeeView();
                });
            } else if (tabId === 'providers') {
                tabManager.openTab(tabId, title, () => {
                    setTimeout(initProviders, 0);
                    return ProvidersView();
                });
            } else if (tabId === 'provider_categories') {
                tabManager.openTab(tabId, title, () => {
                    setTimeout(initProviderCategories, 0);
                    return ProviderCategoriesView();
                });
            } else if (tabId === 'visit_categories') {
                tabManager.openTab(tabId, title, () => {
                    setTimeout(initVisitCategories, 0);
                    return VisitCategoriesView();
                });
            } else if (tabId === 'classes') {
                tabManager.openTab(tabId, title, () => {
                    setTimeout(initClasses, 0);
                    return ClassesView();
                });
            } else if (tabId === 'visit_types') {
                tabManager.openTab(tabId, title, () => {
                    setTimeout(initVisitTypes, 0);
                    return VisitTypesView();
                });
            } else if (tabId === 'facilities') {
                tabManager.openTab(tabId, title, () => {
                    setTimeout(initFacilities, 0);
                    return FacilitiesView();
                });
            } else if (tabId === 'facility_billings') {
                tabManager.openTab(tabId, title, () => {
                    setTimeout(initFacilityBillings, 0);
                    return FacilityBillingsView();
                });
            } else if (tabId === 'allergies') {
                tabManager.openTab(tabId, title, () => {
                    setTimeout(initAllergies, 0);
                    return AllergiesView();
                });
            } else if (tabId === 'medical_problems') {
                tabManager.openTab(tabId, title, () => {
                    setTimeout(initMedicalProblems, 0);
                    return MedicalProblemsView();
                });
            } else if (tabId === 'medication_management') {
                tabManager.openTab(tabId, title, () => {
                    setTimeout(initMedications, 0);
                    return MedicationsView();
                });
            } else if (tabId === 'prescription_categories') {
                tabManager.openTab(tabId, title, () => {
                    setTimeout(initPrescriptionCategories, 0);
                    return PrescriptionCategoriesView();
                });
            } else if (tabId === 'payer_types') {
                tabManager.openTab(tabId, title, () => {
                    setTimeout(initPayerTypes, 0);
                    return PayerTypesView();
                });
            } else if (tabId === 'x12_partners') {
                tabManager.openTab(tabId, title, () => {
                    setTimeout(initX12Partners, 0);
                    return X12PartnersView();
                });
            } else if (tabId === 'cqm_source_of_payments') {
                tabManager.openTab(tabId, title, () => {
                    setTimeout(initCqmSourceOfPayments, 0);
                    return CqmSourceOfPaymentsView();
                });
            } else if (tabId === 'insurances') {
                tabManager.openTab(tabId, title, () => {
                    setTimeout(initInsurances, 0);
                    return InsurancesView();
                });
            } else if (tabId === 'organization_types') {
                tabManager.openTab(tabId, title, () => {
                    setTimeout(initOrganizationTypes, 0);
                    return OrganizationTypesView();
                });
            } else if (tabId === 'pos_codes') {
                tabManager.openTab(tabId, title, () => {
                    setTimeout(initPosCodes, 0);
                    return PosCodesView();
                });
            } else if (tabId === 'icd10_diagnoses') {
                tabManager.openTab(tabId, title, () => {
                    setTimeout(initIcd10Diagnoses, 0);
                    return Icd10DiagnosesView();
                });
            } else if (tabId === 'cqm_valuesets') {
                tabManager.openTab(tabId, title, () => {
                    setTimeout(initCqmValuesets, 0);
                    return CqmValuesetsView();
                });
            } else if (tabId === 'appointments' && user.role === 'doctor') {
                tabManager.openTab(tabId, title, () => {
                    setTimeout(initDoctorCalendar, 0);
                    return DoctorCalendarView();
                });
            } else if (tabId === 'appointments' && ['admin', 'receptionist'].includes(user.role)) {
                tabManager.openTab(tabId, title, () => {
                    setTimeout(initAppointmentsList, 0);
                    return AppointmentsListView(user);
                });
            } else if (tabId === 'health_records' && user.role === 'patient') {
                tabManager.openTab(tabId, title, () => {
                    setTimeout(() => initHealthSummary({}), 0);
                    return HealthSummaryView();
                });
            } else {
                tabManager.openTab(tabId, title, () => renderPlaceholderTab(title));
            }
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
    const avatar = document.getElementById('avatarLetter');
    if (avatar) avatar.textContent = (user.username || "U").charAt(0).toUpperCase();
    
    const profileName = document.getElementById('profileName');
    if (profileName) profileName.textContent = `${user.first_name} ${user.last_name}` || "User";
    
    const profileRole = document.getElementById('profileRole');
    if (profileRole) profileRole.textContent = user.role || "patient";

    // Restore tabs from the state we saved before initialization
    if (savedState) {
        try {
            if (savedState.tabs) {
                savedState.tabs.forEach(tabId => {
                    if (tabId === 'dashboard') return;
                    const link = document.querySelector(`a[data-tab="${tabId}"]`);
                    if (link) link.click();
                });
            }
            if (savedState.active) {
                if (savedState.active === 'dashboard') {
                    tabManager.switchTab('dashboard');
                } else {
                    const activeLink = document.querySelector(`a[data-tab="${savedState.active}"]`);
                    if (activeLink) activeLink.click();
                }
            }
        } catch(e) {
            console.error('Failed to restore tabs:', e);
        }
    }
}
