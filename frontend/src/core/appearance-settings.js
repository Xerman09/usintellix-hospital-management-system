// Shared with system-config.js, which is the only place that writes this
// key. Kept here too so any page that needs to *apply* a saved appearance
// setting (e.g. the dashboard's tab bar on load) doesn't have to duplicate
// the storage key or parsing logic.
import { getSavedThemeId, applyTheme } from "./theme.js";

const STORAGE_KEY = "systemConfig.appearance";

export function getAppearanceSettings() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || {};
    } catch (error) {
        return {};
    }
}

export function applyTabsLayoutTheme(theme) {
    const tabBar = document.getElementById("tabBar");

    if (tabBar) {
        tabBar.classList.toggle("tabs-compact", theme === "compact");
    }
}

export function applyGeneralTheme(theme) {
    if (theme === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
    } else {
        document.documentElement.removeAttribute("data-theme");
    }

    // Re-run the brand accent color so its dark-conflicting variables get
    // cleared (entering dark) or restored (leaving dark) to match.
    applyTheme(getSavedThemeId());
}

export function applyAppearanceSettings() {
    const settings = getAppearanceSettings();

    applyTabsLayoutTheme(settings.scTabsLayoutTheme || "full");
    applyGeneralTheme(settings.scGeneralTheme || "light");
}
