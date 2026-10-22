import { esc, dayLabel, when } from "./mychart-ui.js?v=11";

/*
 * One renderer for a record pack (Phase 8), used in three places:
 *   - the patient's printable copy of their own record,
 *   - the page an outside doctor opens from a shared link,
 *   - the preview on the Account screen.
 *
 * It is written once so that what the patient prints and what the doctor reads are
 * the same thing, section for section -- there is no second layout to drift.
 */

const SECTION_TITLE = {
    allergies: "Allergies",
    problems: "Conditions and problems",
    medications: "Medicines",
    immunizations: "Immunisations",
    results: "Test results",
    visits: "Visits",
    care_team: "Doctor",
};

const val = (v) => (v === null || v === undefined || v === "" ? "" : String(v));

const table = (headers, rows) => `<table class="rp-tbl">
    <thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
</table>`;

const empty = (what) => `<p class="rp-empty">Nothing recorded under ${esc(what)}.</p>`;

function sectionBody(key, rows) {
    if (!rows || !rows.length) return empty(SECTION_TITLE[key] || key);

    switch (key) {
        case "allergies":
            return table(["Allergy", "Reaction", "Severity", "Since"], rows.map((r) => [
                esc(val(r.name)), esc(val(r.reaction)), esc(val(r.severity)), esc(dayLabel(r.begin_date)),
            ]));

        case "problems":
            return table(["Problem", "Status", "Since", "Until"], rows.map((r) => [
                esc(val(r.title)), esc(val(r.outcome || r.verification_status)),
                esc(dayLabel(r.begin_date)), esc(dayLabel(r.end_date)),
            ]));

        case "medications":
            return table(["Medicine", "How it is taken", "Started", "Stopped"], rows.map((r) => [
                esc(val(r.title)), esc(val(r.medication_usage)),
                esc(dayLabel(r.begin_date)), esc(dayLabel(r.end_date)),
            ]));

        case "immunizations":
            return table(["Vaccine", "Given", "Dose", "Given by"], rows.map((r) => [
                esc(val(r.vaccine_name)), esc(dayLabel(r.administered_at)),
                esc([r.amount_administered, r.amount_unit].filter(Boolean).join(" ")),
                esc(val(r.administered_by_provider_name || r.administered_by)),
            ]));

        case "care_team":
            return table(["Doctor", "Specialty", "Department"], rows.map((r) => [
                esc([r.first_name, r.last_name].filter(Boolean).join(" ")), esc(val(r.specialty)), esc(val(r.department_name)),
            ]));

        case "visits":
            return table(["When", "Visit", "Where", "Doctor", "Reason"], rows.map((r) => [
                esc(dayLabel(r.when)), esc(val(r.title)),
                esc([r.facility, r.department].filter(Boolean).join(" · ")),
                esc(val(r.doctor)), esc(val(r.reason)),
            ]));

        case "results":
            return rows.map((o) => `<div class="rp-result">
                <h4>${esc(val(o.test_name))} <span class="rp-when">${esc(when(o.resulted_at || o.collected_at))}</span></h4>
                ${(o.results || []).length
                    ? table(["Test", "Result", "Units", "Usual range"], (o.results || []).map((r) => [
                        esc(val(r.name)),
                        `${esc(val(r.value))}${Number(r.is_abnormal) ? ' <span class="rp-abn">outside the usual range</span>' : ""}`,
                        esc(val(r.units)), esc(val(r.reference_range)),
                    ]))
                    : ""}
                ${o.report?.findings ? `<p class="rp-para"><b>Findings.</b> ${esc(o.report.findings)}</p>` : ""}
                ${o.report?.impression ? `<p class="rp-para"><b>Impression.</b> ${esc(o.report.impression)}</p>` : ""}
            </div>`).join("");
    }

    return "";
}

/** The pack as page content: a heading per shared section, in the order they were chosen. */
export function recordPackBody(data, { note = "" } = {}) {
    const p = data.patient || {};
    const scope = data.scope || [];

    return `
        <div class="rp-head">
            <h1>${esc(p.name || "Health record")}</h1>
            <p class="rp-ident">
                ${p.patient_no ? `Hospital number ${esc(p.patient_no)}` : ""}
                ${p.birthdate ? ` · Born ${esc(dayLabel(p.birthdate))}` : ""}
                ${p.sex ? ` · ${esc(p.sex)}` : ""}
                ${p.blood_type ? ` · Blood type ${esc(p.blood_type)}` : ""}
            </p>
            <p class="rp-ident">Prepared ${esc(when(data.prepared_at))}${
                data.expires_at ? ` · this page stops working on ${esc(dayLabel(data.expires_at))}` : ""}</p>
            ${note ? `<p class="rp-note">${esc(note)}</p>` : ""}
        </div>
        ${scope.length
            ? scope.map((key) => `<section class="rp-sec">
                <h2>${esc(SECTION_TITLE[key] || key)}</h2>
                ${sectionBody(key, data[key])}
            </section>`).join("")
            : `<p class="rp-empty">Nothing was included in this record.</p>`}
        <p class="rp-foot">This is a part of the patient's record, shared by the patient. It is not the whole chart.</p>`;
}

export const RECORD_PACK_CSS = `
.rp { max-width: 900px; margin: 0 auto; padding: 24px; color: #1c2534; font: 14px/1.5 system-ui, -apple-system, "Segoe UI", Arial, sans-serif; }
.rp-head h1 { margin: 0 0 4px; font-size: 22px; }
.rp-ident { margin: 0; color: #64748b; font-size: 13px; }
.rp-note { margin: 10px 0 0; padding: 8px 10px; border-left: 3px solid #1d4ed8; background: #f8fafc; font-size: 13px; }
.rp-sec { margin-top: 22px; page-break-inside: avoid; }
.rp-sec h2 { font-size: 15px; margin: 0 0 6px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; letter-spacing: .04em; color: #475569; }
.rp-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.rp-tbl th { text-align: left; padding: 6px 8px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
.rp-tbl td { padding: 6px 8px; border-bottom: 1px solid #eef2f7; vertical-align: top; }
.rp-empty { color: #64748b; font-size: 13px; margin: 4px 0; }
.rp-result { margin-bottom: 14px; }
.rp-result h4 { margin: 0 0 4px; font-size: 14px; }
.rp-when { color: #64748b; font-weight: 400; font-size: 12.5px; }
.rp-abn { color: #b45309; font-size: 12px; }
.rp-para { margin: 6px 0 0; white-space: pre-wrap; font-size: 13px; }
.rp-foot { margin-top: 26px; padding-top: 10px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; }
@media print { .rp { padding: 0; } .rp-noprint { display: none; } }
`;

/** A whole standalone document, for the print window. */
export function recordPackDocument(data, { title = "Health record", note = "" } = {}) {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>${esc(title)}</title><style>${RECORD_PACK_CSS}</style></head>
<body><div class="rp">${recordPackBody(data, { note })}</div></body></html>`;
}
