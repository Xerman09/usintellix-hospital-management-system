export function ProcedureReportsView()
{
    return `
<style>
.pr-page {
    width: 100%;
    font-size: 13.5px;
}

.pr-page h1 {
    margin: 0 0 16px;
    font-size: 22px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.pr-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}

.pr-toolbar-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    width: 100%;
    margin-bottom: 8px;
}

.pr-process-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    padding: 0 14px;
    border: none;
    border-radius: 6px;
    background: var(--accent);
    color: white;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
}

.pr-process-btn:hover {
    background: #1742b0;
}

.pr-select, .pr-input {
    height: 34px;
    padding: 0 10px;
    border-radius: 6px;
    border: 1px solid #d7dee8;
    outline: none;
    font-size: 13px;
    color: #1c2534;
    background: white;
}

.pr-select:focus, .pr-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(var(--accent-rgb),.12);
}

.pr-input-narrow {
    width: 60px;
    text-align: center;
}

.pr-checkbox-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #34435c;
    white-space: nowrap;
}

.pr-toolbar label:not(.pr-checkbox-label) {
    font-size: 13px;
    font-weight: 600;
    color: #34435c;
    white-space: nowrap;
}

.pr-filter-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    padding: 0 16px;
    border: 1.5px solid var(--accent);
    border-radius: 6px;
    background: white;
    color: var(--accent);
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
}

.pr-filter-btn:hover {
    background: var(--accent-light);
}

.pr-filter-btn svg {
    width: 14px;
    height: 14px;
}

.pr-table-wrap {
    overflow-x: auto;
    border: 1px solid #e5e9f0;
    border-radius: 8px;
    margin-top: 12px;
}

.pr-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.pr-table thead tr.pr-group-row th {
    background: #9aa3b0;
    color: white;
    font-weight: 700;
    font-size: 11.5px;
    text-transform: uppercase;
    letter-spacing: .3px;
    padding: 8px 14px;
}

.pr-table thead tr.pr-col-row th {
    background: #eef1f5;
    color: #4a5568;
    font-weight: 700;
    font-size: 11.5px;
    text-transform: uppercase;
    letter-spacing: .3px;
    padding: 8px 14px;
    border-bottom: 1px solid #e5e9f0;
    white-space: nowrap;
}

.pr-table td {
    padding: 10px 14px;
    border-bottom: 1px solid #eef1f5;
    color: #29323f;
}

.pr-results-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 56px 20px;
    color: #71809b;
}

.pr-results-empty .pr-empty-icon {
    width: 48px;
    height: 48px;
    margin-bottom: 14px;
    border-radius: 14px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.pr-results-empty .pr-empty-icon svg {
    width: 22px;
    height: 22px;
    color: #a2aec4;
}

.pr-results-empty strong {
    display: block;
    color: #34435c;
    font-size: 14px;
    margin-bottom: 4px;
}

.pr-results-empty p {
    margin: 0;
    font-size: 13px;
    max-width: 420px;
}

@media (max-width: 900px) {
    .pr-toolbar-row { flex-direction: column; align-items: stretch; }
}
</style>

<div class="pr-page">
    <h1>Procedure Orders and Reports</h1>

    <div class="pr-toolbar-row">
        <button type="button" class="pr-process-btn" id="prProcessBtn">
            Process Results For
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>
        </button>
        <select id="prProcessLab" class="pr-select">
            <option value="">All Labs</option>
        </select>
        <input type="number" id="prResultsPerLab" class="pr-input pr-input-narrow" value="10" min="1">
        <label>Results Per Lab</label>
        <label class="pr-checkbox-label">
            <input type="checkbox" id="prCurrentPatientOnly">
            Current Patient Only
        </label>
    </div>

    <div class="pr-toolbar-row">
        <label>From:</label>
        <input type="date" id="prFromDate" class="pr-input">
        <label>To:</label>
        <input type="date" id="prToDate" class="pr-input">
        <select id="prStatus" class="pr-select">
            <option value="received_unreviewed">Received, unreviewed</option>
            <option value="reviewed">Reviewed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
            <option value="all">All Statuses</option>
        </select>
        <select id="prProvider" class="pr-select">
            <option value="">-- All Providers --</option>
        </select>
        <select id="prLab" class="pr-select">
            <option value="">All Labs</option>
        </select>
        <button type="button" class="pr-filter-btn" id="prFilterBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
            Filter
        </button>
    </div>

    <div class="pr-table-wrap">
        <table class="pr-table">
            <thead>
                <tr class="pr-group-row">
                    <th colspan="2">Patient</th>
                    <th colspan="3">Order</th>
                    <th colspan="2">Procedure</th>
                    <th colspan="2">Report</th>
                </tr>
                <tr class="pr-col-row">
                    <th>Name</th>
                    <th>ID</th>
                    <th>Date</th>
                    <th>ID</th>
                    <th>Lab</th>
                    <th>Code</th>
                    <th>Description</th>
                    <th>Date</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody id="prResultsBody"></tbody>
        </table>
    </div>
</div>
`;
}
