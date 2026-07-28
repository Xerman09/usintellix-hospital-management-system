import { AppointmentCalendarView } from "./appointment-calendar.view.js?v=7";

export function DoctorCalendarView()
{
    return AppointmentCalendarView({
        subtitle: "Your schedule and today's reminders.",
        showProviderField: false
    });
}
