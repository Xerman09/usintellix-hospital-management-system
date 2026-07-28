import { AppointmentCalendarView } from "./appointment-calendar.view.js?v=7";

export function AppointmentsListView()
{
    return AppointmentCalendarView({
        subtitle: "Schedule and manage patient appointments.",
        showProviderField: true
    });
}
