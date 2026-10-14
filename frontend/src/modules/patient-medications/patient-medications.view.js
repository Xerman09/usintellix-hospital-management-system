export function PatientMedicationsView() {
    return `
<style>
.pmed-page {
    padding: 24px 32px 48px;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #1e293b;
    max-width: 1200px;
    margin: 0 auto;
}

.pmed-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 24px;
    flex-wrap: wrap;
    gap: 16px;
}

.pmed-title-group h2 {
    font-size: 24px;
    font-weight: 700;
    margin: 0 0 6px 0;
    color: #0f172a;
    letter-spacing: -0.02em;
}

.pmed-title-group p {
    margin: 0;
    font-size: 13.5px;
    color: #64748b;
}

.pmed-top-actions {
    display: flex;
    gap: 10px;
    align-items: center;
}

.pmed-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    border: 1px solid transparent;
    text-decoration: none;
    line-height: 1.4;
}

.pmed-btn-primary {
    background: #0284c7;
    color: #ffffff;
    border-color: #0284c7;
}

.pmed-btn-primary:hover {
    background: #0369a1;
    border-color: #0369a1;
}

.pmed-btn-outline {
    background: #ffffff;
    color: #334155;
    border-color: #cbd5e1;
}

.pmed-btn-outline:hover {
    background: #f8fafc;
    border-color: #94a3b8;
    color: #0f172a;
}

.pmed-btn-danger {
    background: #ffffff;
    color: #dc2626;
    border-color: #fecaca;
}

.pmed-btn-danger:hover {
    background: #fef2f2;
    border-color: #f87171;
}

.pmed-btn-refill {
    background: #0284c7;
    color: #ffffff;
    border-color: #0284c7;
}

.pmed-btn-refill:hover {
    background: #0369a1;
}

/* Control Bar: Search & Filter Tabs */
.pmed-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
    flex-wrap: wrap;
    background: #ffffff;
    padding: 12px 16px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 2px rgba(0,0,0,0.03);
}

.pmed-search-wrap {
    position: relative;
    flex: 1;
    min-width: 240px;
    max-width: 380px;
}

.pmed-search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
    pointer-events: none;
    display: flex;
    align-items: center;
}

.pmed-search-input {
    width: 100%;
    padding: 8px 12px 8px 36px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 13.5px;
    background: #f8fafc;
    color: #1e293b;
    outline: none;
    transition: all 0.15s ease;
    box-sizing: border-box;
}

.pmed-search-input:focus {
    background: #ffffff;
    border-color: #0284c7;
    box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
}

.pmed-filter-tabs {
    display: flex;
    gap: 4px;
    background: #f1f5f9;
    padding: 3px;
    border-radius: 6px;
    overflow-x: auto;
}

.pmed-filter-btn {
    padding: 6px 14px;
    border: none;
    background: transparent;
    font-size: 12.5px;
    font-weight: 600;
    color: #64748b;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 6px;
}

.pmed-filter-btn:hover {
    color: #0f172a;
}

.pmed-filter-btn.active {
    background: #ffffff;
    color: #0284c7;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.pmed-count-pill {
    background: #e2e8f0;
    color: #475569;
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 10px;
    font-weight: 700;
}

.pmed-filter-btn.active .pmed-count-pill {
    background: #e0f2fe;
    color: #0284c7;
}

/* Medication Cards List */
.pmed-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.pmed-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 20px 24px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    transition: all 0.15s ease;
    position: relative;
}

.pmed-card:hover {
    border-color: #cbd5e1;
    box-shadow: 0 4px 12px rgba(0,0,0,0.06);
}

.pmed-card.inactive {
    opacity: 0.85;
    background: #fcfcfd;
}

.pmed-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 14px;
    flex-wrap: wrap;
}

.pmed-card-title-wrap {
    display: flex;
    align-items: flex-start;
    gap: 14px;
}

.pmed-pill-icon {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.pmed-pill-icon.prescription {
    background: #e0f2fe;
    color: #0284c7;
}

.pmed-pill-icon.medication {
    background: #f0fdf4;
    color: #16a34a;
}

.pmed-pill-icon.completed {
    background: #f1f5f9;
    color: #94a3b8;
}

.pmed-card-titles h3 {
    margin: 0 0 4px 0;
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.3;
}

.pmed-badges-row {
    display: flex;
    gap: 6px;
    align-items: center;
    flex-wrap: wrap;
}

.pmed-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11.5px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 4px;
}

.pmed-badge-rx {
    background: #e0e7ff;
    color: #4338ca;
}

.pmed-badge-otc {
    background: #ecfdf5;
    color: #047857;
}

.pmed-badge-active {
    background: #dcfce7;
    color: #15803d;
}

.pmed-badge-completed {
    background: #f1f5f9;
    color: #64748b;
}

.pmed-badge-cancelled {
    background: #fee2e2;
    color: #b91c1c;
}

.pmed-badge-refill-pending {
    background: #fef3c7;
    color: #b45309;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}

/* Card Body Grid */
.pmed-card-body {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 16px 24px;
    padding: 14px 0;
    border-top: 1px solid #f1f5f9;
    border-bottom: 1px solid #f1f5f9;
    font-size: 13px;
}

.pmed-info-item label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #64748b;
    margin-bottom: 4px;
}

.pmed-info-item span,
.pmed-info-item p {
    margin: 0;
    font-weight: 500;
    color: #1e293b;
    line-height: 1.4;
}

.pmed-directions {
    grid-column: 1 / -1;
    background: #f8fafc;
    border-left: 3px solid #0284c7;
    padding: 10px 14px;
    border-radius: 0 6px 6px 0;
    font-size: 13px;
    color: #334155;
}

.pmed-directions strong {
    color: #0f172a;
}

/* Card Footer / Actions */
.pmed-card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 14px;
    flex-wrap: wrap;
    gap: 12px;
}

.pmed-refill-status {
    font-size: 12.5px;
    color: #64748b;
    display: flex;
    align-items: center;
    gap: 6px;
}

.pmed-refill-status strong {
    color: #0f172a;
}

.pmed-card-actions {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-left: auto;
}

/* Empty & Error States */
.pmed-empty-state {
    text-align: center;
    padding: 48px 24px;
    background: #ffffff;
    border: 1px dashed #cbd5e1;
    border-radius: 10px;
    color: #64748b;
}

.pmed-empty-state svg {
    margin-bottom: 12px;
    color: #94a3b8;
}

.pmed-empty-state h3 {
    margin: 0 0 6px 0;
    font-size: 16px;
    color: #1e293b;
}

.pmed-empty-state p {
    margin: 0 0 16px 0;
    font-size: 13.5px;
    max-width: 400px;
    margin-left: auto;
    margin-right: auto;
}

/* Modal Custom Styles */
.pmed-modal-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.5);
    backdrop-filter: blur(2px);
    z-index: 1050;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.pmed-modal-overlay.open {
    display: flex;
}

.pmed-modal-box {
    background: #ffffff;
    border-radius: 10px;
    width: 100%;
    max-width: 540px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
    border: 1px solid #e2e8f0;
}

.pmed-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 18px 24px;
    border-bottom: 1px solid #e2e8f0;
}

.pmed-modal-header h3 {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: #0f172a;
}

.pmed-modal-close {
    background: none;
    border: none;
    font-size: 22px;
    cursor: pointer;
    color: #94a3b8;
    line-height: 1;
    padding: 4px;
    border-radius: 4px;
    transition: color 0.15s ease;
}

.pmed-modal-close:hover {
    color: #0f172a;
}

.pmed-modal-body {
    padding: 20px 24px;
}

.pmed-modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 16px 24px;
    border-top: 1px solid #e2e8f0;
    background: #f8fafc;
    border-radius: 0 0 10px 10px;
}

.pmed-form-group {
    margin-bottom: 16px;
}

.pmed-form-group label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #334155;
    margin-bottom: 6px;
}

.pmed-form-group label .req {
    color: #ef4444;
}

.pmed-form-control {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 13.5px;
    color: #1e293b;
    box-sizing: border-box;
    transition: border-color 0.15s ease;
    font-family: inherit;
}

.pmed-form-control:focus {
    outline: none;
    border-color: #0284c7;
    box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
}

.pmed-form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
}

/* Dark Theme Overrides */
:root[data-theme="dark"] .pmed-page {
    color: var(--text-primary);
}

:root[data-theme="dark"] .pmed-title-group h2 {
    color: var(--text-primary);
}

:root[data-theme="dark"] .pmed-title-group p,
:root[data-theme="dark"] .pmed-info-item label,
:root[data-theme="dark"] .pmed-refill-status {
    color: var(--text-muted);
}

:root[data-theme="dark"] .pmed-controls,
:root[data-theme="dark"] .pmed-card,
:root[data-theme="dark"] .pmed-modal-box {
    background: var(--bg-surface);
    border-color: var(--border-color);
}

:root[data-theme="dark"] .pmed-card:hover {
    border-color: #475569;
}

:root[data-theme="dark"] .pmed-card.inactive {
    background: var(--bg-surface-alt);
}

:root[data-theme="dark"] .pmed-card-titles h3,
:root[data-theme="dark"] .pmed-info-item span,
:root[data-theme="dark"] .pmed-modal-header h3,
:root[data-theme="dark"] .pmed-refill-status strong,
:root[data-theme="dark"] .pmed-form-group label {
    color: var(--text-primary);
}

:root[data-theme="dark"] .pmed-search-input,
:root[data-theme="dark"] .pmed-form-control {
    background: var(--bg-surface-alt);
    border-color: var(--border-color);
    color: var(--text-primary);
}

:root[data-theme="dark"] .pmed-filter-tabs {
    background: var(--bg-surface-alt);
}

:root[data-theme="dark"] .pmed-filter-btn.active {
    background: var(--bg-surface);
    color: var(--accent);
}

:root[data-theme="dark"] .pmed-card-body,
:root[data-theme="dark"] .pmed-modal-header,
:root[data-theme="dark"] .pmed-modal-footer {
    border-color: var(--border-color);
}

:root[data-theme="dark"] .pmed-modal-footer {
    background: var(--bg-surface-alt);
}

:root[data-theme="dark"] .pmed-directions {
    background: var(--bg-surface-alt);
    color: var(--text-primary);
}

:root[data-theme="dark"] .pmed-btn-outline {
    background: var(--bg-surface);
    border-color: var(--border-color);
    color: var(--text-primary);
}
</style>

<div class="pmed-page">
    <div class="pmed-header">
        <div class="pmed-title-group">
            <h2>My Medications</h2>
            <p>Review your active prescriptions, dosage instructions, and manage medication refills.</p>
        </div>
        <div class="pmed-top-actions">
            <button type="button" class="pmed-btn pmed-btn-primary" id="btnOpenRecordModal">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Record Medication
            </button>
        </div>
    </div>

    <!-- Controls: Search & Filter Tabs -->
    <div class="pmed-controls">
        <div class="pmed-search-wrap">
            <span class="pmed-search-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
            </span>
            <input type="text" class="pmed-search-input" id="pmedSearchInput" placeholder="Search by medication, prescriber, or Rx #...">
        </div>

        <div class="pmed-filter-tabs" id="pmedFilterTabs">
            <button type="button" class="pmed-filter-btn active" data-filter="all">
                All <span class="pmed-count-pill" id="countAll">0</span>
            </button>
            <button type="button" class="pmed-filter-btn" data-filter="active">
                Active <span class="pmed-count-pill" id="countActive">0</span>
            </button>
            <button type="button" class="pmed-filter-btn" data-filter="prescription">
                Prescriptions <span class="pmed-count-pill" id="countRx">0</span>
            </button>
            <button type="button" class="pmed-filter-btn" data-filter="medication">
                Home / OTC <span class="pmed-count-pill" id="countOtc">0</span>
            </button>
            <button type="button" class="pmed-filter-btn" data-filter="completed">
                Completed <span class="pmed-count-pill" id="countCompleted">0</span>
            </button>
        </div>
    </div>

    <!-- Medication Cards List -->
    <div id="patientMedicationsList">
        <div class="pmed-empty-state">
            <p>Loading your medications...</p>
        </div>
    </div>
</div>

<!-- Modal: Record / Edit Home Medication -->
<div class="pmed-modal-overlay" id="pmedRecordModal">
    <div class="pmed-modal-box">
        <div class="pmed-modal-header">
            <h3 id="pmedRecordModalTitle">Record Medication</h3>
            <button type="button" class="pmed-modal-close" id="pmedCloseRecordModal">&times;</button>
        </div>
        <form id="pmedRecordForm">
            <input type="hidden" id="pmedRecordId" value="">
            <div class="pmed-modal-body">
                <div class="pmed-form-group">
                    <label for="pmedFormTitle">Medication Name / Supplement <span class="req">*</span></label>
                    <input type="text" id="pmedFormTitle" class="pmed-form-control" placeholder="e.g. Vitamin D3, Melatonin, Fish Oil" required>
                </div>
                <div class="pmed-form-row">
                    <div class="pmed-form-group">
                        <label for="pmedFormDosage">Dosage / Strength</label>
                        <input type="text" id="pmedFormDosage" class="pmed-form-control" placeholder="e.g. 500 mg, 2000 IU">
                    </div>
                    <div class="pmed-form-group">
                        <label for="pmedFormFrequency">Frequency / Usage</label>
                        <input type="text" id="pmedFormFrequency" class="pmed-form-control" placeholder="e.g. Once daily, As needed">
                    </div>
                </div>
                <div class="pmed-form-row">
                    <div class="pmed-form-group">
                        <label for="pmedFormStartDate">Start Date</label>
                        <input type="date" id="pmedFormStartDate" class="pmed-form-control">
                    </div>
                    <div class="pmed-form-group">
                        <label for="pmedFormEndDate">End Date (optional)</label>
                        <input type="date" id="pmedFormEndDate" class="pmed-form-control">
                    </div>
                </div>
                <div class="pmed-form-group">
                    <label for="pmedFormComments">Directions / Notes</label>
                    <textarea id="pmedFormComments" class="pmed-form-control" rows="3" placeholder="e.g. Take with food in the morning."></textarea>
                </div>
            </div>
            <div class="pmed-modal-footer">
                <button type="button" class="pmed-btn pmed-btn-outline" id="pmedCancelRecordModal">Cancel</button>
                <button type="submit" class="pmed-btn pmed-btn-primary" id="pmedSaveRecordBtn">Save Medication</button>
            </div>
        </form>
    </div>
</div>

<!-- Modal: Refill Request -->
<div class="pmed-modal-overlay" id="pmedRefillModal">
    <div class="pmed-modal-box">
        <div class="pmed-modal-header">
            <h3>Request Prescription Refill</h3>
            <button type="button" class="pmed-modal-close" id="pmedCloseRefillModal">&times;</button>
        </div>
        <form id="pmedRefillForm">
            <input type="hidden" id="pmedRefillRxId" value="">
            <div class="pmed-modal-body">
                <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:14px 16px; margin-bottom:16px;">
                    <div style="font-weight:700; color:#0369a1; font-size:15px; margin-bottom:4px;" id="pmedRefillMedTitle"></div>
                    <div style="font-size:13px; color:#0c4a6e;" id="pmedRefillMedInfo"></div>
                </div>
                <div class="pmed-form-group">
                    <label for="pmedRefillNotes">Notes for Pharmacy or Care Team (Optional)</label>
                    <textarea id="pmedRefillNotes" class="pmed-form-control" rows="3" placeholder="Optional notes, e.g., preferred pickup day, current symptoms, or change in contact number."></textarea>
                </div>
                <p style="font-size:12px; color:#64748b; margin:0;">
                    Your refill request will be sent directly to your assigned care provider and pharmacy for review and fulfillment.
                </p>
            </div>
            <div class="pmed-modal-footer">
                <button type="button" class="pmed-btn pmed-btn-outline" id="pmedCancelRefillModal">Cancel</button>
                <button type="submit" class="pmed-btn pmed-btn-primary" id="pmedSubmitRefillBtn">Submit Refill Request</button>
            </div>
        </form>
    </div>
</div>

<!-- Modal: Medication Details -->
<div class="pmed-modal-overlay" id="pmedDetailsModal">
    <div class="pmed-modal-box">
        <div class="pmed-modal-header">
            <h3 id="pmedDetailsTitle">Medication Details</h3>
            <button type="button" class="pmed-modal-close" id="pmedCloseDetailsModal">&times;</button>
        </div>
        <div class="pmed-modal-body" id="pmedDetailsContent">
            <!-- Dynamic content -->
        </div>
        <div class="pmed-modal-footer">
            <button type="button" class="pmed-btn pmed-btn-outline" id="pmedCloseDetailsBtn">Close</button>
        </div>
    </div>
</div>
    `;
}
