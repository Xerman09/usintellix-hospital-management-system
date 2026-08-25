export function RxReportView() {
    // Current date for default "To" value
    const today = new Date().toISOString().split('T')[0];
    
    // First day of current year for default "From" value
    const firstDayOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];

    return `
<style>
.report-page {
    width: 100%;
    font-size: 13.5px;
}

.report-header {
    margin-bottom: 20px;
    padding-bottom: 10px;
}

.report-header h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 500;
    color: #14181f;
}

.rx-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: flex-end;
    margin-bottom: 24px;
}

.rx-filter-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.rx-filter-group label {
    font-size: 12px;
    color: #42536b;
    font-weight: 500;
}

.rx-filter-row {
    display: flex;
    gap: 16px;
    align-items: center;
}

.rx-input {
    height: 32px;
    padding: 0 10px;
    border: 1px solid #dbe1ea;
    border-radius: 4px;
    font-size: 13px;
    color: #14181f;
    outline: none;
    background: #fff;
}

.rx-input:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37,99,235,0.1);
}

.rx-button {
    height: 32px;
    padding: 0 16px;
    border: 1px solid #dbe1ea;
    border-radius: 4px;
    background: #f8fafc;
    color: #14181f;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
}

.rx-button:hover {
    background: #f1f5f9;
}

.rx-table-wrap {
    width: 100%;
    overflow-x: auto;
    border: 1px solid #e5e9f0;
    border-radius: 6px;
}

.rx-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
    white-space: nowrap;
}

.rx-table th {
    background: #e2e8f0;
    padding: 10px 12px;
    font-weight: 600;
    color: #1e293b;
    border-bottom: 1px solid #cbd5e1;
    font-size: 12px;
}

.rx-table td {
    padding: 10px 12px;
    border-bottom: 1px solid #e5e9f0;
    color: #334155;
    font-size: 13px;
}

.rx-table tbody tr:hover {
    background: #f8fafc;
}
</style>

<div class="report-page">
    <div class="report-header">
        <h2>Report - Prescriptions and Dispensations</h2>
    </div>

    <form id="rxReportForm" class="rx-filters">
        <div style="display: flex; flex-direction: column; gap: 12px;">
            <div class="rx-filter-row">
                <div class="rx-filter-group" style="flex-direction: row; align-items: center;">
                    <label style="width: 60px;">Facility:</label>
                    <select id="rxFacility" class="rx-input" style="width: 200px;">
                        <option value="all">-- All Facilities --</option>
                    </select>
                </div>
                <div class="rx-filter-group" style="flex-direction: row; align-items: center;">
                    <label>From:</label>
                    <input type="date" id="rxDateFrom" class="rx-input" value="${firstDayOfYear}">
                </div>
                <div class="rx-filter-group" style="flex-direction: row; align-items: center;">
                    <label>To:</label>
                    <input type="date" id="rxDateTo" class="rx-input" value="${today}">
                </div>
            </div>
            
            <div class="rx-filter-row">
                <div class="rx-filter-group" style="flex-direction: row; align-items: center;">
                    <label style="width: 60px;">Patient ID:</label>
                    <input type="text" id="rxPatientId" class="rx-input" style="width: 200px;">
                </div>
                <div class="rx-filter-group" style="flex-direction: row; align-items: center;">
                    <label>Drug:</label>
                    <input type="text" id="rxDrug" class="rx-input">
                </div>
                <div class="rx-filter-group" style="flex-direction: row; align-items: center;">
                    <label>Lot:</label>
                    <input type="text" id="rxLot" class="rx-input">
                </div>
            </div>
        </div>
        
        <div class="rx-filter-row" style="margin-left: 20px;">
            <button type="submit" class="rx-button">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Submit
            </button>
            <button type="button" id="rxPrintBtn" class="rx-button">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                Print
            </button>
        </div>
    </form>

    <div class="rx-table-wrap">
        <table class="rx-table">
            <thead>
                <tr>
                    <th>Patient</th>
                    <th>ID</th>
                    <th>RX</th>
                    <th>Drug Name</th>
                    <th>NDC</th>
                    <th>Units</th>
                    <th>Refills</th>
                    <th>Instructed</th>
                    <th>Reactions</th>
                    <th>Dispensed</th>
                    <th>Qty</th>
                    <th>Manufacturer</th>
                    <th>Lot</th>
                </tr>
            </thead>
            <tbody id="rxReportTableBody">
                <tr><td colspan="13" style="text-align: center; padding: 20px;">Click Submit to generate the report</td></tr>
            </tbody>
        </table>
    </div>
</div>
`;
}
