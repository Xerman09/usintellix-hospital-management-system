export function ClientsListView()
{
    return `
        <div class="patients-header" style="margin-bottom: 20px;">
            <div class="header-left">
                <h1 style="margin: 0; font-size: 24px; color: var(--text-color);">Report - Patient List</h1>
            </div>
        </div>

        <div class="filters-panel" style="background: var(--card-bg); padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px; display: flex; gap: 20px; align-items: flex-end; flex-wrap: wrap;">
            <div class="filter-group" style="flex: 1; min-width: 200px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500; font-size: 14px; color: var(--text-muted);">Provider</label>
                <select id="reportProviderFilter" class="form-input" style="width: 100%;">
                    <option value="all">All</option>
                </select>
            </div>
            <div class="filter-group" style="flex: 1; min-width: 200px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500; font-size: 14px; color: var(--text-muted);">Visits From</label>
                <input type="date" id="reportDateFrom" class="form-input" style="width: 100%;">
            </div>
            <div class="filter-group" style="flex: 1; min-width: 200px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500; font-size: 14px; color: var(--text-muted);">To</label>
                <input type="date" id="reportDateTo" class="form-input" style="width: 100%;">
            </div>
            <div class="filter-actions" style="display: flex; gap: 10px;">
                <button id="reportSubmitBtn" class="btn btn-primary">Submit</button>
            </div>
        </div>

        <div id="reportResultsArea" style="display: none; background: var(--card-bg); padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div class="report-actions" style="margin-bottom: 15px; display: flex; gap: 10px; justify-content: flex-end;">
                <button id="reportCsvBtn" class="btn btn-secondary">Export to CSV</button>
                <button id="reportPrintBtn" class="btn btn-secondary">Print</button>
            </div>
            
            <div class="table-responsive">
                <table class="data-table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
                            <th style="padding: 10px; font-weight: 600;">Last Visit</th>
                            <th style="padding: 10px; font-weight: 600;">Patient</th>
                            <th style="padding: 10px; font-weight: 600;">ID</th>
                            <th style="padding: 10px; font-weight: 600;">Street</th>
                            <th style="padding: 10px; font-weight: 600;">City</th>
                            <th style="padding: 10px; font-weight: 600;">State</th>
                            <th style="padding: 10px; font-weight: 600;">Zip</th>
                            <th style="padding: 10px; font-weight: 600;">Home Phone</th>
                            <th style="padding: 10px; font-weight: 600;">Work Phone</th>
                        </tr>
                    </thead>
                    <tbody id="reportTableBody">
                        <!-- Content injected via JS -->
                    </tbody>
                </table>
            </div>

            <div style="margin-top: 15px; font-weight: 600; text-align: right;" id="reportTotalCount">
                Total Number of Patients: 0
            </div>
        </div>
    `;
}
