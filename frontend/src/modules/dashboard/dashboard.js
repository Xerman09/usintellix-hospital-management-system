import { getUser, clearSession } from "../../core/session.js";
import { logout } from "../auth/auth.service.js?v=2";

const roleConfig = {
    admin: {
        title: "Hospital Administration",
        welcome: "You have full access to hospital operations.",
        menu: ["Dashboard", "Patients", "Appointments", "Billing", "Reports", "Users"],
        cards: [
            { title: "Active Patients", value: "245" },
            { title: "Today's Appointments", value: "32" },
            { title: "Staff On Duty", value: "18" }
        ],
        permissions: ["Manage users", "View billing", "Review reports", "Access all modules"]
    },
    doctor: {
        title: "Doctor Dashboard",
        welcome: "Review patients and manage appointments.",
        menu: ["Dashboard", "Patients", "Appointments", "Reports"],
        cards: [
            { title: "Patients Assigned", value: "42" },
            { title: "Appointments", value: "10" },
            { title: "Pending Notes", value: "5" }
        ],
        permissions: ["View patient records", "Update appointments", "Write reports"]
    },
    nurse: {
        title: "Nurse Dashboard",
        welcome: "Track patient care and ward activity.",
        menu: ["Dashboard", "Patients", "Appointments"],
        cards: [
            { title: "Patients Under Care", value: "18" },
            { title: "Scheduled Tasks", value: "9" },
            { title: "Urgent Cases", value: "3" }
        ],
        permissions: ["View assigned patients", "Update care notes", "Manage ward tasks"]
    },
    receptionist: {
        title: "Reception Dashboard",
        welcome: "Coordinate appointments and patient arrivals.",
        menu: ["Dashboard", "Appointments", "Patients"],
        cards: [
            { title: "Arrivals Today", value: "14" },
            { title: "Scheduled Visits", value: "21" },
            { title: "Pending Calls", value: "7" }
        ],
        permissions: ["Manage appointments", "Register patients", "Answer front desk requests"]
    },
    billing: {
        title: "Billing Dashboard",
        welcome: "Monitor invoices, payments, and receipts.",
        menu: ["Dashboard", "Billing", "Reports"],
        cards: [
            { title: "Pending Bills", value: "24" },
            { title: "Payments Today", value: "11" },
            { title: "Outstanding", value: "9" }
        ],
        permissions: ["Process payments", "Review invoices", "Generate billing reports"]
    },
    lab: {
        title: "Laboratory Dashboard",
        welcome: "Handle samples and lab requests.",
        menu: ["Dashboard", "Patients", "Reports"],
        cards: [
            { title: "Samples Pending", value: "16" },
            { title: "Today’s Tests", value: "8" },
            { title: "Completed", value: "22" }
        ],
        permissions: ["Receive lab samples", "Update test results", "Share reports"]
    },
    pharmacy: {
        title: "Pharmacy Dashboard",
        welcome: "Manage prescriptions and medication requests.",
        menu: ["Dashboard", "Patients", "Billing"],
        cards: [
            { title: "Pending Prescriptions", value: "12" },
            { title: "Stock Alerts", value: "4" },
            { title: "Dispensed Today", value: "19" }
        ],
        permissions: ["Manage prescriptions", "Check inventory", "Support billing requests"]
    },
    patient: {
        title: "Patient Dashboard",
        welcome: "View your appointments and personal health updates.",
        menu: ["Dashboard", "Appointments"],
        cards: [
            { title: "Upcoming Visits", value: "2" },
            { title: "Messages", value: "1" },
            { title: "Last Review", value: "2 days ago" }
        ],
        permissions: ["View personal appointments", "Read updates", "Contact care team"]
    }
};

function getRoleConfig(role) {
    const key = (role || "patient").toLowerCase();
    return roleConfig[key] || roleConfig.patient;
}

function resolveMenuRoute(item, role) {
    if (item === "Users" && role === "admin") {
        return "#/employees/create";
    }

    if (item === "Patients" && role === "receptionist") {
        return "#/patients/create";
    }

    return "#/dashboard";
}

import { TabManager } from "../../core/tabs.js";
import { AddEmployeeView } from "../employees/add-employee.view.js";
import { initAddEmployee } from "../employees/add-employee.js";
import { PatientsListView } from "../patients/patients-list.view.js";
import { initPatientsList } from "../patients/patients-list.js";
import { ProvidersView } from "../providers/providers.view.js";
import { initProviders } from "../providers/providers.js";
import { VisitCategoriesView } from "../visit-categories/visit-categories.view.js";
import { initVisitCategories } from "../visit-categories/visit-categories.js";
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
import { AppointmentsListView } from "../appointments/appointments-list.view.js";
import { initAppointmentsList } from "../appointments/appointments-list.js";
import { DoctorCalendarView } from "../appointments/doctor-calendar.view.js";
import { initDoctorCalendar } from "../appointments/doctor-calendar.js";

function renderLegacyDashboard(user) {
    const config = getRoleConfig(user.role || "patient");
    const cards = config.cards.map((card) => `
        <div class="dashboard-card">
            <h3>${card.title}</h3>
            <div class="number">${card.value}</div>
        </div>
    `).join("");
    const permissions = config.permissions.map((permission) => `<li>${permission}</li>`).join("");

    return `
        <header class="dashboard-header">
            <div>
                <h1>${config.title}</h1>
                <p>${config.welcome}</p>
            </div>
            
            <div style="display: flex; gap: 10px;">
                ${user.role === "admin" ? `<a href="#/employees/create" class="btn-primary-inline">+ Add Employee</a>` : ""}
                ${user.role === "receptionist" ? `<a href="#/patients/create" class="btn-primary-inline">+ Register Patient</a>` : ""}
            </div>
        </header>

        <section class="dashboard-cards">
            ${cards}
        </section>

        <section class="dashboard-card" style="margin-top: 1.5rem;">
            <h3>Permissions</h3>
            <ul>${permissions}</ul>
        </section>
    `;
}

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

    // Initialize the tab manager and expose to window for inline onclicks
    const tabManager = new TabManager('tabBar', 'tabContent');
    window.tabManager = tabManager;

    // Open default dashboard tab
    tabManager.openTab('dashboard', 'Dashboard', () => renderLegacyDashboard(user));

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

    // Set avatar and profile details
    const avatar = document.getElementById('avatarLetter');
    if (avatar) avatar.textContent = (user.username || "U").charAt(0).toUpperCase();
    
    const profileName = document.getElementById('profileName');
    if (profileName) profileName.textContent = `${user.first_name} ${user.last_name}` || "User";
    
    const profileRole = document.getElementById('profileRole');
    if (profileRole) profileRole.textContent = user.role || "patient";
}
