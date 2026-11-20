import {
    loadBusinessModules,
    saveBusinessModules,
    applyBusinessModulePreset
} from "../../core/business-modules.js?v=1";
import { showToast } from "../../core/toast.js";

let serverModules = [];
let draftStates = new Map();
let presets = [];
let activeCategory = "All";
let searchTerm = "";

export async function initManageModules() {
    const grid = document.getElementById("bmModulesGrid");
    if (!grid) return;

    grid.innerHTML = `<div class="bm-loading">Loading business modules...</div>`;

    const { modules, presets: loadedPresets } = await loadBusinessModules(true);
    serverModules = modules || [];
    presets = loadedPresets || [];
    activeCategory = "All";
    searchTerm = "";

    resetDraftFromServer();
    renderPresets();
    renderCategoryPills();
    bindToolbarEvents();
    renderAll();
}

function resetDraftFromServer() {
    draftStates = new Map();
    for (const m of serverModules) {
        draftStates.set(m.module_key, m.is_core ? true : Boolean(m.is_enabled));
    }
}

function getPendingChangeCount() {
    let count = 0;
    for (const m of serverModules) {
        if (m.is_core) continue;
        const orig = Boolean(m.is_enabled);
        const cur = Boolean(draftStates.get(m.module_key));
        if (orig !== cur) count++;
    }
    return count;
}

function updateKpisAndButtons() {
    const total = serverModules.length;
    let enabled = 0;
    let core = 0;

    for (const m of serverModules) {
        if (m.is_core) core++;
        if (m.is_core || draftStates.get(m.module_key)) enabled++;
    }

    const disabled = total - enabled;
    const pending = getPendingChangeCount();

    const elEnabled = document.getElementById("bmKpiEnabled");
    const elDisabled = document.getElementById("bmKpiDisabled");
    const elCore = document.getElementById("bmKpiCore");
    const elTotal = document.getElementById("bmKpiTotal");

    if (elEnabled) elEnabled.textContent = String(enabled);
    if (elDisabled) elDisabled.textContent = String(disabled);
    if (elCore) elCore.textContent = String(core);
    if (elTotal) elTotal.textContent = String(total);

    const saveBtn = document.getElementById("bmSaveBtn");
    const resetBtn = document.getElementById("bmResetBtn");
    const banner = document.getElementById("bmUnsavedBanner");
    const bannerText = document.getElementById("bmUnsavedText");

    if (saveBtn) saveBtn.disabled = pending === 0;
    if (resetBtn) resetBtn.disabled = pending === 0;
    if (banner) banner.style.display = pending > 0 ? "flex" : "none";
    if (bannerText) {
        bannerText.textContent = pending === 1
            ? "1 module access change pending."
            : `${pending} module access changes pending.`;
    }
}

function renderPresets() {
    const list = document.getElementById("bmPresetsList");
    if (!list) return;

    if (!presets.length) {
        list.innerHTML = `<span style="font-size: 12px; color: var(--text-muted);">No presets configured.</span>`;
        return;
    }

    list.innerHTML = presets.map((p) => `
        <button type="button" class="bm-preset-btn" data-preset-key="${escapeHtml(p.key)}">
            ${escapeHtml(p.label)}
        </button>
    `).join("");

    list.querySelectorAll(".bm-preset-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const key = btn.getAttribute("data-preset-key");
            const label = btn.textContent.trim();
            if (!key) return;

            btn.disabled = true;
            try {
                const res = await applyBusinessModulePreset(key);
                if (res && res.success) {
                    serverModules = res.data?.modules || [];
                    resetDraftFromServer();
                    renderAll();
                    showToast(`Applied "${label}" profile. Navigation updated.`, "success");
                } else {
                    showToast(res?.message || "Failed to apply business profile.", "error");
                }
            } finally {
                btn.disabled = false;
            }
        });
    });
}

function renderCategoryPills() {
    const container = document.getElementById("bmCategoryPills");
    if (!container) return;

    const categories = ["All", ...new Set(serverModules.map((m) => m.category))];
    container.innerHTML = categories.map((cat) => `
        <button type="button" class="bm-cat-pill${cat === activeCategory ? " is-active" : ""}" data-cat="${escapeHtml(cat)}">
            ${escapeHtml(cat)}
        </button>
    `).join("");

    container.querySelectorAll(".bm-cat-pill").forEach((pill) => {
        pill.addEventListener("click", () => {
            activeCategory = pill.getAttribute("data-cat") || "All";
            container.querySelectorAll(".bm-cat-pill").forEach((p) => {
                p.classList.toggle("is-active", p === pill);
            });
            renderGrid();
        });
    });
}

