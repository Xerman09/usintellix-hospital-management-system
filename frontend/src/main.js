console.log("MAIN FILE LOADED");

import { router } from "./core/router.js?v=13";
import { initTheme } from "./core/theme.js";

initTheme();

document.addEventListener(
    "DOMContentLoaded",
    () => {

        router();

    }
);