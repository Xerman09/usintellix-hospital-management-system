export function ProcedureStatisticsReportView() {
    return `
        <div class="procedure-statistics-wrapper" style="padding: 20px; font-family: Arial, sans-serif; background-color: #fff; min-height: 100%; text-align: center;">
            <h2 style="font-size: 24px; color: #1a365d; margin-bottom: 25px; font-weight: normal; margin-top: 0;">Procedure Statistics Report</h2>

            <form id="statForm" style="display: inline-flex; flex-direction: column; align-items: center; gap: 20px; margin-bottom: 25px; width: 800px;">
                
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; width: 100%;">
                    <div style="display: flex; flex-direction: column; align-items: center;">
                        <label style="color: #2d3748; font-size: 13px; margin-bottom: 5px;">Facility:</label>
                        <select id="statFacility" style="padding: 6px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 13px; width: 100%; background-color: white;">
                            <option value="all">-- All Facilities --</option>
                        </select>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; align-items: center;">
                        <label style="color: #2d3748; font-size: 13px; margin-bottom: 5px;">From</label>
                        <input type="text" id="statDateFrom" value="0000-00-00" style="padding: 6px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 13px; width: 100%;">
                    </div>
                    
                    <div style="display: flex; flex-direction: column; align-items: center;">
                        <label style="color: #2d3748; font-size: 13px; margin-bottom: 5px;">To</label>
                        <input type="date" id="statDateTo" value="${new Date().toISOString().split('T')[0]}" style="padding: 6px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 13px; width: 100%;">
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; width: 100%; margin-top: 10px;">
                    <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                        <label style="color: #2d3748; font-size: 13px;">Rows:</label>
                        <select id="statRows" style="padding: 6px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 13px; width: 200px; background-color: white;">
                            <option value="specific_result">Specific Result</option>
                        </select>
                    </div>
                    
                    <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                        <label style="color: #2d3748; font-size: 13px;">Sex:</label>
                        <select id="statSex" style="padding: 6px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 13px; width: 200px; background-color: white;">
                            <option value="all">Men and Women</option>
                            <option value="male">Men</option>
                            <option value="female">Women</option>
                        </select>
                    </div>
                </div>

                <div style="width: 100%; display: flex; flex-direction: column; align-items: center; margin-top: 10px;">
                    <label style="color: #2d3748; font-size: 13px; margin-bottom: 5px;">Columns:</label>
                    <select id="statColumns" multiple size="5" style="padding: 4px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 13px; width: 100%; height: 90px; background-color: white;">
                        <option value="total_negatives">Total Negatives</option>
                        <option value="age_category">Age Category</option>
                        <option value="title">Title</option>
                        <option value="name_suffix">Name Suffix</option>
                        <option value="preferred_name">Preferred Name</option>
                    </select>
                </div>

                <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-top: 15px; font-size: 13px; color: #2d3748;">
                    <span>To:</span>
                    <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;">
                        <input type="radio" name="statDestination" value="screen" checked> Screen
                    </label>
                    <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;">
                        <input type="radio" name="statDestination" value="printer"> Printer
                    </label>
                    <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;">
                        <input type="radio" name="statDestination" value="export"> Export File
                    </label>
                </div>
                
                <div style="margin-top: 10px;">
                    <button type="button" id="statSubmitBtn" style="padding: 8px 24px; background: #007bff; border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 6px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Submit
                    </button>
                </div>
            </form>

            <div id="statTableContainer" style="display: none; text-align: left;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead id="statTableHead">
                        <tr style="background-color: #e2e8f0; border-top: 1px solid #cbd5e0; border-bottom: 1px solid #cbd5e0;">
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left;">Result</th>
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left;">Total Negatives</th>
                            <th style="padding: 8px; color: #1a202c; font-weight: bold; text-align: left;">Count</th>
                        </tr>
                    </thead>
                    <tbody id="statTableBody">
                    </tbody>
                </table>
            </div>
        </div>
    `;
}
