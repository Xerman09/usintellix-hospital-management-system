import { initAppointmentCalendarPage } from "./appointment-calendar-page.js?v=9";

export async function initAppointmentsList()
{
    await initAppointmentCalendarPage({ showProvider: true });
}
