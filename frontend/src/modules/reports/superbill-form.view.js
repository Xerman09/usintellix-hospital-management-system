export function SuperbillFormView() {
    return `
        <div class="superbill-form-wrapper" style="padding: 20px; font-family: sans-serif; background-color: #fff; min-height: 100%; color: #000; max-width: 900px; margin: 0 auto;">
            <style>
                @media print {
                    .no-print { display: none !important; }
                    .superbill-form-wrapper { padding: 0 !important; max-width: 100% !important; margin: 0 !important; }
                    body, html { background: white !important; height: auto !important; overflow: visible !important; }
                    .top-nav, .sidebar, .tabs-header { display: none !important; }
                    .dashboard-container, .main-content, .tab-content, .tab-pane { 
                        display: block !important; 
                        height: auto !important; 
                        overflow: visible !important; 
                        position: static !important; 
                    }
                }
                .sb-table { width: 100%; border-collapse: collapse; border: 1px solid #000; table-layout: fixed; }
                .sb-table td, .sb-table th { border: 1px solid #000; padding: 4px; vertical-align: top; font-size: 11px; }
                .sb-checkbox { width: 25px; border-right: 1px solid #000; }
                .sb-header-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 10px; font-size: 12px; }
                .sb-line { border-bottom: 1px solid #000; display: inline-block; width: 150px; }
            </style>
            
            <div class="no-print" style="margin-bottom: 20px; text-align: right;">
                <button onclick="window.print()" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Print Form</button>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                <h2 style="font-size: 20px; font-weight: bold; margin: 0;">Superbill/Fee Sheet</h2>
                <div style="text-align: right; font-size: 12px; line-height: 1.2;">
                    <strong id="sbFacName">Facility</strong><br>
                    <span id="sbFacAddress">...</span><br>
                    <span id="sbFacCityStateZip">...</span><br>
                    <span id="sbFacCountry">...</span>
                </div>
            </div>

            <div class="sb-header-row">
                <div>Patient: <span class="sb-line"></span></div>
                <div>DOB: <span class="sb-line" style="width: 100px;"></span></div>
                <div>Date of Service: <span class="sb-line" style="width: 120px;"></span></div>
                <div>Ref Prov: <span class="sb-line"></span></div>
            </div>

            <table class="sb-table">
                <tr>
                    <td colspan="4" style="text-align: center; font-weight: bold; font-size: 14px; padding: 15px;">New Patient</td>
                    <td class="sb-checkbox"></td>
                    <td class="sb-checkbox"></td>
                    <td colspan="2">Comprehensive</td>
                    <td class="sb-checkbox"></td>
                    <td class="sb-checkbox"></td>
                    <td colspan="2">Extended</td>
                </tr>
                <tr>
                    <td class="sb-checkbox"></td>
                    <td class="sb-checkbox"></td>
                    <td colspan="2">Brief</td>
                    <td colspan="4" style="text-align: center; font-weight: bold; font-size: 14px; padding: 15px;">Established Patient</td>
                    <td class="sb-checkbox"></td>
                    <td class="sb-checkbox"></td>
                    <td colspan="2">Comprehensive</td>
                </tr>
                <tr>
                    <td class="sb-checkbox"></td>
                    <td class="sb-checkbox"></td>
                    <td colspan="2">Limited</td>
                    <td class="sb-checkbox"></td>
                    <td class="sb-checkbox"></td>
                    <td colspan="2">Brief</td>
                    <td colspan="4" rowspan="4" style="text-align: center; font-weight: bold; font-size: 14px; padding-top: 20px;">Notes</td>
                </tr>
                <tr>
                    <td class="sb-checkbox"></td>
                    <td class="sb-checkbox"></td>
                    <td colspan="2">Detailed</td>
                    <td class="sb-checkbox"></td>
                    <td class="sb-checkbox"></td>
                    <td colspan="2">Limited</td>
                </tr>
                <tr>
                    <td class="sb-checkbox"></td>
                    <td class="sb-checkbox"></td>
                    <td colspan="2">Extended</td>
                    <td class="sb-checkbox"></td>
                    <td class="sb-checkbox"></td>
                    <td colspan="2">Detailed</td>
                </tr>
                
                <tr>
                    <td colspan="3" style="height: 60px;">Patient:</td>
                    <td colspan="5">DOB: ID:</td>
                    <td colspan="4" rowspan="8">Notes:</td>
                </tr>
                <tr>
                    <td colspan="3" style="height: 60px;">Provider:</td>
                    <td colspan="5">Reason:</td>
                </tr>
                <tr>
                    <td colspan="8" style="height: 60px;">Insurance:</td>
                </tr>
                <tr>
                    <td colspan="8" style="height: 60px;">Prior Visit:</td>
                </tr>
                <tr>
                    <td colspan="8" style="height: 60px;">Today's Charges:</td>
                </tr>
                <tr>
                    <td colspan="8" style="height: 60px;">Today's Balance:</td>
                </tr>
                <tr>
                    <td colspan="8" style="height: 60px;">Notes:</td>
                </tr>
                <tr>
                    <td colspan="8" style="border-bottom: none; height: 60px;"></td>
                </tr>
                <tr>
                    <td colspan="8" style="border-top: none;"></td>
                    <td colspan="4" style="height: 80px; vertical-align: bottom;">Signature: <span style="display:inline-block; border-bottom: 1px solid #000; width: 80%; margin-left: 5px;"></span></td>
                </tr>
            </table>
            
        </div>
    `;
}
