export function DemographicsFormView() {
    return `
        <div class="demographics-form-wrapper" style="padding: 20px; font-family: sans-serif; background-color: #fff; min-height: 100%; color: #000; max-width: 900px; margin: 0 auto;">
            <style>
                @media print {
                    .no-print { display: none !important; }
                    .demographics-form-wrapper { padding: 0 !important; max-width: 100% !important; margin: 0 !important; }
                    body, html { background: white !important; height: auto !important; overflow: visible !important; }
                    .top-nav, .sidebar, .tabs-header { display: none !important; }
                    .dashboard-container, .main-content, .tab-content, .tab-pane { 
                        display: block !important; 
                        height: auto !important; 
                        overflow: visible !important; 
                        position: static !important; 
                    }
                }
                .section-title { font-size: 16px; font-weight: bold; margin-top: 20px; margin-bottom: 5px; }
                .form-box { border: 1px solid #000; padding: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; }
                .form-box-full { border: 1px solid #000; padding: 10px; display: grid; grid-template-columns: 1fr; gap: 4px; }
                .form-row { display: flex; align-items: baseline; justify-content: space-between; }
                .form-label { font-size: 12px; font-weight: bold; white-space: nowrap; }
                .form-line { border-bottom: 1px solid #999; flex-grow: 1; margin-left: 10px; height: 16px; }
                .form-row-full { display: flex; align-items: baseline; grid-column: 1 / -1; }
            </style>
            
            <div class="no-print" style="margin-bottom: 20px; text-align: right;">
                <button onclick="window.print()" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Print Form</button>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                <h2 style="font-size: 20px; font-weight: bold; margin: 0;">Registration Form</h2>
                <div style="text-align: right; font-size: 12px; line-height: 1.2;">
                    <strong id="demoFacName">Facility</strong><br>
                    <span id="demoFacAddress">...</span><br>
                    <span id="demoFacCityStateZip">...</span><br>
                    <span id="demoFacCountry">...</span>
                </div>
            </div>

            <!-- WHO -->
            <div class="section-title">Who</div>
            <div class="form-box">
                <div class="form-row-full"><div class="form-label">Title:</div><div class="form-line"></div></div>
                <div class="form-row-full"><div class="form-label">Name:</div><div class="form-line"></div></div>
                <div class="form-row-full"><div class="form-label">Preferred Name:</div><div class="form-line"></div></div>
                
                <div class="form-row"><div class="form-label">External ID:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">DOB:</div><div class="form-line"></div></div>
                
                <div class="form-row"><div class="form-label">Birth Sex:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">S.S.:</div><div class="form-line"></div></div>
                
                <div class="form-row"><div class="form-label">License/ID:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">Marital Status:</div><div class="form-line"></div></div>
                
                <div class="form-row-full"><div class="form-label">User Defined:</div><div class="form-line"></div></div>
                <div class="form-row-full"><div class="form-label">Billing Note:</div><div class="form-line"></div></div>
                
                <div class="form-row"><div class="form-label">Gender Identity:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">Sex:</div><div class="form-line"></div></div>
                
                <div class="form-row"><div class="form-label">Sexual Orientation:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">Pronouns:</div><div class="form-line"></div></div>
                
                <div class="form-row-full"><div class="form-label">Birth Name:</div><div class="form-line"></div></div>
                <div class="form-row-full"><div class="form-label">Previous Names:</div><div class="form-line"></div></div>
            </div>

            <!-- CONTACT -->
            <div class="section-title" style="margin-top: 30px;">Contact</div>
            <div class="form-box">
                <div class="form-row"><div class="form-label">Address:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">Address Line 2:</div><div class="form-line"></div></div>
                
                <div class="form-row"><div class="form-label">City:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">State:</div><div class="form-line"></div></div>
                
                <div class="form-row"><div class="form-label">Postal Code:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">Country:</div><div class="form-line"></div></div>
                
                <div class="form-row"><div class="form-label">Mother's Name:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">Emergency Contact:</div><div class="form-line"></div></div>
                
                <div class="form-row"><div class="form-label">Emergency Phone:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">Home Phone:</div><div class="form-line"></div></div>
                
                <div class="form-row"><div class="form-label">Work Phone:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">Mobile Phone:</div><div class="form-line"></div></div>
                
                <div class="form-row"><div class="form-label">Contact Email:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">Trusted Email:</div><div class="form-line"></div></div>
                
                <div class="form-row-full" style="margin-top: 150px;"><div class="form-label">County:</div><div class="form-line" style="max-width: 300px;"></div></div>
            </div>
            
            <div style="page-break-after: always;"></div>

            <!-- CHOICES -->
            <div class="section-title">Choices</div>
            <div class="form-box">
                <div class="form-row"><div class="form-label">Provider:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">Provide Since Date:</div><div class="form-line"></div></div>
                
                <div class="form-row-full"><div class="form-label">Referring Provider:</div><div class="form-line"></div></div>
                <div class="form-row-full"><div class="form-label">Pharmacy:</div><div class="form-line"></div></div>
                
                <div class="form-row"><div class="form-label">HIPAA Notice Received:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">Allow Voice Message:</div><div class="form-line"></div></div>
                
                <div class="form-row"><div class="form-label">Leave Message With:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">Allow Mail Message:</div><div class="form-line"></div></div>
                
                <div class="form-row"><div class="form-label">Allow SMS:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">Allow Email:</div><div class="form-line"></div></div>
                
                <div class="form-row"><div class="form-label">Allow Immunization<br>Registry Use:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">Allow Immunization<br>Info Sharing:</div><div class="form-line"></div></div>
                
                <div class="form-row"><div class="form-label">Allow Health<br>Information Exchange:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">Allow Patient Portal:</div><div class="form-line"></div></div>
                
                <div class="form-row"><div class="form-label">Prevent API Access:</div><div style="border: 1px solid #000; width: 12px; height: 12px; margin-left: 10px;"></div></div>
                <div class="form-row"><div class="form-label">CMS Portal Login:</div><div class="form-line"></div></div>
                
                <div class="form-row"><div class="form-label">Immunization Registry<br>Status:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">Immunization<br>Registry Status<br>Effective Date:</div><div class="form-line"></div></div>
                
                <div class="form-row"><div class="form-label">Publicity Code:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">Publicity Code<br>Effective Date:</div><div class="form-line"></div></div>
                
                <div class="form-row"><div class="form-label">Protection Indicator:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">Protection Indicator<br>Effective Date:</div><div class="form-line"></div></div>
                
                <div class="form-row-full"><div class="form-label">Patient Categories:</div><div class="form-line"></div></div>
            </div>

            <!-- EMPLOYER -->
            <div class="section-title" style="margin-top: 30px;">Employer</div>
            <div class="form-box">
                <div class="form-row"><div class="form-label">Occupation:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">Employer Name:</div><div class="form-line"></div></div>
                
                <div class="form-row"><div class="form-label">Employer Address:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">Employer Address<br>Line 2:</div><div class="form-line"></div></div>
                
                <div class="form-row"><div class="form-label">City:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">State:</div><div class="form-line"></div></div>
                
                <div class="form-row"><div class="form-label">Postal Code:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">Country:</div><div class="form-line"></div></div>
                
                <div class="form-row"><div class="form-label">Industry:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">Employment Start<br>Date:</div><div class="form-line"></div></div>
                
                <div class="form-row"><div class="form-label">Employment End Date:</div><div class="form-line"></div></div>
            </div>

            <!-- STATS -->
            <div class="section-title" style="margin-top: 30px;">Stats</div>
            <div class="form-box">
                <div class="form-row-full"><div class="form-label">Language:</div><div class="form-line"></div></div>
                
                <div class="form-row"><div class="form-label">Ethnicity:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">Race:</div><div class="form-line"></div></div>
                
                <div class="form-row"><div class="form-label">Nationality:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">Family Size:</div><div class="form-line"></div></div>
                
                <div class="form-row"><div class="form-label">Financial Review Date:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">Monthly Income:</div><div class="form-line"></div></div>
                
                <div class="form-row"><div class="form-label">Homeless, etc.:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">Interpreter:</div><div class="form-line"></div></div>
                
                <div class="form-row"><div class="form-label">Interpreter Comments:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">Migrant/Seasonal:</div><div class="form-line"></div></div>
                
                <div class="form-row"><div class="form-label">Referral Source:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">VFC:</div><div class="form-line"></div></div>
                
                <div class="form-row-full"><div class="form-label">Religion:</div><div class="form-line" style="max-width: 300px;"></div></div>
                <div class="form-row-full"><div class="form-label">Tribal Affiliations:</div><div class="form-line" style="max-width: 300px;"></div></div>
            </div>

            <div style="page-break-after: always;"></div>

            <!-- MISC -->
            <div class="section-title">Misc</div>
            <div class="form-box-full">
                <div class="form-row"><div class="form-label">Date Deceased:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">Reason Deceased:</div><div class="form-line"></div></div>
            </div>

            <!-- RELATED -->
            <div class="section-title" style="margin-top: 30px;">Related</div>
            <div class="form-box" style="min-height: 400px; align-items: start;">
                <div class="form-row"><div class="form-label">Guardian Name:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">Relationship:</div><div class="form-line"></div></div>
                
                <div class="form-row"><div class="form-label">Sex:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">Address:</div><div class="form-line"></div></div>
                
                <div class="form-row"><div class="form-label">City:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">State:</div><div class="form-line"></div></div>
                
                <div class="form-row"><div class="form-label">Postal Code:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">Country:</div><div class="form-line"></div></div>
                
                <div class="form-row"><div class="form-label">Phone:</div><div class="form-line"></div></div>
                <div class="form-row"><div class="form-label">Work Phone:</div><div class="form-line"></div></div>
                
                <div class="form-row-full" style="align-self: end;"><div class="form-label">Email:</div><div class="form-line" style="max-width: 300px;"></div></div>
            </div>
            
        </div>
    `;
}
