import { api } from "../../core/api.js";
import { logReportRun } from "./report-history.js";

let currentIncidents = [];
let availableDepartments = [];

export async function initIncidentLog() {
    setupEventListeners();
    await fetchIncidentLog();
}

function setupEventListeners() {
    // Filter submit
    const applyBtn = document.getElementById("ilApplyFilterBtn");
    if (applyBtn) {
        applyBtn.addEventListener("click", () => fetchIncidentLog());
    }

    const filterForm = document.getElementById("ilFilterForm");
    if (filterForm) {
        filterForm.addEventListener("submit", (e) => {
            e.preventDefault();
            fetchIncidentLog();
        });
    }

    // Reset filters
    const resetBtn = document.getElementById("ilResetFilterBtn");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            document.getElementById("ilDateFrom").value = "";
            document.getElementById("ilDateTo").value = "";
            document.getElementById("ilDeptFilter").value = "";
            document.getElementById("ilTypeFilter").value = "";
            document.getElementById("ilSeverityFilter").value = "";
            document.getElementById("ilStatusFilter").value = "";
            document.getElementById("ilSearchInput").value = "";
            fetchIncidentLog();
        });
    }

    // Print button
    const printBtn = document.getElementById("ilPrintBtn");
    if (printBtn) {
        printBtn.addEventListener("click", () => {
            window.print();
        });
    }

    // New Incident Modal triggers
    const newBtn = document.getElementById("ilNewIncidentBtn");
    const reportModal = document.getElementById("ilReportModal");
    const closeReportBtn = document.getElementById("ilCloseReportModal");
    const cancelReportBtn = document.getElementById("ilCancelReportBtn");

    if (newBtn && reportModal) {
        newBtn.addEventListener("click", () => {
            openNewIncidentModal();
        });
    }

    if (closeReportBtn && reportModal) {
        closeReportBtn.addEventListener("click", () => {
            reportModal.style.display = "none";
        });
    }

    if (cancelReportBtn && reportModal) {
        cancelReportBtn.addEventListener("click", () => {
            reportModal.style.display = "none";
        });
    }

    // Anonymous toggle
    const anonCheckbox = document.getElementById("ilIsAnonymous");
    const reporterSection = document.getElementById("ilReporterInfoSection");
    if (anonCheckbox && reporterSection) {
        anonCheckbox.addEventListener("change", () => {
            if (anonCheckbox.checked) {
                reporterSection.style.display = "none";
            } else {
                reporterSection.style.display = "grid";
            }
        });
    }

    // Submit New Incident form
    const newForm = document.getElementById("ilNewIncidentForm");
    if (newForm) {
        newForm.addEventListener("submit", handleNewIncidentSubmit);
    }

    // Close Detail/Investigation Modal
    const detailModal = document.getElementById("ilDetailModal");
    const closeDetailBtn = document.getElementById("ilCloseDetailModal");
    const closeDetailBtn2 = document.getElementById("ilCloseDetailBtn");

    if (closeDetailBtn && detailModal) {
        closeDetailBtn.addEventListener("click", () => {
            detailModal.style.display = "none";
        });
    }

    if (closeDetailBtn2 && detailModal) {
        closeDetailBtn2.addEventListener("click", () => {
            detailModal.style.display = "none";
        });
    }

    // Submit Investigation update form
    const investigationForm = document.getElementById("ilInvestigationForm");
    if (investigationForm) {
        investigationForm.addEventListener("submit", handleInvestigationSubmit);
    }

    // Close on backdrop click
    [reportModal, detailModal].forEach(modal => {
        if (modal) {
            modal.addEventListener("click", (e) => {
                if (e.target === modal) {
                    modal.style.display = "none";
                }
            });
        }
    });
}

