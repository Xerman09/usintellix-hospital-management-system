import { api } from "../../core/api.js";

export async function fetchSpeechDictationItems(encounterId)
{
    const query = new URLSearchParams({ encounter_id: encounterId }).toString();

    return await api(`/encounter-speech-dictation-items?${query}`);
}

export async function addSpeechDictationItem(encounterId, data)
{
    return await api(
        "/encounter-speech-dictation-items",
        {
            method: "POST",
            body: JSON.stringify({ encounter_id: encounterId, ...data })
        }
    );
}

export async function updateSpeechDictationItem(id, data)
{
    return await api(
        "/encounter-speech-dictation-items",
        {
            method: "PUT",
            body: JSON.stringify({ id, ...data })
        }
    );
}

export async function removeSpeechDictationItem(id)
{
    return await api(
        "/encounter-speech-dictation-items",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
