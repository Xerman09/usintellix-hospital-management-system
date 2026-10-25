import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cur = (v) => "$" + Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

let state = {
    view: "tariffs", // "tariffs" | "packages" | "calculator"
    categoryFilter: "all",
    searchQuery: "",
    page: 1,
    perPage: 15,
    selectedTariffId: null,
    calcState: {
        tariffId: null,
        isEmergency: false,
        isNight: false,
        isHoliday: false,
        quantity: 1,
        result: null
    }
};

let cache = {
    tariffsData: null,
    summary: null,
    packagesList: null,
    departments: []
};

export function TariffMasterView() {
    return `<div class="tm-root" id="tariffMasterRoot"><div class="tm-loading">Loading Hospital Master Tariff Book…</div></div>`;
}

export async function initTariffMaster() {
    ensureCss();
    await loadData();
}

async function loadData() {
    const root = document.getElementById("tariffMasterRoot");
    if (!root) return;

    try {
        const [sumRes, tarRes, pkgRes] = await Promise.all([
            api("/tariffs/summary").catch(() => null),
            api(`/tariffs?page=${state.page}&per_page=${state.perPage}&category=${state.categoryFilter}&q=${encodeURIComponent(state.searchQuery)}`).catch(() => null),
            api("/tariffs/packages").catch(() => null)
        ]);

        cache.summary = sumRes?.data || {};
        cache.tariffsData = tarRes?.data || { data: [], total: 0 };
        cache.packagesList = pkgRes?.data || [];

        renderView(root);
    } catch (e) {
        console.error("Tariff Master loading error:", e);
        root.innerHTML = `<div class="tm-error">Error connecting to Tariff Master server: ${esc(e.message)}</div>`;
    }
}

function renderView(root) {
    const s = cache.summary || {};
    const tariffs = cache.tariffsData?.data || [];
    const totalTariffs = cache.tariffsData?.total || 0;
    const totalPages = cache.tariffsData?.total_pages || 1;
    const packages = cache.packagesList || [];

    root.innerHTML = `
        <div class="tm-container">
            <!-- Header Bar -->
            <div class="tm-header">
                <div>
                    <h1 class="tm-title">Hospital Master Tariff Book &amp; Packages</h1>
                    <p class="tm-subtitle">Centralized Price Book: Consultations, Routine Nursing, Bedside Procedures, Emergency/Night Surcharges &amp; Bundled Packages</p>
                </div>
                <div class="tm-header-actions">
                    <button class="tm-btn tm-btn-secondary" id="tmBtnSeedDemo" title="Populate realistic institutional procedures and service packages">
                        ⚡ Seed Master Catalog
                    </button>
                    <button class="tm-btn tm-btn-secondary" id="tmBtnOpenCalc">
                        🧮 Surcharge &amp; Tax Calculator
                    </button>
                    <button class="tm-btn tm-btn-secondary" id="tmBtnRefresh">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                        Refresh
                    </button>
                    <button class="tm-btn tm-btn-primary" id="tmBtnNewTariff">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        + New Tariff Service
                    </button>
                </div>
            </div>

            <!-- Executive KPI Ribbon -->
            <div class="tm-kpi-ribbon">
                <div class="tm-kpi-card">
                    <div class="tm-kpi-label">Catalogued Services</div>
                    <div class="tm-kpi-val text-primary">${s.total_tariffs || 0}</div>
                    <div class="tm-kpi-sub">${s.count_active || 0} active in price book</div>
                </div>

                <div class="tm-kpi-card">
                    <div class="tm-kpi-label">Average Standard Price</div>
                    <div class="tm-kpi-val text-emerald">${cur(s.avg_standard_price)}</div>
                    <div class="tm-kpi-sub">Across all clinical departments</div>
                </div>

                <div class="tm-kpi-card">
                    <div class="tm-kpi-label">HMO / Insurance Covered</div>
                    <div class="tm-kpi-val text-blue">${s.count_hmo_covered || 0}</div>
                    <div class="tm-kpi-sub">Eligible for PhilHealth &amp; HMO claims</div>
                </div>

                <div class="tm-kpi-card">
                    <div class="tm-kpi-label">Bundled Service Packages</div>
                    <div class="tm-kpi-val text-purple">${s.count_packages || packages.length || 0}</div>
                    <div class="tm-kpi-sub">Maternity, Surgical &amp; Wellness</div>
                </div>
            </div>

            <!-- View Navigation Tabs -->
            <div class="tm-tabs-nav">
                <button class="tm-tab-nav-btn ${state.view === 'tariffs' ? 'active' : ''}" data-view="tariffs">
                    📋 Master Tariff Price Book (${s.total_tariffs || 0})
                </button>
                <button class="tm-tab-nav-btn ${state.view === 'packages' ? 'active' : ''}" data-view="packages">
                    📦 Bundled Service Packages (${packages.length})
                </button>
                <button class="tm-tab-nav-btn ${state.view === 'calculator' ? 'active' : ''}" data-view="calculator">
                    🧮 Interactive Surcharge Calculator
                </button>
            </div>

            <!-- VIEW 1: TARIFFS PRICE BOOK -->
            ${state.view === 'tariffs' ? renderTariffsTableView(tariffs, totalTariffs, totalPages) : ''}

            <!-- VIEW 2: PACKAGES DIRECTORY -->
            ${state.view === 'packages' ? renderPackagesView(packages) : ''}

            <!-- VIEW 3: INTERACTIVE SURCHARGE CALCULATOR -->
            ${state.view === 'calculator' ? renderCalculatorView() : ''}
        </div>

        <!-- MODAL CONTAINERS -->
        <div id="tmModalContainer"></div>
    `;

    bindEvents(root);
}

