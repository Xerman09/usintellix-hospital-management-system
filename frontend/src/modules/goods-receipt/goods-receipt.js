/**
 * Hospital Goods Receipt Notes (GRN) & 3-Way Matching Module
 * Subsystem 8: Logistics, Procurement & Supply Chain
 * Schema: supply_goods_receipt_notes, supply_goods_receipt_items
 * 3-Way Matching: Purchase Order (PO) vs Delivery Receipt (DR) vs Goods Receipt Note (GRN)
 */

import { api } from "../../core/api.js";

let state = {
    activeTab: "grn_ledger", // 'grn_ledger' | 'three_way_match' | 'quarantine_ledger'
    searchQuery: "",
    matchStatusFilter: "",
    apStatusFilter: "",
    conditionFilter: "",
    dateFilter: "",
    page: 1,
    perPage: 15
};

let cache = {
    metrics: null,
    grnData: { total: 0, records: [] },
    metadata: {
        suppliers: [],
        supply_items: [],
        package_conditions: {},
        rejection_reasons: {},
        match_statuses: {},
        ap_statuses: {}
    }
};

export function GoodsReceiptView() {
    return `
        <div class="goods-receipt-container" style="padding: 24px; max-width: 1440px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b;">
            <div id="grnNotificationArea"></div>

            <!-- Header Section -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
                <div>
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                        <span style="background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Hospital Receiving Dock &amp; QA</span>
                        <span style="color: #64748b; font-size: 13px;">Subsystem 8: Procurement &amp; Supply Chain</span>
                    </div>
                    <h1 style="font-size: 26px; font-weight: 800; color: #0f172a; margin: 0 0 6px 0;">Formal Goods Receipt Notes &amp; 3-Way Matching</h1>
                    <p style="margin: 0; color: #64748b; font-size: 14px;">Central dock receiving inspection, sterility audits, batch verification, and PO vs. Delivery Receipt vs. GRN matching prior to Accounts Payable payment release.</p>
                </div>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button id="btnNewGRNModal" style="background: #0d9488; color: #ffffff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 4px rgba(13,148,136,0.25);">
                        <i class="fas fa-truck-ramp-box"></i> Receive Vendor Delivery (Create GRN)
                    </button>
                </div>
            </div>

            <!-- Executive KPI Cards -->
            <div id="grnKpiSection" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
                ${renderKpiCards()}
            </div>

            <!-- Navigation Tabs -->
            <div style="display: flex; border-bottom: 2px solid #e2e8f0; margin-bottom: 20px; gap: 8px; flex-wrap: wrap;">
                <button class="grn-tab-btn ${state.activeTab === 'grn_ledger' ? 'active' : ''}" data-tab="grn_ledger" style="padding: 12px 18px; border: none; background: none; font-weight: 600; font-size: 14px; cursor: pointer; color: ${state.activeTab === 'grn_ledger' ? '#0d9488' : '#64748b'}; border-bottom: 3px solid ${state.activeTab === 'grn_ledger' ? '#0d9488' : 'transparent'}; margin-bottom: -2px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-file-invoice"></i> Goods Receipt Notes Ledger
                </button>
                <button class="grn-tab-btn ${state.activeTab === 'three_way_match' ? 'active' : ''}" data-tab="three_way_match" style="padding: 12px 18px; border: none; background: none; font-weight: 600; font-size: 14px; cursor: pointer; color: ${state.activeTab === 'three_way_match' ? '#0d9488' : '#64748b'}; border-bottom: 3px solid ${state.activeTab === 'three_way_match' ? '#0d9488' : 'transparent'}; margin-bottom: -2px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-balance-scale"></i> 3-Way Match &amp; Discrepancy Audits
                </button>
                <button class="grn-tab-btn ${state.activeTab === 'quarantine_ledger' ? 'active' : ''}" data-tab="quarantine_ledger" style="padding: 12px 18px; border: none; background: none; font-weight: 600; font-size: 14px; cursor: pointer; color: ${state.activeTab === 'quarantine_ledger' ? '#0d9488' : '#64748b'}; border-bottom: 3px solid ${state.activeTab === 'quarantine_ledger' ? '#0d9488' : 'transparent'}; margin-bottom: -2px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-ban"></i> Quality Control &amp; Quarantine Log
                </button>
            </div>

            <!-- Tab Content Area -->
            <div id="grnTabContent">
                ${renderActiveTabContent()}
            </div>

            <!-- Modals Container -->
            <div id="grnModalContainer"></div>
        </div>
    `;
}

/**
 * Initialize Module
 */
export async function initGoodsReceipt() {
    await loadInitialData();
    bindEvents();
}

/**
 * Fetch Initial Data
 */
async function loadInitialData() {
    try {
        const [metaRes, metricsRes, grnRes] = await Promise.all([
            api('/goods-receipt/metadata').catch(() => null),
            api('/goods-receipt/metrics').catch(() => null),
            api(`/goods-receipt/notes?three_way_match_status=${state.matchStatusFilter}&ap_authorization_status=${state.apStatusFilter}&package_condition=${state.conditionFilter}&received_date=${state.dateFilter}&q=${encodeURIComponent(state.searchQuery)}&page=${state.page}&per_page=${state.perPage}`).catch(() => null)
        ]);

        if (metaRes?.data) cache.metadata = metaRes.data;
        if (metricsRes?.data) cache.metrics = metricsRes.data;
        if (grnRes?.data) cache.grnData = grnRes.data;

        renderApp();
    } catch (e) {
        console.error("Failed to load Goods Receipt data", e);
        showToast("Error loading goods receipt notes: " + e.message, "error");
    }
}

/**
 * Re-render dynamic sections without full page reload
 */
function renderApp() {
    const kpiEl = document.getElementById('grnKpiSection');
    if (kpiEl) kpiEl.innerHTML = renderKpiCards();

    const contentEl = document.getElementById('grnTabContent');
    if (contentEl) contentEl.innerHTML = renderActiveTabContent();
}

/**
 * Render Executive KPI Cards
 */
function renderKpiCards() {
    const m = cache.metrics || {
        total_grns: 0,
        total_accepted_amount: 0,
        total_variance_rejected_amount: 0,
        three_way_match_rate: 100,
        match_distribution: { matched_exact: 0, quantity_variance_flagged: 0, partial_delivery_matched: 0, rejected_quality_failure: 0 },
        ap_summary: { authorized_count: 0, held_or_blocked_count: 0 },
        total_rejected_units: 0
    };

    return `
        <!-- Card 1: Total GRNs -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid #0d9488;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase;">Dock Deliveries (GRN)</span>
                <span style="font-size: 18px; color: #0d9488;"><i class="fas fa-clipboard-check"></i></span>
            </div>
            <div style="font-size: 28px; font-weight: 800; color: #0f172a;">${m.total_grns}</div>
            <div style="font-size: 12px; color: #0d9488; margin-top: 4px; font-weight: 600;">
                <i class="fas fa-check-circle"></i> ${m.match_distribution.matched_exact} exact matches
            </div>
        </div>

        <!-- Card 2: Accepted Procurement Value -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid #10b981;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase;">Accepted Value (Passed QC)</span>
                <span style="font-size: 18px; color: #10b981;"><i class="fas fa-dollar-sign"></i></span>
            </div>
            <div style="font-size: 28px; font-weight: 800; color: #047857;">$${Number(m.total_accepted_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div style="font-size: 12px; color: #059669; margin-top: 4px;">
                Authorized for AP payment release
            </div>
        </div>

        <!-- Card 3: 3-Way Match Rate -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid #3b82f6;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase;">3-Way Match Success</span>
                <span style="font-size: 18px; color: #3b82f6;"><i class="fas fa-percentage"></i></span>
            </div>
            <div style="font-size: 28px; font-weight: 800; color: #1d4ed8;">${m.three_way_match_rate}%</div>
            <div style="font-size: 12px; color: #2563eb; margin-top: 4px;">
                ${m.match_distribution.quantity_variance_flagged + m.match_distribution.partial_delivery_matched} partials / variances flagged
            </div>
        </div>

        <!-- Card 4: Discrepancies & Blocked -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid #ef4444;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase;">Rejected / Debit Memos</span>
                <span style="font-size: 18px; color: #ef4444;"><i class="fas fa-shield-virus"></i></span>
            </div>
            <div style="font-size: 28px; font-weight: 800; color: #b91c1c;">$${Number(m.total_variance_rejected_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div style="font-size: 12px; color: #dc2626; margin-top: 4px; font-weight: 600;">
                ${m.total_rejected_units} units quarantined / ${m.ap_summary.held_or_blocked_count} AP payments on hold
            </div>
        </div>
    `;
}

/**
 * Render Active Tab Content
 */
function renderActiveTabContent() {
    switch (state.activeTab) {
        case 'grn_ledger':
            return renderGrnLedgerTab();
        case 'three_way_match':
            return renderThreeWayMatchTab();
        case 'quarantine_ledger':
            return renderQuarantineTab();
        default:
            return renderGrnLedgerTab();
    }
}

/**
 * TAB 1: Goods Receipt Notes Ledger
 */
