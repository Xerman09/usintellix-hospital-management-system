import { getUser } from "../../core/session.js";
import { ProvidersView } from "../providers/providers.view.js";
import { initProviders } from "../providers/providers.js";

const SUBTABS = {
    providers: {
        render: ProvidersView,
        init: initProviders
    }
};

let activeSubtab = 'providers';

export function setActiveSubtab(subtab)
{
    activeSubtab = subtab || 'providers';
}

export function initProcedures()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    openSubTab(activeSubtab);
}

function openSubTab(id)
{
    const content = document.getElementById("proceduresSubTabContent");
    const entry = SUBTABS[id];

    if (!entry) {
        content.innerHTML = `<div class="table-empty" style="padding: 60px 20px;">Choose a section from the Procedures menu above.</div>`;
        return;
    }

    content.innerHTML = entry.render();

    setTimeout(entry.init, 0);
}
