export function GeneralSettingsView()
{
    return `
<style>
.gs-page {
    width: 100%;
    font-size: 13.5px;
}

.gs-card {
    width: 100%;
}

.gs-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 4px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e5e9f0;
    flex-wrap: wrap;
}

.gs-header h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #14181f;
    letter-spacing: -.2px;
}

.gs-header .form-subtitle {
    margin: 1px 0 0;
    max-width: 480px;
}

.gs-add-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 34px;
    padding: 0 14px;
    border: 1px solid var(--accent);
    border-radius: 6px;
    background: var(--accent);
    color: white;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    transition: background-color .12s;
    white-space: nowrap;
}

.gs-add-btn:hover {
    background: #1742b0;
    border-color: #1742b0;
}

.gs-add-btn svg {
    width: 14px;
    height: 14px;
}

.gs-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
}

.gs-status-badge.on {
    background: #e6f6ec;
    color: #1f7a44;
}

.gs-status-badge.off {
    background: #f1f3f7;
    color: #5a6478;
}

.gs-role-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.gs-role-chip {
    padding: 3px 10px;
    border-radius: 999px;
    background: #eef1f7;
    color: #374151;
    font-size: 12px;
    font-weight: 500;
}

.gs-2fa-toggle {
    display: flex;
    gap: 18px;
    margin-bottom: 4px;
}

.gs-2fa-toggle label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13.5px;
    color: #25324b;
    cursor: pointer;
}

.gs-2fa-toggle input {
    accent-color: var(--accent);
}

.gs-2fa-detail {
    display: none;
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid #eef1f7;
}

.gs-2fa-detail.open {
    display: block;
}

.gs-role-checklist {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px 18px;
    margin-top: 6px;
}

.gs-role-checklist label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #25324b;
}

.gs-role-checklist input {
    accent-color: var(--accent);
}

.gs-card + .gs-card {
    margin-top: 32px;
}

.gs-tz-name {
    font-size: 15px;
    font-weight: 600;
    color: #14181f;
}

.gs-tz-offset {
    margin-left: 8px;
    padding: 2px 8px;
    border-radius: 999px;
    background: #eef1f7;
    color: #374151;
    font-size: 12px;
    font-weight: 600;
}

.gs-tz-clock {
    font-variant-numeric: tabular-nums;
}

.gs-tz-search,
.gs-tz-select {
    width: 100%;
}

.gs-tz-search {
    margin-bottom: 8px;
}

.gs-tz-browser {
    margin-top: 6px;
    font-size: 12.5px;
    color: #5a6478;
}

.gs-tz-browser button {
    padding: 0;
    border: 0;
    background: none;
    color: var(--accent);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
}

.gs-tz-note {
    margin: 14px 0 0;
    padding: 9px 12px;
    border-radius: 8px;
    border: 1px solid #f59e0b;
    background: #fffbeb;
    color: #92400e;
    font-size: 12.5px;
}

:root[data-theme="dark"] .gs-tz-name { color: var(--text-primary); }
:root[data-theme="dark"] .gs-tz-offset { background: var(--bg-surface-alt); color: var(--text-primary); }
:root[data-theme="dark"] .gs-tz-browser { color: var(--text-muted); }
:root[data-theme="dark"] .gs-tz-note { background: rgba(245,158,11,.12); color: #fde68a; border-color: rgba(245,158,11,.5); }
:root[data-theme="dark"] .gs-role-chip { background: var(--bg-surface-alt); color: var(--text-primary); }
:root[data-theme="dark"] .gs-2fa-toggle label,
:root[data-theme="dark"] .gs-role-checklist label { color: var(--text-primary); }
:root[data-theme="dark"] .gs-2fa-detail { border-top-color: var(--border-color); }
:root[data-theme="dark"] .gs-status-badge.off { background: var(--bg-surface-alt); color: var(--text-muted); }

.gs-limits { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13.5px; }
.gs-limits th { text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: .3px; color: var(--text-muted); border-bottom: 1px solid var(--border-color); white-space: nowrap; }
.gs-limits td { padding: 10px; border-bottom: 1px solid var(--border-color); color: var(--text-primary); vertical-align: middle; }
.gs-limits tr:last-child td { border-bottom: none; }
.gs-limits input[type="number"] { width: 160px; max-width: 100%; height: 34px; padding: 0 10px; box-sizing: border-box; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 13px; text-align: right; }
.gs-limits input[type="number"]:disabled { opacity: .5; }
.gs-limits label.gs-switch { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 400; margin: 0; }
.gs-limits input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--accent); }
.gs-limits .form-error { display: block; }
.gs-limits-sub { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }
.gs-limits-wrap { overflow-x: auto; }
.gs-limits-footer { display: flex; justify-content: flex-end; margin-top: 12px; }
</style>

<div class="gs-page">
    <div class="gs-card">
        <div class="gs-header">
            <div>
                <h1>System Timezone</h1>
                <p class="form-subtitle">The local time the hospital runs on. Every screen uses it for "today" and "now" (default dates, clocks, ages, due and overdue), whatever timezone each computer is set to.</p>
            </div>
            <button type="button" class="gs-add-btn" id="openEditTimezoneModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                Edit
            </button>
        </div>

        <div id="gsTimezoneAlert"></div>

        <div class="form-grid" style="margin-top: 20px;">
            <div class="form-group">
                <label>Timezone</label>
                <p><span class="gs-tz-name" id="ro_tz_name">-</span><span class="gs-tz-offset" id="ro_tz_offset" hidden></span></p>
            </div>

            <div class="form-group">
                <label>Current System Time</label>
                <p class="gs-tz-clock" id="ro_tz_clock">-</p>
            </div>
        </div>
    </div>

    <div class="gs-card">
        <div class="gs-header">
            <div>
                <h1>Prescriptions</h1>
                <p class="form-subtitle">How long a new prescription can be filled by the pharmacy, counted from the day it's written. Prescriptions already written keep the validity they were given.</p>
            </div>
        </div>

        <div id="gsRxAlert"></div>

        <form id="gsRxForm" class="form-grid" style="margin-top: 16px; align-items: end;" novalidate>
            <div class="form-group">
                <label for="gs_rx_validity">Valid for (days)</label>
                <input id="gs_rx_validity" type="number" min="1" max="365" step="1" class="form-input" inputmode="numeric">
                <span class="form-error" id="err-prescription_validity_days"></span>
            </div>
            <div class="form-group">
                <button type="submit" class="login-btn" id="gsRxSave" style="width:auto;padding:0 18px;">Save</button>
            </div>
        </form>
    </div>

    <div class="gs-card">
        <div class="gs-header">
            <div>
                <h1>Approval Limits</h1>
                <p class="form-subtitle">Purchase orders, supplier invoices and supplier payments above these amounts also need an administrator. An accountant's approval then counts as the first one, and an administrator gives the final approval. Payments an accountant records above the limit wait for an administrator before the invoices are paid off.</p>
            </div>
        </div>

        <div id="gsLimitsAlert"></div>
        <div id="gsLimits"><p class="form-subtitle" style="margin-top:16px;">Loading...</p></div>
    </div>

    <div class="gs-card">
        <div class="gs-header">
            <div>
                <h1>Two-Factor Authentication</h1>
                <p class="form-subtitle">Require an extra verification code at login for selected roles.</p>
            </div>
            <button type="button" class="gs-add-btn" id="openEditGeneralSettingsModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                Edit
            </button>
        </div>

        <div id="gsFormAlert"></div>

        <div class="form-grid" style="margin-top: 20px;">
            <div class="form-group full">
                <label>Status</label>
                <p><span class="gs-status-badge off" id="ro_tfa_status">Disabled</span></p>
            </div>

            <div class="form-group">
                <label>Method</label>
                <p id="ro_tfa_method">-</p>
            </div>

            <div class="form-group full">
                <label>Applies To</label>
                <div class="gs-role-list" id="ro_tfa_roles"><p>-</p></div>
            </div>
        </div>
    </div>
</div>

<div class="modal-overlay" id="editTimezoneModalOverlay">
    <div class="modal-box">
        <div class="modal-header">
            <h2>Edit System Timezone</h2>
            <button type="button" class="modal-close" id="closeEditTimezoneModal">&times;</button>
        </div>
        <p class="form-subtitle">Choose the timezone where the hospital operates.</p>

        <div id="editTimezoneFormAlert"></div>

        <form id="editTimezoneForm">
            <div class="form-group full">
                <label for="tz_select">Timezone</label>
                <input type="search" class="gs-tz-search" id="tz_search" placeholder="Search a city, region or offset, e.g. Manila or UTC+08" autocomplete="off">
                <select class="gs-tz-select" id="tz_select" size="8"></select>
                <span class="form-error" id="err-timezone"></span>
                <div class="gs-tz-browser" id="tzBrowserHint" hidden></div>
            </div>

            <p class="gs-tz-note">Applies on this computer right away, and on other computers the next time they open or reload the system. Dates and times already saved are not changed.</p>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelEditTimezone">Cancel</button>
                <button class="login-btn" type="submit">Save Changes</button>
            </div>
        </form>
    </div>
</div>

<div class="modal-overlay" id="editGeneralSettingsModalOverlay">
    <div class="modal-box">
        <div class="modal-header">
            <h2>Edit Two-Factor Authentication</h2>
            <button type="button" class="modal-close" id="closeEditGeneralSettingsModal">&times;</button>
        </div>
        <p class="form-subtitle">Choose whether to require Two-Factor Authentication, and for which roles.</p>

        <div id="editGeneralSettingsFormAlert"></div>

        <form id="editGeneralSettingsForm">
            <div class="form-group full">
                <label>Enable Two-Factor Authentication?</label>
                <div class="gs-2fa-toggle">
                    <label><input type="radio" name="tfa_enabled" value="yes" id="tfa_enabled_yes"> Yes</label>
                    <label><input type="radio" name="tfa_enabled" value="no" id="tfa_enabled_no" checked> No</label>
                </div>
            </div>

            <div class="gs-2fa-detail" id="tfaDetailSection">
                <div class="form-group full">
                    <label>Verification Method</label>
                    <div class="gs-2fa-toggle">
                        <label><input type="radio" name="tfa_method" value="sms" id="tfa_method_sms" checked> SMS</label>
                        <label><input type="radio" name="tfa_method" value="email" id="tfa_method_email"> Email</label>
                    </div>
                    <span class="form-error" id="err-tfa_method"></span>
                </div>

                <div class="form-group full">
                    <label>Applies To</label>
                    <div class="gs-role-checklist" id="tfaRoleChecklist"></div>
                    <span class="form-error" id="err-tfa_role_ids"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelEditGeneralSettings">Cancel</button>
                <button class="login-btn" type="submit">Save Changes</button>
            </div>
        </form>
    </div>
</div>
`;
}
