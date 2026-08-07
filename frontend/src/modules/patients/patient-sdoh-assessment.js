import { showToast } from "../../core/toast.js";
import { fetchSdohAssessments, addSdohAssessment, updateSdohAssessment } from "./patient-sdoh-assessment.service.js";
import { fetchScreeningTools } from "../screening-tools/screening-tools.service.js";
import { fetchProviders } from "../providers/providers.service.js";
import { addPatientHealthConcern } from "../patient-health-concerns/patient-health-concerns.service.js";

// -- Field/option catalogs -----------------------------------------------

export const DISABILITY_ITEMS = [
    { key: "disability_walking", label: "Do you have serious difficulty walking or climbing stairs?" },
    { key: "disability_seeing", label: "Do you have serious difficulty seeing, even when wearing glasses?" },
    { key: "disability_hearing", label: "Do you have serious difficulty hearing?" },
    { key: "disability_concentrating", label: "Do you have serious difficulty concentrating, remembering, or making decisions?" },
    { key: "disability_dressing_bathing", label: "Do you have difficulty dressing or bathing?" },
    { key: "disability_errands", label: "Do you have difficulty doing errands alone?" }
];

const YES_NO_DECLINED = [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
    { value: "declined", label: "Declined" }
];

export const DOMAIN_FIELDS = [
    { key: "housing", label: "Housing Instability", options: YES_NO_DECLINED },
    {
        key: "transportation", label: "Transportation Insecurity", options: [
            { value: "yes_medical", label: "Yes – medical" },
            { value: "yes_non_medical", label: "Yes – non-medical" },
            { value: "no", label: "No" },
            { value: "declined", label: "Declined" },
            { value: "unable_to_respond", label: "Unable to respond" }
        ]
    },
    {
        key: "utilities", label: "Utilities Insecurity", options: [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
            { value: "already_shut_off", label: "Already shut off" },
            { value: "declined", label: "Declined" }
        ]
    },
    { key: "interpersonal_safety", label: "Interpersonal Safety", options: YES_NO_DECLINED },
    {
        key: "financial_strain", label: "Financial Strain", options: [
            { value: "very_hard", label: "Very hard" },
            { value: "hard", label: "Hard" },
            { value: "somewhat_hard", label: "Somewhat hard" },
            { value: "not_very_hard", label: "Not very hard" }
        ]
    },
    {
        key: "social_isolation", label: "Social Isolation", options: [
            { value: "never", label: "Never" },
            { value: "rarely", label: "Rarely" },
            { value: "sometimes", label: "Sometimes" },
            { value: "often", label: "Often" },
            { value: "always", label: "Always" },
            { value: "declined", label: "Declined" }
        ]
    },
    { key: "childcare", label: "Childcare Needs", options: YES_NO_DECLINED },
    { key: "digital_access", label: "Digital Access", options: YES_NO_DECLINED }
];

const SUMMARY_DOMAIN_ORDER = [
    { key: "food_insecurity", label: "Food Insecurity", statusField: "food_insecurity_status" },
    { key: "housing", label: "Housing Instability", statusField: "housing_status" },
    { key: "transportation", label: "Transportation Insecurity", statusField: "transportation_status" },
    { key: "utilities", label: "Utilities Insecurity", statusField: "utilities_status" },
    { key: "interpersonal_safety", label: "Interpersonal Safety", statusField: "interpersonal_safety_status" },
    { key: "financial_strain", label: "Financial Strain", statusField: "financial_strain_status" },
    { key: "social_isolation", label: "Social Isolation", statusField: "social_isolation_status" },
    { key: "childcare", label: "Childcare Needs", statusField: "childcare_status" },
    { key: "digital_access", label: "Digital Access", statusField: "digital_access_status" }
];

const POSITIVE_RULES = {
    food_insecurity: (v) => v === "at_risk",
    housing: (v) => v === "yes",
    transportation: (v) => v === "yes_medical" || v === "yes_non_medical",
    utilities: (v) => v === "yes" || v === "already_shut_off",
    interpersonal_safety: (v) => v === "yes",
    financial_strain: (v) => v === "very_hard" || v === "hard",
    social_isolation: (v) => v === "often" || v === "always",
    childcare: (v) => v === "yes",
    digital_access: (v) => v === "yes"
};

