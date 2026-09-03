export function ClinicalBlankFormView(title) {
    const revDate = new Date().toISOString().slice(0, 10);

    return `
        <div class="clinical-blank-form-wrapper" style="padding: 20px; font-family: Arial, sans-serif; background-color: #fff; min-height: 100%; color: #000; max-width: 800px; margin: 0 auto;">
            <style>
                @media print {
                    .no-print { display: none !important; }
                    .clinical-blank-form-wrapper { padding: 0 !important; max-width: 100% !important; margin: 0 !important; }
                    body, html { background: white !important; height: auto !important; overflow: visible !important; }
                    .top-nav, .sidebar, .tabs-header { display: none !important; }
                    .dashboard-container, .main-content, .tab-content, .tab-pane {
                        display: block !important;
                        height: auto !important;
                        overflow: visible !important;
                        position: static !important;
                    }
                }
                .cbf-line { border-bottom: 1px solid #000; display: inline-block; min-width: 90px; height: 14px; margin-left: 4px; }
            </style>

            <div class="no-print" style="margin-bottom: 20px; text-align: right;">
                <button onclick="window.print()" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Print Form</button>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                <h2 style="font-size: 20px; font-weight: bold; margin: 0;">${title}</h2>
                <div style="text-align: right; font-size: 12px; line-height: 1.3;">
                    <div style="font-weight: bold;">DOB: <span class="cbf-line" style="width: 110px;"></span></div>
                    <strong class="cbfFacName">Facility</strong><br>
                    <span class="cbfFacAddress">...</span><br>
                    <span class="cbfFacCityStateZip">...</span><br>
                    <span class="cbfFacCountry">...</span>
                </div>
            </div>

            <div style="font-size: 13px; margin-bottom: 30px;">
                <span style="font-weight: bold;">Patient:</span> <span class="cbf-line" style="width: 260px;"></span>
                &nbsp;&nbsp;&nbsp;
                <span style="font-weight: bold;">Clinic:</span> <span class="cbf-line" style="width: 140px;"></span>
                &nbsp;&nbsp;&nbsp;
                <span style="font-weight: bold;">Date:</span> <span class="cbf-line" style="width: 140px;"></span>
            </div>

            <div style="text-align: center; font-size: 12px; color: #333;">Rev. ${revDate}</div>
        </div>
    `;
}
