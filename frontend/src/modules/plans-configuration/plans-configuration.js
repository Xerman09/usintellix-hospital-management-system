import { getUser } from "../../core/session.js";
import { showToast } from "../../core/toast.js";
import { initPracticeRules } from "../practice-rules/practice-rules.js";

export async function initPlansConfiguration()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    document.getElementById("pcGoBtn").addEventListener("click", () => {
        showToast("There are no additional plan-specific settings to configure for General.", "success");
    });

    // The Rules Configuration section below is the same real Rule
    // Management screen (Admin > Practice > Rules), embedded here --
    // same data, same add/edit/delete behavior, nothing duplicated.
    initPracticeRules();
}
