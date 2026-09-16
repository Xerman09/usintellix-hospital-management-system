export function CheckoutPopupMarkup() {
    return `
<style>
.pco-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, .55);
    align-items: center;
    justify-content: center;
    z-index: 2000;
}
.pco-overlay.open { display: flex; }
.pco-box {
    background: var(--bg-surface);
    color: var(--text-primary);
    border-radius: 10px;
    width: min(950px, 96vw);
    max-height: 92vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,.35);
}
.pco-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
}
.pco-header h2 { margin: 0; font-size: 18px; font-weight: 600; }
.pco-close {
    border: none;
    background: none;
    font-size: 20px;
    color: var(--text-muted);
    cursor: pointer;
    line-height: 1;
}
.pco-body { overflow-y: auto; padding: 20px; }

.pco-patient-bar { padding: 10px 14px; font-size: 16px; border: 1px solid var(--border-color); border-radius: 4px 4px 0 0; background: var(--bg-surface-alt); }
.pco-section-header { background: var(--bg-surface-alt); color: var(--text-primary); padding: 6px 14px; font-weight: 600; font-size: 15px; border-left: 1px solid var(--border-color); border-right: 1px solid var(--border-color); }
.pco-items-wrap { border: 1px solid var(--border-color); border-top: none; }
.pco-items-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.pco-items-table th { text-align: left; padding: 10px; color: var(--text-muted); border-bottom: 1px solid var(--border-color); }
.pco-items-table th.pco-num, .pco-items-table td.pco-num { text-align: right; }
.pco-items-table td { padding: 10px; border-bottom: 1px solid var(--border-color); color: var(--text-primary); }
.pco-amount-input {
    width: 90px; padding: 6px; border: 1px solid var(--border-color); border-radius: 3px;
    background: var(--bg-surface); color: var(--text-primary); text-align: right;
}
.pco-amount-input:disabled { background: var(--bg-surface-alt); color: var(--text-muted); }
.pco-muted { color: var(--text-muted); font-style: italic; padding: 14px; display: block; }

.pco-collect { border: 1px solid var(--border-color); border-top: none; padding: 14px; }
.pco-field-row { display: grid; grid-template-columns: 160px 220px; gap: 10px; align-items: center; margin-bottom: 12px; }
.pco-field-row label { color: var(--text-primary); }
.pco-input, .pco-select {
    padding: 6px; border: 1px solid var(--border-color); border-radius: 3px;
    background: var(--bg-surface); color: var(--text-primary);
}

.pco-actions { text-align: right; margin-top: 20px; }
.pco-btn { border: none; padding: 8px 16px; border-radius: 3px; font-size: 14px; cursor: pointer; margin-left: 8px; }
.pco-btn-primary { background: var(--accent); color: #fff; }
.pco-btn-primary:hover { background: var(--accent-hover); }
.pco-btn-secondary { background: var(--bg-surface-alt); color: var(--text-primary); border: 1px solid var(--border-color); }
</style>

<div class="pco-overlay" id="checkoutPopupOverlay">
    <div class="pco-box">
        <div class="pco-header">
            <h2>Checkout</h2>
            <button type="button" class="pco-close" id="pcoCloseBtn">&times;</button>
        </div>
        <div class="pco-body" id="checkoutPopupBody"></div>
    </div>
</div>
    `;
}

export function CheckoutView(patientName) {
    return `
        <div class="pco-patient-bar">Patient Checkout - ${patientName}</div>

        <div class="pco-section-header">Item Details</div>
        <div class="pco-items-wrap">
            <table class="pco-items-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th class="pco-num">Qty</th>
                        <th class="pco-num">Amount</th>
                    </tr>
                </thead>
                <tbody id="pcoItemsBody"></tbody>
            </table>
        </div>

        <div class="pco-section-header">Collect Payment</div>
        <div class="pco-collect">
            <div class="pco-field-row">
                <label>Discount Amount:</label>
                <input id="pcoDiscount" type="number" step="0.01" min="0" class="pco-input">
            </div>
            <div class="pco-field-row">
                <label>Payment Method:</label>
                <select id="pcoPaymentMethod" class="pco-select">
                    <option>Check Payment</option>
                    <option>Cash</option>
                    <option>Credit Card</option>
                </select>
            </div>
            <div class="pco-field-row">
                <label>Check/Reference Number:</label>
                <input id="pcoPaymentRef" type="text" class="pco-input">
            </div>
            <div class="pco-field-row">
                <label>Amount Paid:</label>
                <input id="pcoAmountPaid" type="number" step="0.01" min="0" class="pco-input">
            </div>
            <div class="pco-field-row">
                <label>Posting Date:</label>
                <input id="pcoPostingDate" type="date" class="pco-input">
            </div>
        </div>

        <div class="pco-actions">
            <button id="pcoSaveBtn" type="button" class="pco-btn pco-btn-primary">Save</button>
            <button id="pcoCancelBtn" type="button" class="pco-btn pco-btn-secondary">Cancel</button>
        </div>
    `;
}
