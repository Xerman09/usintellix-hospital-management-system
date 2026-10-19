console.log("MAIN FILE LOADED");

import { router } from "./core/router.js?v=239";
import { initTheme } from "./core/theme.js";
import { initInactivityGuard } from "./core/inactivity-guard.js?v=4";
import { initBreakGlassListener } from "./core/break-glass-modal.js?v=4";
import "./core/patient-chart-helper.js?v=41";
import { initSystemTimezone } from "./core/timezone.js";
import { initCurrency } from "./core/currency.js";

initTheme();

function boot() {
    // Refresh the system timezone & currency in the background -- the remembered one
    // is used until it answers, so nothing waits on it.
    initSystemTimezone();
    initCurrency();
    initInactivityGuard();
    initBreakGlassListener();
    router();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
} else {
    boot();
}