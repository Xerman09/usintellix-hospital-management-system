export class BackupRecoveryView {
    static render() {
        return `
        <div class="backup-recovery-container" style="padding: 20px; max-width: 1440px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
                <div>
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                        <span style="display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; background: #dbeafe; color: #1d4ed8; border-radius: 8px;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                        </span>
                        <h1 style="font-size: 24px; font-weight: 700; margin: 0; color: #0f172a;">Backup &amp; Disaster Recovery Verification Console</h1>
                        <span style="font-size: 11px; font-weight: 700; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 2px 8px; border-radius: 12px; text-transform: uppercase;">
                            45 CFR § 164.308(a)(7) &bull; Contingency Plan
                        </span>
                    </div>
                    <p style="margin: 0; font-size: 13.5px; color: #64748b;">
                        NIST SP 800-38D AES-256-GCM database encryption, SHA-256 cryptographic integrity verification, and documented disaster recovery test restoration drills.
                    </p>
                </div>
                <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                    <div class="dropdown" style="position: relative; display: inline-block;">
                        <button type="button" id="btnExportMenu" style="background: #ffffff; color: #334155; border: 1px solid #cbd5e1; padding: 8px 14px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            <span>Export Registry (CSV)</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </button>
                        <div id="exportDropdownMenu" style="display: none; position: absolute; right: 0; top: 100%; margin-top: 4px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); z-index: 50; min-width: 220px;">
                            <a href="javascript:void(0)" id="btnExportBackupsCsv" style="display: block; padding: 9px 14px; font-size: 13px; color: #334155; text-decoration: none; border-bottom: 1px solid #f1f5f9;">Export Backups Registry CSV</a>
                            <a href="javascript:void(0)" id="btnExportDrillsCsv" style="display: block; padding: 9px 14px; font-size: 13px; color: #334155; text-decoration: none;">Export DR Drills Registry CSV</a>
                        </div>
                    </div>
                    <button type="button" id="btnRefreshBkp" style="background: #ffffff; color: #334155; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;" title="Refresh Data">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                    </button>
                    <button type="button" id="btnOpenDrillModal" style="background: #ffffff; color: #0369a1; border: 1px solid #0284c7; padding: 8px 14px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                        <span>Log DR Restoration Drill</span>
                    </button>
                    <button type="button" id="btnOpenTriggerBackupModal" style="background: #0284c7; color: #ffffff; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 1px 2px rgba(2, 132, 199, 0.2);">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                        <span>Trigger Encrypted Backup</span>
                    </button>
                </div>
            </div>

            <!-- KPI Metric Cards Grid -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; margin-bottom: 22px;">
                <!-- Last Backup Time -->
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; border-left: 4px solid #0284c7;">
                    <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Last Database Backup</div>
                    <div id="statBkpLastTime" style="font-size: 17px; font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">--</div>
                    <div id="statBkpLastRelative" style="font-size: 11px; color: #0284c7; font-weight: 600; margin-top: 2px;">--</div>
                </div>

                <!-- AES-256 Encryption -->
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; border-left: 4px solid #10b981;">
                    <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">At-Rest Encryption</div>
                    <div style="font-size: 17px; font-weight: 700; color: #059669; display: flex; align-items: center; gap: 6px;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                        <span>AES-256-GCM</span>
                    </div>
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Authenticated 128-bit Tag (§ 164.312)</div>
                </div>

                <!-- SHA-256 Checksum -->
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; border-left: 4px solid #8b5cf6;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase;">SHA-256 Integrity</span>
                        <button type="button" id="btnCopyLastSha" style="background: transparent; border: none; cursor: pointer; color: #6d28d9; padding: 0;" title="Copy SHA-256 to clipboard">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </button>
                    </div>
                    <div id="statBkpLastSha256" style="font-family: Consolas, monospace; font-size: 12px; font-weight: 700; color: #4c1d95; word-break: break-all; line-height: 1.3;">--</div>
                    <div id="statBkpVerifiedBadge" style="font-size: 11px; color: #7c3aed; font-weight: 600; margin-top: 2px;">Cryptographic Match</div>
                </div>

                <!-- Contingency Health -->
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; border-left: 4px solid #3b82f6;">
                    <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Backup SLA Health</div>
                    <div id="statBkpHealth" style="font-size: 17px; font-weight: 700; color: #0284c7;">--</div>
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Daily automated 24h cadence</div>
                </div>

                <!-- DR Drills Completed -->
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; border-left: 4px solid #f59e0b;">
                    <div style="font-size: 12px; font-weight: 600; color: #b45309; text-transform: uppercase; margin-bottom: 4px;">DR Drills Logged</div>
                    <div id="statDrillCount" style="font-size: 22px; font-weight: 700; color: #0f172a;">--</div>
                    <div id="statDrillSuccessRate" style="font-size: 11px; color: #059669; font-weight: 600; margin-top: 2px;">100% Success Rate (§ 164.308(a)(7))</div>
                </div>

                <!-- Recovery Time (RTO) -->
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; border-left: 4px solid #059669;">
                    <div style="font-size: 12px; font-weight: 600; color: #047857; text-transform: uppercase; margin-bottom: 4px;">Average Recovery Time</div>
                    <div id="statDrillRto" style="font-size: 22px; font-weight: 700; color: #059669;">--</div>
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Target RTO: &le; 240 mins (4 hrs)</div>
                </div>
            </div>

            <!-- Health Warning Banner (Dynamic) -->
            <div id="bkpHealthBanner" style="display: none; background: #fffbeb; border: 1px solid #fde68a; border-left: 5px solid #f59e0b; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    <div>
                        <strong style="color: #92400e; font-size: 14px;">CONTINGENCY BACKUP NOTICE: Scheduled Backup Alert</strong>
                        <p id="bkpHealthBannerText" style="margin: 3px 0 0 0; font-size: 12.5px; color: #b45309;">
                            The last database backup was generated more than 24 hours ago. Per 45 CFR § 164.308(a)(7)(ii)(A), execute an on-demand encrypted backup to guarantee emergency recovery capabilities.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Tab Navigation Bar -->
            <div style="display: flex; border-bottom: 2px solid #e2e8f0; margin-bottom: 18px; gap: 4px;">
                <button type="button" id="tabBtnBackups" class="bkp-tab-btn active" style="background: none; border: none; padding: 10px 18px; font-size: 14px; font-weight: 700; color: #0284c7; border-bottom: 3px solid #0284c7; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; margin-bottom: -2px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
                    <span>Database Backups Ledger</span>
                    <span id="badgeBackupsCount" style="background: #e0f2fe; color: #0369a1; font-size: 11px; padding: 2px 7px; border-radius: 10px; font-weight: 600;">0</span>
                </button>
                <button type="button" id="tabBtnDrills" class="bkp-tab-btn" style="background: none; border: none; padding: 10px 18px; font-size: 14px; font-weight: 600; color: #64748b; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; margin-bottom: -2px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    <span>Disaster Recovery Drills Log (§ 164.308(a)(7)(ii)(D))</span>
                    <span id="badgeDrillsCount" style="background: #f1f5f9; color: #475569; font-size: 11px; padding: 2px 7px; border-radius: 10px; font-weight: 600;">0</span>
                </button>
            </div>

            <!-- TAB PANE 1: BACKUPS LEDGER -->
            <div id="paneBackups" class="bkp-tab-pane">
                <!-- Search & Filters -->
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 16px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between;">
                    <div style="display: flex; gap: 10px; align-items: center; flex: 1; min-width: 280px;">
                        <div style="position: relative; flex: 1;">
                            <input type="text" id="bkpSearchInput" placeholder="Search by backup reference code, file name, or checksum..." style="width: 100%; box-sizing: border-box; padding: 8px 12px 8px 34px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none;">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" style="position: absolute; left: 10px; top: 10px;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </div>
                        <select id="bkpVerificationFilter" style="padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; color: #334155; outline: none; background: #fff;">
                            <option value="">All Verification States</option>
                            <option value="passed">Verified (Cryptographic Pass)</option>
                            <option value="pending">Pending Verification</option>
                            <option value="failed">Failed Verification</option>
                        </select>
                    </div>
                </div>

                <!-- Backups Table -->
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                            <thead>
                                <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">
                                    <th style="padding: 12px 16px;">Reference Code</th>
                                    <th style="padding: 12px 16px;">Completed At</th>
                                    <th style="padding: 12px 16px;">Type</th>
                                    <th style="padding: 12px 16px;">Archive File &amp; Size</th>
                                    <th style="padding: 12px 16px;">SHA-256 Cryptographic Checksum</th>
                                    <th style="padding: 12px 16px;">Encryption</th>
                                    <th style="padding: 12px 16px;">Integrity Status</th>
                                    <th style="padding: 12px 16px; text-align: right;">Action</th>
                                </tr>
                            </thead>
                            <tbody id="backupsTableBody">
                                <tr>
                                    <td colspan="8" style="padding: 32px; text-align: center; color: #64748b;">
                                        Loading database backups ledger...
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- TAB PANE 2: DR DRILLS LOG -->
            <div id="paneDrills" class="bkp-tab-pane" style="display: none;">
                <!-- Drills Filter -->
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 16px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between;">
                    <div style="display: flex; gap: 10px; align-items: center; flex: 1; min-width: 280px;">
                        <div style="position: relative; flex: 1;">
                            <input type="text" id="drillSearchInput" placeholder="Search by drill code, restorer name, or target environment..." style="width: 100%; box-sizing: border-box; padding: 8px 12px 8px 34px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none;">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" style="position: absolute; left: 10px; top: 10px;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </div>
                        <select id="drillSuccessFilter" style="padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; color: #334155; outline: none; background: #fff;">
                            <option value="">All Drill Outcomes</option>
                            <option value="1">Successful Restorations</option>
                            <option value="0">Failed Restorations</option>
                        </select>
                    </div>
                </div>

                <!-- Drills Table -->
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                            <thead>
                                <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">
                                    <th style="padding: 12px 16px;">Drill Code</th>
                                    <th style="padding: 12px 16px;">Date</th>
                                    <th style="padding: 12px 16px;">Drill Simulation Type</th>
                                    <th style="padding: 12px 16px;">Backup Restored</th>
                                    <th style="padding: 12px 16px;">Restorer &amp; Role</th>
                                    <th style="padding: 12px 16px;">Target Environment</th>
                                    <th style="padding: 12px 16px;">RTO (Time)</th>
                                    <th style="padding: 12px 16px;">RPO (Data Window)</th>
                                    <th style="padding: 12px 16px;">Restoration Outcome</th>
                                    <th style="padding: 12px 16px; text-align: right;">Dossier</th>
                                </tr>
                            </thead>
                            <tbody id="drillsTableBody">
                                <tr>
                                    <td colspan="10" style="padding: 32px; text-align: center; color: #64748b;">
                                        Loading disaster recovery restoration drills...
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- MODAL 1: TRIGGER ON-DEMAND ENCRYPTED BACKUP -->
            <div id="modalTriggerBackup" style="display: none; position: fixed; inset: 0; background: rgba(15,23,42,0.6); z-index: 1000; align-items: center; justify-content: center; backdrop-filter: blur(2px);">
                <div style="background: #ffffff; border-radius: 10px; width: 95%; max-width: 520px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); overflow: hidden; border: 1px solid #cbd5e1;">
                    <div style="background: #0284c7; color: #ffffff; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
                            <h3 style="margin: 0; font-size: 16px; font-weight: 700;">Trigger Encrypted Database Backup</h3>
                        </div>
                        <button type="button" class="closeModalBtn" style="background: transparent; border: none; color: #ffffff; font-size: 20px; cursor: pointer; line-height: 1;">&times;</button>
                    </div>
                    <form id="formTriggerBackup" style="padding: 20px;">
                        <p style="margin: 0 0 16px 0; font-size: 13.5px; color: #475569; line-height: 1.5;">
                            This operation creates an exact, retrievable replica of all database tables, compresses the archive, and encrypts it with <strong>AES-256-GCM</strong> authenticated encryption per <strong>45 CFR § 164.308(a)(7)(ii)(A)</strong>.
                        </p>
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; font-size: 12.5px; font-weight: 600; color: #334155; margin-bottom: 6px;">Backup Category / Reason</label>
                            <select id="triggerBackupType" style="width: 100%; box-sizing: border-box; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                                <option value="manual_on_demand">Manual On-Demand Security Backup</option>
                                <option value="scheduled_daily">Daily Scheduled Contingency Snapshot</option>
                                <option value="pre_migration">Pre-Maintenance / Migration Snapshot</option>
                                <option value="emergency">Emergency Incident Contingency Backup</option>
                            </select>
                        </div>
                        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px; margin-bottom: 18px; font-size: 12px; color: #166534;">
                            <div style="font-weight: 700; margin-bottom: 2px;">Automated Cryptographic Assurance:</div>
                            A 64-character SHA-256 checksum will be calculated on disk immediately after creation and recorded in the tamper-evident audit trail.
                        </div>
                        <div id="triggerBackupLoading" style="display: none; text-align: center; padding: 14px; margin-bottom: 14px;">
                            <div style="display: inline-block; width: 26px; height: 26px; border: 3px solid #cbd5e1; border-top-color: #0284c7; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                            <div style="font-size: 12.5px; color: #0284c7; font-weight: 600; margin-top: 8px;">Dumping, compressing, and encrypting database...</div>
                        </div>
                        <div style="display: flex; justify-content: flex-end; gap: 10px;">
                            <button type="button" class="closeModalBtn" style="background: #ffffff; color: #475569; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">Cancel</button>
                            <button type="submit" id="btnSubmitTriggerBackup" style="background: #0284c7; color: #ffffff; border: none; padding: 8px 20px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">Start Backup</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- MODAL 2: VERIFICATION DETAILS MODAL -->
            <div id="modalVerifyDetails" style="display: none; position: fixed; inset: 0; background: rgba(15,23,42,0.6); z-index: 1000; align-items: center; justify-content: center; backdrop-filter: blur(2px);">
                <div style="background: #ffffff; border-radius: 10px; width: 95%; max-width: 600px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); overflow: hidden; border: 1px solid #cbd5e1;">
                    <div style="background: #059669; color: #ffffff; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>
                            <h3 style="margin: 0; font-size: 16px; font-weight: 700;">Cryptographic Verification Certificate</h3>
                        </div>
                        <button type="button" class="closeModalBtn" style="background: transparent; border: none; color: #ffffff; font-size: 20px; cursor: pointer; line-height: 1;">&times;</button>
                    </div>
                    <div style="padding: 22px;">
                        <div style="display: flex; align-items: center; gap: 10px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 12px 16px; margin-bottom: 18px;">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            <div>
                                <strong style="color: #065f46; font-size: 14px;">INTEGRITY VERIFICATION CONFIRMED</strong>
                                <div style="font-size: 12px; color: #047857;">NIST SP 800-38D AES-256-GCM Envelope &amp; SHA-256 Checksum Match 100%</div>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 140px 1fr; gap: 10px; font-size: 13px; line-height: 1.6; margin-bottom: 18px;">
                            <span style="color: #64748b; font-weight: 600;">Backup Code:</span>
                            <span id="vdBackupCode" style="font-weight: 700; color: #0f172a;">--</span>

                            <span style="color: #64748b; font-weight: 600;">Archive File:</span>
                            <span id="vdFileName" style="word-break: break-all; color: #334155;">--</span>

                            <span style="color: #64748b; font-weight: 600;">File Size:</span>
                            <span id="vdFileSize" style="color: #334155;">--</span>

                            <span style="color: #64748b; font-weight: 600;">Encryption:</span>
                            <span style="color: #059669; font-weight: 700;">AES-256-GCM (Authenticated Envelope)</span>

                            <span style="color: #64748b; font-weight: 600;">SHA-256 Hash:</span>
                            <span id="vdSha256" style="font-family: Consolas, monospace; font-size: 11px; word-break: break-all; color: #4c1d95; background: #f5f3ff; padding: 4px 6px; border-radius: 4px;">--</span>

                            <span style="color: #64748b; font-weight: 600;">Verified At:</span>
                            <span id="vdVerifiedAt" style="color: #334155;">--</span>

                            <span style="color: #64748b; font-weight: 600;">Auditor Notes:</span>
                            <span id="vdNotes" style="color: #334155; font-style: italic;">--</span>
                        </div>

                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; font-size: 12px; color: #64748b; margin-bottom: 18px;">
                            <strong>Statutory Verification Assertion:</strong> This backup archive was verified by re-calculating the full SHA-256 disk checksum, asserting authenticated decryption of the AES-256-GCM tag, and testing GZIP stream headers. Tamper-evident audit logged under <code>CATEGORY_BACKUP</code>.
                        </div>

                        <div style="display: flex; justify-content: flex-end;">
                            <button type="button" class="closeModalBtn" style="background: #059669; color: #ffffff; border: none; padding: 8px 20px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">Close</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- MODAL 3: LOG DISASTER RECOVERY DRILL -->
            <div id="modalLogDrill" style="display: none; position: fixed; inset: 0; background: rgba(15,23,42,0.6); z-index: 1000; align-items: center; justify-content: center; backdrop-filter: blur(2px);">
                <div style="background: #ffffff; border-radius: 10px; width: 95%; max-width: 660px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); overflow: hidden; border: 1px solid #cbd5e1; max-height: 90vh; display: flex; flex-direction: column;">
                    <div style="background: #0f172a; color: #ffffff; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                            <h3 style="margin: 0; font-size: 16px; font-weight: 700;">Record Disaster Recovery Restoration Drill</h3>
                        </div>
                        <button type="button" class="closeModalBtn" style="background: transparent; border: none; color: #ffffff; font-size: 20px; cursor: pointer; line-height: 1;">&times;</button>
                    </div>

                    <form id="formLogDrill" style="padding: 20px; overflow-y: auto;">
                        <p style="margin: 0 0 16px 0; font-size: 13px; color: #64748b;">
                            Mandated by <strong>45 CFR § 164.308(a)(7)(ii)(D)</strong>: Testing and revision procedures. Records test restoration operator identity, target environment, and recovery time metrics.
                        </p>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Drill Date *</label>
                                <input type="date" id="drillInputDate" required style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                            </div>
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Simulation Type *</label>
                                <select id="drillInputType" required style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                                    <option value="sandbox_full_restore">Sandbox Full Database Restore</option>
                                    <option value="tabletop_simulation">Tabletop Disaster Simulation</option>
                                    <option value="failover_switchover">Hot-Site Failover Switchover</option>
                                    <option value="point_in_time_recovery">Point-In-Time Transaction Recovery</option>
                                </select>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Backup Code Restored</label>
                                <input type="text" id="drillInputBackupCode" placeholder="e.g. BKP-2026-0001" style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                            </div>
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Target Environment *</label>
                                <select id="drillInputTargetEnv" required style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                                    <option value="sandbox_staging">Sandbox / Staging Environment</option>
                                    <option value="isolated_recovery_host">Isolated Recovery Host</option>
                                    <option value="dr_hot_site">DR Hot Site / Cloud Standby</option>
                                    <option value="local_verification_container">Local Verification Container</option>
                                </select>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Restorer Operator Name *</label>
                                <input type="text" id="drillInputRestorerName" required placeholder="Full Name of Restorer" style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                            </div>
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Restorer Official Role *</label>
                                <input type="text" id="drillInputRestorerRole" required value="Systems Administrator / Contingency Officer" style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Actual RTO (Duration in Minutes) *</label>
                                <input type="number" id="drillInputRtoActual" required min="1" max="10000" value="45" style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Target SLA: &le; 240 mins (4 hours)</div>
                            </div>
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Actual RPO (Data Window in Hours) *</label>
                                <input type="number" id="drillInputRpoActual" required min="0" max="720" value="2" style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Target SLA: &le; 24 hours</div>
                            </div>
                        </div>

                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 14px;">
                            <div style="font-size: 12.5px; font-weight: 700; color: #334155; margin-bottom: 8px;">Restoration Validation Assertions</div>
                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: #334155; cursor: pointer;">
                                    <input type="checkbox" id="drillInputSuccess" checked style="width: 16px; height: 16px;">
                                    <strong>Restoration Succeeded:</strong> Database was fully restored and operable without critical errors.
                                </label>
                                <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: #334155; cursor: pointer;">
                                    <input type="checkbox" id="drillInputIntegrity" checked style="width: 16px; height: 16px;">
                                    <strong>Data Integrity Verified:</strong> Row counts and clinical tables matched source exactly.
                                </label>
                                <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: #334155; cursor: pointer;">
                                    <input type="checkbox" id="drillInputAuditChain" checked style="width: 16px; height: 16px;">
                                    <strong>Audit Log Hash Chain Verified:</strong> Sequential HMAC-SHA-256 chain is valid and uncorrupted.
                                </label>
                            </div>
                        </div>

                        <div style="margin-bottom: 14px;">
                            <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Sign-off HIPAA Security / Privacy Officer</label>
                            <input type="text" id="drillInputSignoffOfficer" value="Chief Information Security Officer (CISO)" style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                        </div>

                        <div style="margin-bottom: 18px;">
                            <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Drill Notes &amp; Observations</label>
                            <textarea id="drillInputNotes" rows="2" placeholder="Document any observations, network latency notes, or findings..." style="width: 100%; box-sizing: border-box; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;"></textarea>
                        </div>

                        <div style="display: flex; justify-content: flex-end; gap: 10px;">
                            <button type="button" class="closeModalBtn" style="background: #ffffff; color: #475569; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">Cancel</button>
                            <button type="submit" id="btnSubmitLogDrill" style="background: #0f172a; color: #ffffff; border: none; padding: 8px 20px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">Save DR Restoration Record</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- MODAL 4: DRILL DOSSIER VIEW / PRINT MODAL -->
            <div id="modalDrillDossier" style="display: none; position: fixed; inset: 0; background: rgba(15,23,42,0.6); z-index: 1000; align-items: center; justify-content: center; backdrop-filter: blur(2px);">
                <div style="background: #ffffff; border-radius: 10px; width: 95%; max-width: 680px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); overflow: hidden; border: 1px solid #cbd5e1; max-height: 90vh; display: flex; flex-direction: column;">
                    <div style="background: #0f172a; color: #ffffff; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0; font-size: 16px; font-weight: 700;">Disaster Recovery Drill Dossier</h3>
                        <div style="display: flex; gap: 8px;">
                            <button type="button" id="btnPrintDrillDossier" style="background: #0284c7; color: #ffffff; border: none; padding: 5px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer;">Print Dossier</button>
                            <button type="button" class="closeModalBtn" style="background: transparent; border: none; color: #ffffff; font-size: 20px; cursor: pointer; line-height: 1;">&times;</button>
                        </div>
                    </div>
                    <div id="drillDossierContent" style="padding: 24px; overflow-y: auto; font-size: 13.5px; line-height: 1.6;">
                        <!-- Injected dynamically -->
                    </div>
                </div>
            </div>

            <style>
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .bkp-tab-btn:hover {
                    color: #0284c7 !important;
                }
            </style>
        </div>
        `;
    }
}
