export function FormsAdministrationView()
{
    return `
<style>
.fa-page {
    width: 100%;
    font-size: 13.5px;
}

.fa-page h1 {
    margin: 0 0 16px;
    font-size: 24px;
    font-weight: 400;
    color: #1a2338;
}

.fa-section-title {
    margin: 0 0 8px;
    font-size: 15px;
    font-weight: 700;
    color: #1a2338;
}

.fa-toolbar {
    display: flex;
    align-items: center;
    gap: 14px;
    padding-bottom: 16px;
    margin-bottom: 4px;
}

.fa-toolbar p {
    margin: 0;
    font-style: italic;
    color: #34435c;
}

.fa-btn {
    height: 34px;
    padding: 0 22px;
    border: none;
    border-radius: 6px;
    background: var(--accent);
    color: white;
    font-weight: 600;
    font-size: 13.5px;
    cursor: pointer;
    flex-shrink: 0;
}

.fa-btn:hover {
    background: #1742b0;
}

.fa-btn:disabled {
    opacity: .6;
    cursor: not-allowed;
}

.fa-table-wrap {
    overflow-x: auto;
    border: 1px solid #d7dee8;
    border-radius: 6px;
    margin-bottom: 30px;
}

.fa-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.fa-table th {
    text-align: left;
    padding: 10px 12px;
    background: #f8fafc;
    color: #1a2338;
    font-weight: 700;
    border-bottom: 1px solid #1a2338;
    white-space: nowrap;
}

.fa-table td {
    padding: 8px 12px;
    border-bottom: 1px solid #eef1f5;
    color: #1a2338;
    vertical-align: middle;
    white-space: nowrap;
}

.fa-table tbody tr:hover {
    background: #fafbff;
}

.fa-id-cell {
    color: #71809b;
    width: 30px;
}

.fa-name-cell {
    font-weight: 600;
    min-width: 200px;
    white-space: normal;
}

.fa-status-enabled {
    color: #1a8f4c;
    font-weight: 600;
}

.fa-status-disabled {
    color: #b91c1c;
    font-weight: 600;
}

.fa-meta-cell {
    color: #5a6478;
}

.fa-priority-input {
    width: 50px;
    height: 30px;
    padding: 0 8px;
    border-radius: 5px;
    border: 1px solid #cfd4dc;
    font-size: 12.5px;
    text-align: center;
}

.fa-text-input {
    width: 140px;
    height: 30px;
    padding: 0 8px;
    border-radius: 5px;
    border: 1px solid #cfd4dc;
    font-size: 12.5px;
}

.fa-acl-select {
    width: 100%;
    min-width: 300px;
    height: 32px;
    padding: 0 8px;
    border-radius: 5px;
    border: 1px solid #cfd4dc;
    font-size: 12.5px;
}

.fa-loading, .fa-empty {
    text-align: center;
    padding: 40px;
    color: #71809b;
}

.fa-register-link {
    color: #1e4fd8;
    cursor: pointer;
    font-weight: 600;
}

.fa-register-link:hover {
    text-decoration: underline;
}

.fa-cloud-icon {
    margin-left: 4px;
    color: #71809b;
}

:root[data-theme="dark"] .fa-page h1,
:root[data-theme="dark"] .fa-section-title { color: var(--text-primary); }
:root[data-theme="dark"] .fa-toolbar p { color: var(--text-primary); }
:root[data-theme="dark"] .fa-id-cell,
:root[data-theme="dark"] .fa-meta-cell,
:root[data-theme="dark"] .fa-loading,
:root[data-theme="dark"] .fa-empty,
:root[data-theme="dark"] .fa-cloud-icon { color: var(--text-muted); }
:root[data-theme="dark"] .fa-priority-input,
:root[data-theme="dark"] .fa-text-input,
:root[data-theme="dark"] .fa-acl-select {
    background: var(--bg-surface-alt);
    border-color: var(--border-color);
    color: var(--text-primary);
}
</style>

<div class="fa-page">
    <h1>Forms Administration</h1>

    <h2 class="fa-section-title">Registered</h2>

    <div class="fa-toolbar">
        <p>click here to update priority, category, nickname and access control settings</p>
        <button type="button" class="fa-btn" id="faSaveBtn">Save</button>
    </div>

    <div id="faAlert"></div>

    <div class="fa-table-wrap">
        <table class="fa-table">
            <thead>
                <tr>
                    <th></th>
                    <th>Name</th>
                    <th></th>
                    <th></th>
                    <th></th>
                    <th>Priority</th>
                    <th>Category</th>
                    <th>Nickname</th>
                    <th>Access Control</th>
                </tr>
            </thead>
            <tbody id="faRegisteredBody">
                <tr><td colspan="9" class="fa-loading">Loading...</td></tr>
            </tbody>
        </table>
    </div>

    <h2 class="fa-section-title">Unregistered</h2>

    <div class="fa-table-wrap">
        <table class="fa-table">
            <tbody id="faUnregisteredBody">
                <tr><td colspan="4" class="fa-loading">Loading...</td></tr>
            </tbody>
        </table>
    </div>
</div>
`;
}

