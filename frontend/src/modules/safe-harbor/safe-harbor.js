import {
    fetchSafeHarborStats,
    fetchExportsList,
    generateDeidentifiedDataset,
    fetchExportDetails,
    fetchAttestationCertificate,
    queryReidentificationVault,
    fetchStatutoryChecklist,
    getExportCsvUrl,
    getExportJsonUrl,
    getRegistryCsvUrl
} from "./safe-harbor.service.js";

let currentActiveExportCert = null;

export async function initSafeHarbor() {
    setupTabSwitching();
    setupModals();
    setupChecklist();
    await refreshTelemetry();
    await loadExportsTable();
}

/**
 * Setup navigation between Master Ledger and 18-Rule Visualizer
 */
function setupTabSwitching() {
    const tabBtns = document.querySelectorAll(".deid-tab-btn");
    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            tabBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const targetId = btn.getAttribute("data-target");
            document.querySelectorAll(".deid-tab-panel").forEach(p => p.style.display = "none");
            const panel = document.getElementById(targetId);
            if (panel) panel.style.display = "block";
        });
    });
}

/**
 * Load and display real-time telemetry stats
 */
async function refreshTelemetry() {
    try {
        const res = await fetchSafeHarborStats();
        if (res && res.data) {
            const data = res.data;
            const elTotalExports = document.getElementById("kpiTotalExports");
            const elRecordsSanitized = document.getElementById("kpiRecordsSanitized");
            const elActiveCohorts = document.getElementById("kpiActiveCohorts");
            const elVaultKeys = document.getElementById("kpiVaultKeys");
            const elComplianceRate = document.getElementById("kpiComplianceRate");

            if (elTotalExports) elTotalExports.textContent = (data.total_exports || 0).toLocaleString();
            if (elRecordsSanitized) elRecordsSanitized.textContent = (data.total_records_deidentified || 0).toLocaleString();
            if (elActiveCohorts) elActiveCohorts.textContent = Object.keys(data.purpose_breakdown || {}).length || 0;
            if (elVaultKeys) elVaultKeys.textContent = (data.total_vault_keys || 0).toLocaleString();
            if (elComplianceRate) elComplianceRate.textContent = (data.compliance_rate_percent || 100.0) + "%";
        }
    } catch (e) {
        console.error("Failed to load Safe Harbor stats:", e);
    }
}

/**
 * Load and display export ledger
 */
