import { THEMES, getSavedThemeId } from "../../core/theme.js";

export function AppearanceView()
{
    const activeId = getSavedThemeId();

    const cards = THEMES.map((theme) => `
        <button type="button" class="theme-card${theme.id === activeId ? " active" : ""}" data-theme-id="${theme.id}">
            <span class="theme-swatch" style="background: linear-gradient(135deg, ${theme.dark}, ${theme.accent});"></span>
            <span class="theme-card-name">${theme.name}</span>
            <span class="theme-card-check">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            </span>
        </button>
    `).join("");

    return `
<div class="form-page">
    <div class="form-card">
        <h1>Appearance</h1>
        <p class="form-subtitle">Choose the color theme for your workspace. This applies to buttons, links, and highlights across the app.</p>

        <div class="theme-grid" id="themeGrid">
            ${cards}
        </div>
    </div>
</div>
`;
}
