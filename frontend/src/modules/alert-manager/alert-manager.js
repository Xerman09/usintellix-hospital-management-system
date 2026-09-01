import { api } from "../../core/api.js?v=5";
import { showToast } from "../../core/toast.js";

const ACCESS_CONTROL_GROUPS = [
    {
        label: "Accounting",
        options: [
            ["acct:bill", "Accounting: Billing (write optional)"],
            ["acct:disc", "Accounting: Price Discounting"],
            ["acct:eob", "Accounting: EOB Data Entry"],
            ["acct:rep", "Accounting: Financial Reporting - my encounters"],
            ["acct:rep_a", "Accounting: Financial Reporting - anything"]
        ]
    },
    {
        label: "Administration",
        options: [
            ["admin:acl", "Administration: ACL Administration"],
            ["admin:batchcom", "Administration: Batch Communication Tool"],
            ["admin:calendar", "Administration: Calendar Settings"],
            ["admin:database", "Administration: Database Reporting"],
            ["admin:drugs", "Administration: Inventory Administration"],
            ["admin:forms", "Administration: Forms Administration"],
            ["admin:language", "Administration: Language Interface Tool"],
            ["admin:manage_modules", "Administration: Manage modules"],
            ["admin:menu", "Administration: Menu"],
            ["admin:practice", "Administration: Practice Settings"],
            ["admin:super", "Administration: Superuser"],
            ["admin:superbill", "Administration: Superbill Codes Administration"],
            ["admin:users", "Administration: Users/Groups/Logs Administration"]
        ]
    },
    {
        label: "Encounters",
        options: [
            ["encounters:auth", "Encounters: Authorize - my encounters"],
            ["encounters:auth_a", "Encounters: Authorize - any encounters"],
            ["encounters:coding", "Encounters: Coding - my encounters (write,wsome optional)"],
            ["encounters:coding_a", "Encounters: Coding - any encounters (write,wsome optional)"],
            ["encounters:date_a", "Encounters: Fix encounter dates - any encounters"],
            ["encounters:notes", "Encounters: Notes - my encounters (write,addonly optional)"],
            ["encounters:notes_a", "Encounters: Notes - any encounters (write,addonly optional)"],
            ["encounters:relaxed", "Encounters: Less-private information (write,addonly optional)"]
        ]
    },
    {
        label: "Lists",
        options: [
            ["lists:country", "Lists: Country List (write,addonly optional)"],
            ["lists:default", "Lists: Default List (write,addonly optional)"],
            ["lists:ethrace", "Lists: Ethnicity-Race List (write,addonly optional)"],
            ["lists:language", "Lists: Language List (write,addonly optional)"],
            ["lists:state", "Lists: State List (write,addonly optional)"]
        ]
    },
    {
        label: "Patient Portal",
        options: [["patientportal:portal", "Patient Portal: Patient Portal"]]
    },
    {
        label: "Patients",
        options: [
            ["patients:alert", "Patients: Clinical Reminders/Alerts (write,addonly optional)"],
            ["patients:amendment", "Patients: Amendments (write,addonly optional)"],
            ["patients:appt", "Patients: Appointments (write,wsome optional)"],
            ["patients:demo", "Patients: Demographics (write,addonly optional)"],
            ["patients:disclosure", "Patients: Disclosures (write,addonly optional)"],
            ["patients:docs", "Patients: Documents (write,addonly optional)"],
            ["patients:docs_rm", "Patients: Documents Delete"],
            ["patients:lab", "Patients: Lab Results (write,addonly optional)"],
            ["patients:med", "Patients: Medical/History (write,addonly optional)"],
            ["patients:notes", "Patients: Patient Notes (write,addonly optional)"],
            ["patients:pat_rep", "Patients: Patient Report"],
            ["patients:reminder", "Patients: Patient Reminders (write,addonly optional)"],
            ["patients:rx", "Patients: Prescriptions (write,addonly optional)"],
            ["patients:sign", "Patients: Sign Lab Results (write,addonly optional)"],
            ["patients:trans", "Patients: Transactions (write optional)"]
        ]
    },
    {
        label: "Sensitivities",
        options: [
            ["sensitivities:high", "Sensitivities: High"],
            ["sensitivities:normal", "Sensitivities: Normal"]
        ]
    },
    {
        label: "Other",
        options: [
            ["placeholder:filler", "Placeholder: Placeholder (Maintains empty ACLs)"],
            ["nationnotes:nn_configure", "Nation Notes: Nation Notes Configure"],
            ["menus:modle", "Menus: Modules"]
        ]
    },
    {
        label: "Groups",
        options: [
            ["groups:gadd", "Groups: View/Add/Update groups"],
            ["groups:gcalendar", "Groups: View/Create/Update groups appointment in calendar"],
            ["groups:gdlog", "Groups: Group detailed log of appointment in patient record"],
            ["groups:glog", "Groups: Group encounter log"],
            ["groups:gm", "Groups: Send message from the permanent group therapist to the personal therapist"]
        ]
    },
    {
        label: "Inventory",
        options: [
            ["inventory:adjustments", "Inventory: Adjustments"],
            ["inventory:consumption", "Inventory: Consumption"],
            ["inventory:destruction", "Inventory: Destruction"],
            ["inventory:lots", "Inventory: Lots"],
            ["inventory:purchases", "Inventory: Purchases"],
            ["inventory:reporting", "Inventory: Reporting"],
            ["inventory:sales", "Inventory: Sales"],
            ["inventory:transfers", "Inventory: Transfers"]
        ]
    }
];

