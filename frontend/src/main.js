console.log("MAIN FILE LOADED");

import { router } from "./core/router.js?v=195";
import { initTheme } from "./core/theme.js";
import { initInactivityGuard } from "./core/inactivity-guard.js?v=1";
import { initBreakGlassListener } from "./core/break-glass-modal.js?v=1";
import "./core/patient-chart-helper.js?v=27";
import { initSystemTimezone } from "./core/timezone.js";

initTheme();

function boot() {
    // Refresh the system timezone in the background -- the remembered one
    // is used until it answers, so nothing waits on it.
    initSystemTimezone();
    initInactivityGuard();
    initBreakGlassListener();
    router();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
} else {
    boot();
}