async function fetchIncidentLog() {
    const tbody = document.getElementById("ilTableBody");
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="9" style="padding: 40px; text-align: center; color: #64748b; font-style: italic;">Loading incidents log...</td></tr>`;
    }

    const dateFrom = document.getElementById("ilDateFrom")?.value || "";
    const dateTo = document.getElementById("ilDateTo")?.value || "";
    const dept = document.getElementById("ilDeptFilter")?.value || "";
    const eventType = document.getElementById("ilTypeFilter")?.value || "";
    const severity = document.getElementById("ilSeverityFilter")?.value || "";
    const status = document.getElementById("ilStatusFilter")?.value || "";
    const search = document.getElementById("ilSearchInput")?.value || "";

    const params = new URLSearchParams();
    if (dateFrom) params.append("date_from", dateFrom);
    if (dateTo) params.append("date_to", dateTo);
    if (dept) params.append("department", dept);
    if (eventType) params.append("event_type", eventType);
    if (severity) params.append("severity_level", severity);
    if (status) params.append("status", status);
    if (search) params.append("search", search);

    try {
        const res = await api(`/reports/incident-log?${params.toString()}`);
        if (res.success && res.data) {
            currentIncidents = res.data.incidents || [];
            availableDepartments = res.data.departments || [];

            updateKpis(res.data.kpis);
            populateDepartmentSelects(availableDepartments);
            renderTable(currentIncidents);

            logReportRun("Incident & Adverse Event Log", "incident_log", {
                date_from: dateFrom,
                date_to: dateTo,
                department: dept,
                event_type: eventType
            });
        } else {
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="9" style="padding: 30px; text-align: center; color: #ef4444;">Failed to load incident reports.</td></tr>`;
            }
        }
    } catch (err) {
        console.error("Error fetching incident log:", err);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="9" style="padding: 30px; text-align: center; color: #ef4444;">Server error loading reports.</td></tr>`;
        }
    }
}

function updateKpis(kpis) {
    if (!kpis) return;
    const totalEl = document.getElementById("ilKpiTotal");
    const medsEl = document.getElementById("ilKpiMedErrors");
    const fallsEl = document.getElementById("ilKpiFalls");
    const nearEl = document.getElementById("ilKpiNearMisses");
    const openEl = document.getElementById("ilKpiOpen");

    if (totalEl) totalEl.textContent = kpis.total_incidents ?? 0;
    if (medsEl) medsEl.textContent = kpis.medication_errors ?? 0;
    if (fallsEl) fallsEl.textContent = kpis.slips_falls ?? 0;
    if (nearEl) nearEl.textContent = kpis.near_misses ?? 0;
    if (openEl) openEl.textContent = kpis.open_investigations ?? 0;
}

function populateDepartmentSelects(departments) {
    const filterSelect = document.getElementById("ilDeptFilter");
    const modalSelect = document.getElementById("ilIncidentDept");

    if (filterSelect && filterSelect.options.length <= 1) {
        departments.forEach(dept => {
            const opt = document.createElement("option");
            opt.value = dept;
            opt.textContent = dept;
            filterSelect.appendChild(opt);
        });
    }

    if (modalSelect && modalSelect.options.length <= 1) {
        departments.forEach(dept => {
            const opt = document.createElement("option");
            opt.value = dept;
            opt.textContent = dept;
            modalSelect.appendChild(opt);
        });
    }
}

function renderTable(incidents) {
    const tbody = document.getElementById("ilTableBody");
    const countEl = document.getElementById("ilResultsCount");
    if (!tbody) return;

    if (countEl) {
        countEl.textContent = `Found ${incidents.length} Incident ${incidents.length === 1 ? 'Report' : 'Reports'}`;
    }

    tbody.innerHTML = "";

    if (incidents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="padding: 40px; text-align: center; color: #64748b; font-style: italic;">No incident reports found matching filter criteria.</td></tr>`;
        return;
    }

    incidents.forEach(item => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid #e2e8f0";
        tr.className = "il-row";

        const formattedDate = formatDateTime(item.incident_date);
        const severityBadge = getSeverityBadge(item.severity_level);
        const statusBadge = getStatusBadge(item.status);

        let reporterHtml = "";
        if (parseInt(item.is_anonymous, 10) === 1) {
            reporterHtml = `<span style="display: inline-flex; align-items: center; gap: 4px; background: #f1f5f9; color: #475569; padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: 600;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                Anonymous Staff
            </span>`;
        } else {
            reporterHtml = `<div><strong>${escapeHtml(item.reporter_name || 'Staff')}</strong></div>
                <div style="font-size: 11px; color: #64748b;">${escapeHtml(item.reporter_role || '')}</div>`;
        }

        let patientHtml = "";
        if (item.patient_name) {
            patientHtml = `<div><strong>${escapeHtml(item.patient_name)}</strong></div>
                <div style="font-size: 11px; color: #64748b;">${escapeHtml(item.patient_mrn || '')}</div>`;
        } else {
            patientHtml = `<span style="color: #94a3b8; font-size: 12px; font-style: italic;">N/A (Process/Equipment)</span>`;
        }

        tr.innerHTML = `
            <td style="padding: 12px 16px; font-weight: 700; color: #2563eb; vertical-align: top; white-space: nowrap;">
                ${escapeHtml(item.incident_number)}
            </td>
            <td style="padding: 12px 16px; color: #334155; vertical-align: top; white-space: nowrap;">
                ${formattedDate}
            </td>
            <td style="padding: 12px 16px; vertical-align: top;">
                <div style="font-weight: 600; color: #0f172a;">${escapeHtml(item.department)}</div>
                <div style="font-size: 11px; color: #64748b;">${escapeHtml(item.location_details || '')}</div>
            </td>
            <td style="padding: 12px 16px; vertical-align: top;">
                <div style="font-weight: 600; color: #334155;">${escapeHtml(item.event_type)}</div>
                <div style="font-size: 11px; color: #64748b; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(item.summary)}">${escapeHtml(item.summary)}</div>
            </td>
            <td style="padding: 12px 16px; vertical-align: top; white-space: nowrap;">
                ${severityBadge}
            </td>
            <td style="padding: 12px 16px; vertical-align: top;">
                ${reporterHtml}
            </td>
            <td style="padding: 12px 16px; vertical-align: top;">
                ${patientHtml}
            </td>
            <td style="padding: 12px 16px; vertical-align: top; white-space: nowrap;">
                ${statusBadge}
            </td>
            <td style="padding: 12px 16px; vertical-align: top; text-align: center; white-space: nowrap;" class="no-print">
                <button type="button" class="il-view-btn" data-id="${item.id}" style="padding: 5px 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; color: #1e293b; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s;">
                    View / RCA
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });

    // Attach click listeners to View buttons
    tbody.querySelectorAll(".il-view-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-id");
            openDetailModal(id);
        });
    });
}

function openNewIncidentModal() {
    const modal = document.getElementById("ilReportModal");
    const form = document.getElementById("ilNewIncidentForm");
    if (!modal || !form) return;

    form.reset();

    // Default datetime to now in local ISO string
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const dateInput = document.getElementById("ilIncidentDate");
    if (dateInput) {
        dateInput.value = now.toISOString().slice(0, 16);
    }

    const anonCheckbox = document.getElementById("ilIsAnonymous");
    const reporterSection = document.getElementById("ilReporterInfoSection");
    if (anonCheckbox && reporterSection) {
        anonCheckbox.checked = false;
        reporterSection.style.display = "grid";
    }

    modal.style.display = "flex";
}

async function handleNewIncidentSubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById("ilSubmitReportBtn");
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting...";
    }

    const isAnonymous = document.getElementById("ilIsAnonymous")?.checked ? 1 : 0;
    const payload = {
        is_anonymous: isAnonymous,
        reporter_name: isAnonymous ? "" : (document.getElementById("ilReporterName")?.value || ""),
        reporter_role: isAnonymous ? "" : (document.getElementById("ilReporterRole")?.value || ""),
        incident_date: document.getElementById("ilIncidentDate")?.value || "",
        department: document.getElementById("ilIncidentDept")?.value || "",
        location_details: document.getElementById("ilLocationDetails")?.value || "",
        event_type: document.getElementById("ilEventType")?.value || "Other",
        severity_level: document.getElementById("ilSeverityLevel")?.value || "Minor (Monitored)",
        patient_name: document.getElementById("ilPatientName")?.value || "",
        patient_mrn: document.getElementById("ilPatientMrn")?.value || "",
        summary: document.getElementById("ilSummary")?.value || "",
        description: document.getElementById("ilDescription")?.value || "",
        immediate_action_taken: document.getElementById("ilImmediateAction")?.value || "",
        contributing_factors: document.getElementById("ilContributingFactors")?.value || ""
    };

    try {
        const res = await api("/reports/incident-log", {
            method: "POST",
            body: JSON.stringify(payload)
        });

        if (res.success) {
            alert(`Incident reported successfully! Assigned Incident Number: ${res.data?.incident_number || 'INC'}`);
            const modal = document.getElementById("ilReportModal");
            if (modal) modal.style.display = "none";
            fetchIncidentLog();
        } else {
            alert("Error: " + (res.message || "Failed to submit incident report."));
        }
    } catch (err) {
        console.error("Submission failed:", err);
        alert("An error occurred while submitting the incident report.");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit Report";
        }
    }
}

async function openDetailModal(id) {
    const modal = document.getElementById("ilDetailModal");
    if (!modal) return;

    try {
        const res = await api(`/reports/incident-log/details?id=${id}`);
        if (res.success && res.data) {
            populateDetailModal(res.data);
            modal.style.display = "flex";
        } else {
            alert("Failed to load incident details.");
        }
    } catch (err) {
        console.error(err);
        alert("Error loading incident details.");
    }
}

function populateDetailModal(inc) {
    document.getElementById("ilDetailIncidentId").value = inc.id;
    document.getElementById("ilDetailNumber").textContent = inc.incident_number;
    document.getElementById("ilDetailDateDept").textContent = `${formatDateTime(inc.incident_date)} | Department: ${inc.department}`;

    const statusBadgeContainer = document.getElementById("ilDetailStatusBadge");
    if (statusBadgeContainer) {
        statusBadgeContainer.innerHTML = getStatusBadge(inc.status);
    }

    document.getElementById("ilDetailSummary").textContent = inc.summary;
    document.getElementById("ilDetailSeverity").innerHTML = getSeverityBadge(inc.severity_level);
    document.getElementById("ilDetailType").textContent = inc.event_type;
    document.getElementById("ilDetailLocation").textContent = inc.location_details || "General area";
    
    if (parseInt(inc.is_anonymous, 10) === 1) {
        document.getElementById("ilDetailReporter").innerHTML = `<span style="color: #64748b; font-weight: 600;">Anonymous Staff (Confidential)</span>`;
    } else {
        document.getElementById("ilDetailReporter").textContent = `${inc.reporter_name || 'Staff'} (${inc.reporter_role || 'Staff'})`;
    }

    if (inc.patient_name) {
        document.getElementById("ilDetailPatient").textContent = `${inc.patient_name} (${inc.patient_mrn || 'N/A'})`;
    } else {
        document.getElementById("ilDetailPatient").textContent = "N/A (Environmental / Process)";
    }

    document.getElementById("ilDetailDescription").textContent = inc.description;
    document.getElementById("ilDetailImmediateAction").textContent = inc.immediate_action_taken;
    document.getElementById("ilDetailContributingFactors").textContent = inc.contributing_factors || "None documented";

    // Form inputs
    document.getElementById("ilUpdateStatus").value = inc.status || "Reported";
    document.getElementById("ilUpdateInvestigator").value = inc.investigator_name || "";
    document.getElementById("ilUpdateRCA").value = inc.root_cause_analysis || "";
    document.getElementById("ilUpdateCAPA").value = inc.corrective_preventive_action || "";
    document.getElementById("ilUpdateResolution").value = inc.resolution_notes || "";
}

async function handleInvestigationSubmit(e) {
    e.preventDefault();
    const saveBtn = document.getElementById("ilSaveInvestigationBtn");
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";
    }

    const id = document.getElementById("ilDetailIncidentId").value;
    const payload = {
        id: parseInt(id, 10),
        status: document.getElementById("ilUpdateStatus").value,
        investigator_name: document.getElementById("ilUpdateInvestigator").value,
        root_cause_analysis: document.getElementById("ilUpdateRCA").value,
        corrective_preventive_action: document.getElementById("ilUpdateCAPA").value,
        resolution_notes: document.getElementById("ilUpdateResolution").value
    };

    try {
        const res = await api("/reports/incident-log/update", {
            method: "POST",
            body: JSON.stringify(payload)
        });

        if (res.success) {
            alert("Investigation findings & Root Cause Analysis updated successfully!");
            const modal = document.getElementById("ilDetailModal");
            if (modal) modal.style.display = "none";
            fetchIncidentLog();
        } else {
            alert("Error: " + (res.message || "Failed to update investigation."));
        }
    } catch (err) {
        console.error(err);
        alert("An error occurred while saving RCA updates.");
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save Investigation & RCA";
        }
    }
}

function getSeverityBadge(severity) {
    if (!severity) return "";
    let bg = "#f1f5f9";
    let color = "#475569";

    if (severity.startsWith("Near-Miss")) {
        bg = "#dcfce7";
        color = "#166534";
    } else if (severity.startsWith("Minor")) {
        bg = "#dbeafe";
        color = "#1e40af";
    } else if (severity.startsWith("Moderate")) {
        bg = "#fef3c7";
        color = "#92400e";
    } else if (severity.includes("Sentinel") || severity.startsWith("Severe")) {
        bg = "#fee2e2";
        color = "#991b1b";
    }

    return `<span style="display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background: ${bg}; color: ${color};">${escapeHtml(severity)}</span>`;
}

function getStatusBadge(status) {
    if (!status) return "";
    let bg = "#f1f5f9";
    let color = "#475569";

    if (status === "Reported") {
        bg = "#e0f2fe";
        color = "#0369a1";
    } else if (status === "Under Investigation") {
        bg = "#f3e8ff";
        color = "#7e22ce";
    } else if (status === "Root Cause Analysis") {
        bg = "#ffedd5";
        color = "#c2410c";
    } else if (status === "Corrective Action Planned") {
        bg = "#ccfbf1";
        color = "#0f766e";
    } else if (status === "Closed") {
        bg = "#dcfce7";
        color = "#15803d";
    }

    return `<span style="display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background: ${bg}; color: ${color};">${escapeHtml(status)}</span>`;
}

function formatDateTime(str) {
    if (!str) return "--";
    try {
        const d = new Date(str.replace(' ', 'T'));
        if (isNaN(d.getTime())) return str;
        return d.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    } catch {
        return str;
    }
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
