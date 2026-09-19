/**
 * DICOM Web Viewer View (DWV matching OpenEMR Miscellaneous DICOM Viewer)
 * With pixel-perfect top bar, toolbar icons, center dashed viewport, and medical image manipulation.
 */
export function DicomViewerView() {
    return `
<style>
.dicom-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: calc(100vh - 120px);
    min-height: 560px;
    background-color: #484848;
    color: #ffffff;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    position: relative;
    user-select: none;
    overflow: hidden;
}

/* Top Header Bar matching user screenshot */
.dicom-header-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    background-color: #484848;
    border-bottom: 1px solid rgba(0, 0, 0, 0.2);
    z-index: 20;
}

.dicom-title-wrap {
    display: inline-flex;
    align-items: baseline;
    gap: 8px;
}

.dicom-title-text {
    font-size: 24px;
    font-weight: 500;
    color: #ffffff;
    letter-spacing: -0.01em;
    margin: 0;
}

.dicom-disclaimer-text {
    font-size: 13px;
    font-style: italic;
    color: #ef4444;
    font-weight: 500;
}

.dicom-toolbar-btns {
    display: inline-flex;
    align-items: center;
    gap: 2px;
}

.dicom-tool-btn {
    width: 28px;
    height: 28px;
    background-color: #007bff;
    color: #ffffff;
    border: none;
    border-radius: 2px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color 0.12s ease;
    padding: 0;
}

.dicom-tool-btn:hover {
    background-color: #0062cc;
}

.dicom-tool-btn.active {
    background-color: #004085;
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
}

.dicom-tool-btn svg {
    width: 15px;
    height: 15px;
    fill: currentColor;
}

/* Main Viewport Workspace */
.dicom-workspace {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background-color: #484848;
}

/* Dashed Center Viewport matching user screenshot */
.dicom-viewport-box {
    width: 440px;
    height: 440px;
    border: 2px dashed #b5b5b5;
    background-color: #2e2e2e;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    box-shadow: 0 8px 24px rgba(0,0,0,0.25);
    transition: border-color 0.2s ease;
}

.dicom-viewport-box.drag-over {
    border-color: #38bdf8;
    background-color: #242c38;
}

.dicom-empty-prompt {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 24px;
    color: #94a3b8;
    z-index: 5;
}

.dicom-empty-prompt svg {
    margin-bottom: 12px;
    color: #64748b;
}

.dicom-empty-prompt h4 {
    margin: 0 0 6px 0;
    color: #e2e8f0;
    font-size: 15px;
    font-weight: 500;
}

.dicom-empty-prompt p {
    margin: 0 0 16px 0;
    font-size: 12.5px;
    line-height: 1.4;
    max-width: 280px;
}

.dicom-prompt-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
}

.dicom-btn-sm {
    background: #0284c7;
    color: #fff;
    border: none;
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
}

.dicom-btn-sm:hover {
    background: #0369a1;
}

.dicom-btn-sm-secondary {
    background: #475569;
    color: #f1f5f9;
    border: 1px solid #64748b;
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.15s;
}

.dicom-btn-sm-secondary:hover {
    background: #334155;
}

/* Canvases */
#dicomMainCanvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    cursor: grab;
    touch-action: none;
}

#dicomMainCanvas:active {
    cursor: grabbing;
}

#dicomOverlayCanvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 4;
}

/* HUD Overlays (Standard Medical DICOM Corners) */
.dicom-hud {
    position: absolute;
    color: #38bdf8;
    font-family: monospace;
    font-size: 11px;
    line-height: 1.35;
    pointer-events: none;
    text-shadow: 1px 1px 2px #000;
    z-index: 6;
}

.dicom-hud-tl { top: 8px; left: 10px; text-align: left; }
.dicom-hud-tr { top: 8px; right: 10px; text-align: right; }
.dicom-hud-bl { bottom: 8px; left: 10px; text-align: left; }
.dicom-hud-br { bottom: 8px; right: 10px; text-align: right; }

/* Floating Tool Popovers */
.dicom-popover {
    position: absolute;
    top: 48px;
    right: 16px;
    background: #1e293b;
    border: 1px solid #475569;
    border-radius: 6px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    padding: 14px 16px;
    z-index: 100;
    color: #e2e8f0;
    font-size: 13px;
    min-width: 260px;
    display: none;
}

.dicom-popover h5 {
    margin: 0 0 10px 0;
    font-size: 13px;
    font-weight: 600;
    color: #38bdf8;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.dicom-popover-close {
    background: none;
    border: none;
    color: #94a3b8;
    font-size: 18px;
    cursor: pointer;
    line-height: 1;
    padding: 0;
}

.dicom-popover-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
}

.dicom-popover-row label {
    font-size: 12px;
    color: #94a3b8;
}

.dicom-popover-btn {
    width: 100%;
    padding: 7px 12px;
    background: #334155;
    border: 1px solid #475569;
    border-radius: 4px;
    color: #f1f5f9;
    font-size: 12.5px;
    text-align: left;
    margin-bottom: 6px;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.dicom-popover-btn:hover {
    background: #0284c7;
    border-color: #38bdf8;
}

.dicom-popover-slider-wrap {
    margin-bottom: 10px;
}

.dicom-popover-slider-wrap span {
    font-size: 11px;
    color: #94a3b8;
    display: flex;
    justify-content: space-between;
    margin-bottom: 2px;
}

.dicom-popover input[type="range"] {
    width: 100%;
    accent-color: #0284c7;
}

/* Fullscreen Tag Inspector Modal */
.dicom-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(15, 23, 42, 0.7);
    backdrop-filter: blur(2px);
    z-index: 9999;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.dicom-modal-card {
    background: #1e293b;
    border: 1px solid #475569;
    border-radius: 8px;
    width: 100%;
    max-width: 680px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    color: #f1f5f9;
}

.dicom-modal-header {
    padding: 14px 18px;
    background: #0f172a;
    border-bottom: 1px solid #334155;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.dicom-modal-header h4 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
}

.dicom-modal-body {
    padding: 16px 18px;
    overflow-y: auto;
    font-size: 13px;
    line-height: 1.5;
}

.dicom-modal-footer {
    padding: 12px 18px;
    background: #0f172a;
    border-top: 1px solid #334155;
    display: flex;
    justify-content: flex-end;
}
</style>

<div class="dicom-container" id="dicomAppContainer">
    <!-- Top Header Bar -->
    <div class="dicom-header-bar">
        <div class="dicom-title-wrap">
            <h1 class="dicom-title-text">Dicom Viewer</h1>
            <span class="dicom-disclaimer-text">( Not for Diagnostics )</span>
        </div>

        <!-- 7 Blue Square Toolbar Buttons matching user screenshot -->
        <div class="dicom-toolbar-btns">
            <!-- 1. File / Open (Document icon) -->
            <button type="button" class="dicom-tool-btn" id="dicomBtnFile" title="File / Load Medical Studies">
                <svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
            </button>

            <!-- 2. Tools / Presets (Wrench icon) -->
            <button type="button" class="dicom-tool-btn" id="dicomBtnTools" title="Window & Level Presets (Contrast/Brightness)">
                <svg viewBox="0 0 24 24"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>
            </button>

            <!-- 3. Series / Thumbnails (List icon) -->
            <button type="button" class="dicom-tool-btn" id="dicomBtnSeries" title="Series & Patient Imaging List">
                <svg viewBox="0 0 24 24"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
            </button>

            <!-- 4. Measure / Annotate (Pencil / Box icon) -->
            <button type="button" class="dicom-tool-btn" id="dicomBtnMeasure" title="Measurement Tools (Ruler, Angle, ROI)">
                <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
            </button>

            <!-- 5. Image Manipulation (Picture frame icon) -->
            <button type="button" class="dicom-tool-btn" id="dicomBtnImage" title="Image Adjustments (Invert, Zoom, Rotate, Reset)">
                <svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
            </button>

            <!-- 6. DICOM Metadata Info (Info "i" icon) -->
            <button type="button" class="dicom-tool-btn" id="dicomBtnInfo" title="DICOM Tag Inspector & Header Metadata">
                <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
            </button>

            <!-- 7. Help (Question mark icon) -->
            <button type="button" class="dicom-tool-btn" id="dicomBtnHelp" title="Help & Navigation Guide">
                <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16h-2v-2h2v2zm1.07-7.75l-.9.92C12.45 11.9 12 12.5 12 14h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"/></svg>
            </button>
        </div>
    </div>

    <!-- Main Workspace Viewport Area -->
    <div class="dicom-workspace" id="dicomWorkspaceArea">
        <!-- Dashed Center Viewport matching user screenshot -->
        <div class="dicom-viewport-box" id="dicomViewportBox">
            <!-- Hidden Canvas for Image Display -->
            <canvas id="dicomMainCanvas" style="display: none;"></canvas>
            <canvas id="dicomOverlayCanvas" style="display: none;"></canvas>

            <!-- Corner Medical HUD (Active when image loaded) -->
            <div class="dicom-hud dicom-hud-tl" id="hudTopLeft" style="display: none;">
                <div id="hudPatientName">Doc Ako</div>
                <div id="hudPatientId">PAT-000004</div>
                <div id="hudModality">Modality: DX</div>
            </div>
            <div class="dicom-hud dicom-hud-tr" id="hudTopRight" style="display: none;">
                <div id="hudInstitution">Intellix Health System</div>
                <div id="hudStudyDate">2026-09-19</div>
            </div>
            <div class="dicom-hud dicom-hud-bl" id="hudBottomLeft" style="display: none;">
                <div id="hudZoom">Zoom: 100%</div>
                <div id="hudWL">WL: 40 WW: 350</div>
            </div>
            <div class="dicom-hud dicom-hud-br" id="hudBottomRight" style="display: none;">
                <div id="hudMatrix">512 x 512</div>
                <div id="hudStatus">Active Study</div>
            </div>

            <!-- Empty Drop Prompt -->
            <div class="dicom-empty-prompt" id="dicomEmptyPrompt">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="3 3"></rect>
                    <path d="M12 8v8M8 12h8"></path>
                </svg>
                <h4>Drag & Drop DICOM File</h4>
                <p>Drop a <code>.dcm</code> file or medical image here, or choose an option below:</p>
                <div class="dicom-prompt-actions">
                    <button type="button" class="dicom-btn-sm" id="dicomBrowseBtn">Open File</button>
                    <button type="button" class="dicom-btn-sm-secondary" id="dicomLoadActiveBtn">Load Patient Image</button>
                    <button type="button" class="dicom-btn-sm-secondary" id="dicomLoadSampleBtn">Sample X-Ray</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Hidden File Input -->
    <input type="file" id="dicomFileInput" accept=".dcm,.ima,.jpg,.jpeg,.png,.webp" style="display: none;">

    <!-- 1. Popover: File Menu -->
    <div class="dicom-popover" id="popoverFile">
        <h5>
            <span>DICOM Studies & Sources</span>
            <button type="button" class="dicom-popover-close">&times;</button>
        </h5>
        <button type="button" class="dicom-popover-btn" id="popActionBrowse">
            <span>📁 Open Local File (.dcm / image)</span>
        </button>
        <button type="button" class="dicom-popover-btn" id="popActionActivePatient">
            <span id="popActivePatientLabel">👤 Active Patient Imaging</span>
        </button>
        <div style="font-size: 11px; color: #94a3b8; margin: 10px 0 6px 0; text-transform: uppercase; font-weight: 600;">Sample Medical Scans</div>
        <button type="button" class="dicom-popover-btn" data-sample="chest">
            <span>🫁 Chest Radiograph (CXR AP)</span>
        </button>
        <button type="button" class="dicom-popover-btn" data-sample="brain">
            <span>🧠 Brain MRI (Axial T2)</span>
        </button>
        <button type="button" class="dicom-popover-btn" data-sample="knee">
            <span>🦵 Knee Radiograph (Lateral)</span>
        </button>
        <button type="button" class="dicom-popover-btn" data-sample="abdomen">
            <span>🩻 Abdomen CT Scan</span>
        </button>
    </div>

    <!-- 2. Popover: Window & Level (Contrast / Brightness) -->
    <div class="dicom-popover" id="popoverTools">
        <h5>
            <span>Window & Level Presets</span>
            <button type="button" class="dicom-popover-close">&times;</button>
        </h5>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 12px;">
            <button type="button" class="dicom-popover-btn" style="margin: 0;" data-wl="default">Default</button>
            <button type="button" class="dicom-popover-btn" style="margin: 0;" data-wl="lung">🫁 Lung</button>
            <button type="button" class="dicom-popover-btn" style="margin: 0;" data-wl="bone">🦴 Bone</button>
            <button type="button" class="dicom-popover-btn" style="margin: 0;" data-wl="brain">🧠 Brain</button>
            <button type="button" class="dicom-popover-btn" style="margin: 0;" data-wl="soft">🥩 Soft Tissue</button>
            <button type="button" class="dicom-popover-btn" style="margin: 0;" data-wl="abdomen">🩻 Abdomen</button>
        </div>
        <div class="dicom-popover-slider-wrap">
            <span><span>Window Width (Contrast)</span><strong id="valWW">350</strong></span>
            <input type="range" id="sliderWW" min="50" max="2500" value="350">
        </div>
        <div class="dicom-popover-slider-wrap">
            <span><span>Window Level (Brightness)</span><strong id="valWL">40</strong></span>
            <input type="range" id="sliderWL" min="-1000" max="1000" value="40">
        </div>
    </div>

    <!-- 3. Popover: Series & Studies -->
    <div class="dicom-popover" id="popoverSeries">
        <h5>
            <span>Patient Imaging Documents</span>
            <button type="button" class="dicom-popover-close">&times;</button>
        </h5>
        <div id="dicomSeriesList" style="max-height: 240px; overflow-y: auto;">
            <div style="padding: 12px; text-align: center; color: #94a3b8; font-size: 12px;">Loading patient imaging records...</div>
        </div>
    </div>

    <!-- 4. Popover: Measurement Tools -->
    <div class="dicom-popover" id="popoverMeasure">
        <h5>
            <span>Measurement & Annotations</span>
            <button type="button" class="dicom-popover-close">&times;</button>
        </h5>
        <button type="button" class="dicom-popover-btn" id="toolRuler">
            <span>📏 Distance / Ruler (mm)</span>
        </button>
        <button type="button" class="dicom-popover-btn" id="toolAngle">
            <span>📐 Angle Measurement (deg)</span>
        </button>
        <button type="button" class="dicom-popover-btn" id="toolROI">
            <span>⭕ Elliptical ROI (Area & Density)</span>
        </button>
        <button type="button" class="dicom-popover-btn" id="toolClearMeasure" style="color: #ef4444;">
            <span>🗑️ Clear All Measurements</span>
        </button>
    </div>

    <!-- 5. Popover: Image Controls -->
    <div class="dicom-popover" id="popoverImage">
        <h5>
            <span>Image Controls</span>
            <button type="button" class="dicom-popover-close">&times;</button>
        </h5>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            <button type="button" class="dicom-popover-btn" id="imgInvert">🌓 Invert</button>
            <button type="button" class="dicom-popover-btn" id="imgRotate">↻ Rotate 90°</button>
            <button type="button" class="dicom-popover-btn" id="imgFlipH">⇆ Flip H</button>
            <button type="button" class="dicom-popover-btn" id="imgFlipV">⇅ Flip V</button>
            <button type="button" class="dicom-popover-btn" id="imgZoomIn">🔍 Zoom +</button>
            <button type="button" class="dicom-popover-btn" id="imgZoomOut">🔎 Zoom -</button>
        </div>
        <button type="button" class="dicom-popover-btn" id="imgReset" style="margin-top: 8px; justify-content: center; background: #0284c7;">
            Reset View (1:1)
        </button>
    </div>

    <!-- 6. Modal: DICOM Tag Inspector -->
    <div class="dicom-modal-overlay" id="modalTagInspector">
        <div class="dicom-modal-card">
            <div class="dicom-modal-header">
                <h4>DICOM Header Tags & Metadata</h4>
                <button type="button" class="dicom-popover-close" id="closeTagModal">&times;</button>
            </div>
            <div class="dicom-modal-body">
                <input type="text" id="dicomTagSearch" placeholder="Filter tags by name, tag hex, or value..." style="width: 100%; box-sizing: border-box; padding: 7px 12px; background: #0f172a; border: 1px solid #475569; border-radius: 4px; color: #fff; margin-bottom: 12px; font-size: 12.5px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 12.5px; font-family: monospace;">
                    <thead>
                        <tr style="border-bottom: 1px solid #475569; text-align: left; color: #94a3b8;">
                            <th style="padding: 6px;">Tag</th>
                            <th style="padding: 6px;">Name</th>
                            <th style="padding: 6px;">VR</th>
                            <th style="padding: 6px;">Value</th>
                        </tr>
                    </thead>
                    <tbody id="dicomTagTableBody">
                        <tr><td colspan="4" style="padding: 16px; text-align: center; color: #94a3b8;">No DICOM file currently inspected.</td></tr>
                    </tbody>
                </table>
            </div>
            <div class="dicom-modal-footer">
                <button type="button" class="dicom-btn-sm-secondary" id="okTagModal">Close</button>
            </div>
        </div>
    </div>

    <!-- 7. Modal: Help Guide -->
    <div class="dicom-modal-overlay" id="modalHelpGuide">
        <div class="dicom-modal-card" style="max-width: 520px;">
            <div class="dicom-modal-header">
                <h4>DICOM Web Viewer Instructions</h4>
                <button type="button" class="dicom-popover-close" id="closeHelpModal">&times;</button>
            </div>
            <div class="dicom-modal-body" style="line-height: 1.7;">
                <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; border-radius: 4px; padding: 8px 12px; color: #fca5a5; font-size: 12px; margin-bottom: 14px;">
                    <strong>Notice:</strong> This web viewer is for reference only and is <em>Not for Primary Diagnostics</em>.
                </div>
                <h5 style="margin: 0 0 8px 0; color: #38bdf8;">Mouse & Touch Controls:</h5>
                <ul style="padding-left: 20px; margin: 0 0 16px 0;">
                    <li><strong>Left Click + Drag:</strong> Pan the medical image across viewport.</li>
                    <li><strong>Mouse Wheel:</strong> Smooth zoom in and out.</li>
                    <li><strong>Right Click + Drag (or Sliders):</strong> Adjust Window/Level (Brightness & Contrast).</li>
                    <li><strong>Measure Tool Active:</strong> Click and drag to measure distance in millimeters or angles.</li>
                </ul>
                <h5 style="margin: 0 0 8px 0; color: #38bdf8;">Top Toolbar Buttons:</h5>
                <ul style="padding-left: 20px; margin: 0;">
                    <li><strong>[📄] File:</strong> Open local DICOM, patient documents, or sample scans.</li>
                    <li><strong>[🔧] Presets:</strong> Rapidly switch window/level presets (Lung, Bone, Brain, etc.).</li>
                    <li><strong>[📋] Series:</strong> View and load active patient's imaging documents.</li>
                    <li><strong>[📝] Annotate:</strong> Distance ruler, angle tool, and ROI calculation.</li>
                    <li><strong>[🖼️] Transform:</strong> Rotate, flip, zoom, and invert grayscale.</li>
                    <li><strong>[ℹ️] Tags:</strong> Deep inspect DICOM Part 10 metadata tags.</li>
                </ul>
            </div>
            <div class="dicom-modal-footer">
                <button type="button" class="dicom-btn-sm" id="okHelpModal">Got It</button>
            </div>
        </div>
    </div>
</div>
    `;
}