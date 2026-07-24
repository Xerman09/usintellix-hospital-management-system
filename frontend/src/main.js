console.log("MAIN FILE LOADED");

import { router } from "./core/router.js?v=10";


document.addEventListener(
    "DOMContentLoaded",
    () => {

        router();

    }
);