// -------------------------------------------------------------
// RENDER: TARIFFS TABLE VIEW
// -------------------------------------------------------------
function renderTariffsTableView(tariffs, totalTariffs, totalPages) {
    return `
        <div class="tm-card">
            <!-- Filter Bar -->
            <div class="tm-filter-bar">
                <div class="tm-search-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input type="text" id="tmSearchInput" class="tm-input" placeholder="Search Tariff Code, Service Name, CPT/HCPCS..." value="${esc(state.searchQuery)}">
                </div>

                <select id="tmCategoryFilter" class="tm-select">
                    <option value="all" ${state.categoryFilter === 'all' ? 'selected' : ''}>All Categories</option>
                    <option value="consultation" ${state.categoryFilter === 'consultation' ? 'selected' : ''}>Physician Consultations</option>
                    <option value="nursing_care" ${state.categoryFilter === 'nursing_care' ? 'selected' : ''}>Routine Nursing Care (Per Diem)</option>
                    <option value="bedside_procedure" ${state.categoryFilter === 'bedside_procedure' ? 'selected' : ''}>Bedside Procedures</option>
                    <option value="operating_theater" ${state.categoryFilter === 'operating_theater' ? 'selected' : ''}>Operating Theater &amp; Anesthesia</option>
                    <option value="emergency_service" ${state.categoryFilter === 'emergency_service' ? 'selected' : ''}>Emergency Room Services</option>
                    <option value="diagnostic_lab" ${state.categoryFilter === 'diagnostic_lab' ? 'selected' : ''}>Clinical Laboratory</option>
                    <option value="radiology_imaging" ${state.categoryFilter === 'radiology_imaging' ? 'selected' : ''}>Radiology &amp; Imaging</option>
                    <option value="room_board" ${state.categoryFilter === 'room_board' ? 'selected' : ''}>Room &amp; Board</option>
                </select>
            </div>

            <!-- Tariffs Table -->
            ${tariffs.length === 0 ? `
                <div class="tm-empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                    <h3>No Master Tariff Entries Found</h3>
                    <p>Click "Seed Master Catalog" above to load standard institutional procedures and pricing.</p>
                </div>
            ` : `
                <div class="tm-table-responsive">
                    <table class="tm-table">
                        <thead>
                            <tr>
                                <th>Tariff Code</th>
                                <th>Service Name &amp; Description</th>
                                <th>Category</th>
                                <th>Department</th>
                                <th>Billing Unit</th>
                                <th class="text-right">Standard Price</th>
                                <th>Surcharges Applicable</th>
                                <th>Tax / VAT</th>
                                <th>Insurance / HMO</th>
                                <th class="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tariffs.map(t => `
                                <tr>
                                    <td>
                                        <span class="tm-tariff-code">${esc(t.tariff_code)}</span>
                                        ${t.cpt_hcpcs_code ? `<div class="tm-cpt-tag">CPT: ${esc(t.cpt_hcpcs_code)}</div>` : ''}
                                    </td>
                                    <td>
                                        <div class="tm-service-name">${esc(t.service_name)}</div>
                                        ${t.description ? `<div class="tm-service-desc" title="${esc(t.description)}">${esc(t.description)}</div>` : ''}
                                    </td>
                                    <td>
                                        <span class="tm-tag-cat ${t.category}">${formatCategory(t.category)}</span>
                                    </td>
                                    <td class="tm-dept-cell">
                                        ${esc(t.department_name || 'Hospital General')}
                                    </td>
                                    <td>
                                        <span class="tm-unit-badge">${formatUnit(t.billing_unit)}</span>
                                    </td>
                                    <td class="text-right font-bold text-lg text-primary">
                                        ${cur(t.standard_price)}
                                    </td>
                                    <td>
                                        <div class="tm-surcharges-group">
                                            ${parseFloat(t.emergency_surcharge_pct) > 0 ? `
                                                <span class="tm-badge-surcharge emr" title="Emergency Surcharge">+${t.emergency_surcharge_pct}% Emr</span>
                                            ` : ''}
                                            ${parseFloat(t.night_diff_surcharge_pct) > 0 ? `
                                                <span class="tm-badge-surcharge night" title="Night Differential 10pm-6am">+${t.night_diff_surcharge_pct}% Night</span>
                                            ` : ''}
                                            ${parseFloat(t.holiday_surcharge_pct) > 0 ? `
                                                <span class="tm-badge-surcharge hol" title="Holiday Surcharge">+${t.holiday_surcharge_pct}% Hol</span>
                                            ` : ''}
                                            ${parseFloat(t.emergency_surcharge_pct) <= 0 && parseFloat(t.night_diff_surcharge_pct) <= 0 && parseFloat(t.holiday_surcharge_pct) <= 0 ? `
                                                <span class="text-muted">—</span>
                                            ` : ''}
                                        </div>
                                    </td>
                                    <td>
                                        ${t.taxability_flag == 1 ? `
                                            <span class="tm-badge-tax taxable">VAT ${t.tax_rate_pct}%</span>
                                        ` : `
                                            <span class="tm-badge-tax exempt">VAT-Exempt</span>
                                        `}
                                    </td>
                                    <td>
                                        ${t.hmo_covered_flag == 1 ? `
                                            <span class="tm-badge-hmo covered">✓ Covered</span>
                                            ${t.hmo_standard_reimbursement ? `
                                                <div class="tm-reimb-sub">Rate: ${cur(t.hmo_standard_reimbursement)}</div>
                                            ` : ''}
                                        ` : `
                                            <span class="tm-badge-hmo not-covered">Self-Pay Only</span>
                                        `}
                                    </td>
                                    <td class="text-center">
                                        <div class="tm-action-group">
                                            <button class="tm-btn-action tm-btn-calc tmBtnQuickCalc" data-id="${t.id}" title="Calculate Final Price with Surcharges">
                                                🧮 Surcharge
                                            </button>
                                            <button class="tm-btn-action tm-btn-edit tmBtnEditTariff" data-id="${t.id}" title="Edit Tariff Pricing &amp; Details">
                                                ✏️ Edit
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>

                <!-- Pagination -->
                ${totalPages > 1 ? `
                    <div class="tm-pagination">
                        <span>Showing page ${state.page} of ${totalPages} (${totalTariffs} items)</span>
                        <div class="tm-page-controls">
                            <button class="tm-btn tm-btn-secondary" id="tmBtnPrevPage" ${state.page <= 1 ? 'disabled' : ''}>Previous</button>
                            <button class="tm-btn tm-btn-secondary" id="tmBtnNextPage" ${state.page >= totalPages ? 'disabled' : ''}>Next</button>
                        </div>
                    </div>
                ` : ''}
            `}
        </div>
    `;
}

