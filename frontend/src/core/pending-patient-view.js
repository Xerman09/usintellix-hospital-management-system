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
    window.dispatchEvent(new CustomEvent('activePatientChanged', { detail: { patientNo } }));
}

export function getLastActivePatientChart()
{
    return localStorage.getItem(LAST_ACTIVE_KEY);
}

export function clearLastActivePatientChart()
{
    localStorage.removeItem(LAST_ACTIVE_KEY);
    window.dispatchEvent(new CustomEvent('activePatientChanged', { detail: { patientNo: null } }));
}

// Tracks which chart-nav section (dashboard/history/encounter/etc.) was
// last shown for whichever patient is in the shared Patient Chart tab, so
// a page refresh reopens the same section instead of always resetting to
// the Dashboard. Keyed together with the patient number so switching to a
// different patient doesn't carry over a section that was never opened
// for them.
const LAST_ACTIVE_SECTION_KEY = "lastActivePatientChartSection";

export function setLastActiveChartSection(patientNo, section)
{
    localStorage.setItem(LAST_ACTIVE_SECTION_KEY, JSON.stringify({ patientNo, section }));
}

export function getLastActiveChartSection(patientNo)
{
    try {
        const stored = JSON.parse(localStorage.getItem(LAST_ACTIVE_SECTION_KEY));

        return stored && stored.patientNo === patientNo ? stored.section : null;
    } catch {
        return null;
    }
}
