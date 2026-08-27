import { api } from "../../core/api.js";
import { fetchPatients, fetchPatientDashboardSummary } from "../patients/patients.service.js";
import { generateCcdDetailedReportHtml, generateQrdaReportHtml } from "../patients/patients-list.js";

export async function initCareCoordination() {
    try {
        const data = await api('/care-coordination');
        renderTable(data);
        attachExpandListeners();
        attachTabListeners();
    } catch (e) {
        console.error("Failed to load care coordination data", e);
        const tbody = document.getElementById("careCoordinationTableBody");
        if (tbody) tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: red;">Failed to load data.</td></tr>`;
    }
}

function renderTable(data) {
    const tbody = document.getElementById("careCoordinationTableBody");
    if (!tbody) return;

    let html = "";
    if (data.length === 0) {
        html = `<tr><td colspan="11" style="text-align: center; padding: 20px;">No patient records found.</td></tr>`;
    } else {
        data.forEach((row, idx) => {
            const isExpanded = false; // default collapsed
            
            html += `
                <tr style="border-bottom: 1px solid #e2e8f0; ${isExpanded ? 'background-color: #f8fafc;' : ''}">
                    <td style="text-align: center; cursor: pointer;" class="expand-toggle" data-idx="${idx}">
                        <span style="display: inline-block; transform: ${isExpanded ? 'rotate(90deg)' : 'rotate(0)'}; transition: transform 0.2s;">▶</span>
                    </td>
                    <td>${idx + 1}</td>
                    <td>${escapeHtml(row.pid)}</td>
                    <td>${escapeHtml(row.name)}</td>
                    <td>${escapeHtml(row.encounter_count)}</td>
                    <td>0</td>
                    <td>0</td>
                    <td>${escapeHtml(row.last_visit || 'N/A')}</td>
                    <td>${escapeHtml(row.created_at)}</td>
                    <td style="text-align: center;"><input type="checkbox"></td>
                    <td style="text-align: center; display: flex; justify-content: center; gap: 8px;">
                        <button type="button" class="view-btn" data-pid="${row.pid}" title="CCDA Document" style="background: transparent; border: none; cursor: pointer; color: #3b82f6;">
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </button>
                        <button type="button" class="qrda-btn" data-pid="${row.pid}" title="QRDA Incidence Report" style="background: transparent; border: none; cursor: pointer; color: #b5651d;">
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        </button>
                    </td>
                </tr>
            `;

            let encountersHtml = "";
            if (row.encounters && row.encounters.length > 0) {
                encountersHtml = `
                    <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0;">
                        <thead style="background-color: #f1f5f9; border-bottom: 1px solid #cbd5e1;">
                            <tr>
                                <th style="padding: 8px; text-align: left;">#</th>
                                <th style="padding: 8px; text-align: left;">Encounter</th>
                                <th style="padding: 8px; text-align: left;">DOS</th>
                                <th style="padding: 8px; text-align: center;">Transferred Date</th>
                                <th style="padding: 8px; text-align: center;">Transferred By</th>
                                <th style="padding: 8px; text-align: left;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${row.encounters.map(enc => `
                                <tr>
                                    <td style="padding: 8px;">${escapeHtml(enc.id)}</td>
                                    <td style="padding: 8px;">Encounter ${escapeHtml(enc.id)}</td>
                                    <td style="padding: 8px;">${escapeHtml(enc.dos)}</td>
                                    <td style="padding: 8px; text-align: center;">${escapeHtml(enc.transferredDate)}</td>
                                    <td style="padding: 8px; text-align: center;">${escapeHtml(enc.transferredBy)}</td>
                                    <td style="padding: 8px;">${escapeHtml(enc.status)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            } else {
                encountersHtml = `<div style="padding: 16px; text-align: center; color: #64748b; font-style: italic;">No encounters found for this patient.</div>`;
            }

            html += `
                <tr class="nested-row nested-row-${idx}" style="display: ${isExpanded ? 'table-row' : 'none'};">
                    <td colspan="11" style="padding: 12px 40px; background-color: white; border-bottom: 1px solid #e2e8f0;">
                        ${encountersHtml}
                    </td>
                </tr>
            `;
        });
    }

    document.getElementById("careCoordinationTableBody").innerHTML = html;
}

function attachTabListeners() {
    const tabsContainer = document.getElementById("careCoordinationSubTabs");
    if (!tabsContainer) return;

    tabsContainer.addEventListener("click", (e) => {
        const link = e.target.closest(".sub-tab-link");
        if (!link) return;
        e.preventDefault();

        // Remove active state from all links
        const allLinks = tabsContainer.querySelectorAll(".sub-tab-link");
        allLinks.forEach(l => {
            l.classList.remove("active");
            l.style.borderBottom = "none";
            l.style.color = "#64748b";
        });

        // Add active state to clicked link
        link.classList.add("active");
        link.style.borderBottom = "2px solid #3b82f6";
        link.style.color = "#3b82f6";

        // Hide all contents
        const targets = ["ccda-qrda", "immunization", "syndromic"];
        targets.forEach(t => {
            const el = document.getElementById(`content-${t}`);
            if (el) el.style.display = "none";
        });

        // Show target content
        const targetId = link.getAttribute("data-target");
        const targetEl = document.getElementById(`content-${targetId}`);
        if (targetEl) {
            targetEl.style.display = "block";
        }
    });

    const btnSearchImm = document.getElementById("btn-search-immunization");
    if (btnSearchImm) {
        btnSearchImm.addEventListener("click", async () => {
            const tbody = document.getElementById("immunizationTableBody");
            if (!tbody) return;

            btnSearchImm.disabled = true;
            btnSearchImm.textContent = "SEARCHING...";
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 32px;">Loading data...</td></tr>`;

            try {
                const res = await api('/reports/immunization-registry');
                if (res.success && res.data && res.data.length > 0) {
                    let html = '';
                    res.data.forEach(row => {
                        html += `
                            <tr>
                                <td>${escapeHtml(row.pid)}</td>
                                <td>${escapeHtml(row.patient_name)}</td>
                                <td>${escapeHtml(row.immunization_code)}</td>
                                <td>${escapeHtml(row.immunization_title)}</td>
                                <td>${escapeHtml(row.immunization_date)}</td>
                            </tr>
                        `;
                    });
                    tbody.innerHTML = html;
                } else {
                    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #64748b; padding: 32px;">No immunization records found.</td></tr>`;
                }
            } catch (err) {
                console.error("Failed to load immunization data", err);
                tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #ef4444; padding: 32px;">Error loading data.</td></tr>`;
            } finally {
                btnSearchImm.disabled = false;
                btnSearchImm.textContent = "SEARCH";
            }
        });
    }
}

function attachExpandListeners() {
    const tbody = document.getElementById("careCoordinationTableBody");
    if (!tbody) return;

    tbody.addEventListener("click", async (e) => {
        const viewBtn = e.target.closest('.view-btn');
        if (viewBtn) {
            const pid = viewBtn.getAttribute('data-pid');
            if (pid) {
                await openPatientCcdReport(pid, viewBtn);
            }
            return;
        }

        const qrdaBtn = e.target.closest('.qrda-btn');
        if (qrdaBtn) {
            const pid = qrdaBtn.getAttribute('data-pid');
            if (pid) {
                await openPatientQrdaReport(pid, qrdaBtn);
            }
            return;
        }

        const toggleBtn = e.target.closest('.expand-toggle');
        if (toggleBtn) {
            const idx = toggleBtn.getAttribute('data-idx');
            const nestedRow = tbody.querySelector(`.nested-row-${idx}`);
            if (nestedRow) {
                const isHidden = nestedRow.style.display === 'none';
                nestedRow.style.display = isHidden ? 'table-row' : 'none';
                
                const icon = toggleBtn.querySelector('span');
                if (icon) {
                    icon.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0)';
                }
                
                const parentRow = toggleBtn.closest('tr');
                if (isHidden) {
                    parentRow.style.backgroundColor = '#f8fafc';
                } else {
                    parentRow.style.backgroundColor = 'transparent';
                }
            }
        }
    });
}

