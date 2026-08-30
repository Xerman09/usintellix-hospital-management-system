import { getUser } from "../../core/session.js";
import { ProcedureOrderConfigsView } from "../procedure-order-configs/procedure-order-configs.view.js";
import { initProcedureOrderConfigs } from "../procedure-order-configs/procedure-order-configs.js";

export function initBatchResults()
{
    const user = getUser();

    if (!user || user.role !== "admin") {
        window.location.hash = "#/dashboard";
        return;
    }

    const procedureInput = document.getElementById("brProcedureInput");
    const procedureIdInput = document.getElementById("brProcedureId");
    const pickerOverlay = document.getElementById("brProcedurePickerModalOverlay");
    const pickerContent = document.getElementById("brProcedurePickerContent");

    const openPicker = () => {
        // Freshly render the tree each time so it always shows current
        // data and never accumulates duplicate event listeners from a
        // previous time the picker was opened.
        pickerContent.innerHTML = ProcedureOrderConfigsView();

        initProcedureOrderConfigs({
            onSelect: (item) => {
                procedureInput.value = item.name;
                procedureIdInput.value = item.id;
                pickerOverlay.classList.remove("open");
            }
        });

        pickerOverlay.classList.add("open");
    };

    const closePicker = () => {
        pickerOverlay.classList.remove("open");
    };

    procedureInput.addEventListener("click", openPicker);
    document.getElementById("brProcedurePickerClose").addEventListener("click", closePicker);
    pickerOverlay.addEventListener("click", (event) => {
        if (event.target === pickerOverlay) {
            closePicker();
        }
    });

    document.getElementById("brRefreshBtn").addEventListener("click", renderResults);

    renderResults();
}

function renderResults()
{
    const container = document.getElementById("brResults");
    const procedureName = document.getElementById("brProcedureInput").value;
    const from = document.getElementById("brFromDate").value;
    const to = document.getElementById("brToDate").value;

    const filterParts = [];

    if (procedureName) filterParts.push(`Procedure: ${procedureName}`);
    if (from) filterParts.push(`From: ${from}`);
    if (to) filterParts.push(`To: ${to}`);

    container.innerHTML = `
        <div class="br-results-empty">
            <div class="br-empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h6v4H9z"></path><path d="M9 6H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3"></path></svg>
            </div>
            <strong>No results found</strong>
            <p>${filterParts.length ? `No batch results for ${filterParts.join(", ")}.` : "Select a procedure and/or date range, then Refresh."}</p>
        </div>
    `;
}
