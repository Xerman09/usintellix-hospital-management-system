/**
 * Reusable "import from CSV" modal: download template -> upload (drag &
 * drop) -> review with per-row problems -> import -> results with a
 * downloadable file of skipped rows.
 *
 * Usage:
 *   const importer = createCsvImport({ mount, id, title, ... });
 *   importer.open();               // show the modal
 *   importer.downloadTemplate();   // e.g. from a toolbar button
 *
 * The page supplies the parts that differ per entity: columns, an example
 * row, a column guide, client-side row checks, which columns to preview,
 * and the request that does the import.
 */

const BOM = String.fromCharCode(0xFEFF);
const STYLE_ID = "csv-import-styles";

const ICON_UPLOAD = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><polyline points="9 15 12 12 15 15"></polyline></svg>`;
const ICON_FILE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`;
const ICON_DOWNLOAD = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
const ICON_OK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
const ICON_SKIP = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

/**
 * @param {object} config
 * @param {HTMLElement} config.mount        element the modal is appended to (the page root)
 * @param {string} config.id                unique prefix for element ids
 * @param {string} config.title             e.g. "Import Suppliers"
 * @param {string} config.lead              one-line description under the title
 * @param {string} config.intro             step 1 text
 * @param {{one: string, many: string}} config.noun   e.g. {one: "supplier", many: "suppliers"}
 * @param {string} config.templateName      download file name
 * @param {string[]} config.columns         header row of the template
 * @param {string[]} config.example         example row
 * @param {string} config.requiredColumn    a column that must exist in the header
 * @param {() => Array<[string, string]>} config.guide   [label, html] rows for the column guide
 * @param {(rows: object[]) => void} config.validate      sets row.errors (array) on each row
 * @param {Array<{label: string, value: (data: object) => string}>} config.preview
 * @param {(data: object[]) => Promise<object>} config.submit  resolves to the api() result
 * @param {(created: number) => any} [config.onImported]
 * @param {number} [config.maxRows=1000]
 */
