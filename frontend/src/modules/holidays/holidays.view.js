export function HolidaysView()
{
    return `
<style>
.hd-page {
    width: 100%;
}

.hd-card {
    width: 100%;
}

.hd-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 8px;
}

.hd-header-title {
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.hd-icon-badge {
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

.hd-icon-badge svg {
    width: 24px;
    height: 24px;
    color: white;
}

.hd-header h1 {
    margin: 0 0 6px;
    font-size: 24px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.hd-header .form-subtitle {
    margin: 0;
    max-width: 480px;
}

.hd-add-btn {
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

.hd-add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(var(--accent-rgb),.3);
}

.hd-add-btn svg {
    width: 16px;
    height: 16px;
}

.hd-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 28px 0 20px;
}

.hd-stat-pill {
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

.hd-stat-pill svg {
    width: 14px;
    height: 14px;
}

.hd-search-wrap {
    position: relative;
    flex: 1;
    max-width: 320px;
}

.hd-search-wrap svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #a2aec4;
    pointer-events: none;
}

.hd-search-input {
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

.hd-search-input:focus {
    border-color: var(--accent);
    background: white;
    box-shadow: 0 0 0 4px rgba(var(--accent-rgb),.1);
}

.hd-search-clear {
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

.hd-search-clear.show {
    display: flex;
}

.hd-search-clear:hover {
    background: #e2e8f0;
    color: #25324b;
}

.hd-table-wrap {
    overflow-x: auto;
    border: 1px solid #eef1f7;
    border-radius: 16px;
}

.hd-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.hd-table tbody tr {
    animation: hd-row-in .25s ease both;
}

@keyframes hd-row-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

.hd-table th {
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

.hd-table td {
    padding: 14px 18px;
    border-bottom: 1px solid #eef1f7;
    color: #25324b;
    vertical-align: middle;
    white-space: nowrap;
}

.hd-table tbody tr:last-child td {
    border-bottom: none;
}

.hd-table tbody tr {
    transition: background .12s;
}

.hd-table tbody tr:hover {
    background: #fafbff;
}

.hd-name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
}

.hd-avatar {
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

.hd-name {
    font-weight: 600;
    color: #1a2338;
}

.hd-description {
    color: #71809b;
    white-space: normal;
}

.hd-description.empty {
    font-style: italic;
    color: #a2aec4;
}

.hd-recurs-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 11.5px;
    font-weight: 700;
}

.hd-recurs-badge.yes {
    background: var(--accent-lighter);
    color: var(--accent-text);
}

.hd-recurs-badge.no {
    background: #f1f4f9;
    color: #8b96a8;
}

.hd-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.hd-icon-btn {
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

.hd-icon-btn svg {
    width: 13px;
    height: 13px;
}

.hd-icon-btn.edit {
    background: var(--accent-lighter);
    color: var(--accent-text);
}

.hd-icon-btn.edit:hover {
    background: var(--accent-border);
}

.hd-icon-btn.delete {
    background: #fee2e2;
    color: #b91c1c;
}

.hd-icon-btn.delete:hover {
    background: #fecaca;
}

.hd-empty-state {
    text-align: center;
    padding: 64px 20px !important;
    white-space: normal;
}

.hd-empty-state .hd-empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 16px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.hd-empty-state .hd-empty-icon svg {
    width: 26px;
    height: 26px;
    color: #a2aec4;
}

.hd-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 14px;
}

.hd-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 15px;
    margin-bottom: 6px;
}

.hd-skeleton-row td {
    padding: 16px 18px;
}

.hd-skeleton-bar {
    height: 14px;
    border-radius: 6px;
    background: linear-gradient(90deg, #f0f2f8 25%, #e6e9f2 37%, #f0f2f8 63%);
    background-size: 400% 100%;
    animation: hd-shimmer 1.4s ease infinite;
}

@keyframes hd-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

.hd-modal-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent), var(--accent));
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
}

.hd-modal-icon svg {
    width: 20px;
    height: 20px;
    color: white;
}

.hd-checkbox-label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13.5px;
    color: #34435c;
    cursor: pointer;
    margin-top: 4px;
}

@media (max-width: 640px) {
    .hd-header { flex-direction: column; }
    .hd-add-btn { width: 100%; justify-content: center; }
    .hd-toolbar { flex-direction: column; align-items: stretch; }
    .hd-search-wrap { max-width: none; }
}

/* Custom confirmation modal */
.custom-modal-overlay {
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
.custom-modal-overlay.open {
    display: flex;
    opacity: 1;
}
.custom-modal-box {
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
.custom-modal-overlay.open .custom-modal-box {
    transform: translateY(0) scale(1);
}
.custom-modal-icon {
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
.custom-modal-icon svg { width: 24px; height: 24px; }
.custom-modal-title { margin: 0 0 8px; font-size: 18px; color: #0f172a; }
.custom-modal-desc { margin: 0 0 24px; color: #64748b; font-size: 14px; line-height: 1.5; }
.custom-modal-actions { display: flex; gap: 12px; }
.btn-action-cancel { flex: 1; height: 44px; background: #f1f5f9; color: #475569; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
.btn-action-cancel:hover { background: #e2e8f0; }
.btn-action-delete { flex: 1; height: 44px; background: #ef4444; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
.btn-action-delete:hover { background: #dc2626; }
</style>

<div class="hd-page">
    <div class="hd-card">
        <div class="hd-header">
            <div class="hd-header-title">
                <div class="hd-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4M8 2v4M3 10h18"></path><path d="m9 16 2 2 4-4"></path></svg>
                </div>
                <div>
                    <h1>Holiday Management</h1>
                    <p class="form-subtitle">Clinic closure dates used to block scheduling on the calendar.</p>
                </div>
            </div>
            <button type="button" class="hd-add-btn" id="openAddHolidayModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Add Holiday
            </button>
        </div>

        <div class="hd-toolbar">
            <span class="hd-stat-pill" id="holidayCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4M8 2v4M3 10h18"></path></svg>
                <span id="holidayCountText">0 holidays</span>
            </span>
            <div class="hd-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="hd-search-input" id="holidaySearch" placeholder="Search holidays...">
                <button type="button" class="hd-search-clear" id="holidaySearchClear" aria-label="Clear search">&times;</button>
            </div>
        </div>

        <div class="hd-table-wrap">
            <table class="hd-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Date</th>
                        <th>Recurs Yearly</th>
                        <th>Description</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="holidaysTableBody">
                    <tr class="hd-skeleton-row"><td colspan="5"><div class="hd-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="hd-skeleton-row"><td colspan="5"><div class="hd-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="hd-skeleton-row"><td colspan="5"><div class="hd-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="holidayModalOverlay">
    <div class="modal-box">
        <div class="hd-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4M8 2v4M3 10h18"></path></svg>
        </div>
        <div class="modal-header">
            <h2 id="holidayModalTitle">Add Holiday</h2>
            <button type="button" class="modal-close" id="closeHolidayModal">&times;</button>
        </div>
        <p class="form-subtitle">Dates marked here block scheduling on the calendar.</p>

        <div id="hdFormAlert"></div>

        <form id="holidayForm">
            <input type="hidden" id="holiday_id">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Name</label>
                    <input id="hd_name" class="form-input" placeholder="e.g New Year's Day">
                    <span class="form-error" id="err-hd_name"></span>
                </div>

                <div class="form-group full">
                    <label>Date</label>
                    <input id="hd_holiday_date" type="date" class="form-input">
                    <span class="form-error" id="err-hd_holiday_date"></span>
                    <label class="hd-checkbox-label">
                        <input type="checkbox" id="hd_recurs_yearly">
                        Recurs every year on this date
                    </label>
                </div>

                <div class="form-group full">
                    <label>Description</label>
                    <input id="hd_description" class="form-input" placeholder="Optional">
                    <span class="form-error" id="err-hd_description"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelHoliday">Cancel</button>
                <button class="login-btn" type="submit" id="saveHolidayBtn">Add Holiday</button>
            </div>
        </form>
    </div>
</div>

<!-- Custom Confirmation Modal -->
<div id="hdConfirmDeleteModal" class="custom-modal-overlay">
    <div class="custom-modal-box">
        <div class="custom-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
        </div>
        <h3 class="custom-modal-title">Remove Holiday?</h3>
        <p class="custom-modal-desc">This action cannot be undone and may affect the scheduling calendar.</p>
        <div class="custom-modal-actions">
            <button type="button" class="btn-action-cancel" id="hdCancelDeleteBtn">Cancel</button>
            <button type="button" class="btn-action-delete" id="hdConfirmDeleteBtn">Delete</button>
        </div>
    </div>
</div>
`;
}
