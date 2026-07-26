export const THEMES = [
    {
        id: "ocean",
        name: "Ocean Blue",
        dark: "#0a1730",
        mid: "#0f2557",
        accent: "#1d4ed8",
        accentRgb: "29,78,216",
        hover: "#1742b0",
        active: "#14367e",
        light: "#eff6ff",
        lighter: "#dbeafe",
        border: "#bfdbfe",
        text: "#1e40af"
    },
    {
        id: "emerald",
        name: "Emerald",
        dark: "#06231a",
        mid: "#0f3d2e",
        accent: "#059669",
        accentRgb: "5,150,105",
        hover: "#047857",
        active: "#065f46",
        light: "#ecfdf5",
        lighter: "#d1fae5",
        border: "#a7f3d0",
        text: "#047857"
    },
    {
        id: "violet",
        name: "Violet",
        dark: "#1e1033",
        mid: "#3b1f66",
        accent: "#7c3aed",
        accentRgb: "124,58,237",
        hover: "#6d28d9",
        active: "#5b21b6",
        light: "#f5f3ff",
        lighter: "#ede9fe",
        border: "#ddd6fe",
        text: "#6d28d9"
    },
    {
        id: "slate",
        name: "Slate",
        dark: "#0f172a",
        mid: "#1e293b",
        accent: "#475569",
        accentRgb: "71,85,105",
        hover: "#334155",
        active: "#1e293b",
        light: "#f8fafc",
        lighter: "#e2e8f0",
        border: "#cbd5e1",
        text: "#334155"
    },
    {
        id: "rose",
        name: "Rose",
        dark: "#2a0a14",
        mid: "#4c0f24",
        accent: "#e11d48",
        accentRgb: "225,29,72",
        hover: "#be123c",
        active: "#9f1239",
        light: "#fff1f2",
        lighter: "#ffe4e6",
        border: "#fecdd3",
        text: "#be123c"
    },
    {
        id: "amber",
        name: "Amber",
        dark: "#2a1a05",
        mid: "#4a2e08",
        accent: "#d97706",
        accentRgb: "217,119,6",
        hover: "#b45309",
        active: "#92400e",
        light: "#fffbeb",
        lighter: "#fef3c7",
        border: "#fde68a",
        text: "#b45309"
    }
];

const STORAGE_KEY = "theme";
const DEFAULT_THEME_ID = "ocean";

export function getSavedThemeId()
{
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME_ID;
}

export function getTheme(id)
{
    return THEMES.find((theme) => theme.id === id) || THEMES[0];
}

export function applyTheme(id)
{
    const theme = getTheme(id);
    const root = document.documentElement.style;

    root.setProperty("--accent-dark", theme.dark);
    root.setProperty("--accent-mid", theme.mid);
    root.setProperty("--accent", theme.accent);
    root.setProperty("--accent-rgb", theme.accentRgb);
    root.setProperty("--accent-hover", theme.hover);
    root.setProperty("--accent-active", theme.active);
    root.setProperty("--accent-light", theme.light);
    root.setProperty("--accent-lighter", theme.lighter);
    root.setProperty("--accent-border", theme.border);
    root.setProperty("--accent-text", theme.text);

    localStorage.setItem(STORAGE_KEY, theme.id);
}

export function initTheme()
{
    applyTheme(getSavedThemeId());
}
