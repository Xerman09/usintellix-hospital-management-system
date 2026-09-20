import { api } from "../../core/api.js";
import { logReportRun } from "./report-history.js";

let currentRecords = [];
let availableDepts = [];

export async function initCriticalTAT() {
    setupEventListeners();
    await fetchCriticalTAT();
}

function setupEventListeners() {
    const applyBtn = document.getElementById("ctatApplyBtn");
    if (applyBtn) applyBtn.addEventListener("click", () => fetchCriticalTAT());

    const resetBtn = document.getElementById("ctatResetBtn");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            ["ctatDateFrom","ctatDateTo","ctatSearchInput"].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = "";
            });
            ["ctatTypeFilter","ctatDeptFilter","ctatStatusFilter","ctatCompliantFilter"].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = el.options[0]?.value ?? "";
            });
            fetchCriticalTAT();
        });
    }

    const printBtn = document.getElementById("ctatPrintBtn");
    if (printBtn) printBtn.addEventListener("click", () => window.print());

    // Add Modal
    const addBtn = document.getElementById("ctatAddBtn");
    const addModal = document.getElementById("ctatAddModal");
    const cancelAddBtn = document.getElementById("ctatCancelAddBtn");
    const cancelAddBtn2 = document.getElementById("ctatCancelAddBtn2");
    if (addBtn && addModal) addBtn.addEventListener("click", () => { addModal.style.display = "flex"; });
    if (cancelAddBtn && addModal) cancelAddBtn.addEventListener("click", () => { addModal.style.display = "none"; });
    if (cancelAddBtn2 && addModal) cancelAddBtn2.addEventListener("click", () => { addModal.style.display = "none"; });
    if (addModal) {
        addModal.addEventListener("click", (e) => { if (e.target === addModal) addModal.style.display = "none"; });
    }

    // Add form submit
    const addForm = document.getElementById("ctatAddForm");
    if (addForm) addForm.addEventListener("submit", handleAddSubmit);

    // Detail Modal close
    const detailModal = document.getElementById("ctatDetailModal");
    const closeDetail1 = document.getElementById("ctatCloseDetailModal");
    const closeDetail2 = document.getElementById("ctatCloseDetailBtn");
    if (closeDetail1 && detailModal) closeDetail1.addEventListener("click", () => { detailModal.style.display = "none"; });
    if (closeDetail2 && detailModal) closeDetail2.addEventListener("click", () => { detailModal.style.display = "none"; });
    if (detailModal) {
        detailModal.addEventListener("click", (e) => { if (e.target === detailModal) detailModal.style.display = "none"; });
    }

    // Detail form submit
    const detailForm = document.getElementById("ctatDetailForm");
    if (detailForm) detailForm.addEventListener("submit", handleDetailSubmit);
}

async function fetchCriticalTAT() {
    const tbody = document.getElementById("ctatTableBody");
    if (tbody) tbody.innerHTML = `<tr><td colspan="12" style="padding:40px;text-align:center;color:#64748b;font-style:italic;">Loading critical result turnaround records...</td></tr>`;

    const dateFrom  = document.getElementById("ctatDateFrom")?.value || "";
    const dateTo    = document.getElementById("ctatDateTo")?.value || "";
    const testType  = document.getElementById("ctatTypeFilter")?.value || "";
    const dept      = document.getElementById("ctatDeptFilter")?.value || "";
    const status    = document.getElementById("ctatStatusFilter")?.value || "";
    const compliant = document.getElementById("ctatCompliantFilter")?.value ?? "";
    const search    = document.getElementById("ctatSearchInput")?.value || "";

    const params = new URLSearchParams();
    if (dateFrom)           params.append("date_from", dateFrom);
    if (dateTo)             params.append("date_to", dateTo);
    if (testType)           params.append("test_type", testType);
    if (dept)               params.append("department", dept);
    if (status)             params.append("status", status);
    if (compliant !== "")   params.append("compliant", compliant);
    if (search)             params.append("search", search);

    try {
        const res = await api(`/reports/critical-tat?${params.toString()}`);
        if (res.success && res.data) {
            currentRecords   = res.data.records || [];
            availableDepts   = res.data.departments || [];
            updateKpis(res.data.kpis);
            populateDeptSelect(availableDepts);
            renderTable(currentRecords);
            logReportRun("Critical Diagnostic TAT Report", "critical_tat", { date_from: dateFrom, date_to: dateTo });
        } else {
            if (tbody) tbody.innerHTML = `<tr><td colspan="12" style="padding:30px;text-align:center;color:#ef4444;">Failed to load critical TAT records.</td></tr>`;
        }
    } catch (err) {
        console.error("Error fetching critical TAT:", err);
        if (tbody) tbody.innerHTML = `<tr><td colspan="12" style="padding:30px;text-align:center;color:#ef4444;">Server error loading report.</td></tr>`;
    }
}

