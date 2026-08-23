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
        const response = await fetchPatientMedications(user.id);
        const medications = response?.data || [];
        
        if (!Array.isArray(medications) || medications.length === 0) {
            container.innerHTML = "<p style='color: #64748b;'>No medications found.</p>";
            return;
        }
        
        let html = `
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <thead style="background: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
                    <tr>
                        <th style="padding: 12px 16px; font-weight: 600; color: #475569;">Medication</th>
                        <th style="padding: 12px 16px; font-weight: 600; color: #475569;">Start Date</th>
                        <th style="padding: 12px 16px; font-weight: 600; color: #475569;">End Date</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        medications.forEach(med => {
            html += `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 12px 16px; color: #334155;">${escapeHtml(med.title || med.name || 'Unknown')}</td>
                    <td style="padding: 12px 16px; color: #334155;">${formatDate(med.begin_date)}</td>
                    <td style="padding: 12px 16px; color: #334155;">${formatDate(med.end_date)}</td>
                </tr>
            `;
        });
        
        html += `</tbody></table>`;
        container.innerHTML = html;
        
    } catch (e) {
        console.error("Medications load error:", e);
        if (container) {
            container.innerHTML = "<p style='color: #ef4444;'>Error loading medications.</p>";
        }
    }
}
