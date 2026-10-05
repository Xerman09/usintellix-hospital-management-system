import { SURGERY_SETUP_STYLES } from "../specializations/specializations.view.js?v=1";

export function SurgeriesView() {
    return `${SURGERY_SETUP_STYLES}
<style>
.sg-items { display: flex; flex-direction: column; gap: 8px; }
.sg-item { display: grid; grid-template-columns: 150px minmax(0, 1fr) 90px minmax(0, .8fr) 34px; gap: 8px; align-items: start; }
.sg-item select, .sg-item input { height: 34px; padding: 0 8px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface);
    color: var(--text-primary); font-size: 12.5px; font-family: inherit; width: 100%; box-sizing: border-box; min-width: 0; }
.sg-item .ss-err { grid-column: 1 / -1; }
.sg-item.has-error select, .sg-item.has-error input { border-color: #dc2626; }
.sg-item-remove { height: 34px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-surface); color: var(--text-muted); cursor: pointer; font-size: 16px; }
.sg-item-remove:hover { color: #dc2626; border-color: #dc2626; }
.sg-item-head { display: grid; grid-template-columns: 150px minmax(0, 1fr) 90px minmax(0, .8fr) 34px; gap: 8px; font-size: 11px; font-weight: 600; color: var(--text-muted); }
.sg-add-row { display: flex; flex-wrap: wrap; gap: 8px; }
@media (max-width: 700px) {
    .sg-item, .sg-item-head { grid-template-columns: 1fr 1fr; }
    .sg-item-head { display: none; }
    .sg-item > :nth-child(2) { grid-column: 1 / -1; }
}
</style>
<div class="ss-page">
    <div class="ss-header">
        <div>
            <h1>Surgeries</h1>
            <p>The surgery types the hospital performs. Each belongs to a specialization, which is how surgeons are matched when booking, and carries its booking defaults and preference card (the instrument sets, supplies and medicines it usually needs).</p>
        </div>
        <button type="button" class="ss-btn primary" id="openAddSurgeryModal">+ Add surgery type</button>
    </div>
    <div class="ss-tools">
        <input type="search" id="surgerySearch" placeholder="Search by name or code..." aria-label="Search surgeries">
        <select id="sgSpecFilter" aria-label="Specialization"><option value="">All specializations</option></select>
        <label class="ss-check"><input type="checkbox" id="sgShowOff"> Show switched off</label>
    </div>
    <div class="ss-card"><div id="sgBody"><div class="ss-empty">Loading...</div></div></div>
</div>

<div class="ss-overlay" id="surgeryModalOverlay" role="dialog" aria-modal="true" aria-labelledby="surgeryModalTitle">
    <div class="ss-modal wide">
        <div class="ss-modal-head"><h2 id="surgeryModalTitle">Add surgery type</h2><button type="button" class="ss-x" data-sg-close aria-label="Close">&times;</button></div>
        <form id="surgeryForm" autocomplete="off">
            <div class="ss-modal-body">
                <div id="surgFormAlert"></div>
                <div class="ss-section">Surgery</div>
                <div class="ss-grid">
                    <label class="ss-field wide"><span>Name *</span><input id="sgName" maxlength="255" placeholder="e.g. Laparoscopic Cholecystectomy"><span class="ss-err" data-err="name"></span></label>
                    <label class="ss-field"><span>Specialization *</span><select id="sgSpec"></select><span class="ss-err" data-err="specialization_id"></span></label>
                    <label class="ss-field"><span>Code (PhilHealth RVS)</span><input id="sgCode" maxlength="30" placeholder="e.g. 47562"><span class="ss-err" data-err="code"></span></label>
                    <label class="ss-field"><span>Category *</span><select id="sgCategory"></select><span class="ss-err" data-err="category"></span></label>
                    <label class="ss-field wide"><span>Description</span><input id="sgDescription" maxlength="255" placeholder="Optional"></label>
                </div>
                <div class="ss-section">Booking defaults</div>
                <div class="ss-grid">
                    <label class="ss-field"><span>Usual duration (minutes) *</span><input id="sgDuration" type="number" min="5" max="1440" step="5"><span class="ss-err" data-err="default_duration_minutes"></span></label>
                    <label class="ss-field"><span>Anesthesia</span><select id="sgAnesthesia"></select><span class="ss-err" data-err="default_anesthesia_type"></span></label>
                    <label class="ss-field"><span>Wound class</span><select id="sgWound"></select><span class="ss-err" data-err="wound_class"></span></label>
                    <label class="ss-field"><span>OR fee (₱)</span><input id="sgFee" type="number" min="0" step="0.01" placeholder="Optional"><span class="ss-err" data-err="default_or_fee"></span></label>
                </div>
                <div class="ss-checks">
                    <label class="ss-check"><input type="checkbox" id="sgLaterality"> The side must be given (left / right / both)</label>
                    <label class="ss-check"><input type="checkbox" id="sgBlood"> Usually needs blood</label>
                    <label class="ss-check"><input type="checkbox" id="sgImplants"> Usually needs implants</label>
                    <label class="ss-check"><input type="checkbox" id="sgActive"> Active (can be booked)</label>
                </div>
                <div class="ss-section">Preference card</div>
                <p class="ss-hint" style="margin:0;">What this surgery usually needs. Supplies and medicines come from the Drug Catalog; instrument sets are named.</p>
                <div class="sg-item-head" id="sgItemsHead"><span>Type</span><span>Item</span><span>Quantity</span><span>Notes</span><span></span></div>
                <div class="sg-items" id="sgItems"></div>
                <div class="sg-add-row">
                    <button type="button" class="ss-btn small" data-sg-add="instrument">+ Instrument set</button>
                    <button type="button" class="ss-btn small" data-sg-add="supply">+ Supply</button>
                    <button type="button" class="ss-btn small" data-sg-add="medicine">+ Medicine</button>
                </div>
            </div>
            <div class="ss-modal-foot"><button type="button" class="ss-btn" data-sg-close>Cancel</button><button type="submit" class="ss-btn primary" id="saveSurgeryBtn">Save</button></div>
        </form>
    </div>
</div>

<div class="ss-overlay" id="sgConfirm" role="dialog" aria-modal="true" aria-labelledby="sgConfirmTitle">
    <div class="ss-modal">
        <div class="ss-modal-head"><h2 id="sgConfirmTitle"></h2><button type="button" class="ss-x" data-sg-confirm-close aria-label="Close">&times;</button></div>
        <div class="ss-modal-body" id="sgConfirmBody"></div>
        <div class="ss-modal-foot"><button type="button" class="ss-btn" data-sg-confirm-close>Cancel</button><button type="button" class="ss-btn danger" id="sgConfirmOk">Delete</button></div>
    </div>
</div>`;
}
