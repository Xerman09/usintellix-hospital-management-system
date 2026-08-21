export function DocumentsView()
{
    return `
<div class="docs-page">
    <div class="docs-topbar">
        <div>
            <h1>Documents</h1>
            <p>Files shared by your care team, and anything you've uploaded yourself</p>
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

    <div class="docs-body">
        <div class="docs-instructions">
            <h2>Instructions</h2>
            <p class="docs-instructions-welcome">Welcome<span id="docsWelcomeName"></span></p>

            <h3>Viewing Your Documents</h3>
            <ul>
                <li>Files your care team has shared with you appear in the table below.</li>
                <li>Click <strong>Download</strong> next to any file to open or save a copy.</li>
            </ul>

            <h3>Uploading Documents</h3>
            <ul>
                <li>Click <strong>Upload</strong> in the toolbar above.</li>
                <li>Choose a file, optionally set a category and description, then click <strong>Upload</strong> to add it to your Documents list.</li>
                <li>Accepted file types: PDF, JPG, PNG, GIF, WEBP, DOC, DOCX, XLS, XLSX &mdash; up to 10MB.</li>
            </ul>

            <h3>Staying Up To Date</h3>
            <ul>
                <li>Click <strong>Reload</strong> in the toolbar if you're expecting a new file and don't see it yet.</li>
            </ul>
        </div>

        <div class="table-wrap">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Uploaded By</th>
                        <th>Date</th>
                        <th>Size</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="docsTableBody">
                    <tr><td colspan="6" class="table-empty">Loading...</td></tr>
                </tbody>
            </table>
        </div>
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
