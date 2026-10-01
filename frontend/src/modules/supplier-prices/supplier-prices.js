import { fetchSupplierPrices, fetchSupplierPriceOptions } from "./supplier-prices.service.js?v=2";
import {
    createSupplierPriceForm, renderDiscountTag, formatMoney, formatQty, formatDate, escapeHtml
} from "./supplier-price-form.js?v=3";

let listings = [];
let priceForm = null;

export async function initSupplierPrices() {
    const result = await fetchSupplierPriceOptions();
    const supplierFilter = document.getElementById("sprSupplierFilter");

    (result.success ? result.data.suppliers : []).forEach((s) => supplierFilter.appendChild(new Option(s.name, s.id)));

    document.getElementById("sprSearch").addEventListener("input", render);
    document.getElementById("sprSupplierFilter").addEventListener("change", render);
    document.getElementById("sprDiscountOnly").addEventListener("change", render);
    document.getElementById("sprShowInactive").addEventListener("change", load);

    priceForm = createSupplierPriceForm({
        mount: document.querySelector(".spr-page").parentElement,
        id: "sprForm",
        onSaved: load
    });

    document.getElementById("sprAddBtn").addEventListener("click", () => priceForm.open());

    await load();
}

async function load() {
    const result = await fetchSupplierPrices(document.getElementById("sprShowInactive").checked);

    if (!result.success) {
        listings = [];
        document.getElementById("sprList").innerHTML = `<div class="spr-empty">Failed to load supplier prices.</div>`;
        return;
    }

    listings = result.data || [];
    renderStats();
    render();
}

function usable(l) {
    return l.is_active && l.supplier_is_active;
}

function renderStats() {
    const live = listings.filter(usable);
    const perItem = new Map();

    live.forEach((l) => perItem.set(l.drug_id, (perItem.get(l.drug_id) || 0) + 1));

    document.getElementById("sprStatItems").textContent = perItem.size;
    document.getElementById("sprStatListings").textContent = live.length;
    document.getElementById("sprStatPromos").textContent = live.filter((l) => l.discount_status === "active").length;
    document.getElementById("sprStatSingle").textContent = [...perItem.values()].filter((n) => n === 1).length;
}

function render() {
    const term = document.getElementById("sprSearch").value.trim().toLowerCase();
    const supplierId = document.getElementById("sprSupplierFilter").value;
    const discountOnly = document.getElementById("sprDiscountOnly").checked;
    const list = document.getElementById("sprList");

    const rows = listings.filter((l) => {
        if (supplierId && String(l.supplier_id) !== supplierId) return false;
        if (discountOnly && l.discount_status !== "active") return false;
        if (!term) return true;

        return [l.drug_name, l.supplier_name, l.supplier_code, l.supplier_item_code, l.discount_label, l.category_name]
            .some((v) => (v || "").toLowerCase().includes(term));
    });

    const groups = new Map();
    rows.forEach((l) => {
        if (!groups.has(l.drug_id)) groups.set(l.drug_id, []);
        groups.get(l.drug_id).push(l);
    });

    document.getElementById("sprCount").textContent =
        `${groups.size} ${groups.size === 1 ? "item" : "items"} · ${rows.length} ${rows.length === 1 ? "price" : "prices"}`;

    if (!groups.size) {
        list.innerHTML = `<div class="spr-empty">${listings.length
            ? "No supplier prices match these filters."
            : "No supplier prices yet. Click &ldquo;+ Add Supplier Price&rdquo;, or open a supplier under Pharmacy &gt; Suppliers and add their products there."}</div>`;
        return;
    }

    list.innerHTML = [...groups.values()].map(renderGroup).join("");

    list.querySelectorAll("[data-spr-edit]").forEach((btn) => {
        btn.addEventListener("click", () => priceForm.open({ listing: listings.find((l) => l.id === Number(btn.dataset.sprEdit)) }));
    });

    list.querySelectorAll("[data-spr-add-for]").forEach((btn) => {
        btn.addEventListener("click", () => priceForm.open({ drugId: Number(btn.dataset.sprAddFor) }));
    });
}

