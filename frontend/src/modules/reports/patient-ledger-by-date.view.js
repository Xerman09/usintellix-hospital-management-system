export function PatientLedgerByDateView() {
    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    const from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().slice(0, 10);

    return `
        <style>
            .pl-report-wrapper { font-family: Arial, sans-serif; }

            .pl-header-bar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: #4a72b0;
                color: white;
                padding: 14px 20px;
                border-radius: 6px 6px 0 0;
            }

            .pl-header-bar h2 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
            }

            .pl-mask-toggle {
                background: none;
                border: none;
                color: rgba(255,255,255,.8);
                cursor: pointer;
                padding: 4px;
                display: flex;
            }

            .pl-mask-toggle:hover { color: white; }

            .pl-filter-panel {
                background: #eaf1fb;
                border: 1px solid #b8cce4;
                border-top: none;
                border-radius: 0 0 6px 6px;
                padding: 16px 20px;
                display: flex;
                flex-wrap: wrap;
                gap: 16px 24px;
                align-items: center;
                margin-bottom: 16px;
            }

            .pl-filter-group { display: flex; align-items: center; gap: 8px; }

            .pl-filter-group label { color: #2d3748; font-size: 13px; }

            .pl-filter-panel select,
            .pl-filter-panel input[type="date"] {
                padding: 6px 10px;
                border: 1px solid #cbd5e0;
                border-radius: 4px;
                color: #2d3748;
                font-size: 13px;
            }

            .pl-patient-btn {
                padding: 6px 12px;
                border: 1px solid #cbd5e0;
                border-radius: 4px;
                background: #fff;
                text-align: left;
                font-size: 13px;
                color: #1a202c;
                cursor: pointer;
                min-width: 180px;
            }

            .pl-patient-btn .pl-patient-clear {
                float: right;
                color: #a0aec0;
                margin-left: 8px;
            }

            .pl-divider { width: 1px; background: #b8cce4; height: 30px; }

            .pl-action-btn {
                padding: 7px 16px;
                border: none;
                border-radius: 4px;
                background: #3f5f8a;
                color: white;
                cursor: pointer;
                font-size: 13px;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .pl-action-btn:hover { background: #35507a; }

            .pl-table { width: 100%; border-collapse: collapse; font-size: 13px; }
            .pl-table th { background: #e2e8f0; padding: 8px; text-align: left; white-space: nowrap; }
            .pl-table td { padding: 8px; border-bottom: 1px solid #edf2f7; }
            .pl-table tbody tr.pl-row-payment { background: #f0fff4; }
            .pl-table tfoot td { border-top: 2px solid #2d3748; font-weight: bold; }

            .pl-report-wrapper.pl-masked .pl-money { visibility: hidden; position: relative; }
            .pl-report-wrapper.pl-masked .pl-money::after {
                content: "\\2022\\2022\\2022\\2022";
                visibility: visible;
                position: absolute;
                left: 0;
            }
        </style>

        <div class="pl-report-wrapper" id="plWrapper">
            <div class="pl-header-bar">
                <h2>Report - Patient Ledger by Date</h2>
                <button type="button" class="pl-mask-toggle" id="plMaskToggle" title="Hide dollar amounts">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                </button>
            </div>

            <form id="plForm" class="pl-filter-panel">
                <div class="pl-filter-group">
                    <label>Facility:</label>
                    <select id="plFacility">
                        <option value="">-- All Facilities --</option>
                    </select>
                </div>

                <div class="pl-filter-group">
                    <label>Provider:</label>
                    <select id="plProvider">
                        <option value="">-- All --</option>
                    </select>
                </div>

                <div class="pl-divider"></div>

                <div class="pl-filter-group">
                    <button type="button" class="pl-action-btn" id="plSubmitBtn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Submit
                    </button>
                    <button type="button" class="pl-action-btn" id="plPrintBtn" style="display: none;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        Print Ledger
                    </button>
                </div>

                <div class="pl-filter-group">
                    <label>From:</label>
                    <input type="date" id="plDateFrom" value="${from}">
                </div>

                <div class="pl-filter-group">
                    <label>To:</label>
                    <input type="date" id="plDateTo" value="${to}">
                </div>

                <div class="pl-filter-group">
                    <label>Patient:</label>
                    <input type="hidden" id="plPatientId" value="">
                    <button type="button" class="pl-patient-btn" id="plPatientBtn">Click To Select</button>
                </div>
            </form>

            <p id="plInstructionText" style="color: #2d3748; font-size: 13px;">
                Please input search criteria above, and click Submit to view results.
            </p>

            <div id="plResultsArea" style="display: none; overflow-x: auto;">
                <table class="pl-table">
                    <thead>
                        <tr>
                            <th>Patient</th>
                            <th>Code</th>
                            <th>Description</th>
                            <th>Billed Date / Payor</th>
                            <th>Type</th>
                            <th style="text-align: right;">Units</th>
                            <th style="text-align: right;">Charge</th>
                            <th style="text-align: right;">Payment</th>
                            <th style="text-align: right;">Adjustment</th>
                            <th style="text-align: right;">Balance</th>
                        </tr>
                    </thead>
                    <tbody id="plTableBody"></tbody>
                    <tfoot>
                        <tr>
                            <td colspan="5">Grand Total</td>
                            <td style="text-align: right;" id="plTotalUnits">0</td>
                            <td style="text-align: right;" class="pl-money" id="plTotalCharge">0.00</td>
                            <td style="text-align: right;" class="pl-money" id="plTotalPayment">0.00</td>
                            <td style="text-align: right;" class="pl-money" id="plTotalAdjustment">0.00</td>
                            <td style="text-align: right;" class="pl-money" id="plTotalBalance">0.00</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>

        <div class="modal-overlay" id="patientPickerModalOverlay">
            <div class="modal-box" style="max-width: 480px;">
                <div class="modal-header">
                    <h2>Select Patient</h2>
                    <button type="button" class="modal-close" id="closePatientPickerModal">&times;</button>
                </div>
                <input type="text" id="patientPickerSearch" class="form-input" placeholder="Search by name or patient no..." style="margin-bottom: 14px;">
                <div id="patientPickerList" style="max-height: 320px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px;"></div>
            </div>
        </div>
    `;
}
