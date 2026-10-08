import { api } from "../../core/api.js?v=5";
import { showToast } from "../../core/toast.js";

/*
 * Print the day's OR list (module 9, Phase 4): time, room, surgeon, anesthesiologist,
 * specialization, with the case number, procedure and patient initials for the staff.
 * One room or all rooms. Opens a print window.
 */

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const t12 = (hhmm) => {
    if (!hhmm) return "";
    const [h, m] = String(hhmm).split(":").map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

export async function printOrList(date, suiteId = "") {
    const win = window.open("", "_blank");
    if (!win) {
        showToast("Pop-up blocked. Allow pop-ups for this site to print.", "error");
        return;
    }
    win.document.write(`<p style="font-family:Arial;padding:20px;">Preparing the OR list…</p>`);
    const q = new URLSearchParams({ date: date || "" });
    if (suiteId) q.set("suite_id", suiteId);
    const res = await api(`/or-list?${q}`).catch(() => null);
    if (!res?.success) {
        win.close();
        showToast(res?.message || "Couldn't load the OR list.", "error");
        return;
    }
    win.document.open();
    win.document.write(orListHtml(res.data));
    win.document.close();
}

export function orListHtml(d) {
    const day = new Date(`${d.date}T00:00:00Z`).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
    const rows = d.cases.map((c) => `<tr class="${c.cancelled ? "cx" : ""}">
        <td class="nw">${esc(t12(c.start))}–${esc(t12(c.end))}</td>
        ${d.suite ? "" : `<td>${esc(c.suite || "—")}</td>`}
        <td>${esc(c.surgeon || "—")}${c.assistant ? `<div class="s">Asst: ${esc(c.assistant)}</div>` : ""}</td>
        <td>${esc(c.anesthesiologist || "—")}${c.anesthesia_type ? `<div class="s">${esc(c.anesthesia_type)}</div>` : ""}</td>
        <td>${esc(c.specialization || "—")}</td>
        <td>${esc(c.procedure || "")}<div class="s">${esc(c.case_number)} · ${esc(c.initials)}${c.priority && c.priority !== "Elective" ? ` · <b>${esc(c.priority)}</b>` : ""}</div></td>
        <td>${c.cancelled ? `<b>Cancelled</b>${c.cancellation_reason ? `<div class="s">${esc(c.cancellation_reason)}</div>` : ""}` : esc(c.stage_label)}</td>
    </tr>`).join("");
    return `<!doctype html><html><head><meta charset="utf-8"><title>OR list ${esc(d.date)}</title>
<style>
    @page { size: A4 landscape; margin: 12mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; font-size: 11pt; }
    header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #111; padding-bottom: 6px; margin-bottom: 10px; }
    h1 { margin: 0; font-size: 18pt; }
    .sub { color: #444; font-size: 10pt; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 9pt; text-transform: uppercase; letter-spacing: .03em; border-bottom: 1.5px solid #111; padding: 5px 6px; }
    td { border-bottom: 1px solid #bbb; padding: 6px; vertical-align: top; }
    tr { page-break-inside: avoid; }
    .nw { white-space: nowrap; font-weight: bold; }
    .s { color: #555; font-size: 9pt; margin-top: 2px; }
    .cx td { color: #777; text-decoration: line-through; }
    .cx td:last-child { text-decoration: none; }
    footer { margin-top: 10px; font-size: 9pt; color: #555; display: flex; justify-content: space-between; }
    .bar { margin: 0 0 12px; } .bar button { font: inherit; padding: 6px 14px; }
    @media print { .bar { display: none; } }
</style></head><body>
<div class="bar"><button type="button" onclick="window.print()">Print</button></div>
<header><div><h1>OR list — ${esc(day)}</h1><div class="sub">${esc(d.hospital?.name || "")}${d.suite ? ` · ${esc(d.suite)}` : " · All operating rooms"}</div></div>
    <div class="sub">${d.counts.total} case${d.counts.total === 1 ? "" : "s"}${d.counts.cancelled ? ` · ${d.counts.cancelled} cancelled` : ""}</div></header>
${d.cases.length ? `<table><thead><tr><th>Time</th>${d.suite ? "" : "<th>Room</th>"}<th>Surgeon</th><th>Anesthesiologist</th><th>Specialization</th><th>Procedure</th><th>Status</th></tr></thead>
<tbody>${rows}</tbody></table>` : `<p>No cases scheduled.</p>`}
<footer><span>Printed ${esc(String(d.printed_at).slice(0, 16))}</span><span>Confidential — for staff use</span></footer>
</body></html>`;
}