function updateKpis(kpis) {
    if (!kpis) return;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val ?? "0"; };
    set("ctatKpiTotal",    kpis.total_records ?? 0);
    set("ctatKpiCompliant", kpis.compliant_count ?? 0);
    set("ctatKpiBreach",   kpis.breach_count ?? 0);
    set("ctatKpiAvgTat",   kpis.avg_tat_minutes !== null ? (kpis.avg_tat_minutes ?? 0) + " min" : "N/A");
    set("ctatKpiPending",  kpis.pending_ack ?? 0);
    set("ctatKpiReadBack", kpis.read_back_done ?? 0);

    // Compliance rate sub-label
    const rateEl = document.getElementById("ctatKpiCompliantRate");
    if (rateEl) rateEl.textContent = (kpis.compliance_rate ?? 0) + "% compliant";
}

function populateDeptSelect(depts) {
    const sel = document.getElementById("ctatDeptFilter");
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = `<option value="">All Departments</option>`;
    depts.forEach(d => {
        const opt = document.createElement("option");
        opt.value = d; opt.textContent = d;
        if (d === cur) opt.selected = true;
        sel.appendChild(opt);
    });
}

function renderTable(records) {
    const tbody = document.getElementById("ctatTableBody");
    if (!tbody) return;
    if (!records.length) {
        tbody.innerHTML = `<tr><td colspan="12" style="padding:30px;text-align:center;color:#64748b;">No critical result records found matching the current filters.</td></tr>`;
        return;
    }
    tbody.innerHTML = records.map(r => {
        const tatTotal   = r.tat_total !== null ? parseInt(r.tat_total) : null;
        const tatToCall  = r.tat_result_to_first_call !== null ? parseInt(r.tat_result_to_first_call) : null;
        const policyLim  = parseInt(r.policy_limit_minutes ?? 30);
        const isBreach   = tatTotal !== null && tatTotal > policyLim;
        const tatClass   = isBreach ? "tat-breach" : "";

        return `
        <tr>
            <td style="font-family:monospace;font-size:12px;font-weight:700;color:#3b82f6;">${escHtml(r.tracking_number)}</td>
            <td style="white-space:nowrap;font-size:12px;">${formatDateTime(r.result_date)}</td>
            <td><span style="font-size:11px;background:#e0f2fe;color:#0369a1;padding:2px 6px;border-radius:4px;font-weight:600;">${escHtml(r.test_type)}</span></td>
            <td style="font-size:12px;max-width:180px;">${escHtml(r.test_name)}</td>
            <td style="font-size:11px;max-width:180px;color:#b91c1c;font-weight:600;">${escHtml(r.critical_value)}</td>
            <td style="font-size:12px;">${escHtml(r.ordering_department)}<br><small style="color:#64748b;">${escHtml(r.patient_location || '')}</small></td>
            <td class="${tatToCall !== null && tatToCall > 15 ? 'tat-breach' : ''}" style="text-align:center;font-weight:700;">
                ${tatToCall !== null ? tatToCall + ' min' : '<span style="color:#94a3b8;">—</span>'}
            </td>
            <td class="${tatClass}" style="text-align:center;font-weight:700;">
                ${tatTotal !== null ? tatTotal + ' min' : '<span style="color:#94a3b8;">—</span>'}
            </td>
            <td style="text-align:center;">${getCompliantBadge(r.jcaho_compliant, r.status)}</td>
            <td style="text-align:center;">${getReadBackBadge(r.read_back_confirmed)}</td>
            <td>${getStatusBadge(r.status)}</td>
            <td>
                <button onclick="window.__ctatOpenDetail(${r.id})" style="background:#3b82f6;color:#fff;border:none;padding:4px 10px;border-radius:5px;cursor:pointer;font-size:11px;font-weight:600;">View / Update</button>
            </td>
        </tr>`;
    }).join("");

    // Register global helper
    window.__ctatOpenDetail = openDetailModal;
}

function getCompliantBadge(compliant, status) {
    if (status === "Pending" || status === "Notified") {
        return `<span style="display:inline-block;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;background:#fef3c7;color:#92400e;">Pending</span>`;
    }
    if (parseInt(compliant) === 1) {
        return `<span style="display:inline-block;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;background:#dcfce7;color:#166534;">✓ Compliant</span>`;
    }
    return `<span style="display:inline-block;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;background:#fee2e2;color:#991b1b;">✗ Breach</span>`;
}

