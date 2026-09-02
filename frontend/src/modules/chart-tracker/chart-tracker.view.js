export function ChartTrackerView() {
    return `
        <div class="chart-tracker-wrapper" style="padding: 20px; font-family: Arial, sans-serif; background-color: #fff; min-height: 100%;">
            <h2 style="font-size: 20px; color: #1a365d; margin-bottom: 25px; font-weight: normal; margin-top: 0;">Chart Tracker</h2>

            <div id="ctLookupBox" style="background: #e9ebee; padding: 20px; max-width: 640px; border-radius: 4px;">
                <label for="ctPatientIdInput" style="display: block; color: #2d3748; font-size: 13px; margin-bottom: 8px;">New Patient ID:</label>
                <input
                    type="text"
                    id="ctPatientIdInput"
                    title="Type or scan the patient identifier (ID or patient number) to look up their chart."
                    style="padding: 8px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 13px; width: 100%; box-sizing: border-box; background: #fff;"
                >
                <button type="button" id="ctLookupBtn" style="margin-top: 12px; padding: 6px 14px; background: #fff; border: 1px solid #cbd5e0; border-radius: 4px; color: #2d3748; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 6px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
                    Look Up
                </button>
                <div id="ctLookupError" style="color: #e53e3e; font-size: 12px; margin-top: 10px; display: none;"></div>
            </div>

            <div id="ctPatientBox" style="display: none; margin-top: 25px; max-width: 640px; border: 1px solid #cbd5e0; border-radius: 4px; padding: 20px;">
                <div style="display: grid; grid-template-columns: 140px 1fr; row-gap: 8px; font-size: 13px; color: #2d3748; margin-bottom: 18px;">
                    <div style="color: #4a5568;">Patient ID:</div><div id="ctPatientNo" style="font-weight: bold;"></div>
                    <div style="color: #4a5568;">Name:</div><div id="ctPatientName"></div>
                    <div style="color: #4a5568;">DOB:</div><div id="ctPatientDob"></div>
                    <div style="color: #4a5568;">Current Location:</div><div id="ctCurrentLocation"></div>
                </div>

                <label for="ctDestinationInput" style="display: block; color: #2d3748; font-size: 13px; margin-bottom: 8px;">Check In To:</label>
                <input
                    type="text"
                    id="ctDestinationInput"
                    placeholder="e.g. File Room, Exam Room 2"
                    style="padding: 8px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 13px; width: 100%; max-width: 320px; box-sizing: border-box;"
                >
                <div>
                    <button type="button" id="ctSaveBtn" style="margin-top: 12px; padding: 6px 14px; background: #2563eb; border: 1px solid #2563eb; border-radius: 4px; color: #fff; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; gap: 6px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Save
                    </button>
                </div>
                <div id="ctSaveMsg" style="font-size: 12px; margin-top: 10px; display: none;"></div>
            </div>
        </div>
    `;
}
