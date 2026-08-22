export function DocumentsView()
{
    return `
<div class="docs-page">
    <div class="docs-topbar">
        <div>
            <h1>Documents and Forms</h1>
            <p>Complete pending forms, sign documents, and manage your health records</p>
        </div>

        <div class="docs-toolbar">
            <button type="button" class="docs-tool-btn" id="docsReloadBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"></path><path d="M21 3v6h-6"></path></svg>
                Reload
            </button>
            <button type="button" class="docs-tool-btn" id="docsUploadBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5"></path><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"></path></svg>
                Upload
            </button>
            <button type="button" class="docs-tool-btn" id="docsExitBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><path d="M16 17l5-5-5-5"></path><path d="M21 12H9"></path></svg>
                Exit to Dashboard
            </button>
        </div>
    </div>

    <!-- The new toolbar (Left side of the OpenEMR screenshot) -->
    <div style="display: flex; gap: 8px; padding: 0 40px 16px; border-bottom: 1px solid #e2e8f0; margin-bottom: 24px;">
        <button type="button" class="btn-secondary" style="background: white; border-color: #cbd5e1; color: #475569; font-weight: 500;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px; margin-right: 6px;"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            Signature
        </button>
        <button type="button" class="btn-secondary" style="background: white; border-color: #cbd5e1; color: #475569; font-weight: 500;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px; margin-right: 6px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            Select Form
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 12px; height: 12px; margin-left: 6px;"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
        <button type="button" class="btn-secondary" style="background: white; border-color: #cbd5e1; color: #475569; font-weight: 500;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px; margin-right: 6px;"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            Activities
        </button>
    </div>

    <!-- The "Editing" bar - styled properly -->
    <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 12px 40px; margin-bottom: 32px; display: flex; align-items: center; gap: 8px;">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: #2563eb;"></div>
        <span style="font-weight: 600; color: #334155; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Editing Document</span>
    </div>

    <div class="docs-body">
        <div class="docs-instructions">
            <h2>Instructions for completing Pending Forms</h2>
            <p class="docs-instructions-welcome" style="margin-bottom: 24px;">Welcome<span id="docsWelcomeName"></span></p>

            <h3>Filling Out Forms</h3>
            <ul>
                <li>Select a form from the list on the left by clicking the appropriate button. After selection, the page will go to full page. To exit, click the Action menu horizontal barred button to toggle page mode.</li>
                <li>Answer all the appropriate queries in the form.</li>
                <li>When finished, click either the <strong>Save</strong> or <strong>Submit Document</strong> option in the top Action Menu. The 'Save' button will save the currently edited form to your Document History and will still be available for editing until you delete the form or send to your provider using the 'Submit Document' action button.</li>
            </ul>

            <h3>Sending Documents</h3>
            <ul>
                <li>Click the <strong>Submit Document</strong> button from the Action Menu.</li>
                <li>Once sent, the form will show in your Document History as <em>Pending review</em>. You may still make changes to the form until reviewed by the practice administrator. Once the review is completed, Document History will show the form as <em>Locked</em> and no further edits are available. At this point, your completed document is recorded in your chart (medical record).</li>
            </ul>
        </div>

        <div id="docsListContainer"></div>
    </div>
</div>

<div class="modal-overlay" id="docsUploadModalOverlay">
    <div class="modal-box" style="max-width: 480px;">
        <div class="modal-header">
            <h2>Upload Document</h2>
            <button type="button" class="modal-close" id="docsUploadModalClose">&times;</button>
        </div>

        <div id="docsUploadFormAlert"></div>

        <form id="docsUploadForm">
            <div class="form-grid">
                <div class="form-group full">
                    <label>File</label>
                    <input type="file" id="docsUpload_file" class="form-input" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx">
                </div>

                <div class="form-group full">
                    <label>Category</label>
                    <select id="docsUpload_category" class="form-input">
                        <option value="">-- Please Select --</option>
                        <option value="Lab Result">Lab Result</option>
                        <option value="Imaging">Imaging</option>
                        <option value="Insurance Card">Insurance Card</option>
                        <option value="Consent Form">Consent Form</option>
                        <option value="Referral">Referral</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <div class="form-group full">
                    <label>Description</label>
                    <textarea id="docsUpload_description" class="form-input" rows="3"></textarea>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="docsUploadCancelBtn">Cancel</button>
                <button class="login-btn" type="submit">Upload</button>
            </div>
        </form>
    </div>
</div>
`;
}
