export function BillingView() {
    return `
<div class="form-page">
    <div class="form-card" style="max-width: 800px; margin: 24px auto;">
        <h2 style="margin-bottom: 24px; font-size: 20px; color: #0f172a;">Patient Billing Summary</h2>
        <form id="billingSummaryForm" style="display: flex; gap: 16px; align-items: flex-end; flex-wrap: wrap;">
            <div class="form-group" style="margin-bottom: 0;">
                <label>From:</label>
                <input type="date" id="billing_from" class="form-input" style="width: 150px;">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
                <label>To:</label>
                <input type="date" id="billing_to" class="form-input" style="width: 150px;">
            </div>
            <button type="submit" class="login-btn" style="padding: 10px 24px; height: auto;">Submit</button>
        </form>
        <div id="billingResults" style="margin-top: 32px;"></div>
    </div>
</div>
    `;
}
