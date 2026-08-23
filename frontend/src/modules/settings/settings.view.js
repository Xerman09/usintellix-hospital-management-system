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
    `;
}
