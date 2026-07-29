import { API_URL } from "./api.js";
import { fetchBusinessSettings } from "../modules/business-settings/business-settings.service.js";

const DEFAULT_BRANDING = { name: "Intellix", logo: null };

let cached = null;

/**
 * Fetch the business name/logo, cached for the life of the page load.
 */
export async function loadBranding()
{
    if (cached) {
        return cached;
    }

    const result = await fetchBusinessSettings();

    cached = result.success ? result.data : DEFAULT_BRANDING;

    return cached;
}

/**
 * Drop the cached value so the next loadBranding() call re-fetches --
 * call this right after the business name/logo is changed.
 */
export function clearBrandingCache()
{
    cached = null;
}

/**
 * Push a branding value into every matching element currently in the
 * DOM (navbar logo, login page brand marks, etc).
 */
export function applyBranding(branding)
{
    document.querySelectorAll("[data-app-name]").forEach((el) => {
        el.textContent = branding.name || DEFAULT_BRANDING.name;
    });

    document.querySelectorAll("[data-app-logo]").forEach((img) => {
        img.src = branding.logo ? `${API_URL}${branding.logo}` : "./assets/logo.png?v=1";
    });
}

/**
 * Fetch + apply in one call -- what every page that shows the brand
 * mark should call on init.
 */
export async function initBranding()
{
    const branding = await loadBranding();

    applyBranding(branding);

    return branding;
}
