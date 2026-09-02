function facilityBlock() {
    return `
        <div style="display: flex; justify-content: flex-end; align-items: flex-start; gap: 10px;">
            <div style="text-align: right; font-size: 11px; line-height: 1.3;">
                <strong class="rfFacName">Facility</strong><br>
                <span class="rfFacAddress">...</span><br>
                <span class="rfFacCityStateZip">...</span><br>
                <span class="rfFacCountry">...</span>
            </div>
            <table style="border-collapse: collapse; font-size: 11px;">
                <tr>
                    <td style="border: 1px solid #000; padding: 3px 6px; font-weight: bold;">Client ID</td>
                    <td style="border: 1px solid #000; padding: 3px 6px; width: 110px;">&nbsp;</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #000; padding: 3px 6px; font-weight: bold;">Date</td>
                    <td style="border: 1px solid #000; padding: 3px 6px; width: 110px;">&nbsp;</td>
                </tr>
            </table>
        </div>
    `;
}

function field(label, width = "auto") {
    return `<span style="white-space: nowrap;">${label} <span class="form-line" style="width: ${width};"></span></span>`;
}

export function ReferralFormView() {
    return `
        <div class="referral-form-wrapper" style="padding: 20px; font-family: Arial, sans-serif; background-color: #fff; min-height: 100%; color: #000; max-width: 700px; margin: 0 auto;">
            <style>
                @media print {
                    .no-print { display: none !important; }
                    .referral-form-wrapper { padding: 0 !important; max-width: 100% !important; margin: 0 !important; }
                    body, html { background: white !important; height: auto !important; overflow: visible !important; }
                    .top-nav, .sidebar, .tabs-header { display: none !important; }
                    .dashboard-container, .main-content, .tab-content, .tab-pane {
                        display: block !important;
                        height: auto !important;
                        overflow: visible !important;
                        position: static !important;
                    }
                    .rf-page { page-break-after: always; border: 1px solid #000 !important; }
                    .rf-page:last-child { page-break-after: auto; }
                }
                .rf-page { border: 1px solid #000; padding: 18px; margin-bottom: 25px; font-size: 12px; }
                .rf-title { font-size: 20px; font-weight: bold; margin: 0 0 10px; }
                .rf-copy-label { font-weight: bold; margin: 10px 0 14px; }
                .rf-section-title { font-weight: bold; margin: 14px 0 6px; }
                .rf-row { margin-bottom: 10px; display: flex; flex-wrap: wrap; gap: 18px; }
                .form-line { border-bottom: 1px solid #000; display: inline-block; min-width: 90px; height: 14px; margin-left: 4px; }
            </style>

            <div class="no-print" style="margin-bottom: 20px; text-align: right;">
                <button onclick="window.print()" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Print Form</button>
            </div>

            <div class="rf-page">
                <!-- Clinic Copy -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <h1 class="rf-title">Referral Form</h1>
                    ${facilityBlock()}
                </div>
                <div class="rf-copy-label">Clinic Copy</div>

                <div class="rf-section-title">Client medical history summary:</div>
                <div class="rf-row">
                    ${field("Blood pressure", "70px")} / ${field("", "70px")}
                    ${field("Height", "90px")}
                    ${field("Weight", "90px")}
                </div>
                <div class="rf-row">
                    ${field("Name", "200px")}
                    ${field("DOB", "110px")}
                    ${field("Age", "60px")}
                    ${field("Gender", "90px")}
                </div>
                <div class="rf-row">
                    ${field("Insurance", "110px")}
                    ${field("Plan", "90px")}
                    ${field("Policy", "90px")}
                    ${field("Group", "90px")}
                    ${field("Effective Date", "100px")}
                </div>
                <div class="rf-row">
                    ${field("Address", "220px")}
                    ${field("Postal", "100px")}
                    ${field("Phone", "120px")}
                </div>
                <div class="rf-row">${field("Reference Reason", "400px")}</div>
                <div class="rf-row">${field("Diagnosis", "400px")}</div>
                <div class="rf-row">${field("Reference classification (risk level)", "300px")}</div>
                <div class="rf-row">${field("Doctor's name and signature", "350px")}</div>
                <div class="rf-row">${field("Referred to", "70px")} / ${field("", "70px")}</div>

                <hr style="border: none; border-top: 1px dashed #999; margin: 20px 0;">

                <!-- Client Copy -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <h1 class="rf-title">Referral Form</h1>
                    ${facilityBlock()}
                </div>
                <div class="rf-copy-label">Client Copy</div>

                <div class="rf-row">
                    ${field("Name", "200px")}
                    ${field("Age", "60px")}
                    ${field("Gender", "90px")}
                </div>
                <div class="rf-row">
                    ${field("Insurance", "110px")}
                    ${field("Plan", "90px")}
                    ${field("Policy", "90px")}
                    ${field("Group", "90px")}
                    ${field("Effective Date", "100px")}
                </div>
                <div class="rf-row">${field("Health centre/clinic", "300px")}</div>
                <div class="rf-row">
                    ${field("Address", "220px")}
                    ${field("Postal", "100px")}
                    ${field("Phone", "120px")}
                </div>
                <div class="rf-row">${field("Reference Reason", "400px")}</div>

                <div class="rf-section-title">Client medical history summary:</div>
                <div class="rf-row">
                    ${field("Blood pressure", "70px")} / ${field("", "70px")}
                    ${field("Height", "90px")}
                    ${field("Weight", "90px")}
                </div>
                <div class="rf-row">${field("Referer name and signature", "350px")}</div>
                <div class="rf-row">${field("Specialist name and signature", "350px")}</div>
            </div>

            <div class="rf-page">
                <!-- Counter Referral Form -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <h1 class="rf-title">Counter Referral Form</h1>
                    ${facilityBlock()}
                </div>
                <div class="rf-copy-label">For Referred Organization/Practitioner</div>

                <div class="rf-row">
                    ${field("Name", "200px")}
                    ${field("Age", "60px")}
                    ${field("Gender", "90px")}
                </div>
                <div class="rf-row">
                    ${field("Insurance", "110px")}
                    ${field("Plan", "90px")}
                    ${field("Policy", "90px")}
                    ${field("Group", "90px")}
                    ${field("Effective Date", "100px")}
                </div>
                <div class="rf-row">${field("Health centre/clinic", "300px")}</div>
                <div class="rf-row">${field("Diagnosis", "400px")}</div>
                <div class="rf-row">${field("Findings", "400px")}</div>
                <div class="rf-row">${field("Final Diagnosis", "400px")}</div>
                <div class="rf-row">${field("Services provided", "400px")}</div>
                <div class="rf-row">${field("Recommendations and treatment", "400px")}</div>
                <div class="rf-row">${field("Prescriptions and other referrals", "300px")}</div>
                <div class="rf-row">${field("Specialist name and signature", "350px")}</div>
            </div>
        </div>
    `;
}
