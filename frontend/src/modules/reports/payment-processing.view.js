export function PaymentProcessingView() {
    const now = new Date();
    const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return `
<style>
.pp-page {
    width: 100%;
    font-size: 13.5px;
}

.pp-title {
    margin: 0 0 14px;
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
}

.pp-filter-panel {
    display: flex;
    align-items: center;
    gap: 24px;
    background: var(--bg-surface-alt);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 14px 18px;
    margin-bottom: 14px;
}

.pp-filter-fields {
    display: flex;
    flex-direction: column;
    gap: 14px;
    flex: 1;
}

.pp-filter-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 16px 24px;
}

.pp-filter-group {
    display: flex;
    align-items: center;
    gap: 8px;
}

.pp-filter-group label {
    color: var(--text-muted);
    font-size: 13px;
    white-space: nowrap;
}

.pp-filter-panel select,
.pp-filter-panel input[type="text"],
.pp-filter-panel input[type="datetime-local"] {
    height: 32px;
    padding: 0 10px;
    border-radius: 5px;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 13px;
    min-width: 190px;
    color-scheme: light;
}

:root[data-theme="dark"] .pp-filter-panel select,
:root[data-theme="dark"] .pp-filter-panel input[type="text"],
:root[data-theme="dark"] .pp-filter-panel input[type="datetime-local"] {
    color-scheme: dark;
}

.pp-divider {
    width: 1px;
    align-self: stretch;
    background: var(--border-color);
}

.pp-submit-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    padding: 0 18px;
    border-radius: 5px;
    border: 1px solid var(--accent);
    background: var(--accent);
    color: white;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
}

.pp-submit-btn:hover { background: var(--accent-hover); border-color: var(--accent-hover); }

.pp-instruction {
    color: var(--text-muted);
    font-size: 13px;
    margin: 0 0 14px;
}

.pp-table-wrap {
    overflow-x: auto;
    border: 1px solid var(--border-color);
    border-radius: 8px;
}

.pp-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.pp-table th {
    text-align: left;
    padding: 9px 12px;
    color: var(--text-muted);
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .3px;
    background: var(--bg-surface-alt);
    border-bottom: 1px solid var(--border-color);
    white-space: nowrap;
}

.pp-table td {
    padding: 8px 12px;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-primary);
    vertical-align: middle;
}

.pp-table tbody tr:last-child td { border-bottom: none; }

.pp-empty-state {
    padding: 26px 16px;
    text-align: center;
    color: var(--text-muted);
    font-style: italic;
}
</style>

<div class="pp-page">
    <h2 class="pp-title">Payment Processing</h2>

    <div class="pp-filter-panel">
        <form id="ppForm" class="pp-filter-fields">
            <div class="pp-filter-row">
                <div class="pp-filter-group">
                    <label>Service:</label>
                    <select id="ppService">
                        <option value="">All</option>
                        <option value="check">Check Payment</option>
                        <option value="cash">Cash</option>
                        <option value="credit_card">Credit Card</option>
                        <option value="eft">EFT / Direct Deposit</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div class="pp-filter-group">
                    <label>Patient:</label>
                    <input type="text" id="ppPatient" placeholder="Name">
                </div>
            </div>
            <div class="pp-filter-row">
                <div class="pp-filter-group">
                    <label>From:</label>
                    <input type="datetime-local" id="ppDateFrom" value="${toLocalInput(from)}">
                </div>
                <div class="pp-filter-group">
                    <label>To:</label>
                    <input type="datetime-local" id="ppDateTo" value="${toLocalInput(now)}">
                </div>
            </div>
            <div class="pp-filter-row">
                <div class="pp-filter-group">
                    <label>Ticket:</label>
                    <input type="text" id="ppTicket" placeholder="">
                </div>
                <div class="pp-filter-group">
                    <label>Transaction ID:</label>
                    <input type="text" id="ppTransactionId" placeholder="">
                </div>
            </div>
            <div class="pp-filter-row">
                <div class="pp-filter-group">
                    <label>Action:</label>
                    <select id="ppAction" disabled title="This build has no payment-gateway integration, so there is no Sale/Refund/Void/Capture action to filter on -- every processed payment shown here is a plain recorded payment">
                        <option value="">All</option>
                    </select>
                </div>
            </div>
        </form>

        <div class="pp-divider"></div>

        <button type="button" class="pp-submit-btn" id="ppSubmitBtn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Submit
        </button>
    </div>

    <p class="pp-instruction" id="ppInstructionText">Please input search criteria above, and click Submit to view results.</p>

    <div class="pp-table-wrap" id="ppResultsArea" style="display: none;">
        <table class="pp-table">
            <thead>
                <tr>
                    <th>Date</th><th>Service</th><th>Patient</th><th>Ticket</th>
                    <th>Transaction ID</th><th style="text-align: right;">Amount</th>
                </tr>
            </thead>
            <tbody id="ppTableBody"></tbody>
        </table>
    </div>
</div>
    `;
}

function toLocalInput(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
