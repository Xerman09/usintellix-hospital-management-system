export function SupplierPricesView() {
    return `
<style>
.spr-page { width: 100%; font-size: 13.5px; }

.spr-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
.spr-header h1 { margin: 0 0 4px; font-size: 20px; font-weight: 700; color: var(--text-primary); }
.spr-header p { margin: 0; color: var(--text-muted); font-size: 13px; }

.spr-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    height: 34px; padding: 0 14px; border-radius: 6px;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary);
    font-weight: 600; font-size: 12.5px; cursor: pointer;
}
.spr-btn:hover { background: var(--bg-surface-alt); }
.spr-btn.primary { border-color: var(--accent); background: var(--accent); color: #fff; }
.spr-btn.primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
.spr-btn.small { height: 28px; padding: 0 10px; font-size: 12px; }
.spr-btn:disabled { opacity: .5; cursor: not-allowed; }

.spr-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; margin-bottom: 14px; }
.spr-stat { display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); }
.spr-stat strong { font-size: 22px; line-height: 1.1; color: var(--text-primary); }
.spr-stat span { font-size: 12px; color: var(--text-muted); }
.spr-stat.promo strong { color: #c2410c; }
:root[data-theme="dark"] .spr-stat.promo strong { color: #fdba74; }

.spr-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 12px; }
.spr-filters input[type="text"], .spr-filters select {
    height: 32px; padding: 0 10px; border-radius: 6px;
    border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); font-size: 12.5px;
}
.spr-filters input[type="text"] { min-width: 260px; }
.spr-check { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; color: var(--text-primary); white-space: nowrap; }
.spr-count { margin-left: auto; font-size: 12.5px; color: var(--text-muted); }

.spr-group { border: 1px solid var(--border-color); border-radius: 10px; margin-bottom: 12px; overflow: hidden; background: var(--bg-surface); }
.spr-group-head {
    display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
    padding: 10px 14px; background: var(--bg-surface-alt); border-bottom: 1px solid var(--border-color);
}
.spr-group-title { font-weight: 700; color: var(--text-primary); }
.spr-group-meta { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.spr-best-summary { font-size: 12.5px; color: var(--text-muted); text-align: right; }
.spr-best-summary strong { color: #15803d; font-size: 14px; }
:root[data-theme="dark"] .spr-best-summary strong { color: #86efac; }

.spr-table-wrap { overflow-x: auto; }
.spr-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.spr-table th {
    text-align: left; padding: 8px 14px; white-space: nowrap; color: var(--text-muted);
    font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; border-bottom: 1px solid var(--border-color);
}
.spr-table td { padding: 10px 14px; border-bottom: 1px solid var(--border-color); color: var(--text-primary); vertical-align: top; }
.spr-table tbody tr:last-child td { border-bottom: none; }
.spr-table tr.is-best td { background: rgba(34,197,94,.06); }
.spr-table tr.is-off td { opacity: .6; }
.spr-empty { padding: 34px 16px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 10px; }

@media (max-width: 720px) {
    .spr-filters input[type="text"] { min-width: 0; width: 100%; }
    .spr-count { margin-left: 0; }
    .spr-best-summary { text-align: left; }
}
</style>

<div class="spr-page">
    <div class="spr-header">
        <div>
            <h1>Supplier Prices</h1>
            <p>Where to buy each medicine or item, what each supplier charges, and current discounts.</p>
        </div>
        <button type="button" class="spr-btn primary" id="sprAddBtn">+ Add Supplier Price</button>
    </div>

    <div class="spr-stats">
        <div class="spr-stat"><strong id="sprStatItems">0</strong><span>Items with supplier prices</span></div>
        <div class="spr-stat"><strong id="sprStatListings">0</strong><span>Price listings</span></div>
        <div class="spr-stat promo"><strong id="sprStatPromos">0</strong><span>Discounts running now</span></div>
        <div class="spr-stat"><strong id="sprStatSingle">0</strong><span>Items with only one supplier</span></div>
    </div>

    <div class="spr-filters">
        <input type="text" id="sprSearch" placeholder="Search medicine, supplier, item code...">
        <select id="sprSupplierFilter"><option value="">All suppliers</option></select>
        <label class="spr-check"><input type="checkbox" id="sprDiscountOnly"> With a discount now</label>
        <label class="spr-check"><input type="checkbox" id="sprShowInactive"> Show inactive</label>
        <span class="spr-count" id="sprCount"></span>
    </div>

    <div id="sprList"><div class="spr-empty">Loading...</div></div>
</div>
    `;
}
