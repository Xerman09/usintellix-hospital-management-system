export function PatientEducationView() {
    return `
        <div class="patient-education-wrapper" style="padding: 20px; font-family: Arial, sans-serif; background-color: #fff; min-height: 100%;">
            <h2 style="font-size: 20px; color: #1a365d; margin-bottom: 25px; font-weight: normal; margin-top: 0;">Web Search - Patient Education Materials</h2>

            <form id="peForm">
                <div style="margin-bottom: 18px;">
                    <label for="peResource" style="display: block; color: #4a5568; font-size: 13px; margin-bottom: 6px;">Patient Resource</label>
                    <select id="peResource" style="padding: 7px 10px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 13px; width: 100%; max-width: 500px; background: #fff;">
                        <option value="emedicine">eMedicine</option>
                        <option value="medlineplus">MedlinePlus</option>
                        <option value="familydoctor">Family Doctor</option>
                        <option value="kidshealth">KidsHealth</option>
                        <option value="medicinenet">MedicineNet</option>
                        <option value="webmd">WebMD</option>
                        <option value="mayoclinic">Mayo Clinic</option>
                        <option value="wikipedia">Wikipedia</option>
                        <option value="google">Google</option>
                    </select>
                </div>

                <div style="margin-bottom: 8px;">
                    <label for="peSearch" style="display: block; color: #4a5568; font-size: 13px; margin-bottom: 6px;">Search</label>
                    <input type="text" id="peSearch" style="padding: 7px 10px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 13px; width: 100%; max-width: 500px;">
                </div>

                <div id="peInstructionText" style="font-size: 12px; color: #2d3748; margin-bottom: 18px;">
                    Please input search criteria above, and click Submit to view results. (Results will be displayed in a pop up window)
                </div>

                <button type="submit" id="peSubmitBtn" style="padding: 6px 14px; background: #e2e8f0; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 6px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
                    Submit
                </button>
            </form>
        </div>
    `;
}