export const ACCESS_CONTROL_GROUPS = [
    {
        label: "Accounting",
        options: [
            ["acct|bill", "Billing (write optional)"],
            ["acct|disc", "Price Discounting"],
            ["acct|eob", "EOB Data Entry"],
            ["acct|rep", "Financial Reporting - my encounters"],
            ["acct|rep_a", "Financial Reporting - anything"]
        ]
    },
    {
        label: "Administration",
        options: [
            ["admin|acl", "ACL Administration"],
            ["admin|batchcom", "Batch Communication Tool"],
            ["admin|calendar", "Calendar Settings"],
            ["admin|database", "Database Reporting"],
            ["admin|drugs", "Inventory Administration"],
            ["admin|forms", "Forms Administration"],
            ["admin|language", "Language Interface Tool"],
            ["admin|manage_modules", "Manage modules"],
            ["admin|menu", "Menu"],
            ["admin|practice", "Practice Settings"],
            ["admin|super", "Superuser"],
            ["admin|superbill", "Superbill Codes Administration"],
            ["admin|users", "Users/Groups/Logs Administration"]
        ]
    },
    {
        label: "Encounters",
        options: [
            ["encounters|auth", "Authorize - my encounters"],
            ["encounters|auth_a", "Authorize - any encounters"],
            ["encounters|coding", "Coding - my encounters (write,wsome optional)"],
            ["encounters|coding_a", "Coding - any encounters (write,wsome optional)"],
            ["encounters|date_a", "Fix encounter dates - any encounters"],
            ["encounters|notes", "Notes - my encounters (write,addonly optional)"],
            ["encounters|notes_a", "Notes - any encounters (write,addonly optional)"],
            ["encounters|relaxed", "Less-private information (write,addonly optional)"]
        ]
    },
    {
        label: "Groups",
        options: [
            ["groups|gadd", "View/Add/Update groups"],
            ["groups|gcalendar", "View/Create/Update groups appointment in calendar"],
            ["groups|gdlog", "Group detailed log of appointment in patient record"],
            ["groups|glog", "Group encounter log"],
            ["groups|gm", "Send message from the permanent group therapist to the personal therapist"]
        ]
    },
    {
        label: "Inventory",
        options: [
            ["inventory|adjustments", "Adjustments"],
            ["inventory|consumption", "Consumption"],
            ["inventory|destruction", "Destruction"],
            ["inventory|lots", "Lots"],
            ["inventory|purchases", "Purchases"],
            ["inventory|reporting", "Reporting"],
            ["inventory|sales", "Sales"],
            ["inventory|transfers", "Transfers"]
        ]
    },
    {
        label: "Lists",
        options: [
            ["lists|country", "Country List (write,addonly optional)"],
            ["lists|default", "Default List (write,addonly optional)"],
            ["lists|ethrace", "Ethnicity-Race List (write,addonly optional)"],
            ["lists|language", "Language List (write,addonly optional)"],
            ["lists|state", "State List (write,addonly optional)"]
        ]
    },
    {
        label: "Menus",
        options: [["menus|modle", "Modules"]]
    },
    {
        label: "Nation Notes",
        options: [["nationnotes|nn_configure", "Nation Notes Configure"]]
    },
    {
        label: "Patient Portal",
        options: [["patientportal|portal", "Patient Portal"]]
    },
    {
        label: "Patients",
        options: [
            ["patients|alert", "Clinical Reminders/Alerts (write,addonly optional)"],
            ["patients|amendment", "Amendments (write,addonly optional)"],
            ["patients|appt", "Appointments (write,wsome optional)"],
            ["patients|demo", "Demographics (write,addonly optional)"],
            ["patients|disclosure", "Disclosures (write,addonly optional)"],
            ["patients|docs", "Documents (write,addonly optional)"],
            ["patients|docs_rm", "Documents Delete"],
            ["patients|lab", "Lab Results (write,addonly optional)"],
            ["patients|med", "Medical/History (write,addonly optional)"],
            ["patients|notes", "Patient Notes (write,addonly optional)"],
            ["patients|pat_rep", "Patient Report"],
            ["patients|reminder", "Patient Reminders (write,addonly optional)"],
            ["patients|rx", "Prescriptions (write,addonly optional)"],
            ["patients|sign", "Sign Lab Results (write,addonly optional)"],
            ["patients|trans", "Transactions (write optional)"]
        ]
    },
    {
        label: "Placeholder",
        options: [["placeholder|filler", "Placeholder (Maintains empty ACLs)"]]
    },
    {
        label: "Sensitivities",
        options: [
            ["sensitivities|high", "High"],
            ["sensitivities|normal", "Normal"]
        ]
    }
];