// -------------------------------------------------------------
// RENDER: PACKAGES VIEW
// -------------------------------------------------------------
function renderPackagesView(packages) {
    return `
        <div class="tm-packages-container">
            <div class="tm-packages-intro">
                <h3>Standard Hospital Bundled Service Packages</h3>
                <p>Bundled procedural packages covering operating rooms, attending physician fees, accommodation bed days, routine drugs, and specialized nursing.</p>
            </div>

            <div class="tm-packages-grid">
                ${packages.map(pkg => {
                    const savings = parseFloat(pkg.standard_package_price) - parseFloat(pkg.discounted_price);
                    return `
                        <div class="tm-package-card">
                            <div class="tm-pkg-header">
                                <span class="tm-pkg-code">${esc(pkg.package_code)}</span>
                                <span class="tm-pkg-type">${formatPackageType(pkg.package_type)}</span>
                            </div>
                            <h4 class="tm-pkg-title">${esc(pkg.package_name)}</h4>
                            <p class="tm-pkg-desc">${esc(pkg.description || '')}</p>

                            <div class="tm-pkg-pricing">
                                <div>
                                    <span class="tm-pkg-std text-muted"><del>${cur(pkg.standard_package_price)}</del></span>
                                    <div class="tm-pkg-disc font-bold text-emerald text-xl">${cur(pkg.discounted_price)}</div>
                                </div>
                                ${savings > 0 ? `
                                    <span class="tm-savings-pill">Save ${cur(savings)}</span>
                                ` : ''}
                            </div>

                            <div class="tm-pkg-features">
                                <div class="tm-pkg-feat">
                                    <span class="tm-feat-icon">🛏️</span>
                                    <span>${pkg.included_bed_days} Days Bed Stay (${esc(pkg.included_room_type || 'Ward')})</span>
                                </div>
                                <div class="tm-pkg-feat">
                                    <span class="tm-feat-icon">🏥</span>
                                    <span>Department: ${esc(pkg.department_name || 'Multi-Specialty')}</span>
                                </div>
                                <div class="tm-pkg-feat">
                                    <span class="tm-feat-icon">📋</span>
                                    <span>${pkg.item_count || 0} Bundled Inclusions</span>
                                </div>
                            </div>

                            ${pkg.inclusions_summary ? `
                                <div class="tm-pkg-inc">
                                    <strong>Inclusions:</strong> ${esc(pkg.inclusions_summary)}
                                </div>
                            ` : ''}

                            <div class="tm-pkg-footer">
                                <button class="tm-btn tm-btn-secondary tm-btn-full tmBtnViewPackageItems" data-id="${pkg.id}">
                                    View Component Items &rarr;
                                </button>
                            </div>
                        </div>
                    `;
                }).join("")}
            </div>
        </div>
    `;
}

