export function EligibilityResponseView() {
    return `
        <div class="eligibility-response-wrapper" style="padding: 20px; font-family: Arial, sans-serif; background-color: #fff; min-height: 100%;">
            <h2 style="font-size: 20px; color: #1a365d; margin-bottom: 30px; font-weight: normal; margin-top: 0;">EDI-271 File Upload</h2>

            <form id="edi271Form" style="display: flex; gap: 20px; align-items: center;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <label style="color: #4a5568; font-size: 13px;">Select EDI-271 file:</label>
                    <input type="file" id="edi271File" accept=".txt" style="font-size: 13px;">
                </div>
                
                <div style="width: 1px; background-color: #e2e8f0; height: 40px;"></div>
                
                <button type="button" id="edi271UploadBtn" style="padding: 8px 16px; background-color: #007bff; border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 14px;">
                    Upload
                </button>
            </form>
            
            <div id="edi271Status" style="margin-top: 20px; font-size: 13px; font-style: italic;"></div>
        </div>
    `;
}
