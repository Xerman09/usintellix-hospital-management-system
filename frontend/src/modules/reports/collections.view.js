export const DISPLAY_COLUMNS = [
    { key: "ssn", label: "SSN", checked: false },
    { key: "dob", label: "DOB", checked: true },
    { key: "id", label: "ID", checked: false },
    { key: "policy", label: "Policy", checked: true },
    { key: "phone", label: "Phone", checked: true },
    { key: "city", label: "City", checked: false },
    { key: "primary_ins", label: "Primary Ins", checked: true },
    { key: "referrer", label: "Referrer", checked: false },
    { key: "act_date", label: "Act Date", checked: false },
    { key: "inactive_days", label: "Inactive Days", checked: true },
    { key: "errors", label: "Errors", checked: false },
    { key: "group_number", label: "Group Number", checked: false }
];

export function CollectionsView() {
    const checkboxesHtml = DISPLAY_COLUMNS.map((col) => `
        <label style="display: flex; align-items: center; gap: 5px; color: #4a5568; font-size: 13px; cursor: pointer; min-width: 130px;">
            <input type="checkbox" class="col-toggle" data-col="${col.key}" ${col.checked ? "checked" : ""}>
            ${col.label}
        </label>
    `).join("");

    return `
        <div class="col-report-wrapper" style="padding: 20px; font-family: Arial, sans-serif; background-color: #fff; min-height: 100%;">
            <h2 style="font-size: 20px; color: #1a365d; margin-bottom: 20px; font-weight: normal; margin-top: 0;">Report - Collections</h2>

            <form id="colForm">
                <div style="margin-bottom: 16px;">
                    <label style="display: block; color: #4a5568; font-size: 13px; margin-bottom: 6px;">Displayed Columns:</label>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px 16px;">
                        ${checkboxesHtml}
                    </div>
                </div>

                <div style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap; margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <label style="color: #4a5568; font-size: 13px;">Service Date:</label>
                        <input type="date" id="colDateFrom" style="padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; font-size: 13px;">
                    </div>

                    <div style="display: flex; align-items: center; gap: 8px;">
                        <label style="color: #4a5568; font-size: 13px;">To:</label>
                        <input type="date" id="colDateTo" style="padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; font-size: 13px;">
                    </div>

                    <select id="colStatus" style="padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; font-size: 13px;">
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                        <option value="all">All</option>
                    </select>

                    <div style="width: 1px; background-color: #cbd5e0; height: 30px;"></div>

                    <div style="display: flex; gap: 0;">
                        <button type="button" id="colSubmitBtn" style="padding: 6px 16px; background: #e2e8f0; border: 1px solid #cbd5e0; border-radius: 4px 0 0 4px; color: #2d3748; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 4px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Submit
                        </button>
                        <button type="button" id="colPrintBtn" style="display: none; padding: 6px 16px; background: #e2e8f0; border: 1px solid #cbd5e0; border-left: none; border-radius: 0 4px 4px 0; color: #2d3748; cursor: pointer; font-size: 13px; align-items: center; gap: 4px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                            Print
                        </button>
                    </div>
                </div>

                <div style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap; margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <label style="color: #4a5568; font-size: 13px;">Facility:</label>
                        <select id="colFacility" style="padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; font-size: 13px;">
                            <option value="">-- All Facilities --</option>
                        </select>
                    </div>

                    <div style="display: flex; align-items: center; gap: 8px;">
                        <label style="color: #4a5568; font-size: 13px;">Payor:</label>
                        <select id="colPayor" style="padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; font-size: 13px;">
                            <option value="">-- All --</option>
                        </select>
                    </div>
                </div>

                <div style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap; margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <label style="color: #4a5568; font-size: 13px;">Age By:</label>
                        <select id="colAgeBy" style="padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; font-size: 13px;">
                            <option value="service">Service Date</option>
                            <option value="payment">Payment Date</option>
                        </select>
                    </div>

                    <div style="display: flex; align-items: center; gap: 8px;">
                        <label style="color: #4a5568; font-size: 13px;">Provider:</label>
                        <select id="colProvider" style="padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; font-size: 13px;">
                            <option value="">-- All --</option>
                        </select>
                    </div>
                </div>

                <div style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap; margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <label style="color: #4a5568; font-size: 13px;">Aging Columns:</label>
                        <input type="number" id="colAgingColumns" value="3" min="1" max="8" style="width: 60px; padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; font-size: 13px;">
                    </div>

                    <div style="display: flex; align-items: center; gap: 8px;">
                        <label style="color: #4a5568; font-size: 13px;">Days/Col:</label>
                        <input type="number" id="colDaysPerCol" value="30" min="1" style="width: 70px; padding: 6px 10px; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; font-size: 13px;">
                    </div>

                    <label style="display: flex; align-items: center; gap: 6px; color: #4a5568; font-size: 13px; cursor: pointer;">
                        <input type="checkbox" id="colPatientsWithDebt">
                        Patients with debt
                    </label>
                </div>
            </form>

            <p id="colInstructionText" style="margin-top: 4px; color: #2d3748; font-size: 13px;">
                Please input search criteria above, and click Submit to view results.
            </p>

            <div id="colResultsArea" style="display: none;">
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 16px;">
                        <thead id="colTableHead"></thead>
                        <tbody id="colTableBody"></tbody>
                        <tfoot id="colTableFoot"></tfoot>
                    </table>
                </div>
            </div>

            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 20px;">
                <button type="button" id="colSelectAllBtn" style="padding: 6px 14px; background: #e2e8f0; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 4px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Select All
                </button>
                <button type="button" id="colClearAllBtn" style="padding: 6px 14px; background: #e2e8f0; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 4px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"></path></svg>
                    Clear All
                </button>
                <button type="button" id="colExportCsvBtn" style="padding: 6px 14px; background: #e2e8f0; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 4px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                    Export Selected as CSV
                </button>
                <button type="button" id="colExportCollectionsBtn" style="padding: 6px 14px; background: #e2e8f0; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 4px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                    Export Selected to Collections
                </button>
                <button type="button" id="colClearDebtBtn" style="padding: 6px 14px; background: #e2e8f0; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 4px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                    Clear Insurance Debt
                </button>

                <label style="display: flex; align-items: center; gap: 6px; color: #4a5568; font-size: 13px; cursor: pointer;">
                    <input type="checkbox" id="colExportZeroBalances">
                    Export Zero Balances
                </label>
                <label style="display: flex; align-items: center; gap: 6px; color: #4a5568; font-size: 13px; cursor: pointer;">
                    <input type="checkbox" id="colExportIndividualInvoices" checked>
                    Export Individual Invoices
                </label>
                <label style="display: flex; align-items: center; gap: 6px; color: #4a5568; font-size: 13px; cursor: pointer;">
                    <input type="checkbox" id="colWithoutUpdate">
                    Without Update
                </label>
            </div>
        </div>
    `;
}