// -------------------------------------------------------------
// RENDER: SURCHARGE CALCULATOR VIEW
// -------------------------------------------------------------
function renderCalculatorView() {
    const tariffs = cache.tariffsData?.data || [];
    const cs = state.calcState;
    const res = cs.result;

    return `
        <div class="tm-calc-container">
            <div class="tm-card">
                <div class="tm-calc-grid">
                    <!-- Calculator Inputs -->
                    <div class="tm-calc-pane">
                        <h3>Surcharge &amp; Tax Calculation Engine</h3>
                        <p>Simulate emergency, night shift (10pm-6am), holiday surcharges, and tax calculations for hospital services.</p>

                        <form id="tmFormCalc" class="tm-form">
                            <div class="tm-field full">
                                <label>Select Hospital Service <span class="text-danger">*</span></label>
                                <select id="tmCalcTariffSelect" class="tm-select" required>
                                    <option value="">-- Choose Chargeable Service --</option>
                                    ${tariffs.map(t => `
                                        <option value="${t.id}" ${cs.tariffId == t.id ? 'selected' : ''}>
                                            ${esc(t.tariff_code)} - ${esc(t.service_name)} (${cur(t.standard_price)})
                                        </option>
                                    `).join("")}
                                </select>
                            </div>

                            <div class="tm-field">
                                <label>Quantity / Units</label>
                                <input type="number" id="tmCalcQuantity" class="tm-input" min="1" max="100" value="${cs.quantity || 1}">
                            </div>

                            <div class="tm-field full">
                                <label>Out-of-Hours &amp; Emergency Surcharge Triggers</label>
                                <div class="tm-calc-checkboxes">
                                    <label class="tm-check-card">
                                        <input type="checkbox" id="tmCalcEmr" ${cs.isEmergency ? 'checked' : ''}>
                                        <div>
                                            <strong>🚨 Emergency Service</strong>
                                            <div class="tm-check-sub">Acute resuscitation / emergent intervention markup</div>
                                        </div>
                                    </label>

                                    <label class="tm-check-card">
                                        <input type="checkbox" id="tmCalcNight" ${cs.isNight ? 'checked' : ''}>
                                        <div>
                                            <strong>🌙 Night Differential (10 PM – 6 AM)</strong>
                                            <div class="tm-check-sub">Graveyard shift hospital staffing differential</div>
                                        </div>
                                    </label>

                                    <label class="tm-check-card">
                                        <input type="checkbox" id="tmCalcHol" ${cs.isHoliday ? 'checked' : ''}>
                                        <div>
                                            <strong>🎉 Public Holiday / Weekend Surcharge</strong>
                                            <div class="tm-check-sub">Official legal holiday statutory charge markup</div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div class="tm-calc-actions">
                                <button type="submit" class="tm-btn tm-btn-primary" id="tmBtnComputeSurcharge">
                                    🧮 Compute Final Hospital Charges &rarr;
                                </button>
                            </div>
                        </form>
                    </div>

                    <!-- Calculator Results Output Box -->
                    <div class="tm-calc-pane results">
                        <h3>Official Fee Breakdown</h3>
                        ${res ? `
                            <div class="tm-calc-result-box">
                                <div class="tm-res-item">
                                    <span>Base Charges (${res.quantity} &times; ${cur(res.unit_price)}):</span>
                                    <strong>${cur(res.base_charges)}</strong>
                                </div>

                                ${res.is_emergency ? `
                                    <div class="tm-res-item surcharge">
                                        <span>+ Emergency Surcharge (+${res.emergency_surcharge_pct}%):</span>
                                        <strong>+ ${cur(res.emergency_surcharge_amount)}</strong>
                                    </div>
                                ` : ''}

                                ${res.is_night ? `
                                    <div class="tm-res-item surcharge">
                                        <span>+ Night Differential Surcharge (+${res.night_diff_surcharge_pct}%):</span>
                                        <strong>+ ${cur(res.night_diff_surcharge_amount)}</strong>
                                    </div>
                                ` : ''}

                                ${res.is_holiday ? `
                                    <div class="tm-res-item surcharge">
                                        <span>+ Public Holiday Surcharge (+${res.holiday_surcharge_pct}%):</span>
                                        <strong>+ ${cur(res.holiday_surcharge_amount)}</strong>
                                    </div>
                                ` : ''}

                                <div class="tm-res-item divider">
                                    <span>Subtotal before Tax:</span>
                                    <span class="font-semibold">${cur(res.subtotal)}</span>
                                </div>

                                <div class="tm-res-item">
                                    <span>${res.taxable ? `VAT / Sales Tax (${res.tax_rate_pct}%):` : 'VAT / Sales Tax:'}</span>
                                    <span class="${res.taxable ? 'text-primary' : 'text-muted'}">${res.taxable ? '+ ' + cur(res.tax_amount) : 'VAT-Exempt ($0.00)'}</span>
                                </div>

                                <div class="tm-res-hero">
                                    <span class="tm-hero-label">FINAL CHARGEABLE PATIENT BILL</span>
                                    <span class="tm-hero-val font-bold text-emerald">${cur(res.total_amount)}</span>
                                    <span class="tm-hero-sub">${res.hmo_covered ? '✓ Eligible for HMO / PhilHealth claim' : '⚠ Non-covered / Direct Patient settlement'}</span>
                                </div>
                            </div>
                        ` : `
                            <div class="tm-empty-calc">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="2" width="16" height="20" rx="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="16" y1="14" x2="16" y2="18"></line><path d="M16 10h.01"></path><path d="M12 10h.01"></path><path d="M8 10h.01"></path><path d="M12 14h.01"></path><path d="M8 14h.01"></path><path d="M12 18h.01"></path><path d="M8 18h.01"></path></svg>
                                <h4>Select a service and click "Compute"</h4>
                                <p>The engine will calculate exact emergency, night differential, and statutory holiday surcharges.</p>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// -------------------------------------------------------------
// EVENT BINDINGS
// -------------------------------------------------------------
function bindEvents(root) {
    root.querySelector("#tmBtnRefresh")?.addEventListener("click", () => loadData());

    // Navigation Tabs
    root.querySelectorAll(".tm-tab-nav-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            state.view = btn.getAttribute("data-view");
            renderView(root);
        });
    });

    root.querySelector("#tmBtnOpenCalc")?.addEventListener("click", () => {
        state.view = "calculator";
        renderView(root);
    });

    root.querySelector("#tmBtnNewTariff")?.addEventListener("click", () => {
        openTariffModal();
    });

    // Seed Demo
    root.querySelector("#tmBtnSeedDemo")?.addEventListener("click", async () => {
        const btn = root.querySelector("#tmBtnSeedDemo");
        btn.disabled = true;
        btn.innerText = "Seeding Catalog...";
        try {
            const res = await api("/tariffs/seed-demo", { method: "POST" });
            if (res && res.success) {
                showToast(res.message || "Master catalog seeded successfully!", "success");
                await loadData();
            } else {
                showToast(res?.message || "Failed to seed catalog", "error");
            }
        } catch (e) {
            showToast(e.message || "Error seeding catalog", "error");
        } finally {
            btn.disabled = false;
            btn.innerText = "⚡ Seed Master Catalog";
        }
    });

    // Search and Category
    let searchTimeout;
    root.querySelector("#tmSearchInput")?.addEventListener("input", (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            state.searchQuery = e.target.value.trim();
            state.page = 1;
            loadData();
        }, 350);
    });

    root.querySelector("#tmCategoryFilter")?.addEventListener("change", (e) => {
        state.categoryFilter = e.target.value;
        state.page = 1;
        loadData();
    });

    // Pagination
    root.querySelector("#tmBtnPrevPage")?.addEventListener("click", () => {
        if (state.page > 1) {
            state.page--;
            loadData();
        }
    });
    root.querySelector("#tmBtnNextPage")?.addEventListener("click", () => {
        state.page++;
        loadData();
    });

    // Edit and Quick Calc buttons in table
    root.querySelectorAll(".tmBtnEditTariff").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.getAttribute("data-id"), 10);
            openTariffModal(id);
        });
    });

    root.querySelectorAll(".tmBtnQuickCalc").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.getAttribute("data-id"), 10);
            state.view = "calculator";
            state.calcState.tariffId = id;
            renderView(root);
            triggerCalculation();
        });
    });

    // View Package Items
    root.querySelectorAll(".tmBtnViewPackageItems").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.getAttribute("data-id"), 10);
            openPackageDetailModal(id);
        });
    });

    // Calculator Form
    root.querySelector("#tmFormCalc")?.addEventListener("submit", (e) => {
        e.preventDefault();
        triggerCalculation();
    });
}

async function triggerCalculation() {
    const tariffId = parseInt(document.getElementById("tmCalcTariffSelect")?.value, 10);
    const qty = parseInt(document.getElementById("tmCalcQuantity")?.value, 10) || 1;
    const isEmr = document.getElementById("tmCalcEmr")?.checked || false;
    const isNight = document.getElementById("tmCalcNight")?.checked || false;
    const isHol = document.getElementById("tmCalcHol")?.checked || false;

    if (!tariffId) {
        showToast("Please select a chargeable service", "error");
        return;
    }

    state.calcState.tariffId = tariffId;
    state.calcState.quantity = qty;
    state.calcState.isEmergency = isEmr;
    state.calcState.isNight = isNight;
    state.calcState.isHoliday = isHol;

    try {
        const res = await api("/tariffs/calculate", {
            method: "POST",
            body: JSON.stringify({
                tariff_id: tariffId,
                quantity: qty,
                is_emergency: isEmr,
                is_night: isNight,
                is_holiday: isHol
            })
        });

        if (res && res.success) {
            state.calcState.result = res.data;
            const root = document.getElementById("tariffMasterRoot");
            if (root) renderView(root);
        } else {
            showToast(res?.message || "Failed to calculate charges", "error");
        }
    } catch (e) {
        showToast(e.message || "Calculation error", "error");
    }
}

