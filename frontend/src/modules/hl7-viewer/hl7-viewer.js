const SEGMENT_DESCRIPTIONS = {
    MSH: "Message Header",
    EVN: "Event Type",
    PID: "Patient Identification",
    PD1: "Patient Additional Demographic",
    PV1: "Patient Visit",
    PV2: "Patient Visit - Additional Information",
    NK1: "Next of Kin / Associated Parties",
    ORC: "Common Order",
    OBR: "Observation Request",
    OBX: "Observation/Result",
    AL1: "Patient Allergy Information",
    DG1: "Diagnosis",
    IN1: "Insurance",
    IN2: "Insurance Additional Information",
    GT1: "Guarantor",
    NTE: "Notes and Comments",
    MSA: "Message Acknowledgment",
    ERR: "Error",
    SCH: "Scheduling Activity Information",
    RXA: "Pharmacy/Treatment Administration",
    RXE: "Pharmacy/Treatment Encoded Order"
};

const FIELD_LABELS = {
    MSH: {
        3: "Sending Application", 4: "Sending Facility", 5: "Receiving Application",
        6: "Receiving Facility", 7: "Date/Time of Message", 9: "Message Type",
        10: "Message Control ID", 11: "Processing ID", 12: "Version ID"
    },
    PID: {
        3: "Patient ID", 5: "Patient Name", 7: "Date of Birth", 8: "Sex",
        11: "Patient Address", 13: "Home Phone Number", 18: "Patient Account Number",
        19: "SSN Number"
    },
    PV1: {
        2: "Patient Class", 3: "Assigned Patient Location", 7: "Attending Doctor",
        8: "Referring Doctor", 19: "Visit Number", 44: "Admit Date/Time"
    },
    OBR: {
        4: "Universal Service ID", 7: "Observation Date/Time", 16: "Ordering Provider"
    },
    OBX: {
        2: "Value Type", 3: "Observation Identifier", 5: "Observation Value",
        6: "Units", 7: "Reference Range", 8: "Abnormal Flags", 11: "Observation Result Status"
    },
    ORC: {
        1: "Order Control", 2: "Placer Order Number", 3: "Filler Order Number", 5: "Order Status"
    },
    MSA: {
        1: "Acknowledgment Code", 2: "Message Control ID"
    },
    DG1: {
        3: "Diagnosis Code", 4: "Diagnosis Description"
    },
    IN1: {
        4: "Insurance Company Name", 36: "Policy Number"
    }
};

export async function initHl7Viewer()
{
    document.getElementById("hl7ParseBtn").addEventListener("click", handleParse);
    document.getElementById("hl7ClearBtn").addEventListener("click", handleClear);
}

function handleParse()
{
    const raw = document.getElementById("hl7Input").value;
    const results = document.getElementById("hl7Results");

    const parsed = parseHl7(raw);

    if (!parsed.success) {
        results.innerHTML = `<div class="hl7-error">${escapeHtml(parsed.message)}</div>`;
        return;
    }

    results.innerHTML = renderMeta(parsed.meta) + parsed.segments.map(renderSegment).join("");
}

function handleClear()
{
    document.getElementById("hl7Input").value = "";
    document.getElementById("hl7Results").innerHTML = "";
}

/**
 * Parses a raw HL7 v2.x pipe-delimited message. The field separator and
 * encoding characters (component ^, repetition ~, escape \, sub-component
 * &) are read from the MSH segment when present, per the standard;
 * MSH-1 is the separator character itself (it can never appear as a
 * split token), so it's reported directly rather than read from the
 * split result.
 */
