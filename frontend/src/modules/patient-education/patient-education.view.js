export function PatientEducationView() {
    return `
<style>
.patient-education-wrapper {
    padding: 24px;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background-color: var(--bg-surface, #ffffff);
    color: var(--text-primary, #1e293b);
    min-height: 100%;
    box-sizing: border-box;
}

.pe-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 24px;
}

.pe-page-title {
    font-size: 22px;
    color: var(--text-primary, #1e3a8a);
    font-weight: 500;
    margin: 0;
    letter-spacing: -0.01em;
}

:root[data-theme="dark"] .pe-page-title {
    color: #93c5fd;
}

.pe-patient-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    background: rgba(2, 132, 199, 0.1);
    color: #0284c7;
    border: 1px solid rgba(2, 132, 199, 0.2);
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
}

:root[data-theme="dark"] .pe-patient-badge {
    background: rgba(56, 189, 248, 0.15);
    color: #38bdf8;
    border-color: rgba(56, 189, 248, 0.3);
}

.pe-form-group {
    margin-bottom: 18px;
}

.pe-label {
    display: block;
    color: var(--text-secondary, #475569);
    font-size: 13.5px;
    margin-bottom: 6px;
    font-weight: 500;
}

:root[data-theme="dark"] .pe-label {
    color: #94a3b8;
}

.pe-select, .pe-input {
    padding: 8px 12px;
    border: 1px solid var(--border-color, #cbd5e1);
    border-radius: 4px;
    font-size: 13.5px;
    width: 100%;
    max-width: 520px;
    background: var(--bg-surface, #ffffff);
    color: var(--text-primary, #0f172a);
    box-sizing: border-box;
    transition: border-color 0.15s, box-shadow 0.15s;
}

.pe-select:focus, .pe-input:focus {
    outline: none;
    border-color: #0284c7;
    box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
}

:root[data-theme="dark"] .pe-select, :root[data-theme="dark"] .pe-input {
    background: #1e293b;
    border-color: #475569;
    color: #f8fafc;
}

.pe-quick-chips {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 8px;
    max-width: 520px;
}

.pe-chip-label {
    font-size: 11.5px;
    color: var(--text-muted, #64748b);
}

.pe-chip {
    background: var(--bg-surface-alt, #f1f5f9);
    border: 1px solid var(--border-color, #e2e8f0);
    border-radius: 14px;
    padding: 3px 10px;
    font-size: 11.5px;
    color: var(--text-secondary, #475569);
    cursor: pointer;
    transition: all 0.15s ease;
}

.pe-chip:hover {
    background: #0284c7;
    color: #ffffff;
    border-color: #0284c7;
}

:root[data-theme="dark"] .pe-chip {
    background: #334155;
    border-color: #475569;
    color: #cbd5e1;
}

.pe-instruction-text {
    font-size: 12.5px;
    color: var(--text-secondary, #334155);
    margin-top: 14px;
    margin-bottom: 20px;
    line-height: 1.5;
}

:root[data-theme="dark"] .pe-instruction-text {
    color: #94a3b8;
}

.pe-submit-btn {
    padding: 7px 18px;
    background: #e2e8f0;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    color: #1e293b;
    cursor: pointer;
    font-size: 13.5px;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    transition: all 0.15s ease;
}

.pe-submit-btn:hover {
    background: #cbd5e1;
    border-color: #94a3b8;
}

:root[data-theme="dark"] .pe-submit-btn {
    background: #334155;
    border-color: #475569;
    color: #f1f5f9;
}

:root[data-theme="dark"] .pe-submit-btn:hover {
    background: #475569;
    color: #ffffff;
}

/* Pop-up Results Modal */
.pe-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(2px);
    z-index: 9999;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 20px;
    box-sizing: border-box;
}

.pe-modal-card {
    background: var(--bg-surface, #ffffff);
    border: 1px solid var(--border-color, #cbd5e1);
    border-radius: 8px;
    width: 100%;
    max-width: 900px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3), 0 8px 10px -6px rgba(0,0,0,0.2);
    overflow: hidden;
    color: var(--text-primary, #0f172a);
}

:root[data-theme="dark"] .pe-modal-card {
    background: #1e293b;
    border-color: #334155;
    color: #f8fafc;
}

.pe-modal-header {
    padding: 14px 20px;
    background: var(--bg-surface-alt, #f8fafc);
    border-bottom: 1px solid var(--border-color, #e2e8f0);
    display: flex;
    align-items: center;
    justify-content: space-between;
}

:root[data-theme="dark"] .pe-modal-header {
    background: #0f172a;
    border-bottom-color: #334155;
}

.pe-modal-title {
    font-size: 15.5px;
    font-weight: 600;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
}

.pe-modal-actions {
    display: flex;
    align-items: center;
    gap: 10px;
}

.pe-modal-close {
    background: none;
    border: none;
    font-size: 22px;
    line-height: 1;
    color: #64748b;
    cursor: pointer;
    padding: 0;
}

:root[data-theme="dark"] .pe-modal-close {
    color: #94a3b8;
}

.pe-modal-body {
    padding: 20px;
    overflow-y: auto;
    font-size: 13.5px;
    line-height: 1.6;
}

.pe-modal-footer {
    padding: 12px 20px;
    background: var(--bg-surface-alt, #f8fafc);
    border-top: 1px solid var(--border-color, #e2e8f0);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

:root[data-theme="dark"] .pe-modal-footer {
    background: #0f172a;
    border-top-color: #334155;
}

.pe-result-card {
    background: var(--bg-surface, #ffffff);
    border: 1px solid var(--border-color, #e2e8f0);
    border-radius: 6px;
    padding: 16px;
    margin-bottom: 14px;
    transition: all 0.15s ease;
}

.pe-result-card:hover {
    border-color: #0284c7;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
}

:root[data-theme="dark"] .pe-result-card {
    background: #0f172a;
    border-color: #334155;
}

.pe-result-title {
    font-size: 16px;
    font-weight: 600;
    color: #0284c7;
    margin: 0 0 4px 0;
    cursor: pointer;
}

:root[data-theme="dark"] .pe-result-title {
    color: #38bdf8;
}

.pe-result-meta {
    font-size: 11.5px;
    color: var(--text-muted, #64748b);
    margin-bottom: 8px;
    display: flex;
    gap: 12px;
}

.pe-result-snippet {
    font-size: 13px;
    color: var(--text-secondary, #334155);
    line-height: 1.5;
    margin-bottom: 12px;
}

:root[data-theme="dark"] .pe-result-snippet {
    color: #cbd5e1;
}

.pe-result-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.pe-btn-act {
    padding: 5px 12px;
    font-size: 12px;
    border-radius: 4px;
    border: 1px solid var(--border-color, #cbd5e1);
    background: var(--bg-surface-alt, #f8fafc);
    color: var(--text-primary, #0f172a);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-weight: 500;
    transition: all 0.15s;
}

.pe-btn-act:hover {
    background: #0284c7;
    color: #ffffff;
    border-color: #0284c7;
}

:root[data-theme="dark"] .pe-btn-act {
    background: #1e293b;
    border-color: #475569;
    color: #f1f5f9;
}

/* Printable Handout Area */
@media print {
    body * {
        visibility: hidden;
    }
    #pePrintContainer, #pePrintContainer * {
        visibility: visible;
    }
    #pePrintContainer {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        color: #000;
        background: #fff;
    }
}
</style>

<div class="patient-education-wrapper">
    <div class="pe-header-row">
        <h2 class="pe-page-title">Web Search - Patient Education Materials</h2>
        <div id="peActivePatientBadge" class="pe-patient-badge" style="display: none;">
            <span>👤</span>
            <span id="peActivePatientLabel">Doc Ako (PAT-000004)</span>
        </div>
    </div>

    <form id="peForm">
        <div class="pe-form-group">
            <label for="peResource" class="pe-label">Patient Resource</label>
            <select id="peResource" class="pe-select">
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

        <div class="pe-form-group">
            <label for="peSearch" class="pe-label">Search</label>
            <input type="text" id="peSearch" class="pe-input" placeholder="e.g. Hypertension, Type 2 Diabetes, Asthma, Diet...">
            
            <div class="pe-quick-chips">
                <span class="pe-chip-label">Quick topics:</span>
                <span class="pe-chip" data-query="Hypertension">Hypertension</span>
                <span class="pe-chip" data-query="Type 2 Diabetes">Type 2 Diabetes</span>
                <span class="pe-chip" data-query="Asthma">Asthma</span>
                <span class="pe-chip" data-query="Healthy Nutrition">Healthy Nutrition</span>
                <span class="pe-chip" data-query="Fever & Flu">Fever &amp; Flu</span>
                <span class="pe-chip" data-query="Heart Health">Heart Health</span>
            </div>
        </div>

        <div id="peInstructionText" class="pe-instruction-text">
            Please input search criteria above, and click Submit to view results. (Results will be displayed in a pop up window)
        </div>

        <button type="submit" id="peSubmitBtn" class="pe-submit-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
            Submit
        </button>
    </form>
</div>

<!-- Pop-up Results Window (Modal) -->
<div class="pe-modal-overlay" id="peResultsModal">
    <div class="pe-modal-card">
        <div class="pe-modal-header">
            <div class="pe-modal-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/></svg>
                <span>Patient Education: <strong id="peModalQueryText"></strong></span>
                <span style="font-size: 11px; font-weight: 500; background: rgba(2, 132, 199, 0.15); color: #0284c7; padding: 2px 8px; border-radius: 4px;" id="peModalResourceBadge">MedlinePlus</span>
            </div>
            <div class="pe-modal-actions">
                <button type="button" class="pe-btn-act" id="peBtnOpenExternal" title="Open live search on external site">
                    <span>Open Live Website ↗</span>
                </button>
                <button type="button" class="pe-modal-close" id="closePeModal">&times;</button>
            </div>
        </div>
        <div class="pe-modal-body" id="peModalBody">
            <div id="peResultsList">
                <!-- Search Result Handouts Populated Here -->
            </div>
            <div id="peHandoutReader" style="display: none;">
                <!-- Full Printable Handout View -->
            </div>
        </div>
        <div class="pe-modal-footer">
            <div style="font-size: 12px; color: var(--text-muted, #64748b);">
                Intellix Clinical Education Library &bull; Patient Reference Materials
            </div>
            <div style="display: flex; gap: 8px;">
                <button type="button" class="pe-btn-act" id="peBackToListBtn" style="display: none;">&larr; Back to Results</button>
                <button type="button" class="pe-btn-act" id="peCloseModalBtn">Close Window</button>
            </div>
        </div>
    </div>
</div>

<!-- Hidden container used for clean window.print() -->
<div id="pePrintContainer" style="display: none;"></div>
    `;
}