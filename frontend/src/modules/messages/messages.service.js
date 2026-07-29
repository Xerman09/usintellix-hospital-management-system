import { api } from "../../core/api.js";

export async function fetchMyMessages(scope = "active")
{
    return await api(`/messages/mine?${new URLSearchParams({ scope }).toString()}`);
}

export async function fetchRecipientOptions()
{
    return await api("/messages/recipients");
}

export async function createConversation(data)
{
    return await api(
        "/messages",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function sendMessage(conversationId, body, extra = {})
{
    return await api(
        "/messages/conversation/messages",
        {
            method: "POST",
            body: JSON.stringify({ conversation_id: conversationId, body, ...extra })
        }
    );
}

export async function deleteMessage(messageId)
{
    return await api(
        "/messages/conversation/messages",
        {
            method: "DELETE",
            body: JSON.stringify({ message_id: messageId })
        }
    );
}

export async function fetchPatientMessages(patientId)
{
    const query = new URLSearchParams({ patient_id: patientId }).toString();

    return await api(`/messages/patient?${query}`);
}

export async function sendPatientMessage(patientId, recipientId, body, extra = {})
{
    const conversationResult = await createConversation({ participant_ids: [Number(recipientId)] });

    if (!conversationResult.success) {
        return conversationResult;
    }

    return await sendMessage(
        conversationResult.data.conversation_id,
        body,
        { patient_id: patientId, ...extra }
    );
}

export async function fetchMessageTypes()
{
    return await api("/messages/types");
}

export async function createMessageType(data)
{
    return await api("/messages/types", { method: "POST", body: JSON.stringify(data) });
}

export async function updateMessageType(id, data)
{
    return await api("/messages/types", { method: "PUT", body: JSON.stringify({ id, ...data }) });
}

export async function deleteMessageType(id)
{
    return await api("/messages/types", { method: "DELETE", body: JSON.stringify({ id }) });
}

export async function fetchMessageStatuses()
{
    return await api("/messages/statuses");
}

export async function createMessageStatus(data)
{
    return await api("/messages/statuses", { method: "POST", body: JSON.stringify(data) });
}

export async function updateMessageStatus(id, data)
{
    return await api("/messages/statuses", { method: "PUT", body: JSON.stringify({ id, ...data }) });
}

export async function deleteMessageStatus(id)
{
    return await api("/messages/statuses", { method: "DELETE", body: JSON.stringify({ id }) });
}