async function loadExportsTable() {
    const tbody = document.getElementById("deidLedgerTbody");
    if (!tbody) return;

    const search = document.getElementById("inputDeidSearch")?.value || "";
    const typeFilter = document.getElementById("selectDeidTypeFilter")?.value || "all";
    const purposeFilter = document.getElementById("selectDeidPurposeFilter")?.value || "all";

    tbody.innerHTML = `
        <tr>
            <td colspan="8" style="text-align: center; padding: 28px; color: #64748b;">
                Loading Safe Harbor exports...
            </td>
        </tr>
    `;

    try {
        const res = await fetchExportsList({
            search,
            dataset_type: typeFilter,
            purpose_of_use: purposeFilter
        });

        const exports = (res && res.data) ? res.data : [];

        if (exports.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 36px; color: #64748b;">
                        <div style="font-size: 28px; margin-bottom: 8px;">🔒</div>
                        <strong>No Safe Harbor exports found matching criteria.</strong>
                        <p style="margin: 4px 0 0 0; font-size: 12px;">Click "+ Generate Safe Harbor Dataset" to create your first HIPAA § 164.514 research cohort.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = exports.map(e => {
            const shortChecksum = (e.sha256_dataset_checksum || "").substring(0, 16) + "...";
            const typeLabel = (e.dataset_type || "").replace(/_/g, " ").toUpperCase();
            const purposeLabel = (e.purpose_of_use || "").replace(/_/g, " ").toUpperCase();

            return `
                <tr>
                    <td>
                        <strong style="color: #065f46; font-family: monospace;">${escapeHtml(e.export_code)}</strong>
                    </td>
                    <td>
                        <span class="badge-deid-type">${escapeHtml(typeLabel)}</span>
                    </td>
                    <td>
                        <div style="font-weight: 600; color: #0f172a;">${escapeHtml(e.recipient_institution)}</div>
                        <div style="font-size: 11px; color: #64748b;">${escapeHtml(e.recipient_investigator)} &bull; <span class="badge-deid-purpose">${escapeHtml(purposeLabel)}</span></div>
                    </td>
                    <td>
                        <strong style="color: #047857;">${(parseInt(e.records_count) || 0).toLocaleString()}</strong>
                        <span style="font-size: 11px; color: #64748b;"> records</span>
                    </td>
                    <td>
                        <span class="deid-hash-mono" title="${escapeHtml(e.sha256_dataset_checksum)}">${escapeHtml(shortChecksum)}</span>
                    </td>
                    <td>
                        <div style="font-weight: 500;">${escapeHtml(e.attestation_officer_name)}</div>
                        <div style="font-size: 11px; color: #64748b;">${escapeHtml(e.attestation_officer_role)}</div>
                    </td>
                    <td style="font-size: 12px; color: #475569; white-space: nowrap;">
                        ${escapeHtml(e.attested_at)}
                    </td>
                    <td style="text-align: right; white-space: nowrap;">
                        <div style="display: inline-flex; gap: 6px;">
                            <a href="${getExportCsvUrl(e.id)}" target="_blank" download class="btn-deid-secondary" style="padding: 4px 8px; font-size: 11px; background: #f1f5f9; color: #0f172a; border-color: #cbd5e1;" title="Download RFC 4180 CSV">
                                CSV
                            </a>
                            <a href="${getExportJsonUrl(e.id)}" target="_blank" download class="btn-deid-secondary" style="padding: 4px 8px; font-size: 11px; background: #f1f5f9; color: #0f172a; border-color: #cbd5e1;" title="Download FHIR / JSON">
                                JSON
                            </a>
                            <button class="btn-deid-secondary btn-view-cert" data-id="${e.id}" style="padding: 4px 8px; font-size: 11px; background: #ecfdf5; color: #065f46; border-color: #a7f3d0;" title="View & Print Attestation Certificate">
                                Certificate
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");

        // Attach certificate click listeners
        document.querySelectorAll(".btn-view-cert").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.getAttribute("data-id");
                openAttestationModal(id);
            });
        });

    } catch (e) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 24px; color: #ef4444;">
                    Error loading export ledger: ${escapeHtml(e.message || "Network error")}
                </td>
            </tr>
        `;
    }
}

/**
 * Setup and render 18-Identifier Safe Harbor Checklist
 */
async function setupChecklist() {
    const container = document.getElementById("deidChecklistContainer");
    if (!container) return;

    try {
        const res = await fetchStatutoryChecklist();
        const items = (res && res.data && res.data.identifiers) ? res.data.identifiers : [];

        container.innerHTML = items.map(item => `
            <div class="deid-check-item">
                <div class="deid-check-letter">${escapeHtml(item.code)}</div>
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                        <strong style="font-size: 13px; color: #0f172a;">${escapeHtml(item.name)}</strong>
                        <span class="badge-deid-verified" style="font-size: 10px;">REDACTED</span>
                    </div>
                    <div style="font-size: 12px; color: #475569; line-height: 1.4;">
                        ${escapeHtml(item.rule)}
                    </div>
                </div>
            </div>
        `).join("");
    } catch (e) {
        console.error("Failed to fetch statutory checklist:", e);
    }
}

/**
 * Setup modals and user action handlers
 */
function setupModals() {
    // New Dataset Modal
    const modalNew = document.getElementById("modalNewDataset");
    const btnOpenNew = document.getElementById("btnOpenNewDatasetModal");
    const btnCloseNew = document.getElementById("btnCloseNewDatasetModal");
    const btnCancelNew = document.getElementById("btnCancelNewDatasetModal");
    const chkAttest = document.getElementById("chkStatutoryAttestation");
    const btnSubmitNew = document.getElementById("btnSubmitNewDataset");

    if (btnOpenNew) {
        btnOpenNew.addEventListener("click", () => {
            modalNew.style.display = "flex";
        });
    }

    const closeNew = () => {
        if (modalNew) modalNew.style.display = "none";
    };
    if (btnCloseNew) btnCloseNew.addEventListener("click", closeNew);
    if (btnCancelNew) btnCancelNew.addEventListener("click", closeNew);

    if (chkAttest && btnSubmitNew) {
        chkAttest.addEventListener("change", () => {
            btnSubmitNew.disabled = !chkAttest.checked;
        });
    }

    if (btnSubmitNew) {
        btnSubmitNew.addEventListener("click", async () => {
            const dataset_type = document.getElementById("inputDeidType")?.value;
            const purpose_of_use = document.getElementById("inputDeidPurpose")?.value;
            const purpose_description = document.getElementById("inputDeidPurposeDesc")?.value;
            const recipient_institution = document.getElementById("inputDeidRecipientInst")?.value;
            const recipient_investigator = document.getElementById("inputDeidRecipientInvestigator")?.value;
            const data_format = document.getElementById("inputDeidFormat")?.value;
            const attestation_officer_name = document.getElementById("inputDeidOfficerName")?.value;
            const attestation_officer_role = document.getElementById("inputDeidOfficerRole")?.value;
            const limit = parseInt(document.getElementById("inputDeidLimit")?.value || "100", 10);

            if (!purpose_description || !recipient_institution || !recipient_investigator) {
                alert("Please fill in all required fields (Purpose Description, Recipient Institution, and Investigator).");
                return;
            }

            btnSubmitNew.disabled = true;
            btnSubmitNew.textContent = "Processing Safe Harbor Sanitization...";

            try {
                const res = await generateDeidentifiedDataset({
                    dataset_type,
                    purpose_of_use,
                    purpose_description,
                    recipient_institution,
                    recipient_investigator,
                    data_format,
                    attestation_officer_name,
                    attestation_officer_role,
                    limit
                });

                alert(`Safe Harbor Export Generated Successfully!\nExport Code: ${res.data.export_code}\nRecords Sanitized: ${res.data.records_count}\nChecksum: ${res.data.sha256_dataset_checksum.substring(0, 16)}...`);
                closeNew();
                await refreshTelemetry();
                await loadExportsTable();
            } catch (err) {
                alert("Failed to generate export: " + (err.message || "Unknown error"));
            } finally {
                btnSubmitNew.disabled = false;
                btnSubmitNew.textContent = "Generate & Certify Safe Harbor Dataset";
            }
        });
    }

    // Vault Modal
    const modalVault = document.getElementById("modalVaultLookup");
    const btnOpenVault = document.getElementById("btnOpenVaultModal");
    const btnCloseVault = document.getElementById("btnCloseVaultModal");
    const btnCloseVaultFooter = document.getElementById("btnCloseVaultFooter");
    const selectVaultExport = document.getElementById("selectVaultExportId");
    const btnQueryVault = document.getElementById("btnQueryVault");

    if (btnOpenVault) {
        btnOpenVault.addEventListener("click", async () => {
            modalVault.style.display = "flex";
            document.getElementById("vaultResultBox").style.display = "none";
            document.getElementById("inputVaultPseudonym").value = "";

            // Populate export select dropdown
            try {
                const res = await fetchExportsList({ limit: 50 });
                const list = (res && res.data) ? res.data : [];
                selectVaultExport.innerHTML = '<option value="">Select an export cohort...</option>' +
                    list.map(e => `<option value="${e.id}">${e.export_code} - ${e.recipient_institution} (${e.records_count} records)</option>`).join("");
            } catch (e) {
                console.error("Failed to load exports for vault:", e);
            }
        });
    }

    const closeVault = () => {
        if (modalVault) modalVault.style.display = "none";
    };
    if (btnCloseVault) btnCloseVault.addEventListener("click", closeVault);
    if (btnCloseVaultFooter) btnCloseVaultFooter.addEventListener("click", closeVault);

    if (btnQueryVault) {
        btnQueryVault.addEventListener("click", async () => {
            const exportId = selectVaultExport.value;
            const pseudonym = document.getElementById("inputVaultPseudonym")?.value?.trim();
            const resultBox = document.getElementById("vaultResultBox");

            if (!exportId) {
                alert("Please select an export cohort.");
                return;
            }
            if (!pseudonym) {
                alert("Please enter a research subject pseudonym code (e.g. SUBJ-XXXXXX).");
                return;
            }

            btnQueryVault.disabled = true;
            btnQueryVault.innerHTML = "Querying Isolated Vault...";

            try {
                const res = await queryReidentificationVault(exportId, pseudonym);
                const data = res.data;

                resultBox.style.display = "block";
                resultBox.innerHTML = `
                    <div style="border-left: 4px solid #10b981; padding-left: 12px; margin-bottom: 12px;">
                        <h4 style="margin: 0 0 4px 0; color: #065f46; font-size: 14px;">Re-Identification Key Verified</h4>
                        <div style="font-size: 11px; color: #047857;">Vault ID #${data.vault_id} &bull; Recorded At: ${data.created_at}</div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px;">
                        <div>
                            <span style="color: #64748b;">Subject Code:</span><br>
                            <strong style="color: #0f172a; font-family: monospace;">${escapeHtml(data.subject_pseudonym)}</strong>
                        </div>
                        <div>
                            <span style="color: #64748b;">Internal Patient ID:</span><br>
                            <strong style="color: #0f172a;">#${escapeHtml(String(data.patient_id))}</strong>
                        </div>
                        <div>
                            <span style="color: #64748b;">Identified Patient Name:</span><br>
                            <strong style="color: #0f172a;">${escapeHtml(data.first_name)} ${escapeHtml(data.last_name)}</strong>
                        </div>
                        <div>
                            <span style="color: #64748b;">Date of Birth (DOB):</span><br>
                            <strong style="color: #0f172a;">${escapeHtml(data.dob || "N/A")}</strong>
                        </div>
                        <div>
                            <span style="color: #64748b;">Medical Record # (MRN):</span><br>
                            <strong style="color: #0f172a;">${escapeHtml(data.mrn || "N/A")}</strong>
                        </div>
                        <div>
                            <span style="color: #64748b;">Target Export Reference:</span><br>
                            <strong style="color: #0f172a;">${escapeHtml(data.export_code)}</strong>
                        </div>
                    </div>
                    <div style="margin-top: 12px; font-size: 11px; color: #b91c1c; background: #fef2f2; padding: 6px 10px; border-radius: 4px;">
                        ⚠️ An immutable HIPAA audit log entry has been recorded under action ACCESS_REIDENTIFICATION_VAULT.
                    </div>
                `;
            } catch (err) {
                resultBox.style.display = "block";
                resultBox.innerHTML = `
                    <div style="color: #ef4444; font-size: 13px; font-weight: 600;">
                        Lookup Failed: ${escapeHtml(err.message || "Subject code not found in this export vault.")}
                    </div>
                `;
            } finally {
                btnQueryVault.disabled = false;
                btnQueryVault.innerHTML = "<span>🔍</span> Query Re-Identification Key";
            }
        });
    }

    // Attestation Modal
    const modalAttest = document.getElementById("modalAttestation");
    const btnCloseAttest = document.getElementById("btnCloseAttestationModal");
    const btnCloseAttestFooter = document.getElementById("btnCloseAttestationFooter");
    const btnPrintAttest = document.getElementById("btnPrintAttestationCertificate");

    const closeAttest = () => {
        if (modalAttest) modalAttest.style.display = "none";
    };
    if (btnCloseAttest) btnCloseAttest.addEventListener("click", closeAttest);
    if (btnCloseAttestFooter) btnCloseAttestFooter.addEventListener("click", closeAttest);

    if (btnPrintAttest) {
        btnPrintAttest.addEventListener("click", () => {
            if (currentActiveExportCert) {
                printAttestationCertificate(currentActiveExportCert);
            }
        });
    }

    // Master Registry CSV Export Button
    const btnExportRegistry = document.getElementById("btnExportMasterRegistry");
    if (btnExportRegistry) {
        btnExportRegistry.addEventListener("click", () => {
            window.location.href = getRegistryCsvUrl();
        });
    }

    // Filters and search debouncing
    const searchInput = document.getElementById("inputDeidSearch");
    let searchDebounceTimer = null;
    if (searchInput) {
        searchInput.addEventListener("input", () => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                loadExportsTable();
            }, 300);
        });
    }

    const typeFilter = document.getElementById("selectDeidTypeFilter");
    if (typeFilter) {
        typeFilter.addEventListener("change", () => loadExportsTable());
    }

    const purposeFilter = document.getElementById("selectDeidPurposeFilter");
    if (purposeFilter) {
        purposeFilter.addEventListener("change", () => loadExportsTable());
    }
}

