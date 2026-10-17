/**
 * Visual Department Organizational Mapping View
 */
export function DepartmentOrgView(user = {}) {
    return `
        <div class="department-org-container" style="padding: 24px; max-width: 1600px; margin: 0 auto; color: var(--text-primary, #0f172a);">
            <!-- Header Section -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
                <div>
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                        <span style="display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 8px; background: rgba(99, 102, 241, 0.1); color: #6366f1;">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="5" r="3"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <path d="M5 12h14"></path>
                                <line x1="5" y1="12" x2="5" y2="15"></line>
                                <line x1="19" y1="12" x2="19" y2="15"></line>
                                <circle cx="5" cy="18" r="3"></circle>
                                <circle cx="19" cy="18" r="3"></circle>
                            </svg>
                        </span>
                        <h1 style="margin: 0; font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em;">Department Organizational Mapping</h1>
                    </div>
                    <p style="margin: 0; font-size: 0.875rem; color: var(--text-muted, #64748b);">
                        Interactive visual hierarchy: <b>Facility &rarr; Clinical Department &rarr; Head of Department (Doctor) &rarr; Assigned Wards &amp; Rooms &rarr; Medical Staff Roster</b>
                    </p>
                </div>

                <!-- Right Header Actions -->
                <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <label for="do-select-facility" style="font-size: 0.8125rem; font-weight: 600; color: var(--text-muted, #475569); white-space: nowrap;">Facility:</label>
                        <select id="do-select-facility" class="form-control" style="min-width: 200px; padding: 7px 12px; font-size: 0.875rem; font-weight: 600; border-radius: 6px; border: 1px solid var(--border-color, #cbd5e1); background: var(--bg-card, #ffffff); color: var(--text-primary, #0f172a);">
                            <option value="">Loading facilities...</option>
                        </select>
                    </div>

                    <!-- View Switcher -->
                    <div style="display: flex; border: 1px solid var(--border-color, #cbd5e1); border-radius: 6px; overflow: hidden; background: #fff;">
                        <button type="button" id="do-btn-mode-tree" class="do-mode-btn active" style="padding: 7px 12px; font-size: 0.8125rem; font-weight: 600; border: none; background: #6366f1; color: #fff; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 10H3"></path><path d="M21 6H3"></path><path d="M21 14H3"></path><path d="M17 18H3"></path></svg>
                            Hierarchy Tree
                        </button>
                        <button type="button" id="do-btn-mode-cards" class="do-mode-btn" style="padding: 7px 12px; font-size: 0.8125rem; font-weight: 600; border: none; background: #fff; color: #64748b; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                            Directory Grid
                        </button>
                    </div>

                    <button id="do-btn-refresh" class="btn btn-secondary" style="display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; font-size: 0.875rem; border-radius: 6px; border: 1px solid var(--border-color, #cbd5e1); background: var(--bg-card, #ffffff); cursor: pointer;" title="Refresh Directory">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                        Refresh
                    </button>
                </div>
            </div>

            <!-- KPI Summary Cards -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 24px;">
                <div class="card" style="padding: 16px 18px; border-radius: 10px; background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0); box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                    <div style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted, #64748b); margin-bottom: 4px;">Departments</div>
                    <div style="display: flex; align-items: baseline; gap: 8px;">
                        <span id="do-kpi-depts" style="font-size: 1.625rem; font-weight: 700; color: #0f172a;">--</span>
                        <span id="do-kpi-heads" style="font-size: 0.75rem; color: #16a34a; font-weight: 600;">-- Chairs Appointed</span>
                    </div>
                </div>

                <div class="card" style="padding: 16px 18px; border-radius: 10px; background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0); box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                    <div style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted, #64748b); margin-bottom: 4px;">Inpatient Wards</div>
                    <div style="display: flex; align-items: baseline; gap: 8px;">
                        <span id="do-kpi-wards" style="font-size: 1.625rem; font-weight: 700; color: #6366f1;">--</span>
                        <span id="do-kpi-beds" style="font-size: 0.75rem; color: var(--text-muted, #64748b); font-weight: 600;">-- Total Beds</span>
                    </div>
                </div>

                <div class="card" style="padding: 16px 18px; border-radius: 10px; background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0); box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                    <div style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted, #64748b); margin-bottom: 4px;">Medical Doctors</div>
                    <div style="display: flex; align-items: baseline; gap: 8px;">
                        <span id="do-kpi-doctors" style="font-size: 1.625rem; font-weight: 700; color: #0284c7;">--</span>
                        <span style="font-size: 0.75rem; color: #0284c7; font-weight: 600;">Specialists &amp; Chiefs</span>
                    </div>
                </div>

                <div class="card" style="padding: 16px 18px; border-radius: 10px; background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0); box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                    <div style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted, #64748b); margin-bottom: 4px;">Nursing &amp; Care Staff</div>
                    <div style="display: flex; align-items: baseline; gap: 8px;">
                        <span id="do-kpi-nurses" style="font-size: 1.625rem; font-weight: 700; color: #d97706;">--</span>
                        <span style="font-size: 0.75rem; color: var(--text-muted, #64748b); font-weight: 600;">RNs &amp; Charge Nurses</span>
                    </div>
                </div>
            </div>

            <!-- Filter & Search Toolbar -->
            <div class="card" style="padding: 14px 20px; border-radius: 10px; background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0); margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                <!-- Type Badges -->
                <div id="do-type-filters" style="display: flex; gap: 6px; flex-wrap: wrap;">
                    <button type="button" class="do-type-pill active" data-type="" style="padding: 5px 12px; font-size: 0.8125rem; border-radius: 20px; border: 1px solid #6366f1; background: #6366f1; color: #fff; cursor: pointer; font-weight: 600;">All Types</button>
                    <button type="button" class="do-type-pill" data-type="Clinical" style="padding: 5px 12px; font-size: 0.8125rem; border-radius: 20px; border: 1px solid #cbd5e1; background: #fff; color: #475569; cursor: pointer;">Clinical</button>
                    <button type="button" class="do-type-pill" data-type="Emergency" style="padding: 5px 12px; font-size: 0.8125rem; border-radius: 20px; border: 1px solid #cbd5e1; background: #fff; color: #475569; cursor: pointer;">Emergency</button>
                    <button type="button" class="do-type-pill" data-type="Inpatient" style="padding: 5px 12px; font-size: 0.8125rem; border-radius: 20px; border: 1px solid #cbd5e1; background: #fff; color: #475569; cursor: pointer;">Inpatient / ICU</button>
                    <button type="button" class="do-type-pill" data-type="Surgical" style="padding: 5px 12px; font-size: 0.8125rem; border-radius: 20px; border: 1px solid #cbd5e1; background: #fff; color: #475569; cursor: pointer;">Surgical</button>
                    <button type="button" class="do-type-pill" data-type="Diagnostic" style="padding: 5px 12px; font-size: 0.8125rem; border-radius: 20px; border: 1px solid #cbd5e1; background: #fff; color: #475569; cursor: pointer;">Diagnostic</button>
                </div>

                <!-- Instant Search -->
                <div style="position: relative; width: 300px;">
                    <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none;">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </span>
                    <input type="text" id="do-filter-search" placeholder="Search department, doctor, ward..." class="form-control" style="width: 100%; padding: 6px 12px 6px 32px; font-size: 0.875rem; border-radius: 6px; border: 1px solid #cbd5e1;">
                </div>
            </div>

            <!-- Visual Organization Root Tree Display -->
            <div id="do-main-view" style="display: flex; flex-direction: column; gap: 20px;">
                <!-- Facility Root Card -->
                <div id="do-facility-root" class="card" style="padding: 18px 24px; border-radius: 12px; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #334155;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                        <div style="display: flex; align-items: center; gap: 14px;">
                            <span style="display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 10px; background: rgba(99, 102, 241, 0.2); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.3);">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                            </span>
                            <div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; background: rgba(99, 102, 241, 0.3); color: #c7d2fe; padding: 2px 8px; border-radius: 4px;">
                                        Root Facility Campus
                                    </span>
                                </div>
                                <h2 id="do-facility-name" style="margin: 4px 0 0 0; font-size: 1.25rem; font-weight: 700;">Loading Facility...</h2>
                            </div>
                        </div>

                        <div id="do-facility-meta" style="font-size: 0.8125rem; color: #94a3b8; display: flex; gap: 20px; align-items: center;">
                            <!-- Populated dynamically -->
                        </div>
                    </div>
                </div>

                <!-- Tree Connecting Spine -->
                <div style="display: flex; justify-content: center; margin: -10px 0;">
                    <div style="width: 2px; height: 24px; background: #cbd5e1;"></div>
                </div>

                <!-- Department Nodes Container -->
                <div id="do-departments-container" style="display: flex; flex-direction: column; gap: 16px;">
                    <div style="padding: 40px; text-align: center; color: var(--text-muted, #94a3b8);">
                        <div style="display: inline-block; width: 24px; height: 24px; border: 3px solid #e2e8f0; border-top-color: #6366f1; border-radius: 50%; animation: do-spin 0.8s linear infinite;"></div>
                        <div style="margin-top: 8px;">Rendering organizational hierarchy...</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- MODAL: Appoint / Reassign Department Head -->
        <div id="do-modal-appoint" class="modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); z-index: 1000; align-items: center; justify-content: center; padding: 20px;">
            <div style="background: var(--bg-card, #ffffff); width: 100%; max-width: 520px; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2); overflow: hidden; margin: auto;">
                <div style="padding: 18px 24px; border-bottom: 1px solid var(--border-color, #e2e8f0); display: flex; justify-content: space-between; align-items: center; background: var(--bg-card-header, #f8fafc);">
                    <div>
                        <h3 style="margin: 0; font-size: 1.125rem; font-weight: 700;">Appoint Head of Department</h3>
                        <div id="do-modal-dept-title" style="font-size: 0.8125rem; color: #6366f1; font-weight: 600; margin-top: 2px;"></div>
                    </div>
                    <button type="button" class="do-modal-close" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted, #94a3b8);">&times;</button>
                </div>

                <form id="do-form-appoint" style="padding: 24px;">
                    <input type="hidden" id="do-appoint-dept-id">

                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 6px;">Select Doctor / Department Chair <span style="color: #ef4444;">*</span></label>
                        <select id="do-appoint-doctor-select" required class="form-control" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.875rem;">
                            <option value="">Choose Physician from Staff Roster...</option>
                        </select>
                    </div>

                    <div id="do-appoint-preview" style="display: none; margin-bottom: 20px; padding: 12px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0;">
                        <div style="font-size: 0.8125rem; font-weight: 600; color: #1e293b;" id="do-preview-name"></div>
                        <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;" id="do-preview-notes"></div>
                        <div style="font-size: 0.75rem; color: #0284c7; margin-top: 2px;" id="do-preview-contact"></div>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 10px;">
                        <button type="button" class="btn btn-secondary do-modal-close" style="padding: 8px 16px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer;">Cancel</button>
                        <button type="submit" class="btn btn-primary" style="padding: 8px 20px; border-radius: 6px; background: #6366f1; color: #fff; border: none; font-weight: 600; cursor: pointer;">Confirm Appointment</button>
                    </div>
                </form>
            </div>
        </div>

        <style>
            @keyframes do-spin { to { transform: rotate(360deg); } }
            .do-tree-card {
                border-radius: 10px;
                background: var(--bg-card, #ffffff);
                border: 1px solid var(--border-color, #e2e8f0);
                box-shadow: 0 1px 3px rgba(0,0,0,0.04);
                overflow: hidden;
                transition: transform 0.15s ease, box-shadow 0.15s ease;
            }
            .do-tree-card:hover {
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.08);
            }
            .do-badge-clinical { background: rgba(99, 102, 241, 0.1); color: #6366f1; }
            .do-badge-emergency { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
            .do-badge-inpatient { background: rgba(14, 165, 233, 0.1); color: #0284c7; }
            .do-badge-surgical { background: rgba(168, 85, 247, 0.1); color: #a855f7; }
            .do-badge-diagnostic { background: rgba(245, 158, 11, 0.1); color: #d97706; }
            .do-badge-admin { background: rgba(100, 116, 139, 0.1); color: #64748b; }
        </style>
    `;
}
