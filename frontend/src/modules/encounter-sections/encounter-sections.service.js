import { api } from "../../core/api.js?v=5";

export async function fetchEncounterSections(encounterId)
{
    const query = new URLSearchParams({ encounter_id: encounterId }).toString();

    return await api(`/encounter-sections?${query}`);
}

export async function updateEncounterSectionContent(encounterId, sectionType, content)
{
    return await api(
        "/encounter-sections",
        {
            method: "PUT",
            body: JSON.stringify({ encounter_id: encounterId, section_type: sectionType, content })
        }
    );
}

export async function signEncounterSection(encounterId, sectionType, password, amendment)
{
    return await api(
        "/encounter-sections/sign",
        {
            method: "POST",
            body: JSON.stringify({ encounter_id: encounterId, section_type: sectionType, password, amendment })
        }
    );
}

export async function deleteEncounterSection(encounterId, sectionType)
{
    return await api(
        "/encounter-sections",
        {
            method: "DELETE",
            body: JSON.stringify({ encounter_id: encounterId, section_type: sectionType })
        }
    );
}
