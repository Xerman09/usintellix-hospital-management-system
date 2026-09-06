export function HelpView() {
    return `
<style>
.help-page-container {
    width: 100%;
    font-family: 'Inter', system-ui, sans-serif;
    background: #ffffff;
    min-height: 100%;
}
.help-header {
    background-color: #0f172a;
    color: white;
    padding: 12px 16px;
    font-size: 20px;
    font-weight: 500;
}
.help-list {
    display: flex;
    flex-direction: column;
}
.help-item {
    display: flex;
    padding: 16px;
    border-bottom: 1px solid #e2e8f0;
    align-items: flex-start;
}
.help-icon {
    width: 24px;
    height: 24px;
    margin-right: 12px;
    margin-top: 2px;
    flex-shrink: 0;
    color: #0f172a;
    fill: currentColor;
}
.help-content {
    display: flex;
    flex-direction: column;
}
.help-title {
    font-size: 16px;
    color: #334155;
    margin-bottom: 4px;
}
.help-description {
    font-size: 13px;
    color: #64748b;
    line-height: 1.4;
}

:root[data-theme="dark"] .help-page-container { background: var(--bg-surface); }
:root[data-theme="dark"] .help-item { border-bottom-color: var(--border-color); }
:root[data-theme="dark"] .help-icon { color: var(--text-muted); }
:root[data-theme="dark"] .help-title { color: var(--text-primary); }
:root[data-theme="dark"] .help-description { color: var(--text-muted); }
</style>

<div class="help-page-container">
    <div class="help-header">
        Dashboard Help
    </div>
    <div class="help-list">
        
        <div class="help-item">
            <svg class="help-icon" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline fill="none" stroke="currentColor" stroke-width="2" points="14 2 14 8 20 8"/></svg>
            <div class="help-content">
                <div class="help-title">Clinical Documents</div>
                <div class="help-description">Clinical forms and documents that have been sent by your clinical staff to be filled out.</div>
            </div>
        </div>
        
        <div class="help-item">
            <svg class="help-icon" viewBox="0 0 24 24"><rect fill="none" stroke="currentColor" stroke-width="2" x="3" y="4" width="18" height="18" rx="2" ry="2"/><line fill="none" stroke="currentColor" stroke-width="2" x1="16" y1="2" x2="16" y2="6"/><line fill="none" stroke="currentColor" stroke-width="2" x1="8" y1="2" x2="8" y2="6"/><line fill="none" stroke="currentColor" stroke-width="2" x1="3" y1="10" x2="21" y2="10"/><path fill="none" stroke="currentColor" stroke-width="2" d="m9 16 2 2 4-4"/></svg>
            <div class="help-content">
                <div class="help-title">Appointments</div>
                <div class="help-description">View upcoming appointments and if allowed by your clinical staff make new appointments.</div>
            </div>
        </div>
        
        <div class="help-item">
            <svg class="help-icon" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline fill="none" stroke="currentColor" stroke-width="2" points="22,6 12,13 2,6"/></svg>
            <div class="help-content">
                <div class="help-title">Secure Messaging</div>
                <div class="help-description">You can send and receive secure communications with your care team staff through this system.</div>
            </div>
        </div>
        
        <div class="help-item">
            <svg class="help-icon" viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect fill="none" stroke="currentColor" stroke-width="2" x="8" y="2" width="8" height="4" rx="1" ry="1"/><line fill="none" stroke="currentColor" stroke-width="2" x1="9" y1="14" x2="15" y2="14"/></svg>
            <div class="help-content">
                <div class="help-title">Health Snapshot</div>
                <div class="help-description">See your immunization, medications, active prescriptions, allergy list, current problems list, and lab results.</div>
            </div>
        </div>
        
        <div class="help-item">
            <svg class="help-icon" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle fill="none" stroke="currentColor" stroke-width="2" cx="12" cy="7" r="4"/></svg>
            <div class="help-content">
                <div class="help-title">Profile</div>
                <div class="help-description">Review and edit your medical profile information. This includes your basic demographics (name, address, emergency contact). You can also review your insurance information if you use a third party insurer to help pay for treatment of care.</div>
            </div>
        </div>
        
        <div class="help-item">
            <svg class="help-icon" viewBox="0 0 24 24"><rect fill="none" stroke="currentColor" stroke-width="2" x="1" y="4" width="22" height="16" rx="2" ry="2"/><line fill="none" stroke="currentColor" stroke-width="2" x1="1" y1="10" x2="23" y2="10"/></svg>
            <div class="help-content">
                <div class="help-title">Billing Summary</div>
                <div class="help-description"></div>
            </div>
        </div>
        
        <div class="help-item">
            <svg class="help-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            <div class="help-content">
                <div class="help-title">Medical Reports</div>
                <div class="help-description">Setup your digital signature for signing your clinical documents, update your login credentials, or change application settings in the portal.</div>
            </div>
        </div>
        
        <div class="help-item">
            <svg class="help-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            <div class="help-content">
                <div class="help-title">Settings</div>
                <div class="help-description">Setup your digital signature for signing your clinical documents, update your login credentials, or change application settings in the portal.</div>
            </div>
        </div>
        
    </div>
</div>
    `;
}
