import { getUser } from "../../core/session.js";

export function BillingView() {
    const user = getUser();
    const name = [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(" ");
    
    return `
<style>
.prof-page-modern {
    width: 100%;
    font-size: 13.5px;
    color: #334155;
}

.prof-card-modern {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    margin-bottom: 24px;
}

.prof-header-modern {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 16px;
    margin-bottom: 24px;
}

.prof-header-modern h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: #0f172a;
}

:root[data-theme="dark"] .prof-page-modern { color: var(--text-primary); }
:root[data-theme="dark"] .prof-card-modern { background: var(--bg-surface); border-color: var(--border-color); }
:root[data-theme="dark"] .prof-header-modern { border-bottom-color: var(--border-color); }
:root[data-theme="dark"] .prof-header-modern h1 { color: var(--text-primary); }
</style>

<div class="prof-page-modern">
    <div class="prof-card-modern">
        <div class="prof-header-modern">
            <div>
                <h1>${name}</h1>
                <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">Patient No: ${user.patient_no || 'N/A'}</p>
            </div>
        </div>
        
        <div>
            <h2 style="margin-bottom: 24px; font-size: 18px; color: #0f172a; font-weight: 600;">Patient Billing Summary</h2>
            <form id="billingSummaryForm" style="display: flex; gap: 16px; align-items: flex-end; flex-wrap: wrap;">
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-weight: 600; color: #64748b; font-size: 12px; display: block; margin-bottom: 6px;">FROM</label>
                    <input type="date" id="billing_from" class="form-input" style="width: 150px;">
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label style="font-weight: 600; color: #64748b; font-size: 12px; display: block; margin-bottom: 6px;">TO</label>
                    <input type="date" id="billing_to" class="form-input" style="width: 150px;">
                </div>
                <button type="submit" class="login-btn" style="padding: 10px 24px; height: auto;">Submit</button>
            </form>
            <div id="billingResults" style="margin-top: 32px;"></div>
        </div>
    </div>
</div>
    `;
}
