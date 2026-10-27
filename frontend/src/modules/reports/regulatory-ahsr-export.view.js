export function RegulatoryAhsrExportView() {
    return `
    <div class="ahsr-container" style="padding: 24px; background: #f8fafc; min-height: calc(100vh - 64px); font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; color: #0f172a;">
        <style>
            .ahsr-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 16px;
                flex-wrap: wrap;
                background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #065f46 100%);
                color: #ffffff;
                padding: 22px 26px;
                border-radius: 14px;
                box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.25);
                margin-bottom: 22px;
            }
            .ahsr-badge-pill {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 4px 12px;
                border-radius: 999px;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.04em;
                text-transform: uppercase;
            }
            .ahsr-kpi-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: 16px;
                margin-bottom: 22px;
            }
            .ahsr-kpi-card {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 18px 20px;
                box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
            }
            .ahsr-kpi-card .kpi-label {
                font-size: 11.5px;
                font-weight: 700;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.04em;
                margin-bottom: 8px;
            }
            .ahsr-kpi-card .kpi-value {
                font-size: 26px;
                font-weight: 800;
                color: #0f172a;
                line-height: 1.1;
                margin-bottom: 6px;
            }
            .ahsr-kpi-card .kpi-sub {
                font-size: 12px;
                color: #475569;
            }
            .ahsr-panel {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
                margin-bottom: 22px;
                overflow: hidden;
            }
            .ahsr-panel-header {
                padding: 15px 20px;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 12px;
                background: #fcfdff;
            }
            .ahsr-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 12.8px;
            }
            .ahsr-table th {
                background: #f1f5f9;
                color: #334155;
                font-weight: 700;
                text-align: left;
                padding: 10px 13px;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.03em;
                border-bottom: 1px solid #cbd5e1;
            }
            .ahsr-table td {
                padding: 11px 13px;
                border-bottom: 1px solid #e2e8f0;
                vertical-align: middle;
            }
            .ahsr-table tr:hover td {
                background: #f8fafc;
            }
            .ahsr-btn {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 8px 14px;
                border-radius: 8px;
                font-size: 12.5px;
                font-weight: 700;
                cursor: pointer;
                border: 1px solid transparent;
                transition: all 0.15s ease;
            }
            .ahsr-btn-json {
                background: #2563eb;
                color: #ffffff;
            }
            .ahsr-btn-json:hover {
                background: #1d4ed8;
            }
            .ahsr-btn-xml {
                background: #7c3aed;
                color: #ffffff;
            }
            .ahsr-btn-xml:hover {
                background: #6d28d9;
            }
            .ahsr-btn-csv {
                background: #059669;
                color: #ffffff;
            }
            .ahsr-btn-csv:hover {
                background: #047857;
            }
            .ahsr-modal-backdrop {
                display: none;
                position: fixed;
                inset: 0;
                background: rgba(15, 23, 42, 0.65);
                z-index: 9999;
                align-items: center;
                justify-content: center;
                padding: 20px;
                overflow-y: auto;
            }
            .ahsr-modal-card {
                background: #ffffff;
                border-radius: 14px;
                width: 100%;
                max-width: 940px;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
                border: 1px solid #cbd5e1;
            }
        </style>

        <!-- Executive Banner -->
        <div class="ahsr-header">
            <div>
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap;">
                    <span class="ahsr-badge-pill" style="background: rgba(16, 185, 129, 0.25); color: #a7f3d0; border: 1px solid rgba(52, 211, 153, 0.5);">
                        🏛️ Statutory Annual Submission • DOH HFSRB / CMS / NHS
                    </span>
                    <span class="ahsr-badge-pill" style="background: rgba(59, 130, 246, 0.25); color: #bfdbfe; border: 1px solid rgba(96, 165, 250, 0.4);">
                        Schema 327 • AES-256-GCM + SHA-256 Signed Batches
                    </span>
                </div>
                <h1 style="margin: 0 0 6px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em;">
                    Health Authority Annual Hospital Statistical Report (AHSR) Engine
                </h1>
                <p style="margin: 0; color: #cbd5e1; font-size: 13.5px; max-width: 820px;">
                    Automated statutory compiler for <strong>Top 10 Leading Causes of Morbidity (ICD-10)</strong>, <strong>Top 10 Leading Causes of Mortality</strong>, <strong>Surgical Output (Major vs. Minor)</strong>, and <strong>Obstetric Deliveries (Normal NSVD vs. C-Section)</strong> with one-click encrypted <strong>JSON / XML / CSV</strong> portal export.
                </p>
            </div>

            <!-- One-Click National Health Portal Export Toolbar -->
            <div style="background: rgba(15, 23, 42, 0.55); border: 1px solid rgba(148, 163, 184, 0.3); padding: 12px 16px; border-radius: 12px; display: flex; flex-direction: column; gap: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
                    <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #93c5fd;">
                        🔐 One-Click Encrypted National Portal Export
                    </span>
                    <label style="font-size: 11.5px; color: #e2e8f0; display: flex; align-items: center; gap: 5px; cursor: pointer;">
                        <input type="checkbox" id="ahsrEncryptToggle" checked>
                        AES-256-GCM Envelope
                    </label>
                </div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button class="ahsr-btn ahsr-btn-json ahsr-export-trigger" data-format="JSON">
                        📦 Export Encrypted JSON
                    </button>
                    <button class="ahsr-btn ahsr-btn-xml ahsr-export-trigger" data-format="XML">
                        📄 Export HL7 / AHSR XML
                    </button>
                    <button class="ahsr-btn ahsr-btn-csv ahsr-export-trigger" data-format="CSV">
                        📊 Export Statutory CSV
                    </button>
                </div>
            </div>
        </div>

        <!-- KPI Summary Cards -->
        <div class="ahsr-kpi-grid">
            <div class="ahsr-kpi-card" style="border-top: 4px solid #2563eb;">
                <div class="kpi-label">Top 10 Morbidity Discharges</div>
                <div class="kpi-value" id="ahsrKpiMorbidityTotal">—</div>
                <div class="kpi-sub" id="ahsrKpiMorbiditySub">Out of 8,940 Total Discharges</div>
            </div>
            <div class="ahsr-kpi-card" style="border-top: 4px solid #dc2626;">
                <div class="kpi-label">Top 10 Mortality &amp; Net Death Rate</div>
                <div class="kpi-value" id="ahsrKpiMortalityTotal">—</div>
                <div class="kpi-sub" id="ahsrKpiMortalitySub">Gross vs Net (&gt;48h) Institutional</div>
            </div>
            <div class="ahsr-kpi-card" style="border-top: 4px solid #7c3aed;">
                <div class="kpi-label">Surgical Output (Major vs Minor)</div>
                <div class="kpi-value" id="ahsrKpiSurgeriesTotal">—</div>
                <div class="kpi-sub" id="ahsrKpiSurgeriesSub">Major Operations vs Minor Day-Surgery</div>
            </div>
            <div class="ahsr-kpi-card" style="border-top: 4px solid #059669;">
                <div class="kpi-label">Deliveries (Normal vs C-Section)</div>
                <div class="kpi-value" id="ahsrKpiDeliveriesTotal">—</div>
                <div class="kpi-sub" id="ahsrKpiDeliveriesSub">NSVD vs Caesarean Section Rate %</div>
            </div>
        </div>

        <!-- Two-Column Grid: Top 10 Leading Causes of Morbidity & Top 10 Leading Causes of Mortality -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 22px;">
            <!-- Top 10 Morbidity -->
            <div class="ahsr-panel" style="margin-bottom: 0;">
                <div class="ahsr-panel-header">
                    <div>
                        <h3 style="margin: 0; font-size: 15px; font-weight: 800; color: #0f172a;">
                            🩺 Top 10 Leading Causes of Morbidity (by ICD-10)
                        </h3>
                        <span style="font-size: 12px; color: #64748b;">Discharged inpatient morbidity disaggregated by age &amp; sex</span>
                    </div>
                    <span class="ahsr-badge-pill" style="background: #dbeafe; color: #1e40af;">DOH AHSR Table II-A</span>
                </div>
                <div style="overflow-x: auto;">
                    <table class="ahsr-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>ICD-10</th>
                                <th>Leading Morbidity Diagnosis</th>
                                <th>M / F</th>
                                <th>&lt;18 / 18-59 / 60+</th>
                                <th>Total</th>
                                <th>Share %</th>
                            </tr>
                        </thead>
                        <tbody id="ahsrMorbidityTableBody">
                            <tr><td colspan="7" style="text-align:center; padding:24px; color:#64748b;">Loading Top 10 Morbidity...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Top 10 Mortality -->
            <div class="ahsr-panel" style="margin-bottom: 0;">
                <div class="ahsr-panel-header">
                    <div>
                        <h3 style="margin: 0; font-size: 15px; font-weight: 800; color: #0f172a;">
                            🕯️ Top 10 Leading Causes of Mortality (by ICD-10)
                        </h3>
                        <span style="font-size: 12px; color: #64748b;">Institutional deaths disaggregated by &lt;48h ER vs. ≥48h Net Inpatient</span>
                    </div>
                    <span class="ahsr-badge-pill" style="background: #fee2e2; color: #991b1b;">DOH AHSR Table II-B</span>
                </div>
                <div style="overflow-x: auto;">
                    <table class="ahsr-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>ICD-10</th>
                                <th>Underlying Cause of Death</th>
                                <th>M / F</th>
                                <th>&lt;48h / ≥48h Net</th>
                                <th>Deaths</th>
                                <th>CFR %</th>
                            </tr>
                        </thead>
                        <tbody id="ahsrMortalityTableBody">
                            <tr><td colspan="7" style="text-align:center; padding:24px; color:#64748b;">Loading Top 10 Mortality...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Surgical Output (Major vs Minor) and Deliveries (Normal vs C-Section) -->
        <div class="ahsr-panel">
            <div class="ahsr-panel-header">
                <div>
                    <h3 style="margin: 0; font-size: 15px; font-weight: 800; color: #0f172a;">
                        🔪 Surgical Output Counts (Major vs. Minor) &amp; 🤱 Obstetric Deliveries (Normal NSVD vs. C-Section)
                    </h3>
                    <span style="font-size: 12px; color: #64748b;">Annual operating room surgical procedures and labor &amp; delivery suite census</span>
                </div>
                <span class="ahsr-badge-pill" style="background: #ede9fe; color: #5b21b6;">DOH AHSR Table III-A &amp; III-B</span>
            </div>
            <div style="overflow-x: auto;">
                <table class="ahsr-table">
                    <thead>
                        <tr>
                            <th>Statutory Category Group</th>
                            <th>Procedure / Delivery Classification</th>
                            <th>Specialty Department</th>
                            <th>Elective / Scheduled</th>
                            <th>Emergency / STAT</th>
                            <th>Total Output</th>
                            <th>Group Share %</th>
                            <th>SSI / Complication %</th>
                            <th>Regulatory Benchmark Note</th>
                        </tr>
                    </thead>
                    <tbody id="ahsrSurgicalObstetricBody">
                        <tr><td colspan="9" style="text-align:center; padding:24px; color:#64748b;">Loading surgical and obstetric summary...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Regulatory Export Batches Ledger (regulatory_export_batches) -->
        <div class="ahsr-panel">
            <div class="ahsr-panel-header">
                <div>
                    <h3 style="margin: 0; font-size: 15px; font-weight: 800; color: #0f172a;">
                        🔐 National Health Authority Export Batch Ledger (<code>regulatory_export_batches</code>)
                    </h3>
                    <span style="font-size: 12px; color: #64748b;">Cryptographically signed JSON, XML, and CSV statutory export batches for DOH OHSRS, CMS &amp; PhilHealth</span>
                </div>
            </div>
            <div style="overflow-x: auto;">
                <table class="ahsr-table">
                    <thead>
                        <tr>
                            <th>Batch Reference No</th>
                            <th>Format &amp; Encryption</th>
                            <th>Target National Health Portal</th>
                            <th>Compiled Snapshot (Morb / Mort / Surg / Deliv)</th>
                            <th>SHA-256 Digital Signature</th>
                            <th>Portal Submission Status</th>
                            <th>Compiled At</th>
                        </tr>
                    </thead>
                    <tbody id="ahsrExportBatchesBody">
                        <tr><td colspan="7" style="text-align:center; padding:24px; color:#64748b;">Loading export batches...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Modal: Encrypted Export Payload Inspector & Downloader -->
        <div class="ahsr-modal-backdrop" id="ahsrExportModal">
            <div class="ahsr-modal-card">
                <div style="padding: 16px 22px; background: #0f172a; color: #ffffff; display: flex; justify-content: space-between; align-items: center; border-radius: 13px 13px 0 0;">
                    <div>
                        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #6ee7b7; font-weight: 700;">
                            AES-256-GCM Encrypted &amp; SHA-256 Signed National Health Portal Package
                        </div>
                        <h3 style="margin: 2px 0 0 0; font-size: 17px; font-weight: 800;" id="ahsrExportModalTitle">
                            AHSR Statutory Export Batch Ready
                        </h3>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button id="ahsrDownloadRawBtn" class="ahsr-btn ahsr-btn-json">
                            ⬇️ Download Statutory File
                        </button>
                        <button id="ahsrDownloadEncBtn" class="ahsr-btn ahsr-btn-csv">
                            🔐 Download .ENC Envelope
                        </button>
                        <button id="ahsrCloseExportModalBtn" class="ahsr-btn" style="background: #334155; color: #ffffff;">
                            ✕ Close
                        </button>
                    </div>
                </div>
                <div style="padding: 20px;">
                    <div id="ahsrExportMetaBar" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px;"></div>
                    <div style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px;">
                        Compiled Statutory Payload Preview (JSON / XML / CSV):
                    </div>
                    <pre id="ahsrExportPayloadPre" style="background: #0f172a; color: #e2e8f0; padding: 14px; border-radius: 8px; font-size: 11.5px; max-height: 360px; overflow: auto; margin: 0;"></pre>
                </div>
            </div>
        </div>
    </div>
    `;
}
