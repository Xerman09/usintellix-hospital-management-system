// One-shot mailbox for "search this term" handed off from the top navbar
// search box to the Finder tab, same pattern as pending-patient-view.js's
// own localStorage mailbox (setPendingPatientView/consumePendingPatientView)
// -- consumed once then cleared so it never re-fires on a later, unrelated
// visit to the Finder tab.
const STORAGE_KEY = "pendingFinderSearch";

export function setPendingFinderSearch(term)
{
    localStorage.setItem(STORAGE_KEY, term);
}

export function consumePendingFinderSearch()
{
    const value = localStorage.getItem(STORAGE_KEY);

    localStorage.removeItem(STORAGE_KEY);

    return value;
}
