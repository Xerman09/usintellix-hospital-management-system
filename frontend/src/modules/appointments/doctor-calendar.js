import { initAppointmentCalendarPage } from "./appointment-calendar-page.js?v=9";

export async function initDoctorCalendar()
{
    await initAppointmentCalendarPage({ showProvider: false });
}
