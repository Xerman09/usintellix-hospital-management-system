// Lets another module (e.g. the Flow board) hand off "open this patient's
// chart" to the Patients tab -- across tabs in the same window, or into a
// freshly opened browser window/tab (localStorage is shared same-origin).
const STORAGE_KEY = "pendingPatientView";

export function setPendingPatientView(patientNo)
{
    localStorage.setItem(STORAGE_KEY, patientNo);
}

export function hasPendingPatientView()
{
    return localStorage.getItem(STORAGE_KEY) !== null;
}

export function consumePendingPatientView()
{
    const value = localStorage.getItem(STORAGE_KEY);

    localStorage.removeItem(STORAGE_KEY);

    return value;
}

// Tracks the patient whose chart is currently open in the shared Patient
// Chart tab, so it can be reopened after a page refresh. Unlike the
// one-shot "pending" handoff above, this is NOT consumed on read -- it
// just reflects "whichever patient was last shown" until overwritten by
// opening a different one. Whether it actually gets restored on load is
// gated by TabManager's own saved tab list (see dashboard.js), so a
// closed chart tab won't reopen even though this value lingers.
const LAST_ACTIVE_KEY = "lastActivePatientChartNo";

export function setLastActivePatientChart(patientNo)
{
    localStorage.setItem(LAST_ACTIVE_KEY, patientNo);
}

export function getLastActivePatientChart()
{
    return localStorage.getItem(LAST_ACTIVE_KEY);
}