function getReadBackBadge(confirmed) {
    if (parseInt(confirmed) === 1) {
        return `<span style="display:inline-block;padding:3px 7px;border-radius:4px;font-size:11px;font-weight:700;background:#dcfce7;color:#166534;">Yes</span>`;
    }
    return `<span style="display:inline-block;padding:3px 7px;border-radius:4px;font-size:11px;font-weight:700;background:#fee2e2;color:#991b1b;">No</span>`;
}

function getStatusBadge(status) {
    const styles = {
        "Pending":      "background:#f1f5f9;color:#475569",
        "Notified":     "background:#e0f2fe;color:#0369a1",
        "Acknowledged": "background:#dcfce7;color:#166534",
        "Documented":   "background:#dbeafe;color:#1e40af",
        "Breached":     "background:#fee2e2;color:#991b1b",
        "Escalated":    "background:#f3e8ff;color:#7e22ce",
    };
    const style = styles[status] || "background:#f1f5f9;color:#475569";
    return `<span style="display:inline-block;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;${style};">${escHtml(status)}</span>`;
}

async function openDetailModal(id) {
    const modal = document.getElementById("ctatDetailModal");
    if (!modal) return;
    try {
        const res = await api(`/reports/critical-tat/details?id=${id}`);
        if (res.success && res.data) {
            populateDetailModal(res.data);
            modal.style.display = "flex";
        } else {
            alert("Failed to load record details.");
        }
    } catch (err) {
        console.error(err);
        alert("Error loading record details.");
    }
}

function populateDetailModal(r) {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val ?? "N/A"; };
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ""; };
    const setChk = (id, val) => { const el = document.getElementById(id); if (el) el.checked = parseInt(val) === 1; };

    document.getElementById("ctatDetailRecordId").value = r.id;
    set("ctatDetailTrackingNum",  r.tracking_number);
    set("ctatDetailTestInfo",     `${r.test_type} — ${r.test_name}`);
    set("ctatDetailCriticalValue", r.critical_value);
    set("ctatDetailResultDate",   formatDateTime(r.result_date));
    set("ctatDetailDept",         `${r.ordering_department}${r.patient_location ? ' | ' + r.patient_location : ''}`);
    set("ctatDetailPatient",      r.patient_name ? `${r.patient_name} (${r.patient_mrn || 'N/A'})` : "No patient linked");
    set("ctatDetailReporter",     `${r.reported_by} (${r.reported_by_role || 'Staff'})`);
    set("ctatDetailFirstCall",    r.first_call_at ? `${formatDateTime(r.first_call_at)} → ${r.first_call_to || ''}` : "Not recorded");
    set("ctatDetailAcknowledged", r.acknowledged_at ? `${formatDateTime(r.acknowledged_at)} by ${r.acknowledged_by || ''}` : "Not yet acknowledged");
    set("ctatDetailTatBreakdown", buildTatBreakdown(r));
    set("ctatDetailNormalRange",  r.normal_range || "—");
    set("ctatDetailActionTaken",  r.action_taken || "None documented");

    // Compliance
    const compEl = document.getElementById("ctatDetailCompliance");
    if (compEl) {
        if (r.status === "Pending" || r.status === "Notified") {
            compEl.innerHTML = `<span style="background:#fef3c7;color:#92400e;padding:4px 10px;border-radius:5px;font-weight:700;">Pending Acknowledgment</span>`;
        } else if (parseInt(r.jcaho_compliant) === 1) {
            compEl.innerHTML = `<span style="background:#dcfce7;color:#166534;padding:4px 10px;border-radius:5px;font-weight:700;">✓ JCAHO Compliant</span>`;
        } else {
            compEl.innerHTML = `<span style="background:#fee2e2;color:#991b1b;padding:4px 10px;border-radius:5px;font-weight:700;">✗ TAT Policy Breach</span>`;
        }
    }

    // Update form defaults
    setVal("ctatUAcknowledgedAt",   r.acknowledged_at ? r.acknowledged_at.replace(" ", "T").substring(0,16) : "");
    setVal("ctatUAcknowledgedBy",   r.acknowledged_by);
    setVal("ctatUAcknowledgedByRole", r.acknowledged_by_role);
    setChk("ctatUReadBack",         r.read_back_confirmed);
    setVal("ctatUDocumentedAt",     r.documented_in_chart_at ? r.documented_in_chart_at.replace(" ", "T").substring(0,16) : "");
    setVal("ctatUActionTaken",      r.action_taken);
    setVal("ctatUStatus",           r.status);
    setVal("ctatUBreachReason",     r.breach_reason);
    setVal("ctatUNotes",            r.notes);
}

function buildTatBreakdown(r) {
    const parts = [];
    if (r.tat_result_to_first_call !== null) parts.push(`Result → First Call: ${r.tat_result_to_first_call} min`);
    if (r.tat_first_call_to_ack !== null) parts.push(`First Call → Ack: ${r.tat_first_call_to_ack} min`);
    if (r.tat_total !== null) parts.push(`Total TAT: ${r.tat_total} min (Policy: ${r.policy_limit_minutes} min)`);
    return parts.length ? parts.join(" | ") : "Turnaround not yet calculated";
}