function bindToolbarEvents() {
    const searchInput = document.getElementById("bmSearchInput");
    if (searchInput && !searchInput.dataset.bound) {
        searchInput.dataset.bound = "1";
        searchInput.addEventListener("input", () => {
            searchTerm = searchInput.value.trim().toLowerCase();
            renderGrid();
        });
    }

    const handleReset = () => {
        resetDraftFromServer();
        renderAll();
    };

    const handleSave = async () => {
        const saveBtn = document.getElementById("bmSaveBtn");
        const bannerSaveBtn = document.getElementById("bmBannerSaveBtn");
        if (saveBtn) saveBtn.disabled = true;
        if (bannerSaveBtn) bannerSaveBtn.disabled = true;

        const payload = {};
        for (const [key, val] of draftStates.entries()) {
            payload[key] = Boolean(val);
        }

        try {
            const res = await saveBusinessModules(payload);
            if (res && res.success) {
                serverModules = res.data?.modules || serverModules;
                resetDraftFromServer();
                renderAll();
                showToast("Business module access saved and applied.", "success");
            } else {
                showToast(res?.message || "Failed to save module access.", "error");
                updateKpisAndButtons();
            }
        } finally {
            if (bannerSaveBtn) bannerSaveBtn.disabled = false;
        }
    };

    const resetBtn = document.getElementById("bmResetBtn");
    const bannerResetBtn = document.getElementById("bmBannerResetBtn");
    const saveBtn = document.getElementById("bmSaveBtn");
    const bannerSaveBtn = document.getElementById("bmBannerSaveBtn");

    if (resetBtn) resetBtn.onclick = handleReset;
    if (bannerResetBtn) bannerResetBtn.onclick = handleReset;
    if (saveBtn) saveBtn.onclick = handleSave;
    if (bannerSaveBtn) bannerSaveBtn.onclick = handleSave;
}

function renderAll() {
    updateKpisAndButtons();
    renderGrid();
}

function renderGrid() {
    const grid = document.getElementById("bmModulesGrid");
    if (!grid) return;

    const filtered = serverModules.filter((m) => {
        if (activeCategory !== "All" && m.category !== activeCategory) return false;
        if (searchTerm) {
            const hay = `${m.name} ${m.category} ${m.description || ""} ${m.module_key}`.toLowerCase();
            return hay.includes(searchTerm);
        }
        return true;
    });

    if (!filtered.length) {
        grid.innerHTML = `<div class="bm-empty">No modules match your filter.</div>`;
        return;
    }

    grid.innerHTML = filtered.map((m) => {
        const isEnabled = m.is_core ? true : Boolean(draftStates.get(m.module_key));
        const isChanged = !m.is_core && Boolean(m.is_enabled) !== isEnabled;

        return `
            <div class="bm-card${isEnabled ? " is-enabled" : " is-disabled"}${isChanged ? " is-changed" : ""}" data-module-card="${escapeHtml(m.module_key)}">
                <div class="bm-card-top">
                    <div class="bm-card-meta">
                        <span class="bm-card-category">${escapeHtml(m.category)}</span>
                        ${m.is_core ? `<span class="bm-badge bm-badge-core">Core · Always On</span>` : ""}
                        ${isChanged ? `<span class="bm-badge bm-badge-changed">Modified</span>` : ""}
                    </div>
                    <label class="bm-switch${m.is_core ? " is-locked" : ""}" title="${m.is_core ? "Core platform module cannot be disabled" : "Toggle module access"}">
                        <input type="checkbox" class="bm-toggle" data-module-key="${escapeHtml(m.module_key)}" ${isEnabled ? "checked" : ""} ${m.is_core ? "disabled" : ""}>
                        <span class="bm-slider"></span>
                    </label>
                </div>
                <h3 class="bm-card-title">${escapeHtml(m.name)}</h3>
                <p class="bm-card-desc">${escapeHtml(m.description || "")}</p>
                <div class="bm-card-footer">
                    <span class="bm-status-dot ${isEnabled ? "is-on" : "is-off"}"></span>
                    <span class="bm-status-text">${isEnabled ? "Accessible by this business" : "Disabled — hidden from users"}</span>
                </div>
            </div>
        `;
    }).join("");

    grid.querySelectorAll(".bm-toggle").forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
            const key = checkbox.getAttribute("data-module-key");
            if (!key) return;
            draftStates.set(key, checkbox.checked);
            renderAll();
        });
    });
}

function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
