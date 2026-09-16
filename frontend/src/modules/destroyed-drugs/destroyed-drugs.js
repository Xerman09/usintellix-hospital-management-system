import { fetchDestroyedDrugs } from "./destroyed-drugs.service.js";

let allRows = [];
let filteredRows = [];
let currentPage = 1;
let pageSize = 10;
let searchTerm = "";

export async function initDestroyedDrugs() {
    const today = new Date();
    const yearStart = new Date(today.getFullYear(), 0, 1);

    document.getElementById("ddFrom").value = toDateInput(yearStart);
    document.getElementById("ddTo").value = toDateInput(today);

    document.getElementById("ddRefreshBtn").addEventListener("click", loadDestroyedDrugs);
    document.getElementById("ddPrintBtn").addEventListener("click", () => window.print());

    document.getElementById("ddPageSize").addEventListener("change", (event) => {
        pageSize = Number(event.target.value);
        currentPage = 1;
        render();
    });

    document.getElementById("ddSearchInput").addEventListener("input", (event) => {
        searchTerm = event.target.value.trim().toLowerCase();
        currentPage = 1;
        applySearch();
        render();
    });

    await loadDestroyedDrugs();
}

async function loadDestroyedDrugs() {
    const tbody = document.getElementById("ddTableBody");
    tbody.innerHTML = `<tr><td colspan="8" class="dd-empty-state">Loading...</td></tr>`;

    const result = await fetchDestroyedDrugs({
        from: document.getElementById("ddFrom").value,
        to: document.getElementById("ddTo").value
    });

    if (!result.success) {
        tbody.innerHTML = `<tr><td colspan="8" class="dd-empty-state">Failed to load destroyed drugs.</td></tr>`;
        return;
    }

    allRows = result.data || [];
    currentPage = 1;
    applySearch();
    render();
}

function applySearch() {
    filteredRows = !searchTerm ? allRows : allRows.filter((row) => [
        row.drug_name, row.ndc, row.lot_number, row.method, row.witness, row.notes
    ].some((field) => (field || "").toLowerCase().includes(searchTerm)));
}

function render() {
    const total = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * pageSize;
    const pageRows = filteredRows.slice(start, start + pageSize);

    renderTable(pageRows);
    renderFooter(total, start, pageRows.length);
    renderPagination(totalPages);
}

function renderTable(rows) {
    const tbody = document.getElementById("ddTableBody");

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="8" class="dd-empty-state">No data available in table</td></tr>`;
        return;
    }

    tbody.innerHTML = rows.map((row) => `
        <tr>
            <td class="dd-drug-name">${escapeHtml(row.drug_name)}</td>
            <td>${escapeHtml(row.ndc || "-")}</td>
            <td>${escapeHtml(row.lot_number)}</td>
            <td>${formatQuantity(row.quantity)}</td>
            <td>${formatDate(row.destroyed_date)}</td>
            <td>${escapeHtml(row.method || "-")}</td>
            <td>${escapeHtml(row.witness || "-")}</td>
            <td>${escapeHtml(row.notes || "-")}</td>
        </tr>
    `).join("");
}

function renderFooter(total, start, shown) {
    document.getElementById("ddFooterInfo").textContent = total
        ? `Showing ${start + 1} to ${start + shown} of ${total} entries`
        : "Showing 0 to 0 of 0 entries";
}

function renderPagination(totalPages) {
    const wrap = document.getElementById("ddPagination");

    let html = `<button type="button" class="dd-page-btn" id="ddPrevPage" ${currentPage === 1 ? "disabled" : ""}>Previous</button>`;

    for (let p = 1; p <= totalPages; p++) {
        html += `<button type="button" class="dd-page-btn ${p === currentPage ? "active" : ""}" data-page="${p}">${p}</button>`;
    }

    html += `<button type="button" class="dd-page-btn" id="ddNextPage" ${currentPage === totalPages ? "disabled" : ""}>Next</button>`;

    wrap.innerHTML = html;

    wrap.querySelectorAll("[data-page]").forEach((btn) => {
        btn.addEventListener("click", () => { currentPage = Number(btn.getAttribute("data-page")); render(); });
    });

    document.getElementById("ddPrevPage")?.addEventListener("click", () => { currentPage--; render(); });
    document.getElementById("ddNextPage")?.addEventListener("click", () => { currentPage++; render(); });
}

function toDateInput(date) {
    return date.toISOString().slice(0, 10);
}

function formatQuantity(value) {
    const num = Number(value);
    return Number.isInteger(num) ? String(num) : num.toFixed(3).replace(/\.?0+$/, "");
}

function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-GB");
}

function escapeHtml(value) {
    if (value == null) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
