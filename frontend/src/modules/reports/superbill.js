import { api } from "../../core/api.js";
import { logReportRun } from "./report-history.js";

async function fetchSuperbill() {
    const dateFrom = document.getElementById("sbBeginDate")?.value || "";
    const dateTo = document.getElementById("sbEndDate")?.value || "";
    const patientId = ""; // Usually handled by the patient select modal in full app

    const clinicInfo = document.getElementById("sbClinicInfo");
    const loading = document.getElementById("sbLoading");
    
    if (!clinicInfo || !loading) return;
    
    clinicInfo.style.display = "none";
    loading.style.display = "block";
    
    try {
        const params = new URLSearchParams({
            date_from: dateFrom,
            date_to: dateTo,
            patient_id: patientId
        });

        const result = await api(`/reports/visits/superbill?${params.toString()}`);

        loading.style.display = "none";
        
        if (result.success && result.data && result.data.clinic) {
            const clinic = result.data.clinic;
            
            document.getElementById("sbClinicName").textContent = clinic.name || "Great Clinic";
            document.getElementById("sbClinicStreet").textContent = clinic.street || "55 Roadsby Road";
            document.getElementById("sbClinicCityStateZip").textContent = clinic.city_state_zip || "Longview, FL 333222";
            
            clinicInfo.style.display = "block";
            
            logReportRun("Superbill", "superbill", { date_from: dateFrom, date_to: dateTo });
        } else {
            loading.style.display = "block";
            loading.style.color = "red";
            loading.textContent = "Failed to load superbill data.";
        }
    } catch (err) {
        loading.style.display = "block";
        loading.style.color = "red";
        loading.textContent = "Error fetching report.";
        console.error(err);
    }
}

export function initSuperbillReport() {
    const submitBtn = document.getElementById("sbSubmitBtn");
    if (submitBtn) {
        submitBtn.addEventListener("click", fetchSuperbill);
    }
}