const OPTION_LABELS = {
    food_insecurity_status: { auto_determined: "Auto-determined", at_risk: "At risk", no_risk: "No risk", declined: "Declined" },
    hvs_worried_food: { often_true: "Often true", sometimes_true: "Sometimes true", never_true: "Never true" },
    hvs_food_didnt_last: { often_true: "Often true", sometimes_true: "Sometimes true", never_true: "Never true" },
    disability_overall_status: { safe: "I'm Safe.", vulnerable: "I'm Vulnerable.", at_risk: "I'm at risk.", in_crisis: "I'm in crisis." },
    employment_status: {
        unemployed: "Unemployed", part_time_temporary: "Part-time / temporary", full_time: "Full-time",
        otherwise_unemployed: "Otherwise unemployed (student/retired/disabled/caregiver)", declined: "Declined"
    },
    education_level: {
        less_than_hs: "< High school", hs_graduate: "High school graduate", ged: "GED or equivalent",
        some_college: "Some college, no degree", associate_degree: "Associate degree", bachelors_degree: "Bachelor's degree",
        masters_degree: "Master's degree", professional_school_degree: "Professional school degree",
        doctoral_degree: "Doctoral degree", declined: "Declined"
    },
    caregiver_status: { yes: "Yes", no: "No" },
    veteran_status: { yes: "Yes", no: "No" },
    pregnancy_status: { pregnant: "Pregnant", not_pregnant: "Not pregnant", possible_pregnancy: "Possible pregnancy", not_yet_confirmed: "Pregnancy not yet confirmed" },
    postpartum_status: { not_postpartum: "Not postpartum", postpartum_under_6wk: "Postpartum <6 weeks", postpartum_6wk_1yr: "Postpartum 6wk–1yr", declined: "Declined" },
    pregnancy_intention: {
        not_sure: "Not sure of desire to become pregnant (finding)", ambivalent: "Ambivalent about becoming pregnant (finding)",
        no_desire: "No desire to become pregnant (finding)", wants_pregnant: "Wants to become pregnant (finding)"
    }
};

DISABILITY_ITEMS.forEach((item) => { OPTION_LABELS[item.key] = { yes: "Yes", no: "No", declined: "Declined" }; });
DOMAIN_FIELDS.forEach((domain) => {
    OPTION_LABELS[`${domain.key}_status`] = domain.options.reduce((map, opt) => { map[opt.value] = opt.label; return map; }, {});
});

const CONCERN_RULES = [
    { test: (d) => d.food_insecurity_status === "at_risk", concerns: [{ title: "Food insecurity", coding: "SNOMED CT:733423003" }] },
    { test: (d) => d.housing_status === "yes", concerns: [{ title: "Homeless", coding: "SNOMED CT:32911000" }] },
    {
        test: (d) => d.financial_strain_status === "very_hard" || d.financial_strain_status === "hard",
        concerns: [
            { title: "Economic circumstances affecting care", coding: "SNOMED CT:11403006" },
            { title: "Income insufficient to meet financial needs", coding: "SNOMED CT:423656007" }
        ]
    },
    { test: (d) => d.interpersonal_safety_status === "yes", concerns: [{ title: "Victim of intimate partner abuse", coding: "SNOMED CT:706893006" }] },
    { test: (d) => d.childcare_status === "yes", concerns: [{ title: "Difficulty finding daycare services", coding: "SNOMED CT:55607006" }] },
    { test: (d) => d.digital_access_status === "yes", concerns: [{ title: "Difficulty accessing digital technology", coding: null }] }
];

