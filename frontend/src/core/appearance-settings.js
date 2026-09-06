// Shared with system-config.js, which is the only place that writes this
// key. Kept here too so any page that needs to *apply* a saved appearance
// setting (e.g. the dashboard's tab bar on load) doesn't have to duplicate
// the storage key or parsing logic.
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

export function applyAppearanceSettings() {
    const settings = getAppearanceSettings();

    applyTabsLayoutTheme(settings.scTabsLayoutTheme || "full");
}
