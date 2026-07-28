import { initAppointmentCalendarPage } from "./appointment-calendar-page.js?v=7";

export async function initAppointmentsList()
{
    await initAppointmentCalendarPage({ showProvider: true });
}