const DOMAIN_CARE_PLAN = {
    food_insecurity: { tag: "Food Insecurity", goal: "Food security (finding) — target: No risk; measure: Food insecurity risk [HVS]", intervention: "Assistance with application for food pantry program — reason: Food insecurity risk" },
    housing: { tag: "Housing Instability", goal: "Housing adequate (finding) — target: No; measure: Are you worried about losing your housing [PRAPARE]", intervention: "Referral to local housing assistance resources — reason: Housing instability risk" },
    transportation: { tag: "Transportation Insecurity", goal: "Reliable transportation to care — target: No; measure: Transportation barriers to medical care [PRAPARE]", intervention: "Referral to transportation assistance program (medical or non-medical trip services) — reason: Transportation insecurity risk" },
    utilities: { tag: "Utility Insecurity", goal: "No threat of utility shutoff — target: No; measure: Utilities threatened to be shut off in last 12Mo", intervention: "Referral to utility bill assistance program — reason: Utility shutoff risk" },
    interpersonal_safety: { tag: "Intimate Partner Violence", goal: "Safe interpersonal environment — target: No; measure: IPV screen", intervention: "Provide IPV resources and safety planning; social work referral — reason: IPV risk present" },
    financial_strain: { tag: "Financial Strain", goal: "Financial stability (finding) — target: Not very hard; measure: Difficulty covering costs of living [PRAPARE]", intervention: "Referral to financial counseling and benefits assistance program — reason: Financial strain risk" },
    social_isolation: { tag: "Social Isolation", goal: "Adequate social support — target: Never/Rarely; measure: Frequency of social/emotional support needed but not received [PRAPARE]", intervention: "Referral to community/social support program or senior center — reason: Social isolation risk" },
    childcare: { tag: "Material Hardship", goal: "Childcare needs addressed — target: No; measure: Childcare needs present", intervention: "Provide childcare resources and referral — reason: Childcare needs present" },
    digital_access: { tag: "Digital Access", goal: "Adequate digital access — target: No; measure: Difficulty accessing digital technology/internet services", intervention: "Provide digital literacy resources and low-cost internet/device program referral — reason: Digital access risk" }
};

const DETAIL_FIELDS = [
    "assessment_date", "screening_tool_id", "assessor_provider_id",
    "food_insecurity_status", "food_insecurity_notes", "hvs_worried_food", "hvs_food_didnt_last",
    "disability_overall_status", "disability_notes",
    "disability_walking", "disability_seeing", "disability_hearing",
    "disability_concentrating", "disability_dressing_bathing", "disability_errands",
    "housing_status", "housing_notes",
    "transportation_status", "transportation_notes",
    "utilities_status", "utilities_notes",
    "interpersonal_safety_status", "interpersonal_safety_notes",
    "financial_strain_status", "financial_strain_notes",
    "social_isolation_status", "social_isolation_notes",
    "childcare_status", "childcare_notes",
    "digital_access_status", "digital_access_notes",
    "employment_status", "education_level", "caregiver_status", "veteran_status",
    "pregnancy_status", "estimated_due_date", "postpartum_status", "postpartum_end_date", "pregnancy_intention",
    "additional_interventions"
];

// -- Module state ----------------------------------------------------------

let currentPatientId = null;
let sdohAssessments = [];
let sdohCatalogsLoaded = false;
let cachedScreeningTools = [];
let cachedProviders = [];
let foodStatusManuallySet = false;
let previousState = "summary";
let pendingConcernRecord = null;

export async function initSdohAssessment(patientId)
{
    currentPatientId = patientId;
    sdohAssessments = [];

    renderFields();
    wireOnce();

    await loadSdohCatalogsIfNeeded();
    await loadAssessments(patientId);

    showState("summary");
}

