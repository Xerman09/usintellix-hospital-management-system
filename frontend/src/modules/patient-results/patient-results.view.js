export function PatientResultsView()
{
    return `
<style>
.pt-res-page {
    width: 100%;
    font-size: 13.5px;
}

.pt-res-page h1 {
    margin: 0;
    font-size: 22px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.pt-res-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;
}

.pt-res-toolbar-actions {
    display: flex;
    gap: 8px;
}

.pt-res-order-btn, .pt-res-refresh-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    padding: 0 14px;
    border-radius: 6px;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
}

.pt-res-order-btn {
    border: none;
    background: var(--accent);
    color: white;
}

.pt-res-order-btn:hover {
    background: #1742b0;
}

.pt-res-order-btn:disabled {
    background: #c3cbd8;
    cursor: not-allowed;
}

.pt-res-refresh-btn {
    border: 1.5px solid var(--accent);
    background: white;
    color: var(--accent);
}

.pt-res-refresh-btn:hover {
    background: var(--accent-light);
}

.pt-res-refresh-btn svg, .pt-res-order-btn svg {
    width: 14px;
    height: 14px;
}

.pt-res-loading {
    padding: 40px;
    text-align: center;
    color: #71809b;
}

.pt-res-card {
    border: 1px solid #e5e9f0;
    border-radius: 8px;
    margin-bottom: 18px;
    overflow: hidden;
    background: white;
}

.pt-res-order-table, .pt-res-results-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.pt-res-group-row th {
    background: #9aa3b0;
    color: white;
    font-weight: 700;
    font-size: 11.5px;
    text-transform: uppercase;
    letter-spacing: .3px;
    padding: 8px 14px;
    text-align: left;
}

.pt-res-col-row th {
    background: #eef1f5;
    color: #4a5568;
    font-weight: 700;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .3px;
    padding: 7px 10px;
    border-bottom: 1px solid #e5e9f0;
    white-space: nowrap;
    text-align: left;
}

.pt-res-order-table td, .pt-res-results-table td {
    padding: 8px 10px;
    border-bottom: 1px solid #eef1f5;
    color: #29323f;
    vertical-align: middle;
}

.pt-res-subtext {
    font-size: 11.5px;
    color: #71809b;
    margin-top: 2px;
}

.pt-res-input, .pt-res-cell-input {
    width: 100%;
    box-sizing: border-box;
    height: 30px;
    padding: 0 8px;
    border-radius: 5px;
    border: 1px solid #d7dee8;
    outline: none;
    font-size: 12.5px;
    color: #1c2534;
    background: white;
}

.pt-res-input:focus, .pt-res-cell-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(var(--accent-rgb),.12);
}

.pt-res-results-table th:last-child, .pt-res-results-table td:last-child {
    width: 32px;
    padding: 8px 6px;
}

.pt-res-abn-cell {
    text-align: center;
}

.pt-res-remove-row-btn {
    width: 22px;
    height: 22px;
    border-radius: 5px;
    border: 1px solid #e2c4c4;
    background: #fbecec;
    color: #b23c3c;
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
}

.pt-res-remove-row-btn:hover {
    background: #f5d5d5;
}

.pt-res-card-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 14px;
    background: #fafbfd;
    border-top: 1px solid #eef1f5;
}

.pt-res-add-row-btn {
    height: 32px;
    padding: 0 12px;
    border-radius: 6px;
    border: 1.5px dashed #c3cbd8;
    background: white;
    color: #4a5568;
    font-weight: 600;
    font-size: 12.5px;
    cursor: pointer;
    margin-right: auto;
}

.pt-res-add-row-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
}

.pt-res-save-btn {
    height: 32px;
    padding: 0 18px;
    border-radius: 6px;
    border: none;
    background: var(--accent);
    color: white;
    font-weight: 600;
    font-size: 12.5px;
    cursor: pointer;
}

.pt-res-save-btn:hover {
    background: #1742b0;
}

.pt-res-save-btn:disabled {
    background: #c3cbd8;
    cursor: not-allowed;
}

.pt-res-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 56px 20px;
    color: #71809b;
    border: 1px solid #e5e9f0;
    border-radius: 8px;
}

.pt-res-empty-icon {
    width: 48px;
    height: 48px;
    margin-bottom: 14px;
    border-radius: 14px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.pt-res-empty-icon svg {
    width: 22px;
    height: 22px;
    color: #a2aec4;
}

.pt-res-empty strong {
    display: block;
    color: #34435c;
    font-size: 14px;
    margin-bottom: 4px;
}

.pt-res-empty p {
    margin: 0;
    font-size: 13px;
    max-width: 420px;
}
</style>

<div class="pt-res-page">
    <div class="pt-res-toolbar">
        <h1>Patient Results</h1>
        <div class="pt-res-toolbar-actions">
            <button type="button" class="pt-res-order-btn" id="ptResOrderBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
                Order Procedure
            </button>
            <button type="button" class="pt-res-refresh-btn" id="ptResRefreshBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15.5-6.36L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-15.5 6.36L3 16"></path><path d="M3 21v-5h5"></path></svg>
                Refresh
            </button>
        </div>
    </div>

    <div id="ptResOrders"></div>
</div>

<div class="modal-overlay" id="ptResOrderModalOverlay">
    <div class="modal-box">
        <div class="modal-header">
            <h2>Order Procedure</h2>
            <button type="button" class="modal-close" id="ptResOrderModalClose">&times;</button>
        </div>

        <div id="ptResOrderFormAlert"></div>

        <form id="ptResOrderForm">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Procedure Order</label>
                    <input type="text" id="ptResProcedureInput" class="form-input" placeholder="Click to select..." readonly>
                    <input type="hidden" id="ptResProcedureId">
                    <span class="form-error" id="err-procedure_order_config_id"></span>
                </div>

                <div class="form-group">
                    <label>Provider</label>
                    <select id="ptResProviderSelect" class="form-input"><option value="">-- None --</option></select>
                </div>

                <div class="form-group">
                    <label>Vendor / Lab</label>
                    <select id="ptResVendorSelect" class="form-input"><option value="">-- None (This Facility) --</option></select>
                </div>

                <div class="form-group">
                    <label>Order Date</label>
                    <input type="date" id="ptResOrderDate" class="form-input">
                    <span class="form-error" id="err-order_date"></span>
                </div>

                <div class="form-group">
                    <label>Specimen</label>
                    <input type="text" id="ptResSpecimen" class="form-input" placeholder="Optional">
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="ptResOrderCancelBtn">Cancel</button>
                <button class="login-btn" type="submit" id="ptResOrderSaveBtn">Place Order</button>
            </div>
        </form>
    </div>
</div>

<div class="modal-overlay" id="ptResPickerModalOverlay">
    <div class="modal-box" style="max-width: 900px;">
        <button type="button" class="modal-close" id="ptResPickerClose" style="float: right;">&times;</button>
        <div id="ptResPickerContent" style="clear: both;"></div>
    </div>
</div>
`;
}
