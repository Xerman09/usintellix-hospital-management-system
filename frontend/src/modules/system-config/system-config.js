import { showToast } from "../../core/toast.js";
import { applyTabsLayoutTheme, applyGeneralTheme } from "../../core/appearance-settings.js";

const STORAGE_KEY = "systemConfig.appearance";

const APPEARANCE_FIELDS = [
    { id: "scTabsLayoutTheme", type: "value" },
    { id: "scGeneralTheme", type: "value" },
    { id: "scHiddenCards", type: "multiselect" },
    { id: "scAddPatientNameTitle", type: "checked" },
    { id: "scCompactMode", type: "checked" },
    { id: "scSearchByDemographics", type: "value" },
    { id: "scDefaultEncounterView", type: "value" },
    { id: "scEnableFeesSubmenu", type: "checked" },
    { id: "scEnableBatchPayment", type: "checked" },
    { id: "scEnablePosting", type: "checked" },
    { id: "scEnableEdiHistory", type: "checked" },
    { id: "scEncounterPageSize", type: "value" },
    { id: "scPatientListPageSize", type: "value" },
    { id: "scPatientListNewWindow", type: "checked" },
    { id: "scRightJustifyLabels", type: "checked" },
    { id: "scMessagesInSummary", type: "value" },
    { id: "scRecentPatientsMax", type: "value" },
    { id: "scVitalsFormOptions", type: "value" },
    { id: "scVitalsMaxColumns", type: "value" },
    { id: "scDropListSort", type: "value" },
    { id: "scPreventBrowserRefresh", type: "value" },
    { id: "scFormActionBarPosition", type: "value" }
];

export function initSystemConfig() {
    wireSidebarNavigation();
    wireCollapseToggle();
    wireSearch();
    wireSave();
    restoreAppearanceSettings();
}

function wireSidebarNavigation() {
    document.querySelectorAll(".sc-sidebar-item").forEach((link) => {
        link.addEventListener("click", (event) => {
            event.preventDefault();

            const category = link.getAttribute("data-category");

            document.querySelectorAll(".sc-sidebar-item").forEach((item) => item.classList.remove("active"));
            link.classList.add("active");

            document.querySelectorAll(".sc-panel").forEach((panel) => {
                panel.classList.toggle("active", panel.getAttribute("data-panel") === category);
            });

            document.getElementById("scContent").scrollTop = 0;

            const searchInput = document.getElementById("scSearchInput");
            if (searchInput) {
                searchInput.value = "";
                clearSearchFilter();
            }
        });
    });
}

function wireCollapseToggle() {
    document.getElementById("scCollapseBtn")?.addEventListener("click", () => {
        document.getElementById("scWrapper")?.classList.toggle("sc-collapsed");
    });
}

function wireSearch() {
    const runSearch = () => {
        const term = document.getElementById("scSearchInput")?.value.trim().toLowerCase() || "";
        const activePanel = document.querySelector(".sc-panel.active");

        if (!activePanel) return;

        activePanel.querySelectorAll(".sc-row").forEach((row) => {
            const label = row.querySelector("label")?.textContent.toLowerCase() || "";
            row.classList.toggle("sc-row-hidden", term !== "" && !label.includes(term));
        });
    };

    document.getElementById("scSearchBtn")?.addEventListener("click", runSearch);
    document.getElementById("scSearchInput")?.addEventListener("input", runSearch);
}

function clearSearchFilter() {
    document.querySelectorAll(".sc-row").forEach((row) => row.classList.remove("sc-row-hidden"));
}

function wireSave() {
    const save = () => {
        const settings = {};

        APPEARANCE_FIELDS.forEach((field) => {
            const el = document.getElementById(field.id);
            if (!el) return;

            if (field.type === "checked") {
                settings[field.id] = el.checked;
            } else if (field.type === "multiselect") {
                settings[field.id] = Array.from(el.selectedOptions).map((opt) => opt.value);
            } else {
                settings[field.id] = el.value;
            }
        });

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
            applyTabsLayoutTheme(settings.scTabsLayoutTheme);
            applyGeneralTheme(settings.scGeneralTheme);
            showToast("Appearance settings saved on this device. A shared, database-backed settings store hasn't been built yet -- these won't apply for other users or other browsers.", "success");
        } catch (error) {
            showToast("Failed to save settings.", "error");
        }
    };

    document.getElementById("scSaveTopBtn")?.addEventListener("click", save);
    document.querySelectorAll("[data-save-btn]").forEach((btn) => btn.addEventListener("click", save));
}

function restoreAppearanceSettings() {
    let settings;

    try {
        settings = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch (error) {
        settings = null;
    }

    if (!settings) return;

    APPEARANCE_FIELDS.forEach((field) => {
        const el = document.getElementById(field.id);
        if (!el || !(field.id in settings)) return;

        if (field.type === "checked") {
            el.checked = Boolean(settings[field.id]);
        } else if (field.type === "multiselect") {
            const values = new Set(settings[field.id] || []);
            Array.from(el.options).forEach((opt) => { opt.selected = values.has(opt.value); });
        } else {
            el.value = settings[field.id];
        }
    });
}
