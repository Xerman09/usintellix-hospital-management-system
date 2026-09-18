import { api } from "../../core/api.js";

export async function fetchTemplateCategories()
{
    return await api("/template-categories");
}

export async function createTemplateCategory(data)
{
    return await api("/template-categories", { method: "POST", body: JSON.stringify(data) });
}

export async function updateTemplateCategory(id, data)
{
    return await api("/template-categories", { method: "PUT", body: JSON.stringify({ id, ...data }) });
}

export async function deleteTemplateCategory(id)
{
    return await api("/template-categories", { method: "DELETE", body: JSON.stringify({ id }) });
}

export async function fetchTemplateGroups()
{
    return await api("/template-groups");
}

export async function createTemplateGroup(data)
{
    return await api("/template-groups", { method: "POST", body: JSON.stringify(data) });
}

export async function updateTemplateGroup(id, data)
{
    return await api("/template-groups", { method: "PUT", body: JSON.stringify({ id, ...data }) });
}

export async function deleteTemplateGroup(id)
{
    return await api("/template-groups", { method: "DELETE", body: JSON.stringify({ id }) });
}

export async function fetchTemplateProfiles()
{
    return await api("/template-profiles");
}

export async function createTemplateProfile(data)
{
    return await api("/template-profiles", { method: "POST", body: JSON.stringify(data) });
}

export async function updateTemplateProfile(id, data)
{
    return await api("/template-profiles", { method: "PUT", body: JSON.stringify({ id, ...data }) });
}

export async function deleteTemplateProfile(id)
{
    return await api("/template-profiles", { method: "DELETE", body: JSON.stringify({ id }) });
}

export async function setTemplateProfileActive(id, active)
{
    return await api("/template-profiles/active", { method: "PUT", body: JSON.stringify({ id, active }) });
}

export async function fetchDefaultTemplateAssignments()
{
    return await api("/patient-template-assignments");
}

export async function fetchPatientTemplateAssignments(patientId)
{
    const query = new URLSearchParams({ patient_id: patientId }).toString();

    return await api(`/patient-template-assignments?${query}`);
}

export async function assignTemplates(patientId, filenames, categoryId)
{
    return await api(
        "/patient-template-assignments",
        {
            method: "POST",
            body: JSON.stringify({ patient_id: patientId, templates: filenames, category_id: categoryId })
        }
    );
}

export async function unassignTemplate(id)
{
    return await api("/patient-template-assignments", { method: "DELETE", body: JSON.stringify({ id }) });
}

export async function updateTemplateFileCategory(filename, categoryId)
{
    return await api(
        "/document-templates/category",
        {
            method: "PUT",
            body: JSON.stringify({ filename, category_id: categoryId })
        }
    );
}
