console.log("MAIN FILE LOADED");

import { router } from "./core/router.js?v=136";
import { initTheme } from "./core/theme.js";
import { initInactivityGuard } from "./core/inactivity-guard.js?v=1";
import { initBreakGlassListener } from "./core/break-glass-modal.js?v=1";
import "./core/patient-chart-helper.js?v=1";

initTheme();

function boot() {
    initInactivityGuard();
    initBreakGlassListener();
    router();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
} else {
    boot();
}