import { api } from "../../core/api.js?v=5";
import { showToast } from "../../core/toast.js";

const VALID_TYPES = ["Active Alert", "Passive Alert", "Patient Reminder"];

const USAGE_FIELDS = [
    { label: "Race", key: "race", dataKey: "use_patient_race" },
    { label: "Ethnicity", key: "ethnicity", dataKey: "use_patient_ethnicity" },
    { label: "Language", key: "language", dataKey: "use_patient_language" },
    { label: "Sexual Orientation", key: "sexual_orientation", dataKey: "use_patient_sexual_orientation" },
    { label: "Gender Identity", key: "gender_identity", dataKey: "use_patient_gender_identity" },
    { label: "Sex", key: "sex", dataKey: "use_patient_sex" },
    { label: "Date of Birth", key: "dob", dataKey: "use_patient_dob" },
    { label: "Social Determinants of Health", key: "sdoh", dataKey: "use_patient_sdoh" },
    { label: "Health Status Assessments", key: "health_status_assessments", dataKey: "use_patient_health_status_assessments" }
];

const DEFAULT_UNKNOWN = "The source attribute value is unknown or the DSI developer did not provide any information for this field";

let rulesList = [];
let deleteTargetId = null;

export function initPracticeRules()
{
    wireDeleteModal();
    renderList();
}

/* ===================== List ===================== */

async function renderList()
{
    const root = document.getElementById("pr2Root");
    root.innerHTML = `<div class="pr2-empty">Loading...</div>`;

    const result = await api("/practice-rules");

    if (!result.success) {
        root.innerHTML = listShell(`<tr><td colspan="2"><div class="pr2-error">${esc(result.message || "Failed to load rules.")}</div></td></tr>`);
        return;
    }

    rulesList = result.data || [];
    root.innerHTML = listShell(renderRows(rulesList));
    wireList();
}

function listShell(rowsHtml)
{
    return `
        <div class="pr2-header-row">
            <h1>Rules Configuration</h1>
            <button type="button" class="pr2-btn" id="pr2AddBtn">Add new</button>
        </div>
        <hr class="pr2-divider">
        <table class="pr2-table">
            <thead><tr><th style="width: 160px;">Type</th><th>Name</th></tr></thead>
            <tbody>${rowsHtml}</tbody>
        </table>
    `;
}

function renderRows(rules)
{
    if (!rules.length) {
        return `<tr><td colspan="2" class="pr2-empty">No rules configured yet. Click "Add new" to create one.</td></tr>`;
    }

    return rules.map((rule) => `
        <tr>
            <td>${esc(displayType(rule.type))}</td>
            <td><button type="button" class="pr2-link-btn" data-rule-id="${rule.id}">${esc(rule.title)}</button></td>
        </tr>
    `).join("");
}

function displayType(type)
{
    return type === "Patient Reminder" ? "Reminder" : type;
}

function wireList()
{
    document.getElementById("pr2AddBtn").addEventListener("click", () => renderAddEdit(null));

    document.querySelectorAll("[data-rule-id]").forEach((btn) => {
        btn.addEventListener("click", () => renderDetail(Number(btn.dataset.ruleId)));
    });
}

/* ===================== Add / Edit ===================== */

async function renderAddEdit(ruleId)
{
    const root = document.getElementById("pr2Root");
    root.innerHTML = `<div class="pr2-empty">Loading...</div>`;

    let rule = null;

    if (ruleId) {
        const result = await api(`/practice-rules?id=${ruleId}`);

        if (!result.success) {
            showToast(result.message || "Failed to load rule.", "error");
            await renderList();
            return;
        }

        rule = result.data;
    }

    root.innerHTML = addEditFormHtml(rule);
    wireAddEditForm(rule);
}