async function openPatientCcdReport(pid, btn) {
    const reportWindow = window.open("", "_blank", "width=850,height=800,scrollbars=yes");
    if (!reportWindow) {
        console.error("Popup blocked. Please enable pop-ups to view the report.");
        return;
    }
    reportWindow.document.open();
    reportWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head><title>Loading Report...</title>
        <style>body { font-family: sans-serif; padding: 40px; text-align: center; color: #555; }</style>
        </head>
        <body><h2>Generating Patient Report...</h2><p>Please wait while we gather the patient's data.</p></body>
        </html>
    `);

    btn.disabled = true;
    btn.style.opacity = '0.5';

    try {
        const allPatientsRes = await fetchPatients();
        let patientRecord = null;
        if (allPatientsRes.success && allPatientsRes.data) {
            patientRecord = allPatientsRes.data.find(p => p.id == pid);
        }

        if (!patientRecord) {
            throw new Error("Patient not found.");
        }

        const summaryRes = await fetchPatientDashboardSummary(pid);
        if (!summaryRes.success) {
            throw new Error("Failed to load patient summary.");
        }

        const html = generateCcdDetailedReportHtml(patientRecord, summaryRes.data || {});
        reportWindow.document.open();
        reportWindow.document.write(html);
        reportWindow.document.close();

    } catch (err) {
        reportWindow.document.open();
        reportWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head><title>Error</title>
            <style>body { font-family: sans-serif; padding: 40px; text-align: center; color: #d32f2f; }</style>
            </head>
            <body><h2>Error generating report.</h2><p>${escapeHtml(err.message)}</p></body>
            </html>
        `);
        reportWindow.document.close();
    } finally {
        btn.disabled = false;
        btn.style.opacity = '1';
    }
}