let originalRules = [];

export async function initAlertManager()
{
    document.getElementById("amSaveBtn").addEventListener("click", handleSave);
    document.getElementById("amResetBtn").addEventListener("click", () => renderRows(originalRules));

    await loadRules();
}

async function loadRules()
{
    const tbody = document.getElementById("amTableBody");
    tbody.innerHTML = `<tr><td colspan="5" class="am-loading">Loading...</td></tr>`;

    const result = await api("/practice-rules");

    if (!result.success) {
        tbody.innerHTML = `<tr><td colspan="5" class="am-loading">${escapeHtml(result.message || "Failed to load rules.")}</td></tr>`;
        return;
    }

    originalRules = result.data || [];
    renderRows(originalRules);
}

function renderRows(rules)
{
    const tbody = document.getElementById("amTableBody");
    document.getElementById("amFormAlert").innerHTML = "";

    if (!rules.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="am-empty">No rules configured yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = rules.map((rule) => `
        <tr data-rule-id="${rule.id}">
            <td class="am-title-cell">${escapeHtml(rule.title)}</td>
            <td class="am-center"><input type="checkbox" class="am-checkbox" data-field="is_active_alert" ${Number(rule.is_active_alert) ? "checked" : ""}></td>
            <td class="am-center"><input type="checkbox" class="am-checkbox" data-field="is_passive_alert" ${Number(rule.is_passive_alert) ? "checked" : ""}></td>
            <td class="am-center"><input type="checkbox" class="am-checkbox" data-field="is_patient_reminder" ${Number(rule.is_patient_reminder) ? "checked" : ""}></td>
            <td>${renderAclSelect(rule.access_control)}</td>
        </tr>
    `).join("");
}

function renderAclSelect(currentValue)
{
    const groupsHtml = ACCESS_CONTROL_GROUPS.map((group) => `
        <optgroup label="${escapeHtml(group.label)}">
            ${group.options.map(([value, label]) => `<option value="${escapeHtml(value)}" ${value === currentValue ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
        </optgroup>
    `).join("");

    return `<select class="am-acl-select" data-field="access_control"><option value="">-- None --</option>${groupsHtml}</select>`;
}

async function handleSave()
{
    const saveBtn = document.getElementById("amSaveBtn");
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    const rows = [...document.querySelectorAll("#amTableBody tr[data-rule-id]")].map((row) => ({
        id: Number(row.dataset.ruleId),
        is_active_alert: row.querySelector('[data-field="is_active_alert"]').checked,
        is_passive_alert: row.querySelector('[data-field="is_passive_alert"]').checked,
        is_patient_reminder: row.querySelector('[data-field="is_patient_reminder"]').checked,
        access_control: row.querySelector('[data-field="access_control"]').value || null
    }));

    const result = await api("/practice-rules/alert-manager", {
        method: "PUT",
        body: JSON.stringify({ rows })
    });

    saveBtn.disabled = false;
    saveBtn.textContent = "Save";

    if (!result.success) {
        document.getElementById("amFormAlert").innerHTML = `<div class="form-alert error">${escapeHtml(result.message || "Failed to save.")}</div>`;
        showToast(result.message || "Failed to save alert manager settings.", "error");
        return;
    }

    showToast("Alert manager settings saved successfully.", "success");
    await loadRules();
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}
