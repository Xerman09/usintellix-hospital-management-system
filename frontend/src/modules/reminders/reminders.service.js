import { api } from "../../core/api.js?v=5";

export async function fetchMyReminders()
{
    return await api("/reminders/mine");
}

export async function createReminder(data)
{
    return await api(
        "/reminders",
        {
            method: "POST",
            body: JSON.stringify(data)
        }
    );
}

export async function completeReminder(reminderId)
{
    return await api(
        "/reminders/complete",
        {
            method: "POST",
            body: JSON.stringify({ reminder_id: reminderId })
        }
    );
}

export async function deleteReminder(id)
{
    return await api(
        "/reminders",
        {
            method: "DELETE",
            body: JSON.stringify({ id })
        }
    );
}
