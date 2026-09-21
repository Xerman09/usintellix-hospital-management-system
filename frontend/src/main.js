console.log("MAIN FILE LOADED");

import { router } from "./core/router.js?v=119";
import { initTheme } from "./core/theme.js";
import "./core/patient-chart-helper.js?v=1";

initTheme();

document.addEventListener(
    "DOMContentLoaded",
    () => {

        router();

    }
);