// -------------------------------------------------------------
// MODALS
// -------------------------------------------------------------

// Add / Edit Tariff Modal
async function openTariffModal(tariffId = null) {
    const container = document.getElementById("tmModalContainer");
    if (!container) return;

    let item = null;
    if (tariffId) {
        try {
            const res = await api(`/tariffs/detail?id=${tariffId}`);
            item = res?.data;
        } catch (e) {
            showToast("Failed to load tariff detail", "error");
            return;
        }
    }

    container.innerHTML = `
        <div class="tm-modal-backdrop" id="tmTariffBackdrop">
            <div class="tm-modal-box">
                <div class="tm-modal-header">
                    <div class="tm-modal-title">
                        <h3>${item ? 'Edit Master Tariff Item' : '+ Add New Chargeable Service'}</h3>
                        <p>${item ? esc(item.tariff_code) : 'Catalog a new hospital fee, procedure, or consultation'}</p>
                    </div>
                    <button class="tm-modal-close" id="tmBtnCloseTariff">&times;</button>
                </div>

                <form id="tmFormTariff" class="tm-form">
                    ${item ? `<input type="hidden" name="id" value="${item.id}">` : ''}

                    <div class="tm-form-grid">
                        <div class="tm-field full">
                            <label>Service / Procedure Name <span class="text-danger">*</span></label>
                            <input type="text" name="service_name" class="tm-input font-semibold" value="${esc(item?.service_name || '')}" required placeholder="e.g. Inpatient Ward Routine Nursing Care (Per Diem)">
                        </div>

                        <div class="tm-field">
                            <label>Service Category <span class="text-danger">*</span></label>
                            <select name="category" class="tm-select" required>
                                <option value="consultation" ${item?.category === 'consultation' ? 'selected' : ''}>Physician Consultation</option>
                                <option value="nursing_care" ${item?.category === 'nursing_care' ? 'selected' : ''}>Routine Nursing Care (Per Diem)</option>
                                <option value="bedside_procedure" ${item?.category === 'bedside_procedure' ? 'selected' : ''}>Bedside Procedure</option>
                                <option value="operating_theater" ${item?.category === 'operating_theater' ? 'selected' : ''}>Operating Theater &amp; Anesthesia</option>
                                <option value="emergency_service" ${item?.category === 'emergency_service' ? 'selected' : ''}>Emergency Room Service</option>
                                <option value="diagnostic_lab" ${item?.category === 'diagnostic_lab' ? 'selected' : ''}>Clinical Diagnostic Lab</option>
                                <option value="radiology_imaging" ${item?.category === 'radiology_imaging' ? 'selected' : ''}>Radiology &amp; PACS Imaging</option>
                                <option value="supplies_equipment" ${item?.category === 'supplies_equipment' ? 'selected' : ''}>Supplies &amp; Biomedical Equip</option>
                                <option value="room_board" ${item?.category === 'room_board' ? 'selected' : ''}>Room &amp; Board</option>
                                <option value="miscellaneous" ${item?.category === 'miscellaneous' ? 'selected' : ''}>Miscellaneous Service</option>
                            </select>
                        </div>

                        <div class="tm-field">
                            <label>Billing Unit</label>
                            <select name="billing_unit" class="tm-select">
                                <option value="per_procedure" ${item?.billing_unit === 'per_procedure' ? 'selected' : ''}>Per Procedure</option>
                                <option value="per_day" ${item?.billing_unit === 'per_day' ? 'selected' : ''}>Per Day (Per Diem)</option>
                                <option value="per_visit" ${item?.billing_unit === 'per_visit' ? 'selected' : ''}>Per Visit / Consult</option>
                                <option value="per_hour" ${item?.billing_unit === 'per_hour' ? 'selected' : ''}>Per Hour</option>
                                <option value="per_test" ${item?.billing_unit === 'per_test' ? 'selected' : ''}>Per Test</option>
                                <option value="per_session" ${item?.billing_unit === 'per_session' ? 'selected' : ''}>Per Session</option>
                            </select>
                        </div>

                        <div class="tm-field">
                            <label>Standard Price ($) <span class="text-danger">*</span></label>
                            <input type="number" step="0.01" min="0" name="standard_price" class="tm-input font-bold text-primary" value="${item?.standard_price || '0.00'}" required>
                        </div>

                        <div class="tm-field">
                            <label>CPT / HCPCS Code</label>
                            <input type="text" name="cpt_hcpcs_code" class="tm-input" value="${esc(item?.cpt_hcpcs_code || '')}" placeholder="e.g. 99213, 99232, 36000">
                        </div>

                        <div class="tm-field">
                            <label>Emergency Surcharge (%)</label>
                            <input type="number" step="0.01" min="0" max="200" name="emergency_surcharge_pct" class="tm-input" value="${item?.emergency_surcharge_pct || '0.00'}" placeholder="e.g. 25.00">
                        </div>

                        <div class="tm-field">
                            <label>Night Differential (%) (10pm-6am)</label>
                            <input type="number" step="0.01" min="0" max="200" name="night_diff_surcharge_pct" class="tm-input" value="${item?.night_diff_surcharge_pct || '0.00'}" placeholder="e.g. 15.00">
                        </div>

                        <div class="tm-field">
                            <label>Holiday Surcharge (%)</label>
                            <input type="number" step="0.01" min="0" max="200" name="holiday_surcharge_pct" class="tm-input" value="${item?.holiday_surcharge_pct || '0.00'}" placeholder="e.g. 30.00">
                        </div>

                        <div class="tm-field">
                            <label>Taxability / VAT</label>
                            <select name="taxability_flag" class="tm-select">
                                <option value="0" ${item?.taxability_flag == 0 ? 'selected' : ''}>VAT-Exempt (Standard Medical)</option>
                                <option value="1" ${item?.taxability_flag == 1 ? 'selected' : ''}>Taxable (VAT Applicable)</option>
                            </select>
                        </div>

                        <div class="tm-field">
                            <label>HMO / Insurance Eligible</label>
                            <select name="hmo_covered_flag" class="tm-select">
                                <option value="1" ${item?.hmo_covered_flag != 0 ? 'selected' : ''}>Yes &bull; Eligible for HMO / Claim</option>
                                <option value="0" ${item?.hmo_covered_flag == 0 ? 'selected' : ''}>No &bull; Self-Pay Out-of-Pocket Only</option>
                            </select>
                        </div>

                        <div class="tm-field">
                            <label>HMO Benchmark Reimbursement ($)</label>
                            <input type="number" step="0.01" min="0" name="hmo_standard_reimbursement" class="tm-input" value="${item?.hmo_standard_reimbursement || ''}" placeholder="Optional benchmark">
                        </div>

                        <div class="tm-field full">
                            <label>Clinical Description &amp; Charge Rules</label>
                            <textarea name="description" class="tm-textarea" rows="2" placeholder="Clinical inclusions, sterile tray items included...">${esc(item?.description || '')}</textarea>
                        </div>
                    </div>

                    <div class="tm-modal-footer">
                        <button type="button" class="tm-btn tm-btn-secondary" id="tmBtnCancelTariff">Cancel</button>
                        <button type="submit" class="tm-btn tm-btn-primary" id="tmBtnSaveTariff">
                            ${item ? 'Save Changes' : 'Create Tariff Entry &rarr;'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const close = () => { container.innerHTML = ""; };
    container.querySelector("#tmBtnCloseTariff")?.addEventListener("click", close);
    container.querySelector("#tmBtnCancelTariff")?.addEventListener("click", close);

    const form = container.querySelector("#tmFormTariff");
    form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = form.querySelector("#tmBtnSaveTariff");
        btn.disabled = true;
        btn.innerText = "Saving...";

        try {
            const formData = new FormData(form);
            const payload = Object.fromEntries(formData.entries());
            const endpoint = item ? "/tariffs/update" : "/tariffs";

            const res = await api(endpoint, {
                method: "POST",
                body: JSON.stringify(payload)
            });

            if (res && res.success) {
                showToast(res.message || "Tariff saved successfully!", "success");
                close();
                await loadData();
            } else {
                showToast(res?.message || "Failed to save tariff", "error");
                btn.disabled = false;
                btn.innerText = item ? "Save Changes" : "Create Tariff Entry →";
            }
        } catch (err) {
            showToast(err.message || "Network error", "error");
            btn.disabled = false;
            btn.innerText = item ? "Save Changes" : "Create Tariff Entry →";
        }
    });
}

// Package Detail Modal with items breakdown
async function openPackageDetailModal(packageId) {
    const container = document.getElementById("tmModalContainer");
    if (!container) return;

    let pkg = null;
    try {
        const res = await api(`/tariffs/packages/detail?id=${packageId}`);
        pkg = res?.data;
    } catch (e) {
        showToast("Error loading package details", "error");
        return;
    }

    if (!pkg) return;

    const items = pkg.items || [];
    const savings = parseFloat(pkg.standard_package_price) - parseFloat(pkg.discounted_price);

    container.innerHTML = `
        <div class="tm-modal-backdrop" id="tmPkgBackdrop">
            <div class="tm-modal-box tm-modal-lg">
                <div class="tm-modal-header">
                    <div class="tm-modal-title">
                        <h3>${esc(pkg.package_name)}</h3>
                        <p>Code: <strong>${esc(pkg.package_code)}</strong> &bull; Type: <strong>${formatPackageType(pkg.package_type)}</strong></p>
                    </div>
                    <button class="tm-modal-close" id="tmBtnClosePkg">&times;</button>
                </div>

                <div class="tm-pkg-detail-banner">
                    <div>
                        <span class="tm-pkg-badge-lg">${formatPackageType(pkg.package_type)}</span>
                        <h3>${cur(pkg.discounted_price)}</h3>
                        <div class="tm-banner-sub">Standard Value: <del>${cur(pkg.standard_package_price)}</del> &bull; Total Bundle Savings: <strong class="text-emerald">${cur(savings)}</strong></div>
                    </div>
                    <div class="tm-banner-features">
                        <div>🛏️ Included Bed Stay: <strong>${pkg.included_bed_days} Days</strong></div>
                        <div>🏨 Room Category: <strong>${esc(pkg.included_room_type || 'Ward')}</strong></div>
                    </div>
                </div>

                <div class="tm-pkg-items-section">
                    <h4>Bundled Inclusions &amp; Procedure Components (${items.length} items)</h4>
                    <table class="tm-table">
                        <thead>
                            <tr>
                                <th>Item Code</th>
                                <th>Inclusion Description</th>
                                <th class="text-center">Quantity</th>
                                <th class="text-right">Unit Value</th>
                                <th class="text-right">Total Covered Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(it => `
                                <tr>
                                    <td><span class="tm-tariff-code">${esc(it.item_code)}</span></td>
                                    <td><strong>${esc(it.item_name)}</strong></td>
                                    <td class="text-center font-bold">${it.quantity}</td>
                                    <td class="text-right">${cur(it.unit_price)}</td>
                                    <td class="text-right font-bold text-primary">${cur(parseFloat(it.unit_price) * parseFloat(it.quantity))}</td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>

                ${pkg.inclusions_summary || pkg.exclusions_summary ? `
                    <div class="tm-pkg-terms-grid">
                        <div class="tm-terms-box inc">
                            <strong>Official Inclusions:</strong>
                            <p>${esc(pkg.inclusions_summary || 'All listed items')}</p>
                        </div>
                        <div class="tm-terms-box exc">
                            <strong>Package Exclusions (Billed Separately):</strong>
                            <p>${esc(pkg.exclusions_summary || 'Complications, blood products, ICU stay')}</p>
                        </div>
                    </div>
                ` : ''}

                <div class="tm-modal-footer">
                    <button type="button" class="tm-btn tm-btn-secondary" id="tmBtnClosePkgFooter">Close</button>
                </div>
            </div>
        </div>
    `;

    const close = () => { container.innerHTML = ""; };
    container.querySelector("#tmBtnClosePkg")?.addEventListener("click", close);
    container.querySelector("#tmBtnClosePkgFooter")?.addEventListener("click", close);
}

// -------------------------------------------------------------
// HELPER FORMATTERS
// -------------------------------------------------------------
function formatCategory(cat) {
    const map = {
        consultation: "Physician Consult",
        nursing_care: "Routine Nursing",
        bedside_procedure: "Bedside Procedure",
        operating_theater: "Operating Room",
        emergency_service: "Emergency Room",
        diagnostic_lab: "Clinical Lab",
        radiology_imaging: "Radiology",
        supplies_equipment: "Supplies/Equip",
        room_board: "Room & Board",
        miscellaneous: "Misc Service"
    };
    return map[cat] || cat;
}

function formatUnit(u) {
    const map = {
        per_procedure: "Procedure",
        per_day: "Per Diem (Day)",
        per_visit: "Visit",
        per_hour: "Hour",
        per_test: "Test",
        per_session: "Session"
    };
    return map[u] || u;
}

function formatPackageType(t) {
    const map = {
        maternity_delivery: "Maternity Delivery",
        surgical_procedure: "Surgical Package",
        executive_checkup: "Executive Health",
        icu_critical_care: "Critical Care",
        dialysis_bundle: "Hemodialysis",
        chemotherapy_cycle: "Chemotherapy",
        wellness_screening: "Wellness"
    };
    return map[t] || t;
}

// -------------------------------------------------------------
// STYLES
// -------------------------------------------------------------
function ensureCss() {
    if (document.getElementById("tmModuleStyles")) return;
    const style = document.createElement("style");
    style.id = "tmModuleStyles";
    style.textContent = `
        .tm-root { padding: 24px; max-width: 1440px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; }
        .tm-loading { padding: 40px; text-align: center; color: #64748b; font-size: 16px; }
        .tm-error { padding: 20px; background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; border-radius: 8px; }

        .tm-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
        .tm-title { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0; }
        .tm-subtitle { color: #64748b; margin: 4px 0 0; font-size: 14px; }
        .tm-header-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

        .tm-btn { display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: background 0.15s; }
        .tm-btn svg { width: 16px; height: 16px; }
        .tm-btn-primary { background: #2563eb; color: #fff; }
        .tm-btn-primary:hover { background: #1d4ed8; }
        .tm-btn-secondary { background: #fff; border: 1px solid #cbd5e1; color: #334155; }
        .tm-btn-secondary:hover { background: #f8fafc; }
        .tm-btn-full { width: 100%; justify-content: center; }

        /* KPI Ribbon */
        .tm-kpi-ribbon { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .tm-kpi-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); }
        .tm-kpi-label { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
        .tm-kpi-val { font-size: 28px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
        .tm-kpi-sub { font-size: 12px; color: #64748b; }

        /* View Navigation Tabs */
        .tm-tabs-nav { display: flex; gap: 8px; margin-bottom: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
        .tm-tab-nav-btn { background: none; border: none; padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 600; color: #64748b; cursor: pointer; }
        .tm-tab-nav-btn:hover { background: #f1f5f9; color: #0f172a; }
        .tm-tab-nav-btn.active { background: #0f172a; color: #fff; }

        .tm-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); overflow: hidden; }

        /* Filters */
        .tm-filter-bar { padding: 14px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; gap: 12px; flex-wrap: wrap; }
        .tm-search-wrap { position: relative; flex: 1; min-width: 260px; }
        .tm-search-wrap svg { position: absolute; left: 10px; top: 10px; width: 16px; height: 16px; color: #94a3b8; }
        .tm-search-wrap .tm-input { padding-left: 34px; width: 100%; box-sizing: border-box; }

        .tm-input, .tm-select, .tm-textarea { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; font-size: 13px; color: #1e293b; background: #fff; outline: none; }
        .tm-input:focus, .tm-select:focus, .tm-textarea:focus { border-color: #3b82f6; }

        /* Table */
        .tm-table-responsive { overflow-x: auto; }
        .tm-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
        .tm-table th { background: #f8fafc; color: #475569; font-weight: 600; padding: 12px 14px; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
        .tm-table td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .tm-table tr:hover { background: #f8fafc; }

        .tm-tariff-code { font-family: monospace; font-size: 12px; font-weight: 700; color: #0f172a; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }
        .tm-cpt-tag { font-size: 10px; color: #64748b; margin-top: 2px; }
        .tm-service-name { font-weight: 600; color: #0f172a; }
        .tm-service-desc { font-size: 11px; color: #64748b; max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .tm-dept-cell { font-size: 12px; color: #475569; }

        .tm-tag-cat { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: 600; background: #f1f5f9; color: #475569; }
        .tm-unit-badge { font-size: 11px; color: #64748b; background: #f8fafc; padding: 2px 6px; border-radius: 4px; border: 1px solid #e2e8f0; }

        .tm-surcharges-group { display: flex; gap: 4px; flex-wrap: wrap; }
        .tm-badge-surcharge { font-size: 10px; font-weight: 700; padding: 2px 5px; border-radius: 4px; }
        .tm-badge-surcharge.emr { background: #fee2e2; color: #991b1b; }
        .tm-badge-surcharge.night { background: #ede9fe; color: #6d28d9; }
        .tm-badge-surcharge.hol { background: #fef3c7; color: #b45309; }

        .tm-badge-tax { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; }
        .tm-badge-tax.exempt { background: #f0fdf4; color: #166534; }
        .tm-badge-tax.taxable { background: #fef2f2; color: #991b1b; }

        .tm-badge-hmo { font-size: 11px; font-weight: 600; }
        .tm-badge-hmo.covered { color: #059669; }
        .tm-badge-hmo.not-covered { color: #64748b; }
        .tm-reimb-sub { font-size: 10px; color: #64748b; }

        .tm-action-group { display: flex; gap: 6px; justify-content: center; }
        .tm-btn-action { border: 1px solid #cbd5e1; background: #fff; padding: 5px 9px; border-radius: 5px; font-size: 11px; font-weight: 600; cursor: pointer; transition: 0.15s; }
        .tm-btn-calc { border-color: #3b82f6; color: #2563eb; background: #eff6ff; }
        .tm-btn-calc:hover { background: #dbeafe; }
        .tm-btn-edit:hover { background: #f1f5f9; }

        .tm-pagination { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b; }
        .tm-page-controls { display: flex; gap: 8px; }

        /* Packages View */
        .tm-packages-intro { margin-bottom: 20px; }
        .tm-packages-intro h3 { margin: 0 0 4px; font-size: 18px; color: #0f172a; }
        .tm-packages-intro p { margin: 0; font-size: 13px; color: #64748b; }

        .tm-packages-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; }
        .tm-package-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); display: flex; flex-direction: column; }
        .tm-pkg-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .tm-pkg-code { font-family: monospace; font-size: 11px; font-weight: 700; color: #6d28d9; background: #f5f3ff; padding: 2px 6px; border-radius: 4px; }
        .tm-pkg-type { font-size: 11px; font-weight: 600; color: #2563eb; background: #eff6ff; padding: 2px 7px; border-radius: 999px; }
        .tm-pkg-title { margin: 0 0 6px; font-size: 16px; color: #0f172a; }
        .tm-pkg-desc { font-size: 12px; color: #64748b; margin: 0 0 16px; line-height: 1.4; flex: 1; }

        .tm-pkg-pricing { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border-radius: 8px; padding: 12px 14px; margin-bottom: 14px; }
        .tm-savings-pill { background: #d1fae5; color: #065f46; font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 6px; }

        .tm-pkg-features { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; font-size: 12px; color: #334155; }
        .tm-pkg-feat { display: flex; align-items: center; gap: 8px; }

        .tm-pkg-inc { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 8px 10px; font-size: 11px; color: #166534; margin-bottom: 16px; }

        /* Calculator View */
        .tm-calc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding: 24px; }
        .tm-calc-pane h3 { margin: 0 0 4px; font-size: 18px; color: #0f172a; }
        .tm-calc-pane p { margin: 0 0 20px; font-size: 13px; color: #64748b; }

        .tm-calc-checkboxes { display: flex; flex-direction: column; gap: 8px; }
        .tm-check-card { display: flex; gap: 12px; align-items: flex-start; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; cursor: pointer; }
        .tm-check-card:has(input:checked) { border-color: #2563eb; background: #f8fafc; }
        .tm-check-sub { font-size: 11px; color: #64748b; margin-top: 2px; }

        .tm-calc-actions { margin-top: 20px; }

        .tm-calc-result-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; }
        .tm-res-item { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
        .tm-res-item.surcharge { color: #dc2626; }
        .tm-res-item.divider { border-top: 1px solid #cbd5e1; padding-top: 10px; margin-top: 10px; }

        .tm-res-hero { text-align: center; background: #ecfdf5; border: 2px solid #a7f3d0; border-radius: 8px; padding: 18px; margin-top: 18px; }
        .tm-hero-label { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #065f46; margin-bottom: 4px; }
        .tm-hero-val { font-size: 32px; font-weight: 800; color: #047857; display: block; }
        .tm-hero-sub { font-size: 11px; color: #065f46; }

        .tm-empty-calc { text-align: center; padding: 48px 20px; color: #94a3b8; }
        .tm-empty-calc svg { width: 44px; height: 44px; margin-bottom: 12px; color: #cbd5e1; }

        /* Modal */
        .tm-modal-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 20px; box-sizing: border-box; }
        .tm-modal-box { background: #fff; width: 100%; max-width: 640px; max-height: 90vh; overflow-y: auto; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); }
        .tm-modal-lg { max-width: 840px; }
        .tm-modal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 18px 24px; border-bottom: 1px solid #e2e8f0; }
        .tm-modal-title h3 { margin: 0; font-size: 18px; color: #0f172a; }
        .tm-modal-title p { margin: 4px 0 0; font-size: 13px; color: #64748b; }
        .tm-modal-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #94a3b8; }

        .tm-form { padding: 20px 24px; }
        .tm-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .tm-field { display: flex; flex-direction: column; gap: 6px; }
        .tm-field.full { grid-column: 1 / -1; }
        .tm-field label { font-size: 12px; font-weight: 600; color: #334155; }
        .tm-modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0; }

        /* Package Detail Banner */
        .tm-pkg-detail-banner { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 24px; margin: 18px 24px 0; display: flex; justify-content: space-between; align-items: center; }
        .tm-pkg-badge-lg { font-size: 11px; font-weight: 700; color: #2563eb; background: #eff6ff; padding: 3px 8px; border-radius: 999px; }
        .tm-pkg-detail-banner h3 { margin: 8px 0 2px; font-size: 26px; color: #059669; }
        .tm-banner-sub { font-size: 12px; color: #64748b; }
        .tm-banner-features { font-size: 13px; display: flex; flex-direction: column; gap: 6px; text-align: right; }

        .tm-pkg-items-section { padding: 20px 24px 0; }
        .tm-pkg-items-section h4 { margin: 0 0 10px; font-size: 14px; color: #0f172a; }

        .tm-pkg-terms-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; padding: 16px 24px; }
        .tm-terms-box { border-radius: 6px; padding: 12px; font-size: 12px; }
        .tm-terms-box.inc { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
        .tm-terms-box.exc { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
        .tm-terms-box p { margin: 4px 0 0; }

        .tm-empty-state { text-align: center; padding: 48px 24px; color: #64748b; }
        .tm-empty-state svg { width: 44px; height: 44px; color: #cbd5e1; margin-bottom: 12px; }

        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-semibold { font-weight: 600; }
        .font-bold { font-weight: 700; }
        .text-primary { color: #2563eb; }
        .text-emerald { color: #059669; }
        .text-blue { color: #0284c7; }
        .text-purple { color: #7c3aed; }
        .text-danger { color: #dc2626; }
        .text-muted { color: #94a3b8; }
        .text-xl { font-size: 18px; }
    `;
    document.head.appendChild(style);
}
