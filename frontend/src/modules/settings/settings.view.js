export function SettingsView() {
    return `
<style>
.settings-page {
    width: 100%;
    font-family: 'Inter', system-ui, sans-serif;
}
.settings-header {
    background-color: #0f172a;
    color: white;
    padding: 12px 16px;
    font-size: 20px;
    font-weight: 500;
}
.settings-list {
    display: flex;
    flex-direction: column;
}
.settings-item {
    display: flex;
    align-items: center;
    padding: 24px 16px;
    border-bottom: 1px solid #e2e8f0;
    background-color: #ffffff;
    cursor: pointer;
    text-decoration: none;
    transition: background-color 0.2s;
}
.settings-item:hover {
    background-color: #f8fafc;
}
.settings-icon {
    width: 24px;
    height: 24px;
    color: #2563eb;
    margin-right: 12px;
}
.settings-text {
    font-size: 22px;
    color: #2563eb;
    font-weight: 400;
}

:root[data-theme="dark"] .settings-item { background: var(--bg-surface); border-bottom-color: var(--border-color); }
:root[data-theme="dark"] .settings-item:hover { background: var(--bg-surface-alt); }
</style>

<div class="settings-page">
    <div class="settings-header">
        Settings
    </div>
    
    <div class="settings-list">
        <a href="#/dashboard" class="settings-item" id="btnDigitalSignature">
            <svg class="settings-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                <path d="M2,22 L10,22 L10,24 L2,24 L2,22 Z M18.5,12 C20.4329966,12 22,13.5670034 22,15.5 C22,17.4329966 20.4329966,19 18.5,19 C17.3826065,19 16.3860492,18.475476 15.7508608,17.6534575 L12.5960012,19.3496924 C12.8553258,19.7891784 13,20.3101569 13,20.85 C13,22.5896968 11.5896968,24 9.85,24 C8.11030324,24 6.7,22.5896968 6.7,20.85 C6.7,19.1103032 8.11030324,17.7 9.85,17.7 C10.4901358,17.7 11.0858062,17.8911048 11.5866164,18.2144365 L14.7358763,16.5204481 C14.5828472,16.2084654 14.5,15.8624131 14.5,15.5 C14.5,13.5670034 16.0670034,12 18.5,12 Z" fill="#2563eb"/>
            </svg>
            <span class="settings-text">Default Digital Signature</span>
        </a>
        
        <a href="#/dashboard" class="settings-item" id="btnManageLogin">
            <svg class="settings-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
            </svg>
            <span class="settings-text">Manage Login Credentials</span>
        </a>
        
        <a href="#/dashboard" class="settings-item" id="btnSelectTheme">
            <svg class="settings-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
            <span class="settings-text">Select Theme</span>
        </a>
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
