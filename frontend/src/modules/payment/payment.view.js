export function PaymentPopupMarkup() {
    return `
<style>
.pmt-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, .55);
    align-items: center;
    justify-content: center;
    z-index: 2000;
}
.pmt-overlay.open { display: flex; }
.pmt-box {
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
.pmt-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
}
.pmt-header h2 { margin: 0; font-size: 18px; font-weight: 600; }
.pmt-close {
    border: none;
    background: none;
    font-size: 20px;
    color: var(--text-muted);
    cursor: pointer;
    line-height: 1;
}
.pmt-body { overflow-y: auto; padding: 20px; }
</style>

<div class="pmt-overlay" id="paymentPopupOverlay">
    <div class="pmt-box">
        <div class="pmt-header">
            <h2>Payment</h2>
            <button type="button" class="pmt-close" id="pmtCloseBtn">&times;</button>
        </div>
        <div class="pmt-body" id="paymentPopupBody"></div>
    </div>
</div>
    `;
}

export function PaymentView(patientName) {
    return `
    <div class="payment-container">
        <style>
            .payment-container { font-size: 14px; }
            .pmt-accept-bar { background: var(--accent); color: #fff; padding: 10px 14px; font-weight: 500; font-size: 16px; border-radius: 4px 4px 0 0; }
            .pmt-section-header { background: var(--bg-surface-alt); color: var(--text-primary); padding: 6px 14px; font-weight: 600; font-size: 15px; }
            .pmt-fields { padding: 12px 14px; border: 1px solid var(--border-color); border-top: none; }
            .pmt-fields label { display: block; margin-bottom: 5px; color: var(--text-primary); }
            .pmt-fields .pmt-field { margin-bottom: 14px; }
            .pmt-select, .pmt-input {
                width: 100%; padding: 6px; border: 1px solid var(--border-color); border-radius: 3px;
                background: var(--bg-surface); color: var(--text-primary);
            }
            .pmt-radio-row label { display: inline-block; margin-right: 14px; font-weight: normal; }
            .pmt-table-wrap { overflow-x: auto; border: 1px solid var(--border-color); border-top: none; }
            .pmt-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: center; }
            .pmt-table thead th { padding: 10px; background: var(--bg-surface-alt); color: var(--text-primary); border-bottom: 1px solid var(--border-color); }
            .pmt-table tbody td { padding: 10px; border-bottom: 1px solid var(--border-color); color: var(--text-primary); }
            .pmt-pay-input { width: 70px; padding: 4px; border: 1px solid var(--border-color); border-radius: 3px; background: var(--bg-surface); color: var(--text-primary); text-align: right; }
            .pmt-muted { color: var(--text-muted); font-style: italic; }
            .pmt-total-bar { background: var(--bg-surface-alt); border: 1px solid var(--border-color); border-top: none; padding: 10px 14px; text-align: right; }
            .pmt-total-input { width: 80px; padding: 5px; border: 1px solid var(--border-color); background: var(--accent-lighter); color: var(--accent-text); border-radius: 3px; text-align: center; font-weight: 600; }
            .pmt-actions { text-align: center; margin-top: 20px; }
            .pmt-btn { border: none; padding: 8px 16px; border-radius: 3px; font-size: 14px; cursor: pointer; margin: 0 6px; }
            .pmt-btn-primary { background: var(--accent); color: #fff; }
            .pmt-btn-primary:hover { background: var(--accent-hover); }
            .pmt-btn-secondary { background: var(--bg-surface-alt); color: var(--text-primary); border: 1px solid var(--border-color); }
        </style>

        <div class="pmt-accept-bar">Accept Payment - ${patientName}</div>

        <div class="pmt-section-header">Payment</div>
        <div class="pmt-fields">
            <div class="pmt-field">
                <label>Payment Method:</label>
                <select id="paymentMethod" class="pmt-select">
                    <option>Check Payment</option>
                    <option>Cash</option>
                    <option>Credit Card</option>
                </select>
            </div>

            <div class="pmt-field">
                <label>Check or Reference Number:</label>
                <input id="paymentRef" type="text" class="pmt-input">
            </div>

            <div class="pmt-field pmt-radio-row">
                <label style="display:block;">Patient Coverage:</label>
                <label><input type="radio" name="coverage" value="self"> Self</label>
                <label><input type="radio" name="coverage" value="insurance" checked> Insurance</label>
            </div>

            <div class="pmt-field pmt-radio-row">
                <label style="display:block;">Payment against:</label>
                <label><input type="radio" name="against" value="copay" checked> Co Pay</label>
                <label><input type="radio" name="against" value="invoice"> Invoice Balance</label>
                <label><input type="radio" name="against" value="prepay"> Pre Pay</label>
            </div>
        </div>

        <div class="pmt-section-header">Collect For</div>
        <div class="pmt-table-wrap">
            <table class="pmt-table">
                <thead>
                    <tr>
                        <th>DOS</th>
                        <th>Encounter</th>
                        <th>Total Charge</th>
                        <th>Insurance<br>Payment</th>
                        <th>Patient<br>Payment</th>
                        <th>Co Pay Paid</th>
                        <th>Required Co<br>Pay</th>
                        <th>Insurance<br>Balance</th>
                        <th>Patient<br>Balance</th>
                        <th>Paying</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>

        <div class="pmt-total-bar">
            <span style="font-weight: bold; margin-right: 10px;">Total</span>
            <input type="text" id="pmtTotalInput" value="0.00" readonly class="pmt-total-input">
        </div>

        <div class="pmt-actions">
            <button id="generateInvoiceBtn" type="button" class="pmt-btn pmt-btn-primary">Generate Invoice</button>
            <button id="pmtCancelBtn" type="button" class="pmt-btn pmt-btn-secondary">Cancel</button>
        </div>
    </div>
    `;
}
