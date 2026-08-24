import { api } from "../../core/api.js?v=5";

export async function fetchRelatedPersons(patientId)
{
    return await api(`/related-persons?${new URLSearchParams({ patient_id: patientId }).toString()}`);
}

export async function addRelatedPerson(patientId, data)
{
    return await api(
        "/related-persons",
        { method: "POST", body: JSON.stringify({ patient_id: patientId, ...data }) }
    );
}

export async function updateRelatedPerson(id, data)
{
    return await api(
        "/related-persons",
        { method: "PUT", body: JSON.stringify({ id, ...data }) }
    );
}

export async function removeRelatedPerson(id)
{
    return await api(
        "/related-persons",
        { method: "DELETE", body: JSON.stringify({ id }) }
    );
}

export async function fetchTelecoms(relatedPersonId)
{
    return await api(`/related-persons/telecoms?${new URLSearchParams({ related_person_id: relatedPersonId }).toString()}`);
}

export async function addTelecom(relatedPersonId, data)
{
    return await api(
        "/related-persons/telecoms",
        { method: "POST", body: JSON.stringify({ related_person_id: relatedPersonId, ...data }) }
    );
}

export async function updateTelecom(id, data)
{
    return await api(
        "/related-persons/telecoms",
        { method: "PUT", body: JSON.stringify({ id, ...data }) }
    );
}

export async function removeTelecom(id)
{
    return await api(
        "/related-persons/telecoms",
        { method: "DELETE", body: JSON.stringify({ id }) }
    );
}

export async function fetchAddresses(relatedPersonId)
{
    return await api(`/related-persons/addresses?${new URLSearchParams({ related_person_id: relatedPersonId }).toString()}`);
}

export async function addAddress(relatedPersonId, data)
{
    return await api(
        "/related-persons/addresses",
        { method: "POST", body: JSON.stringify({ related_person_id: relatedPersonId, ...data }) }
    );
}

export async function updateAddress(id, data)
{
    return await api(
        "/related-persons/addresses",
        { method: "PUT", body: JSON.stringify({ id, ...data }) }
    );
}

export async function removeAddress(id)
{
    return await api(
        "/related-persons/addresses",
        { method: "DELETE", body: JSON.stringify({ id }) }
    );
}
