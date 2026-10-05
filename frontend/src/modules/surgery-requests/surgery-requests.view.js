import { SURGERY_SETUP_STYLES } from "../specializations/specializations.view.js?v=1";

export function SurgeryRequestsView() {
    return `${SURGERY_SETUP_STYLES}
<style>
.srw-progress { display: flex; align-items: center; gap: 8px; min-width: 120px; }
.srw-bar { flex: 1; height: 7px; border-radius: 999px; background: var(--bg-surface-alt); border: 1px solid var(--border-color); overflow: hidden; }
.srw-bar span { display: block; height: 100%; background: #16a34a; }
.ss-table tr.srw-click { cursor: pointer; }
.ss-table tr.srw-click:hover td { background: var(--bg-surface-alt); }
.ss-tabs .count { display: inline-block; min-width: 18px; padding: 0 5px; margin-left: 4px; border-radius: 999px; background: var(--accent); color: #fff; font-size: 10.5px; line-height: 17px; }
</style>
<div class="ss-page">
    <div class="ss-header">
        <div>
            <h1>Surgery Requests</h1>
            <p>Surgeries doctors have requested from patient charts. Work through each one's pre-op readiness checklist; when every required item is done it is ready for the OR to schedule. Request new surgeries from the patient's chart (Surgeries widget).</p>
        </div>
    </div>
    <div class="ss-tools">
        <div class="ss-tabs" id="srwTabs">
            <button type="button" data-srw-view="open" class="active">In planning<span class="count" id="srwCountOpen" hidden></span></button>
            <button type="button" data-srw-view="ready">Ready for scheduling<span class="count" id="srwCountReady" hidden></span></button>
            <button type="button" data-srw-view="scheduled">Scheduled</button>
            <button type="button" data-srw-view="cancelled">Cancelled</button>
            <button type="button" data-srw-view="all">All</button>
        </div>
        <select id="srwSpec" aria-label="Specialization"><option value="">All specializations</option></select>
        <input type="search" id="srwSearch" placeholder="Patient, SR number or surgery..." aria-label="Search requests">
    </div>
    <div class="ss-card"><div id="srwBody"><div class="ss-empty">Loading...</div></div></div>
</div>`;
}
