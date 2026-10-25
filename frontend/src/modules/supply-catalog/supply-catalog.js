/**
 * Hospital Non-Pharmaceutical Supply Catalog Module
 * Schema: supply_catalog_items, supply_catalog_departments
 * Medical-surgical consumables, PPE, wound care, catheters, respiratory, linens, disinfectants
 */

import { api } from "../../core/api.js";

let state = {
    activeTab: "catalog", // 'catalog' | 'departments' | 'valuation'
    categoryFilter: "",
    statusFilter: "",
    billableFilter: "",
    lowStockOnly: false,
    searchQuery: "",
    page: 1,
    perPage: 15
};

let cache = {
    metrics: null,
    itemsData: { total: 0, records: [] },
    metadata: { categories: {}, units_of_measure: {}, suppliers: [], departments: [] }
};

export function SupplyCatalogView() {
    return `
        <div class="supply-catalog-container" style="padding: 24px; max-width: 1440px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b;">
            <div id="scNotificationArea"></div>

            <!-- Header Section -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
                <div>
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                        <span style="background: #ecfdf5; color: #047857; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Hospital Logistics &amp; Procurement</span>
                        <span style="color: #64748b; font-size: 13px;">Subsystem 8: Procurement &amp; Supply Chain</span>
                    </div>
                    <h1 style="font-size: 26px; font-weight: 800; color: #0f172a; margin: 0 0 6px 0;">Non-Pharmaceutical Hospital Supply Catalog</h1>
                    <p style="margin: 0; color: #64748b; font-size: 14px;">Centralized catalog for medical-surgical supplies, PPE, wound care, catheters, respiratory tubing, linens, and disinfectants.</p>
                </div>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button id="btnNewSupplyItemModal" style="background: #0284c7; color: #ffffff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 4px rgba(2,132,199,0.2);">
                        <i class="fas fa-boxes"></i> Register New Supply Item
                    </button>
                </div>
            </div>

            <!-- Executive Summary Cards -->
            <div id="scKpiSection" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
                ${renderKpiCards()}
            </div>

            <!-- Navigation Tabs -->
            <div style="display: flex; border-bottom: 2px solid #e2e8f0; margin-bottom: 20px; gap: 8px; flex-wrap: wrap;">
                <button class="sc-tab-btn ${state.activeTab === 'catalog' ? 'active' : ''}" data-tab="catalog" style="padding: 12px 18px; border: none; background: none; font-weight: 600; font-size: 14px; cursor: pointer; color: ${state.activeTab === 'catalog' ? '#0284c7' : '#64748b'}; border-bottom: 3px solid ${state.activeTab === 'catalog' ? '#0284c7' : 'transparent'}; margin-bottom: -2px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-list-ul"></i> Master Supply Catalog
                </button>
                <button class="sc-tab-btn ${state.activeTab === 'departments' ? 'active' : ''}" data-tab="departments" style="padding: 12px 18px; border: none; background: none; font-weight: 600; font-size: 14px; cursor: pointer; color: ${state.activeTab === 'departments' ? '#0284c7' : '#64748b'}; border-bottom: 3px solid ${state.activeTab === 'departments' ? '#0284c7' : 'transparent'}; margin-bottom: -2px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-hospital-user"></i> Department Par Levels &amp; Quotas
                </button>
                <button class="sc-tab-btn ${state.activeTab === 'valuation' ? 'active' : ''}" data-tab="valuation" style="padding: 12px 18px; border: none; background: none; font-weight: 600; font-size: 14px; cursor: pointer; color: ${state.activeTab === 'valuation' ? '#0284c7' : '#64748b'}; border-bottom: 3px solid ${state.activeTab === 'valuation' ? '#0284c7' : 'transparent'}; margin-bottom: -2px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-chart-bar"></i> Category Valuation &amp; Stock Health
                </button>
            </div>

            <!-- Tab Content Area -->
            <div id="scTabContent">
                ${renderActiveTabContent()}
            </div>

            <!-- Modals Container -->
            <div id="scModalContainer"></div>
        </div>
    `;
}

/**
 * Initialize Module
 */
export async function initSupplyCatalog() {
    await loadInitialData();
    bindEvents();
}

/**
 * Fetch Data
 */
async function loadInitialData() {
    try {
        const [metaRes, metricsRes, itemsRes] = await Promise.all([
            api('/supply-catalog/metadata').catch(() => null),
            api('/supply-catalog/metrics').catch(() => null),
            api(`/supply-catalog/items?category=${state.categoryFilter}&status=${state.statusFilter}&is_billable_to_patient=${state.billableFilter}&low_stock_only=${state.lowStockOnly ? '1' : ''}&q=${encodeURIComponent(state.searchQuery)}&page=${state.page}&per_page=${state.perPage}`).catch(() => null)
        ]);

        if (metaRes?.data) cache.metadata = metaRes.data;
        if (metricsRes?.data) cache.metrics = metricsRes.data;
        if (itemsRes?.data) cache.itemsData = itemsRes.data;

        renderApp();
    } catch (err) {
        showToast('Error loading supply catalog data: ' + err.message, 'error');
    }
}

