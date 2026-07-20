console.log("MAIN FILE LOADED");

import { router } from "./core/router.js";


document.addEventListener(
    "DOMContentLoaded",
    () => {

        router();

    }
);