export function createCsvImport(config) {
    injectStyles();

    const p = config.id;
    const maxRows = config.maxRows ?? 1000;
    const $ = (suffix) => document.getElementById(`${p}${suffix}`);

    let file = null;
    let skipped = [];

    config.mount.insertAdjacentHTML("beforeend", markup(config));

    const overlay = $("Overlay");
    const close = () => overlay.classList.remove("open");

    $("Close").addEventListener("click", close);
    $("Cancel").addEventListener("click", close);
    overlay.addEventListener("click", (event) => { if (event.target === overlay) close(); });
    $("Template").addEventListener("click", downloadTemplate);
    $("File").addEventListener("change", () => { if ($("File").files[0]) load($("File").files[0]); });
    $("Remove").addEventListener("click", reset);
    $("ProblemsOnly").addEventListener("change", renderPreview);
    $("Run").addEventListener("click", run);

    const dropzone = $("Dropzone");
    ["dragenter", "dragover"].forEach((type) => dropzone.addEventListener(type, (event) => {
        event.preventDefault();
        dropzone.classList.add("is-dragover");
    }));
    ["dragleave", "drop"].forEach((type) => dropzone.addEventListener(type, (event) => {
        event.preventDefault();
        dropzone.classList.remove("is-dragover");
    }));
    dropzone.addEventListener("drop", (event) => {
        const dropped = event.dataTransfer?.files?.[0];
        if (dropped) load(dropped);
    });

    function open() {
        reset();
        $("Guide").innerHTML = config.guide()
            .map(([label, html]) => `<div class="ci-ref-row"><span>${label}</span><div>${html}</div></div>`)
            .join("");
        overlay.classList.add("open");
    }

    function reset() {
        file = null;
        skipped = [];
        $("File").value = "";
        $("Alert").innerHTML = "";
        $("Dropzone").hidden = false;
        $("Chip").hidden = true;
        $("Review").hidden = true;
        $("ProblemsOnly").checked = false;
        $("Steps").hidden = false;
        $("Result").hidden = true;
        $("Result").innerHTML = "";
        $("Footnote").textContent = "Rows with problems are skipped; the rest are imported.";
        $("Cancel").textContent = "Cancel";
        $("Run").hidden = false;
        $("Run").disabled = true;
        $("Run").textContent = "Import";
    }

    function alert(message) {
        $("Alert").innerHTML = `<div class="form-alert error">${escapeHtml(message)}</div>`;
    }

    async function load(selected) {
        $("Alert").innerHTML = "";

        if (!/\.csv$/i.test(selected.name)) {
            alert("Please choose a .csv file. In Excel, use File > Save As > CSV UTF-8.");
            return;
        }

        let text = await selected.text();
        if (text.startsWith(BOM)) text = text.slice(1);

        const parsed = parseCsv(text);
        const header = (parsed[0] || []).map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));

        if (!header.includes(config.requiredColumn)) {
            alert(`This file has no ${config.requiredColumn} column. Start from the template so the headers match.`);
            return;
        }

        const rows = parsed.slice(1)
            .map((cells, i) => ({ line: i + 2, cells }))
            .filter((r) => r.cells.some((c) => c.trim() !== ""));

        if (!rows.length) {
            alert(`The file has a header row but no ${config.noun.many} under it.`);
            return;
        }

        if (rows.length > maxRows) {
            alert(`This file has ${rows.length.toLocaleString()} rows. Split it into files of ${maxRows.toLocaleString()} rows or fewer.`);
            return;
        }

        rows.forEach((row) => {
            row.data = Object.fromEntries(header.map((key, i) => [key, (row.cells[i] ?? "").trim()]));
            row.errors = [];
        });

        config.validate(rows);

        file = { name: selected.name, header, rows };

        $("Dropzone").hidden = true;
        $("Chip").hidden = false;
        $("FileName").textContent = selected.name;
        $("FileInfo").textContent = `${formatFileSize(selected.size)} · ${rows.length} ${rows.length === 1 ? "row" : "rows"}`;
        $("Review").hidden = false;

        const unknown = header.filter((h) => h && !config.columns.includes(h));
        $("Note").textContent = unknown.length
            ? `These columns aren't recognised and will be ignored: ${unknown.join(", ")}.`
            : "";

        renderPreview();
    }

    function renderPreview() {
        const rows = file?.rows || [];
        const bad = rows.filter((r) => r.errors.length);
        const good = rows.length - bad.length;
        const shown = $("ProblemsOnly").checked ? bad : rows;
        const { one, many } = config.noun;

        $("Stats").innerHTML = `
            <span class="ci-stat"><strong>${rows.length}</strong> rows</span>
            <span class="ci-stat ok"><strong>${good}</strong> ready</span>
            ${bad.length ? `<span class="ci-stat bad"><strong>${bad.length}</strong> need attention</span>` : ""}
        `;

        $("ProblemsOnly").parentElement.style.display = bad.length ? "" : "none";

        $("PreviewBody").innerHTML = shown.length ? shown.map((r) => `
            <tr class="${r.errors.length ? "has-issue" : ""}">
                <td>${r.line}</td>
                ${config.preview.map((col) => `<td>${escapeHtml(col.value(r.data) || "—")}</td>`).join("")}
                <td>${r.errors.length
                    ? `<span class="ci-status-bad">${escapeHtml(r.errors.join(" "))}</span>`
                    : `<span class="ci-status-ok">Ready</span>`}</td>
            </tr>
        `).join("") : `<tr><td colspan="${config.preview.length + 2}" class="ci-empty">No rows to show.</td></tr>`;

        $("Run").disabled = good === 0;
        $("Run").textContent = good ? `Import ${good} ${good === 1 ? one : many}` : "Nothing to import";
        $("Footnote").textContent = bad.length
            ? `${bad.length} ${bad.length === 1 ? "row" : "rows"} with problems will be skipped.`
            : "All rows look good.";
    }

    async function run() {
        const ready = file.rows.filter((r) => !r.errors.length);

        $("Run").disabled = true;
        $("Run").innerHTML = `<span class="ci-spinner" aria-hidden="true"></span>Importing...`;
        $("Alert").innerHTML = "";

        const result = await config.submit(ready.map((r) => r.data));

        if (!result.success) {
            renderPreview();
            alert(result.message || "Import failed. Nothing was saved.");
            return;
        }

        // The server numbers failures by position in what was sent (+2 for
        // the header); map them back to lines in the user's own file.
        const serverFailed = (result.data?.failed || []).map((f) => ({ ...ready[f.row - 2], errors: f.errors }));

        skipped = [...file.rows.filter((r) => r.errors.length), ...serverFailed].sort((a, b) => a.line - b.line);

        renderResult(result.data?.created || 0);

        if (result.data?.created > 0) await config.onImported?.(result.data.created);
    }

    function renderResult(created) {
        const { one, many } = config.noun;
        const first = config.preview[0];

        $("Steps").hidden = true;
        $("Result").hidden = false;
        $("Result").innerHTML = `
            <div class="ci-result-head">
                <div class="ci-result-card ok">${ICON_OK}<div><strong>${created}</strong><span>${created === 1 ? one : many} imported</span></div></div>
                ${skipped.length ? `<div class="ci-result-card bad">${ICON_SKIP}<div><strong>${skipped.length}</strong><span>${skipped.length === 1 ? "row" : "rows"} skipped</span></div></div>` : ""}
            </div>
            ${skipped.length ? `
                <div class="ci-result-sub">
                    <h3>Skipped rows</h3>
                    <button type="button" class="ci-btn" id="${p}DownloadSkipped">${ICON_DOWNLOAD} Download skipped rows to fix</button>
                </div>
                <div class="ci-preview-wrap">
                    <table class="ci-preview-table">
                        <thead><tr><th>Line</th><th>${escapeHtml(first.label)}</th><th>Reason</th></tr></thead>
                        <tbody>${skipped.map((r) => `
                            <tr class="has-issue">
                                <td>${r.line}</td>
                                <td>${escapeHtml(first.value(r.data) || "—")}</td>
                                <td><span class="ci-status-bad">${escapeHtml(r.errors.join(" "))}</span></td>
                            </tr>`).join("")}
                        </tbody>
                    </table>
                </div>` : ""}
        `;

        $("DownloadSkipped")?.addEventListener("click", () => {
            const header = [...file.header, "import_error"];
            const lines = skipped.map((r) => [...file.header.map((_, i) => r.cells[i] ?? ""), r.errors.join(" ")]);
            saveCsv([header, ...lines], `${file.name.replace(/\.csv$/i, "")}-skipped.csv`);
        });

        $("Run").hidden = true;
        $("Cancel").textContent = "Done";
        $("Footnote").innerHTML = skipped.length
            ? `Fix the skipped rows, then <a href="#" id="${p}Again">import that file</a>.`
            : `<a href="#" id="${p}Again">Import another file</a>`;

        $("Again").addEventListener("click", (event) => {
            event.preventDefault();
            reset();
        });
    }

    function downloadTemplate() {
        saveCsv([config.columns, config.example], config.templateName);
    }

    return { open, downloadTemplate };
}

