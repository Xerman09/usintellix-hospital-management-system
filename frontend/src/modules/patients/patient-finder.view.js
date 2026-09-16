export function PatientFinderView()
{
    return `
<style>
.fnd-page { width: 100%; font-size: 13.5px; }

/* The green header + filter bars are a fixed brand color, not a themed
   surface -- same "colored accent bar stays the same color in both
   themes" precedent already used for the Messages panel header. */
.fnd-topbar {
    display: flex; align-items: center; justify-content: space-between;
    background: #4a7c1f; color: #fff; padding: 14px 18px; border-radius: 8px 8px 0 0;
}
.fnd-topbar-left { display: flex; align-items: center; gap: 18px; }
.fnd-topbar h1 { margin: 0; font-size: 19px; font-weight: 700; color: #fff; }
.fnd-add-btn {
    display: inline-flex; align-items: center; gap: 6px;
    background: none; border: none; color: #fff; font-size: 14px; font-weight: 600;
    cursor: pointer; padding: 4px 0;
}
.fnd-add-btn:hover { text-decoration: underline; }
.fnd-topbar-icons { display: flex; align-items: center; gap: 10px; }
.fnd-icon-btn {
    background: none; border: none; color: #fff; opacity: .85; cursor: pointer;
    width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; border-radius: 4px;
}
.fnd-icon-btn:hover { opacity: 1; background: rgba(255,255,255,.15); }

.fnd-body {
    border: 1px solid var(--border-color); border-top: none; border-radius: 0 0 8px 8px;
    background: var(--bg-surface); padding: 16px 18px;
}

.fnd-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border-color); margin-bottom: 14px; }
.fnd-tab {
    background: none; border: none; padding: 8px 14px; font-size: 13.5px; font-weight: 600;
    color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent;
}
.fnd-tab.active { color: var(--text-primary); border-bottom-color: var(--accent); }

.fnd-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; flex-wrap: wrap; gap: 10px; }
.fnd-page-size { color: var(--text-primary); font-size: 13px; }
.fnd-page-size select { margin: 0 4px; padding: 3px 6px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-surface); color: var(--text-primary); }
.fnd-global-search { color: var(--text-primary); font-size: 13px; }
.fnd-global-search input {
    margin-left: 6px; padding: 5px 8px; border: 1px solid var(--border-color); border-radius: 4px;
    background: var(--bg-surface); color: var(--text-primary); width: 200px;
}

.fnd-table-wrap { overflow-x: auto; border: 1px solid var(--border-color); border-radius: 6px; }
.fnd-table { width: 100%; border-collapse: collapse; font-size: 13px; }

.fnd-filter-row th { background: #6a9e34; padding: 8px; font-weight: normal; }
.fnd-filter-row input {
    width: 100%; box-sizing: border-box; padding: 6px 10px; border: none; border-radius: 4px;
    font-size: 12.5px; background: #fff; color: #1c2534;
}
.fnd-filter-row input::placeholder { color: #8b98ac; }

.fnd-header-row th {
    text-align: left; padding: 9px 12px; background: var(--bg-surface-alt); color: var(--text-primary);
    font-weight: 700; font-size: 12.5px; border-bottom: 1px solid var(--border-color); cursor: pointer; user-select: none; white-space: nowrap;
}
.fnd-header-row th:hover { color: var(--accent); }
.fnd-sort-arrow { font-size: 10px; margin-left: 4px; opacity: .7; }

.fnd-table tbody td { padding: 9px 12px; border-bottom: 1px solid var(--border-color); color: var(--text-primary); }
.fnd-table tbody tr.fnd-row { cursor: pointer; }
.fnd-table tbody tr.fnd-row:hover { background: var(--bg-surface-alt); }
.fnd-name { font-weight: 600; color: var(--accent); }
.fnd-muted { color: var(--text-muted); }
.fnd-empty-row td { text-align: center; padding: 30px; color: var(--text-muted); }

.fnd-options-row { display: flex; gap: 24px; margin: 12px 0; font-size: 13px; color: var(--text-primary); }
.fnd-options-row label { display: flex; align-items: center; gap: 6px; cursor: pointer; }

.fnd-pagination-row { display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; color: var(--text-muted); margin-top: 6px; flex-wrap: wrap; gap: 8px; }
.fnd-pagination-buttons button {
    padding: 5px 12px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary);
    border-radius: 4px; cursor: pointer; margin-left: 6px; font-size: 12.5px;
}
.fnd-pagination-buttons button:disabled { opacity: .4; cursor: not-allowed; }
.fnd-pagination-buttons button:not(:disabled):hover { background: var(--bg-surface-alt); }
</style>

<div class="fnd-page">
    <div class="fnd-topbar">
        <div class="fnd-topbar-left">
            <h1>Patient Finder</h1>
            <button type="button" class="fnd-add-btn" id="fndAddPatientBtn">+ Add New Patient</button>
        </div>
        <div class="fnd-topbar-icons">
            <button type="button" class="fnd-icon-btn" id="fndFocusSearchBtn" title="Jump to search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
            </button>
        </div>
    </div>

    <div class="fnd-body">
        <div class="fnd-tabs">
            <button type="button" class="fnd-tab active" id="fndTabList">Patient List</button>
            <button type="button" class="fnd-tab" id="fndTabRecent">Recent Patients</button>
        </div>

        <div id="fndListPanel">
            <div class="fnd-toolbar">
                <div class="fnd-page-size">
                    Show
                    <select id="fndPageSize">
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </select>
                    entries
                </div>
                <div class="fnd-global-search">
                    Search: <input type="text" id="fndGlobalSearch" autocomplete="off">
                </div>
            </div>

            <div class="fnd-table-wrap">
                <table class="fnd-table">
                    <thead>
                        <tr class="fnd-filter-row">
                            <th><input type="text" id="fndFilterName" placeholder="Search by Name" autocomplete="off"></th>
                            <th><input type="text" id="fndFilterPhone" placeholder="Search by Home Phone" autocomplete="off"></th>
                            <th><input type="text" id="fndFilterSsn" placeholder="Search by SSN" autocomplete="off"></th>
                            <th><input type="text" id="fndFilterDob" placeholder="Search by Date of Birth" autocomplete="off"></th>
                            <th><input type="text" id="fndFilterExternal" placeholder="Search by External ID" autocomplete="off"></th>
                        </tr>
                        <tr class="fnd-header-row">
                            <th data-sort-key="name">Full Name</th>
                            <th data-sort-key="phone">Home Phone</th>
                            <th data-sort-key="ssn">SSN</th>
                            <th data-sort-key="dob">Date of Birth</th>
                            <th data-sort-key="external">External ID</th>
                        </tr>
                    </thead>
                    <tbody id="fndResultsBody"></tbody>
                </table>
            </div>

            <div class="fnd-options-row">
                <label><input type="checkbox" id="fndOpenNewTab"> Open in New Browser Tab</label>
                <label><input type="checkbox" id="fndExactMethod"> Search with exact method</label>
            </div>

            <div class="fnd-pagination-row">
                <span id="fndPaginationInfo"></span>
                <div class="fnd-pagination-buttons">
                    <button type="button" id="fndPrevBtn">Previous</button>
                    <button type="button" id="fndNextBtn">Next</button>
                </div>
            </div>
        </div>

        <div id="fndRecentPanel" style="display:none;">
            <div class="fnd-table-wrap">
                <table class="fnd-table">
                    <thead>
                        <tr class="fnd-header-row">
                            <th>Full Name</th>
                            <th>Home Phone</th>
                            <th>Date of Birth</th>
                            <th>Last Viewed</th>
                        </tr>
                    </thead>
                    <tbody id="fndRecentBody"></tbody>
                </table>
            </div>
        </div>
    </div>
</div>
`;
}
