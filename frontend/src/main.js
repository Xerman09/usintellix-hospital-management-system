console.log("MAIN FILE LOADED");

import { router } from "./core/router.js?v=6";


document.addEventListener(
    "DOMContentLoaded",
    () => {

        router();

    }
);