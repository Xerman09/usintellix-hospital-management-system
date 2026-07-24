export function CqmSourceOfPaymentsView()
{
    return `
<style>
.sop-page {
    width: 100%;
}

.sop-card {
    width: 100%;
}

.sop-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 8px;
}

.sop-header-title {
    display: flex;
    align-items: flex-start;
    gap: 16px;
}

.sop-icon-badge {
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

.sop-icon-badge svg {
    width: 24px;
    height: 24px;
    color: white;
}

.sop-header h1 {
    margin: 0 0 6px;
    font-size: 24px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.sop-header .form-subtitle {
    margin: 0;
    max-width: 480px;
}

.sop-add-btn {
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

.sop-add-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(37,99,235,.3);
}

.sop-add-btn svg {
    width: 16px;
    height: 16px;
}

.sop-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: 28px 0 20px;
}

.sop-stat-pill {
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

.sop-stat-pill svg {
    width: 14px;
    height: 14px;
}

.sop-search-wrap {
    position: relative;
    flex: 1;
    max-width: 320px;
}

.sop-search-wrap svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #a2aec4;
    pointer-events: none;
}

.sop-search-input {
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

.sop-search-input:focus {
    border-color: #4f46e5;
    background: white;
    box-shadow: 0 0 0 4px rgba(79,70,229,.1);
}

.sop-search-clear {
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

.sop-search-clear.show {
    display: flex;
}

.sop-search-clear:hover {
    background: #e2e8f0;
    color: #25324b;
}

.sop-table-wrap {
    overflow-x: auto;
    border: 1px solid #eef1f7;
    border-radius: 16px;
}

.sop-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.sop-table tbody tr {
    animation: sop-row-in .25s ease both;
}

@keyframes sop-row-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}

.sop-table th {
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

.sop-table td {
    padding: 14px 18px;
    border-bottom: 1px solid #eef1f7;
    color: #25324b;
    vertical-align: middle;
}

.sop-table tbody tr:last-child td {
    border-bottom: none;
}

.sop-table tbody tr:hover {
    background: #fafbff;
}

.sop-name-cell {
    display: flex;
    align-items: center;
    gap: 12px;
}

.sop-avatar {
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

.sop-name {
    font-weight: 600;
    color: #1a2338;
}

.sop-description {
    color: #71809b;
}

.sop-description.empty {
    font-style: italic;
    color: #a2aec4;
}

.sop-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.sop-icon-btn {
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

.sop-icon-btn svg {
    width: 13px;
    height: 13px;
}

.sop-icon-btn.edit {
    background: #e0e7ff;
    color: #4338ca;
}

.sop-icon-btn.edit:hover {
    background: #c7d2fe;
}

.sop-icon-btn.delete {
    background: #fee2e2;
    color: #b91c1c;
}

.sop-icon-btn.delete:hover {
    background: #fecaca;
}

.sop-empty-state {
    text-align: center;
    padding: 64px 20px !important;
}

.sop-empty-state .sop-empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 16px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.sop-empty-state .sop-empty-icon svg {
    width: 26px;
    height: 26px;
    color: #a2aec4;
}

.sop-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 14px;
}

.sop-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 15px;
    margin-bottom: 6px;
}

.sop-skeleton-row td {
    padding: 16px 18px;
}

.sop-skeleton-bar {
    height: 14px;
    border-radius: 6px;
    background: linear-gradient(90deg, #f0f2f8 25%, #e6e9f2 37%, #f0f2f8 63%);
    background-size: 400% 100%;
    animation: sop-shimmer 1.4s ease infinite;
}

@keyframes sop-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

.sop-modal-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, #4f46e5, #2563eb);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
}

.sop-modal-icon svg {
    width: 20px;
    height: 20px;
    color: white;
}

@media (max-width: 640px) {
    .sop-header { flex-direction: column; }
    .sop-add-btn { width: 100%; justify-content: center; }
    .sop-toolbar { flex-direction: column; align-items: stretch; }
    .sop-search-wrap { max-width: none; }
}
</style>

<div class="sop-page">
    <div class="sop-card">
        <div class="sop-header">
            <div class="sop-header-title">
                <div class="sop-icon-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                </div>
                <div>
                    <h1>CQM Source of Payment</h1>
                    <p class="form-subtitle">Source of payment categories registered here become available when categorizing encounters for clinical quality measure (CQM) reporting.</p>
                </div>
            </div>
            <button type="button" class="sop-add-btn" id="openAddCqmSourceOfPaymentModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Create Source of Payment
            </button>
        </div>

        <div class="sop-toolbar">
            <span class="sop-stat-pill" id="cqmSourceOfPaymentCountPill">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                <span id="cqmSourceOfPaymentCountText">0 sources of payment</span>
            </span>
            <div class="sop-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                <input type="text" class="sop-search-input" id="cqmSourceOfPaymentSearch" placeholder="Search sources of payment...">
                <button type="button" class="sop-search-clear" id="cqmSourceOfPaymentSearchClear" aria-label="Clear search">&times;</button>
            </div>
        </div>

        <div class="sop-table-wrap">
            <table class="sop-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="cqmSourceOfPaymentsTableBody">
                    <tr class="sop-skeleton-row"><td colspan="3"><div class="sop-skeleton-bar" style="width: 60%;"></div></td></tr>
                    <tr class="sop-skeleton-row"><td colspan="3"><div class="sop-skeleton-bar" style="width: 45%;"></div></td></tr>
                    <tr class="sop-skeleton-row"><td colspan="3"><div class="sop-skeleton-bar" style="width: 70%;"></div></td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal-overlay" id="cqmSourceOfPaymentModalOverlay">
    <div class="modal-box">
        <div class="sop-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
        </div>
        <div class="modal-header">
            <h2 id="cqmSourceOfPaymentModalTitle">Add Source of Payment</h2>
            <button type="button" class="modal-close" id="closeCqmSourceOfPaymentModal">&times;</button>
        </div>
        <p class="form-subtitle">Define a source of payment category used for CQM reporting.</p>

        <div id="formAlert"></div>

        <form id="cqmSourceOfPaymentForm">
            <input type="hidden" id="cqm_source_of_payment_id">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Name</label>
                    <input id="name" class="form-input" placeholder="e.g Medicare">
                    <span class="form-error" id="err-name"></span>
                </div>

                <div class="form-group full">
                    <label>Description</label>
                    <input id="description" class="form-input" placeholder="Optional description">
                    <span class="form-error" id="err-description"></span>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="cancelCqmSourceOfPayment">Cancel</button>
                <button class="login-btn" type="submit" id="saveCqmSourceOfPaymentBtn">Add Source of Payment</button>
            </div>
        </form>
    </div>
</div>
`;
}
