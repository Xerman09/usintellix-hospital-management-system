import { fetchPatients } from "../modules/patients/patients.service.js";
import { openPatientChartTab } from "../modules/patients/patients-list.js?v=63";

/**
 * Calculates age in full years from a YYYY-MM-DD birthdate string
 */
export function calculateAgeFromDob(dobString) {
    if (!dobString) return '';
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return '';
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    return Math.max(0, age);
}

/**
 * Global EHR navigation: Opens a patient's chart tab from any report by their patient number / MRN
 */
export async function openPatientChartByNo(patientNo) {
    if (!patientNo) {
        alert("No patient number provided.");
        return;
    }
    try {
        const res = await fetchPatients();
        if (res && res.success && Array.isArray(res.data)) {
            const cleanNo = String(patientNo).trim().toUpperCase();
            const match = res.data.find(p => 
                (p.patient_no && p.patient_no.toUpperCase() === cleanNo) ||
                String(p.id) === String(patientNo)
            );
            if (match) {
                openPatientChartTab(match);
                return;
            }
        }
        alert(`Patient record "${patientNo}" could not be located in the patient registry.`);
    } catch (err) {
        console.error("Error opening patient chart from report:", err);
    }
}

// Make globally accessible for inline onclick handlers in rendered tables
window.__openPatientChartFromReport = openPatientChartByNo;

/**
 * Populates a `<select>` element with registered patients and wires the change listener
 */
export async function populatePatientSelector(selectEl, onSelectCallback) {
    if (!selectEl) return;
    try {
        const res = await fetchPatients();
        if (res && res.success && Array.isArray(res.data)) {
            const patients = res.data;
            let optionsHtml = '<option value="">-- Select Patient from Registry --</option>' +
                              '<option value="manual">&bull; Manual / Non-registered Patient</option>';
            patients.forEach(p => {
                const fullName = [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ');
                optionsHtml += `<option value="${p.id}" data-mrn="${p.patient_no}" data-name="${fullName}" data-dob="${p.birthdate || ''}" data-sex="${p.sex || ''}">${p.patient_no} &mdash; ${fullName}</option>`;
            });
            selectEl.innerHTML = optionsHtml;

            // Remove old change listeners by cloning
            const newSelect = selectEl.cloneNode(true);
            selectEl.parentNode.replaceChild(newSelect, selectEl);

            newSelect.addEventListener('change', () => {
                const val = newSelect.value;
                if (!val || val === 'manual') {
                    if (onSelectCallback) onSelectCallback(null, val === 'manual');
                    return;
                }
                const patient = patients.find(p => String(p.id) === String(val));
                if (patient && onSelectCallback) {
                    onSelectCallback(patient, false);
                }
            });
        }
    } catch (err) {
        console.error("Error populating patient selector:", err);
    }
}
