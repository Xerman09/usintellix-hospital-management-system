// Stored on `window` rather than a module-level variable: the dev server
// (frontend/router.php) re-stamps every relative import with a fresh
// cache-busting `?v=<timestamp>` on each HTTP request, so this same source
// file, imported from two different entry points that get fetched at two
// different moments, resolves to two distinct URLs -- and the browser
// treats those as two separate ES module instances, each with its own
// isolated module-level state. A `let` here would silently break the
// set/consume handoff between them. `window` is a single shared object
// regardless of how many module copies get loaded, so it survives that.

/**
 * Record a patient (and optionally provider) to pre-fill the next time
 * the Add Appointment modal opens -- used to bridge "Schedule" on a
 * recall (or the patient dashboard's Appointments widget) into the
 * Appointments page without the two modules needing to know about each
 * other's UI. Fields stay editable; this only sets the initial values.
 */
export function setPendingAppointmentPatient(patientId, providerId = null)
{
    window.__pendingAppointment = patientId
        ? { patientId: String(patientId), providerId: providerId ? String(providerId) : null }
        : null;
}

/**
 * Read and clear the pending patient/provider. Call once, right when
 * the Add Appointment modal is about to be (re)opened.
 */
export function consumePendingAppointmentPatient()
{
    const pending = window.__pendingAppointment || null;

    window.__pendingAppointment = null;

    return pending;
}
