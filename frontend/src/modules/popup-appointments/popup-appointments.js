import { AppointmentsReportView } from "../reports/appointments.view.js";
import { initAppointmentsReport } from "../reports/appointments.js";

let modalReady = false;

export async function openAppointmentsPopup() {
    ensureModalInjected();

    document.getElementById("appointmentsPopupOverlay").classList.add("open");

    // The report's own filters/results should start fresh each time the
    // popup opens rather than showing whatever was left from the last
    // time it (or the Reports > Visits > Appointments tab) was used.
    document.getElementById("appointmentsPopupBody").innerHTML = AppointmentsReportView();
    await initAppointmentsReport();
}

function ensureModalInjected() {
    if (modalReady) return;

    const container = document.createElement("div");
    container.innerHTML = `
<style>
.pap-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, .55);
    align-items: center;
    justify-content: center;
    z-index: 2000;
}

.pap-overlay.open { display: flex; }

.pap-box {
    background: var(--bg-surface);
    color: var(--text-primary);
    border-radius: 10px;
    width: min(1100px, 96vw);
    max-height: 92vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,.35);
}

.pap-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
}

.pap-header h2 { margin: 0; font-size: 18px; font-weight: 600; }

.pap-close {
    border: none;
    background: none;
    font-size: 20px;
    color: var(--text-muted);
    cursor: pointer;
    line-height: 1;
}

.pap-body {
    overflow-y: auto;
}
</style>

<div class="pap-overlay" id="appointmentsPopupOverlay">
    <div class="pap-box">
        <div class="pap-header">
            <h2>Appointments</h2>
            <button type="button" class="pap-close" id="papCloseBtn">&times;</button>
        </div>
        <div class="pap-body" id="appointmentsPopupBody"></div>
    </div>
</div>
    `;
    document.body.appendChild(container);

    const close = () => document.getElementById("appointmentsPopupOverlay").classList.remove("open");

    document.getElementById("papCloseBtn").addEventListener("click", close);
    document.getElementById("appointmentsPopupOverlay").addEventListener("click", (event) => {
        if (event.target.id === "appointmentsPopupOverlay") close();
    });

    modalReady = true;
}
