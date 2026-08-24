import { api } from "../../core/api.js?v=5";

export async function fetchClinicalInstructionItems(encounterId)
{
    const query = new URLSearchParams({ encounter_id: encounterId }).toString();

    return await api(`/encounter-clinical-instruction-items?${query}`);
}

export async function addClinicalInstructionItem(encounterId, data)
{
    return await api(
        "/encounter-clinical-instruction-items",
        {
            method: "POST",
            body: JSON.stringify({ encounter_id: encounterId, ...data })
        }
    );
}

export async function updateClinicalInstructionItem(id, data)
{
    return await api(
        "/encounter-clinical-instruction-items",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function removeClinicalInstructionItem(id)
{
    return await api(
        "/encounter-clinical-instruction-items",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
