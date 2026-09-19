export function ChartTrackerView() {
    return `
        <style>
        .chart-tracker-wrapper {
            padding: 24px;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            color: var(--text-primary, #1e293b);
            min-height: 100%;
        }

        .ct-title {
            font-size: 20px;
            font-weight: 700;
            color: var(--text-primary, #0f172a);
            margin-bottom: 22px;
            margin-top: 0;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        :root[data-theme="dark"] .ct-title {
            color: #f8fafc;
        }

        .ct-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 22px 24px;
            max-width: 640px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
            margin-bottom: 20px;
        }

        :root[data-theme="dark"] .ct-card {
            background: #1e293b;
            border-color: #334155;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
        }

        .ct-label {
            display: block;
            color: #475569;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 8px;
        }

        :root[data-theme="dark"] .ct-label {
            color: #94a3b8;
        }

        .ct-input {
            padding: 9px 12px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            font-size: 13.5px;
            width: 100%;
            box-sizing: border-box;
            background: #ffffff;
            color: #0f172a;
            outline: none;
            transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        :root[data-theme="dark"] .ct-input {
            background: #0f172a;
            border-color: #334155;
            color: #f8fafc;
        }

        .ct-input:focus {
            border-color: #0284c7;
            box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
        }

        .ct-btn-lookup {
            margin-top: 14px;
            padding: 7px 16px;
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            color: #334155;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.15s ease;
        }

        :root[data-theme="dark"] .ct-btn-lookup {
            background: #334155;
            border-color: #475569;
            color: #e2e8f0;
        }

        .ct-btn-lookup:hover {
            background: #f1f5f9;
            border-color: #94a3b8;
        }

        :root[data-theme="dark"] .ct-btn-lookup:hover {
            background: #475569;
            color: #f8fafc;
        }

        .ct-btn-save {
            margin-top: 14px;
            padding: 8px 18px;
            background: #0284c7;
            border: 1px solid #0284c7;
            border-radius: 6px;
            color: #ffffff;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: background 0.15s ease;
        }

        .ct-btn-save:hover {
            background: #0369a1;
        }

        .ct-info-grid {
            display: grid;
            grid-template-columns: 140px 1fr;
            row-gap: 10px;
            font-size: 13.5px;
            color: #1e293b;
            margin-bottom: 20px;
            background: #f8fafc;
            padding: 16px;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
        }

        :root[data-theme="dark"] .ct-info-grid {
            background: #0f172a;
            border-color: #334155;
            color: #f1f5f9;
        }

        .ct-info-lbl {
            color: #64748b;
            font-weight: 500;
        }

        :root[data-theme="dark"] .ct-info-lbl {
            color: #94a3b8;
        }

        .ct-error {
            color: #ef4444;
            font-size: 12.5px;
            margin-top: 10px;
            display: none;
        }

        :root[data-theme="dark"] .ct-error {
            color: #f87171;
        }

        .ct-msg {
            font-size: 12.5px;
            margin-top: 10px;
            display: none;
        }
        </style>

        <div class="chart-tracker-wrapper">
            <h2 class="ct-title">
                <i class="fas fa-folder-open" style="color: #0284c7;"></i>
                Chart Tracker
            </h2>

            <div id="ctLookupBox" class="ct-card">
                <label for="ctPatientIdInput" class="ct-label">New Patient ID:</label>
                <input
                    type="text"
                    id="ctPatientIdInput"
                    class="ct-input"
                    title="Type or scan the patient identifier (ID or patient number) to look up their chart."
                    placeholder="Enter Patient ID (e.g. PAT-000004 or 4)"
                >
                <button type="button" id="ctLookupBtn" class="ct-btn-lookup">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.3-4.3"></path>
                    </svg>
                    Look Up
                </button>
                <div id="ctLookupError" class="ct-error"></div>
            </div>

            <div id="ctPatientBox" class="ct-card" style="display: none;">
                <div class="ct-info-grid">
                    <div class="ct-info-lbl">Patient ID:</div>
                    <div id="ctPatientNo" style="font-weight: bold; color: #0284c7;"></div>
                    <div class="ct-info-lbl">Name:</div>
                    <div id="ctPatientName" style="font-weight: 600;"></div>
                    <div class="ct-info-lbl">DOB:</div>
                    <div id="ctPatientDob"></div>
                    <div class="ct-info-lbl">Current Location:</div>
                    <div id="ctCurrentLocation" style="font-weight: 500;"></div>
                </div>

                <label for="ctDestinationInput" class="ct-label">Check In To:</label>
                <input
                    type="text"
                    id="ctDestinationInput"
                    class="ct-input"
                    placeholder="e.g. File Room, Exam Room 2, Records Archive"
                    style="max-width: 360px;"
                >
                <div>
                    <button type="button" id="ctSaveBtn" class="ct-btn-save">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Save Location
                    </button>
                </div>
                <div id="ctSaveMsg" class="ct-msg"></div>
            </div>
        </div>
    `;
}
