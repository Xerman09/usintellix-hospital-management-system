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

/* ── Dark mode (List View) ─────────────────────────────────────── */
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

/* ════════════════════════════════════════════════════════════════
   ASSESSMENT MODAL DIALOG
   ════════════════════════════════════════════════════════════════ */
.cr-modal-dialog {
    max-width: 660px !important;
    width: 92% !important;
    max-height: 88vh !important;
    border-radius: 14px !important;
    overflow: hidden !important;
    display: flex !important;
    flex-direction: column !important;
    padding: 0 !important;
    background: var(--bg-surface, #ffffff) !important;
    border: 1px solid var(--border-color, #e2e8f0) !important;
    box-shadow: 0 20px 40px -8px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.05) !important;
}

/* Modal header */
.cr-modal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 24px 16px;
    background: var(--bg-surface, #ffffff);
    border-bottom: 1px solid var(--border-color, #e2e8f0);
    flex-shrink: 0;
}

.cr-modal-head-left {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
}

.cr-modal-head-icon {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: rgba(37,99,235,.1);
    color: var(--accent, #2563eb);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.cr-modal-head-icon svg { width: 19px; height: 19px; }

.cr-modal-head-titles {
    min-width: 0;
}

.cr-modal-title {
    margin: 0;
    font-size: 16.5px;
    font-weight: 700;
    color: var(--text-primary, #1e293b);
    line-height: 1.3;
    letter-spacing: -0.2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.cr-modal-meta-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
}

.cr-modal-type-pill {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    text-transform: capitalize;
}

.cr-modal-type-pill.assessment  { background: #ede9fe; color: #7c3aed; }
.cr-modal-type-pill.measurement { background: #dbeafe; color: #2563eb; }
.cr-modal-type-pill.treatment   { background: #dcfce7; color: #15803d; }
.cr-modal-type-pill.default     { background: #f1f5f9; color: #64748b; }

.cr-modal-status-inline {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11.5px;
    font-weight: 700;
}

.cr-modal-status-inline.past_due { color: #dc2626; }
.cr-modal-status-inline.not_due  { color: #16a34a; }
.cr-modal-status-inline.due      { color: #d97706; }

.cr-modal-close-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--text-muted, #94a3b8);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 18px;
    transition: all .15s ease;
    flex-shrink: 0;
}

.cr-modal-close-btn:hover {
    background: var(--bg-surface-alt, #f1f5f9);
    color: var(--text-primary, #1e293b);
}

/* Modal scrollable body */
.cr-modal-scrollable-body {
    padding: 20px 24px;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
}

/* Entry card container */
.cr-entry-card {
    background: var(--bg-surface-alt, #f8fafc);
    border: 1px solid var(--border-color, #e2e8f0);
    border-radius: 10px;
    padding: 16px 18px;
    margin-bottom: 22px;
}

.cr-entry-card-title {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--text-primary, #1e293b);
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 12px;
}

.cr-entry-card-title svg {
    color: var(--accent, #2563eb);
    width: 14px;
    height: 14px;
}

.cr-form-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin-bottom: 12px;
}

.cr-field-label {
    display: block;
    font-size: 11.5px;
    font-weight: 700;
    color: var(--text-muted, #64748b);
    text-transform: uppercase;
    letter-spacing: 0.3px;
    margin-bottom: 5px;
}

.cr-field-label.required::after {
    content: " *";
    color: #ef4444;
}

.cr-modal-input {
    width: 100% !important;
    box-sizing: border-box !important;
    height: 38px !important;
    padding: 0 12px !important;
    border-radius: 8px !important;
    border: 1px solid var(--border-color, #cbd5e1) !important;
    background: var(--bg-surface, #ffffff) !important;
    color: var(--text-primary, #1e293b) !important;
    font-size: 13px !important;
    font-family: inherit !important;
    outline: none !important;
    transition: border-color .15s, box-shadow .15s !important;
}

.cr-modal-input:focus {
    border-color: var(--accent, #2563eb) !important;
    box-shadow: 0 0 0 3px rgba(37,99,235,.15) !important;
}

.cr-modal-textarea {
    width: 100% !important;
    box-sizing: border-box !important;
    min-height: 70px !important;
    padding: 9px 12px !important;
    border-radius: 8px !important;
    border: 1px solid var(--border-color, #cbd5e1) !important;
    background: var(--bg-surface, #ffffff) !important;
    color: var(--text-primary, #1e293b) !important;
    font-size: 13px !important;
    font-family: inherit !important;
    outline: none !important;
    resize: vertical !important;
    transition: border-color .15s, box-shadow .15s !important;
}

.cr-modal-textarea:focus {
    border-color: var(--accent, #2563eb) !important;
    box-shadow: 0 0 0 3px rgba(37,99,235,.15) !important;
}

.cr-entry-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 12px;
}

.cr-btn-save {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    padding: 0 16px;
    border-radius: 8px;
    border: none;
    background: var(--accent, #2563eb);
    color: #ffffff;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: background .15s, transform .05s;
}

.cr-btn-save:hover {
    background: var(--accent-hover, #1d4ed8);
}

.cr-btn-save:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.cr-btn-cancel {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 34px;
    padding: 0 14px;
    border-radius: 8px;
    border: 1px solid var(--border-color, #cbd5e1);
    background: transparent;
    color: var(--text-muted, #64748b);
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: all .15s;
}

.cr-btn-cancel:hover {
    background: var(--bg-surface, #ffffff);
    color: var(--text-primary, #1e293b);
}

/* History Section */
.cr-history-wrap {
    border-top: 1px solid var(--border-color, #e2e8f0);
    padding-top: 16px;
}

.cr-history-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
}

.cr-history-title-row h3 {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: var(--text-primary, #1e293b);
    display: flex;
    align-items: center;
    gap: 6px;
}

.cr-history-badge {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 20px;
    background: var(--bg-surface-alt, #f1f5f9);
    color: var(--text-muted, #64748b);
    border: 1px solid var(--border-color, #e2e8f0);
}

/* Timeline */
.cr-timeline {
    display: flex;
    flex-direction: column;
    gap: 0;
}

.cr-timeline-item {
    display: flex;
    gap: 12px;
    position: relative;
    padding-bottom: 14px;
}

.cr-timeline-item:last-child { padding-bottom: 0; }

.cr-timeline-line {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    width: 22px;
}

.cr-timeline-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    border: 2px solid var(--accent, #2563eb);
    background: var(--bg-surface, #ffffff);
    flex-shrink: 0;
    margin-top: 4px;
}

.cr-timeline-connector {
    flex: 1;
    width: 2px;
    background: var(--border-color, #e2e8f0);
    margin-top: 3px;
}

.cr-timeline-item:last-child .cr-timeline-connector { display: none; }

.cr-timeline-body {
    flex: 1;
    min-width: 0;
}

.cr-timeline-date {
    font-size: 11px;
    color: var(--text-muted, #64748b);
    font-weight: 600;
    margin-bottom: 4px;
}

.cr-timeline-card {
    background: var(--bg-surface-alt, #f8fafc);
    border: 1px solid var(--border-color, #e2e8f0);
    border-radius: 8px;
    padding: 8px 12px;
    display: flex;
    align-items: flex-start;
    gap: 8px;
}

.cr-timeline-completed {
    font-size: 10.5px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 20px;
    white-space: nowrap;
    flex-shrink: 0;
}

.cr-timeline-completed.yes { background: #dcfce7; color: #15803d; }
.cr-timeline-completed.no  { background: #fee2e2; color: #b91c1c; }

.cr-timeline-details {
    font-size: 12px;
    color: var(--text-primary, #1e293b);
    flex: 1;
    min-width: 0;
    word-break: break-word;
    line-height: 1.4;
}

.cr-timeline-empty {
    font-size: 12.5px;
    color: var(--text-muted, #94a3b8);
    padding: 12px 0;
    text-align: center;
    margin: 0;
}

/* Modal Footer */
.cr-modal-footer {
    display: flex;
    justify-content: flex-end;
    padding: 12px 24px;
    background: var(--bg-surface, #ffffff);
    border-top: 1px solid var(--border-color, #e2e8f0);
    flex-shrink: 0;
}

.cr-btn-close-modal {
    height: 34px;
    padding: 0 18px;
    border-radius: 8px;
    border: 1px solid var(--border-color, #cbd5e1);
    background: var(--bg-surface-alt, #f8fafc);
    color: var(--text-primary, #1e293b);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all .15s ease;
}

.cr-btn-close-modal:hover {
    background: var(--bg-surface, #e2e8f0);
    border-color: var(--accent, #2563eb);
}

/* ── Dark Mode Overrides (Modal) ───────────────────────────────── */
:root[data-theme="dark"] .cr-modal-dialog {
    background: var(--bg-surface, #1e293b) !important;
    border-color: var(--border-color, #334155) !important;
    box-shadow: 0 20px 45px -8px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.06) !important;
}

:root[data-theme="dark"] .cr-modal-head {
    background: var(--bg-surface, #1e293b);
    border-bottom-color: var(--border-color, #334155);
}

:root[data-theme="dark"] .cr-modal-title {
    color: var(--text-primary, #f1f5f9);
}

:root[data-theme="dark"] .cr-modal-close-btn:hover {
    background: var(--bg-surface-alt, #334155);
    color: var(--text-primary, #f1f5f9);
}

:root[data-theme="dark"] .cr-modal-head-icon {
    background: rgba(37,99,235,.2);
    color: #60a5fa;
}

:root[data-theme="dark"] .cr-modal-type-pill.assessment  { background: rgba(124,58,237,.25); color: #c4b5fd; }
:root[data-theme="dark"] .cr-modal-type-pill.measurement { background: rgba(37,99,235,.25);  color: #93c5fd; }
:root[data-theme="dark"] .cr-modal-type-pill.treatment   { background: rgba(21,128,61,.25);  color: #86efac; }
:root[data-theme="dark"] .cr-modal-type-pill.default     { background: rgba(148,163,184,.15); color: #94a3b8; }

:root[data-theme="dark"] .cr-modal-status-inline.past_due { color: #f87171; }
:root[data-theme="dark"] .cr-modal-status-inline.not_due  { color: #4ade80; }
:root[data-theme="dark"] .cr-modal-status-inline.due      { color: #fbbf24; }

:root[data-theme="dark"] .cr-entry-card {
    background: var(--bg-surface-alt, #0f172a);
    border-color: var(--border-color, #334155);
}

:root[data-theme="dark"] .cr-entry-card-title {
    color: var(--text-primary, #f1f5f9);
}

:root[data-theme="dark"] .cr-field-label {
    color: var(--text-muted, #94a3b8);
}

:root[data-theme="dark"] .cr-modal-input,
:root[data-theme="dark"] .cr-modal-textarea {
    background: var(--bg-surface, #1e293b) !important;
    border-color: var(--border-color, #334155) !important;
    color: var(--text-primary, #f1f5f9) !important;
}

:root[data-theme="dark"] .cr-modal-input:focus,
:root[data-theme="dark"] .cr-modal-textarea:focus {
    border-color: var(--accent, #3b82f6) !important;
    box-shadow: 0 0 0 3px rgba(59,130,246,.25) !important;
}

:root[data-theme="dark"] .cr-btn-cancel {
    border-color: var(--border-color, #334155);
    color: var(--text-muted, #94a3b8);
}

:root[data-theme="dark"] .cr-btn-cancel:hover {
    background: var(--bg-surface, #1e293b);
    color: var(--text-primary, #f1f5f9);
}

:root[data-theme="dark"] .cr-history-wrap {
    border-top-color: var(--border-color, #334155);
}

:root[data-theme="dark"] .cr-history-title-row h3 {
    color: var(--text-primary, #f1f5f9);
}

:root[data-theme="dark"] .cr-history-badge {
    background: var(--bg-surface-alt, #0f172a);
    color: var(--text-muted, #94a3b8);
    border-color: var(--border-color, #334155);
}

:root[data-theme="dark"] .cr-timeline-dot {
    background: var(--bg-surface, #1e293b);
}

:root[data-theme="dark"] .cr-timeline-connector {
    background: var(--border-color, #334155);
}

:root[data-theme="dark"] .cr-timeline-card {
    background: var(--bg-surface-alt, #0f172a);
    border-color: var(--border-color, #334155);
}

:root[data-theme="dark"] .cr-timeline-completed.yes { background: rgba(22,163,74,.2); color: #86efac; }
:root[data-theme="dark"] .cr-timeline-completed.no  { background: rgba(220,38,38,.2); color: #fca5a5; }
:root[data-theme="dark"] .cr-timeline-details { color: var(--text-primary, #f1f5f9); }
:root[data-theme="dark"] .cr-timeline-empty   { color: var(--text-muted, #94a3b8); }

:root[data-theme="dark"] .cr-modal-footer {
    background: var(--bg-surface, #1e293b);
    border-top-color: var(--border-color, #334155);
}

:root[data-theme="dark"] .cr-btn-close-modal {
    background: var(--bg-surface-alt, #0f172a);
    border-color: var(--border-color, #334155);
    color: var(--text-primary, #f1f5f9);
}

:root[data-theme="dark"] .cr-btn-close-modal:hover {
    background: var(--bg-surface, #1e293b);
    border-color: var(--accent, #3b82f6);
}
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

<!-- Assessment / Reminder Entry Modal -->
<div class="modal-overlay" id="crReminderFormModalOverlay">
    <div class="modal-box cr-modal-dialog">
        <!-- Header -->
        <div class="cr-modal-head">
            <div class="cr-modal-head-left">
                <div class="cr-modal-head-icon" id="crModalHeadIcon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4"/><rect x="3" y="3" width="18" height="18" rx="3"/></svg>
                </div>
                <div class="cr-modal-head-titles">
                    <h2 class="cr-modal-title" id="crReminderFormTitle">Assessment</h2>
                    <div class="cr-modal-meta-row">
                        <span class="cr-modal-type-pill assessment" id="crModalTypePill">Assessment</span>
                        <span class="cr-modal-status-inline not_due" id="crModalStatusInline">
                            <svg width="7" height="7" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="currentColor"/></svg>
                            Not Due
                        </span>
                    </div>
                </div>
            </div>
            <button type="button" class="cr-modal-close-btn" id="closeCrReminderFormModal" title="Close dialog">&times;</button>
        </div>

        <!-- Scrollable Body -->
        <div class="cr-modal-scrollable-body">
            <!-- Composer Card -->
            <form id="crReminderForm" onsubmit="event.preventDefault();" class="cr-entry-card">
                <div class="cr-entry-card-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    Record Clinical Action
                </div>

                <div class="cr-form-grid-2">
                    <div>
                        <label class="cr-field-label required">Date / Time</label>
                        <input type="datetime-local" class="cr-modal-input" id="crReminderDate" required>
                    </div>
                    <div>
                        <label class="cr-field-label required">Completed</label>
                        <select class="cr-modal-input" id="crReminderCompleted" required>
                            <option value="yes">YES</option>
                            <option value="no">NO</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label class="cr-field-label">Results / Details</label>
                    <textarea class="cr-modal-textarea" id="crReminderDetails" placeholder="Enter findings, discussion notes, referral status, or clinical measurements..."></textarea>
                </div>

                <div class="cr-entry-actions">
                    <button type="button" class="cr-btn-cancel" id="crReminderFormCancelBtn">Clear</button>
                    <button type="button" class="cr-btn-save" id="crReminderFormSaveBtn">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Save Entry
                    </button>
                </div>
            </form>

            <!-- History Section -->
            <div class="cr-history-wrap">
                <div class="cr-history-title-row">
                    <h3>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-muted);"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        Past Actions &amp; History
                    </h3>
                    <span class="cr-history-badge" id="crReminderHistoryCount">0 records</span>
                </div>
                <div class="cr-timeline" id="crReminderTimeline">
                    <p class="cr-timeline-empty">Loading...</p>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="cr-modal-footer">
            <button type="button" class="cr-btn-close-modal" id="closeCrReminderFormModalBottom">Close</button>
        </div>
    </div>
</div>
`;
}
