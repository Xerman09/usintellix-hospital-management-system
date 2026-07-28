import { initAppointmentCalendarPage } from "./appointment-calendar-page.js?v=7";

export async function initDoctorCalendar()
{
    await initAppointmentCalendarPage({ showProvider: false });
}
