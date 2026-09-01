export function PatientDuplicatesView()
{
    return `
<style>
.pd2-page {
    width: 100%;
    font-size: 13px;
}

.pd2-page h1 {
    margin: 0 0 16px;
    font-size: 26px;
    font-weight: 700;
    color: #1a2338;
    text-align: center;
}

.pd2-toolbar {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-bottom: 18px;
}

.pd2-toolbar-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 16px;
    border: none;
    border-radius: 6px;
    background: var(--accent);
    color: white;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
}

.pd2-toolbar-btn:hover {
    background: #1742b0;
}

.pd2-toolbar-btn svg {
    width: 14px;
    height: 14px;
}

.pd2-table-wrap {
    overflow-x: auto;
    border-radius: 8px;
}

.pd2-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12.5px;
}

.pd2-table th {
    background: #1a2338;
    color: white;
    font-weight: 700;
    font-size: 12px;
    padding: 10px 12px;
    text-align: left;
    white-space: nowrap;
}

.pd2-table td {
    padding: 8px 12px;
    white-space: nowrap;
    color: #1c2534;
}

.pd2-group-spacer td {
    padding: 8px 0;
    background: transparent;
    border: none;
}

.pd2-row-to {
    background: #fdecc8;
}

.pd2-row-from {
    background: #f8d7da;
}

.pd2-score {
    font-weight: 700;
    color: #7c5a00;
}

.pd2-pid {
    color: #b8860b;
    font-weight: 600;
}

.pd2-actions-select {
    height: 30px;
    padding: 0 6px;
    border-radius: 5px;
    border: 1px solid #cfd4dc;
    font-size: 12px;
    background: white;
}

.pd2-group-footer td {
    background: #f8fafc;
    padding: 10px 12px;
}

.pd2-group-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 30px;
    padding: 0 12px;
    border-radius: 6px;
    border: none;
    font-weight: 600;
    font-size: 12px;
    cursor: pointer;
    margin-right: 8px;
}

.pd2-group-btn.merge {
    background: var(--accent);
    color: white;
}

.pd2-group-btn.merge:hover {
    background: #1742b0;
}

.pd2-group-btn.merge:disabled {
    background: #c3cbd8;
    cursor: not-allowed;
}

.pd2-group-btn.dismiss {
    background: #eef1f5;
    color: #4a5568;
    border: 1px solid #cfd4dc;
}

.pd2-group-btn.dismiss:hover {
    background: #e2e7ee;
}

.pd2-empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #71809b;
}

.pd2-empty-state .pd2-empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 16px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.pd2-empty-state .pd2-empty-icon svg {
    width: 26px;
    height: 26px;
    color: #a2aec4;
}

.pd2-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 15px;
    margin-bottom: 6px;
}

.pd2-loading {
    text-align: center;
    padding: 60px;
    color: #71809b;
}

@media print {
    .pd2-toolbar { display: none; }
}

.pd2-confirm-summary {
    background: #fef3c7;
    border: 1px solid #fde68a;
    border-radius: 8px;
    padding: 14px 16px;
    margin: 14px 0;
    font-size: 13px;
    color: #78350f;
}

.pd2-confirm-summary div {
    margin-bottom: 6px;
}

.pd2-confirm-summary div:last-child {
    margin-bottom: 0;
}
</style>

<div class="pd2-page">
    <h1>Duplicate Patient Management</h1>

    <div class="pd2-toolbar">
        <button type="button" class="pd2-toolbar-btn" id="pd2RecalcBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15.5-6.36L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-15.5 6.36L3 16"></path><path d="M3 21v-5h5"></path></svg>
            ReCalculate Scores
        </button>
        <button type="button" class="pd2-toolbar-btn" id="pd2PrintBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><path d="M6 14h12v8H6z"></path></svg>
            Print
        </button>
        <button type="button" class="pd2-toolbar-btn" id="pd2ExportBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="M7 10l5 5 5-5"></path><path d="M12 15V3"></path></svg>
            Generate a spreadsheet
        </button>
    </div>

    <div id="pd2FormAlert"></div>

    <div class="pd2-table-wrap">
        <table class="pd2-table">
            <thead>
                <tr>
                    <th>Actions</th>
                    <th>Score</th>
                    <th>Pid</th>
                    <th>Public</th>
                    <th>Scope</th>
                    <th>Name</th>
                    <th>DOB</th>
                    <th>Gender</th>
                    <th>Email</th>
                    <th>Telephone</th>
                    <th>Registered</th>
                    <th>Address</th>
                </tr>
            </thead>
            <tbody id="pd2TableBody">
                <tr><td colspan="12" class="pd2-loading">Loading...</td></tr>
            </tbody>
        </table>
    </div>
</div>

<div class="modal-overlay" id="pd2ConfirmModalOverlay">
    <div class="modal-box">
        <div class="modal-header">
            <h2>Confirm Merge</h2>
            <button type="button" class="modal-close" id="pd2ConfirmClose">&times;</button>
        </div>
        <p class="form-subtitle">This cannot be undone. Every "Merge From" chart below will be merged into the "Merge To" chart and then deleted.</p>
        <div class="pd2-confirm-summary" id="pd2ConfirmSummary"></div>
        <div class="form-actions">
            <button type="button" class="btn-secondary" id="pd2ConfirmCancelBtn">Cancel</button>
            <button type="button" class="pd2-group-btn merge" id="pd2ConfirmProceedBtn">Yes, Merge Patients</button>
        </div>
    </div>
</div>
`;
}