function renderGrnLedgerTab() {
    const records = cache.grnData?.records || [];

    return `
        <!-- Filter Bar -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 20px; display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
            <div style="flex: 1; min-width: 220px;">
                <input type="text" id="grnSearchInput" placeholder="Search GRN #, PO #, DR #, Supplier, Carrier..." value="${escapeHtml(state.searchQuery)}" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
            </div>
            <div style="min-width: 170px;">
                <select id="grnMatchFilter" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #ffffff;">
                    <option value="">All 3-Way Match Statuses</option>
                    <option value="matched_exact" ${state.matchStatusFilter === 'matched_exact' ? 'selected' : ''}>Exact 3-Way Match</option>
                    <option value="partial_delivery_matched" ${state.matchStatusFilter === 'partial_delivery_matched' ? 'selected' : ''}>Partial Delivery</option>
                    <option value="quantity_variance_flagged" ${state.matchStatusFilter === 'quantity_variance_flagged' ? 'selected' : ''}>Quantity Variance Flagged</option>
                    <option value="rejected_quality_failure" ${state.matchStatusFilter === 'rejected_quality_failure' ? 'selected' : ''}>Quality Failure / Rejected</option>
                </select>
            </div>
            <div style="min-width: 170px;">
                <select id="grnApFilter" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #ffffff;">
                    <option value="">All AP Payment Statuses</option>
                    <option value="authorized_for_payment" ${state.apStatusFilter === 'authorized_for_payment' ? 'selected' : ''}>Authorized for Payment</option>
                    <option value="partially_authorized" ${state.apStatusFilter === 'partially_authorized' ? 'selected' : ''}>Partially Authorized</option>
                    <option value="payment_hold_variance" ${state.apStatusFilter === 'payment_hold_variance' ? 'selected' : ''}>Payment Hold (Variance)</option>
                    <option value="payment_blocked_rejected" ${state.apStatusFilter === 'payment_blocked_rejected' ? 'selected' : ''}>Payment Blocked (Rejected)</option>
                </select>
            </div>
            <div style="min-width: 140px;">
                <input type="date" id="grnDateFilter" value="${state.dateFilter}" style="width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #ffffff;" />
            </div>
            <button id="btnResetGrnFilters" style="padding: 8px 14px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; cursor: pointer;">
                <i class="fas fa-undo"></i> Reset
            </button>
        </div>

        <!-- GRN Table -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div style="font-weight: 700; font-size: 16px; color: #0f172a;">
                    Hospital Dock Receiving Logs (${cache.grnData?.total || 0} Registered GRNs)
                </div>
            </div>

            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                    <thead>
                        <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">
                            <th style="padding: 12px 16px;">GRN # &amp; Date</th>
                            <th style="padding: 12px 16px;">PO &amp; Delivery Receipt</th>
                            <th style="padding: 12px 16px;">Supplier &amp; Carrier</th>
                            <th style="padding: 12px 16px;">Receiving Dock &amp; QA</th>
                            <th style="padding: 12px 16px; text-align: center;">3-Way Match</th>
                            <th style="padding: 12px 16px; text-align: right;">Accepted / Qty</th>
                            <th style="padding: 12px 16px; text-align: right;">Accepted Amount</th>
                            <th style="padding: 12px 16px; text-align: center;">AP Payment</th>
                            <th style="padding: 12px 16px; text-align: center;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${records.length === 0 ? `
                            <tr>
                                <td colspan="9" style="text-align: center; padding: 40px; color: #64748b;">
                                    <i class="fas fa-inbox" style="font-size: 32px; color: #cbd5e1; margin-bottom: 8px; display: block;"></i>
                                    No goods receipt notes matching current filters.
                                </td>
                            </tr>
                        ` : records.map(r => renderGrnRow(r)).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            ${renderPagination()}
        </div>
    `;
}

/**
 * Render Single GRN Table Row
 */
