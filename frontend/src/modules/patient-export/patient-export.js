import { api } from "../../core/api.js";
import { getLastActivePatientChart } from "../../core/pending-patient-view.js";
import { PatientExportModalMarkup } from "./patient-export.view.js";
import { showToast } from "../../core/toast.js";

let modalReady = false;

export async function openExportPopup() {
    ensureModalInjected();

    const patientNo = getLastActivePatientChart();

    if (!patientNo || patientNo === "null") {
        showToast("Open a patient's chart first.", "error");
        return;
    }

    const result = await api("/patients");

    if (!result.success) {
        showToast("Failed to load patient.", "error");
        return;
    }

    const patient = result.data.find((p) => p.patient_no === patientNo);

    if (!patient) {
        showToast("Patient not found.", "error");
        return;
    }

    document.getElementById("pexTextarea").value = buildPatientXml(patient);
    document.getElementById("exportModalOverlay").classList.add("open");
}

function ensureModalInjected() {
    if (modalReady) return;

    const container = document.createElement("div");
    container.innerHTML = PatientExportModalMarkup();
    document.body.appendChild(container);

    const close = () => document.getElementById("exportModalOverlay").classList.remove("open");

    document.getElementById("pexCloseBtn").addEventListener("click", close);
    document.getElementById("pexCloseBtn2").addEventListener("click", close);
    document.getElementById("exportModalOverlay").addEventListener("click", (event) => {
        if (event.target.id === "exportModalOverlay") close();
    });

    modalReady = true;
}

// Fields with no backing data anywhere in this app (SSN was never
// collected -- see the same "layout parity, not fabrication" call made
// for the Collections/Indigent Patients reports -- and there's no 4th
// "contact phone" or a country field on the patient's address) are
// emitted as real, present, empty tags rather than left out or guessed,
// matching how the reference export itself always includes every tag.
function buildPatientXml(patient) {
    const tag = (name, value) => `    <${name}>${escapeXml(value)}</${name}>`;

    const lines = [
        "<patient>",
        tag("pid", patient.id),
        tag("pubpid", patient.patient_no),
        tag("lname", patient.last_name),
        tag("mname", patient.middle_name),
        tag("fname", patient.first_name),
        tag("ss", ""),
        tag("dob", formatDate(patient.birthdate)),
        tag("sex", patient.sex === "male" ? "M" : patient.sex === "female" ? "F" : ""),
        tag("street", patient.contact_address_line),
        tag("city", patient.contact_city),
        tag("state", patient.contact_province),
        tag("zip", patient.contact_zip_code),
        tag("country", ""),
        tag("phone_home", patient.contact_home_phone),
        tag("phone_biz", patient.contact_work_phone),
        tag("phone_contact", ""),
        tag("phone_cell", patient.contact_mobile_phone),
        tag("email", patient.contact_email),
        tag("status", patient.civil_status),
        tag("race", patient.race),
        tag("ethnicity", patient.ethnicity),
        tag("language", patient.language),
        tag("occupation", patient.employer_occupation),
        "</patient>"
    ];

    return lines.join("\n");
}

function formatDate(value) {
    if (!value) return "";

    return String(value).slice(0, 10);
}

function escapeXml(value) {
    if (value == null) return "";

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}