function addEditFormHtml(rule)
{
    const isEdit = !!rule;

    return `
        <div class="pr2-form-header">
            <h1>${isEdit ? "Rule Edit" : "Rule Add"}</h1>
            <div class="pr2-form-actions-top">
                <button type="button" class="pr2-btn-secondary" id="pr2CancelBtn">Cancel</button>
                <button type="submit" form="pr2RuleForm" class="pr2-btn">Save</button>
            </div>
        </div>
        <hr class="pr2-divider">
        <div id="pr2FormAlert"></div>
        <form id="pr2RuleForm">
            <p class="pr2-form-section-label">Summary</p>

            <div class="pr2-form-row">
                <label>Title <span class="req">*</span></label>
                <input type="text" id="pr2Title" class="form-input" value="${escAttr(rule?.title)}">
            </div>
            <span class="form-error" id="err-title"></span>

            <div class="pr2-form-row">
                <label>Type <span class="req">*</span></label>
                <div class="pr2-type-options">
                    ${VALID_TYPES.map((type) => `
                        <label class="pr2-type-option">
                            <input type="checkbox" class="pr2-type-checkbox" value="${type}" ${rule?.type === type ? "checked" : ""}>
                            ${type}
                        </label>
                    `).join("")}
                </div>
            </div>
            <span class="form-error" id="err-type"></span>

            <div class="pr2-form-row">
                <label>Bibliographic Citation</label>
                <input type="text" id="pr2Citation" class="form-input" value="${escAttr(rule?.bibliographic_citation)}">
            </div>
            <div class="pr2-form-row">
                <label>Developer</label>
                <input type="text" id="pr2Developer" class="form-input" value="${escAttr(rule?.developer)}">
            </div>
            <div class="pr2-form-row">
                <label>Funding Source</label>
                <input type="text" id="pr2Funding" class="form-input" value="${escAttr(rule?.funding_source)}">
            </div>
            <div class="pr2-form-row">
                <label>Date of Last Review or Update</label>
                <input type="date" id="pr2DateReviewed" class="form-input" value="${escAttr(rule?.date_last_reviewed)}">
            </div>
            <div class="pr2-form-row">
                <label>Web Reference</label>
                <input type="text" id="pr2WebRef" class="form-input" value="${escAttr(rule?.web_reference)}">
            </div>
            <div class="pr2-form-row">
                <label>Referential CDS (codetype:code)</label>
                <input type="text" id="pr2RefCds" class="form-input" value="${escAttr(rule?.referential_cds)}">
            </div>

            <p class="pr2-form-section-label" style="margin-top: 22px;">Rule Usage</p>
            ${USAGE_FIELDS.map((field) => `
                <div class="pr2-form-row">
                    <label>Rule usage of Patient's ${field.label}</label>
                    <input type="text" id="pr2_${field.key}" class="form-input" value="${escAttr(rule?.[field.dataKey])}">
                </div>
            `).join("")}

            <div class="pr2-form-bottom-actions">
                <span class="pr2-form-footnote"><span class="req">*</span> Required fields</span>
            </div>
        </form>
    `;
}

function wireAddEditForm(rule)
{
    document.getElementById("pr2CancelBtn").addEventListener("click", async () => {
        if (rule) {
            await renderDetail(rule.id);
        } else {
            await renderList();
        }
    });

    const typeBoxes = document.querySelectorAll(".pr2-type-checkbox");

    typeBoxes.forEach((box) => {
        box.addEventListener("change", () => {
            if (box.checked) {
                typeBoxes.forEach((other) => {
                    if (other !== box) other.checked = false;
                });
            }
        });
    });

    document.getElementById("pr2RuleForm").addEventListener("submit", async (event) => {
        event.preventDefault();

        document.querySelectorAll("#pr2RuleForm .form-error").forEach((el) => { el.textContent = ""; });
        document.getElementById("pr2FormAlert").innerHTML = "";

        const selectedType = [...typeBoxes].find((box) => box.checked)?.value || "";

        const basics = {
            title: document.getElementById("pr2Title").value.trim(),
            type: selectedType,
            bibliographic_citation: fieldVal("pr2Citation"),
            developer: fieldVal("pr2Developer"),
            funding_source: fieldVal("pr2Funding"),
            date_last_reviewed: document.getElementById("pr2DateReviewed").value || null,
            web_reference: fieldVal("pr2WebRef"),
            referential_cds: fieldVal("pr2RefCds")
        };

        USAGE_FIELDS.forEach((field) => {
            basics[field.dataKey] = fieldVal(`pr2_${field.key}`);
        });

        // Preserve everything this form doesn't edit -- the backend
        // replaces these arrays wholesale on every PUT, so omitting them
        // here would silently wipe out reminder intervals / demographics
        // / targets / actions set via the Rule Detail page.
        const payload = rule
            ? {
                ...basics,
                reminder_intervals: rule.reminder_intervals,
                demographics_criteria: rule.demographics_criteria,
                clinical_targets: rule.clinical_targets,
                actions_list: rule.actions_list
            }
            : basics;

        const result = rule
            ? await api("/practice-rules", { method: "PUT", body: JSON.stringify({ id: rule.id, ...payload }) })
            : await api("/practice-rules", { method: "POST", body: JSON.stringify(payload) });

        if (!result.success) {
            if (result.errors) {
                Object.entries(result.errors).forEach(([field, message]) => {
                    const el = document.getElementById(`err-${field}`);
                    if (el) el.textContent = message;
                });
            }

            document.getElementById("pr2FormAlert").innerHTML = `<div class="form-alert error">${esc(result.message || "Failed to save rule.")}</div>`;
            return;
        }

        showToast(rule ? "Rule updated successfully." : "Rule added successfully.", "success");
        await renderDetail(rule ? rule.id : result.data.id);
    });
}

