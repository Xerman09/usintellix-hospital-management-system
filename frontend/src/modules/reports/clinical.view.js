export function ClinicalReportView() {
    const today = new Date().toISOString().split('T')[0] + ' 13:32:15';
    const firstDayOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0] + ' 13:32:15';

    return `
        <div class="clinical-report-wrapper" style="padding: 20px;">
            <h2 style="font-size: 24px; color: #1a365d; margin-bottom: 24px; font-weight: 500;">Report - Clinical</h2>
            
            <form id="crReportForm" style="display: flex; gap: 40px; align-items: flex-start; max-width: 1300px;">
                <!-- Left Column -->
                <div style="flex: 1; display: grid; grid-template-columns: 80px 1fr 60px 1fr; gap: 15px; align-items: center;">
                    <label style="color: #4a5568; font-size: 14px;">Facility:</label>
                    <select id="crFacility" style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 4px; width: 100%; box-sizing: border-box; color: #2d3748; background-color: white;">
                        <option value="All">-- All Facilities --</option>
                    </select>

                    <label style="color: #4a5568; font-size: 14px; text-align: right; padding-right: 10px;">From:</label>
                    <input type="text" id="crDateFrom" value="${firstDayOfYear}" style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 4px; width: 100%; box-sizing: border-box; color: #2d3748;">
                    
                    <label style="color: #4a5568; font-size: 14px;">Patient ID:</label>
                    <input type="text" id="crPatientId" style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 4px; width: 100%; box-sizing: border-box; color: #2d3748;">
                    
                    <label style="color: #4a5568; font-size: 14px; text-align: right; padding-right: 10px;">To:</label>
                    <input type="text" id="crDateTo" value="${today}" style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 4px; width: 100%; box-sizing: border-box; color: #2d3748;">

                    <label style="color: #4a5568; font-size: 14px;">Age Range:</label>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 14px; color: #4a5568;">From</span>
                        <input type="number" id="crAgeMin" style="padding: 8px; border: 1px solid #e2e8f0; border-radius: 4px; width: 60px; box-sizing: border-box; color: #2d3748;">
                        <span style="font-size: 14px; color: #4a5568;">To</span>
                        <input type="number" id="crAgeMax" style="padding: 8px; border: 1px solid #e2e8f0; border-radius: 4px; width: 60px; box-sizing: border-box; color: #2d3748;">
                    </div>

                    <label style="color: #4a5568; font-size: 14px; text-align: right; padding-right: 10px;">Problem DX:</label>
                    <input type="text" id="crProblemDx" style="padding: 8px 12px; border: 1px solid #cbd5e0; border-radius: 4px; width: 100%; box-sizing: border-box; background-color: #e2e8f0;" disabled>

                    <label style="color: #4a5568; font-size: 14px;">Gender:</label>
                    <select id="crGender" style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 4px; width: 100%; box-sizing: border-box; color: #2d3748; background-color: white;">
                        <option value="Unassigned">Unassigned</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                    </select>

                    <label style="color: #4a5568; font-size: 14px; text-align: right; padding-right: 10px;">Drug:</label>
                    <input type="text" id="crDrug" style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 4px; width: 100%; box-sizing: border-box; color: #2d3748;">

                    <label style="color: #4a5568; font-size: 14px;">Race:</label>
                    <select id="crRace" style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 4px; width: 100%; box-sizing: border-box; color: #2d3748; background-color: white;">
                        <option value="Unassigned">Unassigned</option>
                        <option value="White">White</option>
                        <option value="American Indian or Alaska Native">American Indian or Alaska Native</option>
                        <option value="Asian">Asian</option>
                        <option value="Black or African American">Black or African American</option>
                        <option value="Native Hawaiian or Other Pacific Islander">Native Hawaiian or Other Pacific Islander</option>
                    </select>

                    <label style="color: #4a5568; font-size: 14px; text-align: right; padding-right: 10px;">Ethnicity:</label>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <select id="crEthnicity" style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 4px; width: 100%; box-sizing: border-box; color: #2d3748; background-color: white;">
                            <option value="Unassigned">Unassigned</option>
                            <option value="Hispanic or Latino">Hispanic or Latino</option>
                            <option value="Not Hispanic or Latino">Not Hispanic or Latino</option>
                        </select>
                        <label style="color: #4a5568; font-size: 14px;">Immunization:</label>
                        <input type="text" id="crImmunization" style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 4px; width: 100px; box-sizing: border-box; color: #2d3748;">
                    </div>

                    <label style="color: #4a5568; font-size: 14px;">Lab Result:</label>
                    <input type="text" id="crLabResult" style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 4px; width: 100%; box-sizing: border-box; color: #2d3748;">

                    <label style="color: #4a5568; font-size: 14px; text-align: right; padding-right: 10px;">Option:</label>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <select id="crOption" style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 4px; width: 100%; box-sizing: border-box; color: #2d3748; background-color: white;">
                            <option value="Select">Select</option>
                        </select>
                        <label style="color: #4a5568; font-size: 14px;">Communication:</label>
                        <select id="crCommunication" style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 4px; width: 100px; box-sizing: border-box; color: #2d3748; background-color: white;">
                            <option value="Select">Select</option>
                        </select>
                    </div>
                </div>

                <!-- Right Column (Divider and Button) -->
                <div style="display: flex; gap: 24px; align-items: center; height: 100%;">
                    <div style="width: 1px; background-color: #cbd5e0; height: 180px;"></div>
                    <div style="display: flex; background: #e2e8f0; border-radius: 4px; border: 1px solid #cbd5e0; overflow: hidden; height: fit-content;">
                        <button type="submit" style="padding: 8px 16px; background: transparent; border: none; border-right: 1px solid #cbd5e0; color: #2d3748; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 14px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Submit
                        </button>
                        <button type="button" id="crPrintBtn" style="padding: 8px 16px; background: transparent; border: none; color: #2d3748; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 14px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                            Print
                        </button>
                    </div>
                </div>
            </form>

            <div style="margin-top: 20px; margin-bottom: 30px; display: flex; gap: 20px; align-items: center;">
                <span style="font-size: 14px; color: #4a5568;">Sort By:</span>
                <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #4a5568;">
                    <input type="checkbox" id="crSortName"> Patient Name
                </label>
                <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #4a5568;">
                    <input type="checkbox" id="crSortAge"> Age
                </label>
                <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #4a5568;">
                    <input type="checkbox" id="crSortAllergies"> Allergies
                </label>
                <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #4a5568;">
                    <input type="checkbox" id="crSortMedical"> Medical Problems
                </label>
                <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #4a5568;">
                    <input type="checkbox" id="crSortDrug"> Drug
                </label>
                <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #4a5568;">
                    <input type="checkbox" id="crSortNDC"> NDC Number
                </label>
                <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #4a5568;">
                    <input type="checkbox" id="crSortLab"> Lab Results
                </label>
                <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #4a5568;">
                    <input type="checkbox" id="crSortCommunication"> Communication
                </label>
            </div>

            <div id="crResultsContainer" style="background: white; margin-top: 10px;">
                <div style="padding: 40px; text-align: center; color: #718096; font-style: italic; border: 1px solid #e2e8f0;">Please input search criteria above, and click Submit to view results.</div>
            </div>
        </div>
    `;
}
