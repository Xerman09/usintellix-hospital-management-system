console.log("MAIN FILE LOADED");

import { router } from "./core/router.js?v=121";
import { initTheme } from "./core/theme.js";
import { initInactivityGuard } from "./core/inactivity-guard.js?v=1";
import "./core/patient-chart-helper.js?v=1";

initTheme();

document.addEventListener(
    "DOMContentLoaded",
    () => {
        initInactivityGuard();
        router();
    }
);