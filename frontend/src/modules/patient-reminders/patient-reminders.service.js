import { api } from "../../core/api.js?v=5";

export async function fetchPatientReminders({ sort = "item", dir = "asc", page = 1, perPage = 25 } = {})
{
    const query = new URLSearchParams({ sort, dir, page, per_page: perPage }).toString();

    return await api(`/patient-reminders?${query}`);
}

export async function processReminders()
{
    return await api("/patient-reminders/process", { method: "POST" });
}

export async function processAndSendReminders()
{
    return await api("/patient-reminders/process-and-send", { method: "POST" });
}

export async function fetchMyReminders()
{
    return await api("/patient-reminders/mine");
}

export async function fetchReminderActions(patientReminderId)
{
    const query = new URLSearchParams({ patient_reminder_id: patientReminderId }).toString();

    return await api(`/patient-reminders/actions?${query}`);
}

export async function addReminderAction(patientReminderId, data)
{
    return await api(
        "/patient-reminders/actions",
        {
            method: "POST",
            body: JSON.stringify({ patient_reminder_id: patientReminderId, ...data })
        }
    );
}
