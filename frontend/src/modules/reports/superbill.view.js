export function SuperbillReportView() {
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 10);

    return `
        <div class="superbill-report-wrapper" style="padding: 20px; font-family: Arial, sans-serif; background-color: #fff; min-height: 100%;">
            <h2 style="font-size: 20px; color: #1a365d; margin-bottom: 10px; font-weight: normal; margin-top: 0;">Reports - Superbill</h2>
            <div style="font-size: 13px; color: #4a5568; margin-bottom: 25px;">
                Superbills, sometimes referred to as Encounter Forms or Routing Slips, are an essential part of most medical practices.
            </div>

            <form id="sbForm" style="display: flex; gap: 20px; align-items: center; margin-bottom: 30px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <label style="color: #1a202c; font-size: 12px; width: 40px; text-align: right; line-height: 1.2;">Start<br>Date:</label>
                    <input type="date" id="sbBeginDate" value="2026-07-26" style="padding: 6px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 13px; width: 130px;">
                </div>
                
                <div style="display: flex; align-items: center; gap: 8px;">
                    <label style="color: #1a202c; font-size: 12px; width: 35px; text-align: right; line-height: 1.2;">End<br>Date:</label>
                    <input type="date" id="sbEndDate" value="${formattedDate}" style="padding: 6px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 13px; width: 130px;">
                </div>

                <div style="display: flex; align-items: center; gap: 8px;">
                    <label style="color: #1a202c; font-size: 12px; text-align: right;">Patient:</label>
                    <button type="button" style="padding: 6px 12px; border: 1px solid #cbd5e0; border-radius: 4px; background: #fff; text-align: left; font-size: 13px; color: #1a202c; cursor: pointer; width: 180px;">
                        Click To Select
                    </button>
                </div>

                <div style="width: 1px; background-color: #cbd5e0; height: 25px; margin-left: 5px;"></div>
                
                <div style="display: flex; gap: 4px; margin-left: 5px;">
                    <button type="button" id="sbSubmitBtn" style="padding: 6px 16px; background-color: #007bff; border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 13px;">
                        Submit
                    </button>
                    <button type="button" class="sbActionBtn" style="padding: 6px 16px; background-color: #007bff; border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 13px;">
                        Print
                    </button>
                </div>
            </form>

            <div id="sbClinicInfo" style="margin-top: 30px; display: none;">
                <h1 id="sbClinicName" style="font-size: 28px; color: #1a202c; font-weight: normal; margin: 0 0 10px 0;">Great Clinic</h1>
                <div style="font-size: 14px; color: #1a202c; line-height: 1.5;">
                    <div id="sbClinicStreet">55 Roadsby Road</div>
                    <div id="sbClinicCityStateZip">Longview, FL 333222</div>
                </div>
            </div>
            
            <div id="sbLoading" style="display: none; padding: 20px; font-size: 13px; color: #718096; font-style: italic;">
                Loading superbill...
            </div>
        </div>
    `;
}