async function openPatientQrdaReport(pid, btn) {
    const reportWindow = window.open("", "_blank", "width=850,height=800,scrollbars=yes");
    if (!reportWindow) {
        console.error("Popup blocked. Please enable pop-ups to view the report.");
        return;
    }
    reportWindow.document.open();
    reportWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head><title>Loading Report...</title>
        <style>body { font-family: sans-serif; padding: 40px; text-align: center; color: #555; }</style>
        </head>
        <body><h2>Generating QRDA Report...</h2><p>Please wait while we gather the patient's data.</p></body>
        </html>
    `);

    btn.disabled = true;
    btn.style.opacity = '0.5';

    try {
        const allPatientsRes = await fetchPatients();
        let patientRecord = null;
        if (allPatientsRes.success && allPatientsRes.data) {
            patientRecord = allPatientsRes.data.find(p => p.id == pid);
        }

        if (!patientRecord) {
            throw new Error("Patient not found.");
        }

        const summaryRes = await fetchPatientDashboardSummary(pid);
        if (!summaryRes.success) {
            throw new Error("Failed to load patient summary.");
        }

        const html = generateQrdaReportHtml(patientRecord, summaryRes.data || {});
        reportWindow.document.open();
        reportWindow.document.write(html);
        reportWindow.document.close();

    } catch (err) {
        reportWindow.document.open();
        reportWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head><title>Error</title>
            <style>body { font-family: sans-serif; padding: 40px; text-align: center; color: #d32f2f; }</style>
            </head>
            <body><h2>Error generating QRDA report.</h2><p>${escapeHtml(err.message)}</p></body>
            </html>
        `);
        reportWindow.document.close();
    } finally {
        btn.disabled = false;
        btn.style.opacity = '1';
    }
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
