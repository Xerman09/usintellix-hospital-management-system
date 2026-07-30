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