async function handleAddSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById("ctatSubmitAddBtn");
    if (btn) { btn.disabled = true; btn.textContent = "Submitting..."; }

    const payload = {
        test_type:             document.getElementById("ctatFTestType")?.value || "Laboratory",
        test_name:             document.getElementById("ctatFTestName")?.value || "",
        critical_value:        document.getElementById("ctatFCriticalValue")?.value || "",
        normal_range:          document.getElementById("ctatFNormalRange")?.value || "",
        ordering_department:   document.getElementById("ctatFDepartment")?.value || "",
        patient_location:      document.getElementById("ctatFPatientLocation")?.value || "",
        patient_name:          document.getElementById("ctatFPatientName")?.value || "",
        patient_mrn:           document.getElementById("ctatFPatientMrn")?.value || "",
        reported_by:           document.getElementById("ctatFReportedBy")?.value || "",
        reported_by_role:      document.getElementById("ctatFReporterRole")?.value || "",
        result_available_at:   (document.getElementById("ctatFResultAvailableAt")?.value || "").replace("T", " "),
        first_call_at:         (document.getElementById("ctatFFirstCallAt")?.value || "").replace("T", " "),
        first_call_to:         document.getElementById("ctatFFirstCallTo")?.value || "",
        first_call_method:     document.getElementById("ctatFFirstCallMethod")?.value || "Phone",
        acknowledged_at:       (document.getElementById("ctatFAcknowledgedAt")?.value || "").replace("T", " "),
        acknowledged_by:       document.getElementById("ctatFAcknowledgedBy")?.value || "",
        acknowledged_by_role:  document.getElementById("ctatFAcknowledgedByRole")?.value || "",
        read_back_confirmed:   document.getElementById("ctatFReadBack")?.checked ? 1 : 0,
        documented_in_chart_at:(document.getElementById("ctatFDocumentedAt")?.value || "").replace("T", " "),
        action_taken:          document.getElementById("ctatFActionTaken")?.value || "",
        notes:                 document.getElementById("ctatFNotes")?.value || "",
        result_date:           (document.getElementById("ctatFResultAvailableAt")?.value || "").replace("T", " "),
    };

    try {
        const res = await api("/reports/critical-tat", { method: "POST", body: JSON.stringify(payload) });
        if (res.success) {
            alert(`Critical result logged! Tracking Number: ${res.data?.tracking_number || "CRT"}`);
            document.getElementById("ctatAddModal").style.display = "none";
            document.getElementById("ctatAddForm").reset();
            fetchCriticalTAT();
        } else {
            alert("Error: " + (res.message || "Failed to log record."));
        }
    } catch (err) {
        console.error(err);
        alert("An error occurred while submitting.");
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = "Submit Log"; }
    }
}

async function handleDetailSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById("ctatSaveDetailBtn");
    if (btn) { btn.disabled = true; btn.textContent = "Saving..."; }

    const id = document.getElementById("ctatDetailRecordId")?.value;
    const payload = {
        id:                    parseInt(id),
        acknowledged_at:       (document.getElementById("ctatUAcknowledgedAt")?.value || "").replace("T", " "),
        acknowledged_by:       document.getElementById("ctatUAcknowledgedBy")?.value || "",
        acknowledged_by_role:  document.getElementById("ctatUAcknowledgedByRole")?.value || "",
        read_back_confirmed:   document.getElementById("ctatUReadBack")?.checked ? 1 : 0,
        documented_in_chart_at:(document.getElementById("ctatUDocumentedAt")?.value || "").replace("T", " "),
        action_taken:          document.getElementById("ctatUActionTaken")?.value || "",
        status:                document.getElementById("ctatUStatus")?.value || "",
        breach_reason:         document.getElementById("ctatUBreachReason")?.value || "",
        notes:                 document.getElementById("ctatUNotes")?.value || "",
    };

    try {
        const res = await api("/reports/critical-tat/update", { method: "POST", body: JSON.stringify(payload) });
        if (res.success) {
            alert("Record updated successfully!");
            document.getElementById("ctatDetailModal").style.display = "none";
            fetchCriticalTAT();
        } else {
            alert("Error: " + (res.message || "Failed to update."));
        }
    } catch (err) {
        console.error(err);
        alert("An error occurred while saving.");
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = "Save & Update"; }
    }
}

function formatDateTime(dt) {
    if (!dt) return "N/A";
    try {
        return new Date(dt).toLocaleString("en-PH", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
    } catch { return dt; }
}

function escHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
