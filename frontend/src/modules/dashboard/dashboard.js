import { getUser, clearSession } from "../../core/session.js";

const roleConfig = {
    "Hospital Admin": {
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
    Doctor: {
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
    Nurse: {
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
    Receptionist: {
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
    "Cashier/Billing": {
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
    "Laboratory Staff": {
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
    "Pharmacy Staff": {
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
    Patient: {
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
    return roleConfig[role] || roleConfig.Patient;
}

function renderDashboard(user) {
    const config = getRoleConfig(user.role || "Patient");
    const menuItems = config.menu.map((item) => `<a href="#/dashboard">${item}</a>`).join("");
    const cards = config.cards.map((card) => `
        <div class="dashboard-card">
            <h3>${card.title}</h3>
            <div class="number">${card.value}</div>
        </div>
    `).join("");
    const permissions = config.permissions.map((permission) => `<li>${permission}</li>`).join("");

    return `
        <div class="dashboard-container">
            <aside class="sidebar">
                <div class="sidebar-logo">
                    <img src="/assets/logo.png">
                    <h2>Intellix</h2>
                </div>

                <nav class="sidebar-menu">
                    ${menuItems}
                </nav>

                <button class="logout-btn" id="logoutBtn" type="button">Logout</button>
            </aside>

            <main class="dashboard-main">
                <header class="dashboard-header">
                    <div>
                        <h1>${config.title}</h1>
                        <p>${config.welcome}</p>
                    </div>

                    <div class="user-profile">
                        <div class="avatar">${(user.username || "U").charAt(0).toUpperCase()}</div>
                        <div>
                            <strong>${user.username}</strong>
                            <div>${user.role || "Patient"}</div>
                        </div>
                    </div>
                </header>

                <section class="dashboard-cards">
                    ${cards}
                </section>

                <section class="dashboard-card" style="margin-top: 1.5rem;">
                    <h3>Permissions</h3>
                    <ul>${permissions}</ul>
                </section>
            </main>
        </div>
    `;
}

export function Dashboard()
{
    const user = getUser();

    if (!user) {
        window.location.hash = "#/login";
        return;
    }

    const app = document.getElementById("app");

    if (app) {
        app.innerHTML = renderDashboard(user);
    }

    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            clearSession();
            window.location.hash = "#/login";
        });
    }
}