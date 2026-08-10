import { fetchCodes } from "../codes/codes.service.js";
import { CODE_TYPES } from "../codes/codes.constants.js";

let onSelectCallback = null;
let searchDebounce = null;
let wired = false;

/**
 * Open the shared code-picker modal, searching the real Codes catalog
 * (the same data the "Codes" admin module manages). Calls onSelect with
 * {code, description} when a row is picked, then closes the modal.
 */
export function openCodePicker({ defaultType = "ICD10", onSelect })
{
    onSelectCallback = onSelect;

    wireOnce();

    const typeSelect = document.getElementById("codePickerType");
    const searchInput = document.getElementById("codePickerSearch");

    typeSelect.value = defaultType;
    searchInput.value = "";

    document.getElementById("codePickerModalOverlay").classList.add("open");

    runSearch();
}

function wireOnce()
{
    if (wired) {
        return;
    }

    wired = true;

    const overlay = document.getElementById("codePickerModalOverlay");
    const typeSelect = document.getElementById("codePickerType");
    const searchInput = document.getElementById("codePickerSearch");
    const searchBtn = document.getElementById("codePickerSearchBtn");
    const clearBtn = document.getElementById("codePickerClearBtn");
    const closeBtn = document.getElementById("closeCodePickerModal");

    typeSelect.innerHTML = CODE_TYPES.map((type) =>
        `<option value="${type.value}">${escapeHtml(type.label)}</option>`
    ).join("");

    closeBtn.addEventListener("click", closeModal);
    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
            closeModal();
        }
    });

    typeSelect.addEventListener("change", runSearch);

    searchBtn.addEventListener("click", runSearch);

    clearBtn.addEventListener("click", () => {
        searchInput.value = "";
        runSearch();
    });

    searchInput.addEventListener("input", () => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(runSearch, 300);
    });

    searchInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            clearTimeout(searchDebounce);
            runSearch();
        }
    });
}

async function runSearch()
{
    const type = document.getElementById("codePickerType").value;
    const search = document.getElementById("codePickerSearch").value.trim();
    const tbody = document.getElementById("codePickerTableBody");

    tbody.innerHTML = `<tr><td colspan="2" class="code-picker-status">Searching...</td></tr>`;

    const result = await fetchCodes({ type, search, perPage: 50 });

    if (!result.success) {
        tbody.innerHTML = `<tr><td colspan="2" class="code-picker-status">Failed to load codes.</td></tr>`;
        return;
    }

    const items = result.data?.items || [];

    if (!items.length) {
        tbody.innerHTML = `<tr><td colspan="2" class="code-picker-status">No matching codes.</td></tr>`;
        return;
    }

    tbody.innerHTML = items.map((item) => `
        <tr data-code="${escapeHtml(item.code)}" data-description="${escapeHtml(item.description)}" data-code-type="${escapeHtml(item.code_type || type)}" data-fee="${item.fee_standard ?? ""}">
            <td>${escapeHtml(item.code)}</td>
            <td>${escapeHtml(item.short_description || item.description)}</td>
        </tr>
    `).join("");

    tbody.querySelectorAll("tr[data-code]").forEach((row) => {
        row.addEventListener("click", () => {
            if (onSelectCallback) {
                const feeRaw = row.getAttribute("data-fee");

                onSelectCallback({
                    code: row.getAttribute("data-code"),
                    description: row.getAttribute("data-description"),
                    code_type: row.getAttribute("data-code-type"),
                    fee: feeRaw ? feeRaw : null
                });
            }

            closeModal();
        });
    });
}

function closeModal()
{
    document.getElementById("codePickerModalOverlay").classList.remove("open");
    onSelectCallback = null;
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}
