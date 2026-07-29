let pendingAppointment = null;

/**
 * Record a patient (and optionally provider) to pre-fill the next time
 * the Add Appointment modal opens -- used to bridge "Schedule" on a
 * recall into the Appointments page without the two modules needing to
 * know about each other's UI. Fields stay editable; this only sets the
 * initial values.
 */
export function setPendingAppointmentPatient(patientId, providerId = null)
{
    pendingAppointment = patientId
        ? { patientId: String(patientId), providerId: providerId ? String(providerId) : null }
        : null;
}

/**
 * Read and clear the pending patient/provider. Call once, right when
 * the Add Appointment modal is about to be (re)opened.
 */
export function consumePendingAppointmentPatient()
{
    const pending = pendingAppointment;

    pendingAppointment = null;

    return pending;
}