function renderApp() {
    const kpiEl = document.getElementById('scKpiSection');
    if (kpiEl) kpiEl.innerHTML = renderKpiCards();

    const contentEl = document.getElementById('scTabContent');
    if (contentEl) contentEl.innerHTML = renderActiveTabContent();

    updateTabButtons();
}

function updateTabButtons() {
    document.querySelectorAll('.sc-tab-btn').forEach(btn => {
        const t = btn.getAttribute('data-tab');
        const isActive = t === state.activeTab;
        btn.style.color = isActive ? '#0284c7' : '#64748b';
        btn.style.borderBottom = `3px solid ${isActive ? '#0284c7' : 'transparent'}`;
    });
}

/**
 * Render Executive KPI Cards
 */
function renderKpiCards() {
    const m = cache.metrics || {
        total_items: 0,
        total_inventory_valuation: 0,
        low_stock_alerts: 0,
        stockout_count: 0,
        billable_items_count: 0,
        non_billable_overhead_count: 0
    };

    const val = Number(m.total_inventory_valuation || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return `
        <!-- Card 1: Catalog Size -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid #0284c7;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase;">Catalog SKUs Tracked</span>
                <span style="font-size: 18px; color: #0284c7;"><i class="fas fa-boxes"></i></span>
            </div>
            <div style="font-size: 28px; font-weight: 800; color: #0f172a;">${m.total_items}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
                Non-drug medical-surgical supplies
            </div>
        </div>

        <!-- Card 2: Valuation -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid #10b981;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase;">Inventory Valuation</span>
                <span style="font-size: 18px; color: #10b981;"><i class="fas fa-dollar-sign"></i></span>
            </div>
            <div style="font-size: 28px; font-weight: 800; color: #047857;">$${val}</div>
            <div style="font-size: 12px; color: #059669; margin-top: 4px;">
                Active warehouse on-hand cost
            </div>
        </div>

        <!-- Card 3: Stock Health -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid #f59e0b;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase;">Safety Stock Alerts</span>
                <span style="font-size: 18px; color: #f59e0b;"><i class="fas fa-exclamation-triangle"></i></span>
            </div>
            <div style="font-size: 28px; font-weight: 800; color: #d97706;">${m.low_stock_alerts}</div>
            <div style="font-size: 12px; color: #b45309; margin-top: 4px;">
                ${m.stockout_count} total stockouts
            </div>
        </div>

        <!-- Card 4: Chargeable Consumables -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid #8b5cf6;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase;">Chargeable to Patient</span>
                <span style="font-size: 18px; color: #8b5cf6;"><i class="fas fa-file-invoice-dollar"></i></span>
            </div>
            <div style="font-size: 28px; font-weight: 800; color: #6d28d9;">${m.billable_items_count} <span style="font-size: 14px; font-weight: 600; color: #64748b;">/ ${m.total_items}</span></div>
            <div style="font-size: 12px; color: #5b21b6; margin-top: 4px;">
                ${m.non_billable_overhead_count} overhead / ward supplies
            </div>
        </div>
    `;
}

/**
 * Render Active Tab Content
 */
function renderActiveTabContent() {
    switch (state.activeTab) {
        case 'catalog':
            return renderCatalogTab();
        case 'departments':
            return renderDepartmentsTab();
        case 'valuation':
            return renderValuationTab();
        default:
            return renderCatalogTab();
    }
}

/**
 * TAB 1: Master Supply Catalog Table
 */
function renderCatalogTab() {
    const records = cache.itemsData?.records || [];

    return `
        <!-- Filter Bar -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 20px; display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
            <div style="flex: 1; min-width: 220px;">
                <input type="text" id="scSearchInput" placeholder="Search item name, code, brand, SKU..." value="${escapeHtml(state.searchQuery)}" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
            </div>
            <div style="min-width: 180px;">
                <select id="scCategoryFilter" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #ffffff;">
                    <option value="">All Supply Categories</option>
                    <option value="medical_surgical" ${state.categoryFilter === 'medical_surgical' ? 'selected' : ''}>Medical &amp; Surgical Consumables</option>
                    <option value="ppe_infection_control" ${state.categoryFilter === 'ppe_infection_control' ? 'selected' : ''}>PPE &amp; Infection Control</option>
                    <option value="wound_care" ${state.categoryFilter === 'wound_care' ? 'selected' : ''}>Wound Care &amp; Dressings</option>
                    <option value="respiratory_airway" ${state.categoryFilter === 'respiratory_airway' ? 'selected' : ''}>Respiratory &amp; Airway</option>
                    <option value="catheters_tubing" ${state.categoryFilter === 'catheters_tubing' ? 'selected' : ''}>Catheters &amp; Tubing</option>
                    <option value="cleaning_disinfectants" ${state.categoryFilter === 'cleaning_disinfectants' ? 'selected' : ''}>Cleaning &amp; Disinfectants</option>
                    <option value="linen_bedding" ${state.categoryFilter === 'linen_bedding' ? 'selected' : ''}>Linen &amp; Patient Bedding</option>
                </select>
            </div>
            <div style="min-width: 150px;">
                <select id="scBillableFilter" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #ffffff;">
                    <option value="">All Billing Types</option>
                    <option value="1" ${state.billableFilter === '1' ? 'selected' : ''}>Patient Billable</option>
                    <option value="0" ${state.billableFilter === '0' ? 'selected' : ''}>Operating Overhead</option>
                </select>
            </div>
            <button id="btnToggleLowStock" style="padding: 8px 14px; background: ${state.lowStockOnly ? '#fef3c7' : '#f8fafc'}; color: ${state.lowStockOnly ? '#b45309' : '#475569'}; border: 1px solid ${state.lowStockOnly ? '#fde68a' : '#cbd5e1'}; border-radius: 6px; font-size: 13px; cursor: pointer; font-weight: 600;">
                <i class="fas fa-exclamation-triangle"></i> Low Stock Only
            </button>
            <button id="btnResetFilters" style="padding: 8px 14px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; cursor: pointer;">
                <i class="fas fa-undo"></i> Reset
            </button>
        </div>

        <!-- Catalog Table -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div style="font-weight: 700; font-size: 16px; color: #0f172a;">
                    Hospital Supply Master Catalog (${cache.itemsData?.total || 0} Registered Items)
                </div>
            </div>

            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                    <thead>
                        <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: 600;">
                            <th style="padding: 12px 16px;">Item Code</th>
                            <th style="padding: 12px 16px;">Supply Item Description</th>
                            <th style="padding: 12px 16px;">Category &amp; Sub-Cat</th>
                            <th style="padding: 12px 16px;">Packaging / UOM</th>
                            <th style="padding: 12px 16px; text-align: right;">Std Cost</th>
                            <th style="padding: 12px 16px; text-align: right;">Billable Price</th>
                            <th style="padding: 12px 16px; text-align: center;">Safety Stock</th>
                            <th style="padding: 12px 16px; text-align: center;">On-Hand Stock</th>
                            <th style="padding: 12px 16px; text-align: right;">Valuation</th>
                            <th style="padding: 12px 16px; text-align: right;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${records.length === 0 ? `
                            <tr>
                                <td colspan="10" style="padding: 36px; text-align: center; color: #94a3b8;">No non-pharmaceutical supply catalog items found.</td>
                            </tr>
                        ` : records.map(i => {
                            const catBadge = getCategoryBadge(i.category);
                            const isLow = parseFloat(i.current_stock) <= parseFloat(i.min_safety_stock);
                            return `
                                <tr style="border-bottom: 1px solid #f1f5f9;">
                                    <td style="padding: 12px 16px; font-family: monospace; font-weight: 600; color: #0f172a;">
                                        ${i.item_code}
                                        <div style="font-size: 10px; color: ${i.sterility_type === 'sterile' ? '#16a34a' : '#64748b'}; font-weight: 700; text-transform: uppercase;">
                                            ${i.sterility_type}
                                        </div>
                                    </td>
                                    <td style="padding: 12px 16px; font-weight: 700; color: #0f172a; max-width: 260px;">
                                        <div>${escapeHtml(i.item_name)}</div>
                                        <div style="font-size: 11px; color: #64748b; font-weight: 400;">
                                            Brand: ${escapeHtml(i.brand_manufacturer || 'Generic')} &bull; SKU: ${escapeHtml(i.barcode_sku || 'N/A')}
                                        </div>
                                    </td>
                                    <td style="padding: 12px 16px;">
                                        <span style="background: ${catBadge.bg}; color: ${catBadge.color}; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 4px; display: inline-block;">
                                            ${catBadge.label}
                                        </span>
                                        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${escapeHtml(i.sub_category || '')}</div>
                                    </td>
                                    <td style="padding: 12px 16px; color: #475569;">
                                        <div style="font-weight: 600; text-transform: capitalize;">${escapeHtml(i.unit_of_measure)}</div>
                                        <div style="font-size: 11px; color: #64748b;">${escapeHtml(i.packaging_description || '')}</div>
                                    </td>
                                    <td style="padding: 12px 16px; text-align: right; font-weight: 600; color: #0f172a;">
                                        $${parseFloat(i.standard_cost).toFixed(2)}
                                    </td>
                                    <td style="padding: 12px 16px; text-align: right;">
                                        ${i.is_billable_to_patient == 1 ? `
                                            <span style="font-weight: 700; color: #166534;">$${parseFloat(i.selling_price).toFixed(2)}</span>
                                            <div style="font-size: 10px; color: #059669;">Chargeable</div>
                                        ` : `
                                            <span style="color: #64748b; font-size: 11px; font-style: italic;">Overhead</span>
                                        `}
                                    </td>
                                    <td style="padding: 12px 16px; text-align: center; color: #64748b; font-size: 12px;">
                                        ${parseFloat(i.min_safety_stock).toFixed(0)} ${escapeHtml(i.unit_of_measure)}
                                    </td>
                                    <td style="padding: 12px 16px; text-align: center;">
                                        <span style="background: ${isLow ? '#fee2e2' : '#ecfdf5'}; color: ${isLow ? '#dc2626' : '#047857'}; font-size: 12px; font-weight: 800; padding: 4px 10px; border-radius: 12px;">
                                            ${parseFloat(i.current_stock).toFixed(0)}
                                        </span>
                                    </td>
                                    <td style="padding: 12px 16px; text-align: right; font-weight: 700; color: #0f172a;">
                                        $${(parseFloat(i.current_stock) * parseFloat(i.standard_cost)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td style="padding: 12px 16px; text-align: right;">
                                        <button class="btnAdjustStock" data-id="${i.id}" data-name="${escapeHtml(i.item_name)}" data-stock="${i.current_stock}" title="Adjust Inventory / Restock" style="padding: 5px 8px; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; border-radius: 4px; cursor: pointer; margin-right: 4px;">
                                            <i class="fas fa-dolly"></i>
                                        </button>
                                        <button class="btnEditItem" data-id="${i.id}" title="Edit Item" style="padding: 5px 8px; background: #f8fafc; color: #475569; border: 1px solid #cbd5e1; border-radius: 4px; cursor: pointer; margin-right: 4px;">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btnDeleteItem" data-id="${i.id}" title="Delete Item" style="padding: 5px 8px; background: #fff1f2; color: #e11d48; border: 1px solid #fecdd3; border-radius: 4px; cursor: pointer;">
                                            <i class="fas fa-trash-alt"></i>
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

/**
 * TAB 2: Department Par Levels
 */
function renderDepartmentsTab() {
    return `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 22px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
                <div>
                    <h3 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0;">Ward &amp; Department Par Stock Allocations</h3>
                    <p style="font-size: 13px; color: #64748b; margin: 0;">Authorized non-pharma supply stock levels maintained at bedside stations and clinical carts.</p>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 18px;">
                <!-- Emergency Department -->
                <div style="border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #fafafa;">
                    <div style="padding: 12px 16px; background: #f0fdf4; border-bottom: 1px solid #dcfce7; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 800; font-size: 14px; color: #166534;"><i class="fas fa-ambulance" style="margin-right: 6px;"></i> Emergency Department</span>
                        <span style="font-size: 11px; background: #bbf7d0; color: #14532d; font-weight: 700; padding: 2px 6px; border-radius: 4px;">5 Par Items</span>
                    </div>
                    <div style="padding: 14px; font-size: 12px;">
                        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
                            <span>5mL Syringes 21G:</span>
                            <strong>Par: 20 boxes (Burn: 8/day)</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
                            <span>IV Cannula 20G (Pink):</span>
                            <strong>Par: 15 boxes (Burn: 6/day)</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
                            <span>IV Cannula 18G (Green):</span>
                            <strong>Par: 12 boxes (Burn: 5/day)</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
                            <span>Nitrile Gloves Medium:</span>
                            <strong>Par: 30 boxes (Burn: 10/day)</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 6px 0;">
                            <span>Endotracheal Tubes 7.5mm:</span>
                            <strong>Par: 6 boxes (Burn: 2/day)</strong>
                        </div>
                    </div>
                </div>

                <!-- Intensive Care Unit -->
                <div style="border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #fafafa;">
                    <div style="padding: 12px 16px; background: #eff6ff; border-bottom: 1px solid #dbeafe; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 800; font-size: 14px; color: #1e40af;"><i class="fas fa-procedures" style="margin-right: 6px;"></i> Intensive Care Unit (ICU)</span>
                        <span style="font-size: 11px; background: #bfdbfe; color: #1e3a8a; font-weight: 700; padding: 2px 6px; border-radius: 4px;">4 Par Items</span>
                    </div>
                    <div style="padding: 14px; font-size: 12px;">
                        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
                            <span>10mL Luer-Lok Syringes:</span>
                            <strong>Par: 15 boxes (Burn: 5/day)</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
                            <span>Endotracheal Tubes 7.5mm:</span>
                            <strong>Par: 8 boxes (Burn: 3/day)</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
                            <span>Suction Catheters 14Fr:</span>
                            <strong>Par: 20 boxes (Burn: 7/day)</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 6px 0;">
                            <span>Foley Catheters 16Fr 30mL:</span>
                            <strong>Par: 6 boxes (Burn: 2/day)</strong>
                        </div>
                    </div>
                </div>

                <!-- Operating Room -->
                <div style="border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #fafafa;">
                    <div style="padding: 12px 16px; background: #fdf2f8; border-bottom: 1px solid #fce7f3; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 800; font-size: 14px; color: #9d174d;"><i class="fas fa-syringe" style="margin-right: 6px;"></i> Operating Room (OR)</span>
                        <span style="font-size: 11px; background: #fbcfe8; color: #831843; font-weight: 700; padding: 2px 6px; border-radius: 4px;">3 Par Items</span>
                    </div>
                    <div style="padding: 14px; font-size: 12px;">
                        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
                            <span>Sterile Latex Gloves 7.5:</span>
                            <strong>Par: 25 boxes (Burn: 10/day)</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
                            <span>Surgical Island Dressing 10x25:</span>
                            <strong>Par: 15 boxes (Burn: 5/day)</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 6px 0;">
                            <span>IV Cannula 18G (Green):</span>
                            <strong>Par: 15 boxes (Burn: 6/day)</strong>
                        </div>
                    </div>
                </div>

                <!-- General Inpatient Ward -->
                <div style="border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #fafafa;">
                    <div style="padding: 12px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 800; font-size: 14px; color: #334155;"><i class="fas fa-bed" style="margin-right: 6px;"></i> General Inpatient Ward</span>
                        <span style="font-size: 11px; background: #e2e8f0; color: #1e293b; font-weight: 700; padding: 2px 6px; border-radius: 4px;">4 Par Items</span>
                    </div>
                    <div style="padding: 14px; font-size: 12px;">
                        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
                            <span>5mL Syringes 21G:</span>
                            <strong>Par: 25 boxes (Burn: 6/day)</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
                            <span>Primary IV Infusion Sets:</span>
                            <strong>Par: 20 packs (Burn: 5/day)</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
                            <span>Fitted Hospital Bed Sheets:</span>
                            <strong>Par: 30 pcs (Burn: 8/day)</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 6px 0;">
                            <span>Disinfectant Surface Wipes:</span>
                            <strong>Par: 10 canisters (Burn: 2/day)</strong>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * TAB 3: Valuation & Health
 */
function renderValuationTab() {
    const cats = cache.metrics?.category_breakdown || [];

    return `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 22px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="margin-bottom: 20px;">
                <h3 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0;">Non-Pharmaceutical Supply Category Valuation</h3>
                <p style="font-size: 13px; color: #64748b; margin: 0;">Breakdown of warehouse inventory investment, stock units, and replenishment status by supply family.</p>
            </div>

            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                    <thead>
                        <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: 600;">
                            <th style="padding: 12px 16px;">Supply Category</th>
                            <th style="padding: 12px 16px; text-align: center;">SKUs Active</th>
                            <th style="padding: 12px 16px; text-align: center;">Total Units On-Hand</th>
                            <th style="padding: 12px 16px; text-align: right;">Total Category Valuation</th>
                            <th style="padding: 12px 16px; text-align: center;">Stock Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${cats.map(c => {
                            const badge = getCategoryBadge(c.category);
                            return `
                                <tr style="border-bottom: 1px solid #f1f5f9;">
                                    <td style="padding: 12px 16px; font-weight: 700; color: #0f172a;">
                                        <span style="background: ${badge.bg}; color: ${badge.color}; font-size: 12px; font-weight: 700; padding: 3px 8px; border-radius: 4px;">
                                            ${badge.label}
                                        </span>
                                    </td>
                                    <td style="padding: 12px 16px; text-align: center; font-weight: 600;">${c.item_count} Items</td>
                                    <td style="padding: 12px 16px; text-align: center; color: #475569;">${parseFloat(c.total_units_on_hand).toFixed(0)} Units</td>
                                    <td style="padding: 12px 16px; text-align: right; font-weight: 800; color: #047857; font-size: 14px;">
                                        $${Number(c.category_valuation).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td style="padding: 12px 16px; text-align: center;">
                                        ${parseInt(c.low_stock_items, 10) > 0 ? `
                                            <span style="background: #fee2e2; color: #dc2626; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 12px;">
                                                ${c.low_stock_items} Below Safety Stock
                                            </span>
                                        ` : `
                                            <span style="background: #ecfdf5; color: #047857; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 12px;">
                                                <i class="fas fa-check"></i> Optimal
                                            </span>
                                        `}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

/**
 * Event Bindings
 */
function bindEvents() {
    const container = document.querySelector('.supply-catalog-container');
    if (!container) return;

    container.addEventListener('click', async (e) => {
        const tabBtn = e.target.closest('.sc-tab-btn');
        if (tabBtn) {
            state.activeTab = tabBtn.getAttribute('data-tab');
            renderApp();
            return;
        }

        if (e.target.closest('#btnNewSupplyItemModal')) {
            openItemFormModal();
            return;
        }

        const btnAdjust = e.target.closest('.btnAdjustStock');
        if (btnAdjust) {
            const id = parseInt(btnAdjust.getAttribute('data-id'), 10);
            const name = btnAdjust.getAttribute('data-name');
            const stock = btnAdjust.getAttribute('data-stock');
            openStockAdjustModal(id, name, stock);
            return;
        }

        const btnEdit = e.target.closest('.btnEditItem');
        if (btnEdit) {
            const id = parseInt(btnEdit.getAttribute('data-id'), 10);
            openItemFormModal(id);
            return;
        }

        const btnDel = e.target.closest('.btnDeleteItem');
        if (btnDel) {
            const id = parseInt(btnDel.getAttribute('data-id'), 10);
            if (confirm("Are you sure you want to delete this non-pharmaceutical supply catalog item?")) {
                await deleteSupplyItem(id);
            }
            return;
        }

        if (e.target.closest('#btnToggleLowStock')) {
            state.lowStockOnly = !state.lowStockOnly;
            await loadInitialData();
            return;
        }

        if (e.target.closest('#btnResetFilters')) {
            state.searchQuery = "";
            state.categoryFilter = "";
            state.billableFilter = "";
            state.lowStockOnly = false;
            await loadInitialData();
            return;
        }
    });

    container.addEventListener('change', async (e) => {
        if (e.target.id === 'scCategoryFilter') {
            state.categoryFilter = e.target.value;
            await loadInitialData();
        } else if (e.target.id === 'scBillableFilter') {
            state.billableFilter = e.target.value;
            await loadInitialData();
        }
    });

    container.addEventListener('keydown', async (e) => {
        if (e.target.id === 'scSearchInput' && e.key === 'Enter') {
            state.searchQuery = e.target.value.trim();
            await loadInitialData();
        }
    });
}

/**
 * Delete Supply Item
 */
async function deleteSupplyItem(id) {
    try {
        await api('/supply-catalog/items/delete', 'POST', { id });
        showToast("Supply catalog item deleted.", "success");
        await loadInitialData();
    } catch (err) {
        showToast("Error deleting item: " + err.message, "error");
    }
}

/**
 * MODAL: Add / Edit Supply Item
 */
async function openItemFormModal(id = null) {
    let item = null;
    if (id) {
        try {
            const res = await api(`/supply-catalog/items/${id}`);
            item = res?.data?.item;
        } catch (e) {
            showToast("Failed to load item: " + e.message, "error");
            return;
        }
    }

    const modalBox = document.getElementById('scModalContainer');
    if (!modalBox) return;

    const suppliers = cache.metadata?.suppliers || [];

    modalBox.innerHTML = `
        <div style="position: fixed; inset: 0; background: rgba(15,23,42,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
            <div style="background: #ffffff; border-radius: 14px; width: 100%; max-width: 720px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);">
                <div style="padding: 18px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: #ffffff; z-index: 10;">
                    <h3 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0;">
                        ${item ? 'Edit Supply Catalog Item' : 'Register Non-Pharmaceutical Supply Item'}
                    </h3>
                    <button id="btnCloseModal" style="background: none; border: none; font-size: 20px; color: #64748b; cursor: pointer;">&times;</button>
                </div>

                <form id="scItemForm" style="padding: 24px;">
                    <input type="hidden" name="id" value="${item?.id || ''}" />

                    <!-- Item Name -->
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Supply Item Description / Name *</label>
                        <input type="text" name="item_name" required value="${escapeHtml(item?.item_name || '')}" placeholder="e.g. Disposable Syringe 5mL with 21G Needle" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                    </div>

                    <!-- Category & Sub-Category -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Category *</label>
                            <select name="category" required style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                                <option value="medical_surgical" ${item?.category === 'medical_surgical' ? 'selected' : ''}>Medical &amp; Surgical Consumables</option>
                                <option value="ppe_infection_control" ${item?.category === 'ppe_infection_control' ? 'selected' : ''}>PPE &amp; Infection Control</option>
                                <option value="wound_care" ${item?.category === 'wound_care' ? 'selected' : ''}>Wound Care &amp; Dressings</option>
                                <option value="respiratory_airway" ${item?.category === 'respiratory_airway' ? 'selected' : ''}>Respiratory &amp; Airway</option>
                                <option value="catheters_tubing" ${item?.category === 'catheters_tubing' ? 'selected' : ''}>Catheters &amp; Tubing</option>
                                <option value="cleaning_disinfectants" ${item?.category === 'cleaning_disinfectants' ? 'selected' : ''}>Cleaning &amp; Disinfectants</option>
                                <option value="linen_bedding" ${item?.category === 'linen_bedding' ? 'selected' : ''}>Linen &amp; Patient Bedding</option>
                            </select>
                        </div>
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Sub-Category</label>
                            <input type="text" name="sub_category" value="${escapeHtml(item?.sub_category || '')}" placeholder="e.g. Vascular Access, Needles &amp; Syringes" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                        </div>
                    </div>

                    <!-- Brand & Packaging -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 16px;">
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Brand / Manufacturer</label>
                            <input type="text" name="brand_manufacturer" value="${escapeHtml(item?.brand_manufacturer || '')}" placeholder="e.g. BD, 3M, B. Braun" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                        </div>
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Unit of Measure *</label>
                            <select name="unit_of_measure" required style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                                <option value="box" ${item?.unit_of_measure === 'box' ? 'selected' : ''}>Box</option>
                                <option value="piece" ${item?.unit_of_measure === 'piece' ? 'selected' : ''}>Piece (pc)</option>
                                <option value="pack" ${item?.unit_of_measure === 'pack' ? 'selected' : ''}>Pack</option>
                                <option value="canister" ${item?.unit_of_measure === 'canister' ? 'selected' : ''}>Canister</option>
                                <option value="bottle" ${item?.unit_of_measure === 'bottle' ? 'selected' : ''}>Bottle</option>
                                <option value="set" ${item?.unit_of_measure === 'set' ? 'selected' : ''}>Set</option>
                            </select>
                        </div>
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Packaging Description</label>
                            <input type="text" name="packaging_description" value="${escapeHtml(item?.packaging_description || '')}" placeholder="e.g. 100 pcs per box" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                        </div>
                    </div>

                    <!-- Pricing & Billing -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 16px; background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Standard Purchase Cost ($) *</label>
                            <input type="number" step="0.01" min="0" name="standard_cost" required value="${item?.standard_cost || '0.00'}" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-weight: 700;" />
                        </div>
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Patient Selling Price ($)</label>
                            <input type="number" step="0.01" min="0" name="selling_price" value="${item?.selling_price || '0.00'}" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-weight: 700;" />
                        </div>
                        <div style="display: flex; align-items: center; padding-top: 20px;">
                            <label style="font-size: 13px; font-weight: 700; color: #1e293b; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                                <input type="checkbox" name="is_billable_to_patient" value="1" ${item?.is_billable_to_patient != 0 ? 'checked' : ''} style="width: 16px; height: 16px;" />
                                Billable to Patient
                            </label>
                        </div>
                    </div>

                    <!-- Stock Thresholds -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Min Safety Stock *</label>
                            <input type="number" min="0" name="min_safety_stock" required value="${item?.min_safety_stock || '20'}" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; text-align: center;" />
                        </div>
                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Current Stock</label>
                            <input type="number" min="0" name="current_stock" value="${item?.current_stock || '0'}" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; text-align: center; font-weight: 700;" />
                        </div>
                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Max Stock Level</label>
                            <input type="number" min="0" name="max_stock_level" value="${item?.max_stock_level || '200'}" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; text-align: center;" />
                        </div>
                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Reorder Qty</label>
                            <input type="number" min="1" name="reorder_quantity" value="${item?.reorder_quantity || '50'}" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; text-align: center;" />
                        </div>
                    </div>

                    <!-- Sterility & Supplier -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Sterility Classification</label>
                            <select name="sterility_type" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                                <option value="sterile" ${item?.sterility_type === 'sterile' ? 'selected' : ''}>Sterile (Individually Packaged)</option>
                                <option value="non_sterile" ${item?.sterility_type === 'non_sterile' ? 'selected' : ''}>Non-Sterile</option>
                                <option value="not_applicable" ${item?.sterility_type === 'not_applicable' ? 'selected' : ''}>Not Applicable (Linens / Cleaners)</option>
                            </select>
                        </div>
                        <div>
                            <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Preferred Supplier</label>
                            <select name="preferred_supplier_name" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                                <option value="">Select Hospital Supplier...</option>
                                ${suppliers.map(s => `
                                    <option value="${s.name}" ${item?.preferred_supplier_name === s.name ? 'selected' : ''}>
                                        ${escapeHtml(s.name)}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    </div>

                    <!-- Notes -->
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Clinical Indications &amp; Storage Notes</label>
                        <textarea name="notes" rows="2" placeholder="Clinical notes, storage temperature, or department handling..." style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">${escapeHtml(item?.notes || '')}</textarea>
                    </div>

                    <!-- Form Buttons -->
                    <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                        <button type="button" id="btnCancelModal" style="padding: 10px 18px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">Cancel</button>
                        <button type="submit" style="padding: 10px 20px; background: #0284c7; color: #ffffff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">Save Supply Item</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('btnCloseModal').addEventListener('click', closeModal);
    document.getElementById('btnCancelModal').addEventListener('click', closeModal);

    document.getElementById('scItemForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd.entries());
        data.is_billable_to_patient = fd.has('is_billable_to_patient') ? 1 : 0;

        try {
            const endpoint = data.id ? '/supply-catalog/items/update' : '/supply-catalog/items';
            await api(endpoint, 'POST', data);
            showToast("Supply catalog item saved successfully.", "success");
            closeModal();
            await loadInitialData();
        } catch (err) {
            showToast("Failed to save supply item: " + err.message, "error");
        }
    });
}

/**
 * MODAL: Quick Stock Adjustment
 */
function openStockAdjustModal(id, name, currentStock) {
    const modalBox = document.getElementById('scModalContainer');
    if (!modalBox) return;

    modalBox.innerHTML = `
        <div style="position: fixed; inset: 0; background: rgba(15,23,42,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
            <div style="background: #ffffff; border-radius: 14px; width: 100%; max-width: 480px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);">
                <div style="padding: 18px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="font-size: 17px; font-weight: 800; color: #0f172a; margin: 0;">Quick Inventory Stock Adjustment</h3>
                    <button id="btnCloseModal" style="background: none; border: none; font-size: 20px; color: #64748b; cursor: pointer;">&times;</button>
                </div>
                <form id="scAdjustForm" style="padding: 24px;">
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 13px;">
                        <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px;">${escapeHtml(name)}</div>
                        <div style="color: #64748b;">Current On-Hand Stock: <strong style="color: #0f172a;">${parseFloat(currentStock).toFixed(0)} Units</strong></div>
                    </div>

                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Adjustment Quantity (+ to restock, - to deduct) *</label>
                        <input type="number" step="1" name="adjustment_quantity" required placeholder="e.g. +50 or -10" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; font-weight: 800; text-align: center;" />
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">Reason for Adjustment</label>
                        <select name="reason" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;">
                            <option value="Goods Receipt / Restock Delivery">Goods Receipt / Restock Delivery</option>
                            <option value="Ward Emergency Issue">Ward Emergency Issue</option>
                            <option value="Physical Inventory Re-count">Physical Inventory Re-count</option>
                            <option value="Damaged / Expired Sterile Seal Broken">Damaged / Expired Disposal</option>
                        </select>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                        <button type="button" id="btnCancelModal" style="padding: 9px 16px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; cursor: pointer;">Cancel</button>
                        <button type="submit" style="padding: 9px 18px; background: #0284c7; color: #ffffff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">Apply Adjustment</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('btnCloseModal').addEventListener('click', closeModal);
    document.getElementById('btnCancelModal').addEventListener('click', closeModal);

    document.getElementById('scAdjustForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd.entries());
        try {
            await api('/supply-catalog/adjust-stock', 'POST', { id, ...data });
            showToast("Inventory stock adjusted successfully.", "success");
            closeModal();
            await loadInitialData();
        } catch (err) {
            showToast("Failed to adjust stock: " + err.message, "error");
        }
    });
}

function closeModal() {
    const modalBox = document.getElementById('scModalContainer');
    if (modalBox) modalBox.innerHTML = '';
}

/**
 * Format Helpers
 */
function getCategoryBadge(cat) {
    switch (cat) {
        case 'medical_surgical':
            return { bg: '#e0f2fe', color: '#0369a1', label: 'Med-Surg' };
        case 'ppe_infection_control':
            return { bg: '#ecfdf5', color: '#047857', label: 'PPE & Infection' };
        case 'wound_care':
            return { bg: '#fef3c7', color: '#b45309', label: 'Wound Care' };
        case 'respiratory_airway':
            return { bg: '#f3e8ff', color: '#7e22ce', label: 'Respiratory & Airway' };
        case 'catheters_tubing':
            return { bg: '#fce7f3', color: '#be185d', label: 'Catheters & Tubing' };
        case 'cleaning_disinfectants':
            return { bg: '#f0fdf4', color: '#166534', label: 'Disinfectants' };
        case 'linen_bedding':
            return { bg: '#f1f5f9', color: '#475569', label: 'Linen & Bedding' };
        default:
            return { bg: '#f1f5f9', color: '#475569', label: cat };
    }
}

function showToast(msg, type = "info") {
    const el = document.getElementById('scNotificationArea');
    if (!el) return;

    const bg = type === 'error' ? '#ef4444' : (type === 'success' ? '#10b981' : '#0284c7');
    el.innerHTML = `
        <div style="background: ${bg}; color: #ffffff; padding: 12px 18px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; font-weight: 600; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            <span>${escapeHtml(msg)}</span>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; color: #ffffff; font-size: 16px; cursor: pointer;">&times;</button>
        </div>
    `;

    setTimeout(() => {
        if (el && el.firstElementChild) el.firstElementChild.remove();
    }, 5000);
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