function parseHl7(raw)
{
    const segments = raw.split(/\r\n|\r|\n/).map((line) => line.trim()).filter(Boolean);

    if (!segments.length) {
        return { success: false, message: "Paste an HL7 message before parsing." };
    }

    const invalid = segments.filter((line) => !/^[A-Za-z0-9]{3}/.test(line));

    if (invalid.length === segments.length) {
        return { success: false, message: "This doesn't look like HL7 data -- no recognizable segments (e.g. MSH, PID, OBX) were found." };
    }

    let fieldSep = "|";
    let componentSep = "^";
    let repetitionSep = "~";
    let escapeChar = "\\";
    let subComponentSep = "&";

    const mshLine = segments.find((line) => line.substring(0, 3).toUpperCase() === "MSH");

    if (mshLine && mshLine.length > 3) {
        fieldSep = mshLine.charAt(3);
        const encodingChars = mshLine.substring(4, 8);

        if (encodingChars[0]) componentSep = encodingChars[0];
        if (encodingChars[1]) repetitionSep = encodingChars[1];
        if (encodingChars[2]) escapeChar = encodingChars[2];
        if (encodingChars[3]) subComponentSep = encodingChars[3];
    }

    const parsedSegments = segments.map((line) => {
        const segmentId = line.substring(0, 3).toUpperCase();
        const isMsh = segmentId === "MSH";

        // substring(3) still starts with the delimiter right after the
        // segment ID (e.g. "PID|1||123456..." -> "|1||123456..."), so
        // splitting it always produces a leading "" artifact for that
        // delimiter -- drop it. MSH additionally gets a synthetic first
        // field for MSH-1, which can never appear as a split token since
        // it *is* the delimiter character.
        const rawFields = line.substring(3).split(fieldSep).slice(1);
        const fields = isMsh ? [fieldSep, ...rawFields] : rawFields;

        return { segmentId, raw: line, fields, componentSep };
    });

    return {
        success: true,
        segments: parsedSegments,
        meta: { segmentCount: parsedSegments.length, fieldSep, componentSep, repetitionSep, escapeChar, subComponentSep }
    };
}

function renderMeta(meta)
{
    return `
        <div class="hl7-meta">
            <span><strong>${meta.segmentCount}</strong> segment${meta.segmentCount === 1 ? "" : "s"} parsed</span>
            <span>Field separator: <strong>${escapeHtml(meta.fieldSep)}</strong></span>
            <span>Component: <strong>${escapeHtml(meta.componentSep)}</strong></span>
            <span>Repetition: <strong>${escapeHtml(meta.repetitionSep)}</strong></span>
            <span>Escape: <strong>${escapeHtml(meta.escapeChar)}</strong></span>
            <span>Sub-component: <strong>${escapeHtml(meta.subComponentSep)}</strong></span>
        </div>
    `;
}

function renderSegment(segment)
{
    const description = SEGMENT_DESCRIPTIONS[segment.segmentId];
    const labels = FIELD_LABELS[segment.segmentId] || {};

    const rows = segment.fields.map((value, index) => {
        const fieldNumber = index + 1;
        const label = labels[fieldNumber];

        return `
            <tr>
                <td style="white-space: nowrap;">
                    ${segment.segmentId}-${fieldNumber}
                    ${label ? `<div class="hl7-field-label">${escapeHtml(label)}</div>` : ""}
                </td>
                <td class="hl7-field-value">${renderFieldValue(value, segment.segmentId === "MSH" && fieldNumber <= 2 ? null : segment.componentSep)}</td>
            </tr>
        `;
    }).join("");

    return `
        <div class="hl7-segment">
            <div class="hl7-segment-header">
                <span class="hl7-segment-id">${escapeHtml(segment.segmentId)}</span>
                ${description ? `<span class="hl7-segment-desc">${escapeHtml(description)}</span>` : ""}
            </div>
            <table class="hl7-segment-table">
                <thead><tr><th style="width: 160px;">Field</th><th>Value</th></tr></thead>
                <tbody>${rows || `<tr><td colspan="2" class="hl7-field-empty">No fields</td></tr>`}</tbody>
            </table>
        </div>
    `;
}

function renderFieldValue(value, componentSep)
{
    if (!value) {
        return `<span class="hl7-field-empty">(empty)</span>`;
    }

    if (!componentSep || !value.includes(componentSep)) {
        return escapeHtml(value);
    }

    return value.split(componentSep).map((part) => `<span class="hl7-component">${escapeHtml(part) || "&nbsp;"}</span>`).join("");
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}
