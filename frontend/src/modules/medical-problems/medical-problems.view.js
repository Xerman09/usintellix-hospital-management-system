export function MedicalProblemsView()
{
    return `
<style>
.mp-page {
    width: 100%;
}

.mp-card {
    width: 100%;
}

.mp-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 8px;
}

.mp-header-title {
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.mp-icon-badge {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: linear-gradient(135deg, var(--accent), var(--accent));
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 18px rgba(var(--accent-rgb),.28);
}

.mp-icon-badge svg {
    width: 24px;
    height: 24px;
    color: white;
}

.mp-header h1 {
    margin: 0 0 6px;
    font-size: 24px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.mp-header .form-subtitle {
    margin: 0;
    max-width: 480px;
}

.mp-add-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 44px;
    padding: 0 20px;
    border: none;
    border-radius: 12px;
    background: linear-gradient(90deg, var(--accent), var(--accent));
    color: white;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    box-shadow: 0 10px 24px rgba(var(--accent-rgb),.24);
    transition: .18s;
    white-space: nowrap;
}

.mp-add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(var(--accent-rgb),.3);
}

.mp-add-btn svg {
    width: 16px;
    height: 16px;
}

.mp-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 28px 0 20px;
}

.mp-stat-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 14px;
    border-radius: 999px;
    background: var(--accent-light);
    color: var(--accent-text);
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
}

.mp-stat-pill svg {
    width: 14px;
    height: 14px;
}

.mp-search-wrap {
    position: relative;
    flex: 1;
    max-width: 320px;
}

.mp-search-wrap svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #a2aec4;
    pointer-events: none;
}

.mp-search-input {
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

.mp-search-input:focus {
    border-color: var(--accent);
    background: white;
    box-shadow: 0 0 0 4px rgba(var(--accent-rgb),.1);
}

.mp-search-clear {
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

.mp-search-clear.show {
    display: flex;
}

.mp-search-clear:hover {
    background: #e2e8f0;
    color: #25324b;
}

.mp-table-wrap {
    overflow-x: auto;
    border: 1px solid #eef1f7;
    border-radius: 16px;
}

.mp-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.mp-table tbody tr {
    animation: mp-row-in .25s ease both;
}

@keyframes mp-row-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

.mp-table th {
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

.mp-table td {
    padding: 14px 18px;
    border-bottom: 1px solid #eef1f7;
    color: #25324b;
    vertical-align: middle;
}

.mp-table tbody tr:last-child td {
    border-bottom: none;
}

.mp-table tbody tr:hover {
    background: #fafbff;
}

.mp-name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
}

.mp-avatar {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: var(--accent-light);
    color: var(--accent-text);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 14px;
}

.mp-name {
    font-weight: 600;
    color: #1a2338;
}

.mp-description {
    color: #71809b;
}

.mp-description.empty {
    font-style: italic;
    color: #a2aec4;
}

.mp-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.mp-icon-btn {
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

.mp-icon-btn svg {
    width: 13px;
    height: 13px;
}

.mp-icon-btn.edit {
    background: var(--accent-lighter);
    color: var(--accent-text);
}

.mp-icon-btn.edit:hover {
    background: var(--accent-border);
}

.mp-icon-btn.delete {
    background: #fee2e2;
    color: #b91c1c;
}

.mp-icon-btn.delete:hover {
    background: #fecaca;
}

.mp-empty-state {
    text-align: center;
    padding: 64px 20px !important;
}

.mp-empty-state .mp-empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 16px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.mp-empty-state .mp-empty-icon svg {
    width: 26px;
    height: 26px;
    color: #a2aec4;
}

.mp-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 14px;
}

.mp-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 15px;
    margin-bottom: 6px;
}

.mp-skeleton-row td {
    padding: 16px 18px;
}

.mp-skeleton-bar {
    height: 14px;
    border-radius: 6px;
    background: linear-gradient(90deg, #f0f2f8 25%, #e6e9f2 37%, #f0f2f8 63%);
    background-size: 400% 100%;
    animation: mp-shimmer 1.4s ease infinite;
}

@keyframes mp-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

.mp-modal-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent), var(--accent));
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
}

.mp-modal-icon svg {
    width: 20px;
    height: 20px;
    color: white;
}

@media (max-width: 640px) {
    .mp-header { flex-direction: column; }
    .mp-add-btn { width: 100%; justify-content: center; }
    .mp-toolbar { flex-direction: column; align-items: stretch; }
    .mp-search-wrap { max-width: none; }
}
</style>

<div class="mp-page">
    <div class="mp-card">
        <div class="mp-header">
            <div class="mp-header-title">
                <div class="mp-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.5-1.5 3-3.5 3-6a4 4 0 0 0-7-2.5A4 4 0 0 0 8 8c0 2.5 1.5 4.5 3 6l4 4Z"></path><path d="M4 20v-3a3 3 0 0 1 3-3h2M13 20l3-3-2-2-3 3Z"></path></svg>
                </div>
                <div>
                    <h1>Medical Problem Management</h1>
                    <p class="form-subtitle">Medical problems registered here become available when recording patient medical history.</p>
                </div>
            </div>
            <button type="button" class="mp-add-btn" id="openAddMedicalProblemModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Create Medical Problem
            </button>
        </div>

        <div class="mp-toolbar">
            <span class="mp-stat-pill" id="medicalProblemCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.5-1.5 3-3.5 3-6a4 4 0 0 0-7-2.5A4 4 0 0 0 8 8c0 2.5 1.5 4.5 3 6l4 4Z"></path></svg>
                <span id="medicalProblemCountText">0 medical problems</span>
            </span>
            <div class="mp-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="mp-search-input" id="medicalProblemSearch" placeholder="Search medical problems...">
                <button type="button" class="mp-search-clear" id="medicalProblemSearchClear" aria-label="Clear search">&times;</button>
            </div>
        </div>

        <div class="mp-table-wrap">
            <table class="mp-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="medicalProblemsTableBody">
                    <tr class="mp-skeleton-row"><td colspan="3"><div class="mp-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="mp-skeleton-row"><td colspan="3"><div class="mp-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="mp-skeleton-row"><td colspan="3"><div class="mp-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="medicalProblemModalOverlay">
    <div class="modal-box">
        <div class="mp-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.5-1.5 3-3.5 3-6a4 4 0 0 0-7-2.5A4 4 0 0 0 8 8c0 2.5 1.5 4.5 3 6l4 4Z"></path><path d="M4 20v-3a3 3 0 0 1 3-3h2M13 20l3-3-2-2-3 3Z"></path></svg>
        </div>
        <div class="modal-header">
            <h2 id="medicalProblemModalTitle">Add Medical Problem</h2>
            <button type="button" class="modal-close" id="closeMedicalProblemModal">&times;</button>
        </div>
        <p class="form-subtitle">Define a medical problem used when recording patient medical history.</p>

        <div id="formAlert"></div>

        <form id="medicalProblemForm">
            <input type="hidden" id="medical_problem_id">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Name</label>
                    <input id="name" class="form-input" placeholder="e.g Hypertension">
                    <span class="form-error" id="err-name"></span>
                </div>

                <div class="form-group full">
                    <label>Description</label>
                    <input id="description" class="form-input" placeholder="Optional description">
                    <span class="form-error" id="err-description"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelMedicalProblem">Cancel</button>
                <button class="login-btn" type="submit" id="saveMedicalProblemBtn">Add Medical Problem</button>
            </div>
        </form>
    </div>
</div>
`;
}
