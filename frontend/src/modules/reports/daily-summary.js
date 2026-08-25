import { api } from "../../core/api.js";
import { logReportRun } from "./report-history.js";

async function fetchDailySummary() {
    const facilityId = document.getElementById("dsFacility")?.value || "";
    const dateFrom = document.getElementById("dsBeginDate")?.value || "";
    const dateTo = document.getElementById("dsEndDate")?.value || "";
    const providerId = document.getElementById("dsProvider")?.value || "";

    const tbody = document.getElementById("dsTableBody");
    if (!tbody) return;
    
    document.getElementById("dsDateRangeFrom").textContent = dateFrom;
    document.getElementById("dsDateRangeTo").textContent = dateTo;

    tbody.innerHTML = `<tr><td colspan="9" style="padding: 12px; text-align: center; color: #718096; font-style: italic;">Loading data...</td></tr>`;
    
    // Reset totals
    updateTotals(0, 0, 0, 0, 0, 0);

    try {
        const params = new URLSearchParams({
            facility_id: facilityId,
            date_from: dateFrom,
            date_to: dateTo,
            provider_id: providerId
        });

        const result = await api(`/reports/visits/daily?${params.toString()}`);

        if (result.success) {
            renderTable(result.data);
            logReportRun("Daily Summary Report", "daily_summary", { date_from: dateFrom, date_to: dateTo });
        } else {
            tbody.innerHTML = `<tr><td colspan="9" style="padding: 12px; text-align: center; color: red;">Failed to load data.</td></tr>`;
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="9" style="padding: 12px; text-align: center; color: red;">Error fetching report.</td></tr>`;
        console.error(err);
    }
}

function updateTotals(appt, newPat, visPat, char, copay, bal) {
    document.getElementById("dsTotalAppt").textContent = appt;
    document.getElementById("dsTotalNewPat").textContent = newPat;
    document.getElementById("dsTotalVisPat").textContent = visPat;
    document.getElementById("dsTotalChar").textContent = Number(char).toFixed(2);
    document.getElementById("dsTotalCopay").textContent = Number(copay).toFixed(2);
    document.getElementById("dsTotalBal").textContent = Number(bal).toFixed(2);
}

function renderTable(data) {
    const tbody = document.getElementById("dsTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="padding: 12px; text-align: center; color: #718096; font-style: italic;">No data found.</td></tr>`;
        return;
    }

    let totAppt = 0, totNew = 0, totVis = 0, totChar = 0, totCopay = 0, totBal = 0;

    data.forEach(item => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td style="padding: 8px; color: #2d3748;">${item.date}</td>
            <td style="padding: 8px; color: #2d3748;">${item.facility}</td>
            <td style="padding: 8px; color: #2d3748;">${item.provider}</td>
            <td style="padding: 8px; color: #2d3748;">${item.appointments}</td>
            <td style="padding: 8px; color: #2d3748;">${item.new_patients}</td>
            <td style="padding: 8px; color: #2d3748;">${item.visited_patients}</td>
            <td style="padding: 8px; color: #2d3748;">${item.total_charges}</td>
            <td style="padding: 8px; color: #2d3748;">${item.total_copay}</td>
            <td style="padding: 8px; color: #2d3748;">${item.balance_payment}</td>
        `;
        tbody.appendChild(tr);
        
        totAppt += Number(item.appointments || 0);
        totNew += Number(item.new_patients || 0);
        totVis += Number(item.visited_patients || 0);
        totChar += Number(item.total_charges || 0);
        totCopay += Number(item.total_copay || 0);
        totBal += Number(item.balance_payment || 0);
    });

    updateTotals(totAppt, totNew, totVis, totChar, totCopay, totBal);
}

export function initDailySummary() {
    const submitBtn = document.getElementById("dsSubmitBtn");
    if (submitBtn) {
        submitBtn.addEventListener("click", fetchDailySummary);
    }
    
    const resetBtn = document.getElementById("dsResetBtn");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            const now = new Date();
            const formattedDate = now.toISOString().slice(0, 10);
            
            document.getElementById("dsFacility").value = "";
            document.getElementById("dsProvider").value = "";
            document.getElementById("dsBeginDate").value = formattedDate;
            document.getElementById("dsEndDate").value = formattedDate;
            fetchDailySummary();
        });
    }

    // Initial fetch
    fetchDailySummary();
}
