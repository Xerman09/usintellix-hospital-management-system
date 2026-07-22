console.log("MAIN FILE LOADED");

import { router } from "./core/router.js?v=9";


document.addEventListener(
    "DOMContentLoaded",
    () => {

        router();

    }
);