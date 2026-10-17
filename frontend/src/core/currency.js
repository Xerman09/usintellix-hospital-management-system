/**
 * Dynamic Client-Side Currency & Localization Formatter
 * 
 * Manages hospital-wide currency preferences (code, symbol, position, decimal places)
 * configured in Practice / Business Settings, providing formatting and reactive
 * preference management across billing, invoices, equipment assets, and reports.
 */

import { fetchBusinessSettings } from "../modules/business-settings/business-settings.service.js";

const STORAGE_KEY = "system_currency_preferences";

export const CURRENCY_PRESETS = [
    { code: "USD", symbol: "$", position: "prefix", decimals: 2, label: "USD ($) — US Dollar" },
    { code: "PHP", symbol: "₱", position: "prefix", decimals: 2, label: "PHP (₱) — Philippine Peso" },
    { code: "EUR", symbol: "€", position: "prefix", decimals: 2, label: "EUR (€) — Euro" },
    { code: "GBP", symbol: "£", position: "prefix", decimals: 2, label: "GBP (£) — British Pound" },
    { code: "AUD", symbol: "A$", position: "prefix", decimals: 2, label: "AUD (A$) — Australian Dollar" },
    { code: "CAD", symbol: "C$", position: "prefix", decimals: 2, label: "CAD (C$) — Canadian Dollar" },
    { code: "SGD", symbol: "S$", position: "prefix", decimals: 2, label: "SGD (S$) — Singapore Dollar" },
    { code: "JPY", symbol: "¥", position: "prefix", decimals: 0, label: "JPY (¥) — Japanese Yen" }
];

const DEFAULT_PREFERENCE = {
    currency_code: "USD",
    currency_symbol: "$",
    currency_position: "prefix",
    decimal_places: 2
};

let currentPreference = readStoredPreference() || { ...DEFAULT_PREFERENCE };

function readStoredPreference() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return null;
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object" && parsed.currency_code) {
            return {
                currency_code: String(parsed.currency_code || "USD").toUpperCase(),
                currency_symbol: String(parsed.currency_symbol || "$"),
                currency_position: parsed.currency_position === "suffix" ? "suffix" : "prefix",
                decimal_places: Number.isInteger(parsed.decimal_places) && parsed.decimal_places >= 0 ? parsed.decimal_places : 2
            };
        }
    } catch {
        // Fall back to default
    }
    return null;
}

function persistPreference(pref) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pref));
    } catch {
        // LocalStorage may fail in restricted/sandboxed mode
    }
}

/**
 * Get the currently active currency preference object.
 * @returns {{ currency_code: string, currency_symbol: string, currency_position: string, decimal_places: number }}
 */
export function getCurrencyPreference() {
    return { ...currentPreference };
}

/**
 * Get active currency symbol (e.g. '$', '₱', '€', '£').
 */
export function getCurrencySymbol() {
    return currentPreference.currency_symbol || "$";
}

/**
 * Get active currency code (e.g. 'USD', 'PHP', 'EUR').
 */
export function getCurrencyCode() {
    return currentPreference.currency_code || "USD";
}

/**
 * Set and persist system currency preferences.
 * Dispatches a 'system-currency-changed' window event for reactive UI updates.
 */
export function setCurrencyPreference(pref) {
    if (!pref || typeof pref !== "object") return;

    currentPreference = {
        currency_code: String(pref.currency_code || currentPreference.currency_code || "USD").toUpperCase(),
        currency_symbol: String(pref.currency_symbol || currentPreference.currency_symbol || "$"),
        currency_position: pref.currency_position === "suffix" ? "suffix" : "prefix",
        decimal_places: Number.isInteger(pref.decimal_places) && pref.decimal_places >= 0 ? pref.decimal_places : 2
    };

    persistPreference(currentPreference);
    updateDomCurrencyElements();

    try {
        window.dispatchEvent(new CustomEvent("system-currency-changed", { detail: currentPreference }));
    } catch {
        // Browser environment fallback
    }
}

/**
 * Format a numeric amount using system localization and currency preferences.
 * 
 * @param {number|string|null} amount 
 * @param {object} [options]
 * @param {number} [options.decimals] Custom decimal places
 * @param {boolean} [options.noSymbol=false] Exclude the currency symbol
 * @param {boolean} [options.showCode=false] Include the 3-letter currency code
 * @param {boolean} [options.space=false] Include a space between symbol and amount
 * @returns {string} Formatted currency string (e.g. "$1,250.00", "₱1,250.00", "1 250,00 €")
 */
export function formatCurrency(amount, options = {}) {
    const num = (amount === null || amount === undefined || isNaN(Number(amount))) ? 0 : Number(amount);
    const decimals = typeof options.decimals === "number" ? options.decimals : currentPreference.decimal_places;
    const symbol = options.noSymbol ? "" : (currentPreference.currency_symbol || "$");
    const position = currentPreference.currency_position || "prefix";
    const space = options.space ? " " : "";

    const formattedNumber = num.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });

    let result = "";
    if (!symbol) {
        result = formattedNumber;
    } else if (position === "suffix") {
        result = `${formattedNumber}${options.space !== false ? " " : ""}${symbol}`;
    } else {
        result = `${symbol}${space}${formattedNumber}`;
    }

    if (options.showCode && currentPreference.currency_code) {
        result = `${result} ${currentPreference.currency_code}`;
    }

    return result;
}

/**
 * Push currency symbol / code into matching DOM placeholder elements.
 */
export function updateDomCurrencyElements() {
    document.querySelectorAll("[data-currency-symbol]").forEach((el) => {
        el.textContent = currentPreference.currency_symbol;
    });

    document.querySelectorAll("[data-currency-code]").forEach((el) => {
        el.textContent = currentPreference.currency_code;
    });
}

/**
 * Initialize currency preferences on page load from business settings.
 * Can be called with preloaded settings or will fetch from API automatically.
 * 
 * @param {object|null} [settings] Pre-fetched business settings object
 */
export async function initCurrency(settings = null) {
    if (settings && settings.currency_code) {
        setCurrencyPreference({
            currency_code: settings.currency_code,
            currency_symbol: settings.currency_symbol,
            currency_position: settings.currency_position,
            decimal_places: settings.decimal_places
        });
        return currentPreference;
    }

    try {
        const result = await fetchBusinessSettings();
        if (result && result.success && result.data && result.data.currency_code) {
            setCurrencyPreference({
                currency_code: result.data.currency_code,
                currency_symbol: result.data.currency_symbol,
                currency_position: result.data.currency_position,
                decimal_places: result.data.decimal_places
            });
        }
    } catch (err) {
        console.warn("Failed to load currency preferences from server, using local cache:", err);
    }

    return currentPreference;
}
