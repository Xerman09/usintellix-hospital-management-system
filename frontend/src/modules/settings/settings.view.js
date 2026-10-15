export function SettingsView() {
    return `
<style>
.settings-page {
    width: 100%;
    font-family: 'Inter', system-ui, sans-serif;
}

.settings-header {
    background: #ffffff;
    color: #0f172a;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 18px 24px;
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    gap: 14px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.settings-header-icon {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    background: #eff6ff;
    color: #2563eb;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.settings-header-text h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #0f172a;
}

.settings-header-text p {
    margin: 2px 0 0;
    font-size: 13px;
    color: #64748b;
}

.settings-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    overflow: hidden;
}

.settings-list {
    display: flex;
    flex-direction: column;
}

.settings-item {
    display: flex;
    align-items: center;
    padding: 18px 22px;
    border-bottom: 1px solid #f1f5f9;
    background-color: #ffffff;
    cursor: pointer;
    text-decoration: none;
    transition: background-color 0.15s ease, transform 0.1s ease;
    gap: 16px;
}

.settings-item:last-child {
    border-bottom: none;
}

.settings-item:hover {
    background-color: #f8fafc;
}

.settings-item-icon-wrap {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.settings-item-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.settings-title {
    font-size: 15px;
    color: #0f172a;
    font-weight: 600;
}

.settings-desc {
    font-size: 13px;
    color: #64748b;
    line-height: 1.4;
}

.settings-item-arrow {
    color: #94a3b8;
    font-size: 18px;
    font-weight: 600;
    transition: transform 0.15s ease, color 0.15s ease;
}

.settings-item:hover .settings-item-arrow {
    color: #2563eb;
    transform: translateX(3px);
}

:root[data-theme="dark"] .settings-header {
    background: var(--bg-surface-alt, #172033);
    border-color: var(--border-color, #334155);
    box-shadow: none;
}
:root[data-theme="dark"] .settings-header-icon {
    background: rgba(37, 99, 235, 0.18);
    color: #60a5fa;
}
:root[data-theme="dark"] .settings-header-text h1 {
    color: var(--text-primary, #f8fafc);
}
:root[data-theme="dark"] .settings-header-text p {
    color: var(--text-muted, #94a3b8);
}
:root[data-theme="dark"] .settings-card {
    background: var(--bg-surface);
    border-color: var(--border-color);
}
:root[data-theme="dark"] .settings-item {
    background: var(--bg-surface);
    border-bottom-color: var(--border-color);
}
:root[data-theme="dark"] .settings-item:hover {
    background: var(--bg-surface-alt);
}
:root[data-theme="dark"] .settings-title {
    color: var(--text-primary, #f8fafc);
}
:root[data-theme="dark"] .settings-desc {
    color: var(--text-muted, #94a3b8);
}
:root[data-theme="dark"] .settings-item-arrow {
    color: var(--text-muted, #94a3b8);
}
:root[data-theme="dark"] .settings-item:hover .settings-item-arrow {
    color: #60a5fa;
}
</style>

<div class="settings-page">
    <div class="settings-header">
        <div class="settings-header-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </div>
        <div class="settings-header-text">
            <h1>Account Settings</h1>
            <p>Manage your patient portal preferences, authentication credentials, and theme</p>
        </div>
    </div>
    
    <div class="settings-card">
        <div class="settings-list">
            <a href="#/dashboard" class="settings-item" id="btnDigitalSignature">
                <div class="settings-item-icon-wrap" style="background: #eff6ff; color: #2563eb;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                </div>
                <div class="settings-item-body">
                    <span class="settings-title">Default Digital Signature</span>
                    <span class="settings-desc">Draw and store your authorized electronic signature for rapid document completion</span>
                </div>
                <div class="settings-item-arrow">&rarr;</div>
            </a>
            
            <a href="#/dashboard" class="settings-item" id="btnManageLogin">
                <div class="settings-item-icon-wrap" style="background: #f0fdf4; color: #16a34a;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </div>
                <div class="settings-item-body">
                    <span class="settings-title">Manage Login Credentials</span>
                    <span class="settings-desc">Update your portal username, password, and view patient identifiers</span>
                </div>
                <div class="settings-item-arrow">&rarr;</div>
            </a>
            
            <a href="#/dashboard" class="settings-item" id="btnSelectTheme">
                <div class="settings-item-icon-wrap" style="background: #faf5ff; color: #9333ea;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                </div>
                <div class="settings-item-body">
                    <span class="settings-title">Select Theme</span>
                    <span class="settings-desc">Toggle between Light and Dark interface modes according to your preference</span>
                </div>
                <div class="settings-item-arrow">&rarr;</div>
            </a>
        </div>
    </div>
</div>

<div class="modal-overlay" id="settingsSignatureModalOverlay">
    <div class="modal-box" style="max-width: 600px; padding: 0;">
        <div style="background: white; border-bottom: 1px solid #e2e8f0;">
            <canvas id="settingsSignatureCanvas" width="600" height="300" style="width: 100%; height: 300px; touch-action: none; cursor: crosshair; display: block;"></canvas>
            <div style="text-align: center; padding: 8px; color: #475569; font-size: 12px; border-top: 1px solid #e2e8f0; background: #f8fafc;">Sign Above</div>
        </div>
        <div style="display: flex; background: #f1f5f9; border-top: 1px solid #e2e8f0;">
            <button type="button" id="settingsSignatureClearBtn" style="flex: 1; padding: 12px; background: #f8fafc; border: none; border-right: 1px solid #e2e8f0; color: #334155; font-size: 14px; cursor: pointer;">Clear Canvas</button>
            <button type="button" id="settingsSignatureUseCurrentBtn" style="flex: 1; padding: 12px; background: #f8fafc; border: none; border-right: 1px solid #e2e8f0; color: #334155; font-size: 14px; cursor: pointer;">Use Current</button>
            <button type="button" id="settingsSignatureCancelBtn" style="flex: 1; padding: 12px; background: #ef4444; border: none; border-right: 1px solid #dc2626; color: white; font-size: 14px; cursor: pointer;">Cancel</button>
            <button type="button" id="settingsSignatureSaveBtn" style="flex: 1; padding: 12px; background: #22c55e; border: none; color: white; font-size: 14px; font-weight: 500; cursor: pointer;">Sign and Save</button>
        </div>
    </div>
</div>

<div class="modal-overlay" id="settingsLoginModalOverlay">
    <div class="modal-box" style="max-width: 800px; padding: 0; display: flex; flex-direction: column; max-height: 90vh;">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; background: white;">
            <h3 style="margin: 0; font-size: 16px; font-weight: normal; color: #0f172a;">Manage Login Credentials</h3>
            <button type="button" id="settingsLoginCloseBtn" style="background: transparent; border: none; font-size: 20px; font-weight: bold; color: #64748b; cursor: pointer;">&times;</button>
        </div>
        
        <div style="padding: 16px; overflow-y: auto; background: white; flex: 1;">
            
            <!-- Account Username Section -->
            <div style="border: 1px solid #e2e8f0; border-radius: 4px; margin-bottom: 16px;">
                <div style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 8px; text-align: center; color: #0f172a; font-size: 16px;">
                    Account Username <svg viewBox="0 0 24 24" fill="#0ea5e9" style="width: 16px; height: 16px; vertical-align: text-bottom;"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4" stroke="white" stroke-width="2" stroke-linecap="round"></path><path d="M12 8h.01" stroke="white" stroke-width="2" stroke-linecap="round"></path></svg>
                </div>
                <div style="padding: 16px;">
                    <div style="display: grid; grid-template-columns: 180px 1fr; gap: 16px; align-items: center; margin-bottom: 12px;">
                        <label style="font-weight: bold; font-size: 14px; color: #000;">Change Username</label>
                        <input type="text" id="settingsChangeUsername" placeholder="Phil1" style="border: 1px solid #94a3b8; border-radius: 2px; padding: 6px; width: 100%; box-sizing: border-box;">
                    </div>
                    <div style="display: grid; grid-template-columns: 180px 1fr; gap: 16px; align-items: center;">
                        <label style="font-weight: bold; font-size: 14px; color: #000;">Confirm Username</label>
                        <div style="width: 100%;">
                            <input type="text" id="settingsConfirmUsername" style="border: 1px solid #94a3b8; border-radius: 2px; padding: 6px; width: 100%; box-sizing: border-box;">
                            <div style="font-size: 13px; font-style: italic; color: #475569; margin-top: 4px;">Enter a minimum of 8 characters. Recommended to include symbols and numbers but not required.</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Account Password Section -->
            <div style="border: 1px solid #e2e8f0; border-radius: 4px; margin-bottom: 16px;">
                <div style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 8px; text-align: center; color: #0f172a; font-size: 16px;">
                    Account Password <svg viewBox="0 0 24 24" fill="#0ea5e9" style="width: 16px; height: 16px; vertical-align: text-bottom;"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4" stroke="white" stroke-width="2" stroke-linecap="round"></path><path d="M12 8h.01" stroke="white" stroke-width="2" stroke-linecap="round"></path></svg>
                </div>
                <div style="padding: 16px;">
                    <div style="display: grid; grid-template-columns: 180px 1fr; gap: 16px; align-items: center; margin-bottom: 12px;">
                        <label style="font-weight: bold; font-size: 14px; color: #000;">Change Password</label>
                        <input type="password" id="settingsChangePassword" style="border: 1px solid #94a3b8; border-radius: 2px; padding: 6px; width: 100%; box-sizing: border-box;">
                    </div>
                    <div style="display: grid; grid-template-columns: 180px 1fr; gap: 16px; align-items: center;">
                        <label style="font-weight: bold; font-size: 14px; color: #000;">Confirm Password</label>
                        <div style="width: 100%;">
                            <input type="password" id="settingsConfirmPassword" style="border: 1px solid #94a3b8; border-radius: 2px; padding: 6px; width: 100%; box-sizing: border-box;">
                            <div style="font-size: 13px; font-style: italic; color: #475569; margin-top: 4px;">Password must be at least 8 characters with at least one uppercase,one lowercase,and one number.</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Current Password Auth Section -->
            <div style="background: #fce8e8; border: 1px solid #fecaca; border-radius: 4px; padding: 12px; margin-bottom: 16px;">
                <div style="font-weight: bold; font-size: 14px; color: #000; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" style="width: 16px; height: 16px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    Enter your current Account Password to authorize these changes
                </div>
                <input type="password" id="settingsCurrentPassword" placeholder="Current password" style="border: 1px solid #94a3b8; border-radius: 2px; padding: 6px; width: 100%; box-sizing: border-box;">
            </div>
            
            <button type="button" id="settingsLoginSaveBtn" style="background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; font-size: 14px; font-weight: 500; cursor: pointer; margin-bottom: 16px;">Save</button>
            
            <!-- Help Toggle -->
            <div id="settingsHelpToggle" style="background: #e0f2fe; padding: 8px; text-align: center; cursor: pointer; color: #0369a1; border-radius: 4px; font-size: 14px;">
                <span id="settingsHelpArrow" style="display: inline-block; transform: rotate(0deg); transition: transform 0.2s;">&#9654;</span> Help <svg viewBox="0 0 24 24" fill="#0f172a" style="width: 14px; height: 14px; vertical-align: text-bottom;"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4" stroke="white" stroke-width="2" stroke-linecap="round"></path><path d="M12 8h.01" stroke="white" stroke-width="2" stroke-linecap="round"></path></svg>
            </div>
            
            <!-- Help Content -->
            <div id="settingsHelpContent" style="display: none; background: #e0f2fe; padding: 16px; border-radius: 0 0 4px 4px; font-size: 13px; color: #334155; margin-top: -4px;">
                <p style="margin-top: 0;">Use this form to change your Account Username, Account Password, or both.</p>
                <p>You can change your current Account Password by entering a new Account Password and then entering the same Account Password into the Confirm Password field</p>
                <p>You can change your current Account Username by entering a new Account Username and then entering the same Account Username into the Confirm Username field</p>
                <p>Any change to your Account Username or Account Password requires you to enter in your current Account Password into the Confirm Current Password field.</p>
                <p>For additional help or questions you can contact your healthcare support staff.</p>
                <p style="margin-bottom: 24px;">The following fields can be used to help your support staff locate your account.</p>
                
                <div style="display: grid; grid-template-columns: 200px 1fr; gap: 16px; align-items: center; margin-bottom: 12px;">
                    <label style="font-weight: bold;">Portal Account ID for reference</label>
                    <input type="text" id="settingsPortalId" value="Phil1" readonly style="border: 1px solid #94a3b8; background: #f1f5f9; padding: 6px; border-radius: 2px;">
                </div>
                <div style="display: grid; grid-template-columns: 200px 1fr; gap: 16px; align-items: center;">
                    <label style="font-weight: bold;">Patient Identifier (pid)</label>
                    <input type="text" id="settingsPatientId" value="1" readonly style="border: 1px solid #94a3b8; background: #f1f5f9; padding: 6px; border-radius: 2px;">
                </div>
            </div>
            
        </div>
    </div>
</div>
    `;
}
