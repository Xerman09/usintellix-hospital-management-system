/**
 * Lightweight pure-JavaScript DICOM Parser & Medical Image Processor
 * Parses DICOM (Part 10) headers, tags, and pixel data
 */

export function parseDicomBuffer(arrayBuffer) {
    const dataView = new DataView(arrayBuffer);
    const byteLength = arrayBuffer.byteLength;

    // Check for "DICM" magic at offset 128
    let isDicom = false;
    if (byteLength > 132) {
        const magic = String.fromCharCode(
            dataView.getUint8(128),
            dataView.getUint8(129),
            dataView.getUint8(130),
            dataView.getUint8(131)
        );
        isDicom = (magic === "DICM");
    }

    const metadata = {
        patientName: "Anonymous",
        patientId: "N/A",
        modality: "DX",
        studyDate: new Date().toISOString().split("T")[0],
        studyDescription: "Diagnostic Radiography",
        institution: "Intellix Medical Imaging",
        rows: 512,
        columns: 512,
        bitsAllocated: 16,
        bitsStored: 12,
        windowCenter: 2048,
        windowWidth: 4096,
        pixelSpacing: [0.15, 0.15],
        rawTags: []
    };

    if (!isDicom) {
        return { isDicom: false, metadata, pixelData: null };
    }

    let offset = 132;
    let pixelDataOffset = null;
    let pixelDataLength = null;

    // Standard VRs that have 32-bit length with 2 reserved bytes
    const longVRs = ["OB", "OW", "OF", "SQ", "UT", "UN"];

    try {
        while (offset < byteLength - 8) {
            const group = dataView.getUint16(offset, true);
            const element = dataView.getUint16(offset + 2, true);
            offset += 4;

            // Peek VR (Explicit vs Implicit VR)
            const vr = String.fromCharCode(dataView.getUint8(offset), dataView.getUint8(offset + 1));
            let length = 0;

            // Check if VR looks like ASCII letters (Explicit VR)
            if (/^[A-Z]{2}$/.test(vr)) {
                offset += 2;
                if (longVRs.includes(vr)) {
                    offset += 2; // skip 2 reserved bytes
                    length = dataView.getUint32(offset, true);
                    offset += 4;
                } else {
                    length = dataView.getUint16(offset, true);
                    offset += 2;
                }
            } else {
                // Implicit VR
                length = dataView.getUint32(offset, true);
                offset += 4;
            }

            if (length === 0xFFFFFFFF) {
                // Undefined length (Sequence or encapsulated data)
                length = 0;
            }

            const tagHex = `(${group.toString(16).padStart(4, "0").toUpperCase()},${element.toString(16).padStart(4, "0").toUpperCase()})`;

            // Pixel data tag: (7FE0, 0010)
            if (group === 0x7FE0 && element === 0x0010) {
                pixelDataOffset = offset;
                pixelDataLength = length;
                metadata.rawTags.push({ tag: tagHex, name: "Pixel Data", vr, length: `${length} bytes` });
                break; // Stop parsing header
            }

            // Extract well-known tags
            if (length > 0 && offset + length <= byteLength) {
                let textVal = "";
                try {
                    const bytes = new Uint8Array(arrayBuffer, offset, Math.min(length, 120));
                    textVal = new TextDecoder().decode(bytes).replace(/\0/g, "").trim();
                } catch (e) {}

                if (group === 0x0010 && element === 0x0010) {
                    metadata.patientName = textVal || metadata.patientName;
                    metadata.rawTags.push({ tag: tagHex, name: "Patient Name", vr, value: metadata.patientName });
                } else if (group === 0x0010 && element === 0x0020) {
                    metadata.patientId = textVal || metadata.patientId;
                    metadata.rawTags.push({ tag: tagHex, name: "Patient ID", vr, value: metadata.patientId });
                } else if (group === 0x0008 && element === 0x0060) {
                    metadata.modality = textVal || metadata.modality;
                    metadata.rawTags.push({ tag: tagHex, name: "Modality", vr, value: metadata.modality });
                } else if (group === 0x0008 && element === 0x0020) {
                    metadata.studyDate = textVal || metadata.studyDate;
                    metadata.rawTags.push({ tag: tagHex, name: "Study Date", vr, value: metadata.studyDate });
                } else if (group === 0x0008 && element === 0x1030) {
                    metadata.studyDescription = textVal || metadata.studyDescription;
                    metadata.rawTags.push({ tag: tagHex, name: "Study Description", vr, value: metadata.studyDescription });
                } else if (group === 0x0008 && element === 0x0080) {
                    metadata.institution = textVal || metadata.institution;
                    metadata.rawTags.push({ tag: tagHex, name: "Institution Name", vr, value: metadata.institution });
                } else if (group === 0x0028 && element === 0x0010) {
                    metadata.rows = length === 2 ? dataView.getUint16(offset, true) : parseInt(textVal, 10) || 512;
                    metadata.rawTags.push({ tag: tagHex, name: "Rows", vr, value: metadata.rows });
                } else if (group === 0x0028 && element === 0x0011) {
                    metadata.columns = length === 2 ? dataView.getUint16(offset, true) : parseInt(textVal, 10) || 512;
                    metadata.rawTags.push({ tag: tagHex, name: "Columns", vr, value: metadata.columns });
                } else if (group === 0x0028 && element === 0x0100) {
                    metadata.bitsAllocated = length === 2 ? dataView.getUint16(offset, true) : parseInt(textVal, 10) || 16;
                    metadata.rawTags.push({ tag: tagHex, name: "Bits Allocated", vr, value: metadata.bitsAllocated });
                } else if (group === 0x0028 && element === 0x1050) {
                    metadata.windowCenter = parseFloat(textVal) || metadata.windowCenter;
                    metadata.rawTags.push({ tag: tagHex, name: "Window Center", vr, value: metadata.windowCenter });
                } else if (group === 0x0028 && element === 0x1051) {
                    metadata.windowWidth = parseFloat(textVal) || metadata.windowWidth;
                    metadata.rawTags.push({ tag: tagHex, name: "Window Width", vr, value: metadata.windowWidth });
                } else if (group === 0x0028 && element === 0x0030) {
                    const parts = textVal.split("\\").map(parseFloat);
                    if (parts.length === 2 && !isNaN(parts[0])) metadata.pixelSpacing = parts;
                    metadata.rawTags.push({ tag: tagHex, name: "Pixel Spacing", vr, value: textVal });
                } else if (textVal) {
                    metadata.rawTags.push({ tag: tagHex, name: `Tag ${tagHex}`, vr, value: textVal });
                }

                offset += length;
            } else {
                offset += length;
            }
        }
    } catch (err) {
        console.warn("DICOM tag parsing warning", err);
    }

    return {
        isDicom: true,
        metadata,
        pixelDataOffset,
        pixelDataLength,
        arrayBuffer
    };
}