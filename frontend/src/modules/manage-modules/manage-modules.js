

const customModulesData = [
    { id: 1, module: "Dashboard Context Service v1.0.0", release: "0.0.0", status: "Registered", menuText: "Oe-module-dashboard-context", nickName: "", type: "Custom", deps: "-" },
    { id: 2, module: "Comlink Telehealth Module v2.0.0", release: "0.0.0", status: "Registered", menuText: "Oe module comlink telehealth", nickName: "", type: "Custom", deps: "-" },
    { id: 3, module: "Weno EZ Integration eRx Module", release: "0.0.0", status: "Registered", menuText: "Oe-module-weno", nickName: "", type: "Custom", deps: "-" },
    { id: 4, module: "Advanced Prior Auth", release: "0.0.0", status: "Registered", menuText: "Oe-module-prior-authorizations", nickName: "", type: "Custom", deps: "-" },
    { id: 5, module: "Electronic Health Information Exporter v1.0.1", release: "0.0.0", status: "Registered", menuText: "Oe module ehi exporter", nickName: "", type: "Custom", deps: "-" },
    { id: 6, module: "ClaimRev Clearinghouse Connector", release: "0.0.0", status: "Registered", menuText: "Oe-module-claimrev-connect", nickName: "", type: "Custom", deps: "-" },
    { id: 7, module: "Fax SMS Email Voice Module", release: "0.0.0", status: "Registered", menuText: "Oe-module-faxsms", nickName: "", type: "Custom", deps: "-" },
    { id: 8, module: "Diagnostic Ordering Result Network (DORN)", release: "0.0.0", status: "Registered", menuText: "Oe-module-dorn", nickName: "", type: "Custom", deps: "-" }
];

const laminasModulesData = [
    { id: 1, module: "Immunization", release: "0.0.0", status: "Active", menuText: "Immunization", nickName: "", type: "Laminas", deps: "-", active: true },
    { id: 2, module: "Syndromicsurveillance", release: "0.0.0", status: "Active", menuText: "Syndromicsurveillance", nickName: "", type: "Laminas", deps: "-", active: true },
    { id: 3, module: "Documents", release: "0.0.0", status: "Active", menuText: "Documents", nickName: "", type: "Laminas", deps: "-", active: true },
    { id: 4, module: "Ccr", release: "0.0.0", status: "Active", menuText: "Ccr", nickName: "", type: "Laminas", deps: "Documents(Enabled)", active: true },
    { id: 5, module: "Carecoordination", release: "0.0.0", status: "Active", menuText: "Carecoordination", nickName: "", type: "Laminas", deps: "Ccr(Enabled), Immunization(Enabled), Syndromicsurveillance(Enabled), Documents(Enabled)", active: true },
    { id: 6, module: "Patientvalidation", release: "0.0.0", status: "Registered", menuText: "Patientvalidation", nickName: "", type: "Laminas", deps: "-", active: false },
    { id: 7, module: "PrescriptionTemplates", release: "0.0.0", status: "Registered", menuText: "Prescriptiontemplates", nickName: "", type: "Laminas", deps: "-", active: false },
    { id: 8, module: "PatientFilter", release: "0.0.0", status: "Registered", menuText: "Patientfilter", nickName: "", type: "Laminas", deps: "-", active: false }
];

export function initManageModules() {
    renderCustomModules();
    renderLaminasModules();
}

function renderCustomModules() {
    const tbody = document.getElementById("customModulesTableBody");
    if (!tbody) return;

    tbody.innerHTML = customModulesData.map(mod => `
        <tr>
            <td>${mod.id}</td>
            <td style="color: #059669; font-weight: 500;">${escapeHtml(mod.module)}</td>
            <td>${escapeHtml(mod.release)}</td>
            <td>${escapeHtml(mod.status)}</td>
            <td>${escapeHtml(mod.menuText)}</td>
            <td><input type="text" class="form-input" style="padding: 4px; height: 28px;" value="${escapeHtml(mod.nickName)}"></td>
            <td>${escapeHtml(mod.type)}</td>
            <td>${escapeHtml(mod.deps)}</td>
            <td>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-primary-inline" style="background-color: #3b82f6; border: none; padding: 4px 12px; font-size: 13px;">Install</button>
                    ${mod.id === 1 ? `<button class="btn-secondary" style="padding: 4px 12px; font-size: 13px;">Install SQL</button>` : ''}
                </div>
            </td>
            <td>
                <div style="display: flex; gap: 4px; align-items: center; justify-content: center;">
                    <div style="width: 20px; height: 20px; border-radius: 50%; background-color: #3b82f6; color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">?</div>
                    <div style="width: 20px; height: 20px; border-radius: 50%; background-color: #f59e0b; color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">R</div>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderLaminasModules() {
    const tbody = document.getElementById("laminasModulesTableBody");
    if (!tbody) return;

    tbody.innerHTML = laminasModulesData.map(mod => `
        <tr>
            <td>${mod.id}</td>
            <td style="color: #3b82f6; font-weight: 500;">${escapeHtml(mod.module)}</td>
            <td>${escapeHtml(mod.release)}</td>
            <td>${escapeHtml(mod.status)}</td>
            <td>${escapeHtml(mod.menuText)}</td>
            <td>
                ${!mod.active ? `<input type="text" class="form-input" style="padding: 4px; height: 28px;" value="${escapeHtml(mod.nickName)}">` : ''}
            </td>
            <td>${escapeHtml(mod.type)}</td>
            <td style="font-size: 13px;">${escapeHtml(mod.deps)}</td>
            <td>
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    ${mod.active 
                        ? `<button class="btn-danger" style="background-color: #b91c1c; border: none; padding: 4px 12px; font-size: 13px; width: fit-content;">Disable</button>` 
                        : `<div style="display: flex; gap: 4px;">
                               <button class="btn-primary-inline" style="background-color: #3b82f6; border: none; padding: 4px 12px; font-size: 13px;">Install</button>
                               ${mod.id === 8 ? `<button class="btn-secondary" style="padding: 4px 12px; font-size: 13px;">Install SQL</button>` : ''}
                           </div>
                           ${mod.id === 8 ? `<button class="btn-secondary" style="padding: 4px 12px; font-size: 13px; width: fit-content;">Install ACL</button>` : ''}`
                    }
                </div>
            </td>
            <td>
                <div style="display: flex; gap: 4px; align-items: center; justify-content: center;">
                    ${mod.active 
                        ? `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`
                        : `<div style="width: 20px; height: 20px; border-radius: 50%; background-color: #f59e0b; color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">R</div>`
                    }
                </div>
            </td>
        </tr>
    `).join('');
}

function escapeHtml(value) {
    if (value === null || value === undefined) {
        return '';
    }
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
