export function ServicesReportView() {
    return `
        <div class="services-report-wrapper" style="padding: 20px; font-family: Arial, sans-serif; background-color: #fff; min-height: 100%;">
            <h2 id="srvTitle" style="font-size: 20px; color: #1a365d; margin-bottom: 25px; font-weight: normal; margin-top: 0;">Report - Services by Category</h2>

            <form id="srvForm" style="display: flex; gap: 20px; align-items: center; margin-bottom: 25px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <select id="srvType" style="padding: 6px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 13px; width: 150px; background-color: white;">
                        <option value="all">All</option>
                        <option value="CPT4">CPT4</option>
                        <option value="HCPCS">HCPCS</option>
                        <option value="CVX">CVX</option>
                        <option value="ICD10">ICD10</option>
                        <option value="LOINC">LOINC</option>
                        <option value="PHIN Questions">PHIN Questions</option>
                        <option value="NCI-CONCEPT-ID">NCI-CONCEPT-ID</option>
                        <option value="VALUESET">VALUESET</option>
                        <option value="OID">OID</option>
                    </select>
                </div>
                
                <div style="display: flex; align-items: center; gap: 4px;">
                    <input type="checkbox" id="srvIncludeUncategorized" style="margin: 0;">
                    <label for="srvIncludeUncategorized" style="color: #4a5568; font-size: 11px; line-height: 1.1; cursor: pointer;">Include<br>Uncategorized</label>
                </div>
                
                <div style="width: 1px; background-color: #cbd5e0; height: 35px; margin-left: 5px; margin-right: 5px;"></div>
                
                <div style="display: flex; gap: 0;">
                    <button type="button" id="srvSubmitBtn" style="padding: 6px 12px; background: #e2e8f0; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 4px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Submit
                    </button>
                    
                    <button type="button" id="srvPrintBtn" style="display: none; padding: 6px 12px; background: #e2e8f0; border: 1px solid #cbd5e0; border-left: none; border-radius: 0 4px 4px 0; color: #2d3748; cursor: pointer; font-size: 13px; align-items: center; gap: 4px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        Print
                    </button>
                </div>
            </form>

            <div id="srvTableContainer" style="display: none;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead>
                        <tr style="background-color: #e2e8f0; border-top: 1px solid #cbd5e0; border-bottom: 1px solid #cbd5e0;">
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left;">Category</th>
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left;">Type</th>
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left;">Code</th>
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left;">Mod</th>
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left;">Units</th>
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left;">Description</th>
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left;">Related</th>
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left;">Standard</th>
                        </tr>
                    </thead>
                    <tbody id="srvTableBody">
                    </tbody>
                </table>
            </div>
        </div>
    `;
}
