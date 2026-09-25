import {
    fetchBackupStats,
    fetchLatestBackup,
    fetchBackupsList,
    triggerBackup,
    verifyBackupIntegrity,
    fetchDrillsList,
    logDisasterRecoveryDrill,
    getBackupsExportUrl,
    getDrillsExportUrl
} from "./backup-recovery.service.js?v=1";

export function initBackupRecovery(container = document) {
    // Top-level elements
    const statBkpLastTime = container.querySelector("#statBkpLastTime");
    const statBkpLastRelative = container.querySelector("#statBkpLastRelative");
    const statBkpLastSha256 = container.querySelector("#statBkpLastSha256");
    const statBkpVerifiedBadge = container.querySelector("#statBkpVerifiedBadge");
    const statBkpHealth = container.querySelector("#statBkpHealth");
    const statDrillCount = container.querySelector("#statDrillCount");
    const statDrillSuccessRate = container.querySelector("#statDrillSuccessRate");
    const statDrillRto = container.querySelector("#statDrillRto");
    const bkpHealthBanner = container.querySelector("#bkpHealthBanner");
    const bkpHealthBannerText = container.querySelector("#bkpHealthBannerText");

    // Tab buttons & panes
    const tabBtnBackups = container.querySelector("#tabBtnBackups");
    const tabBtnDrills = container.querySelector("#tabBtnDrills");
    const paneBackups = container.querySelector("#paneBackups");
    const paneDrills = container.querySelector("#paneDrills");
    const badgeBackupsCount = container.querySelector("#badgeBackupsCount");
    const badgeDrillsCount = container.querySelector("#badgeDrillsCount");

    // Tables
    const backupsTableBody = container.querySelector("#backupsTableBody");
    const drillsTableBody = container.querySelector("#drillsTableBody");

    // Filters
    const bkpSearchInput = container.querySelector("#bkpSearchInput");
    const bkpVerificationFilter = container.querySelector("#bkpVerificationFilter");
    const drillSearchInput = container.querySelector("#drillSearchInput");
    const drillSuccessFilter = container.querySelector("#drillSuccessFilter");

    // Buttons
    const btnRefreshBkp = container.querySelector("#btnRefreshBkp");
    const btnCopyLastSha = container.querySelector("#btnCopyLastSha");
    const btnExportMenu = container.querySelector("#btnExportMenu");
    const exportDropdownMenu = container.querySelector("#exportDropdownMenu");
    const btnExportBackupsCsv = container.querySelector("#btnExportBackupsCsv");
    const btnExportDrillsCsv = container.querySelector("#btnExportDrillsCsv");
    const btnOpenTriggerBackupModal = container.querySelector("#btnOpenTriggerBackupModal");
    const btnOpenDrillModal = container.querySelector("#btnOpenDrillModal");

    // Modals
    const modalTriggerBackup = container.querySelector("#modalTriggerBackup");
    const formTriggerBackup = container.querySelector("#formTriggerBackup");
    const triggerBackupLoading = container.querySelector("#triggerBackupLoading");
    const btnSubmitTriggerBackup = container.querySelector("#btnSubmitTriggerBackup");

    const modalVerifyDetails = container.querySelector("#modalVerifyDetails");
    const modalLogDrill = container.querySelector("#modalLogDrill");
    const formLogDrill = container.querySelector("#formLogDrill");
    const drillInputDate = container.querySelector("#drillInputDate");

    const modalDrillDossier = container.querySelector("#modalDrillDossier");
    const drillDossierContent = container.querySelector("#drillDossierContent");
    const btnPrintDrillDossier = container.querySelector("#btnPrintDrillDossier");

    let currentDrillRecord = null;
    let cachedLatestSha = "";

    // Set today as default date in drill modal
    if (drillInputDate) {
        drillInputDate.value = new Date().toISOString().split("T")[0];
    }

    // Modal Close buttons
    container.querySelectorAll(".closeModalBtn").forEach(btn => {
        btn.addEventListener("click", () => {
            if (modalTriggerBackup) modalTriggerBackup.style.display = "none";
            if (modalVerifyDetails) modalVerifyDetails.style.display = "none";
            if (modalLogDrill) modalLogDrill.style.display = "none";
            if (modalDrillDossier) modalDrillDossier.style.display = "none";
        });
    });

    // Close modals on background click
    [modalTriggerBackup, modalVerifyDetails, modalLogDrill, modalDrillDossier].forEach(m => {
        if (m) {
            m.addEventListener("click", (e) => {
                if (e.target === m) {
                    m.style.display = "none";
                }
            });
        }
    });

    // Export Dropdown Toggle
    if (btnExportMenu && exportDropdownMenu) {
        btnExportMenu.addEventListener("click", (e) => {
            e.stopPropagation();
            exportDropdownMenu.style.display = exportDropdownMenu.style.display === "block" ? "none" : "block";
        });
        document.addEventListener("click", () => {
            if (exportDropdownMenu) exportDropdownMenu.style.display = "none";
        });
    }

    // Export CSV Actions
    if (btnExportBackupsCsv) {
        btnExportBackupsCsv.addEventListener("click", () => {
            window.location.href = getBackupsExportUrl();
        });
    }
    if (btnExportDrillsCsv) {
        btnExportDrillsCsv.addEventListener("click", () => {
            window.location.href = getDrillsExportUrl();
        });
    }

    // Tab Switching
    function switchTab(activeTab) {
        if (activeTab === "backups") {
            tabBtnBackups.style.color = "#0284c7";
            tabBtnBackups.style.borderBottom = "3px solid #0284c7";
            tabBtnBackups.style.fontWeight = "700";
            tabBtnDrills.style.color = "#64748b";
            tabBtnDrills.style.borderBottom = "none";
            tabBtnDrills.style.fontWeight = "600";
            paneBackups.style.display = "block";
            paneDrills.style.display = "none";
        } else {
            tabBtnDrills.style.color = "#0284c7";
            tabBtnDrills.style.borderBottom = "3px solid #0284c7";
            tabBtnDrills.style.fontWeight = "700";
            tabBtnBackups.style.color = "#64748b";
            tabBtnBackups.style.borderBottom = "none";
            tabBtnBackups.style.fontWeight = "600";
            paneDrills.style.display = "block";
            paneBackups.style.display = "none";
        }
    }

    if (tabBtnBackups) tabBtnBackups.addEventListener("click", () => switchTab("backups"));
    if (tabBtnDrills) tabBtnDrills.addEventListener("click", () => switchTab("drills"));

    // Copy SHA-256 button
    if (btnCopyLastSha) {
        btnCopyLastSha.addEventListener("click", () => {
            if (cachedLatestSha) {
                navigator.clipboard.writeText(cachedLatestSha).then(() => {
                    const originalTitle = btnCopyLastSha.getAttribute("title");
                    btnCopyLastSha.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                    setTimeout(() => {
                        btnCopyLastSha.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
                    }, 2000);
                });
            }
        });
    }

    // Refresh action
    if (btnRefreshBkp) {
        btnRefreshBkp.addEventListener("click", () => {
            loadStats();
            loadBackups();
            loadDrills();
        });
    }

    // Debounce helper
    let searchTimeout = null;
    function debounce(callback, delay = 300) {
        return (...args) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => callback(...args), delay);
        };
    }

    if (bkpSearchInput) bkpSearchInput.addEventListener("input", debounce(loadBackups));
    if (bkpVerificationFilter) bkpVerificationFilter.addEventListener("change", loadBackups);
    if (drillSearchInput) drillSearchInput.addEventListener("input", debounce(loadDrills));
    if (drillSuccessFilter) drillSuccessFilter.addEventListener("change", loadDrills);

    // Load Telemetry Stats
    async function loadStats() {
        try {
            const res = await fetchBackupStats();
            if (!res || !res.success || !res.data) return;
            const s = res.data;

            if (s.latest_backup) {
                const b = s.latest_backup;
                cachedLatestSha = b.sha256_checksum;
                if (statBkpLastTime) statBkpLastTime.textContent = b.completed_at || b.created_at;
                if (statBkpLastRelative) statBkpLastRelative.textContent = b.relative_time;
                if (statBkpLastSha256) statBkpLastSha256.textContent = b.sha256_checksum.substring(0, 24) + "...";
                if (statBkpVerifiedBadge) {
                    if (b.verification_status === "passed") {
                        statBkpVerifiedBadge.textContent = "✓ SHA-256 Verified";
                        statBkpVerifiedBadge.style.color = "#059669";
                    } else if (b.verification_status === "failed") {
                        statBkpVerifiedBadge.textContent = "⚠ Checksum Mismatch";
                        statBkpVerifiedBadge.style.color = "#dc2626";
                    } else {
                        statBkpVerifiedBadge.textContent = "Verification Pending";
                        statBkpVerifiedBadge.style.color = "#d97706";
                    }
                }
            } else {
                if (statBkpLastTime) statBkpLastTime.textContent = "No Backups Yet";
                if (statBkpLastRelative) statBkpLastRelative.textContent = "Backup required";
                if (statBkpLastSha256) statBkpLastSha256.textContent = "N/A";
            }

            // Health Status
            if (statBkpHealth) {
                if (s.health_status === "compliant") {
                    statBkpHealth.textContent = "COMPLIANT";
                    statBkpHealth.style.color = "#059669";
                    if (bkpHealthBanner) bkpHealthBanner.style.display = "none";
                } else if (s.health_status === "warning") {
                    statBkpHealth.textContent = "DUE SOON";
                    statBkpHealth.style.color = "#d97706";
                    if (bkpHealthBanner) {
                        bkpHealthBanner.style.display = "block";
                        bkpHealthBannerText.textContent = `The last completed database backup was ${s.last_backup_age_hours} hours ago. Daily backup recommended per § 164.308(a)(7)(ii)(A).`;
                    }
                } else {
                    statBkpHealth.textContent = "OVERDUE";
                    statBkpHealth.style.color = "#dc2626";
                    if (bkpHealthBanner) {
                        bkpHealthBanner.style.display = "block";
                        bkpHealthBannerText.textContent = `CRITICAL: No verified backup within the last 48 hours. Generate an encrypted backup immediately to comply with 45 CFR § 164.308(a)(7).`;
                    }
                }
            }

            // DR Drills
            if (statDrillCount) statDrillCount.textContent = `${s.successful_drills} / ${s.total_drills}`;
            if (statDrillSuccessRate) statDrillSuccessRate.textContent = `${s.drill_success_rate}% Success Rate (§ 164.308(a)(7))`;
            if (statDrillRto) statDrillRto.textContent = s.total_drills > 0 ? `${s.avg_rto_minutes} min` : "N/A";

            if (badgeBackupsCount) badgeBackupsCount.textContent = s.total_backups;
            if (badgeDrillsCount) badgeDrillsCount.textContent = s.total_drills;
        } catch (err) {
            console.error("Failed to load backup stats:", err);
        }
    }

    // Load Database Backups Table
    async function loadBackups() {
        if (!backupsTableBody) return;
        try {
            const filters = {
                search: bkpSearchInput ? bkpSearchInput.value.trim() : "",
                verification_status: bkpVerificationFilter ? bkpVerificationFilter.value : ""
            };

            const res = await fetchBackupsList(filters);
            if (!res || !res.success || !Array.isArray(res.data)) {
                backupsTableBody.innerHTML = `<tr><td colspan="8" style="padding: 24px; text-align: center; color: #64748b;">No database backups found.</td></tr>`;
                return;
            }

            const backups = res.data;
            if (backups.length === 0) {
                backupsTableBody.innerHTML = `<tr><td colspan="8" style="padding: 24px; text-align: center; color: #64748b;">No backup records match the selected criteria.</td></tr>`;
                return;
            }

            backupsTableBody.innerHTML = backups.map(b => {
                const vStatusBadge = b.verification_status === "passed"
                    ? `<span style="display: inline-flex; align-items: center; gap: 4px; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700;">✓ PASSED</span>`
                    : b.verification_status === "failed"
                    ? `<span style="display: inline-flex; align-items: center; gap: 4px; background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700;">✕ FAILED</span>`
                    : `<span style="display: inline-flex; align-items: center; gap: 4px; background: #fffbeb; color: #b45309; border: 1px solid #fde68a; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700;">⏳ PENDING</span>`;

                const typeLabel = {
                    scheduled_daily: "Daily Scheduled",
                    manual_on_demand: "On-Demand",
                    pre_migration: "Pre-Migration",
                    emergency: "Emergency"
                }[b.backup_type] || b.backup_type;

                return `
                <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s ease;">
                    <td style="padding: 12px 16px;">
                        <strong style="color: #0f172a; font-family: Consolas, monospace;">${b.backup_code}</strong>
                    </td>
                    <td style="padding: 12px 16px;">
                        <div style="color: #1e293b; font-weight: 500;">${b.completed_at || b.created_at}</div>
                        <div style="font-size: 11px; color: #64748b;">${b.relative_time}</div>
                    </td>
                    <td style="padding: 12px 16px;">
                        <span style="font-size: 11.5px; background: #f1f5f9; color: #334155; padding: 2px 7px; border-radius: 4px; font-weight: 500;">
                            ${typeLabel}
                        </span>
                    </td>
                    <td style="padding: 12px 16px;">
                        <div style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #334155;" title="${b.file_name}">
                            ${b.file_name}
                        </div>
                        <div style="font-size: 11px; color: #64748b; font-weight: 600;">${b.formatted_size} &bull; ${b.tables_included_count} tables</div>
                    </td>
                    <td style="padding: 12px 16px;">
                        <span style="font-family: Consolas, monospace; font-size: 11.5px; color: #4c1d95; background: #f5f3ff; padding: 2px 6px; border-radius: 4px;" title="${b.sha256_checksum}">
                            ${b.sha256_checksum.substring(0, 16)}...
                        </span>
                    </td>
                    <td style="padding: 12px 16px;">
                        <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; background: #ecfdf5; color: #047857; padding: 2px 6px; border-radius: 4px;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                            AES-256-GCM
                        </span>
                    </td>
                    <td style="padding: 12px 16px;">
                        ${vStatusBadge}
                    </td>
                    <td style="padding: 12px 16px; text-align: right;">
                        <button type="button" class="btnVerifyBkp" data-id="${b.id}" style="background: #ffffff; color: #0284c7; border: 1px solid #0284c7; padding: 5px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            <span>Verify Integrity</span>
                        </button>
                    </td>
                </tr>
                `;
            }).join("");

            // Attach verify buttons
            backupsTableBody.querySelectorAll(".btnVerifyBkp").forEach(btn => {
                btn.addEventListener("click", async () => {
                    const id = btn.getAttribute("data-id");
                    await handleVerifyBackup(id, btn);
                });
            });

        } catch (err) {
            console.error("Failed to load backups:", err);
            backupsTableBody.innerHTML = `<tr><td colspan="8" style="padding: 24px; text-align: center; color: #ef4444;">Error loading backups: ${err.message}</td></tr>`;
        }
    }

    // Verify Backup Click Handler
    async function handleVerifyBackup(id, btn) {
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span style="display: inline-block; width: 12px; height: 12px; border: 2px solid #0284c7; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></span> Verifying...`;

        try {
            const res = await verifyBackupIntegrity(id);
            btn.innerHTML = originalText;
            btn.disabled = false;

            if (res && res.success && res.data) {
                const b = res.data;
                // Populate Verify Details modal
                container.querySelector("#vdBackupCode").textContent = b.backup_code;
                container.querySelector("#vdFileName").textContent = b.file_name;
                container.querySelector("#vdFileSize").textContent = b.formatted_size + ` (${b.file_size_bytes} bytes)`;
                container.querySelector("#vdSha256").textContent = b.sha256_checksum;
                container.querySelector("#vdVerifiedAt").textContent = b.verified_at;
                container.querySelector("#vdNotes").textContent = b.verification_notes;

                modalVerifyDetails.style.display = "flex";
                loadStats();
                loadBackups();
            } else {
                alert("Verification check failed: " + (res.message || "Unknown error"));
                loadBackups();
            }
        } catch (err) {
            btn.innerHTML = originalText;
            btn.disabled = false;
            alert("Verification failed: " + err.message);
            loadBackups();
        }
    }

    // Trigger Backup Form Submission
    if (btnOpenTriggerBackupModal) {
        btnOpenTriggerBackupModal.addEventListener("click", () => {
            modalTriggerBackup.style.display = "flex";
        });
    }

    if (formTriggerBackup) {
        formTriggerBackup.addEventListener("submit", async (e) => {
            e.preventDefault();
            const type = container.querySelector("#triggerBackupType").value;

            triggerBackupLoading.style.display = "block";
            btnSubmitTriggerBackup.disabled = true;

            try {
                const res = await triggerBackup(type);
                triggerBackupLoading.style.display = "none";
                btnSubmitTriggerBackup.disabled = false;
                modalTriggerBackup.style.display = "none";

                if (res && res.success && res.data) {
                    alert(`Encrypted Backup Created Successfully!\n\nReference: ${res.data.backup_code}\nSize: ${res.data.formatted_size}\nSHA-256: ${res.data.sha256_checksum}\n\nTamper-evident audit logged under CATEGORY_BACKUP.`);
                    loadStats();
                    loadBackups();
                } else {
                    alert("Backup creation failed: " + (res.message || "Unknown error"));
                }
            } catch (err) {
                triggerBackupLoading.style.display = "none";
                btnSubmitTriggerBackup.disabled = false;
                alert("Backup execution failed: " + err.message);
            }
        });
    }

    // Load Disaster Recovery Drills Table
    async function loadDrills() {
        if (!drillsTableBody) return;
        try {
            const filters = {
                search: drillSearchInput ? drillSearchInput.value.trim() : "",
                success: drillSuccessFilter ? drillSuccessFilter.value : ""
            };

            const res = await fetchDrillsList(filters);
            if (!res || !res.success || !Array.isArray(res.data)) {
                drillsTableBody.innerHTML = `<tr><td colspan="10" style="padding: 24px; text-align: center; color: #64748b;">No disaster recovery drills found.</td></tr>`;
                return;
            }

            const drills = res.data;
            if (drills.length === 0) {
                drillsTableBody.innerHTML = `<tr><td colspan="10" style="padding: 24px; text-align: center; color: #64748b;">No drill records match the criteria.</td></tr>`;
                return;
            }

            drillsTableBody.innerHTML = drills.map(d => {
                const outcomeBadge = d.restoration_success == 1
                    ? `<span style="background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 2px 7px; border-radius: 10px; font-size: 11px; font-weight: 700;">✓ SUCCESS</span>`
                    : `<span style="background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; padding: 2px 7px; border-radius: 10px; font-size: 11px; font-weight: 700;">✕ FAILED</span>`;

                const typeMap = {
                    sandbox_full_restore: "Sandbox Full Restore",
                    tabletop_simulation: "Tabletop Simulation",
                    failover_switchover: "Hot-Site Failover",
                    point_in_time_recovery: "Point-In-Time Restore"
                };

                const envMap = {
                    sandbox_staging: "Sandbox / Staging",
                    isolated_recovery_host: "Isolated Host",
                    dr_hot_site: "DR Hot Site",
                    local_verification_container: "Local Container"
                };

                return `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 12px 16px;">
                        <strong style="color: #0f172a; font-family: Consolas, monospace;">${d.drill_code}</strong>
                    </td>
                    <td style="padding: 12px 16px; white-space: nowrap;">
                        ${d.drill_date}
                    </td>
                    <td style="padding: 12px 16px;">
                        <span style="font-weight: 600; color: #1e293b;">${typeMap[d.drill_type] || d.drill_type}</span>
                    </td>
                    <td style="padding: 12px 16px; font-family: Consolas, monospace; color: #0284c7;">
                        ${d.backup_code_restored || "Synthetic / N/A"}
                    </td>
                    <td style="padding: 12px 16px;">
                        <div style="font-weight: 600; color: #0f172a;">${d.restorer_name}</div>
                        <div style="font-size: 11px; color: #64748b;">${d.restorer_role}</div>
                    </td>
                    <td style="padding: 12px 16px;">
                        <span style="font-size: 11.5px; background: #f8fafc; color: #475569; padding: 2px 6px; border-radius: 4px; border: 1px solid #e2e8f0;">
                            ${envMap[d.target_environment] || d.target_environment}
                        </span>
                    </td>
                    <td style="padding: 12px 16px;">
                        <strong style="color: ${d.rto_actual_minutes <= d.rto_target_minutes ? '#059669' : '#d97706'};">${d.rto_actual_minutes}m</strong>
                        <span style="font-size: 11px; color: #94a3b8;">/ ${d.rto_target_minutes}m</span>
                    </td>
                    <td style="padding: 12px 16px;">
                        <strong style="color: ${d.rpo_actual_hours <= d.rpo_target_hours ? '#059669' : '#d97706'};">${d.rpo_actual_hours}h</strong>
                        <span style="font-size: 11px; color: #94a3b8;">/ ${d.rpo_target_hours}h</span>
                    </td>
                    <td style="padding: 12px 16px;">
                        ${outcomeBadge}
                    </td>
                    <td style="padding: 12px 16px; text-align: right;">
                        <button type="button" class="btnViewDrillDossier" data-drill='${JSON.stringify(d).replace(/'/g, "&apos;")}' style="background: #ffffff; color: #334155; border: 1px solid #cbd5e1; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer;">
                            Dossier
                        </button>
                    </td>
                </tr>
                `;
            }).join("");

            // Attach dossier view buttons
            drillsTableBody.querySelectorAll(".btnViewDrillDossier").forEach(btn => {
                btn.addEventListener("click", () => {
                    const drill = JSON.parse(btn.getAttribute("data-drill").replace(/&apos;/g, "'"));
                    openDrillDossierModal(drill);
                });
            });

        } catch (err) {
            console.error("Failed to load drills:", err);
            drillsTableBody.innerHTML = `<tr><td colspan="10" style="padding: 24px; text-align: center; color: #ef4444;">Error loading drills: ${err.message}</td></tr>`;
        }
    }

    // Open Drill Modal
    if (btnOpenDrillModal) {
        btnOpenDrillModal.addEventListener("click", () => {
            modalLogDrill.style.display = "flex";
        });
    }

    // Log Drill Form Submission
    if (formLogDrill) {
        formLogDrill.addEventListener("submit", async (e) => {
            e.preventDefault();

            const data = {
                drill_date: container.querySelector("#drillInputDate").value,
                drill_type: container.querySelector("#drillInputType").value,
                backup_code_restored: container.querySelector("#drillInputBackupCode").value.trim(),
                target_environment: container.querySelector("#drillInputTargetEnv").value,
                restorer_name: container.querySelector("#drillInputRestorerName").value.trim(),
                restorer_role: container.querySelector("#drillInputRestorerRole").value.trim(),
                rto_actual_minutes: parseInt(container.querySelector("#drillInputRtoActual").value, 10),
                rpo_actual_hours: parseInt(container.querySelector("#drillInputRpoActual").value, 10),
                restoration_success: container.querySelector("#drillInputSuccess").checked ? 1 : 0,
                data_integrity_verified: container.querySelector("#drillInputIntegrity").checked ? 1 : 0,
                audit_hash_chain_verified: container.querySelector("#drillInputAuditChain").checked ? 1 : 0,
                signoff_officer_name: container.querySelector("#drillInputSignoffOfficer").value.trim(),
                notes: container.querySelector("#drillInputNotes").value.trim()
            };

            try {
                const res = await logDisasterRecoveryDrill(data);
                if (res && res.success) {
                    modalLogDrill.style.display = "none";
                    formLogDrill.reset();
                    if (drillInputDate) drillInputDate.value = new Date().toISOString().split("T")[0];
                    alert(`Disaster Recovery Drill Logged Successfully!\n\nReference: ${res.data.drill_code}\nRestorer: ${res.data.restorer_name}\nOutcome: ${res.data.restoration_success ? 'SUCCESS' : 'FAILED'}\n\nTamper-evident audit trail updated.`);
                    loadStats();
                    loadDrills();
                    switchTab("drills");
                } else {
                    alert("Failed to log drill: " + (res.message || "Unknown error"));
                }
            } catch (err) {
                alert("Failed to record drill: " + err.message);
            }
        });
    }

    // Open Drill Dossier Modal
    function openDrillDossierModal(drill) {
        currentDrillRecord = drill;

        drillDossierContent.innerHTML = `
        <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
                <h2 style="font-size: 18px; font-weight: 700; margin: 0; color: #0f172a;">USIntellix Healthcare System</h2>
                <div style="font-size: 12px; color: #64748b; margin-top: 2px;">HIPAA Contingency Plan &bull; 45 CFR § 164.308(a)(7)(ii)(D)</div>
            </div>
            <div style="text-align: right;">
                <span style="font-family: Consolas, monospace; font-size: 15px; font-weight: 700; color: #0284c7;">${drill.drill_code}</span>
                <div style="font-size: 11px; color: #64748b;">Drill Date: ${drill.drill_date}</div>
            </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px;">
            <tr>
                <td style="padding: 6px 0; color: #64748b; width: 35%;">Simulation Type:</td>
                <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${drill.drill_type}</td>
            </tr>
            <tr>
                <td style="padding: 6px 0; color: #64748b;">Restoration Operator:</td>
                <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${drill.restorer_name} (${drill.restorer_role})</td>
            </tr>
            <tr>
                <td style="padding: 6px 0; color: #64748b;">Target Recovery Host:</td>
                <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${drill.target_environment}</td>
            </tr>
            <tr>
                <td style="padding: 6px 0; color: #64748b;">Backup Archive Restored:</td>
                <td style="padding: 6px 0; font-family: Consolas, monospace; color: #0284c7;">${drill.backup_code_restored || 'N/A'}</td>
            </tr>
            <tr>
                <td style="padding: 6px 0; color: #64748b;">Recovery Time Objective (RTO):</td>
                <td style="padding: 6px 0; font-weight: 600;">Actual: <span style="color: #059669;">${drill.rto_actual_minutes} mins</span> (Target: &le; ${drill.rto_target_minutes} mins)</td>
            </tr>
            <tr>
                <td style="padding: 6px 0; color: #64748b;">Recovery Point Objective (RPO):</td>
                <td style="padding: 6px 0; font-weight: 600;">Actual: <span style="color: #059669;">${drill.rpo_actual_hours} hours</span> (Target: &le; ${drill.rpo_target_hours} hours)</td>
            </tr>
            <tr>
                <td style="padding: 6px 0; color: #64748b;">Restoration Outcome:</td>
                <td style="padding: 6px 0; font-weight: 700; color: ${drill.restoration_success ? '#059669' : '#dc2626'};">
                    ${drill.restoration_success ? '✓ SUCCESSFUL RESTORATION' : '✕ RESTORATION FAILED'}
                </td>
            </tr>
            <tr>
                <td style="padding: 6px 0; color: #64748b;">Data Integrity &amp; Tables Check:</td>
                <td style="padding: 6px 0; font-weight: 600; color: #047857;">${drill.data_integrity_verified ? '✓ 100% Data Verified' : '✕ Integrity Issues Detected'}</td>
            </tr>
            <tr>
                <td style="padding: 6px 0; color: #64748b;">HMAC-SHA-256 Audit Chain:</td>
                <td style="padding: 6px 0; font-weight: 600; color: #047857;">${drill.audit_hash_chain_verified ? '✓ Cryptographic Hash Chain Unbroken' : '✕ Tampering Flagged'}</td>
            </tr>
        </table>

        ${drill.notes ? `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 16px;">
            <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Drill Observations &amp; Notes</div>
            <div style="margin-top: 4px; color: #334155;">${drill.notes}</div>
        </div>
        ` : ''}

        <div style="border-top: 1px solid #e2e8f0; padding-top: 14px; margin-top: 18px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 12px;">
            <div>
                <div style="color: #64748b;">Sign-off Compliance Officer:</div>
                <div style="font-weight: 700; color: #0f172a; margin-top: 2px;">${drill.signoff_officer_name || 'HIPAA Security Officer'}</div>
            </div>
            <div style="text-align: right;">
                <div style="color: #64748b;">Sign-off Date:</div>
                <div style="font-weight: 700; color: #0f172a; margin-top: 2px;">${drill.signoff_date || drill.drill_date}</div>
            </div>
        </div>
        `;

        modalDrillDossier.style.display = "flex";
    }

    // Print Drill Dossier Popup (dashboard_reports skill pattern)
    if (btnPrintDrillDossier) {
        btnPrintDrillDossier.addEventListener("click", () => {
            if (!currentDrillRecord) return;
            const drill = currentDrillRecord;

            // Open popup synchronously immediately upon click
            const reportWindow = window.open("", "_blank", "width=850,height=800,scrollbars=yes");
            if (!reportWindow) {
                alert("Please enable pop-ups to print the disaster recovery drill dossier.");
                return;
            }

            reportWindow.document.open();
            reportWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>DR Drill Dossier - ${drill.drill_code}</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; padding: 40px; margin: 0; line-height: 1.5; font-size: 13.5px; }
                    .header { border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
                    .title { font-size: 20px; font-weight: 800; margin: 0; }
                    .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
                    .code { font-family: Consolas, monospace; font-size: 16px; font-weight: 700; color: #0284c7; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
                    td { padding: 9px 12px; border-bottom: 1px solid #e2e8f0; }
                    .label { color: #64748b; width: 35%; font-weight: 600; }
                    .val { color: #0f172a; font-weight: 600; }
                    .box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 14px; margin-bottom: 24px; }
                    .signature-row { border-top: 2px solid #0f172a; padding-top: 16px; margin-top: 36px; display: flex; justify-content: space-between; }
                    @media print {
                        body { padding: 20px; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1 class="title">USIntellix Healthcare System</h1>
                        <div class="subtitle">Disaster Recovery &amp; Contingency Test Restoration Dossier &bull; 45 CFR § 164.308(a)(7)(ii)(D)</div>
                    </div>
                    <div style="text-align: right;">
                        <div class="code">${drill.drill_code}</div>
                        <div style="font-size: 12px; color: #64748b;">Drill Date: ${drill.drill_date}</div>
                    </div>
                </div>

                <table>
                    <tr><td class="label">Simulation Exercise Type:</td><td class="val">${drill.drill_type}</td></tr>
                    <tr><td class="label">Restoration Operator:</td><td class="val">${drill.restorer_name} (${drill.restorer_role})</td></tr>
                    <tr><td class="label">Target Recovery Environment:</td><td class="val">${drill.target_environment}</td></tr>
                    <tr><td class="label">Backup Code Restored:</td><td class="val" style="font-family: monospace;">${drill.backup_code_restored || 'N/A'}</td></tr>
                    <tr><td class="label">Recovery Time Objective (RTO):</td><td class="val">Actual: ${drill.rto_actual_minutes} minutes (Target SLA: &le; ${drill.rto_target_minutes} minutes)</td></tr>
                    <tr><td class="label">Recovery Point Objective (RPO):</td><td class="val">Actual: ${drill.rpo_actual_hours} hours (Target SLA: &le; ${drill.rpo_target_hours} hours)</td></tr>
                    <tr><td class="label">Restoration Result:</td><td class="val" style="color: ${drill.restoration_success ? '#059669' : '#dc2626'};">${drill.restoration_success ? 'SUCCESSFUL - Restored and Operable' : 'FAILED - Recovery Issues Encountered'}</td></tr>
                    <tr><td class="label">Data Integrity Validation:</td><td class="val">${drill.data_integrity_verified ? 'Verified (Tables and Record Totals Match)' : 'Integrity Discrepancy'}</td></tr>
                    <tr><td class="label">HMAC-SHA-256 Chained Audit Trail:</td><td class="val">${drill.audit_hash_chain_verified ? 'Cryptographic Integrity Valid (0 Tampering)' : 'Chain Failed'}</td></tr>
                </table>

                ${drill.notes ? `
                <div class="box">
                    <strong style="display: block; font-size: 11px; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Technical Observations &amp; Drill Notes</strong>
                    <div>${drill.notes}</div>
                </div>
                ` : ''}

                <div class="signature-row">
                    <div>
                        <div style="font-size: 11px; color: #64748b;">HIPAA Security Officer Signature:</div>
                        <div style="margin-top: 24px; font-weight: 700; border-top: 1px dotted #94a3b8; padding-top: 4px;">${drill.signoff_officer_name || 'HIPAA Security Officer'}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 11px; color: #64748b;">Certification Date:</div>
                        <div style="margin-top: 24px; font-weight: 700; border-top: 1px dotted #94a3b8; padding-top: 4px;">${drill.signoff_date || drill.drill_date}</div>
                    </div>
                </div>

                <script>
                    window.onload = function() {
                        window.print();
                    };
                </script>
            </body>
            </html>
            `);
            reportWindow.document.close();
        });
    }

    // Initial load
    loadStats();
    loadBackups();
    loadDrills();
}