function wireOnce()
{
    const root = document.getElementById("pdSdohPanel");

    if (root.dataset.wired === "true") {
        return;
    }
    root.dataset.wired = "true";

    document.getElementById("pdSdohNewBtn").addEventListener("click", () => openForm(null));
    document.getElementById("pdSdohListNewBtn").addEventListener("click", () => openForm(null));
    document.getElementById("pdSdohEditBtn").addEventListener("click", () => openForm(sdohAssessments[0]));
    document.getElementById("pdSdohViewAllBtn").addEventListener("click", () => { renderList(); showState("list"); });
    document.getElementById("pdSdohBackToSummaryBtn").addEventListener("click", (event) => { event.preventDefault(); showState("summary"); });
    document.getElementById("pdSdohCancelBtn").addEventListener("click", () => showState(previousState));
    document.getElementById("pdSdohForm").addEventListener("submit", handleFormSubmit);
    document.getElementById("pdSdohSkipConcernsBtn").addEventListener("click", () => showState("summary"));
    document.getElementById("pdSdohAddSelectedConcernsBtn").addEventListener("click", handleAddSelectedConcerns);

    wireLiveComputation();
}

async function loadSdohCatalogsIfNeeded()
{
    if (sdohCatalogsLoaded) {
        return;
    }

    const [toolsResult, providersResult] = await Promise.all([fetchScreeningTools(), fetchProviders()]);

    cachedScreeningTools = toolsResult.success ? toolsResult.data : [];
    cachedProviders = providersResult.success ? providersResult.data : [];

    const toolSelect = document.getElementById("pdSdoh_screening_tool_id");
    toolSelect.innerHTML = `<option value="">-- Select One --</option>` +
        cachedScreeningTools.map((tool) => `<option value="${tool.id}">${escapeHtml(tool.name)}</option>`).join("");

    const providerSelect = document.getElementById("pdSdoh_assessor_provider_id");
    providerSelect.innerHTML = `<option value="">-- Select One --</option>` +
        cachedProviders.map((provider) => {
            const label = `${provider.first_name} ${provider.last_name}${provider.specialty ? " — " + provider.specialty : ""}`;
            return `<option value="${provider.id}">${escapeHtml(label)}</option>`;
        }).join("");

    sdohCatalogsLoaded = true;
}

async function loadAssessments(patientId)
{
    const result = await fetchSdohAssessments(patientId);

    sdohAssessments = result.success ? result.data : [];

    renderSummary();
}

function showState(name)
{
    document.getElementById("pdSdohSummaryState").style.display = name === "summary" ? "block" : "none";
    document.getElementById("pdSdohForm").style.display = name === "form" ? "block" : "none";
    document.getElementById("pdSdohListState").style.display = name === "list" ? "block" : "none";
    document.getElementById("pdSdohConcernsState").style.display = name === "concerns" ? "block" : "none";
}

// -- Summary ----------------------------------------------------------------

function renderSummary()
{
    const empty = document.getElementById("pdSdohSummaryEmpty");
    const body = document.getElementById("pdSdohSummaryBody");
    const editBtn = document.getElementById("pdSdohEditBtn");

    if (!sdohAssessments.length) {
        empty.style.display = "block";
        body.style.display = "none";
        editBtn.style.display = "none";
        return;
    }

    empty.style.display = "none";
    body.style.display = "block";
    editBtn.style.display = "inline-flex";

    const record = sdohAssessments[0];

    document.getElementById("pdSdohSummaryMeta").textContent =
        `Assessment Date: ${record.assessment_date} | Tool: ${record.screening_tool_name || "—"} | Assessor: ${record.assessor_provider_name || "—"} | Updated: ${record.updated_at || record.created_at || ""}`;

    document.getElementById("pdSdohTotalPositivesBadge").textContent = `Total Positives: ${record.score ?? 0}`;

    const disabilityBadge = document.getElementById("pdSdohDisabilityBadge");
    if (record.disability_overall_status) {
        disabilityBadge.textContent = `Disability: ${OPTION_LABELS.disability_overall_status[record.disability_overall_status] || record.disability_overall_status}`;
        disabilityBadge.style.display = "inline-block";
    } else {
        disabilityBadge.style.display = "none";
    }

    const tbody = document.getElementById("pdSdohSummaryDomainTableBody");
    tbody.innerHTML = SUMMARY_DOMAIN_ORDER.map((domain) => {
        const value = record[domain.statusField];
        const label = value ? (OPTION_LABELS[domain.statusField][value] || value) : "—";
        const isPositive = value && POSITIVE_RULES[domain.key] && POSITIVE_RULES[domain.key](value);
        const badgeClass = value ? (isPositive ? "pd-sdoh-status-positive" : "pd-sdoh-status-negative") : "pd-sdoh-status-none";

        return `<tr><td>${escapeHtml(domain.label)}</td><td><span class="pd-sdoh-status-badge ${badgeClass}">${escapeHtml(label)}</span></td></tr>`;
    }).join("");
}

