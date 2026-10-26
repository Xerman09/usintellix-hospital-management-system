/**
 * Equipment Assets & Biomedical Engineering Management View
 */
export function EquipmentAssetsView(user = {}) {
    return `
        <div class="equipment-assets-container" style="padding: 24px; max-width: 1600px; margin: 0 auto; color: var(--text-primary, #0f172a);">
            <!-- Header Section -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 16px;">
                <div>
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                        <span style="display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 8px; background: rgba(37, 99, 235, 0.1); color: #2563eb;">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                                <line x1="8" y1="21" x2="16" y2="21"></line>
                                <line x1="12" y1="17" x2="12" y2="21"></line>
                            </svg>
                        </span>
                        <h1 style="margin: 0; font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em;">Biomedical Engineering &amp; Equipment Fleet</h1>
                    </div>
                    <p style="margin: 0; font-size: 0.875rem; color: var(--text-muted, #64748b);">
                        Machinery asset registry, recurring Preventive Maintenance (PM) calendar, nurse breakdown ticketing, and electrical safety calibrations
                    </p>
                </div>
                <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                    <button id="eq-btn-refresh" class="btn btn-secondary" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; font-size: 0.875rem; border-radius: 6px; border: 1px solid var(--border-color, #e2e8f0); background: var(--bg-card, #ffffff); cursor: pointer;">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <polyline points="1 20 1 14 7 14"></polyline>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                        </svg>
                        Refresh
                    </button>
                    <button id="biomed-btn-report-breakdown" class="btn" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; font-size: 0.875rem; font-weight: 700; border-radius: 6px; background: #dc2626; color: #ffffff; border: none; cursor: pointer; box-shadow: 0 1px 3px rgba(220,38,38,0.3);">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        🚨 Report Breakdown Ticket
                    </button>
                    <button id="biomed-btn-add-schedule" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; font-size: 0.875rem; font-weight: 600; border-radius: 6px; background: #059669; color: #ffffff; border: none; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        + Configure PM
                    </button>
                    <button id="eq-btn-add" class="btn btn-secondary" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; font-size: 0.875rem; font-weight: 600; border-radius: 6px; background: #fff; color: #2563eb; border: 1px solid #cbd5e1; cursor: pointer;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        Register Asset
                    </button>
                </div>
            </div>

            <!-- Subsystem Navigation Tabs -->
            <div style="display: flex; gap: 8px; border-bottom: 2px solid var(--border-color, #e2e8f0); margin-bottom: 24px; overflow-x: auto;">
                <button type="button" id="biomed-tab-fleet" class="biomed-nav-tab active-tab" style="padding: 10px 18px; font-weight: 600; font-size: 0.875rem; border: none; background: transparent; cursor: pointer; border-bottom: 2px solid #2563eb; margin-bottom: -2px; color: #2563eb; display: inline-flex; align-items: center; gap: 8px; white-space: nowrap;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                    Fleet Inventory &amp; Directory
                </button>
                <button type="button" id="biomed-tab-breakdown" class="biomed-nav-tab" style="padding: 10px 18px; font-weight: 600; font-size: 0.875rem; border: none; background: transparent; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; color: var(--text-muted, #64748b); display: inline-flex; align-items: center; gap: 8px; white-space: nowrap;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    Breakdown Ticketing Workbench
                    <span id="biomed-tab-stat-down-badge" class="badge-pill" style="display: none; background: #dc2626; color: #fff; font-size: 0.7rem; padding: 2px 7px; border-radius: 9999px; font-weight: 700; animation: pulse 1.5s infinite;">0 STAT DOWN</span>
                </button>
                <button type="button" id="biomed-tab-calendar" class="biomed-nav-tab" style="padding: 10px 18px; font-weight: 600; font-size: 0.875rem; border: none; background: transparent; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; color: var(--text-muted, #64748b); display: inline-flex; align-items: center; gap: 8px; white-space: nowrap;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    Preventive Maintenance (PM) Calendar
                    <span id="biomed-tab-overdue-count" class="badge-pill" style="display: none; background: #dc2626; color: #fff; font-size: 0.7rem; padding: 1px 7px; border-radius: 9999px; font-weight: 700;">0</span>
                </button>
                <button type="button" id="biomed-tab-workorders" class="biomed-nav-tab" style="padding: 10px 18px; font-weight: 600; font-size: 0.875rem; border: none; background: transparent; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; color: var(--text-muted, #64748b); display: inline-flex; align-items: center; gap: 8px; white-space: nowrap;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
                    All Work Orders &amp; Safety Calibrations
                    <span id="biomed-tab-open-wo-count" class="badge-pill" style="display: none; background: #2563eb; color: #fff; font-size: 0.7rem; padding: 1px 7px; border-radius: 9999px; font-weight: 700;">0</span>
                </button>
            </div>

            <!-- ============================================================== -->
            <!-- VIEW 1: FLEET INVENTORY & DIRECTORY                            -->
            <!-- ============================================================== -->
            <div id="biomed-view-fleet">
                <!-- Fleet KPI Summary Cards -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 24px;">
                    <div class="card" style="padding: 18px 20px; border-radius: 10px; background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0); box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-size: 0.8125rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted, #64748b);">Total Machinery</span>
                            <span style="display: inline-flex; padding: 6px; border-radius: 6px; background: rgba(59, 130, 246, 0.1); color: #3b82f6;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7h-9"></path><path d="M14 17H5"></path><circle cx="17" cy="17" r="3"></circle><circle cx="7" cy="7" r="3"></circle></svg>
                            </span>
                        </div>
                        <div style="display: flex; align-items: baseline; gap: 8px;">
                            <span id="eq-kpi-total" style="font-size: 1.75rem; font-weight: 700; color: var(--text-primary, #0f172a);">--</span>
                            <span id="eq-kpi-critical" style="font-size: 0.75rem; color: #dc2626; font-weight: 600;">-- Life Critical</span>
                        </div>
                    </div>

                    <div class="card" style="padding: 18px 20px; border-radius: 10px; background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0); box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-size: 0.8125rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted, #64748b);">Operational Fleet</span>
                            <span style="display: inline-flex; padding: 6px; border-radius: 6px; background: rgba(16, 185, 129, 0.1); color: #10b981;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                            </span>
                        </div>
                        <div style="display: flex; align-items: baseline; gap: 8px;">
                            <span id="eq-kpi-operational" style="font-size: 1.75rem; font-weight: 700; color: #15803d;">--</span>
                            <span id="eq-kpi-rate" style="font-size: 0.75rem; background: rgba(16, 185, 129, 0.15); color: #15803d; padding: 2px 6px; border-radius: 4px; font-weight: 600;">--% Active</span>
                        </div>
                    </div>

                    <div class="card" id="eq-card-calibration-kpi" style="padding: 18px 20px; border-radius: 10px; background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0); box-shadow: 0 1px 3px rgba(0,0,0,0.04); cursor: pointer;" title="Click to filter calibration due">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-size: 0.8125rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted, #64748b);">Calibration Alerts</span>
                            <span style="display: inline-flex; padding: 6px; border-radius: 6px; background: rgba(245, 158, 11, 0.15); color: #d97706;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                            </span>
                        </div>
                        <div style="display: flex; align-items: baseline; gap: 8px;">
                            <span id="eq-kpi-needs-calibration" style="font-size: 1.75rem; font-weight: 700; color: #b45309;">--</span>
                            <span id="eq-kpi-due-30" style="font-size: 0.75rem; color: var(--text-muted, #64748b);">(-- due in 30d)</span>
                        </div>
                    </div>

                    <div class="card" style="padding: 18px 20px; border-radius: 10px; background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0); box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-size: 0.8125rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted, #64748b);">Out of Service (Lockout)</span>
                            <span style="display: inline-flex; padding: 6px; border-radius: 6px; background: rgba(239, 68, 68, 0.1); color: #ef4444;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                            </span>
                        </div>
                        <div style="display: flex; align-items: baseline; gap: 8px;">
                            <span id="eq-kpi-out-of-service" style="font-size: 1.75rem; font-weight: 700; color: #b91c1c;">--</span>
                            <span id="eq-kpi-repair-detail" style="font-size: 0.75rem; color: var(--text-muted, #64748b);">-- under repair</span>
                        </div>
                    </div>
                </div>

                <!-- Filters & Search Toolbar -->
                <div class="card" style="padding: 16px 20px; border-radius: 10px; background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0); margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                    <div style="display: grid; grid-template-columns: 2fr 1.2fr 1.2fr 1.2fr 1.2fr auto; gap: 12px; align-items: center;">
                        <div style="position: relative;">
                            <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted, #94a3b8); pointer-events: none;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            </span>
                            <input type="text" id="eq-filter-search" placeholder="Search tag, name, serial, model, manufacturer..." class="form-control" style="width: 100%; padding: 8px 12px 8px 36px; font-size: 0.875rem; border-radius: 6px; border: 1px solid var(--border-color, #cbd5e1); background: var(--bg-main, #ffffff); color: var(--text-primary, #0f172a);">
                        </div>
                        <div>
                            <select id="eq-filter-category" class="form-control" style="width: 100%; padding: 8px 12px; font-size: 0.875rem; border-radius: 6px; border: 1px solid var(--border-color, #cbd5e1); background: var(--bg-main, #ffffff); color: var(--text-primary, #0f172a);">
                                <option value="">All Categories</option>
                                <option value="Life Support">Life Support</option>
                                <option value="Monitoring">Monitoring</option>
                                <option value="Diagnostic">Diagnostic</option>
                                <option value="Surgical">Surgical</option>
                                <option value="Laboratory">Laboratory</option>
                                <option value="General Facility">General Facility</option>
                            </select>
                        </div>
                        <div>
                            <select id="eq-filter-status" class="form-control" style="width: 100%; padding: 8px 12px; font-size: 0.875rem; border-radius: 6px; border: 1px solid var(--border-color, #cbd5e1); background: var(--bg-main, #ffffff); color: var(--text-primary, #0f172a);">
                                <option value="">All Statuses</option>
                                <option value="Operational">Operational</option>
                                <option value="Needs Calibration">Needs Calibration</option>
                                <option value="Under Repair">Under Repair</option>
                                <option value="Decommissioned">Decommissioned</option>
                            </select>
                        </div>
                        <div>
                            <select id="eq-filter-department" class="form-control" style="width: 100%; padding: 8px 12px; font-size: 0.875rem; border-radius: 6px; border: 1px solid var(--border-color, #cbd5e1); background: var(--bg-main, #ffffff); color: var(--text-primary, #0f172a);">
                                <option value="">All Departments</option>
                            </select>
                        </div>
                        <div>
                            <select id="eq-filter-calibration" class="form-control" style="width: 100%; padding: 8px 12px; font-size: 0.875rem; border-radius: 6px; border: 1px solid var(--border-color, #cbd5e1); background: var(--bg-main, #ffffff); color: var(--text-primary, #0f172a);">
                                <option value="">All Calibration Dates</option>
                                <option value="overdue">Calibration Overdue</option>
                                <option value="upcoming_30">Due in 30 Days</option>
                                <option value="all_due">All Due Soon / Overdue</option>
                            </select>
                        </div>
                        <div>
                            <button id="eq-btn-reset-filters" class="btn" style="padding: 8px 14px; font-size: 0.875rem; border-radius: 6px; border: 1px solid var(--border-color, #cbd5e1); background: var(--bg-card, #ffffff); color: var(--text-muted, #64748b); cursor: pointer;" title="Reset filters">
                                Reset
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Main Assets Table Card -->
                <div class="card" style="border-radius: 10px; background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0); overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.875rem;">
                            <thead>
                                <tr style="background: var(--bg-table-header, #f8fafc); border-bottom: 1px solid var(--border-color, #e2e8f0); color: var(--text-muted, #475569); font-weight: 600; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em;">
                                    <th style="padding: 12px 16px;">Asset Tag / Barcode</th>
                                    <th style="padding: 12px 16px;">Equipment Name &amp; Model</th>
                                    <th style="padding: 12px 16px;">Category &amp; Criticality</th>
                                    <th style="padding: 12px 16px;">Assigned Location</th>
                                    <th style="padding: 12px 16px;">Calibration Schedule</th>
                                    <th style="padding: 12px 16px;">Status / Lockout Reason</th>
                                    <th style="padding: 12px 16px; text-align: right;">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="eq-table-body">
                                <tr>
                                    <td colspan="7" style="padding: 40px; text-align: center; color: var(--text-muted, #94a3b8);">
                                        <div style="display: inline-block; width: 24px; height: 24px; border: 3px solid #e2e8f0; border-top-color: #2563eb; border-radius: 50%; animation: eq-spin 0.8s linear infinite;"></div>
                                        <div style="margin-top: 8px;">Loading equipment machinery records...</div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div style="padding: 12px 20px; border-top: 1px solid var(--border-color, #e2e8f0); background: var(--bg-table-footer, #f8fafc); display: flex; justify-content: space-between; align-items: center; font-size: 0.8125rem; color: var(--text-muted, #64748b);">
                        <div id="eq-table-count">Showing 0 equipment records</div>
                        <div>Compliant with Biomedical Engineering &amp; Clinical Safety Standards</div>
                    </div>
                </div>
            </div>

            <!-- ============================================================== -->
            <!-- VIEW 2: BREAKDOWN TICKETING WORKBENCH (NEW)                   -->
            <!-- ============================================================== -->
            <div id="biomed-view-breakdown" style="display: none;">
                <!-- Breakdown KPI Summary Banner -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 16px; margin-bottom: 24px;">
                    <!-- STAT Critical Down -->
                    <div class="card" style="padding: 18px 20px; border-radius: 10px; background: #fff; border: 2px solid #ef4444; box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.1);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #dc2626;">🔴 Critical Life Support Down</span>
                            <span style="display: inline-flex; width: 10px; height: 10px; border-radius: 50%; background: #dc2626; animation: eq-pulse 1s infinite;"></span>
                        </div>
                        <div style="display: flex; align-items: baseline; gap: 8px;">
                            <span id="biomed-kpi-stat-down" style="font-size: 1.85rem; font-weight: 800; color: #b91c1c;">--</span>
                            <span style="font-size: 0.75rem; color: #dc2626; font-weight: 600;">Immediate STAT Action</span>
                        </div>
                    </div>

                    <!-- Urgent High Priority -->
                    <div class="card" style="padding: 18px 20px; border-radius: 10px; background: #fff; border: 1px solid var(--border-color, #e2e8f0);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #d97706;">🟠 High Priority Breakdowns</span>
                            <span style="display: inline-flex; padding: 4px; border-radius: 4px; background: rgba(245,158,11,0.15); color: #d97706;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>
                            </span>
                        </div>
                        <div style="display: flex; align-items: baseline; gap: 8px;">
                            <span id="biomed-kpi-urgent-down" style="font-size: 1.85rem; font-weight: 700; color: #d97706;">--</span>
                            <span style="font-size: 0.75rem; color: #64748b;">OR / Ward machinery</span>
                        </div>
                    </div>

                    <!-- Total Active Lockouts -->
                    <div class="card" style="padding: 18px 20px; border-radius: 10px; background: #fff; border: 1px solid var(--border-color, #e2e8f0);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #475569;">Machines Under Repair</span>
                            <span style="display: inline-flex; padding: 4px; border-radius: 4px; background: rgba(100,116,139,0.15); color: #475569;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            </span>
                        </div>
                        <div style="display: flex; align-items: baseline; gap: 8px;">
                            <span id="biomed-kpi-locked-machines" style="font-size: 1.85rem; font-weight: 700; color: #334155;">--</span>
                            <span style="font-size: 0.75rem; color: #b91c1c; font-weight: 600;">Locked Out from Patients</span>
                        </div>
                    </div>

                    <!-- Average Downtime Hours -->
                    <div class="card" style="padding: 18px 20px; border-radius: 10px; background: #fff; border: 1px solid var(--border-color, #e2e8f0);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #2563eb;">Avg Downtime</span>
                            <span style="display: inline-flex; padding: 4px; border-radius: 4px; background: rgba(37,99,235,0.1); color: #2563eb;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            </span>
                        </div>
                        <div style="display: flex; align-items: baseline; gap: 8px;">
                            <span id="biomed-kpi-avg-downtime" style="font-size: 1.85rem; font-weight: 700; color: #2563eb;">--h</span>
                            <span style="font-size: 0.75rem; color: #64748b;">MTTR (Mean Time to Repair)</span>
                        </div>
                    </div>

                    <!-- Total Repair Costs -->
                    <div class="card" style="padding: 18px 20px; border-radius: 10px; background: #fff; border: 1px solid var(--border-color, #e2e8f0);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #15803d;">Parts &amp; Labor Costs</span>
                            <span style="display: inline-flex; padding: 4px; border-radius: 4px; background: rgba(16,185,129,0.15); color: #15803d;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                            </span>
                        </div>
                        <div style="display: flex; align-items: baseline; gap: 8px;">
                            <span id="biomed-kpi-repair-costs" style="font-size: 1.6rem; font-weight: 700; color: #15803d;">--</span>
                            <span style="font-size: 0.75rem; color: #64748b;">Spare parts &amp; CBET labor</span>
                        </div>
                    </div>
                </div>

                <!-- Breakdown Filter Toolbar -->
                <div class="card" style="padding: 16px 20px; border-radius: 10px; background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0); margin-bottom: 20px;">
                    <div style="display: grid; grid-template-columns: 2fr 1.3fr 1.3fr auto; gap: 12px; align-items: center;">
                        <input type="text" id="biomed-tkt-filter-search" placeholder="Search Ticket #, Machine Tag, Nurse Name, Ward, or Symptom..." class="form-control" style="width: 100%; padding: 8px 12px; font-size: 0.875rem; border-radius: 6px; border: 1px solid #cbd5e1;">
                        <select id="biomed-tkt-filter-priority" class="form-control" style="width: 100%; padding: 8px 12px; font-size: 0.875rem; border-radius: 6px; border: 1px solid #cbd5e1;">
                            <option value="">All Urgency Levels</option>
                            <option value="stat_life_critical">🔴 Critical Life Support Down (STAT)</option>
                            <option value="urgent">🟠 High Priority (Urgent)</option>
                            <option value="routine">🟡 Routine Equipment Issue</option>
                        </select>
                        <select id="biomed-tkt-filter-status" class="form-control" style="width: 100%; padding: 8px 12px; font-size: 0.875rem; border-radius: 6px; border: 1px solid #cbd5e1;">
                            <option value="">All Ticket Statuses</option>
                            <option value="in_progress">In Progress (Biomed Responding)</option>
                            <option value="pending_parts">Pending Spare Parts</option>
                            <option value="completed_passed">Repairs Completed (Released)</option>
                            <option value="failed_quarantined">Failed Test (Quarantined)</option>
                        </select>
                        <button id="biomed-btn-open-breakdown-modal" class="btn btn-primary" style="padding: 8px 18px; font-size: 0.875rem; font-weight: 700; border-radius: 6px; background: #dc2626; color: #fff; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                            Report Breakdown
                        </button>
                    </div>
                </div>

                <!-- Breakdown Tickets Table Card -->
                <div class="card" style="border-radius: 10px; background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0); overflow: hidden;">
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.875rem;">
                            <thead>
                                <tr style="background: var(--bg-table-header, #f8fafc); border-bottom: 1px solid var(--border-color, #e2e8f0); color: var(--text-muted, #475569); font-weight: 600; text-transform: uppercase; font-size: 0.75rem;">
                                    <th style="padding: 12px 16px;">Ticket # &amp; Urgency</th>
                                    <th style="padding: 12px 16px;">Machinery Asset &amp; Location</th>
                                    <th style="padding: 12px 16px;">Alarm / Failure Symptom</th>
                                    <th style="padding: 12px 16px;">Reported By &amp; Department</th>
                                    <th style="padding: 12px 16px;">Clinical Lockout Status</th>
                                    <th style="padding: 12px 16px;">Assigned Engineer &amp; Diagnostics</th>
                                    <th style="padding: 12px 16px; text-align: right;">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="biomed-tkt-table-body">
                                <tr>
                                    <td colspan="7" style="padding: 40px; text-align: center; color: var(--text-muted, #94a3b8);">
                                        <div style="display: inline-block; width: 24px; height: 24px; border: 3px solid #e2e8f0; border-top-color: #2563eb; border-radius: 50%; animation: eq-spin 0.8s linear infinite;"></div>
                                        <div style="margin-top: 8px;">Loading breakdown tickets...</div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div style="padding: 12px 20px; border-top: 1px solid var(--border-color, #e2e8f0); background: var(--bg-table-footer, #f8fafc); display: flex; justify-content: space-between; align-items: center; font-size: 0.8125rem; color: var(--text-muted, #64748b);">
                        <div id="biomed-tkt-table-count">Showing 0 breakdown tickets</div>
                        <div>Zero Tolerance Clinical Safety &bull; Automatic Equipment Lockout</div>
                    </div>
                </div>
            </div>

            <!-- ============================================================== -->
            <!-- VIEW 3: PREVENTIVE MAINTENANCE (PM) CALENDAR & SCHEDULES       -->
            <!-- ============================================================== -->
            <div id="biomed-view-calendar" style="display: none;">
                <!-- PM Calendar Summary Banner -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
                    <div class="card" style="padding: 18px 20px; border-radius: 10px; background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0); box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-size: 0.8125rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted, #64748b);">Active PM Schedules</span>
                            <span style="display: inline-flex; padding: 6px; border-radius: 6px; background: rgba(37, 99, 235, 0.1); color: #2563eb;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line></svg>
                            </span>
                        </div>
                        <div style="display: flex; align-items: baseline; gap: 8px;">
                            <span id="biomed-kpi-active-schedules" style="font-size: 1.75rem; font-weight: 700; color: #2563eb;">--</span>
                            <span id="biomed-kpi-total-schedules" style="font-size: 0.75rem; color: var(--text-muted, #64748b);">-- total tracked</span>
                        </div>
                    </div>

                    <div class="card" style="padding: 18px 20px; border-radius: 10px; background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0); box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-size: 0.8125rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted, #64748b);">Life Critical Machinery</span>
                            <span style="display: inline-flex; padding: 6px; border-radius: 6px; background: rgba(220, 38, 38, 0.1); color: #dc2626;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>
                            </span>
                        </div>
                        <div style="display: flex; align-items: baseline; gap: 8px;">
                            <span id="biomed-kpi-critical" style="font-size: 1.75rem; font-weight: 700; color: #dc2626;">--</span>
                            <span style="font-size: 0.75rem; color: #dc2626; font-weight: 600;">Ventilators &amp; Defibrillators</span>
                        </div>
                    </div>

                    <div class="card" id="biomed-card-pm-overdue" style="padding: 18px 20px; border-radius: 10px; background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0); box-shadow: 0 1px 3px rgba(0,0,0,0.04); cursor: pointer;" title="Click to filter overdue PM schedules">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-size: 0.8125rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted, #64748b);">Overdue PMs</span>
                            <span style="display: inline-flex; padding: 6px; border-radius: 6px; background: rgba(239, 68, 68, 0.15); color: #ef4444;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            </span>
                        </div>
                        <div style="display: flex; align-items: baseline; gap: 8px;">
                            <span id="biomed-kpi-overdue" style="font-size: 1.75rem; font-weight: 700; color: #b91c1c;">--</span>
                            <span style="font-size: 0.75rem; background: rgba(239,68,68,0.15); color: #b91c1c; padding: 2px 6px; border-radius: 4px; font-weight: 600;">Requires Urgent Action</span>
                        </div>
                    </div>

                    <div class="card" style="padding: 18px 20px; border-radius: 10px; background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0); box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-size: 0.8125rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted, #64748b);">Due This Month</span>
                            <span style="display: inline-flex; padding: 6px; border-radius: 6px; background: rgba(245, 158, 11, 0.15); color: #d97706;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            </span>
                        </div>
                        <div style="display: flex; align-items: baseline; gap: 8px;">
                            <span id="biomed-kpi-due-month" style="font-size: 1.75rem; font-weight: 700; color: #d97706;">--</span>
                            <span id="biomed-kpi-due-30" style="font-size: 0.75rem; color: var(--text-muted, #64748b);">-- in next 30 days</span>
                        </div>
                    </div>

                    <div class="card" style="padding: 18px 20px; border-radius: 10px; background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0); box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-size: 0.8125rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted, #64748b);">PM Compliance Rate</span>
                            <span style="display: inline-flex; padding: 6px; border-radius: 6px; background: rgba(16, 185, 129, 0.15); color: #10b981;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                            </span>
                        </div>
                        <div style="display: flex; align-items: baseline; gap: 8px;">
                            <span id="biomed-kpi-compliance" style="font-size: 1.75rem; font-weight: 700; color: #15803d;">--%</span>
                            <span style="font-size: 0.75rem; color: #15803d; font-weight: 600;">IEC 62353 &amp; NFPA 99</span>
                        </div>
                    </div>
                </div>

                <!-- PM Filter Toolbar -->
                <div class="card" style="padding: 16px 20px; border-radius: 10px; background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0); margin-bottom: 20px;">
                    <div style="display: grid; grid-template-columns: 2fr 1.2fr 1.2fr 1.2fr 1.2fr auto; gap: 12px; align-items: center;">
                        <input type="text" id="biomed-pm-filter-search" placeholder="Search PM title, code, equipment tag, engineer..." class="form-control" style="width: 100%; padding: 8px 12px; font-size: 0.875rem; border-radius: 6px; border: 1px solid #cbd5e1;">
                        <select id="biomed-pm-filter-frequency" class="form-control" style="width: 100%; padding: 8px 12px; font-size: 0.875rem; border-radius: 6px; border: 1px solid #cbd5e1;">
                            <option value="">All Frequencies</option>
                            <option value="monthly">Monthly Servicing</option>
                            <option value="bi_monthly">Bi-Monthly (60 Days)</option>
                            <option value="quarterly">Quarterly Servicing</option>
                            <option value="semi_annual">Semi-Annual (6 Months)</option>
                            <option value="annual">Annual Major Overhaul</option>
                            <option value="biennial">Biennial (2 Years)</option>
                        </select>
                        <select id="biomed-pm-filter-tier" class="form-control" style="width: 100%; padding: 8px 12px; font-size: 0.875rem; border-radius: 6px; border: 1px solid #cbd5e1;">
                            <option value="">All Criticality Tiers</option>
                            <option value="life_critical">Life Critical (Ventilator/Defib/Anes)</option>
                            <option value="high">High Criticality</option>
                            <option value="medium">Medium Criticality</option>
                            <option value="low">Low Criticality</option>
                        </select>
                        <select id="biomed-pm-filter-type" class="form-control" style="width: 100%; padding: 8px 12px; font-size: 0.875rem; border-radius: 6px; border: 1px solid #cbd5e1;">
                            <option value="">All Maintenance Types</option>
                            <option value="preventive_maintenance">Preventive Maintenance</option>
                            <option value="electrical_safety_inspection">Electrical Safety Inspection</option>
                            <option value="calibration_certification">Calibration Certification</option>
                            <option value="software_firmware_update">Software Update</option>
                            <option value="major_vendor_overhaul">Major Overhaul</option>
                        </select>
                        <select id="biomed-pm-filter-due" class="form-control" style="width: 100%; padding: 8px 12px; font-size: 0.875rem; border-radius: 6px; border: 1px solid #cbd5e1;">
                            <option value="">All Due Statuses</option>
                            <option value="overdue">Overdue PMs Only</option>
                            <option value="due_soon">Due Soon (&le; 14 Days)</option>
                            <option value="due_30">Due in 30 Days</option>
                        </select>
                        <button id="biomed-btn-reset-pm-filters" class="btn" style="padding: 8px 14px; font-size: 0.875rem; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; color: #64748b; cursor: pointer;">
                            Reset
                        </button>
                    </div>
                </div>

                <!-- PM Schedules Table Card -->
                <div class="card" style="border-radius: 10px; background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0); overflow: hidden;">
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.875rem;">
                            <thead>
                                <tr style="background: var(--bg-table-header, #f8fafc); border-bottom: 1px solid var(--border-color, #e2e8f0); color: var(--text-muted, #475569); font-weight: 600; text-transform: uppercase; font-size: 0.75rem;">
                                    <th style="padding: 12px 16px;">Schedule Code &amp; Tier</th>
                                    <th style="padding: 12px 16px;">Machinery Asset &amp; Location</th>
                                    <th style="padding: 12px 16px;">Servicing Program Title</th>
                                    <th style="padding: 12px 16px;">Frequency &amp; Interval</th>
                                    <th style="padding: 12px 16px;">Next PM Due Date</th>
                                    <th style="padding: 12px 16px;">Assigned Engineer / Vendor</th>
                                    <th style="padding: 12px 16px; text-align: right;">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="biomed-pm-table-body">
                                <tr>
                                    <td colspan="7" style="padding: 40px; text-align: center; color: var(--text-muted, #94a3b8);">
                                        Loading Preventive Maintenance schedules...
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div style="padding: 12px 20px; border-top: 1px solid var(--border-color, #e2e8f0); background: var(--bg-table-footer, #f8fafc); display: flex; justify-content: space-between; align-items: center; font-size: 0.8125rem; color: var(--text-muted, #64748b);">
                        <div id="biomed-pm-table-count">Showing 0 PM schedules</div>
                        <div>Safety Standards: IEC 62353 Recurrent Test &bull; NFPA 99 Health Care Facilities &bull; ANSI/AAMI EQ56</div>
                    </div>
                </div>
            </div>

            <!-- ============================================================== -->
            <!-- VIEW 4: ALL BIOMEDICAL WORK ORDERS & SAFETY CALIBRATIONS       -->
            <!-- ============================================================== -->
            <div id="biomed-view-workorders" style="display: none;">
                <!-- Work Orders Table -->
                <div class="card" style="padding: 16px 20px; border-radius: 10px; background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0); margin-bottom: 20px;">
                    <div style="display: grid; grid-template-columns: 2fr 1.2fr 1.2fr 1.2fr auto; gap: 12px; align-items: center;">
                        <input type="text" id="biomed-wo-filter-search" placeholder="Search Work Order #, Asset Tag, Engineer..." class="form-control" style="width: 100%; padding: 8px 12px; font-size: 0.875rem; border-radius: 6px; border: 1px solid #cbd5e1;">
                        <select id="biomed-wo-filter-status" class="form-control" style="width: 100%; padding: 8px 12px; font-size: 0.875rem; border-radius: 6px; border: 1px solid #cbd5e1;">
                            <option value="">All Statuses</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="in_progress">In Progress</option>
                            <option value="pending_parts">Pending Parts</option>
                            <option value="completed_passed">Completed (Passed)</option>
                            <option value="failed_quarantined">Failed &amp; Quarantined</option>
                        </select>
                        <select id="biomed-wo-filter-priority" class="form-control" style="width: 100%; padding: 8px 12px; font-size: 0.875rem; border-radius: 6px; border: 1px solid #cbd5e1;">
                            <option value="">All Priorities</option>
                            <option value="stat_life_critical">🔴 STAT - Life Critical</option>
                            <option value="urgent">🟠 Urgent</option>
                            <option value="scheduled_pm">Scheduled PM</option>
                            <option value="routine">🟡 Routine</option>
                        </select>
                        <select id="biomed-wo-filter-type" class="form-control" style="width: 100%; padding: 8px 12px; font-size: 0.875rem; border-radius: 6px; border: 1px solid #cbd5e1;">
                            <option value="">All Types</option>
                            <option value="breakdown_emergency_repair">Breakdown / Emergency</option>
                            <option value="preventive_maintenance">Preventive Maintenance</option>
                            <option value="calibration_certification">Calibration Certification</option>
                            <option value="electrical_safety_check">Electrical Safety Check</option>
                        </select>
                        <button id="biomed-btn-new-wo" class="btn btn-primary" style="padding: 8px 16px; font-size: 0.875rem; font-weight: 600; border-radius: 6px; background: #2563eb; color: #fff; border: none; cursor: pointer;">
                            + Work Order
                        </button>
                    </div>
                </div>

                <div class="card" style="border-radius: 10px; background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0); overflow: hidden;">
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.875rem;">
                            <thead>
                                <tr style="background: var(--bg-table-header, #f8fafc); border-bottom: 1px solid var(--border-color, #e2e8f0); color: var(--text-muted, #475569); font-weight: 600; text-transform: uppercase; font-size: 0.75rem;">
                                    <th style="padding: 12px 16px;">Work Order # &amp; Date</th>
                                    <th style="padding: 12px 16px;">Equipment Tag &amp; Machinery</th>
                                    <th style="padding: 12px 16px;">Type &amp; Urgency</th>
                                    <th style="padding: 12px 16px;">Lead Engineer / Vendor</th>
                                    <th style="padding: 12px 16px;">Electrical Safety / Calib</th>
                                    <th style="padding: 12px 16px;">Status</th>
                                    <th style="padding: 12px 16px; text-align: right;">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="biomed-wo-table-body">
                                <tr>
                                    <td colspan="7" style="padding: 40px; text-align: center; color: var(--text-muted, #94a3b8);">
                                        Loading work orders...
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div style="padding: 12px 20px; border-top: 1px solid var(--border-color, #e2e8f0); background: var(--bg-table-footer, #f8fafc); font-size: 0.8125rem; color: var(--text-muted, #64748b);">
                        <div id="biomed-wo-table-count">Showing 0 work orders</div>
                    </div>
                </div>
            </div>

            <!-- ============================================================== -->
            <!-- MODAL: REPORT MACHINE BREAKDOWN / CLINICAL ALERT (NEW)         -->
            <!-- ============================================================== -->
            <div id="biomed-modal-report-breakdown" class="modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); z-index: 1050; align-items: center; justify-content: center; padding: 20px; overflow-y: auto;">
                <div style="background: var(--bg-card, #ffffff); width: 100%; max-width: 760px; border-radius: 12px; box-shadow: 0 25px 30px -5px rgba(0,0,0,0.3); overflow: hidden; margin: auto; max-height: 94vh; display: flex; flex-direction: column; border-top: 5px solid #dc2626;">
                    <div style="padding: 18px 24px; border-bottom: 1px solid #fee2e2; display: flex; justify-content: space-between; align-items: center; background: #fef2f2;">
                        <div>
                            <div style="font-size: 0.75rem; font-weight: 800; color: #dc2626; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
                                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #dc2626; animation: eq-pulse 1s infinite;"></span>
                                Urgent Biomedical Alert &bull; Clinical Lockout
                            </div>
                            <h3 style="margin: 2px 0 0 0; font-size: 1.15rem; font-weight: 800; color: #991b1b;">Report Machine Breakdown / Alarm Failure</h3>
                        </div>
                        <button type="button" class="eq-modal-close" data-modal="biomed-modal-report-breakdown" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: #991b1b;">&times;</button>
                    </div>

                    <form id="biomed-form-report-breakdown" style="padding: 24px; overflow-y: auto; flex: 1;">
                        <!-- Warning notice -->
                        <div style="background: rgba(220,38,38,0.06); border: 1px solid rgba(220,38,38,0.25); border-radius: 8px; padding: 12px 16px; margin-bottom: 18px; font-size: 0.8125rem; color: #991b1b; line-height: 1.4;">
                            <strong>Safety Lockout Notice:</strong> Submitting this ticket will immediately lock out the machinery in hospital systems and flip its status to <strong>Under Repair / Out of Service</strong>. Clinicians and ward nurses will be blocked from assigning this asset to any patient until recertified.
                        </div>

                        <!-- Target Machinery Asset -->
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 6px; color: #1e293b;">
                                Select Defective Equipment Asset <span style="color: #ef4444;">*</span>
                            </label>
                            <select id="biomed-report-asset-id" required class="form-control" style="width: 100%; padding: 10px 12px; font-size: 0.875rem; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff;">
                                <option value="">Select machinery asset...</option>
                            </select>
                        </div>

                        <!-- Urgency Selector -->
                        <div style="margin-bottom: 18px;">
                            <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 6px; color: #1e293b;">
                                Breakdown Urgency Level <span style="color: #ef4444;">*</span>
                            </label>
                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                                <label style="display: flex; flex-direction: column; padding: 12px; border: 2px solid #ef4444; border-radius: 8px; background: rgba(239,68,68,0.04); cursor: pointer;">
                                    <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 0.875rem; color: #dc2626;">
                                        <input type="radio" name="breakdown_priority" value="stat_life_critical" checked style="accent-color: #dc2626;">
                                        🔴 Critical Life Support Down
                                    </div>
                                    <div style="font-size: 0.725rem; color: #64748b; margin-top: 4px;">
                                        Ventilator, Defibrillator, Anesthesia machine. Immediate STAT response.
                                    </div>
                                </label>
                                <label style="display: flex; flex-direction: column; padding: 12px; border: 1px solid #f59e0b; border-radius: 8px; background: rgba(245,158,11,0.04); cursor: pointer;">
                                    <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 0.875rem; color: #d97706;">
                                        <input type="radio" name="breakdown_priority" value="urgent" style="accent-color: #d97706;">
                                        🟠 High Priority
                                    </div>
                                    <div style="font-size: 0.725rem; color: #64748b; margin-top: 4px;">
                                        Bedside monitors, infusion pumps, OR diagnostic units.
                                    </div>
                                </label>
                                <label style="display: flex; flex-direction: column; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; cursor: pointer;">
                                    <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 0.875rem; color: #475569;">
                                        <input type="radio" name="breakdown_priority" value="routine" style="accent-color: #2563eb;">
                                        🟡 Routine Issue
                                    </div>
                                    <div style="font-size: 0.725rem; color: #64748b; margin-top: 4px;">
                                        Degraded keypad, caster wheel, non-critical accessory alert.
                                    </div>
                                </label>
                            </div>
                        </div>

                        <!-- Alarm Description / Breakdown Symptom -->
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 4px; color: #1e293b;">
                                Alarm Code / Breakdown Symptom Observed <span style="color: #ef4444;">*</span>
                            </label>
                            <input type="text" id="biomed-report-symptom" required placeholder="e.g. Continuous High-Pressure Occlusion Alarm / Vaporizer cassette concentration drift" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                        </div>

                        <!-- Immediate Clinical Impact / Safety Actions -->
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 4px; color: #1e293b;">
                                Clinical Impact &amp; Immediate Precautions Taken
                            </label>
                            <textarea id="biomed-report-impact" rows="2" placeholder="e.g. Patient bag-valve mask ventilated and transitioned to standby ventilator. Machine disconnected and red tag attached." class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;"></textarea>
                        </div>

                        <!-- Reporter Details -->
                        <div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                            <div>
                                <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Reporting Staff Name <span style="color: #ef4444;">*</span></label>
                                <input type="text" id="biomed-report-staff-name" required value="Nurse Sarah Jenkins, RN" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                            </div>
                            <div>
                                <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Staff Role / Title</label>
                                <input type="text" id="biomed-report-staff-role" value="ICU Charge Nurse" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                            </div>
                            <div>
                                <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Ward / Room / Suite</label>
                                <input type="text" id="biomed-report-ward" value="Intensive Care Unit - Bed ICU-03" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
                            <div>
                                <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Date &amp; Time Failure Occurred</label>
                                <input type="datetime-local" id="biomed-report-time" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                            </div>
                            <div>
                                <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Assigned Biomedical Engineer</label>
                                <input type="text" id="biomed-report-engineer" value="Engr. David Santos, CBET (Biomedical Lead)" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                            </div>
                        </div>

                        <div style="display: flex; justify-content: flex-end; gap: 10px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                            <button type="button" class="btn btn-secondary eq-modal-close" data-modal="biomed-modal-report-breakdown" style="padding: 8px 18px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer;">Cancel</button>
                            <button type="submit" class="btn" style="padding: 8px 24px; border-radius: 6px; background: #dc2626; color: #fff; border: none; font-weight: 700; cursor: pointer; box-shadow: 0 1px 3px rgba(220,38,38,0.4);">
                                🚨 Submit Ticket &amp; Lock Out Machine
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- ============================================================== -->
            <!-- MODAL: DIAGNOSE & RESOLVE BREAKDOWN (NEW)                      -->
            <!-- ============================================================== -->
            <div id="biomed-modal-resolve-breakdown" class="modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); z-index: 1050; align-items: center; justify-content: center; padding: 20px; overflow-y: auto;">
                <div style="background: var(--bg-card, #ffffff); width: 100%; max-width: 860px; border-radius: 12px; box-shadow: 0 25px 30px -5px rgba(0,0,0,0.3); overflow: hidden; margin: auto; max-height: 94vh; display: flex; flex-direction: column;">
                    <div style="padding: 18px 24px; border-bottom: 1px solid var(--border-color, #e2e8f0); display: flex; justify-content: space-between; align-items: center; background: #f8fafc;">
                        <div>
                            <div id="biomed-res-header-meta" style="font-size: 0.75rem; font-weight: 700; color: #2563eb; text-transform: uppercase;">TKT-2026-XXXX &bull; BREAKDOWN RESOLUTION</div>
                            <h3 id="biomed-res-header-title" style="margin: 2px 0 0 0; font-size: 1.15rem; font-weight: 800;">Root-Cause Diagnostics, Spare Parts &amp; Release</h3>
                        </div>
                        <button type="button" class="eq-modal-close" data-modal="biomed-modal-resolve-breakdown" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted, #94a3b8);">&times;</button>
                    </div>

                    <form id="biomed-form-resolve-breakdown" style="padding: 24px; overflow-y: auto; flex: 1;">
                        <input type="hidden" id="biomed-res-id">

                        <!-- Ticket Clinical Details Card -->
                        <div style="background: #f1f5f9; border-radius: 8px; padding: 14px 18px; margin-bottom: 18px; font-size: 0.8125rem; line-height: 1.5;">
                            <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 10px;">
                                <div><strong>Target Machinery:</strong> <span id="biomed-res-asset-name">--</span></div>
                                <div><strong>Reported By:</strong> <span id="biomed-res-reporter">--</span></div>
                                <div style="grid-column: 1 / -1;"><strong>Symptom:</strong> <span id="biomed-res-symptom" style="color: #b91c1c; font-weight: 600;">--</span></div>
                                <div style="grid-column: 1 / -1;" id="biomed-res-impact-container"><strong>Clinical Impact:</strong> <span id="biomed-res-impact">--</span></div>
                            </div>
                        </div>

                        <!-- Root Cause Diagnostics -->
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 4px; color: #1e293b;">
                                Root-Cause Diagnostic Analysis <span style="color: #ef4444;">*</span>
                            </label>
                            <textarea id="biomed-res-root-cause" required rows="3" placeholder="Detail component failure mechanism, wear tear, pneumatic leak, electrical short, fluid ingress, or sensor drift..." class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;"></textarea>
                        </div>

                        <!-- Corrective Actions Undertaken -->
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 4px; color: #1e293b;">
                                Corrective Actions &amp; Repairs Performed <span style="color: #ef4444;">*</span>
                            </label>
                            <textarea id="biomed-res-actions" required rows="2" placeholder="e.g. Disassembled expiratory valve block, installed new OEM silicone membrane kit, completed 2-hour simulator run..." class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;"></textarea>
                        </div>

                        <!-- Spare Parts Replaced Table -->
                        <div style="margin-bottom: 18px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; background: #f8fafc;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <div style="font-weight: 700; font-size: 0.8125rem; color: #1e293b; text-transform: uppercase;">
                                    Spare Parts &amp; Sub-Assemblies Replaced
                                </div>
                                <button type="button" id="biomed-btn-add-part-row" class="btn btn-secondary" style="font-size: 0.75rem; padding: 4px 10px; border-radius: 4px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer;">
                                    + Add Spare Part
                                </button>
                            </div>
                            <div id="biomed-parts-container" style="display: flex; flex-direction: column; gap: 8px;">
                                <!-- Dynamic Parts Rows -->
                            </div>
                        </div>

                        <!-- Labor, Downtime & Cost -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; margin-bottom: 18px;">
                            <div>
                                <label style="display: block; font-size: 0.75rem; font-weight: 600; margin-bottom: 4px;">Labor Hours</label>
                                <input type="number" step="0.5" id="biomed-res-labor" value="2.0" class="form-control" style="width: 100%; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px;">
                            </div>
                            <div>
                                <label style="display: block; font-size: 0.75rem; font-weight: 600; margin-bottom: 4px;">Downtime (Hours)</label>
                                <input type="number" step="0.5" id="biomed-res-downtime" value="3.0" class="form-control" style="width: 100%; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px;">
                            </div>
                            <div>
                                <label style="display: block; font-size: 0.75rem; font-weight: 600; margin-bottom: 4px;">Total Cost (<span data-currency-symbol>$</span>)</label>
                                <input type="number" step="0.01" id="biomed-res-cost" value="0.00" class="form-control" style="width: 100%; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px;">
                            </div>
                            <div>
                                <label style="display: block; font-size: 0.75rem; font-weight: 600; margin-bottom: 4px;">Lead Engineer</label>
                                <input type="text" id="biomed-res-engineer" value="Engr. David Santos, CBET" class="form-control" style="width: 100%; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px;">
                            </div>
                        </div>

                        <!-- Post-Repair Electrical Safety & Calibration Verification -->
                        <div style="background: rgba(37,99,235,0.03); border: 1px solid rgba(37,99,235,0.2); border-radius: 8px; padding: 14px 16px; margin-bottom: 18px;">
                            <div style="font-weight: 700; font-size: 0.8125rem; text-transform: uppercase; color: #2563eb; margin-bottom: 10px;">
                                Post-Repair Electrical Safety &amp; Calibration (IEC 62353 / NFPA 99)
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px;">
                                <div>
                                    <label style="display: block; font-size: 0.75rem; font-weight: 600; margin-bottom: 4px;">Chassis Leakage (&mu;A)</label>
                                    <input type="number" step="0.1" id="biomed-res-leakage" placeholder="e.g. 42.5 (< 100 uA)" class="form-control" style="width: 100%; padding: 6px 10px; font-size: 0.875rem; border: 1px solid #cbd5e1; border-radius: 6px;">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 0.75rem; font-weight: 600; margin-bottom: 4px;">Ground Bond (&Omega;)</label>
                                    <input type="number" step="0.001" id="biomed-res-resistance" placeholder="e.g. 0.082 (< 0.200)" class="form-control" style="width: 100%; padding: 6px 10px; font-size: 0.875rem; border: 1px solid #cbd5e1; border-radius: 6px;">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 0.75rem; font-weight: 600; margin-bottom: 4px;">Electrical Safety Pass</label>
                                    <select id="biomed-res-elec-pass" class="form-control" style="width: 100%; padding: 6px 10px; font-size: 0.875rem; border: 1px solid #cbd5e1; border-radius: 6px;">
                                        <option value="1">PASS (Meets IEC 62353)</option>
                                        <option value="0">FAIL (Unsafe)</option>
                                    </select>
                                </div>
                                <div>
                                    <label style="display: block; font-size: 0.75rem; font-weight: 600; margin-bottom: 4px;">Functional Calibration</label>
                                    <select id="biomed-res-calib-pass" class="form-control" style="width: 100%; padding: 6px 10px; font-size: 0.875rem; border: 1px solid #cbd5e1; border-radius: 6px;">
                                        <option value="1">PASS (Within Spec)</option>
                                        <option value="0">FAIL (Out of Tolerance)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- Ticket Status & Clinical Release Action -->
                        <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 14px; margin-bottom: 20px;">
                            <div>
                                <label style="display: block; font-size: 0.8125rem; font-weight: 700; margin-bottom: 4px; color: #1e293b;">
                                    Resolution Outcome &amp; Clinical Release <span style="color: #ef4444;">*</span>
                                </label>
                                <select id="biomed-res-status" required class="form-control" style="width: 100%; padding: 8px 12px; font-size: 0.875rem; border: 2px solid #2563eb; border-radius: 6px; font-weight: 600;">
                                    <option value="completed_passed">✅ Certified &amp; Released (Flip to "Operational" - Clear Lockout)</option>
                                    <option value="pending_parts">⏳ Awaiting Spare Parts Delivery (Keep "Under Repair")</option>
                                    <option value="in_progress">🔧 Testing In Progress (Keep "Under Repair")</option>
                                    <option value="failed_quarantined">❌ Failed Inspection (Tag Out as Quarantined)</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Supervisor Certification Signoff</label>
                                <input type="text" id="biomed-res-signoff" value="Engr. David Santos, CBET (Biomedical Lead)" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                            </div>
                        </div>

                        <div style="display: flex; justify-content: flex-end; gap: 10px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                            <button type="button" class="btn btn-secondary eq-modal-close" data-modal="biomed-modal-resolve-breakdown" style="padding: 8px 18px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer;">Cancel</button>
                            <button type="submit" class="btn btn-primary" style="padding: 8px 24px; border-radius: 6px; background: #2563eb; color: #fff; border: none; font-weight: 700; cursor: pointer;">
                                Save &amp; Synchronize Machine Status
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Existing Modals: Asset CRUD, Status, Logs, PM Schedule, PM Checklist, Work Order -->
            <!-- MODAL: REGISTER / EDIT ASSET -->
            <div id="eq-modal-asset" class="modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); z-index: 1000; align-items: center; justify-content: center; padding: 20px; overflow-y: auto;">
                <div style="background: var(--bg-card, #ffffff); width: 100%; max-width: 840px; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2); overflow: hidden; margin: auto; max-height: 90vh; display: flex; flex-direction: column;">
                    <div style="padding: 18px 24px; border-bottom: 1px solid var(--border-color, #e2e8f0); display: flex; justify-content: space-between; align-items: center; background: var(--bg-card-header, #f8fafc);">
                        <h3 id="eq-modal-asset-title" style="margin: 0; font-size: 1.125rem; font-weight: 700;">Register Equipment Asset</h3>
                        <button type="button" class="eq-modal-close" data-modal="eq-modal-asset" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted, #94a3b8);">&times;</button>
                    </div>
                    
                    <form id="eq-form-asset" style="padding: 24px; overflow-y: auto; flex: 1;">
                        <input type="hidden" id="eq-form-id">

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
                            <div>
                                <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Equipment Name <span style="color: #ef4444;">*</span></label>
                                <input type="text" id="eq-form-name" required placeholder="e.g. Hamilton C6 Mechanical Ventilator" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                            </div>
                            <div>
                                <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Asset Tag / Barcode</label>
                                <input type="text" id="eq-form-tag" placeholder="e.g. EQ-VENT-001" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 16px;">
                            <div>
                                <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Category <span style="color: #ef4444;">*</span></label>
                                <select id="eq-form-category" required class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                                    <option value="Life Support">Life Support</option>
                                    <option value="Monitoring" selected>Monitoring</option>
                                    <option value="Diagnostic">Diagnostic</option>
                                    <option value="Surgical">Surgical</option>
                                    <option value="Laboratory">Laboratory</option>
                                    <option value="General Facility">General Facility</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Criticality Level <span style="color: #ef4444;">*</span></label>
                                <select id="eq-form-criticality" required class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                                    <option value="Life Critical">Life Critical</option>
                                    <option value="High">High</option>
                                    <option value="Medium" selected>Medium</option>
                                    <option value="Low">Low</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Manufacturer</label>
                                <input type="text" id="eq-form-mfg" placeholder="e.g. Philips Healthcare" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px;">
                            <div>
                                <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Model Number</label>
                                <input type="text" id="eq-form-model" placeholder="e.g. MX800" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                            </div>
                            <div>
                                <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Serial Number</label>
                                <input type="text" id="eq-form-sn" placeholder="e.g. SN-894721" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
                            <div>
                                <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Initial Status <span style="color: #ef4444;">*</span></label>
                                <select id="eq-form-status" required class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                                    <option value="Operational">Operational</option>
                                    <option value="Needs Calibration">Needs Calibration</option>
                                    <option value="Under Repair">Under Repair</option>
                                    <option value="Decommissioned">Decommissioned</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Status Reason</label>
                                <input type="text" id="eq-form-status-reason" placeholder="e.g. Passed initial inspection" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                            </div>
                        </div>

                        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                            <button type="button" class="btn btn-secondary eq-modal-close" data-modal="eq-modal-asset" style="padding: 8px 16px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer;">Cancel</button>
                            <button type="submit" class="btn btn-primary" style="padding: 8px 20px; border-radius: 6px; background: #2563eb; color: #fff; border: none; font-weight: 600; cursor: pointer;">Save Asset</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- MODAL: CONFIGURE PM SCHEDULE -->
            <div id="biomed-modal-schedule" class="modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); z-index: 1000; align-items: center; justify-content: center; padding: 20px; overflow-y: auto;">
                <div style="background: var(--bg-card, #ffffff); width: 100%; max-width: 880px; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); overflow: hidden; margin: auto; max-height: 92vh; display: flex; flex-direction: column;">
                    <div style="padding: 18px 24px; border-bottom: 1px solid var(--border-color, #e2e8f0); display: flex; justify-content: space-between; align-items: center; background: var(--bg-card-header, #f8fafc);">
                        <div>
                            <h3 id="biomed-modal-schedule-title" style="margin: 0; font-size: 1.125rem; font-weight: 700;">Configure Preventive Maintenance (PM) Schedule</h3>
                            <div style="font-size: 0.8125rem; color: var(--text-muted, #64748b); margin-top: 2px;">Automated recurring servicing intervals &amp; itemized task checklists</div>
                        </div>
                        <button type="button" class="eq-modal-close" data-modal="biomed-modal-schedule" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted, #94a3b8);">&times;</button>
                    </div>

                    <form id="biomed-form-schedule" style="padding: 24px; overflow-y: auto; flex: 1;">
                        <input type="hidden" id="biomed-sch-id">
                        <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 14px; margin-bottom: 16px;">
                            <div>
                                <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Target Machinery Asset <span style="color: #ef4444;">*</span></label>
                                <select id="biomed-sch-asset-id" required class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                                    <option value="">Select machinery asset...</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Criticality Tier <span style="color: #ef4444;">*</span></label>
                                <select id="biomed-sch-tier" required class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                                    <option value="life_critical" selected>Life Critical (STAT Maintenance)</option>
                                    <option value="high">High Criticality</option>
                                    <option value="medium">Medium Criticality</option>
                                    <option value="low">Low Criticality</option>
                                </select>
                            </div>
                        </div>

                        <div style="margin-bottom: 16px;">
                            <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">PM Servicing Title <span style="color: #ef4444;">*</span></label>
                            <input type="text" id="biomed-sch-title" required placeholder="e.g. Hamilton C6 Ventilator Semi-Annual Calibration" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 16px;">
                            <div>
                                <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Maintenance Type <span style="color: #ef4444;">*</span></label>
                                <select id="biomed-sch-type" required class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                                    <option value="preventive_maintenance" selected>Preventive Maintenance</option>
                                    <option value="electrical_safety_inspection">Electrical Safety Inspection</option>
                                    <option value="calibration_certification">Calibration Certification</option>
                                    <option value="software_firmware_update">Software Update</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Frequency <span style="color: #ef4444;">*</span></label>
                                <select id="biomed-sch-frequency" required class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                                    <option value="monthly">Monthly (1 Month)</option>
                                    <option value="bi_monthly">Bi-Monthly (2 Months)</option>
                                    <option value="quarterly">Quarterly (3 Months)</option>
                                    <option value="semi_annual" selected>Semi-Annual (6 Months)</option>
                                    <option value="annual">Annual (12 Months)</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Next Due Date <span style="color: #ef4444;">*</span></label>
                                <input type="date" id="biomed-sch-next-due" required class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                            </div>
                        </div>

                        <!-- Task Checklist Editor -->
                        <div style="margin-bottom: 16px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; background: #f8fafc;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <div style="font-weight: 600; font-size: 0.875rem; color: #1e293b;">Itemized PM Task Checklist &amp; Tolerances</div>
                                <button type="button" id="biomed-btn-add-task-row" class="btn btn-secondary" style="font-size: 0.75rem; padding: 4px 10px; border-radius: 4px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer;">+ Add Step</button>
                            </div>
                            <div id="biomed-checklist-container" style="display: flex; flex-direction: column; gap: 8px;"></div>
                        </div>

                        <div style="display: flex; justify-content: flex-end; gap: 10px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                            <button type="button" class="btn btn-secondary eq-modal-close" data-modal="biomed-modal-schedule" style="padding: 8px 16px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer;">Cancel</button>
                            <button type="submit" class="btn btn-primary" style="padding: 8px 20px; border-radius: 6px; background: #2563eb; color: #fff; border: none; font-weight: 600; cursor: pointer;">Save PM Schedule</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- MODAL: TASK CHECKLIST INSPECTOR -->
            <div id="biomed-modal-checklist" class="modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); z-index: 1000; align-items: center; justify-content: center; padding: 20px; overflow-y: auto;">
                <div style="background: var(--bg-card, #ffffff); width: 100%; max-width: 780px; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2); overflow: hidden; margin: auto; max-height: 90vh; display: flex; flex-direction: column;">
                    <div style="padding: 18px 24px; border-bottom: 1px solid var(--border-color, #e2e8f0); display: flex; justify-content: space-between; align-items: center; background: var(--bg-card-header, #f8fafc);">
                        <div>
                            <div id="biomed-checklist-sch-code" style="font-size: 0.75rem; font-weight: 700; color: #2563eb; text-transform: uppercase;"></div>
                            <h3 id="biomed-checklist-title" style="margin: 2px 0 0 0; font-size: 1.125rem; font-weight: 700;">PM Inspection Checklist &amp; Safety Standards</h3>
                        </div>
                        <button type="button" class="eq-modal-close" data-modal="biomed-modal-checklist" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted, #94a3b8);">&times;</button>
                    </div>

                    <div style="padding: 24px; overflow-y: auto; flex: 1;">
                        <div style="background: #f1f5f9; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 0.8125rem;">
                            <div><strong>Asset:</strong> <span id="biomed-checklist-asset">--</span></div>
                            <div><strong>Location:</strong> <span id="biomed-checklist-location">--</span></div>
                            <div><strong>Frequency:</strong> <span id="biomed-checklist-freq">--</span></div>
                            <div><strong>Safety Reference:</strong> <span id="biomed-checklist-standard">--</span></div>
                        </div>

                        <table style="width: 100%; border-collapse: collapse; font-size: 0.8125rem; text-align: left; border: 1px solid #e2e8f0; border-radius: 6px;">
                            <thead>
                                <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-weight: 600;">
                                    <th style="padding: 10px 12px; width: 40px;">#</th>
                                    <th style="padding: 10px 12px;">Task Description</th>
                                    <th style="padding: 10px 12px;">Standard / Acceptable Tolerance</th>
                                    <th style="padding: 10px 12px; width: 90px; text-align: center;">Criticality</th>
                                </tr>
                            </thead>
                            <tbody id="biomed-checklist-table-body">
                                <tr>
                                    <td colspan="4" style="padding: 24px; text-align: center; color: #94a3b8;">No tasks configured.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div style="padding: 14px 24px; border-top: 1px solid var(--border-color, #e2e8f0); display: flex; justify-content: space-between; align-items: center; background: var(--bg-card-footer, #f8fafc);">
                        <button type="button" class="btn btn-secondary eq-modal-close" data-modal="biomed-modal-checklist" style="padding: 8px 16px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer;">Close</button>
                        <button type="button" id="biomed-btn-spawn-wo-from-modal" class="btn btn-primary" style="padding: 8px 20px; border-radius: 6px; background: #2563eb; color: #fff; border: none; font-weight: 600; cursor: pointer;">
                            Dispatch Work Order Now
                        </button>
                    </div>
                </div>
            </div>

            <!-- MODAL: QUICK STATUS TRANSITION -->
            <div id="eq-modal-status" class="modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); z-index: 1000; align-items: center; justify-content: center; padding: 20px;">
                <div style="background: var(--bg-card, #ffffff); width: 100%; max-width: 480px; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2); overflow: hidden; margin: auto;">
                    <div style="padding: 18px 24px; border-bottom: 1px solid var(--border-color, #e2e8f0); display: flex; justify-content: space-between; align-items: center; background: var(--bg-card-header, #f8fafc);">
                        <h3 style="margin: 0; font-size: 1.125rem; font-weight: 700;">Update Asset Status</h3>
                        <button type="button" class="eq-modal-close" data-modal="eq-modal-status" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted, #94a3b8);">&times;</button>
                    </div>
                    <form id="eq-form-quick-status" style="padding: 24px;">
                        <input type="hidden" id="eq-status-asset-id">
                        <div style="margin-bottom: 16px;">
                            <div id="eq-status-asset-name" style="font-weight: 600; font-size: 0.9375rem; color: #2563eb; margin-bottom: 4px;"></div>
                            <div id="eq-status-asset-tag" style="font-size: 0.8125rem; color: var(--text-muted, #64748b);"></div>
                        </div>
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 6px;">New Status <span style="color: #ef4444;">*</span></label>
                            <select id="eq-status-select" required class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                                <option value="Operational">Operational</option>
                                <option value="Needs Calibration">Needs Calibration</option>
                                <option value="Under Repair">Under Repair</option>
                                <option value="Decommissioned">Decommissioned</option>
                            </select>
                        </div>
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 6px;">Reason / Clinical Remarks</label>
                            <textarea id="eq-status-reason" rows="3" placeholder="Provide reason for status change..." class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;"></textarea>
                        </div>
                        <div style="display: flex; justify-content: flex-end; gap: 10px;">
                            <button type="button" class="btn btn-secondary eq-modal-close" data-modal="eq-modal-status" style="padding: 8px 16px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer;">Cancel</button>
                            <button type="submit" class="btn btn-primary" style="padding: 8px 20px; border-radius: 6px; background: #2563eb; color: #fff; border: none; font-weight: 600; cursor: pointer;">Update Status</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- MODAL: MAINTENANCE HISTORY & LOGGER -->
            <div id="eq-modal-logs" class="modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); z-index: 1000; align-items: center; justify-content: center; padding: 20px; overflow-y: auto;">
                <div style="background: var(--bg-card, #ffffff); width: 100%; max-width: 900px; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2); overflow: hidden; margin: auto; max-height: 92vh; display: flex; flex-direction: column;">
                    <div style="padding: 18px 24px; border-bottom: 1px solid var(--border-color, #e2e8f0); display: flex; justify-content: space-between; align-items: center; background: var(--bg-card-header, #f8fafc);">
                        <div>
                            <h3 style="margin: 0; font-size: 1.125rem; font-weight: 700;">Biomedical Maintenance &amp; Calibration Log</h3>
                            <div id="eq-logs-asset-header" style="font-size: 0.8125rem; color: var(--text-muted, #64748b); margin-top: 2px;"></div>
                        </div>
                        <button type="button" class="eq-modal-close" data-modal="eq-modal-logs" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted, #94a3b8);">&times;</button>
                    </div>

                    <div style="padding: 24px; overflow-y: auto; flex: 1;">
                        <h4 style="margin: 0 0 12px 0; font-size: 0.9375rem; font-weight: 700; color: #1e293b;">Maintenance History</h4>
                        <div style="border: 1px solid var(--border-color, #e2e8f0); border-radius: 8px; overflow: hidden;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 0.8125rem; text-align: left;">
                                <thead>
                                    <tr style="background: var(--bg-table-header, #f8fafc); border-bottom: 1px solid var(--border-color, #e2e8f0); color: var(--text-muted, #475569); font-weight: 600;">
                                        <th style="padding: 10px 14px;">Date</th>
                                        <th style="padding: 10px 14px;">Event Type</th>
                                        <th style="padding: 10px 14px;">Result</th>
                                        <th style="padding: 10px 14px;">Technician</th>
                                        <th style="padding: 10px 14px;">Findings</th>
                                        <th style="padding: 10px 14px; text-align: right;">Cost</th>
                                    </tr>
                                </thead>
                                <tbody id="eq-logs-table-body">
                                    <tr>
                                        <td colspan="6" style="padding: 24px; text-align: center; color: var(--text-muted, #94a3b8);">No maintenance history records found.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div style="padding: 14px 24px; border-top: 1px solid var(--border-color, #e2e8f0); display: flex; justify-content: flex-end; background: var(--bg-card-footer, #f8fafc);">
                        <button type="button" class="btn btn-secondary eq-modal-close" data-modal="eq-modal-logs" style="padding: 8px 18px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer;">Close</button>
                    </div>
                </div>
            </div>

            <style>
                @keyframes eq-spin { to { transform: rotate(360deg); } }
                @keyframes eq-pulse {
                    0% { transform: scale(0.95); opacity: 0.7; }
                    50% { transform: scale(1.15); opacity: 1; }
                    100% { transform: scale(0.95); opacity: 0.7; }
                }
                .biomed-nav-tab.active-tab {
                    color: #2563eb !important;
                    border-bottom: 2px solid #2563eb !important;
                }
                .eq-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 3px 8px;
                    border-radius: 9999px;
                    font-size: 0.75rem;
                    font-weight: 600;
                }
                .eq-badge-operational { background: rgba(22, 163, 74, 0.12); color: #16a34a; }
                .eq-badge-calibration { background: rgba(217, 119, 6, 0.15); color: #d97706; }
                .eq-badge-repair { background: rgba(220, 38, 38, 0.12); color: #dc2626; border: 1px solid rgba(220,38,38,0.3); }
                .eq-badge-decommissioned { background: rgba(100, 116, 139, 0.15); color: #64748b; }
                .eq-criticality-life { background: rgba(220, 38, 38, 0.12); color: #dc2626; border: 1px solid rgba(220, 38, 38, 0.25); }
                .eq-criticality-high { background: rgba(234, 88, 12, 0.12); color: #ea580c; }
                .eq-criticality-medium { background: rgba(37, 99, 235, 0.12); color: #2563eb; }
                .eq-criticality-low { background: rgba(100, 116, 139, 0.12); color: #64748b; }
            </style>
        </div>
    `;
}
