import { getUser } from "../../core/session.js";
import { fetchPatientMedications } from "./patient-medications.service.js";

function escapeHtml(unsafe) {
    if (!unsafe) return "";
    return (unsafe + "")
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function formatDate(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export async function initPatientMedications() {
    const user = getUser();
    if (!user) return;
    
    let container = document.getElementById("patientMedicationsList");
    if (!container) {
        // Retry a few times to ensure DOM is ready
        for (let i = 0; i < 10; i++) {
            await new Promise(r => setTimeout(r, 50));
            container = document.getElementById("patientMedicationsList");
            if (container) break;
        }
        if (!container) return;
    }
    
    try {
        const response = await fetchPatientMedications();

        if (!response?.success) {
            container.innerHTML = `<p class="pmed-error">${escapeHtml(response?.message || "Unable to load medications.")}</p>`;
            return;
        }

        const medications = response.data || [];

        if (!Array.isArray(medications) || medications.length === 0) {
            container.innerHTML = "<p class='pmed-empty'>No medications found.</p>";
            return;
        }

        let html = `
            <table class="pmed-table">
                <thead>
                    <tr>
                        <th>Medication</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                    </tr>
                </thead>
                <tbody>
        `;

        medications.forEach(med => {
            html += `
                <tr>
                    <td>${escapeHtml(med.title || med.name || 'Unknown')}</td>
                    <td>${formatDate(med.begin_date)}</td>
                    <td>${formatDate(med.end_date)}</td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;

    } catch (e) {
        console.error("Medications load error:", e);
        if (container) {
            container.innerHTML = "<p class='pmed-error'>Error loading medications.</p>";
        }
    }
}
