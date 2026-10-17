/**
 * Equipment Assets & Biomedical Engineering Management View
 */
export function EquipmentAssetsView(user = {}) {
    return `
        <div class="equipment-assets-container" style="padding: 24px; max-width: 1600px; margin: 0 auto; color: var(--text-primary, #0f172a);">
            <!-- Header Section -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
                <div>
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                        <span style="display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 8px; background: rgba(37, 99, 235, 0.1); color: #2563eb;">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                                <line x1="8" y1="21" x2="16" y2="21"></line>
                                <line x1="12" y1="17" x2="12" y2="21"></line>
                            </svg>
                        </span>
                        <h1 style="margin: 0; font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em;">Biomedical & Equipment Assets</h1>
                    </div>
                    <p style="margin: 0; font-size: 0.875rem; color: var(--text-muted, #64748b);">
                        Machinery tracking, calibration safety schedules, clinical unit mapping, and maintenance lifecycles
                    </p>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <button id="eq-btn-refresh" class="btn btn-secondary" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; font-size: 0.875rem; border-radius: 6px; border: 1px solid var(--border-color, #e2e8f0); background: var(--bg-card, #ffffff); cursor: pointer;">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <polyline points="1 20 1 14 7 14"></polyline>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                        </svg>
                        Refresh
                    </button>
                    <button id="eq-btn-add" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; font-size: 0.875rem; font-weight: 600; border-radius: 6px; background: #2563eb; color: #ffffff; border: none; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Register New Asset
                    </button>
                </div>
            </div>

            <!-- KPI Summary Cards -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 24px;">
                <!-- Total Assets -->
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

                <!-- Operational -->
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

                <!-- Calibration Warning / Overdue -->
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

                <!-- Out of Service (Repair / Decommissioned) -->
                <div class="card" style="padding: 18px 20px; border-radius: 10px; background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0); box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 0.8125rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted, #64748b);">Out of Service</span>
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
                    <!-- Search Field -->
                    <div style="position: relative;">
                        <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted, #94a3b8); pointer-events: none;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </span>
                        <input type="text" id="eq-filter-search" placeholder="Search tag, name, serial, model, manufacturer..." class="form-control" style="width: 100%; padding: 8px 12px 8px 36px; font-size: 0.875rem; border-radius: 6px; border: 1px solid var(--border-color, #cbd5e1); background: var(--bg-main, #ffffff); color: var(--text-primary, #0f172a);">
                    </div>

                    <!-- Category Selector -->
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

                    <!-- Status Selector -->
                    <div>
                        <select id="eq-filter-status" class="form-control" style="width: 100%; padding: 8px 12px; font-size: 0.875rem; border-radius: 6px; border: 1px solid var(--border-color, #cbd5e1); background: var(--bg-main, #ffffff); color: var(--text-primary, #0f172a);">
                            <option value="">All Statuses</option>
                            <option value="Operational">Operational</option>
                            <option value="Needs Calibration">Needs Calibration</option>
                            <option value="Under Repair">Under Repair</option>
                            <option value="Decommissioned">Decommissioned</option>
                        </select>
                    </div>

                    <!-- Department Selector -->
                    <div>
                        <select id="eq-filter-department" class="form-control" style="width: 100%; padding: 8px 12px; font-size: 0.875rem; border-radius: 6px; border: 1px solid var(--border-color, #cbd5e1); background: var(--bg-main, #ffffff); color: var(--text-primary, #0f172a);">
                            <option value="">All Departments</option>
                            <!-- Dynamically loaded -->
                        </select>
                    </div>

                    <!-- Calibration Urgency Selector -->
                    <div>
                        <select id="eq-filter-calibration" class="form-control" style="width: 100%; padding: 8px 12px; font-size: 0.875rem; border-radius: 6px; border: 1px solid var(--border-color, #cbd5e1); background: var(--bg-main, #ffffff); color: var(--text-primary, #0f172a);">
                            <option value="">All Calibration Dates</option>
                            <option value="overdue">Calibration Overdue</option>
                            <option value="upcoming_30">Due in 30 Days</option>
                            <option value="all_due">All Due Soon / Overdue</option>
                        </select>
                    </div>

                    <!-- Reset Filters Button -->
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
                                <th style="padding: 12px 16px;">Equipment Name & Model</th>
                                <th style="padding: 12px 16px;">Category & Criticality</th>
                                <th style="padding: 12px 16px;">Assigned Location</th>
                                <th style="padding: 12px 16px;">Calibration Schedule</th>
                                <th style="padding: 12px 16px;">Status</th>
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

                <!-- Footer Summary Bar -->
                <div style="padding: 12px 20px; border-top: 1px solid var(--border-color, #e2e8f0); background: var(--bg-table-footer, #f8fafc); display: flex; justify-content: space-between; align-items: center; font-size: 0.8125rem; color: var(--text-muted, #64748b);">
                    <div id="eq-table-count">Showing 0 equipment records</div>
                    <div>Compliant with Biomedical Engineering &amp; Clinical Safety Standards</div>
                </div>
            </div>
        </div>

        <!-- MODAL: Register / Edit Asset -->
        <div id="eq-modal-asset" class="modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); z-index: 1000; align-items: center; justify-content: center; padding: 20px; overflow-y: auto;">
            <div style="background: var(--bg-card, #ffffff); width: 100%; max-width: 840px; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2); overflow: hidden; margin: auto; max-height: 90vh; display: flex; flex-direction: column;">
                <div style="padding: 18px 24px; border-bottom: 1px solid var(--border-color, #e2e8f0); display: flex; justify-content: space-between; align-items: center; background: var(--bg-card-header, #f8fafc);">
                    <h3 id="eq-modal-asset-title" style="margin: 0; font-size: 1.125rem; font-weight: 700;">Register Equipment Asset</h3>
                    <button type="button" class="eq-modal-close" data-modal="eq-modal-asset" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted, #94a3b8);">&times;</button>
                </div>
                
                <form id="eq-form-asset" style="padding: 24px; overflow-y: auto; flex: 1;">
                    <input type="hidden" id="eq-form-id">

                    <!-- Section: Core Identity -->
                    <div style="font-weight: 600; font-size: 0.8125rem; text-transform: uppercase; letter-spacing: 0.05em; color: #2563eb; margin-bottom: 12px; border-bottom: 1px solid rgba(37,99,235,0.15); padding-bottom: 4px;">
                        1. Identification & Classification
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
                        <div>
                            <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Equipment Name <span style="color: #ef4444;">*</span></label>
                            <input type="text" id="eq-form-name" required placeholder="e.g. Hamilton C6 Mechanical Ventilator" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Asset Tag / Barcode (Leave blank to auto-generate)</label>
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

                    <!-- Section: Location Mapping -->
                    <div style="font-weight: 600; font-size: 0.8125rem; text-transform: uppercase; letter-spacing: 0.05em; color: #2563eb; margin-bottom: 12px; border-bottom: 1px solid rgba(37,99,235,0.15); padding-bottom: 4px;">
                        2. Location & Department Assignment
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 16px;">
                        <div>
                            <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Facility</label>
                            <select id="eq-form-facility" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                                <option value="">Select Facility...</option>
                            </select>
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Department</label>
                            <select id="eq-form-department" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                                <option value="">Select Department...</option>
                            </select>
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Building</label>
                            <select id="eq-form-building" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                                <option value="">Select Building...</option>
                            </select>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px;">
                        <div>
                            <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Ward</label>
                            <select id="eq-form-ward" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                                <option value="">Select Ward...</option>
                            </select>
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Room</label>
                            <select id="eq-form-room" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                                <option value="">Select Room...</option>
                            </select>
                        </div>
                    </div>

                    <!-- Section: Lifecycle & Calibration -->
                    <div style="font-weight: 600; font-size: 0.8125rem; text-transform: uppercase; letter-spacing: 0.05em; color: #2563eb; margin-bottom: 12px; border-bottom: 1px solid rgba(37,99,235,0.15); padding-bottom: 4px;">
                        3. Lifecycle, Warranty & Calibration Dates
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 16px;">
                        <div>
                            <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Purchase Date</label>
                            <input type="date" id="eq-form-purchase-date" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Purchase Cost ($)</label>
                            <input type="number" step="0.01" min="0" id="eq-form-purchase-cost" placeholder="0.00" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Warranty Expiration</label>
                            <input type="date" id="eq-form-warranty-date" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
                        <div>
                            <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Last Calibration Date</label>
                            <input type="date" id="eq-form-last-calibration" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Next Calibration Due</label>
                            <input type="date" id="eq-form-next-calibration" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
                        </div>
                    </div>

                    <!-- Section: Maintenance Status & Clinical Notes -->
                    <div style="font-weight: 600; font-size: 0.8125rem; text-transform: uppercase; letter-spacing: 0.05em; color: #2563eb; margin-bottom: 12px; border-bottom: 1px solid rgba(37,99,235,0.15); padding-bottom: 4px;">
                        4. Status & Maintenance Notes
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

                    <div>
                        <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Biomedical Notes & Maintenance Instructions</label>
                        <textarea id="eq-form-notes" rows="2" placeholder="Special handling, power requirements, sterilization guidelines..." class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;"></textarea>
                    </div>

                    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-color, #e2e8f0); display: flex; justify-content: flex-end; gap: 10px;">
                        <button type="button" class="btn btn-secondary eq-modal-close" data-modal="eq-modal-asset" style="padding: 8px 16px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer;">Cancel</button>
                        <button type="submit" id="eq-btn-save-asset" class="btn btn-primary" style="padding: 8px 20px; border-radius: 6px; background: #2563eb; color: #fff; border: none; font-weight: 600; cursor: pointer;">Save Asset</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- MODAL: Quick Status Transition -->
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
                        <textarea id="eq-status-reason" rows="3" placeholder="Provide reason for status change (e.g., Sensor error during surgery, routine recalibration, spare parts ordered...)" class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;"></textarea>
                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 10px;">
                        <button type="button" class="btn btn-secondary eq-modal-close" data-modal="eq-modal-status" style="padding: 8px 16px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer;">Cancel</button>
                        <button type="submit" class="btn btn-primary" style="padding: 8px 20px; border-radius: 6px; background: #2563eb; color: #fff; border: none; font-weight: 600; cursor: pointer;">Update Status</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- MODAL: Calibration & Maintenance History & Logger -->
        <div id="eq-modal-logs" class="modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); z-index: 1000; align-items: center; justify-content: center; padding: 20px; overflow-y: auto;">
            <div style="background: var(--bg-card, #ffffff); width: 100%; max-width: 900px; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2); overflow: hidden; margin: auto; max-height: 92vh; display: flex; flex-direction: column;">
                <div style="padding: 18px 24px; border-bottom: 1px solid var(--border-color, #e2e8f0); display: flex; justify-content: space-between; align-items: center; background: var(--bg-card-header, #f8fafc);">
                    <div>
                        <h3 style="margin: 0; font-size: 1.125rem; font-weight: 700;">Biomedical Maintenance & Calibration Log</h3>
                        <div id="eq-logs-asset-header" style="font-size: 0.8125rem; color: var(--text-muted, #64748b); margin-top: 2px;"></div>
                    </div>
                    <button type="button" class="eq-modal-close" data-modal="eq-modal-logs" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted, #94a3b8);">&times;</button>
                </div>

                <div style="padding: 24px; overflow-y: auto; flex: 1;">
                    <!-- Record Log Form Toggle -->
                    <div style="margin-bottom: 24px; padding: 18px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0;">
                        <h4 style="margin: 0 0 12px 0; font-size: 0.9375rem; font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 6px;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            Record New Maintenance / Calibration Event
                        </h4>
                        <form id="eq-form-record-log">
                            <input type="hidden" id="eq-log-equipment-id">
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                                <div>
                                    <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Service Type <span style="color: #ef4444;">*</span></label>
                                    <select id="eq-log-type" required class="form-control" style="width: 100%; padding: 6px 10px; font-size: 0.875rem; border: 1px solid #cbd5e1; border-radius: 6px;">
                                        <option value="Calibration" selected>Calibration</option>
                                        <option value="Preventive Maintenance">Preventive Maintenance</option>
                                        <option value="Repair">Repair</option>
                                        <option value="Safety Inspection">Safety Inspection</option>
                                        <option value="Electrical Test">Electrical Safety Test</option>
                                    </select>
                                </div>
                                <div>
                                    <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Performed Date <span style="color: #ef4444;">*</span></label>
                                    <input type="date" id="eq-log-date" required class="form-control" style="width: 100%; padding: 6px 10px; font-size: 0.875rem; border: 1px solid #cbd5e1; border-radius: 6px;">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Result Status <span style="color: #ef4444;">*</span></label>
                                    <select id="eq-log-result" required class="form-control" style="width: 100%; padding: 6px 10px; font-size: 0.875rem; border: 1px solid #cbd5e1; border-radius: 6px;">
                                        <option value="Pass" selected>Pass</option>
                                        <option value="Pass with Recommendation">Pass with Recommendation</option>
                                        <option value="Fail">Fail</option>
                                        <option value="Incomplete">Incomplete</option>
                                    </select>
                                </div>
                            </div>

                            <div style="display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                                <div>
                                    <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Performed By (Technician / Vendor)</label>
                                    <input type="text" id="eq-log-performed-by" placeholder="e.g. Biomedical Tech / Draeger Service" class="form-control" style="width: 100%; padding: 6px 10px; font-size: 0.875rem; border: 1px solid #cbd5e1; border-radius: 6px;">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Next Calibration / Due Date</label>
                                    <input type="date" id="eq-log-next-due" class="form-control" style="width: 100%; padding: 6px 10px; font-size: 0.875rem; border: 1px solid #cbd5e1; border-radius: 6px;">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Service Cost ($)</label>
                                    <input type="number" step="0.01" min="0" id="eq-log-cost" placeholder="0.00" class="form-control" style="width: 100%; padding: 6px 10px; font-size: 0.875rem; border: 1px solid #cbd5e1; border-radius: 6px;">
                                </div>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                                <div>
                                    <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Findings / Measured Values</label>
                                    <textarea id="eq-log-findings" rows="2" placeholder="Voltage test: 120V, Flow rate accuracy +/- 2%..." class="form-control" style="width: 100%; padding: 6px 10px; font-size: 0.875rem; border: 1px solid #cbd5e1; border-radius: 6px;"></textarea>
                                </div>
                                <div>
                                    <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 4px;">Actions Taken / Parts Replaced</label>
                                    <textarea id="eq-log-actions" rows="2" placeholder="O2 sensor replaced, pressure transducer calibrated..." class="form-control" style="width: 100%; padding: 6px 10px; font-size: 0.875rem; border: 1px solid #cbd5e1; border-radius: 6px;"></textarea>
                                </div>
                            </div>

                            <div style="display: flex; justify-content: flex-end;">
                                <button type="submit" class="btn btn-primary" style="padding: 7px 18px; border-radius: 6px; background: #2563eb; color: #fff; border: none; font-weight: 600; font-size: 0.875rem; cursor: pointer;">
                                    Save Service Log
                                </button>
                            </div>
                        </form>
                    </div>

                    <!-- History Timeline / Table -->
                    <h4 style="margin: 0 0 12px 0; font-size: 0.9375rem; font-weight: 700; color: #1e293b;">
                        Maintenance History & Audit Trail
                    </h4>
                    <div style="border: 1px solid var(--border-color, #e2e8f0); border-radius: 8px; overflow: hidden;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.8125rem; text-align: left;">
                            <thead>
                                <tr style="background: var(--bg-table-header, #f8fafc); border-bottom: 1px solid var(--border-color, #e2e8f0); color: var(--text-muted, #475569); font-weight: 600;">
                                    <th style="padding: 10px 14px;">Date</th>
                                    <th style="padding: 10px 14px;">Event Type</th>
                                    <th style="padding: 10px 14px;">Result</th>
                                    <th style="padding: 10px 14px;">Technician</th>
                                    <th style="padding: 10px 14px;">Findings / Notes</th>
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
            .eq-badge-repair { background: rgba(147, 51, 234, 0.12); color: #9333ea; }
            .eq-badge-decommissioned { background: rgba(100, 116, 139, 0.15); color: #64748b; }
            .eq-criticality-life { background: rgba(220, 38, 38, 0.12); color: #dc2626; border: 1px solid rgba(220, 38, 38, 0.25); }
            .eq-criticality-high { background: rgba(234, 88, 12, 0.12); color: #ea580c; }
            .eq-criticality-medium { background: rgba(37, 99, 235, 0.12); color: #2563eb; }
            .eq-criticality-low { background: rgba(100, 116, 139, 0.12); color: #64748b; }
        </style>
    `;
}