/* ---------------------------------------------------------------
 * CSV helpers (also exported for pages that need them directly)
 * ------------------------------------------------------------- */

export function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];

        if (inQuotes) {
            if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
            else if (ch === '"') inQuotes = false;
            else cell += ch;
        } else if (ch === '"') {
            inQuotes = true;
        } else if (ch === ",") {
            row.push(cell); cell = "";
        } else if (ch === "\n" || ch === "\r") {
            if (ch === "\r" && text[i + 1] === "\n") i++;
            row.push(cell); rows.push(row); row = []; cell = "";
        } else {
            cell += ch;
        }
    }

    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }

    return rows;
}

export function saveCsv(rows, filename) {
    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
    // The BOM makes Excel open the file as UTF-8 (accents, peso and degree signs).
    const url = URL.createObjectURL(new Blob([BOM + csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvEscape(value) {
    const s = String(value ?? "");
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function escapeHtml(value) {
    if (value == null) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function markup(c) {
    const p = c.id;

    return `
<div class="modal-overlay" id="${p}Overlay">
    <div class="modal-box ci-modal">
        <div class="modal-header">
            <div>
                <h2>${escapeHtml(c.title)}</h2>
                <p class="ci-lead">${escapeHtml(c.lead)}</p>
            </div>
            <button type="button" class="modal-close" id="${p}Close" aria-label="Close">&times;</button>
        </div>

        <div id="${p}Alert"></div>

        <div id="${p}Steps">
            <section class="ci-step">
                <div class="ci-step-num">1</div>
                <div class="ci-step-body">
                    <h3>Get the template</h3>
                    <p>${escapeHtml(c.intro)}</p>
                    <div class="ci-step-actions">
                        <button type="button" class="ci-btn" id="${p}Template">${ICON_DOWNLOAD} Download template</button>
                    </div>
                    <details class="ci-ref">
                        <summary>Column guide &amp; allowed values</summary>
                        <div class="ci-ref-body" id="${p}Guide"></div>
                    </details>
                </div>
            </section>

            <section class="ci-step">
                <div class="ci-step-num">2</div>
                <div class="ci-step-body">
                    <h3>Upload your file</h3>
                    <label class="ci-dropzone" id="${p}Dropzone" for="${p}File">
                        <input type="file" id="${p}File" accept=".csv,text/csv">
                        ${ICON_UPLOAD}
                        <span class="ci-dropzone-title"><strong>Drag &amp; drop</strong> your CSV here, or <u>browse</u></span>
                        <span class="ci-dropzone-hint">.csv only &middot; up to ${(c.maxRows ?? 1000).toLocaleString()} rows</span>
                    </label>
                    <div class="ci-file-chip" id="${p}Chip" hidden>
                        ${ICON_FILE}
                        <div class="ci-file-meta"><strong id="${p}FileName"></strong><span id="${p}FileInfo"></span></div>
                        <button type="button" class="ci-file-remove" id="${p}Remove">Remove</button>
                    </div>
                </div>
            </section>

            <section class="ci-step" id="${p}Review" hidden>
                <div class="ci-step-num">3</div>
                <div class="ci-step-body">
                    <h3>Review</h3>
                    <div class="ci-review-stats" id="${p}Stats"></div>
                    <div class="ci-review-note" id="${p}Note"></div>
                    <label class="ci-check"><input type="checkbox" id="${p}ProblemsOnly"> Show only rows that need attention</label>
                    <div class="ci-preview-wrap">
                        <table class="ci-preview-table">
                            <thead><tr><th>Line</th>${c.preview.map((col) => `<th>${escapeHtml(col.label)}</th>`).join("")}<th>Status</th></tr></thead>
                            <tbody id="${p}PreviewBody"></tbody>
                        </table>
                    </div>
                </div>
            </section>
        </div>

        <div id="${p}Result" hidden></div>

        <div class="ci-footer">
            <span class="ci-footnote" id="${p}Footnote"></span>
            <div class="ci-buttons">
                <button type="button" class="ci-btn" id="${p}Cancel">Cancel</button>
                <button type="button" class="ci-btn primary" id="${p}Run" disabled>Import</button>
            </div>
        </div>
    </div>
</div>`;
}

function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
.ci-modal { max-width: 860px; }
.ci-modal .modal-header { align-items: flex-start; margin-bottom: 14px; }
.ci-modal .modal-header h2 { margin: 0; }
.ci-lead { margin: 4px 0 0; color: var(--text-muted); font-size: 13.5px; }

.ci-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    height: 34px; padding: 0 14px; border-radius: 6px;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary);
    font-weight: 600; font-size: 12.5px; cursor: pointer;
}
.ci-btn:hover { background: var(--bg-surface-alt); }
.ci-btn.primary { border-color: var(--accent); background: var(--accent); color: #fff; }
.ci-btn.primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
.ci-btn:disabled { opacity: .5; cursor: not-allowed; }
.ci-btn.primary:disabled:hover { background: var(--accent); border-color: var(--accent); }

.ci-step { display: flex; gap: 14px; padding: 16px 0; border-top: 1px solid var(--border-color); }
.ci-step:first-child { border-top: none; padding-top: 4px; }
.ci-step[hidden], .ci-dropzone[hidden], .ci-file-chip[hidden] { display: none; }
.ci-step-num {
    flex: 0 0 28px; height: 28px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 700;
    color: var(--accent-text, var(--accent)); background: var(--accent-light); border: 1px solid var(--accent-border, transparent);
}
.ci-step-body { flex: 1 1 auto; min-width: 0; }
.ci-step-body h3 { margin: 3px 0 4px; font-size: 14.5px; color: var(--text-primary); }
.ci-step-body > p { margin: 0 0 10px; font-size: 13px; color: var(--text-muted); line-height: 1.5; }
.ci-step-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }

.ci-ref summary { cursor: pointer; font-size: 12.5px; font-weight: 600; color: var(--accent-text, var(--accent)); }
.ci-ref-body {
    margin-top: 10px; padding: 12px 14px; border-radius: 8px; max-height: 260px; overflow-y: auto;
    background: var(--bg-surface-alt); border: 1px solid var(--border-color); font-size: 12.5px; color: var(--text-primary);
}
.ci-ref-row { display: grid; grid-template-columns: 150px 1fr; gap: 10px; padding: 6px 0; border-top: 1px dashed var(--border-color); }
.ci-ref-row:first-child { border-top: none; padding-top: 0; }
.ci-ref-row > span { font-weight: 600; color: var(--text-muted); }
.ci-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.ci-chips code {
    padding: 1px 7px; border-radius: 999px; border: 1px solid var(--border-color);
    background: var(--bg-surface); font-family: inherit; font-size: 11.5px; color: var(--text-primary);
}

.ci-dropzone {
    position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
    padding: 22px 16px; border: 2px dashed var(--border-color); border-radius: 10px;
    background: var(--bg-surface-alt); text-align: center; cursor: pointer; transition: border-color .15s, background-color .15s;
}
.ci-dropzone:hover, .ci-dropzone.is-dragover { border-color: var(--accent); background: var(--accent-light); }
.ci-dropzone input[type="file"] { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.ci-dropzone:focus-within { outline: 2px solid var(--accent); outline-offset: 2px; }
.ci-dropzone svg { width: 30px; height: 30px; color: var(--text-muted); margin-bottom: 4px; }
.ci-dropzone-title { font-size: 13.5px; color: var(--text-primary); }
.ci-dropzone-title u { color: var(--accent-text, var(--accent)); text-underline-offset: 2px; }
.ci-dropzone-hint { font-size: 12px; color: var(--text-muted); }

.ci-file-chip { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface-alt); }
.ci-file-chip > svg { width: 22px; height: 22px; flex-shrink: 0; color: var(--accent-text, var(--accent)); }
.ci-file-meta { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
.ci-file-meta strong { font-size: 13px; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ci-file-meta span { font-size: 12px; color: var(--text-muted); }
.ci-file-remove { border: none; background: none; color: var(--text-muted); font-size: 12.5px; font-weight: 600; cursor: pointer; padding: 4px 6px; border-radius: 6px; }
.ci-file-remove:hover { color: #b91c1c; background: #fee2e2; }
:root[data-theme="dark"] .ci-file-remove:hover { color: #fecaca; background: rgba(239,68,68,.15); }

.ci-review-stats { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
.ci-stat { display: inline-flex; align-items: baseline; gap: 6px; padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-surface-alt); font-size: 12.5px; color: var(--text-muted); }
.ci-stat strong { font-size: 15px; color: var(--text-primary); }
.ci-stat.ok strong { color: #15803d; }
.ci-stat.bad strong { color: #b91c1c; }
:root[data-theme="dark"] .ci-stat.ok strong { color: #86efac; }
:root[data-theme="dark"] .ci-stat.bad strong { color: #fca5a5; }
.ci-review-note { font-size: 12.5px; color: var(--text-muted); margin-bottom: 8px; }
.ci-review-note:empty { display: none; }
.ci-check { display: inline-flex; align-items: center; gap: 5px; margin-bottom: 8px; font-size: 12.5px; color: var(--text-primary); }

.ci-preview-wrap { max-height: 260px; overflow: auto; border: 1px solid var(--border-color); border-radius: 8px; }
.ci-preview-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.ci-preview-table th {
    position: sticky; top: 0; text-align: left; padding: 7px 10px; background: var(--bg-surface-alt); color: var(--text-muted);
    font-size: 10.5px; text-transform: uppercase; letter-spacing: .3px; border-bottom: 1px solid var(--border-color);
}
.ci-preview-table td { padding: 7px 10px; border-bottom: 1px solid var(--border-color); color: var(--text-primary); vertical-align: top; }
.ci-preview-table tbody tr:last-child td { border-bottom: none; }
.ci-preview-table td:first-child { color: var(--text-muted); width: 48px; }
.ci-preview-table tr.has-issue td { background: rgba(239,68,68,.05); }
.ci-status-ok { color: #15803d; font-weight: 600; white-space: nowrap; }
.ci-status-bad { color: #b91c1c; }
:root[data-theme="dark"] .ci-status-ok { color: #86efac; }
:root[data-theme="dark"] .ci-status-bad { color: #fca5a5; }
.ci-empty { padding: 20px; text-align: center; color: var(--text-muted); font-style: italic; }

.ci-result-head { display: flex; gap: 12px; flex-wrap: wrap; margin: 4px 0 14px; }
.ci-result-card { flex: 1 1 200px; display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--bg-surface-alt); }
.ci-result-card svg { width: 26px; height: 26px; flex-shrink: 0; }
.ci-result-card strong { display: block; font-size: 20px; line-height: 1.1; color: var(--text-primary); }
.ci-result-card span { font-size: 12.5px; color: var(--text-muted); }
.ci-result-card.ok svg { color: #16a34a; }
.ci-result-card.bad svg { color: #dc2626; }
:root[data-theme="dark"] .ci-result-card.ok svg { color: #86efac; }
:root[data-theme="dark"] .ci-result-card.bad svg { color: #fca5a5; }
.ci-result-sub { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
.ci-result-sub h3 { margin: 0; font-size: 14px; color: var(--text-primary); }

.ci-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-top: 6px; padding-top: 14px; border-top: 1px solid var(--border-color); }
.ci-footnote { font-size: 12px; color: var(--text-muted); }
.ci-buttons { display: flex; gap: 8px; margin-left: auto; }
.ci-buttons .ci-btn { height: 38px; padding: 0 18px; font-size: 13px; }
.ci-spinner { width: 13px; height: 13px; border: 2px solid rgba(255,255,255,.45); border-top-color: #fff; border-radius: 50%; animation: ci-spin .7s linear infinite; }
@keyframes ci-spin { to { transform: rotate(360deg); } }

@media (max-width: 640px) {
    .ci-ref-row { grid-template-columns: 1fr; gap: 4px; }
    .ci-buttons { width: 100%; }
    .ci-buttons .ci-btn { flex: 1 1 0; }
}
`;
    document.head.appendChild(style);
}
