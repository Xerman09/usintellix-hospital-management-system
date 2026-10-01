/**
 * One admin page per drug lookup table (Dosage Forms, Drug Categories).
 * Every element id is prefixed with config.prefix so both pages can be
 * open as dashboard tabs at the same time without id collisions.
 */
export const DRUG_LOOKUPS = {
    dosage_forms: {
        prefix: "dfl",
        endpoint: "/dosage-forms",
        title: "Dosage Forms",
        singular: "Dosage Form",
        subtitle: "The forms a medicine can come in (tablet, syrup, injection...). Used by the drug catalog."
    },
    drug_categories: {
        prefix: "dcl",
        endpoint: "/drug-categories",
        title: "Drug Categories",
        singular: "Category",
        subtitle: "Therapeutic categories for grouping and filtering drugs in the catalog and reports."
    }
};

export function DrugLookupView(key) {
    const c = DRUG_LOOKUPS[key];
    const p = c.prefix;

    // Both lookup pages carry the same style block; a duplicate when both
    // tabs are open is harmless, and each tab stays styled on its own.
    const styles = `
<style>
.dl-page { width: 100%; }
.dl-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
.dl-header h1 { margin: 0 0 4px; font-size: 22px; color: var(--text-primary); }
.dl-header p { margin: 0; color: var(--text-muted); font-size: 13px; max-width: 560px; }
.dl-bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
.dl-bar input { height: 34px; padding: 0 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); min-width: 240px; }
.dl-count { font-size: 12.5px; color: var(--text-muted); }
.dl-add-btn { height: 36px; padding: 0 16px; border-radius: 6px; border: 1px solid var(--accent); background: var(--accent); color: #fff; font-weight: 600; cursor: pointer; }
.dl-add-btn:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
.dl-table-wrap { border: 1px solid var(--border-color); border-radius: 8px; overflow-x: auto; }
.dl-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.dl-table th { text-align: left; padding: 9px 12px; background: var(--bg-surface-alt); color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: .3px; border-bottom: 1px solid var(--border-color); }
.dl-table td { padding: 9px 12px; border-bottom: 1px solid var(--border-color); color: var(--text-primary); }
.dl-table tbody tr:last-child td { border-bottom: none; }
.dl-muted { color: var(--text-muted); }
.dl-actions { display: flex; gap: 6px; justify-content: flex-end; }
.dl-btn { height: 28px; padding: 0 10px; border-radius: 5px; border: 1px solid var(--border-color); background: var(--bg-surface-alt); color: var(--text-primary); font-size: 12px; font-weight: 600; cursor: pointer; }
.dl-btn:hover { border-color: var(--accent); }
.dl-btn.danger:hover { border-color: #b91c1c; color: #b91c1c; }
:root[data-theme="dark"] .dl-btn.danger:hover { border-color: #fca5a5; color: #fca5a5; }
.dl-empty { padding: 26px 16px; text-align: center; color: var(--text-muted); font-style: italic; }
</style>`;

    return `${styles}
<div class="dl-page">
    <div class="dl-header">
        <div>
            <h1>${c.title}</h1>
            <p>${c.subtitle}</p>
        </div>
        <button type="button" class="dl-add-btn" id="${p}AddBtn">+ Add ${c.singular}</button>
    </div>

    <div class="dl-bar">
        <input type="text" id="${p}Search" placeholder="Search ${c.title.toLowerCase()}...">
        <span class="dl-count" id="${p}Count"></span>
    </div>

    <div class="dl-table-wrap">
        <table class="dl-table">
            <thead><tr><th>Name</th><th>Description</th><th>Used by</th><th></th></tr></thead>
            <tbody id="${p}Body"><tr><td colspan="4" class="dl-empty">Loading...</td></tr></tbody>
        </table>
    </div>
</div>

<div class="modal-overlay" id="${p}ModalOverlay">
    <div class="modal-box" style="max-width:520px;">
        <div class="modal-header">
            <h2 id="${p}ModalTitle">Add ${c.singular}</h2>
            <button type="button" class="modal-close" id="${p}CloseModal">&times;</button>
        </div>

        <div id="${p}Alert"></div>

        <form id="${p}Form" novalidate>
            <input type="hidden" id="${p}_id">

            <div class="form-group">
                <label class="form-label" for="${p}_name">Name</label>
                <input type="text" class="form-input" id="${p}_name" maxlength="150">
                <span class="form-error" id="${p}-err-name"></span>
            </div>

            <div class="form-group">
                <label class="form-label" for="${p}_description">Description</label>
                <input type="text" class="form-input" id="${p}_description" maxlength="255">
                <span class="form-error" id="${p}-err-description"></span>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="${p}Cancel">Cancel</button>
                <button class="login-btn" type="submit" id="${p}SaveBtn">Add ${c.singular}</button>
            </div>
        </form>
    </div>
</div>
`;
}
