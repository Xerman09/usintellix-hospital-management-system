export function DocumentCategoriesView()
{
    return `
<style>
.dc-page {
    width: 100%;
    font-size: 13.5px;
}

.dc-page h1 {
    margin: 0 0 12px;
    font-size: 24px;
    font-weight: 400;
    color: #1a2338;
}

.dc-section-label {
    margin: 0 0 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #1a2338;
    font-size: 15px;
    color: #29323f;
}

.dc-layout {
    display: flex;
    gap: 32px;
    align-items: flex-start;
}

.dc-tree-col {
    flex: 1;
    min-width: 0;
}

.dc-form-col {
    flex: 1;
    min-width: 0;
    padding-top: 2px;
}

.dc-tree ul {
    list-style: none;
    margin: 0;
    padding-left: 18px;
    border-left: 1px dotted #cbd5e1;
}

.dc-tree > ul {
    padding-left: 0;
    border-left: none;
}

.dc-node {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 3px 0;
    white-space: nowrap;
}

.dc-toggle {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #94a3b8;
    background: white;
    color: #475569;
    font-size: 10px;
    line-height: 1;
    cursor: pointer;
    border-radius: 2px;
}

.dc-toggle-spacer {
    width: 14px;
    flex-shrink: 0;
}

.dc-folder-icon {
    width: 15px;
    height: 15px;
    flex-shrink: 0;
    color: #1a2338;
}

.dc-name-link {
    background: none;
    border: none;
    padding: 0;
    color: #1d4ed8;
    font-style: italic;
    font-size: 13.5px;
    cursor: pointer;
    text-decoration: none;
}

.dc-name-link:hover {
    text-decoration: underline;
}

.dc-node-action {
    background: none;
    border: none;
    padding: 0;
    font-style: italic;
    font-size: 12.5px;
    cursor: pointer;
    margin-left: 4px;
}

.dc-node-action.edit {
    color: #64748b;
}

.dc-node-action.delete {
    color: #dc2626;
}

.dc-form-intro {
    margin: 0 0 16px;
    color: #29323f;
    font-size: 14px;
}

.dc-form-intro strong {
    font-weight: 700;
}

.dc-form-row {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 14px;
}

.dc-form-row label {
    width: 130px;
    flex-shrink: 0;
    font-weight: 600;
    color: #29323f;
}

.dc-form-row .form-input,
.dc-form-row select.form-input {
    flex: 1;
    max-width: 340px;
}

.dc-save-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 36px;
    padding: 0 18px;
    border: 1px solid #cfd4dc;
    border-radius: 6px;
    background: #eef1f5;
    color: #1c2534;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    margin-top: 4px;
}

.dc-save-btn:hover {
    background: #e2e7ee;
}

.dc-save-btn.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: white;
}

.dc-save-btn.primary:hover {
    background: #1742b0;
}

.dc-form-empty {
    color: #94a3b8;
    font-style: italic;
}

.dc-form-actions {
    display: flex;
    gap: 10px;
    align-items: center;
}
</style>

<div class="dc-page">
    <h1>Documents</h1>
    <p class="dc-section-label">Document Categories</p>

    <div id="dcFormAlert"></div>

    <div class="dc-layout">
        <div class="dc-tree-col">
            <div class="dc-tree" id="dcTree">Loading...</div>
        </div>
        <div class="dc-form-col" id="dcFormCol">
            <p class="dc-form-empty">Click a category name to add a sub-category, or (Edit) to change it.</p>
        </div>
    </div>
</div>
`;
}
