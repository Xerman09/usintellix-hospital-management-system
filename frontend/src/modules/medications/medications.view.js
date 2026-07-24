export function MedicationsView()
{
    return `
<style>
.med-page {
    width: 100%;
}

.med-card {
    width: 100%;
}

.med-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 8px;
}

.med-header-title {
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.med-icon-badge {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: linear-gradient(135deg, #4f46e5, #2563eb);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 18px rgba(79,70,229,.28);
}

.med-icon-badge svg {
    width: 24px;
    height: 24px;
    color: white;
}

.med-header h1 {
    margin: 0 0 6px;
    font-size: 24px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.med-header .form-subtitle {
    margin: 0;
    max-width: 480px;
}

.med-add-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 44px;
    padding: 0 20px;
    border: none;
    border-radius: 12px;
    background: linear-gradient(90deg, #4f46e5, #2563eb);
    color: white;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    box-shadow: 0 10px 24px rgba(37,99,235,.24);
    transition: .18s;
    white-space: nowrap;
}

.med-add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(37,99,235,.3);
}

.med-add-btn svg {
    width: 16px;
    height: 16px;
}

.med-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 28px 0 20px;
}

.med-stat-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 14px;
    border-radius: 999px;
    background: #eef2ff;
    color: #4338ca;
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
}

.med-stat-pill svg {
    width: 14px;
    height: 14px;
}

.med-search-wrap {
    position: relative;
    flex: 1;
    max-width: 320px;
}

.med-search-wrap svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #a2aec4;
    pointer-events: none;
}

.med-search-input {
    width: 100%;
    height: 40px;
    padding: 0 34px 0 38px;
    border-radius: 10px;
    border: 1.5px solid #e2e8f0;
    outline: none;
    font-size: 13.5px;
    color: #24324a;
    background: #fbfcfe;
    transition: .15s;
}

.med-search-input:focus {
    border-color: #4f46e5;
    background: white;
    box-shadow: 0 0 0 4px rgba(79,70,229,.1);
}

.med-search-clear {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    width: 22px;
    height: 22px;
    border: none;
    border-radius: 6px;
    background: #eef1f7;
    color: #71809b;
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    display: none;
    align-items: center;
    justify-content: center;
}

.med-search-clear.show {
    display: flex;
}

.med-search-clear:hover {
    background: #e2e8f0;
    color: #25324b;
}

.med-table-wrap {
    overflow-x: auto;
    border: 1px solid #eef1f7;
    border-radius: 16px;
}

.med-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.med-table tbody tr {
    animation: med-row-in .25s ease both;
}

@keyframes med-row-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

.med-table th {
    text-align: left;
    padding: 14px 18px;
    color: #71809b;
    font-weight: 700;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: .4px;
    background: #f8fafc;
    border-bottom: 1px solid #eef1f7;
    white-space: nowrap;
}

.med-table td {
    padding: 14px 18px;
    border-bottom: 1px solid #eef1f7;
    color: #25324b;
    vertical-align: middle;
}

.med-table tbody tr:last-child td {
    border-bottom: none;
}

.med-table tbody tr:hover {
    background: #fafbff;
}

.med-name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
}

.med-avatar {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: #eef2ff;
    color: #4338ca;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 14px;
}

.med-name {
    font-weight: 600;
    color: #1a2338;
}

.med-description {
    color: #71809b;
}

.med-description.empty {
    font-style: italic;
    color: #a2aec4;
}

.med-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.med-icon-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: none;
    border-radius: 8px;
    padding: 7px 12px;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition: .12s;
}

.med-icon-btn svg {
    width: 13px;
    height: 13px;
}

.med-icon-btn.edit {
    background: #e0e7ff;
    color: #4338ca;
}

.med-icon-btn.edit:hover {
    background: #c7d2fe;
}

.med-icon-btn.delete {
    background: #fee2e2;
    color: #b91c1c;
}

.med-icon-btn.delete:hover {
    background: #fecaca;
}

.med-empty-state {
    text-align: center;
    padding: 64px 20px !important;
}

.med-empty-state .med-empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 16px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.med-empty-state .med-empty-icon svg {
    width: 26px;
    height: 26px;
    color: #a2aec4;
}

.med-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 14px;
}

.med-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 15px;
    margin-bottom: 6px;
}

.med-skeleton-row td {
    padding: 16px 18px;
}

.med-skeleton-bar {
    height: 14px;
    border-radius: 6px;
    background: linear-gradient(90deg, #f0f2f8 25%, #e6e9f2 37%, #f0f2f8 63%);
    background-size: 400% 100%;
    animation: med-shimmer 1.4s ease infinite;
}

@keyframes med-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

.med-modal-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, #4f46e5, #2563eb);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
}

.med-modal-icon svg {
    width: 20px;
    height: 20px;
    color: white;
}

@media (max-width: 640px) {
    .med-header { flex-direction: column; }
    .med-add-btn { width: 100%; justify-content: center; }
    .med-toolbar { flex-direction: column; align-items: stretch; }
    .med-search-wrap { max-width: none; }
}
</style>

<div class="med-page">
    <div class="med-card">
        <div class="med-header">
            <div class="med-header-title">
                <div class="med-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"></path><path d="m8.5 8.5 7 7"></path></svg>
                </div>
                <div>
                    <h1>Medication Management</h1>
                    <p class="form-subtitle">Medications registered here become available when recording patient prescriptions.</p>
                </div>
            </div>
            <button type="button" class="med-add-btn" id="openAddMedicationModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Create Medication
            </button>
        </div>

        <div class="med-toolbar">
            <span class="med-stat-pill" id="medicationCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"></path></svg>
                <span id="medicationCountText">0 medications</span>
            </span>
            <div class="med-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="med-search-input" id="medicationSearch" placeholder="Search medications...">
                <button type="button" class="med-search-clear" id="medicationSearchClear" aria-label="Clear search">&times;</button>
            </div>
        </div>

        <div class="med-table-wrap">
            <table class="med-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="medicationsTableBody">
                    <tr class="med-skeleton-row"><td colspan="3"><div class="med-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="med-skeleton-row"><td colspan="3"><div class="med-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="med-skeleton-row"><td colspan="3"><div class="med-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="medicationModalOverlay">
    <div class="modal-box">
        <div class="med-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"></path><path d="m8.5 8.5 7 7"></path></svg>
        </div>
        <div class="modal-header">
            <h2 id="medicationModalTitle">Add Medication</h2>
            <button type="button" class="modal-close" id="closeMedicationModal">&times;</button>
        </div>
        <p class="form-subtitle">Define a medication used when recording patient prescriptions.</p>

        <div id="formAlert"></div>

        <form id="medicationForm">
            <input type="hidden" id="medication_id">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Name</label>
                    <input id="name" class="form-input" placeholder="e.g Paracetamol">
                    <span class="form-error" id="err-name"></span>
                </div>

                <div class="form-group full">
                    <label>Description</label>
                    <input id="description" class="form-input" placeholder="Optional description">
                    <span class="form-error" id="err-description"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelMedication">Cancel</button>
                <button class="login-btn" type="submit" id="saveMedicationBtn">Add Medication</button>
            </div>
        </form>
    </div>
</div>
`;
}
