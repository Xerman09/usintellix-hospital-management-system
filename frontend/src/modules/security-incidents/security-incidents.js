import {
    fetchIncidents,
    fetchIncidentStats,
    fetchIncident,
    createIncident,
    updateIncident,
    submitRiskAssessment,
    linkIncidentPatient,
    removeIncidentPatient,
    updatePatientNotification,
    fetchBreachLetter,
    fetchOcrExport,
    getIncidentExportCsvUrl,
    deleteIncident
} from "./security-incidents.service.js?v=1";
import { fetchPatients } from "../patients/patients.service.js?v=6";
import { showToast } from "../../core/toast.js";

const TYPE_LABELS = {
    unauthorized_access_snooping: "Unauthorized Access / Snooping",
    lost_stolen_device_media: "Lost / Stolen Device or Media",
    misdirected_communication_fax_email: "Misdirected Communication",
    hacking_it_incident_ransomware: "Hacking / Ransomware",
    improper_disposal: "Improper Disposal",
    credential_compromise: "Credential Compromise",
    other: "Other Security Incident"
};

const DETERMINATION_BADGES = {
    under_investigation: {
        label: "Under Investigation",
        cls: "sec-inc-badge-amber"
    },
    not_a_breach_low_risk: {
        label: "Non-Breach (Low Risk)",
        cls: "sec-inc-badge-green"
    },
    reportable_breach_ocr_annual: {
        label: "Breach (<500 - Annual OCR)",
        cls: "sec-inc-badge-red"
    },
    reportable_breach_ocr_immediate: {
        label: "Major Breach (≥500 - Immediate)",
        cls: "sec-inc-badge-red"
    },
    reportable_breach_patient_only: {
        label: "Breach (Patient Only)",
        cls: "sec-inc-badge-amber"
    }
};

const STATUS_BADGES = {
    reported: { label: "Reported", bg: "#fef3c7", color: "#b45309" },
    under_assessment: { label: "Under Assessment", bg: "#dbeafe", color: "#1d4ed8" },
    remediation_in_progress: { label: "Remediating", bg: "#f3e8ff", color: "#7e22ce" },
    notified: { label: "Notified", bg: "#dcfce7", color: "#15803d" },
    closed: { label: "Closed", bg: "#f1f5f9", color: "#475569" }
};

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(isoStr) {
    if (!isoStr) return "--";
    try {
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return isoStr;
        return d.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    } catch {
        return isoStr;
    }
}

