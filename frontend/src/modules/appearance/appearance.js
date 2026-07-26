import { applyTheme, getTheme } from "../../core/theme.js";
import { showToast } from "../../core/toast.js";

export function initAppearance()
{
    const grid = document.getElementById("themeGrid");

    if (!grid) {
        return;
    }

    grid.querySelectorAll(".theme-card").forEach((card) => {
        card.addEventListener("click", () => {
            const id = card.getAttribute("data-theme-id");

            applyTheme(id);

            grid.querySelectorAll(".theme-card").forEach((c) => c.classList.remove("active"));
            card.classList.add("active");

            showToast(`Theme set to ${getTheme(id).name}.`, "success");
        });
    });
}