// -- Form: render static option lists + dynamic field blocks ---------------

function renderFields()
{
    const disabilityContainer = document.getElementById("pdSdohDisabilityFields");
    disabilityContainer.innerHTML = DISABILITY_ITEMS.map((item) => `
        <div class="form-group full">
            <label>${escapeHtml(item.label)}</label>
            <select class="form-input" id="pdSdoh_${item.key}">
                <option value="">-- Select One --</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="declined">Declined</option>
            </select>
        </div>
    `).join("");

    const domainContainer = document.getElementById("pdSdohDomainFields");
    domainContainer.innerHTML = DOMAIN_FIELDS.map((domain) => `
        <div class="pd-sdoh-domain-box">
            <div class="pd-sdoh-domain-title">${escapeHtml(domain.label)}</div>
            <div class="form-group">
                <label>Status</label>
                <select class="form-input pd-sdoh-domain-status" id="pdSdoh_${domain.key}_status" data-domain="${domain.key}">
                    <option value="">-- Select One --</option>
                    ${domain.options.map((opt) => `<option value="${opt.value}">${escapeHtml(opt.label)}</option>`).join("")}
                </select>
            </div>
            <div class="form-group">
                <label>Notes</label>
                <textarea class="form-input" id="pdSdoh_${domain.key}_notes" rows="2"></textarea>
            </div>
        </div>
    `).join("");
}

// -- Live computation (client-side mirror of the backend rules engine) -----

function wireLiveComputation()
{
    document.getElementById("pdSdoh_hvs_worried_food").addEventListener("change", recomputeLivePreview);
    document.getElementById("pdSdoh_hvs_food_didnt_last").addEventListener("change", recomputeLivePreview);

    document.getElementById("pdSdoh_food_insecurity_status").addEventListener("change", () => {
        foodStatusManuallySet = true;
        recomputeLivePreview();
    });

    document.getElementById("pdSdohDomainFields").addEventListener("change", (event) => {
        if (event.target.classList.contains("pd-sdoh-domain-status")) {
            recomputeLivePreview();
        }
    });

    document.getElementById("pdSdohDisabilityFields").addEventListener("change", recomputeLivePreview);
}

function calculateHungerScoreLive()
{
    const worried = document.getElementById("pdSdoh_hvs_worried_food").value;
    const didntLast = document.getElementById("pdSdoh_hvs_food_didnt_last").value;

    let points = 0;
    if (worried === "often_true" || worried === "sometimes_true") points++;
    if (didntLast === "often_true" || didntLast === "sometimes_true") points++;

    return points;
}

function collectDomainData()
{
    const data = {};

    DOMAIN_FIELDS.forEach((domain) => {
        data[`${domain.key}_status`] = document.getElementById(`pdSdoh_${domain.key}_status`).value || null;
    });

    data.food_insecurity_status = document.getElementById("pdSdoh_food_insecurity_status").value || null;

    return data;
}

function recomputeLivePreview()
{
    const hungerScore = calculateHungerScoreLive();
    document.getElementById("pdSdoh_hunger_score_display").value = String(hungerScore);

    if (!foodStatusManuallySet) {
        const resolved = hungerScore >= 1 ? "at_risk" : "no_risk";
        document.getElementById("pdSdoh_food_insecurity_status").value = resolved;
    }

    const data = collectDomainData();

    const positives = SUMMARY_DOMAIN_ORDER
        .map((d) => d.key)
        .filter((key) => {
            const field = key === "food_insecurity" ? "food_insecurity_status" : `${key}_status`;
            const value = data[field];
            return value && POSITIVE_RULES[key] && POSITIVE_RULES[key](value);
        });

    document.getElementById("pdSdoh_score_display").value = String(positives.length);

    const hasDisability = DISABILITY_ITEMS.some((item) => document.getElementById(`pdSdoh_${item.key}`).value === "yes");
    const date = document.getElementById("pdSdoh_assessment_date").value || "";

    const goalsEl = document.getElementById("pdSdoh_generated_goals_display");
    const interventionsEl = document.getElementById("pdSdoh_generated_interventions_display");

    goalsEl.value = buildCarePlanText(positives, hasDisability, date, "goal");
    interventionsEl.value = buildCarePlanText(positives, hasDisability, date, "intervention");

    autoGrowTextarea(goalsEl);
    autoGrowTextarea(interventionsEl);
}

