export function RealWorldTestingView() {
    return `
        <div class="rwt-wrapper" style="padding: 20px; font-family: Arial, sans-serif; background-color: #fff; min-height: 100%;">
            <h2 style="font-size: 20px; color: #1a365d; margin-bottom: 20px; font-weight: normal; margin-top: 0;">2026 Real World Testing Report</h2>

            <div id="rwtInitialBanner" style="background-color: #dbeafe; padding: 16px; border-radius: 4px; margin-bottom: 20px; color: #1e3a8a; font-size: 13px; line-height: 1.5;">
                This report is required for IHS instances in the United States that utilize ONC certification. This reports collects metrics that are used in Real World Testing that are required for the IHS Foundation to maintain the ONC certification. This report calculates metrics from April 1, 2026 to September 30, 2026. Please run this report sometime in October or November of 2026 and then print it to a pdf and email the pdf to the IHS Foundation at hello@ihs.org. In the email, please confirm your practice is in the United States and state the clinical setting of your practice (this can be \`Primary/Specialty Care\` setting, \`Behavioral Health Care\` setting, or any other setting).
            </div>

            <div id="rwtResultBanner" style="background-color: #dbeafe; padding: 16px; border-radius: 4px; margin-bottom: 20px; color: #1e3a8a; font-size: 13px; line-height: 1.5; display: none;">
                Please print this report to a pdf and email the pdf to the IHS Foundation at hello@ihs.org. In the email, please confirm your practice is in the United States and state the clinical setting of your practice (this can be \`Primary/Specialty Care\` setting, \`Behavioral Health Care\` setting, or any other setting).
            </div>

            <button type="button" id="rwtStartBtn" style="padding: 8px 16px; background-color: #007bff; border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 14px; margin-bottom: 20px;">
                Start Report
            </button>
            
            <button type="button" id="rwtPrintBtn" style="padding: 8px 16px; background-color: #007bff; border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 14px; margin-bottom: 20px; display: none;">
                Print Report
            </button>

            <div id="rwtContent" style="display: none; font-size: 13px; color: #1a202c; line-height: 1.6;">
                <div style="margin-bottom: 20px;">
                    Date: <span id="rwtDate"></span>
                </div>
                
                <div id="rwtMetricsContainer">
                    <!-- Metrics will be loaded here -->
                </div>
            </div>
        </div>
    `;
}
