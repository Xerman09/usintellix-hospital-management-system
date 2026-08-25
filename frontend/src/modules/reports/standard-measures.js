import { api } from "../../core/api.js";
import { logReportRun } from "./report-history.js";

async function fetchStandardMeasures() {
    const targetDate = document.getElementById("smTargetDate")?.value || "";
    const ruleSet = document.getElementById("smRuleSet")?.value || "";
    const planSet = document.getElementById("smPlanSet")?.value || "";
    const provider = document.getElementById("smProvider")?.value || "";
    const providerRelationship = document.getElementById("smProviderRelationship")?.value || "";

    const tbody = document.getElementById("smTableBody");
    if (!tbody) return;

    try {
        const params = new URLSearchParams({
            target_date: targetDate,
            rule_set: ruleSet,
            plan_set: planSet,
            provider: provider,
            provider_relationship: providerRelationship
        });

        const result = await api(`/reports/standard-measures?${params.toString()}`);

        if (result.success) {
            renderTable(result.data);
            logReportRun("Standard Measures", "standard_measures", { target_date: targetDate });
        } else {
            tbody.innerHTML = `<tr><td colspan="7" style="padding: 30px; text-align: center; color: red;">Failed to load data.</td></tr>`;
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="padding: 30px; text-align: center; color: red;">Error fetching report.</td></tr>`;
        console.error(err);
    }
}

function renderTable(data) {
    const tbody = document.getElementById("smTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="padding: 30px; text-align: center; color: #718096; font-style: italic;">No data found.</td></tr>`;
        return;
    }

    data.forEach((item, idx) => {
        const tr = document.createElement("tr");
        tr.style.backgroundColor = idx % 2 === 0 ? "white" : "#f7fafc";

        const titleBold = item.title.startsWith("Measurement") || item.title.startsWith("Education") ? "normal" : "bold";
        
        tr.innerHTML = `
            <td style="padding: 10px 16px; font-weight: ${titleBold}; color: #2d3748;">${item.title}</td>
            <td style="padding: 10px 16px; text-align: center; color: #4a5568;">${item.total}</td>
            <td style="padding: 10px 16px; text-align: center; color: #2b6cb0;">${item.denom}</td>
            <td style="padding: 10px 16px; text-align: center; color: #4a5568;">${item.denom_excl}</td>
            <td style="padding: 10px 16px; text-align: center; color: #2b6cb0;">${item.num}</td>
            <td style="padding: 10px 16px; text-align: center; color: #2b6cb0;">${item.failed}</td>
            <td style="padding: 10px 16px; text-align: right; color: #4a5568;">${item.perf}</td>
        `;
        tbody.appendChild(tr);
    });
}

export function initStandardMeasures() {
    const printBtn = document.getElementById("smPrintBtn");
    if (printBtn) {
        printBtn.addEventListener("click", () => window.print());
    }
    
    const startAnotherBtn = document.getElementById("smStartAnotherBtn");
    if (startAnotherBtn) {
        startAnotherBtn.addEventListener("click", fetchStandardMeasures);
    }
    
    const inputs = ['smTargetDate', 'smRuleSet', 'smPlanSet', 'smProvider', 'smProviderRelationship'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("change", fetchStandardMeasures);
        }
    });

    fetchStandardMeasures();
}