export function initSecurityIncidents() {
    const root = document.querySelector(".sec-inc-container");
    if (!root) return;

    let cachedIncidents = [];
    let cachedPatients = [];
    let activeIncidentId = null;
    let activeOcrData = null;

    // Elements
    const kpiTotal = document.getElementById("kpiTotalIncidents");
    const kpiActive = document.getElementById("kpiActiveInvestigations");
    const kpiBreaches = document.getElementById("kpiReportableBreaches");
    const kpiMajorBreachesSub = document.getElementById("kpiMajorBreachesSub");
    const kpiImpending = document.getElementById("kpiImpendingDeadlines");
    const kpiOverdueSub = document.getElementById("kpiOverdueSub");
    const kpiIndividuals = document.getElementById("kpiAffectedIndividuals");

    const searchInput = document.getElementById("inputIncidentSearch");
    const statusSelect = document.getElementById("selectFilterStatus");
    const determSelect = document.getElementById("selectFilterDetermination");
    const typeSelect = document.getElementById("selectFilterType");
    const btnRefresh = document.getElementById("btnRefreshIncidents");
    const btnExportCsv = document.getElementById("btnExportIncidentCsv");
    const btnNewIncident = document.getElementById("btnNewIncident");

    const tableBody = document.getElementById("incidentsTableBody");

    // Intake Modal
    const modalIntake = document.getElementById("modalIncidentIntake");
    const intakeTitle = document.getElementById("intakeModalTitle");
    const btnCloseIntake = document.getElementById("btnCloseIntakeModal");
    const btnCancelIntake = document.getElementById("btnCancelIntake");
    const btnSaveIncident = document.getElementById("btnSaveIncident");

    const editIdInput = document.getElementById("editIncidentId");
    const titleInput = document.getElementById("inputIncTitle");
    const discDateInput = document.getElementById("inputIncDiscoveryDate");
    const occDateInput = document.getElementById("inputIncOccurredDate");
    const typeInput = document.getElementById("selectIncType");
    const locInput = document.getElementById("selectIncLocation");
    const countInput = document.getElementById("inputIncAffectedCount");
    const phiTypesInput = document.getElementById("inputIncPhiTypes");
    const descInput = document.getElementById("textareaIncDescription");
    const correctiveInput = document.getElementById("textareaIncCorrective");

    // 4-Factor Assessment Modal
    const modalAssess = document.getElementById("modalRiskAssessment");
    const btnCloseAssess = document.getElementById("btnCloseAssessModal");
    const btnCancelAssess = document.getElementById("btnCancelAssess");
    const btnSubmitAssess = document.getElementById("btnSubmitAssessment");

    const assessIncId = document.getElementById("assessIncidentId");
    const scoreF1 = document.getElementById("scoreFactor1");
    const scoreF2 = document.getElementById("scoreFactor2");
    const scoreF3 = document.getElementById("scoreFactor3");
    const scoreF4 = document.getElementById("scoreFactor4");
    const ratF1 = document.getElementById("rationaleFactor1");
    const ratF2 = document.getElementById("rationaleFactor2");
    const ratF3 = document.getElementById("rationaleFactor3");
    const ratF4 = document.getElementById("rationaleFactor4");

    const displayScore = document.getElementById("displayCompositeScore");
    const displayBadge = document.getElementById("displayRecommendationBadge");
    const breachDetermSelect = document.getElementById("selectBreachDetermination");
    const officerInput = document.getElementById("inputInvestigatingOfficer");
    const determRatTextarea = document.getElementById("textareaDeterminationRationale");

    // Patient Letter Modal
    const modalLetter = document.getElementById("modalPatientLetter");
    const btnCloseLetterModal = document.getElementById("btnCloseLetterModal");
    const btnCloseLetter = document.getElementById("btnCloseLetter");
    const letterIncId = document.getElementById("letterIncidentId");
    const linkedPatientsBody = document.getElementById("linkedPatientsTableBody");
    const inputAddPatient = document.getElementById("inputAddPatientId");
    const btnLinkPatient = document.getElementById("btnLinkPatient");
    const letterContainer = document.getElementById("breachLetterContainer");
    const letterPrintArea = document.getElementById("breachLetterPrintArea");
    const btnPrintLetter = document.getElementById("btnPrintBreachLetter");

    // OCR Package Modal
    const modalOcr = document.getElementById("modalOcrPackage");
    const btnCloseOcr = document.getElementById("btnCloseOcrModal");
    const ocrDisplay = document.getElementById("ocrJsonDisplay");
    const btnCopyOcr = document.getElementById("btnCopyOcrJson");
    const btnDownloadOcr = document.getElementById("btnDownloadOcrJson");

    // ==========================================
    // INITIALIZATION & DATA LOADING
    // ==========================================
    loadPatients();
    loadStats();
    loadIncidents();

    async function loadPatients() {
        try {
            const res = await fetchPatients();
            if (res && res.data) {
                cachedPatients = Array.isArray(res.data) ? res.data : (res.data.patients || []);
            }
        } catch (err) {
            console.warn("Could not preload patients list:", err);
        }
    }

    async function loadStats() {
        try {
            const res = await fetchIncidentStats();
            if (!res || !res.data) return;
            const d = res.data;
            if (kpiTotal) kpiTotal.textContent = d.total_incidents || 0;
            if (kpiActive) kpiActive.textContent = d.active_investigations || 0;
            if (kpiBreaches) kpiBreaches.textContent = d.reportable_breaches || 0;
            if (kpiMajorBreachesSub) kpiMajorBreachesSub.textContent = `${d.major_breaches || 0} major (≥500)`;
            if (kpiImpending) kpiImpending.textContent = d.impending_deadlines || 0;
            if (kpiOverdueSub) kpiOverdueSub.textContent = `${d.overdue_deadlines || 0} Overdue`;
            if (kpiIndividuals) kpiIndividuals.textContent = (d.total_affected_individuals || 0).toLocaleString();
        } catch (err) {
            console.error("Failed to load incident stats:", err);
        }
    }

    async function loadIncidents() {
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 32px; color: #94a3b8;">Loading security incidents...</td></tr>`;
        }
        try {
            const filters = getActiveFilters();
            const res = await fetchIncidents(filters);
            if (!res || !res.data) {
                renderTable([]);
                return;
            }
            cachedIncidents = Array.isArray(res.data) ? res.data : [];
            renderTable(cachedIncidents);
        } catch (err) {
            console.error("Failed to load incidents:", err);
            if (tableBody) {
                tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 24px; color: #dc2626;">Error loading security incidents. Please try refreshing.</td></tr>`;
            }
            showToast("Failed to fetch incidents", "error");
        }
    }

    function getActiveFilters() {
        return {
            search: searchInput ? searchInput.value.trim() : "",
            status: statusSelect ? statusSelect.value : "",
            breach_determination: determSelect ? determSelect.value : "",
            incident_type: typeSelect ? typeSelect.value : ""
        };
    }

    // ==========================================
    // TABLE RENDERING
    // ==========================================
    function renderTable(incidents) {
        if (!tableBody) return;
        if (!incidents || incidents.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 48px; color: #64748b;">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" style="margin-bottom: 8px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                        <div style="font-weight: 600; font-size: 14px; color: #334155;">No Security Incidents Found</div>
                        <div style="font-size: 12px; margin-top: 4px;">Click "Record New Incident" above to log a security event under § 164.308(a)(6).</div>
                    </td>
                </tr>
            `;
            return;
        }

        const rows = incidents.map(inc => {
            const num = escapeHtml(inc.incident_number || `INC-${inc.id}`);
            const title = escapeHtml(inc.incident_title);
            const discDate = formatDate(inc.discovery_date);
            const occDate = inc.incident_date ? formatDate(inc.incident_date) : "Unknown";
            const typeLabel = TYPE_LABELS[inc.incident_type] || inc.incident_type || "Incident";
            const location = escapeHtml(inc.breach_location || "Not specified");
            const affectedCount = (inc.affected_individuals_count || 1).toLocaleString();

            // 4-Factor Score
            let scoreBadge = `<span style="color: #94a3b8; font-size: 12px; font-style: italic;">Pending</span>`;
            if (inc.risk_composite_score) {
                const score = parseFloat(inc.risk_composite_score);
                let scoreColor = "#15803d";
                let scoreBg = "#dcfce7";
                if (score > 2.0 && score < 3.5) {
                    scoreColor = "#b45309";
                    scoreBg = "#fef3c7";
                } else if (score >= 3.5) {
                    scoreColor = "#991b1b";
                    scoreBg = "#fee2e2";
                }
                scoreBadge = `
                    <span style="background: ${scoreBg}; color: ${scoreColor}; font-weight: 800; font-size: 12px; padding: 3px 8px; border-radius: 4px; display: inline-block;">
                        ${score.toFixed(2)} / 5.0
                    </span>
                `;
            }

            // Determination Badge
            const detConfig = DETERMINATION_BADGES[inc.breach_determination] || {
                label: inc.breach_determination || "Under Investigation",
                cls: "sec-inc-badge-amber"
            };
            const determBadge = `<span class="sec-inc-badge ${detConfig.cls}">${detConfig.label}</span>`;

            // 60-Day Countdown Clock
            let clockHtml = "";
            const daysRemaining = inc.days_remaining !== undefined ? parseInt(inc.days_remaining) : null;
            if (inc.breach_determination === "not_a_breach_low_risk") {
                clockHtml = `<span class="countdown-pill countdown-settled">✓ Non-Breach</span>`;
            } else if (inc.lifecycle_status === "closed" || inc.lifecycle_status === "notified") {
                clockHtml = `<span class="countdown-pill countdown-settled">✓ Notified</span>`;
            } else if (daysRemaining !== null) {
                if (daysRemaining < 0) {
                    clockHtml = `<span class="countdown-pill countdown-overdue">⚠️ ${Math.abs(daysRemaining)}d Overdue</span>`;
                } else if (daysRemaining <= 15) {
                    clockHtml = `<span class="countdown-pill countdown-warning">⏰ ${daysRemaining}d Left</span>`;
                } else {
                    clockHtml = `<span class="countdown-pill countdown-normal">⏱️ ${daysRemaining}d Remaining</span>`;
                }
            } else {
                clockHtml = `<span class="countdown-pill countdown-normal">--</span>`;
            }

            // Status Badge
            const statConfig = STATUS_BADGES[inc.lifecycle_status] || { label: inc.lifecycle_status, bg: "#f1f5f9", color: "#475569" };
            const statusBadge = `
                <span style="background: ${statConfig.bg}; color: ${statConfig.color}; font-weight: 700; font-size: 11px; padding: 3px 8px; border-radius: 4px; text-transform: uppercase;">
                    ${statConfig.label}
                </span>
            `;

            return `
                <tr data-id="${inc.id}">
                    <td>
                        <div class="incident-num">${num}</div>
                        <div style="font-weight: 600; color: #334155; margin-top: 2px;">${title}</div>
                    </td>
                    <td>
                        <div style="font-size: 12px; font-weight: 700; color: #0f172a;">Disc: ${discDate}</div>
                        <div style="font-size: 11.5px; color: #64748b;">Occ: ${occDate}</div>
                    </td>
                    <td>
                        <div style="font-weight: 600; color: #1e293b;">${typeLabel}</div>
                        <div style="font-size: 11.5px; color: #64748b;">${location}</div>
                    </td>
                    <td>
                        <span style="font-weight: 800; font-size: 13px; color: ${inc.affected_individuals_count >= 500 ? '#dc2626' : '#0f172a'};">
                            ${affectedCount}
                        </span>
                        ${inc.affected_individuals_count >= 500 ? '<span style="display: block; font-size: 10px; font-weight: 700; color: #dc2626;">OCR ≥500</span>' : ''}
                    </td>
                    <td>${scoreBadge}</td>
                    <td>${determBadge}</td>
                    <td>${clockHtml}</td>
                    <td>${statusBadge}</td>
                    <td style="text-align: right; white-space: nowrap;">
                        <button type="button" class="sec-inc-btn-secondary sec-inc-btn-sm btn-assess" data-id="${inc.id}" title="Statutory 4-Factor Risk Assessment">
                            4-Factor
                        </button>
                        <button type="button" class="sec-inc-btn-secondary sec-inc-btn-sm btn-patients" data-id="${inc.id}" title="Patient Breach Letters">
                            Letters
                        </button>
                        <button type="button" class="sec-inc-btn-secondary sec-inc-btn-sm btn-ocr" data-id="${inc.id}" title="HHS OCR Portal Filing Package">
                            OCR
                        </button>
                        <button type="button" class="sec-inc-btn-secondary sec-inc-btn-sm btn-edit" data-id="${inc.id}" title="Edit Incident">
                            Edit
                        </button>
                        <button type="button" class="sec-inc-btn-secondary sec-inc-btn-sm btn-delete" data-id="${inc.id}" title="Delete Incident" style="color: #dc2626;">
                            &times;
                        </button>
                    </td>
                </tr>
            `;
        }).join("");

        tableBody.innerHTML = rows;

        // Wire Row Actions
        tableBody.querySelectorAll(".btn-assess").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = parseInt(btn.dataset.id);
                const inc = cachedIncidents.find(x => x.id === id);
                if (inc) openAssessModal(inc);
            });
        });

        tableBody.querySelectorAll(".btn-patients").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = parseInt(btn.dataset.id);
                openPatientLetterModal(id);
            });
        });

        tableBody.querySelectorAll(".btn-ocr").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = parseInt(btn.dataset.id);
                openOcrModal(id);
            });
        });

        tableBody.querySelectorAll(".btn-edit").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = parseInt(btn.dataset.id);
                const inc = cachedIncidents.find(x => x.id === id);
                if (inc) openIntakeModal(inc);
            });
        });

        tableBody.querySelectorAll(".btn-delete").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = parseInt(btn.dataset.id);
                const inc = cachedIncidents.find(x => x.id === id);
                const num = inc ? inc.incident_number : `#${id}`;
                if (!confirm(`Are you sure you want to delete incident ${num}? This action is cryptographically logged under HIPAA audit trails.`)) {
                    return;
                }
                try {
                    const res = await deleteIncident(id);
                    if (res && res.success) {
                        showToast(`Incident ${num} deleted`, "success");
                        loadStats();
                        loadIncidents();
                    } else {
                        showToast(res.message || "Failed to delete incident", "error");
                    }
                } catch (err) {
                    showToast("Error deleting incident", "error");
                }
            });
        });
    }

    // ==========================================
    // FILTER EVENT HANDLERS
    // ==========================================
    let searchDebounce = null;
    if (searchInput) {
        searchInput.addEventListener("input", () => {
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(loadIncidents, 300);
        });
    }

    if (statusSelect) statusSelect.addEventListener("change", loadIncidents);
    if (determSelect) determSelect.addEventListener("change", loadIncidents);
    if (typeSelect) typeSelect.addEventListener("change", loadIncidents);
    if (btnRefresh) {
        btnRefresh.addEventListener("click", () => {
            loadStats();
            loadIncidents();
            showToast("Incident ledger refreshed", "info");
        });
    }

    if (btnExportCsv) {
        btnExportCsv.addEventListener("click", () => {
            const filters = getActiveFilters();
            const url = getIncidentExportCsvUrl(filters);
            window.location.href = url;
            showToast("Exporting official CSV ledger...", "info");
        });
    }

    // ==========================================
    // INTAKE MODAL (NEW / EDIT)
    // ==========================================
    if (btnNewIncident) {
        btnNewIncident.addEventListener("click", () => openIntakeModal(null));
    }

    function openIntakeModal(incident = null) {
        if (!modalIntake) return;
        if (incident) {
            intakeTitle.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                Edit Incident ${escapeHtml(incident.incident_number)}
            `;
            editIdInput.value = incident.id;
            titleInput.value = incident.incident_title || "";
            discDateInput.value = incident.discovery_date || "";
            occDateInput.value = incident.incident_date || "";
            typeInput.value = incident.incident_type || "unauthorized_access_snooping";
            locInput.value = incident.breach_location || "EHR Application";
            countInput.value = incident.affected_individuals_count || 1;
            phiTypesInput.value = incident.phi_types_involved || "";
            descInput.value = incident.incident_description || "";
            correctiveInput.value = incident.corrective_actions || "";
        } else {
            intakeTitle.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                Record Security Incident (§ 164.308(a)(6))
            `;
            editIdInput.value = "";
            titleInput.value = "";
            discDateInput.value = new Date().toISOString().split("T")[0];
            occDateInput.value = new Date().toISOString().split("T")[0];
            typeInput.value = "unauthorized_access_snooping";
            locInput.value = "EHR Application";
            countInput.value = 1;
            phiTypesInput.value = "Demographics, Clinical Records";
            descInput.value = "";
            correctiveInput.value = "";
        }
        modalIntake.style.display = "flex";
    }

    function closeIntakeModal() {
        if (modalIntake) modalIntake.style.display = "none";
    }

    if (btnCloseIntake) btnCloseIntake.addEventListener("click", closeIntakeModal);
    if (btnCancelIntake) btnCancelIntake.addEventListener("click", closeIntakeModal);

    if (btnSaveIncident) {
        btnSaveIncident.addEventListener("click", async () => {
            const title = titleInput.value.trim();
            const discoveryDate = discDateInput.value;
            const incidentType = typeInput.value;
            const affectedCount = parseInt(countInput.value) || 1;
            const description = descInput.value.trim();

            if (!title) {
                showToast("Incident title is required", "warning");
                titleInput.focus();
                return;
            }
            if (!discoveryDate) {
                showToast("Date discovered is required (starts statutory 60-day clock)", "warning");
                discDateInput.focus();
                return;
            }
            if (!description) {
                showToast("Incident narrative description is required", "warning");
                descInput.focus();
                return;
            }

            const payload = {
                incident_title: title,
                discovery_date: discoveryDate,
                incident_date: occDateInput.value || null,
                incident_type: incidentType,
                breach_location: locInput.value,
                affected_individuals_count: affectedCount,
                phi_types_involved: phiTypesInput.value.trim(),
                incident_description: description,
                corrective_actions: correctiveInput.value.trim()
            };

            const isEdit = Boolean(editIdInput.value);
            btnSaveIncident.disabled = true;
            btnSaveIncident.textContent = "Saving...";

            try {
                let res;
                if (isEdit) {
                    res = await updateIncident(parseInt(editIdInput.value), payload);
                } else {
                    res = await createIncident(payload);
                }

                if (res && res.success) {
                    showToast(isEdit ? "Incident updated successfully" : "Security incident recorded under § 164.308(a)(6)", "success");
                    closeIntakeModal();
                    loadStats();
                    loadIncidents();
                } else {
                    showToast(res.message || "Failed to save incident", "error");
                }
            } catch (err) {
                showToast("Error saving incident", "error");
            } finally {
                btnSaveIncident.disabled = false;
                btnSaveIncident.innerHTML = `<span>Save Incident Record</span>`;
            }
        });
    }

    // ==========================================
    // 4-FACTOR RISK ASSESSMENT MODAL (§ 164.402)
    // ==========================================
    function calculateCompositeRisk() {
        const f1 = parseFloat(scoreF1.value) || 3;
        const f2 = parseFloat(scoreF2.value) || 3;
        const f3 = parseFloat(scoreF3.value) || 3;
        const f4 = parseFloat(scoreF4.value) || 3;

        const avg = (f1 + f2 + f3 + f4) / 4;
        displayScore.textContent = `${avg.toFixed(2)} / 5.0`;

        const incId = parseInt(assessIncId.value);
        const inc = cachedIncidents.find(x => x.id === incId);
        const affectedCount = inc ? (inc.affected_individuals_count || 1) : 1;

        if (avg <= 2.0) {
            displayBadge.innerHTML = `
                <span class="sec-inc-badge sec-inc-badge-green" style="font-size: 12px; padding: 6px 12px;">
                    ✓ Low Probability of Compromise (Non-Breach)
                </span>
            `;
            if (breachDetermSelect) {
                breachDetermSelect.value = "not_a_breach_low_risk";
            }
        } else if (avg < 3.5) {
            displayBadge.innerHTML = `
                <span class="sec-inc-badge sec-inc-badge-amber" style="font-size: 12px; padding: 6px 12px;">
                    ⚠️ Moderate Risk / Presumption of Breach Applies
                </span>
            `;
            if (breachDetermSelect) {
                breachDetermSelect.value = affectedCount >= 500 ? "reportable_breach_ocr_immediate" : "reportable_breach_ocr_annual";
            }
        } else {
            displayBadge.innerHTML = `
                <span class="sec-inc-badge sec-inc-badge-red" style="font-size: 12px; padding: 6px 12px;">
                    🚨 High Probability of Compromise (Presumed Breach)
                </span>
            `;
            if (breachDetermSelect) {
                breachDetermSelect.value = affectedCount >= 500 ? "reportable_breach_ocr_immediate" : "reportable_breach_ocr_annual";
            }
        }
    }

    [scoreF1, scoreF2, scoreF3, scoreF4].forEach(sel => {
        if (sel) sel.addEventListener("change", calculateCompositeRisk);
    });

    function openAssessModal(incident) {
        if (!modalAssess) return;
        assessIncId.value = incident.id;

        scoreF1.value = incident.factor_1_score || "3";
        scoreF2.value = incident.factor_2_score || "3";
        scoreF3.value = incident.factor_3_score || "3";
        scoreF4.value = incident.factor_4_score || "3";

        ratF1.value = incident.factor_1_rationale || "";
        ratF2.value = incident.factor_2_rationale || "";
        ratF3.value = incident.factor_3_rationale || "";
        ratF4.value = incident.factor_4_rationale || "";

        officerInput.value = incident.investigating_officer_name || "Compliance & Privacy Officer";
        determRatTextarea.value = incident.determination_rationale || "";

        if (incident.breach_determination && incident.breach_determination !== "under_investigation") {
            breachDetermSelect.value = incident.breach_determination;
        }

        calculateCompositeRisk();
        modalAssess.style.display = "flex";
    }

    function closeAssessModal() {
        if (modalAssess) modalAssess.style.display = "none";
    }

    if (btnCloseAssess) btnCloseAssess.addEventListener("click", closeAssessModal);
    if (btnCancelAssess) btnCancelAssess.addEventListener("click", closeAssessModal);

    if (btnSubmitAssess) {
        btnSubmitAssess.addEventListener("click", async () => {
            const id = parseInt(assessIncId.value);
            if (!id) return;

            const officer = officerInput.value.trim();
            const rationale = determRatTextarea.value.trim();

            if (!officer) {
                showToast("Investigating Compliance Officer name is required", "warning");
                officerInput.focus();
                return;
            }

            const assessmentData = {
                factor_1_score: parseInt(scoreF1.value),
                factor_1_rationale: ratF1.value.trim(),
                factor_2_score: parseInt(scoreF2.value),
                factor_2_rationale: ratF2.value.trim(),
                factor_3_score: parseInt(scoreF3.value),
                factor_3_rationale: ratF3.value.trim(),
                factor_4_score: parseInt(scoreF4.value),
                factor_4_rationale: ratF4.value.trim(),
                breach_determination: breachDetermSelect.value,
                determination_rationale: rationale,
                investigating_officer_name: officer
            };

            btnSubmitAssess.disabled = true;
            btnSubmitAssess.textContent = "Finalizing Assessment...";

            try {
                const res = await submitRiskAssessment(id, assessmentData);
                if (res && res.success) {
                    showToast("Statutory 4-factor risk assessment finalized and audit-logged", "success");
                    closeAssessModal();
                    loadStats();
                    loadIncidents();
                } else {
                    showToast(res.message || "Failed to submit assessment", "error");
                }
            } catch (err) {
                showToast("Error submitting risk assessment", "error");
            } finally {
                btnSubmitAssess.disabled = false;
                btnSubmitAssess.innerHTML = `<span>Save &amp; Finalize Assessment</span>`;
            }
        });
    }

    // ==========================================
    // PATIENT NOTIFICATIONS & LETTERS MODAL (§ 164.404)
    // ==========================================
    async function openPatientLetterModal(incidentId) {
        if (!modalLetter) return;
        activeIncidentId = incidentId;
        letterIncId.value = incidentId;
        if (letterContainer) letterContainer.style.display = "none";
        if (btnPrintLetter) btnPrintLetter.style.display = "none";
        if (inputAddPatient) inputAddPatient.value = "";

        await reloadLinkedPatients(incidentId);
        modalLetter.style.display = "flex";
    }

    async function reloadLinkedPatients(incidentId) {
        if (!linkedPatientsBody) return;
        linkedPatientsBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 16px;">Loading affected patients...</td></tr>`;

        try {
            const res = await fetchIncident(incidentId);
            if (!res || !res.data) {
                linkedPatientsBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #dc2626;">Error retrieving incident details.</td></tr>`;
                return;
            }

            const patients = res.data.patients || [];
            if (patients.length === 0) {
                linkedPatientsBody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; color: #94a3b8; padding: 16px;">
                            No specific patients linked to this incident yet.<br>
                            Enter a Patient ID above and click "Link Patient" to generate statutory notification letters.
                        </td>
                    </tr>
                `;
                return;
            }

            linkedPatientsBody.innerHTML = patients.map(p => {
                const patName = escapeHtml(`${p.first_name || ""} ${p.last_name || ""}`.trim() || `Patient #${p.patient_id}`);
                const mrn = escapeHtml(p.patient_no || "--");
                const status = p.notification_status || "pending";

                let statusBadge = `<span style="background: #fef3c7; color: #b45309; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px;">PENDING</span>`;
                if (status === "delivered") {
                    statusBadge = `<span style="background: #dcfce7; color: #15803d; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px;">DELIVERED</span>`;
                } else if (status === "returned_undeliverable") {
                    statusBadge = `<span style="background: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px;">RETURNED</span>`;
                }

                const method = escapeHtml(p.dispatch_method || "First-Class Mail");
                const track = escapeHtml(p.tracking_number || "--");

                return `
                    <tr>
                        <td><strong>${patName}</strong></td>
                        <td>${mrn}</td>
                        <td>${statusBadge}</td>
                        <td>${method}</td>
                        <td style="font-family: monospace; font-size: 11px;">${track}</td>
                        <td style="white-space: nowrap;">
                            <button type="button" class="sec-inc-btn-secondary sec-inc-btn-sm btn-generate-letter" data-patient-id="${p.patient_id}">
                                Generate Letter
                            </button>
                            ${status !== "delivered" ? `
                                <button type="button" class="sec-inc-btn-secondary sec-inc-btn-sm btn-mark-delivered" data-patient-id="${p.patient_id}" style="color: #15803d;">
                                    Mark Sent
                                </button>
                            ` : ''}
                            <button type="button" class="sec-inc-btn-secondary sec-inc-btn-sm btn-unlink-patient" data-patient-id="${p.patient_id}" style="color: #dc2626;">
                                Remove
                            </button>
                        </td>
                    </tr>
                `;
            }).join("");

            // Wire patient actions
            linkedPatientsBody.querySelectorAll(".btn-generate-letter").forEach(btn => {
                btn.addEventListener("click", () => {
                    const patId = parseInt(btn.dataset.patientId);
                    generateAndDisplayLetter(incidentId, patId);
                });
            });

            linkedPatientsBody.querySelectorAll(".btn-mark-delivered").forEach(btn => {
                btn.addEventListener("click", async () => {
                    const patId = parseInt(btn.dataset.patientId);
                    try {
                        const res = await updatePatientNotification(incidentId, patId, {
                            notification_status: "delivered",
                            dispatch_method: "first_class_mail",
                            dispatch_date: new Date().toISOString().split("T")[0]
                        });
                        if (res && res.success) {
                            showToast("Patient notification recorded as delivered", "success");
                            reloadLinkedPatients(incidentId);
                            loadStats();
                            loadIncidents();
                        }
                    } catch (err) {
                        showToast("Error updating notification status", "error");
                    }
                });
            });

            linkedPatientsBody.querySelectorAll(".btn-unlink-patient").forEach(btn => {
                btn.addEventListener("click", async () => {
                    const patId = parseInt(btn.dataset.patientId);
                    if (!confirm("Remove this patient from the incident disclosure roster?")) return;
                    try {
                        const res = await removeIncidentPatient(incidentId, patId);
                        if (res && res.success) {
                            showToast("Patient unlinked from incident", "info");
                            reloadLinkedPatients(incidentId);
                            loadStats();
                            loadIncidents();
                        }
                    } catch (err) {
                        showToast("Error unlinking patient", "error");
                    }
                });
            });

        } catch (err) {
            console.error("Failed to reload linked patients:", err);
        }
    }

    if (btnLinkPatient) {
        btnLinkPatient.addEventListener("click", async () => {
            const patId = parseInt(inputAddPatient.value);
            if (!patId || !activeIncidentId) {
                showToast("Please enter a valid Patient ID", "warning");
                return;
            }

            try {
                const res = await linkIncidentPatient(activeIncidentId, patId);
                if (res && res.success) {
                    showToast("Patient linked to incident roster", "success");
                    inputAddPatient.value = "";
                    reloadLinkedPatients(activeIncidentId);
                    loadStats();
                    loadIncidents();
                } else {
                    showToast(res.message || "Failed to link patient", "error");
                }
            } catch (err) {
                showToast("Error linking patient", "error");
            }
        });
    }

    async function generateAndDisplayLetter(incidentId, patientId) {
        try {
            showToast("Generating formal statutory notice letter...", "info");
            const res = await fetchBreachLetter(incidentId, patientId);
            if (!res || !res.data) {
                showToast("Could not generate breach letter", "error");
                return;
            }

            const d = res.data;
            letterPrintArea.innerHTML = `
                <div style="font-family: 'Times New Roman', Times, serif; color: #000; line-height: 1.6; max-width: 750px; margin: 0 auto;">
                    <!-- Letterhead -->
                    <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 24px;">
                        <h2 style="margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">${escapeHtml(d.facility_name)}</h2>
                        <div style="font-size: 13px;">${escapeHtml(d.facility_address)}</div>
                        <div style="font-size: 12px; font-weight: bold; margin-top: 4px; color: #333;">Office of the HIPAA Privacy &amp; Information Security Officer</div>
                    </div>

                    <!-- Date & Addressee -->
                    <div style="margin-bottom: 20px;">
                        <div>${escapeHtml(d.notice_date)}</div>
                        <br>
                        <div><strong>To:</strong> ${escapeHtml(d.patient_name)}</div>
                        <div><strong>MRN:</strong> ${escapeHtml(d.patient_no)}</div>
                    </div>

                    <!-- Subject -->
                    <div style="margin-bottom: 20px; font-weight: bold; font-size: 15px; text-decoration: underline;">
                        SUBJECT: NOTICE OF DATA SECURITY INCIDENT AND POTENTIAL PHI COMPROMISE
                    </div>

                    <!-- Statutory Citation Note -->
                    <div style="font-size: 11px; font-style: italic; color: #555; margin-bottom: 16px;">
                        ${escapeHtml(d.statutory_citation)}
                    </div>

                    <p>Dear ${escapeHtml(d.patient_name)},</p>

                    <p>
                        We are writing to inform you of a recent data security incident that may have involved some of your protected health information (PHI). We take the privacy and security of your health records extremely seriously, and we want to provide you with complete transparency regarding what occurred, the steps we have taken in response, and the resources available to help protect your identity.
                    </p>

                    <h4 style="margin: 16px 0 6px 0; text-transform: uppercase; font-size: 14px;">1. What Happened</h4>
                    <p style="margin-top: 0;">
                        On ${escapeHtml(d.discovery_date)}, our security team identified a security incident involving ${escapeHtml(d.incident_title)}. ${escapeHtml(d.what_happened)}
                    </p>

                    <h4 style="margin: 16px 0 6px 0; text-transform: uppercase; font-size: 14px;">2. What Information Was Involved</h4>
                    <p style="margin-top: 0;">
                        Our forensic investigation confirmed that the categories of information that may have been accessed include: <strong>${escapeHtml(d.phi_types_involved)}</strong>. No other portions of your medical record were exposed.
                    </p>

                    <h4 style="margin: 16px 0 6px 0; text-transform: uppercase; font-size: 14px;">3. What We Are Doing</h4>
                    <p style="margin-top: 0;">
                        ${escapeHtml(d.what_we_are_doing)}
                    </p>

                    <h4 style="margin: 16px 0 6px 0; text-transform: uppercase; font-size: 14px;">4. What You Can Do</h4>
                    <p style="margin-top: 0;">
                        ${escapeHtml(d.what_you_can_do)}
                    </p>

                    <h4 style="margin: 16px 0 6px 0; text-transform: uppercase; font-size: 14px;">5. For More Information &amp; Assistance</h4>
                    <p style="margin-top: 0;">
                        If you have questions or require further assistance, please contact our dedicated HIPAA Privacy &amp; Security Response Line:
                    </p>
                    <ul style="margin-top: 0;">
                        <li><strong>Toll-Free Telephone:</strong> ${escapeHtml(d.contact_phone)}</li>
                        <li><strong>Email:</strong> ${escapeHtml(d.contact_email)}</li>
                        <li><strong>Compliance Officer:</strong> ${escapeHtml(d.contact_officer)}</li>
                    </ul>

                    <div style="margin-top: 36px;">
                        <div>Sincerely,</div>
                        <br>
                        <div><strong>${escapeHtml(d.contact_officer)}</strong></div>
                        <div>HIPAA Privacy &amp; Security Officer</div>
                        <div>${escapeHtml(d.facility_name)}</div>
                    </div>
                </div>
            `;

            letterContainer.style.display = "block";
            btnPrintLetter.style.display = "inline-flex";
            letterContainer.scrollIntoView({ behavior: "smooth" });
        } catch (err) {
            showToast("Failed to render breach notice letter", "error");
        }
    }

    if (btnPrintLetter) {
        btnPrintLetter.addEventListener("click", () => {
            window.print();
        });
    }

    function closePatientLetterModal() {
        if (modalLetter) modalLetter.style.display = "none";
    }

    if (btnCloseLetterModal) btnCloseLetterModal.addEventListener("click", closePatientLetterModal);
    if (btnCloseLetter) btnCloseLetter.addEventListener("click", closePatientLetterModal);

    // ==========================================
    // HHS OCR PORTAL FILING PACKAGE MODAL (§ 164.408)
    // ==========================================
    async function openOcrModal(incidentId) {
        if (!modalOcr) return;
        ocrDisplay.textContent = "Generating HHS OCR Portal standard JSON package...";
        modalOcr.style.display = "flex";

        try {
            const res = await fetchOcrExport(incidentId);
            if (!res || !res.data) {
                ocrDisplay.textContent = "Error generating OCR export package.";
                return;
            }
            activeOcrData = res.data;
            ocrDisplay.textContent = JSON.stringify(res.data, null, 2);
        } catch (err) {
            ocrDisplay.textContent = "Failed to load OCR package: " + err.message;
        }
    }

    function closeOcrModal() {
        if (modalOcr) modalOcr.style.display = "none";
    }

    if (btnCloseOcr) btnCloseOcr.addEventListener("click", closeOcrModal);

    if (btnCopyOcr) {
        btnCopyOcr.addEventListener("click", () => {
            if (!activeOcrData) return;
            const jsonText = JSON.stringify(activeOcrData, null, 2);
            navigator.clipboard.writeText(jsonText).then(() => {
                showToast("HHS OCR Filing JSON copied to clipboard", "success");
            }).catch(() => {
                showToast("Failed to copy JSON to clipboard", "error");
            });
        });
    }

    if (btnDownloadOcr) {
        btnDownloadOcr.addEventListener("click", () => {
            if (!activeOcrData) return;
            const incNum = (activeOcrData.incident_metadata && activeOcrData.incident_metadata.incident_number) || "INC";
            const filename = `HHS_OCR_Breach_Portal_Filing_${incNum}.json`;
            const blob = new Blob([JSON.stringify(activeOcrData, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast(`Downloaded ${filename}`, "success");
        });
    }
}
