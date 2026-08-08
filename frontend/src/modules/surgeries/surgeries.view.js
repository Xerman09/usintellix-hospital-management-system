export function SurgeriesView()
{
    return `
<style>
.surg-page {
    width: 100%;
}

.surg-card {
    width: 100%;
}

.surg-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 8px;
}

.surg-header-title {
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.surg-icon-badge {
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

.surg-icon-badge svg {
    width: 24px;
    height: 24px;
    color: white;
}

.surg-header h1 {
    margin: 0 0 6px;
    font-size: 24px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.surg-header .form-subtitle {
    margin: 0;
    max-width: 480px;
}

.surg-add-btn {
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

.surg-add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(var(--accent-rgb),.3);
}

.surg-add-btn svg {
    width: 16px;
    height: 16px;
}

.surg-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 28px 0 20px;
}

.surg-stat-pill {
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

.surg-stat-pill svg {
    width: 14px;
    height: 14px;
}

.surg-search-wrap {
    position: relative;
    flex: 1;
    max-width: 320px;
}

.surg-search-wrap svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #a2aec4;
    pointer-events: none;
}

.surg-search-input {
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

.surg-search-input:focus {
    border-color: var(--accent);
    background: white;
    box-shadow: 0 0 0 4px rgba(var(--accent-rgb),.1);
}

.surg-search-clear {
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

.surg-search-clear.show {
    display: flex;
}

.surg-search-clear:hover {
    background: #e2e8f0;
    color: #25324b;
}

.surg-table-wrap {
    overflow-x: auto;
    border: 1px solid #eef1f7;
    border-radius: 16px;
}

.surg-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.surg-table tbody tr {
    animation: surg-row-in .25s ease both;
}

@keyframes surg-row-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

.surg-table th {
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

.surg-table td {
    padding: 14px 18px;
    border-bottom: 1px solid #eef1f7;
    color: #25324b;
    vertical-align: middle;
}

.surg-table tbody tr:last-child td {
    border-bottom: none;
}

.surg-table tbody tr {
    transition: background .12s;
}

.surg-table tbody tr:hover {
    background: #fafbff;
}

.surg-name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
}

.surg-avatar {
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

.surg-name {
    font-weight: 600;
    color: #1a2338;
}

.surg-description {
    color: #71809b;
}

.surg-description.empty {
    font-style: italic;
    color: #a2aec4;
}

.surg-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.surg-icon-btn {
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

.surg-icon-btn svg {
    width: 13px;
    height: 13px;
}

.surg-icon-btn.edit {
    background: var(--accent-lighter);
    color: var(--accent-text);
}

.surg-icon-btn.edit:hover {
    background: var(--accent-border);
}

.surg-icon-btn.delete {
    background: #fee2e2;
    color: #b91c1c;
}

.surg-icon-btn.delete:hover {
    background: #fecaca;
}

.surg-empty-state {
    text-align: center;
    padding: 64px 20px !important;
}

.surg-empty-state .surg-empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 16px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.surg-empty-state .surg-empty-icon svg {
    width: 26px;
    height: 26px;
    color: #a2aec4;
}

.surg-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 14px;
}

.surg-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 15px;
    margin-bottom: 6px;
}

.surg-skeleton-row td {
    padding: 16px 18px;
}

.surg-skeleton-bar {
    height: 14px;
    border-radius: 6px;
    background: linear-gradient(90deg, #f0f2f8 25%, #e6e9f2 37%, #f0f2f8 63%);
    background-size: 400% 100%;
    animation: surg-shimmer 1.4s ease infinite;
}

@keyframes surg-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

.surg-modal-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent), var(--accent));
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
}

.surg-modal-icon svg {
    width: 20px;
    height: 20px;
    color: white;
}

@media (max-width: 640px) {
    .surg-header { flex-direction: column; }
    .surg-add-btn { width: 100%; justify-content: center; }
    .surg-toolbar { flex-direction: column; align-items: stretch; }
    .surg-search-wrap { max-width: none; }
}

/* Custom confirmation modal */
.surg-confirm-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(15, 23, 42, 0.4);
    backdrop-filter: blur(4px);
    z-index: 1000;
    display: none;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s ease;
}
.surg-confirm-overlay.open {
    display: flex;
    opacity: 1;
}
.surg-confirm-box {
    background: #ffffff;
    border-radius: 16px;
    width: 100%;
    max-width: 400px;
    padding: 32px;
    box-shadow: 0 20px 40px -8px rgba(0,0,0,0.15);
    transform: translateY(10px) scale(0.98);
    transition: transform 0.2s ease;
    text-align: center;
}
.surg-confirm-overlay.open .surg-confirm-box {
    transform: translateY(0) scale(1);
}
.surg-confirm-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: #fee2e2;
    color: #ef4444;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
}
.surg-confirm-icon svg { width: 24px; height: 24px; }
.surg-confirm-title { margin: 0 0 8px; font-size: 18px; color: #0f172a; }
.surg-confirm-desc { margin: 0 0 24px; color: #64748b; font-size: 14px; line-height: 1.5; }
.surg-confirm-actions { display: flex; gap: 12px; }
.btn-action-cancel { flex: 1; height: 44px; background: #f1f5f9; color: #475569; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
.btn-action-cancel:hover { background: #e2e8f0; }
.btn-action-delete { flex: 1; height: 44px; background: #ef4444; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
.btn-action-delete:hover { background: #dc2626; }
</style>

<div class="surg-page">
    <div class="surg-card">
        <div class="surg-header">
            <div class="surg-header-title">
                <div class="surg-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>
                </div>
                <div>
                    <h1>Surgery Management</h1>
                    <p class="form-subtitle">Surgeries registered here become available for recording a patient's surgical history.</p>
                </div>
            </div>
            <button type="button" class="surg-add-btn" id="openAddSurgeryModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Create Surgery
            </button>
        </div>

        <div class="surg-toolbar">
            <span class="surg-stat-pill" id="surgeryCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line></svg>
                <span id="surgeryCountText">0 surgeries</span>
            </span>
            <div class="surg-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="surg-search-input" id="surgerySearch" placeholder="Search surgeries...">
                <button type="button" class="surg-search-clear" id="surgerySearchClear" aria-label="Clear search">&times;</button>
            </div>
        </div>

        <div class="surg-table-wrap">
            <table class="surg-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="surgeriesTableBody">
                    <tr class="surg-skeleton-row"><td colspan="3"><div class="surg-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="surg-skeleton-row"><td colspan="3"><div class="surg-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="surg-skeleton-row"><td colspan="3"><div class="surg-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="surgeryModalOverlay">
    <div class="modal-box">
        <div class="surg-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>
        </div>
        <div class="modal-header">
            <h2 id="surgeryModalTitle">Add Surgery</h2>
            <button type="button" class="modal-close" id="closeSurgeryModal">&times;</button>
        </div>
        <p class="form-subtitle">Define a surgery that can be recorded on a patient's surgical history.</p>

        <div id="surgFormAlert"></div>

        <form id="surgeryForm">
            <input type="hidden" id="surgery_id">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Name</label>
                    <input id="surg_name" class="form-input" placeholder="e.g Appendectomy">
                    <span class="form-error" id="err-surg_name"></span>
                </div>

                <div class="form-group full">
                    <label>Description</label>
                    <input id="surg_description" class="form-input" placeholder="Optional description">
                    <span class="form-error" id="err-surg_description"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelSurgery">Cancel</button>
                <button class="login-btn" type="submit" id="saveSurgeryBtn">Add Surgery</button>
            </div>
        </form>
    </div>
</div>

<!-- Custom Confirmation Modal -->
<div id="surgConfirmDeleteModal" class="surg-confirm-overlay">
    <div class="surg-confirm-box">
        <div class="surg-confirm-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
        </div>
        <h3 class="surg-confirm-title">Remove Surgery?</h3>
        <p class="surg-confirm-desc">This action cannot be undone and may affect associated patient records.</p>
        <div class="surg-confirm-actions">
            <button type="button" class="btn-action-cancel" id="surgCancelDeleteBtn">Cancel</button>
            <button type="button" class="btn-action-delete" id="surgConfirmDeleteBtn">Delete</button>
        </div>
    </div>
</div>
`;
}