/**
 * Open Attestation Certificate Modal and render certification details
 */
async function openAttestationModal(exportId) {
    const modal = document.getElementById("modalAttestation");
    const container = document.getElementById("attestationModalContent");
    if (!modal || !container) return;

    container.innerHTML = `<div style="text-align: center; padding: 24px;">Loading certificate...</div>`;
    modal.style.display = "flex";

    try {
        const res = await fetchAttestationCertificate(exportId);
        const cert = res.data;
        currentActiveExportCert = cert;

        const e = cert.export;

        container.innerHTML = `
            <div class="deid-cert-paper">
                <div style="text-align: center; border-bottom: 2px solid #b45309; padding-bottom: 16px; margin-bottom: 20px;">
                    <div style="font-size: 13px; letter-spacing: 2px; text-transform: uppercase; color: #78350f; font-weight: 600;">USINTELLIX HEALTHCARE SYSTEM &bull; COMPLIANCE DIVISION</div>
                    <h2 style="margin: 8px 0 4px 0; font-size: 22px; color: #451a03; font-weight: 700;">CERTIFICATE OF SAFE HARBOR DE-IDENTIFICATION</h2>
                    <div style="font-size: 13px; font-style: italic; color: #92400e;">Pursuant to 45 CFR § 164.514(b)(2) & § 164.514(c)</div>
                </div>

                <div style="font-size: 14px; line-height: 1.6; color: #1e293b; margin-bottom: 20px;">
                    This official certificate attests that dataset <strong>${escapeHtml(e.export_code)}</strong> consisting of <strong>${(parseInt(e.records_count) || 0).toLocaleString()}</strong> health records (${escapeHtml(e.dataset_type)}) has been definitively sanitized under the HIPAA Safe Harbor De-Identification standard for the approved purpose of <em>${escapeHtml(e.purpose_of_use)}</em>.
                </div>

                <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid #fde68a; border-radius: 6px; padding: 14px; margin-bottom: 20px; font-size: 12px; font-family: sans-serif;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div><strong>Recipient Institution:</strong> ${escapeHtml(e.recipient_institution)}</div>
                        <div><strong>Principal Investigator:</strong> ${escapeHtml(e.recipient_investigator)}</div>
                        <div><strong>Protocol / Title:</strong> ${escapeHtml(e.purpose_description)}</div>
                        <div><strong>Data Format:</strong> ${escapeHtml(e.data_format)}</div>
                        <div style="grid-column: span 2;"><strong>SHA-256 Dataset Checksum:</strong> <span style="font-family: monospace;">${escapeHtml(e.sha256_dataset_checksum)}</span></div>
                    </div>
                </div>

                <div style="font-size: 13px; line-height: 1.5; color: #334155; margin-bottom: 24px; text-align: justify;">
                    <strong>Statutory Certification Statement:</strong><br>
                    "${escapeHtml(cert.compliance_statement)}"
                </div>

                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 32px; border-top: 1px solid #cbd5e1; padding-top: 16px;">
                    <div>
                        <div style="font-size: 11px; color: #64748b; font-family: sans-serif;">OFFICIAL DIGITAL SIGNATURE</div>
                        <div style="font-size: 16px; font-family: 'Brush Script MT', cursive, serif; color: #047857; margin-top: 4px;">
                            ${escapeHtml(e.attestation_officer_name)}
                        </div>
                        <div style="font-size: 12px; font-weight: 600; color: #0f172a; font-family: sans-serif;">${escapeHtml(e.attestation_officer_name)}</div>
                        <div style="font-size: 11px; color: #64748b; font-family: sans-serif;">${escapeHtml(e.attestation_officer_role)}</div>
                    </div>

                    <div style="text-align: right; font-family: sans-serif;">
                        <div style="font-size: 11px; color: #64748b;">CERTIFICATION DATE & TIME</div>
                        <div style="font-size: 13px; font-weight: 600; color: #0f172a;">${escapeHtml(e.attested_at)}</div>
                        <div style="font-size: 10px; color: #166534; font-weight: 600; margin-top: 4px;">SEAL: 45 CFR § 164.514 COMPLIANT</div>
                    </div>
                </div>
            </div>
        `;
    } catch (e) {
        container.innerHTML = `<div style="color: #ef4444; padding: 24px;">Failed to load attestation certificate: ${escapeHtml(e.message)}</div>`;
    }
}

