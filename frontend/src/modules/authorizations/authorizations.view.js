/**
 * Authorizations View (OpenEMR-Style)
 * Full support for:
 * 1. Clinical Sign-Off Queue (Attending review, sign-off, or return of staff notes)
 * 2. Prior Authorizations Tracker (Insurance pre-certifications, CPT codes, unit management)
 * Scoped to active patient with toggle for all-patient clinic queue, Light & Dark mode.
 */
export function AuthorizationsView() {
    return `
<style>
.auth-wrapper {
    padding: 22px;
    max-width: 1350px;
    margin: 0 auto;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    color: var(--text-primary, #1e293b);
}

/* Active Patient Scope Banner */
.auth-scope-banner {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 14px 20px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

:root[data-theme="dark"] .auth-scope-banner {
    background: #1e293b;
    border-color: #334155;
    color: #f1f5f9;
}

.auth-patient-info {
    display: flex;
    align-items: center;
    gap: 14px;
}

.auth-patient-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: #0284c7;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 16px;
    text-transform: uppercase;
    box-shadow: 0 2px 4px rgba(2,132,199,0.25);
}

.auth-patient-name {
    font-size: 17px;
    font-weight: 600;
    color: var(--text-primary, #0f172a);
    margin: 0 0 2px 0;
}

:root[data-theme="dark"] .auth-patient-name {
    color: #f8fafc;
}

.auth-patient-meta {
    font-size: 12.5px;
    color: #64748b;
    margin: 0;
}

:root[data-theme="dark"] .auth-patient-meta {
    color: #94a3b8;
}

.auth-scope-toggle-group {
    display: flex;
    align-items: center;
    gap: 10px;
}

.auth-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 9999px;
}

.auth-badge-active {
    color: #15803d;
    background: rgba(34, 197, 94, 0.14);
}

:root[data-theme="dark"] .auth-badge-active {
    color: #4ade80;
    background: rgba(34, 197, 94, 0.2);
}

.auth-badge-all {
    color: #4338ca;
    background: rgba(99, 102, 241, 0.14);
}

:root[data-theme="dark"] .auth-badge-all {
    color: #a5b4fc;
    background: rgba(99, 102, 241, 0.2);
}

.auth-scope-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 500;
    border-radius: 6px;
    border: 1px solid #cbd5e1;
    background: #ffffff;
    color: #334155;
    cursor: pointer;
    transition: all 0.15s ease;
}

:root[data-theme="dark"] .auth-scope-btn {
    background: #334155;
    border-color: #475569;
    color: #e2e8f0;
}

.auth-scope-btn:hover {
    background: #f1f5f9;
    border-color: #94a3b8;
}

:root[data-theme="dark"] .auth-scope-btn:hover {
    background: #475569;
}

/* Hero Header */
.auth-hero {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 18px 24px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
}

:root[data-theme="dark"] .auth-hero {
    background: #1e293b;
    border-color: #334155;
}

.auth-hero-title {
    font-size: 20px;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 4px 0;
    display: flex;
    align-items: center;
    gap: 10px;
}

:root[data-theme="dark"] .auth-hero-title {
    color: #f8fafc;
}

.auth-hero-sub {
    font-size: 13.5px;
    color: #64748b;
    margin: 0;
}

:root[data-theme="dark"] .auth-hero-sub {
    color: #94a3b8;
}

/* KPI Summary Cards */
.auth-kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
    margin-bottom: 22px;
}

.auth-kpi-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 16px 18px;
    display: flex;
    align-items: center;
    gap: 14px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}

:root[data-theme="dark"] .auth-kpi-card {
    background: #1e293b;
    border-color: #334155;
}

.auth-kpi-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(0,0,0,0.06);
}

.auth-kpi-icon {
    width: 44px;
    height: 44px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    flex-shrink: 0;
}

.auth-kpi-val {
    font-size: 24px;
    font-weight: 700;
    line-height: 1.2;
    color: #0f172a;
}

:root[data-theme="dark"] .auth-kpi-val {
    color: #f8fafc;
}

.auth-kpi-lbl {
    font-size: 12.5px;
    color: #64748b;
    font-weight: 500;
}

:root[data-theme="dark"] .auth-kpi-lbl {
    color: #94a3b8;
}

/* Nav Tabs */
.auth-tabs-container {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px 8px 0 0;
    padding: 6px 12px 0 12px;
    display: flex;
    gap: 8px;
    border-bottom: 2px solid #e2e8f0;
}

:root[data-theme="dark"] .auth-tabs-container {
    background: #1e293b;
    border-color: #334155;
    border-bottom-color: #334155;
}

.auth-tab-btn {
    padding: 10px 18px;
    font-size: 14px;
    font-weight: 600;
    color: #64748b;
    border: none;
    background: transparent;
    cursor: pointer;
    border-bottom: 3px solid transparent;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.15s ease;
}

:root[data-theme="dark"] .auth-tab-btn {
    color: #94a3b8;
}

.auth-tab-btn:hover {
    color: #0284c7;
}

:root[data-theme="dark"] .auth-tab-btn:hover {
    color: #38bdf8;
}

.auth-tab-btn.active {
    color: #0284c7;
    border-bottom-color: #0284c7;
}

:root[data-theme="dark"] .auth-tab-btn.active {
    color: #38bdf8;
    border-bottom-color: #38bdf8;
}

.auth-tab-badge {
    background: #e2e8f0;
    color: #475569;
    font-size: 11px;
    padding: 2px 7px;
    border-radius: 9999px;
    font-weight: 700;
}

:root[data-theme="dark"] .auth-tab-badge {
    background: #334155;
    color: #cbd5e1;
}

.auth-tab-btn.active .auth-tab-badge {
    background: #0284c7;
    color: #ffffff;
}

:root[data-theme="dark"] .auth-tab-btn.active .auth-tab-badge {
    background: #38bdf8;
    color: #0f172a;
}

/* Filter & Action Toolbar */
.auth-toolbar {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-top: none;
    padding: 14px 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
}

:root[data-theme="dark"] .auth-toolbar {
    background: #1e293b;
    border-color: #334155;
}

.auth-filter-left {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

.auth-input, .auth-select {
    padding: 7px 12px;
    font-size: 13px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    background: #ffffff;
    color: #1e293b;
    outline: none;
    transition: border-color 0.15s ease;
}

:root[data-theme="dark"] .auth-input,
:root[data-theme="dark"] .auth-select {
    background: #0f172a;
    border-color: #334155;
    color: #f1f5f9;
}

.auth-input:focus, .auth-select:focus {
    border-color: #0284c7;
}

.auth-btn-primary {
    background: #0284c7;
    color: #ffffff;
    border: none;
    border-radius: 6px;
    padding: 7px 14px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: background 0.15s ease;
}

.auth-btn-primary:hover {
    background: #0369a1;
}

.auth-btn-success {
    background: #16a34a;
    color: #ffffff;
    border: none;
    border-radius: 6px;
    padding: 7px 14px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: background 0.15s ease;
}

.auth-btn-success:hover {
    background: #15803d;
}

.auth-btn-outline {
    background: transparent;
    color: #475569;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 7px 13px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.15s ease;
}

:root[data-theme="dark"] .auth-btn-outline {
    color: #cbd5e1;
    border-color: #475569;
}

.auth-btn-outline:hover {
    background: #f1f5f9;
    color: #0f172a;
}

:root[data-theme="dark"] .auth-btn-outline:hover {
    background: #334155;
    color: #f8fafc;
}

/* Data Table Container */
.auth-table-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 0 0 8px 8px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.02);
}

:root[data-theme="dark"] .auth-table-card {
    background: #1e293b;
    border-color: #334155;
}

.auth-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
    font-size: 13px;
}

.auth-table th {
    background: #f8fafc;
    color: #475569;
    font-weight: 600;
    padding: 11px 14px;
    border-bottom: 1px solid #e2e8f0;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
}

:root[data-theme="dark"] .auth-table th {
    background: #0f172a;
    color: #94a3b8;
    border-bottom-color: #334155;
}

.auth-table td {
    padding: 12px 14px;
    border-bottom: 1px solid #f1f5f9;
    color: #1e293b;
    vertical-align: middle;
}

:root[data-theme="dark"] .auth-table td {
    border-bottom-color: #334155;
    color: #e2e8f0;
}

.auth-table tr:hover td {
    background: #f8fafc;
}

:root[data-theme="dark"] .auth-table tr:hover td {
    background: #253347;
}

/* Badges */
.auth-status-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 9px;
    border-radius: 9999px;
    font-size: 11.5px;
    font-weight: 600;
}

.auth-tag-pending {
    background: #fef3c7;
    color: #b45309;
}
:root[data-theme="dark"] .auth-tag-pending {
    background: rgba(245, 158, 11, 0.2);
    color: #fbbf24;
}

.auth-tag-authorized, .auth-tag-active {
    background: #dcfce7;
    color: #15803d;
}
:root[data-theme="dark"] .auth-tag-authorized,
:root[data-theme="dark"] .auth-tag-active {
    background: rgba(34, 197, 94, 0.2);
    color: #4ade80;
}

.auth-tag-expired {
    background: #fee2e2;
    color: #b91c1c;
}
:root[data-theme="dark"] .auth-tag-expired {
    background: rgba(239, 68, 68, 0.2);
    color: #f87171;
}

.auth-tag-completed {
    background: #e0f2fe;
    color: #0369a1;
}
:root[data-theme="dark"] .auth-tag-completed {
    background: rgba(14, 165, 233, 0.2);
    color: #38bdf8;
}

.auth-tag-returned, .auth-tag-denied {
    background: #f3e8ff;
    color: #7e22ce;
}
:root[data-theme="dark"] .auth-tag-returned,
:root[data-theme="dark"] .auth-tag-denied {
    background: rgba(168, 85, 247, 0.2);
    color: #c084fc;
}

.auth-units-badge {
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 12px;
}
.auth-units-good {
    background: #dcfce7;
    color: #166534;
}
.auth-units-low {
    background: #fef3c7;
    color: #92400e;
}
.auth-units-empty {
    background: #fee2e2;
    color: #991b1b;
}

/* Modals */
.auth-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(2px);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    padding: 20px;
}

.auth-modal-box {
    background: #ffffff;
    border-radius: 10px;
    width: 100%;
    max-width: 680px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.08);
    overflow: hidden;
}

:root[data-theme="dark"] .auth-modal-box {
    background: #1e293b;
    border: 1px solid #334155;
}

.auth-modal-header {
    padding: 16px 20px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

:root[data-theme="dark"] .auth-modal-header {
    border-bottom-color: #334155;
}

.auth-modal-title {
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
}

:root[data-theme="dark"] .auth-modal-title {
    color: #f8fafc;
}

.auth-modal-close {
    background: transparent;
    border: none;
    font-size: 20px;
    color: #64748b;
    cursor: pointer;
    line-height: 1;
}

.auth-modal-body {
    padding: 20px;
    overflow-y: auto;
    font-size: 13.5px;
    color: #334155;
}

:root[data-theme="dark"] .auth-modal-body {
    color: #cbd5e1;
}

.auth-modal-footer {
    padding: 14px 20px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    background: #f8fafc;
}

:root[data-theme="dark"] .auth-modal-footer {
    border-top-color: #334155;
    background: #0f172a;
}

/* Form Groups */
.auth-form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin-bottom: 14px;
}

.auth-form-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-bottom: 14px;
}

.auth-form-label {
    font-size: 12.5px;
    font-weight: 600;
    color: #475569;
}

:root[data-theme="dark"] .auth-form-label {
    color: #94a3b8;
}

.auth-form-control {
    padding: 8px 12px;
    font-size: 13.5px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    background: #ffffff;
    color: #0f172a;
    outline: none;
}

:root[data-theme="dark"] .auth-form-control {
    background: #0f172a;
    border-color: #334155;
    color: #f8fafc;
}

.auth-note-preview-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 14px;
    font-family: monospace;
    font-size: 13px;
    line-height: 1.5;
    white-space: pre-wrap;
    max-height: 220px;
    overflow-y: auto;
    margin-bottom: 14px;
}

:root[data-theme="dark"] .auth-note-preview-box {
    background: #0f172a;
    border-color: #334155;
    color: #e2e8f0;
}
</style>

<div class="auth-wrapper">
    <!-- Active Patient Scope Banner -->
    <div class="auth-scope-banner" id="authScopeBanner">
        <div class="auth-patient-info" id="authPatientInfo">
            <div class="auth-patient-avatar" id="authPatientAvatar">DA</div>
            <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <h3 class="auth-patient-name" id="authPatientName">Doc Ako</h3>
                    <span class="auth-badge auth-badge-active" id="authPatientBadge">
                        <span style="width:6px; height:6px; border-radius:50%; background:currentColor;"></span>
                        Active Open Patient
                    </span>
                </div>
                <p class="auth-patient-meta" id="authPatientMeta">Chart: PAT-000004 | DOB: 2026-07-02 | Sex: Male</p>
            </div>
        </div>
        <div class="auth-scope-toggle-group">
            <button class="auth-scope-btn" id="authToggleScopeBtn" title="Toggle between Active Patient and Clinic-Wide Queue">
                <i class="fas fa-users"></i>
                <span id="authToggleScopeLabel">View All Patients Queue</span>
            </button>
        </div>
    </div>

    <!-- Hero Header -->
    <div class="auth-hero">
        <div>
            <h1 class="auth-hero-title">
                <i class="fas fa-file-signature" style="color: #0284c7;"></i>
                Authorizations & Review Queue
            </h1>
            <p class="auth-hero-sub">OpenEMR Attending Clinical Sign-Offs and Insurance Prior Authorization Tracker</p>
        </div>
        <div style="display: flex; gap: 10px;">
            <button class="auth-btn-primary" id="authNewPriorAuthBtn">
                <i class="fas fa-plus-circle"></i> New Prior Authorization
            </button>
        </div>
    </div>

    <!-- KPI Summary Cards -->
    <div class="auth-kpi-grid">
        <div class="auth-kpi-card">
            <div class="auth-kpi-icon" style="background: rgba(245, 158, 11, 0.15); color: #d97706;">
                <i class="fas fa-hourglass-half"></i>
            </div>
            <div>
                <div class="auth-kpi-val" id="authKpiPending">0</div>
                <div class="auth-kpi-lbl">Pending Sign-Offs</div>
            </div>
        </div>
        <div class="auth-kpi-card">
            <div class="auth-kpi-icon" style="background: rgba(34, 197, 94, 0.15); color: #16a34a;">
                <i class="fas fa-check-double"></i>
            </div>
            <div>
                <div class="auth-kpi-val" id="authKpiAuthorized">0</div>
                <div class="auth-kpi-lbl">Authorized Notes</div>
            </div>
        </div>
        <div class="auth-kpi-card">
            <div class="auth-kpi-icon" style="background: rgba(2, 132, 199, 0.15); color: #0284c7;">
                <i class="fas fa-shield-alt"></i>
            </div>
            <div>
                <div class="auth-kpi-val" id="authKpiActivePa">0</div>
                <div class="auth-kpi-lbl">Active Prior Auths</div>
            </div>
        </div>
        <div class="auth-kpi-card">
            <div class="auth-kpi-icon" style="background: rgba(239, 68, 68, 0.15); color: #dc2626;">
                <i class="fas fa-calendar-times"></i>
            </div>
            <div>
                <div class="auth-kpi-val" id="authKpiExpiring">0</div>
                <div class="auth-kpi-lbl">Expiring & Low Units</div>
            </div>
        </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="auth-tabs-container">
        <button class="auth-tab-btn active" id="authTabClinicalBtn" data-tab="clinical">
            <i class="fas fa-notes-medical"></i>
            Clinical Sign-Offs
            <span class="auth-tab-badge" id="authTabClinicalCount">0</span>
        </button>
        <button class="auth-tab-btn" id="authTabPriorAuthBtn" data-tab="prior_auth">
            <i class="fas fa-id-card-alt"></i>
            Prior Authorizations (PAs)
            <span class="auth-tab-badge" id="authTabPriorAuthCount">0</span>
        </button>
    </div>

    <!-- Toolbar & Filters -->
    <div class="auth-toolbar">
        <div class="auth-filter-left">
            <div style="position: relative;">
                <i class="fas fa-search" style="position: absolute; left: 10px; top: 10px; color: #94a3b8; font-size: 12px;"></i>
                <input type="text" class="auth-input" id="authSearchInput" placeholder="Search auth #, patient, CPT, note..." style="padding-left: 28px; width: 240px;">
            </div>
            <select class="auth-select" id="authStatusFilter">
                <option value="all">All Statuses</option>
                <option value="pending">Pending Sign-Off</option>
                <option value="authorized">Authorized / Signed</option>
                <option value="Active">Active PAs</option>
                <option value="Expired">Expired</option>
                <option value="Completed">Completed Units</option>
                <option value="returned">Returned</option>
            </select>
            <button class="auth-btn-outline" id="authRefreshBtn" title="Refresh Table">
                <i class="fas fa-sync-alt"></i> Refresh
            </button>
        </div>
        <div id="authClinicalBatchActions" style="display: flex; gap: 8px;">
            <button class="auth-btn-success" id="authBatchSignBtn" style="display: none;">
                <i class="fas fa-signature"></i> Sign Selected (<span id="authSelectedCount">0</span>)
            </button>
        </div>
    </div>

    <!-- Data Table Card -->
    <div class="auth-table-card">
        <!-- 1. Clinical Sign-Offs Queue Table -->
        <div id="authClinicalTableSection">
            <table class="auth-table">
                <thead>
                    <tr>
                        <th style="width: 40px; text-align: center;">
                            <input type="checkbox" id="authSelectAllClinical" title="Select All Pending">
                        </th>
                        <th>Date / Time</th>
                        <th>Patient</th>
                        <th>Document / Note Type</th>
                        <th>Author / Staff</th>
                        <th>Summary / Details</th>
                        <th>Status</th>
                        <th>Signed By / Timestamp</th>
                        <th style="text-align: right;">Action</th>
                    </tr>
                </thead>
                <tbody id="authClinicalTableBody">
                    <tr><td colspan="9" style="text-align: center; padding: 30px; color: #94a3b8;">Loading clinical review queue...</td></tr>
                </tbody>
            </table>
        </div>

        <!-- 2. Prior Authorizations Table -->
        <div id="authPriorTableSection" style="display: none;">
            <table class="auth-table">
                <thead>
                    <tr>
                        <th>Auth #</th>
                        <th>Patient</th>
                        <th>Insurance / Payer</th>
                        <th>CPT Code & Description</th>
                        <th>Valid Period</th>
                        <th style="text-align: center;">Approved</th>
                        <th style="text-align: center;">Used</th>
                        <th style="text-align: center;">Remaining</th>
                        <th>Status</th>
                        <th style="text-align: right;">Action</th>
                    </tr>
                </thead>
                <tbody id="authPriorTableBody">
                    <tr><td colspan="10" style="text-align: center; padding: 30px; color: #94a3b8;">Loading insurance prior authorizations...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- MODAL: Review & Sign Clinical Note -->
<div class="auth-modal-overlay" id="authSignModal">
    <div class="auth-modal-box">
        <div class="auth-modal-header">
            <h3 class="auth-modal-title">
                <i class="fas fa-signature" style="color: #0284c7;"></i>
                Review & Clinical Sign-Off
            </h3>
            <button class="auth-modal-close" id="authSignModalClose">&times;</button>
        </div>
        <div class="auth-modal-body">
            <div style="background: #f1f5f9; padding: 10px 14px; border-radius: 6px; margin-bottom: 14px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                <div>
                    <strong id="authSignPatientName">Doc Ako (PAT-000004)</strong>
                    <div style="font-size: 12px; color: #64748b;" id="authSignNoteType">Encounter SOAP Note</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 12px; color: #64748b;">Author: <strong id="authSignAuthor">Mark Rivera, PA-C</strong></div>
                    <div style="font-size: 11.5px; color: #94a3b8;" id="authSignDate">2026-09-18 10:30</div>
                </div>
            </div>

            <div class="auth-form-label">Clinical Documentation Content:</div>
            <div class="auth-note-preview-box" id="authSignContent"></div>

            <div class="auth-form-group">
                <label class="auth-form-label">Attending / Supervising Reviewer:</label>
                <input type="text" class="auth-form-control" id="authSignReviewerName" value="Supervising Physician, MD">
            </div>

            <div class="auth-form-group">
                <label class="auth-form-label">Supervisor Sign-Off Note / Addendum (Optional):</label>
                <textarea class="auth-form-control" id="authSignComments" rows="2" placeholder="e.g. Reviewed encounter findings and agreed with assessment and plan."></textarea>
            </div>

            <div style="display: flex; align-items: center; gap: 8px; margin-top: 10px;">
                <input type="checkbox" id="authSignConfirmCheckbox" checked>
                <label for="authSignConfirmCheckbox" style="font-size: 13px; font-weight: 500; cursor: pointer;">
                    I certify that I have reviewed this document and authorize this medical record.
                </label>
            </div>
        </div>
        <div class="auth-modal-footer">
            <button class="auth-btn-outline" id="authSignReturnBtn" style="color: #b91c1c; border-color: #fca5a5;">
                <i class="fas fa-undo"></i> Return for Revision
            </button>
            <button class="auth-btn-outline" id="authSignCancelBtn">Cancel</button>
            <button class="auth-btn-success" id="authSignApproveBtn">
                <i class="fas fa-check-circle"></i> Authorize & Sign
            </button>
        </div>
    </div>
</div>

<!-- MODAL: Create / Edit Prior Authorization -->
<div class="auth-modal-overlay" id="authPriorModal">
    <div class="auth-modal-box" style="max-width: 640px;">
        <div class="auth-modal-header">
            <h3 class="auth-modal-title">
                <i class="fas fa-shield-alt" style="color: #0284c7;"></i>
                <span id="authPriorModalTitle">New Prior Authorization</span>
            </h3>
            <button class="auth-modal-close" id="authPriorModalClose">&times;</button>
        </div>
        <div class="auth-modal-body">
            <input type="hidden" id="authPriorId">
            <div class="auth-form-group">
                <label class="auth-form-label">Patient *</label>
                <select class="auth-form-control" id="authPriorPatientSelect"></select>
            </div>

            <div class="auth-form-row">
                <div class="auth-form-group">
                    <label class="auth-form-label">Insurance / Payer *</label>
                    <input type="text" class="auth-form-control" id="authPriorPayerName" list="authInsuranceDatalist" placeholder="e.g. Blue Cross Blue Shield">
                    <datalist id="authInsuranceDatalist"></datalist>
                </div>
                <div class="auth-form-group">
                    <label class="auth-form-label">Authorization Number *</label>
                    <input type="text" class="auth-form-control" id="authPriorNumber" placeholder="e.g. PA-2026-99182">
                </div>
            </div>

            <div class="auth-form-row">
                <div class="auth-form-group">
                    <label class="auth-form-label">CPT / HCPCS Code</label>
                    <input type="text" class="auth-form-control" id="authPriorCpt" placeholder="e.g. 99214, 70553, 97110">
                </div>
                <div class="auth-form-group">
                    <label class="auth-form-label">Service Description *</label>
                    <input type="text" class="auth-form-control" id="authPriorService" placeholder="e.g. Office Outpatient Visit Est">
                </div>
            </div>

            <div class="auth-form-row">
                <div class="auth-form-group">
                    <label class="auth-form-label">Approved Units *</label>
                    <input type="number" class="auth-form-control" id="authPriorApprovedUnits" value="1" min="1">
                </div>
                <div class="auth-form-group">
                    <label class="auth-form-label">Used Units</label>
                    <input type="number" class="auth-form-control" id="authPriorUsedUnits" value="0" min="0">
                </div>
            </div>

            <div class="auth-form-row">
                <div class="auth-form-group">
                    <label class="auth-form-label">Effective Start Date *</label>
                    <input type="date" class="auth-form-control" id="authPriorStartDate">
                </div>
                <div class="auth-form-group">
                    <label class="auth-form-label">Expiration Date *</label>
                    <input type="date" class="auth-form-control" id="authPriorEndDate">
                </div>
            </div>

            <div class="auth-form-row">
                <div class="auth-form-group">
                    <label class="auth-form-label">Ordering / Rendering Provider</label>
                    <input type="text" class="auth-form-control" id="authPriorProvider" placeholder="e.g. Dr. John Doe, MD">
                </div>
                <div class="auth-form-group">
                    <label class="auth-form-label">Status</label>
                    <select class="auth-form-control" id="authPriorStatus">
                        <option value="Active">Active</option>
                        <option value="Pending">Pending</option>
                        <option value="Completed">Completed</option>
                        <option value="Expired">Expired</option>
                        <option value="Denied">Denied</option>
                    </select>
                </div>
            </div>

            <div class="auth-form-group">
                <label class="auth-form-label">Clinical Rationale / Notes</label>
                <textarea class="auth-form-control" id="authPriorNotes" rows="2" placeholder="Approval guidelines, criteria met, or comments..."></textarea>
            </div>
        </div>
        <div class="auth-modal-footer">
            <button class="auth-btn-outline" id="authPriorModalCancel">Cancel</button>
            <button class="auth-btn-primary" id="authPriorModalSave">Save Prior Authorization</button>
        </div>
    </div>
</div>

<!-- MODAL: Printable Prior Auth Verification Slip -->
<div class="auth-modal-overlay" id="authPrintModal">
    <div class="auth-modal-box" style="max-width: 600px;">
        <div class="auth-modal-header">
            <h3 class="auth-modal-title">
                <i class="fas fa-print" style="color: #0284c7;"></i>
                Prior Authorization Verification Slip
            </h3>
            <button class="auth-modal-close" id="authPrintModalClose">&times;</button>
        </div>
        <div class="auth-modal-body" id="authPrintSlipContent">
            <!-- Populated dynamically -->
        </div>
        <div class="auth-modal-footer">
            <button class="auth-btn-outline" id="authPrintCloseBtn">Close</button>
            <button class="auth-btn-primary" id="authPrintTriggerBtn">
                <i class="fas fa-print"></i> Print Slip
            </button>
        </div>
    </div>
</div>
`;
}
