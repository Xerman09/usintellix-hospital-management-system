/**
 * Clinic Operating Schedules & Department Timetables View
 */
export function ClinicSchedulesView(user = {}) {
    return `
        <div class="clinic-schedules-container" style="padding: 24px; max-width: 1600px; margin: 0 auto; color: var(--text-primary, #0f172a);">
            <!-- Top Header & Controls -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
                <div>
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                        <span style="display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 8px; background: rgba(14, 165, 233, 0.1); color: #0284c7;">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                        </span>
                        <h1 style="margin: 0; font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em;">Clinic Operating Schedules</h1>
                    </div>
                    <p style="margin: 0; font-size: 0.875rem; color: var(--text-muted, #64748b);">
                        Master operating hours, consultation slot intervals, walk-in quotas, and daily capacity limits per clinic department
                    </p>
                </div>

                <!-- Department Selector & Actions -->
                <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <label for="cs-select-dept" style="font-size: 0.8125rem; font-weight: 600; color: var(--text-muted, #475569); white-space: nowrap;">Department:</label>
                        <select id="cs-select-dept" class="form-control" style="min-width: 240px; padding: 8px 12px; font-size: 0.875rem; font-weight: 600; border-radius: 6px; border: 1px solid var(--border-color, #cbd5e1); background: var(--bg-card, #ffffff); color: var(--text-primary, #0f172a);">
                            <option value="">Loading departments...</option>
                        </select>
                    </div>

                    <button id="cs-btn-copy-weekdays" class="btn btn-secondary" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; font-size: 0.875rem; border-radius: 6px; border: 1px solid var(--border-color, #cbd5e1); background: var(--bg-card, #ffffff); cursor: pointer;" title="Apply Monday operating hours to all weekdays (Tue-Fri)">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        Copy Mon &rarr; Weekdays
                    </button>

                    <button id="cs-btn-save-all" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; font-size: 0.875rem; font-weight: 600; border-radius: 6px; background: #0284c7; color: #ffffff; border: none; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                        Save Weekly Timetable
                    </button>
                </div>
            </div>

            <!-- KPI & Department Summary Banner -->
            <div id="cs-banner" class="card" style="padding: 16px 20px; border-radius: 10px; background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0); margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                    <div style="display: flex; align-items: center; gap: 14px;">
                        <span id="cs-dept-badge" style="display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 0.8125rem; font-weight: 700; background: rgba(14, 165, 233, 0.12); color: #0284c7;">
                            CARD
                        </span>
                        <div>
                            <div id="cs-dept-title" style="font-size: 1.125rem; font-weight: 700;">Cardiology Outpatient Clinic</div>
                            <div id="cs-dept-type" style="font-size: 0.8125rem; color: var(--text-muted, #64748b);">Clinical Department &bull; Status: Active</div>
                        </div>
                    </div>

                    <div style="display: flex; gap: 24px; align-items: center; flex-wrap: wrap;">
                        <div>
                            <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted, #64748b); font-weight: 600;">Active Clinic Days</div>
                            <div id="cs-kpi-active-days" style="font-size: 1.25rem; font-weight: 700; color: #0284c7;">6 Days / Wk</div>
                        </div>
                        <div style="width: 1px; height: 32px; background: #e2e8f0;"></div>
                        <div>
                            <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted, #64748b); font-weight: 600;">Total Weekly Capacity</div>
                            <div id="cs-kpi-weekly-capacity" style="font-size: 1.25rem; font-weight: 700; color: #15803d;">176 Patients</div>
                        </div>
                        <div style="width: 1px; height: 32px; background: #e2e8f0;"></div>
                        <div>
                            <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted, #64748b); font-weight: 600;">Daily Avg Capacity</div>
                            <div id="cs-kpi-daily-avg" style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary, #0f172a);">29.3 Patients</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Weekly Timetable Grid -->
            <div id="cs-grid" style="display: flex; flex-direction: column; gap: 14px;">
                <!-- 7 Day Cards rendered dynamically -->
                <div style="padding: 40px; text-align: center; color: var(--text-muted, #94a3b8);">
                    <div style="display: inline-block; width: 24px; height: 24px; border: 3px solid #e2e8f0; border-top-color: #0284c7; border-radius: 50%; animation: cs-spin 0.8s linear infinite;"></div>
                    <div style="margin-top: 8px;">Loading clinic operating schedules...</div>
                </div>
            </div>
        </div>

        <!-- MODAL: Replicate Day Settings to Other Days -->
        <div id="cs-modal-copy" class="modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); z-index: 1000; align-items: center; justify-content: center; padding: 20px;">
            <div style="background: var(--bg-card, #ffffff); width: 100%; max-width: 480px; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2); overflow: hidden; margin: auto;">
                <div style="padding: 18px 24px; border-bottom: 1px solid var(--border-color, #e2e8f0); display: flex; justify-content: space-between; align-items: center; background: var(--bg-card-header, #f8fafc);">
                    <h3 style="margin: 0; font-size: 1.125rem; font-weight: 700;">Copy Schedule to Other Days</h3>
                    <button type="button" class="cs-modal-close" style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted, #94a3b8);">&times;</button>
                </div>
                
                <div style="padding: 24px;">
                    <div style="margin-bottom: 16px; font-size: 0.875rem; color: var(--text-muted, #64748b);">
                        Replicate operating hours, slot duration, and capacity from <b id="cs-copy-source-day" style="color: #0284c7;">Monday</b> to the following target days:
                    </div>

                    <div style="margin-bottom: 16px; display: flex; gap: 8px;">
                        <button type="button" id="cs-copy-select-weekdays" class="btn btn-sm" style="padding: 4px 10px; font-size: 0.75rem; border-radius: 4px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer;">
                            Select Weekdays (Mon-Fri)
                        </button>
                        <button type="button" id="cs-copy-select-all" class="btn btn-sm" style="padding: 4px 10px; font-size: 0.75rem; border-radius: 4px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer;">
                            Select All Days
                        </button>
                    </div>

                    <div id="cs-copy-days-list" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px;">
                        <!-- Checkboxes populated dynamically -->
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 10px;">
                        <button type="button" class="btn btn-secondary cs-modal-close" style="padding: 8px 16px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer;">Cancel</button>
                        <button type="button" id="cs-btn-confirm-copy" class="btn btn-primary" style="padding: 8px 20px; border-radius: 6px; background: #0284c7; color: #fff; border: none; font-weight: 600; cursor: pointer;">Apply &amp; Save</button>
                    </div>
                </div>
            </div>
        </div>

        <style>
            @keyframes cs-spin { to { transform: rotate(360deg); } }
            .cs-day-card {
                padding: 16px 20px;
                border-radius: 10px;
                background: var(--bg-card, #ffffff);
                border: 1px solid var(--border-color, #e2e8f0);
                box-shadow: 0 1px 3px rgba(0,0,0,0.04);
                transition: border-color 0.15s ease;
            }
            .cs-day-card.cs-closed {
                background: var(--bg-card-disabled, #f8fafc);
                opacity: 0.85;
            }
            .cs-switch {
                position: relative;
                display: inline-block;
                width: 44px;
                height: 24px;
            }
            .cs-switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            .cs-slider {
                position: absolute;
                cursor: pointer;
                top: 0; left: 0; right: 0; bottom: 0;
                background-color: #cbd5e1;
                transition: .2s;
                border-radius: 24px;
            }
            .cs-slider:before {
                position: absolute;
                content: "";
                height: 18px;
                width: 18px;
                left: 3px;
                bottom: 3px;
                background-color: white;
                transition: .2s;
                border-radius: 50%;
            }
            input:checked + .cs-slider {
                background-color: #10b981;
            }
            input:checked + .cs-slider:before {
                transform: translateX(20px);
            }
        </style>
    `;
}
