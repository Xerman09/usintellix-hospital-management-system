import { api } from "../../core/api.js";
import { logReportRun } from "./report-history.js";

function resetUI() {
    document.getElementById("amcInitialButtons").style.display = "flex";
    document.getElementById("amcResultButtons").style.display = "none";
    document.getElementById("amcNumberLabsLabel").style.display = "none";
    document.getElementById("amcNumberLabs").style.display = "none";
    document.getElementById("amcMessage").style.display = "block";
    document.getElementById("amcTable").style.display = "none";
}

function showResultsUI() {
    document.getElementById("amcInitialButtons").style.display = "none";
    document.getElementById("amcResultButtons").style.display = "flex";
    document.getElementById("amcNumberLabsLabel").style.display = "block";
    document.getElementById("amcNumberLabs").style.display = "block";
    document.getElementById("amcMessage").style.display = "none";
    document.getElementById("amcTable").style.display = "table";
}

async function submitAmcReport() {
    const dateFrom = document.getElementById("amcBeginDate")?.value || "";
    const dateTo = document.getElementById("amcEndDate")?.value || "";
    const ruleSet = document.getElementById("amcRuleSet")?.value || "";
    const provider = document.getElementById("amcProvider")?.value || "";
    const providerRelationship = document.getElementById("amcProviderRelationship")?.value || "";

    showResultsUI();
    const tbody = document.getElementById("amcTableBody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" style="padding: 30px; text-align: center; color: #718096; font-style: italic;">Loading report data...</td></tr>`;

    try {
        const params = new URLSearchParams({
            date_from: dateFrom,
            date_to: dateTo,
            rule_set: ruleSet,
            provider: provider,
            provider_relationship: providerRelationship
        });

        const result = await api(`/reports/amc-measures?${params.toString()}`);

        if (result.success) {
            renderTable(result.data);
            logReportRun("Automated Measure Calculations (AMC)", "amc_measures", { date_from: dateFrom, date_to: dateTo });
        } else {
            tbody.innerHTML = `<tr><td colspan="6" style="padding: 30px; text-align: center; color: red;">Failed to load data.</td></tr>`;
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding: 30px; text-align: center; color: red;">Error fetching report.</td></tr>`;
        console.error(err);
    }
}

function renderTable(data) {
    const tbody = document.getElementById("amcTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding: 30px; text-align: center; color: #718096; font-style: italic;">No data found.</td></tr>`;
        return;
    }

    data.forEach((item, idx) => {
        const tr = document.createElement("tr");
        tr.style.backgroundColor = idx % 2 === 0 ? "white" : "#f7fafc";
        
        tr.innerHTML = `
            <td style="padding: 10px 16px; font-weight: bold; color: #2d3748;">${item.title}</td>
            <td style="padding: 10px 16px; text-align: center; color: #4a5568;">${item.total}</td>
            <td style="padding: 10px 16px; text-align: center; color: #2b6cb0;">${item.denom}</td>
            <td style="padding: 10px 16px; text-align: center; color: #2b6cb0;">${item.num}</td>
            <td style="padding: 10px 16px; text-align: center; color: #2b6cb0;">${item.failed}</td>
            <td style="padding: 10px 16px; text-align: center; color: #4a5568;">${item.perf}</td>
        `;
        tbody.appendChild(tr);
    });
}

export function initAmcMeasures() {
    resetUI();

    const submitBtn = document.getElementById("amcSubmitBtn");
    if (submitBtn) {
        submitBtn.addEventListener("click", submitAmcReport);
    }

    const startAnotherBtn = document.getElementById("amcStartAnotherBtn");
    if (startAnotherBtn) {
        startAnotherBtn.addEventListener("click", resetUI);
    }

    const printBtnInitial = document.getElementById("amcPrintBtnInitial");
    if (printBtnInitial) {
        printBtnInitial.addEventListener("click", () => window.print());
    }

    const printBtn = document.getElementById("amcPrintBtn");
    if (printBtn) {
        printBtn.addEventListener("click", () => window.print());
    }
}
