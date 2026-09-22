import { getUser } from "../../core/session.js";
import { fetchPatients } from "./patients.service.js";
import { openPatientChartTab, initPatientsList } from "./patients-list.js?v=65";
import { PatientsListView } from "./patients-list.view.js?v=65";
import { consumePendingFinderSearch } from "../../core/pending-finder-search.js";
import { setPendingPatientView } from "../../core/pending-patient-view.js";
import { getRecentPatients } from "../../core/recent-patients.js";

let finderPatientsCache = [];
let currentPage = 1;
let sortKey = null;
let sortDir = "asc";

export async function initPatientFinder()
{
    const user = getUser();

    if (!user || !["admin", "receptionist", "doctor"].includes(user.role)) {
        window.location.hash = "#/dashboard";
        return;
    }

    const pageRoot = document.querySelector(".fnd-page");

    if (!pageRoot || pageRoot.dataset.wired === "true") {
        return;
    }

    pageRoot.dataset.wired = "true";

    const result = await fetchPatients();
    finderPatientsCache = result.success ? result.data : [];

    wireTabs();
    wireListControls();

    const pendingTerm = consumePendingFinderSearch();
    if (pendingTerm) {
        document.getElementById("fndGlobalSearch").value = pendingTerm;
    }

    currentPage = 1;
    renderList();
}

function wireTabs()
{
    const tabList = document.getElementById("fndTabList");
    const tabRecent = document.getElementById("fndTabRecent");
    const panelList = document.getElementById("fndListPanel");
    const panelRecent = document.getElementById("fndRecentPanel");

    tabList.addEventListener("click", () => {
        tabList.classList.add("active");
        tabRecent.classList.remove("active");
        panelList.style.display = "";
        panelRecent.style.display = "none";
    });

    tabRecent.addEventListener("click", () => {
        tabRecent.classList.add("active");
        tabList.classList.remove("active");
        panelList.style.display = "none";
        panelRecent.style.display = "";
        renderRecent();
    });
}

function wireListControls()
{
    ["fndFilterName", "fndFilterPhone", "fndFilterSsn", "fndFilterDob", "fndFilterExternal", "fndGlobalSearch"].forEach((id) => {
        document.getElementById(id).addEventListener("input", () => {
            currentPage = 1;
            renderList();
        });
    });

    document.getElementById("fndExactMethod").addEventListener("change", () => {
        currentPage = 1;
        renderList();
    });

    document.getElementById("fndPageSize").addEventListener("change", () => {
        currentPage = 1;
        renderList();
    });

    document.getElementById("fndPrevBtn").addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            renderList();
        }
    });

    document.getElementById("fndNextBtn").addEventListener("click", () => {
        currentPage++;
        renderList();
    });

    document.querySelectorAll(".fnd-header-row th[data-sort-key]").forEach((th) => {
        th.addEventListener("click", () => {
            const key = th.getAttribute("data-sort-key");
            if (sortKey === key) {
                sortDir = sortDir === "asc" ? "desc" : "asc";
            } else {
                sortKey = key;
                sortDir = "asc";
            }
            renderList();
        });
    });

    document.getElementById("fndFocusSearchBtn").addEventListener("click", () => {
        document.getElementById("fndGlobalSearch").focus();
    });

    document.getElementById("fndAddPatientBtn").addEventListener("click", openAddPatientFromFinder);
}

function patientRowData(patient)
{
    return {
        patient,
        name: [patient.first_name, patient.middle_name, patient.last_name, patient.suffix].filter(Boolean).join(" "),
        phone: patient.contact_home_phone || "",
        ssn: patient.ssn || "",
        dob: patient.birthdate ? String(patient.birthdate).slice(0, 10) : "",
        external: patient.national_id || ""
    };
}

function matchesField(fieldValue, filterValue, exact)
{
    if (!filterValue) return true;
    if (!fieldValue) return false;

    return exact
        ? fieldValue.toLowerCase() === filterValue.toLowerCase()
        : fieldValue.toLowerCase().includes(filterValue.toLowerCase());
}

function getFilteredRows()
{
    const nameFilter = document.getElementById("fndFilterName").value.trim();
    const phoneFilter = document.getElementById("fndFilterPhone").value.trim();
    const ssnFilter = document.getElementById("fndFilterSsn").value.trim();
    const dobFilter = document.getElementById("fndFilterDob").value.trim();
    const externalFilter = document.getElementById("fndFilterExternal").value.trim();
    const globalTerm = document.getElementById("fndGlobalSearch").value.trim();
    const exact = document.getElementById("fndExactMethod").checked;

    const hasAnyFilter = !!(nameFilter || phoneFilter || ssnFilter || dobFilter || externalFilter || globalTerm);

    const rows = finderPatientsCache.map(patientRowData).filter((row) => {
        if (!matchesField(row.name, nameFilter, exact)) return false;
        if (!matchesField(row.phone, phoneFilter, exact)) return false;
        if (!matchesField(row.ssn, ssnFilter, exact)) return false;
        if (!matchesField(row.dob, dobFilter, exact)) return false;
        if (!matchesField(row.external, externalFilter, exact)) return false;

        if (globalTerm) {
            const haystack = [row.name, row.phone, row.dob, row.patient.patient_no].filter(Boolean).join(" ").toLowerCase();
            const needle = globalTerm.toLowerCase();
            const isMatch = exact ? haystack === needle : haystack.includes(needle);
            if (!isMatch) return false;
        }

        return true;
    });

    if (sortKey) {
        rows.sort((a, b) => {
            const cmp = String(a[sortKey] || "").localeCompare(String(b[sortKey] || ""));
            return sortDir === "asc" ? cmp : -cmp;
        });
    }

    return { rows, hasAnyFilter };
}

