export function Hl7ViewerView()
{
    return `
<style>
.hl7-page {
    width: 100%;
    font-size: 13.5px;
}

.hl7-page h1 {
    margin: 0 0 12px;
    font-size: 24px;
    font-weight: 400;
    color: #1a2338;
}

.hl7-section-label {
    margin: 0 0 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #1a2338;
    font-size: 15px;
    color: #29323f;
}

.hl7-textarea {
    width: 100%;
    box-sizing: border-box;
    min-height: 260px;
    padding: 12px 14px;
    border: 1px solid #cfd4dc;
    border-radius: 6px;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 13px;
    color: #1a2338;
    resize: vertical;
    outline: none;
}

.hl7-textarea:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(var(--accent-rgb),.12);
}

.hl7-toolbar {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-top: 14px;
}

.hl7-parse-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 36px;
    padding: 0 16px;
    border: 1px solid #cfd4dc;
    border-radius: 6px;
    background: #eef1f5;
    color: #1c2534;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
}

.hl7-parse-btn:hover {
    background: #e2e7ee;
}

.hl7-parse-btn svg {
    width: 12px;
    height: 12px;
}

.hl7-clear-link {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: none;
    border: none;
    color: var(--accent);
    font-size: 13.5px;
    cursor: pointer;
    padding: 0;
}

.hl7-clear-link:hover {
    text-decoration: underline;
}

.hl7-clear-link svg {
    width: 12px;
    height: 12px;
}

.hl7-results {
    margin-top: 24px;
}

.hl7-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 16px;
    padding: 12px 16px;
    background: #eef1f5;
    border-radius: 6px;
    font-size: 12.5px;
    color: #4a5568;
}

.hl7-meta strong {
    color: #1a2338;
}

.hl7-segment {
    border: 1px solid #e5e9f0;
    border-radius: 8px;
    margin-bottom: 14px;
    overflow: hidden;
}

.hl7-segment-header {
    display: flex;
    align-items: baseline;
    gap: 10px;
    padding: 10px 16px;
    background: #1a2338;
    color: white;
}

.hl7-segment-id {
    font-weight: 700;
    font-size: 13.5px;
    letter-spacing: .5px;
}

.hl7-segment-desc {
    font-size: 12px;
    color: #cbd5e1;
}

.hl7-segment-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12.5px;
}

.hl7-segment-table th {
    text-align: left;
    padding: 7px 16px;
    background: #f8fafc;
    color: #71809b;
    font-weight: 700;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .3px;
    border-bottom: 1px solid #eef1f5;
    white-space: nowrap;
}

.hl7-segment-table td {
    padding: 7px 16px;
    border-bottom: 1px solid #f1f4fa;
    color: #29323f;
    vertical-align: top;
}

.hl7-segment-table tr:last-child td {
    border-bottom: none;
}

.hl7-field-label {
    color: #71809b;
    font-size: 11.5px;
}

.hl7-field-value {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    word-break: break-all;
}

.hl7-field-empty {
    color: #c3cbd8;
    font-style: italic;
}

.hl7-component {
    display: inline-block;
    padding: 1px 5px;
    margin: 1px 2px 1px 0;
    border-radius: 3px;
    background: #eef1f5;
}

.hl7-error {
    padding: 14px 16px;
    border-radius: 6px;
    background: #fee2e2;
    color: #991b1b;
    font-size: 13.5px;
}
</style>

<div class="hl7-page">
    <h1>HL7 Viewer</h1>
    <p class="hl7-section-label">Paste HL7 Data</p>

    <textarea class="hl7-textarea" id="hl7Input" placeholder="Paste a raw HL7 v2.x message here, e.g.&#10;MSH|^~\\&|SENDAPP|SENDFAC|RECVAPP|RECVFAC|20260101120000||ADT^A01|MSG00001|P|2.3"></textarea>

    <div class="hl7-toolbar">
        <button type="button" class="hl7-parse-btn" id="hl7ParseBtn">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
            Parse HL7
        </button>
        <button type="button" class="hl7-clear-link" id="hl7ClearBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"></path></svg>
            Clear HL7 Data
        </button>
    </div>

    <div class="hl7-results" id="hl7Results"></div>
</div>
`;
}