function renderGrnRow(r) {
    const matchBadge = getMatchStatusBadge(r.three_way_match_status);
    const apBadge = getApStatusBadge(r.ap_authorization_status);
    const condBadge = getConditionBadge(r.package_condition);

    const isColdChain = r.cold_chain_verified ? `<span title="Cold Chain Inspected: ${r.cold_chain_temp_celsius || '4'}°C" style="display: inline-flex; align-items: center; gap: 3px; font-size: 11px; color: #0284c7; background: #e0f2fe; padding: 2px 6px; border-radius: 4px; font-weight: 600;"><i class="fas fa-temperature-low"></i> ${r.cold_chain_temp_celsius || '4.0'}°C</span>` : '';
    const isSterile = r.sterility_seal_inspected ? `<span title="Sterile Barrier Inspected" style="display: inline-flex; align-items: center; gap: 3px; font-size: 11px; color: #059669; background: #d1fae5; padding: 2px 6px; border-radius: 4px; font-weight: 600;"><i class="fas fa-certificate"></i> Sterile Sealed</span>` : '';

    return `
        <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
            <td style="padding: 14px 16px; font-family: monospace;">
                <span class="view-grn-doc-btn" data-id="${r.id}" style="color: #0d9488; font-weight: 700; font-size: 13px; cursor: pointer; text-decoration: underline;">${escapeHtml(r.grn_number)}</span>
                <div style="font-size: 11px; color: #64748b; font-family: sans-serif; margin-top: 3px;">
                    ${r.received_date ? r.received_date.substring(0, 10) : ''}
                </div>
            </td>
            <td style="padding: 14px 16px;">
                <div style="font-weight: 600; color: #1e293b;">PO: ${escapeHtml(r.po_number || 'N/A')}</div>
                <div style="font-size: 11px; color: #64748b; font-family: monospace; margin-top: 2px;">DR: ${escapeHtml(r.delivery_receipt_no)}</div>
            </td>
            <td style="padding: 14px 16px;">
                <div style="font-weight: 600; color: #0f172a;">${escapeHtml(r.supplier_name || 'Generic Supplier')}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                    <i class="fas fa-truck" style="font-size: 10px;"></i> ${escapeHtml(r.carrier_courier || 'Hospital Van')} ${r.vehicle_plate_or_tracking ? `(${escapeHtml(r.vehicle_plate_or_tracking)})` : ''}
                </div>
            </td>
            <td style="padding: 14px 16px;">
                <div style="font-weight: 500; font-size: 12px; color: #334155; margin-bottom: 4px;">
                    <i class="fas fa-warehouse" style="color: #64748b;"></i> ${escapeHtml(r.receiving_bay || 'Main Dock')} &bull; <span style="color: #64748b;">${escapeHtml(r.received_by_name || 'Inspector')}</span>
                </div>
                <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                    ${condBadge}
                    ${isColdChain}
                    ${isSterile}
                </div>
            </td>
            <td style="padding: 14px 16px; text-align: center;">
                ${matchBadge}
            </td>
            <td style="padding: 14px 16px; text-align: right;">
                <div style="font-weight: 700; color: #047857;">${Number(r.accepted_qty || 0).toLocaleString()} <span style="font-size: 11px; font-weight: normal; color: #64748b;">acc</span></div>
                ${Number(r.rejected_qty || 0) > 0 ? `
                    <div style="font-size: 11px; color: #dc2626; font-weight: 600;">
                        <i class="fas fa-times-circle"></i> ${Number(r.rejected_qty).toLocaleString()} rej
                    </div>
                ` : `<div style="font-size: 11px; color: #10b981;">0 rejections</div>`}
            </td>
            <td style="padding: 14px 16px; text-align: right;">
                <div style="font-weight: 800; font-size: 14px; color: #0f172a;">
                    $${Number(r.accepted_total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                ${Number(r.variance_amount || 0) !== 0 ? `
                    <div style="font-size: 11px; color: #b91c1c; font-weight: 600;" title="Variance against PO Total ($${Number(r.po_total_amount || 0).toFixed(2)})">
                        Var: -$${Math.abs(Number(r.variance_amount)).toFixed(2)}
                    </div>
                ` : `<div style="font-size: 11px; color: #059669;">100% PO match</div>`}
            </td>
            <td style="padding: 14px 16px; text-align: center;">
                ${apBadge}
            </td>
            <td style="padding: 14px 16px; text-align: center;">
                <div style="display: flex; justify-content: center; gap: 6px;">
                    <button class="btn-action view-grn-doc-btn" data-id="${r.id}" title="View &amp; Print Formal GRN Document" style="background: #f0fdfa; color: #0d9488; border: 1px solid #ccfbf1; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
                        <i class="fas fa-file-invoice"></i> GRN Doc
                    </button>
                    <button class="btn-action open-ap-auth-btn" data-id="${r.id}" data-grn="${escapeHtml(r.grn_number)}" data-current="${r.ap_authorization_status}" title="Authorize Accounts Payable" style="background: #eff6ff; color: #2563eb; border: 1px solid #dbeafe; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
                        <i class="fas fa-check-double"></i> AP Auth
                    </button>
                    <button class="btn-action delete-grn-btn" data-id="${r.id}" data-grn="${escapeHtml(r.grn_number)}" title="Delete GRN" style="background: #fef2f2; color: #dc2626; border: 1px solid #fee2e2; padding: 6px 8px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

/**
 * TAB 2: 3-Way Match & Discrepancy Audits
 */
function renderThreeWayMatchTab() {
    const records = cache.grnData?.records || [];
    const flaggedRecords = records.filter(r => r.three_way_match_status !== 'matched_exact' || Number(r.variance_amount || 0) !== 0 || Number(r.rejected_qty || 0) > 0);

    return `
        <!-- Explanatory Header -->
        <div style="background: linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%); border: 1px solid #bae6fd; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <div style="display: flex; gap: 16px; align-items: flex-start;">
                <div style="background: #0284c7; color: #ffffff; width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;">
                    <i class="fas fa-scale-balanced"></i>
                </div>
                <div>
                    <h3 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 800; color: #0c4a6e;">Three-Way Matching Safeguard Principle</h3>
                    <p style="margin: 0 0 10px 0; font-size: 13px; color: #334155; line-height: 1.5;">
                        Accounts Payable (AP) disallows hospital fund disbursements until three separate documents are reconciled:
                        <br/>&bull; <strong>1. Purchase Order (PO):</strong> Authorized prices, clinical specifications, and agreed contracted quantities.
                        <br/>&bull; <strong>2. Vendor Delivery Receipt (DR):</strong> What the freight carrier shipped to the hospital loading dock.
                        <br/>&bull; <strong>3. Goods Receipt Note (GRN):</strong> What the hospital logistics inspector counted, temperature-verified, and passed for quality.
                    </p>
                    <div style="font-size: 12px; font-weight: 700; color: #0369a1;">
                        Rule: If GRN Accepted Qty &lt; PO Qty or items are damaged, payment is automatically capped to accepted goods and a Debit Memo is generated.
                    </div>
                </div>
            </div>
        </div>

        <div style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
            <h3 style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0;">
                Audited Discrepancies &amp; Exception Reconciliation (${flaggedRecords.length} Flagged)
            </h3>
        </div>

        ${flaggedRecords.length === 0 ? `
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 48px; text-align: center; color: #64748b;">
                <div style="width: 56px; height: 56px; border-radius: 28px; background: #dcfce7; color: #15803d; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; font-size: 24px;">
                    <i class="fas fa-check"></i>
                </div>
                <h4 style="margin: 0 0 6px 0; color: #0f172a; font-size: 16px;">Zero Reconciliation Variances Found</h4>
                <p style="margin: 0; font-size: 13px;">All processed goods receipt notes currently match PO quantities, prices, and sterile QC specifications perfectly.</p>
            </div>
        ` : `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 18px;">
                ${flaggedRecords.map(r => renderDiscrepancyCard(r)).join('')}
            </div>
        `}
    `;
}

/**
 * Render Discrepancy Card for 3-Way Match Tab
 */
function renderDiscrepancyCard(r) {
    const isQualityFailure = r.three_way_match_status === 'rejected_quality_failure';
    const isVariance = r.three_way_match_status === 'quantity_variance_flagged';
    const isPartial = r.three_way_match_status === 'partial_delivery_matched';

    let cardBorder = '#f59e0b';
    let cardBg = '#fffbeb';
    let headerText = 'Quantity Variance Flagged';
    let recAction = 'Hold payment difference. Request Vendor Credit / Debit Memo.';

    if (isQualityFailure) {
        cardBorder = '#ef4444';
        cardBg = '#fef2f2';
        headerText = 'Full Quality Failure / Quarantine';
        recAction = 'BLOCK AP PAYMENT. Return batch to supplier dock. Request full replacement.';
    } else if (isPartial) {
        cardBorder = '#3b82f6';
        cardBg = '#eff6ff';
        headerText = 'Partial Delivery / Split Order';
        recAction = 'Authorize AP payment for delivered fraction ($' + Number(r.accepted_total_amount).toFixed(2) + '). Retain balance for backorder.';
    }

    return `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); overflow: hidden; display: flex; flex-direction: column;">
            <div style="background: ${cardBg}; border-bottom: 1px solid ${cardBorder}; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <span style="font-family: monospace; font-weight: 800; font-size: 14px; color: #0f172a;">${escapeHtml(r.grn_number)}</span>
                    <span style="font-size: 12px; color: #64748b; margin-left: 8px;">PO: ${escapeHtml(r.po_number || 'N/A')}</span>
                </div>
                <span style="font-size: 11px; font-weight: 700; color: ${isQualityFailure ? '#991b1b' : (isPartial ? '#1e40af' : '#92400e')}; text-transform: uppercase;">
                    ${headerText}
                </span>
            </div>

            <div style="padding: 18px; flex: 1;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 14px; font-size: 13px;">
                    <div>
                        <div style="color: #64748b; font-size: 11px; text-transform: uppercase;">Vendor / Supplier</div>
                        <div style="font-weight: 700; color: #0f172a;">${escapeHtml(r.supplier_name || 'Generic Vendor')}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: #64748b; font-size: 11px; text-transform: uppercase;">Delivery Waybill</div>
                        <div style="font-weight: 600; font-family: monospace;">${escapeHtml(r.delivery_receipt_no)}</div>
                    </div>
                </div>

                <!-- 3-Way Grid -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 14px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; text-align: center;">
                    <div>
                        <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600;">1. PO Ordered</div>
                        <div style="font-size: 16px; font-weight: 800; color: #334155;">${Number(r.po_total_ordered_qty || 0).toLocaleString()}</div>
                        <div style="font-size: 11px; color: #64748b;">$${Number(r.po_total_amount || 0).toFixed(2)}</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600;">2. DR Shipped</div>
                        <div style="font-size: 16px; font-weight: 800; color: #334155;">${Number(r.delivery_receipt_qty || 0).toLocaleString()}</div>
                        <div style="font-size: 11px; color: #64748b;">Waybill Qty</div>
                    </div>
                    <div style="background: #ffffff; border-radius: 6px; padding: 4px; border: 1px solid #cbd5e1;">
                        <div style="font-size: 11px; color: #0d9488; text-transform: uppercase; font-weight: 700;">3. GRN Passed</div>
                        <div style="font-size: 16px; font-weight: 800; color: #0d9488;">${Number(r.accepted_qty || 0).toLocaleString()}</div>
                        <div style="font-size: 11px; color: #047857; font-weight: 600;">$${Number(r.accepted_total_amount || 0).toFixed(2)}</div>
                    </div>
                </div>

                <!-- Rejections summary -->
                <div style="font-size: 12px; margin-bottom: 12px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px; padding: 8px 12px; color: #9f1239;">
                    <strong>Dock Finding:</strong> ${Number(r.rejected_qty || 0)} units rejected / non-conforming.
                    <br/><span style="font-size: 11px;">Condition: ${escapeHtml(r.package_condition.replace(/_/g, ' '))} &bull; ${escapeHtml(r.qc_inspection_notes || 'Defective packaging detected.')}</span>
                </div>

                <!-- Recommended action -->
                <div style="font-size: 12px; color: #334155; margin-bottom: 14px;">
                    <span style="font-weight: 700; color: #0f172a;">Audit Recommendation:</span>
                    <div style="color: #475569; margin-top: 2px;">${recAction}</div>
                </div>
            </div>

            <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 12px 18px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    ${getApStatusBadge(r.ap_authorization_status)}
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="view-grn-doc-btn" data-id="${r.id}" style="background: #ffffff; color: #334155; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">
                        <i class="fas fa-file-invoice"></i> View GRN
                    </button>
                    <button class="open-ap-auth-btn" data-id="${r.id}" data-grn="${escapeHtml(r.grn_number)}" data-current="${r.ap_authorization_status}" style="background: #0d9488; color: #ffffff; border: none; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">
                        <i class="fas fa-check-double"></i> Authorize AP
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * TAB 3: Quality Control & Quarantine Log
 */
