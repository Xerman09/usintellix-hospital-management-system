import { getUser } from "../../core/session.js";
import { consumePendingPatientView, setLastActivePatientChart, getLastActivePatientChart, clearLastActivePatientChart, setLastActiveChartSection, getLastActiveChartSection } from "../../core/pending-patient-view.js";
import { createAppointment, fetchAppointments } from "../appointments/appointments.service.js";
import { formatApptDate, formatApptTime } from "../appointments/appointment-format.js";
import { fetchPatientLedger, addLedgerPayment } from "../patient-ledger/patient-ledger.service.js";
import { fetchPatientDocuments, uploadPatientDocument, deletePatientDocument } from "../patient-documents/patient-documents.service.js";
import { fetchRooms } from "../rooms/rooms.service.js";
import { PatientChartView } from "./patients-list.view.js?v=49";
import { initGeneralHistory } from "./patient-general-history.js?v=2";
import { initFamilyHistory } from "./patient-family-history.js?v=2";
import { initRelativesHistory } from "./patient-relatives-history.js?v=2";
import { initLifestyle } from "./patient-lifestyle.js";
import { initOtherHistory } from "./patient-other-history.js";
import { initSdohAssessment } from "./patient-sdoh-assessment.js?v=2";
import { fetchPatients, deletePatient, createPatient, updatePatient, fetchPatientDashboardSummary, uploadPatientPhoto, removePatientPhoto, fetchAiHealthAssessment } from "./patients.service.js";
import { patientAvatarHtml } from "../../core/patient-avatar.js";
import { API_URL } from "../../core/api.js?v=5";
import { fetchProviders } from "../providers/providers.service.js";
import {
    fetchPatientTransactions,
    addPatientTransaction,
    updatePatientTransaction
} from "../patient-transactions/patient-transactions.service.js";
import {
    fetchPatientMedicalDevices,
    addPatientMedicalDevice,
    updatePatientMedicalDevice,
    removePatientMedicalDevice
} from "../patient-medical-devices/patient-medical-devices.service.js";
import {
    fetchPatientSurgeries,
    addPatientSurgery,
    updatePatientSurgery,
    removePatientSurgery
} from "../patient-surgeries/patient-surgeries.service.js";
import { fetchSurgeries } from "../surgeries/surgeries.service.js";
import {
    fetchPatientDentalIssues,
    addPatientDentalIssue,
    updatePatientDentalIssue,
    removePatientDentalIssue
} from "../patient-dental-issues/patient-dental-issues.service.js";
import { enablePasswordToggles } from "../../core/password-toggle.js";
import { fetchAllergies } from "../allergies/allergies.service.js";
import { fetchPatientAllergies, addPatientAllergy, updatePatientAllergy, removePatientAllergy } from "../patient-allergies/patient-allergies.service.js?v=1";
import { fetchIcd10Diagnoses } from "../icd10-diagnoses/icd10-diagnoses.service.js";
import { fetchCvxCodes } from "../cvx-codes/cvx-codes.service.js";
import { searchCqmValuesetCodes } from "../cqm-valuesets/cqm-valuesets.service.js";
import { fetchMedicalProblems } from "../medical-problems/medical-problems.service.js";
import {
    fetchPatientMedicalProblems,
    addPatientMedicalProblem,
    updatePatientMedicalProblem,
    removePatientMedicalProblem
} from "../patient-medical-problems/patient-medical-problems.service.js";
import {
    fetchPatientHealthConcerns,
    addPatientHealthConcern,
    updatePatientHealthConcern,
    removePatientHealthConcern
} from "../patient-health-concerns/patient-health-concerns.service.js";
import { fetchMedications } from "../medications/medications.service.js";
import {
    fetchPatientMedications,
    addPatientMedication,
    updatePatientMedication,
    removePatientMedication
} from "../patient-medications/patient-medications.service.js";
import {
    fetchPatientPrescriptions,
    addPatientPrescription,
    updatePatientPrescription,
    removePatientPrescription
} from "../patient-prescriptions/patient-prescriptions.service.js";
import {
    fetchPatientImmunizations,
    addPatientImmunization,
    updatePatientImmunization,
    removePatientImmunization
} from "../patient-immunizations/patient-immunizations.service.js";
import {
    fetchRelatedPersons, addRelatedPerson, updateRelatedPerson, removeRelatedPerson,
    fetchTelecoms, addTelecom, updateTelecom, removeTelecom,
    fetchAddresses, addAddress, updateAddress, removeAddress
} from "../related-persons/related-persons.service.js";
import { fetchCountries, fetchPhProvinces, isPhilippines } from "../related-persons/geography.service.js";
import { fetchPatientDisclosures, addDisclosure, updateDisclosure, removeDisclosure } from "../disclosures/disclosures.service.js";
import {
    fetchPatientMessages, sendPatientMessage, fetchMessageTypes, fetchMessageStatuses, fetchRecipientOptions
} from "../messages/messages.service.js";
import { fetchPatientAmendments, addAmendment, updateAmendment, removeAmendment } from "../amendments/amendments.service.js";
import {
    fetchPatientEncounters, fetchLinkableIssues, addEncounter, updateEncounter, removeEncounter,
    fetchDischargeDispositions, updateEncounterBillingNote
} from "../encounters/encounters.service.js";
import { fetchCareTeam, fetchCareTeamOptions, saveCareTeam } from "../care-team/care-team.service.js";
import { fetchVisitCategories } from "../visit-categories/visit-categories.service.js";
import { fetchClasses } from "../classes/classes.service.js";
import { fetchVisitTypes } from "../visit-types/visit-types.service.js";
import { fetchFacilities } from "../facilities/facilities.service.js";
import {
    fetchEncounterSections, signEncounterSection, deleteEncounterSection
} from "../encounter-sections/encounter-sections.service.js";
import {
    fetchClinicalInstructionItems, addClinicalInstructionItem, updateClinicalInstructionItem, removeClinicalInstructionItem
} from "../encounter-sections/encounter-clinical-instruction-items.service.js";
import {
    fetchClinicalNoteItems, addClinicalNoteItem, updateClinicalNoteItem, removeClinicalNoteItem
} from "../encounter-sections/encounter-clinical-note-items.service.js";
import {
    fetchFunctionalCognitiveStatusItems, addFunctionalCognitiveStatusItem,
    updateFunctionalCognitiveStatusItem, removeFunctionalCognitiveStatusItem
} from "../encounter-sections/encounter-functional-cognitive-status-items.service.js";
import {
    fetchObservationItems, addObservationItem, updateObservationItem, removeObservationItem
} from "../encounter-sections/encounter-observation-items.service.js";
import { fetchReviewOfSystems, saveReviewOfSystems } from "../encounter-sections/encounter-review-of-systems.service.js";
import {
    fetchReviewOfSystemsChecks, saveReviewOfSystemsChecks
} from "../encounter-sections/encounter-review-of-systems-checks.service.js";
import {
    fetchSoapNotes, addSoapNote, updateSoapNote, removeSoapNote, signSoapNote
} from "../encounter-sections/encounter-soap-notes.service.js";
import {
    fetchSpeechDictationItems, addSpeechDictationItem, updateSpeechDictationItem, removeSpeechDictationItem
} from "../encounter-sections/encounter-speech-dictation-items.service.js";
import {
    fetchEncounterVitals, saveEncounterVitals, fetchVitalsHistory
} from "../encounter-sections/encounter-vitals.service.js";
import {
    fetchCarePlanItems, addCarePlanItem, updateCarePlanItem, removeCarePlanItem
} from "../encounter-sections/encounter-care-plan-items.service.js";
import { fetchCarePlanReasonCodes } from "../care-plan-reason-codes/care-plan-reason-codes.service.js";
import { fetchEncounterMiscBillingOptions, saveEncounterMiscBillingOptions } from "../encounter-sections/encounter-misc-billing-options.service.js";
import { fetchInsurances } from "../insurances/insurances.service.js";
import {
    fetchPatientInsurances, addPatientInsurance, updatePatientInsurance, removePatientInsurance
} from "../patient-insurances/patient-insurances.service.js";
import { openCodePicker } from "./code-picker.js";

const ALLERGY_DETAIL_FIELDS = [
    "begin_date", "end_date", "reaction", "severity", "comments", "coding",
    "occurrence", "outcome", "classification_type", "verification_status",
    "referred_by", "destination"
];

const PROBLEM_DETAIL_FIELDS = [
    "title", "begin_date", "end_date", "comments", "coding",
    "occurrence", "outcome", "classification_type", "verification_status",
    "referred_by", "destination"
];

const MEDICATION_DETAIL_FIELDS = [
    "title", "begin_date", "end_date", "medication_usage", "request_intent",
    "is_primary_record", "comments", "coding",
    "occurrence", "outcome", "classification_type", "verification_status",
    "referred_by", "destination"
];

const DEVICE_DETAIL_FIELDS = [
    "title", "begin_date", "end_date", "udi", "comments", "coding",
    "occurrence", "outcome", "classification_type", "verification_status",
    "referred_by", "destination"
];

const SURGERY_DETAIL_FIELDS = [
    "title", "begin_date", "end_date", "comments", "coding",
    "occurrence", "outcome", "classification_type", "verification_status",
    "referred_by", "destination"
];

const DENTAL_ISSUE_DETAIL_FIELDS = [
    "title", "begin_date", "end_date", "comments", "coding",
    "occurrence", "outcome", "classification_type", "verification_status",
    "referred_by", "destination"
];

const PRESCRIPTION_DETAIL_FIELDS = [
    "title", "begin_date", "end_date", "quantity", "dosage", "route",
    "frequency", "refills", "directions", "substitution_allowed", "pharmacy",
    "comments", "coding",
    "occurrence", "outcome", "classification_type", "verification_status",
    "referred_by", "destination"
];

const IMMUNIZATION_DETAIL_FIELDS = [
    "vaccine_name", "administered_at", "amount_administered", "amount_unit",
    "expiration_date", "manufacturer", "lot_number", "administered_by",
    "administered_by_provider_id", "vis_date_given", "vis_date_document",
    "route", "administration_site", "notes", "information_source",
    "completion_status", "refusal_reason", "reason_code",
    "ordering_provider_id", "encounter_id"
];

const CARE_PLAN_TYPE_OPTIONS = [
    "Appointments", "Device Order", "Goal", "Health Concern", "Instructions",
    "Intervention", "Medication", "Planned Medication Act", "Plan of Care",
    "Procedure", "Supply Order Act", "Test/Order"
];

const CARE_PLAN_STATUS_OPTIONS = [
    "Active", "Completed", "Draft", "Entered in error", "On hold", "Revoked", "Unknown"
];

const CARE_PLAN_REASON_STATUS_OPTIONS = ["Pending", "Completed", "Negated"];

const CLINICAL_NOTE_TYPE_OPTIONS = [
    "Evaluation Note", "Progress Note", "Nurse Note", "History & Physical", "General Note",
    "Discharge Summary Note", "Procedure Note", "Consultation Note", "Diagnostic imaging study",
    "Laboratory Report Narrative", "Pathology Report Narrative", "Surgical operation note",
    "Emergency department Note"
];

const CLINICAL_NOTE_CATEGORY_OPTIONS = ["Cardiology", "Pathology", "Radiology"];

const OBSERVATION_STATUS_OPTIONS = [
    "Registered", "Preliminary", "Final", "Amended", "Corrected", "Cancelled", "Entered in Error", "Unknown"
];

const OBSERVATION_TYPE_OPTIONS = [
    "Activity", "Assessment", "Care Experience Preference", "Cognitive Status", "Disability Status", "Exam",
    "Functional Status", "Imaging", "Laboratory", "Observation ADI Documentation", "Procedure",
    "Social Determinants of Health (SDOH)", "Social History", "Survey", "Therapy",
    "Treatment Intervention Preference", "Vital Signs"
];

const REVIEW_OF_SYSTEMS_SECTIONS = [
    { title: "Constitutional", fields: [["constitutional_weight_change", "Weight Change"], ["constitutional_anorexia", "Anorexia"], ["constitutional_night_sweats", "Night Sweats"], ["constitutional_heat_or_cold", "Heat or Cold"], ["constitutional_weakness", "Weakness"], ["constitutional_fever", "Fever"], ["constitutional_insomnia", "Insomnia"], ["constitutional_intolerance", "Intolerance"], ["constitutional_fatigue", "Fatigue"], ["constitutional_chills", "Chills"], ["constitutional_irritability", "Irritability"]] },
    { title: "Eyes", fields: [["eyes_change_in_vision", "Change in Vision"], ["eyes_irritation", "Irritation"], ["eyes_double_vision", "Double Vision"], ["eyes_family_history_glaucoma", "Family History of Glaucoma"], ["eyes_redness", "Redness"], ["eyes_blind_spots", "Blind Spots"], ["eyes_eye_pain", "Eye Pain"], ["eyes_excessive_tearing", "Excessive Tearing"], ["eyes_photophobia", "Photophobia"]] },
    { title: "Ears, Nose, Mouth, Throat", fields: [["ent_hearing_loss", "Hearing Loss"], ["ent_vertigo", "Vertigo"], ["ent_sore_throat", "Sore Throat"], ["ent_nosebleed", "Nosebleed"], ["ent_discharge", "Discharge"], ["ent_tinnitus", "Tinnitus"], ["ent_sinus_problems", "Sinus Problems"], ["ent_snoring", "Snoring"], ["ent_pain", "Pain"], ["ent_frequent_colds", "Frequent Colds"], ["ent_post_nasal_drip", "Post Nasal Drip"], ["ent_apnea", "Apnea"]] },
    { title: "Breast", fields: [["breast_mass", "Breast Mass"], ["breast_abnormal_mammogram", "Abnormal Mammogram"], ["breast_discharge", "Discharge"], ["breast_biopsy", "Biopsy"]] },
    { title: "Respiratory", fields: [["resp_cough", "Cough"], ["resp_wheezing", "Wheezing"], ["resp_copd", "COPD"], ["resp_sputum", "Sputum"], ["resp_hemoptysis", "Hemoptysis"], ["resp_shortness_of_breath", "Shortness of Breath"], ["resp_asthma", "Asthma"]] },
    { title: "Cardiovascular", fields: [["cv_chest_pain", "Chest Pain"], ["cv_pnd", "PND"], ["cv_peripheral", "Peripheral"], ["cv_history_heart_murmur", "History of Heart Murmur"], ["cv_palpitation", "Palpitation"], ["cv_doe", "DOE"], ["cv_edema", "Edema"], ["cv_arrythmia", "Arrythmia"], ["cv_syncope", "Syncope"], ["cv_orthopnea", "Orthopnea"], ["cv_leg_pain_cramping", "Leg Pain/Cramping"], ["cv_heart_problem", "Heart Problem"]] },
    { title: "Gastrointestinal", fields: [["gi_dysphagia", "Dysphagia"], ["gi_belching", "Belching"], ["gi_vomiting", "Vomiting"], ["gi_food_intolerance", "Food Intolerance"], ["gi_hematochezia", "Hematochezia"], ["gi_constipation", "Constipation"], ["gi_heartburn", "Heartburn"], ["gi_flatulence", "Flatulence"], ["gi_hematemesis", "Hematemesis"], ["gi_ho_hepatitis", "H/O Hepatitis"], ["gi_changed_bowel", "Changed Bowel"], ["gi_bloating", "Bloating"], ["gi_nausea", "Nausea"], ["gi_pain", "Pain"]] },
    { title: "Genitourinary General", fields: [["gu_general_polyuria", "Polyuria"], ["gu_general_hematuria", "Hematuria"], ["gu_general_incontinence", "Incontinence"], ["gu_general_polydypsia", "Polydypsia"], ["gu_general_frequency", "Frequency"], ["gu_general_renal_stones", "Renal Stones"], ["gu_general_dysuria", "Dysuria"], ["gu_general_urgency", "Urgency"], ["gu_general_utis", "UTIs"]] },
    { title: "Genitourinary Male", fields: [["gu_male_hesitancy", "Hesitancy"], ["gu_male_nocturia", "Nocturia"], ["gu_male_dribbling", "Dribbling"], ["gu_male_erections", "Erections"], ["gu_male_stream", "Stream"], ["gu_male_ejaculations", "Ejaculations"]] },
    { title: "Genitourinary Female", fields: [["gu_female_g", "Female G"], ["gu_female_lc", "Female LC"], ["gu_female_lmp", "LMP"], ["gu_female_symptoms", "Symptoms"], ["gu_female_p", "Female P"], ["gu_female_menarche", "Menarche"], ["gu_female_frequency", "Frequency"], ["gu_female_abnormal_hair_growth", "Abnormal Hair Growth"], ["gu_female_ap", "Female AP"], ["gu_female_menopause", "Menopause"], ["gu_female_flow", "Flow"], ["gu_female_fh_hirsutism_striae", "F/H Female Hirsutism/Striae"]] },
    { title: "Musculoskeletal", fields: [["msk_chronic_joint_pain", "Chronic Joint Pain"], ["msk_warm", "Warm"], ["msk_aches", "Aches"], ["msk_swelling", "Swelling"], ["msk_stiffness", "Stiffness"], ["msk_fms", "FMS"], ["msk_redness", "Redness"], ["msk_muscle", "Muscle"], ["msk_arthritis", "Arthritis"]] },
    { title: "Neurologic", fields: [["neuro_loc", "LOC"], ["neuro_tia", "TIA"], ["neuro_paralysis", "Paralysis"], ["neuro_dementia", "Dementia"], ["neuro_seizures", "Seizures"], ["neuro_numbness", "Numbness"], ["neuro_intellectual_decline", "Intellectual Decline"], ["neuro_headache", "Headache"], ["neuro_stroke", "Stroke"], ["neuro_weakness", "Weakness"], ["neuro_memory_problems", "Memory Problems"]] },
    { title: "Skin", fields: [["skin_cancer", "Cancer"], ["skin_other", "Other"], ["skin_psoriasis", "Psoriasis"], ["skin_disease", "Disease"], ["skin_acne", "Acne"]] },
    { title: "Psychiatric", fields: [["psych_psychiatric_diagnosis", "Psychiatric Diagnosis"], ["psych_anxiety", "Anxiety"], ["psych_psychiatric_medication", "Psychiatric Medication"], ["psych_social_difficulties", "Social Difficulties"], ["psych_depression", "Depression"]] },
    { title: "Endocrine", fields: [["endo_thyroid_problems", "Thyroid Problems"], ["endo_diabetes", "Diabetes"], ["endo_abnormal_blood_test", "Abnormal Blood Test"]] },
    { title: "Hematologic/Allergic/Immunologic", fields: [["hai_anemia", "Anemia"], ["hai_allergies", "Allergies"], ["hai_hai_status", "HAI Status"], ["hai_fh_blood_problems", "F/H Blood Problems"], ["hai_frequent_illness", "Frequent Illness"], ["hai_bleeding_problems", "Bleeding Problems"], ["hai_hiv", "HIV"]] }
];

const REVIEW_OF_SYSTEMS_CHECKS_SECTIONS = [
    { title: "General", fields: [["general_fever", "Fever"], ["general_chills", "Chills"], ["general_night_sweats", "Night Sweats"], ["general_weight_loss", "Weight Loss"], ["general_poor_appetite", "Poor Appetite"], ["general_insomnia", "Insomnia"], ["general_fatigued", "Fatigued"], ["general_depressed", "Depressed"], ["general_hyperactive", "Hyperactive"], ["general_exposure_foreign_countries", "Exposure to Foreign Countries"]] },
    { title: "Skin", fields: [["skin_rashes", "Rashes"], ["skin_infections", "Infections"], ["skin_ulcerations", "Ulcerations"], ["skin_pemphigus", "Pemphigus"], ["skin_herpes", "Herpes"]] },
    { title: "HEENT", fields: [["heent_cataracts", "Cataracts"], ["heent_cataract_surgery", "Cataract Surgery"], ["heent_glaucoma", "Glaucoma"], ["heent_double_vision", "Double Vision"], ["heent_blurred_vision", "Blurred Vision"], ["heent_poor_hearing", "Poor Hearing"], ["heent_headaches", "Headaches"], ["heent_ringing_in_ears", "Ringing in Ears"], ["heent_bloody_nose", "Bloody Nose"], ["heent_sinusitis", "Sinusitis"], ["heent_sinus_surgery", "Sinus Surgery"], ["heent_dry_mouth", "Dry Mouth"], ["heent_strep_throat", "Strep Throat"], ["heent_tonsillectomy", "Tonsillectomy"], ["heent_swollen_lymph_nodes", "Swollen Lymph Nodes"], ["heent_throat_cancer", "Throat Cancer"], ["heent_throat_cancer_surgery", "Throat Cancer Surgery"]] },
    { title: "Pulmonary", fields: [["pulm_emphysema", "Emphysema"], ["pulm_chronic_bronchitis", "Chronic Bronchitis"], ["pulm_interstitial_lung_disease", "Interstitial Lung Disease"], ["pulm_shortness_of_breath", "Shortness of Breath"], ["pulm_lung_cancer", "Lung Cancer"], ["pulm_lung_cancer_surgery", "Lung Cancer Surgery"], ["pulm_pheumothorax", "Pheumothorax"]] },
    { title: "Cardiovascular", fields: [["cv_heart_attack", "Heart Attack"], ["cv_irregular_heart_beat", "Irregular Heart Beat"], ["cv_chest_pains", "Chest Pains"], ["cv_shortness_of_breath", "Shortness of Breath"], ["cv_high_blood_pressure", "High Blood Pressure"], ["cv_heart_failure", "Heart Failure"], ["cv_poor_circulation", "Poor Circulation"], ["cv_vascular_surgery", "Vascular Surgery"], ["cv_cardiac_catheterization", "Cardiac Catheterization"], ["cv_coronary_artery_bypass", "Coronary Artery Bypass"], ["cv_heart_transplant", "Heart Transplant"], ["cv_stress_test", "Stress Test"]] },
    { title: "Gastrointestinal", fields: [["gi_stomach_pains", "Stomach Pains"], ["gi_peptic_ulcer_disease", "Peptic Ulcer Disease"], ["gi_gastritis", "Gastritis"], ["gi_endoscopy", "Endoscopy"], ["gi_polyps", "Polyps"], ["gi_colonoscopy", "Colonoscopy"], ["gi_colon_cancer", "Colon Cancer"], ["gi_colon_cancer_surgery", "Colon Cancer Surgery"], ["gi_ulcerative_colitis", "Ulcerative Colitis"], ["gi_crohns_disease", "Crohn's Disease"], ["gi_appendectomy", "Appendectomy"], ["gi_diverticulitis", "Diverticulitis"], ["gi_diverticulitis_surgery", "Diverticulitis Surgery"], ["gi_gall_stones", "Gall Stones"], ["gi_cholecystectomy", "Cholecystectomy"], ["gi_hepatitis", "Hepatitis"], ["gi_cirrhosis_liver", "Cirrhosis of the Liver"], ["gi_splenectomy", "Splenectomy"]] },
    { title: "Genitourinary", fields: [["gu_kidney_failure", "Kidney Failure"], ["gu_kidney_stones", "Kidney Stones"], ["gu_kidney_cancer", "Kidney Cancer"], ["gu_kidney_infections", "Kidney Infections"], ["gu_bladder_infections", "Bladder Infections"], ["gu_bladder_cancer", "Bladder Cancer"], ["gu_prostate_problems", "Prostate Problems"], ["gu_prostate_cancer", "Prostate Cancer"], ["gu_kidney_transplant", "Kidney Transplant"], ["gu_sexually_transmitted_disease", "Sexually Transmitted Disease"], ["gu_burning_with_urination", "Burning with Urination"], ["gu_discharge_from_urethra", "Discharge From Urethra"]] },
    { title: "Musculoskeletal", fields: [["msk_osetoarthritis", "Osetoarthritis"], ["msk_rheumotoid_arthritis", "Rheumotoid Arthritis"], ["msk_lupus", "Lupus"], ["msk_ankylosing_spondlilitis", "Ankylosing Spondlilitis"], ["msk_swollen_joints", "Swollen Joints"], ["msk_stiff_joints", "Stiff Joints"], ["msk_broken_bones", "Broken Bones"], ["msk_neck_problems", "Neck Problems"], ["msk_back_problems", "Back Problems"], ["msk_back_surgery", "Back Surgery"], ["msk_scoliosis", "Scoliosis"], ["msk_herniated_disc", "Herniated Disc"], ["msk_shoulder_problems", "Shoulder Problems"], ["msk_elbow_problems", "Elbow Problems"], ["msk_wrist_problems", "Wrist Problems"], ["msk_hand_problems", "Hand Problems"], ["msk_hip_problems", "Hip Problems"], ["msk_knee_problems", "Knee Problems"], ["msk_ankle_problems", "Ankle Problems"], ["msk_foot_problems", "Foot Problems"]] },
    { title: "Endocrine", fields: [["endo_insulin_dependent_diabetes", "Insulin Dependent Diabetes"], ["endo_non_insulin_dependent_diabetes", "Non-Insulin Dependent Diabetes"], ["endo_hypothyroidism", "Hypothyroidism"], ["endo_hyperthyroidism", "Hyperthyroidism"], ["endo_cushing_syndrome", "Cushing Syndrome"], ["endo_addison_syndrome", "Addison Syndrome"]] }
];

const VITALS_FIELDS = [
    { key: "weight", label: "Weight", loinc: "29463-7", unit: "lbs", type: "numeric" },
    { key: "height", label: "Height/Length", loinc: "8302-2", unit: "in", type: "numeric" },
    { key: "bp_systolic", label: "BP Systolic", loinc: "8480-6", unit: "mmHg", type: "numeric" },
    { key: "bp_diastolic", label: "BP Diastolic", loinc: "8462-4", unit: "mmHg", type: "numeric" },
    { key: "pulse", label: "Pulse", loinc: "8867-4", unit: "per min", type: "numeric" },
    { key: "respiration", label: "Respiration", loinc: "9279-1", unit: "per min", type: "numeric" },
    { key: "temperature", label: "Temperature", loinc: "8310-5", unit: "F", type: "numeric" },
    {
        key: "temp_location", label: "Temp Location", loinc: "8327-9", unit: "", type: "select",
        options: ["Oral", "Axillary", "Rectal", "Tympanic", "Temporal", "Other"]
    },
    { key: "oxygen_saturation", label: "Oxygen Saturation", loinc: "59408-5", unit: "%", type: "numeric" },
    { key: "oxygen_flow_rate", label: "Oxygen Flow Rate", loinc: "3151-8", unit: "l/min", type: "numeric" },
    { key: "inhaled_oxygen_concentration", label: "Inhaled Oxygen Concentration", loinc: "3150-0", unit: "%", type: "numeric" },
    { key: "head_circumference", label: "Head Circumference", loinc: "9843-4", unit: "in", type: "numeric" },
    { key: "waist_circumference", label: "Waist Circumference", loinc: "9843-4", unit: "in", type: "numeric" }
];

const VITALS_ABN_OPTIONS = ["Normal", "Abnormal", "High", "Low"];

let carePlanReasonCodesCache = null;
let carePlanRowSeq = 0;
let carePlanReasonPickerOnSelect = null;
let clinicalNoteRowSeq = 0;
let functionalCognitiveRowSeq = 0;
let observationRowSeq = 0;

let currentDashboardPatient = null;
let currentEditPatient = null;
let activeDemoTab = "who";
let dashboardRelatedPersons = [];

// Which CCD report layout ("ccd" or "ccd_detailed") was generated most
// recently, so the Download button can re-render and print the same one
// the user was just looking at instead of always defaulting to one format.
let lastCcdReportType = "ccd";

const CODE_SOURCE_LABELS = {
    ICD10CM: "ICD-10-CM",
    ICD9CM: "ICD-9-CM",
    SNOMEDCT: "SNOMED CT",
    LOINC: "LOINC",
    RXNORM: "RxNorm",
    CPT: "CPT",
    HCPCS: "HCPCS",
    CVX: "CVX"
};

let scmSource = "icd10";
let scmSearchTerm = "";
let scmCurrentPage = 1;
let scmTotalPages = 1;
let scmTotalItems = 0;
let scmItems = [];
let scmSearchDebounce = null;
let scmSort = { field: null, dir: 1 };
let scmCodeOnly = false;
let scmIdFieldId = null;

const FIELDS = [
    "username", "password", "first_name", "middle_name",
    "last_name", "suffix", "sex", "birthdate",
    "civil_status", "blood_type", "height", "weight",
    "provider_id", "allow_sms", "allow_voice_calls", "allow_email", "allow_hie", "allow_postcard",
    "race", "ethnicity", "religion", "language",
    "address_line", "city", "province", "zip_code",
    "home_phone", "mobile_phone", "work_phone", "contact_email",
    "employer_occupation", "employer_name", "employer_address_line", "employer_address_line2",
    "employer_city", "employer_state", "employer_postal_code", "employer_country",
    "employer_industry", "employer_employment_start_date", "employer_employment_end_date",
    "date_deceased", "reason_deceased"
];

const EDIT_FIELDS = [
    "first_name", "middle_name", "last_name", "suffix", "sex",
    "birthdate", "civil_status", "blood_type", "height", "weight",
    "provider_id", "allow_sms", "allow_voice_calls", "allow_email", "allow_hie", "allow_postcard",
    "race", "ethnicity", "religion", "language",
    "address_line", "city", "province", "zip_code",
    "home_phone", "mobile_phone", "work_phone", "contact_email",
    "employer_occupation", "employer_name", "employer_address_line", "employer_address_line2",
    "employer_city", "employer_state", "employer_postal_code", "employer_country",
    "employer_industry", "employer_employment_start_date", "employer_employment_end_date",
    "date_deceased", "reason_deceased"
];

let patientsCache = [];

export async function initPatientsList()
{
    const user = getUser();

    if (!user || !["admin", "receptionist", "doctor"].includes(user.role)) {
        window.location.hash = "#/dashboard";
        return;
    }

    const pageRoot = document.querySelector(".pat-page");

    if (!pageRoot || pageRoot.dataset.wired === "true") {
        return;
    }

    pageRoot.dataset.wired = "true";

    await loadPatients(user);
    setupPatientFilters(user);

    if (user.role !== "patient") {
        await setupEditPatientModal(user);
    }

    if (user.role === "receptionist" || user.role === "doctor") {
        await setupAddPatientModal(user);
    }

    openPendingPatientView();
}

const CHART_NAV_LABELS = {
    dashboard: "Dashboard",
    history: "History",
    assessments: "Assessments",
    sdoh_assessment: "SDOH Assessment",
    report: "Report",
    documents: "Documents",
    transactions: "Transactions",
    issues: "Issues",
    encounter: "Encounter",
    ledger: "Ledger",
    external_data: "External Data"
};

// Sections with an existing widget on the dashboard grid scroll straight to
// it; everything else (no backend/UI built yet) shows the placeholder panel.
// "issues" has its own dedicated panel instead (see showChartSection).
const CHART_NAV_WIDGET_TARGETS = {
    documents: "pdWidget-documents"
};

function setupChartNav()
{
    document.querySelectorAll("#pdChartNav .pd-chart-nav-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const key = btn.getAttribute("data-chart-nav");

            if (key === "assessments") {
                const expanded = btn.classList.toggle("expanded");
                document.getElementById("pdAssessmentsSubmenu").classList.toggle("expanded", expanded);
                return;
            }

            activateChartNavButton(btn);
            showChartSection(key);
        });
    });

    document.querySelectorAll("#pdAssessmentsSubmenu .pd-chart-nav-submenu-item").forEach((btn) => {
        btn.addEventListener("click", () => {
            activateChartNavButton(btn);
            showChartSection(btn.getAttribute("data-chart-nav"));
        });
    });
}

function setupReports()
{
    const cb = document.getElementById("pdCcrUseDateRange");
    const dateRangeContainer = document.getElementById("pdCcrDateRangeContainer");
    const generateBtn = document.getElementById("pdCcrGenerateBtn");

    if (cb) {
        const newCb = cb.cloneNode(true);
        cb.parentNode.replaceChild(newCb, cb);
        newCb.addEventListener("change", () => {
            dateRangeContainer.style.display = newCb.checked ? "flex" : "none";
        });
    }

    if (generateBtn) {
        const newGenerateBtn = generateBtn.cloneNode(true);
        generateBtn.parentNode.replaceChild(newGenerateBtn, generateBtn);
        newGenerateBtn.addEventListener("click", async () => {
            if (!currentDashboardPatient) return;
            
            // Open window synchronously to avoid popup blockers
            const reportWindow = window.open("", "_blank", "width=850,height=800,scrollbars=yes");
            if (reportWindow) {
                reportWindow.document.open();
                reportWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head><title>Loading Report...</title>
                    <style>body { font-family: sans-serif; padding: 40px; text-align: center; color: #555; }</style>
                    </head>
                    <body><h2>Generating Continuity of Care Record...</h2><p>Please wait while we gather the patient's data.</p></body>
                    </html>
                `);
            } else {
                alert("Please enable pop-ups to view the report.");
                return;
            }
            
            newGenerateBtn.disabled = true;
            newGenerateBtn.textContent = "Generating...";
            
            const result = await fetchPatientDashboardSummary(currentDashboardPatient.id);
            newGenerateBtn.disabled = false;
            newGenerateBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;margin-right:5px;"><polyline points="20 6 9 17 4 12"></polyline></svg> Generate Report';
            
            if (!result.success) {
                reportWindow.document.open();
                reportWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head><title>Error</title>
                    <style>body { font-family: sans-serif; padding: 40px; text-align: center; color: #d32f2f; }</style>
                    </head>
                    <body><h2>Failed to load patient data for report.</h2></body>
                    </html>
                `);
                reportWindow.document.close();
                return;
            }
            
            const useDateRange = document.getElementById("pdCcrUseDateRange").checked;
            const startDate = useDateRange ? document.getElementById("pdCcrStartDate").value : null;
            const endDate = useDateRange ? document.getElementById("pdCcrEndDate").value : null;

            const html = generateCcrReportHtml(currentDashboardPatient, result.data || {}, startDate, endDate);
            
            reportWindow.document.open();
            reportWindow.document.write(html);
            reportWindow.document.close();
        });
    }

    const downloadBtn = document.getElementById("pdCcrDownloadBtn");
    if (downloadBtn) {
        const newDownloadBtn = downloadBtn.cloneNode(true);
        downloadBtn.parentNode.replaceChild(newDownloadBtn, downloadBtn);
        newDownloadBtn.addEventListener("click", async () => {
            if (!currentDashboardPatient) return;
            
            const reportWindow = window.open("", "_blank", "width=850,height=800,scrollbars=yes");
            if (reportWindow) {
                reportWindow.document.open();
                reportWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head><title>Loading Report for Download...</title>
                    <style>body { font-family: sans-serif; padding: 40px; text-align: center; color: #555; }</style>
                    </head>
                    <body><h2>Preparing PDF...</h2><p>Please wait while we gather the patient's data.</p></body>
                    </html>
                `);
            } else {
                alert("Please enable pop-ups to view the report.");
                return;
            }
            
            newDownloadBtn.disabled = true;
            newDownloadBtn.textContent = "Preparing...";
            
            const result = await fetchPatientDashboardSummary(currentDashboardPatient.id);
            newDownloadBtn.disabled = false;
            newDownloadBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;margin-right:5px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Download';
            
            if (!result.success) {
                reportWindow.document.open();
                reportWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head><title>Error</title>
                    <style>body { font-family: sans-serif; padding: 40px; text-align: center; color: #d32f2f; }</style>
                    </head>
                    <body><h2>Failed to load patient data for report.</h2></body>
                    </html>
                `);
                reportWindow.document.close();
                return;
            }
            
            const useDateRange = document.getElementById("pdCcrUseDateRange").checked;
            const startDate = useDateRange ? document.getElementById("pdCcrStartDate").value : null;
            const endDate = useDateRange ? document.getElementById("pdCcrEndDate").value : null;

            const html = generateCcrReportHtml(currentDashboardPatient, result.data || {}, startDate, endDate);
            
            reportWindow.document.open();
            reportWindow.document.write(html);
            reportWindow.document.write('<script>window.onload = function() { window.print(); }</script>');
            reportWindow.document.close();
        });
    }

    const ccdGenerateBtn = document.getElementById("pdCcdGenerateBtn");
    if (ccdGenerateBtn) {
        const newCcdGenerateBtn = ccdGenerateBtn.cloneNode(true);
        ccdGenerateBtn.parentNode.replaceChild(newCcdGenerateBtn, ccdGenerateBtn);
        newCcdGenerateBtn.addEventListener("click", async () => {
            await runCcdReport(newCcdGenerateBtn, "ccd", "Generating Continuity of Care Document...");
        });
    }

    const ccdGenerateNewBtn = document.getElementById("pdCcdGenerateNewBtn");
    if (ccdGenerateNewBtn) {
        const newCcdGenerateNewBtn = ccdGenerateNewBtn.cloneNode(true);
        ccdGenerateNewBtn.parentNode.replaceChild(newCcdGenerateNewBtn, ccdGenerateNewBtn);
        newCcdGenerateNewBtn.addEventListener("click", async () => {
            await runCcdReport(newCcdGenerateNewBtn, "ccd_detailed", "Generating Continuity of Care Document...");
        });
    }

    const ccdDownloadBtn = document.getElementById("pdCcdDownloadBtn");
    if (ccdDownloadBtn) {
        const newCcdDownloadBtn = ccdDownloadBtn.cloneNode(true);
        ccdDownloadBtn.parentNode.replaceChild(newCcdDownloadBtn, ccdDownloadBtn);
        newCcdDownloadBtn.addEventListener("click", async () => {
            await runCcdReport(newCcdDownloadBtn, lastCcdReportType, "Preparing PDF...", true);
        });
    }

    setupPatientReportCard();
    setupSimplePatientReportCard("pdIssues", "Generating Issues report...", generateIssuesReportHtml);
    setupSimplePatientReportCard("pdProcedures", "Generating Procedures report...", generateProceduresReportHtml);
    setupSimplePatientReportCard("pdDocuments", "Generating Documents report...", generateDocumentsReportHtml);

    const aiGenerateBtn = document.getElementById("pdAiReportGenerateBtn");
    if (aiGenerateBtn) {
        const newAiBtn = aiGenerateBtn.cloneNode(true);
        aiGenerateBtn.parentNode.replaceChild(newAiBtn, aiGenerateBtn);
        newAiBtn.addEventListener("click", async () => {
            if (!currentDashboardPatient) return;

            const reportWindow = window.open("", "_blank", "width=850,height=800,scrollbars=yes");
            if (!reportWindow) {
                alert("Please enable pop-ups to view the report.");
                return;
            }

            reportWindow.document.open();
            reportWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head><title>Loading Report...</title>
                <style>body { font-family: sans-serif; padding: 40px; text-align: center; color: #555; }</style>
                </head>
                <body><h2>Fetching Patient Data...</h2><p>Please wait.</p></body>
                </html>
            `);

            newAiBtn.disabled = true;
            newAiBtn.textContent = "Analyzing...";

            const summaryRes = await fetchPatientDashboardSummary(currentDashboardPatient.id);
            if (!summaryRes.success) {
                reportWindow.document.open();
                reportWindow.document.write(`<h2>Failed to load data.</h2>`);
                reportWindow.document.close();
                newAiBtn.disabled = false;
                newAiBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;margin-right:5px;"><polyline points="20 6 9 17 4 12"></polyline></svg> Generate AI Report';
                return;
            }

            reportWindow.document.open();
            reportWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head><title>Analyzing...</title>
                <style>body { font-family: sans-serif; padding: 40px; text-align: center; color: #555; }</style>
                </head>
                <body><h2>Analyzing with AI...</h2><p>This may take a minute while the AI digests the patient's health assessment.</p></body>
                </html>
            `);

            const aiRes = await fetchAiHealthAssessment(currentDashboardPatient.id, summaryRes.data);

            newAiBtn.disabled = false;
            newAiBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;margin-right:5px;"><polyline points="20 6 9 17 4 12"></polyline></svg> Generate AI Report';

            if (!aiRes.success) {
                reportWindow.document.open();
                reportWindow.document.write(`<h2>Failed to generate AI report.</h2><p>${escapeHtml(aiRes.message || "")}</p>`);
                reportWindow.document.close();
                return;
            }

            const html = generateAiReportHtml(currentDashboardPatient, aiRes.data);
            reportWindow.document.open();
            reportWindow.document.write(html);
            reportWindow.document.close();
        });
    }
}

// Opens a popup synchronously (to dodge popup blockers), shows a loading
// placeholder while patient data is fetched, then renders the report built
// by `buildHtml(patient, dashboardSummaryData)` into it. `autoPrint` is used
// by Download buttons to trigger the browser's print/save-as-PDF dialog once
// the report is ready.
async function runPatientReportWindow(triggerBtn, buildHtml, loadingMessage, autoPrint = false)
{
    if (!currentDashboardPatient) return;

    const reportWindow = window.open("", "_blank", "width=850,height=800,scrollbars=yes");
    if (!reportWindow) {
        alert("Please enable pop-ups to view the report.");
        return;
    }
    reportWindow.document.open();
    reportWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head><title>Loading Report...</title>
        <style>body { font-family: sans-serif; padding: 40px; text-align: center; color: #555; }</style>
        </head>
        <body><h2>${escapeHtml(loadingMessage)}</h2><p>Please wait while we gather the patient's data.</p></body>
        </html>
    `);

    const originalLabel = triggerBtn.innerHTML;
    triggerBtn.disabled = true;
    triggerBtn.textContent = autoPrint ? "Preparing..." : "Generating...";

    const result = await fetchPatientDashboardSummary(currentDashboardPatient.id);
    triggerBtn.disabled = false;
    triggerBtn.innerHTML = originalLabel;

    if (!result.success) {
        reportWindow.document.open();
        reportWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head><title>Error</title>
            <style>body { font-family: sans-serif; padding: 40px; text-align: center; color: #d32f2f; }</style>
            </head>
            <body><h2>Failed to load patient data for report.</h2></body>
            </html>
        `);
        reportWindow.document.close();
        return;
    }

    const html = buildHtml(currentDashboardPatient, result.data || {});

    reportWindow.document.open();
    reportWindow.document.write(html);
    if (autoPrint) {
        reportWindow.document.write('<script>window.onload = function() { window.print(); }</script>');
    }
    reportWindow.document.close();
}

// Same "loading popup -> fetch -> render" flow as the two CCD buttons, plus
// the extra bookkeeping (lastCcdReportType) needed because CCD has two
// interchangeable layouts and Download must reuse whichever was last shown.
async function runCcdReport(triggerBtn, reportType, loadingMessage, autoPrint = false)
{
    lastCcdReportType = reportType;

    await runPatientReportWindow(
        triggerBtn,
        (patient, data) => reportType === "ccd_detailed"
            ? generateCcdDetailedReportHtml(patient, data)
            : generateCcdReportHtml(patient, data),
        loadingMessage,
        autoPrint
    );
}

// Wires the main checklist-driven "Patient Report" card: Check All / Clear
// All toggle every section checkbox, and Generate/Download render only the
// sections the user left checked.
function setupPatientReportCard()
{
    const checkAllBtn = document.getElementById("pdReportCheckAllBtn");
    const clearAllBtn = document.getElementById("pdReportClearAllBtn");
    const checklist = document.getElementById("pdReportChecklist");

    if (checkAllBtn) {
        const newCheckAllBtn = checkAllBtn.cloneNode(true);
        checkAllBtn.parentNode.replaceChild(newCheckAllBtn, checkAllBtn);
        newCheckAllBtn.addEventListener("click", () => {
            checklist.querySelectorAll('input[type="checkbox"]').forEach((cb) => { cb.checked = true; });
        });
    }

    if (clearAllBtn) {
        const newClearAllBtn = clearAllBtn.cloneNode(true);
        clearAllBtn.parentNode.replaceChild(newClearAllBtn, clearAllBtn);
        newClearAllBtn.addEventListener("click", () => {
            checklist.querySelectorAll('input[type="checkbox"]').forEach((cb) => { cb.checked = false; });
        });
    }

    const buildHtml = (patient, data) => {
        const sections = Array.from(checklist.querySelectorAll('input[type="checkbox"]'))
            .filter((cb) => cb.checked)
            .map((cb) => cb.getAttribute('data-report-section'));

        return generatePatientReportHtml(patient, data, sections);
    };

    const generateBtn = document.getElementById("pdReportGenerateBtn");
    if (generateBtn) {
        const newGenerateBtn = generateBtn.cloneNode(true);
        generateBtn.parentNode.replaceChild(newGenerateBtn, generateBtn);
        newGenerateBtn.addEventListener("click", async () => {
            await runPatientReportWindow(newGenerateBtn, buildHtml, "Generating Patient Report...");
        });
    }

    const downloadBtn = document.getElementById("pdReportDownloadBtn");
    if (downloadBtn) {
        const newDownloadBtn = downloadBtn.cloneNode(true);
        downloadBtn.parentNode.replaceChild(newDownloadBtn, downloadBtn);
        newDownloadBtn.addEventListener("click", async () => {
            await runPatientReportWindow(newDownloadBtn, buildHtml, "Preparing PDF...", true);
        });
    }
}

// Wires a report card that has a plain Generate/Download button pair with
// no options to gather first (Issues, Procedures, Documents), given the id
// prefix used on its buttons (e.g. "pdIssues" -> pdIssuesGenerateBtn) and
// the html-builder function for its report.
function setupSimplePatientReportCard(idPrefix, loadingMessage, buildHtml)
{
    const generateBtn = document.getElementById(`${idPrefix}GenerateBtn`);
    if (generateBtn) {
        const newGenerateBtn = generateBtn.cloneNode(true);
        generateBtn.parentNode.replaceChild(newGenerateBtn, generateBtn);
        newGenerateBtn.addEventListener("click", async () => {
            await runPatientReportWindow(newGenerateBtn, buildHtml, loadingMessage);
        });
    }

    const downloadBtn = document.getElementById(`${idPrefix}DownloadBtn`);
    if (downloadBtn) {
        const newDownloadBtn = downloadBtn.cloneNode(true);
        downloadBtn.parentNode.replaceChild(newDownloadBtn, downloadBtn);
        newDownloadBtn.addEventListener("click", async () => {
            await runPatientReportWindow(newDownloadBtn, buildHtml, "Preparing PDF...", true);
        });
    }
}

function generateCcrReportHtml(patient, data, startDate, endDate) {
    const rangeStart = startDate ? new Date(startDate) : null;
    const rangeEnd = endDate ? new Date(endDate) : null;
    if (rangeEnd) rangeEnd.setHours(23, 59, 59, 999);

    const filterByDate = (items, dateField) => {
        if (!items) return [];
        return items.filter(item => {
            if (!item[dateField]) return true;
            const itemDate = new Date(item[dateField]);
            if (rangeStart && itemDate < rangeStart) return false;
            if (rangeEnd && itemDate > rangeEnd) return false;
            return true;
        });
    };

    const allergies = filterByDate(data.allergies, 'begin_date');
    const problems = filterByDate(data.problems, 'begin_date');
    const medications = filterByDate(data.medications, 'begin_date');
    const immunizations = filterByDate(data.immunizations, 'administered_at');

    const fullName = [patient.first_name, patient.middle_name, patient.last_name, patient.suffix].filter(Boolean).join(" ");
    const patientDob = patient.birthdate ? new Date(patient.birthdate).toLocaleDateString() : "";
    const address = [patient.address_line, patient.city, patient.province, patient.zip_code].filter(Boolean).join(", ");
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Continuity of Care Record</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; color: #000; }
        h1 { font-size: 18px; margin-bottom: 10px; color: #000; }
        h2 { font-size: 14px; margin-top: 20px; margin-bottom: 5px; color: #000; }
        .header-box { background-color: #ffffcc; padding: 10px; border: 1px solid #e2e8f0; margin-bottom: 20px; width: 60%; }
        .header-box table { width: 100%; border-collapse: collapse; }
        .header-box td { padding: 2px 5px; vertical-align: top; }
        .header-box td:first-child { font-weight: bold; width: 100px; }
        table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        table.data-table th { background-color: #0055a4; color: white; text-align: left; padding: 5px; font-size: 11px; border: 1px solid #ccc; }
        table.data-table td { padding: 5px; border: 1px solid #ccc; font-size: 11px; }
        .footer { margin-top: 40px; font-size: 10px; color: #888; border-top: 1px solid #eee; padding-top: 10px; }
        .pd-ccr-download-btn {
            position: fixed; top: 16px; right: 16px; z-index: 100;
            background-color: #0055a4; color: #fff; border: none; border-radius: 4px;
            padding: 8px 14px; font-family: Arial, sans-serif; font-size: 12px; cursor: pointer;
        }
        .pd-ccr-download-btn:hover { background-color: #003f7d; }
        @media print {
            .pd-ccr-download-btn { display: none; }
            @page { size: auto; margin: 0; }
            body { margin: 20px; }
        }
    </style>
</head>
<body>
    <button type="button" class="pd-ccr-download-btn" onclick="window.print()">Download PDF</button>
    <h1>Continuity of Care Record</h1>
    <div class="header-box">
        <table>
            <tr><td>Date Created:</td><td>${new Date().toUTCString()}</td></tr>
            <tr><td>From:</td><td>Motol University Hospital - II (Facility) (author)</td></tr>
            <tr><td>To:</td><td>${escapeHtml(fullName)} (patient)</td></tr>
            <tr><td>Purpose:</td><td>Summary of patient information</td></tr>
        </table>
    </div>

    <h2>Patient Demographics</h2>
    <table class="data-table">
        <thead>
            <tr><th>Name</th><th>Date of Birth</th><th>Gender</th><th>Identification Numbers</th><th>Address / Phone</th></tr>
        </thead>
        <tbody>
            <tr>
                <td>${escapeHtml(fullName)}</td>
                <td>${escapeHtml(patientDob)}</td>
                <td>${escapeHtml(patient.sex || '')}</td>
                <td>Patient ID ${escapeHtml(patient.patient_no)}</td>
                <td>H: ${escapeHtml(patient.home_phone || '')}<br/>${escapeHtml(address)}</td>
            </tr>
        </tbody>
    </table>

    <h2>Alerts</h2>
    <table class="data-table">
        <thead>
            <tr><th>Type</th><th>Date</th><th>Code</th><th>Description</th><th>Reaction</th><th>Source</th></tr>
        </thead>
        <tbody>
            ${allergies.length ? allergies.map(a => `
                <tr>
                    <td>Allergy</td>
                    <td>${escapeHtml((a.begin_date || '').substring(0, 10))}</td>
                    <td>${escapeHtml(a.coding || '')}</td>
                    <td>${escapeHtml(a.title || '')}</td>
                    <td>${escapeHtml(a.reaction || '')}</td>
                    <td></td>
                </tr>
            `).join('') : `<tr><td colspan="6">No alerts recorded.</td></tr>`}
        </tbody>
    </table>

    <h2>Problems</h2>
    <table class="data-table">
        <thead>
            <tr><th>Type</th><th>Date</th><th>Code</th><th>Description</th><th>Status</th><th>Source</th></tr>
        </thead>
        <tbody>
            ${problems.length ? problems.map(p => `
                <tr>
                    <td>Problem</td>
                    <td>${escapeHtml((p.begin_date || '').substring(0, 10))}</td>
                    <td>${escapeHtml(p.coding || '')}</td>
                    <td>${escapeHtml(p.title || '')}</td>
                    <td>${escapeHtml(p.verification_status || 'Active')}</td>
                    <td></td>
                </tr>
            `).join('') : `<tr><td colspan="6">No problems recorded.</td></tr>`}
        </tbody>
    </table>

    <h2>Medications</h2>
    <table class="data-table">
        <thead>
            <tr><th>Medication</th><th>RxNorm Code</th><th>Date</th><th>Status</th><th>Form</th><th>Strength</th><th>Quantity</th><th>SIG</th><th>Indications</th><th>Instruction</th><th>Refills</th><th>Source</th></tr>
        </thead>
        <tbody>
            ${medications.length ? medications.map(m => `
                <tr>
                    <td>${escapeHtml(m.title || '')}</td>
                    <td>${escapeHtml(m.coding || '')}</td>
                    <td>${escapeHtml((m.begin_date || '').substring(0, 10))}</td>
                    <td>${escapeHtml(m.verification_status || 'Active')}</td>
                    <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
                </tr>
            `).join('') : `<tr><td colspan="12">No medications recorded.</td></tr>`}
        </tbody>
    </table>

    <h2>Immunizations</h2>
    <table class="data-table">
        <thead>
            <tr><th>Code</th><th>Vaccine</th><th>Date</th><th>Route</th><th>Site</th><th>Source</th></tr>
        </thead>
        <tbody>
            ${immunizations.length ? immunizations.map(i => `
                <tr>
                    <td>${escapeHtml(i.vaccine_name || '')}</td>
                    <td>${escapeHtml(i.vaccine_name || '')}</td>
                    <td>${escapeHtml((i.administered_at || '').substring(0, 10))}</td>
                    <td>${escapeHtml(i.route || '')}</td>
                    <td>${escapeHtml(i.administration_site || '')}</td>
                    <td></td>
                </tr>
            `).join('') : `<tr><td colspan="6">No immunizations recorded.</td></tr>`}
        </tbody>
    </table>

    <h2>Additional Information About People & Organizations</h2>
    <h3>People</h3>
    <table class="data-table">
        <thead>
            <tr><th>Name</th><th>Specialty</th><th>Relation</th><th>Identification Numbers</th><th>Phone</th><th>Address/ E-mail</th></tr>
        </thead>
        <tbody>
            <tr>
                <td>${escapeHtml(fullName)}</td>
                <td></td>
                <td></td>
                <td>Patient ID ${escapeHtml(patient.patient_no)}</td>
                <td>H: ${escapeHtml(patient.home_phone || '')}</td>
                <td>${escapeHtml(address)}</td>
            </tr>
        </tbody>
    </table>

    <h3>Information Systems</h3>
    <table class="data-table">
        <thead>
            <tr><th>Name</th><th>Type</th><th>Version</th><th>Identification Numbers</th><th>Phone</th><th>Address/ E-mail</th></tr>
        </thead>
        <tbody>
            <tr>
                <td>Motol University Hospital - II</td>
                <td>Facility</td>
                <td></td>
                <td></td>
                <td>224431111</td>
                <td>V &Uacute;valu 84, 150 06 Praha 5<br/>PRG, CZ 15006</td>
            </tr>
            <tr>
                <td>OEMR</td>
                <td>OpenEMR</td>
                <td>4.x</td>
                <td>Certification # EHRX-OEMRXXXXX-2011</td>
                <td>000-000-0000</td>
                <td>2365 Springs Rd. NE<br/>Hickory, NC 28601</td>
            </tr>
        </tbody>
    </table>

    <div class="footer">
        The stylesheet used to generate this view of the CCR was provided by OEMR.<br/>
        Powered by the ASTM E2369-05 Specification for the Continuity of Care Record (CCR)
    </div>
</body>
</html>
    `;
}

// Shared by both CCD layouts below: an on-page "Download PDF" button (backed
// by window.print()) that hides itself when printing, plus the @page rule
// that stops the browser from drawing its own date/title/page-number header
// and footer in the margin area (see the same trick in the CCR report above).
const CCD_PRINT_BUTTON_STYLE = `
        .pd-ccd-download-btn {
            position: fixed; top: 16px; right: 16px; z-index: 100;
            background-color: #0055a4; color: #fff; border: none; border-radius: 4px;
            padding: 8px 14px; font-family: Arial, sans-serif; font-size: 12px; cursor: pointer;
        }
        .pd-ccd-download-btn:hover { background-color: #003f7d; }
        @media print {
            .pd-ccd-download-btn { display: none; }
            @page { size: auto; margin: 0; }
            body { margin: 20px; }
        }`;
const CCD_PRINT_BUTTON_HTML = '<button type="button" class="pd-ccd-download-btn" onclick="window.print()">Download PDF</button>';

function generateCcdReportHtml(patient, data) {
    const allergies = data.allergies || [];
    const problems = data.problems || [];
    const medications = data.medications || [];
    const immunizations = data.immunizations || [];

    const fullName = [patient.first_name, patient.middle_name, patient.last_name, patient.suffix].filter(Boolean).join(" ");
    const patientDob = patient.birthdate ? new Date(patient.birthdate).toLocaleString() : "";
    const address = [patient.address_line, patient.city, patient.province, patient.zip_code].filter(Boolean).join(", ");
    const documentId = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    return `
<!DOCTYPE html>
<html>
<head>
    <title>Continuity of Care Document</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; color: #000; }
        h1 { font-size: 16px; text-align: center; margin-bottom: 20px; color: #000; }
        h2 { font-size: 14px; margin-top: 20px; margin-bottom: 5px; color: #000; }
        table.ccd-info { width: 100%; border-collapse: collapse; margin-bottom: 2px; }
        table.ccd-info td { padding: 4px 8px; vertical-align: top; background-color: #e6e6fa; border: 1px solid #d8d8f0; }
        table.ccd-info td.ccd-label { font-weight: bold; width: 140px; }
        table.ccd-doc td { background-color: #4a90d9; color: #fff; }
        table.ccd-author td { background-color: #e6e6fa; }
        .ccd-toc { background-color: #f5f5f5; padding: 10px 20px; margin-bottom: 20px; }
        .ccd-toc li { margin-bottom: 2px; }
        table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        table.data-table th { background-color: #fce98f; text-align: left; padding: 5px; font-size: 11px; border: 1px solid #e0c94f; }
        table.data-table td { padding: 5px; border: 1px solid #e0c94f; font-size: 11px; background-color: #fffceb; }
        ${CCD_PRINT_BUTTON_STYLE}
    </style>
</head>
<body>
    ${CCD_PRINT_BUTTON_HTML}
    <h1>Continuity of Care Document from Motol University Hospital - II</h1>

    <table class="ccd-info">
        <tr><td class="ccd-label">Patient</td><td>${escapeHtml(fullName)}</td></tr>
        <tr>
            <td class="ccd-label">Date of birth</td><td>${escapeHtml(patientDob)}</td>
            <td class="ccd-label">Sex</td><td>${escapeHtml(patient.sex || '')}</td>
        </tr>
        <tr>
            <td class="ccd-label">Contact info</td>
            <td>Home: ${escapeHtml(patient.home_phone || '')}<br/>${escapeHtml(address)}</td>
            <td class="ccd-label">Patient IDs</td><td>${escapeHtml(patient.patient_no)} Patient ID</td>
        </tr>
    </table>

    <table class="ccd-info ccd-doc">
        <tr><td class="ccd-label">Document Id</td><td>${escapeHtml(documentId)}</td></tr>
        <tr><td class="ccd-label">Document Created</td><td>${new Date().toUTCString()}</td></tr>
    </table>

    <table class="ccd-info ccd-author">
        <tr><td class="ccd-label">Author</td><td></td></tr>
        <tr>
            <td class="ccd-label">Contact info</td>
            <td>Work Place: Motol University Hospital - II<br/>V &Uacute;valu 84, 150 06 Praha 5, PRG, CZ 15006<br/>Tel: +1-224431111</td>
        </tr>
    </table>

    <div class="ccd-toc">
        <strong>Table of Contents</strong>
        <ul>
            <li><a href="#ccd-purpose">Purpose</a></li>
            <li><a href="#ccd-alerts">Alerts</a></li>
            <li><a href="#ccd-problems">Problems</a></li>
            <li><a href="#ccd-medications">Medications</a></li>
            <li><a href="#ccd-immunizations">Immunizations</a></li>
            <li><a href="#ccd-results">Results</a></li>
            <li><a href="#ccd-people">Additional Information About People &amp; Organizations</a></li>
        </ul>
    </div>

    <h2 id="ccd-purpose">Purpose</h2>
    <p>Summary of patient information</p>

    <h2 id="ccd-alerts">Alerts</h2>
    <table class="data-table">
        <thead><tr><th>Type</th><th>Date</th><th>Code</th><th>Description</th><th>Reaction</th><th>Source</th></tr></thead>
        <tbody>
            ${allergies.length ? allergies.map(a => `
                <tr>
                    <td>Allergy</td>
                    <td>${escapeHtml((a.begin_date || '').substring(0, 10))}</td>
                    <td>${escapeHtml(a.coding || '')}</td>
                    <td>${escapeHtml(a.title || '')}</td>
                    <td>${escapeHtml(a.reaction || '')}</td>
                    <td></td>
                </tr>
            `).join('') : `<tr><td colspan="6">No alerts recorded.</td></tr>`}
        </tbody>
    </table>

    <h2 id="ccd-problems">Problems</h2>
    <table class="data-table">
        <thead><tr><th>Type</th><th>Date</th><th>Code</th><th>Description</th><th>Status</th><th>Source</th></tr></thead>
        <tbody>
            ${problems.length ? problems.map(p => `
                <tr>
                    <td>Problem</td>
                    <td>${escapeHtml((p.begin_date || '').substring(0, 10))}</td>
                    <td>${escapeHtml(p.coding || '')}</td>
                    <td>${escapeHtml(p.title || '')}</td>
                    <td>${escapeHtml(p.verification_status || 'Active')}</td>
                    <td></td>
                </tr>
            `).join('') : `<tr><td colspan="6">No problems recorded.</td></tr>`}
        </tbody>
    </table>

    <h2 id="ccd-medications">Medications</h2>
    <table class="data-table">
        <thead><tr><th>Medication</th><th>Date</th><th>Status</th><th>Form</th><th>Strength</th><th>Quantity</th><th>SIG</th><th>Indications</th><th>Instruction</th><th>Refills</th><th>Source</th></tr></thead>
        <tbody>
            ${medications.length ? medications.map(m => `
                <tr>
                    <td>${escapeHtml(m.title || '')}</td>
                    <td>${escapeHtml((m.begin_date || '').substring(0, 10))}</td>
                    <td>${escapeHtml(m.verification_status || 'Active')}</td>
                    <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
                </tr>
            `).join('') : `<tr><td colspan="11">No medications recorded.</td></tr>`}
        </tbody>
    </table>

    <h2 id="ccd-immunizations">Immunizations</h2>
    <table class="data-table">
        <thead><tr><th>Code</th><th>Vaccine</th><th>Date</th><th>Route</th><th>Site</th><th>Source</th></tr></thead>
        <tbody>
            ${immunizations.length ? immunizations.map(i => `
                <tr>
                    <td>${escapeHtml(i.vaccine_name || '')}</td>
                    <td>${escapeHtml(i.vaccine_name || '')}</td>
                    <td>${escapeHtml((i.administered_at || '').substring(0, 10))}</td>
                    <td>${escapeHtml(i.route || '')}</td>
                    <td>${escapeHtml(i.administration_site || '')}</td>
                    <td></td>
                </tr>
            `).join('') : `<tr><td colspan="6">No immunizations recorded.</td></tr>`}
        </tbody>
    </table>

    <h2 id="ccd-results">Results</h2>
    <table class="data-table">
        <thead><tr><th>Test</th><th>Date</th><th>Result</th><th>Source</th></tr></thead>
        <tbody><tr><td colspan="4">Not Available</td></tr></tbody>
    </table>

    <h2 id="ccd-people">Additional Information About People &amp; Organizations</h2>
    <table class="data-table">
        <thead><tr><th>Name</th><th>Specialty</th><th>Relation</th><th>Identification Numbers</th><th>Phone</th><th>Address/ E-mail</th></tr></thead>
        <tbody>
            <tr>
                <td>${escapeHtml(fullName)}</td>
                <td></td>
                <td></td>
                <td>Patient ID ${escapeHtml(patient.patient_no)}</td>
                <td>H: ${escapeHtml(patient.home_phone || '')}</td>
                <td>${escapeHtml(address)}</td>
            </tr>
            <tr>
                <td>Motol University Hospital - II</td>
                <td>Facility</td>
                <td></td>
                <td></td>
                <td>224431111</td>
                <td>V &Uacute;valu 84, 150 06 Praha 5<br/>PRG, CZ 15006</td>
            </tr>
        </tbody>
    </table>
</body>
</html>
    `;
}

// The "Generate New Report" layout: a sidebar-navigated summarization of
// the patient's episode note. Sections without a backing data source in
// this system yet (Payers, Vital Signs, Goals, Treatment Plan, Functional/
// Mental Status, Medical Equipment, Advance Directives, Reason for Referral,
// Relevant Dx Tests/Lab Data, History of Procedures, Social History,
// Assessments) render "Not Available", matching how OpenEMR itself renders
// an empty C-CDA section rather than hiding it from the navigation.
export function generateCcdDetailedReportHtml(patient, data) {
    const allergies = data.allergies || [];
    const problems = data.problems || [];
    const medications = data.medications || [];
    const immunizations = data.immunizations || [];
    const encounters = data.encounters || [];
    const healthConcerns = data.health_concerns || [];
    const careTeam = data.care_team || null;

    const fullName = [patient.first_name, patient.middle_name, patient.last_name, patient.suffix].filter(Boolean).join(" ");
    const patientDob = patient.birthdate ? new Date(patient.birthdate).toLocaleDateString() : "";
    const address = [patient.address_line, patient.city, patient.province, patient.zip_code].filter(Boolean).join(", ");
    const documentId = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const notAvailable = () => `<p class="ccd-not-available">Not Available</p>`;

    const navItems = [
        ['ccdd-demographics', 'Demographics'],
        ['ccdd-authoring', 'Authoring Details'],
        ['ccdd-careteams', 'Patient Care Teams'],
        ['ccdd-allergies', 'Allergies, Adverse Reactions, Alerts'],
        ['ccdd-medication-use', 'History of Medication Use'],
        ['ccdd-problems', 'Problem List'],
        ['ccdd-procedures', 'History of Procedures'],
        ['ccdd-labs', 'Relevant Dx Tests/Lab Data'],
        ['ccdd-directives', 'Advance Directives'],
        ['ccdd-functional', 'Functional Status'],
        ['ccdd-encounters', 'Encounters'],
        ['ccdd-immunizations', 'Immunizations'],
        ['ccdd-payers', 'Payers'],
        ['ccdd-assessments', 'Assessments'],
        ['ccdd-treatment-plan', 'Treatment Plan'],
        ['ccdd-goals', 'Goals'],
        ['ccdd-health-concerns', 'Health Concerns Document'],
        ['ccdd-referral', 'Reason for Referral'],
        ['ccdd-mental', 'Mental Status'],
        ['ccdd-social', 'Social History'],
        ['ccdd-vitals', 'Vital Signs'],
        ['ccdd-equipment', 'Medical Equipment'],
        ['ccdd-maintained-by', 'Document Maintained By'],
        ['ccdd-doc-info', 'Document Information']
    ];

    return `
<!DOCTYPE html>
<html>
<head>
    <title>Summarization of Episode Note</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 0; color: #1c2534; }
        .ccdd-layout { display: flex; }
        .ccdd-nav { width: 220px; flex-shrink: 0; background-color: #f5f6f8; border-right: 1px solid #e0e0e0; padding: 16px 0; position: sticky; top: 0; align-self: flex-start; max-height: 100vh; overflow-y: auto; }
        .ccdd-nav-header { padding: 0 16px 12px; font-weight: bold; color: #b5651d; font-size: 11px; }
        .ccdd-nav a { display: block; padding: 4px 16px; color: #2563eb; text-decoration: none; font-size: 11px; }
        .ccdd-nav a:hover { text-decoration: underline; }
        .ccdd-main { flex: 1; padding: 20px 30px; }
        h1 { font-size: 16px; margin: 0 0 20px; color: #b5651d; }
        h2 { font-size: 13px; color: #b5651d; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-top: 24px; }
        .ccd-not-available { color: #888; font-style: italic; }
        table.data-table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; }
        table.data-table th { background-color: #eef1f6; text-align: left; padding: 5px; font-size: 11px; border: 1px solid #dde2ea; }
        table.data-table td { padding: 5px; border: 1px solid #dde2ea; font-size: 11px; }
        ${CCD_PRINT_BUTTON_STYLE}
        @media print { .ccdd-nav { display: none; } .ccdd-main { padding: 10px; } }
    </style>
</head>
<body>
    ${CCD_PRINT_BUTTON_HTML}
    <div class="ccdd-layout">
        <div class="ccdd-nav">
            <div class="ccdd-nav-header">${escapeHtml(fullName)}<br/>SUMMARIZATION OF EPISODE NOTE</div>
            <a href="#top">BACK TO TOP</a>
            ${navItems.map(([id, label]) => `<a href="#${id}">${escapeHtml(label.toUpperCase())}</a>`).join('')}
        </div>
        <div class="ccdd-main" id="top">
            <h1>Summarization of Episode Note</h1>

            <h2 id="ccdd-demographics">Demographics</h2>
            <p>
                <strong>Date of Birth:</strong> ${escapeHtml(patientDob)}<br/>
                <strong>Sex:</strong> ${escapeHtml(patient.sex || '')}<br/>
                <strong>Patient ID:</strong> ${escapeHtml(patient.patient_no)}<br/>
                <strong>Contact:</strong> ${escapeHtml(address)} ${escapeHtml(patient.home_phone || '')}
            </p>

            <h2 id="ccdd-authoring">Authoring Details</h2>
            <p>
                <strong>Author:</strong> ${escapeHtml(getUser()?.first_name || '')} ${escapeHtml(getUser()?.last_name || '')}<br/>
                <strong>Document Created:</strong> ${new Date().toUTCString()}
            </p>

            <h2 id="ccdd-careteams">Patient Care Teams</h2>
            ${careTeam && careTeam.members && careTeam.members.length ? `
                <table class="data-table">
                    <thead><tr><th>Member</th><th>Role</th><th>Status</th><th>Member Since</th></tr></thead>
                    <tbody>
                        ${careTeam.members.map(m => `
                            <tr>
                                <td>${escapeHtml(m.user_name || m.related_person_name || '')}</td>
                                <td>${escapeHtml(m.role_name || '')}</td>
                                <td>${escapeHtml(m.status || '')}</td>
                                <td>${escapeHtml(m.member_since || '')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : `<p>A Care Team is not assigned.</p>`}

            <h2 id="ccdd-allergies">Allergies, Adverse Reactions, Alerts</h2>
            ${allergies.length ? `
                <table class="data-table">
                    <thead><tr><th>Allergy</th><th>Reaction</th><th>Date</th></tr></thead>
                    <tbody>
                        ${allergies.map(a => `
                            <tr><td>${escapeHtml(a.title || '')}</td><td>${escapeHtml(a.reaction || '')}</td><td>${escapeHtml((a.begin_date || '').substring(0, 10))}</td></tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : `<p>No known Allergies and Intolerances</p>`}

            <h2 id="ccdd-medication-use">History of Medication Use</h2>
            ${medications.length ? `
                <table class="data-table">
                    <thead><tr><th>Medication</th><th>Date</th><th>Status</th></tr></thead>
                    <tbody>
                        ${medications.map(m => `
                            <tr><td>${escapeHtml(m.title || '')}</td><td>${escapeHtml((m.begin_date || '').substring(0, 10))}</td><td>${escapeHtml(m.verification_status || 'Active')}</td></tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : notAvailable()}

            <h2 id="ccdd-problems">Problem List</h2>
            ${problems.length ? `
                <table class="data-table">
                    <thead><tr><th>Concern</th><th>Last Observation</th><th>Reported</th></tr></thead>
                    <tbody>
                        ${problems.map(p => `
                            <tr><td>${escapeHtml(p.title || '')}</td><td>${escapeHtml(p.verification_status || 'Unassigned')}</td><td>${escapeHtml((p.begin_date || '').substring(0, 10))}</td></tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : notAvailable()}

            <h2 id="ccdd-procedures">History of Procedures</h2>
            ${notAvailable()}

            <h2 id="ccdd-labs">Relevant Dx Tests/Lab Data</h2>
            ${notAvailable()}

            <h2 id="ccdd-directives">Advance Directives</h2>
            ${notAvailable()}

            <h2 id="ccdd-functional">Functional Status</h2>
            ${notAvailable()}

            <h2 id="ccdd-encounters">Encounters</h2>
            ${encounters.length ? `
                <table class="data-table">
                    <thead><tr><th>Date</th><th>Type</th><th>Provider</th></tr></thead>
                    <tbody>
                        ${encounters.map(e => `
                            <tr><td>${escapeHtml((e.encounter_date || e.date || '').substring(0, 10))}</td><td>${escapeHtml(e.encounter_type || e.type || '')}</td><td>${escapeHtml(e.provider_name || '')}</td></tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : notAvailable()}

            <h2 id="ccdd-immunizations">Immunizations</h2>
            ${immunizations.length ? `
                <table class="data-table">
                    <thead><tr><th>Vaccine</th><th>Date</th><th>Route</th><th>Site</th></tr></thead>
                    <tbody>
                        ${immunizations.map(i => `
                            <tr><td>${escapeHtml(i.vaccine_name || '')}</td><td>${escapeHtml((i.administered_at || '').substring(0, 10))}</td><td>${escapeHtml(i.route || '')}</td><td>${escapeHtml(i.administration_site || '')}</td></tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : notAvailable()}

            <h2 id="ccdd-payers">Payers</h2>
            ${notAvailable()}

            <h2 id="ccdd-assessments">Assessments</h2>
            ${notAvailable()}

            <h2 id="ccdd-treatment-plan">Treatment Plan</h2>
            ${notAvailable()}

            <h2 id="ccdd-goals">Goals</h2>
            ${notAvailable()}

            <h2 id="ccdd-health-concerns">Health Concerns Document</h2>
            ${healthConcerns.length ? `
                <table class="data-table">
                    <thead><tr><th>Assessment</th><th>Concern (Narrative)</th><th>Concern (Description)</th><th>Code</th><th>Status</th><th>Onset (Low)</th></tr></thead>
                    <tbody>
                        ${healthConcerns.map(h => `
                            <tr>
                                <td>${escapeHtml(h.classification_type || 'SDOH')}</td>
                                <td>${escapeHtml(h.title || '')}</td>
                                <td>${escapeHtml(h.title || '')}</td>
                                <td>${escapeHtml(h.coding || '')}</td>
                                <td>${escapeHtml(h.verification_status || 'active')}</td>
                                <td>${escapeHtml((h.begin_date || '').substring(0, 10))}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : notAvailable()}

            <h2 id="ccdd-referral">Reason for Referral</h2>
            ${notAvailable()}

            <h2 id="ccdd-mental">Mental Status</h2>
            ${notAvailable()}

            <h2 id="ccdd-social">Social History</h2>
            ${notAvailable()}

            <h2 id="ccdd-vitals">Vital Signs</h2>
            ${notAvailable()}

            <h2 id="ccdd-equipment">Medical Equipment</h2>
            ${notAvailable()}

            <h2 id="ccdd-maintained-by">Document Maintained By</h2>
            <p>Motol University Hospital - II<br/>Tel: +1-224431111</p>

            <h2 id="ccdd-doc-info">Document Information</h2>
            <p>
                <strong>Document Identifier:</strong> ${escapeHtml(documentId)}<br/>
                <strong>Document Created:</strong> ${new Date().toUTCString()}
            </p>
        </div>
    </div>
</body>
</html>
    `;
}

// Shared styling for the plain, non-CCD report cards below (Patient Report,
// Issues, Procedures, Documents) -- an OpenEMR-style printable page: black
// section headings over a light background, reusing the same Download PDF
// button/print-header-suppression trick as the CCD reports.
const PATIENT_REPORT_STYLE = `
        body { font-family: Arial, sans-serif; font-size: 13px; margin: 20px; color: #1c2534; }
        h1 { font-size: 18px; color: #2563eb; margin-bottom: 4px; }
        h2 { font-size: 14px; margin-top: 22px; margin-bottom: 6px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
        table.data-table { width: 100%; border-collapse: collapse; margin: 6px 0 14px; }
        table.data-table th { background-color: #eef1f6; text-align: left; padding: 5px; font-size: 12px; border: 1px solid #dde2ea; }
        table.data-table td { padding: 5px; border: 1px solid #dde2ea; font-size: 12px; }
        .pr-empty { color: #888; font-style: italic; }
        .pr-issue-item { margin-bottom: 6px; }
        ${CCD_PRINT_BUTTON_STYLE}`;

function renderPatientDataTable(patient) {
    const fullName = [patient.first_name, patient.middle_name, patient.last_name, patient.suffix].filter(Boolean).join(" ");
    const patientDob = patient.birthdate ? new Date(patient.birthdate).toLocaleDateString() : "";

    return `
        <table class="data-table">
            <tr><th>Name</th><td>${escapeHtml(fullName)}</td><th>External ID</th><td>${escapeHtml(patient.patient_no)}</td></tr>
            <tr><th>Date of Birth</th><td>${escapeHtml(patientDob)}</td><th>Sex</th><td>${escapeHtml(patient.sex || '')}</td></tr>
            <tr><th>Marital Status</th><td>${escapeHtml(patient.civil_status || '')}</td><th>Blood Type</th><td>${escapeHtml(patient.blood_type || '')}</td></tr>
        </table>`;
}

function renderIssuesBlock(data) {
    const healthConcerns = data.health_concerns || [];
    const problems = data.problems || [];
    const medications = data.medications || [];

    if (!healthConcerns.length && !problems.length && !medications.length) {
        return `<p class="pr-empty">No issues recorded.</p>`;
    }

    return `
        ${healthConcerns.length ? `
            <h3>Health Concerns</h3>
            ${healthConcerns.map(h => `
                <div class="pr-issue-item"><strong>${escapeHtml(h.title || '')}:</strong> ${escapeHtml((h.begin_date || '').substring(0, 10))} &mdash; ${escapeHtml(h.verification_status || 'active')}${h.coding ? `<br/>Code: ${escapeHtml(h.coding)}` : ''}</div>
            `).join('')}
        ` : ''}
        ${problems.length ? `
            <h3>Medical Problems</h3>
            ${problems.map(p => `
                <div class="pr-issue-item"><strong>${escapeHtml(p.title || '')}:</strong> ${escapeHtml((p.begin_date || '').substring(0, 10))} &mdash; ${escapeHtml(p.verification_status || 'Active')}</div>
            `).join('')}
        ` : ''}
        ${medications.length ? `
            <h3>Medications</h3>
            ${medications.map(m => `
                <div class="pr-issue-item"><strong>${escapeHtml(m.title || '')}:</strong> ${escapeHtml((m.begin_date || '').substring(0, 10))} &mdash; ${escapeHtml(m.verification_status || 'Active')}</div>
            `).join('')}
        ` : ''}`;
}

// The main, checklist-driven "Patient Report": only the sections named in
// `sections` (the checked boxes' data-report-section values) are rendered.
// Issues (health concerns/problems/medications) isn't one of the checkbox
// options -- it's always appended, mirroring OpenEMR's own patient_report.php
// where the same Issues widget appears below the customizable report.
function generatePatientReportHtml(patient, data, sections) {
    const has = (key) => sections.includes(key);
    const fullName = [patient.first_name, patient.middle_name, patient.last_name, patient.suffix].filter(Boolean).join(" ");
    const immunizations = data.immunizations || [];
    const messages = data.messages || [];

    return `
<!DOCTYPE html>
<html>
<head>
    <title>Patient Report</title>
    <style>${PATIENT_REPORT_STYLE}</style>
</head>
<body>
    ${CCD_PRINT_BUTTON_HTML}
    <h1>Patient Report</h1>
    <p>${escapeHtml(fullName)}</p>

    ${has('demographics') ? `<h2>Patient Data</h2>${renderPatientDataTable(patient)}` : ''}

    ${has('history') ? `<h2>History Data</h2><p class="pr-empty">Not Available</p>` : ''}

    ${has('insurance') ? `<h2>Insurance Data</h2><p class="pr-empty">Not Available</p>` : ''}

    ${has('billing') ? `<h2>Billing Information</h2><p class="pr-empty">Not Available</p>` : ''}

    ${has('immunizations') ? `
        <h2>Patient Immunization</h2>
        ${immunizations.length ? `
            <table class="data-table">
                <thead><tr><th>Vaccine</th><th>Date</th><th>Route</th></tr></thead>
                <tbody>
                    ${immunizations.map(i => `
                        <tr><td>${escapeHtml(i.vaccine_name || '')}</td><td>${escapeHtml((i.administered_at || '').substring(0, 10))}</td><td>${escapeHtml(i.route || '')}</td></tr>
                    `).join('')}
                </tbody>
            </table>
        ` : `<p class="pr-empty">Not Available</p>`}
    ` : ''}

    ${has('patient_notes') ? `<h2>Patient Notes</h2><p class="pr-empty">Not Available</p>` : ''}

    ${has('transactions') ? `<h2>Patient Transactions</h2><p class="pr-empty">Not Available</p>` : ''}

    ${has('communications') ? `
        <h2>Patient Communication Sent</h2>
        ${messages.length ? `
            <table class="data-table">
                <thead><tr><th>Date</th><th>Subject</th></tr></thead>
                <tbody>
                    ${messages.map(m => `
                        <tr><td>${escapeHtml((m.created_at || m.sent_at || '').substring(0, 10))}</td><td>${escapeHtml(m.subject || m.body || '')}</td></tr>
                    `).join('')}
                </tbody>
            </table>
        ` : `<p class="pr-empty">Not Available</p>`}
    ` : ''}

    ${has('recurrent_appointments') ? `<h2>Recurrent Appointments</h2><p class="pr-empty">None</p>` : ''}

    <h2>Issues</h2>
    ${renderIssuesBlock(data)}
</body>
</html>
    `;
}

function generateIssuesReportHtml(patient, data) {
    const fullName = [patient.first_name, patient.middle_name, patient.last_name, patient.suffix].filter(Boolean).join(" ");

    return `
<!DOCTYPE html>
<html>
<head>
    <title>Issues Report</title>
    <style>${PATIENT_REPORT_STYLE}</style>
</head>
<body>
    ${CCD_PRINT_BUTTON_HTML}
    <h1>Issues Report</h1>
    <p>${escapeHtml(fullName)}</p>
    ${renderIssuesBlock(data)}
</body>
</html>
    `;
}

function generateProceduresReportHtml(patient, data) {
    const fullName = [patient.first_name, patient.middle_name, patient.last_name, patient.suffix].filter(Boolean).join(" ");

    return `
<!DOCTYPE html>
<html>
<head>
    <title>Procedures Report</title>
    <style>${PATIENT_REPORT_STYLE}</style>
</head>
<body>
    ${CCD_PRINT_BUTTON_HTML}
    <h1>Procedures Report</h1>
    <p>${escapeHtml(fullName)}</p>
    <table class="data-table">
        <thead><tr><th>Order Date</th><th>Encounter Date</th><th>Order Descriptions</th></tr></thead>
        <tbody><tr><td colspan="3" class="pr-empty">No procedures recorded.</td></tr></tbody>
    </table>
</body>
</html>
    `;
}

function generateDocumentsReportHtml(patient, data) {
    const fullName = [patient.first_name, patient.middle_name, patient.last_name, patient.suffix].filter(Boolean).join(" ");

    return `
<!DOCTYPE html>
<html>
<head>
    <title>Documents Report</title>
    <style>${PATIENT_REPORT_STYLE}</style>
</head>
<body>
    ${CCD_PRINT_BUTTON_HTML}
    <h1>Documents Report</h1>
    <p>${escapeHtml(fullName)}</p>
    <p class="pr-empty">No documents recorded.</p>
</body>
</html>
    `;
}


function activateChartNavButton(activeBtn)
{
    document.querySelectorAll("#pdChartNav .pd-chart-nav-btn, #pdChartNav .pd-chart-nav-submenu-item").forEach((b) => {
        b.classList.toggle("active", b === activeBtn);
    });
}

function showChartSection(key)
{
    if (currentDashboardPatient) {
        setLastActiveChartSection(currentDashboardPatient.patient_no, key);
    }

    const widgetGrid = document.getElementById("pdWidgetGrid");
    const placeholder = document.getElementById("pdChartPlaceholder");
    const historyPanel = document.getElementById("pdHistoryPanel");
    const sdohPanel = document.getElementById("pdSdohPanel");
    const reportPanel = document.getElementById("pdReportPanel");
    const transactionsPanel = document.getElementById("pdTransactionsPanel");
    const issuesPanel = document.getElementById("pdIssuesPanel");
    const visitHistoryPanel = document.getElementById("pdVisitHistoryPanel");
    const encounterSummaryPanel = document.getElementById("pdEncounterSummaryPanel");
    const ledgerPanel = document.getElementById("pdLedgerPanel");
    const widgetTarget = CHART_NAV_WIDGET_TARGETS[key];

    widgetGrid.style.display = "none";
    placeholder.style.display = "none";
    historyPanel.style.display = "none";
    sdohPanel.style.display = "none";
    reportPanel.style.display = "none";
    transactionsPanel.style.display = "none";
    issuesPanel.style.display = "none";
    visitHistoryPanel.style.display = "none";
    encounterSummaryPanel.style.display = "none";
    ledgerPanel.style.display = "none";

    if (key === "dashboard" || widgetTarget) {
        widgetGrid.style.display = "";

        const pdMain = document.querySelector(".pd-main");
        const target = widgetTarget ? document.getElementById(widgetTarget) : null;

        if (target && pdMain) {
            pdMain.scrollTo({ top: target.offsetTop - 12, behavior: "smooth" });
        } else if (pdMain) {
            pdMain.scrollTo({ top: 0, behavior: "smooth" });
        }
    } else if (key === "history") {
        historyPanel.style.display = "block";
    } else if (key === "sdoh_assessment") {
        sdohPanel.style.display = "block";
    } else if (key === "report") {
        reportPanel.style.display = "block";
    } else if (key === "transactions") {
        transactionsPanel.style.display = "block";
        if (currentDashboardPatient) {
            loadTransactionsList(currentDashboardPatient);
        }
    } else if (key === "issues") {
        issuesPanel.style.display = "block";
        if (currentDashboardPatient) {
            Object.values(ISSUES_SECTIONS).forEach((section) => loadIssuesSection(section, currentDashboardPatient));
        }
    } else if (key === "encounter") {
        visitHistoryPanel.style.display = "block";
        if (currentDashboardPatient) {
            loadVisitHistoryList(currentDashboardPatient);
        }
    } else if (key === "ledger") {
        ledgerPanel.style.display = "block";
        if (currentDashboardPatient) {
            loadLedger(currentDashboardPatient);
        }
    } else {
        document.getElementById("pdChartPlaceholderTitle").textContent = CHART_NAV_LABELS[key] || "Section";
        placeholder.style.display = "flex";
    }
}

// Reopens whichever chart-nav section was last shown for this patient
// (persisted by showChartSection), so a page refresh doesn't drop back to
// the Dashboard. No-op if nothing was recorded, or it was "dashboard"
// (already the default state).
function restoreLastChartSection(patient)
{
    const key = getLastActiveChartSection(patient.patient_no);

    if (!key || key === "dashboard") {
        return;
    }

    const btn = document.querySelector(`#pdChartNav [data-chart-nav="${key}"]`);

    if (!btn) {
        return;
    }

    if (key === "sdoh_assessment") {
        document.querySelector('#pdChartNav [data-chart-nav="assessments"]').classList.add("expanded");
        document.getElementById("pdAssessmentsSubmenu").classList.add("expanded");
    }

    activateChartNavButton(btn);
    showChartSection(key);
}

function setupHistoryTabs()
{
    document.querySelectorAll("#pdHistoryTabs .pd-history-tab").forEach((tab) => {
        tab.addEventListener("click", () => {
            const key = tab.getAttribute("data-history-tab");

            document.querySelectorAll("#pdHistoryTabs .pd-history-tab").forEach((t) => t.classList.toggle("active", t === tab));
            document.querySelectorAll(".pd-history-category").forEach((panel) => {
                panel.classList.toggle("active", panel.getAttribute("data-history-category") === key);
            });
        });
    });
}

function resetChartNav()
{
    document.querySelectorAll("#pdChartNav .pd-chart-nav-btn, #pdChartNav .pd-chart-nav-submenu-item").forEach((b) => {
        b.classList.toggle("active", b.getAttribute("data-chart-nav") === "dashboard");
        b.classList.remove("expanded");
    });
    document.getElementById("pdAssessmentsSubmenu").classList.remove("expanded");
    document.getElementById("pdWidgetGrid").style.display = "";
    document.getElementById("pdChartPlaceholder").style.display = "none";
    document.getElementById("pdHistoryPanel").style.display = "none";
    document.getElementById("pdSdohPanel").style.display = "none";
    document.getElementById("pdReportPanel").style.display = "none";
    document.getElementById("pdTransactionsPanel").style.display = "none";
    document.getElementById("pdIssuesPanel").style.display = "none";
    document.getElementById("pdLedgerPanel").style.display = "none";

    document.querySelectorAll("#pdHistoryTabs .pd-history-tab").forEach((t) => {
        t.classList.toggle("active", t.getAttribute("data-history-tab") === "general");
    });
    document.querySelectorAll(".pd-history-category").forEach((panel) => {
        panel.classList.toggle("active", panel.getAttribute("data-history-category") === "general");
    });
}

let patientTransactionsCache = [];
let editingTransactionId = null;

// Wires the Transactions panel's static controls (New/Cancel, the Referral/
// Counter-Referral tabs, the "Sent Summary" checkbox dependency, and the
// form submit) and kicks off the dropdown + list loads. Called once per
// chart tab render (see initPatientChartTab), same as the other init*
// calls it sits alongside.
function setupTransactionsPanel(patient)
{
    const fullName = [patient.first_name, patient.middle_name, patient.last_name, patient.suffix].filter(Boolean).join(" ");

    document.getElementById("pdTransactionsListTitle").textContent = `Patient Transactions - ${fullName}`;
    document.getElementById("pdTransactionsFormTitle").textContent = `Add/Edit Patient Transaction - ${fullName}`;

    populateTransactionDropdowns();

    document.getElementById("pdTransactionsNewBtn").addEventListener("click", () => {
        openTransactionForm(null);
    });

    document.getElementById("pdTransactionsCancelBtn").addEventListener("click", () => {
        closeTransactionForm();
    });

    document.getElementById("pdTransactionsBlankFormBtn").addEventListener("click", () => {
        printBlankReferralForm(patient);
    });

    document.querySelectorAll("#pdTxnTabs .pd-history-tab").forEach((tab) => {
        tab.addEventListener("click", () => {
            const key = tab.getAttribute("data-tx-tab");

            document.querySelectorAll("#pdTxnTabs .pd-history-tab").forEach((t) => t.classList.toggle("active", t === tab));
            document.querySelectorAll(".pd-tx-tab-content").forEach((panel) => {
                panel.classList.toggle("active", panel.getAttribute("data-tx-tab-panel") === key);
            });
        });
    });

    document.getElementById("pdTxnType").addEventListener("change", toggleTransactionTypeSections);

    const sentSummaryEl = document.getElementById("pdTxnSentSummary");
    const sentElectronicallyEl = document.getElementById("pdTxnSentSummaryElectronically");
    const confirmedReceivedEl = document.getElementById("pdTxnConfirmedReceived");

    sentSummaryEl.addEventListener("change", () => {
        sentElectronicallyEl.disabled = !sentSummaryEl.checked;
        confirmedReceivedEl.disabled = !sentSummaryEl.checked;

        if (!sentSummaryEl.checked) {
            sentElectronicallyEl.checked = false;
            confirmedReceivedEl.checked = false;
        }
    });

    document.getElementById("pdTransactionsForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        await saveTransactionForm(patient);
    });

    // Grow any of the form's textareas (Details, Reason, Findings, etc.) to
    // fit their content as the user types, instead of scrolling internally.
    document.getElementById("pdTransactionsForm").addEventListener("input", (e) => {
        if (e.target.tagName === "TEXTAREA") {
            autoGrowTextarea(e.target);
        }
    });

    loadTransactionsList(patient);
}

// Fills the Refer By / Refer To (providers) and Patient Billing Facility
// (facilities) dropdowns from the same lookups those modules already expose.
async function populateTransactionDropdowns()
{
    const referByEl = document.getElementById("pdTxnReferBy");
    const referToEl = document.getElementById("pdTxnReferTo");
    const billingFacilityEl = document.getElementById("pdTxnBillingFacility");

    const [providersResult, facilitiesResult] = await Promise.all([fetchProviders(), fetchFacilities()]);

    if (providersResult.success) {
        const options = providersResult.data.map((p) => {
            const name = [p.first_name, p.last_name].filter(Boolean).join(" ");
            return `<option value="${p.id}">${escapeHtml(name)}</option>`;
        }).join("");

        referByEl.innerHTML = `<option value="">Unassigned</option>${options}`;
        referToEl.innerHTML = `<option value="">Unassigned</option>${options}`;
    }

    if (facilitiesResult.success) {
        const options = facilitiesResult.data.map((f) => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join("");

        billingFacilityEl.innerHTML = `<option value="">-- Unspecified --</option>${options}`;
    }
}

let currentLedgerData = null;

function defaultLedgerDateRange()
{
    const to = new Date();
    const from = new Date();
    from.setFullYear(from.getFullYear() - 1);

    const pad = (n) => String(n).padStart(2, "0");
    const format = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    return { from: format(from), to: format(to) };
}

async function loadLedger(patient)
{
    const tbody = document.getElementById("pdLedgerTableBody");

    if (!tbody) {
        return;
    }

    document.getElementById("pdLedgerTitle").textContent =
        `Patient Ledger - ${[patient.first_name, patient.last_name].filter(Boolean).join(" ")}`;

    const fromInput = document.getElementById("pdLedgerFrom");
    const toInput = document.getElementById("pdLedgerTo");

    if (!fromInput.value || !toInput.value) {
        const defaults = defaultLedgerDateRange();

        fromInput.value = defaults.from;
        toInput.value = defaults.to;
    }

    tbody.innerHTML = `<tr><td colspan="9" class="table-empty">Loading...</td></tr>`;

    try {
        const result = await fetchPatientLedger(patient.id, fromInput.value, toInput.value);

        currentLedgerData = result.success ? result.data : { rows: [], totals: {} };
        renderLedgerTable(currentLedgerData);
    } catch (error) {
        console.error("Failed to load patient ledger", error);
        tbody.innerHTML = `<tr><td colspan="9" class="table-empty">Unable to load the ledger right now.</td></tr>`;
    }
}

function ledgerRowHtml(row)
{
    return `
        <tr>
            <td>${escapeHtml(row.code || "-")}</td>
            <td>${escapeHtml(row.description || "-")}</td>
            <td>${escapeHtml(row.billed_date || "-")}${row.payor ? ` / ${escapeHtml(row.payor)}` : ""}</td>
            <td>${escapeHtml(row.type || "-")}</td>
            <td>${row.units ?? "-"}</td>
            <td>${row.charge ? formatCurrency(row.charge) : "-"}</td>
            <td>${row.payment ? formatCurrency(row.payment) : "-"}</td>
            <td>${row.adjustment ? formatCurrency(row.adjustment) : "-"}</td>
            <td>${formatCurrency(row.balance)}</td>
        </tr>
    `;
}

function renderLedgerTable(data)
{
    const tbody = document.getElementById("pdLedgerTableBody");
    const rows = data.rows || [];
    const totals = data.totals || {};

    tbody.innerHTML = rows.length
        ? rows.map(ledgerRowHtml).join("")
        : `<tr><td colspan="9" class="table-empty">No billing activity in this date range.</td></tr>`;

    document.getElementById("pdLedgerTotalUnits").textContent = totals.units ?? 0;
    document.getElementById("pdLedgerTotalCharge").textContent = formatCurrency(totals.charge || 0);
    document.getElementById("pdLedgerTotalPayment").textContent = formatCurrency(totals.payment || 0);
    document.getElementById("pdLedgerTotalAdjustment").textContent = formatCurrency(totals.adjustment || 0);
    document.getElementById("pdLedgerTotalBalance").textContent = formatCurrency(totals.balance || 0);
}

function printPatientLedger(patient, data)
{
    const reportWindow = window.open("", "_blank", "width=1000,height=800,scrollbars=yes");

    if (!reportWindow) {
        alert("Please enable pop-ups to print the ledger.");
        return;
    }

    const fullName = [patient.first_name, patient.last_name].filter(Boolean).join(" ");
    const rows = data.rows || [];
    const totals = data.totals || {};

    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Patient Ledger - ${escapeHtml(fullName)}</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; color: #000; }
        h1 { font-size: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; font-size: 11px; }
        th { background: #f0f0f0; }
        tfoot td { font-weight: bold; }
        ${CCD_PRINT_BUTTON_STYLE}
    </style>
</head>
<body>
    ${CCD_PRINT_BUTTON_HTML}
    <h1>Patient Ledger - ${escapeHtml(fullName)}</h1>
    <table>
        <thead>
            <tr><th>Code</th><th>Description</th><th>Billed Date / Payor</th><th>Type</th><th>Units</th><th>Charge</th><th>Payment</th><th>Adjustment</th><th>Balance</th></tr>
        </thead>
        <tbody>
            ${rows.map(ledgerRowHtml).join("")}
        </tbody>
        <tfoot>
            <tr>
                <td colspan="4">Grand Total</td>
                <td>${totals.units ?? 0}</td>
                <td>${formatCurrency(totals.charge || 0)}</td>
                <td>${formatCurrency(totals.payment || 0)}</td>
                <td>${formatCurrency(totals.adjustment || 0)}</td>
                <td>${formatCurrency(totals.balance || 0)}</td>
            </tr>
        </tfoot>
    </table>
</body>
</html>
    `;

    reportWindow.document.write(html);
    reportWindow.document.close();
}

function openLedgerPaymentModal()
{
    document.getElementById("ledgerPaymentFormAlert").innerHTML = "";
    document.getElementById("ledgerPaymentForm").reset();
    document.getElementById("ledgerPayment_payment_type").value = "COPAY";
    document.getElementById("ledgerPayment_payment_date").value = new Date().toISOString().slice(0, 10);
    document.getElementById("ledgerPaymentModalOverlay").classList.add("open");
}

function setupLedgerPaymentModal()
{
    const formOverlay = document.getElementById("ledgerPaymentModalOverlay");
    const form = document.getElementById("ledgerPaymentForm");

    const closeForm = () => formOverlay.classList.remove("open");

    document.getElementById("closeLedgerPaymentModal").addEventListener("click", closeForm);
    document.getElementById("cancelLedgerPaymentForm").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", (event) => {
        if (event.target === formOverlay) {
            closeForm();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const details = {
            payer_type: document.getElementById("ledgerPayment_payer_type").value,
            payment_type: document.getElementById("ledgerPayment_payment_type").value.trim() || "COPAY",
            payment_date: document.getElementById("ledgerPayment_payment_date").value,
            payment_amount: document.getElementById("ledgerPayment_payment_amount").value || 0,
            adjustment_amount: document.getElementById("ledgerPayment_adjustment_amount").value || 0,
            notes: document.getElementById("ledgerPayment_notes").value.trim() || null
        };

        const result = await addLedgerPayment(currentDashboardPatient.id, details);

        if (!result.success) {
            showAlert("ledgerPaymentFormAlert", result.message || "Failed to record payment.", "error");
            return;
        }

        closeForm();
        await loadLedger(currentDashboardPatient);
    });
}

function setupLedgerPanel()
{
    document.getElementById("pdLedgerSubmitBtn").addEventListener("click", () => {
        if (currentDashboardPatient) {
            loadLedger(currentDashboardPatient);
        }
    });

    document.getElementById("pdLedgerBackBtn").addEventListener("click", (event) => {
        event.preventDefault();
        showChartSection("dashboard");
    });

    document.getElementById("pdLedgerPrintBtn").addEventListener("click", () => {
        if (currentDashboardPatient && currentLedgerData) {
            printPatientLedger(currentDashboardPatient, currentLedgerData);
        }
    });

    document.getElementById("pdLedgerAddPaymentBtn").addEventListener("click", () => {
        if (currentDashboardPatient) {
            openLedgerPaymentModal();
        }
    });

    setupLedgerPaymentModal();
}

async function loadTransactionsList(patient)
{
    const listBody = document.getElementById("pdTransactionsListBody");
    listBody.innerHTML = `<p class="pd-chart-nav-empty">Loading...</p>`;

    const result = await fetchPatientTransactions(patient.id);

    if (!result.success) {
        listBody.innerHTML = `<p class="pd-chart-nav-empty">Failed to load transactions.</p>`;
        return;
    }

    patientTransactionsCache = result.data || [];

    if (!patientTransactionsCache.length) {
        listBody.innerHTML = `<p class="pd-chart-nav-empty">There are no transactions on file for this patient.</p>`;
        return;
    }

    listBody.innerHTML = `
        <div class="table-wrap">
            <table class="data-table">
                <thead><tr><th>Type</th><th>Referral Date</th><th>Refer By</th><th>Refer To</th><th>Reason / Details</th><th></th></tr></thead>
                <tbody>
                    ${patientTransactionsCache.map((t) => `
                        <tr>
                            <td>${escapeHtml(formatTransactionType(t.transaction_type))}</td>
                            <td>${escapeHtml((t.referral_date || '').substring(0, 10))}</td>
                            <td>${escapeHtml(t.refer_by_name || '')}</td>
                            <td>${escapeHtml(t.refer_to_name || '')}</td>
                            <td>${escapeHtml((t.reason || t.details || '').slice(0, 60))}</td>
                            <td><button type="button" class="pd-report-btn pd-report-btn-secondary pd-tx-edit-btn" data-tx-id="${t.id}">Edit</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    listBody.querySelectorAll(".pd-tx-edit-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const id = Number(btn.getAttribute("data-tx-id"));
            const record = patientTransactionsCache.find((t) => t.id === id);

            if (record) openTransactionForm(record);
        });
    });
}

// "patient_request" -> "Patient Request".
function formatTransactionType(type)
{
    if (!type) return "";

    return type.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

// Only the Referral type uses the checklist/tabs/Referral+Counter-Referral
// fields; every other type (Billing, Legal, Patient Request, Physical
// Request) is just a single free-text Details box.
function toggleTransactionTypeSections()
{
    const isReferral = document.getElementById("pdTxnType").value === "referral";
    const referralSection = document.getElementById("pdTxnReferralSection");
    const detailsSection = document.getElementById("pdTxnDetailsSection");

    referralSection.style.display = isReferral ? "block" : "none";
    detailsSection.style.display = isReferral ? "none" : "block";

    // The section that just became visible may hold textareas that were
    // never sized (or were sized to 0 by an autoGrowTextarea call while
    // still hidden -- scrollHeight reads 0 for a display:none element) --
    // re-grow them now that they're actually visible.
    (isReferral ? referralSection : detailsSection).querySelectorAll("textarea").forEach(autoGrowTextarea);
}

// Opens the Add/Edit form. `record` is null for a new transaction, or the
// cached list row (already carrying refer_by_name/refer_to_name for
// display -- the ids are what actually populate the selects) when editing.
function openTransactionForm(record)
{
    editingTransactionId = record ? record.id : null;

    document.getElementById("pdTransactionsListState").style.display = "none";
    document.getElementById("pdTransactionsForm").style.display = "block";

    document.querySelectorAll("#pdTxnTabs .pd-history-tab").forEach((t) => {
        t.classList.toggle("active", t.getAttribute("data-tx-tab") === "referral");
    });
    document.querySelectorAll(".pd-tx-tab-content").forEach((panel) => {
        panel.classList.toggle("active", panel.getAttribute("data-tx-tab-panel") === "referral");
    });

    const set = (id, value) => { document.getElementById(id).value = value ?? ""; };
    const setChecked = (id, value) => { document.getElementById(id).checked = !!value; };

    set("pdTxnType", record?.transaction_type || "referral");
    set("pdTxnDetails", record?.details);
    toggleTransactionTypeSections();

    setChecked("pdTxnSentSummary", record?.sent_summary_of_care);
    setChecked("pdTxnSentSummaryElectronically", record?.sent_summary_of_care_electronically);
    setChecked("pdTxnConfirmedReceived", record?.confirmed_recipient_received_summary);
    document.getElementById("pdTxnSentSummaryElectronically").disabled = !record?.sent_summary_of_care;
    document.getElementById("pdTxnConfirmedReceived").disabled = !record?.sent_summary_of_care;

    set("pdTxnReferralDate", record?.referral_date ? record.referral_date.substring(0, 10) : new Date().toISOString().substring(0, 10));
    set("pdTxnExternalReferral", record?.external_referral || "unassigned");
    set("pdTxnReason", record?.reason);
    set("pdTxnRiskLevel", record?.risk_level || "unassigned");
    set("pdTxnRequestedService", record?.requested_service);
    set("pdTxnReferBy", record?.refer_by_provider_id || "");
    set("pdTxnReferTo", record?.refer_to_provider_id || "");
    set("pdTxnReferrerDiagnosis", record?.referrer_diagnosis);
    set("pdTxnIncludeVitals", record?.include_vitals || "unassigned");
    set("pdTxnBillingFacility", record?.billing_facility_id || "");

    set("pdTxnReplyDate", record?.reply_date ? record.reply_date.substring(0, 10) : "");
    set("pdTxnReplyFrom", record?.reply_from);
    set("pdTxnPresumedDiagnosis", record?.presumed_diagnosis);
    set("pdTxnFinalDiagnosis", record?.final_diagnosis);
    set("pdTxnDocuments", record?.documents);
    set("pdTxnFindings", record?.findings);
    set("pdTxnServicesProvided", record?.services_provided);
    set("pdTxnRecommendations", record?.recommendations);
    set("pdTxnPrescriptionsReferrals", record?.prescriptions_referrals);

    document.querySelectorAll("#pdTransactionsForm textarea").forEach(autoGrowTextarea);
}

// Grows a textarea to fit its content instead of scrolling internally.
// Reset height to "auto" first so shrinking (e.g. after clearing text, or
// opening a fresh blank form) is reflected too, not just growth.
function autoGrowTextarea(el)
{
    // scrollHeight reads 0 for an element hidden by a display:none
    // ancestor, which would otherwise collapse it to a 0px-tall box the
    // moment it's later revealed (see toggleTransactionTypeSections, which
    // re-grows a section's textareas itself once it becomes visible).
    if (el.offsetParent === null) return;

    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
}

function closeTransactionForm()
{
    editingTransactionId = null;
    document.getElementById("pdTransactionsForm").style.display = "none";
    document.getElementById("pdTransactionsListState").style.display = "block";
}

async function saveTransactionForm(patient)
{
    const val = (id) => document.getElementById(id).value;
    const checked = (id) => document.getElementById(id).checked;

    const details = {
        transaction_type: val("pdTxnType"),
        details: val("pdTxnDetails"),
        sent_summary_of_care: checked("pdTxnSentSummary"),
        sent_summary_of_care_electronically: checked("pdTxnSentSummaryElectronically"),
        confirmed_recipient_received_summary: checked("pdTxnConfirmedReceived"),
        referral_date: val("pdTxnReferralDate"),
        external_referral: val("pdTxnExternalReferral"),
        reason: val("pdTxnReason"),
        risk_level: val("pdTxnRiskLevel"),
        requested_service: val("pdTxnRequestedService"),
        refer_by_provider_id: val("pdTxnReferBy"),
        refer_to_provider_id: val("pdTxnReferTo"),
        referrer_diagnosis: val("pdTxnReferrerDiagnosis"),
        include_vitals: val("pdTxnIncludeVitals"),
        billing_facility_id: val("pdTxnBillingFacility"),
        reply_date: val("pdTxnReplyDate"),
        reply_from: val("pdTxnReplyFrom"),
        presumed_diagnosis: val("pdTxnPresumedDiagnosis"),
        final_diagnosis: val("pdTxnFinalDiagnosis"),
        documents: val("pdTxnDocuments"),
        findings: val("pdTxnFindings"),
        services_provided: val("pdTxnServicesProvided"),
        recommendations: val("pdTxnRecommendations"),
        prescriptions_referrals: val("pdTxnPrescriptionsReferrals")
    };

    const result = editingTransactionId
        ? await updatePatientTransaction(editingTransactionId, details)
        : await addPatientTransaction(patient.id, details);

    if (!result.success) {
        alert(result.message || "Failed to save transaction.");
        return;
    }

    closeTransactionForm();
    await loadTransactionsList(patient);
}

// Renders one "Referral Form" / "Counter Referral Form" header block: the
// form title on the left, the facility's name/address and a Client ID/Date
// box on the right -- reused by both copies on page 1 and the Counter
// Referral Form on page 2.
function renderReferralFormHeader(title)
{
    return `
        <div class="ref-header">
            <div class="ref-title">${escapeHtml(title)}</div>
            <div class="ref-facility">
                <strong>Motol University Hospital - II</strong><br/>
                V &Uacute;valu 84<br/>
                150 06 Praha 5, PRG, CZ<br/>
                Tel: +1-224431111
                <table class="ref-idbox">
                    <tr><td>Client ID</td><td></td></tr>
                    <tr><td>Date</td><td></td></tr>
                </table>
            </div>
        </div>`;
}

// A field row: one or more label+blank-line pairs on the same line, e.g.
// renderReferralFormRow([['Blood pressure', '/'], ['Height'], ['Weight']]).
// A second element in a pair (like the '/' above) is a short inline
// separator printed right after the label instead of a blank line.
function renderReferralFormRow(fields)
{
    return `
        <div class="ref-row">
            ${fields.map(([label, sep]) => `
                <span class="ref-field">
                    <span class="ref-label">${escapeHtml(label)}</span>
                    ${sep ? `<span class="ref-sep">${escapeHtml(sep)}</span>` : ''}
                    <span class="ref-line"></span>
                </span>
            `).join('')}
        </div>`;
}

const REFERRAL_FORM_STYLE = `
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; color: #000; }
        .ref-box { border: 1.5px solid #333; padding: 20px 24px; margin-bottom: 24px; page-break-inside: avoid; }
        .ref-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 8px; }
        .ref-title { font-size: 19px; font-weight: 700; }
        .ref-facility { text-align: right; font-size: 11.5px; color: #2563eb; line-height: 1.5; }
        .ref-facility strong { color: #000; font-size: 12.5px; }
        table.ref-idbox { margin-top: 6px; border-collapse: collapse; margin-left: auto; }
        table.ref-idbox td { border: 1px solid #888; padding: 2px 8px; font-size: 10.5px; }
        table.ref-idbox td:first-child { color: #2563eb; text-align: left; }
        table.ref-idbox td:last-child { width: 90px; }
        .ref-copy-label { font-weight: 700; color: #8a3324; margin: 6px 0 14px; }
        .ref-section-label { font-weight: 700; color: #8a3324; margin: 14px 0 10px; }
        .ref-row { display: flex; flex-wrap: wrap; gap: 6px 26px; margin-bottom: 14px; }
        .ref-field { display: flex; align-items: baseline; gap: 6px; flex: 1 1 auto; }
        .ref-field.ref-field-wide { flex-basis: 100%; }
        .ref-label { color: #8a3324; white-space: nowrap; }
        .ref-sep { color: #333; }
        .ref-line { border-bottom: 1px solid #333; flex: 1; min-width: 40px; height: 14px; }
        ${CCD_PRINT_BUTTON_STYLE}
        @media print { .ref-box { break-inside: avoid; } }`;

// The OpenEMR-style blank Referral / Counter Referral paperwork: a Clinic
// Copy and Client Copy of the Referral Form on page 1, and a Counter
// Referral Form on page 2, all left blank for hand-filling (unlike the
// data-entry fields in the Add/Edit Transaction form this mirrors).
function printBlankReferralForm(patient)
{
    const reportWindow = window.open("", "_blank", "width=850,height=800,scrollbars=yes");
    if (!reportWindow) {
        alert("Please enable pop-ups to view the form.");
        return;
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Referral Form</title>
    <style>${REFERRAL_FORM_STYLE}</style>
</head>
<body>
    ${CCD_PRINT_BUTTON_HTML}

    <div class="ref-box">
        ${renderReferralFormHeader('Referral Form')}
        <div class="ref-copy-label">Clinic Copy</div>
        <div class="ref-section-label">Client medical history summary:</div>
        ${renderReferralFormRow([['Blood pressure', '/'], ['Height'], ['Weight']])}
        ${renderReferralFormRow([['Name'], ['DOB'], ['Age'], ['Gender']])}
        ${renderReferralFormRow([['Insurance'], ['Plan'], ['Policy'], ['Group'], ['Effective Date']])}
        ${renderReferralFormRow([['Address'], ['Postal'], ['Phone']])}
        ${renderReferralFormRow([['Reference Reason']])}
        ${renderReferralFormRow([['Diagnosis']])}
        ${renderReferralFormRow([['Reference classification (risk level)']])}
        ${renderReferralFormRow([["Doctor's name and signature"]])}
        ${renderReferralFormRow([['Referred to', '/']])}
    </div>

    <div class="ref-box">
        ${renderReferralFormHeader('Referral Form')}
        <div class="ref-copy-label">Client Copy</div>
        ${renderReferralFormRow([['Name'], ['Age'], ['Gender']])}
        ${renderReferralFormRow([['Insurance'], ['Plan'], ['Policy'], ['Group'], ['Effective Date']])}
        ${renderReferralFormRow([['Health centre/clinic']])}
        ${renderReferralFormRow([['Address'], ['Postal'], ['Phone']])}
        ${renderReferralFormRow([['Reference Reason']])}
        <div class="ref-section-label">Client medical history summary:</div>
        ${renderReferralFormRow([['Blood pressure', '/'], ['Height'], ['Weight']])}
        ${renderReferralFormRow([['Referer name and signature']])}
        ${renderReferralFormRow([['Specialist name and signature']])}
    </div>

    <div class="ref-box" style="page-break-before: always;">
        ${renderReferralFormHeader('Counter Referral Form')}
        <div class="ref-copy-label">For Referred Organization/Practitioner</div>
        ${renderReferralFormRow([['Name'], ['Age'], ['Gender']])}
        ${renderReferralFormRow([['Insurance'], ['Plan'], ['Policy'], ['Group'], ['Effective Date']])}
        ${renderReferralFormRow([['Health centre/clinic']])}
        ${renderReferralFormRow([['Diagnosis']])}
        ${renderReferralFormRow([['Findings']])}
        ${renderReferralFormRow([['Final Diagnosis']])}
        ${renderReferralFormRow([['Services provided']])}
        ${renderReferralFormRow([['Recommendations and treatment']])}
        ${renderReferralFormRow([['Prescriptions and other referrals']])}
        ${renderReferralFormRow([['Specialist name and signature']])}
    </div>
</body>
</html>
    `;

    reportWindow.document.open();
    reportWindow.document.write(html);
    reportWindow.document.close();
}

// Consumes a chart-open request handed off by another module (currently
// only the Flow board's "open patient chart" link), so it works whether
// the Patients tab was already open or just got activated for this.
function openPendingPatientView()
{
    const patientNo = consumePendingPatientView();

    if (!patientNo) {
        return;
    }

    const patient = patientsCache.find((p) => p.patient_no === patientNo);

    if (patient) {
        openPatientChartTab(patient);
    }
}

// Opens (or replaces) the single shared Patient Chart tab for the given
// patient. Exported so other entry points into a patient's chart -- the
// Finder, the Flow board hand-off -- can reuse it instead of duplicating
// the tab-opening logic.
export function openPatientChartTab(patient, activate = true)
{
    const fullName = [patient.first_name, patient.middle_name, patient.last_name, patient.suffix].filter(Boolean).join(" ");

    setLastActivePatientChart(patient.patient_no);

    window.tabManager.openOrReplaceTab('patient_chart', fullName || 'Patient Chart', () => {
        setTimeout(() => initPatientChartTab(patient), 0);
        return PatientChartView(getUser());
    }, activate);
}

// Reopens the Patient Chart tab for whichever patient was last shown in it,
// so a page refresh doesn't lose it (TabManager persists which tab ids were
// open, but not the patient data behind a dynamic tab like this one).
// Returns true if a chart was restored, false if there was nothing to
// restore (no last-active patient, or that patient couldn't be found).
export async function restorePatientChartTab(activate = true)
{
    const patientNo = getLastActivePatientChart();

    if (!patientNo) {
        return false;
    }

    const result = await fetchPatients();

    if (!result.success) {
        return false;
    }

    const patient = result.data.find((p) => p.patient_no === patientNo);

    if (!patient) {
        return false;
    }

    openPatientChartTab(patient, activate);

    return true;
}

// Populates and wires up the Patient Chart tab for the given patient. Called
// (via setTimeout, so the tab's markup is mounted first) whenever the chart
// tab is opened or replaced with a different patient.
export async function initPatientChartTab(patient)
{
    const user = getUser();

    currentDashboardPatient = patient;

    const fullName = [patient.first_name, patient.middle_name, patient.last_name, patient.suffix].filter(Boolean).join(" ");
    const sex = patient.sex ? patient.sex.charAt(0).toUpperCase() + patient.sex.slice(1) : "";
    const providerName = patient.provider_first_name ? `${patient.provider_first_name} ${patient.provider_last_name}` : "";

    document.getElementById("pdAvatar").innerHTML = patientAvatarHtml(patient);
    document.getElementById("pdSidebarAvatar").innerHTML = patientAvatarHtml(patient);
    document.getElementById("pdName").textContent = fullName;
    document.getElementById("pdSidebarName").textContent = fullName;
    document.getElementById("pdSubtitle").textContent = `Patient No: ${patient.patient_no}`;
    document.getElementById("pdSidebarSub").textContent = `Patient No: ${patient.patient_no}`;

    setFact("pdFactSex", sex);
    setFact("pdFactBirthdate", formatDate(patient.birthdate));
    const age = calculateAge(patient.birthdate);
    setFact("pdFactAge", age === null ? "" : String(age));
    setFact("pdFactBloodType", patient.blood_type);
    setFact("pdFactProvider", providerName);

    showPatientContextBar(patient);
    setupPatientPhotoUpload(patient);

    resetChartNav();

    activeDemoTab = "who";
    dashboardRelatedPersons = [];
    document.querySelectorAll("#pdDemoTabs .pd-demo-tab").forEach((btn) => {
        btn.classList.toggle("active", btn.getAttribute("data-demo-tab") === "who");
    });
    renderDemographics(patient);

    loadPatientDashboardWidgets(patient);
    loadDashboardInsurance(patient);
    loadDashboardVitalsHistory(patient);
    loadDashboardAppointments(patient);
    loadDashboardDocuments(patient);

    document.querySelectorAll("#pdDemoTabs .pd-demo-tab").forEach((btn) => {
        btn.addEventListener("click", () => {
            activeDemoTab = btn.getAttribute("data-demo-tab");
            document.querySelectorAll("#pdDemoTabs .pd-demo-tab").forEach((b) => b.classList.toggle("active", b === btn));

            if (currentDashboardPatient) {
                renderDemographics(currentDashboardPatient);
            }
        });
    });

    setupChartNav();
    setupReports();
    setupHistoryTabs();
    initGeneralHistory(patient.id);
    initFamilyHistory(patient.id);
    initRelativesHistory(patient.id);
    initLifestyle(patient.id);
    initOtherHistory(patient.id);
    initSdohAssessment(patient.id);
    setupTransactionsPanel(patient);
    setupIssuesPanel(patient);
    setupVisitHistoryPanel();
    setupEncounterSummaryPanel();
    setupFeeSheetPanel();

    // "Edit" on the Related Persons widget jumps straight into the Edit
    // Patient modal's Related Persons tab, reusing that CRUD instead of
    // duplicating it inside the (read-only) Patient Dashboard.
    document.getElementById("pdRelatedPersonsAddBtn").addEventListener("click", () => {
        if (!currentDashboardPatient) {
            return;
        }

        openEditModal(currentDashboardPatient);

        const editModalBox = document.getElementById("editPatientModalOverlay").querySelector(".modal-box");
        const relatedPersonsTab = editModalBox.querySelector('.modal-tab[data-tab="related_persons"]');

        if (relatedPersonsTab) {
            relatedPersonsTab.click();
        }
    });

    setupAllergyModals();
    setupProblemModals();
    setupHealthConcernModals();
    setupMedicationModals();
    setupInsuranceModals();
    setupDeviceModal();
    setupSurgeryModal();
    setupDentalIssueModal();
    setupImmunizationModals();
    setupCarePlanModals();
    setupClinicalInstructionsModal();
    setupClinicalNotesModal();
    setupFunctionalCognitiveModal();
    setupObservationModal();
    setupReviewOfSystemsModal();
    setupReviewOfSystemsChecksModal();
    setupSoapNoteModal();
    setupSpeechDictationModal();
    setupVitalsModal();
    setupLedgerPanel();
    setupDocumentUploadModal();
    setupPrescriptionModals();
    setupDisclosureModals();
    setupMessageModals();
    setupPatientRecordRequestModal();
    setupAmendmentModals();
    setupEncounterModals();
    setupCareTeamModal();
    setupRelatedPersonModals();
    setupSelectCodesModal();

    if (user.role !== "doctor") {
        await setupEditPatientModal(user);
    }

    restoreLastChartSection(patient);
}

// The widgets used to each fire their own request when the dashboard
// opened (8 separate GETs). Against a remote database, each one pays a
// fresh connection round-trip, and PHP's single-threaded built-in dev
// server processes them one at a time -- so opening the dashboard could
// take several seconds. Fetching everything in one batched request
// (see PatientController::dashboardSummary) cuts that to a single
// round-trip; render functions are unchanged and reused as-is.
async function loadPatientDashboardWidgets(patient)
{
    const widgetBodyIds = [
        "pdAllergiesBody", "pdProblemsBody", "pdHealthConcernsBody", "pdMedicationsBody", "pdPrescriptionsBody",
        "pdRelatedPersonsBody", "pdDisclosuresBody", "pdMessagesBody", "pdAmendmentsBody", "pdEncountersBody",
        "pdCareTeamBody", "pdImmunizationsBody"
    ];

    try {
        const result = await fetchPatientDashboardSummary(patient.id);

        if (!result.success) {
            widgetBodyIds.forEach((id) => {
                const body = document.getElementById(id);
                if (body) body.innerHTML = `<div class="pd-widget-empty"><p>${escapeHtml(result.message || "Unable to load this section right now.")}</p></div>`;
            });
            return;
        }

        const data = result.data || {};

        renderDashboardAllergies(data.allergies || []);
        renderDashboardProblems(data.problems || []);
        renderDashboardHealthConcerns(data.health_concerns || []);
        renderDashboardMedications(data.medications || []);
        renderDashboardPrescriptions(data.prescriptions || []);
        renderDashboardDisclosures(data.disclosures || []);
        renderDashboardMessages(data.messages || []);
        renderDashboardAmendments(data.amendments || []);
        renderDashboardEncounters(data.encounters || []);
        renderDashboardCareTeam(data.care_team || null);
        renderDashboardImmunizations(data.immunizations || []);

        dashboardRelatedPersons = data.related_persons || [];
        renderDashboardRelatedPersons(dashboardRelatedPersons);

        if (activeDemoTab === "related" && currentDashboardPatient === patient) {
            renderDemographics(patient);
        }
    } catch (error) {
        console.error("Failed to load patient dashboard summary", error);
        widgetBodyIds.forEach((id) => {
            const body = document.getElementById(id);
            if (body) body.innerHTML = `<div class="pd-widget-empty"><p>Unable to load this section right now.</p></div>`;
        });
    }
}

async function loadDashboardAmendments(patient)
{
    const body = document.getElementById("pdAmendmentsBody");

    if (!body) {
        return;
    }

    try {
        const result = await fetchPatientAmendments(patient.id);

        renderDashboardAmendments(result.success ? result.data : []);
    } catch (error) {
        console.error("Failed to load amendments", error);
        body.innerHTML = `<div class="pd-widget-empty"><p>Unable to load amendments right now.</p></div>`;
    }
}

function renderDashboardAmendments(amendments)
{
    const body = document.getElementById("pdAmendmentsBody");

    if (!body) {
        return;
    }

    body.innerHTML = amendments.length
        ? `<div class="pd-allergy-list">
            ${amendments.map((amendment) => `
                <div class="pd-allergy-item">
                    <span class="pd-allergy-name">${escapeHtml(truncate(amendment.description, 60))}${amendment.status ? ` &middot; ${escapeHtml(amendment.status)}` : ""}</span>
                </div>
            `).join("")}
           </div>`
        : `<div class="pd-widget-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
            <p>No amendment requests available.</p>
           </div>`;
}

function renderDashboardEncounters(encounters)
{
    const body = document.getElementById("pdEncountersBody");

    if (!body) {
        return;
    }

    body.innerHTML = encounters.length
        ? `<div class="pd-visit-list">
            ${encounters.slice(0, 5).map((encounter) => `
                <div class="pd-visit-item">
                    <div class="pd-visit-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4M8 2v4M3 10h18"></path></svg>
                    </div>
                    <div class="pd-visit-info">
                        <span class="pd-visit-category">${escapeHtml(encounter.visit_category_name || "Visit")}</span>
                        <span class="pd-visit-date">${escapeHtml(formatDateTime(encounter.date_of_service))}</span>
                    </div>
                </div>
            `).join("")}
           </div>`
        : `<div class="pd-widget-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M12 10v6M9 13h6"></path></svg>
            <p>No visits recorded for this patient.</p>
           </div>`;
}

function truncate(text, length)
{
    const value = text || "";

    return value.length > length ? `${value.slice(0, length)}...` : value;
}

async function loadDashboardMessages(patient)
{
    const body = document.getElementById("pdMessagesBody");

    if (!body) {
        return;
    }

    try {
        const result = await fetchPatientMessages(patient.id);

        renderDashboardMessages(result.success ? result.data : []);
    } catch (error) {
        console.error("Failed to load messages", error);
        body.innerHTML = `<div class="pd-widget-empty"><p>Unable to load messages right now.</p></div>`;
    }
}

function renderDashboardMessages(messages)
{
    const body = document.getElementById("pdMessagesBody");

    if (!body) {
        return;
    }

    body.innerHTML = messages.length
        ? `<div class="pd-allergy-list">
            ${messages.slice(0, 5).map((message) => `
                <div class="pd-allergy-item">
                    <span class="pd-allergy-name">${escapeHtml(message.sender_name || "Unknown")}${message.type_name ? ` &middot; ${escapeHtml(message.type_name)}` : ""}</span>
                </div>
            `).join("")}
           </div>`
        : `<div class="pd-widget-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4z"></path><path d="m4 6 8 7 8-7"></path></svg>
            <p>No messages recorded for this patient.</p>
           </div>`;
}

async function loadDashboardDisclosures(patient)
{
    const body = document.getElementById("pdDisclosuresBody");

    if (!body) {
        return;
    }

    try {
        const result = await fetchPatientDisclosures(patient.id);

        renderDashboardDisclosures(result.success ? result.data : []);
    } catch (error) {
        console.error("Failed to load disclosures", error);
        body.innerHTML = `<div class="pd-widget-empty"><p>Unable to load disclosures right now.</p></div>`;
    }
}

function renderDashboardDisclosures(disclosures)
{
    const body = document.getElementById("pdDisclosuresBody");

    if (!body) {
        return;
    }

    body.innerHTML = disclosures.length
        ? `<div class="pd-allergy-list">
            ${disclosures.map((disclosure) => `
                <div class="pd-allergy-item">
                    <span class="pd-allergy-name">${escapeHtml(disclosure.recipient)}${disclosure.disclosure_type ? ` &middot; ${escapeHtml(disclosure.disclosure_type)}` : ""}</span>
                </div>
            `).join("")}
           </div>`
        : `<div class="pd-widget-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4v16h16"></path><path d="m8 15 4-6 3 3 5-7"></path></svg>
            <p>No disclosures recorded for this patient.</p>
           </div>`;
}

function renderDashboardRelatedPersons(persons)
{
    const body = document.getElementById("pdRelatedPersonsBody");

    if (!body) {
        return;
    }

    body.innerHTML = persons.length
        ? `<div class="pd-allergy-list">
            ${persons.map((person) => {
                const fullName = [person.first_name, person.middle_name, person.last_name].filter(Boolean).join(" ");
                const relationship = person.relationship ? ` (${escapeHtml(person.relationship)})` : "";

                return `
                <div class="pd-allergy-item">
                    <span class="pd-allergy-name">${escapeHtml(fullName)}${relationship}</span>
                </div>
                `;
            }).join("")}
           </div>`
        : `<div class="pd-widget-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M9 12h6"></path></svg>
            <p>No related persons recorded.</p>
           </div>`;
}

function renderDemographics(patient)
{
    const panels = document.getElementById("pdDemoPanels");

    if (!panels) {
        return;
    }

    if (activeDemoTab === "related") {
        panels.innerHTML = renderRelatedPersonsPanel(dashboardRelatedPersons);
        return;
    }

    const field = (label, value) => `
        <div class="pd-demo-field">
            <span class="pd-demo-label">${escapeHtml(label)}</span>
            <span class="pd-demo-value${value ? "" : " empty"}">${escapeHtml(value || "Not set")}</span>
        </div>
    `;

    const sexLabel = patient.sex ? patient.sex.charAt(0).toUpperCase() + patient.sex.slice(1) : "";
    const providerName = patient.provider_first_name ? `${patient.provider_first_name} ${patient.provider_last_name}` : "";
    const yesNo = (value) => (value === "yes" ? "Yes" : value === "no" ? "No" : "");

    const tabRows = {
        who: [
            field("First Name", patient.first_name),
            field("Middle Name", patient.middle_name),
            field("Last Name", patient.last_name),
            field("Suffix", patient.suffix),
            field("Sex", sexLabel),
            field("Birthdate", formatDate(patient.birthdate)),
            field("Civil Status", patient.civil_status),
            field("Blood Type", patient.blood_type),
            field("Height (cm)", patient.height),
            field("Weight (kg)", patient.weight)
        ],
        contact: [
            field("Address Line", patient.contact_address_line),
            field("City", patient.contact_city),
            field("Province", patient.contact_province),
            field("Zip Code", patient.contact_zip_code),
            field("Home Phone", patient.contact_home_phone),
            field("Mobile Phone", patient.contact_mobile_phone),
            field("Work Phone", patient.contact_work_phone),
            field("Contact Email", patient.contact_email)
        ],
        choices: [
            field("Care Provider", providerName),
            field("Allow SMS", yesNo(patient.allow_sms)),
            field("Allow Voice Calls", yesNo(patient.allow_voice_calls)),
            field("Allow Email", yesNo(patient.allow_email)),
            field("Allow Health Info Exchange", yesNo(patient.allow_hie)),
            field("Allow Postcard", yesNo(patient.allow_postcard))
        ],
        stats: [
            field("Language", patient.language),
            field("Race", patient.race),
            field("Ethnicity", patient.ethnicity),
            field("Religion", patient.religion)
        ],
        employer: [
            field("Occupation", patient.employer_occupation),
            field("Employer Name", patient.employer_name),
            field("Employer Address", patient.employer_address_line),
            field("Employer Address Line 2", patient.employer_address_line2),
            field("City", patient.employer_city),
            field("State", patient.employer_state),
            field("Postal Code", patient.employer_postal_code),
            field("Country", patient.employer_country),
            field("Industry", patient.employer_industry),
            field("Employment Start Date", patient.employer_employment_start_date),
            field("Employment End Date", patient.employer_employment_end_date)
        ],
        misc: [
            field("Date Deceased", patient.date_deceased),
            field("Reason Deceased", patient.reason_deceased)
        ]
    };

    const rows = tabRows[activeDemoTab] || [];

    panels.innerHTML = `<div class="pd-demo-grid">${rows.join("")}</div>`;
}

function renderRelatedPersonsPanel(persons)
{
    if (!persons.length) {
        return `<div class="pd-widget-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M9 12h6"></path></svg>
            <p>No related persons recorded.</p>
           </div>`;
    }

    const field = (label, value) => `
        <div class="pd-demo-field">
            <span class="pd-demo-label">${escapeHtml(label)}</span>
            <span class="pd-demo-value${value ? "" : " empty"}">${escapeHtml(value || "Not set")}</span>
        </div>
    `;

    const yesNo = (value) => (Number(value) ? "Yes" : "No");

    return persons.map((person) => {
        const fullName = [person.first_name, person.middle_name, person.last_name].filter(Boolean).join(" ");
        const genderLabel = person.gender ? person.gender.charAt(0).toUpperCase() + person.gender.slice(1) : "";

        return `
        <div class="pd-related-card">
            <div class="pd-related-card-header">
                <strong>${escapeHtml(fullName)}</strong>
                ${person.relationship ? `<span class="pd-related-badge">${escapeHtml(person.relationship)}</span>` : ""}
            </div>
            <div class="pd-demo-grid">
                ${field("Role", person.role)}
                ${field("Phone", person.phone)}
                ${field("Date of Birth", person.date_of_birth)}
                ${field("Gender", genderLabel)}
                ${field("Primary Contact", yesNo(person.is_primary_contact))}
                ${field("Emergency Contact", yesNo(person.is_emergency_contact))}
                ${field("Can Make Medical Decisions", yesNo(person.can_make_medical_decisions))}
                ${field("Can Receive Medical Info", yesNo(person.can_receive_medical_info))}
                ${field("Notes", person.notes)}
            </div>
        </div>
        `;
    }).join("");
}

async function loadDashboardAllergies(patient)
{
    const body = document.getElementById("pdAllergiesBody");

    if (!body) {
        return;
    }

    try {
        const result = await fetchPatientAllergies(patient.id);

        renderDashboardAllergies(result.success ? result.data : []);
    } catch (error) {
        console.error("Failed to load allergies", error);
        body.innerHTML = `<div class="pd-widget-empty"><p>Unable to load allergies right now.</p></div>`;
    }
}

function renderDashboardAllergies(allergies)
{
    const body = document.getElementById("pdAllergiesBody");

    if (!body) {
        return;
    }

    body.innerHTML = allergies.length
        ? `<div class="pd-allergy-list">
            ${allergies.map((allergy) => `
                <div class="pd-allergy-item">
                    <span class="pd-allergy-name">${escapeHtml(allergy.name)}</span>
                </div>
            `).join("")}
           </div>`
        : `<div class="pd-widget-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M9 12h6"></path></svg>
            <p>No known allergies recorded.</p>
           </div>`;
}

async function loadDashboardProblems(patient)
{
    const body = document.getElementById("pdProblemsBody");

    if (!body) {
        return;
    }

    try {
        const result = await fetchPatientMedicalProblems(patient.id);

        renderDashboardProblems(result.success ? result.data : []);
    } catch (error) {
        console.error("Failed to load medical problems", error);
        body.innerHTML = `<div class="pd-widget-empty"><p>Unable to load problems right now.</p></div>`;
    }
}

function renderDashboardProblems(problems)
{
    const body = document.getElementById("pdProblemsBody");

    if (!body) {
        return;
    }

    const active = problems.filter((problem) => !problem.end_date);

    body.innerHTML = active.length
        ? `<div class="pd-allergy-list">
            ${active.map((problem) => `
                <div class="pd-allergy-item">
                    <span class="pd-allergy-name">${escapeHtml(problem.title)}</span>
                </div>
            `).join("")}
           </div>`
        : `<div class="pd-widget-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v4M12 16h.01"></path></svg>
            <p>No active problems recorded.</p>
           </div>`;
}

function renderDashboardHealthConcerns(concerns)
{
    const body = document.getElementById("pdHealthConcernsBody");

    if (!body) {
        return;
    }

    const active = concerns.filter((concern) => !concern.end_date);

    body.innerHTML = active.length
        ? `<div class="pd-allergy-list">
            ${active.map((concern) => `
                <div class="pd-allergy-item">
                    <span class="pd-allergy-name">${escapeHtml(concern.title)}</span>
                </div>
            `).join("")}
           </div>`
        : `<div class="pd-widget-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v6l4 2"></path></svg>
            <p>No health concerns recorded.</p>
           </div>`;
}

async function loadDashboardMedications(patient)
{
    const body = document.getElementById("pdMedicationsBody");

    if (!body) {
        return;
    }

    try {
        const result = await fetchPatientMedications(patient.id);

        renderDashboardMedications(result.success ? result.data : []);
    } catch (error) {
        console.error("Failed to load medications", error);
        body.innerHTML = `<div class="pd-widget-empty"><p>Unable to load medications right now.</p></div>`;
    }
}

function renderDashboardMedications(medications)
{
    const body = document.getElementById("pdMedicationsBody");

    if (!body) {
        return;
    }

    const active = medications.filter((medication) => !medication.end_date);

    body.innerHTML = active.length
        ? `<div class="pd-allergy-list">
            ${active.map((medication) => `
                <div class="pd-allergy-item">
                    <span class="pd-allergy-name">${escapeHtml(medication.title)}</span>
                </div>
            `).join("")}
           </div>`
        : `<div class="pd-widget-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"></path><path d="m8.5 8.5 7 7"></path></svg>
            <p>No active medications recorded.</p>
           </div>`;
}

async function loadDashboardImmunizations(patient)
{
    const body = document.getElementById("pdImmunizationsBody");

    if (!body) {
        return;
    }

    try {
        const result = await fetchPatientImmunizations(patient.id);

        renderDashboardImmunizations(result.success ? result.data : []);
    } catch (error) {
        console.error("Failed to load immunizations", error);
        body.innerHTML = `<div class="pd-widget-empty"><p>Unable to load immunizations right now.</p></div>`;
    }
}

function renderDashboardImmunizations(immunizations)
{
    const body = document.getElementById("pdImmunizationsBody");

    if (!body) {
        return;
    }

    body.innerHTML = immunizations.length
        ? `<div class="pd-allergy-list">
            ${immunizations.map((immunization) => `
                <div class="pd-allergy-item">
                    <span class="pd-allergy-name">${escapeHtml(immunization.vaccine_name || immunization.cvx_code)}${immunization.administered_at ? ` &middot; ${escapeHtml(immunization.administered_at.slice(0, 10))}` : ""}</span>
                </div>
            `).join("")}
           </div>`
        : `<div class="pd-widget-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11.5 22 6l-4-4-5.5 4M18 11.5 8 21H3v-5l10-10 5 5.5Z"></path></svg>
            <p>No immunization records yet.</p>
           </div>`;
}

async function loadDashboardPrescriptions(patient)
{
    const body = document.getElementById("pdPrescriptionsBody");

    if (!body) {
        return;
    }

    try {
        const result = await fetchPatientPrescriptions(patient.id);

        renderDashboardPrescriptions(result.success ? result.data : []);
    } catch (error) {
        console.error("Failed to load prescriptions", error);
        body.innerHTML = `<div class="pd-widget-empty"><p>Unable to load prescriptions right now.</p></div>`;
    }
}

function renderDashboardPrescriptions(prescriptions)
{
    const body = document.getElementById("pdPrescriptionsBody");

    if (!body) {
        return;
    }

    const active = prescriptions.filter((prescription) => !prescription.end_date);

    body.innerHTML = active.length
        ? `<div class="pd-allergy-list">
            ${active.map((prescription) => `
                <div class="pd-allergy-item">
                    <span class="pd-allergy-name">${escapeHtml(prescription.title)}</span>
                </div>
            `).join("")}
           </div>`
        : `<div class="pd-widget-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path><path d="M14 2v6h6M9 15h6M9 11h3"></path></svg>
            <p>No prescriptions recorded.</p>
           </div>`;
}

function setupAllergyModals()
{
    const detailOverlay = document.getElementById("allergyDetailModalOverlay");
    const formOverlay = document.getElementById("allergyFormModalOverlay");
    const form = document.getElementById("allergyForm");

    const closeDetail = () => detailOverlay.classList.remove("open");
    const closeForm = () => formOverlay.classList.remove("open");

    document.getElementById("pdAllergiesAddBtn").addEventListener("click", () => {
        if (currentDashboardPatient) {
            openAllergyDetailModal(currentDashboardPatient);
        }
    });

    document.getElementById("closeAllergyDetailModal").addEventListener("click", closeDetail);
    detailOverlay.addEventListener("click", (event) => {
        if (event.target === detailOverlay) {
            closeDetail();
        }
    });

    document.getElementById("allergyMoreToggle").addEventListener("click", (event) => {
        const toggle = event.currentTarget;
        const moreFields = document.getElementById("allergyMoreFields");
        const isHidden = moreFields.hidden;

        moreFields.hidden = !isHidden;
        toggle.classList.toggle("expanded", isHidden);
        toggle.querySelector("span").textContent = isHidden ? "Hide More Fields" : "Show More Fields";
    });

    document.getElementById("openAddAllergyBtn").addEventListener("click", () => {
        openAllergyFormModal(null);
    });

    document.getElementById("openSelectCodesBtn").addEventListener("click", () => {
        openSelectCodesModal("allergy_coding");
    });

    document.getElementById("closeAllergyFormModal").addEventListener("click", closeForm);
    document.getElementById("cancelAllergyForm").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", (event) => {
        if (event.target === formOverlay) {
            closeForm();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const recordId = document.getElementById("allergy_record_id").value;
        const allergyId = document.getElementById("allergy_catalog_id").value;
        const errEl = document.getElementById("err-allergy_catalog_id");

        errEl.textContent = "";

        if (!recordId && !allergyId) {
            errEl.textContent = "Select an allergy.";
            return;
        }

        const details = {};

        ALLERGY_DETAIL_FIELDS.forEach((field) => {
            details[field] = document.getElementById(`allergy_${field}`).value.trim();
        });

        const result = recordId
            ? await updatePatientAllergy(recordId, details)
            : await addPatientAllergy(currentDashboardPatient.id, allergyId, details);

        if (!result.success) {
            showAlert("allergyFormAlert", result.message || "Failed to save allergy.", "error");
            return;
        }

        closeForm();
        await loadAllergyDetailTable(currentDashboardPatient);
        await loadDashboardAllergies(currentDashboardPatient);
        await loadIssuesSection(ISSUES_SECTIONS.allergies, currentDashboardPatient);
    });
}

let scmSelectedMap = new Map();
let scmTargetFieldId = "allergy_coding";
let scmTitleFieldId = null;

function setupSelectCodesModal()
{
    const overlay = document.getElementById("selectCodesModalOverlay");
    const sourceSelect = document.getElementById("scmSourceSelect");
    const searchInput = document.getElementById("scmSearchInput");
    const prevBtn = document.getElementById("scmPrevPage");
    const nextBtn = document.getElementById("scmNextPage");
    const confirmBtn = document.getElementById("confirmSelectCodes");

    const closeModal = () => overlay.classList.remove("open");

    document.getElementById("closeSelectCodesModal").addEventListener("click", closeModal);
    document.getElementById("cancelSelectCodes").addEventListener("click", closeModal);
    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
            closeModal();
        }
    });

    sourceSelect.addEventListener("change", () => {
        scmSource = sourceSelect.value;
        scmCurrentPage = 1;
        loadScmResults();
    });

    searchInput.addEventListener("input", () => {
        clearTimeout(scmSearchDebounce);
        scmSearchDebounce = setTimeout(() => {
            scmSearchTerm = searchInput.value.trim();
            scmCurrentPage = 1;
            loadScmResults();
        }, 300);
    });

    document.getElementById("scmSearchBtn").addEventListener("click", () => {
        scmSearchTerm = searchInput.value.trim();
        scmCurrentPage = 1;
        loadScmResults();
    });

    document.getElementById("scmClearBtn").addEventListener("click", () => {
        searchInput.value = "";
        scmSearchTerm = "";
        scmCurrentPage = 1;
        loadScmResults();
    });

    prevBtn.addEventListener("click", () => {
        if (scmCurrentPage > 1) {
            scmCurrentPage -= 1;
            loadScmResults();
        }
    });

    nextBtn.addEventListener("click", () => {
        if (scmCurrentPage < scmTotalPages) {
            scmCurrentPage += 1;
            loadScmResults();
        }
    });

    document.querySelectorAll("#selectCodesModalOverlay .scm-table th[data-sort]").forEach((th) => {
        th.addEventListener("click", () => {
            const field = th.getAttribute("data-sort");
            scmSort = { field, dir: scmSort.field === field ? -scmSort.dir : 1 };
            renderScmTable();
        });
    });

    confirmBtn.addEventListener("click", () => {
        if (!scmSelectedMap.size) {
            return;
        }

        const selectedItems = Array.from(scmSelectedMap.values());

        if (scmCodeOnly) {
            document.getElementById(scmTargetFieldId).value = selectedItems[0].code;

            if (scmIdFieldId) {
                const idField = document.getElementById(scmIdFieldId);

                if (idField) {
                    idField.value = selectedItems[0].id ?? "";
                }
            }
        } else {
            const parts = selectedItems.map((item) => {
                const systemLabel = CODE_SOURCE_LABELS[item.code_system] || item.code_system;

                return `${item.code} - ${item.description || ""} (${systemLabel})`.trim();
            });

            document.getElementById(scmTargetFieldId).value = parts.join("\n");
        }

        if (scmTitleFieldId) {
            const titleField = document.getElementById(scmTitleFieldId);

            if (selectedItems[0] && titleField) {
                titleField.value = selectedItems[0].description || selectedItems[0].code;
            }
        }

        closeModal();
    });
}

function openSelectCodesModal(targetFieldId = "allergy_coding", titleFieldId = null, options = {})
{
    scmTargetFieldId = targetFieldId;
    scmTitleFieldId = titleFieldId;
    scmIdFieldId = options.idFieldId || null;
    scmCodeOnly = !!options.codeOnly;
    scmSource = options.defaultSource || "icd10";
    scmSearchTerm = "";
    scmCurrentPage = 1;
    scmSort = { field: null, dir: 1 };
    scmSelectedMap = new Map();

    document.getElementById("scmSourceSelect").value = scmSource;
    document.getElementById("scmSearchInput").value = "";
    document.getElementById("selectCodesModalOverlay").classList.add("open");

    loadScmResults();
}

function updateScmSelectionUI()
{
    const count = scmSelectedMap.size;

    document.getElementById("confirmSelectCodes").disabled = count === 0;
    document.getElementById("scmSelectedCount").textContent = count
        ? `${count} code${count === 1 ? "" : "s"} selected`
        : "";
}

async function loadScmResults()
{
    const tbody = document.getElementById("scmTableBody");

    tbody.innerHTML = `<tr><td colspan="2" class="scm-empty">Loading...</td></tr>`;

    let result;

    if (scmSource === "icd10") {
        result = await fetchIcd10Diagnoses(scmCurrentPage, 50, scmSearchTerm);

        if (result.success) {
            scmItems = result.data.items.map((row) => ({
                code: row.code,
                description: row.description,
                code_system: "ICD10CM"
            }));
            scmTotalItems = result.data.total;
            scmTotalPages = Math.max(1, result.data.total_pages);
            scmCurrentPage = result.data.page;
        }
    } else if (scmSource === "cvx") {
        result = await fetchCvxCodes(scmCurrentPage, 50, scmSearchTerm);

        if (result.success) {
            scmItems = result.data.items.map((row) => ({
                id: row.id,
                code: row.code,
                description: row.short_description,
                code_system: "CVX"
            }));
            scmTotalItems = result.data.total;
            scmTotalPages = Math.max(1, result.data.total_pages);
            scmCurrentPage = result.data.page;
        }
    } else {
        const mode = scmSource === "oid" ? "oid" : "name";

        result = await searchCqmValuesetCodes(scmSearchTerm, mode, scmCurrentPage, 50);

        if (result.success) {
            scmItems = result.data.items.map((row) => ({
                code: row.code,
                description: row.description,
                code_system: row.code_system
            }));
            scmTotalItems = result.data.total;
            scmTotalPages = Math.max(1, result.data.total_pages);
            scmCurrentPage = result.data.page;
        }
    }

    if (!result.success) {
        scmItems = [];
        scmTotalItems = 0;
        scmTotalPages = 1;
    }

    renderScmTable();
    renderScmPagination();
    updateScmSelectionUI();
}

function renderScmTable()
{
    const tbody = document.getElementById("scmTableBody");

    let items = scmItems;

    if (scmSort.field) {
        items = [...items].sort((a, b) => {
            const av = (a[scmSort.field] || "").toString().toLowerCase();
            const bv = (b[scmSort.field] || "").toString().toLowerCase();

            if (av < bv) return -1 * scmSort.dir;
            if (av > bv) return 1 * scmSort.dir;
            return 0;
        });
    }

    document.getElementById("scmSortArrowCode").textContent =
        scmSort.field === "code" ? (scmSort.dir === 1 ? "▲" : "▼") : "";
    document.getElementById("scmSortArrowDescription").textContent =
        scmSort.field === "description" ? (scmSort.dir === 1 ? "▲" : "▼") : "";

    if (!items.length) {
        tbody.innerHTML = `<tr><td colspan="2" class="scm-empty">No codes found.</td></tr>`;
        return;
    }

    tbody.innerHTML = items.map((item) => {
        const key = `${scmSource}::${item.code}`;
        const isSelected = scmSelectedMap.has(key);

        return `
        <tr data-code="${escapeHtml(item.code)}" class="${isSelected ? "selected" : ""}">
            <td><span class="scm-code-badge">${escapeHtml(item.code)}</span></td>
            <td>${escapeHtml(item.description || "")}</td>
        </tr>
    `;
    }).join("");

    tbody.querySelectorAll("tr[data-code]").forEach((row) => {
        row.addEventListener("click", () => {
            const code = row.getAttribute("data-code");
            const item = items.find((entry) => entry.code === code);
            const key = `${scmSource}::${code}`;

            if (scmSelectedMap.has(key)) {
                scmSelectedMap.delete(key);
                row.classList.remove("selected");
            } else {
                scmSelectedMap.set(key, item);
                row.classList.add("selected");
            }

            updateScmSelectionUI();
        });
    });
}

function renderScmPagination()
{
    const info = document.getElementById("scmPageInfo");
    const indicator = document.getElementById("scmPageIndicator");
    const prevBtn = document.getElementById("scmPrevPage");
    const nextBtn = document.getElementById("scmNextPage");

    if (!scmTotalItems) {
        info.textContent = "";
    } else {
        const start = (scmCurrentPage - 1) * 50 + 1;
        const end = Math.min(scmCurrentPage * 50, scmTotalItems);

        info.textContent = `Showing ${start}-${end} of ${scmTotalItems}`;
    }

    indicator.textContent = `Page ${scmCurrentPage} of ${scmTotalPages}`;
    prevBtn.disabled = scmCurrentPage <= 1;
    nextBtn.disabled = scmCurrentPage >= scmTotalPages;
}

async function openAllergyDetailModal(patient)
{
    document.getElementById("allergyDetailAlert").innerHTML = "";
    document.getElementById("allergyDetailModalOverlay").classList.add("open");

    const canManage = ["admin", "receptionist", "doctor"].includes(getUser()?.role);
    const addBtn = document.getElementById("openAddAllergyBtn");

    addBtn.style.display = canManage ? "" : "none";

    await loadAllergyDetailTable(patient);
}

async function loadAllergyDetailTable(patient)
{
    const tbody = document.getElementById("allergyDetailTableBody");

    try {
        const result = await fetchPatientAllergies(patient.id);

        if (!result.success) {
            tbody.innerHTML = `<tr><td colspan="6" class="table-empty">${escapeHtml(result.message || "Unable to load allergies.")}</td></tr>`;
            return;
        }

        renderAllergyDetailTable(patient, result.data);
    } catch (error) {
        console.error("Failed to load patient allergies", error);
        tbody.innerHTML = `<tr><td colspan="6" class="table-empty">Unable to load allergies right now. Please try again.</td></tr>`;
    }
}

function renderAllergyDetailTable(patient, allergies)
{
    const tbody = document.getElementById("allergyDetailTableBody");
    const canManage = ["admin", "receptionist", "doctor"].includes(getUser()?.role);

    if (!allergies.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No allergies recorded for this patient.</td></tr>`;
        return;
    }

    tbody.innerHTML = allergies.map((allergy) => {
        const isActive = !allergy.end_date;

        return `
        <tr>
            <td>${escapeHtml(allergy.name)}</td>
            <td>${escapeHtml(allergy.reaction || "-")}</td>
            <td>${escapeHtml(allergy.severity || "-")}</td>
            <td><span class="status-badge ${isActive ? "completed" : "cancelled"}">${isActive ? "Active" : "Inactive"}</span></td>
            <td>${escapeHtml((allergy.updated_at || allergy.created_at || "").slice(0, 10))}</td>
            <td class="table-actions">
                ${canManage
                    ? `<button class="btn-edit" data-edit-allergy="${allergy.id}">Edit</button>
                       <button class="btn-danger" data-remove-allergy="${allergy.id}">Delete</button>`
                    : ""}
            </td>
        </tr>
    `;
    }).join("");

    if (!canManage) {
        return;
    }

    tbody.querySelectorAll("[data-edit-allergy]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const allergy = allergies.find((a) => String(a.id) === btn.getAttribute("data-edit-allergy"));

            if (allergy) {
                openAllergyFormModal(allergy);
            }
        });
    });

    tbody.querySelectorAll("[data-remove-allergy]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this allergy record?")) {
                return;
            }

            const result = await removePatientAllergy(btn.getAttribute("data-remove-allergy"));

            if (!result.success) {
                showAlert("allergyDetailAlert", result.message || "Failed to remove allergy.", "error");
                return;
            }

            await loadAllergyDetailTable(currentDashboardPatient);
            await loadDashboardAllergies(currentDashboardPatient);
            await loadIssuesSection(ISSUES_SECTIONS.allergies, currentDashboardPatient);
        });
    });
}

async function openAllergyFormModal(existingRecord)
{
    const formOverlay = document.getElementById("allergyFormModalOverlay");
    const title = document.getElementById("allergyFormTitle");
    const recordIdInput = document.getElementById("allergy_record_id");
    const catalogSelect = document.getElementById("allergy_catalog_id");

    document.getElementById("allergyFormAlert").innerHTML = "";
    document.getElementById("allergyForm").reset();
    document.getElementById("err-allergy_catalog_id").textContent = "";

    const moreToggle = document.getElementById("allergyMoreToggle");
    const moreFields = document.getElementById("allergyMoreFields");

    moreFields.hidden = true;
    moreToggle.classList.remove("expanded");
    moreToggle.querySelector("span").textContent = "Show More Fields";

    const catalogResult = await fetchAllergies();
    const catalog = catalogResult.success ? catalogResult.data : [];

    catalogSelect.innerHTML = `<option value="">Select allergy...</option>` +
        catalog.map((allergy) => `<option value="${allergy.id}">${escapeHtml(allergy.name)}</option>`).join("");

    if (existingRecord) {
        title.textContent = "Edit Allergy";
        recordIdInput.value = existingRecord.id;
        catalogSelect.value = existingRecord.allergy_id;
        catalogSelect.disabled = true;

        ALLERGY_DETAIL_FIELDS.forEach((field) => {
            document.getElementById(`allergy_${field}`).value = existingRecord[field] ?? "";
        });

        const secondaryFields = ["coding", "occurrence", "outcome", "classification_type", "referred_by", "destination"];

        if (secondaryFields.some((field) => existingRecord[field])) {
            moreFields.hidden = false;
            moreToggle.classList.add("expanded");
            moreToggle.querySelector("span").textContent = "Hide More Fields";
        }
    } else {
        title.textContent = "Add Allergy";
        recordIdInput.value = "";
        catalogSelect.disabled = false;
        document.getElementById("allergy_verification_status").value = "Unconfirmed";
    }

    formOverlay.classList.add("open");
}

function setupProblemModals()
{
    const detailOverlay = document.getElementById("problemDetailModalOverlay");
    const formOverlay = document.getElementById("problemFormModalOverlay");
    const form = document.getElementById("problemForm");
    const catalogSelect = document.getElementById("problem_catalog_id");

    const closeDetail = () => detailOverlay.classList.remove("open");
    const closeForm = () => formOverlay.classList.remove("open");

    document.getElementById("pdProblemsAddBtn").addEventListener("click", () => {
        if (currentDashboardPatient) {
            openProblemDetailModal(currentDashboardPatient);
        }
    });

    document.getElementById("closeProblemDetailModal").addEventListener("click", closeDetail);
    detailOverlay.addEventListener("click", (event) => {
        if (event.target === detailOverlay) {
            closeDetail();
        }
    });

    document.getElementById("problemMoreToggle").addEventListener("click", (event) => {
        const toggle = event.currentTarget;
        const moreFields = document.getElementById("problemMoreFields");
        const isHidden = moreFields.hidden;

        moreFields.hidden = !isHidden;
        toggle.classList.toggle("expanded", isHidden);
        toggle.querySelector("span").textContent = isHidden ? "Hide More Fields" : "Show More Fields";
    });

    document.getElementById("openAddProblemBtn").addEventListener("click", () => {
        openProblemFormModal(null);
    });

    document.getElementById("openSelectCodesBtnProblem").addEventListener("click", () => {
        openSelectCodesModal("problem_coding");
    });

    catalogSelect.addEventListener("change", () => {
        const selectedOption = catalogSelect.options[catalogSelect.selectedIndex];

        if (catalogSelect.value && selectedOption) {
            document.getElementById("problem_title").value = selectedOption.textContent;
        }
    });

    document.getElementById("closeProblemFormModal").addEventListener("click", closeForm);
    document.getElementById("cancelProblemForm").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", (event) => {
        if (event.target === formOverlay) {
            closeForm();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const recordId = document.getElementById("problem_record_id").value;
        const catalogId = catalogSelect.value;
        const errEl = document.getElementById("err-problem_title");

        errEl.textContent = "";

        const details = {};

        PROBLEM_DETAIL_FIELDS.forEach((field) => {
            details[field] = document.getElementById(`problem_${field}`).value.trim();
        });

        if (!details.title) {
            errEl.textContent = "Title is required.";
            return;
        }

        const result = recordId
            ? await updatePatientMedicalProblem(recordId, details)
            : await addPatientMedicalProblem(currentDashboardPatient.id, catalogId || null, details);

        if (!result.success) {
            showAlert("problemFormAlert", result.message || "Failed to save problem.", "error");
            return;
        }

        closeForm();
        await loadProblemDetailTable(currentDashboardPatient);
        await loadDashboardProblems(currentDashboardPatient);
        await loadIssuesSection(ISSUES_SECTIONS.problems, currentDashboardPatient);
    });
}

async function openProblemDetailModal(patient)
{
    document.getElementById("problemDetailAlert").innerHTML = "";
    document.getElementById("problemDetailModalOverlay").classList.add("open");

    const canManage = ["admin", "receptionist", "doctor"].includes(getUser()?.role);
    const addBtn = document.getElementById("openAddProblemBtn");

    addBtn.style.display = canManage ? "" : "none";

    await loadProblemDetailTable(patient);
}

async function loadProblemDetailTable(patient)
{
    const tbody = document.getElementById("problemDetailTableBody");

    try {
        const result = await fetchPatientMedicalProblems(patient.id);

        if (!result.success) {
            tbody.innerHTML = `<tr><td colspan="5" class="table-empty">${escapeHtml(result.message || "Unable to load problems.")}</td></tr>`;
            return;
        }

        renderProblemDetailTable(patient, result.data);
    } catch (error) {
        console.error("Failed to load patient medical problems", error);
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Unable to load problems right now. Please try again.</td></tr>`;
    }
}

function renderProblemDetailTable(patient, problems)
{
    const tbody = document.getElementById("problemDetailTableBody");
    const canManage = ["admin", "receptionist", "doctor"].includes(getUser()?.role);

    if (!problems.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No medical problems recorded for this patient.</td></tr>`;
        return;
    }

    tbody.innerHTML = problems.map((problem) => {
        const isActive = !problem.end_date;

        return `
        <tr>
            <td>${escapeHtml(problem.title)}</td>
            <td>${escapeHtml(problem.occurrence || "-")}</td>
            <td><span class="status-badge ${isActive ? "completed" : "cancelled"}">${isActive ? "Active" : "Inactive"}</span></td>
            <td>${escapeHtml((problem.updated_at || problem.created_at || "").slice(0, 10))}</td>
            <td class="table-actions">
                ${canManage
                    ? `<button class="btn-edit" data-edit-problem="${problem.id}">Edit</button>
                       <button class="btn-danger" data-remove-problem="${problem.id}">Delete</button>`
                    : ""}
            </td>
        </tr>
    `;
    }).join("");

    if (!canManage) {
        return;
    }

    tbody.querySelectorAll("[data-edit-problem]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const problem = problems.find((p) => String(p.id) === btn.getAttribute("data-edit-problem"));

            if (problem) {
                openProblemFormModal(problem);
            }
        });
    });

    tbody.querySelectorAll("[data-remove-problem]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this problem record?")) {
                return;
            }

            const result = await removePatientMedicalProblem(btn.getAttribute("data-remove-problem"));

            if (!result.success) {
                showAlert("problemDetailAlert", result.message || "Failed to remove problem.", "error");
                return;
            }

            await loadProblemDetailTable(currentDashboardPatient);
            await loadDashboardProblems(currentDashboardPatient);
            await loadIssuesSection(ISSUES_SECTIONS.problems, currentDashboardPatient);
        });
    });
}

// Medical Devices has no pre-existing dashboard widget/detail modal like
// Problems, Allergies, etc. do -- it only exists as an Issues panel
// section, so +Add and each row's Edit both open this form modal directly.
function setupDeviceModal()
{
    const formOverlay = document.getElementById("deviceFormModalOverlay");
    const form = document.getElementById("deviceForm");

    const closeForm = () => formOverlay.classList.remove("open");

    document.getElementById("closeDeviceFormModal").addEventListener("click", closeForm);
    document.getElementById("cancelDeviceForm").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", (event) => {
        if (event.target === formOverlay) {
            closeForm();
        }
    });

    document.getElementById("deviceMoreToggle").addEventListener("click", (event) => {
        const toggle = event.currentTarget;
        const moreFields = document.getElementById("deviceMoreFields");
        const isHidden = moreFields.hidden;

        moreFields.hidden = !isHidden;
        toggle.classList.toggle("expanded", isHidden);
        toggle.querySelector("span").textContent = isHidden ? "Hide More Fields" : "Show More Fields";
    });

    document.getElementById("openSelectCodesBtnDevice").addEventListener("click", () => {
        openSelectCodesModal("device_coding");
    });

    // Lightweight, client-side UDI check (does the barcode look like a
    // plausible identifier) rather than full GS1 Application Identifier
    // parsing -- this just gives the same "processed" feedback the mockup
    // shows, without pretending to extract lot/expiration data from it.
    document.getElementById("processUdiBtn").addEventListener("click", () => {
        const udi = document.getElementById("device_udi").value.trim();
        const statusEl = document.getElementById("deviceUdiStatus");
        const looksValid = udi.length >= 10;

        statusEl.textContent = udi === ""
            ? "A valid UDI has not been processed yet"
            : (looksValid ? "UDI processed and recorded." : "This doesn't look like a complete UDI -- check the value and try again.");
        statusEl.classList.toggle("valid", looksValid);
    });

    document.getElementById("device_udi").addEventListener("input", () => {
        const statusEl = document.getElementById("deviceUdiStatus");

        statusEl.textContent = "A valid UDI has not been processed yet";
        statusEl.classList.remove("valid");
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const recordId = document.getElementById("device_record_id").value;
        const errEl = document.getElementById("err-device_title");

        errEl.textContent = "";

        const details = {};

        DEVICE_DETAIL_FIELDS.forEach((field) => {
            details[field] = document.getElementById(`device_${field}`).value.trim();
        });

        if (!details.title) {
            errEl.textContent = "Title is required.";
            return;
        }

        const result = recordId
            ? await updatePatientMedicalDevice(recordId, details)
            : await addPatientMedicalDevice(currentDashboardPatient.id, details);

        if (!result.success) {
            showAlert("deviceFormAlert", result.message || "Failed to save medical device.", "error");
            return;
        }

        closeForm();
        await loadIssuesSection(ISSUES_SECTIONS.medicalDevices, currentDashboardPatient);
    });
}

function openDeviceFormModal(existingRecord)
{
    const formOverlay = document.getElementById("deviceFormModalOverlay");
    const title = document.getElementById("deviceFormTitle");
    const recordIdInput = document.getElementById("device_record_id");

    document.getElementById("deviceFormAlert").innerHTML = "";
    document.getElementById("deviceForm").reset();
    document.getElementById("err-device_title").textContent = "";

    const moreToggle = document.getElementById("deviceMoreToggle");
    const moreFields = document.getElementById("deviceMoreFields");

    moreFields.hidden = true;
    moreToggle.classList.remove("expanded");
    moreToggle.querySelector("span").textContent = "Show More Fields";

    const statusEl = document.getElementById("deviceUdiStatus");
    statusEl.textContent = "A valid UDI has not been processed yet";
    statusEl.classList.remove("valid");

    if (existingRecord) {
        title.textContent = "Edit Medical Device";
        recordIdInput.value = existingRecord.id;

        DEVICE_DETAIL_FIELDS.forEach((field) => {
            const el = document.getElementById(`device_${field}`);

            if (el) el.value = existingRecord[field] ?? "";
        });
    } else {
        title.textContent = "Add Medical Device";
        recordIdInput.value = "";
    }

    formOverlay.classList.add("open");
}

// Surgeries has no pre-existing dashboard widget/detail modal either --
// like Medical Devices, it only exists as an Issues panel section, so
// +Add and each row's Edit both open this form modal directly. Reuses the
// existing surgeries catalog (fetchSurgeries) for the "Select from list"
// dropdown, same as Problems does with the medical_problems catalog.
function setupSurgeryModal()
{
    const formOverlay = document.getElementById("surgeryFormModalOverlay");
    const form = document.getElementById("surgeryForm");
    const catalogSelect = document.getElementById("surgery_catalog_id");

    const closeForm = () => formOverlay.classList.remove("open");

    document.getElementById("closeSurgeryFormModal").addEventListener("click", closeForm);
    document.getElementById("cancelSurgeryForm").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", (event) => {
        if (event.target === formOverlay) {
            closeForm();
        }
    });

    document.getElementById("surgeryMoreToggle").addEventListener("click", (event) => {
        const toggle = event.currentTarget;
        const moreFields = document.getElementById("surgeryMoreFields");
        const isHidden = moreFields.hidden;

        moreFields.hidden = !isHidden;
        toggle.classList.toggle("expanded", isHidden);
        toggle.querySelector("span").textContent = isHidden ? "Hide More Fields" : "Show More Fields";
    });

    document.getElementById("openSelectCodesBtnSurgery").addEventListener("click", () => {
        openSelectCodesModal("surgery_coding");
    });

    catalogSelect.addEventListener("change", () => {
        const selectedOption = catalogSelect.options[catalogSelect.selectedIndex];

        if (catalogSelect.value && selectedOption) {
            document.getElementById("surgery_title").value = selectedOption.textContent;
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const recordId = document.getElementById("surgery_record_id").value;
        const catalogId = catalogSelect.value;
        const errEl = document.getElementById("err-surgery_title");

        errEl.textContent = "";

        const details = {};

        SURGERY_DETAIL_FIELDS.forEach((field) => {
            details[field] = document.getElementById(`surgery_${field}`).value.trim();
        });

        if (!details.title) {
            errEl.textContent = "Title is required.";
            return;
        }

        const result = recordId
            ? await updatePatientSurgery(recordId, details)
            : await addPatientSurgery(currentDashboardPatient.id, catalogId || null, details);

        if (!result.success) {
            showAlert("surgeryFormAlert", result.message || "Failed to save surgery.", "error");
            return;
        }

        closeForm();
        await loadIssuesSection(ISSUES_SECTIONS.surgeries, currentDashboardPatient);
    });
}

async function openSurgeryFormModal(existingRecord)
{
    const formOverlay = document.getElementById("surgeryFormModalOverlay");
    const title = document.getElementById("surgeryFormTitle");
    const recordIdInput = document.getElementById("surgery_record_id");
    const catalogSelect = document.getElementById("surgery_catalog_id");

    document.getElementById("surgeryFormAlert").innerHTML = "";
    document.getElementById("surgeryForm").reset();
    document.getElementById("err-surgery_title").textContent = "";

    const moreToggle = document.getElementById("surgeryMoreToggle");
    const moreFields = document.getElementById("surgeryMoreFields");

    moreFields.hidden = true;
    moreToggle.classList.remove("expanded");
    moreToggle.querySelector("span").textContent = "Show More Fields";

    const catalogResult = await fetchSurgeries();
    const catalog = catalogResult.success ? catalogResult.data : [];

    catalogSelect.innerHTML = `<option value="">Custom / type your own...</option>` +
        catalog.map((surgery) => `<option value="${surgery.id}">${escapeHtml(surgery.name)}</option>`).join("");

    if (existingRecord) {
        title.textContent = "Edit Surgery";
        recordIdInput.value = existingRecord.id;
        catalogSelect.value = existingRecord.surgery_id ?? "";

        SURGERY_DETAIL_FIELDS.forEach((field) => {
            const el = document.getElementById(`surgery_${field}`);

            if (el) el.value = existingRecord[field] ?? "";
        });
    } else {
        title.textContent = "Add Surgery";
        recordIdInput.value = "";
        catalogSelect.value = "";
    }

    formOverlay.classList.add("open");
}

// Dental Issues has no pre-existing dashboard widget/detail modal either --
// like Medical Devices and Surgeries, it only exists as an Issues panel
// section, so +Add and each row's Edit both open this form modal directly.
function setupDentalIssueModal()
{
    const formOverlay = document.getElementById("dentalIssueFormModalOverlay");
    const form = document.getElementById("dentalIssueForm");

    const closeForm = () => formOverlay.classList.remove("open");

    document.getElementById("closeDentalIssueFormModal").addEventListener("click", closeForm);
    document.getElementById("cancelDentalIssueForm").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", (event) => {
        if (event.target === formOverlay) {
            closeForm();
        }
    });

    document.getElementById("dentalIssueMoreToggle").addEventListener("click", (event) => {
        const toggle = event.currentTarget;
        const moreFields = document.getElementById("dentalIssueMoreFields");
        const isHidden = moreFields.hidden;

        moreFields.hidden = !isHidden;
        toggle.classList.toggle("expanded", isHidden);
        toggle.querySelector("span").textContent = isHidden ? "Hide More Fields" : "Show More Fields";
    });

    document.getElementById("openSelectCodesBtnDentalIssue").addEventListener("click", () => {
        openSelectCodesModal("dentalissue_coding");
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const recordId = document.getElementById("dentalissue_record_id").value;
        const errEl = document.getElementById("err-dentalissue_title");

        errEl.textContent = "";

        const details = {};

        DENTAL_ISSUE_DETAIL_FIELDS.forEach((field) => {
            details[field] = document.getElementById(`dentalissue_${field}`).value.trim();
        });

        if (!details.title) {
            errEl.textContent = "Title is required.";
            return;
        }

        const result = recordId
            ? await updatePatientDentalIssue(recordId, details)
            : await addPatientDentalIssue(currentDashboardPatient.id, details);

        if (!result.success) {
            showAlert("dentalIssueFormAlert", result.message || "Failed to save dental issue.", "error");
            return;
        }

        closeForm();
        await loadIssuesSection(ISSUES_SECTIONS.dentalIssues, currentDashboardPatient);
    });
}

function openDentalIssueFormModal(existingRecord)
{
    const formOverlay = document.getElementById("dentalIssueFormModalOverlay");
    const title = document.getElementById("dentalIssueFormTitle");
    const recordIdInput = document.getElementById("dentalissue_record_id");

    document.getElementById("dentalIssueFormAlert").innerHTML = "";
    document.getElementById("dentalIssueForm").reset();
    document.getElementById("err-dentalissue_title").textContent = "";

    const moreToggle = document.getElementById("dentalIssueMoreToggle");
    const moreFields = document.getElementById("dentalIssueMoreFields");

    moreFields.hidden = true;
    moreToggle.classList.remove("expanded");
    moreToggle.querySelector("span").textContent = "Show More Fields";

    if (existingRecord) {
        title.textContent = "Edit Dental Issue";
        recordIdInput.value = existingRecord.id;

        DENTAL_ISSUE_DETAIL_FIELDS.forEach((field) => {
            const el = document.getElementById(`dentalissue_${field}`);

            if (el) el.value = existingRecord[field] ?? "";
        });
    } else {
        title.textContent = "Add Dental Issue";
        recordIdInput.value = "";
    }

    formOverlay.classList.add("open");
}

// The Issues panel is a second entry point onto records that already have
// their own dashboard widget + detail modal + form modal elsewhere in this
// file (Problems, Health Concerns) -- each section here just points at
// that same data/service functions and reuses the same Add/Edit modal,
// rather than duplicating storage or a form.
const ISSUES_SECTIONS = {
    problems: {
        addBtnId: "pdIssuesProblemsAddBtn",
        deleteBtnId: "pdIssuesProblemsDeleteBtn",
        listBodyId: "pdIssuesProblemsListBody",
        recordLabel: "problem",
        fetch: fetchPatientMedicalProblems,
        remove: removePatientMedicalProblem,
        openForm: (record) => openProblemFormModal(record)
    },
    healthConcerns: {
        addBtnId: "pdIssuesHealthConcernsAddBtn",
        deleteBtnId: "pdIssuesHealthConcernsDeleteBtn",
        listBodyId: "pdIssuesHealthConcernsListBody",
        recordLabel: "health concern",
        fetch: fetchPatientHealthConcerns,
        remove: removePatientHealthConcern,
        openForm: (record) => openHealthConcernFormModal(record)
    },
    allergies: {
        addBtnId: "pdIssuesAllergiesAddBtn",
        deleteBtnId: "pdIssuesAllergiesDeleteBtn",
        listBodyId: "pdIssuesAllergiesListBody",
        recordLabel: "allergy",
        titleField: "name",
        fetch: fetchPatientAllergies,
        remove: removePatientAllergy,
        openForm: (record) => openAllergyFormModal(record)
    },
    medications: {
        addBtnId: "pdIssuesMedicationsAddBtn",
        deleteBtnId: "pdIssuesMedicationsDeleteBtn",
        listBodyId: "pdIssuesMedicationsListBody",
        recordLabel: "medication",
        fetch: fetchPatientMedications,
        remove: removePatientMedication,
        openForm: (record) => openMedicationFormModal(record)
    },
    medicalDevices: {
        addBtnId: "pdIssuesDevicesAddBtn",
        deleteBtnId: "pdIssuesDevicesDeleteBtn",
        listBodyId: "pdIssuesDevicesListBody",
        recordLabel: "medical device",
        fetch: fetchPatientMedicalDevices,
        remove: removePatientMedicalDevice,
        openForm: (record) => openDeviceFormModal(record)
    },
    surgeries: {
        addBtnId: "pdIssuesSurgeriesAddBtn",
        deleteBtnId: "pdIssuesSurgeriesDeleteBtn",
        listBodyId: "pdIssuesSurgeriesListBody",
        recordLabel: "surgery",
        fetch: fetchPatientSurgeries,
        remove: removePatientSurgery,
        openForm: (record) => openSurgeryFormModal(record)
    },
    dentalIssues: {
        addBtnId: "pdIssuesDentalAddBtn",
        deleteBtnId: "pdIssuesDentalDeleteBtn",
        listBodyId: "pdIssuesDentalListBody",
        recordLabel: "dental issue",
        fetch: fetchPatientDentalIssues,
        remove: removePatientDentalIssue,
        openForm: (record) => openDentalIssueFormModal(record)
    }
};

function setupIssuesPanel(patient)
{
    Object.values(ISSUES_SECTIONS).forEach((section) => setupIssuesSection(section, patient));

    // Reloads every Issues section's data in place -- the Issues tab only,
    // not the rest of the patient dashboard.
    document.getElementById("pdIssuesRefreshBtn").addEventListener("click", () => {
        Object.values(ISSUES_SECTIONS).forEach((section) => loadIssuesSection(section, patient));
    });
}

function setupIssuesSection(section, patient)
{
    document.getElementById(section.addBtnId).addEventListener("click", () => {
        section.openForm(null);
    });

    document.getElementById(section.deleteBtnId).addEventListener("click", async () => {
        const checked = Array.from(document.querySelectorAll(`#${section.listBodyId} .pd-issue-checkbox:checked`));

        if (!checked.length) {
            return;
        }

        if (!confirm(`Remove ${checked.length} selected ${section.recordLabel}${checked.length === 1 ? '' : 's'}?`)) {
            return;
        }

        await Promise.all(checked.map((cb) => section.remove(cb.getAttribute("data-id"))));
        await loadIssuesSection(section, patient);
    });

    loadIssuesSection(section, patient);
}

async function loadIssuesSection(section, patient)
{
    const listBody = document.getElementById(section.listBodyId);
    const deleteBtn = document.getElementById(section.deleteBtnId);

    if (!listBody) {
        return;
    }

    listBody.innerHTML = `<p class="pd-chart-nav-empty">Loading...</p>`;
    deleteBtn.disabled = true;

    const result = await section.fetch(patient.id);

    if (!result.success) {
        listBody.innerHTML = `<p class="pd-chart-nav-empty">Failed to load ${section.recordLabel}s.</p>`;
        return;
    }

    const records = result.data || [];

    if (!records.length) {
        listBody.innerHTML = `<p class="pd-chart-nav-empty">None</p>`;
        return;
    }

    const titleField = section.titleField || "title";

    listBody.innerHTML = records.map((r) => `
        <div class="pd-issue-row">
            <input type="checkbox" class="pd-issue-checkbox" data-id="${r.id}">
            <span class="pd-issue-title">${escapeHtml(r[titleField])}${r.end_date ? '' : ' <span class="status-badge completed">Active</span>'}</span>
            <button type="button" class="pd-issue-edit-btn" data-id="${r.id}">Edit</button>
        </div>
    `).join('');

    listBody.querySelectorAll(".pd-issue-checkbox").forEach((cb) => {
        cb.addEventListener("change", () => {
            deleteBtn.disabled = !listBody.querySelector(".pd-issue-checkbox:checked");
        });
    });

    listBody.querySelectorAll(".pd-issue-edit-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const record = records.find((r) => String(r.id) === btn.getAttribute("data-id"));

            if (record) section.openForm(record);
        });
    });
}

async function openProblemFormModal(existingRecord)
{
    const formOverlay = document.getElementById("problemFormModalOverlay");
    const title = document.getElementById("problemFormTitle");
    const recordIdInput = document.getElementById("problem_record_id");
    const catalogSelect = document.getElementById("problem_catalog_id");

    document.getElementById("problemFormAlert").innerHTML = "";
    document.getElementById("problemForm").reset();
    document.getElementById("err-problem_title").textContent = "";

    const moreToggle = document.getElementById("problemMoreToggle");
    const moreFields = document.getElementById("problemMoreFields");

    moreFields.hidden = true;
    moreToggle.classList.remove("expanded");
    moreToggle.querySelector("span").textContent = "Show More Fields";

    const catalogResult = await fetchMedicalProblems();
    const catalog = catalogResult.success ? catalogResult.data : [];

    catalogSelect.innerHTML = `<option value="">Custom / type your own...</option>` +
        catalog.map((problem) => `<option value="${problem.id}">${escapeHtml(problem.name)}</option>`).join("");

    if (existingRecord) {
        title.textContent = "Edit Problem";
        recordIdInput.value = existingRecord.id;
        catalogSelect.value = existingRecord.problem_id ?? "";
        catalogSelect.disabled = true;

        PROBLEM_DETAIL_FIELDS.forEach((field) => {
            document.getElementById(`problem_${field}`).value = existingRecord[field] ?? "";
        });

        const secondaryFields = ["coding", "occurrence", "outcome", "classification_type", "referred_by", "destination"];

        if (secondaryFields.some((field) => existingRecord[field])) {
            moreFields.hidden = false;
            moreToggle.classList.add("expanded");
            moreToggle.querySelector("span").textContent = "Hide More Fields";
        }
    } else {
        title.textContent = "Add Problem";
        recordIdInput.value = "";
        catalogSelect.disabled = false;
        document.getElementById("problem_verification_status").value = "Unconfirmed";
    }

    formOverlay.classList.add("open");
}

const HEALTH_CONCERN_DETAIL_FIELDS = [
    "title", "begin_date", "end_date", "comments", "coding",
    "occurrence", "outcome", "classification_type", "verification_status",
    "referred_by", "destination"
];

function setupHealthConcernModals()
{
    const detailOverlay = document.getElementById("healthConcernDetailModalOverlay");
    const formOverlay = document.getElementById("healthConcernFormModalOverlay");
    const form = document.getElementById("healthConcernForm");

    const closeDetail = () => detailOverlay.classList.remove("open");
    const closeForm = () => formOverlay.classList.remove("open");

    document.getElementById("pdHealthConcernsAddBtn").addEventListener("click", () => {
        if (currentDashboardPatient) {
            openHealthConcernDetailModal(currentDashboardPatient);
        }
    });

    document.getElementById("closeHealthConcernDetailModal").addEventListener("click", closeDetail);
    detailOverlay.addEventListener("click", (event) => {
        if (event.target === detailOverlay) {
            closeDetail();
        }
    });

    document.getElementById("healthConcernMoreToggle").addEventListener("click", (event) => {
        const toggle = event.currentTarget;
        const moreFields = document.getElementById("healthConcernMoreFields");
        const isHidden = moreFields.hidden;

        moreFields.hidden = !isHidden;
        toggle.classList.toggle("expanded", isHidden);
        toggle.querySelector("span").textContent = isHidden ? "Hide More Fields" : "Show More Fields";
    });

    document.getElementById("openAddHealthConcernBtn").addEventListener("click", () => {
        openHealthConcernFormModal(null);
    });

    document.getElementById("openSelectCodesBtnHealthConcern").addEventListener("click", () => {
        openSelectCodesModal("healthconcern_coding", "healthconcern_title");
    });

    document.getElementById("closeHealthConcernFormModal").addEventListener("click", closeForm);
    document.getElementById("cancelHealthConcernForm").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", (event) => {
        if (event.target === formOverlay) {
            closeForm();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const recordId = document.getElementById("healthconcern_record_id").value;
        const errEl = document.getElementById("err-healthconcern_title");

        errEl.textContent = "";

        const details = {};

        HEALTH_CONCERN_DETAIL_FIELDS.forEach((field) => {
            details[field] = document.getElementById(`healthconcern_${field}`).value.trim();
        });

        if (!details.title) {
            errEl.textContent = "Title is required.";
            return;
        }

        const result = recordId
            ? await updatePatientHealthConcern(recordId, details)
            : await addPatientHealthConcern(currentDashboardPatient.id, details);

        if (!result.success) {
            showAlert("healthConcernFormAlert", result.message || "Failed to save health concern.", "error");
            return;
        }

        closeForm();
        await loadHealthConcernDetailTable(currentDashboardPatient);
        await loadDashboardHealthConcerns(currentDashboardPatient);
        await loadIssuesSection(ISSUES_SECTIONS.healthConcerns, currentDashboardPatient);
    });
}

async function openHealthConcernDetailModal(patient)
{
    document.getElementById("healthConcernDetailAlert").innerHTML = "";
    document.getElementById("healthConcernDetailModalOverlay").classList.add("open");

    const canManage = ["admin", "receptionist", "doctor"].includes(getUser()?.role);
    const addBtn = document.getElementById("openAddHealthConcernBtn");

    addBtn.style.display = canManage ? "" : "none";

    await loadHealthConcernDetailTable(patient);
}

async function loadDashboardHealthConcerns(patient)
{
    const body = document.getElementById("pdHealthConcernsBody");

    if (!body) {
        return;
    }

    try {
        const result = await fetchPatientHealthConcerns(patient.id);

        renderDashboardHealthConcerns(result.success ? result.data : []);
    } catch (error) {
        console.error("Failed to load health concerns", error);
        body.innerHTML = `<div class="pd-widget-empty"><p>Unable to load health concerns right now.</p></div>`;
    }
}

async function loadHealthConcernDetailTable(patient)
{
    const tbody = document.getElementById("healthConcernDetailTableBody");

    try {
        const result = await fetchPatientHealthConcerns(patient.id);

        if (!result.success) {
            tbody.innerHTML = `<tr><td colspan="5" class="table-empty">${escapeHtml(result.message || "Unable to load health concerns.")}</td></tr>`;
            return;
        }

        renderHealthConcernDetailTable(patient, result.data);
    } catch (error) {
        console.error("Failed to load patient health concerns", error);
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Unable to load health concerns right now. Please try again.</td></tr>`;
    }
}

function renderHealthConcernDetailTable(patient, concerns)
{
    const tbody = document.getElementById("healthConcernDetailTableBody");
    const canManage = ["admin", "receptionist", "doctor"].includes(getUser()?.role);

    if (!concerns.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No health concerns recorded for this patient.</td></tr>`;
        return;
    }

    tbody.innerHTML = concerns.map((concern) => {
        const isActive = !concern.end_date;

        return `
        <tr>
            <td>${escapeHtml(concern.title)}</td>
            <td>${escapeHtml(concern.occurrence || "-")}</td>
            <td><span class="status-badge ${isActive ? "completed" : "cancelled"}">${isActive ? "Active" : "Inactive"}</span></td>
            <td>${escapeHtml((concern.updated_at || concern.created_at || "").slice(0, 10))}</td>
            <td class="table-actions">
                ${canManage
                    ? `<button class="btn-edit" data-edit-healthconcern="${concern.id}">Edit</button>
                       <button class="btn-danger" data-remove-healthconcern="${concern.id}">Delete</button>`
                    : ""}
            </td>
        </tr>
    `;
    }).join("");

    if (!canManage) {
        return;
    }

    tbody.querySelectorAll("[data-edit-healthconcern]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const concern = concerns.find((c) => String(c.id) === btn.getAttribute("data-edit-healthconcern"));

            if (concern) {
                openHealthConcernFormModal(concern);
            }
        });
    });

    tbody.querySelectorAll("[data-remove-healthconcern]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this health concern record?")) {
                return;
            }

            const result = await removePatientHealthConcern(btn.getAttribute("data-remove-healthconcern"));

            if (!result.success) {
                showAlert("healthConcernDetailAlert", result.message || "Failed to remove health concern.", "error");
                return;
            }

            await loadHealthConcernDetailTable(currentDashboardPatient);
            await loadDashboardHealthConcerns(currentDashboardPatient);
            await loadIssuesSection(ISSUES_SECTIONS.healthConcerns, currentDashboardPatient);
        });
    });
}

function openHealthConcernFormModal(existingRecord)
{
    const formOverlay = document.getElementById("healthConcernFormModalOverlay");
    const title = document.getElementById("healthConcernFormTitle");
    const recordIdInput = document.getElementById("healthconcern_record_id");

    document.getElementById("healthConcernFormAlert").innerHTML = "";
    document.getElementById("healthConcernForm").reset();
    document.getElementById("err-healthconcern_title").textContent = "";

    const moreToggle = document.getElementById("healthConcernMoreToggle");
    const moreFields = document.getElementById("healthConcernMoreFields");

    moreFields.hidden = true;
    moreToggle.classList.remove("expanded");
    moreToggle.querySelector("span").textContent = "Show More Fields";

    if (existingRecord) {
        title.textContent = "Edit Health Concern";
        recordIdInput.value = existingRecord.id;

        HEALTH_CONCERN_DETAIL_FIELDS.forEach((field) => {
            document.getElementById(`healthconcern_${field}`).value = existingRecord[field] ?? "";
        });

        const secondaryFields = ["coding", "occurrence", "outcome", "classification_type", "referred_by", "destination"];

        if (secondaryFields.some((field) => existingRecord[field])) {
            moreFields.hidden = false;
            moreToggle.classList.add("expanded");
            moreToggle.querySelector("span").textContent = "Hide More Fields";
        }
    } else {
        title.textContent = "Add Health Concern";
        recordIdInput.value = "";
        document.getElementById("healthconcern_verification_status").value = "Unconfirmed";
    }

    formOverlay.classList.add("open");
}

function setupMedicationModals()
{
    const detailOverlay = document.getElementById("medicationDetailModalOverlay");
    const formOverlay = document.getElementById("medicationFormModalOverlay");
    const form = document.getElementById("medicationForm");
    const catalogSelect = document.getElementById("medication_catalog_id");

    const closeDetail = () => detailOverlay.classList.remove("open");
    const closeForm = () => formOverlay.classList.remove("open");

    document.getElementById("pdMedicationsAddBtn").addEventListener("click", () => {
        if (currentDashboardPatient) {
            openMedicationDetailModal(currentDashboardPatient);
        }
    });

    document.getElementById("closeMedicationDetailModal").addEventListener("click", closeDetail);
    detailOverlay.addEventListener("click", (event) => {
        if (event.target === detailOverlay) {
            closeDetail();
        }
    });

    document.getElementById("medicationMoreToggle").addEventListener("click", (event) => {
        const toggle = event.currentTarget;
        const moreFields = document.getElementById("medicationMoreFields");
        const isHidden = moreFields.hidden;

        moreFields.hidden = !isHidden;
        toggle.classList.toggle("expanded", isHidden);
        toggle.querySelector("span").textContent = isHidden ? "Hide More Fields" : "Show More Fields";
    });

    document.getElementById("openAddMedicationBtn").addEventListener("click", () => {
        openMedicationFormModal(null);
    });

    document.getElementById("openSelectCodesBtnMedication").addEventListener("click", () => {
        openSelectCodesModal("medication_coding");
    });

    catalogSelect.addEventListener("change", () => {
        const selectedOption = catalogSelect.options[catalogSelect.selectedIndex];

        if (catalogSelect.value && selectedOption) {
            document.getElementById("medication_title").value = selectedOption.textContent;
        }
    });

    document.getElementById("closeMedicationFormModal").addEventListener("click", closeForm);
    document.getElementById("cancelMedicationForm").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", (event) => {
        if (event.target === formOverlay) {
            closeForm();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const recordId = document.getElementById("medication_record_id").value;
        const catalogId = catalogSelect.value;
        const errEl = document.getElementById("err-medication_title");

        errEl.textContent = "";

        const details = {};

        MEDICATION_DETAIL_FIELDS.forEach((field) => {
            if (field === "is_primary_record") {
                return;
            }

            details[field] = document.getElementById(`medication_${field}`).value.trim();
        });

        details.is_primary_record = document.querySelector('input[name="medication_is_primary_record"]:checked').value;

        if (!details.title) {
            errEl.textContent = "Title is required.";
            return;
        }

        const result = recordId
            ? await updatePatientMedication(recordId, details)
            : await addPatientMedication(currentDashboardPatient.id, catalogId || null, details);

        if (!result.success) {
            showAlert("medicationFormAlert", result.message || "Failed to save medication.", "error");
            return;
        }

        closeForm();
        await loadMedicationDetailTable(currentDashboardPatient);
        await loadDashboardMedications(currentDashboardPatient);
        await loadIssuesSection(ISSUES_SECTIONS.medications, currentDashboardPatient);
    });
}

async function openMedicationDetailModal(patient)
{
    document.getElementById("medicationDetailAlert").innerHTML = "";
    document.getElementById("medicationDetailModalOverlay").classList.add("open");

    const canManage = ["admin", "receptionist", "doctor"].includes(getUser()?.role);
    const addBtn = document.getElementById("openAddMedicationBtn");

    addBtn.style.display = canManage ? "" : "none";

    await loadMedicationDetailTable(patient);
}

async function loadMedicationDetailTable(patient)
{
    const tbody = document.getElementById("medicationDetailTableBody");

    try {
        const result = await fetchPatientMedications(patient.id);

        if (!result.success) {
            tbody.innerHTML = `<tr><td colspan="5" class="table-empty">${escapeHtml(result.message || "Unable to load medications.")}</td></tr>`;
            return;
        }

        renderMedicationDetailTable(patient, result.data);
    } catch (error) {
        console.error("Failed to load patient medications", error);
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Unable to load medications right now. Please try again.</td></tr>`;
    }
}

function renderMedicationDetailTable(patient, medications)
{
    const tbody = document.getElementById("medicationDetailTableBody");
    const canManage = ["admin", "receptionist", "doctor"].includes(getUser()?.role);

    if (!medications.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No medications recorded for this patient.</td></tr>`;
        return;
    }

    tbody.innerHTML = medications.map((medication) => {
        const isActive = !medication.end_date;

        return `
        <tr>
            <td>${escapeHtml(medication.title)}</td>
            <td>${escapeHtml(medication.occurrence || "-")}</td>
            <td><span class="status-badge ${isActive ? "completed" : "cancelled"}">${isActive ? "Active" : "Inactive"}</span></td>
            <td>${escapeHtml((medication.updated_at || medication.created_at || "").slice(0, 10))}</td>
            <td class="table-actions">
                ${canManage
                    ? `<button class="btn-edit" data-edit-medication="${medication.id}">Edit</button>
                       <button class="btn-danger" data-remove-medication="${medication.id}">Delete</button>`
                    : ""}
            </td>
        </tr>
    `;
    }).join("");

    if (!canManage) {
        return;
    }

    tbody.querySelectorAll("[data-edit-medication]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const medication = medications.find((m) => String(m.id) === btn.getAttribute("data-edit-medication"));

            if (medication) {
                openMedicationFormModal(medication);
            }
        });
    });

    tbody.querySelectorAll("[data-remove-medication]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this medication record?")) {
                return;
            }

            const result = await removePatientMedication(btn.getAttribute("data-remove-medication"));

            if (!result.success) {
                showAlert("medicationDetailAlert", result.message || "Failed to remove medication.", "error");
                return;
            }

            await loadMedicationDetailTable(currentDashboardPatient);
            await loadDashboardMedications(currentDashboardPatient);
            await loadIssuesSection(ISSUES_SECTIONS.medications, currentDashboardPatient);
        });
    });
}

async function openMedicationFormModal(existingRecord)
{
    const formOverlay = document.getElementById("medicationFormModalOverlay");
    const title = document.getElementById("medicationFormTitle");
    const recordIdInput = document.getElementById("medication_record_id");
    const catalogSelect = document.getElementById("medication_catalog_id");

    document.getElementById("medicationFormAlert").innerHTML = "";
    document.getElementById("medicationForm").reset();
    document.getElementById("err-medication_title").textContent = "";

    const moreToggle = document.getElementById("medicationMoreToggle");
    const moreFields = document.getElementById("medicationMoreFields");

    moreFields.hidden = true;
    moreToggle.classList.remove("expanded");
    moreToggle.querySelector("span").textContent = "Show More Fields";

    const catalogResult = await fetchMedications();
    const catalog = catalogResult.success ? catalogResult.data : [];

    catalogSelect.innerHTML = `<option value="">Custom / type your own...</option>` +
        catalog.map((medication) => `<option value="${medication.id}">${escapeHtml(medication.name)}</option>`).join("");

    if (existingRecord) {
        title.textContent = "Edit Medication";
        recordIdInput.value = existingRecord.id;
        catalogSelect.value = existingRecord.medication_id ?? "";
        catalogSelect.disabled = true;

        MEDICATION_DETAIL_FIELDS.forEach((field) => {
            if (field === "is_primary_record") {
                return;
            }

            document.getElementById(`medication_${field}`).value = existingRecord[field] ?? "";
        });

        document.getElementById(
            Number(existingRecord.is_primary_record) ? "medication_is_primary_record_yes" : "medication_is_primary_record_no"
        ).checked = true;

        const secondaryFields = ["coding", "occurrence", "outcome", "classification_type", "referred_by", "destination"];

        if (secondaryFields.some((field) => existingRecord[field])) {
            moreFields.hidden = false;
            moreToggle.classList.add("expanded");
            moreToggle.querySelector("span").textContent = "Hide More Fields";
        }
    } else {
        title.textContent = "Add Medication";
        recordIdInput.value = "";
        catalogSelect.disabled = false;
        document.getElementById("medication_verification_status").value = "Unconfirmed";
        document.getElementById("medication_is_primary_record_yes").checked = true;
    }

    formOverlay.classList.add("open");
}

let insuranceCatalog = [];
let insuranceCatalogLoaded = false;

const INSURANCE_DETAIL_FIELDS = [
    "insurance_type", "policy_number", "group_number", "subscriber_name",
    "effective_date", "term_date"
];

async function loadDashboardInsurance(patient)
{
    const body = document.getElementById("pdInsuranceBody");

    if (!body) {
        return;
    }

    try {
        const result = await fetchPatientInsurances(patient.id);

        renderDashboardInsurance(result.success ? result.data : []);
    } catch (error) {
        console.error("Failed to load insurance", error);
        body.innerHTML = `<div class="pd-widget-empty"><p>Unable to load insurance right now.</p></div>`;
    }
}

function renderDashboardInsurance(insurances)
{
    const body = document.getElementById("pdInsuranceBody");

    if (!body) {
        return;
    }

    body.innerHTML = insurances.length
        ? `<div class="pd-allergy-list">
            ${insurances.map((insurance) => `
                <div class="pd-allergy-item">
                    <span class="pd-allergy-name">${escapeHtml(insurance.insurance_type)}: ${escapeHtml(insurance.insurance_name)}</span>
                </div>
            `).join("")}
           </div>`
        : `<div class="pd-widget-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 6v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6l-8-4Z"></path></svg>
            <p>No insurance on file.</p>
           </div>`;
}

async function loadDashboardVitalsHistory(patient)
{
    const body = document.getElementById("pdVitalsHistoryBody");

    if (!body) {
        return;
    }

    try {
        const result = await fetchVitalsHistory(patient.id);

        renderDashboardVitalsHistory(result.success ? result.data : []);
    } catch (error) {
        console.error("Failed to load vitals history", error);
        body.innerHTML = `<div class="pd-widget-empty"><p>Unable to load vitals right now.</p></div>`;
    }
}

function summarizeVitalsEntry(vitals)
{
    const parts = [];

    if (vitals.weight) parts.push(`Wt ${vitals.weight} lbs`);
    if (vitals.height) parts.push(`Ht ${vitals.height} in`);
    if (vitals.bp_systolic && vitals.bp_diastolic) parts.push(`BP ${vitals.bp_systolic}/${vitals.bp_diastolic}`);
    if (vitals.pulse) parts.push(`Pulse ${vitals.pulse}`);
    if (vitals.temperature) parts.push(`Temp ${vitals.temperature}F`);

    return parts.length ? parts.join(", ") : "No values recorded";
}

function renderDashboardVitalsHistory(vitalsHistory)
{
    const body = document.getElementById("pdVitalsHistoryBody");

    if (!body) {
        return;
    }

    body.innerHTML = vitalsHistory.length
        ? `<div class="pd-allergy-list">
            ${vitalsHistory.map((vitals) => `
                <div class="pd-allergy-item">
                    <span class="pd-allergy-name">${escapeHtml(formatDate(vitals.date_of_service) || "-")} &middot; ${escapeHtml(summarizeVitalsEntry(vitals))}</span>
                </div>
            `).join("")}
           </div>`
        : `<div class="pd-widget-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
            <p>No vitals recorded yet.</p>
           </div>`;
}

async function loadDashboardAppointments(patient)
{
    const body = document.getElementById("pdAppointmentsBody");

    if (!body) {
        return;
    }

    try {
        const today = new Date().toISOString().slice(0, 10);
        const result = await fetchAppointments({ patient_id: patient.id, from: today });

        const appointments = (result.success ? result.data : [])
            .slice()
            .sort((a, b) => `${a.appointment_date} ${a.appointment_time}`.localeCompare(`${b.appointment_date} ${b.appointment_time}`));

        renderDashboardAppointments(appointments);
    } catch (error) {
        console.error("Failed to load appointments", error);
        body.innerHTML = `<div class="pd-widget-empty"><p>Unable to load appointments right now.</p></div>`;
    }
}

function renderDashboardAppointments(appointments)
{
    const body = document.getElementById("pdAppointmentsBody");

    if (!body) {
        return;
    }

    body.innerHTML = appointments.length
        ? `<div class="pd-allergy-list">
            ${appointments.map((appt) => {
                const provider = [appt.provider_first_name, appt.provider_last_name].filter(Boolean).join(" ");
                const time = appt.is_all_day ? "All day" : formatApptTime(appt.appointment_time);
                const label = [appt.reason || appt.title || appt.visit_category_name || "Appointment", provider ? `with ${provider}` : ""]
                    .filter(Boolean).join(" ");

                return `
                    <div class="pd-allergy-item">
                        <span class="pd-allergy-name">${escapeHtml(formatApptDate(appt.appointment_date))} ${escapeHtml(time)} &middot; ${escapeHtml(label)}</span>
                    </div>
                `;
            }).join("")}
           </div>`
        : `<div class="pd-widget-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4M8 2v4M3 10h18"></path></svg>
            <p>No upcoming appointments.</p>
           </div>`;
}

async function loadDashboardDocuments(patient)
{
    const body = document.getElementById("pdDocumentsBody");

    if (!body) {
        return;
    }

    try {
        const result = await fetchPatientDocuments(patient.id);

        renderDashboardDocuments(result.success ? result.data : []);
    } catch (error) {
        console.error("Failed to load documents", error);
        body.innerHTML = `<div class="pd-widget-empty"><p>Unable to load documents right now.</p></div>`;
    }
}

function formatDocumentFileSize(bytes)
{
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderDashboardDocuments(documents)
{
    const body = document.getElementById("pdDocumentsBody");

    if (!body) {
        return;
    }

    body.innerHTML = documents.length
        ? `<div class="pd-allergy-list">
            ${documents.map((doc) => `
                <div class="pd-allergy-item">
                    <span class="pd-allergy-name">
                        <a href="${API_URL}${doc.file_path}" target="_blank" rel="noopener">${escapeHtml(doc.original_filename)}</a>
                        ${doc.category ? ` &middot; ${escapeHtml(doc.category)}` : ""} &middot; ${escapeHtml((doc.created_at || "").slice(0, 10) || "-")} &middot; ${formatDocumentFileSize(doc.file_size)}
                        ${doc.uploaded_by_name ? ` &middot; by ${escapeHtml(doc.uploaded_by_name)}` : ""}
                    </span>
                    <button type="button" class="pd-allergy-remove" data-delete-doc-id="${doc.id}" title="Delete document">&times;</button>
                </div>
            `).join("")}
           </div>`
        : `<div class="pd-widget-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path><path d="M14 2v6h6"></path></svg>
            <p>No documents uploaded yet.</p>
           </div>`;

    body.querySelectorAll("[data-delete-doc-id]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Delete this document?")) {
                return;
            }

            const result = await deletePatientDocument(btn.getAttribute("data-delete-doc-id"), currentDashboardPatient.id);

            if (result.success) {
                loadDashboardDocuments(currentDashboardPatient);
            }
        });
    });
}

function openDocumentUploadModal()
{
    document.getElementById("patientDocumentFormAlert").innerHTML = "";
    document.getElementById("patientDocumentForm").reset();
    document.getElementById("patientDocumentModalOverlay").classList.add("open");
}

function setupPatientRecordRequestModal()
{
    const overlay = document.getElementById("patientRecordRequestModalOverlay");
    const closeForm = () => overlay.classList.remove("open");

    const closeBtn = document.getElementById("closePatientRecordRequestModal");
    const cancelBtn = document.getElementById("cancelPatientRecordRequestBtn");

    if (closeBtn) closeBtn.addEventListener("click", closeForm);
    if (cancelBtn) cancelBtn.addEventListener("click", closeForm);
    
    if (overlay) {
        overlay.addEventListener("click", (event) => {
            if (event.target === overlay) {
                closeForm();
            }
        });
    }
}

function setupDocumentUploadModal()
{
    const formOverlay = document.getElementById("patientDocumentModalOverlay");
    const form = document.getElementById("patientDocumentForm");

    const closeForm = () => formOverlay.classList.remove("open");

    document.getElementById("pdDocumentsAddBtn").addEventListener("click", openDocumentUploadModal);
    document.getElementById("closePatientDocumentModal").addEventListener("click", closeForm);
    document.getElementById("cancelPatientDocumentForm").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", (event) => {
        if (event.target === formOverlay) {
            closeForm();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const fileInput = document.getElementById("patientDocument_file");
        const file = fileInput.files[0];

        if (!file) {
            showAlert("patientDocumentFormAlert", "Please choose a file to upload.", "error");
            return;
        }

        const details = {
            category: document.getElementById("patientDocument_category").value,
            description: document.getElementById("patientDocument_description").value.trim()
        };

        const result = await uploadPatientDocument(currentDashboardPatient.id, file, details);

        if (!result.success) {
            showAlert("patientDocumentFormAlert", result.message || "Failed to upload document.", "error");
            return;
        }

        closeForm();
        await loadDashboardDocuments(currentDashboardPatient);
    });
}

function setupInsuranceModals()
{
    const detailOverlay = document.getElementById("insuranceDetailModalOverlay");
    const formOverlay = document.getElementById("insuranceFormModalOverlay");
    const form = document.getElementById("insuranceForm");

    const closeDetail = () => detailOverlay.classList.remove("open");
    const closeForm = () => formOverlay.classList.remove("open");

    document.getElementById("pdInsuranceAddBtn").addEventListener("click", () => {
        if (currentDashboardPatient) {
            openInsuranceDetailModal(currentDashboardPatient);
        }
    });

    document.getElementById("closeInsuranceDetailModal").addEventListener("click", closeDetail);
    detailOverlay.addEventListener("click", (event) => {
        if (event.target === detailOverlay) {
            closeDetail();
        }
    });

    document.getElementById("openAddInsuranceBtn").addEventListener("click", () => {
        openInsuranceFormModal(null);
    });

    document.getElementById("closeInsuranceFormModal").addEventListener("click", closeForm);
    document.getElementById("cancelInsuranceForm").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", (event) => {
        if (event.target === formOverlay) {
            closeForm();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const recordId = document.getElementById("insurance_record_id").value;
        const insuranceId = document.getElementById("insurance_insurance_id").value;
        const errEl = document.getElementById("err-insurance_insurance_id");

        errEl.textContent = "";

        if (!insuranceId) {
            errEl.textContent = "Insurance is required.";
            return;
        }

        const details = {};

        INSURANCE_DETAIL_FIELDS.forEach((field) => {
            details[field] = document.getElementById(`insurance_${field}`).value;
        });

        const result = recordId
            ? await updatePatientInsurance(recordId, details)
            : await addPatientInsurance(currentDashboardPatient.id, insuranceId, details);

        if (!result.success) {
            showAlert("insuranceFormAlert", result.message || "Failed to save insurance.", "error");
            return;
        }

        closeForm();
        await loadInsuranceDetailTable(currentDashboardPatient);
        await loadDashboardInsurance(currentDashboardPatient);
        await loadVisitHistoryList(currentDashboardPatient);
    });
}

async function openInsuranceDetailModal(patient)
{
    document.getElementById("insuranceDetailAlert").innerHTML = "";
    document.getElementById("insuranceDetailModalOverlay").classList.add("open");
    await loadInsuranceDetailTable(patient);
}

async function loadInsuranceDetailTable(patient)
{
    const tbody = document.getElementById("insuranceDetailTableBody");

    try {
        const result = await fetchPatientInsurances(patient.id);

        if (!result.success) {
            tbody.innerHTML = `<tr><td colspan="5" class="table-empty">${escapeHtml(result.message || "Unable to load insurance.")}</td></tr>`;
            return;
        }

        renderInsuranceDetailTable(result.data);
    } catch (error) {
        console.error("Failed to load patient insurance", error);
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Unable to load insurance right now. Please try again.</td></tr>`;
    }
}

function renderInsuranceDetailTable(insurances)
{
    const tbody = document.getElementById("insuranceDetailTableBody");

    if (!insurances.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No insurance recorded for this patient.</td></tr>`;
        return;
    }

    tbody.innerHTML = insurances.map((insurance) => `
        <tr>
            <td>${escapeHtml(insurance.insurance_type)}</td>
            <td>${escapeHtml(insurance.insurance_name)}</td>
            <td>${escapeHtml(insurance.policy_number || "-")}</td>
            <td>${escapeHtml(insurance.effective_date || "-")}</td>
            <td class="table-actions">
                <button class="btn-edit" data-edit-insurance="${insurance.id}">Edit</button>
                <button class="btn-danger" data-remove-insurance="${insurance.id}">Delete</button>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-insurance]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const insurance = insurances.find((i) => String(i.id) === btn.getAttribute("data-edit-insurance"));

            if (insurance) {
                openInsuranceFormModal(insurance);
            }
        });
    });

    tbody.querySelectorAll("[data-remove-insurance]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this insurance record?")) {
                return;
            }

            const result = await removePatientInsurance(btn.getAttribute("data-remove-insurance"));

            if (!result.success) {
                showAlert("insuranceDetailAlert", result.message || "Failed to remove insurance.", "error");
                return;
            }

            await loadInsuranceDetailTable(currentDashboardPatient);
            await loadDashboardInsurance(currentDashboardPatient);
            await loadVisitHistoryList(currentDashboardPatient);
        });
    });
}

async function openInsuranceFormModal(existingRecord)
{
    document.getElementById("insuranceFormAlert").innerHTML = "";
    document.getElementById("insuranceForm").reset();
    document.getElementById("err-insurance_insurance_id").textContent = "";

    if (!insuranceCatalogLoaded) {
        const catalogResult = await fetchInsurances();
        insuranceCatalog = catalogResult.success ? catalogResult.data : [];
        insuranceCatalogLoaded = true;
    }

    fillEncounterSelect("insurance_insurance_id", insuranceCatalog, (i) => i.name, "-- Select One --");

    const title = document.getElementById("insuranceFormTitle");
    const recordIdInput = document.getElementById("insurance_record_id");

    if (existingRecord) {
        title.textContent = "Edit Insurance";
        recordIdInput.value = existingRecord.id;
        document.getElementById("insurance_insurance_id").value = existingRecord.insurance_id ?? "";
        document.getElementById("insurance_insurance_type").value = existingRecord.insurance_type || "primary";
        document.getElementById("insurance_policy_number").value = existingRecord.policy_number || "";
        document.getElementById("insurance_group_number").value = existingRecord.group_number || "";
        document.getElementById("insurance_subscriber_name").value = existingRecord.subscriber_name || "";
        document.getElementById("insurance_effective_date").value = (existingRecord.effective_date || "").slice(0, 10);
        document.getElementById("insurance_term_date").value = (existingRecord.term_date || "").slice(0, 10);
    } else {
        title.textContent = "Add Insurance";
        recordIdInput.value = "";
        document.getElementById("insurance_insurance_type").value = "primary";
    }

    document.getElementById("insuranceFormModalOverlay").classList.add("open");
}

function setupImmunizationModals()
{
    const detailOverlay = document.getElementById("immunizationDetailModalOverlay");
    const formOverlay = document.getElementById("immunizationFormModalOverlay");
    const form = document.getElementById("immunizationForm");

    const closeDetail = () => detailOverlay.classList.remove("open");
    const closeForm = () => formOverlay.classList.remove("open");

    document.getElementById("pdImmunizationsAddBtn").addEventListener("click", () => {
        if (currentDashboardPatient) {
            openImmunizationDetailModal(currentDashboardPatient);
        }
    });

    document.getElementById("closeImmunizationDetailModal").addEventListener("click", closeDetail);
    detailOverlay.addEventListener("click", (event) => {
        if (event.target === detailOverlay) {
            closeDetail();
        }
    });

    document.getElementById("immunizationMoreToggle").addEventListener("click", (event) => {
        const toggle = event.currentTarget;
        const moreFields = document.getElementById("immunizationMoreFields");
        const isHidden = moreFields.hidden;

        moreFields.hidden = !isHidden;
        toggle.classList.toggle("expanded", isHidden);
        toggle.querySelector("span").textContent = isHidden ? "Hide More Fields" : "Show More Fields";
    });

    document.getElementById("openAddImmunizationBtn").addEventListener("click", () => {
        openImmunizationFormModal(null);
    });

    document.getElementById("openImmunizationFinderBtn").addEventListener("click", () => {
        openSelectCodesModal("immunization_cvx_code", "immunization_vaccine_name", {
            defaultSource: "cvx",
            codeOnly: true,
            idFieldId: "immunization_cvx_code_id"
        });
    });

    document.getElementById("closeImmunizationFormModal").addEventListener("click", closeForm);
    document.getElementById("cancelImmunizationForm").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", (event) => {
        if (event.target === formOverlay) {
            closeForm();
        }
    });

    loadProviderOptions("immunization_administered_by_provider_id");
    loadProviderOptions("immunization_ordering_provider_id");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const recordId = document.getElementById("immunization_record_id").value;
        const cvxCodeId = document.getElementById("immunization_cvx_code_id").value;
        const errEl = document.getElementById("err-immunization_cvx_code");

        errEl.textContent = "";

        const details = { cvx_code: document.getElementById("immunization_cvx_code").value.trim() };

        IMMUNIZATION_DETAIL_FIELDS.forEach((field) => {
            details[field] = document.getElementById(`immunization_${field}`).value.trim();
        });

        const administeredAtRaw = details.administered_at;

        details.administered_at = administeredAtRaw ? `${administeredAtRaw.replace("T", " ")}:00` : "";

        if (!details.cvx_code) {
            errEl.textContent = "Immunization (CVX code) is required.";
            return;
        }

        const result = recordId
            ? await updatePatientImmunization(recordId, details)
            : await addPatientImmunization(currentDashboardPatient.id, cvxCodeId || null, details);

        if (!result.success) {
            showAlert("immunizationFormAlert", result.message || "Failed to save immunization.", "error");
            return;
        }

        closeForm();
        await loadImmunizationDetailTable(currentDashboardPatient);
        await loadDashboardImmunizations(currentDashboardPatient);
    });
}

async function openImmunizationDetailModal(patient)
{
    document.getElementById("immunizationDetailAlert").innerHTML = "";
    document.getElementById("immunizationDetailModalOverlay").classList.add("open");

    const canManage = ["admin", "receptionist", "doctor"].includes(getUser()?.role);
    const addBtn = document.getElementById("openAddImmunizationBtn");

    addBtn.style.display = canManage ? "" : "none";

    await loadImmunizationDetailTable(patient);
}

async function loadImmunizationDetailTable(patient)
{
    const tbody = document.getElementById("immunizationDetailTableBody");

    try {
        const result = await fetchPatientImmunizations(patient.id);

        if (!result.success) {
            tbody.innerHTML = `<tr><td colspan="5" class="table-empty">${escapeHtml(result.message || "Unable to load immunizations.")}</td></tr>`;
            return;
        }

        renderImmunizationDetailTable(patient, result.data);
    } catch (error) {
        console.error("Failed to load patient immunizations", error);
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Unable to load immunizations right now. Please try again.</td></tr>`;
    }
}

function renderImmunizationDetailTable(patient, immunizations)
{
    const tbody = document.getElementById("immunizationDetailTableBody");
    const canManage = ["admin", "receptionist", "doctor"].includes(getUser()?.role);

    if (!immunizations.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No immunizations recorded for this patient.</td></tr>`;
        return;
    }

    tbody.innerHTML = immunizations.map((immunization) => {
        const status = immunization.completion_status || "completed";

        return `
        <tr>
            <td>${escapeHtml(immunization.vaccine_name || immunization.cvx_code)}</td>
            <td>${escapeHtml((immunization.administered_at || "").slice(0, 16).replace("T", " ")) || "-"}</td>
            <td><span class="status-badge ${status === "completed" ? "completed" : "cancelled"}">${escapeHtml(status)}</span></td>
            <td>${escapeHtml(immunization.administered_by || immunization.administered_by_provider_name || "-")}</td>
            <td class="table-actions">
                ${canManage
                    ? `<button class="btn-edit" data-edit-immunization="${immunization.id}">Edit</button>
                       <button class="btn-danger" data-remove-immunization="${immunization.id}">Delete</button>`
                    : ""}
            </td>
        </tr>
    `;
    }).join("");

    if (!canManage) {
        return;
    }

    tbody.querySelectorAll("[data-edit-immunization]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const immunization = immunizations.find((i) => String(i.id) === btn.getAttribute("data-edit-immunization"));

            if (immunization) {
                openImmunizationFormModal(immunization);
            }
        });
    });

    tbody.querySelectorAll("[data-remove-immunization]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this immunization record?")) {
                return;
            }

            const result = await removePatientImmunization(btn.getAttribute("data-remove-immunization"));

            if (!result.success) {
                showAlert("immunizationDetailAlert", result.message || "Failed to remove immunization.", "error");
                return;
            }

            await loadImmunizationDetailTable(patient);
            await loadDashboardImmunizations(patient);
        });
    });
}

async function openImmunizationFormModal(existingRecord)
{
    const formOverlay = document.getElementById("immunizationFormModalOverlay");
    const title = document.getElementById("immunizationFormTitle");
    const recordIdInput = document.getElementById("immunization_record_id");
    const encounterSelect = document.getElementById("immunization_encounter_id");

    document.getElementById("immunizationFormAlert").innerHTML = "";
    document.getElementById("immunizationForm").reset();
    document.getElementById("err-immunization_cvx_code").textContent = "";
    document.getElementById("immunization_cvx_code_id").value = "";

    const moreToggle = document.getElementById("immunizationMoreToggle");
    const moreFields = document.getElementById("immunizationMoreFields");

    moreFields.hidden = true;
    moreToggle.classList.remove("expanded");
    moreToggle.querySelector("span").textContent = "Show More Fields";

    encounterSelect.innerHTML = `<option value="">-- Select Encounter --</option>`;

    if (currentDashboardPatient) {
        const encountersResult = await fetchPatientEncounters(currentDashboardPatient.id);
        const encounters = encountersResult.success ? encountersResult.data : [];

        encounters.forEach((encounter) => {
            const option = document.createElement("option");
            const dateLabel = (encounter.date_of_service || "").slice(0, 16).replace("T", " ");

            option.value = encounter.id;
            option.textContent = `${dateLabel}${encounter.visit_category_name ? ` — ${encounter.visit_category_name}` : ""}`;

            encounterSelect.appendChild(option);
        });
    }

    if (existingRecord) {
        title.textContent = "Edit Immunization";
        recordIdInput.value = existingRecord.id;
        document.getElementById("immunization_cvx_code_id").value = existingRecord.cvx_code_id ?? "";
        document.getElementById("immunization_cvx_code").value = existingRecord.cvx_code ?? "";

        IMMUNIZATION_DETAIL_FIELDS.forEach((field) => {
            if (field === "administered_at") {
                document.getElementById(`immunization_${field}`).value = (existingRecord.administered_at || "").slice(0, 16).replace(" ", "T");
                return;
            }

            document.getElementById(`immunization_${field}`).value = existingRecord[field] ?? "";
        });

        const secondaryFields = [
            "administered_by", "administered_by_provider_id", "vis_date_given", "vis_date_document",
            "information_source", "refusal_reason", "reason_code", "ordering_provider_id", "encounter_id"
        ];

        if (secondaryFields.some((field) => existingRecord[field])) {
            moreFields.hidden = false;
            moreToggle.classList.add("expanded");
            moreToggle.querySelector("span").textContent = "Hide More Fields";
        }
    } else {
        title.textContent = "Add Immunization";
        recordIdInput.value = "";
        document.getElementById("immunization_completion_status").value = "completed";
    }

    formOverlay.classList.add("open");
}

function setupCarePlanModals()
{
    const formOverlay = document.getElementById("carePlanFormModalOverlay");
    const form = document.getElementById("carePlanForm");
    const reasonPickerOverlay = document.getElementById("carePlanReasonPickerModalOverlay");

    const closeForm = () => formOverlay.classList.remove("open");

    document.getElementById("pdCarePlanAddBtn").addEventListener("click", () => {
        if (currentEncounterSummary?.encounter) {
            openCarePlanFormModal(null);
        }
    });

    document.getElementById("closeCarePlanFormModal").addEventListener("click", closeForm);
    document.getElementById("cancelCarePlanForm").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", (event) => {
        if (event.target === formOverlay) {
            closeForm();
        }
    });

    document.getElementById("closeCarePlanReasonPickerModal").addEventListener("click", closeCarePlanReasonPicker);
    reasonPickerOverlay.addEventListener("click", (event) => {
        if (event.target === reasonPickerOverlay) {
            closeCarePlanReasonPicker();
        }
    });

    document.getElementById("carePlanReasonPickerSearch").addEventListener("input", (event) => {
        renderCarePlanReasonPickerList(event.target.value.trim().toLowerCase());
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const rows = Array.from(document.querySelectorAll("#carePlanRowsContainer .care-plan-row"));
        const payloads = [];

        for (let i = 0; i < rows.length; i++) {
            const rowEl = rows[i];
            const hasReason = !rowEl.querySelector(".cp-reason-section").hidden;
            const itemDateRaw = rowEl.querySelector(".cp-item-date").value;

            const details = {
                item_type: rowEl.querySelector(".cp-item-type").value,
                code: rowEl.querySelector(".cp-code").value.trim() || null,
                code_text: rowEl.querySelector(".cp-code-text").value.trim() || null,
                description: rowEl.querySelector(".cp-description").value.trim(),
                item_date: itemDateRaw ? `${itemDateRaw.replace("T", " ")}:00` : "",
                target_date: rowEl.querySelector(".cp-target-date").value || null,
                end_date: rowEl.querySelector(".cp-end-date").value || null,
                status: rowEl.querySelector(".cp-status").value || null,
                reason_code: hasReason ? (rowEl.querySelector(".cp-reason-code").value.trim() || null) : null,
                reason_status: hasReason ? (rowEl.querySelector(".cp-reason-status").value || null) : null,
                reason_recording_date: hasReason ? (rowEl.querySelector(".cp-reason-recording-date").value || null) : null,
                reason_end_date: hasReason ? (rowEl.querySelector(".cp-reason-end-date").value || null) : null
            };

            if (!details.item_type || !details.description || !details.item_date) {
                showAlert("carePlanFormAlert", `Item ${i + 1}: Type, Description, and Date are required.`, "error");
                return;
            }

            payloads.push({ recordId: rowEl.querySelector(".cp-record-id").value, details });
        }

        if (!payloads.length) {
            closeForm();
            return;
        }

        for (const { recordId, details } of payloads) {
            const result = recordId
                ? await updateCarePlanItem(recordId, details)
                : await addCarePlanItem(currentEncounterSummary.encounter.id, details);

            if (!result.success) {
                showAlert("carePlanFormAlert", result.message || "Failed to save care plan item.", "error");
                return;
            }
        }

        closeForm();
        await loadCarePlanItems();
        renderCarePlanSection();
    });
}

function carePlanOptionsHtml(options)
{
    return `<option value="">-- Select --</option>` +
        options.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
}

function buildCarePlanRowHtml(rowId)
{
    return `
        <div class="care-plan-row" data-row-id="${rowId}" style="margin-bottom: 18px; padding-bottom: 18px; border-bottom: 1px solid #eef1f7;">
            <input type="hidden" class="cp-record-id" value="">
            <input type="hidden" class="cp-code-text" value="">

            <div class="form-grid">
                <div class="form-group">
                    <label>Code:</label>
                    <input class="form-input cp-code" readonly placeholder="Click to select a code">
                </div>

                <div class="form-group">
                    <label>Date:</label>
                    <input type="datetime-local" class="form-input cp-item-date">
                </div>

                <div class="form-group">
                    <label>Type:</label>
                    <select class="form-input cp-item-type">${carePlanOptionsHtml(CARE_PLAN_TYPE_OPTIONS)}</select>
                </div>

                <div class="form-group">
                    <label>Target Date:</label>
                    <input type="date" class="form-input cp-target-date">
                </div>

                <div class="form-group">
                    <label>End Date:</label>
                    <input type="date" class="form-input cp-end-date">
                </div>

                <div class="form-group">
                    <label>Status:</label>
                    <select class="form-input cp-status">${carePlanOptionsHtml(CARE_PLAN_STATUS_OPTIONS)}</select>
                </div>

                <div class="form-group full">
                    <label>Description:</label>
                    <textarea class="form-input cp-description" style="min-height: 120px;"></textarea>
                </div>
            </div>

            <div class="form-actions" style="justify-content: flex-end;">
                <button type="button" class="btn-secondary cp-add-btn">&#43; Add</button>
                <button type="button" class="btn-secondary cp-delete-btn">&#128465; Delete</button>
                <button type="button" class="btn-secondary cp-add-reason-btn">&#10035; Add Reason</button>
            </div>

            <div class="cp-reason-section" hidden>
                <hr>
                <p class="form-subtitle">Care Plan Reason Information</p>
                <p>When recording a reason for the value (or absence of a value) of an observation both the reason code and status of the reason are required</p>

                <div class="form-grid">
                    <div class="form-group">
                        <label>Reason Code</label>
                        <input class="form-input cp-reason-code" readonly placeholder="Select a reason code">
                    </div>

                    <div class="form-group">
                        <label>Reason Status</label>
                        <select class="form-input cp-reason-status">${carePlanOptionsHtml(CARE_PLAN_REASON_STATUS_OPTIONS)}</select>
                    </div>

                    <div class="form-group">
                        <label>Reason Recording Date</label>
                        <input type="date" class="form-input cp-reason-recording-date">
                    </div>

                    <div class="form-group">
                        <label>Reason End Date (Leave empty if there is no end date)</label>
                        <input type="date" class="form-input cp-reason-end-date">
                    </div>
                </div>
            </div>
        </div>
    `.trim();
}

function wireCarePlanRow(rowEl)
{
    rowEl.querySelector(".cp-code").addEventListener("click", () => {
        openCodePicker({
            onSelect: ({ code, description }) => {
                rowEl.querySelector(".cp-code").value = code;
                rowEl.querySelector(".cp-code-text").value = description || "";
            }
        });
    });

    rowEl.querySelector(".cp-add-reason-btn").addEventListener("click", () => {
        const reasonSection = rowEl.querySelector(".cp-reason-section");
        reasonSection.hidden = !reasonSection.hidden;
    });

    rowEl.querySelector(".cp-reason-code").addEventListener("click", () => {
        openCarePlanReasonPicker((code) => {
            rowEl.querySelector(".cp-reason-code").value = code;
        });
    });

    rowEl.querySelector(".cp-add-btn").addEventListener("click", () => {
        rowEl.insertAdjacentElement("afterend", createCarePlanRow());
    });

    rowEl.querySelector(".cp-delete-btn").addEventListener("click", async () => {
        const container = document.getElementById("carePlanRowsContainer");
        const recordId = rowEl.querySelector(".cp-record-id").value;

        if (recordId) {
            if (!confirm("Remove this care plan item?")) {
                return;
            }

            const result = await removeCarePlanItem(recordId);

            if (!result.success) {
                showAlert("carePlanFormAlert", result.message || "Failed to remove item.", "error");
                return;
            }

            await loadCarePlanItems();
            renderCarePlanSection();
        }

        if (container.children.length > 1) {
            rowEl.remove();
        } else {
            document.getElementById("carePlanFormModalOverlay").classList.remove("open");
        }
    });
}

function createCarePlanRow()
{
    const wrapper = document.createElement("div");

    wrapper.innerHTML = buildCarePlanRowHtml(++carePlanRowSeq);

    const rowEl = wrapper.firstElementChild;

    wireCarePlanRow(rowEl);

    return rowEl;
}

function openCarePlanFormModal(existingRecord)
{
    const formOverlay = document.getElementById("carePlanFormModalOverlay");
    const title = document.getElementById("carePlanFormTitle");
    const container = document.getElementById("carePlanRowsContainer");

    document.getElementById("carePlanFormAlert").innerHTML = "";
    container.innerHTML = "";

    const rowEl = createCarePlanRow();

    container.appendChild(rowEl);

    if (existingRecord) {
        title.textContent = "Edit Care Plan Form";
        rowEl.querySelector(".cp-record-id").value = existingRecord.id;
        rowEl.querySelector(".cp-code").value = existingRecord.code || "";
        rowEl.querySelector(".cp-code-text").value = existingRecord.code_text || "";
        rowEl.querySelector(".cp-item-type").value = existingRecord.item_type || "";
        rowEl.querySelector(".cp-item-date").value = (existingRecord.item_date || "").slice(0, 16).replace(" ", "T");
        rowEl.querySelector(".cp-target-date").value = (existingRecord.target_date || "").slice(0, 10);
        rowEl.querySelector(".cp-end-date").value = (existingRecord.end_date || "").slice(0, 10);
        rowEl.querySelector(".cp-status").value = existingRecord.status || "";
        rowEl.querySelector(".cp-description").value = existingRecord.description || "";
        rowEl.querySelector(".cp-reason-code").value = existingRecord.reason_code || "";
        rowEl.querySelector(".cp-reason-status").value = existingRecord.reason_status || "";
        rowEl.querySelector(".cp-reason-recording-date").value = (existingRecord.reason_recording_date || "").slice(0, 10);
        rowEl.querySelector(".cp-reason-end-date").value = (existingRecord.reason_end_date || "").slice(0, 10);

        if (existingRecord.reason_code || existingRecord.reason_status
            || existingRecord.reason_recording_date || existingRecord.reason_end_date) {
            rowEl.querySelector(".cp-reason-section").hidden = false;
        }
    } else {
        title.textContent = "Care Plan Form";
    }

    formOverlay.classList.add("open");
}

async function openCarePlanReasonPicker(onSelect)
{
    carePlanReasonPickerOnSelect = onSelect;

    if (!carePlanReasonCodesCache) {
        const result = await fetchCarePlanReasonCodes();
        carePlanReasonCodesCache = result.success ? result.data : [];
    }

    document.getElementById("carePlanReasonPickerSearch").value = "";
    document.getElementById("carePlanReasonPickerModalOverlay").classList.add("open");
    renderCarePlanReasonPickerList("");
}

function closeCarePlanReasonPicker()
{
    document.getElementById("carePlanReasonPickerModalOverlay").classList.remove("open");
    carePlanReasonPickerOnSelect = null;
}

function renderCarePlanReasonPickerList(filterText)
{
    const tbody = document.getElementById("carePlanReasonPickerTableBody");
    const codes = carePlanReasonCodesCache || [];

    const filtered = filterText
        ? codes.filter((item) =>
            (item.code || "").toLowerCase().includes(filterText) ||
            (item.description || "").toLowerCase().includes(filterText))
        : codes;

    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="2" class="code-picker-status">No matching reason codes.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map((item) => `
        <tr data-code="${escapeHtml(item.code)}">
            <td>${escapeHtml(item.code)}</td>
            <td>${escapeHtml(item.description || "-")}</td>
        </tr>
    `).join("");

    tbody.querySelectorAll("tr[data-code]").forEach((row) => {
        row.addEventListener("click", () => {
            if (carePlanReasonPickerOnSelect) {
                carePlanReasonPickerOnSelect(row.getAttribute("data-code"));
            }

            closeCarePlanReasonPicker();
        });
    });
}

function setupClinicalInstructionsModal()
{
    const formOverlay = document.getElementById("clinicalInstructionsFormModalOverlay");
    const form = document.getElementById("clinicalInstructionsForm");

    const closeForm = () => formOverlay.classList.remove("open");

    document.getElementById("pdClinicalInstructionsAddBtn").addEventListener("click", () => {
        if (currentEncounterSummary?.encounter) {
            openClinicalInstructionsFormModal(null);
        }
    });

    document.getElementById("closeClinicalInstructionsFormModal").addEventListener("click", closeForm);
    document.getElementById("cancelClinicalInstructionsForm").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", (event) => {
        if (event.target === formOverlay) {
            closeForm();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const recordId = document.getElementById("clinical_instruction_record_id").value;
        const instructions = document.getElementById("clinicalInstructions_content").value.trim();

        if (!instructions) {
            showAlert("clinicalInstructionsFormAlert", "Instructions is required.", "error");
            return;
        }

        const details = {
            instructions,
            item_date: document.getElementById("clinical_instruction_item_date").value
        };

        const result = recordId
            ? await updateClinicalInstructionItem(recordId, details)
            : await addClinicalInstructionItem(currentEncounterSummary.encounter.id, details);

        if (!result.success) {
            showAlert("clinicalInstructionsFormAlert", result.message || "Failed to save.", "error");
            return;
        }

        closeForm();
        await loadClinicalInstructionItems();
        renderClinicalInstructionsSection();
    });
}

function openClinicalInstructionsFormModal(existingRecord)
{
    document.getElementById("clinicalInstructionsFormAlert").innerHTML = "";
    document.getElementById("clinical_instruction_record_id").value = existingRecord ? existingRecord.id : "";
    document.getElementById("clinicalInstructions_content").value = existingRecord ? (existingRecord.instructions || "") : "";
    document.getElementById("clinical_instruction_item_date").value = existingRecord
        ? existingRecord.item_date
        : formatMysqlDateTime(new Date());
    document.getElementById("clinicalInstructionsFormModalOverlay").classList.add("open");
}

function formatMysqlDateTime(date)
{
    const pad = (n) => String(n).padStart(2, "0");

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function loadClinicalInstructionItems()
{
    const result = await fetchClinicalInstructionItems(currentEncounterSummary.encounter.id);

    currentEncounterSummary.clinicalInstructionItems = result.success ? result.data : [];
}

function setupClinicalNotesModal()
{
    const formOverlay = document.getElementById("clinicalNotesFormModalOverlay");
    const form = document.getElementById("clinicalNotesForm");

    const closeForm = () => formOverlay.classList.remove("open");

    document.getElementById("pdClinicalNotesAddBtn").addEventListener("click", () => {
        if (currentEncounterSummary?.encounter) {
            openClinicalNotesFormModal(null);
        }
    });

    document.getElementById("closeClinicalNotesFormModal").addEventListener("click", closeForm);
    document.getElementById("cancelClinicalNotesForm").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", (event) => {
        if (event.target === formOverlay) {
            closeForm();
        }
    });

    setupClinicalNoteDocumentPicker();
    setupClinicalNoteResultPicker();

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const rows = Array.from(document.querySelectorAll("#clinicalNoteRowsContainer .clinical-note-row"));
        const payloads = [];

        for (let i = 0; i < rows.length; i++) {
            const rowEl = rows[i];

            const details = {
                note_type: rowEl.querySelector(".cn-note-type").value,
                category: rowEl.querySelector(".cn-category").value || null,
                narrative: rowEl.querySelector(".cn-narrative").value.trim(),
                note_date: rowEl.querySelector(".cn-note-date").value
            };

            if (!details.note_type || !details.narrative || !details.note_date) {
                showAlert("clinicalNotesFormAlert", `Note ${i + 1}: Type, Narrative, and Date are required.`, "error");
                return;
            }

            payloads.push({ recordId: rowEl.querySelector(".cn-record-id").value, details });
        }

        if (!payloads.length) {
            closeForm();
            return;
        }

        for (const { recordId, details } of payloads) {
            const result = recordId
                ? await updateClinicalNoteItem(recordId, details)
                : await addClinicalNoteItem(currentEncounterSummary.encounter.id, details);

            if (!result.success) {
                showAlert("clinicalNotesFormAlert", result.message || "Failed to save clinical note.", "error");
                return;
            }
        }

        closeForm();
        await loadClinicalNoteItems();
        renderClinicalNotesSection();
    });
}

function buildClinicalNoteRowHtml(rowId)
{
    return `
        <div class="clinical-note-row" data-row-id="${rowId}" style="margin-bottom: 18px; padding-bottom: 18px; border-bottom: 1px solid #eef1f7;">
            <input type="hidden" class="cn-record-id" value="">

            <div class="form-grid">
                <div class="form-group">
                    <label>Date:</label>
                    <input type="date" class="form-input cn-note-date">
                </div>

                <div class="form-group">
                    <label>Type:</label>
                    <select class="form-input cn-note-type">${carePlanOptionsHtml(CLINICAL_NOTE_TYPE_OPTIONS)}</select>
                </div>

                <div class="form-group">
                    <label>Category:</label>
                    <select class="form-input cn-category">${carePlanOptionsHtml(CLINICAL_NOTE_CATEGORY_OPTIONS)}</select>
                </div>
            </div>

            <hr>

            <p><strong>Author:</strong> <span class="cn-author-display">-</span></p>
            <p><strong>Last Updated:</strong> <span class="cn-last-updated-display">-</span></p>

            <div class="form-group full">
                <label>Narrative:</label>
                <textarea class="form-input cn-narrative" style="min-height: 140px;"></textarea>
            </div>

            <div class="form-group full">
                <label>&#128196; Linked Documents:</label>
                <div class="pd-readonly-value cn-documents-list" style="border: 1px solid #e7eaef; border-radius: 8px; padding: 10px; color: #8b98ac;">No documents linked</div>
                <button type="button" class="btn-secondary cn-add-documents-btn" style="margin-top: 8px;">+ Add Documents</button>
            </div>

            <div class="form-group full">
                <label>&#129514; Linked Procedure Results:</label>
                <div class="pd-readonly-value cn-results-list" style="border: 1px solid #e7eaef; border-radius: 8px; padding: 10px; color: #8b98ac;">No results linked</div>
                <button type="button" class="btn-secondary cn-add-results-btn" style="margin-top: 8px;">+ Add Results</button>
            </div>

            <div class="form-actions" style="justify-content: flex-end;">
                <button type="button" class="btn-secondary cn-add-btn">&#43; Add</button>
                <button type="button" class="btn-secondary cn-delete-btn">&#128465; Delete</button>
            </div>
        </div>
    `.trim();
}

function wireClinicalNoteRow(rowEl)
{
    rowEl.querySelector(".cn-add-btn").addEventListener("click", () => {
        rowEl.insertAdjacentElement("afterend", createClinicalNoteRow());
    });

    rowEl.querySelector(".cn-add-documents-btn").addEventListener("click", () => {
        openClinicalNoteDocumentPicker();
    });

    rowEl.querySelector(".cn-add-results-btn").addEventListener("click", () => {
        openClinicalNoteResultPicker();
    });

    rowEl.querySelector(".cn-delete-btn").addEventListener("click", async () => {
        const container = document.getElementById("clinicalNoteRowsContainer");
        const recordId = rowEl.querySelector(".cn-record-id").value;

        if (recordId) {
            if (!confirm("Remove this clinical note?")) {
                return;
            }

            const result = await removeClinicalNoteItem(recordId);

            if (!result.success) {
                showAlert("clinicalNotesFormAlert", result.message || "Failed to remove item.", "error");
                return;
            }

            await loadClinicalNoteItems();
            renderClinicalNotesSection();
        }

        if (container.children.length > 1) {
            rowEl.remove();
        } else {
            document.getElementById("clinicalNotesFormModalOverlay").classList.remove("open");
        }
    });
}

function createClinicalNoteRow()
{
    const wrapper = document.createElement("div");

    wrapper.innerHTML = buildClinicalNoteRowHtml(++clinicalNoteRowSeq);

    const rowEl = wrapper.firstElementChild;

    wireClinicalNoteRow(rowEl);

    return rowEl;
}

function openClinicalNotesFormModal(existingRecord)
{
    const formOverlay = document.getElementById("clinicalNotesFormModalOverlay");
    const container = document.getElementById("clinicalNoteRowsContainer");

    document.getElementById("clinicalNotesFormAlert").innerHTML = "";
    container.innerHTML = "";

    const rowEl = createClinicalNoteRow();

    container.appendChild(rowEl);

    if (existingRecord) {
        rowEl.querySelector(".cn-record-id").value = existingRecord.id;
        rowEl.querySelector(".cn-note-date").value = (existingRecord.note_date || "").slice(0, 10);
        rowEl.querySelector(".cn-note-type").value = existingRecord.note_type || "";
        rowEl.querySelector(".cn-category").value = existingRecord.category || "";
        rowEl.querySelector(".cn-narrative").value = existingRecord.narrative || "";
        rowEl.querySelector(".cn-author-display").textContent = existingRecord.author_name || "-";
        rowEl.querySelector(".cn-last-updated-display").textContent =
            (existingRecord.updated_at || existingRecord.created_at || "").slice(0, 16).replace("T", " ") || "-";
    }

    formOverlay.classList.add("open");
}

async function loadClinicalNoteItems()
{
    const result = await fetchClinicalNoteItems(currentEncounterSummary.encounter.id);

    currentEncounterSummary.clinicalNoteItems = result.success ? result.data : [];
}

function renderClinicalNotesSection()
{
    const { sections, clinicalNoteItems } = currentEncounterSummary;
    const section = sections.clinical_notes || {};
    const locked = !!section.locked_at;
    const tbody = document.getElementById("pdClinicalNotesTableBody");
    const items = clinicalNoteItems || [];

    if (!items.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="table-empty">No clinical notes recorded.</td></tr>`;
    } else {
        tbody.innerHTML = items.map((item) => `
            <tr>
                <td>${escapeHtml((item.note_date || "").slice(0, 10))}</td>
                <td>${escapeHtml(item.note_type)}</td>
                <td>${escapeHtml(item.category || "-")}</td>
                <td>${escapeHtml(item.author_name)}</td>
                <td>${escapeHtml(item.code || "-")}</td>
                <td>${escapeHtml((item.updated_at || item.created_at || "").slice(0, 16).replace("T", " "))}</td>
                <td class="table-actions">
                    ${locked ? "" : `
                        <button class="btn-edit" data-edit-clinical-note-item="${item.id}">Edit</button>
                        <button class="btn-danger" data-remove-clinical-note-item="${item.id}">Delete</button>
                    `}
                </td>
            </tr>
            <tr>
                <td colspan="7" style="color:#5b6472;">${escapeHtml(item.narrative)}</td>
            </tr>
        `).join("");

        if (!locked) {
            tbody.querySelectorAll("[data-edit-clinical-note-item]").forEach((btn) => {
                btn.addEventListener("click", () => {
                    const item = items.find((i) => String(i.id) === btn.getAttribute("data-edit-clinical-note-item"));

                    if (item) {
                        openClinicalNotesFormModal(item);
                    }
                });
            });

            tbody.querySelectorAll("[data-remove-clinical-note-item]").forEach((btn) => {
                btn.addEventListener("click", async () => {
                    if (!confirm("Remove this clinical note?")) {
                        return;
                    }

                    const result = await removeClinicalNoteItem(btn.getAttribute("data-remove-clinical-note-item"));

                    if (!result.success) {
                        showAlert("pdEncounterSummaryAlert", result.message || "Failed to remove item.", "error");
                        return;
                    }

                    await loadClinicalNoteItems();
                    renderClinicalNotesSection();
                });
            });
        }
    }

    renderLockedBadge("pdEncSummaryClinicalNotesLockedBadge", section.locked_at);
    renderEsignLog("pdEncSummaryClinicalNotesLog", section.signatures);
    document.getElementById("pdEncSummaryClinicalNotesDeleteBtn").style.display = locked ? "none" : "";
    document.getElementById("pdClinicalNotesAddBtn").style.display = locked ? "none" : "";
}

function buildFunctionalCognitiveRowHtml(rowId)
{
    return `
        <div class="functional-cognitive-row" data-row-id="${rowId}" style="margin-bottom: 18px; padding-bottom: 18px; border-bottom: 1px solid #eef1f7;">
            <input type="hidden" class="fc-record-id" value="">
            <input type="hidden" class="fc-code-text" value="">

            <div class="form-grid">
                <div class="form-group">
                    <label>Code:</label>
                    <input class="form-input fc-code" readonly placeholder="Click to select a code">
                </div>

                <div class="form-group">
                    <label>Date:</label>
                    <input type="date" class="form-input fc-item-date">
                </div>

                <div class="form-group">
                    <label>For Mental Status:</label>
                    <label style="display:flex; align-items:center; gap:6px; margin-top: 8px;"><input type="checkbox" class="fc-for-mental-status"> Yes</label>
                </div>

                <div class="form-group full">
                    <label>Description:</label>
                    <textarea class="form-input fc-description" style="min-height: 100px;"></textarea>
                </div>
            </div>

            <div class="form-actions" style="justify-content: flex-end;">
                <button type="button" class="btn-secondary fc-add-btn">&#43; Add</button>
                <button type="button" class="btn-secondary fc-delete-btn">&#128465; Delete</button>
            </div>
        </div>
    `.trim();
}

function wireFunctionalCognitiveRow(rowEl)
{
    rowEl.querySelector(".fc-code").addEventListener("click", () => {
        openCodePicker({
            onSelect: ({ code, description }) => {
                rowEl.querySelector(".fc-code").value = code;
                rowEl.querySelector(".fc-code-text").value = description || "";
            }
        });
    });

    rowEl.querySelector(".fc-add-btn").addEventListener("click", () => {
        rowEl.insertAdjacentElement("afterend", createFunctionalCognitiveRow());
    });

    rowEl.querySelector(".fc-delete-btn").addEventListener("click", async () => {
        const container = document.getElementById("functionalCognitiveRowsContainer");
        const recordId = rowEl.querySelector(".fc-record-id").value;

        if (recordId) {
            if (!confirm("Remove this item?")) {
                return;
            }

            const result = await removeFunctionalCognitiveStatusItem(recordId);

            if (!result.success) {
                showAlert("functionalCognitiveFormAlert", result.message || "Failed to remove item.", "error");
                return;
            }

            await loadFunctionalCognitiveItems();
            renderFunctionalCognitiveSection();
        }

        if (container.children.length > 1) {
            rowEl.remove();
        } else {
            document.getElementById("functionalCognitiveFormModalOverlay").classList.remove("open");
        }
    });
}

function createFunctionalCognitiveRow()
{
    const wrapper = document.createElement("div");

    wrapper.innerHTML = buildFunctionalCognitiveRowHtml(++functionalCognitiveRowSeq);

    const rowEl = wrapper.firstElementChild;

    wireFunctionalCognitiveRow(rowEl);

    return rowEl;
}

function openFunctionalCognitiveFormModal(existingRecord)
{
    const container = document.getElementById("functionalCognitiveRowsContainer");

    document.getElementById("functionalCognitiveFormAlert").innerHTML = "";
    container.innerHTML = "";

    const rowEl = createFunctionalCognitiveRow();

    container.appendChild(rowEl);

    if (existingRecord) {
        rowEl.querySelector(".fc-record-id").value = existingRecord.id;
        rowEl.querySelector(".fc-code").value = existingRecord.code || "";
        rowEl.querySelector(".fc-code-text").value = existingRecord.code_text || "";
        rowEl.querySelector(".fc-item-date").value = (existingRecord.item_date || "").slice(0, 10);
        rowEl.querySelector(".fc-for-mental-status").checked = !!Number(existingRecord.for_mental_status);
        rowEl.querySelector(".fc-description").value = existingRecord.description || "";
    }

    document.getElementById("functionalCognitiveFormModalOverlay").classList.add("open");
}

async function loadFunctionalCognitiveItems()
{
    const result = await fetchFunctionalCognitiveStatusItems(currentEncounterSummary.encounter.id);

    currentEncounterSummary.functionalCognitiveItems = result.success ? result.data : [];
}

function renderFunctionalCognitiveSection()
{
    const { sections, functionalCognitiveItems } = currentEncounterSummary;
    const section = sections.functional_cognitive_status || {};
    const locked = !!section.locked_at;
    const tbody = document.getElementById("pdFunctionalCognitiveTableBody");
    const items = functionalCognitiveItems || [];

    document.getElementById("pdEncSummaryFunctionalCognitiveTitle").textContent =
        `Functional and Cognitive Status Form${items.length && items[0].author_name ? ` (by ${items[0].author_name})` : ""}`;

    if (!items.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No items recorded.</td></tr>`;
    } else {
        tbody.innerHTML = items.map((item) => `
            <tr>
                <td>${escapeHtml(item.code || "-")}</td>
                <td>${escapeHtml(item.code_text || "-")}</td>
                <td>${escapeHtml(item.description)}</td>
                <td>${escapeHtml((item.item_date || "").slice(0, 10) || "-")}</td>
                <td>${Number(item.for_mental_status) ? "Cognitive" : "Functional"}</td>
                <td class="table-actions">
                    ${locked ? "" : `
                        <button class="btn-edit" data-edit-functional-cognitive-item="${item.id}">Edit</button>
                        <button class="btn-danger" data-remove-functional-cognitive-item="${item.id}">Delete</button>
                    `}
                </td>
            </tr>
        `).join("");

        if (!locked) {
            tbody.querySelectorAll("[data-edit-functional-cognitive-item]").forEach((btn) => {
                btn.addEventListener("click", () => {
                    const item = items.find((i) => String(i.id) === btn.getAttribute("data-edit-functional-cognitive-item"));

                    if (item) {
                        openFunctionalCognitiveFormModal(item);
                    }
                });
            });

            tbody.querySelectorAll("[data-remove-functional-cognitive-item]").forEach((btn) => {
                btn.addEventListener("click", async () => {
                    if (!confirm("Remove this item?")) {
                        return;
                    }

                    const result = await removeFunctionalCognitiveStatusItem(btn.getAttribute("data-remove-functional-cognitive-item"));

                    if (!result.success) {
                        showAlert("pdEncounterSummaryAlert", result.message || "Failed to remove item.", "error");
                        return;
                    }

                    await loadFunctionalCognitiveItems();
                    renderFunctionalCognitiveSection();
                });
            });
        }
    }

    renderLockedBadge("pdEncSummaryFunctionalCognitiveLockedBadge", section.locked_at);
    renderEsignLog("pdEncSummaryFunctionalCognitiveLog", section.signatures);
    document.getElementById("pdEncSummaryFunctionalCognitiveDeleteBtn").style.display = locked ? "none" : "";
    document.getElementById("pdFunctionalCognitiveAddBtn").style.display = locked ? "none" : "";
}

function setupFunctionalCognitiveModal()
{
    const formOverlay = document.getElementById("functionalCognitiveFormModalOverlay");
    const form = document.getElementById("functionalCognitiveForm");

    const closeForm = () => formOverlay.classList.remove("open");

    document.getElementById("pdFunctionalCognitiveAddBtn").addEventListener("click", () => {
        if (currentEncounterSummary?.encounter) {
            openFunctionalCognitiveFormModal(null);
        }
    });

    document.getElementById("closeFunctionalCognitiveFormModal").addEventListener("click", closeForm);
    document.getElementById("cancelFunctionalCognitiveForm").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", (event) => {
        if (event.target === formOverlay) {
            closeForm();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const rows = Array.from(document.querySelectorAll("#functionalCognitiveRowsContainer .functional-cognitive-row"));
        const payloads = [];

        for (let i = 0; i < rows.length; i++) {
            const rowEl = rows[i];

            const details = {
                code: rowEl.querySelector(".fc-code").value.trim() || null,
                code_text: rowEl.querySelector(".fc-code-text").value.trim() || null,
                for_mental_status: rowEl.querySelector(".fc-for-mental-status").checked,
                description: rowEl.querySelector(".fc-description").value.trim(),
                item_date: rowEl.querySelector(".fc-item-date").value || null
            };

            if (!details.description) {
                showAlert("functionalCognitiveFormAlert", `Item ${i + 1}: Description is required.`, "error");
                return;
            }

            payloads.push({ recordId: rowEl.querySelector(".fc-record-id").value, details });
        }

        if (!payloads.length) {
            closeForm();
            return;
        }

        for (const { recordId, details } of payloads) {
            const result = recordId
                ? await updateFunctionalCognitiveStatusItem(recordId, details)
                : await addFunctionalCognitiveStatusItem(currentEncounterSummary.encounter.id, details);

            if (!result.success) {
                showAlert("functionalCognitiveFormAlert", result.message || "Failed to save item.", "error");
                return;
            }
        }

        closeForm();
        await loadFunctionalCognitiveItems();
        renderFunctionalCognitiveSection();
    });
}

function buildObservationRowHtml(rowId)
{
    return `
        <div class="observation-row" data-row-id="${rowId}" style="margin-bottom: 18px; padding-bottom: 18px; border-bottom: 1px solid #eef1f7;">
            <input type="hidden" class="obs-record-id" value="">
            <input type="hidden" class="obs-code-text" value="">

            <div class="form-grid">
                <div class="form-group">
                    <label>Code:</label>
                    <input class="form-input obs-code" readonly placeholder="Click to select a code">
                </div>

                <div class="form-group">
                    <label>Description:</label>
                    <input class="form-input obs-description" placeholder="Enter observation description">
                </div>

                <div class="form-group">
                    <label>Date:</label>
                    <input type="datetime-local" class="form-input obs-item-date">
                </div>

                <div class="form-group">
                    <label>Value:</label>
                    <input class="form-input obs-value" placeholder="Enter value">
                </div>

                <div class="form-group">
                    <label>Unit:</label>
                    <input class="form-input obs-unit" placeholder="Unit">
                </div>

                <div class="form-group">
                    <label>Status:</label>
                    <select class="form-input obs-status">${carePlanOptionsHtml(OBSERVATION_STATUS_OPTIONS)}</select>
                </div>

                <div class="form-group">
                    <label>Type:</label>
                    <select class="form-input obs-type">${carePlanOptionsHtml(OBSERVATION_TYPE_OPTIONS)}</select>
                </div>
            </div>

            <div class="form-actions" style="justify-content: flex-end;">
                <button type="button" class="btn-secondary obs-add-btn">&#43; Add</button>
                <button type="button" class="btn-secondary obs-delete-btn">&#128465; Delete</button>
                <button type="button" class="btn-secondary obs-add-reason-btn">&#10035; Add Reason</button>
            </div>

            <div class="obs-reason-section" hidden>
                <hr>
                <p class="form-subtitle">Reason for Observation</p>
                <p>When recording a reason for the value (or absence of a value) of an observation both the reason code and status of the reason are required</p>

                <div class="form-grid">
                    <div class="form-group">
                        <label>Reason Code</label>
                        <input class="form-input obs-reason-code" readonly placeholder="Select a reason code">
                    </div>

                    <div class="form-group">
                        <label>Reason Status</label>
                        <select class="form-input obs-reason-status">${carePlanOptionsHtml(CARE_PLAN_REASON_STATUS_OPTIONS)}</select>
                    </div>
                </div>
            </div>
        </div>
    `.trim();
}

function wireObservationRow(rowEl)
{
    rowEl.querySelector(".obs-code").addEventListener("click", () => {
        openCodePicker({
            onSelect: ({ code, description }) => {
                rowEl.querySelector(".obs-code").value = code;
                rowEl.querySelector(".obs-code-text").value = description || "";
            }
        });
    });

    rowEl.querySelector(".obs-add-reason-btn").addEventListener("click", () => {
        const reasonSection = rowEl.querySelector(".obs-reason-section");
        reasonSection.hidden = !reasonSection.hidden;
    });

    rowEl.querySelector(".obs-reason-code").addEventListener("click", () => {
        openCarePlanReasonPicker((code) => {
            rowEl.querySelector(".obs-reason-code").value = code;
        });
    });

    rowEl.querySelector(".obs-add-btn").addEventListener("click", () => {
        rowEl.insertAdjacentElement("afterend", createObservationRow());
    });

    rowEl.querySelector(".obs-delete-btn").addEventListener("click", async () => {
        const container = document.getElementById("observationRowsContainer");
        const recordId = rowEl.querySelector(".obs-record-id").value;

        if (recordId) {
            if (!confirm("Remove this observation?")) {
                return;
            }

            const result = await removeObservationItem(recordId);

            if (!result.success) {
                showAlert("observationFormAlert", result.message || "Failed to remove item.", "error");
                return;
            }

            await loadObservationItems();
            renderObservationSection();
        }

        if (container.children.length > 1) {
            rowEl.remove();
        } else {
            document.getElementById("observationFormModalOverlay").classList.remove("open");
        }
    });
}

function createObservationRow()
{
    const wrapper = document.createElement("div");

    wrapper.innerHTML = buildObservationRowHtml(++observationRowSeq);

    const rowEl = wrapper.firstElementChild;

    wireObservationRow(rowEl);

    return rowEl;
}

function openObservationFormModal(existingRecord)
{
    const container = document.getElementById("observationRowsContainer");

    document.getElementById("observationFormAlert").innerHTML = "";
    container.innerHTML = "";

    const rowEl = createObservationRow();

    container.appendChild(rowEl);

    if (existingRecord) {
        rowEl.querySelector(".obs-record-id").value = existingRecord.id;
        rowEl.querySelector(".obs-code").value = existingRecord.code || "";
        rowEl.querySelector(".obs-code-text").value = existingRecord.code_text || "";
        rowEl.querySelector(".obs-description").value = existingRecord.description || "";
        rowEl.querySelector(".obs-item-date").value = (existingRecord.item_date || "").slice(0, 16).replace(" ", "T");
        rowEl.querySelector(".obs-value").value = existingRecord.value || "";
        rowEl.querySelector(".obs-unit").value = existingRecord.unit || "";
        rowEl.querySelector(".obs-status").value = existingRecord.status || "Preliminary";
        rowEl.querySelector(".obs-type").value = existingRecord.observation_type || "";
        rowEl.querySelector(".obs-reason-code").value = existingRecord.reason_code || "";
        rowEl.querySelector(".obs-reason-status").value = existingRecord.reason_status || "";

        if (existingRecord.reason_code || existingRecord.reason_status) {
            rowEl.querySelector(".obs-reason-section").hidden = false;
        }
    } else {
        rowEl.querySelector(".obs-status").value = "Preliminary";

        const now = new Date();
        const pad = (n) => String(n).padStart(2, "0");

        rowEl.querySelector(".obs-item-date").value =
            `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    }

    document.getElementById("observationFormModalOverlay").classList.add("open");
}

async function loadObservationItems()
{
    const result = await fetchObservationItems(currentEncounterSummary.encounter.id);

    currentEncounterSummary.observationItems = result.success ? result.data : [];
}

function renderObservationSection()
{
    const { sections, observationItems } = currentEncounterSummary;
    const section = sections.observation || {};
    const locked = !!section.locked_at;
    const tbody = document.getElementById("pdObservationTableBody");
    const items = observationItems || [];

    if (!items.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="table-empty">No observations recorded.</td></tr>`;
    } else {
        tbody.innerHTML = items.map((item) => `
            <tr>
                <td>${escapeHtml((item.item_date || "").slice(0, 16).replace("T", " "))}</td>
                <td>${escapeHtml(item.code || "-")}</td>
                <td>${escapeHtml(item.description || "-")}</td>
                <td>${escapeHtml(item.value ? `${item.value}${item.unit ? " " + item.unit : ""}` : "-")}</td>
                <td>${escapeHtml(item.status)}</td>
                <td>${escapeHtml(item.observation_type || "-")}</td>
                <td class="table-actions">
                    ${locked ? "" : `
                        <button class="btn-edit" data-edit-observation-item="${item.id}">Edit</button>
                        <button class="btn-danger" data-remove-observation-item="${item.id}">Delete</button>
                    `}
                </td>
            </tr>
        `).join("");

        if (!locked) {
            tbody.querySelectorAll("[data-edit-observation-item]").forEach((btn) => {
                btn.addEventListener("click", () => {
                    const item = items.find((i) => String(i.id) === btn.getAttribute("data-edit-observation-item"));

                    if (item) {
                        openObservationFormModal(item);
                    }
                });
            });

            tbody.querySelectorAll("[data-remove-observation-item]").forEach((btn) => {
                btn.addEventListener("click", async () => {
                    if (!confirm("Remove this observation?")) {
                        return;
                    }

                    const result = await removeObservationItem(btn.getAttribute("data-remove-observation-item"));

                    if (!result.success) {
                        showAlert("pdEncounterSummaryAlert", result.message || "Failed to remove item.", "error");
                        return;
                    }

                    await loadObservationItems();
                    renderObservationSection();
                });
            });
        }
    }

    renderLockedBadge("pdEncSummaryObservationLockedBadge", section.locked_at);
    renderEsignLog("pdEncSummaryObservationLog", section.signatures);
    document.getElementById("pdEncSummaryObservationDeleteBtn").style.display = locked ? "none" : "";
    document.getElementById("pdObservationAddBtn").style.display = locked ? "none" : "";
}

function setupObservationModal()
{
    const formOverlay = document.getElementById("observationFormModalOverlay");
    const form = document.getElementById("observationForm");

    const closeForm = () => formOverlay.classList.remove("open");

    document.getElementById("pdObservationAddBtn").addEventListener("click", () => {
        if (currentEncounterSummary?.encounter) {
            openObservationFormModal(null);
        }
    });

    document.getElementById("closeObservationFormModal").addEventListener("click", closeForm);
    document.getElementById("cancelObservationForm").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", (event) => {
        if (event.target === formOverlay) {
            closeForm();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const rows = Array.from(document.querySelectorAll("#observationRowsContainer .observation-row"));
        const payloads = [];

        for (let i = 0; i < rows.length; i++) {
            const rowEl = rows[i];
            const hasReason = !rowEl.querySelector(".obs-reason-section").hidden;
            const itemDateRaw = rowEl.querySelector(".obs-item-date").value;

            const details = {
                code: rowEl.querySelector(".obs-code").value.trim() || null,
                code_text: rowEl.querySelector(".obs-code-text").value.trim() || null,
                description: rowEl.querySelector(".obs-description").value.trim() || null,
                item_date: itemDateRaw ? `${itemDateRaw.replace("T", " ")}:00` : "",
                value: rowEl.querySelector(".obs-value").value.trim() || null,
                unit: rowEl.querySelector(".obs-unit").value.trim() || null,
                status: rowEl.querySelector(".obs-status").value || "Preliminary",
                observation_type: rowEl.querySelector(".obs-type").value || null,
                reason_code: hasReason ? (rowEl.querySelector(".obs-reason-code").value.trim() || null) : null,
                reason_status: hasReason ? (rowEl.querySelector(".obs-reason-status").value || null) : null
            };

            if (!details.item_date) {
                showAlert("observationFormAlert", `Item ${i + 1}: Date is required.`, "error");
                return;
            }

            payloads.push({ recordId: rowEl.querySelector(".obs-record-id").value, details });
        }

        if (!payloads.length) {
            closeForm();
            return;
        }

        for (const { recordId, details } of payloads) {
            const result = recordId
                ? await updateObservationItem(recordId, details)
                : await addObservationItem(currentEncounterSummary.encounter.id, details);

            if (!result.success) {
                showAlert("observationFormAlert", result.message || "Failed to save observation.", "error");
                return;
            }
        }

        closeForm();
        await loadObservationItems();
        renderObservationSection();
    });
}

function buildReviewOfSystemsFieldsHtml()
{
    return REVIEW_OF_SYSTEMS_SECTIONS.map((section) => `
        <div class="ros-section">
            <div class="ros-section-title">${escapeHtml(section.title)}</div>
            ${section.fields.map(([key, label]) => `
                <div class="ros-field-row">
                    <span class="ros-field-label">${escapeHtml(label)}:</span>
                    <label><input type="radio" name="${key}" value="na" checked> N/A</label>
                    <label><input type="radio" name="${key}" value="yes"> YES</label>
                    <label><input type="radio" name="${key}" value="no"> NO</label>
                </div>
            `).join("")}
        </div>
    `).join("");
}

function openReviewOfSystemsFormModal()
{
    document.getElementById("reviewOfSystemsFormAlert").innerHTML = "";
    document.getElementById("reviewOfSystemsFieldsContainer").innerHTML = buildReviewOfSystemsFieldsHtml();

    const data = currentEncounterSummary.reviewOfSystems || {};

    REVIEW_OF_SYSTEMS_SECTIONS.forEach((section) => {
        section.fields.forEach(([key]) => {
            const value = data[key] || "na";
            const input = document.querySelector(`input[name="${key}"][value="${value}"]`);

            if (input) {
                input.checked = true;
            }
        });
    });

    document.getElementById("reviewOfSystemsModalOverlay").classList.add("open");
}

async function loadReviewOfSystems()
{
    const result = await fetchReviewOfSystems(currentEncounterSummary.encounter.id);

    currentEncounterSummary.reviewOfSystems = result.success ? result.data : null;
}

function renderReviewOfSystemsSection()
{
    const section = currentEncounterSummary.sections.review_of_systems || {};
    const locked = !!section.locked_at;
    const data = currentEncounterSummary.reviewOfSystems;
    const container = document.getElementById("pdReviewOfSystemsFindings");

    if (!data) {
        container.innerHTML = `<p class="pd-chart-nav-empty">Not yet filled in. Click Edit to complete this form.</p>`;
    } else {
        const sectionsWithFindings = REVIEW_OF_SYSTEMS_SECTIONS
            .map((sec) => ({ title: sec.title, items: sec.fields.filter(([key]) => data[key] && data[key] !== "na") }))
            .filter((sec) => sec.items.length);

        if (!sectionsWithFindings.length) {
            container.innerHTML = `<p class="pd-chart-nav-empty">All systems reviewed, no findings recorded.</p>`;
        } else {
            container.innerHTML = sectionsWithFindings.map((sec) => `
                <p style="margin: 10px 0 4px; font-weight: 600;">${escapeHtml(sec.title)}</p>
                <p class="pd-readonly-value">${sec.items.map(([key, label]) =>
                    `${escapeHtml(label)}: ${data[key] === "yes" ? "Yes" : "No"}`
                ).join(" &middot; ")}</p>
            `).join("");
        }
    }

    renderLockedBadge("pdEncSummaryReviewOfSystemsLockedBadge", section.locked_at);
    renderEsignLog("pdEncSummaryReviewOfSystemsLog", section.signatures);
    document.getElementById("pdEncSummaryReviewOfSystemsEditBtn").style.display = locked ? "none" : "";
    document.getElementById("pdEncSummaryReviewOfSystemsDeleteBtn").style.display = locked ? "none" : "";
}

function setupReviewOfSystemsModal()
{
    const formOverlay = document.getElementById("reviewOfSystemsModalOverlay");
    const form = document.getElementById("reviewOfSystemsForm");

    const closeForm = () => formOverlay.classList.remove("open");

    document.getElementById("closeReviewOfSystemsModal").addEventListener("click", closeForm);
    document.getElementById("cancelReviewOfSystemsForm").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", (event) => {
        if (event.target === formOverlay) {
            closeForm();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const payload = {};

        REVIEW_OF_SYSTEMS_SECTIONS.forEach((section) => {
            section.fields.forEach(([key]) => {
                const checked = document.querySelector(`input[name="${key}"]:checked`);
                payload[key] = checked ? checked.value : "na";
            });
        });

        const result = await saveReviewOfSystems(currentEncounterSummary.encounter.id, payload);

        if (!result.success) {
            showAlert("reviewOfSystemsFormAlert", result.message || "Failed to save Review Of Systems.", "error");
            return;
        }

        closeForm();
        await loadReviewOfSystems();
        renderReviewOfSystemsSection();
    });
}

function buildReviewOfSystemsChecksFieldsHtml()
{
    return REVIEW_OF_SYSTEMS_CHECKS_SECTIONS.map((section) => `
        <div class="ros-section">
            <div class="ros-section-title">${escapeHtml(section.title)}</div>
            <div class="rosc-field-grid">
                ${section.fields.map(([key, label]) => `
                    <label class="rosc-field-checkbox"><input type="checkbox" name="${key}"> ${escapeHtml(label)}</label>
                `).join("")}
            </div>
        </div>
    `).join("") + `
        <div class="ros-section">
            <div class="ros-section-title">Additional Notes</div>
            <textarea class="form-input" id="reviewOfSystemsChecksNotes" style="min-height: 90px;"></textarea>
        </div>
    `;
}

function openReviewOfSystemsChecksFormModal()
{
    document.getElementById("reviewOfSystemsChecksFormAlert").innerHTML = "";
    document.getElementById("reviewOfSystemsChecksFieldsContainer").innerHTML = buildReviewOfSystemsChecksFieldsHtml();

    const data = currentEncounterSummary.reviewOfSystemsChecks || {};

    REVIEW_OF_SYSTEMS_CHECKS_SECTIONS.forEach((section) => {
        section.fields.forEach(([key]) => {
            const input = document.querySelector(`input[name="${key}"]`);

            if (input) {
                input.checked = !!Number(data[key]);
            }
        });
    });

    document.getElementById("reviewOfSystemsChecksNotes").value = data.additional_notes || "";

    document.getElementById("reviewOfSystemsChecksModalOverlay").classList.add("open");
}

async function loadReviewOfSystemsChecks()
{
    const result = await fetchReviewOfSystemsChecks(currentEncounterSummary.encounter.id);

    currentEncounterSummary.reviewOfSystemsChecks = result.success ? result.data : null;
}

function renderReviewOfSystemsChecksSection()
{
    const section = currentEncounterSummary.sections.review_of_systems_checks || {};
    const locked = !!section.locked_at;
    const data = currentEncounterSummary.reviewOfSystemsChecks;
    const container = document.getElementById("pdReviewOfSystemsChecksFindings");

    if (!data) {
        container.innerHTML = `<p class="pd-chart-nav-empty">Not yet filled in. Click Edit to complete this form.</p>`;
    } else {
        const findings = [];

        REVIEW_OF_SYSTEMS_CHECKS_SECTIONS.forEach((sec) => {
            sec.fields.forEach(([key, label]) => {
                if (Number(data[key])) {
                    findings.push(`<strong>${escapeHtml(label)}:</strong> yes`);
                }
            });
        });

        if (data.additional_notes) {
            findings.push(`<strong>Additional Notes:</strong> ${escapeHtml(data.additional_notes)}`);
        }

        container.innerHTML = findings.length
            ? `<div class="rosc-findings-grid">${findings.map((f) => `<div>${f}</div>`).join("")}</div>`
            : `<p class="pd-chart-nav-empty">No findings recorded.</p>`;
    }

    renderLockedBadge("pdEncSummaryReviewOfSystemsChecksLockedBadge", section.locked_at);
    renderEsignLog("pdEncSummaryReviewOfSystemsChecksLog", section.signatures);
    document.getElementById("pdEncSummaryReviewOfSystemsChecksEditBtn").style.display = locked ? "none" : "";
    document.getElementById("pdEncSummaryReviewOfSystemsChecksDeleteBtn").style.display = locked ? "none" : "";
}

function setupReviewOfSystemsChecksModal()
{
    const formOverlay = document.getElementById("reviewOfSystemsChecksModalOverlay");
    const form = document.getElementById("reviewOfSystemsChecksForm");

    const closeForm = () => formOverlay.classList.remove("open");

    document.getElementById("closeReviewOfSystemsChecksModal").addEventListener("click", closeForm);
    document.getElementById("cancelReviewOfSystemsChecksForm").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", (event) => {
        if (event.target === formOverlay) {
            closeForm();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const payload = {};

        REVIEW_OF_SYSTEMS_CHECKS_SECTIONS.forEach((section) => {
            section.fields.forEach(([key]) => {
                const input = document.querySelector(`input[name="${key}"]`);
                payload[key] = input ? input.checked : false;
            });
        });

        payload.additional_notes = document.getElementById("reviewOfSystemsChecksNotes").value.trim() || null;

        const result = await saveReviewOfSystemsChecks(currentEncounterSummary.encounter.id, payload);

        if (!result.success) {
            showAlert("reviewOfSystemsChecksFormAlert", result.message || "Failed to save Review of Systems Checks.", "error");
            return;
        }

        closeForm();
        await loadReviewOfSystemsChecks();
        renderReviewOfSystemsChecksSection();
    });
}

function openSoapNoteFormModal(existingRecord)
{
    document.getElementById("soapNoteFormAlert").innerHTML = "";
    document.getElementById("soap_note_record_id").value = existingRecord ? existingRecord.id : "";
    document.getElementById("soap_subjective").value = existingRecord ? (existingRecord.subjective || "") : "";
    document.getElementById("soap_objective").value = existingRecord ? (existingRecord.objective || "") : "";
    document.getElementById("soap_assessment").value = existingRecord ? (existingRecord.assessment || "") : "";
    document.getElementById("soap_plan").value = existingRecord ? (existingRecord.plan || "") : "";
    document.getElementById("soapNoteFormModalOverlay").classList.add("open");
}

function setupSoapNoteModal()
{
    const formOverlay = document.getElementById("soapNoteFormModalOverlay");
    const form = document.getElementById("soapNoteForm");

    const closeForm = () => formOverlay.classList.remove("open");

    document.getElementById("closeSoapNoteFormModal").addEventListener("click", closeForm);
    document.getElementById("cancelSoapNoteForm").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", (event) => {
        if (event.target === formOverlay) {
            closeForm();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const recordId = document.getElementById("soap_note_record_id").value;

        const details = {
            subjective: document.getElementById("soap_subjective").value.trim() || null,
            objective: document.getElementById("soap_objective").value.trim() || null,
            assessment: document.getElementById("soap_assessment").value.trim() || null,
            plan: document.getElementById("soap_plan").value.trim() || null
        };

        const result = recordId
            ? await updateSoapNote(recordId, details)
            : await addSoapNote(currentEncounterSummary.encounter.id, details);

        if (!result.success) {
            showAlert("soapNoteFormAlert", result.message || "Failed to save SOAP note.", "error");
            return;
        }

        closeForm();
        await loadSoapNotes();
        renderSoapNotesSection();
    });
}

async function loadSoapNotes()
{
    const result = await fetchSoapNotes(currentEncounterSummary.encounter.id);

    currentEncounterSummary.soapNotes = result.success ? result.data : [];
}

function renderSoapNotesSection()
{
    const container = document.getElementById("pdSoapNotesContainer");
    const notes = currentEncounterSummary.soapNotes || [];

    if (!notes.length) {
        container.innerHTML = "";
        return;
    }

    container.innerHTML = notes.map((note) => {
        const locked = !!note.locked_at;

        return `
            <div class="pd-report-card" data-soap-note-id="${note.id}">
                <div class="pd-report-card-header">
                    <h3>
                        <button type="button" class="pd-card-collapse-toggle soap-toggle" aria-label="Toggle section">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="m6 9 6 6 6-6"></path></svg>
                        </button>
                        SOAP ${note.author_name ? `(by ${escapeHtml(note.author_name)})` : ""} ${locked ? `<span class="pd-locked-badge">&#128274; Locked</span>` : ""}
                    </h3>
                    <div class="pd-report-header-actions">
                        ${locked ? "" : `<button type="button" class="pd-report-btn pd-report-btn-secondary soap-edit-btn">Edit</button>`}
                        <button type="button" class="pd-report-btn pd-report-btn-secondary soap-sign-btn">eSign</button>
                        ${locked ? "" : `<button type="button" class="pd-report-btn pd-report-btn-secondary soap-delete-btn">Delete</button>`}
                    </div>
                </div>
                <div class="pd-report-card-body soap-card-body">
                    <p><strong>Subjective:</strong> ${escapeHtml(note.subjective || "-")}</p>
                    <p><strong>Objective:</strong> ${escapeHtml(note.objective || "-")}</p>
                    <p><strong>Assessment:</strong> ${escapeHtml(note.assessment || "-")}</p>
                    <p><strong>Plan:</strong> ${escapeHtml(note.plan || "-")}</p>

                    <div class="pd-esign-log-wrap">
                        <table class="data-table pd-esign-log-table">
                            <thead><tr><th>Signer</th><th>Role</th><th>Amendment</th><th>Signed At</th></tr></thead>
                            <tbody>
                                ${note.signatures && note.signatures.length
                                    ? note.signatures.map((sig) => `
                                        <tr>
                                            <td>${escapeHtml(sig.signer_name)}</td>
                                            <td>${escapeHtml(sig.signer_role || "-")}</td>
                                            <td>${sig.amendment ? `<em>${escapeHtml(sig.amendment)}</em>` : "-"}</td>
                                            <td>${escapeHtml((sig.signed_at || "").slice(0, 16).replace("T", " "))}</td>
                                        </tr>
                                    `).join("")
                                    : `<tr><td colspan="4" class="table-empty">No signatures on file</td></tr>`
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }).join("");

    container.querySelectorAll(".soap-toggle").forEach((btn) => {
        btn.addEventListener("click", () => {
            const body = btn.closest(".pd-report-card").querySelector(".soap-card-body");
            body.classList.toggle("collapsed");
            btn.classList.toggle("collapsed");
        });
    });

    container.querySelectorAll(".soap-edit-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const noteId = btn.closest("[data-soap-note-id]").getAttribute("data-soap-note-id");
            const note = notes.find((n) => String(n.id) === noteId);

            if (note) {
                openSoapNoteFormModal(note);
            }
        });
    });

    container.querySelectorAll(".soap-sign-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const noteId = btn.closest("[data-soap-note-id]").getAttribute("data-soap-note-id");
            openSoapEsignModal(noteId);
        });
    });

    container.querySelectorAll(".soap-delete-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const noteId = btn.closest("[data-soap-note-id]").getAttribute("data-soap-note-id");

            if (!confirm("Remove this SOAP note?")) {
                return;
            }

            const result = await removeSoapNote(noteId);

            if (!result.success) {
                showAlert("pdEncounterSummaryAlert", result.message || "Failed to remove SOAP note.", "error");
                return;
            }

            await loadSoapNotes();
            renderSoapNotesSection();
        });
    });
}

function openSpeechDictationFormModal(existingRecord)
{
    document.getElementById("speechDictationFormAlert").innerHTML = "";
    document.getElementById("speech_dictation_record_id").value = existingRecord ? existingRecord.id : "";
    document.getElementById("speech_dictation_text").value = existingRecord ? (existingRecord.dictation || "") : "";
    document.getElementById("speech_dictation_notes").value = existingRecord ? (existingRecord.additional_notes || "") : "";
    document.getElementById("speechDictationFormModalOverlay").classList.add("open");
}

function setupSpeechDictationModal()
{
    const formOverlay = document.getElementById("speechDictationFormModalOverlay");
    const form = document.getElementById("speechDictationForm");

    const closeForm = () => formOverlay.classList.remove("open");

    document.getElementById("pdSpeechDictationAddBtn").addEventListener("click", () => {
        if (currentEncounterSummary?.encounter) {
            openSpeechDictationFormModal(null);
        }
    });

    document.getElementById("closeSpeechDictationFormModal").addEventListener("click", closeForm);
    document.getElementById("cancelSpeechDictationForm").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", (event) => {
        if (event.target === formOverlay) {
            closeForm();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const recordId = document.getElementById("speech_dictation_record_id").value;
        const dictation = document.getElementById("speech_dictation_text").value.trim();

        if (!dictation) {
            showAlert("speechDictationFormAlert", "Dictation is required.", "error");
            return;
        }

        const details = {
            dictation,
            additional_notes: document.getElementById("speech_dictation_notes").value.trim() || null
        };

        const result = recordId
            ? await updateSpeechDictationItem(recordId, details)
            : await addSpeechDictationItem(currentEncounterSummary.encounter.id, details);

        if (!result.success) {
            showAlert("speechDictationFormAlert", result.message || "Failed to save dictation.", "error");
            return;
        }

        closeForm();
        await loadSpeechDictationItems();
        renderSpeechDictationSection();
    });
}

async function loadSpeechDictationItems()
{
    const result = await fetchSpeechDictationItems(currentEncounterSummary.encounter.id);

    currentEncounterSummary.speechDictationItems = result.success ? result.data : [];
}

function renderSpeechDictationSection()
{
    const { sections, speechDictationItems } = currentEncounterSummary;
    const section = sections.speech_dictation || {};
    const locked = !!section.locked_at;
    const tbody = document.getElementById("pdSpeechDictationTableBody");
    const items = speechDictationItems || [];

    if (!items.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No dictations recorded.</td></tr>`;
    } else {
        tbody.innerHTML = items.map((item) => `
            <tr>
                <td>${escapeHtml(item.author_name)}</td>
                <td>${escapeHtml(item.dictation || "-")}</td>
                <td>${escapeHtml(item.additional_notes || "-")}</td>
                <td>${escapeHtml((item.updated_at || item.created_at || "").slice(0, 16).replace("T", " "))}</td>
                <td class="table-actions">
                    ${locked ? "" : `
                        <button class="btn-edit" data-edit-speech-dictation-item="${item.id}">Edit</button>
                        <button class="btn-danger" data-remove-speech-dictation-item="${item.id}">Delete</button>
                    `}
                </td>
            </tr>
        `).join("");

        if (!locked) {
            tbody.querySelectorAll("[data-edit-speech-dictation-item]").forEach((btn) => {
                btn.addEventListener("click", () => {
                    const item = items.find((i) => String(i.id) === btn.getAttribute("data-edit-speech-dictation-item"));

                    if (item) {
                        openSpeechDictationFormModal(item);
                    }
                });
            });

            tbody.querySelectorAll("[data-remove-speech-dictation-item]").forEach((btn) => {
                btn.addEventListener("click", async () => {
                    if (!confirm("Remove this dictation?")) {
                        return;
                    }

                    const result = await removeSpeechDictationItem(btn.getAttribute("data-remove-speech-dictation-item"));

                    if (!result.success) {
                        showAlert("pdEncounterSummaryAlert", result.message || "Failed to remove item.", "error");
                        return;
                    }

                    await loadSpeechDictationItems();
                    renderSpeechDictationSection();
                });
            });
        }
    }

    renderLockedBadge("pdEncSummarySpeechDictationLockedBadge", section.locked_at);
    renderEsignLog("pdEncSummarySpeechDictationLog", section.signatures);
    document.getElementById("pdEncSummarySpeechDictationDeleteBtn").style.display = locked ? "none" : "";
    document.getElementById("pdSpeechDictationAddBtn").style.display = locked ? "none" : "";
}

function setupClinicalNoteDocumentPicker()
{
    const overlay = document.getElementById("clinicalNoteDocumentPickerModalOverlay");
    const close = () => overlay.classList.remove("open");

    document.getElementById("closeClinicalNoteDocumentPickerModal").addEventListener("click", close);
    document.getElementById("cancelClinicalNoteDocPicker").addEventListener("click", close);
    document.getElementById("addSelectedClinicalNoteDocs").addEventListener("click", close);
    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
            close();
        }
    });

    document.getElementById("clinicalNoteDocSearchBtn").addEventListener("click", () => {
        document.getElementById("clinicalNoteDocResultsBody").innerHTML =
            `<tr><td class="table-empty">No documents found matching your criteria.</td></tr>`;
    });
}

function openClinicalNoteDocumentPicker()
{
    document.getElementById("clinicalNoteDocSearchName").value = "";
    document.getElementById("clinicalNoteDocSearchType").value = "";
    document.getElementById("clinicalNoteDocSearchFromDate").value = "";
    document.getElementById("clinicalNoteDocResultsBody").innerHTML =
        `<tr><td class="table-empty">No documents found matching your criteria.</td></tr>`;
    document.getElementById("clinicalNoteDocumentPickerModalOverlay").classList.add("open");
}

function setupClinicalNoteResultPicker()
{
    const overlay = document.getElementById("clinicalNoteResultPickerModalOverlay");
    const close = () => overlay.classList.remove("open");

    document.getElementById("closeClinicalNoteResultPickerModal").addEventListener("click", close);
    document.getElementById("cancelClinicalNoteResultPicker").addEventListener("click", close);
    document.getElementById("addSelectedClinicalNoteResults").addEventListener("click", close);
    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
            close();
        }
    });

    document.getElementById("clinicalNoteResultSearchBtn").addEventListener("click", () => {
        document.getElementById("clinicalNoteResultResultsBody").innerHTML =
            `<tr><td class="table-empty">No procedure results found matching your criteria.</td></tr>`;
    });
}

function openClinicalNoteResultPicker()
{
    document.getElementById("clinicalNoteResultSearchName").value = "";
    document.getElementById("clinicalNoteResultSearchFromDate").value = "";
    document.getElementById("clinicalNoteResultResultsBody").innerHTML =
        `<tr><td class="table-empty">No procedure results found matching your criteria.</td></tr>`;
    document.getElementById("clinicalNoteResultPickerModalOverlay").classList.add("open");
}

function setupPrescriptionModals()
{
    const detailOverlay = document.getElementById("prescriptionDetailModalOverlay");
    const formOverlay = document.getElementById("prescriptionFormModalOverlay");
    const form = document.getElementById("prescriptionForm");
    const catalogSelect = document.getElementById("prescription_catalog_id");

    const closeDetail = () => detailOverlay.classList.remove("open");
    const closeForm = () => formOverlay.classList.remove("open");

    document.getElementById("pdPrescriptionsAddBtn").addEventListener("click", () => {
        if (currentDashboardPatient) {
            openPrescriptionDetailModal(currentDashboardPatient);
        }
    });

    document.getElementById("closePrescriptionDetailModal").addEventListener("click", closeDetail);
    detailOverlay.addEventListener("click", (event) => {
        if (event.target === detailOverlay) {
            closeDetail();
        }
    });

    document.getElementById("prescriptionMoreToggle").addEventListener("click", (event) => {
        const toggle = event.currentTarget;
        const moreFields = document.getElementById("prescriptionMoreFields");
        const isHidden = moreFields.hidden;

        moreFields.hidden = !isHidden;
        toggle.classList.toggle("expanded", isHidden);
        toggle.querySelector("span").textContent = isHidden ? "Hide More Fields" : "Show More Fields";
    });

    document.getElementById("openAddPrescriptionBtn").addEventListener("click", () => {
        openPrescriptionFormModal(null);
    });

    document.getElementById("openSelectCodesBtnPrescription").addEventListener("click", () => {
        openSelectCodesModal("prescription_coding");
    });

    catalogSelect.addEventListener("change", () => {
        const selectedOption = catalogSelect.options[catalogSelect.selectedIndex];

        if (catalogSelect.value && selectedOption) {
            document.getElementById("prescription_title").value = selectedOption.textContent;
        }
    });

    document.getElementById("closePrescriptionFormModal").addEventListener("click", closeForm);
    document.getElementById("cancelPrescriptionForm").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", (event) => {
        if (event.target === formOverlay) {
            closeForm();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const recordId = document.getElementById("prescription_record_id").value;
        const catalogId = catalogSelect.value;
        const errEl = document.getElementById("err-prescription_title");

        errEl.textContent = "";

        const details = {};

        PRESCRIPTION_DETAIL_FIELDS.forEach((field) => {
            if (field === "substitution_allowed") {
                return;
            }

            details[field] = document.getElementById(`prescription_${field}`).value.trim();
        });

        details.substitution_allowed = document.querySelector('input[name="prescription_substitution_allowed"]:checked').value;

        if (!details.title) {
            errEl.textContent = "Title is required.";
            return;
        }

        const result = recordId
            ? await updatePatientPrescription(recordId, details)
            : await addPatientPrescription(currentDashboardPatient.id, catalogId || null, details);

        if (!result.success) {
            showAlert("prescriptionFormAlert", result.message || "Failed to save prescription.", "error");
            return;
        }

        closeForm();
        await loadPrescriptionDetailTable(currentDashboardPatient);
        await loadDashboardPrescriptions(currentDashboardPatient);
    });
}

async function openPrescriptionDetailModal(patient)
{
    document.getElementById("prescriptionDetailAlert").innerHTML = "";
    document.getElementById("prescriptionDetailModalOverlay").classList.add("open");

    const canManage = ["admin", "receptionist", "doctor"].includes(getUser()?.role);
    const addBtn = document.getElementById("openAddPrescriptionBtn");

    addBtn.style.display = canManage ? "" : "none";

    await loadPrescriptionDetailTable(patient);
}

async function loadPrescriptionDetailTable(patient)
{
    const tbody = document.getElementById("prescriptionDetailTableBody");

    try {
        const result = await fetchPatientPrescriptions(patient.id);

        if (!result.success) {
            tbody.innerHTML = `<tr><td colspan="5" class="table-empty">${escapeHtml(result.message || "Unable to load prescriptions.")}</td></tr>`;
            return;
        }

        renderPrescriptionDetailTable(patient, result.data);
    } catch (error) {
        console.error("Failed to load patient prescriptions", error);
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Unable to load prescriptions right now. Please try again.</td></tr>`;
    }
}

function renderPrescriptionDetailTable(patient, prescriptions)
{
    const tbody = document.getElementById("prescriptionDetailTableBody");
    const canManage = ["admin", "receptionist", "doctor"].includes(getUser()?.role);

    if (!prescriptions.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No prescriptions recorded for this patient.</td></tr>`;
        return;
    }

    tbody.innerHTML = prescriptions.map((prescription) => {
        const isActive = !prescription.end_date;

        return `
        <tr>
            <td>${escapeHtml(prescription.title)}</td>
            <td>${escapeHtml(prescription.dosage || "-")}</td>
            <td><span class="status-badge ${isActive ? "completed" : "cancelled"}">${isActive ? "Active" : "Inactive"}</span></td>
            <td>${escapeHtml((prescription.updated_at || prescription.created_at || "").slice(0, 10))}</td>
            <td class="table-actions">
                ${canManage
                    ? `<button class="btn-edit" data-edit-prescription="${prescription.id}">Edit</button>
                       <button class="btn-danger" data-remove-prescription="${prescription.id}">Delete</button>`
                    : ""}
            </td>
        </tr>
    `;
    }).join("");

    if (!canManage) {
        return;
    }

    tbody.querySelectorAll("[data-edit-prescription]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const prescription = prescriptions.find((p) => String(p.id) === btn.getAttribute("data-edit-prescription"));

            if (prescription) {
                openPrescriptionFormModal(prescription);
            }
        });
    });

    tbody.querySelectorAll("[data-remove-prescription]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this prescription record?")) {
                return;
            }

            const result = await removePatientPrescription(btn.getAttribute("data-remove-prescription"));

            if (!result.success) {
                showAlert("prescriptionDetailAlert", result.message || "Failed to remove prescription.", "error");
                return;
            }

            await loadPrescriptionDetailTable(currentDashboardPatient);
            await loadDashboardPrescriptions(currentDashboardPatient);
        });
    });
}

async function openPrescriptionFormModal(existingRecord)
{
    const formOverlay = document.getElementById("prescriptionFormModalOverlay");
    const title = document.getElementById("prescriptionFormTitle");
    const recordIdInput = document.getElementById("prescription_record_id");
    const catalogSelect = document.getElementById("prescription_catalog_id");

    document.getElementById("prescriptionFormAlert").innerHTML = "";
    document.getElementById("prescriptionForm").reset();
    document.getElementById("err-prescription_title").textContent = "";

    const moreToggle = document.getElementById("prescriptionMoreToggle");
    const moreFields = document.getElementById("prescriptionMoreFields");

    moreFields.hidden = true;
    moreToggle.classList.remove("expanded");
    moreToggle.querySelector("span").textContent = "Show More Fields";

    const catalogResult = await fetchMedications();
    const catalog = catalogResult.success ? catalogResult.data : [];

    catalogSelect.innerHTML = `<option value="">Custom / type your own...</option>` +
        catalog.map((medication) => `<option value="${medication.id}">${escapeHtml(medication.name)}</option>`).join("");

    if (existingRecord) {
        title.textContent = "Edit Prescription";
        recordIdInput.value = existingRecord.id;
        catalogSelect.value = existingRecord.medication_id ?? "";
        catalogSelect.disabled = true;

        PRESCRIPTION_DETAIL_FIELDS.forEach((field) => {
            if (field === "substitution_allowed") {
                return;
            }

            document.getElementById(`prescription_${field}`).value = existingRecord[field] ?? "";
        });

        document.getElementById(
            Number(existingRecord.substitution_allowed) ? "prescription_substitution_allowed_yes" : "prescription_substitution_allowed_no"
        ).checked = true;

        const secondaryFields = ["coding", "occurrence", "outcome", "classification_type", "referred_by", "destination"];

        if (secondaryFields.some((field) => existingRecord[field])) {
            moreFields.hidden = false;
            moreToggle.classList.add("expanded");
            moreToggle.querySelector("span").textContent = "Hide More Fields";
        }
    } else {
        title.textContent = "Add Prescription";
        recordIdInput.value = "";
        catalogSelect.disabled = false;
        document.getElementById("prescription_verification_status").value = "Unconfirmed";
        document.getElementById("prescription_substitution_allowed_yes").checked = true;
    }

    formOverlay.classList.add("open");
}

const DISCLOSURE_DETAIL_FIELDS = ["disclosure_date", "disclosure_type", "recipient", "description"];

function setupDisclosureModals()
{
    const detailOverlay = document.getElementById("disclosureDetailModalOverlay");
    const formOverlay = document.getElementById("disclosureFormModalOverlay");
    const form = document.getElementById("disclosureForm");

    const closeDetail = () => detailOverlay.classList.remove("open");
    const closeForm = () => formOverlay.classList.remove("open");

    document.getElementById("pdDisclosuresAddBtn").addEventListener("click", () => {
        if (currentDashboardPatient) {
            openDisclosureDetailModal(currentDashboardPatient);
        }
    });

    document.getElementById("closeDisclosureDetailModal").addEventListener("click", closeDetail);
    detailOverlay.addEventListener("click", (event) => {
        if (event.target === detailOverlay) {
            closeDetail();
        }
    });

    document.getElementById("openAddDisclosureBtn").addEventListener("click", () => {
        openDisclosureFormModal(null);
    });

    document.getElementById("closeDisclosureFormModal").addEventListener("click", closeForm);
    document.getElementById("cancelDisclosureForm").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", (event) => {
        if (event.target === formOverlay) {
            closeForm();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const recordId = document.getElementById("disclosure_record_id").value;
        const errEl = document.getElementById("err-disclosure_recipient");

        errEl.textContent = "";

        const details = {};

        DISCLOSURE_DETAIL_FIELDS.forEach((field) => {
            details[field] = document.getElementById(`disclosure_${field}`).value.trim();
        });

        if (!details.recipient) {
            errEl.textContent = "Recipient is required.";
            return;
        }

        const result = recordId
            ? await updateDisclosure(recordId, details)
            : await addDisclosure(currentDashboardPatient.id, details);

        if (!result.success) {
            showAlert("disclosureFormAlert", result.message || "Failed to save disclosure.", "error");
            return;
        }

        closeForm();
        await loadDisclosureDetailTable(currentDashboardPatient);
        await loadDashboardDisclosures(currentDashboardPatient);
    });
}

async function openDisclosureDetailModal(patient)
{
    document.getElementById("disclosureDetailAlert").innerHTML = "";
    document.getElementById("disclosureDetailModalOverlay").classList.add("open");

    await loadDisclosureDetailTable(patient);
}

async function loadDisclosureDetailTable(patient)
{
    const tbody = document.getElementById("disclosureDetailTableBody");

    try {
        const result = await fetchPatientDisclosures(patient.id);

        if (!result.success) {
            tbody.innerHTML = `<tr><td colspan="5" class="table-empty">${escapeHtml(result.message || "Unable to load disclosures.")}</td></tr>`;
            return;
        }

        renderDisclosureDetailTable(result.data);
    } catch (error) {
        console.error("Failed to load patient disclosures", error);
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Unable to load disclosures right now. Please try again.</td></tr>`;
    }
}

function renderDisclosureDetailTable(disclosures)
{
    const tbody = document.getElementById("disclosureDetailTableBody");

    if (!disclosures.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No disclosures recorded for this patient.</td></tr>`;
        return;
    }

    tbody.innerHTML = disclosures.map((disclosure) => `
        <tr>
            <td>${escapeHtml((disclosure.disclosure_date || "").slice(0, 10) || "-")}</td>
            <td>${escapeHtml(disclosure.disclosure_type || "-")}</td>
            <td>${escapeHtml(disclosure.recipient)}</td>
            <td>${escapeHtml(disclosure.provider_name || "-")}</td>
            <td class="table-actions">
                <button class="btn-edit" data-edit-disclosure="${disclosure.id}">Edit</button>
                <button class="btn-danger" data-remove-disclosure="${disclosure.id}">Delete</button>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-disclosure]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const disclosure = disclosures.find((d) => String(d.id) === btn.getAttribute("data-edit-disclosure"));

            if (disclosure) {
                openDisclosureFormModal(disclosure);
            }
        });
    });

    tbody.querySelectorAll("[data-remove-disclosure]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this disclosure record?")) {
                return;
            }

            const result = await removeDisclosure(btn.getAttribute("data-remove-disclosure"));

            if (!result.success) {
                showAlert("disclosureDetailAlert", result.message || "Failed to remove disclosure.", "error");
                return;
            }

            await loadDisclosureDetailTable(currentDashboardPatient);
            await loadDashboardDisclosures(currentDashboardPatient);
        });
    });
}

function openDisclosureFormModal(existingRecord)
{
    const formOverlay = document.getElementById("disclosureFormModalOverlay");
    const title = document.getElementById("disclosureFormTitle");
    const recordIdInput = document.getElementById("disclosure_record_id");

    document.getElementById("disclosureFormAlert").innerHTML = "";
    document.getElementById("disclosureForm").reset();
    document.getElementById("err-disclosure_recipient").textContent = "";

    if (existingRecord) {
        title.textContent = "Edit Disclosure";
        recordIdInput.value = existingRecord.id;
        document.getElementById("disclosure_disclosure_date").value = (existingRecord.disclosure_date || "").slice(0, 10);
        document.getElementById("disclosure_disclosure_type").value = existingRecord.disclosure_type || "Treatment";
        document.getElementById("disclosure_recipient").value = existingRecord.recipient || "";
        document.getElementById("disclosure_description").value = existingRecord.description || "";
    } else {
        title.textContent = "Record Disclosure";
        recordIdInput.value = "";
        document.getElementById("disclosure_disclosure_type").value = "Treatment";
    }

    formOverlay.classList.add("open");
}

const AMENDMENT_DETAIL_FIELDS = ["requested_date", "requested_by", "description", "status", "comments"];

function setupAmendmentModals()
{
    const detailOverlay = document.getElementById("amendmentDetailModalOverlay");
    const formOverlay = document.getElementById("amendmentFormModalOverlay");
    const form = document.getElementById("amendmentForm");

    const closeDetail = () => detailOverlay.classList.remove("open");
    const closeForm = () => formOverlay.classList.remove("open");

    document.getElementById("pdAmendmentsAddBtn").addEventListener("click", () => {
        if (currentDashboardPatient) {
            openAmendmentDetailModal(currentDashboardPatient);
        }
    });

    document.getElementById("closeAmendmentDetailModal").addEventListener("click", closeDetail);
    detailOverlay.addEventListener("click", (event) => {
        if (event.target === detailOverlay) {
            closeDetail();
        }
    });

    document.getElementById("openAddAmendmentBtn").addEventListener("click", () => {
        openAmendmentFormModal(null);
    });

    document.getElementById("closeAmendmentFormModal").addEventListener("click", closeForm);
    document.getElementById("cancelAmendmentForm").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", (event) => {
        if (event.target === formOverlay) {
            closeForm();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const recordId = document.getElementById("amendment_record_id").value;
        const errEl = document.getElementById("err-amendment_description");

        errEl.textContent = "";

        const details = {};

        AMENDMENT_DETAIL_FIELDS.forEach((field) => {
            details[field] = document.getElementById(`amendment_${field}`).value.trim();
        });

        if (!details.description) {
            errEl.textContent = "Request description is required.";
            return;
        }

        const result = recordId
            ? await updateAmendment(recordId, details)
            : await addAmendment(currentDashboardPatient.id, details);

        if (!result.success) {
            showAlert("amendmentFormAlert", result.message || "Failed to save amendment request.", "error");
            return;
        }

        closeForm();
        await loadAmendmentDetailTable(currentDashboardPatient);
        await loadDashboardAmendments(currentDashboardPatient);
    });
}

async function openAmendmentDetailModal(patient)
{
    document.getElementById("amendmentDetailAlert").innerHTML = "";
    document.getElementById("amendmentDetailModalOverlay").classList.add("open");

    await loadAmendmentDetailTable(patient);
}

async function loadAmendmentDetailTable(patient)
{
    const tbody = document.getElementById("amendmentDetailTableBody");

    try {
        const result = await fetchPatientAmendments(patient.id);

        if (!result.success) {
            tbody.innerHTML = `<tr><td colspan="5" class="table-empty">${escapeHtml(result.message || "Unable to load amendments.")}</td></tr>`;
            return;
        }

        renderAmendmentDetailTable(result.data);
    } catch (error) {
        console.error("Failed to load patient amendments", error);
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Unable to load amendments right now. Please try again.</td></tr>`;
    }
}

function renderAmendmentDetailTable(amendments)
{
    const tbody = document.getElementById("amendmentDetailTableBody");

    if (!amendments.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No amendment requests available.</td></tr>`;
        return;
    }

    tbody.innerHTML = amendments.map((amendment) => `
        <tr>
            <td>${escapeHtml((amendment.requested_date || "").slice(0, 10) || "-")}</td>
            <td>${escapeHtml(amendment.description)}</td>
            <td>${escapeHtml(amendment.requested_by || "-")}</td>
            <td>${escapeHtml(amendment.status || "Pending")}</td>
            <td class="table-actions">
                <button class="btn-edit" data-edit-amendment="${amendment.id}">Edit</button>
                <button class="btn-danger" data-remove-amendment="${amendment.id}">Delete</button>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-amendment]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const amendment = amendments.find((a) => String(a.id) === btn.getAttribute("data-edit-amendment"));

            if (amendment) {
                openAmendmentFormModal(amendment);
            }
        });
    });

    tbody.querySelectorAll("[data-remove-amendment]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this amendment request?")) {
                return;
            }

            const result = await removeAmendment(btn.getAttribute("data-remove-amendment"));

            if (!result.success) {
                showAlert("amendmentDetailAlert", result.message || "Failed to remove amendment request.", "error");
                return;
            }

            await loadAmendmentDetailTable(currentDashboardPatient);
            await loadDashboardAmendments(currentDashboardPatient);
        });
    });
}

function openAmendmentFormModal(existingRecord)
{
    const formOverlay = document.getElementById("amendmentFormModalOverlay");
    const title = document.getElementById("amendmentFormTitle");
    const recordIdInput = document.getElementById("amendment_record_id");

    document.getElementById("amendmentFormAlert").innerHTML = "";
    document.getElementById("amendmentForm").reset();
    document.getElementById("err-amendment_description").textContent = "";

    if (existingRecord) {
        title.textContent = "Edit Amendment";
        recordIdInput.value = existingRecord.id;
        document.getElementById("amendment_requested_date").value = (existingRecord.requested_date || "").slice(0, 10);
        document.getElementById("amendment_requested_by").value = existingRecord.requested_by || "Patient";
        document.getElementById("amendment_description").value = existingRecord.description || "";
        document.getElementById("amendment_status").value = existingRecord.status || "";
        document.getElementById("amendment_comments").value = existingRecord.comments || "";
    } else {
        title.textContent = "Add Amendment";
        recordIdInput.value = "";
        document.getElementById("amendment_requested_date").value = new Date().toISOString().slice(0, 10);
        document.getElementById("amendment_requested_by").value = "Patient";
        document.getElementById("amendment_status").value = "";
    }

    formOverlay.classList.add("open");
}

let encounterCatalogsLoaded = false;
let encounterVisitCategories = [];
let encounterClasses = [];
let encounterVisitTypes = [];
let encounterProviders = [];
let encounterFacilities = [];
let encounterDischargeDispositions = [];
let encounterLinkableIssues = [];

const ENCOUNTER_DETAIL_FIELDS = [
    "visit_category_id", "class_id", "visit_type_id", "sensitivity",
    "encounter_provider_id", "referring_provider_id", "facility_id",
    "billing_facility_id", "onset_date", "in_collection", "discharge_disposition_id",
    "reason_for_visit"
];

const ENCOUNTER_ISSUE_TAGS = {
    allergy: "A",
    problem: "P",
    medication: "M",
    health_concern: "H"
};

let encounterBillingCodesDraft = [];

function setupEncounterModals()
{
    const detailOverlay = document.getElementById("encounterDetailModalOverlay");
    const formOverlay = document.getElementById("encounterFormModalOverlay");
    const form = document.getElementById("encounterForm");

    const closeDetail = () => detailOverlay.classList.remove("open");
    const closeForm = () => formOverlay.classList.remove("open");

    document.getElementById("pdEncountersAddBtn").addEventListener("click", () => {
        if (currentDashboardPatient) {
            openEncounterDetailModal(currentDashboardPatient);
        }
    });

    document.getElementById("pdNewEncounterBtn").addEventListener("click", () => {
        triggerCreateVisit();
    });

    document.getElementById("closeEncounterDetailModal").addEventListener("click", closeDetail);
    detailOverlay.addEventListener("click", (event) => {
        if (event.target === detailOverlay) {
            closeDetail();
        }
    });

    document.getElementById("openAddEncounterBtn").addEventListener("click", () => {
        openEncounterFormModal(null);
    });

    document.getElementById("addEncounterBillingCodeBtn").addEventListener("click", () => {
        openCodePicker({
            defaultType: "CPT4",
            onSelect: ({ code, description, code_type, fee }) => {
                encounterBillingCodesDraft.push({ code, description, code_type, fee });
                renderEncounterBillingCodesList();
            }
        });
    });

    document.getElementById("closeEncounterFormModal").addEventListener("click", closeForm);
    document.getElementById("cancelEncounterForm").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", (event) => {
        if (event.target === formOverlay) {
            closeForm();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        document.getElementById("encounterFormAlert").innerHTML = "";

        const recordId = document.getElementById("encounter_record_id").value;
        const categoryErrEl = document.getElementById("err-encounter_visit_category_id");
        const dateErrEl = document.getElementById("err-encounter_date_of_service");

        categoryErrEl.textContent = "";
        dateErrEl.textContent = "";

        const details = {};

        ENCOUNTER_DETAIL_FIELDS.forEach((field) => {
            details[field] = document.getElementById(`encounter_${field}`).value;
        });

        const dateOfServiceRaw = document.getElementById("encounter_date_of_service").value;

        details.date_of_service = dateOfServiceRaw ? `${dateOfServiceRaw.replace("T", " ")}:00` : "";

        if (!details.visit_category_id) {
            categoryErrEl.textContent = "Visit category is required.";
            showAlert("encounterFormAlert", "Visit category is required.", "error");
            return;
        }

        if (!details.date_of_service) {
            dateErrEl.textContent = "Date of service is required.";
            showAlert("encounterFormAlert", "Date of service is required.", "error");
            return;
        }

        const issues = Array.from(document.querySelectorAll("#encounterIssuesList input[type=checkbox]:checked"))
            .map((box) => ({ issue_type: box.dataset.issueType, issue_id: Number(box.value) }));

        const result = recordId
            ? await updateEncounter(recordId, details, issues, encounterBillingCodesDraft)
            : await addEncounter(currentDashboardPatient.id, details, issues, encounterBillingCodesDraft);

        if (!result.success) {
            showAlert("encounterFormAlert", result.message || "Failed to save encounter.", "error");
            return;
        }

        closeForm();

        const savedEncounterId = recordId || result.data?.id;

        await loadEncounterDetailTable(currentDashboardPatient);
        await loadDashboardEncounters(currentDashboardPatient);
        await loadVisitHistoryList(currentDashboardPatient);

        const savedEncounter = savedEncounterId
            ? visitHistoryEncounters.find((e) => String(e.id) === String(savedEncounterId))
            : null;

        if (savedEncounter) {
            showChartSection("encounter");
            openEncounterSummary(savedEncounter);
        }
    });
}

async function openEncounterDetailModal(patient)
{
    document.getElementById("encounterDetailAlert").innerHTML = "";
    document.getElementById("encounterDetailModalOverlay").classList.add("open");

    await loadEncounterDetailTable(patient);
}

async function loadDashboardEncounters(patient)
{
    const body = document.getElementById("pdEncountersBody");

    if (!body) {
        return;
    }

    try {
        const result = await fetchPatientEncounters(patient.id);

        renderDashboardEncounters(result.success ? result.data : []);
    } catch (error) {
        console.error("Failed to load encounters", error);
        body.innerHTML = `<div class="pd-widget-empty"><p>Unable to load visits right now.</p></div>`;
    }
}

async function loadEncounterDetailTable(patient)
{
    const tbody = document.getElementById("encounterDetailTableBody");

    try {
        const result = await fetchPatientEncounters(patient.id);

        if (!result.success) {
            tbody.innerHTML = `<tr><td colspan="5" class="table-empty">${escapeHtml(result.message || "Unable to load visits.")}</td></tr>`;
            return;
        }

        renderEncounterDetailTable(result.data);
    } catch (error) {
        console.error("Failed to load patient encounters", error);
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Unable to load visits right now. Please try again.</td></tr>`;
    }
}

function renderEncounterDetailTable(encounters)
{
    const tbody = document.getElementById("encounterDetailTableBody");

    if (!encounters.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No visits recorded for this patient.</td></tr>`;
        return;
    }

    tbody.innerHTML = encounters.map((encounter) => `
        <tr>
            <td>${escapeHtml((encounter.date_of_service || "").slice(0, 16).replace("T", " "))}</td>
            <td>${escapeHtml(encounter.visit_category_name || "-")}</td>
            <td>${escapeHtml(encounter.encounter_provider_name || "-")}</td>
            <td>${escapeHtml(encounter.facility_name || "-")}</td>
            <td class="table-actions">
                <button class="btn-edit" data-edit-encounter="${encounter.id}">Edit</button>
                <button class="btn-danger" data-remove-encounter="${encounter.id}">Delete</button>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-encounter]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const encounter = encounters.find((e) => String(e.id) === btn.getAttribute("data-edit-encounter"));

            if (encounter) {
                openEncounterFormModal(encounter);
            }
        });
    });

    tbody.querySelectorAll("[data-remove-encounter]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this visit record?")) {
                return;
            }

            const result = await removeEncounter(btn.getAttribute("data-remove-encounter"));

            if (!result.success) {
                showAlert("encounterDetailAlert", result.message || "Failed to remove visit.", "error");
                return;
            }

            await loadEncounterDetailTable(currentDashboardPatient);
            await loadDashboardEncounters(currentDashboardPatient);
            await loadVisitHistoryList(currentDashboardPatient);
        });
    });
}

async function loadEncounterCatalogsIfNeeded()
{
    if (encounterCatalogsLoaded) {
        return;
    }

    const [categoriesResult, classesResult, typesResult, providersResult, facilitiesResult, dispositionsResult] = await Promise.all([
        fetchVisitCategories(),
        fetchClasses(),
        fetchVisitTypes(),
        fetchProviders(),
        fetchFacilities(),
        fetchDischargeDispositions()
    ]);

    encounterVisitCategories = categoriesResult.success ? categoriesResult.data : [];
    encounterClasses = classesResult.success ? classesResult.data : [];
    encounterVisitTypes = typesResult.success ? typesResult.data : [];
    encounterProviders = providersResult.success ? providersResult.data : [];
    encounterFacilities = facilitiesResult.success ? facilitiesResult.data : [];
    encounterDischargeDispositions = dispositionsResult.success ? dispositionsResult.data : [];
    encounterCatalogsLoaded = true;
}

function fillEncounterSelect(selectId, items, labelFn, placeholder)
{
    const select = document.getElementById(selectId);
    const current = select.value;

    select.innerHTML = `<option value="">${placeholder}</option>` +
        items.map((item) => `<option value="${item.id}">${escapeHtml(labelFn(item))}</option>`).join("");

    select.value = current;
}

function providerLabel(provider)
{
    return `${provider.first_name} ${provider.last_name}${provider.specialty ? ` — ${provider.specialty}` : ""}`;
}

async function openEncounterFormModal(existingRecord)
{
    document.getElementById("encounterFormAlert").innerHTML = "";
    document.getElementById("encounterForm").reset();
    document.getElementById("err-encounter_visit_category_id").textContent = "";
    document.getElementById("err-encounter_date_of_service").textContent = "";

    await loadEncounterCatalogsIfNeeded();

    fillEncounterSelect("encounter_visit_category_id", encounterVisitCategories, (c) => c.name, "-- Select One --");
    fillEncounterSelect("encounter_class_id", encounterClasses, (c) => c.name, "-- Select One --");
    fillEncounterSelect("encounter_visit_type_id", encounterVisitTypes, (t) => t.type, "-- Select One --");
    fillEncounterSelect("encounter_encounter_provider_id", encounterProviders, providerLabel, "-- Select One --");
    fillEncounterSelect(
        "encounter_referring_provider_id", encounterProviders, providerLabel,
        encounterProviders.length ? "-- Select One --" : "No available providers"
    );
    fillEncounterSelect("encounter_facility_id", encounterFacilities, (f) => f.name, "-- Select One --");
    fillEncounterSelect("encounter_billing_facility_id", encounterFacilities, (f) => f.name, "-- Select One --");
    fillEncounterSelect("encounter_discharge_disposition_id", encounterDischargeDispositions, (d) => d.name, "-- Select One --");

    const issuesResult = await fetchLinkableIssues(currentDashboardPatient.id);

    encounterLinkableIssues = issuesResult.success ? issuesResult.data : [];

    const linkedKeys = existingRecord && existingRecord.linked_issues
        ? existingRecord.linked_issues.split(",")
        : [];

    renderEncounterIssuesList(linkedKeys);

    encounterBillingCodesDraft = existingRecord && existingRecord.billing_codes_summary
        ? existingRecord.billing_codes_summary.split("||").map((entry) => {
            const parts = entry.split(":");
            return { code_type: parts[0], code: parts[1], description: parts.slice(2).join(":"), fee: null };
        })
        : [];

    renderEncounterBillingCodesList();

    const title = document.getElementById("encounterFormTitle");
    const recordIdInput = document.getElementById("encounter_record_id");

    if (existingRecord) {
        title.textContent = "Edit Encounter";
        recordIdInput.value = existingRecord.id;

        document.getElementById("encounter_visit_category_id").value = existingRecord.visit_category_id ?? "";
        document.getElementById("encounter_class_id").value = existingRecord.class_id ?? "";
        document.getElementById("encounter_visit_type_id").value = existingRecord.visit_type_id ?? "";
        document.getElementById("encounter_sensitivity").value = existingRecord.sensitivity || "normal";
        document.getElementById("encounter_encounter_provider_id").value = existingRecord.encounter_provider_id ?? "";
        document.getElementById("encounter_referring_provider_id").value = existingRecord.referring_provider_id ?? "";
        document.getElementById("encounter_facility_id").value = existingRecord.facility_id ?? "";
        document.getElementById("encounter_billing_facility_id").value = existingRecord.billing_facility_id ?? "";
        document.getElementById("encounter_date_of_service").value = (existingRecord.date_of_service || "").slice(0, 16).replace(" ", "T");
        document.getElementById("encounter_onset_date").value = (existingRecord.onset_date || "").slice(0, 10);
        document.getElementById("encounter_in_collection").value = Number(existingRecord.in_collection) ? "1" : "0";
        document.getElementById("encounter_discharge_disposition_id").value = existingRecord.discharge_disposition_id ?? "";
        document.getElementById("encounter_reason_for_visit").value = existingRecord.reason_for_visit || "";
    } else {
        title.textContent = "New Encounter Form";
        recordIdInput.value = "";
        document.getElementById("encounter_sensitivity").value = "normal";
        document.getElementById("encounter_in_collection").value = "0";

        const now = new Date();
        const pad = (n) => String(n).padStart(2, "0");

        document.getElementById("encounter_date_of_service").value =
            `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    }

    document.getElementById("encounterFormModalOverlay").classList.add("open");
}

function renderEncounterIssuesList(linkedKeys)
{
    const container = document.getElementById("encounterIssuesList");

    if (!encounterLinkableIssues.length) {
        container.innerHTML = `<p class="pd-chart-nav-empty">No allergies, problems, medications, or health concerns recorded yet.</p>`;
        return;
    }

    container.innerHTML = encounterLinkableIssues.map((issue) => {
        const key = `${issue.issue_type}:${issue.issue_id}`;
        const checked = linkedKeys.includes(key) ? "checked" : "";
        const tag = ENCOUNTER_ISSUE_TAGS[issue.issue_type] || "?";

        return `
        <label class="encounter-issue-item">
            <input type="checkbox" value="${issue.issue_id}" data-issue-type="${issue.issue_type}" ${checked}>
            <span class="encounter-issue-tag">${tag}</span>
            <span>${escapeHtml(issue.label)}</span>
        </label>
        `;
    }).join("");
}

function renderEncounterBillingCodesList()
{
    const container = document.getElementById("encounterBillingCodesList");

    if (!encounterBillingCodesDraft.length) {
        container.innerHTML = `<p class="pd-chart-nav-empty">No billing codes attached yet.</p>`;
        return;
    }

    container.innerHTML = encounterBillingCodesDraft.map((entry, index) => `
        <div class="encounter-issue-item">
            <strong>${escapeHtml(entry.code_type)}</strong>
            <span>${escapeHtml(entry.code)}${entry.description ? " - " + escapeHtml(entry.description) : ""}</span>
            <button type="button" class="btn-danger" data-remove-billing-code="${index}" style="margin-left: auto;">&times;</button>
        </div>
    `).join("");

    container.querySelectorAll("[data-remove-billing-code]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const index = Number(btn.getAttribute("data-remove-billing-code"));
            encounterBillingCodesDraft.splice(index, 1);
            renderEncounterBillingCodesList();
        });
    });
}

let visitHistoryEncounters = [];
let visitHistoryIssueLookup = {};
let visitHistoryInsuranceLabel = "-";
let visitHistoryViewMode = "history";

function setupVisitHistoryPanel()
{
    document.getElementById("pdVisitHistoryNewBtn").addEventListener("click", () => {
        openEncounterFormModal(null);
    });

    document.getElementById("pdVisitHistoryToggleViewBtn").addEventListener("click", (event) => {
        visitHistoryViewMode = visitHistoryViewMode === "history" ? "billing" : "history";
        event.currentTarget.textContent = visitHistoryViewMode === "history" ? "To Billing View" : "To Clinical View";
        renderVisitHistoryTable();
    });

    document.getElementById("pdVisitHistoryPrintBtn").addEventListener("click", () => {
        printVisitHistoryTable(currentDashboardPatient);
    });

    setupBillingNoteModal();
}

function setupBillingNoteModal()
{
    const modalOverlay = document.getElementById("billingNoteModalOverlay");
    const form = document.getElementById("billingNoteForm");

    const closeModal = () => modalOverlay.classList.remove("open");

    document.getElementById("closeBillingNoteModal").addEventListener("click", closeModal);
    document.getElementById("cancelBillingNote").addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const encounterId = document.getElementById("billing_note_encounter_id").value;
        const note = document.getElementById("billing_note_text").value.trim();

        const result = await updateEncounterBillingNote(encounterId, note);

        if (!result.success) {
            showAlert("billingNoteFormAlert", result.message || "Failed to save billing note.", "error");
            return;
        }

        const encounter = visitHistoryEncounters.find((e) => String(e.id) === String(encounterId));

        if (encounter) {
            encounter.billing_note = note || null;
        }

        closeModal();
        renderVisitHistoryTable();
    });
}

function openBillingNoteModal(encounter)
{
    document.getElementById("billingNoteFormAlert").innerHTML = "";
    document.getElementById("billing_note_encounter_id").value = encounter.id;
    document.getElementById("billing_note_text").value = encounter.billing_note || "";
    document.getElementById("billingNoteModalOverlay").classList.add("open");
}

async function loadVisitHistoryList(patient)
{
    const tbody = document.getElementById("pdVisitHistoryTableBody");

    try {
        const [encountersResult, issuesResult, insurancesResult] = await Promise.all([
            fetchPatientEncounters(patient.id),
            fetchLinkableIssues(patient.id),
            fetchPatientInsurances(patient.id)
        ]);

        visitHistoryEncounters = encountersResult.success ? encountersResult.data : [];

        visitHistoryIssueLookup = {};
        (issuesResult.success ? issuesResult.data : []).forEach((issue) => {
            visitHistoryIssueLookup[`${issue.issue_type}:${issue.issue_id}`] = issue.label;
        });

        const insurances = insurancesResult.success ? insurancesResult.data : [];
        const primaryInsurance = insurances.find((i) => i.insurance_type === "primary") || insurances[0];
        visitHistoryInsuranceLabel = primaryInsurance ? `${primaryInsurance.insurance_type}: ${primaryInsurance.insurance_name}` : "-";

        renderVisitHistoryTable();
    } catch (error) {
        console.error("Failed to load visit history", error);
        tbody.innerHTML = `<tr><td colspan="6" class="table-empty">Unable to load visit history right now. Please try again.</td></tr>`;
    }
}

function formatEncounterIssues(linkedIssues)
{
    if (!linkedIssues) {
        return "-";
    }

    return linkedIssues.split(",").map((key) => {
        const [issueType] = key.split(":");
        const tag = ENCOUNTER_ISSUE_TAGS[issueType] || "?";
        const label = visitHistoryIssueLookup[key] || key;

        return `${tag}: ${escapeHtml(label)}`;
    }).join("<br>");
}

function formatEncounterBillingCodes(summary)
{
    if (!summary) {
        return "-";
    }

    return summary.split("||").map((entry) => {
        const parts = entry.split(":");
        const codeType = parts[0];
        const code = parts[1];
        const description = parts.slice(2).join(":");

        return escapeHtml(`${codeType} - ${code}${description ? " - " + description : ""}`);
    }).join("<br>");
}

function renderVisitHistoryTable()
{
    const thead = document.getElementById("pdVisitHistoryTableHead");
    const tbody = document.getElementById("pdVisitHistoryTableBody");

    if (visitHistoryViewMode === "history") {
        thead.innerHTML = `
            <tr>
                <th>Date</th>
                <th>Issue</th>
                <th>Reason/Form</th>
                <th>Provider</th>
                <th>Billing</th>
                <th>Insurance</th>
            </tr>
        `;
    } else {
        thead.innerHTML = `
            <tr>
                <th>Date</th>
                <th>Billing Note</th>
                <th>Code</th>
                <th>Chg</th>
                <th>Paid</th>
                <th>Adj</th>
                <th>Bal</th>
                <th>Insurance</th>
            </tr>
        `;
    }

    if (!visitHistoryEncounters.length) {
        const colspan = visitHistoryViewMode === "history" ? 6 : 8;
        tbody.innerHTML = `<tr><td colspan="${colspan}" class="table-empty">No visits recorded for this patient.</td></tr>`;
        return;
    }

    tbody.innerHTML = visitHistoryEncounters.map((encounter) => {
        const date = escapeHtml(formatDateTime(encounter.date_of_service));
        const provider = escapeHtml(encounter.encounter_provider_name || "-");
        const billing = formatEncounterBillingCodes(encounter.billing_codes_summary);
        const insurance = escapeHtml(visitHistoryInsuranceLabel);

        if (visitHistoryViewMode === "history") {
            const issues = formatEncounterIssues(encounter.linked_issues);
            const reason = escapeHtml(encounter.reason_for_visit || "-");

            return `
                <tr data-open-encounter-summary="${encounter.id}" style="cursor: pointer;">
                    <td>${date}</td>
                    <td>${issues}</td>
                    <td>${reason}</td>
                    <td>${provider}</td>
                    <td>${billing}</td>
                    <td>${insurance}</td>
                </tr>
            `;
        }

        const chg = encounter.billing_fee_total ? formatCurrency(encounter.billing_fee_total) : "-";
        const noteButton = encounter.billing_note
            ? `<button type="button" class="btn-edit" data-billing-note-id="${encounter.id}">${escapeHtml(truncateText(encounter.billing_note, 40))}</button>`
            : `<button type="button" class="btn-primary-inline" data-billing-note-id="${encounter.id}">+ Add</button>`;

        return `
            <tr>
                <td>${date}</td>
                <td>${noteButton}</td>
                <td style="color: #16a34a;">${billing}</td>
                <td>${chg}</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td>${insurance}</td>
            </tr>
        `;
    }).join("");

    if (visitHistoryViewMode === "billing") {
        tbody.querySelectorAll("[data-billing-note-id]").forEach((btn) => {
            btn.addEventListener("click", () => {
                const encounter = visitHistoryEncounters.find((e) => String(e.id) === btn.getAttribute("data-billing-note-id"));

                if (encounter) {
                    openBillingNoteModal(encounter);
                }
            });
        });
    }

    if (visitHistoryViewMode === "history") {
        tbody.querySelectorAll("[data-open-encounter-summary]").forEach((row) => {
            row.addEventListener("click", () => {
                const encounter = visitHistoryEncounters.find((e) => String(e.id) === row.getAttribute("data-open-encounter-summary"));

                if (encounter) {
                    openEncounterSummary(encounter);
                }
            });
        });
    }
}

function formatCurrency(value)
{
    return Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function truncateText(text, maxLength)
{
    return text.length > maxLength ? text.slice(0, maxLength - 1) + "…" : text;
}

function printVisitHistoryTable(patient)
{
    const reportWindow = window.open("", "_blank", "width=900,height=800,scrollbars=yes");

    if (!reportWindow) {
        alert("Please enable pop-ups to print this page.");
        return;
    }

    const fullName = patient
        ? [patient.first_name, patient.middle_name, patient.last_name, patient.suffix].filter(Boolean).join(" ")
        : "";

    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Visit History</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #222; }
        h2 { margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 14px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 12.5px; vertical-align: top; }
        th { background: #f4f6f9; }
        ${CCD_PRINT_BUTTON_STYLE}
    </style>
</head>
<body>
    ${CCD_PRINT_BUTTON_HTML}
    <h2>Visit History</h2>
    <p>${escapeHtml(fullName)}${patient?.birthdate ? ` &mdash; DOB: ${escapeHtml(patient.birthdate)}` : ""}</p>
    <table>
        ${document.getElementById("pdVisitHistoryTableHead").outerHTML}
        <tbody>${document.getElementById("pdVisitHistoryTableBody").innerHTML}</tbody>
    </table>
</body>
</html>
    `;

    reportWindow.document.open();
    reportWindow.document.write(html);
    reportWindow.document.close();
}

let currentEncounterSummary = null;

function openEncounterSummary(encounter)
{
    document.getElementById("pdVisitHistoryPanel").style.display = "none";
    document.getElementById("pdEncounterSummaryPanel").style.display = "block";
    loadEncounterSummary(encounter);
}

function backToVisitHistory()
{
    document.getElementById("pdEncounterSummaryPanel").style.display = "none";
    document.getElementById("pdVisitHistoryPanel").style.display = "block";
}

async function loadEncounterSummary(encounter)
{
    document.getElementById("pdEncounterSummaryAlert").innerHTML = "";
    document.getElementById("pdEncounterSwitchLoadingOverlay").classList.add("open");

    try {
        const [
            sectionsResult, vitalsResult, carePlanResult, clinicalInstructionsResult, clinicalNotesResult,
            miscBillingResult, functionalCognitiveResult, observationResult, reviewOfSystemsResult,
            reviewOfSystemsChecksResult, soapNotesResult, speechDictationResult
        ] = await Promise.all([
            fetchEncounterSections(encounter.id),
            fetchEncounterVitals(encounter.id),
            fetchCarePlanItems(encounter.id),
            fetchClinicalInstructionItems(encounter.id),
            fetchClinicalNoteItems(encounter.id),
            fetchEncounterMiscBillingOptions(encounter.id),
            fetchFunctionalCognitiveStatusItems(encounter.id),
            fetchObservationItems(encounter.id),
            fetchReviewOfSystems(encounter.id),
            fetchReviewOfSystemsChecks(encounter.id),
            fetchSoapNotes(encounter.id),
            fetchSpeechDictationItems(encounter.id)
        ]);

        const sectionsByType = {};

        (sectionsResult.success ? sectionsResult.data : []).forEach((section) => {
            sectionsByType[section.section_type] = section;
        });

        currentEncounterSummary = {
            encounter,
            sections: sectionsByType,
            vitals: vitalsResult.success ? vitalsResult.data : null,
            carePlanItems: carePlanResult.success ? carePlanResult.data : [],
            clinicalInstructionItems: clinicalInstructionsResult.success ? clinicalInstructionsResult.data : [],
            clinicalNoteItems: clinicalNotesResult.success ? clinicalNotesResult.data : [],
            miscBillingOptions: miscBillingResult.success ? miscBillingResult.data : null,
            functionalCognitiveItems: functionalCognitiveResult.success ? functionalCognitiveResult.data : [],
            observationItems: observationResult.success ? observationResult.data : [],
            reviewOfSystems: reviewOfSystemsResult.success ? reviewOfSystemsResult.data : null,
            reviewOfSystemsChecks: reviewOfSystemsChecksResult.success ? reviewOfSystemsChecksResult.data : null,
            soapNotes: soapNotesResult.success ? soapNotesResult.data : [],
            speechDictationItems: speechDictationResult.success ? speechDictationResult.data : []
        };

        renderEncounterSummary();
    } finally {
        document.getElementById("pdEncounterSwitchLoadingOverlay").classList.remove("open");
    }
}

async function loadCarePlanItems()
{
    const result = await fetchCarePlanItems(currentEncounterSummary.encounter.id);

    currentEncounterSummary.carePlanItems = result.success ? result.data : [];
}

function renderEncounterSummary()
{
    const { encounter } = currentEncounterSummary;
    const patientName = currentDashboardPatient
        ? [currentDashboardPatient.first_name, currentDashboardPatient.last_name].filter(Boolean).join(" ")
        : "";

    document.getElementById("pdEncounterSummaryTitle").textContent =
        `${formatDate(encounter.date_of_service)} Encounter for ${patientName}`;

    renderVisitSummarySection();
    renderCarePlanSection();
    renderClinicalInstructionsSection();
    renderClinicalNotesSection();
    renderVitalsSection();
    renderMiscBillingOptionsSection();
    renderFunctionalCognitiveSection();
    renderObservationSection();
    renderReviewOfSystemsSection();
    renderReviewOfSystemsChecksSection();
    renderSoapNotesSection();
    renderSpeechDictationSection();
}

function renderLockedBadge(badgeId, lockedAt)
{
    document.getElementById(badgeId).style.display = lockedAt ? "inline-flex" : "none";
}

function renderEsignLog(tbodyId, signatures)
{
    const tbody = document.getElementById(tbodyId);

    if (!signatures || !signatures.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="table-empty">No signatures yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = signatures.map((sig) => `
        <tr>
            <td>${escapeHtml(sig.signer_name)}</td>
            <td>${escapeHtml(sig.signer_role || "-")}</td>
            <td>${sig.amendment ? `<em>${escapeHtml(sig.amendment)}</em>` : "-"}</td>
            <td>${escapeHtml((sig.signed_at || "").slice(0, 16).replace("T", " "))}</td>
        </tr>
    `).join("");
}

function renderVisitSummarySection()
{
    const { encounter, sections } = currentEncounterSummary;
    const section = sections.visit_summary || {};
    const locked = !!section.locked_at;

    document.getElementById("pdEncSummaryVisitSummaryBody").innerHTML = `
        <p><strong>${escapeHtml(encounter.visit_category_name || "Visit")}</strong></p>
        <p>Reason For Visit - ${escapeHtml(encounter.reason_for_visit || "-")}</p>
        <p>${escapeHtml(encounter.encounter_provider_name || "-")}${encounter.facility_name ? ` (${escapeHtml(encounter.facility_name)})` : ""}</p>
        <p>Referring Provider - ${escapeHtml(encounter.referring_provider_name || "-")}</p>
    `;

    renderLockedBadge("pdEncSummaryVisitSummaryLockedBadge", section.locked_at);
    renderEsignLog("pdEncSummaryVisitSummaryLog", section.signatures);
    document.getElementById("pdEncSummaryVisitSummaryDeleteBtn").style.display = locked ? "none" : "";
}

function renderCarePlanSection()
{
    const { sections, carePlanItems } = currentEncounterSummary;
    const section = sections.care_plan || {};
    const locked = !!section.locked_at;
    const tbody = document.getElementById("pdCarePlanTableBody");

    if (!carePlanItems.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="table-empty">No care plan items recorded.</td></tr>`;
    } else {
        tbody.innerHTML = carePlanItems.map((item) => `
            <tr>
                <td>${escapeHtml(item.author_name)}</td>
                <td>${escapeHtml(item.item_type)}</td>
                <td>${escapeHtml(item.code || "-")}</td>
                <td>${escapeHtml(item.code_text || "-")}</td>
                <td>${escapeHtml(item.description)}</td>
                <td>${escapeHtml((item.item_date || "").slice(0, 16).replace("T", " "))}</td>
                <td class="table-actions">
                    ${locked ? "" : `
                        <button class="btn-edit" data-edit-care-plan-item="${item.id}">Edit</button>
                        <button class="btn-danger" data-remove-care-plan-item="${item.id}">Delete</button>
                    `}
                </td>
            </tr>
        `).join("");

        if (!locked) {
            tbody.querySelectorAll("[data-edit-care-plan-item]").forEach((btn) => {
                btn.addEventListener("click", () => {
                    const item = carePlanItems.find((i) => String(i.id) === btn.getAttribute("data-edit-care-plan-item"));

                    if (item) {
                        openCarePlanFormModal(item);
                    }
                });
            });

            tbody.querySelectorAll("[data-remove-care-plan-item]").forEach((btn) => {
                btn.addEventListener("click", async () => {
                    if (!confirm("Remove this care plan item?")) {
                        return;
                    }

                    const result = await removeCarePlanItem(btn.getAttribute("data-remove-care-plan-item"));

                    if (!result.success) {
                        showAlert("pdEncounterSummaryAlert", result.message || "Failed to remove item.", "error");
                        return;
                    }

                    await loadCarePlanItems();
                    renderCarePlanSection();
                });
            });
        }
    }

    renderLockedBadge("pdEncSummaryCarePlanLockedBadge", section.locked_at);
    renderEsignLog("pdEncSummaryCarePlanLog", section.signatures);
    document.getElementById("pdEncSummaryCarePlanDeleteBtn").style.display = locked ? "none" : "";
    document.getElementById("pdCarePlanAddBtn").style.display = locked ? "none" : "";
}

function renderClinicalInstructionsSection()
{
    const { sections, clinicalInstructionItems } = currentEncounterSummary;
    const section = sections.clinical_instructions || {};
    const locked = !!section.locked_at;
    const tbody = document.getElementById("pdClinicalInstructionsTableBody");
    const items = clinicalInstructionItems || [];

    if (!items.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="table-empty">No clinical instructions recorded.</td></tr>`;
    } else {
        tbody.innerHTML = items.map((item) => `
            <tr>
                <td>${escapeHtml(item.author_name)}</td>
                <td>${escapeHtml(item.instructions)}</td>
                <td>${escapeHtml((item.item_date || "").slice(0, 16).replace("T", " "))}</td>
                <td class="table-actions">
                    ${locked ? "" : `
                        <button class="btn-edit" data-edit-clinical-instruction-item="${item.id}">Edit</button>
                        <button class="btn-danger" data-remove-clinical-instruction-item="${item.id}">Delete</button>
                    `}
                </td>
            </tr>
        `).join("");

        if (!locked) {
            tbody.querySelectorAll("[data-edit-clinical-instruction-item]").forEach((btn) => {
                btn.addEventListener("click", () => {
                    const item = items.find((i) => String(i.id) === btn.getAttribute("data-edit-clinical-instruction-item"));

                    if (item) {
                        openClinicalInstructionsFormModal(item);
                    }
                });
            });

            tbody.querySelectorAll("[data-remove-clinical-instruction-item]").forEach((btn) => {
                btn.addEventListener("click", async () => {
                    if (!confirm("Remove this clinical instruction?")) {
                        return;
                    }

                    const result = await removeClinicalInstructionItem(btn.getAttribute("data-remove-clinical-instruction-item"));

                    if (!result.success) {
                        showAlert("pdEncounterSummaryAlert", result.message || "Failed to remove item.", "error");
                        return;
                    }

                    await loadClinicalInstructionItems();
                    renderClinicalInstructionsSection();
                });
            });
        }
    }

    renderLockedBadge("pdEncSummaryClinicalInstructionsLockedBadge", section.locked_at);
    renderEsignLog("pdEncSummaryClinicalInstructionsLog", section.signatures);
    document.getElementById("pdEncSummaryClinicalInstructionsDeleteBtn").style.display = locked ? "none" : "";
    document.getElementById("pdClinicalInstructionsAddBtn").style.display = locked ? "none" : "";
}

function renderVitalsSection()
{
    const section = currentEncounterSummary.sections.vitals || {};
    const locked = !!section.locked_at;
    const data = currentEncounterSummary.vitals;
    const tbody = document.getElementById("pdVitalsHistoryTableBody");

    const rows = VITALS_FIELDS.map((field) => {
        let value = "-";

        if (data) {
            const raw = data[field.key];
            value = (raw !== null && raw !== undefined && raw !== "") ? raw : "-";
        }

        return `<tr><td>${escapeHtml(field.label)}</td><td>${escapeHtml(field.unit)}</td><td>${escapeHtml(String(value))}</td></tr>`;
    });

    rows.push(`<tr><td>BMI</td><td>kg/m^2</td><td>${escapeHtml(data?.bmi ?? "-")}</td></tr>`);
    rows.push(`<tr><td>BMI Status</td><td>Type</td><td>${escapeHtml(data?.bmi_status ?? "-")}</td></tr>`);
    rows.push(`<tr><td>Other Notes</td><td>-</td><td>${escapeHtml(data?.other_notes || "-")}</td></tr>`);

    tbody.innerHTML = rows.join("");

    renderLockedBadge("pdEncSummaryVitalsLockedBadge", section.locked_at);
    renderEsignLog("pdEncSummaryVitalsLog", section.signatures);
    document.getElementById("pdEncSummaryVitalsDeleteBtn").style.display = locked ? "none" : "";
    document.getElementById("pdEncSummaryVitalsEditBtn").style.display = locked ? "none" : "";
}

function buildVitalsFieldsHtml()
{
    return VITALS_FIELDS.map((field) => {
        if (field.type === "select") {
            return `
                <tr>
                    <td>${escapeHtml(field.label)} <span class="pd-readonly-value" style="display:inline;">(LOINC:${field.loinc})</span></td>
                    <td></td>
                    <td colspan="2">
                        <select class="form-input" id="vitals_${field.key}">
                            <option value="">-- Select --</option>
                            ${field.options.map((opt) => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join("")}
                        </select>
                    </td>
                </tr>
            `;
        }

        return `
            <tr>
                <td>${escapeHtml(field.label)} <span class="pd-readonly-value" style="display:inline;">(LOINC:${field.loinc})</span></td>
                <td>${escapeHtml(field.unit)}</td>
                <td><input type="number" step="0.01" class="form-input" id="vitals_${field.key}"></td>
                <td>
                    <select class="form-input" id="vitals_${field.key}_abn">
                        <option value="">-- Select --</option>
                        ${VITALS_ABN_OPTIONS.map((opt) => `<option value="${opt}">${opt}</option>`).join("")}
                    </select>
                </td>
            </tr>
        `;
    }).join("");
}

function openVitalsFormModal()
{
    document.getElementById("vitalsFormAlert").innerHTML = "";
    document.getElementById("vitalsFieldsContainer").innerHTML = buildVitalsFieldsHtml();

    const data = currentEncounterSummary.vitals || {};

    VITALS_FIELDS.forEach((field) => {
        if (field.type === "select") {
            document.getElementById(`vitals_${field.key}`).value = data[field.key] || "";
            return;
        }

        document.getElementById(`vitals_${field.key}`).value = data[field.key] ?? "";
        document.getElementById(`vitals_${field.key}_abn`).value = data[`${field.key}_abn`] || "";
    });

    document.getElementById("vitals_other_notes").value = data.other_notes || "";

    document.getElementById("vitalsFormModalOverlay").classList.add("open");
}

function setupVitalsModal()
{
    const formOverlay = document.getElementById("vitalsFormModalOverlay");
    const form = document.getElementById("vitalsForm");

    const closeForm = () => formOverlay.classList.remove("open");

    document.getElementById("closeVitalsFormModal").addEventListener("click", closeForm);
    document.getElementById("cancelVitalsForm").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", (event) => {
        if (event.target === formOverlay) {
            closeForm();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const payload = {};

        VITALS_FIELDS.forEach((field) => {
            if (field.type === "select") {
                payload[field.key] = document.getElementById(`vitals_${field.key}`).value || null;
                return;
            }

            payload[field.key] = document.getElementById(`vitals_${field.key}`).value || null;
            payload[`${field.key}_abn`] = document.getElementById(`vitals_${field.key}_abn`).value || null;
        });

        payload.other_notes = document.getElementById("vitals_other_notes").value.trim() || null;

        const result = await saveEncounterVitals(currentEncounterSummary.encounter.id, payload);

        if (!result.success) {
            showAlert("vitalsFormAlert", result.message || "Failed to save vitals.", "error");
            return;
        }

        closeForm();
        currentEncounterSummary.vitals = result.data;
        renderVitalsSection();
    });
}

function renderMiscBillingOptionsSection()
{
    const { encounter, miscBillingOptions } = currentEncounterSummary;
    const section = currentEncounterSummary.sections.misc_billing_options || {};
    const locked = !!section.locked_at;
    const data = miscBillingOptions || {};
    const yesNo = (value) => value === "yes" ? "Yes" : value === "no" ? "No" : "-";

    document.getElementById("pdEncSummaryMiscBillingTitle").textContent =
        `Misc Billing Options${data.author_name ? ` (by ${data.author_name})` : ""}`;
    document.getElementById("pdMiscBilling_employment_related").textContent = yesNo(data.employment_related);
    document.getElementById("pdMiscBilling_other_accident").textContent = yesNo(data.other_accident);
    document.getElementById("pdMiscBilling_onset_date_qualifier").textContent = data.onset_date_qualifier || "-";
    document.getElementById("pdMiscBilling_epsdt").textContent = Number(data.epsdt) ? "Yes" : "No";
    document.getElementById("pdEncSummaryMiscBillingSummary").textContent = `Encounter: ${encounter.id}`;

    renderLockedBadge("pdEncSummaryMiscBillingLockedBadge", section.locked_at);
    renderEsignLog("pdEncSummaryMiscBillingLog", section.signatures);
    document.getElementById("pdEncSummaryMiscBillingEditBtn").style.display = locked ? "none" : "";
    document.getElementById("pdEncSummaryMiscBillingDeleteBtn").style.display = locked ? "none" : "";
}

const SECTION_LABELS = {
    visit_summary: "Visit Summary",
    care_plan: "Care Plan Form",
    clinical_instructions: "Clinical Instructions",
    clinical_notes: "Clinical Notes Form",
    vitals: "Vitals",
    misc_billing_options: "Misc Billing Options",
    functional_cognitive_status: "Functional and Cognitive Status Form",
    observation: "Observation Form",
    review_of_systems: "Review Of Systems Form",
    review_of_systems_checks: "Review of Systems Checks",
    speech_dictation: "Speech Dictation Form"
};

const CARD_KEYS = [
    "VisitSummary", "CarePlan", "ClinicalInstructions", "ClinicalNotes", "Vitals", "MiscBilling",
    "FunctionalCognitive", "Observation", "ReviewOfSystems", "ReviewOfSystemsChecks", "SpeechDictation"
];

let pendingDeleteSectionType = null;
let pendingDeleteEncounter = false;

function openDeleteSectionModal(sectionType)
{
    pendingDeleteSectionType = sectionType;
    pendingDeleteEncounter = false;
    document.getElementById("deleteSectionAlert").innerHTML = "";
    document.querySelector("#deleteSectionModalOverlay .modal-header h2").textContent = "Delete Encounter Form";
    document.getElementById("deleteSectionMessage").innerHTML =
        `You are about to delete the following form from this encounter: <strong id="deleteSectionName">${escapeHtml(SECTION_LABELS[sectionType] || sectionType)}</strong>`;
    document.getElementById("deleteSectionModalOverlay").classList.add("open");
}

function openDeleteEncounterModal()
{
    pendingDeleteSectionType = null;
    pendingDeleteEncounter = true;
    document.getElementById("deleteSectionAlert").innerHTML = "";
    document.querySelector("#deleteSectionModalOverlay .modal-header h2").textContent = "Delete Encounter";
    document.getElementById("deleteSectionMessage").textContent =
        "You are about to delete this entire encounter, including all of its forms. This cannot be undone.";
    document.getElementById("deleteSectionModalOverlay").classList.add("open");
}

function setupDeleteSectionModal()
{
    const modalOverlay = document.getElementById("deleteSectionModalOverlay");

    const closeModal = () => {
        modalOverlay.classList.remove("open");
        pendingDeleteSectionType = null;
        pendingDeleteEncounter = false;
    };

    document.getElementById("closeDeleteSectionModal").addEventListener("click", closeModal);
    document.getElementById("cancelDeleteSection").addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    document.getElementById("confirmDeleteSectionBtn").addEventListener("click", async () => {
        if (pendingDeleteEncounter) {
            const result = await removeEncounter(currentEncounterSummary.encounter.id);

            if (!result.success) {
                showAlert("deleteSectionAlert", result.message || "Failed to delete encounter.", "error");
                return;
            }

            closeModal();
            backToVisitHistory();

            if (currentDashboardPatient) {
                await loadVisitHistoryList(currentDashboardPatient);
            }

            return;
        }

        if (!pendingDeleteSectionType) {
            return;
        }

        const result = await deleteEncounterSection(currentEncounterSummary.encounter.id, pendingDeleteSectionType);

        if (!result.success) {
            showAlert("deleteSectionAlert", result.message || "Failed to delete section.", "error");
            return;
        }

        closeModal();
        await loadEncounterSummary(currentEncounterSummary.encounter);
    });
}

function toggleEncounterSummaryCard(cardKey, collapsed)
{
    document.getElementById(`pdEncSummary${cardKey}CardBody`).classList.toggle("collapsed", collapsed);
    document.getElementById(`pdEncSummary${cardKey}Toggle`).classList.toggle("collapsed", collapsed);
}

function setupCollapsibleCards()
{
    CARD_KEYS.forEach((key) => {
        document.getElementById(`pdEncSummary${key}Toggle`).addEventListener("click", () => {
            const body = document.getElementById(`pdEncSummary${key}CardBody`);
            toggleEncounterSummaryCard(key, !body.classList.contains("collapsed"));
        });
    });

    document.getElementById("pdEncSummaryCollapseAllBtn").addEventListener("click", () => {
        CARD_KEYS.forEach((key) => toggleEncounterSummaryCard(key, true));
    });

    document.getElementById("pdEncSummaryExpandAllBtn").addEventListener("click", () => {
        CARD_KEYS.forEach((key) => toggleEncounterSummaryCard(key, false));
    });
}

function setupEncounterSummaryPanel()
{
    document.getElementById("pdEncounterSummaryBackBtn").addEventListener("click", (event) => {
        event.preventDefault();
        backToVisitHistory();
    });

    document.getElementById("pdEncSummaryVisitSummarySignBtn").addEventListener("click", () => openEsignModal("visit_summary"));
    document.getElementById("pdEncSummaryVisitSummaryDeleteBtn").addEventListener("click", () => openDeleteSectionModal("visit_summary"));

    document.getElementById("pdEncSummaryCarePlanSignBtn").addEventListener("click", () => openEsignModal("care_plan"));
    document.getElementById("pdEncSummaryCarePlanDeleteBtn").addEventListener("click", () => openDeleteSectionModal("care_plan"));

    document.getElementById("pdEncSummaryClinicalInstructionsSignBtn").addEventListener("click", () => openEsignModal("clinical_instructions"));
    document.getElementById("pdEncSummaryClinicalInstructionsDeleteBtn").addEventListener("click", () => openDeleteSectionModal("clinical_instructions"));

    document.getElementById("pdEncSummaryClinicalNotesSignBtn").addEventListener("click", () => openEsignModal("clinical_notes"));
    document.getElementById("pdEncSummaryClinicalNotesDeleteBtn").addEventListener("click", () => openDeleteSectionModal("clinical_notes"));

    document.getElementById("pdEncSummaryVitalsSignBtn").addEventListener("click", () => openEsignModal("vitals"));
    document.getElementById("pdEncSummaryVitalsDeleteBtn").addEventListener("click", () => openDeleteSectionModal("vitals"));
    document.getElementById("pdEncSummaryVitalsEditBtn").addEventListener("click", () => openVitalsFormModal());

    document.getElementById("pdEncSummaryMiscBillingSignBtn").addEventListener("click", () => openEsignModal("misc_billing_options"));
    document.getElementById("pdEncSummaryMiscBillingDeleteBtn").addEventListener("click", () => openDeleteSectionModal("misc_billing_options"));
    document.getElementById("pdEncSummaryMiscBillingEditBtn").addEventListener("click", () => openMiscBillingOptionsModal());

    document.getElementById("pdEncSummaryFunctionalCognitiveSignBtn").addEventListener("click", () => openEsignModal("functional_cognitive_status"));
    document.getElementById("pdEncSummaryFunctionalCognitiveDeleteBtn").addEventListener("click", () => openDeleteSectionModal("functional_cognitive_status"));

    document.getElementById("pdEncSummaryObservationSignBtn").addEventListener("click", () => openEsignModal("observation"));
    document.getElementById("pdEncSummaryObservationDeleteBtn").addEventListener("click", () => openDeleteSectionModal("observation"));

    document.getElementById("pdEncSummaryReviewOfSystemsSignBtn").addEventListener("click", () => openEsignModal("review_of_systems"));
    document.getElementById("pdEncSummaryReviewOfSystemsDeleteBtn").addEventListener("click", () => openDeleteSectionModal("review_of_systems"));
    document.getElementById("pdEncSummaryReviewOfSystemsEditBtn").addEventListener("click", () => openReviewOfSystemsFormModal());

    document.getElementById("pdEncSummaryReviewOfSystemsChecksSignBtn").addEventListener("click", () => openEsignModal("review_of_systems_checks"));
    document.getElementById("pdEncSummaryReviewOfSystemsChecksDeleteBtn").addEventListener("click", () => openDeleteSectionModal("review_of_systems_checks"));
    document.getElementById("pdEncSummaryReviewOfSystemsChecksEditBtn").addEventListener("click", () => openReviewOfSystemsChecksFormModal());

    document.getElementById("pdEncSummarySpeechDictationSignBtn").addEventListener("click", () => openEsignModal("speech_dictation"));
    document.getElementById("pdEncSummarySpeechDictationDeleteBtn").addEventListener("click", () => openDeleteSectionModal("speech_dictation"));

    document.getElementById("pdEncSummaryNewEncounterFormLink").addEventListener("click", (event) => {
        event.preventDefault();
        openEncounterFormModal(null);
    });

    document.getElementById("pdEncSummaryFeeSheetLink").addEventListener("click", (event) => {
        event.preventDefault();
        openFeeSheet();
    });

    document.getElementById("pdEncSummaryMiscBillingLink").addEventListener("click", (event) => {
        event.preventDefault();
        openMiscBillingOptionsModal();
    });

    document.getElementById("pdClinicalMenuCarePlanLink").addEventListener("click", (event) => {
        event.preventDefault();
        openCarePlanFormModal(null);
    });

    document.getElementById("pdClinicalMenuInstructionsLink").addEventListener("click", (event) => {
        event.preventDefault();
        openClinicalInstructionsFormModal(null);
    });

    document.getElementById("pdClinicalMenuNotesLink").addEventListener("click", (event) => {
        event.preventDefault();
        openClinicalNotesFormModal(null);
    });

    document.getElementById("pdClinicalMenuFunctionalCognitiveLink").addEventListener("click", (event) => {
        event.preventDefault();
        openFunctionalCognitiveFormModal(null);
    });

    document.getElementById("pdClinicalMenuObservationLink").addEventListener("click", (event) => {
        event.preventDefault();
        openObservationFormModal(null);
    });

    document.getElementById("pdClinicalMenuReviewOfSystemsLink").addEventListener("click", (event) => {
        event.preventDefault();
        openReviewOfSystemsFormModal();
    });

    document.getElementById("pdClinicalMenuReviewOfSystemsChecksLink").addEventListener("click", (event) => {
        event.preventDefault();
        openReviewOfSystemsChecksFormModal();
    });

    document.getElementById("pdClinicalMenuSoapLink").addEventListener("click", (event) => {
        event.preventDefault();
        openSoapNoteFormModal(null);
    });

    document.getElementById("pdClinicalMenuSpeechDictationLink").addEventListener("click", (event) => {
        event.preventDefault();
        openSpeechDictationFormModal(null);
    });

    document.getElementById("pdClinicalMenuVitalsLink").addEventListener("click", (event) => {
        event.preventDefault();
        openVitalsFormModal();
    });

    document.getElementById("pdEncSummaryDeleteEncounterBtn").addEventListener("click", () => openDeleteEncounterModal());

    setupEsignModal();
    setupDeleteSectionModal();
    setupCollapsibleCards();
    setupMiscBillingOptionsModal();
}

const MISC_BILLING_FIELDS = [
    "employment_related", "auto_accident", "auto_accident_state", "other_accident",
    "claim_codes", "epsdt",
    "onset_date", "onset_date_qualifier", "other_date", "other_date_qualifier",
    "unable_to_work_from", "unable_to_work_to",
    "provider_id", "provider_qualifier",
    "hospitalization_from", "hospitalization_to",
    "outside_lab", "outside_lab_charges",
    "resubmission_code", "medicaid_original_ref_no", "prior_authorization_no",
    "x12_replacement_claim", "x12_icn_resubmission_no",
    "additional_notes"
];

async function openMiscBillingOptionsModal()
{
    document.getElementById("miscBillingOptionsAlert").innerHTML = "";
    document.getElementById("miscBillingOptionsForm").reset();

    await loadEncounterCatalogsIfNeeded();
    fillEncounterSelect("miscBilling_provider_id", encounterProviders, providerLabel, "-- Please Select --");

    const section = currentEncounterSummary.sections.misc_billing_options || {};
    const locked = !!section.locked_at;
    const data = currentEncounterSummary.miscBillingOptions || {};

    MISC_BILLING_FIELDS.forEach((field) => {
        const el = document.getElementById(`miscBilling_${field}`);

        if (el.type === "checkbox") {
            el.checked = !!data[field];
        } else {
            el.value = data[field] ?? "";
        }

        el.disabled = locked;
    });

    const frequency = data.x12_claim_frequency || "new";

    document.getElementById(`miscBilling_x12_claim_frequency_${frequency}`).checked = true;
    document.querySelectorAll('input[name="miscBillingX12ClaimFrequency"]').forEach((radio) => {
        radio.disabled = locked;
    });

    document.querySelector("#miscBillingOptionsForm .form-actions button[type=submit]").style.display = locked ? "none" : "";

    document.getElementById("miscBillingOptionsModalOverlay").classList.add("open");
}

function setupMiscBillingOptionsModal()
{
    const modalOverlay = document.getElementById("miscBillingOptionsModalOverlay");
    const form = document.getElementById("miscBillingOptionsForm");

    const closeModal = () => modalOverlay.classList.remove("open");

    document.getElementById("closeMiscBillingOptionsModal").addEventListener("click", closeModal);
    document.getElementById("cancelMiscBillingOptions").addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const payload = {};

        MISC_BILLING_FIELDS.forEach((field) => {
            const el = document.getElementById(`miscBilling_${field}`);
            payload[field] = el.type === "checkbox" ? el.checked : el.value;
        });

        payload.x12_claim_frequency = document.querySelector('input[name="miscBillingX12ClaimFrequency"]:checked')?.value || "new";

        const result = await saveEncounterMiscBillingOptions(currentEncounterSummary.encounter.id, payload);

        if (!result.success) {
            showAlert("miscBillingOptionsAlert", result.message || "Failed to save Misc Billing Options.", "error");
            return;
        }

        closeModal();
        await loadEncounterSummary(currentEncounterSummary.encounter);
    });
}

let feeSheetRows = [];

function openFeeSheet()
{
    document.getElementById("pdEncounterSummaryPanel").style.display = "none";
    document.getElementById("pdFeeSheetPanel").style.display = "block";
    loadFeeSheet();
}

function backToEncounterSummaryFromFeeSheet()
{
    document.getElementById("pdFeeSheetPanel").style.display = "none";
    document.getElementById("pdEncounterSummaryPanel").style.display = "block";
}

async function loadFeeSheet()
{
    const { encounter } = currentEncounterSummary;
    const patientName = currentDashboardPatient
        ? [currentDashboardPatient.first_name, currentDashboardPatient.last_name].filter(Boolean).join(" ")
        : "";

    document.getElementById("pdFeeSheetTitle").textContent =
        `Fee Sheet for ${patientName} for Encounter on ${(encounter.date_of_service || "").slice(0, 10)}`;

    feeSheetRows = encounter.billing_codes_summary
        ? encounter.billing_codes_summary.split("||").map((entry) => {
            const parts = entry.split(":");
            return {
                type: parts[0],
                code: parts[1],
                description: parts.slice(2).join(":"),
                editable: false
            };
        })
        : [];

    renderFeeSheetTable();

    await loadEncounterCatalogsIfNeeded();

    fillEncounterSelect("pdFeeSheetRenderingProvider", encounterProviders, providerLabel, "-- Select One --");
    fillEncounterSelect("pdFeeSheetSupervisingProvider", encounterProviders, providerLabel, "-- Select One --");
}

function renderFeeSheetTable()
{
    const tbody = document.getElementById("pdFeeSheetTableBody");

    if (!feeSheetRows.length) {
        tbody.innerHTML = `<tr><td colspan="10" class="table-empty">No fee sheet codes for this encounter.</td></tr>`;
        return;
    }

    tbody.innerHTML = feeSheetRows.map((row, index) => {
        if (!row.editable) {
            return `
                <tr>
                    <td>${escapeHtml(row.type || "-")}</td>
                    <td>${escapeHtml(row.code || "-")}</td>
                    <td>${escapeHtml(row.description || "-")}</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td><input type="checkbox" checked disabled></td>
                    <td><input type="checkbox" disabled></td>
                </tr>
            `;
        }

        return `
            <tr>
                <td>COPAY</td>
                <td>-</td>
                <td>Cash</td>
                <td>-</td>
                <td><input type="text" class="form-input pd-fee-price-input" value="0" data-fee-price-index="${index}"></td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td><input type="checkbox" checked></td>
                <td><input type="checkbox"></td>
            </tr>
        `;
    }).join("");
}

function computeFeeSheetReceipt()
{
    const encounterDate = (currentEncounterSummary.encounter.date_of_service || "").slice(0, 10);
    const patientNo = currentDashboardPatient?.patient_no || "";

    let totalCharges = 0;
    const paymentLines = [];

    document.querySelectorAll("#pdFeeSheetTableBody [data-fee-price-index]").forEach((input) => {
        const amount = parseFloat(input.value);

        if (!amount) {
            return;
        }

        if (amount > 0) {
            totalCharges += amount;
        } else {
            paymentLines.push({ date: encounterDate, description: `Payment Pt ${patientNo}`, amount });
        }
    });

    const balanceDue = totalCharges + paymentLines.reduce((sum, line) => sum + line.amount, 0);

    return { totalCharges, paymentLines, balanceDue };
}

function renderFeeSheetReceipt()
{
    const patientName = currentDashboardPatient
        ? [currentDashboardPatient.first_name, currentDashboardPatient.last_name].filter(Boolean).join(" ")
        : "";

    document.getElementById("pdFeeSheetReceiptPatientName").textContent = patientName;

    const { totalCharges, paymentLines, balanceDue } = computeFeeSheetReceipt();

    const paymentRowsHtml = paymentLines.map((line) => `
        <tr>
            <td>${escapeHtml(line.date)}</td>
            <td>${escapeHtml(line.description)}</td>
            <td class="pd-receipt-amount">${formatCurrency(line.amount)}</td>
        </tr>
    `).join("");

    document.getElementById("pdFeeSheetReceiptBody").innerHTML = `
        <tr class="pd-receipt-total-row">
            <td colspan="2">Total Charges</td>
            <td class="pd-receipt-amount">$${formatCurrency(totalCharges)}</td>
        </tr>
        ${paymentRowsHtml}
        <tr class="pd-receipt-total-row">
            <td colspan="2">Balance Due</td>
            <td class="pd-receipt-amount">$${formatCurrency(balanceDue)}</td>
        </tr>
    `;
}

function openFeeSheetReceipt()
{
    renderFeeSheetReceipt();
    document.getElementById("pdFeeSheetReceiptModalOverlay").classList.add("open");
}

function printFeeSheetReceipt()
{
    const reportWindow = window.open("", "_blank", "width=700,height=800,scrollbars=yes");

    if (!reportWindow) {
        alert("Please enable pop-ups to print this page.");
        return;
    }

    const patientName = document.getElementById("pdFeeSheetReceiptPatientName").textContent;
    const tableHtml = document.getElementById("pdFeeSheetReceiptBody").parentElement.outerHTML;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Receipt</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #222; }
        h2 { margin-bottom: 14px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 12.5px; }
        th { background: #f4f6f9; }
        .pd-receipt-amount { text-align: right; }
        .pd-receipt-total-row td { background: #29323f; color: #fff; font-weight: 600; }
        ${CCD_PRINT_BUTTON_STYLE}
    </style>
</head>
<body>
    ${CCD_PRINT_BUTTON_HTML}
    <h2>${escapeHtml(patientName)}</h2>
    ${tableHtml}
</body>
</html>
    `;

    reportWindow.document.open();
    reportWindow.document.write(html);
    reportWindow.document.close();
}

function addFeeSheetCopayRow()
{
    feeSheetRows.push({ type: "COPAY", code: "", description: "Cash", editable: true });
    renderFeeSheetTable();
}

let feeSheetRoomsLoaded = false;
let feeSheetRooms = [];

async function loadFeeSheetRoomsIfNeeded()
{
    if (feeSheetRoomsLoaded) {
        return;
    }

    const result = await fetchRooms();

    feeSheetRooms = result.success ? result.data : [];
    feeSheetRoomsLoaded = true;
}

async function openNewAppointmentFromFeeSheet()
{
    document.getElementById("pdFeeSheetAppointmentFormAlert").innerHTML = "";
    document.getElementById("pdFeeSheetAppointmentForm").reset();
    document.querySelectorAll("#pdFeeSheetAppointmentForm .form-error").forEach((el) => { el.textContent = ""; });

    await loadEncounterCatalogsIfNeeded();
    await loadFeeSheetRoomsIfNeeded();

    fillEncounterSelect("fa_visit_category_id", encounterVisitCategories, (c) => c.name, "-- Select One --");
    fillEncounterSelect("fa_facility_id", encounterFacilities, (f) => f.name, "-- Select One --");
    fillEncounterSelect("fa_billing_facility_id", encounterFacilities, (f) => f.name, "-- Select One --");
    fillEncounterSelect("fa_provider_id", encounterProviders, providerLabel, "-- Select One --");
    fillEncounterSelect("fa_room_id", feeSheetRooms, (r) => r.name, "-- Select One --");

    document.getElementById("pdFeeSheetAppointmentPatientName").textContent = currentDashboardPatient
        ? [currentDashboardPatient.first_name, currentDashboardPatient.last_name].filter(Boolean).join(" ")
        : "-";

    document.getElementById("fa_daytype_time").checked = true;
    document.getElementById("fa_daytype_allday").checked = false;
    document.getElementById("fa_timeGroup").hidden = false;
    document.getElementById("fa_appointment_date").value = "";
    document.getElementById("fa_appointment_time").value = "";

    const renderingProviderId = document.getElementById("pdFeeSheetRenderingProvider").value;

    document.getElementById("fa_provider_id").value = renderingProviderId || "";

    document.getElementById("pdFeeSheetAppointmentModalOverlay").classList.add("open");
}

function readFeeSheetAppointmentData()
{
    const isAllDay = document.getElementById("fa_daytype_allday").checked;

    return {
        is_provider_block: "0",
        visit_category_id: document.getElementById("fa_visit_category_id").value,
        title: document.getElementById("fa_title").value.trim(),
        facility_id: document.getElementById("fa_facility_id").value,
        billing_facility_id: document.getElementById("fa_billing_facility_id").value,
        patient_id: currentDashboardPatient.id,
        provider_id: document.getElementById("fa_provider_id").value,
        room_id: document.getElementById("fa_room_id").value,
        notes: document.getElementById("fa_notes").value.trim(),
        appointment_date: document.getElementById("fa_appointment_date").value,
        appointment_time: isAllDay ? "" : document.getElementById("fa_appointment_time").value,
        is_all_day: isAllDay ? "1" : "0",
        recurrence_mode: "none"
    };
}

function setupFeeSheetAppointmentModal()
{
    const modalOverlay = document.getElementById("pdFeeSheetAppointmentModalOverlay");
    const form = document.getElementById("pdFeeSheetAppointmentForm");

    const closeModal = () => modalOverlay.classList.remove("open");

    document.getElementById("closePdFeeSheetAppointmentModal").addEventListener("click", closeModal);
    document.getElementById("cancelPdFeeSheetAppointment").addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    document.getElementById("fa_daytype_time").addEventListener("change", () => {
        document.getElementById("fa_timeGroup").hidden = false;
    });

    document.getElementById("fa_daytype_allday").addEventListener("change", () => {
        document.getElementById("fa_timeGroup").hidden = true;
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        document.querySelectorAll("#pdFeeSheetAppointmentForm .form-error").forEach((el) => { el.textContent = ""; });
        document.getElementById("pdFeeSheetAppointmentFormAlert").innerHTML = "";

        const result = await createAppointment(readFeeSheetAppointmentData());

        if (!result.success) {
            showAlert("pdFeeSheetAppointmentFormAlert", result.message || "Failed to save appointment.", "error");

            if (result.errors) {
                Object.entries(result.errors).forEach(([field, message]) => {
                    const errorEl = document.getElementById(`err-fa_${field}`);

                    if (errorEl) {
                        errorEl.textContent = message;
                    }
                });
            }

            return;
        }

        closeModal();
        showAlert("pdFeeSheetAlert", "Appointment scheduled successfully.", "success");
    });
}

function setupFeeSheetPanel()
{
    document.getElementById("pdFeeSheetBackBtn").addEventListener("click", (event) => {
        event.preventDefault();
        backToEncounterSummaryFromFeeSheet();
    });

    document.getElementById("pdFeeSheetAddCopayBtn").addEventListener("click", () => addFeeSheetCopayRow());

    document.getElementById("pdFeeSheetNewAppointmentBtn").addEventListener("click", () => openNewAppointmentFromFeeSheet());

    document.getElementById("pdFeeSheetShowReceiptBtn").addEventListener("click", () => openFeeSheetReceipt());

    document.getElementById("pdFeeSheetCancelBtn").addEventListener("click", () => backToEncounterSummaryFromFeeSheet());

    setupFeeSheetAppointmentModal();
    setupFeeSheetReceiptModal();
}

function setupFeeSheetReceiptModal()
{
    const modalOverlay = document.getElementById("pdFeeSheetReceiptModalOverlay");
    const closeModal = () => modalOverlay.classList.remove("open");

    document.getElementById("closePdFeeSheetReceiptModal").addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    document.getElementById("pdFeeSheetReceiptPrintBtn").addEventListener("click", () => printFeeSheetReceipt());
}

function setupEsignModal()
{
    const modalOverlay = document.getElementById("esignModalOverlay");
    const form = document.getElementById("esignForm");

    const closeModal = () => {
        modalOverlay.classList.remove("open");
        form.reset();
        document.getElementById("err-esign_password").textContent = "";
        document.getElementById("esignFormAlert").innerHTML = "";
    };

    document.getElementById("closeEsignModal").addEventListener("click", closeModal);
    document.getElementById("cancelEsign").addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        document.getElementById("err-esign_password").textContent = "";

        const encounterId = document.getElementById("esign_encounter_id").value;
        const sectionType = document.getElementById("esign_section_type").value;
        const soapNoteId = document.getElementById("esign_soap_note_id").value;
        const password = document.getElementById("esign_password").value;
        const amendment = document.getElementById("esign_amendment").value;

        if (soapNoteId) {
            const result = await signSoapNote(soapNoteId, password, amendment);

            if (!result.success) {
                document.getElementById("err-esign_password").textContent = result.message || "Failed to sign.";
                return;
            }

            closeModal();
            await loadSoapNotes();
            renderSoapNotesSection();
            return;
        }

        const result = await signEncounterSection(encounterId, sectionType, password, amendment);

        if (!result.success) {
            document.getElementById("err-esign_password").textContent = result.message || "Failed to sign.";
            return;
        }

        currentEncounterSummary.sections[sectionType] = result.data;
        closeModal();
        renderEncounterSummary();
    });
}

function openEsignModal(sectionType)
{
    document.getElementById("esignFormAlert").innerHTML = "";
    document.getElementById("err-esign_password").textContent = "";
    document.getElementById("esignForm").reset();
    document.getElementById("esign_encounter_id").value = currentEncounterSummary.encounter.id;
    document.getElementById("esign_section_type").value = sectionType;
    document.getElementById("esign_soap_note_id").value = "";
    document.getElementById("esignModalOverlay").classList.add("open");
}

function openSoapEsignModal(noteId)
{
    document.getElementById("esignFormAlert").innerHTML = "";
    document.getElementById("err-esign_password").textContent = "";
    document.getElementById("esignForm").reset();
    document.getElementById("esign_encounter_id").value = currentEncounterSummary.encounter.id;
    document.getElementById("esign_section_type").value = "";
    document.getElementById("esign_soap_note_id").value = noteId;
    document.getElementById("esignModalOverlay").classList.add("open");
}

let careTeamOptions = { members: [], roles: [], facilities: [], related_persons: [] };
let careTeamRows = [];
let careTeamRowUidCounter = 0;

function renderDashboardCareTeam(careTeam)
{
    const body = document.getElementById("pdCareTeamBody");

    if (!body) {
        return;
    }

    const members = (careTeam && careTeam.members) || [];
    const isActive = !careTeam || careTeam.status !== "inactive";

    if (!careTeam || !careTeam.id) {
        body.innerHTML = `<div class="pd-widget-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"></circle><path d="M6 21v-2a6 6 0 0 1 12 0v2"></path></svg>
            <p>No care team recorded yet.</p>
           </div>`;
        return;
    }

    body.innerHTML = `
        <div class="pd-allergy-list">
            <div class="pd-allergy-item">
                <span class="pd-allergy-name">${escapeHtml(careTeam.name || "Care Team")}</span>
                <span class="status-badge ${isActive ? "completed" : "cancelled"}">${isActive ? "Active" : "Inactive"}</span>
            </div>
            ${members.length
                ? members.map((member) => `
                    <div class="pd-allergy-item">
                        <span class="pd-allergy-name">${escapeHtml(
                            member.member_type === "provider"
                                ? (member.user_name || "Unassigned provider")
                                : (member.related_person_name || "Unassigned related person")
                        )}${member.role_name ? ` &middot; ${escapeHtml(member.role_name)}` : ""}</span>
                    </div>
                `).join("")
                : `<div class="pd-allergy-item"><span class="pd-allergy-name">No team members added yet.</span></div>`
            }
        </div>
    `;
}

async function loadDashboardCareTeam(patient)
{
    const body = document.getElementById("pdCareTeamBody");

    if (!body) {
        return;
    }

    try {
        const result = await fetchCareTeam(patient.id);

        renderDashboardCareTeam(result.success ? result.data : null);
    } catch (error) {
        console.error("Failed to load care team", error);
        body.innerHTML = `<div class="pd-widget-empty"><p>Unable to load care team right now.</p></div>`;
    }
}

function newCareTeamRow(memberType)
{
    careTeamRowUidCounter += 1;

    return {
        _uid: careTeamRowUidCounter,
        member_type: memberType,
        user_id: "",
        related_person_id: "",
        role_id: "",
        facility_id: "",
        member_since: "",
        status: "active",
        note: ""
    };
}

function renderCareTeamRows()
{
    const tbody = document.getElementById("careTeamMembersBody");

    if (!tbody) {
        return;
    }

    if (!careTeamRows.length) {
        tbody.innerHTML = `<tr><td colspan="8" class="table-empty">No team members added yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = careTeamRows.map((row) => {
        const memberValue = row.member_type === "provider" ? row.user_id : row.related_person_id;

        const memberOptions = row.member_type === "provider"
            ? careTeamOptions.members.map((m) => `<option value="${m.user_id}"${String(m.user_id) === memberValue ? " selected" : ""}>${escapeHtml(m.name)}${m.role_name ? ` (${escapeHtml(m.role_name)})` : ""}</option>`).join("")
            : careTeamOptions.related_persons.map((p) => `<option value="${p.id}"${String(p.id) === memberValue ? " selected" : ""}>${escapeHtml(p.name)}</option>`).join("");

        const roleOptions = careTeamOptions.roles.map((r) => `<option value="${r.id}"${String(r.id) === row.role_id ? " selected" : ""}>${escapeHtml(r.name)}</option>`).join("");
        const facilityOptions = careTeamOptions.facilities.map((f) => `<option value="${f.id}"${String(f.id) === row.facility_id ? " selected" : ""}>${escapeHtml(f.name)}</option>`).join("");

        return `
            <tr>
                <td><span class="status-badge completed">${row.member_type === "provider" ? "Provider" : "Related Person"}</span></td>
                <td>
                    <select class="form-input" data-field="member" data-uid="${row._uid}" required>
                        <option value="">-- Select One --</option>
                        ${memberOptions}
                    </select>
                </td>
                <td>
                    <select class="form-input" data-field="role_id" data-uid="${row._uid}">
                        <option value="">-- Select One --</option>
                        ${roleOptions}
                    </select>
                </td>
                <td>
                    <select class="form-input" data-field="facility_id" data-uid="${row._uid}">
                        <option value="">-- Select One --</option>
                        ${facilityOptions}
                    </select>
                </td>
                <td><input type="date" class="form-input" data-field="member_since" data-uid="${row._uid}" value="${row.member_since || ""}"></td>
                <td>
                    <select class="form-input" data-field="status" data-uid="${row._uid}">
                        <option value="active"${row.status === "active" ? " selected" : ""}>Active</option>
                        <option value="inactive"${row.status === "inactive" ? " selected" : ""}>Inactive</option>
                    </select>
                </td>
                <td><input type="text" class="form-input" data-field="note" data-uid="${row._uid}" value="${escapeHtml(row.note || "")}"></td>
                <td><button type="button" class="btn-danger" data-remove-care-team-row="${row._uid}">Remove</button></td>
            </tr>
        `;
    }).join("");
}

async function openCareTeamModal(patient)
{
    document.getElementById("careTeamAlert").innerHTML = "";
    document.getElementById("careTeamModalOverlay").classList.add("open");
    document.getElementById("careTeamName").value = "";
    document.getElementById("careTeamStatus").value = "active";
    document.getElementById("careTeamMembersBody").innerHTML = `<tr><td colspan="8" class="table-empty">Loading...</td></tr>`;

    const [optionsResult, careTeamResult] = await Promise.all([
        fetchCareTeamOptions(patient.id),
        fetchCareTeam(patient.id)
    ]);

    careTeamOptions = optionsResult.success
        ? optionsResult.data
        : { members: [], roles: [], facilities: [], related_persons: [] };

    const careTeam = careTeamResult.success ? careTeamResult.data : null;

    document.getElementById("careTeamName").value = (careTeam && careTeam.name) || "";
    document.getElementById("careTeamStatus").value = (careTeam && careTeam.status) || "active";

    careTeamRows = ((careTeam && careTeam.members) || []).map((member) => {
        careTeamRowUidCounter += 1;

        return {
            _uid: careTeamRowUidCounter,
            member_type: member.member_type,
            user_id: member.user_id ? String(member.user_id) : "",
            related_person_id: member.related_person_id ? String(member.related_person_id) : "",
            role_id: member.role_id ? String(member.role_id) : "",
            facility_id: member.facility_id ? String(member.facility_id) : "",
            member_since: (member.member_since || "").slice(0, 10),
            status: member.status || "active",
            note: member.note || ""
        };
    });

    renderCareTeamRows();
}

function setupCareTeamModal()
{
    const modalOverlay = document.getElementById("careTeamModalOverlay");
    const form = document.getElementById("careTeamForm");
    const tbody = document.getElementById("careTeamMembersBody");

    const closeModal = () => modalOverlay.classList.remove("open");

    document.getElementById("pdCareTeamAddBtn").addEventListener("click", () => {
        if (currentDashboardPatient) {
            openCareTeamModal(currentDashboardPatient);
        }
    });

    document.getElementById("closeCareTeamModal").addEventListener("click", closeModal);
    document.getElementById("cancelCareTeamForm").addEventListener("click", closeModal);

    document.getElementById("addCareTeamMemberBtn").addEventListener("click", () => {
        careTeamRows.push(newCareTeamRow("provider"));
        renderCareTeamRows();
    });

    document.getElementById("addCareTeamRelatedPersonBtn").addEventListener("click", () => {
        careTeamRows.push(newCareTeamRow("related_person"));
        renderCareTeamRows();
    });

    tbody.addEventListener("click", (event) => {
        const btn = event.target.closest("[data-remove-care-team-row]");

        if (!btn) {
            return;
        }

        const uid = btn.getAttribute("data-remove-care-team-row");
        careTeamRows = careTeamRows.filter((row) => String(row._uid) !== uid);
        renderCareTeamRows();
    });

    tbody.addEventListener("change", (event) => {
        const field = event.target.getAttribute("data-field");
        const uid = event.target.getAttribute("data-uid");

        if (!field || !uid) {
            return;
        }

        const row = careTeamRows.find((r) => String(r._uid) === uid);

        if (!row) {
            return;
        }

        if (field === "member") {
            if (row.member_type === "provider") {
                row.user_id = event.target.value;
            } else {
                row.related_person_id = event.target.value;
            }
            return;
        }

        row[field] = event.target.value;
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!currentDashboardPatient) {
            return;
        }

        const members = careTeamRows
            .filter((row) => (row.member_type === "provider" ? row.user_id : row.related_person_id))
            .map((row) => ({
                member_type: row.member_type,
                user_id: row.member_type === "provider" ? row.user_id : null,
                related_person_id: row.member_type === "related_person" ? row.related_person_id : null,
                role_id: row.role_id || null,
                facility_id: row.facility_id || null,
                member_since: row.member_since || null,
                status: row.status || "active",
                note: row.note || ""
            }));

        const result = await saveCareTeam(
            currentDashboardPatient.id,
            {
                name: document.getElementById("careTeamName").value.trim(),
                status: document.getElementById("careTeamStatus").value
            },
            members
        );

        if (!result.success) {
            showAlert("careTeamAlert", result.message || "Failed to save care team.", "error");
            return;
        }

        closeModal();
        await loadDashboardCareTeam(currentDashboardPatient);
    });
}

let messageCatalogsLoaded = false;
let messageTypeOptions = [];
let messageStatusOptions = [];
let messageRecipientOptions = [];

function setupMessageModals()
{
    const detailOverlay = document.getElementById("messageDetailModalOverlay");
    const formOverlay = document.getElementById("messageFormModalOverlay");
    const form = document.getElementById("messageForm");

    const closeDetail = () => detailOverlay.classList.remove("open");
    const closeForm = () => formOverlay.classList.remove("open");

    document.getElementById("pdMessagesAddBtn").addEventListener("click", () => {
        if (currentDashboardPatient) {
            openMessageDetailModal(currentDashboardPatient);
        }
    });

    document.getElementById("closeMessageDetailModal").addEventListener("click", closeDetail);
    detailOverlay.addEventListener("click", (event) => {
        if (event.target === detailOverlay) {
            closeDetail();
        }
    });

    document.getElementById("openAddMessageModalPd").addEventListener("click", () => {
        openMessageFormModal();
    });

    document.getElementById("closeMessageFormModal").addEventListener("click", closeForm);
    document.getElementById("cancelMessageForm").addEventListener("click", closeForm);
    formOverlay.addEventListener("click", (event) => {
        if (event.target === formOverlay) {
            closeForm();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const recipientErrEl = document.getElementById("err-message_recipient_id");
        const bodyErrEl = document.getElementById("err-message_body");

        recipientErrEl.textContent = "";
        bodyErrEl.textContent = "";

        const recipientId = document.getElementById("message_recipient_id").value;
        const typeId = document.getElementById("message_type_id").value;
        const statusId = document.getElementById("message_status_id").value;
        const body = document.getElementById("message_body").value.trim();

        if (!recipientId) {
            recipientErrEl.textContent = "Choose a recipient.";
            return;
        }

        if (!body) {
            bodyErrEl.textContent = "Message body is required.";
            return;
        }

        const result = await sendPatientMessage(currentDashboardPatient.id, recipientId, body, {
            type_id: typeId || null,
            status_id: statusId || null
        });

        if (!result.success) {
            showAlert("messageFormAlert", result.message || "Failed to send message.", "error");
            return;
        }

        closeForm();
        await loadMessageDetailTable(currentDashboardPatient);
        await loadDashboardMessages(currentDashboardPatient);
    });
}

async function openMessageDetailModal(patient)
{
    document.getElementById("messageDetailAlert").innerHTML = "";
    document.getElementById("messageDetailModalOverlay").classList.add("open");

    await loadMessageDetailTable(patient);
}

async function loadMessageDetailTable(patient)
{
    const tbody = document.getElementById("messageDetailTableBody");

    try {
        const result = await fetchPatientMessages(patient.id);

        if (!result.success) {
            tbody.innerHTML = `<tr><td colspan="5" class="table-empty">${escapeHtml(result.message || "Unable to load messages.")}</td></tr>`;
            return;
        }

        renderMessageDetailTable(result.data);
    } catch (error) {
        console.error("Failed to load patient messages", error);
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Unable to load messages right now. Please try again.</td></tr>`;
    }
}

function renderMessageDetailTable(messages)
{
    const tbody = document.getElementById("messageDetailTableBody");

    if (!messages.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No messages recorded for this patient.</td></tr>`;
        return;
    }

    tbody.innerHTML = messages.map((message) => `
        <tr>
            <td>${escapeHtml((message.created_at || "").slice(0, 16).replace("T", " ") || "-")}</td>
            <td>${escapeHtml(message.sender_name || "-")}</td>
            <td>${escapeHtml(message.type_name || "-")}</td>
            <td>${escapeHtml(message.status_name || "-")}</td>
            <td>${escapeHtml(message.body || "-")}</td>
        </tr>
    `).join("");
}

async function loadMessageCatalogsIfNeeded()
{
    if (messageCatalogsLoaded) {
        return;
    }

    const [typesResult, statusesResult, recipientsResult] = await Promise.all([
        fetchMessageTypes(),
        fetchMessageStatuses(),
        fetchRecipientOptions()
    ]);

    messageTypeOptions = typesResult.success ? typesResult.data : [];
    messageStatusOptions = statusesResult.success ? statusesResult.data : [];
    messageRecipientOptions = recipientsResult.success ? recipientsResult.data : [];
    messageCatalogsLoaded = true;
}

async function openMessageFormModal()
{
    document.getElementById("messageFormAlert").innerHTML = "";
    document.getElementById("messageForm").reset();
    document.getElementById("err-message_recipient_id").textContent = "";
    document.getElementById("err-message_body").textContent = "";

    await loadMessageCatalogsIfNeeded();

    const typeSelect = document.getElementById("message_type_id");
    const statusSelect = document.getElementById("message_status_id");
    const recipientSelect = document.getElementById("message_recipient_id");

    typeSelect.innerHTML = `<option value="">Select type</option>` +
        messageTypeOptions.map((type) => `<option value="${type.id}">${escapeHtml(type.name)}</option>`).join("");

    statusSelect.innerHTML = `<option value="">Select status</option>` +
        messageStatusOptions.map((status) => `<option value="${status.id}">${escapeHtml(status.name)}</option>`).join("");

    recipientSelect.innerHTML = `<option value="">Select recipient</option>` +
        messageRecipientOptions.map((recipient) => `<option value="${recipient.id}">${escapeHtml(recipient.display_name)} (${escapeHtml(capitalize(recipient.role))})</option>`).join("");

    document.getElementById("messageFormModalOverlay").classList.add("open");
}

function capitalize(value)
{
    const text = value || "";

    return text.charAt(0).toUpperCase() + text.slice(1);
}

function setFact(elementId, value)
{
    const el = document.getElementById(elementId);

    el.textContent = value || "Not set";
    el.classList.toggle("empty", !value);
}

// Shows the persistent patient banner above the tab bar (outside the tab
// content area, so it stays visible while switching between other open
// tabs -- not just while the Patient Chart tab itself is active).
function showPatientContextBar(patient)
{
    const bar = document.getElementById("patientContextBar");

    if (!bar) {
        return;
    }

    const fullName = [patient.first_name, patient.middle_name, patient.last_name, patient.suffix].filter(Boolean).join(" ");
    const dob = formatDate(patient.birthdate);
    const age = calculateAge(patient.birthdate);

    document.getElementById("patientContextPhoto").innerHTML = patientAvatarHtml(patient);

    const nameEl = document.getElementById("patientContextName");
    nameEl.textContent = fullName || "Unnamed Patient";
    nameEl.onclick = (event) => {
        event.preventDefault();
        openPatientChartTab(patient);
    };

    document.getElementById("patientContextMeta").textContent =
        `DOB: ${dob || "Not set"}    Age: ${age === null ? "-" : age}`;

    document.getElementById("patientContextClose").onclick = hidePatientContextBar;

    bar.style.display = "flex";
}

function hidePatientContextBar()
{
    const bar = document.getElementById("patientContextBar");

    if (bar) {
        bar.style.display = "none";
    }

    clearLastActivePatientChart();

    if (window.tabManager && window.tabManager.tabs.has("patient_chart")) {
        window.tabManager.closeTab("patient_chart");
    }
}

// Wires the click-to-upload photo behavior on the Patient Chart's sidebar
// avatar. Re-run every time the chart is opened/replaced (initPatientChartTab
// runs per patient), so handlers are reassigned with .onclick/.onchange
// (overwrite, not addEventListener) to avoid stacking duplicate listeners
// across repeated opens of the shared chart tab.
function setupPatientPhotoUpload(patient)
{
    const wrap = document.getElementById("pdSidebarAvatarWrap");
    const fileInput = document.getElementById("pdPhotoFileInput");
    const removeBtn = document.getElementById("pdRemovePhotoBtn");

    if (!wrap || !fileInput || !removeBtn) {
        return;
    }

    removeBtn.style.display = patient.photo ? "block" : "none";

    wrap.onclick = () => fileInput.click();

    fileInput.onchange = async () => {
        const file = fileInput.files[0];

        fileInput.value = "";

        if (!file) {
            return;
        }

        if (!file.type.startsWith("image/")) {
            alert("Please choose an image file.");
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            alert("Image must be 2MB or smaller.");
            return;
        }

        const result = await uploadPatientPhoto(patient.id, file);

        if (!result.success) {
            alert(result.message || "Failed to upload photo.");
            return;
        }

        patient.photo = result.data.photo;
        applyPatientPhotoUpdate(patient);
    };

    removeBtn.onclick = async () => {
        if (!confirm("Remove this patient's photo?")) {
            return;
        }

        const result = await removePatientPhoto(patient.id);

        if (!result.success) {
            alert(result.message || "Failed to remove photo.");
            return;
        }

        patient.photo = null;
        applyPatientPhotoUpdate(patient);
    };
}

// Refreshes every spot the just-updated patient's photo is shown without
// needing a full patients refetch: the chart header/sidebar, the shared
// patient-context bar, and the cached list-row entry (so returning to the
// Patients tab reflects it too).
function applyPatientPhotoUpdate(patient)
{
    document.getElementById("pdAvatar").innerHTML = patientAvatarHtml(patient);
    document.getElementById("pdSidebarAvatar").innerHTML = patientAvatarHtml(patient);
    document.getElementById("pdRemovePhotoBtn").style.display = patient.photo ? "block" : "none";

    showPatientContextBar(patient);

    const cached = patientsCache.find((item) => item.id === patient.id);

    if (cached) {
        cached.photo = patient.photo;
    }
}

function setupPatientFilters(user)
{
    const searchInput = document.getElementById("patientSearchInput");
    const searchClear = document.getElementById("patientSearchClear");
    const providerFilter = document.getElementById("patientProviderFilter");

    if (!searchInput || !searchClear || !providerFilter) return;

    const applyFilters = () => renderPatientsTable(getFilteredPatients(searchInput, providerFilter), user);

    searchInput.addEventListener("input", () => {
        searchClear.classList.toggle("show", searchInput.value.length > 0);
        applyFilters();
    });
    searchClear.addEventListener("click", () => {
        searchInput.value = "";
        searchClear.classList.remove("show");
        applyFilters();
        searchInput.focus();
    });
    providerFilter.addEventListener("change", applyFilters);
}

function getFilteredPatients(searchInput, providerFilter)
{
    const term = searchInput.value.trim().toLowerCase();
    const providerScope = providerFilter.value;

    return patientsCache.filter((patient) => {
        if (providerScope === "unassigned" && patient.provider_id) {
            return false;
        }

        if (term === "") {
            return true;
        }

        const haystack = [
            patient.patient_no,
            patient.first_name,
            patient.middle_name,
            patient.last_name,
            patient.suffix
        ].filter(Boolean).join(" ").toLowerCase();

        return haystack.includes(term);
    });
}

function wireModalTabs(modalBox)
{
    const tabs = modalBox.querySelectorAll(".modal-tab");
    const panels = modalBox.querySelectorAll(".modal-tab-panel");

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            tabs.forEach((t) => t.classList.remove("active"));
            panels.forEach((p) => p.classList.remove("active"));

            tab.classList.add("active");
            modalBox.querySelector(`.modal-tab-panel[data-panel="${tab.getAttribute("data-tab")}"]`).classList.add("active");
        });
    });
}

function resetModalTabs(modalBox)
{
    const tabs = modalBox.querySelectorAll(".modal-tab");
    const panels = modalBox.querySelectorAll(".modal-tab-panel");

    tabs.forEach((t, i) => t.classList.toggle("active", i === 0));
    panels.forEach((p, i) => p.classList.toggle("active", i === 0));
}

async function setupAddPatientModal(user)
{
    enablePasswordToggles();
    document.getElementById("birthdate").max = new Date().toISOString().split("T")[0];
    await loadProviderOptions("provider_id");

    const modalOverlay = document.getElementById("addPatientModalOverlay");
    const openBtn = document.getElementById("openAddPatientModal");

    if (!modalOverlay || !openBtn) return;

    const modalBox = modalOverlay.querySelector(".modal-box");
    const form = document.getElementById("addPatientForm");

    wireModalTabs(modalBox);

    const openModal = () => {
        resetModalTabs(modalBox);
        modalOverlay.classList.add("open");
    };
    const closeModal = () => {
        modalOverlay.classList.remove("open");
        form.reset();
        clearErrors(FIELDS, "");
        document.getElementById("formAlert").innerHTML = "";
    };

    document.getElementById("openAddPatientModal").addEventListener("click", openModal);
    document.getElementById("closeAddPatientModal").addEventListener("click", closeModal);
    document.getElementById("cancelAddPatient").addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const submitButton = form.querySelector('button[type="submit"]');

        if (submitButton.disabled) {
            return;
        }

        submitButton.disabled = true;

        clearErrors(FIELDS, "");

        const data = {};

        FIELDS.forEach((field) => {
            const value = document.getElementById(field).value.trim();

            if (value !== "") {
                data[field] = value;
            }
        });

        try {
            const result = await createPatient(data);

            if (!result.success) {
                if (result.errors && Object.keys(result.errors).length > 0) {
                    showAlert("formAlert", Object.values(result.errors).join(" "), "error");

                    let firstErrorField = null;

                    Object.entries(result.errors).forEach(([field, message]) => {
                        const errorEl = document.getElementById(`err-${field}`);

                        if (errorEl) {
                            errorEl.textContent = message;
                        }

                        if (!firstErrorField) {
                            firstErrorField = field;
                        }
                    });

                    revealModalField(modalBox, firstErrorField);
                } else {
                    showAlert("formAlert", result.message || "Failed to register patient.", "error");
                }

                return;
            }

            closeModal();
            showListAlert(`Patient registered successfully. Patient No: ${result.data.patient_no}`, "success");
            await loadPatients(user);
        } catch (error) {
            showAlert("formAlert", "Something went wrong while registering the patient. Please try again.", "error");
        } finally {
            submitButton.disabled = false;
        }
    });
}

/**
 * Switch to the tab containing a field within a modal and focus it, so a
 * validation error on a non-default tab isn't invisible to the user.
 */
function revealModalField(modalBox, fieldId)
{
    if (!fieldId) {
        return;
    }

    const fieldEl = document.getElementById(fieldId);
    const panel = fieldEl?.closest(".modal-tab-panel");

    if (!panel) {
        return;
    }

    const tabName = panel.getAttribute("data-panel");
    const tabBtn = modalBox.querySelector(`.modal-tab[data-tab="${tabName}"]`);

    tabBtn?.click();
    fieldEl.focus();
}

async function setupEditPatientModal(user)
{
    const modalOverlay = document.getElementById("editPatientModalOverlay");
    const editBirthdate = document.getElementById("edit_birthdate");

    if (!modalOverlay || !editBirthdate) {
        return;
    }

    editBirthdate.max = new Date().toISOString().split("T")[0];
    await loadProviderOptions("edit_provider_id");

    const modalBox = modalOverlay.querySelector(".modal-box");
    const form = document.getElementById("editPatientForm");

    wireModalTabs(modalBox);

    const closeModal = () => {
        modalOverlay.classList.remove("open");
        form.reset();
        clearErrors(EDIT_FIELDS, "edit_");
        document.getElementById("editFormAlert").innerHTML = "";
    };

    const closeBtn = document.getElementById("closeEditPatientModal");
    if (!closeBtn) return;
    
    closeBtn.addEventListener("click", closeModal);
    document.getElementById("cancelEditPatient").addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (event) => {
        if (event.target === modalOverlay) {
            closeModal();
        }
    });

    const deleteBtn = document.getElementById("deletePatientFromEdit");

    if (deleteBtn) {
        deleteBtn.addEventListener("click", async () => {
            if (!confirm("Delete this patient? This can be reversed by an administrator (soft delete).")) {
                return;
            }

            const id = document.getElementById("edit_id").value;

            await deletePatient(id);
            closeModal();
            showListAlert("Patient deleted successfully.", "success");
            await loadPatients(user);
        });
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearErrors(EDIT_FIELDS, "edit_");

        const id = document.getElementById("edit_id").value;
        const data = {};

        EDIT_FIELDS.forEach((field) => {
            const value = document.getElementById(`edit_${field}`).value.trim();

            if (value !== "") {
                data[field] = value;
            }
        });

        const result = await updatePatient(id, data);

        if (!result.success) {
            showAlert("editFormAlert", result.message || "Failed to update patient.", "error");

            if (result.errors) {
                Object.entries(result.errors).forEach(([field, message]) => {
                    const errorEl = document.getElementById(`err-edit_${field}`);

                    if (errorEl) {
                        errorEl.textContent = message;
                    }
                });
            }

            return;
        }

        closeModal();
        showListAlert("Patient updated successfully.", "success");
        await loadPatients(user);
    });
}

let currentRelatedPersonPatientId = null;
let relatedPersonsCache = [];
let telecomsCache = [];
let addressesCache = [];
let geographyLoaded = false;

function setupRelatedPersonModals()
{
    const addOverlay = document.getElementById("addRelatedPersonModalOverlay");
    const addForm = document.getElementById("addRelatedPersonForm");
    const detailOverlay = document.getElementById("relatedPersonDetailModalOverlay");
    const detailForm = document.getElementById("relatedPersonDetailForm");

    document.getElementById("openAddRelatedPersonBtn").addEventListener("click", () => {
        if (!currentEditPatient) {
            return;
        }

        addForm.reset();
        document.getElementById("relatedPersonFormAlert").innerHTML = "";
        clearRelatedPersonBasicErrors();
        addOverlay.classList.add("open");
    });

    document.getElementById("closeAddRelatedPersonModal").addEventListener("click", closeAddRelatedPersonModal);
    document.getElementById("cancelAddRelatedPerson").addEventListener("click", closeAddRelatedPersonModal);
    addOverlay.addEventListener("click", (event) => {
        if (event.target === addOverlay) {
            closeAddRelatedPersonModal();
        }
    });

    addForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearRelatedPersonBasicErrors();

        const data = {
            first_name: document.getElementById("rp_first_name").value.trim(),
            middle_name: document.getElementById("rp_middle_name").value.trim(),
            last_name: document.getElementById("rp_last_name").value.trim(),
            phone: document.getElementById("rp_phone").value.trim(),
            date_of_birth: document.getElementById("rp_date_of_birth").value,
            gender: document.getElementById("rp_gender").value,
            notes: document.getElementById("rp_notes").value.trim()
        };

        const result = await addRelatedPerson(currentEditPatient.id, data);

        if (!result.success) {
            showAlert("relatedPersonFormAlert", result.message || "Failed to add related person.", "error");

            if (result.errors) {
                Object.entries(result.errors).forEach(([field, message]) => {
                    const errorEl = document.getElementById(`err-rp_${field}`);

                    if (errorEl) {
                        errorEl.textContent = message;
                    }
                });
            }

            return;
        }

        closeAddRelatedPersonModal();
        await loadRelatedPersons(currentEditPatient.id);

        const newPerson = relatedPersonsCache.find((p) => String(p.id) === String(result.data.id))
            || { id: result.data.id, first_name: data.first_name, last_name: data.last_name };

        await openRelatedPersonDetailModal(newPerson);
    });

    document.getElementById("closeRelatedPersonDetailModal").addEventListener("click", closeRelatedPersonDetailModal);
    detailOverlay.addEventListener("click", (event) => {
        if (event.target === detailOverlay) {
            closeRelatedPersonDetailModal();
        }
    });

    detailForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const id = document.getElementById("rpd_id").value;

        const data = {
            relationship: document.getElementById("rpd_relationship").value.trim(),
            role: document.getElementById("rpd_role").value.trim(),
            contact_priority: document.getElementById("rpd_contact_priority").value,
            relationship_start_date: document.getElementById("rpd_relationship_start_date").value,
            relationship_end_date: document.getElementById("rpd_relationship_end_date").value,
            is_primary_contact: document.getElementById("rpd_is_primary_contact").checked ? 1 : 0,
            is_emergency_contact: document.getElementById("rpd_is_emergency_contact").checked ? 1 : 0,
            can_make_medical_decisions: document.getElementById("rpd_can_make_medical_decisions").checked ? 1 : 0,
            can_receive_medical_info: document.getElementById("rpd_can_receive_medical_info").checked ? 1 : 0
        };

        const result = await updateRelatedPerson(id, data);

        if (!result.success) {
            showAlert("rpDetailAlert", result.message || "Failed to save relationship details.", "error");
            return;
        }

        // Also save an in-progress telecom/address entry if that inline
        // form is open and actually has something filled in — an open but
        // untouched form is left alone rather than erroring on save.
        const telecomFormOpen = !document.getElementById("rpTelecomForm").hidden;
        const addressFormOpen = !document.getElementById("rpAddressForm").hidden;

        if (telecomFormOpen && document.getElementById("rpt_value").value.trim() !== "") {
            const telecomResult = await saveTelecomFromForm(id);

            if (!telecomResult.success) {
                if (telecomResult.errors && telecomResult.errors.value) {
                    document.getElementById("err-rpt_value").textContent = telecomResult.errors.value;
                }

                showAlert("rpDetailAlert", telecomResult.message || "Relationship details saved, but the telecom contact failed to save.", "error");
                await loadRelatedPersons(currentRelatedPersonPatientId);
                return;
            }

            hideTelecomForm();
            await loadTelecomsTable(id);
        }

        if (addressFormOpen && document.getElementById("rpa_address_line").value.trim() !== "") {
            const addressResult = await saveAddressFromForm(id);

            if (!addressResult.success) {
                if (addressResult.errors && addressResult.errors.address_line) {
                    document.getElementById("err-rpa_address_line").textContent = addressResult.errors.address_line;
                }

                showAlert("rpDetailAlert", addressResult.message || "Relationship details saved, but the address failed to save.", "error");
                await loadRelatedPersons(currentRelatedPersonPatientId);
                return;
            }

            hideAddressForm();
            await loadAddressesTable(id);
        }

        showAlert("rpDetailAlert", "Details saved.", "success");
        await loadRelatedPersons(currentRelatedPersonPatientId);
    });

    setupTelecomInlineForm();
    setupAddressInlineForm();
}

function closeAddRelatedPersonModal()
{
    document.getElementById("addRelatedPersonModalOverlay").classList.remove("open");
    document.getElementById("addRelatedPersonForm").reset();
}

function closeRelatedPersonDetailModal()
{
    document.getElementById("relatedPersonDetailModalOverlay").classList.remove("open");
    hideTelecomForm();
    hideAddressForm();
}

function clearRelatedPersonBasicErrors()
{
    ["first_name", "last_name"].forEach((field) => {
        const el = document.getElementById(`err-rp_${field}`);

        if (el) {
            el.textContent = "";
        }
    });
}

async function loadRelatedPersons(patientId)
{
    currentRelatedPersonPatientId = patientId;

    const result = await fetchRelatedPersons(patientId);

    relatedPersonsCache = result.success ? result.data : [];

    renderRelatedPersonsTable();
}

function renderRelatedPersonsTable()
{
    const tbody = document.getElementById("relatedPersonsTableBody");
    const countText = document.getElementById("relatedPersonsCountText");

    countText.textContent = `${relatedPersonsCache.length} ${relatedPersonsCache.length === 1 ? "related person" : "related persons"}`;

    if (!relatedPersonsCache.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No related persons recorded for this patient.</td></tr>`;
        return;
    }

    tbody.innerHTML = relatedPersonsCache.map((person) => {
        const fullName = [person.first_name, person.middle_name, person.last_name].filter(Boolean).join(" ");

        const tags = [];

        if (Number(person.is_primary_contact)) tags.push("Primary");
        if (Number(person.is_emergency_contact)) tags.push("Emergency");
        if (Number(person.can_make_medical_decisions)) tags.push("Medical Decisions");
        if (Number(person.can_receive_medical_info)) tags.push("Receives Info");

        return `
        <tr>
            <td>${escapeHtml(fullName)}</td>
            <td>${escapeHtml(person.relationship || "-")}</td>
            <td>${escapeHtml(person.role || "-")}</td>
            <td>${person.contact_priority ?? "-"}</td>
            <td>
                <div class="rp-permission-tags">
                    ${tags.length ? tags.map((t) => `<span class="rp-permission-tag">${t}</span>`).join("") : "-"}
                </div>
            </td>
            <td>
                <div class="table-actions">
                    <button class="btn-edit" data-edit-rp="${person.id}">Edit</button>
                    <button class="btn-danger" data-remove-rp="${person.id}">Delete</button>
                </div>
            </td>
        </tr>
        `;
    }).join("");

    tbody.querySelectorAll("[data-edit-rp]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const person = relatedPersonsCache.find((p) => String(p.id) === btn.getAttribute("data-edit-rp"));

            if (person) {
                openRelatedPersonDetailModal(person);
            }
        });
    });

    tbody.querySelectorAll("[data-remove-rp]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this related person?")) {
                return;
            }

            const result = await removeRelatedPerson(btn.getAttribute("data-remove-rp"));

            if (!result.success) {
                showListAlert(result.message || "Failed to remove related person.", "error");
                return;
            }

            await loadRelatedPersons(currentRelatedPersonPatientId);
        });
    });
}

async function openRelatedPersonDetailModal(person)
{
    document.getElementById("rpDetailAlert").innerHTML = "";
    document.getElementById("rpd_id").value = person.id;
    document.getElementById("rpDetailTitle").textContent =
        [person.first_name, person.last_name].filter(Boolean).join(" ") || "Related Person";

    document.getElementById("rpd_relationship").value = person.relationship ?? "";
    document.getElementById("rpd_role").value = person.role ?? "";
    document.getElementById("rpd_contact_priority").value = person.contact_priority ?? "";
    document.getElementById("rpd_relationship_start_date").value = person.relationship_start_date ?? "";
    document.getElementById("rpd_relationship_end_date").value = person.relationship_end_date ?? "";
    document.getElementById("rpd_is_primary_contact").checked = Boolean(Number(person.is_primary_contact));
    document.getElementById("rpd_is_emergency_contact").checked = Boolean(Number(person.is_emergency_contact));
    document.getElementById("rpd_can_make_medical_decisions").checked = Boolean(Number(person.can_make_medical_decisions));
    document.getElementById("rpd_can_receive_medical_info").checked = Boolean(Number(person.can_receive_medical_info));

    hideTelecomForm();
    hideAddressForm();

    document.getElementById("relatedPersonDetailModalOverlay").classList.add("open");

    await Promise.all([
        loadTelecomsTable(person.id),
        loadAddressesTable(person.id)
    ]);
}


// ---- Telecom Contacts (nested under a related person) ----

function setupTelecomInlineForm()
{
    const formBox = document.getElementById("rpTelecomForm");

    document.getElementById("rpToggleTelecomFormBtn").addEventListener("click", () => {
        if (formBox.hidden) {
            openTelecomForm(null);
        } else {
            hideTelecomForm();
        }
    });

}

/**
 * Save whatever is currently in the telecom inline form. Shared by its own
 * Save button and by the main "Save Details" submit so one click can save
 * relationship details + an in-progress telecom entry together.
 */
async function saveTelecomFromForm(relatedPersonId)
{
    document.getElementById("err-rpt_value").textContent = "";

    const id = document.getElementById("rpt_id").value;

    const data = {
        type: document.getElementById("rpt_type").value,
        contact_use: document.getElementById("rpt_contact_use").value,
        rank_order: document.getElementById("rpt_rank_order").value,
        is_primary: document.getElementById("rpt_is_primary").checked ? 1 : 0,
        value: document.getElementById("rpt_value").value.trim(),
        active_from: document.getElementById("rpt_active_from").value,
        notes: document.getElementById("rpt_notes").value.trim()
    };

    return id
        ? await updateTelecom(id, data)
        : await addTelecom(relatedPersonId, data);
}

function openTelecomForm(existing)
{
    const formBox = document.getElementById("rpTelecomForm");

    document.getElementById("rpt_id").value = existing?.id ?? "";
    document.getElementById("rpt_type").value = existing?.type ?? "";
    document.getElementById("rpt_contact_use").value = existing?.contact_use ?? "";
    document.getElementById("rpt_rank_order").value = existing?.rank_order ?? "";
    document.getElementById("rpt_is_primary").checked = Boolean(Number(existing?.is_primary));
    document.getElementById("rpt_value").value = existing?.value ?? "";
    document.getElementById("rpt_active_from").value = existing?.active_from ?? "";
    document.getElementById("rpt_notes").value = existing?.notes ?? "";
    document.getElementById("err-rpt_value").textContent = "";

    formBox.hidden = false;
}

function hideTelecomForm()
{
    document.getElementById("rpTelecomForm").hidden = true;
}

async function loadTelecomsTable(relatedPersonId)
{
    const result = await fetchTelecoms(relatedPersonId);

    telecomsCache = result.success ? result.data : [];

    renderTelecomsTable();
}

function renderTelecomsTable()
{
    const tbody = document.getElementById("rpTelecomsTableBody");

    if (!telecomsCache.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No telecom contacts yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = telecomsCache.map((t) => `
        <tr>
            <td>${escapeHtml(t.type || "-")}</td>
            <td>${escapeHtml(t.contact_use || "-")}</td>
            <td>${escapeHtml(t.value)}</td>
            <td>${Number(t.is_primary) ? "Yes" : "No"}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-edit" data-edit-telecom="${t.id}">Edit</button>
                    <button class="btn-danger" data-remove-telecom="${t.id}">Delete</button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-telecom]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const t = telecomsCache.find((entry) => String(entry.id) === btn.getAttribute("data-edit-telecom"));

            if (t) {
                openTelecomForm(t);
            }
        });
    });

    tbody.querySelectorAll("[data-remove-telecom]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this telecom contact?")) {
                return;
            }

            const result = await removeTelecom(btn.getAttribute("data-remove-telecom"));

            if (!result.success) {
                showAlert("rpDetailAlert", result.message || "Failed to remove telecom contact.", "error");
                return;
            }

            await loadTelecomsTable(document.getElementById("rpd_id").value);
        });
    });
}


// ---- Addresses (nested under a related person) ----

function setupAddressInlineForm()
{
    const formBox = document.getElementById("rpAddressForm");

    document.getElementById("rpToggleAddressFormBtn").addEventListener("click", () => {
        if (formBox.hidden) {
            openAddressForm(null);
        } else {
            hideAddressForm();
        }
    });

    document.getElementById("rpa_country").addEventListener("input", updateProvinceOptionsForCountry);
}

/**
 * Save whatever is currently in the address inline form. Shared by its own
 * Save button and by the main "Save Details" submit so one click can save
 * relationship details + an in-progress address together.
 */
async function saveAddressFromForm(relatedPersonId)
{
    document.getElementById("err-rpa_address_line").textContent = "";

    const id = document.getElementById("rpa_id").value;

    const data = {
        address_use: document.getElementById("rpa_address_use").value,
        address_type: document.getElementById("rpa_address_type").value,
        start_date: document.getElementById("rpa_start_date").value,
        end_date: document.getElementById("rpa_end_date").value,
        address_line: document.getElementById("rpa_address_line").value.trim(),
        city: document.getElementById("rpa_city").value.trim(),
        county_district: document.getElementById("rpa_county_district").value.trim(),
        state_province: document.getElementById("rpa_state_province").value.trim(),
        postal_code: document.getElementById("rpa_postal_code").value.trim(),
        country: document.getElementById("rpa_country").value.trim(),
        priority: document.getElementById("rpa_priority").value,
        notes: document.getElementById("rpa_notes").value.trim()
    };

    return id
        ? await updateAddress(id, data)
        : await addAddress(relatedPersonId, data);
}

async function openAddressForm(existing)
{
    const formBox = document.getElementById("rpAddressForm");

    document.getElementById("rpa_id").value = existing?.id ?? "";
    document.getElementById("rpa_address_use").value = existing?.address_use ?? "";
    document.getElementById("rpa_address_type").value = existing?.address_type ?? "";
    document.getElementById("rpa_start_date").value = existing?.start_date ?? "";
    document.getElementById("rpa_end_date").value = existing?.end_date ?? "";
    document.getElementById("rpa_address_line").value = existing?.address_line ?? "";
    document.getElementById("rpa_city").value = existing?.city ?? "";
    document.getElementById("rpa_county_district").value = existing?.county_district ?? "";
    document.getElementById("rpa_state_province").value = existing?.state_province ?? "";
    document.getElementById("rpa_postal_code").value = existing?.postal_code ?? "";
    document.getElementById("rpa_country").value = existing?.country ?? "Philippines";
    document.getElementById("rpa_priority").value = existing?.priority ?? "";
    document.getElementById("rpa_notes").value = existing?.notes ?? "";
    document.getElementById("err-rpa_address_line").textContent = "";

    formBox.hidden = false;

    await loadGeographyOptions();
    await updateProvinceOptionsForCountry();
}

function hideAddressForm()
{
    document.getElementById("rpAddressForm").hidden = true;
}

async function loadGeographyOptions()
{
    if (geographyLoaded) {
        return;
    }

    const countries = await fetchCountries();
    const countryDatalist = document.getElementById("rpaCountryDatalist");

    countryDatalist.innerHTML = countries.map((c) => `<option value="${escapeHtml(c)}"></option>`).join("");

    geographyLoaded = true;
}

async function updateProvinceOptionsForCountry()
{
    const countryValue = document.getElementById("rpa_country").value;
    const provinceDatalist = document.getElementById("rpaProvinceDatalist");

    if (!isPhilippines(countryValue)) {
        provinceDatalist.innerHTML = "";
        return;
    }

    const provinces = await fetchPhProvinces();

    provinceDatalist.innerHTML = provinces.map((p) => `<option value="${escapeHtml(p)}"></option>`).join("");
}

async function loadAddressesTable(relatedPersonId)
{
    const result = await fetchAddresses(relatedPersonId);

    addressesCache = result.success ? result.data : [];

    renderAddressesTable();
}

function renderAddressesTable()
{
    const tbody = document.getElementById("rpAddressesTableBody");

    if (!addressesCache.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No addresses yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = addressesCache.map((a) => `
        <tr>
            <td>${escapeHtml(a.address_use || "-")}</td>
            <td>${escapeHtml(a.address_type || "-")}</td>
            <td>${escapeHtml(a.address_line || "-")}</td>
            <td>${escapeHtml(a.city || "-")}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-edit" data-edit-address="${a.id}">Edit</button>
                    <button class="btn-danger" data-remove-address="${a.id}">Delete</button>
                </div>
            </td>
        </tr>
    `).join("");

    tbody.querySelectorAll("[data-edit-address]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const a = addressesCache.find((entry) => String(entry.id) === btn.getAttribute("data-edit-address"));

            if (a) {
                openAddressForm(a);
            }
        });
    });

    tbody.querySelectorAll("[data-remove-address]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!confirm("Remove this address?")) {
                return;
            }

            const result = await removeAddress(btn.getAttribute("data-remove-address"));

            if (!result.success) {
                showAlert("rpDetailAlert", result.message || "Failed to remove address.", "error");
                return;
            }

            await loadAddressesTable(document.getElementById("rpd_id").value);
        });
    });
}


function openEditModal(patient)
{
    const modalOverlay = document.getElementById("editPatientModalOverlay");
    const modalBox = modalOverlay.querySelector(".modal-box");

    resetModalTabs(modalBox);

    document.getElementById("edit_id").value = patient.id;
    document.getElementById("edit_first_name").value = patient.first_name ?? "";
    document.getElementById("edit_middle_name").value = patient.middle_name ?? "";
    document.getElementById("edit_last_name").value = patient.last_name ?? "";
    document.getElementById("edit_suffix").value = patient.suffix ?? "";
    document.getElementById("edit_sex").value = patient.sex ?? "";
    document.getElementById("edit_birthdate").value = patient.birthdate ?? "";
    document.getElementById("edit_civil_status").value = patient.civil_status ?? "";
    document.getElementById("edit_blood_type").value = patient.blood_type ?? "";
    document.getElementById("edit_height").value = patient.height ?? "";
    document.getElementById("edit_weight").value = patient.weight ?? "";
    document.getElementById("edit_provider_id").value = patient.provider_id ?? "";
    document.getElementById("edit_allow_sms").value = patient.allow_sms ?? "";
    document.getElementById("edit_allow_voice_calls").value = patient.allow_voice_calls ?? "";
    document.getElementById("edit_allow_email").value = patient.allow_email ?? "";
    document.getElementById("edit_allow_hie").value = patient.allow_hie ?? "";
    document.getElementById("edit_allow_postcard").value = patient.allow_postcard ?? "";
    document.getElementById("edit_race").value = patient.race ?? "";
    document.getElementById("edit_ethnicity").value = patient.ethnicity ?? "";
    document.getElementById("edit_religion").value = patient.religion ?? "";
    document.getElementById("edit_language").value = patient.language ?? "";

    document.getElementById("edit_address_line").value = patient.contact_address_line ?? "";
    document.getElementById("edit_city").value = patient.contact_city ?? "";
    document.getElementById("edit_province").value = patient.contact_province ?? "";
    document.getElementById("edit_zip_code").value = patient.contact_zip_code ?? "";
    document.getElementById("edit_home_phone").value = patient.contact_home_phone ?? "";
    document.getElementById("edit_mobile_phone").value = patient.contact_mobile_phone ?? "";
    document.getElementById("edit_work_phone").value = patient.contact_work_phone ?? "";
    document.getElementById("edit_contact_email").value = patient.contact_email ?? "";

    currentEditPatient = patient;
    loadRelatedPersons(patient.id);

    document.getElementById("edit_employer_occupation").value = patient.employer_occupation ?? "";
    document.getElementById("edit_employer_name").value = patient.employer_name ?? "";
    document.getElementById("edit_employer_address_line").value = patient.employer_address_line ?? "";
    document.getElementById("edit_employer_address_line2").value = patient.employer_address_line2 ?? "";
    document.getElementById("edit_employer_city").value = patient.employer_city ?? "";
    document.getElementById("edit_employer_state").value = patient.employer_state ?? "";
    document.getElementById("edit_employer_postal_code").value = patient.employer_postal_code ?? "";
    document.getElementById("edit_employer_country").value = patient.employer_country ?? "";
    document.getElementById("edit_employer_industry").value = patient.employer_industry ?? "";
    document.getElementById("edit_employer_employment_start_date").value = patient.employer_employment_start_date ?? "";
    document.getElementById("edit_employer_employment_end_date").value = patient.employer_employment_end_date ?? "";

    document.getElementById("edit_date_deceased").value = patient.date_deceased ?? "";
    document.getElementById("edit_reason_deceased").value = patient.reason_deceased ?? "";

    modalOverlay.classList.add("open");
}

async function loadProviderOptions(selectId)
{
    const result = await fetchProviders();
    const select = document.getElementById(selectId);

    // The select can be gone by the time this resolves -- e.g. the user
    // navigated away, or the session expired and the page redirected to
    // login mid-request.
    if (!select || !result.success) {
        return;
    }

    result.data.forEach((provider) => {
        const option = document.createElement("option");

        option.value = provider.id;
        option.textContent = `${provider.first_name} ${provider.last_name}${provider.specialty ? " — " + provider.specialty : ""}`;

        select.appendChild(option);
    });
}

async function loadPatients(user)
{
    const result = await fetchPatients();

    patientsCache = result.success ? result.data : [];

    renderPatientsTable(patientsCache, user);
}

function renderPatientsTable(patients, user)
{
    const tbody = document.getElementById("patientsTableBody");
    const countText = document.getElementById("patientCountText");

    if (!tbody || !countText) {
        return;
    }

    const canDelete = user.role === "admin";
    const canEdit = user.role === "admin" || user.role === "receptionist";

    countText.textContent = `${patientsCache.length} ${patientsCache.length === 1 ? "patient" : "patients"}`;

    if (!patients.length) {
        tbody.innerHTML = renderEmptyState(patientsCache.length === 0);
        return;
    }

    tbody.innerHTML = patients.map((patient) => {
        const fullName = [patient.first_name, patient.middle_name, patient.last_name, patient.suffix].filter(Boolean).join(" ");
        const sex = (patient.sex || "").toLowerCase();
        const sexLabel = sex ? sex.charAt(0).toUpperCase() + sex.slice(1) : "Not set";
        const sexClass = sex === "male" || sex === "female" ? sex : "unset";
        const providerName = patient.provider_first_name ? `${patient.provider_first_name} ${patient.provider_last_name}` : "";

        return `
        <tr class="pat-row" data-row-id="${patient.id}">
            <td><span class="pat-patient-no">${escapeHtml(patient.patient_no)}</span></td>
            <td>
                <div class="pat-name-cell">
                    <div class="pat-avatar">${patientAvatarHtml(patient)}</div>
                    <span class="pat-name">${escapeHtml(fullName)}</span>
                </div>
            </td>
            <td><span class="pat-sex-badge ${sexClass}">${escapeHtml(sexLabel)}</span></td>
            <td class="pat-muted ${patient.birthdate ? "" : "empty"}">${escapeHtml(patient.birthdate ? formatDate(patient.birthdate) : "No birthdate")}</td>
            <td><span class="pat-tag ${providerName ? "" : "empty"}">${providerName ? escapeHtml(providerName) : "Unassigned"}</span></td>
            <td>
                <div class="pat-actions">
                    <button class="pat-icon-btn view" data-dashboard-id="${patient.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        View</button>
                    ${canEdit
                        ? `<button class="pat-icon-btn edit" data-edit-id="${patient.id}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
                            Edit</button>`
                        : ""}
                    ${canDelete ? `<button class="pat-icon-btn delete" data-id="${patient.id}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>
                            Delete</button>` : ""}
                </div>
            </td>
        </tr>
    `;
    }).join("");

    tbody.querySelectorAll("[data-dashboard-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const patient = patientsCache.find((p) => String(p.id) === btn.getAttribute("data-dashboard-id"));

            if (patient) {
                openPatientChartTab(patient);
            }
        });
    });

    tbody.querySelectorAll(".pat-row").forEach((row) => {
        row.addEventListener("click", (event) => {
            if (event.target.closest("button")) {
                return;
            }

            const patient = patientsCache.find((p) => String(p.id) === row.getAttribute("data-row-id"));

            if (patient) {
                openPatientChartTab(patient);
            }
        });
    });

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const patient = patientsCache.find((p) => String(p.id) === btn.getAttribute("data-edit-id"));

            if (patient) {
                openEditModal(patient);
            }
        });
    });

    if (canDelete) {
        tbody.querySelectorAll(".pat-icon-btn.delete").forEach((btn) => {
            btn.addEventListener("click", async () => {
                if (!confirm("Delete this patient? This can be reversed by an administrator (soft delete).")) {
                    return;
                }

                await deletePatient(btn.getAttribute("data-id"));
                await loadPatients(user);
            });
        });
    }
}

function renderEmptyState(noneAtAll)
{
    const heading = noneAtAll ? "No patients yet" : "No matching patients";
    const message = noneAtAll
        ? "Registered patients will appear here."
        : "Try a different search term or filter.";

    return `
        <tr>
            <td colspan="6" class="pat-empty-state">
                <div class="pat-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
                <strong>${heading}</strong>
                <p>${message}</p>
            </td>
        </tr>
    `;
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}

function formatDate(value)
{
    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function calculateAge(birthdate)
{
    if (!birthdate) {
        return null;
    }

    const dob = new Date(birthdate);

    if (Number.isNaN(dob.getTime())) {
        return null;
    }

    const today = new Date();

    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
    }

    return age;
}

function formatDateTime(value)
{
    if (!value) {
        return "";
    }

    const date = new Date(value.replace(" ", "T"));

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
    });
}

function clearErrors(fields, prefix)
{
    fields.forEach((field) => {
        const errorEl = document.getElementById(`err-${prefix}${field}`);

        if (errorEl) {
            errorEl.textContent = "";
        }
    });
}

function showAlert(containerId, message, type)
{
    const container = document.getElementById(containerId);

    container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;
}

function showListAlert(message, type)
{
    const container = document.getElementById("listAlert");

    if (!container) {
        return;
    }

    container.innerHTML = `<div class="form-alert ${type}">${message}</div>`;
}

function generateAiReportHtml(patient, aiData) {
    const data = aiData.analysis || {};
    const warningsHtml = (data.warnings || []).map(w => `<li>${escapeHtml(w)}</li>`).join("");
    const recsHtml = (data.recommendations || []).map(r => `<li>${escapeHtml(r)}</li>`).join("");
    const fullName = [patient.first_name, patient.middle_name, patient.last_name].filter(Boolean).join(" ");
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>AI Health Assessment Report</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 14px; margin: 40px; color: #333; line-height: 1.5; }
        h1 { font-size: 20px; color: #111; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
        h2 { font-size: 16px; color: #b91c1c; margin-top: 24px; }
        h3 { font-size: 16px; color: #047857; margin-top: 24px; }
        .patient-info { background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px; }
        ul { margin: 12px 0; padding-left: 20px; }
        li { margin-bottom: 8px; }
        .summary { font-size: 15px; margin-bottom: 20px; font-style: italic; color: #555; }
        .footer { margin-top: 40px; font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 12px; text-align: center; }
    </style>
</head>
<body>
    <h1>AI Health Assessment Report</h1>
    
    <div class="patient-info">
        <strong>Patient:</strong> ${escapeHtml(fullName)}<br>
        <strong>Generated At:</strong> ${escapeHtml(data.generated_at || new Date().toLocaleString())}
    </div>

    <div class="summary">
        ${escapeHtml(data.summary || "")}
    </div>

    <h2>Critical Warnings & Contraindications</h2>
    <ul>
        ${warningsHtml || "<li>No warnings identified.</li>"}
    </ul>

    <h3>Recommendations & Next Steps</h3>
    <ul>
        ${recsHtml || "<li>No specific recommendations.</li>"}
    </ul>

    <div class="footer">
        Disclaimer: This report is generated by Artificial Intelligence. It is intended to assist healthcare professionals and should not replace clinical judgement.
    </div>
</body>
</html>
    `;
}
export function triggerCreateVisit() {
    if (currentDashboardPatient) {
        openEncounterFormModal(null);
    }
}

export async function triggerCurrentVisit() {
    if (!currentDashboardPatient) return;

    try {
        const result = await fetchPatientEncounters(currentDashboardPatient.id);
        if (result.success && result.data && result.data.length > 0) {
            // Assume the most recent one (index 0) is the current visit
            const latestEncounter = result.data[0];
            showChartSection("encounter");
            openEncounterSummary(latestEncounter);
        } else {
            showToast("No current visit found for this patient.", "error");
        }
    } catch (e) {
        showToast("Failed to fetch current visit.", "error");
    }
}

export function triggerVisitHistory() {
    if (currentDashboardPatient) {
        showChartSection("encounter");
    }
}

export function triggerRecordsHistory() {
    if (currentDashboardPatient) {
        showChartSection("history");
    }
}

export function triggerRecordsRequest() {
    if (currentDashboardPatient) {
        const overlay = document.getElementById("patientRecordRequestModalOverlay");
        if (overlay) {
            overlay.classList.add("open");
        }
    }
}

export function generateQrdaReportHtml(patient, data) {
    const fullName = [patient.first_name, patient.middle_name, patient.last_name, patient.suffix].filter(Boolean).join(" ");
    const patientDob = patient.birthdate ? new Date(patient.birthdate).toLocaleString() : "";
    const address = [patient.address_line, patient.city, patient.province, patient.zip_code].filter(Boolean).join(", ");
    const documentId = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const now = new Date().toLocaleString();

    return `
<!DOCTYPE html>
<html>
<head>
    <title>QRDA Incidence Report</title>
    <style>
        body { font-family: Tahoma, Arial, sans-serif; font-size: 11px; margin: 20px; color: #000; }
        h1 { font-size: 16px; text-align: center; color: #003366; font-weight: bold; margin-bottom: 20px; }
        h2 { font-size: 12px; color: #003366; font-weight: bold; margin-top: 20px; margin-bottom: 5px; border-bottom: 2px solid #589689; padding-bottom: 3px; }
        table.qrda-info { width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #0000ff; }
        table.qrda-info td, table.qrda-info th { border: 1px solid #ffffff; padding: 4px; vertical-align: top; }
        table.qrda-info th { background-color: #3399ff; color: #ffffff; text-align: left; font-weight: bold; width: 20%; }
        table.qrda-info td { background-color: #ccccff; color: #000000; width: 30%; }
        
        .toc-list { list-style-type: disc; margin-left: 20px; padding: 0; }
        .toc-list li a { color: #0000ff; text-decoration: underline; }

        table.measure-table { width: 100%; border-collapse: collapse; margin-top: 10px; border: 1px solid #000; }
        table.measure-table th { background-color: #ffcc00; font-weight: bold; padding: 4px; border: 1px solid #000; text-align: center; }
        table.measure-table td { background-color: #ffffcc; padding: 4px; border: 1px solid #000; }
    </style>
</head>
<body>
    <h1>QRDA Incidence Report</h1>

    <table class="qrda-info">
        <tr>
            <th>Patient</th>
            <td colspan="3">${escapeHtml(fullName)}</td>
        </tr>
        <tr>
            <th>Date of birth</th>
            <td>${escapeHtml(patientDob)}</td>
            <th>Sex</th>
            <td>${escapeHtml(patient.sex || 'Male')}</td>
        </tr>
        <tr>
            <th>Race</th>
            <td>2106-3</td>
            <th>Ethnicity</th>
            <td>2186-5</td>
        </tr>
        <tr>
            <th>Contact info</th>
            <td>Primary Home:<br/>${escapeHtml(address)}<br/>Tel: ${escapeHtml(patient.home_phone || '333-444-2222')}</td>
            <th>Patient IDs</th>
            <td>1 1.3.6.1.4.1.115</td>
        </tr>
        <tr>
            <th>Document Id</th>
            <td colspan="3">${documentId}</td>
        </tr>
        <tr>
            <th>Document Created:</th>
            <td colspan="3">${now}</td>
        </tr>
        <tr>
            <th>Performer</th>
            <td><u>Person</u><br/>Daryl Carroll<br/>1982671962 - 2.16.840.1.113883.4.6<br/>463132 - 2.16.840.1.113883.4.336</td>
            <td colspan="2"><u>Organization</u><br/>695939209 - 2.16.840.1.113883.4.2</td>
        </tr>
        <tr>
            <th>Author</th>
            <td colspan="3">Cypress</td>
        </tr>
        <tr>
            <th>Contact info</th>
            <td colspan="3">202 Burlington Rd.<br/>Bedford, MA 01730, US<br/>Tel: (781)271-3000</td>
        </tr>
        <tr>
            <th>EHR Certification Number</th>
            <td colspan="3">123456789 2.16.840.1.113883.3.2074.1<br/>123456789 ()</td>
        </tr>
        <tr>
            <th>Legal authenticator</th>
            <td colspan="3">Henry Seven of Cypress signed at ${now}</td>
        </tr>
        <tr>
            <th>Contact info</th>
            <td colspan="3">202 Burlington Rd.<br/>Bedford, MA 01730, US<br/>Tel: (781)271-3000</td>
        </tr>
        <tr>
            <th>Document maintained by</th>
            <td colspan="3">Cypress Test Deck</td>
        </tr>
        <tr>
            <th>Contact info</th>
            <td colspan="3">202 Burlington Rd.<br/>Bedford, MA 01730, US<br/>Tel: (781)271-3000</td>
        </tr>
    </table>

    <h2 style="border: none; font-size: 14px; margin-top: 25px;">Table of Contents</h2>
    <ul class="toc-list">
        <li><a href="#measure">Measure Section</a></li>
        <li><a href="#reporting">Reporting Parameters</a></li>
        <li><a href="#patientdata">Patient Data</a></li>
    </ul>

    <h2 id="measure">Measure Section</h2>
    <table class="measure-table">
        <thead>
            <tr>
                <th>eMeasure Title</th>
                <th style="width: 150px;">Version specific identifier</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>This measure provides a standardized method for monitoring the performance of diagnostic CT to discourage unnecessarily high radiation doses, a risk factor for cancer, while preserving image quality. It is expressed as a percentage of patients with CT exams that are out-of-range based on having either excessive radiation dose or inadequate image quality relative to evidence-based thresholds based on the clinical indication for the exam. All diagnostic CT exams of specified anatomic sites performed in inpatient, outpatient and ambulatory care settings are eligible. This measure is not telehealth eligible.</td>
                <td>8A6D0454-8DF0-2D9F-018E-437F76142790</td>
            </tr>
        </tbody>
    </table>

</body>
</html>
    `;
}

