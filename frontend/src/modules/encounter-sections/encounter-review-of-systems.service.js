import { api } from "../../core/api.js?v=5";

export async function fetchReviewOfSystems(encounterId)
{
    const query = new URLSearchParams({ encounter_id: encounterId }).toString();

    return await api(`/encounter-review-of-systems?${query}`);
}

export async function saveReviewOfSystems(encounterId, data)
{
    return await api(
        "/encounter-review-of-systems",
        {
            method: "PUT",
            body: JSON.stringify({ encounter_id: encounterId, ...data })
        }
    );
}