function renderQuarantineTab() {
    const records = cache.grnData?.records || [];
    const quarantinedItems = [];

    // Extract quarantined line items from GRN details
    records.forEach(r => {
        if (Number(r.rejected_qty || 0) > 0) {
            quarantinedItems.push({
                grn_number: r.grn_number,
                grn_id: r.id,
                supplier_name: r.supplier_name,
                po_number: r.po_number,
                received_date: r.received_date,
                rejected_qty: r.rejected_qty,
                package_condition: r.package_condition,
                notes: r.qc_inspection_notes
            });
        }
    });

    return `
        <!-- Quarantine Header -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div>
                    <h3 style="margin: 0 0 4px 0; font-size: 17px; font-weight: 800; color: #991b1b;">
                        <i class="fas fa-biohazard"></i> Non-Pharmaceutical Quarantine &amp; Rejection Log
                    </h3>
                    <p style="margin: 0; font-size: 13px; color: #64748b;">
                        Items failed on dock receipt due to moisture damage, crushed packaging, breached sterility envelopes, or cold chain excursion.
                    </p>
                </div>
                <div style="background: #fee2e2; color: #b91c1c; font-weight: 700; padding: 6px 14px; border-radius: 8px; font-size: 13px;">
                    ${cache.metrics?.total_rejected_units || 0} Total Quarantined Units
                </div>
            </div>
        </div>

        <!-- Quarantined Table -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                <thead>
                    <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 11px; text-transform: uppercase;">
                        <th style="padding: 12px 16px;">GRN &amp; Incident Date</th>
                        <th style="padding: 12px 16px;">Supplier &amp; PO</th>
                        <th style="padding: 12px 16px;">Physical Finding</th>
                        <th style="padding: 12px 16px; text-align: right;">Quarantined Qty</th>
                        <th style="padding: 12px 16px;">Inspector Quarantine Notes</th>
                        <th style="padding: 12px 16px; text-align: center;">Dock Quarantine Bin</th>
                        <th style="padding: 12px 16px; text-align: center;">Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${quarantinedItems.length === 0 ? `
                        <tr>
                            <td colspan="7" style="text-align: center; padding: 40px; color: #64748b;">
                                <i class="fas fa-shield-alt" style="font-size: 32px; color: #86efac; margin-bottom: 8px; display: block;"></i>
                                No quarantined supplies logged. All deliveries passed dock QC.
                            </td>
                        </tr>
                    ` : quarantinedItems.map(q => `
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 14px 16px; font-family: monospace; font-weight: 700; color: #b91c1c;">
                                ${escapeHtml(q.grn_number)}
                                <div style="font-size: 11px; color: #64748b; font-family: sans-serif; font-weight: normal; margin-top: 2px;">
                                    ${q.received_date ? q.received_date.substring(0, 10) : ''}
                                </div>
                            </td>
                            <td style="padding: 14px 16px;">
                                <div style="font-weight: 600; color: #0f172a;">${escapeHtml(q.supplier_name || 'Vendor')}</div>
                                <div style="font-size: 11px; color: #64748b;">PO: ${escapeHtml(q.po_number || 'N/A')}</div>
                            </td>
                            <td style="padding: 14px 16px;">
                                ${getConditionBadge(q.package_condition)}
                            </td>
                            <td style="padding: 14px 16px; text-align: right; font-weight: 800; color: #dc2626; font-size: 14px;">
                                ${Number(q.rejected_qty).toLocaleString()} pcs
                            </td>
                            <td style="padding: 14px 16px; color: #334155; font-size: 12px;">
                                ${escapeHtml(q.notes || 'Packaging breach / damaged cartons')}
                            </td>
                            <td style="padding: 14px 16px; text-align: center;">
                                <span style="background: #fee2e2; color: #991b1b; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; font-family: monospace;">
                                    <i class="fas fa-lock"></i> QUAR-BAY-01
                                </span>
                            </td>
                            <td style="padding: 14px 16px; text-align: center;">
                                <button class="view-grn-doc-btn" data-id="${q.grn_id}" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: 600;">
                                    <i class="fas fa-search"></i> Inspect
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Render Pagination
 */
function renderPagination() {
    const total = cache.grnData?.total || 0;
    const totalPages = Math.ceil(total / state.perPage) || 1;

    if (totalPages <= 1) return '';

    return `
        <div style="padding: 14px 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #ffffff;">
            <div style="font-size: 13px; color: #64748b;">
                Showing Page <strong>${state.page}</strong> of <strong>${totalPages}</strong> (${total} total GRNs)
            </div>
            <div style="display: flex; gap: 6px;">
                <button id="btnPrevPage" ${state.page <= 1 ? 'disabled' : ''} style="padding: 6px 12px; border: 1px solid #cbd5e1; background: ${state.page <= 1 ? '#f8fafc' : '#ffffff'}; color: ${state.page <= 1 ? '#94a3b8' : '#334155'}; border-radius: 6px; font-size: 12px; cursor: ${state.page <= 1 ? 'not-allowed' : 'pointer'};">
                    &laquo; Previous
                </button>
                <button id="btnNextPage" ${state.page >= totalPages ? 'disabled' : ''} style="padding: 6px 12px; border: 1px solid #cbd5e1; background: ${state.page >= totalPages ? '#f8fafc' : '#ffffff'}; color: ${state.page >= totalPages ? '#94a3b8' : '#334155'}; border-radius: 6px; font-size: 12px; cursor: ${state.page >= totalPages ? 'not-allowed' : 'pointer'};">
                    Next &raquo;
                </button>
            </div>
        </div>
    `;
}

/**
 * Bind UI Events
 */
function bindEvents() {
    document.addEventListener('click', async (e) => {
        // Tab switching
        const tabBtn = e.target.closest('.grn-tab-btn');
        if (tabBtn) {
            state.activeTab = tabBtn.dataset.tab;
            document.querySelectorAll('.grn-tab-btn').forEach(b => {
                b.classList.remove('active');
                b.style.color = '#64748b';
                b.style.borderBottomColor = 'transparent';
            });
            tabBtn.classList.add('active');
            tabBtn.style.color = '#0d9488';
            tabBtn.style.borderBottomColor = '#0d9488';
            renderApp();
            return;
        }

        // Open Create GRN Modal
        if (e.target.closest('#btnNewGRNModal')) {
            openCreateGRNModal();
            return;
        }

        // View Formal GRN Document
        const viewDocBtn = e.target.closest('.view-grn-doc-btn');
        if (viewDocBtn) {
            const id = viewDocBtn.dataset.id;
            openGRNDocumentModal(id);
            return;
        }

        // Open AP Authorization Modal
        const authBtn = e.target.closest('.open-ap-auth-btn');
        if (authBtn) {
            const id = authBtn.dataset.id;
            const grn = authBtn.dataset.grn;
            const current = authBtn.dataset.current;
            openApAuthModal(id, grn, current);
            return;
        }

        // Delete GRN
        const delBtn = e.target.closest('.delete-grn-btn');
        if (delBtn) {
            const id = delBtn.dataset.id;
            const grn = delBtn.dataset.grn;
            if (confirm(`Are you sure you want to delete Goods Receipt Note ${grn}? This will remove QC logs and items.`)) {
                await deleteGRN(id);
            }
            return;
        }

        // Close Modal
        if (e.target.closest('#btnCloseModal') || e.target.id === 'grnModalBackdrop') {
            closeModal();
            return;
        }

        // Pagination
        if (e.target.closest('#btnPrevPage') && state.page > 1) {
            state.page--;
            await loadInitialData();
            return;
        }
        if (e.target.closest('#btnNextPage')) {
            state.page++;
            await loadInitialData();
            return;
        }

        // Reset Filters
        if (e.target.closest('#btnResetGrnFilters')) {
            state.searchQuery = "";
            state.matchStatusFilter = "";
            state.apStatusFilter = "";
            state.conditionFilter = "";
            state.dateFilter = "";
            state.page = 1;
            const sInput = document.getElementById('grnSearchInput');
            if (sInput) sInput.value = "";
            await loadInitialData();
            return;
        }

        // Print Document Button inside Formal Modal
        if (e.target.closest('#btnPrintFormalGRN')) {
            printGRNDocument();
            return;
        }
    });

    // Filter Change Listeners
    document.addEventListener('change', async (e) => {
        if (e.target.id === 'grnMatchFilter') {
            state.matchStatusFilter = e.target.value;
            state.page = 1;
            await loadInitialData();
        } else if (e.target.id === 'grnApFilter') {
            state.apStatusFilter = e.target.value;
            state.page = 1;
            await loadInitialData();
        } else if (e.target.id === 'grnDateFilter') {
            state.dateFilter = e.target.value;
            state.page = 1;
            await loadInitialData();
        }
    });

    // Search Keyup
    document.addEventListener('keyup', async (e) => {
        if (e.target.id === 'grnSearchInput' && e.key === 'Enter') {
            state.searchQuery = e.target.value.trim();
            state.page = 1;
            await loadInitialData();
        }
    });
}

/**
 * Delete GRN
 */
async function deleteGRN(id) {
    try {
        await api('/goods-receipt/notes/delete', 'POST', { id });
        showToast("Goods receipt note deleted successfully.", "success");
        await loadInitialData();
    } catch (e) {
        showToast("Failed to delete GRN: " + e.message, "error");
    }
}

/**
 * Close Modal
 */
function closeModal() {
    const box = document.getElementById('grnModalContainer');
    if (box) box.innerHTML = '';
}

/**
 * MODAL 1: Create New Goods Receipt Note (GRN)
 */
function openCreateGRNModal() {
    const modalBox = document.getElementById('grnModalContainer');
    if (!modalBox) return;

    const suppliers = cache.metadata?.suppliers || [];
    const supplyItems = cache.metadata?.supply_items || [];

    const now = new Date();
    const todayStr = now.toISOString().substring(0, 10);

    modalBox.innerHTML = `
        <div id="grnModalBackdrop" style="position: fixed; inset: 0; background: rgba(15,23,42,0.65); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
            <div style="background: #ffffff; border-radius: 14px; width: 100%; max-width: 980px; max-height: 92vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
                
                <!-- Modal Header -->
                <div style="padding: 18px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: #ffffff; z-index: 10;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="background: #ccfbf1; color: #0f766e; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">Dock Inspection Form</span>
                            <span style="font-size: 13px; color: #64748b;">Subsystem 8: Procurement &amp; Receiving</span>
                        </div>
                        <h3 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 4px 0 0 0;">
                            Create Formal Goods Receipt Note (GRN)
                        </h3>
                    </div>
                    <button id="btnCloseModal" style="background: none; border: none; font-size: 24px; color: #64748b; cursor: pointer;">&times;</button>
                </div>

                <form id="grnCreateForm" style="padding: 24px;">
                    <!-- Dock Delivery Information -->
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin-bottom: 20px;">
                        <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-truck" style="color: #0d9488;"></i> 1. Delivery &amp; Supplier Documentation
                        </div>

                        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 14px; margin-bottom: 14px;">
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Vendor / Supplier *</label>
                                <select id="grnSupplierSelect" name="supplier_id" required style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #ffffff;">
                                    <option value="">Select Supplier...</option>
                                    ${suppliers.map(s => `<option value="${s.id}" data-name="${escapeHtml(s.name)}">${escapeHtml(s.name)} (${s.code || 'SUP'})</option>`).join('')}
                                </select>
                                <input type="hidden" id="grnSupplierName" name="supplier_name" value="" />
                            </div>
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Purchase Order (PO) #</label>
                                <input type="text" name="po_number" placeholder="e.g. PO-2026-0841" value="PO-2026-${Math.floor(1000 + Math.random() * 9000)}" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-family: monospace;" />
                            </div>
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Vendor Delivery Receipt (DR) # *</label>
                                <input type="text" name="delivery_receipt_no" required placeholder="e.g. DR-99412" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; font-family: monospace; font-weight: 700;" />
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 14px;">
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Logistics / Carrier</label>
                                <input type="text" name="carrier_courier" placeholder="e.g. DHL Express, Vendor Fleet" value="Direct Vendor Fleet" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                            </div>
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Vehicle Plate / Tracking</label>
                                <input type="text" name="vehicle_plate_or_tracking" placeholder="e.g. WXH-819" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                            </div>
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Receiving Dock Bay *</label>
                                <select name="receiving_bay" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #ffffff;">
                                    <option value="Bay 1 - Main Warehouse Dock">Bay 1 - Main Warehouse Dock</option>
                                    <option value="Bay 2 - Cold Storage Bay">Bay 2 - Cold Storage Bay</option>
                                    <option value="Bay 3 - Sterile Supply Central">Bay 3 - Sterile Supply Central</option>
                                    <option value="Bay 4 - Bulk Freight Receiving">Bay 4 - Bulk Freight Receiving</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Dock Inspector Name *</label>
                                <input type="text" name="received_by_name" required value="Nurse Supervisor / QA Inspector" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                            </div>
                        </div>
                    </div>

                    <!-- Quality Inspection & Sterility Audits -->
                    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin-bottom: 20px;">
                        <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-microscope" style="color: #0d9488;"></i> 2. Quality Control (QC) &amp; Sterility Inspection
                        </div>

                        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 14px; margin-bottom: 14px; align-items: center;">
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Package Outer Integrity *</label>
                                <select name="package_condition" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #ffffff;">
                                    <option value="intact_undamaged">Intact &amp; Undamaged (Factory Seals Sealed)</option>
                                    <option value="minor_outer_crush">Minor Outer Box Crush (Contents Intact)</option>
                                    <option value="severe_damage_open">Severe Damage / Torn Packaging (Rejected)</option>
                                    <option value="water_moisture_damage">Water / Moisture Damage (Rejected)</option>
                                    <option value="compromised_seals">Compromised / Broken Sterility Seals (Rejected)</option>
                                </select>
                            </div>
                            <div style="padding-top: 18px;">
                                <label style="font-size: 13px; font-weight: 600; color: #1e293b; display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                    <input type="checkbox" name="sterility_seal_inspected" value="1" checked style="width: 16px; height: 16px;" />
                                    Sterility Seals Verified
                                </label>
                            </div>
                            <div>
                                <label style="font-size: 13px; font-weight: 600; color: #1e293b; display: flex; align-items: center; gap: 8px; cursor: pointer; margin-bottom: 4px;">
                                    <input type="checkbox" id="chkColdChain" name="cold_chain_verified" value="1" style="width: 16px; height: 16px;" />
                                    Cold Chain Monitored
                                </label>
                                <input type="number" step="0.1" name="cold_chain_temp_celsius" placeholder="Temp °C" style="width: 100%; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px;" />
                            </div>
                        </div>

                        <div>
                            <label style="display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 4px;">Inspector Observations &amp; Quarantine Remarks</label>
                            <input type="text" name="qc_inspection_notes" placeholder="e.g. Clean delivery, tamper seals intact, sterile indicators verified" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                        </div>
                    </div>

                    <!-- Inspected Line Items Table -->
                    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <div style="font-size: 14px; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-boxes-stacked" style="color: #0d9488;"></i> 3. Line Items Receipt &amp; 3-Way Reconciliation
                            </div>
                            <button type="button" id="btnAddGrnItemRow" style="background: #f0fdfa; color: #0d9488; border: 1px solid #99f6e4; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">
                                <i class="fas fa-plus"></i> Add Item Row
                            </button>
                        </div>

                        <div style="overflow-x: auto;">
                            <table id="grnItemsTable" style="width: 100%; border-collapse: collapse; font-size: 12px;">
                                <thead>
                                    <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; text-transform: uppercase;">
                                        <th style="padding: 8px 10px; text-align: left; width: 28%;">Supply Item *</th>
                                        <th style="padding: 8px 10px; text-align: right; width: 10%;">PO Qty *</th>
                                        <th style="padding: 8px 10px; text-align: right; width: 10%;">DR Delivered *</th>
                                        <th style="padding: 8px 10px; text-align: right; width: 10%;">Accepted *</th>
                                        <th style="padding: 8px 10px; text-align: right; width: 9%;">Rejected</th>
                                        <th style="padding: 8px 10px; text-align: left; width: 15%;">Rejection Reason</th>
                                        <th style="padding: 8px 10px; text-align: left; width: 13%;">Lot / Batch #</th>
                                        <th style="padding: 8px 10px; text-align: center; width: 5%;">Del</th>
                                    </tr>
                                </thead>
                                <tbody id="grnItemsTbody">
                                    <!-- Dynamic rows inserted here -->
                                </tbody>
                            </table>
                        </div>

                        <!-- Live Summary Box -->
                        <div id="grnMatchPreviewBox" style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin-top: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                            <div>
                                <span style="font-size: 11px; text-transform: uppercase; color: #166534; font-weight: 700;">Live 3-Way Match Preview</span>
                                <div id="grnMatchStatusText" style="font-weight: 800; font-size: 14px; color: #15803d;">Exact 3-Way Match (Ready for AP)</div>
                            </div>
                            <div style="display: flex; gap: 20px; font-size: 13px;">
                                <div>Total PO: <strong id="grnPreviewPoTotal">$0.00</strong></div>
                                <div>Accepted Value: <strong id="grnPreviewAccTotal" style="color: #047857;">$0.00</strong></div>
                                <div>Rejected Variance: <strong id="grnPreviewVarTotal" style="color: #dc2626;">$0.00</strong></div>
                            </div>
                        </div>
                    </div>

                    <!-- Footer Actions -->
                    <div style="display: flex; justify-content: flex-end; gap: 12px;">
                        <button type="button" id="btnCloseModalBtn" style="padding: 10px 18px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">
                            Cancel
                        </button>
                        <button type="submit" id="btnSaveGRN" style="padding: 10px 22px; background: #0d9488; color: #ffffff; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 4px rgba(13,148,136,0.3);">
                            <i class="fas fa-check"></i> Sign &amp; Authorize Goods Receipt
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Hook up Supplier change to update hidden input
    const supSelect = document.getElementById('grnSupplierSelect');
    if (supSelect) {
        supSelect.addEventListener('change', () => {
            const opt = supSelect.options[supSelect.selectedIndex];
            document.getElementById('grnSupplierName').value = opt ? opt.dataset.name : '';
        });
    }

    // Add initial item rows
    addGrnItemRow();

    // Hook up Add Row Button
    document.getElementById('btnAddGrnItemRow')?.addEventListener('click', () => {
        addGrnItemRow();
    });

    // Form submission
    document.getElementById('grnCreateForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitGRNForm();
    });

    document.getElementById('btnCloseModalBtn')?.addEventListener('click', closeModal);
}

/**
 * Add Line Item Row into Create GRN Modal
 */
let grnRowIndex = 0;
function addGrnItemRow(defaultItem = null) {
    const tbody = document.getElementById('grnItemsTbody');
    if (!tbody) return;

    grnRowIndex++;
    const idx = grnRowIndex;
    const supplyItems = cache.metadata?.supply_items || [];

    const tr = document.createElement('tr');
    tr.id = `grnRow_${idx}`;
    tr.style.borderBottom = "1px solid #f1f5f9";

    tr.innerHTML = `
        <td style="padding: 8px 10px;">
            <select class="item-select" data-idx="${idx}" required style="width: 100%; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; background: #ffffff;">
                <option value="">Select Item from Catalog...</option>
                ${supplyItems.map(it => `
                    <option value="${it.id}" data-code="${escapeHtml(it.item_code)}" data-name="${escapeHtml(it.item_name)}" data-unit="${escapeHtml(it.unit_of_measure)}" data-cost="${it.standard_cost}">
                        ${escapeHtml(it.item_code)} - ${escapeHtml(it.item_name)} (${it.unit_of_measure})
                    </option>
                `).join('')}
                <option value="custom">-- Custom Unlisted Item --</option>
            </select>
            <input type="hidden" name="items[${idx}][supply_item_id]" class="row-supply-id" value="" />
            <input type="hidden" name="items[${idx}][item_code]" class="row-item-code" value="" />
            <input type="hidden" name="items[${idx}][item_description]" class="row-item-desc" value="" />
            <input type="hidden" name="items[${idx}][unit_of_measure]" class="row-unit" value="box" />
            <input type="hidden" name="items[${idx}][po_unit_price]" class="row-unit-cost" value="1.00" />
            <input type="hidden" name="items[${idx}][storage_location_bin]" class="row-bin" value="BIN-DOCK-01" />
        </td>
        <td style="padding: 8px 10px;">
            <input type="number" min="1" required name="items[${idx}][po_ordered_qty]" class="calc-field row-po-qty" value="50" style="width: 100%; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; text-align: right;" />
        </td>
        <td style="padding: 8px 10px;">
            <input type="number" min="0" required name="items[${idx}][delivery_receipt_qty]" class="calc-field row-dr-qty" value="50" style="width: 100%; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; text-align: right;" />
        </td>
        <td style="padding: 8px 10px;">
            <input type="number" min="0" required name="items[${idx}][accepted_qty]" class="calc-field row-acc-qty" value="50" style="width: 100%; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; text-align: right; font-weight: 700; color: #047857;" />
        </td>
        <td style="padding: 8px 10px;">
            <input type="number" min="0" name="items[${idx}][rejected_qty]" class="calc-field row-rej-qty" value="0" style="width: 100%; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; text-align: right; color: #dc2626;" />
        </td>
        <td style="padding: 8px 10px;">
            <select name="items[${idx}][rejection_reason]" style="width: 100%; padding: 6px 6px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 11px; background: #ffffff;">
                <option value="none">None (Accepted)</option>
                <option value="crushed_packaging">Crushed Packaging</option>
                <option value="broken_sterility_seal">Broken Sterility Seal</option>
                <option value="short_dated_near_expiry">Short Dated (&lt;12m)</option>
                <option value="wrong_item_specification">Wrong Item Spec</option>
                <option value="temperature_excursion">Temp Excursion</option>
                <option value="shortage_missing_quantity">Shortage / Missing</option>
            </select>
        </td>
        <td style="padding: 8px 10px;">
            <input type="text" name="items[${idx}][batch_lot_number]" placeholder="LOT-9921" value="LOT-2026-${Math.floor(100 + Math.random() * 900)}" style="width: 100%; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 11px; font-family: monospace;" />
        </td>
        <td style="padding: 8px 10px; text-align: center;">
            <button type="button" class="btn-del-row" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 14px;">&times;</button>
        </td>
    `;

    tbody.appendChild(tr);

    // Bind item select change
    const sel = tr.querySelector('.item-select');
    sel.addEventListener('change', () => {
        const opt = sel.options[sel.selectedIndex];
        if (opt && opt.value && opt.value !== 'custom') {
            tr.querySelector('.row-supply-id').value = opt.value;
            tr.querySelector('.row-item-code').value = opt.dataset.code;
            tr.querySelector('.row-item-desc').value = opt.dataset.name;
            tr.querySelector('.row-unit').value = opt.dataset.unit;
            tr.querySelector('.row-unit-cost').value = opt.dataset.cost;
        } else if (opt.value === 'custom') {
            const desc = prompt("Enter Custom Supply Item Name:");
            if (desc) {
                tr.querySelector('.row-item-desc').value = desc;
                tr.querySelector('.row-item-code').value = 'MED-CUST';
            }
        }
        recalculateMatchPreview();
    });

    // Auto-calculate rejection on DR or Accepted changes
    const drInput = tr.querySelector('.row-dr-qty');
    const accInput = tr.querySelector('.row-acc-qty');
    const rejInput = tr.querySelector('.row-rej-qty');

    drInput.addEventListener('input', () => {
        const dr = Number(drInput.value) || 0;
        accInput.value = dr;
        rejInput.value = 0;
        recalculateMatchPreview();
    });

    accInput.addEventListener('input', () => {
        const dr = Number(drInput.value) || 0;
        const acc = Number(accInput.value) || 0;
        rejInput.value = Math.max(0, dr - acc);
        recalculateMatchPreview();
    });

    rejInput.addEventListener('input', () => {
        const dr = Number(drInput.value) || 0;
        const rej = Number(rejInput.value) || 0;
        accInput.value = Math.max(0, dr - rej);
        recalculateMatchPreview();
    });

    // Delete row
    tr.querySelector('.btn-del-row').addEventListener('click', () => {
        if (tbody.children.length > 1) {
            tr.remove();
            recalculateMatchPreview();
        } else {
            alert("A goods receipt note must inspect at least one line item.");
        }
    });

    // Pre-select first item if available
    if (supplyItems.length > 0 && !defaultItem) {
        sel.selectedIndex = 1;
        sel.dispatchEvent(new Event('change'));
    }

    recalculateMatchPreview();
}

/**
 * Recalculate Live 3-Way Match Preview
 */
function recalculateMatchPreview() {
    const rows = document.querySelectorAll('#grnItemsTbody tr');
    let totalPo = 0;
    let totalAcc = 0;
    let totalRej = 0;
    let hasVariance = false;
    let hasRejection = false;

    rows.forEach(tr => {
        const cost = Number(tr.querySelector('.row-unit-cost')?.value) || 1.00;
        const poQty = Number(tr.querySelector('.row-po-qty')?.value) || 0;
        const drQty = Number(tr.querySelector('.row-dr-qty')?.value) || 0;
        const accQty = Number(tr.querySelector('.row-acc-qty')?.value) || 0;
        const rejQty = Number(tr.querySelector('.row-rej-qty')?.value) || 0;

        totalPo += poQty * cost;
        totalAcc += accQty * cost;
        totalRej += rejQty * cost;

        if (poQty !== accQty) hasVariance = true;
        if (rejQty > 0) hasRejection = true;
    });

    const poEl = document.getElementById('grnPreviewPoTotal');
    const accEl = document.getElementById('grnPreviewAccTotal');
    const varEl = document.getElementById('grnPreviewVarTotal');
    const statusTextEl = document.getElementById('grnMatchStatusText');
    const previewBox = document.getElementById('grnMatchPreviewBox');

    if (poEl) poEl.textContent = `$${totalPo.toFixed(2)}`;
    if (accEl) accEl.textContent = `$${totalAcc.toFixed(2)}`;
    if (varEl) varEl.textContent = `-$${totalRej.toFixed(2)}`;

    if (statusTextEl && previewBox) {
        if (totalAcc === 0 && totalRej > 0) {
            statusTextEl.textContent = "Full Quality Rejection (Payment Blocked)";
            statusTextEl.style.color = "#b91c1c";
            previewBox.style.background = "#fef2f2";
            previewBox.style.borderColor = "#fecdd3";
        } else if (hasRejection) {
            statusTextEl.textContent = "Quantity Variance Flagged (Debit Memo Required for Damaged Goods)";
            statusTextEl.style.color = "#b45309";
            previewBox.style.background = "#fffbeb";
            previewBox.style.borderColor = "#fde68a";
        } else if (hasVariance) {
            statusTextEl.textContent = "Partial Delivery Matched (AP Authorized Net of Backorder)";
            statusTextEl.style.color = "#1d4ed8";
            previewBox.style.background = "#eff6ff";
            previewBox.style.borderColor = "#bfdbfe";
        } else {
            statusTextEl.textContent = "Exact 3-Way Match 100% (Instant AP Authorization Release)";
            statusTextEl.style.color = "#15803d";
            previewBox.style.background = "#f0fdf4";
            previewBox.style.borderColor = "#bbf7d0";
        }
    }
}

/**
 * Submit GRN Form
 */
async function submitGRNForm() {
    const form = document.getElementById('grnCreateForm');
    if (!form) return;

    const formData = new FormData(form);
    const payload = {
        supplier_id: formData.get('supplier_id'),
        supplier_name: formData.get('supplier_name'),
        po_number: formData.get('po_number'),
        delivery_receipt_no: formData.get('delivery_receipt_no'),
        carrier_courier: formData.get('carrier_courier'),
        vehicle_plate_or_tracking: formData.get('vehicle_plate_or_tracking'),
        receiving_bay: formData.get('receiving_bay'),
        received_by_name: formData.get('received_by_name'),
        package_condition: formData.get('package_condition'),
        sterility_seal_inspected: formData.get('sterility_seal_inspected') ? 1 : 0,
        cold_chain_verified: formData.get('cold_chain_verified') ? 1 : 0,
        cold_chain_temp_celsius: formData.get('cold_chain_temp_celsius') || null,
        qc_inspection_notes: formData.get('qc_inspection_notes'),
        items: []
    };

    // Gather items
    const rows = document.querySelectorAll('#grnItemsTbody tr');
    rows.forEach(tr => {
        const supplyId = tr.querySelector('.row-supply-id')?.value;
        const itemCode = tr.querySelector('.row-item-code')?.value;
        const itemDesc = tr.querySelector('.row-item-desc')?.value;
        const unit = tr.querySelector('.row-unit')?.value || 'box';
        const cost = Number(tr.querySelector('.row-unit-cost')?.value) || 1.0;
        const poQty = Number(tr.querySelector('.row-po-qty')?.value) || 0;
        const drQty = Number(tr.querySelector('.row-dr-qty')?.value) || 0;
        const accQty = Number(tr.querySelector('.row-acc-qty')?.value) || 0;
        const rejQty = Number(tr.querySelector('.row-rej-qty')?.value) || 0;
        const reason = tr.querySelector('select[name*="[rejection_reason]"]')?.value || 'none';
        const lot = tr.querySelector('input[name*="[batch_lot_number]"]')?.value || '';
        const bin = tr.querySelector('.row-bin')?.value || 'BIN-DOCK-01';

        payload.items.push({
            supply_item_id: supplyId ? parseInt(supplyId) : null,
            item_code: itemCode || 'MED-ITEM',
            item_description: itemDesc || 'Medical Supply',
            unit_of_measure: unit,
            po_unit_price: cost,
            po_ordered_qty: poQty,
            delivery_receipt_qty: drQty,
            accepted_qty: accQty,
            rejected_qty: rejQty,
            rejection_reason: reason,
            batch_lot_number: lot,
            storage_location_bin: bin
        });
    });

    try {
        const res = await api('/goods-receipt/notes', 'POST', payload);
        showToast("Goods Receipt Note successfully generated and verified!", "success");
        closeModal();
        await loadInitialData();

        // Optionally open the formal print modal for the newly created GRN
        if (res?.data?.grn?.id) {
            openGRNDocumentModal(res.data.grn.id);
        }
    } catch (e) {
        showToast("Error creating GRN: " + e.message, "error");
    }
}

/**
 * MODAL 2: Formal Printable GRN Document
 */
async function openGRNDocumentModal(id) {
    let grn = null;
    let items = [];

    try {
        const res = await api(`/goods-receipt/notes/show?id=${id}`);
        grn = res?.data?.grn;
        items = res?.data?.items || [];
    } catch (e) {
        showToast("Failed to fetch GRN document: " + e.message, "error");
        return;
    }

    if (!grn) return;

    const modalBox = document.getElementById('grnModalContainer');
    if (!modalBox) return;

    modalBox.innerHTML = `
        <div id="grnModalBackdrop" style="position: fixed; inset: 0; background: rgba(15,23,42,0.65); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
            <div style="background: #ffffff; border-radius: 12px; width: 100%; max-width: 900px; max-height: 94vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.3);">
                
                <!-- Toolbar Header -->
                <div style="padding: 14px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border-top-left-radius: 12px; border-top-right-radius: 12px;">
                    <span style="font-size: 13px; font-weight: 700; color: #475569;">Formal Document Preview</span>
                    <div style="display: flex; gap: 8px;">
                        <button id="btnPrintFormalGRN" style="background: #0d9488; color: #ffffff; border: none; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-print"></i> Print Formal GRN
                        </button>
                        <button id="btnCloseModal" style="background: #ffffff; color: #64748b; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;">
                            Close
                        </button>
                    </div>
                </div>

                <!-- Official Printable Paper -->
                <div id="printableGrnArea" style="padding: 36px 40px; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    
                    <!-- Hospital Header -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px;">
                        <div>
                            <div style="font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: #0f172a;">USINTELLIX HOSPITAL SYSTEM</div>
                            <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-top: 2px;">Central Supply Chain &amp; Logistics Receiving Terminal</div>
                            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Accredited Healthcare Consumables Quarantine &amp; Receiving</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 18px; font-weight: 800; color: #0d9488; font-family: monospace;">${escapeHtml(grn.grn_number)}</div>
                            <div style="font-size: 12px; color: #475569; margin-top: 3px;">Date: <strong>${grn.received_date ? grn.received_date.substring(0, 16) : ''}</strong></div>
                            <div style="margin-top: 4px;">${getMatchStatusBadge(grn.three_way_match_status)}</div>
                        </div>
                    </div>

                    <!-- Meta Details Grid -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 12px;">
                        <div>
                            <div style="color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Supplier &amp; PO Reference</div>
                            <div style="font-size: 14px; font-weight: 800; color: #0f172a;">${escapeHtml(grn.supplier_name || 'Vendor')}</div>
                            <div style="margin-top: 4px;">Purchase Order: <strong>${escapeHtml(grn.po_number || 'N/A')}</strong></div>
                            <div>Delivery Receipt / Waybill: <strong style="font-family: monospace;">${escapeHtml(grn.delivery_receipt_no)}</strong></div>
                            <div>Carrier: ${escapeHtml(grn.carrier_courier || 'Direct Delivery')} (${escapeHtml(grn.vehicle_plate_or_tracking || 'N/A')})</div>
                        </div>
                        <div>
                            <div style="color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Dock Quality Inspection</div>
                            <div>Receiving Bay: <strong>${escapeHtml(grn.receiving_bay || 'Main Dock')}</strong></div>
                            <div>QC Inspector: <strong>${escapeHtml(grn.received_by_name || 'Quality Officer')}</strong></div>
                            <div>Outer Package Finding: <strong>${escapeHtml(grn.package_condition.replace(/_/g, ' '))}</strong></div>
                            <div>Cold Chain Verification: <strong>${grn.cold_chain_verified ? `PASSED (${grn.cold_chain_temp_celsius || '4'}°C)` : 'N/A - Ambient Goods'}</strong></div>
                            <div>Sterility Barrier Integrity: <strong>${grn.sterility_seal_inspected ? 'VERIFIED SEALED' : 'Not Required'}</strong></div>
                        </div>
                    </div>

                    <!-- Itemized Breakdown -->
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
                        <thead>
                            <tr style="background: #0f172a; color: #ffffff; text-transform: uppercase; font-size: 11px;">
                                <th style="padding: 8px 10px; text-align: left;">Item Code &amp; Description</th>
                                <th style="padding: 8px 10px; text-align: center;">Lot #</th>
                                <th style="padding: 8px 10px; text-align: right;">PO Qty</th>
                                <th style="padding: 8px 10px; text-align: right;">Delivered</th>
                                <th style="padding: 8px 10px; text-align: right;">Accepted</th>
                                <th style="padding: 8px 10px; text-align: right;">Rejected</th>
                                <th style="padding: 8px 10px; text-align: right;">Unit Cost</th>
                                <th style="padding: 8px 10px; text-align: right;">Accepted Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(it => `
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                    <td style="padding: 8px 10px;">
                                        <div style="font-weight: 700; color: #0f172a;">${escapeHtml(it.item_description)}</div>
                                        <div style="font-size: 11px; color: #64748b; font-family: monospace;">${escapeHtml(it.item_code)} &bull; ${escapeHtml(it.unit_of_measure)}</div>
                                    </td>
                                    <td style="padding: 8px 10px; text-align: center; font-family: monospace;">${escapeHtml(it.batch_lot_number || 'N/A')}</td>
                                    <td style="padding: 8px 10px; text-align: right;">${Number(it.po_ordered_qty).toLocaleString()}</td>
                                    <td style="padding: 8px 10px; text-align: right;">${Number(it.delivery_receipt_qty).toLocaleString()}</td>
                                    <td style="padding: 8px 10px; text-align: right; font-weight: 700; color: #047857;">${Number(it.accepted_qty).toLocaleString()}</td>
                                    <td style="padding: 8px 10px; text-align: right; color: ${Number(it.rejected_qty) > 0 ? '#dc2626' : '#94a3b8'}; font-weight: 700;">
                                        ${Number(it.rejected_qty).toLocaleString()}
                                    </td>
                                    <td style="padding: 8px 10px; text-align: right;">$${Number(it.po_unit_price).toFixed(2)}</td>
                                    <td style="padding: 8px 10px; text-align: right; font-weight: 800;">$${Number(it.accepted_total_amount).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr style="border-top: 2px solid #0f172a; font-size: 13px;">
                                <td colspan="6" style="padding: 10px; text-align: right; font-weight: 700;">Authorized Procurement Value (Net of Damages):</td>
                                <td colspan="2" style="padding: 10px; text-align: right; font-weight: 900; font-size: 16px; color: #0d9488;">
                                    $${Number(grn.accepted_total_amount).toFixed(2)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>

                    <!-- 3-Way Match & AP Resolution Statement -->
                    <div style="background: #f1f5f9; border-radius: 8px; padding: 14px 18px; margin-bottom: 28px; font-size: 12px; color: #334155;">
                        <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px; display: flex; justify-content: space-between;">
                            <span>3-Way Matching &amp; Accounts Payable Authorization Certificate</span>
                            <span>AP Status: <strong>${escapeHtml(grn.ap_authorization_status.toUpperCase().replace(/_/g, ' '))}</strong></span>
                        </div>
                        <div>
                            This document certifies that physical count and medical-surgical quality inspection have been concluded.
                            ${Number(grn.variance_amount || 0) !== 0 ? `
                                A variance of <strong>-$${Math.abs(Number(grn.variance_amount)).toFixed(2)}</strong> has been flagged against Purchase Order ${escapeHtml(grn.po_number)}. Debit Memo is required prior to invoice settlement.
                            ` : `
                                100% concordance achieved across PO, Delivery Receipt, and GRN. Full invoice authorization approved.
                            `}
                        </div>
                    </div>

                    <!-- Sign-off Signatures Grid -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; margin-top: 36px; padding-top: 20px; font-size: 12px;">
                        <div style="text-align: center; border-top: 1px solid #94a3b8; padding-top: 8px;">
                            <div style="font-weight: 700; color: #0f172a;">${escapeHtml(grn.received_by_name || 'Receiving Officer')}</div>
                            <div style="color: #64748b; font-size: 11px;">Receiving QC Inspector</div>
                        </div>
                        <div style="text-align: center; border-top: 1px solid #94a3b8; padding-top: 8px;">
                            <div style="font-weight: 700; color: #0f172a;">${escapeHtml(grn.carrier_courier || 'Freight Driver')}</div>
                            <div style="color: #64748b; font-size: 11px;">Vendor Freight Carrier / Driver</div>
                        </div>
                        <div style="text-align: center; border-top: 1px solid #94a3b8; padding-top: 8px;">
                            <div style="font-weight: 700; color: #0f172a;">${escapeHtml(grn.ap_authorized_by || 'AP Finance Director')}</div>
                            <div style="color: #64748b; font-size: 11px;">Accounts Payable Auditor</div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    `;
}

/**
 * Print Formal GRN Document
 */
function printGRNDocument() {
    const area = document.getElementById('printableGrnArea');
    if (!area) return;

    const win = window.open('', '_blank', 'width=900,height=800');
    win.document.write(`
        <html>
            <head>
                <title>Goods Receipt Note (GRN)</title>
                <style>
                    body { margin: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border-bottom: 1px solid #e2e8f0; }
                    @media print {
                        body { margin: 0; }
                    }
                </style>
            </head>
            <body>
                ${area.innerHTML}
            </body>
        </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
        win.print();
    }, 250);
}

/**
 * MODAL 3: Accounts Payable (AP) Authorization Modal
 */
function openApAuthModal(id, grnNumber, currentStatus) {
    const modalBox = document.getElementById('grnModalContainer');
    if (!modalBox) return;

    modalBox.innerHTML = `
        <div id="grnModalBackdrop" style="position: fixed; inset: 0; background: rgba(15,23,42,0.65); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
            <div style="background: #ffffff; border-radius: 12px; width: 100%; max-width: 520px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
                
                <div style="padding: 18px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="font-size: 17px; font-weight: 800; color: #0f172a; margin: 0;">
                        Accounts Payable Authorization
                    </h3>
                    <button id="btnCloseModal" style="background: none; border: none; font-size: 20px; color: #64748b; cursor: pointer;">&times;</button>
                </div>

                <form id="apAuthForm" style="padding: 24px;">
                    <input type="hidden" name="id" value="${id}" />
                    
                    <div style="margin-bottom: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
                        <div style="font-size: 12px; color: #64748b;">Target Goods Receipt Note</div>
                        <div style="font-size: 15px; font-weight: 800; color: #0d9488; font-family: monospace;">${escapeHtml(grnNumber)}</div>
                    </div>

                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">
                            Payment Authorization Status *
                        </label>
                        <select name="ap_authorization_status" required style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: #ffffff;">
                            <option value="authorized_for_payment" ${currentStatus === 'authorized_for_payment' ? 'selected' : ''}>Authorized for Payment (Full Settlement)</option>
                            <option value="partially_authorized" ${currentStatus === 'partially_authorized' ? 'selected' : ''}>Partially Authorized (Net of Debit Memo)</option>
                            <option value="payment_hold_variance" ${currentStatus === 'payment_hold_variance' ? 'selected' : ''}>Payment on Hold (Awaiting Audit Reconciliation)</option>
                            <option value="payment_blocked_rejected" ${currentStatus === 'payment_blocked_rejected' ? 'selected' : ''}>Payment Blocked (Total Quality Rejection)</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">
                            Authorized By Officer Name *
                        </label>
                        <input type="text" name="authorized_by" required value="Finance Officer / AP Director" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" />
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px;">
                            Authorization Notes &amp; Debit Memo Reference
                        </label>
                        <textarea name="notes" rows="3" placeholder="e.g. 3-way match verified against PO and receiving QC checklist. Approved for disbursement." style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;"></textarea>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 10px;">
                        <button type="button" id="btnCloseApModal" style="padding: 8px 16px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; cursor: pointer;">
                            Cancel
                        </button>
                        <button type="submit" style="padding: 8px 18px; background: #2563eb; color: #ffffff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">
                            Confirm AP Status
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('btnCloseApModal')?.addEventListener('click', closeModal);

    document.getElementById('apAuthForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        try {
            await api('/goods-receipt/authorize-ap', 'POST', {
                id: f.get('id'),
                ap_authorization_status: f.get('ap_authorization_status'),
                authorized_by: f.get('authorized_by'),
                notes: f.get('notes')
            });
            showToast("Accounts payable authorization updated.", "success");
            closeModal();
            await loadInitialData();
        } catch (err) {
            showToast("Failed to update AP status: " + err.message, "error");
        }
    });
}

/**
 * Helper: 3-Way Match Badge
 */
function getMatchStatusBadge(status) {
    switch (status) {
        case 'matched_exact':
            return `<span style="background: #dcfce7; color: #15803d; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-check-circle"></i> Exact Match</span>`;
        case 'partial_delivery_matched':
            return `<span style="background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-boxes"></i> Partial Delivery</span>`;
        case 'quantity_variance_flagged':
            return `<span style="background: #fef3c7; color: #b45309; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-exclamation-circle"></i> Variance Flagged</span>`;
        case 'price_variance_flagged':
            return `<span style="background: #ffedd5; color: #c2410c; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-tag"></i> Price Variance</span>`;
        case 'rejected_quality_failure':
            return `<span style="background: #fee2e2; color: #b91c1c; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-times-circle"></i> Quality Rejected</span>`;
        default:
            return `<span style="background: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;">${escapeHtml(status || 'Unknown')}</span>`;
    }
}

/**
 * Helper: AP Status Badge
 */
function getApStatusBadge(status) {
    switch (status) {
        case 'authorized_for_payment':
            return `<span style="background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-check-double"></i> AP Authorized</span>`;
        case 'partially_authorized':
            return `<span style="background: #f0fdfa; color: #0f766e; border: 1px solid #99f6e4; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-file-invoice-dollar"></i> Net Debit Memo</span>`;
        case 'payment_hold_variance':
            return `<span style="background: #fefce8; color: #854d0e; border: 1px solid #fef08a; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-pause-circle"></i> On AP Hold</span>`;
        case 'payment_blocked_rejected':
            return `<span style="background: #fef2f2; color: #991b1b; border: 1px solid #fecdd3; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;"><i class="fas fa-ban"></i> Payment Blocked</span>`;
        default:
            return `<span style="background: #f8fafc; color: #64748b; padding: 4px 10px; border-radius: 6px; font-size: 11px;">Pending</span>`;
    }
}

/**
 * Helper: Package Condition Badge
 */
function getConditionBadge(cond) {
    switch (cond) {
        case 'intact_undamaged':
            return `<span style="background: #f0fdf4; color: #166534; font-size: 11px; padding: 2px 6px; border-radius: 4px; font-weight: 600;"><i class="fas fa-box"></i> Intact</span>`;
        case 'minor_outer_crush':
            return `<span style="background: #fffbeb; color: #92400e; font-size: 11px; padding: 2px 6px; border-radius: 4px; font-weight: 600;"><i class="fas fa-box-open"></i> Minor Crush</span>`;
        case 'severe_damage_open':
            return `<span style="background: #fef2f2; color: #991b1b; font-size: 11px; padding: 2px 6px; border-radius: 4px; font-weight: 700;"><i class="fas fa-heart-crack"></i> Severe Damage</span>`;
        case 'water_moisture_damage':
            return `<span style="background: #eff6ff; color: #1e40af; font-size: 11px; padding: 2px 6px; border-radius: 4px; font-weight: 700;"><i class="fas fa-droplet"></i> Moisture Breach</span>`;
        case 'compromised_seals':
            return `<span style="background: #fff1f2; color: #be123c; font-size: 11px; padding: 2px 6px; border-radius: 4px; font-weight: 700;"><i class="fas fa-ban"></i> Broken Seals</span>`;
        default:
            return `<span style="background: #f1f5f9; color: #475569; font-size: 11px; padding: 2px 6px; border-radius: 4px;">Inspected</span>`;
    }
}

/**
 * Helper: Show UI Toast
 */
function showToast(message, type = 'info') {
    const area = document.getElementById('grnNotificationArea');
    if (!area) return;

    const bg = type === 'success' ? '#10b981' : (type === 'error' ? '#ef4444' : '#0284c7');
    const toast = document.createElement('div');
    toast.style.cssText = `
        background: ${bg};
        color: #ffffff;
        padding: 12px 18px;
        border-radius: 8px;
        margin-bottom: 12px;
        font-size: 13px;
        font-weight: 600;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: opacity 0.3s;
    `;
    toast.innerHTML = `
        <span>${escapeHtml(message)}</span>
        <button style="background: none; border: none; color: #ffffff; font-size: 16px; cursor: pointer; margin-left: 12px;">&times;</button>
    `;

    toast.querySelector('button').addEventListener('click', () => toast.remove());
    area.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4500);
}

/**
 * Helper: HTML Escaping
 */
function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