function fieldVal(id)
{
    return document.getElementById(id).value.trim() || null;
}

/* ===================== Detail ===================== */

async function renderDetail(ruleId)
{
    const root = document.getElementById("pr2Root");
    root.innerHTML = `<div class="pr2-empty">Loading...</div>`;

    const result = await api(`/practice-rules?id=${ruleId}`);

    if (!result.success) {
        showToast(result.message || "Failed to load rule.", "error");
        await renderList();
        return;
    }

    root.innerHTML = detailHtml(result.data);
    wireDetail(result.data);
}

function detailHtml(rule)
{
    const valOrFallback = (val) => (val && String(val).trim() !== "" ? esc(val) : `<span class="muted">${DEFAULT_UNKNOWN}</span>`);

    const ri = rule.reminder_intervals || {};
    const clinicalDetail = `Warning: ${ri.clinical_warning_val ?? "2"} ${ri.clinical_warning_unit ?? "Week"}s, Past due: ${ri.clinical_past_due_val ?? "1"} ${ri.clinical_past_due_unit ?? "Month"}s`;
    const patientDetail = `Warning: ${ri.patient_warning_val ?? "2"} ${ri.patient_warning_unit ?? "Week"}s, Past due: ${ri.patient_past_due_val ?? "1"} ${ri.patient_past_due_unit ?? "Month"}s`;

    const demoRows = Array.isArray(rule.demographics_criteria) ? rule.demographics_criteria : [];
    const targetRows = Array.isArray(rule.clinical_targets) ? rule.clinical_targets : [];
    const actionRows = Array.isArray(rule.actions_list) ? rule.actions_list : [];

    return `
        <div class="pr2-header-row">
            <h1>Rule Detail</h1>
            <button type="button" class="pr2-btn-secondary" id="pr2BackBtn">&lsaquo; Back</button>
            <button type="button" class="pr2-btn-secondary" id="pr2DeleteRuleBtn" style="margin-left: auto; color: #dc2626;">Delete Rule</button>
        </div>
        <hr class="pr2-divider">

        <div class="pr2-detail-box">
            <p class="pr2-detail-box-title">Summary <a id="pr2EditSummaryLink">(edit)</a></p>
            <p class="pr2-detail-name">${esc(rule.title)} (${esc(rule.type)})</p>

            <div class="pr2-detail-field"><strong>Bibliographic Citation:</strong> ${valOrFallback(rule.bibliographic_citation)}</div>
            <div class="pr2-detail-field"><strong>Developer:</strong> ${valOrFallback(rule.developer)}</div>
            <div class="pr2-detail-field"><strong>Funding Source:</strong> ${valOrFallback(rule.funding_source)}</div>
            <div class="pr2-detail-field"><strong>Web Reference:</strong> ${valOrFallback(rule.web_reference)}</div>
            <div class="pr2-detail-field"><strong>Referential CDS (codetype:code):</strong> ${valOrFallback(rule.referential_cds)}</div>
            ${USAGE_FIELDS.map((field) => `<div class="pr2-detail-field"><strong>Use of Patient's ${field.label}:</strong> ${valOrFallback(rule[field.dataKey])}</div>`).join("")}
        </div>

        <div class="pr2-detail-box">
            <p class="pr2-detail-box-title">Reminder intervals <a id="pr2EditIntervalsLink">(edit)</a></p>
            <table class="pr2-detail-table">
                <thead><tr><th>Type</th><th>Detail</th></tr></thead>
                <tbody>
                    <tr><td>Clinical</td><td>${esc(clinicalDetail)}</td></tr>
                    <tr><td>Patient</td><td>${esc(patientDetail)}</td></tr>
                </tbody>
            </table>
            <div class="pr2-inline-add-form" id="pr2IntervalsForm" style="display: none;"></div>
        </div>

        <div class="pr2-detail-box">
            <p class="pr2-detail-box-title">Demographics filter criteria <a id="pr2AddDemoLink">(add)</a></p>
            ${arrayTable(demoRows, [
                { key: "criteria", label: "Criteria" },
                { key: "characteristics", label: "Characteristics" },
                { key: "requirements", label: "Requirements" }
            ], "demo")}
            <div class="pr2-inline-add-form" id="pr2DemoAddForm" style="display: none;"></div>
        </div>

        <div class="pr2-detail-box">
            <p class="pr2-detail-box-title" style="font-weight: 700; font-size: 15px;">Target/Action Groups</p>

            <div class="pr2-subbox">
                <p class="pr2-detail-box-title">Clinical targets <a id="pr2AddTargetLink">(add)</a></p>
                ${arrayTable(targetRows, [
                    { key: "criteria", label: "Criteria" },
                    { key: "characteristics", label: "Characteristics" },
                    { key: "requirements", label: "Requirements" }
                ], "target")}
                <div class="pr2-inline-add-form" id="pr2TargetAddForm" style="display: none;"></div>
            </div>

            <div class="pr2-subbox">
                <p class="pr2-detail-box-title">Actions <a id="pr2AddActionLink">(add)</a></p>
                ${arrayTable(actionRows, [{ key: "category_title", label: "Category/Title" }], "action")}
                <div class="pr2-inline-add-form" id="pr2ActionAddForm" style="display: none;"></div>
            </div>
        </div>
    `;
}

function arrayTable(rows, columns, rowType)
{
    if (!rows.length) {
        return `<p class="pr2-detail-field muted" style="margin-top: 8px;">None configured yet.</p>`;
    }

    return `
        <table class="pr2-detail-table">
            <thead>
                <tr>
                    <th style="width: 90px;"></th>
                    ${columns.map((col) => `<th>${esc(col.label)}</th>`).join("")}
                </tr>
            </thead>
            <tbody>
                ${rows.map((row, index) => `
                    <tr data-row-type="${rowType}" data-row-index="${index}">
                        <td class="pr2-row-actions">
                            <a class="pr2-inline-link" data-row-edit>(edit)</a>
                            <a class="pr2-inline-link danger" data-row-delete>(delete)</a>
                        </td>
                        ${columns.map((col) => `<td>${esc(row[col.key])}</td>`).join("")}
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

function wireDetail(rule)
{
    document.getElementById("pr2BackBtn").addEventListener("click", renderList);
    document.getElementById("pr2DeleteRuleBtn").addEventListener("click", () => openDeleteModal(rule));
    document.getElementById("pr2EditSummaryLink").addEventListener("click", () => renderAddEdit(rule.id));

    wireIntervalsEditor(rule);
    wireArrayEditor(rule, "demo", "demographics_criteria", [
        { key: "criteria", label: "Criteria", placeholder: "e.g. Age Min (Years)" },
        { key: "characteristics", label: "Characteristics", placeholder: "e.g. 50" },
        { key: "requirements", label: "Requirements", placeholder: "e.g. Required Inclusion" }
    ]);
    wireArrayEditor(rule, "target", "clinical_targets", [
        { key: "criteria", label: "Criteria", placeholder: "e.g. Assessment - Colon Cancer Screening" },
        { key: "characteristics", label: "Characteristics", placeholder: "e.g. Completed: Yes | Frequency: >= 1 | Interval: 1 x Months" },
        { key: "requirements", label: "Requirements", placeholder: "e.g. Required Inclusion" }
    ]);
    wireArrayEditor(rule, "action", "actions_list", [
        { key: "category_title", label: "Category/Title", placeholder: "e.g. Assessment - Colon Cancer Screening" }
    ]);
}

/* Reminder intervals editor (single object, not an array) */

function wireIntervalsEditor(rule)
{
    document.getElementById("pr2EditIntervalsLink").addEventListener("click", () => {
        const form = document.getElementById("pr2IntervalsForm");
        const ri = rule.reminder_intervals || {};

        form.innerHTML = `
            <input type="number" min="1" class="form-input" id="pr2IntClinicalWarnVal" placeholder="Clinical warning" value="${escAttr(ri.clinical_warning_val ?? "2")}" style="max-width: 90px;">
            ${unitSelect("pr2IntClinicalWarnUnit", ri.clinical_warning_unit ?? "Week")}
            <input type="number" min="1" class="form-input" id="pr2IntClinicalPastVal" placeholder="Clinical past due" value="${escAttr(ri.clinical_past_due_val ?? "1")}" style="max-width: 90px;">
            ${unitSelect("pr2IntClinicalPastUnit", ri.clinical_past_due_unit ?? "Month")}
            <input type="number" min="1" class="form-input" id="pr2IntPatientWarnVal" placeholder="Patient warning" value="${escAttr(ri.patient_warning_val ?? "2")}" style="max-width: 90px;">
            ${unitSelect("pr2IntPatientWarnUnit", ri.patient_warning_unit ?? "Week")}
            <input type="number" min="1" class="form-input" id="pr2IntPatientPastVal" placeholder="Patient past due" value="${escAttr(ri.patient_past_due_val ?? "1")}" style="max-width: 90px;">
            ${unitSelect("pr2IntPatientPastUnit", ri.patient_past_due_unit ?? "Month")}
            <button type="button" class="pr2-btn" id="pr2IntSaveBtn">Save</button>
            <button type="button" class="pr2-btn-secondary" id="pr2IntCancelBtn">Cancel</button>
        `;
        form.style.display = "flex";

        document.getElementById("pr2IntCancelBtn").addEventListener("click", () => renderDetail(rule.id));

        document.getElementById("pr2IntSaveBtn").addEventListener("click", async () => {
            const updated = {
                clinical_warning_val: document.getElementById("pr2IntClinicalWarnVal").value || "2",
                clinical_warning_unit: document.getElementById("pr2IntClinicalWarnUnit").value,
                clinical_past_due_val: document.getElementById("pr2IntClinicalPastVal").value || "1",
                clinical_past_due_unit: document.getElementById("pr2IntClinicalPastUnit").value,
                patient_warning_val: document.getElementById("pr2IntPatientWarnVal").value || "2",
                patient_warning_unit: document.getElementById("pr2IntPatientWarnUnit").value,
                patient_past_due_val: document.getElementById("pr2IntPatientPastVal").value || "1",
                patient_past_due_unit: document.getElementById("pr2IntPatientPastUnit").value
            };

            await savePartial(rule.id, { reminder_intervals: updated }, "Reminder intervals updated successfully.");
        });
    });
}

function unitSelect(id, selected)
{
    const units = ["Day", "Week", "Month", "Year"];

    return `<select id="${id}" class="form-input" style="max-width: 100px;">${units.map((unit) => `<option value="${unit}" ${unit === selected ? "selected" : ""}>${unit}</option>`).join("")}</select>`;
}

/* Generic add/edit/delete for demographics_criteria, clinical_targets, actions_list */

function wireArrayEditor(rule, rowType, arrayKey, fieldDefs)
{
    const addLinkId = { demo: "pr2AddDemoLink", target: "pr2AddTargetLink", action: "pr2AddActionLink" }[rowType];
    const addFormId = { demo: "pr2DemoAddForm", target: "pr2TargetAddForm", action: "pr2ActionAddForm" }[rowType];

    document.getElementById(addLinkId).addEventListener("click", () => {
        showRowForm(document.getElementById(addFormId), fieldDefs, {}, async (values) => {
            const rows = Array.isArray(rule[arrayKey]) ? [...rule[arrayKey]] : [];
            rows.push(values);
            await savePartial(rule.id, { [arrayKey]: rows }, "Added successfully.");
        });
    });

    document.querySelectorAll(`tr[data-row-type="${rowType}"]`).forEach((row) => {
        const index = Number(row.dataset.rowIndex);

        row.querySelector("[data-row-edit]").addEventListener("click", () => {
            const inlineForm = document.createElement("div");
            inlineForm.className = "pr2-inline-add-form";
            row.after(wrapInRow(inlineForm, fieldDefs.length + 1));

            showRowForm(inlineForm, fieldDefs, rule[arrayKey][index], async (values) => {
                const rows = [...rule[arrayKey]];
                rows[index] = values;
                await savePartial(rule.id, { [arrayKey]: rows }, "Updated successfully.");
            });
        });

        row.querySelector("[data-row-delete]").addEventListener("click", async () => {
            if (!confirm("Remove this entry?")) return;

            const rows = rule[arrayKey].filter((_, i) => i !== index);
            await savePartial(rule.id, { [arrayKey]: rows }, "Removed successfully.");
        });
    });
}

function wrapInRow(innerEl, colSpan)
{
    const tr = document.createElement("tr");
    const td = document.createElement("td");

    td.colSpan = colSpan;
    td.appendChild(innerEl);
    tr.appendChild(td);

    return tr;
}

function showRowForm(container, fieldDefs, current, onSave)
{
    container.innerHTML = fieldDefs.map((field) => `
        <input type="text" class="form-input" id="pr2RowField_${field.key}" placeholder="${escAttr(field.placeholder)}" value="${escAttr(current[field.key])}">
    `).join("") + `
        <button type="button" class="pr2-btn" id="pr2RowSaveBtn">Save</button>
        <button type="button" class="pr2-btn-secondary" id="pr2RowCancelBtn">Cancel</button>
    `;
    container.style.display = "flex";

    container.querySelector("#pr2RowCancelBtn").addEventListener("click", () => {
        container.style.display = "none";
        container.innerHTML = "";
    });

    container.querySelector("#pr2RowSaveBtn").addEventListener("click", () => {
        const values = {};
        fieldDefs.forEach((field) => {
            values[field.key] = document.getElementById(`pr2RowField_${field.key}`).value.trim();
        });
        onSave(values);
    });
}

/**
 * Fetches the current full rule, merges in a partial update, and PUTs
 * the whole thing back -- the backend replaces title/type/every JSON
 * field wholesale on every PUT, so a partial-only payload would wipe
 * out whatever this call doesn't explicitly carry forward.
 */
async function savePartial(ruleId, partial, successMessage)
{
    const current = await api(`/practice-rules?id=${ruleId}`);

    if (!current.success) {
        showToast(current.message || "Failed to load rule.", "error");
        return;
    }

    const merged = { ...current.data, ...partial };

    const result = await api("/practice-rules", {
        method: "PUT",
        body: JSON.stringify({
            id: ruleId,
            title: merged.title,
            type: merged.type,
            bibliographic_citation: merged.bibliographic_citation,
            developer: merged.developer,
            funding_source: merged.funding_source,
            date_last_reviewed: merged.date_last_reviewed,
            release_info: merged.release_info,
            web_reference: merged.web_reference,
            referential_cds: merged.referential_cds,
            reminder_intervals: merged.reminder_intervals,
            demographics_criteria: merged.demographics_criteria,
            clinical_targets: merged.clinical_targets,
            actions_list: merged.actions_list,
            use_patient_race: merged.use_patient_race,
            use_patient_ethnicity: merged.use_patient_ethnicity,
            use_patient_language: merged.use_patient_language,
            use_patient_sexual_orientation: merged.use_patient_sexual_orientation,
            use_patient_gender_identity: merged.use_patient_gender_identity,
            use_patient_sex: merged.use_patient_sex,
            use_patient_dob: merged.use_patient_dob,
            use_patient_sdoh: merged.use_patient_sdoh,
            use_patient_health_status_assessments: merged.use_patient_health_status_assessments
        })
    });

    if (!result.success) {
        showToast(result.message || "Failed to save changes.", "error");
        return;
    }

    showToast(successMessage, "success");
    await renderDetail(ruleId);
}

/* ===================== Delete ===================== */

function wireDeleteModal()
{
    document.getElementById("prDeleteCancelBtn").addEventListener("click", closeDeleteModal);

    document.getElementById("prDeleteConfirmBtn").addEventListener("click", async () => {
        if (!deleteTargetId) return;

        const result = await api("/practice-rules", { method: "DELETE", body: JSON.stringify({ id: deleteTargetId }) });

        closeDeleteModal();

        if (!result.success) {
            showToast(result.message || "Failed to delete rule.", "error");
            return;
        }

        showToast("Rule deleted successfully.", "success");
        await renderList();
    });
}

function openDeleteModal(rule)
{
    deleteTargetId = rule.id;
    document.getElementById("prDeleteRuleName").textContent = `"${rule.title}" will be soft-deleted.`;
    document.getElementById("prDeleteModal").classList.add("open");
}

function closeDeleteModal()
{
    deleteTargetId = null;
    document.getElementById("prDeleteModal").classList.remove("open");
}

/* ===================== Helpers ===================== */

function esc(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}

function escAttr(value)
{
    return esc(value ?? "");
}
