export function EligibilityReportView() {
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 10);

    return `
        <div class="eligibility-report-wrapper" style="padding: 20px; font-family: Arial, sans-serif; background-color: #fff; min-height: 100%;">
            <h2 style="font-size: 20px; color: #1a365d; margin-bottom: 20px; font-weight: normal; margin-top: 0;">Report - Eligibility 270 Inquiry Batch</h2>

            <form id="elgForm" style="display: flex; gap: 20px; align-items: flex-start; margin-bottom: 20px;">
                <div style="display: grid; grid-template-columns: 80px 180px 40px 180px; gap: 12px; align-items: center;">
                    
                    <label style="color: #4a5568; font-size: 12px;">From:</label>
                    <input type="date" id="elgBeginDate" value="${formattedDate}" style="padding: 6px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 12px; width: 100%;">
                    
                    <label style="color: #4a5568; font-size: 12px; text-align: right; padding-right: 10px;">To:</label>
                    <input type="date" id="elgEndDate" value="${formattedDate}" style="padding: 6px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 12px; width: 100%;">

                    <label style="color: #4a5568; font-size: 12px;">Facility:</label>
                    <select id="elgFacility" style="padding: 6px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 12px; width: 100%;">
                        <option value="all">-- All Facilities --</option>
                    </select>

                    <label style="color: #4a5568; font-size: 12px; text-align: right; padding-right: 10px;">Provider:</label>
                    <select id="elgProvider" style="padding: 6px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 12px; width: 100%;">
                        <option value="all">-- All --</option>
                    </select>

                    <label style="color: #4a5568; font-size: 12px;">X12 Partner:</label>
                    <div style="grid-column: 2 / 5; display: flex; flex-direction: column;">
                        <select id="elgX12Partner" style="padding: 6px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 12px; width: 100%;">
                            <option value="all">--select--</option>
                        </select>
                        <span style="color: #e53e3e; font-size: 10px; margin-top: 4px;">* Clearing house info required for EDI 270 batch creation.</span>
                    </div>
                </div>

                <div style="display: flex; gap: 20px; align-items: center; margin-left: 20px; padding-top: 30px;">
                    <div style="width: 1px; background-color: #cbd5e0; height: 60px;"></div>
                    
                    <div>
                        <div style="display: flex; gap: 0;">
                            <button type="button" id="elgRefreshBtn" style="padding: 6px 12px; background: #e2e8f0; border: 1px solid #cbd5e0; border-radius: 4px 0 0 4px; color: #2d3748; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 4px;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/></svg>
                                Refresh
                            </button>
                            
                            <button type="button" id="elgCreateBatchBtn" style="padding: 6px 12px; background: #e2e8f0; border: 1px solid #cbd5e0; border-left: none; border-radius: 0 4px 4px 0; color: #2d3748; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 4px;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                                Create batch
                            </button>
                        </div>
                    </div>
                </div>
            </form>

            <div id="elgInstructionText" style="font-size: 12px; color: #2d3748; margin-bottom: 20px;">
                Please choose date range criteria above, and click Refresh to view results.
            </div>

            <div id="elgTableContainer" style="display: none;">
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead>
                        <tr style="background-color: #f7fafc; border-top: 1px solid #cbd5e0; border-bottom: 1px solid #cbd5e0;">
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left;">Facility Name</th>
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left;">Facility NPI</th>
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left;">Insurance Comp</th>
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left;">Appt Date</th>
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left;">Policy No</th>
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left;">Patient Name</th>
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left;">DOB</th>
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left;">Gender</th>
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left;">SSN</th>
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: center;"></th>
                        </tr>
                    </thead>
                    <tbody id="elgTableBody">
                    </tbody>
                </table>
            </div>
        </div>
    `;
}
