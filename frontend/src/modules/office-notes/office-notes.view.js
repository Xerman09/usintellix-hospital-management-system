/**
 * Office Notes View
 * OpenEMR-style Office Notes manager with active patient scoping,
 * clinic-wide queue toggle, note creation, editing, active status toggle,
 * and complete Light & Dark mode support.
 */
export function OfficeNotesView() {
    return `
<style>
.on-wrapper {
    padding: 24px;
    max-width: 1300px;
    margin: 0 auto;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    color: var(--text-primary, #1e293b);
}

/* Scope Banner */
.on-scope-banner {
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
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

:root[data-theme="dark"] .on-scope-banner {
    background: #1e293b;
    border-color: #334155;
    color: #f1f5f9;
}

.on-patient-info {
    display: flex;
    align-items: center;
    gap: 14px;
}

.on-patient-avatar {
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
    box-shadow: 0 2px 4px rgba(2, 132, 199, 0.25);
}

.on-patient-name {
    font-size: 17px;
    font-weight: 600;
    color: var(--text-primary, #0f172a);
    margin: 0 0 2px 0;
}

:root[data-theme="dark"] .on-patient-name {
    color: #f8fafc;
}

.on-patient-meta {
    font-size: 12.5px;
    color: #64748b;
    margin: 0;
}

:root[data-theme="dark"] .on-patient-meta {
    color: #94a3b8;
}

.on-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 9999px;
}

.on-badge-active {
    color: #15803d;
    background: rgba(34, 197, 94, 0.14);
}

:root[data-theme="dark"] .on-badge-active {
    color: #4ade80;
    background: rgba(34, 197, 94, 0.2);
}

.on-badge-all {
    color: #4338ca;
    background: rgba(99, 102, 241, 0.14);
}

:root[data-theme="dark"] .on-badge-all {
    color: #a5b4fc;
    background: rgba(99, 102, 241, 0.2);
}

.on-scope-btn {
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

:root[data-theme="dark"] .on-scope-btn {
    background: #334155;
    border-color: #475569;
    color: #e2e8f0;
}

.on-scope-btn:hover {
    background: #f1f5f9;
    border-color: #94a3b8;
}

:root[data-theme="dark"] .on-scope-btn:hover {
    background: #475569;
}

/* Hero Header */
.on-hero {
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

:root[data-theme="dark"] .on-hero {
    background: #1e293b;
    border-color: #334155;
}

.on-hero-title {
    font-size: 20px;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 4px 0;
    display: flex;
    align-items: center;
    gap: 10px;
}

:root[data-theme="dark"] .on-hero-title {
    color: #f8fafc;
}

.on-hero-sub {
    font-size: 13.5px;
    color: #64748b;
    margin: 0;
}

:root[data-theme="dark"] .on-hero-sub {
    color: #94a3b8;
}

/* Toolbar */
.on-toolbar {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px 8px 0 0;
    padding: 14px 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
}

:root[data-theme="dark"] .on-toolbar {
    background: #1e293b;
    border-color: #334155;
}

.on-filter-left {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

.on-input, .on-select {
    padding: 7px 12px;
    font-size: 13px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    background: #ffffff;
    color: #1e293b;
    outline: none;
    transition: border-color 0.15s ease;
}

:root[data-theme="dark"] .on-input,
:root[data-theme="dark"] .on-select {
    background: #0f172a;
    border-color: #334155;
    color: #f1f5f9;
}

.on-input:focus, .on-select:focus {
    border-color: #0284c7;
}

.on-btn-primary {
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

.on-btn-primary:hover {
    background: #0369a1;
}

.on-btn-outline {
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

:root[data-theme="dark"] .on-btn-outline {
    color: #cbd5e1;
    border-color: #475569;
}

.on-btn-outline:hover {
    background: #f1f5f9;
    color: #0f172a;
}

:root[data-theme="dark"] .on-btn-outline:hover {
    background: #334155;
    color: #f8fafc;
}

/* Data Table Card */
.on-table-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-top: none;
    border-radius: 0 0 8px 8px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

:root[data-theme="dark"] .on-table-card {
    background: #1e293b;
    border-color: #334155;
}

.on-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
    font-size: 13px;
}

.on-table th {
    background: #f8fafc;
    color: #475569;
    font-weight: 600;
    padding: 11px 16px;
    border-bottom: 1px solid #e2e8f0;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
}

:root[data-theme="dark"] .on-table th {
    background: #0f172a;
    color: #94a3b8;
    border-bottom-color: #334155;
}

.on-table td {
    padding: 14px 16px;
    border-bottom: 1px solid #f1f5f9;
    color: #1e293b;
    vertical-align: top;
}

:root[data-theme="dark"] .on-table td {
    border-bottom-color: #334155;
    color: #e2e8f0;
}

.on-table tr:hover td {
    background: #f8fafc;
}

:root[data-theme="dark"] .on-table tr:hover td {
    background: #253347;
}

/* Status Tags */
.on-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 9px;
    border-radius: 9999px;
    font-size: 11.5px;
    font-weight: 600;
}

.on-tag-active {
    background: #dcfce7;
    color: #15803d;
}

:root[data-theme="dark"] .on-tag-active {
    background: rgba(34, 197, 94, 0.2);
    color: #4ade80;
}

.on-tag-inactive {
    background: #f1f5f9;
    color: #64748b;
}

:root[data-theme="dark"] .on-tag-inactive {
    background: rgba(100, 116, 139, 0.25);
    color: #94a3b8;
}

/* Modals */
.on-modal-overlay {
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

.on-modal-box {
    background: #ffffff;
    border-radius: 10px;
    width: 100%;
    max-width: 580px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.08);
    overflow: hidden;
}

:root[data-theme="dark"] .on-modal-box {
    background: #1e293b;
    border: 1px solid #334155;
}

.on-modal-header {
    padding: 16px 20px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

:root[data-theme="dark"] .on-modal-header {
    border-bottom-color: #334155;
}

.on-modal-title {
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
}

:root[data-theme="dark"] .on-modal-title {
    color: #f8fafc;
}

.on-modal-close {
    background: transparent;
    border: none;
    font-size: 20px;
    color: #64748b;
    cursor: pointer;
    line-height: 1;
}

.on-modal-body {
    padding: 20px;
}

.on-modal-footer {
    padding: 14px 20px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    background: #f8fafc;
}

:root[data-theme="dark"] .on-modal-footer {
    border-top-color: #334155;
    background: #0f172a;
}

.on-form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 16px;
}

.on-form-label {
    font-size: 13px;
    font-weight: 600;
    color: #475569;
}

:root[data-theme="dark"] .on-form-label {
    color: #94a3b8;
}

.on-form-control {
    padding: 9px 12px;
    font-size: 13.5px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    background: #ffffff;
    color: #0f172a;
    outline: none;
}

:root[data-theme="dark"] .on-form-control {
    background: #0f172a;
    border-color: #334155;
    color: #f8fafc;
}
</style>

<div class="on-wrapper">
    <!-- Active Patient Scope Banner -->
    <div class="on-scope-banner" id="onScopeBanner">
        <div class="on-patient-info" id="onPatientInfo">
            <div class="on-patient-avatar" id="onPatientAvatar">DA</div>
            <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <h3 class="on-patient-name" id="onPatientName">Doc Ako</h3>
                    <span class="on-badge on-badge-active" id="onPatientBadge">
                        <span style="width:6px; height:6px; border-radius:50%; background:currentColor;"></span>
                        Active Open Patient
                    </span>
                </div>
                <p class="on-patient-meta" id="onPatientMeta">Chart: PAT-000004 | DOB: 2026-07-02 | Sex: Male</p>
            </div>
        </div>
        <div>
            <button class="on-scope-btn" id="onToggleScopeBtn" title="Toggle between Active Patient and All Patient Notes">
                <i class="fas fa-users"></i>
                <span id="onToggleScopeLabel">View All Patients Notes</span>
            </button>
        </div>
    </div>

    <!-- Hero Header -->
    <div class="on-hero">
        <div>
            <h1 class="on-hero-title">
                <i class="fas fa-sticky-note" style="color: #0284c7;"></i>
                Office Notes
            </h1>
            <p class="on-hero-sub">Administrative, scheduling, and clinical communication notes attached to patient records</p>
        </div>
        <div>
            <button class="on-btn-primary" id="onNewNoteBtn">
                <i class="fas fa-plus-circle"></i> Add Office Note
            </button>
        </div>
    </div>

    <!-- Toolbar & Filters -->
    <div class="on-toolbar">
        <div class="on-filter-left">
            <div style="position: relative;">
                <i class="fas fa-search" style="position: absolute; left: 10px; top: 10px; color: #94a3b8; font-size: 12px;"></i>
                <input type="text" class="on-input" id="onSearchInput" placeholder="Search notes, author, patient..." style="padding-left: 28px; width: 260px;">
            </div>
            <select class="on-select" id="onStatusFilter">
                <option value="active">Active Notes Only</option>
                <option value="all">All Notes (Active & Inactive)</option>
                <option value="inactive">Inactive Only</option>
            </select>
            <button class="on-btn-outline" id="onRefreshBtn" title="Refresh Notes">
                <i class="fas fa-sync-alt"></i> Refresh
            </button>
        </div>
        <div style="font-size: 13px; color: #64748b;" id="onTotalCountLabel">
            Showing notes...
        </div>
    </div>

    <!-- Data Table Card -->
    <div class="on-table-card">
        <table class="on-table">
            <thead>
                <tr>
                    <th style="width: 150px;">Date / Time</th>
                    <th style="width: 180px;">Patient</th>
                    <th style="width: 130px;">Author</th>
                    <th>Office Note Content</th>
                    <th style="width: 90px; text-align: center;">Status</th>
                    <th style="width: 140px; text-align: right;">Actions</th>
                </tr>
            </thead>
            <tbody id="onTableBody">
                <tr><td colspan="6" style="text-align: center; padding: 40px; color: #94a3b8;">Loading office notes...</td></tr>
            </tbody>
        </table>
    </div>
</div>

<!-- MODAL: Add / Edit Office Note -->
<div class="on-modal-overlay" id="onNoteModal">
    <div class="on-modal-box">
        <div class="on-modal-header">
            <h3 class="on-modal-title">
                <i class="fas fa-edit" style="color: #0284c7;"></i>
                <span id="onModalTitle">Add Office Note</span>
            </h3>
            <button class="on-modal-close" id="onModalClose">&times;</button>
        </div>
        <div class="on-modal-body">
            <input type="hidden" id="onNoteId">
            <div class="on-form-group">
                <label class="on-form-label">Patient *</label>
                <select class="on-form-control" id="onModalPatientSelect"></select>
            </div>
            <div class="on-form-group">
                <label class="on-form-label">Office Note Content *</label>
                <textarea class="on-form-control" id="onModalNoteText" rows="5" placeholder="Enter details regarding patient communication, records release, phone messages, or front desk follow-ups..."></textarea>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 12px;">
                <input type="checkbox" id="onModalActiveCb" checked>
                <label for="onModalActiveCb" style="font-size: 13px; font-weight: 500; cursor: pointer;">
                    Active note (displayed on patient dashboard)
                </label>
            </div>
        </div>
        <div class="on-modal-footer">
            <button class="on-btn-outline" id="onModalCancelBtn">Cancel</button>
            <button class="on-btn-primary" id="onModalSaveBtn">
                <i class="fas fa-save"></i> Save Office Note
            </button>
        </div>
    </div>
</div>
`;
}