function renderList()
{
    const { rows, hasAnyFilter } = getFilteredRows();
    const pageSize = parseInt(document.getElementById("fndPageSize").value, 10) || 10;
    const totalFiltered = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * pageSize;
    const pageRows = rows.slice(start, start + pageSize);

    updateSortIndicators();

    const tbody = document.getElementById("fndResultsBody");

    if (pageRows.length === 0) {
        tbody.innerHTML = `<tr class="fnd-empty-row"><td colspan="5">No matching records found</td></tr>`;
    } else {
        tbody.innerHTML = pageRows.map((row) => {
            const maskedSsn = row.ssn ? (row.ssn.replace(/\D/g, '').length === 9 ? '***-**-' + row.ssn.replace(/\D/g, '').slice(-4) : '***' + row.ssn.slice(-4)) : '';
            return `
            <tr class="fnd-row" data-patient-id="${row.patient.id}">
                <td class="fnd-name">${escapeHtml(row.name)}</td>
                <td>${row.phone ? escapeHtml(row.phone) : `<span class="fnd-muted">&mdash;</span>`}</td>
                <td>${maskedSsn ? `<code style="font-family: monospace; font-weight: 600;">${escapeHtml(maskedSsn)}</code>` : `<span class="fnd-muted">&mdash;</span>`}</td>
                <td>${row.dob ? escapeHtml(row.dob) : `<span class="fnd-muted">&mdash;</span>`}</td>
                <td>${row.external ? escapeHtml(row.external) : `<span class="fnd-muted">&mdash;</span>`}</td>
            </tr>
        `;}).join("");

        tbody.querySelectorAll(".fnd-row").forEach((tr) => {
            tr.addEventListener("click", () => openPatientFromFinder(tr.getAttribute("data-patient-id")));
        });
    }

    const infoEl = document.getElementById("fndPaginationInfo");
    if (totalFiltered === 0) {
        infoEl.textContent = hasAnyFilter
            ? `Showing 0 to 0 of 0 entries (filtered from ${finderPatientsCache.length} total entries)`
            : "Showing 0 to 0 of 0 entries";
    } else {
        const shownFrom = start + 1;
        const shownTo = Math.min(start + pageSize, totalFiltered);
        infoEl.textContent = hasAnyFilter
            ? `Showing ${shownFrom} to ${shownTo} of ${totalFiltered} entries (filtered from ${finderPatientsCache.length} total entries)`
            : `Showing ${shownFrom} to ${shownTo} of ${totalFiltered} entries`;
    }

    document.getElementById("fndPrevBtn").disabled = currentPage <= 1;
    document.getElementById("fndNextBtn").disabled = currentPage >= totalPages;
}

function updateSortIndicators()
{
    document.querySelectorAll(".fnd-header-row th[data-sort-key]").forEach((th) => {
        const key = th.getAttribute("data-sort-key");
        const baseLabel = th.textContent.replace(/[▲▼]\s*$/, "").trim();
        th.textContent = baseLabel;

        if (sortKey === key) {
            const arrow = document.createElement("span");
            arrow.className = "fnd-sort-arrow";
            arrow.textContent = sortDir === "asc" ? "▲" : "▼";
            th.appendChild(arrow);
        }
    });
}

function renderRecent()
{
    const tbody = document.getElementById("fndRecentBody");
    const recents = getRecentPatients();

    if (recents.length === 0) {
        tbody.innerHTML = `<tr class="fnd-empty-row"><td colspan="4">No recently viewed patients yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = recents.map((patient) => {
        const name = [patient.first_name, patient.middle_name, patient.last_name, patient.suffix].filter(Boolean).join(" ");
        const dob = patient.birthdate ? String(patient.birthdate).slice(0, 10) : "";
        const viewedAt = patient.viewed_at ? new Date(patient.viewed_at).toLocaleString() : "";

        return `
            <tr class="fnd-row" data-patient-id="${patient.id}">
                <td class="fnd-name">${escapeHtml(name)}</td>
                <td>${patient.contact_home_phone ? escapeHtml(patient.contact_home_phone) : `<span class="fnd-muted">&mdash;</span>`}</td>
                <td>${dob ? escapeHtml(dob) : `<span class="fnd-muted">&mdash;</span>`}</td>
                <td class="fnd-muted">${escapeHtml(viewedAt)}</td>
            </tr>
        `;
    }).join("");

    tbody.querySelectorAll(".fnd-row").forEach((tr) => {
        tr.addEventListener("click", () => openPatientFromFinder(tr.getAttribute("data-patient-id")));
    });
}

function openPatientFromFinder(id)
{
    const patient = finderPatientsCache.find((p) => String(p.id) === id)
        || getRecentPatients().find((p) => String(p.id) === id);

    if (!patient) return;

    const openInNewTab = document.getElementById("fndOpenNewTab")?.checked;

    if (openInNewTab) {
        // Same cross-window hand-off dashboard.js already supports for a
        // brand-new tab/window: stash the patient, then let that window's
        // own dashboard bootstrap consume it (see pending-patient-view.js).
        setPendingPatientView(patient.patient_no);
        window.open(window.location.href, "_blank");
        return;
    }

    openPatientChartTab(patient);
}

async function openAddPatientFromFinder()
{
    const user = getUser();

    window.tabManager.openTab("patients", "Patients", () => {
        setTimeout(async () => {
            await initPatientsList();
            document.getElementById("openAddPatientModal")?.click();
        }, 0);
        return PatientsListView(user);
    });
}

function escapeHtml(value)
{
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
}
