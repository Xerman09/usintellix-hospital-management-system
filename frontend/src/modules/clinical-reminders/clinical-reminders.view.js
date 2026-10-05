export function ClinicalRemindersView()
{
    return `
<style>
/* ── Page shell ──────────────────────────────────────────────── */
.cr-page {
    width: 100%;
    font-size: 13.5px;
}

/* ── Toolbar ─────────────────────────────────────────────────── */
.cr-toolbar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 20px;
    flex-wrap: wrap;
}

.cr-title-block h1 {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    color: var(--text-primary, #1a2338);
    letter-spacing: -0.3px;
}

.cr-title-block p {
    margin: 4px 0 0;
    font-size: 13px;
    color: var(--text-muted, #64748b);
}

.cr-patient-link {
    background: none;
    border: none;
    padding: 0;
    color: var(--accent, #2563eb);
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
}

.cr-patient-link:hover { text-decoration: underline; }

.cr-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    padding: 0 14px;
    border-radius: 8px;
    border: 1px solid var(--border-color, #d1d5db);
    background: var(--bg-surface-alt, #f8fafc);
    color: var(--text-primary, #1a2338);
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    transition: background .15s, border-color .15s;
    white-space: nowrap;
}

.cr-back-btn:hover {
    background: var(--bg-surface, #eef1f5);
    border-color: var(--accent, #2563eb);
}

.cr-back-btn svg { width: 14px; height: 14px; flex-shrink: 0; }

/* ── Tabs ────────────────────────────────────────────────────── */
.cr-tabs {
    display: flex;
    gap: 2px;
    border-bottom: 2px solid var(--border-color, #e2e8f0);
    margin-bottom: 0;
}

.cr-tab {
    padding: 9px 22px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    border-radius: 6px 6px 0 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-muted, #64748b);
    cursor: pointer;
    transition: color .15s, border-color .15s;
}

.cr-tab:hover { color: var(--text-primary, #1a2338); }

.cr-tab.active {
    color: var(--accent, #2563eb);
    border-bottom-color: var(--accent, #2563eb);
    background: transparent;
}

/* ── Panel wrapper ───────────────────────────────────────────── */
.cr-panel-wrap {
    background: var(--bg-surface, #fff);
    border: 1px solid var(--border-color, #e2e8f0);
    border-top: none;
    border-radius: 0 0 10px 10px;
    padding: 20px 18px 18px;
    min-height: 120px;
}

.cr-panel { display: none; }
.cr-panel.active { display: block; }

/* ── Reminder list items ─────────────────────────────────────── */
.cr-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.cr-list-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 14px;
    border-radius: 8px;
    border: 1px solid var(--border-color, #e2e8f0);
    background: var(--bg-surface, #fff);
    transition: border-color .15s, box-shadow .15s;
}

.cr-list-item:hover {
    border-color: var(--accent, #2563eb);
    box-shadow: 0 0 0 3px rgba(37,99,235,.07);
}

/* category icon pill */
.cr-item-type-icon {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.cr-item-type-icon svg { width: 16px; height: 16px; }

.cr-item-type-icon.assessment  { background: #ede9fe; color: #7c3aed; }
.cr-item-type-icon.measurement { background: #dbeafe; color: #2563eb; }
.cr-item-type-icon.treatment   { background: #dcfce7; color: #15803d; }
.cr-item-type-icon.default     { background: #f1f5f9; color: #64748b; }

/* item label & meta */
.cr-item-info { flex: 1; min-width: 0; }

.cr-item-link {
    background: none;
    border: none;
    padding: 0;
    text-align: left;
    color: var(--text-primary, #1a2338);
    font-size: 13.5px;
    font-weight: 600;
    cursor: pointer;
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
}

.cr-item-link.clickable { color: var(--accent, #2563eb); }
.cr-item-link.clickable:hover { text-decoration: underline; }

.cr-item-category {
    font-size: 11.5px;
    color: var(--text-muted, #64748b);
    margin-top: 2px;
}

/* status pill */
.cr-status-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 11.5px;
    font-weight: 700;
    white-space: nowrap;
    flex-shrink: 0;
}

.cr-status-pill.past_due {
    background: #fee2e2;
    color: #b91c1c;
    border: 1px solid #fca5a5;
}

.cr-status-pill.not_due {
    background: #dcfce7;
    color: #15803d;
    border: 1px solid #86efac;
}

.cr-status-pill.due {
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #fcd34d;
}

.cr-status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    flex-shrink: 0;
}

/* action chevron */
.cr-item-chevron {
    color: var(--text-muted, #94a3b8);
    flex-shrink: 0;
    opacity: .6;
}

.cr-item-chevron svg { width: 14px; height: 14px; display: block; }

/* empty / placeholder */
.cr-empty,
.cr-placeholder {
    margin: 0;
    padding: 20px 4px;
    color: var(--text-muted, #71809b);
    font-size: 13px;
}

/* ── Dark mode ───────────────────────────────────────────────── */
:root[data-theme="dark"] .cr-title-block h1 { color: var(--text-primary); }
:root[data-theme="dark"] .cr-title-block p  { color: var(--text-muted); }
:root[data-theme="dark"] .cr-back-btn       { background: var(--bg-surface-alt); border-color: var(--border-color); color: var(--text-primary); }
:root[data-theme="dark"] .cr-back-btn:hover { background: var(--bg-surface); }
:root[data-theme="dark"] .cr-tab            { color: var(--text-muted); }
:root[data-theme="dark"] .cr-tab:hover      { color: var(--text-primary); }
:root[data-theme="dark"] .cr-tab.active     { color: var(--accent); }
:root[data-theme="dark"] .cr-panel-wrap     { background: var(--bg-surface); border-color: var(--border-color); }
:root[data-theme="dark"] .cr-list-item      { background: var(--bg-surface); border-color: var(--border-color); }
:root[data-theme="dark"] .cr-item-link      { color: var(--text-primary); }
:root[data-theme="dark"] .cr-item-link.clickable { color: var(--accent); }
:root[data-theme="dark"] .cr-item-category  { color: var(--text-muted); }
:root[data-theme="dark"] .cr-item-type-icon.assessment  { background: rgba(124,58,237,.2);  color: #c4b5fd; }
:root[data-theme="dark"] .cr-item-type-icon.measurement { background: rgba(37,99,235,.2);   color: #93c5fd; }
:root[data-theme="dark"] .cr-item-type-icon.treatment   { background: rgba(21,128,61,.2);   color: #86efac; }
:root[data-theme="dark"] .cr-item-type-icon.default     { background: var(--bg-surface-alt); color: var(--text-muted); }
:root[data-theme="dark"] .cr-status-pill.past_due { background: rgba(185,28,28,.2); color: #fca5a5; border-color: rgba(252,165,165,.3); }
:root[data-theme="dark"] .cr-status-pill.not_due  { background: rgba(21,128,61,.2); color: #86efac; border-color: rgba(134,239,172,.3); }
:root[data-theme="dark"] .cr-status-pill.due      { background: rgba(146,64,14,.2); color: #fcd34d; border-color: rgba(252,211,77,.3); }
:root[data-theme="dark"] .cr-empty,
:root[data-theme="dark"] .cr-placeholder { color: var(--text-muted); }

/* ── Assessment modal overrides ──────────────────────────────── */
.cr-modal-header-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 28px 16px;
    border-bottom: 1px solid var(--border-color, #e2e8f0);
    margin-bottom: 20px;
}

.cr-modal-type-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 11.5px;
    font-weight: 700;
}

.cr-modal-type-pill.assessment  { background: #ede9fe; color: #7c3aed; }
.cr-modal-type-pill.measurement { background: #dbeafe; color: #2563eb; }
.cr-modal-type-pill.treatment   { background: #dcfce7; color: #15803d; }

.cr-modal-status-inline {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    font-weight: 700;
}

.cr-modal-status-inline.past_due { color: #b91c1c; }
.cr-modal-status-inline.not_due  { color: #15803d; }
.cr-modal-status-inline.due      { color: #92400e; }

:root[data-theme="dark"] .cr-modal-header-meta { border-bottom-color: var(--border-color); }
:root[data-theme="dark"] .cr-modal-type-pill.assessment  { background: rgba(124,58,237,.2); color: #c4b5fd; }
:root[data-theme="dark"] .cr-modal-type-pill.measurement { background: rgba(37,99,235,.2);  color: #93c5fd; }
:root[data-theme="dark"] .cr-modal-type-pill.treatment   { background: rgba(21,128,61,.2);  color: #86efac; }

/* ── History timeline ────────────────────────────────────────── */
.cr-history-section {
    margin-top: 24px;
    border-top: 1px solid var(--border-color, #e2e8f0);
    padding-top: 18px;
}

.cr-history-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
}

.cr-history-header h3 {
    margin: 0;
    font-size: 13.5px;
    font-weight: 700;
    color: var(--text-primary, #1a2338);
}

.cr-history-count {
    font-size: 11.5px;
    color: var(--text-muted, #64748b);
    background: var(--bg-surface-alt, #f1f5f9);
    padding: 2px 8px;
    border-radius: 20px;
    font-weight: 600;
}

.cr-timeline {
    display: flex;
    flex-direction: column;
    gap: 0;
}

.cr-timeline-item {
    display: flex;
    gap: 14px;
    position: relative;
    padding-bottom: 16px;
}

.cr-timeline-item:last-child { padding-bottom: 0; }

.cr-timeline-line {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    width: 28px;
}

.cr-timeline-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid var(--accent, #2563eb);
    background: var(--bg-surface, #fff);
    flex-shrink: 0;
    margin-top: 3px;
}

.cr-timeline-connector {
    flex: 1;
    width: 2px;
    background: var(--border-color, #e2e8f0);
    margin-top: 4px;
}

.cr-timeline-item:last-child .cr-timeline-connector { display: none; }

.cr-timeline-body {
    flex: 1;
    min-width: 0;
    padding-bottom: 2px;
}

.cr-timeline-date {
    font-size: 11.5px;
    color: var(--text-muted, #64748b);
    font-weight: 600;
    margin-bottom: 4px;
}

.cr-timeline-card {
    background: var(--bg-surface-alt, #f8fafc);
    border: 1px solid var(--border-color, #e2e8f0);
    border-radius: 8px;
    padding: 10px 12px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
}

.cr-timeline-completed {
    font-size: 11.5px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 20px;
    white-space: nowrap;
    flex-shrink: 0;
}

.cr-timeline-completed.yes { background: #dcfce7; color: #15803d; }
.cr-timeline-completed.no  { background: #fee2e2; color: #b91c1c; }

.cr-timeline-details {
    font-size: 12.5px;
    color: var(--text-primary, #1a2338);
    flex: 1;
    min-width: 0;
    word-break: break-word;
}

.cr-timeline-empty {
    font-size: 13px;
    color: var(--text-muted, #64748b);
    padding: 10px 0;
    text-align: center;
}

:root[data-theme="dark"] .cr-history-section { border-top-color: var(--border-color); }
:root[data-theme="dark"] .cr-history-count   { background: var(--bg-surface-alt); color: var(--text-muted); }
:root[data-theme="dark"] .cr-timeline-dot    { background: var(--bg-surface); }
:root[data-theme="dark"] .cr-timeline-connector { background: var(--border-color); }
:root[data-theme="dark"] .cr-timeline-card   { background: var(--bg-surface-alt); border-color: var(--border-color); }
:root[data-theme="dark"] .cr-timeline-completed.yes { background: rgba(21,128,61,.2); color: #86efac; }
:root[data-theme="dark"] .cr-timeline-completed.no  { background: rgba(185,28,28,.2); color: #fca5a5; }
:root[data-theme="dark"] .cr-timeline-details { color: var(--text-primary); }
</style>

<div class="cr-page">
    <div class="cr-toolbar">
        <div class="cr-title-block">
            <h1>Clinical Reminders</h1>
            <p>for <button type="button" class="cr-patient-link" id="crPatientLink">...</button></p>
        </div>
        <button type="button" class="cr-back-btn" id="crBackBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"></path></svg>
            Back To Patient
        </button>
    </div>

    <div class="cr-tabs">
        <button type="button" class="cr-tab active" data-cr-tab="main">Main</button>
        <button type="button" class="cr-tab" data-cr-tab="plans">Plans</button>
        <button type="button" class="cr-tab" data-cr-tab="admin">Admin</button>
    </div>

    <div class="cr-panel-wrap">
        <div class="cr-panel active" data-cr-panel="main">
            <ul class="cr-list" id="crRemindersList">
                <li class="cr-empty">Loading...</li>
            </ul>
        </div>
        <div class="cr-panel" data-cr-panel="plans">
            <p class="cr-placeholder">No reminder plans configured. Plans are grouped under Admin &rsaquo; Practice &rsaquo; Plans Configuration.</p>
        </div>
        <div class="cr-panel" data-cr-panel="admin">
            <p class="cr-placeholder">Clinical decision rules are configured under Admin &rsaquo; Practice &rsaquo; Rules.</p>
        </div>
    </div>
</div>

<div class="modal-overlay" id="crReminderFormModalOverlay">
    <div class="modal-box" style="max-width: 640px;">
        <div class="modal-header">
            <h2 id="crReminderFormTitle">Assessment</h2>
            <button type="button" class="modal-close" id="closeCrReminderFormModal">&times;</button>
        </div>

        <div class="cr-modal-header-meta">
            <span class="cr-modal-type-pill assessment" id="crModalTypePill">Assessment</span>
            <span class="cr-modal-status-inline not_due" id="crModalStatusInline">
                <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="currentColor"/></svg>
                Not Due
            </span>
        </div>

        <form id="crReminderForm" onsubmit="event.preventDefault();" style="padding: 0 28px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                <div class="form-group" style="margin:0;">
                    <label class="form-label required">Date / Time</label>
                    <input type="datetime-local" class="form-input" id="crReminderDate" required>
                </div>
                <div class="form-group" style="margin:0;">
                    <label class="form-label required">Completed</label>
                    <select class="form-input" id="crReminderCompleted" required>
                        <option value="yes">YES</option>
                        <option value="no">NO</option>
                    </select>
                </div>
            </div>

            <div class="form-group" style="margin-bottom: 18px;">
                <label class="form-label">Results / Details</label>
                <textarea class="form-input" id="crReminderDetails" style="height: 72px; resize: vertical;"></textarea>
            </div>

            <div class="form-actions" style="margin-bottom: 20px;">
                <button type="button" class="btn-secondary" id="crReminderFormCancelBtn">Cancel</button>
                <button type="button" class="btn-primary-inline" id="crReminderFormSaveBtn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:middle;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Save Entry
                </button>
            </div>
        </form>

        <div class="cr-history-section" style="padding: 18px 28px 0;">
            <div class="cr-history-header">
                <h3>History</h3>
                <span class="cr-history-count" id="crReminderHistoryCount">0 records</span>
            </div>
            <div class="cr-timeline" id="crReminderTimeline">
                <p class="cr-timeline-empty">Loading...</p>
            </div>
        </div>

        <div class="form-actions" style="margin: 20px 28px 4px; justify-content: flex-end;">
            <button type="button" class="btn-secondary" id="closeCrReminderFormModalBottom">Close</button>
        </div>
    </div>
</div>
`;
}