function autoGrowTextarea(el)
{
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
}

function buildCarePlanText(positives, hasDisability, date, key)
{
    const lines = [];
    const suffix = key === "goal" ? `start: ${date}` : `ordered: ${date}`;

    positives.forEach((domainKey) => {
        const plan = DOMAIN_CARE_PLAN[domainKey];
        if (plan) {
            lines.push(`[${plan.tag}] ${plan[key]}; ${suffix}`);
        }
    });

    if (hasDisability) {
        lines.push(key === "goal"
            ? `[Disability] Functional independence supported — target: No unmet needs; measure: Disability screening [ACS-6]; ${suffix}`
            : `[Disability] Referral to disability support services and adaptive equipment/home modification assessment — reason: Functional limitation(s) identified; ${suffix}`);
    }

    return lines.join("\n");
}

// -- Form open/close ----------------------------------------------------

function openForm(record)
{
    previousState = document.getElementById("pdSdohListState").style.display === "block" ? "list" : "summary";
    foodStatusManuallySet = false;

    document.getElementById("pdSdoh_record_id").value = record ? record.id : "";
    document.getElementById("pdSdohFormAlert").innerHTML = "";

    document.getElementById("pdSdoh_assessment_date").value = record?.assessment_date || "";
    document.getElementById("pdSdoh_screening_tool_id").value = record?.screening_tool_id || "";
    document.getElementById("pdSdoh_assessor_provider_id").value = record?.assessor_provider_id || "";

    document.getElementById("pdSdoh_food_insecurity_status").value = record?.food_insecurity_status || "auto_determined";
    document.getElementById("pdSdoh_food_insecurity_notes").value = record?.food_insecurity_notes || "";
    document.getElementById("pdSdoh_hvs_worried_food").value = record?.hvs_worried_food || "";
    document.getElementById("pdSdoh_hvs_food_didnt_last").value = record?.hvs_food_didnt_last || "";
    foodStatusManuallySet = !!(record && record.food_insecurity_status && record.food_insecurity_status !== "auto_determined");

    document.getElementById("pdSdoh_disability_overall_status").value = record?.disability_overall_status || "";
    document.getElementById("pdSdoh_disability_notes").value = record?.disability_notes || "";
    DISABILITY_ITEMS.forEach((item) => {
        document.getElementById(`pdSdoh_${item.key}`).value = record?.[item.key] || "";
    });

    DOMAIN_FIELDS.forEach((domain) => {
        document.getElementById(`pdSdoh_${domain.key}_status`).value = record?.[`${domain.key}_status`] || "";
        document.getElementById(`pdSdoh_${domain.key}_notes`).value = record?.[`${domain.key}_notes`] || "";
    });

    document.getElementById("pdSdoh_employment_status").value = record?.employment_status || "";
    document.getElementById("pdSdoh_education_level").value = record?.education_level || "";
    document.getElementById("pdSdoh_caregiver_status").value = record?.caregiver_status || "";
    document.getElementById("pdSdoh_veteran_status").value = record?.veteran_status || "";

    document.getElementById("pdSdoh_pregnancy_status").value = record?.pregnancy_status || "";
    document.getElementById("pdSdoh_estimated_due_date").value = record?.estimated_due_date || "";
    document.getElementById("pdSdoh_postpartum_status").value = record?.postpartum_status || "";
    document.getElementById("pdSdoh_postpartum_end_date").value = record?.postpartum_end_date || "";
    document.getElementById("pdSdoh_pregnancy_intention").value = record?.pregnancy_intention || "";

    document.getElementById("pdSdoh_additional_interventions").value = record?.additional_interventions || "";

    recomputeLivePreview();
    showState("form");
}

