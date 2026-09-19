/**
 * New Documents View (OpenEMR-Style)
 * Matching media_1789836578977.png & media_1789837146791.png:
 * - Header: Title "New Documents", Patient search selector, "0 New Document Uploads." blue badge button
 * - Left Panel: "Documents List" with hierarchical categories tree and document nodes
 * - Right Panel: "Document Uploader/Viewer"
 *   - Matches exact uploader layout from media_1789837146791.png with red notice, multi-file source path,
 *     directory slices zip, study name, drag-and-drop zone, and document template download bar.
 *   - Interactive Document Viewer when a file is selected from the tree.
 * Full Light & Dark mode support.
 */
export function NewDocumentsView() {
    return `
<style>
.nd-wrapper {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 125px);
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    color: var(--text-primary, #1e293b);
    background: #ffffff;
    overflow: hidden;
}

:root[data-theme="dark"] .nd-wrapper {
    background: #0f172a;
    color: #f1f5f9;
}

/* Top Header Bar */
.nd-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 20px;
    background: #ffffff;
    border-bottom: 1px solid #cbd5e1;
    gap: 16px;
    flex-shrink: 0;
}

:root[data-theme="dark"] .nd-topbar {
    background: #1e293b;
    border-bottom-color: #334155;
}

.nd-title {
    font-size: 26px;
    font-weight: 500;
    color: #0f172a;
    margin: 0;
    line-height: 1;
}

:root[data-theme="dark"] .nd-title {
    color: #f8fafc;
}

.nd-topbar-controls {
    display: flex;
    align-items: center;
    gap: 12px;
}

.nd-patient-label {
    font-size: 14px;
    font-weight: 500;
    color: #334155;
    white-space: nowrap;
}

:root[data-theme="dark"] .nd-patient-label {
    color: #cbd5e1;
}

.nd-patient-select {
    height: 34px;
    padding: 4px 10px;
    border: 1px solid #94a3b8;
    border-radius: 4px;
    font-size: 13.5px;
    color: #1e293b;
    background: #ffffff;
    min-width: 260px;
    outline: none;
}

:root[data-theme="dark"] .nd-patient-select {
    background: #0f172a;
    border-color: #475569;
    color: #f1f5f9;
}

.nd-uploads-badge-btn {
    background: #007bff;
    color: #ffffff;
    border: none;
    border-radius: 4px;
    padding: 7px 16px;
    font-size: 13.5px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s ease;
}

.nd-uploads-badge-btn:hover {
    background: #0069d9;
}

/* Two Column Layout */
.nd-body {
    display: flex;
    flex: 1;
    overflow: hidden;
}

/* Left Panel: Documents List */
.nd-left-panel {
    width: 320px;
    border-right: 1px solid #cbd5e1;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
}

:root[data-theme="dark"] .nd-left-panel {
    background: #1e293b;
    border-right-color: #334155;
}

/* Header Strip matching OpenEMR */
.nd-panel-header {
    background: #cbd5e1;
    color: #1e293b;
    font-size: 15px;
    font-weight: 500;
    padding: 6px 14px;
    border-bottom: 1px solid #94a3b8;
    display: flex;
    align-items: center;
    justify-content: space-between;
    user-select: none;
}

:root[data-theme="dark"] .nd-panel-header {
    background: #334155;
    color: #f1f5f9;
    border-bottom-color: #475569;
}

.nd-tree-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 10px 6px;
    font-size: 13.5px;
}

/* Tree Styling */
.nd-tree-node {
    margin-bottom: 2px;
}

.nd-tree-row {
    display: flex;
    align-items: center;
    padding: 3px 6px;
    border-radius: 3px;
    cursor: pointer;
    user-select: none;
    gap: 6px;
    transition: background 0.1s;
}

.nd-tree-row:hover {
    background: #f1f5f9;
}

:root[data-theme="dark"] .nd-tree-row:hover {
    background: #253347;
}

.nd-tree-row.active {
    background: #e0f2fe;
}

:root[data-theme="dark"] .nd-tree-row.active {
    background: #1e3a8a;
}

.nd-tree-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    font-size: 11px;
    font-weight: bold;
    color: #475569;
    cursor: pointer;
}

:root[data-theme="dark"] .nd-tree-toggle {
    color: #94a3b8;
}

.nd-tree-folder-icon {
    font-size: 14px;
    color: #0f172a;
}

:root[data-theme="dark"] .nd-tree-folder-icon {
    color: #cbd5e1;
}

.nd-tree-cat-name {
    color: #0284c7;
    font-style: italic;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

:root[data-theme="dark"] .nd-tree-cat-name {
    color: #38bdf8;
}

.nd-tree-badge {
    font-size: 11px;
    color: #64748b;
    font-style: normal;
}

:root[data-theme="dark"] .nd-tree-badge {
    color: #94a3b8;
}

.nd-tree-children {
    padding-left: 18px;
    border-left: 1px dotted #94a3b8;
    margin-left: 9px;
}

:root[data-theme="dark"] .nd-tree-children {
    border-left-color: #475569;
}

.nd-doc-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 6px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 13px;
    color: #334155;
    margin-bottom: 2px;
}

:root[data-theme="dark"] .nd-doc-item {
    color: #cbd5e1;
}

.nd-doc-item:hover {
    background: #f1f5f9;
}

:root[data-theme="dark"] .nd-doc-item:hover {
    background: #253347;
}

.nd-doc-item.active {
    background: #bae6fd;
    color: #0369a1;
    font-weight: 500;
}

:root[data-theme="dark"] .nd-doc-item.active {
    background: #1e3a8a;
    color: #f8fafc;
}

.nd-doc-icon {
    font-size: 13px;
    color: #64748b;
}

/* Right Panel: Document Uploader/Viewer */
.nd-right-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #ffffff;
}

:root[data-theme="dark"] .nd-right-panel {
    background: #0f172a;
}

.nd-viewer-body {
    flex: 1;
    overflow-y: auto;
    padding: 18px 24px;
}

/* OpenEMR Uploader Layout (Exact Match to media_1789837146791.png) */
.nd-emr-uploader-container {
    max-width: 100%;
    margin: 0 auto;
}

.nd-notice-red {
    color: #dc2626;
    font-size: 13px;
    font-weight: 500;
    line-height: 1.45;
    margin-bottom: 8px;
}

.nd-notice-black {
    color: #1e293b;
    font-size: 12.5px;
    line-height: 1.45;
    margin-bottom: 14px;
}

:root[data-theme="dark"] .nd-notice-black {
    color: #cbd5e1;
}

.nd-target-category-title {
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 3px 0;
}

:root[data-theme="dark"] .nd-target-category-title {
    color: #f8fafc;
}

.nd-target-category-subtitle {
    font-size: 12.5px;
    color: #475569;
    margin-bottom: 16px;
}

:root[data-theme="dark"] .nd-target-category-subtitle {
    color: #94a3b8;
}

.nd-source-label {
    font-size: 13.5px;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 4px;
    display: block;
}

:root[data-theme="dark"] .nd-source-label {
    color: #cbd5e1;
}

.nd-file-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
}

.nd-file-btn-wrapper {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
}

.nd-dicom-label {
    font-size: 12.5px;
    color: #1e293b;
    margin-bottom: 4px;
    display: block;
}

:root[data-theme="dark"] .nd-dicom-label {
    color: #cbd5e1;
}

.nd-dicom-input {
    width: 100%;
    height: 32px;
    padding: 4px 10px;
    border: 1px solid #94a3b8;
    border-radius: 2px;
    font-size: 13.5px;
    color: #1e293b;
    background: #ffffff;
    box-sizing: border-box;
    margin-bottom: 14px;
}

:root[data-theme="dark"] .nd-dicom-input {
    background: #0f172a;
    border-color: #475569;
    color: #f1f5f9;
}

.nd-upload-btn-blue {
    background: #007bff;
    color: #ffffff;
    border: none;
    border-radius: 4px;
    padding: 6px 20px;
    font-size: 13.5px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s ease;
}

.nd-upload-btn-blue:hover {
    background: #0069d9;
}

/* Large Drag-and-Drop Area */
.nd-emr-dropzone {
    width: 100%;
    min-height: 120px;
    border: 1px solid #94a3b8;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #475569;
    font-size: 14px;
    margin: 16px 0 20px 0;
    border-radius: 2px;
    cursor: pointer;
    box-sizing: border-box;
    transition: border-color 0.15s, background-color 0.15s;
}

:root[data-theme="dark"] .nd-emr-dropzone {
    background: #0f172a;
    border-color: #475569;
    color: #94a3b8;
}

.nd-emr-dropzone:hover {
    border-color: #007bff;
    background: #f8fafc;
}

:root[data-theme="dark"] .nd-emr-dropzone:hover {
    background: #1e293b;
}

/* Bottom Template Toolbar (Exact Match) */
.nd-emr-bottom-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 24px;
    flex-wrap: wrap;
    padding-top: 10px;
}

.nd-toolbar-group-left {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.nd-toolbar-group-right {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
}

.nd-toolbar-label {
    font-size: 13px;
    color: #1e293b;
}

:root[data-theme="dark"] .nd-toolbar-label {
    color: #cbd5e1;
}

.nd-fetch-row {
    display: flex;
    align-items: center;
    gap: 4px;
}

.nd-btn-fetch {
    background: #007bff;
    color: #ffffff;
    border: none;
    border-radius: 4px;
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.nd-btn-fetch:hover {
    background: #0069d9;
}

.nd-select-template {
    height: 32px;
    padding: 4px 10px;
    border: 1px solid #94a3b8;
    border-radius: 4px;
    font-size: 13px;
    color: #1e293b;
    background: #ffffff;
    min-width: 180px;
}

:root[data-theme="dark"] .nd-select-template {
    background: #0f172a;
    border-color: #475569;
    color: #f1f5f9;
}

.nd-btn-white-blue {
    background: #ffffff;
    color: #007bff;
    border: 1px solid #007bff;
    border-radius: 4px;
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.nd-btn-white-blue:hover {
    background: #f0f7ff;
}

:root[data-theme="dark"] .nd-btn-white-blue {
    background: #1e293b;
    color: #38bdf8;
    border-color: #38bdf8;
}

.nd-menu-item {
    padding: 7px 14px;
    font-size: 13px;
    cursor: pointer;
    color: #1e293b;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: background 0.15s ease;
}

.nd-menu-item:hover {
    background: #f1f5f9;
}

:root[data-theme="dark"] #ndTemplateMenuDropdown {
    background: #1e293b !important;
    border-color: #475569 !important;
}

:root[data-theme="dark"] .nd-menu-item {
    color: #f1f5f9 !important;
}

:root[data-theme="dark"] .nd-menu-item:hover {
    background: #334155 !important;
}

/* Document Viewer Styles */
.nd-view-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 14px;
    border-bottom: 1px solid #e2e8f0;
    margin-bottom: 16px;
    gap: 12px;
    flex-wrap: wrap;
}

:root[data-theme="dark"] .nd-view-toolbar {
    border-bottom-color: #334155;
}

.nd-view-meta h2 {
    font-size: 18px;
    margin: 0 0 6px 0;
    color: #0f172a;
}

:root[data-theme="dark"] .nd-view-meta h2 {
    color: #f8fafc;
}

.nd-view-meta-sub {
    font-size: 12.5px;
    color: #64748b;
    display: flex;
    align-items: center;
    gap: 14px;
}

:root[data-theme="dark"] .nd-view-meta-sub {
    color: #94a3b8;
}

.nd-view-actions {
    display: flex;
    gap: 8px;
}

.nd-btn-action {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    color: #334155;
    padding: 6px 14px;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;
    text-decoration: none;
}

.nd-btn-action:hover {
    background: #f1f5f9;
}

:root[data-theme="dark"] .nd-btn-action {
    background: #1e293b;
    border-color: #475569;
    color: #e2e8f0;
}

:root[data-theme="dark"] .nd-btn-action:hover {
    background: #334155;
}

.nd-btn-danger {
    color: #dc2626 !important;
    border-color: #fca5a5 !important;
}

.nd-btn-danger:hover {
    background: #fee2e2 !important;
}

:root[data-theme="dark"] .nd-btn-danger:hover {
    background: rgba(220, 38, 38, 0.2) !important;
}

.nd-preview-box {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    overflow: hidden;
    min-height: 550px;
    display: flex;
    align-items: center;
    justify-content: center;
}

:root[data-theme="dark"] .nd-preview-box {
    background: #0f172a;
    border-color: #334155;
}

/* Modal */
.nd-modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
}

.nd-modal-card {
    background: #ffffff;
    border-radius: 6px;
    padding: 24px;
    width: 480px;
    max-width: 90vw;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
}

:root[data-theme="dark"] .nd-modal-card {
    background: #1e293b;
    color: #f1f5f9;
}
</style>

<div class="nd-wrapper">
    <!-- Top Bar matching OpenEMR screenshot -->
    <div class="nd-topbar">
        <h1 class="nd-title">New Documents</h1>
        <div class="nd-topbar-controls">
            <label class="nd-patient-label" for="ndPatientSelect">Search and Select Patient</label>
            <select class="nd-patient-select" id="ndPatientSelect">
                <option value="unassigned" selected>New Document Uploads.</option>
                <option value="all">-- All Patients / Clinic Records --</option>
            </select>
            <button type="button" class="nd-uploads-badge-btn" id="ndUnassignedBtn">
                <span id="ndUnassignedBadgeCount">0</span> New Document Uploads.
            </button>
        </div>
    </div>

    <!-- Main Body: Two Columns -->
    <div class="nd-body">
        <!-- Left Panel: Documents List -->
        <div class="nd-left-panel">
            <div class="nd-panel-header">
                <span>Documents List</span>
                <div style="display: flex; gap: 8px;">
                    <button type="button" id="ndNewUploadTriggerBtn" title="Upload Document" style="background: transparent; border: none; cursor: pointer; color: inherit; font-size: 12.5px; display: flex; align-items: center; gap: 4px;">
                        <i class="fas fa-plus"></i> Upload
                    </button>
                </div>
            </div>
            <div class="nd-tree-scroll" id="ndTreeContainer">
                <div style="padding: 20px; text-align: center; color: #94a3b8;">
                    Loading categories...
                </div>
            </div>
        </div>

        <!-- Right Panel: Document Uploader/Viewer -->
        <div class="nd-right-panel">
            <div class="nd-panel-header">
                <span>Document Uploader/Viewer</span>
            </div>
            <div class="nd-viewer-body" id="ndViewerContainer">
                <!-- Dynamically populated by new-documents.js -->
            </div>
        </div>
    </div>
</div>
`;
}
