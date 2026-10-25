import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cur = (v) => "$" + Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

let state = {
    view: "tariffs", // "tariffs" | "packages" | "enrollments" | "calculator"
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
    enrollmentsData: null,
    enrollmentMetrics: null,
    patientsList: []
};

export function TariffMasterView() {
    return `<div class="tm-root" id="tariffMasterRoot"><div class="tm-loading">Loading Hospital Master Tariff Book &amp; Packages…</div></div>`;
}

export async function initTariffMaster() {
    ensureCss();
    await loadData();
}

async function loadData() {
    const root = document.getElementById("tariffMasterRoot");
    if (!root) return;

    try {
        const [sumRes, tarRes, pkgRes, enrRes, enrMetRes] = await Promise.all([
            api("/tariffs/summary").catch(() => null),
            api(`/tariffs?page=${state.page}&per_page=${state.perPage}&category=${state.categoryFilter}&q=${encodeURIComponent(state.searchQuery)}`).catch(() => null),
            api("/tariffs/packages").catch(() => null),
            api("/package-enrollments").catch(() => null),
            api("/package-enrollments/summary").catch(() => null)
        ]);

        cache.summary = sumRes?.data || {};
        cache.tariffsData = tarRes?.data || { data: [], total: 0 };
        cache.packagesList = pkgRes?.data || [];
        cache.enrollmentsData = enrRes?.data || { data: [], total: 0 };
        cache.enrollmentMetrics = enrMetRes?.data || {};

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
    const enrollments = cache.enrollmentsData?.data || [];
    const enrM = cache.enrollmentMetrics || {};

    root.innerHTML = `
        <div class="tm-container">
            <!-- Header Bar -->
            <div class="tm-header">
                <div>
                    <h1 class="tm-title">Hospital Master Tariff Book &amp; Packages</h1>
                    <p class="tm-subtitle">Centralized Price Book: Consultations, Bedside Procedures, Bundled Health Packages &amp; Automated Overage Calculation</p>
                </div>
                <div class="tm-header-actions">
                    <a href="#/doctor-commissions" class="tm-btn tm-btn-secondary" style="text-decoration:none;">
                        👨‍⚕️ Doctor PF Schedules
                    </a>
                    <button class="tm-btn tm-btn-secondary" id="tmBtnSeedPackages" title="Seed realistic patient package enrollments with automated overages">
                        ⚡ Seed Package Enrollments Demo
                    </button>
                    <button class="tm-btn tm-btn-secondary" id="tmBtnSeedTariffs" title="Populate standard hospital procedures and services">
                        Seed Tariff Book
                    </button>
                    <button class="tm-btn tm-btn-secondary" id="tmBtnRefresh">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                        Refresh
                    </button>
                    <button class="tm-btn tm-btn-primary" id="tmBtnEnrollPatient">
                        + Enroll Patient in Package
                    </button>
                    <button class="tm-btn tm-btn-secondary" id="tmBtnNewTariff">
                        + New Tariff Item
                    </button>
                </div>
            </div>

            <!-- Executive KPI Ribbon -->
            <div class="tm-kpi-ribbon">
                <div class="tm-kpi-card">
                    <div class="tm-kpi-label">Master Tariff Catalog</div>
                    <div class="tm-kpi-val text-primary">${s.total_tariffs || 0}</div>
                    <div class="tm-kpi-sub">${s.count_active || 0} active in hospital price book</div>
                </div>

                <div class="tm-kpi-card">
                    <div class="tm-kpi-label">Bundled Package Profiles</div>
                    <div class="tm-kpi-val text-purple">${packages.length || 0}</div>
                    <div class="tm-kpi-sub">Maternity, Surgical &amp; Health Bundles</div>
                </div>

                <div class="tm-kpi-card">
                    <div class="tm-kpi-label">Patient Package Enrollments</div>
                    <div class="tm-kpi-val text-emerald">${enrM.total_enrollments || enrollments.length || 0}</div>
                    <div class="tm-kpi-sub">${enrM.count_active || 0} currently active in care</div>
                </div>

                <div class="tm-kpi-card">
                    <div class="tm-kpi-label">Total Package Revenue</div>
                    <div class="tm-kpi-val font-bold text-primary">${cur(enrM.total_package_revenue)}</div>
                    <div class="tm-kpi-sub">Base: ${cur(enrM.total_base_revenue)} &bull; Overage: <strong class="text-danger">+${cur(enrM.total_overage_revenue)}</strong></div>
                </div>
            </div>

            <!-- View Navigation Tabs -->
            <div class="tm-tabs-nav">
                <button class="tm-tab-nav-btn ${state.view === 'tariffs' ? 'active' : ''}" data-view="tariffs">
                    📋 Master Tariff Price Book (${s.total_tariffs || 0})
                </button>
                <button class="tm-tab-nav-btn ${state.view === 'packages' ? 'active' : ''}" data-view="packages">
                    📦 Bundled Packages Catalog (${packages.length})
                </button>
                <button class="tm-tab-nav-btn ${state.view === 'enrollments' ? 'active' : ''}" data-view="enrollments">
                    🏥 Patient Enrollments &amp; Overages (${enrollments.length})
                </button>
                <button class="tm-tab-nav-btn ${state.view === 'calculator' ? 'active' : ''}" data-view="calculator">
                    🧮 Surcharge &amp; Tax Estimator
                </button>
            </div>

            <!-- VIEW 1: TARIFFS PRICE BOOK -->
            ${state.view === 'tariffs' ? renderTariffsTableView(tariffs, totalTariffs, totalPages) : ''}

            <!-- VIEW 2: PACKAGES DIRECTORY -->
            ${state.view === 'packages' ? renderPackagesView(packages) : ''}

            <!-- VIEW 3: PATIENT PACKAGE ENROLLMENTS & OVERAGES -->
            ${state.view === 'enrollments' ? renderEnrollmentsView(enrollments, enrM) : ''}

            <!-- VIEW 4: INTERACTIVE SURCHARGE CALCULATOR -->
            ${state.view === 'calculator' ? renderCalculatorView() : ''}
        </div>

        <!-- MODAL CONTAINERS -->
        <div id="tmModalContainer"></div>
    `;

    bindEvents(root);
}

// -------------------------------------------------------------
// RENDER: PATIENT PACKAGE ENROLLMENTS & OVERAGE VIEW
// -------------------------------------------------------------
function renderEnrollmentsView(enrollments, enrM) {
    return `
        <div class="tm-card">
            <div class="tm-enrollment-banner">
                <div>
                    <h3>Patient Package Enrollments &amp; Automated Overage Ledger</h3>
                    <p>Automated reconciliation of hospital stays, OR minutes, and formulary medicines against fixed-price package limits.</p>
                </div>
                <div class="tm-enrollment-stats">
                    <div class="tm-stat-pill">
                        <span class="label">Overage Incident Rate:</span>
                        <strong>${enrM.overage_incident_rate || 0}% of cases</strong>
                    </div>
                    <div class="tm-stat-pill">
                        <span class="label">Total Overages Captured:</span>
                        <strong class="text-danger">${cur(enrM.total_overage_revenue)}</strong>
                    </div>
                </div>
            </div>

            ${enrollments.length === 0 ? `
                <div class="tm-empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="22" y1="11" x2="16" y2="11"></line></svg>
                    <h3>No Patient Package Enrollments Recorded</h3>
                    <p>Click "+ Enroll Patient in Package" or "Seed Package Enrollments Demo" to view automated overage calculations.</p>
                </div>
            ` : `
                <div class="tm-table-responsive">
                    <table class="tm-table">
                        <thead>
                            <tr>
                                <th>Enrollment #</th>
                                <th>Patient &amp; MRN</th>
                                <th>Package Profile</th>
                                <th class="text-right">Base Package Fee</th>
                                <th class="text-center">Bed Days (Act / Inc)</th>
                                <th class="text-center">OR Mins (Act / Inc)</th>
                                <th class="text-right">Meds (Act / Inc)</th>
                                <th class="text-right">Overage Charges</th>
                                <th class="text-right">Final Package Bill</th>
                                <th>Billing Status</th>
                                <th class="text-center">Overage Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${enrollments.map(enr => {
                                const hasBedOverage = (parseInt(enr.overage_bed_days, 10) || 0) > 0;
                                const hasOrOverage = (parseInt(enr.overage_or_minutes, 10) || 0) > 0;
                                const hasMedsOverage = (parseFloat(enr.overage_meds_amount) || 0) > 0;
                                const hasTotalOverage = (parseFloat(enr.total_overage_amount) || 0) > 0;

                                return `
                                    <tr>
                                        <td>
                                            <a href="javascript:void(0)" class="tm-enr-link tmBtnViewStatement" data-id="${enr.id}">
                                                <strong>${esc(enr.enrollment_number)}</strong>
                                            </a>
                                            <div class="tm-sub-date">${esc(enr.enrolled_date ? enr.enrolled_date.substring(0, 10) : '')}</div>
                                        </td>
                                        <td>
                                            <div class="tm-pat-name">${esc(enr.patient_name || 'Patient #' + enr.patient_id)}</div>
                                            <div class="tm-pat-mrn">MRN: ${esc(enr.patient_no || 'N/A')}</div>
                                        </td>
                                        <td>
                                            <div class="tm-pkg-name">${esc(enr.package_name)}</div>
                                            <span class="tm-tag-cat">${formatPackageType(enr.package_type)}</span>
                                        </td>
                                        <td class="text-right font-semibold">
                                            ${cur(enr.base_package_price)}
                                        </td>
                                        <td class="text-center">
                                            <span class="tm-usage-pill ${hasBedOverage ? 'overage' : 'normal'}">
                                                ${enr.actual_bed_days} / ${enr.included_bed_days} d
                                            </span>
                                            ${hasBedOverage ? `<div class="tm-ovg-sub">+${enr.overage_bed_days}d overage</div>` : ''}
                                        </td>
                                        <td class="text-center">
                                            <span class="tm-usage-pill ${hasOrOverage ? 'overage' : 'normal'}">
                                                ${enr.actual_or_minutes} / ${enr.included_or_minutes} m
                                            </span>
                                            ${hasOrOverage ? `<div class="tm-ovg-sub">+${enr.overage_or_minutes}m overage</div>` : ''}
                                        </td>
                                        <td class="text-right">
                                            <div>${cur(enr.actual_meds_charges)}</div>
                                            <div class="tm-sub-allowance">Limit: ${cur(enr.included_meds_allowance)}</div>
                                        </td>
                                        <td class="text-right font-bold ${hasTotalOverage ? 'text-danger' : 'text-muted'}">
                                            ${hasTotalOverage ? '+ ' + cur(enr.total_overage_amount) : '$0.00'}
                                        </td>
                                        <td class="text-right font-bold text-lg text-primary">
                                            ${cur(enr.final_total_package_bill)}
                                        </td>
                                        <td>
                                            ${enr.settlement_status === 'billed_to_folio' ? `
                                                <span class="tm-badge-hmo covered">✓ In Master Folio</span>
                                            ` : `
                                                <span class="tm-badge-tax taxable">Unbilled Draft</span>
                                            `}
                                        </td>
                                        <td class="text-center">
                                            <div class="tm-action-group">
                                                <button class="tm-btn-action tm-btn-calc tmBtnRecalcOverage" data-id="${enr.id}" title="Recalculate or Adjust Actual Usage">
                                                    ⚡ Overage
                                                </button>
                                                <button class="tm-btn-action tm-btn-edit tmBtnViewStatement" data-id="${enr.id}" title="View Itemized Overage Statement">
                                                    📋 Statement
                                                </button>
                                                ${enr.settlement_status !== 'billed_to_folio' ? `
                                                    <button class="tm-btn-action tm-btn-post tmBtnPostToFolio" data-id="${enr.id}" title="Post Base Fee + Overages to Master Folio">
                                                        📥 Post Folio
                                                    </button>
                                                ` : ''}
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join("")}
                        </tbody>
                    </table>
                </div>
            `}
        </div>
    `;
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
                    <p>Click "Seed Tariff Book" above to load standard institutional procedures and pricing.</p>
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
                <div>
                    <h3>Standard Hospital Bundled Service Packages</h3>
                    <p>Fixed-price procedure bundles covering operating room suites, surgeons, nursing, included bed stay, and medications with automated overage threshold rules.</p>
                </div>
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
                                    <span>Included: <strong>${pkg.included_bed_days} Bed Days</strong> (Overage: ${cur(pkg.overage_room_daily_rate)}/day)</span>
                                </div>
                                <div class="tm-pkg-feat">
                                    <span class="tm-feat-icon">⏱️</span>
                                    <span>Included: <strong>${pkg.included_or_minutes} OR Mins</strong> (Overage: ${cur(pkg.overage_or_hourly_rate)}/hr)</span>
                                </div>
                                <div class="tm-pkg-feat">
                                    <span class="tm-feat-icon">💊</span>
                                    <span>Included Meds: <strong>${cur(pkg.included_meds_allowance)}</strong> allowance</span>
                                </div>
                                <div class="tm-pkg-feat">
                                    <span class="tm-feat-icon">🔬</span>
                                    <span>Included Labs: <strong>${cur(pkg.included_lab_allowance)}</strong> allowance</span>
                                </div>
                            </div>

                            <div class="tm-pkg-footer">
                                <button class="tm-btn tm-btn-secondary tm-btn-full tmBtnViewPackageItems" data-id="${pkg.id}">
                                    View Component Items &amp; Thresholds &rarr;
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

    root.querySelector("#tmBtnNewTariff")?.addEventListener("click", () => {
        openTariffModal();
    });

    root.querySelector("#tmBtnEnrollPatient")?.addEventListener("click", () => {
        openEnrollPatientModal();
    });

    // Seed Demo Tariffs
    root.querySelector("#tmBtnSeedTariffs")?.addEventListener("click", async () => {
        const btn = root.querySelector("#tmBtnSeedTariffs");
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
            btn.innerText = "Seed Tariff Book";
        }
    });

    // Seed Demo Package Enrollments
    root.querySelector("#tmBtnSeedPackages")?.addEventListener("click", async () => {
        const btn = root.querySelector("#tmBtnSeedPackages");
        btn.disabled = true;
        btn.innerText = "Seeding Enrollments...";
        try {
            const res = await api("/package-enrollments/seed-demo", { method: "POST" });
            if (res && res.success) {
                showToast(res.message || "Package enrollments seeded successfully!", "success");
                state.view = "enrollments";
                await loadData();
            } else {
                showToast(res?.message || "Failed to seed package enrollments", "error");
            }
        } catch (e) {
            showToast(e.message || "Error seeding enrollments", "error");
        } finally {
            btn.disabled = false;
            btn.innerText = "⚡ Seed Package Enrollments Demo";
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

    // Enrollment Actions
    root.querySelectorAll(".tmBtnRecalcOverage").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.getAttribute("data-id"), 10);
            openRecalculateOverageModal(id);
        });
    });

    root.querySelectorAll(".tmBtnViewStatement").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.getAttribute("data-id"), 10);
            openOverageStatementModal(id);
        });
    });

    root.querySelectorAll(".tmBtnPostToFolio").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = parseInt(btn.getAttribute("data-id"), 10);
            if (!confirm("Post this package base price and itemized overage charges directly to the patient's Master Inpatient Folio?")) {
                return;
            }
            btn.disabled = true;
            btn.innerText = "Posting...";
            try {
                const res = await api("/package-enrollments/post-to-folio", {
                    method: "POST",
                    body: JSON.stringify({ enrollment_id: id })
                });
                if (res && res.success) {
                    showToast("Package charges posted to Master Folio successfully!", "success");
                    await loadData();
                } else {
                    showToast(res?.message || "Failed to post to folio", "error");
                    btn.disabled = false;
                    btn.innerText = "📥 Post Folio";
                }
            } catch (err) {
                showToast(err.message || "Network error", "error");
                btn.disabled = false;
                btn.innerText = "📥 Post Folio";
            }
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

// 1. Enroll Patient in Package Modal
async function openEnrollPatientModal() {
    const container = document.getElementById("tmModalContainer");
    if (!container) return;

    let candidatePatients = [];
    try {
        const cRes = await api("/refund-requests/candidates");
        candidatePatients = cRes?.data?.patients || [];
    } catch (e) {}

    const packages = cache.packagesList || [];

    container.innerHTML = `
        <div class="tm-modal-backdrop" id="tmEnrollBackdrop">
            <div class="tm-modal-box">
                <div class="tm-modal-header">
                    <div class="tm-modal-title">
                        <h3>Enroll Patient in Bundled Package</h3>
                        <p>Assign fixed-price procedure bundle with automated overage threshold rules</p>
                    </div>
                    <button class="tm-modal-close" id="tmBtnCloseEnroll">&times;</button>
                </div>

                <form id="tmFormEnroll" class="tm-form">
                    <div class="tm-form-grid">
                        <div class="tm-field full">
                            <label>Select Patient <span class="text-danger">*</span></label>
                            <select name="patient_id" class="tm-select" required>
                                <option value="">-- Choose Patient --</option>
                                ${candidatePatients.map(p => `
                                    <option value="${p.id}">${esc(p.patient_name)} (${esc(p.patient_no || 'MRN-' + p.id)})</option>
                                `).join("")}
                            </select>
                        </div>

                        <div class="tm-field full">
                            <label>Select Bundled Package <span class="text-danger">*</span></label>
                            <select name="package_id" class="tm-select" id="tmSelectPackage" required>
                                <option value="">-- Choose Package --</option>
                                ${packages.map(p => `
                                    <option value="${p.id}">
                                        ${esc(p.package_code)}: ${esc(p.package_name)} (${cur(p.discounted_price)} - ${p.included_bed_days}d Bed / ${p.included_or_minutes}m OR)
                                    </option>
                                `).join("")}
                            </select>
                        </div>

                        <div class="tm-field full">
                            <label>Admission / Master Folio ID (Optional)</label>
                            <input type="number" name="admission_id" class="tm-input" placeholder="e.g. 1">
                        </div>

                        <div class="tm-field full">
                            <label>Clinical Intake / Package Terms Notes</label>
                            <textarea name="notes" class="tm-textarea" rows="2" placeholder="e.g. Patient agreed to 2-day maternity package; explained overage room daily rates."></textarea>
                        </div>
                    </div>

                    <div class="tm-modal-footer">
                        <button type="button" class="tm-btn tm-btn-secondary" id="tmBtnCancelEnroll">Cancel</button>
                        <button type="submit" class="tm-btn tm-btn-primary" id="tmBtnSubmitEnroll">
                            Confirm Package Enrollment &rarr;
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const close = () => { container.innerHTML = ""; };
    container.querySelector("#tmBtnCloseEnroll")?.addEventListener("click", close);
    container.querySelector("#tmBtnCancelEnroll")?.addEventListener("click", close);

    const form = container.querySelector("#tmFormEnroll");
    form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = form.querySelector("#tmBtnSubmitEnroll");
        btn.disabled = true;
        btn.innerText = "Enrolling...";

        try {
            const formData = new FormData(form);
            const payload = Object.fromEntries(formData.entries());

            const res = await api("/package-enrollments", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            if (res && res.success) {
                showToast("Patient enrolled in bundled package successfully!", "success");
                close();
                state.view = "enrollments";
                await loadData();
            } else {
                showToast(res?.message || "Failed to enroll patient", "error");
                btn.disabled = false;
                btn.innerText = "Confirm Package Enrollment →";
            }
        } catch (err) {
            showToast(err.message || "Network error", "error");
            btn.disabled = false;
            btn.innerText = "Confirm Package Enrollment →";
        }
    });
}

// 2. Recalculate & Adjust Package Overages Modal
async function openRecalculateOverageModal(enrollmentId) {
    const container = document.getElementById("tmModalContainer");
    if (!container) return;

    let enr = null;
    try {
        const res = await api(`/package-enrollments/detail?id=${enrollmentId}`);
        enr = res?.data;
    } catch (e) {
        showToast("Error loading enrollment details", "error");
        return;
    }

    if (!enr) return;

    container.innerHTML = `
        <div class="tm-modal-backdrop" id="tmOverageBackdrop">
            <div class="tm-modal-box tm-modal-lg">
                <div class="tm-modal-header">
                    <div class="tm-modal-title">
                        <h3>Automated Overage Engine &bull; ${esc(enr.enrollment_number)}</h3>
                        <p>Patient: <strong>${esc(enr.patient_name)}</strong> &bull; Package: <strong>${esc(enr.package_name)}</strong></p>
                    </div>
                    <button class="tm-modal-close" id="tmBtnCloseOverage">&times;</button>
                </div>

                <div class="tm-ovg-rules-banner">
                    <div class="tm-rule-box">
                        <span class="label">Included Bed Days:</span>
                        <strong>${enr.included_bed_days} Days</strong>
                        <div class="sub">Overage: ${cur(enr.overage_room_daily_rate)}/day room + ${cur(enr.overage_nursing_daily_rate)}/day nurse</div>
                    </div>
                    <div class="tm-rule-box">
                        <span class="label">Included OR Time:</span>
                        <strong>${enr.included_or_minutes} Minutes</strong>
                        <div class="sub">Overage: ${cur(enr.overage_or_hourly_rate)}/hour</div>
                    </div>
                    <div class="tm-rule-box">
                        <span class="label">Included Meds Allowance:</span>
                        <strong>${cur(enr.included_meds_allowance)}</strong>
                        <div class="sub">100% of excess billed to patient</div>
                    </div>
                    <div class="tm-rule-box">
                        <span class="label">Included Lab Allowance:</span>
                        <strong>${cur(enr.included_labs_allowance)}</strong>
                        <div class="sub">100% of excess billed to patient</div>
                    </div>
                </div>

                <form id="tmFormOverage" class="tm-form">
                    <input type="hidden" name="enrollment_id" value="${enr.id}">

                    <div class="tm-form-grid">
                        <div class="tm-field">
                            <label>Actual Total Inpatient Bed Days <span class="text-danger">*</span></label>
                            <input type="number" name="actual_bed_days" class="tm-input font-bold" min="1" value="${enr.actual_bed_days || 1}" required>
                            <span class="tm-input-help">Package includes ${enr.included_bed_days} days</span>
                        </div>

                        <div class="tm-field">
                            <label>Actual Operating Room Minutes <span class="text-danger">*</span></label>
                            <input type="number" name="actual_or_minutes" class="tm-input font-bold" min="0" value="${enr.actual_or_minutes || 0}" required>
                            <span class="tm-input-help">Package includes ${enr.included_or_minutes} mins</span>
                        </div>

                        <div class="tm-field">
                            <label>Actual Pharmacy Medications Dispensed ($)</label>
                            <input type="number" step="0.01" min="0" name="actual_meds_charges" class="tm-input" value="${enr.actual_meds_charges || '0.00'}">
                            <span class="tm-input-help">Package allowance: ${cur(enr.included_meds_allowance)}</span>
                        </div>

                        <div class="tm-field">
                            <label>Actual Diagnostic Lab Charges ($)</label>
                            <input type="number" step="0.01" min="0" name="actual_labs_charges" class="tm-input" value="${enr.actual_labs_charges || '0.00'}">
                            <span class="tm-input-help">Package allowance: ${cur(enr.included_labs_allowance)}</span>
                        </div>

                        <div class="tm-field full">
                            <label>Additional Unbundled Add-ons / Complications ($)</label>
                            <input type="number" step="0.01" min="0" name="other_addons_amount" class="tm-input" value="${enr.other_addons_amount || '0.00'}" placeholder="0.00">
                            <span class="tm-input-help">Specialist consultations, unexpected minor procedures not covered in package</span>
                        </div>
                    </div>

                    <div class="tm-modal-footer">
                        <button type="button" class="tm-btn tm-btn-secondary" id="tmBtnCancelOverage">Cancel</button>
                        <button type="button" class="tm-btn tm-btn-secondary" id="tmBtnAutoSyncAdmission">
                            🔄 Auto-Sync Stay from Inpatient Admission
                        </button>
                        <button type="submit" class="tm-btn tm-btn-primary" id="tmBtnSaveOverage">
                            ⚡ Recalculate &amp; Lock Overages &rarr;
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const close = () => { container.innerHTML = ""; };
    container.querySelector("#tmBtnCloseOverage")?.addEventListener("click", close);
    container.querySelector("#tmBtnCancelOverage")?.addEventListener("click", close);

    // Auto sync from admission
    container.querySelector("#tmBtnAutoSyncAdmission")?.addEventListener("click", async () => {
        const btn = container.querySelector("#tmBtnAutoSyncAdmission");
        btn.disabled = true;
        btn.innerText = "Syncing Stay...";
        try {
            const res = await api("/package-enrollments/sync", {
                method: "POST",
                body: JSON.stringify({ enrollment_id: enr.id })
            });
            if (res && res.success) {
                showToast("Synced actual stay and recalculated overages!", "success");
                close();
                await loadData();
            } else {
                showToast(res?.message || "Sync failed", "error");
                btn.disabled = false;
                btn.innerText = "🔄 Auto-Sync Stay from Inpatient Admission";
            }
        } catch (err) {
            showToast(err.message || "Network error", "error");
            btn.disabled = false;
            btn.innerText = "🔄 Auto-Sync Stay from Inpatient Admission";
        }
    });

    const form = container.querySelector("#tmFormOverage");
    form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = form.querySelector("#tmBtnSaveOverage");
        btn.disabled = true;
        btn.innerText = "Recalculating...";

        try {
            const formData = new FormData(form);
            const payload = Object.fromEntries(formData.entries());

            const res = await api("/package-enrollments/calculate-overages", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            if (res && res.success) {
                showToast("Package overages updated successfully!", "success");
                close();
                await loadData();
            } else {
                showToast(res?.message || "Recalculation failed", "error");
                btn.disabled = false;
                btn.innerText = "⚡ Recalculate & Lock Overages →";
            }
        } catch (err) {
            showToast(err.message || "Network error", "error");
            btn.disabled = false;
            btn.innerText = "⚡ Recalculate & Lock Overages →";
        }
    });
}

// 3. Itemized Overage Statement Modal & Printable Patient Slip
async function openOverageStatementModal(enrollmentId) {
    const container = document.getElementById("tmModalContainer");
    if (!container) return;

    let enr = null;
    try {
        const res = await api(`/package-enrollments/detail?id=${enrollmentId}`);
        enr = res?.data;
    } catch (e) {
        showToast("Error loading enrollment", "error");
        return;
    }

    if (!enr) return;

    const items = enr.overage_items || [];

    container.innerHTML = `
        <div class="tm-modal-backdrop" id="tmStmtBackdrop">
            <div class="tm-modal-box tm-modal-lg">
                <div class="tm-modal-header">
                    <div class="tm-modal-title">
                        <h3>Package Billing &amp; Itemized Overage Statement</h3>
                        <p>Enrollment: <strong>${esc(enr.enrollment_number)}</strong> &bull; Patient: <strong>${esc(enr.patient_name)}</strong> (MRN: ${esc(enr.patient_no || 'N/A')})</p>
                    </div>
                    <button class="tm-modal-close" id="tmBtnCloseStmt">&times;</button>
                </div>

                <div class="tm-stmt-hero">
                    <div class="tm-stmt-grid">
                        <div class="tm-stmt-box">
                            <span class="label">BASE PACKAGE PRICE</span>
                            <div class="val">${cur(enr.base_package_price)}</div>
                            <span class="sub">${esc(enr.package_name)}</span>
                        </div>
                        <div class="tm-stmt-box overage">
                            <span class="label">+ TOTAL OVERAGE CHARGES</span>
                            <div class="val text-danger">+ ${cur(enr.total_overage_amount)}</div>
                            <span class="sub">${items.length} overage line item(s)</span>
                        </div>
                        <div class="tm-stmt-box final">
                            <span class="label">= FINAL RECONCILED BILL</span>
                            <div class="val text-emerald">${cur(enr.final_total_package_bill)}</div>
                            <span class="sub">${enr.settlement_status === 'billed_to_folio' ? '✓ Posted to Master Folio' : 'Unbilled Package Draft'}</span>
                        </div>
                    </div>
                </div>

                <div class="tm-stmt-breakdown">
                    <h4>Itemized Package Overage Charges Breakdown</h4>
                    ${items.length === 0 ? `
                        <div class="tm-empty-overage">
                            <span class="text-emerald font-bold">✓ ZERO OVERAGE CHARGES</span>
                            <p>Patient stay and consumption remained strictly within package inclusions (${enr.included_bed_days} days, ${enr.included_or_minutes} OR mins, ${cur(enr.included_meds_allowance)} meds allowance).</p>
                        </div>
                    ` : `
                        <table class="tm-table">
                            <thead>
                                <tr>
                                    <th>Overage Category</th>
                                    <th>Item Description</th>
                                    <th>Package Limit</th>
                                    <th>Actual Usage</th>
                                    <th class="text-center">Excess Units</th>
                                    <th class="text-right">Unit Rate</th>
                                    <th class="text-right">Total Overage</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map(it => `
                                    <tr>
                                        <td><span class="tm-tag-cat">${esc(it.overage_type)}</span></td>
                                        <td>
                                            <strong>${esc(it.item_description)}</strong>
                                            ${it.notes ? `<div class="tm-sub-meta">${esc(it.notes)}</div>` : ''}
                                        </td>
                                        <td>${esc(it.included_limit || '—')}</td>
                                        <td>${esc(it.actual_usage || '—')}</td>
                                        <td class="text-center font-bold text-danger">+${it.excess_units}</td>
                                        <td class="text-right">${cur(it.unit_rate)}</td>
                                        <td class="text-right font-bold text-danger text-lg">${cur(it.total_overage_charge)}</td>
                                    </tr>
                                `).join("")}
                            </tbody>
                        </table>
                    `}
                </div>

                <div class="tm-modal-footer">
                    <button type="button" class="tm-btn tm-btn-secondary" id="tmBtnCloseStmtFooter">Close</button>
                    <button type="button" class="tm-btn tm-btn-primary" id="tmBtnPrintPkgStatement">
                        🖨 Print Official Package Statement Slip
                    </button>
                </div>
            </div>
        </div>
    `;

    const close = () => { container.innerHTML = ""; };
    container.querySelector("#tmBtnCloseStmt")?.addEventListener("click", close);
    container.querySelector("#tmBtnCloseStmtFooter")?.addEventListener("click", close);

    container.querySelector("#tmBtnPrintPkgStatement")?.addEventListener("click", () => {
        printPackageStatementSlip(enr, items);
    });
}

function printPackageStatementSlip(enr, items) {
    const w = window.open("", "_blank", "width=850,height=750");
    w.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Package Statement - ${esc(enr.enrollment_number)}</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 35px; color: #1e293b; }
                .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
                .header h1 { margin: 0; font-size: 22px; }
                .header p { margin: 4px 0 0; color: #64748b; font-size: 13px; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; font-size: 13px; }
                .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; }
                .box label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; display: block; margin-bottom: 4px; }
                .summary-card { background: #f8fafc; border: 2px solid #0f172a; border-radius: 8px; padding: 15px; margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr 1fr; text-align: center; }
                .summary-card .val { font-size: 22px; font-weight: bold; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
                th, td { border: 1px solid #cbd5e1; padding: 8px 10px; }
                th { background: #f8fafc; text-align: left; }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; text-align: center; font-size: 12px; }
                .sig-line { border-top: 1px solid #0f172a; padding-top: 6px; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>HOSPITAL BUNDLED SERVICE PACKAGE STATEMENT</h1>
                <p>USIntellix Healthcare System &bull; Patient Accounting &amp; Revenue Services</p>
                <p>Enrollment: <strong>${esc(enr.enrollment_number)}</strong> &bull; Date: ${esc(enr.enrolled_date ? enr.enrolled_date.substring(0, 10) : '')}</p>
            </div>

            <div class="grid">
                <div class="box">
                    <label>Patient Information</label>
                    <div><strong>${esc(enr.patient_name)}</strong></div>
                    <div>MRN: ${esc(enr.patient_no || 'N/A')}</div>
                </div>
                <div class="box">
                    <label>Package Assigned</label>
                    <div><strong>${esc(enr.package_name)}</strong> (${esc(enr.package_code)})</div>
                    <div>Included Stay: ${enr.included_bed_days} Days (${esc(enr.included_room_type || 'Ward')})</div>
                </div>
            </div>

            <div class="summary-card">
                <div>
                    <div>Base Package Price</div>
                    <div class="val">${cur(enr.base_package_price)}</div>
                </div>
                <div>
                    <div>Total Overage Charges</div>
                    <div class="val" style="color: #dc2626;">+ ${cur(enr.total_overage_amount)}</div>
                </div>
                <div>
                    <div>Final Total Bill</div>
                    <div class="val" style="color: #059669;">${cur(enr.final_total_package_bill)}</div>
                </div>
            </div>

            <h3>Itemized Overage Charges Breakdown</h3>
            ${items.length === 0 ? `
                <p><em>No overages incurred. Patient stayed and consumed strictly within package limits.</em></p>
            ` : `
                <table>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Package Limit</th>
                            <th>Actual Usage</th>
                            <th class="text-center">Excess Units</th>
                            <th class="text-right">Unit Rate</th>
                            <th class="text-right">Total Overage</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(it => `
                            <tr>
                                <td><strong>${esc(it.item_description)}</strong></td>
                                <td>${esc(it.included_limit || '—')}</td>
                                <td>${esc(it.actual_usage || '—')}</td>
                                <td class="text-center">+${it.excess_units}</td>
                                <td class="text-right">${cur(it.unit_rate)}</td>
                                <td class="text-right" style="color: #dc2626; font-weight: bold;">${cur(it.total_overage_charge)}</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            `}

            <div class="signatures">
                <div>
                    <div style="height: 35px;"></div>
                    <div class="sig-line">${esc(enr.enrolled_by_name || 'Billing Officer')}</div>
                    <div>Hospital Billing Specialist</div>
                </div>
                <div>
                    <div style="height: 35px;"></div>
                    <div class="sig-line">${esc(enr.patient_name)}</div>
                    <div>Patient / Guarantor Acknowledgment</div>
                </div>
            </div>
            <script>window.print();</script>
        </body>
        </html>
    `);
    w.document.close();
}

// 4. Add / Edit Tariff Modal
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

// 5. Package Detail Modal
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

                <div class="tm-pkg-terms-grid">
                    <div class="tm-terms-box inc">
                        <strong>Official Inclusions:</strong>
                        <p>${esc(pkg.inclusions_summary || 'All listed items')}</p>
                    </div>
                    <div class="tm-terms-box exc">
                        <strong>Package Exclusions (Billed as Overage):</strong>
                        <p>${esc(pkg.exclusions_summary || 'Extra bed days, extended OR time, medications beyond allowance')}</p>
                    </div>
                </div>

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
        .tm-tabs-nav { display: flex; gap: 8px; margin-bottom: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; overflow-x: auto; }
        .tm-tab-nav-btn { background: none; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; color: #64748b; cursor: pointer; white-space: nowrap; }
        .tm-tab-nav-btn:hover { background: #f1f5f9; color: #0f172a; }
        .tm-tab-nav-btn.active { background: #0f172a; color: #fff; }

        .tm-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); overflow: hidden; }

        /* Enrollment Banner */
        .tm-enrollment-banner { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; flex-wrap: wrap; gap: 12px; }
        .tm-enrollment-banner h3 { margin: 0 0 2px; font-size: 16px; color: #0f172a; }
        .tm-enrollment-banner p { margin: 0; font-size: 12px; color: #64748b; }
        .tm-enrollment-stats { display: flex; gap: 12px; }
        .tm-stat-pill { background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 12px; font-size: 12px; }
        .tm-stat-pill .label { color: #64748b; margin-right: 4px; }

        .tm-enr-link { color: #2563eb; text-decoration: none; font-size: 13px; }
        .tm-enr-link:hover { text-decoration: underline; }
        .tm-sub-date { font-size: 10px; color: #94a3b8; }
        .tm-pat-name { font-weight: 600; color: #0f172a; }
        .tm-pat-mrn { font-size: 11px; color: #64748b; }
        .tm-pkg-name { font-weight: 600; color: #0f172a; font-size: 12px; }
        .tm-sub-allowance { font-size: 10px; color: #64748b; }

        .tm-usage-pill { display: inline-block; padding: 2px 7px; border-radius: 999px; font-size: 11px; font-weight: 700; }
        .tm-usage-pill.normal { background: #f1f5f9; color: #475569; }
        .tm-usage-pill.overage { background: #fee2e2; color: #991b1b; }
        .tm-ovg-sub { font-size: 10px; color: #dc2626; font-weight: 600; }

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
        .tm-btn-post { border-color: #10b981; color: #065f46; background: #ecfdf5; }
        .tm-btn-post:hover { background: #d1fae5; }

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
        .tm-modal-lg { max-width: 860px; }
        .tm-modal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 18px 24px; border-bottom: 1px solid #e2e8f0; }
        .tm-modal-title h3 { margin: 0; font-size: 18px; color: #0f172a; }
        .tm-modal-title p { margin: 4px 0 0; font-size: 13px; color: #64748b; }
        .tm-modal-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #94a3b8; }

        .tm-form { padding: 20px 24px; }
        .tm-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .tm-field { display: flex; flex-direction: column; gap: 6px; }
        .tm-field.full { grid-column: 1 / -1; }
        .tm-field label { font-size: 12px; font-weight: 600; color: #334155; }
        .tm-input-help { font-size: 11px; color: #64748b; }
        .tm-modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0; }

        /* Overage Rules Banner */
        .tm-ovg-rules-banner { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; padding: 14px 24px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
        .tm-rule-box { border: 1px solid #e2e8f0; background: #fff; border-radius: 6px; padding: 10px; }
        .tm-rule-box .label { font-size: 11px; color: #64748b; display: block; margin-bottom: 2px; }
        .tm-rule-box strong { font-size: 14px; color: #0f172a; display: block; }
        .tm-rule-box .sub { font-size: 10px; color: #94a3b8; margin-top: 2px; }

        /* Statement Hero */
        .tm-stmt-hero { padding: 16px 24px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
        .tm-stmt-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; text-align: center; }
        .tm-stmt-box { border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; padding: 14px; }
        .tm-stmt-box.overage { border-color: #fca5a5; background: #fffdfd; }
        .tm-stmt-box.final { border-color: #6ee7b7; background: #f0fdf4; }
        .tm-stmt-box .label { font-size: 11px; font-weight: 700; color: #64748b; display: block; margin-bottom: 4px; }
        .tm-stmt-box .val { font-size: 24px; font-weight: 800; }
        .tm-stmt-box .sub { font-size: 11px; color: #64748b; }

        .tm-stmt-breakdown { padding: 18px 24px; }
        .tm-stmt-breakdown h4 { margin: 0 0 12px; font-size: 15px; color: #0f172a; }
        .tm-empty-overage { text-align: center; padding: 24px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; color: #166534; }

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
        .text-lg { font-size: 15px; }
    `;
    document.head.appendChild(style);
}
