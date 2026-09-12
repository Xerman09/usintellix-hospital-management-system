import { fetchMyRecalls } from "../recalls/recalls.service.js";
import { formatApptDate, statusLabel, escapeHtml, toDateStr } from "../appointments/appointment-format.js";

export async function initPatientRecalls()
{
    const upcomingList = document.getElementById("patientRecallsUpcoming");
    const pastList = document.getElementById("patientRecallsPast");

    if (!upcomingList || !pastList) {
        return;
    }

    try {
        const result = await fetchMyRecalls();

        if (!result.success) {
            throw new Error(result.message);
        }

        const recalls = result.data || [];
        const today = toDateStr(new Date());

        const upcoming = recalls
            .filter((recall) => !recall.recall_date || recall.recall_date >= today)
            .sort((a, b) => (a.recall_date || "9999-99-99").localeCompare(b.recall_date || "9999-99-99"));

        const past = recalls
            .filter((recall) => recall.recall_date && recall.recall_date < today)
            .sort((a, b) => b.recall_date.localeCompare(a.recall_date));

        renderList(upcomingList, upcoming, "No upcoming recalls.");
        renderList(pastList, past, "No past recalls.");
    } catch (error) {
        console.error("Failed to load recalls", error);
        upcomingList.innerHTML = `<div class="appt-empty">Unable to load recalls right now.</div>`;
        pastList.innerHTML = "";
    }
}

function renderList(container, rows, emptyMessage)
{
    container.innerHTML = rows.length
        ? rows.map(recallCard).join("")
        : `<div class="appt-empty">${emptyMessage}</div>`;
}

function recallCard(recall)
{
    const providerName = [recall.provider_first_name, recall.provider_last_name].filter(Boolean).join(" ");
    const subtitle = [providerName ? `Dr. ${providerName}` : null, recall.facility_name].filter(Boolean).join(" · ");

    return `
        <div class="rec-mini-item">
            <div class="rec-mini-info">
                <strong>${escapeHtml(recall.reason || "Recall")}</strong>
                <span>${escapeHtml(subtitle || "No provider or facility specified")}</span>
            </div>
            <div class="rec-mini-date">
                <span>${recall.recall_date ? formatApptDate(recall.recall_date) : "No date set"}</span>
                <span class="status-badge ${recall.status}">${statusLabel(recall.status)}</span>
            </div>
        </div>
    `;
}
