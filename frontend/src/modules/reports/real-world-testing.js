import { api } from "../../core/api.js";
import { logReportRun } from "./report-history.js";

async function startReport() {
    const startBtn = document.getElementById("rwtStartBtn");
    const printBtn = document.getElementById("rwtPrintBtn");
    const initialBanner = document.getElementById("rwtInitialBanner");
    const resultBanner = document.getElementById("rwtResultBanner");
    const content = document.getElementById("rwtContent");
    const metricsContainer = document.getElementById("rwtMetricsContainer");
    
    if (startBtn) startBtn.innerHTML = "Loading...";
    if (startBtn) startBtn.disabled = true;

    try {
        const result = await api('/reports/real-world-testing');

        if (result.success) {
            // UI transition
            if (initialBanner) initialBanner.style.display = "none";
            if (resultBanner) resultBanner.style.display = "block";
            if (startBtn) startBtn.style.display = "none";
            if (printBtn) printBtn.style.display = "block";
            if (content) content.style.display = "block";

            // Set Date
            const dateSpan = document.getElementById("rwtDate");
            if (dateSpan) {
                const now = new Date();
                dateSpan.textContent = now.toISOString().slice(0, 10);
            }

            // Render Metrics
            if (metricsContainer && result.data) {
                metricsContainer.innerHTML = "";
                Object.values(result.data).forEach(metric => {
                    const descHtml = metric.description.replace(/\n/g, "<br>");
                    
                    const block = document.createElement("div");
                    block.style.marginBottom = "20px";
                    block.innerHTML = `
                        <div style="font-weight: bold; margin-bottom: 4px;">${metric.title}</div>
                        <div>${descHtml}</div>
                    `;
                    metricsContainer.appendChild(block);
                });
            }

            logReportRun("Real World Testing Report", "real_world_testing", {});
        } else {
            alert("Failed to load Real World Testing report data.");
            if (startBtn) {
                startBtn.innerHTML = "Start Report";
                startBtn.disabled = false;
            }
        }
    } catch (err) {
        console.error(err);
        alert("Error fetching report data.");
        if (startBtn) {
            startBtn.innerHTML = "Start Report";
            startBtn.disabled = false;
        }
    }
}

export function initRealWorldTesting() {
    const startBtn = document.getElementById("rwtStartBtn");
    if (startBtn) {
        startBtn.addEventListener("click", startReport);
    }

    const printBtn = document.getElementById("rwtPrintBtn");
    if (printBtn) {
        printBtn.addEventListener("click", () => window.print());
    }
}