/**
 * Synchronous popup window printing for attestation certificate (Strictly per dashboard_reports pattern)
 */
function printAttestationCertificate(cert) {
    const e = cert.export;
    const printWin = window.open('', '_blank');
    if (!printWin) {
        alert("Pop-up was blocked. Please allow pop-ups for USIntellix to print certificates.");
        return;
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Safe Harbor Attestation Certificate - ${escapeHtml(e.export_code)}</title>
    <style>
        @page {
            size: letter portrait;
            margin: 20mm;
        }
        body {
            font-family: 'Times New Roman', Times, serif;
            color: #0f172a;
            margin: 0;
            padding: 20px;
            background: white;
        }
        .cert-container {
            border: 3px double #b45309;
            padding: 30px;
            position: relative;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #b45309;
            padding-bottom: 16px;
            margin-bottom: 24px;
        }
        .title {
            font-size: 24px;
            font-weight: bold;
            color: #451a03;
            margin: 10px 0 6px 0;
            letter-spacing: 1px;
        }
        .sub {
            font-size: 14px;
            color: #78350f;
            font-style: italic;
        }
        .body-text {
            font-size: 15px;
            line-height: 1.7;
            text-align: justify;
            margin-bottom: 20px;
        }
        .meta-table {
            width: 100%;
            border-collapse: collapse;
            font-family: Arial, sans-serif;
            font-size: 12px;
            margin-bottom: 24px;
            border: 1px solid #e2e8f0;
        }
        .meta-table td {
            padding: 8px 12px;
            border: 1px solid #e2e8f0;
        }
        .meta-table td.label {
            font-weight: bold;
            background: #f8fafc;
            width: 30%;
        }
        .sign-grid {
            margin-top: 40px;
            border-top: 1px solid #cbd5e1;
            padding-top: 20px;
            display: flex;
            justify-content: space-between;
        }
        .signature {
            font-family: 'Brush Script MT', cursive, serif;
            font-size: 22px;
            color: #047857;
        }
    </style>
</head>
<body>
    <div class="cert-container">
        <div class="header">
            <div style="font-family: Arial, sans-serif; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #78350f; font-weight: bold;">
                USINTELLIX HEALTHCARE SYSTEM &bull; HIPAA COMPLIANCE DIVISION
            </div>
            <div class="title">OFFICIAL SAFE HARBOR COMPLIANCE ATTESTATION</div>
            <div class="sub">Pursuant to 45 CFR § 164.514(b)(2) & 45 CFR § 164.514(c)</div>
        </div>

        <div class="body-text">
            This certifies that on <strong>${escapeHtml(e.attested_at)}</strong>, the clinical and health data export designated as <strong>${escapeHtml(e.export_code)}</strong> was sanitized strictly in accordance with the federal 18-Identifier Safe Harbor De-Identification Standard under 45 CFR § 164.514(b)(2). All direct and indirect identifiers—including names, geographic units smaller than a State, dates other than year, ages exceeding 89, telephone numbers, Social Security numbers, and medical record numbers—have been definitively stripped.
        </div>

        <table class="meta-table">
            <tr>
                <td class="label">Export Code:</td>
                <td><strong>${escapeHtml(e.export_code)}</strong></td>
            </tr>
            <tr>
                <td class="label">Dataset Domain:</td>
                <td>${escapeHtml(e.dataset_type)}</td>
            </tr>
            <tr>
                <td class="label">Total Records Sanitized:</td>
                <td>${(parseInt(e.records_count) || 0).toLocaleString()}</td>
            </tr>
            <tr>
                <td class="label">Purpose of Use:</td>
                <td>${escapeHtml(e.purpose_of_use)} &mdash; ${escapeHtml(e.purpose_description)}</td>
            </tr>
            <tr>
                <td class="label">Recipient Institution:</td>
                <td>${escapeHtml(e.recipient_institution)}</td>
            </tr>
            <tr>
                <td class="label">Principal Investigator:</td>
                <td>${escapeHtml(e.recipient_investigator)}</td>
            </tr>
            <tr>
                <td class="label">Cryptographic Seal (SHA-256):</td>
                <td style="font-family: monospace; font-size: 11px;">${escapeHtml(e.sha256_dataset_checksum)}</td>
            </tr>
        </table>

        <div class="body-text" style="font-size: 13px;">
            <strong>Officer Attestation:</strong> "${escapeHtml(cert.compliance_statement)}"
        </div>

        <div class="sign-grid">
            <div>
                <div class="signature">${escapeHtml(e.attestation_officer_name)}</div>
                <div style="font-weight: bold; font-family: Arial, sans-serif; font-size: 13px;">${escapeHtml(e.attestation_officer_name)}</div>
                <div style="font-size: 11px; font-family: Arial, sans-serif; color: #475569;">${escapeHtml(e.attestation_officer_role)}</div>
            </div>
            <div style="text-align: right; font-family: Arial, sans-serif;">
                <div style="font-size: 11px; color: #475569;">ISSUANCE DATE</div>
                <div style="font-weight: bold; font-size: 13px;">${escapeHtml(e.attested_at)}</div>
                <div style="font-size: 10px; color: #047857; font-weight: bold; margin-top: 6px;">
                    VERIFIED &bull; OCR AUDIT READY
                </div>
            </div>
        </div>
    </div>
</body>
</html>
    `;

    printWin.document.write(html);
    printWin.document.close();
    printWin.onload = () => {
        printWin.focus();
        printWin.print();
    };
}

function escapeHtml(text) {
    if (text === null || text === undefined) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