async function handleFormSubmit(event)
{
    event.preventDefault();

    const details = {};
    DETAIL_FIELDS.forEach((field) => {
        const el = document.getElementById(`pdSdoh_${field}`);
        details[field] = el.value === "" ? null : el.value;
    });

    const recordId = document.getElementById("pdSdoh_record_id").value;

    const result = recordId
        ? await updateSdohAssessment(Number(recordId), details)
        : await addSdohAssessment(currentPatientId, details);

    if (!result.success) {
        document.getElementById("pdSdohFormAlert").innerHTML =
            `<div class="alert alert-error">${escapeHtml(result.message || "Failed to save SDOH Assessment.")}</div>`;
        return;
    }

    showToast(result.message || "SDOH Assessment saved successfully.", "success");
    await loadAssessments(currentPatientId);

    const saved = result.data;
    const triggeredConcerns = CONCERN_RULES.filter((rule) => rule.test(saved)).flatMap((rule) => rule.concerns);

    if (triggeredConcerns.length) {
        pendingConcernRecord = saved;
        renderConcernsScreen(triggeredConcerns);
        showState("concerns");
    } else {
        showState("summary");
    }
}

// -- List ("View All") ------------------------------------------------------

function renderList()
{
    const tbody = document.getElementById("pdSdohListTableBody");

    tbody.innerHTML = sdohAssessments.length
        ? sdohAssessments.map((record) => `
            <tr>
                <td>${escapeHtml(record.assessment_date)}</td>
                <td>${escapeHtml(record.screening_tool_name || "—")}</td>
                <td>${escapeHtml(record.assessor_provider_name || "—")}</td>
                <td>${record.score ?? 0}</td>
                <td><button type="button" class="btn-secondary" data-edit-id="${record.id}">Edit</button></td>
            </tr>
        `).join("")
        : `<tr><td colspan="5" class="pd-chart-nav-empty">No SDOH assessments found.</td></tr>`;

    tbody.querySelectorAll("[data-edit-id]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const record = sdohAssessments.find((r) => String(r.id) === btn.getAttribute("data-edit-id"));
            if (record) {
                openForm(record);
            }
        });
    });
}

// -- Post-save "Add Related Health Concerns" --------------------------------

function renderConcernsScreen(candidates)
{
    document.getElementById("pdSdohConcernsAlert").innerHTML = "";

    const list = document.getElementById("pdSdohConcernsList");
    list.innerHTML = candidates.map((concern, index) => `
        <label class="pd-sdoh-concern-item">
            <input type="checkbox" class="pd-sdoh-concern-checkbox" data-index="${index}" checked>
            <span>
                <strong>${escapeHtml(concern.title)}</strong>
                ${concern.coding ? `<br><span class="pd-sdoh-helper">${escapeHtml(concern.coding)}</span>` : ""}
            </span>
        </label>
    `).join("");

    list.dataset.candidates = JSON.stringify(candidates);
}

async function handleAddSelectedConcerns()
{
    const list = document.getElementById("pdSdohConcernsList");
    const candidates = JSON.parse(list.dataset.candidates || "[]");
    const checked = Array.from(list.querySelectorAll(".pd-sdoh-concern-checkbox:checked"))
        .map((box) => candidates[Number(box.getAttribute("data-index"))]);

    for (const concern of checked) {
        await addPatientHealthConcern(currentPatientId, {
            title: concern.title,
            coding: concern.coding,
            verification_status: "Unconfirmed",
            sdoh_assessment_id: pendingConcernRecord?.id ?? null
        });
    }

    if (checked.length) {
        showToast("Health concerns added.", "success");
    }

    pendingConcernRecord = null;
    showState("summary");
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}
