export function ImmunizationRegistryView() {
    return `
        <div class="imm-registry-wrapper" style="padding: 20px;">
            <h2 style="font-size: 24px; color: #1a365d; margin-bottom: 24px; font-weight: 500;">Report - Immunization Registry</h2>
            
            <form id="immRegForm" style="display: flex; gap: 24px; align-items: flex-start; max-width: 1100px; margin-bottom: 20px;">
                <div style="display: flex; gap: 12px; align-items: center; flex: 1;">
                    <label style="color: #4a5568; font-size: 14px; font-weight: 500; white-space: nowrap;">Codes:</label>
                    <div style="position: relative; border: 1px solid #cbd5e0; border-radius: 4px; overflow: hidden; display: flex; align-items: stretch; background: white;">
                        <select id="immCvxCode" multiple size="3" style="padding: 4px 6px; border: none; outline: none; color: #2d3748; font-size: 13px; min-width: 100px; height: 68px; cursor: pointer; background: white;">
                            <option value="">Loading...</option>
                        </select>
                        <div style="display: flex; flex-direction: column; justify-content: center; border-left: 1px solid #cbd5e0; padding: 0 4px; background: #f7fafc;">
                            <button type="button" onclick="document.getElementById('immCvxCode').selectedIndex = Math.max(0, document.getElementById('immCvxCode').selectedIndex - 1)" style="background: none; border: none; cursor: pointer; padding: 2px; color: #718096; font-size: 10px;">▲</button>
                            <button type="button" onclick="document.getElementById('immCvxCode').selectedIndex = Math.min(document.getElementById('immCvxCode').options.length - 1, document.getElementById('immCvxCode').selectedIndex + 1)" style="background: none; border: none; cursor: pointer; padding: 2px; color: #718096; font-size: 10px;">▼</button>
                        </div>
                    </div>

                    <label style="color: #4a5568; font-size: 14px; margin-left: 10px; white-space: nowrap;">From VIS Date:</label>
                    <input type="text" id="immVisDateFrom" placeholder="" style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 4px; width: 140px; color: #2d3748;">
                    
                    <label style="color: #4a5568; font-size: 14px; margin-left: 6px; white-space: nowrap;">To VIS Date:</label>
                    <input type="text" id="immVisDateTo" placeholder="" style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 4px; width: 140px; color: #2d3748;">
                </div>

                <div style="display: flex; gap: 24px; align-items: center;">
                    <div style="width: 1px; background-color: #cbd5e0; height: 40px;"></div>
                    <div style="display: flex; background: #e2e8f0; border-radius: 4px; border: 1px solid #cbd5e0; overflow: hidden; height: fit-content;">
                        <button type="submit" style="padding: 8px 14px; background: transparent; border: none; border-right: 1px solid #cbd5e0; color: #2d3748; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 13px;">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Refresh
                        </button>
                        <button type="button" id="immPrintBtn" style="padding: 8px 14px; background: transparent; border: none; border-right: 1px solid #cbd5e0; color: #2d3748; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 13px;">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                            Print
                        </button>
                        <button type="button" id="immHl7Btn" style="padding: 8px 14px; background: transparent; border: none; border-right: 1px solid #cbd5e0; color: #2d3748; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 13px;">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                            Get HL7
                        </button>
                        <button type="button" id="immExportBtn" style="padding: 8px 14px; background: transparent; border: none; color: #2d3748; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 13px;">
                            Export
                        </button>
                    </div>
                </div>
            </form>

            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden;">
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                    <thead style="background-color: #f7fafc; border-bottom: 2px solid #e2e8f0;">
                        <tr>
                            <th style="padding: 10px 16px; font-weight: bold; color: #4a5568;">Patient ID</th>
                            <th style="padding: 10px 16px; font-weight: bold; color: #4a5568;">Patient Name</th>
                            <th style="padding: 10px 16px; font-weight: bold; color: #4a5568;">Immunization Code</th>
                            <th style="padding: 10px 16px; font-weight: bold; color: #4a5568;">Immunization Title</th>
                            <th style="padding: 10px 16px; font-weight: bold; color: #4a5568;">Immunization Date</th>
                        </tr>
                    </thead>
                    <tbody id="immRegistryTableBody">
                        <tr>
                            <td colspan="5" style="padding: 0;">
                                <div id="immCountBanner" style="background-color: #9ae6b4; padding: 8px 16px; font-weight: bold; color: #1a202c; font-size: 13px;">
                                    Total Number of Immunizations : 0
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}
