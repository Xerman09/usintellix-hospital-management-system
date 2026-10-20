import { api } from "../../core/api.js?v=10";

export async function fetchOpdSpecialtyTemplates()
{
    return await api("/opd-specialty-templates");
}

export async function fetchOpdSpecialtyConsultations(encounterId, soapNoteId = null)
{
    const params = new URLSearchParams();
    if (encounterId) params.append("encounter_id", encounterId);
    if (soapNoteId) params.append("soap_note_id", soapNoteId);

    return await api(`/opd-specialty-consultations?${params.toString()}`);
}

export async function saveOpdSpecialtyConsultation(encounterId, data, soapNoteId = null)
{
    return await api(
        "/opd-specialty-consultations",
        {
            method: "POST",
            body: JSON.stringify({
                encounter_id: encounterId,
                soap_note_id: soapNoteId,
                ...data
            })
        }
    );
}

export async function updateOpdSpecialtyConsultation(id, data)
{
    return await api(
        "/opd-specialty-consultations",
        {
            method: "PUT",
            body: JSON.stringify({
                id,
                ...data
            })
        }
    );
}

export async function removeOpdSpecialtyConsultation(id)
{
    return await api(
        "/opd-specialty-consultations",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
