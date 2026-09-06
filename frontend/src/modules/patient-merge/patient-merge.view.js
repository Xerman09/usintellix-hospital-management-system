export function PatientMergeView()
{
    return `
<style>
.pm-page {
    width: 100%;
    font-size: 13.5px;
}

.pm-page h1 {
    margin: 0 0 16px;
    font-size: 26px;
    font-weight: 400;
    color: #1a2338;
}

.pm-card {
    border: 1px solid #e5e9f0;
    border-radius: 8px;
    background: white;
    overflow: hidden;
    margin-bottom: 16px;
}

.pm-row {
    display: grid;
    grid-template-columns: 160px 280px 1fr;
    align-items: center;
    gap: 16px;
    padding: 16px 20px;
    border-bottom: 1px solid #eef1f5;
}

.pm-row:last-child {
    border-bottom: none;
}

.pm-row-label {
    font-weight: 600;
    color: #29323f;
}

.pm-picker-input {
    height: 38px;
    padding: 0 12px;
    border-radius: 6px;
    border: 1px solid #cfd4dc;
    background: #eef1f5;
    color: #71809b;
    font-size: 13px;
    cursor: pointer;
    display: flex;
    align-items: center;
}

.pm-picker-input.selected {
    background: white;
    color: #1a2338;
    border-color: var(--accent);
    font-weight: 600;
}

.pm-row-help {
    color: #4a5568;
}

.pm-actions {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
}

.pm-merge-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 38px;
    padding: 0 18px;
    border: none;
    border-radius: 6px;
    background: var(--accent);
    color: white;
    font-weight: 600;
    font-size: 13.5px;
    cursor: pointer;
}

.pm-merge-btn:hover {
    background: #1742b0;
}

.pm-merge-btn:disabled {
    background: #c3cbd8;
    cursor: not-allowed;
}

.pm-warning-box {
    background: #eef1f5;
    border-radius: 8px;
    padding: 20px 24px;
    color: #1c2534;
    line-height: 1.6;
}

.pm-warning-box strong {
    display: block;
    margin-bottom: 12px;
}

.pm-warning-box p {
    margin: 0 0 12px;
}

.pm-warning-box p:last-child {
    margin-bottom: 0;
}

/* Patient picker modal */
.pm-picker-search {
    width: 100%;
    height: 40px;
    padding: 0 14px;
    border-radius: 8px;
    border: 1.5px solid #e2e8f0;
    outline: none;
    font-size: 13.5px;
    margin-bottom: 14px;
    box-sizing: border-box;
}

.pm-picker-search:focus {
    border-color: var(--accent);
}

.pm-picker-list {
    max-height: 320px;
    overflow-y: auto;
    border: 1px solid #eef1f5;
    border-radius: 8px;
}

.pm-picker-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 14px;
    border-bottom: 1px solid #eef1f5;
    cursor: pointer;
}

.pm-picker-item:last-child {
    border-bottom: none;
}

.pm-picker-item:hover {
    background: #f1f4fa;
}

.pm-picker-item.disabled {
    cursor: not-allowed;
    opacity: .4;
}

.pm-picker-item.disabled:hover {
    background: none;
}

.pm-picker-name {
    font-weight: 600;
    color: #1a2338;
}

.pm-picker-meta {
    font-size: 12px;
    color: #71809b;
}

.pm-picker-empty {
    padding: 30px;
    text-align: center;
    color: #94a3b8;
}

/* Confirmation modal */
.pm-confirm-summary {
    background: #fef3c7;
    border: 1px solid #fde68a;
    border-radius: 8px;
    padding: 14px 16px;
    margin: 14px 0;
    font-size: 13px;
    color: #78350f;
}

.pm-confirm-summary div {
    margin-bottom: 6px;
}

.pm-confirm-summary div:last-child {
    margin-bottom: 0;
}

:root[data-theme="dark"] .pm-page h1 { color: var(--text-primary); }
:root[data-theme="dark"] .pm-card { background: var(--bg-surface); border-color: var(--border-color); }
:root[data-theme="dark"] .pm-row { border-bottom-color: var(--border-color); }
:root[data-theme="dark"] .pm-row-label { color: var(--text-primary); }
:root[data-theme="dark"] .pm-picker-input { background: var(--bg-surface-alt); color: var(--text-muted); }
:root[data-theme="dark"] .pm-picker-input.selected { background: var(--bg-surface); color: var(--text-primary); }
:root[data-theme="dark"] .pm-row-help { color: var(--text-muted); }
:root[data-theme="dark"] .pm-warning-box { background: var(--bg-surface-alt); color: var(--text-primary); }
:root[data-theme="dark"] .pm-picker-search { background: var(--bg-surface-alt); border-color: var(--border-color); color: var(--text-primary); }
:root[data-theme="dark"] .pm-picker-list { border-color: var(--border-color); }
:root[data-theme="dark"] .pm-picker-item { border-bottom-color: var(--border-color); }
:root[data-theme="dark"] .pm-picker-item:hover { background: var(--bg-surface-alt); }
:root[data-theme="dark"] .pm-picker-name { color: var(--text-primary); }
:root[data-theme="dark"] .pm-picker-meta,
:root[data-theme="dark"] .pm-picker-empty { color: var(--text-muted); }
</style>

<div class="pm-page">
    <h1>Merge Patients</h1>

    <div class="pm-card">
        <div class="pm-row">
            <div class="pm-row-label">Target Patient</div>
            <div class="pm-picker-input" id="pmTargetInput" data-role="target">(Click to select)</div>
            <div class="pm-row-help">This is the main chart that is to receive the merged data.</div>
        </div>
        <div class="pm-row">
            <div class="pm-row-label">Source Patient</div>
            <div class="pm-picker-input" id="pmSourceInput" data-role="source">Click to select</div>
            <div class="pm-row-help">This is the chart that is to be merged into the main chart and then deleted.</div>
        </div>
    </div>

    <div id="pmFormAlert"></div>

    <div class="pm-actions">
        <button type="button" class="pm-merge-btn" id="pmMergeBtn" disabled>Merge</button>
        <button type="button" class="pm-merge-btn" id="pmMergeDedupeBtn" disabled>Merge with Encounter Deduplication</button>
    </div>

    <div class="pm-warning-box">
        <strong>Be careful with this feature. Back up your database and documents before using it!</strong>
        <p>This will merge two patient charts into one. It is useful when a patient has been duplicated by mistake. If that happens often, fix your office procedures &mdash; do not run this routinely!</p>
        <p>The first (&lsquo;target&rsquo;) chart is the one that is considered the most complete and accurate. Demographics, history and insurance sections for this one will be retained.</p>
        <p>The second (&lsquo;source&rsquo;) chart will have its demographics, history and insurance sections discarded. Its other data will be merged into the target chart.</p>
        <p>The merge will not run unless the date of birth for the two charts is identical. DOBs cannot be empty.</p>
    </div>
</div>

<div class="modal-overlay" id="pmPickerModalOverlay">
    <div class="modal-box">
        <div class="modal-header">
            <h2 id="pmPickerTitle">Select Patient</h2>
            <button type="button" class="modal-close" id="pmPickerClose">&times;</button>
        </div>
        <input type="text" class="pm-picker-search" id="pmPickerSearch" placeholder="Search by name or patient number...">
        <div class="pm-picker-list" id="pmPickerList"></div>
    </div>
</div>

<div class="modal-overlay" id="pmConfirmModalOverlay">
    <div class="modal-box">
        <div class="modal-header">
            <h2>Confirm Merge</h2>
            <button type="button" class="modal-close" id="pmConfirmClose">&times;</button>
        </div>
        <p class="form-subtitle">This cannot be undone. The source chart will be deleted after its data is merged into the target chart.</p>
        <div class="pm-confirm-summary" id="pmConfirmSummary"></div>
        <div class="form-actions">
            <button type="button" class="btn-secondary" id="pmConfirmCancelBtn">Cancel</button>
            <button type="button" class="pm-merge-btn" id="pmConfirmProceedBtn">Yes, Merge Patients</button>
        </div>
    </div>
</div>
`;
}
