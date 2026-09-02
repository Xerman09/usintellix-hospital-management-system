export function DocumentTemplatesView()
{
    return `
<style>
.dtm-page {
    width: 100%;
    font-size: 13.5px;
}

.dtm-page h1 {
    margin: 0 0 24px;
    font-size: 28px;
    font-weight: 400;
    color: #1a2338;
    text-align: center;
}

.dtm-panels {
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
}

.dtm-panel {
    flex: 1;
    min-width: 320px;
    max-width: 480px;
    background: white;
    border: 1px solid #d7dee8;
    border-radius: 8px;
    overflow: hidden;
}

.dtm-panel h2 {
    margin: 0;
    padding: 12px 18px;
    background: #f4f6fa;
    border-bottom: 1px solid #d7dee8;
    font-size: 15px;
    font-weight: 600;
    color: #1a2338;
}

.dtm-panel-body {
    padding: 20px 18px;
}

.dtm-field-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
}

.dtm-field-row:last-child {
    margin-bottom: 0;
}

.dtm-field-row label {
    flex-shrink: 0;
    font-size: 13px;
    color: #34435c;
}

.dtm-file-input {
    flex: 1;
    min-width: 0;
    height: 34px;
    padding: 0 8px;
    border-radius: 5px;
    border: 1px solid #cfd4dc;
    font-size: 12.5px;
}

.dtm-text-input, .dtm-select {
    flex: 1;
    min-width: 0;
    height: 34px;
    padding: 0 10px;
    border-radius: 5px;
    border: 1px solid #cfd4dc;
    font-size: 13px;
}

.dtm-select {
    background: white;
}

.dtm-btn {
    height: 34px;
    padding: 0 18px;
    border: none;
    border-radius: 5px;
    color: white;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    flex-shrink: 0;
}

.dtm-btn:disabled {
    opacity: .6;
    cursor: not-allowed;
}

.dtm-btn-upload {
    background: var(--accent);
}

.dtm-btn-upload:hover {
    background: #1742b0;
}

.dtm-actions-row {
    display: flex;
    gap: 10px;
    margin-top: 14px;
}

.dtm-btn-download {
    background: #1a8f4c;
}

.dtm-btn-download:hover {
    background: #157a3f;
}

.dtm-btn-delete {
    background: #d9455f;
}

.dtm-btn-delete:hover {
    background: #c1364e;
}

.dtm-select-full {
    width: 100%;
    margin-bottom: 4px;
}

.dtm-meta {
    font-size: 12px;
    color: #71809b;
    margin: 6px 0 0;
}

.dtm-alert {
    margin-top: 4px;
}
</style>

<div class="dtm-page">
    <h1>Document Template Management</h1>

    <div class="dtm-panels">
        <div class="dtm-panel">
            <h2>Upload a Template</h2>
            <div class="dtm-panel-body">
                <div class="dtm-field-row">
                    <input type="file" id="dtmFile" class="dtm-file-input">
                </div>
                <div class="dtm-field-row">
                    <label for="dtmDestination">Destination Filename:</label>
                    <input type="text" id="dtmDestination" class="dtm-text-input" placeholder="e.g. referral_letter.html">
                    <button type="button" class="dtm-btn dtm-btn-upload" id="dtmUploadBtn">Upload</button>
                </div>
                <p class="dtm-meta">Allowed: HTML, RTF, DOC, DOCX, ODT, TXT, PDF, CSV. Uploading to an existing filename replaces it.</p>
                <div class="dtm-alert" id="dtmUploadAlert"></div>
            </div>
        </div>

        <div class="dtm-panel">
            <h2>Download or Delete a Template</h2>
            <div class="dtm-panel-body">
                <select id="dtmSelect" class="dtm-select dtm-select-full">
                    <option value="">Loading...</option>
                </select>
                <div class="dtm-actions-row">
                    <button type="button" class="dtm-btn dtm-btn-download" id="dtmDownloadBtn">Download</button>
                    <button type="button" class="dtm-btn dtm-btn-delete" id="dtmDeleteBtn">Delete</button>
                </div>
                <div class="dtm-alert" id="dtmManageAlert"></div>
            </div>
        </div>
    </div>
</div>
`;
}
