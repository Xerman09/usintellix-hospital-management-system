import { fetchSurgeryRequests } from "./surgery-requests.service.js?v=1";
import { openSurgeryRequest, priorityBadge, statusBadge, ensureRoot } from "./surgery-request-panel.js?v=1";
import { fetchSpecializations } from "../specializations/specializations.service.js?v=1";

let view = "open";
let searchTimer = null;

const $ = (id) => document.getElementById(id);
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDate = (iso) => {
    if (!iso) return "";
    const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export async function initSurgeryRequests() {
    view = "open";
    ensureRoot();

    $("srwTabs").querySelectorAll("[data-srw-view]").forEach((b) => b.addEventListener("click", () => {
        view = b.dataset.srwView;
        $("srwTabs").querySelectorAll("[data-srw-view]").forEach((x) => x.classList.toggle("active", x === b));
        load();
    }));
    $("srwSpec").addEventListener("change", load);
    $("srwSearch").addEventListener("input", () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(load, 300);
    });
    $("srwBody").addEventListener("click", (e) => {
        const row = e.target.closest("[data-srw-open]");
        if (row) openSurgeryRequest(Number(row.dataset.srwOpen), { onChange: load });
    });
    $("srwBody").addEventListener("keydown", (e) => {
        const row = e.target.closest("[data-srw-open]");
        if (row && e.key === "Enter") openSurgeryRequest(Number(row.dataset.srwOpen), { onChange: load });
    });

    const specs = await fetchSpecializations({ category: "" });
    if (specs?.success) {
        $("srwSpec").innerHTML = `<option value="">All specializations</option>` + specs.data.rows
            .filter((s) => s.category === "surgical" || s.surgery_count > 0)
            .map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join("");
    }

    await load();
}

async function load() {
    const result = await fetchSurgeryRequests({ view, specialization_id: $("srwSpec").value, q: $("srwSearch").value.trim() });
    if (!result?.success) {
        $("srwBody").innerHTML = `<div class="ss-empty">${esc(result?.message || "Couldn't load the requests.")}</div>`;
        return;
    }

    const { rows, counts } = result.data;
    const setCount = (el, n) => { el.hidden = !n; el.textContent = n; };
    setCount($("srwCountOpen"), counts.open);
    setCount($("srwCountReady"), counts.ready);

    const empty = {
        open: "No surgery requests are being planned.", ready: "Nothing is waiting to be scheduled.", scheduled: "No scheduled requests.",
        cancelled: "No cancelled requests.", all: "No surgery requests yet. Doctors request surgery from the patient's chart."
    }[view];

    $("srwBody").innerHTML = rows.length ? `
        <div class="ss-table-wrap"><table class="ss-table">
            <thead><tr><th>Request</th><th>Patient</th><th>Surgery</th><th>Surgeon</th><th>Preferred</th><th>Readiness</th><th>Status</th></tr></thead>
            <tbody>${rows.map((r) => {
                const pct = r.readiness_total ? Math.round(r.readiness_done * 100 / r.readiness_total) : 100;
                return `
                <tr class="srw-click" data-srw-open="${r.id}" tabindex="0" title="Open the request">
                    <td style="white-space:nowrap;"><strong>${esc(r.request_number)}</strong><span class="ss-sub">${esc(fmtDate(r.created_at))}</span></td>
                    <td><strong>${esc(r.patient_name)}</strong><span class="ss-sub">${esc(r.patient_no || "")}</span></td>
                    <td>${esc(r.procedure_name)}${r.laterality ? ` <span class="ss-sub" style="display:inline;">(${esc(r.laterality)})</span>` : ""}
                        <span class="ss-sub">${esc(r.specialization_name || "")}${r.diagnosis ? ` · ${esc(r.diagnosis)}` : ""}</span></td>
                    <td>${esc(r.surgeon_name || "—")}</td>
                    <td style="white-space:nowrap;">${r.preferred_date ? esc(fmtDate(r.preferred_date)) : "Any"}</td>
                    <td><div class="srw-progress"><div class="srw-bar"><span style="width:${pct}%"></span></div><span class="ss-sub" style="margin:0;">${r.readiness_done}/${r.readiness_total}</span></div></td>
                    <td>${statusBadge(r)} ${r.priority !== "Elective" ? priorityBadge(r.priority) : ""}</td>
                </tr>`;
            }).join("")}</tbody>
        </table></div>` : `<div class="ss-empty">${esc(empty)}</div>`;
}
