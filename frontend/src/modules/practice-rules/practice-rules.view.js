export function PracticeRulesView()
{
    return `
<style>
.pr2-page {
    width: 100%;
    font-size: 13.5px;
    color: #1a2338;
}

.pr2-header-row {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 18px;
}

.pr2-header-row h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 400;
    color: #1a2338;
}

.pr2-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 18px;
    border: none;
    border-radius: 6px;
    background: var(--accent);
    color: white;
    font-weight: 600;
    font-size: 13.5px;
    cursor: pointer;
}

.pr2-btn:hover {
    background: #1742b0;
}

.pr2-btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 18px;
    border: 1px solid #cfd4dc;
    border-radius: 6px;
    background: #eef1f5;
    color: #1c2534;
    font-weight: 600;
    font-size: 13.5px;
    cursor: pointer;
}

.pr2-btn-secondary:hover {
    background: #e2e7ee;
}

.pr2-divider {
    border: none;
    border-top: 1px solid #e5e9f0;
    margin: 0 0 18px;
}

.pr2-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13.5px;
}

.pr2-table th {
    text-align: left;
    padding: 8px 14px 8px 0;
    font-weight: 700;
    color: #1a2338;
    border-bottom: 1px solid #1a2338;
}

.pr2-table td {
    padding: 7px 14px 7px 0;
    border-bottom: 1px solid #eef1f5;
}

.pr2-table tbody tr:hover {
    background: #fafbff;
}

.pr2-link-btn {
    background: none;
    border: none;
    padding: 0;
    color: #1d4ed8;
    font-size: 13.5px;
    cursor: pointer;
    text-align: left;
}

.pr2-link-btn:hover {
    text-decoration: underline;
}

.pr2-empty {
    padding: 40px 0;
    text-align: center;
    color: #71809b;
}

.pr2-error {
    padding: 14px 16px;
    border-radius: 6px;
    background: #fee2e2;
    color: #991b1b;
    margin-bottom: 16px;
}

/* Add / Edit form */
.pr2-form-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 18px;
}

.pr2-form-header h1 {
    margin: 0;
    font-size: 22px;
    font-weight: 400;
}

.pr2-form-actions-top {
    display: flex;
    gap: 8px;
}

.pr2-form-section-label {
    margin: 0 0 12px;
    font-size: 15px;
    font-weight: 600;
    color: #1a2338;
    padding-bottom: 6px;
    border-bottom: 1px solid #e5e9f0;
}

.pr2-form-row {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 6px 0;
}

.pr2-form-row label {
    width: 220px;
    flex-shrink: 0;
    font-weight: 600;
    color: #1a2338;
    text-align: right;
}

.pr2-form-row label .req {
    color: #dc2626;
}

.pr2-form-row .form-input {
    flex: 1;
    max-width: 440px;
}

.pr2-type-options {
    display: flex;
    gap: 18px;
    flex: 1;
}

.pr2-type-option {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: 400;
    cursor: pointer;
}

.pr2-form-footnote {
    margin-top: 8px;
    font-size: 12px;
    color: #71809b;
}

.pr2-form-bottom-actions {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid #e5e9f0;
}

/* Detail page */
.pr2-detail-box {
    background: #d7dbe3;
    border: 1px solid #c3c9d4;
    border-radius: 4px;
    padding: 16px 20px;
    margin-bottom: 16px;
}

.pr2-detail-box-title {
    font-size: 14px;
    color: #1a2338;
    margin: 0 0 14px;
}

.pr2-detail-box-title a,
.pr2-inline-link {
    color: #1d4ed8;
    font-size: 12.5px;
    font-weight: 400;
    text-decoration: none;
    cursor: pointer;
    margin-left: 4px;
}

.pr2-inline-link:hover, .pr2-detail-box-title a:hover {
    text-decoration: underline;
}

.pr2-inline-link.danger {
    color: #dc2626;
}

.pr2-detail-name {
    font-weight: 700;
    font-size: 14.5px;
    margin: 0 0 14px;
}

.pr2-detail-field {
    margin-bottom: 8px;
    line-height: 1.6;
}

.pr2-detail-field strong {
    font-weight: 700;
}

.pr2-detail-field .muted {
    color: #5a6478;
}

.pr2-detail-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    margin-top: 6px;
}

.pr2-detail-table th {
    text-align: left;
    padding: 4px 12px 4px 0;
    text-decoration: underline;
    font-weight: 600;
    color: #1a2338;
}

.pr2-detail-table td {
    padding: 4px 12px 4px 0;
    vertical-align: top;
}

.pr2-row-actions {
    white-space: nowrap;
}

.pr2-subbox {
    border: 1px dashed #9aa3b4;
    border-radius: 4px;
    padding: 14px 16px;
    margin-top: 12px;
    background: #dde1e8;
}

.pr2-inline-add-form {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid #b9c0cc;
}

.pr2-inline-add-form .form-input {
    height: 32px;
    font-size: 12.5px;
    flex: 1;
    min-width: 140px;
}

.pr2-inline-add-form .pr2-btn,
.pr2-inline-add-form .pr2-btn-secondary {
    height: 32px;
    padding: 0 12px;
    font-size: 12.5px;
}

.pr2-modal-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, .45);
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.pr2-modal-overlay.open {
    display: flex;
}

.pr2-modal-box {
    background: white;
    border-radius: 10px;
    width: 100%;
    max-width: 420px;
    padding: 28px;
    text-align: center;
}

.pr2-modal-icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: #fee2e2;
    color: #dc2626;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 14px;
}

.pr2-modal-icon svg {
    width: 22px;
    height: 22px;
}

.pr2-modal-box h3 {
    margin: 0 0 8px;
    font-size: 16px;
    color: #1a2338;
}

.pr2-modal-box p {
    margin: 0 0 20px;
    color: #64748b;
    font-size: 13.5px;
}

.pr2-modal-actions {
    display: flex;
    gap: 10px;
}

.pr2-modal-actions .pr2-btn,
.pr2-modal-actions .pr2-btn-secondary {
    flex: 1;
    justify-content: center;
}

.pr2-btn-danger {
    background: #dc2626;
}

.pr2-btn-danger:hover {
    background: #b91c1c;
}
</style>

<div class="pr2-page" id="pr2Root"></div>

<div class="pr2-modal-overlay" id="prDeleteModal">
    <div class="pr2-modal-box">
        <div class="pr2-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </div>
        <h3>Delete this rule?</h3>
        <p id="prDeleteRuleName"></p>
        <div class="pr2-modal-actions">
            <button type="button" class="pr2-btn-secondary" id="prDeleteCancelBtn">Cancel</button>
            <button type="button" class="pr2-btn pr2-btn-danger" id="prDeleteConfirmBtn">Delete</button>
        </div>
    </div>
</div>
`;
}
