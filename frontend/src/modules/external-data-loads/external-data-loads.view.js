const SECTIONS = ["ICD10", "RXNORM", "SNOMED", "CQM_VALUESET"];

export function ExternalDataLoadsView()
{
    return `
<style>
.edl-page {
    width: 100%;
    font-size: 13.5px;
}

.edl-page h1 {
    margin: 0 0 16px;
    font-size: 24px;
    font-weight: 400;
    color: #1a2338;
}

.edl-accordion {
    border: 1px solid #d7dee8;
    border-radius: 6px;
    overflow: hidden;
}

.edl-section + .edl-section {
    border-top: 1px solid #d7dee8;
}

.edl-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: #f8fafc;
    color: #1e4fd8;
    font-weight: 600;
    cursor: pointer;
    user-select: none;
}

.edl-header:hover {
    background: #eef3fb;
}

.edl-header .edl-chevron {
    transition: transform .15s;
    color: #71809b;
}

.edl-section.open > .edl-header .edl-chevron {
    transform: rotate(90deg);
}

.edl-body {
    display: none;
    padding: 18px 20px 22px;
    background: white;
}

.edl-section.open > .edl-body {
    display: block;
}

.edl-overview-text {
    color: #1e4fd8;
    font-style: italic;
    line-height: 1.7;
    margin: 0 0 10px;
}

.edl-overview-warning {
    color: #b91c1c;
    font-style: italic;
    line-height: 1.7;
    margin: 0;
}

.edl-panels {
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
}

.edl-panel {
    flex: 1;
    min-width: 280px;
    background: #f4f6fa;
    border-radius: 8px;
    padding: 16px 18px;
}

.edl-panel h3 {
    margin: 0 0 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid #dde3ee;
    font-size: 13.5px;
    color: #1a2338;
    font-weight: 700;
}

.edl-panel .edl-empty {
    color: #71809b;
    font-style: italic;
    font-size: 13px;
}

.edl-installed-row {
    display: flex;
    gap: 8px;
    font-size: 13px;
    margin-bottom: 4px;
    color: #34435c;
}

.edl-installed-row strong {
    color: #1a2338;
    min-width: 90px;
}

.edl-staged-item {
    padding: 10px 0;
    border-bottom: 1px solid #e3e8f0;
}

.edl-staged-item:last-of-type {
    border-bottom: none;
}

.edl-staged-filename {
    font-style: italic;
    color: #34435c;
    font-size: 13px;
    display: block;
    margin-bottom: 4px;
    word-break: break-all;
}

.edl-staged-note {
    font-size: 12.5px;
    color: #5a6478;
    margin-bottom: 8px;
}

.edl-upgrade-btn {
    height: 30px;
    padding: 0 16px;
    border: none;
    border-radius: 5px;
    background: var(--accent);
    color: white;
    font-weight: 600;
    font-size: 12.5px;
    cursor: pointer;
}

.edl-upgrade-btn:hover {
    background: #1742b0;
}

.edl-upgrade-btn:disabled {
    opacity: .6;
    cursor: not-allowed;
}

.edl-help-note {
    font-size: 12.5px;
    color: #5a6478;
    margin: 6px 0 16px;
}

.edl-help-note a {
    color: #1e4fd8;
    cursor: pointer;
}

.edl-stage-form {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-top: 14px;
    border-top: 1px dashed #dde3ee;
    flex-wrap: wrap;
}

.edl-stage-form input[type="file"] {
    font-size: 12.5px;
}

.edl-stage-btn {
    height: 30px;
    padding: 0 16px;
    border: 1px solid #cfd4dc;
    border-radius: 5px;
    background: #eef1f5;
    color: #1c2534;
    font-weight: 600;
    font-size: 12.5px;
    cursor: pointer;
}

.edl-stage-btn:hover {
    background: #e2e7ee;
}

.edl-stage-btn:disabled {
    opacity: .6;
    cursor: not-allowed;
}

.edl-section-alert {
    margin-top: 10px;
}
</style>

<div class="edl-page">
    <h1>External Database Import Utility</h1>

    <div class="edl-accordion" id="edlAccordion">
        <div class="edl-section open" data-key="OVERVIEW">
            <div class="edl-header" data-toggle="OVERVIEW">
                <span>Overview</span>
                <span class="edl-chevron">&#9656;</span>
            </div>
            <div class="edl-body">
                <p class="edl-overview-text">This page allows you to review each of the supported external dataloads that you can install and upgrade. Each section below can be expanded by clicking on the section header to review the status of the particular database of interest.</p>
                <p class="edl-overview-warning">NOTE: Importing external data can take more than an hour depending on your hardware configuration. For example, one of the RxNorm data tables can contain in excess of 6 million rows.</p>
            </div>
        </div>

        ${SECTIONS.map((key) => `
        <div class="edl-section" data-key="${key}">
            <div class="edl-header" data-toggle="${key}">
                <span>${key}</span>
                <span class="edl-chevron">&#9656;</span>
            </div>
            <div class="edl-body">
                <div class="edl-panels">
                    <div class="edl-panel edl-installed-panel" id="edlInstalled_${key}">
                        <h3>Installed Release</h3>
                        <p class="edl-empty">Loading...</p>
                    </div>
                    <div class="edl-panel edl-staged-panel" id="edlStaged_${key}">
                        <h3>Staged Releases</h3>
                        <p class="edl-empty">Loading...</p>
                    </div>
                </div>
                <div class="edl-section-alert" id="edlAlert_${key}"></div>
            </div>
        </div>
        `).join("")}
    </div>
</div>
`;
}
