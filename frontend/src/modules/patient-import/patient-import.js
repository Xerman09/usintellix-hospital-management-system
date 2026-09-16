import { api } from "../../core/api.js";
import { getLastActivePatientChart } from "../../core/pending-patient-view.js";
import { updatePatient } from "../patients/patients.service.js";
import { PatientImportModalMarkup } from "./patient-import.view.js";
import { showToast } from "../../core/toast.js";

let modalReady = false;
let currentPatient = null;

const SEX_MAP = { M: "male", F: "female" };

export async function openImportPopup() {
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

    currentPatient = result.data.find((p) => p.patient_no === patientNo);

    if (!currentPatient) {
        showToast("Patient not found.", "error");
        return;
    }

    document.getElementById("pimAlert").innerHTML = "";
    document.getElementById("pimTextarea").value = "";
    document.getElementById("importModalOverlay").classList.add("open");
}

function ensureModalInjected() {
    if (modalReady) return;

    const container = document.createElement("div");
    container.innerHTML = PatientImportModalMarkup();
    document.body.appendChild(container);

    const close = () => document.getElementById("importModalOverlay").classList.remove("open");

    document.getElementById("pimCloseBtn").addEventListener("click", close);
    document.getElementById("pimCancelBtn").addEventListener("click", close);
    document.getElementById("importModalOverlay").addEventListener("click", (event) => {
        if (event.target.id === "importModalOverlay") close();
    });

    document.getElementById("pimImportBtn").addEventListener("click", submitImport);

    modalReady = true;
}

async function submitImport() {
    const alertEl = document.getElementById("pimAlert");
    alertEl.innerHTML = "";

    const raw = document.getElementById("pimTextarea").value.trim();

    if (!raw) {
        showAlert("Paste a patient export first.");
        return;
    }

    const parsed = parsePatientXml(raw);

    if (!parsed.success) {
        showAlert(parsed.message);
        return;
    }

    const xml = parsed.data;

    // If the pasted export names a different patient than the one
    // currently open, refuse rather than silently overwriting the
    // wrong chart -- Import always targets the active patient (never
    // the one named in the pasted XML), so a mismatch here means the
    // wrong file was pasted.
    if (xml.pid && Number(xml.pid) !== Number(currentPatient.id)) {
        showAlert(`This export is for patient #${xml.pid}, but patient #${currentPatient.id} (${currentPatient.first_name} ${currentPatient.last_name}) is currently open. Import cancelled.`);
        return;
    }

    const payload = buildUpdatePayload(currentPatient, xml);
    const result = await updatePatient(currentPatient.id, payload);

    if (!result.success) {
        const hasFieldErrors = result.errors && Object.keys(result.errors).length > 0;
        showAlert(hasFieldErrors ? Object.values(result.errors).join(" ") : (result.message || "Import failed."));
        return;
    }

    showToast("Patient imported successfully.", "success");
    document.getElementById("importModalOverlay").classList.remove("open");
}

function showAlert(message) {
    document.getElementById("pimAlert").innerHTML = `<div class="form-alert error">${escapeHtml(message)}</div>`;
}

// Reads the same flat <patient> dialect Popups > Export writes (see
// patient-export.js) -- pid/pubpid/lname/fname/mname/ss/dob/sex/street/
// city/state/zip/country/phone_home/phone_biz/phone_contact/phone_cell/
// email/status/race/ethnicity/language/occupation. Tags this app has no
// field for (ss, country, phone_contact) are simply ignored if present.
function parsePatientXml(raw) {
    let doc;

    try {
        doc = new DOMParser().parseFromString(raw, "text/xml");
    } catch (e) {
        return { success: false, message: "Could not parse the pasted text as XML." };
    }

    if (doc.querySelector("parsererror")) {
        return { success: false, message: "The pasted text is not valid XML." };
    }

    const root = doc.querySelector("patient");

    if (!root) {
        return { success: false, message: "Not a recognized patient export -- expected a <patient> root element." };
    }

    const text = (tag) => {
        const el = root.querySelector(tag);
        const value = el ? el.textContent.trim() : "";
        return value === "" ? null : value;
    };

    return {
        success: true,
        data: {
            pid: text("pid"),
            pubpid: text("pubpid"),
            lname: text("lname"),
            fname: text("fname"),
            mname: text("mname"),
            dob: text("dob"),
            sex: text("sex"),
            street: text("street"),
            city: text("city"),
            state: text("state"),
            zip: text("zip"),
            phone_home: text("phone_home"),
            phone_biz: text("phone_biz"),
            phone_cell: text("phone_cell"),
            email: text("email"),
            status: text("status"),
            race: text("race"),
            ethnicity: text("ethnicity"),
            language: text("language"),
            occupation: text("occupation")
        }
    };
}

// updatePatient() re-validates and rewrites the *entire* demographics
// record (first_name/sex/birthdate/height/weight/etc. are all required
// every call) and the contact/employer upserts default any field not
// in the payload to NULL rather than leaving it alone -- so every field
// below is always sent, falling back to the patient's own current value
// for anything the pasted XML left blank or has no tag for at all
// (blood_type/height/weight/suffix/religion/allow_*/employer_* beyond
// occupation). This mirrors the same "fetch full record, merge, then
// call the destructive update" discipline used for Popups > Issues'
// relate/unrelate actions.
function buildUpdatePayload(patient, xml) {
    const sex = xml.sex ? SEX_MAP[xml.sex.toUpperCase()] : null;

    return {
        provider_id: patient.provider_id,
        first_name: xml.fname || patient.first_name,
        middle_name: xml.mname || patient.middle_name,
        last_name: xml.lname || patient.last_name,
        suffix: patient.suffix,
        sex: sex || patient.sex,
        birthdate: xml.dob || patient.birthdate,
        civil_status: xml.status || patient.civil_status,
        blood_type: patient.blood_type,
        race: xml.race || patient.race,
        ethnicity: xml.ethnicity || patient.ethnicity,
        religion: patient.religion,
        language: xml.language || patient.language,
        allow_sms: patient.allow_sms,
        allow_voice_calls: patient.allow_voice_calls,
        allow_email: patient.allow_email,
        allow_hie: patient.allow_hie,
        allow_postcard: patient.allow_postcard,
        height: patient.height,
        weight: patient.weight,
        address_line: xml.street || patient.contact_address_line,
        city: xml.city || patient.contact_city,
        province: xml.state || patient.contact_province,
        zip_code: xml.zip || patient.contact_zip_code,
        home_phone: xml.phone_home || patient.contact_home_phone,
        mobile_phone: xml.phone_cell || patient.contact_mobile_phone,
        work_phone: xml.phone_biz || patient.contact_work_phone,
        contact_email: xml.email || patient.contact_email,
        employer_occupation: xml.occupation || patient.employer_occupation,
        employer_name: patient.employer_name,
        employer_address_line: patient.employer_address_line,
        employer_address_line2: patient.employer_address_line2,
        employer_city: patient.employer_city,
        employer_state: patient.employer_state,
        employer_postal_code: patient.employer_postal_code,
        employer_country: patient.employer_country,
        employer_industry: patient.employer_industry,
        employer_employment_start_date: patient.employer_employment_start_date,
        employer_employment_end_date: patient.employer_employment_end_date,
        date_deceased: patient.date_deceased,
        reason_deceased: patient.reason_deceased
    };
}

function escapeHtml(value) {
    if (value == null) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
