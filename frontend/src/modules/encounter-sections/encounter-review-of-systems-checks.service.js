import { api } from "../../core/api.js?v=5";

export async function fetchReviewOfSystemsChecks(encounterId)
{
    const query = new URLSearchParams({ encounter_id: encounterId }).toString();

    return await api(`/encounter-review-of-systems-checks?${query}`);
}

export async function saveReviewOfSystemsChecks(encounterId, data)
{
    return await api(
        "/encounter-review-of-systems-checks",
        {
            method: "PUT",
            body: JSON.stringify({ encounter_id: encounterId, ...data })
        }
    );
}