function renderGroup(items) {
    const first = items[0];
    const unit = first.unit_name || "unit";

    // Cheapest first; unusable listings last.
    items.sort((a, b) => {
        if (usable(a) !== usable(b)) return usable(a) ? -1 : 1;
        return (a.effective_unit_price ?? Infinity) - (b.effective_unit_price ?? Infinity);
    });

    // Flag pre-existing duplicates (same supplier twice for this item).
    const perSupplier = new Map();
    items.forEach((l) => perSupplier.set(l.supplier_id, (perSupplier.get(l.supplier_id) || 0) + 1));
    items.forEach((l) => { l.is_duplicate = perSupplier.get(l.supplier_id) > 1; });

    const packInfo = first.package_quantity && first.package_unit_name
        ? `1 ${first.package_unit_name} = ${formatQty(first.package_quantity)} ${unit}`
        : "";

    return `
        <section class="spr-group">
            <div class="spr-group-head">
                <div>
                    <div class="spr-group-title">${escapeHtml(first.drug_name)}${first.drug_is_active ? "" : ` <span class="spf-tag inactive">Inactive item</span>`}</div>
                    <div class="spr-group-meta">${escapeHtml([first.category_name, packInfo].filter(Boolean).join(" · ") || `Sold per ${unit}`)}</div>
                </div>
                <div class="spr-best-summary">
                    ${first.best_unit_price != null
                        ? `Best: <strong>${formatMoney(first.best_unit_price, 4)}</strong> / ${escapeHtml(unit)}<span class="spf-sub">at ${escapeHtml(first.best_supplier_name)}</span>`
                        : "No active supplier"}
                </div>
            </div>
            <div class="spr-table-wrap">
                <table class="spr-table">
                    <thead><tr><th>Supplier</th><th>Price</th><th>Discount</th><th>Per ${escapeHtml(unit)}</th><th>Terms</th><th>Updated</th><th>
                        <button type="button" class="spr-btn small" data-spr-add-for="${first.drug_id}">+ Supplier</button>
                    </th></tr></thead>
                    <tbody>${items.map(renderRow).join("")}</tbody>
                </table>
            </div>
        </section>
    `;
}

function renderRow(l) {
    const basisLabel = l.price_basis === "package" ? (l.package_unit_name || "package") : (l.unit_name || "unit");
    const discounted = l.discount_status === "active" && l.discounted_price !== l.price;

    const tags = [];
    if (l.is_best_price) tags.push(`<span class="spf-tag best">Best price</span>`);
    if (l.is_preferred_supplier) tags.push(`<span class="spf-tag preferred">Preferred</span>`);
    if (!l.is_active) tags.push(`<span class="spf-tag inactive">Not available</span>`);
    if (!l.supplier_is_active) tags.push(`<span class="spf-tag inactive">Supplier inactive</span>`);
    if (l.is_duplicate) tags.push(`<span class="spf-tag duplicate" title="Each supplier should have one price per item. Remove the one you don't need.">Duplicate &mdash; remove one</span>`);

    const terms = [
        l.min_order_qty ? `Min. ${formatQty(l.min_order_qty)} ${basisLabel}` : null,
        l.lead_time_days != null ? `${l.lead_time_days}-day lead time` : null,
        l.payment_terms
    ].filter(Boolean);

    return `
        <tr class="${l.is_best_price ? "is-best" : ""} ${usable(l) ? "" : "is-off"}">
            <td style="min-width:180px;">
                ${escapeHtml(l.supplier_name)}
                <span class="spf-sub">${escapeHtml([l.supplier_code, l.supplier_item_code ? `Item ${l.supplier_item_code}` : null].filter(Boolean).join(" · "))}</span>
                ${tags.length ? `<div class="spf-tags" style="margin-top:4px;">${tags.join("")}</div>` : ""}
            </td>
            <td style="white-space:nowrap;">
                ${discounted ? `<span class="spf-strike">${formatMoney(l.price)}</span>` : ""}
                <span class="spf-price">${formatMoney(l.discounted_price)}</span>
                <span class="spf-sub">per ${escapeHtml(basisLabel)}</span>
            </td>
            <td>${renderDiscountTag(l)}</td>
            <td style="white-space:nowrap;">${l.effective_unit_price != null ? formatMoney(l.effective_unit_price, 4) : "—"}</td>
            <td>${terms.length ? terms.map((t, i) => i ? `<span class="spf-sub">${escapeHtml(t)}</span>` : escapeHtml(t)).join("") : "—"}</td>
            <td style="white-space:nowrap;">${l.price_as_of ? formatDate(l.price_as_of) : "—"}</td>
            <td><button type="button" class="spr-btn small" data-spr-edit="${l.id}">Edit</button></td>
        </tr>
    `;
}
