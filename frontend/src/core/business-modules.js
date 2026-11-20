import { api } from "./api.js";

const STORAGE_KEY = "intellix_business_modules_v1";

/**
 * Exact mapping of dashboard data-tab IDs to business module keys.
 * Any tab not listed here defaults to core platform access so core EHR,
 * profile, settings, and help always remain reachable.
 */
const TAB_TO_MODULE = {
    // Scheduling
    appointments: "scheduling",
    clinic_schedules: "scheduling",
    duty_rosters: "scheduling",
    recalls: "scheduling",
    admin_clinic_calendar: "scheduling",
    admin_clinic_import_holidays: "scheduling",
    admin_patient_reminders: "scheduling",
    popup_appointments: "scheduling",

    // Inpatient & Bed Management (ADT)
    inpatient_admissions: "inpatient_adt",
    inpatient_vitals: "inpatient_adt",
    nurse_assignments: "inpatient_adt",
    room_management: "inpatient_adt",
    census: "inpatient_adt",
    census_report: "inpatient_adt",
    visitor_management: "inpatient_adt",
    nursing_staff: "inpatient_adt",

    // Emergency Room & Code Blue
    er: "emergency_room",
    er_report: "emergency_room",
    code_blue: "emergency_room",
    code_blue_report: "emergency_room",

    // ICU & Critical Care
    icu: "icu",
    icu_report: "icu",

    // Operating Room & Surgery
    or_board: "operating_room",
    or_schedule: "operating_room",
    or_management: "operating_room",
    surgery_requests: "operating_room",
    or_reports: "operating_room",
    surgeries: "operating_room",

    // Care Coordination
    carecoordination: "care_coordination",

    // Laboratory & Pathology
    lab_worklist: "laboratory",
    lab_report: "laboratory",
    procedure_lab_overview: "laboratory",
    procedure_batch_results: "laboratory",
    procedure_electronic_reports: "laboratory",
    procedure_lab_documents: "laboratory",
    lab_critical_ranges: "laboratory",
    procedure_load_compendium: "laboratory",
    procedure_pending_review: "laboratory",
    procedure_patient_results: "laboratory",
    providers: "laboratory",
    procedure_configuration: "laboratory",
    specimen_sites: "laboratory",
    specimen_methods: "laboratory",
    specimen_types: "laboratory",
    specimen_conditions: "laboratory",

    // Radiology & DICOM Imaging
    rad_worklist: "radiology",
    rad_report: "radiology",
    misc_dicom_viewer: "radiology",

    // Blood Bank
    blood_bank: "blood_bank",

    // Dietary & Nutrition
    dietary: "dietary",

    // Pharmacy, Dispensing & MAR
    pharmacy_dashboard: "pharmacy",
    pharmacy_dispensing: "pharmacy",
    pharmacy_reports: "pharmacy",
    med_verification: "pharmacy",
    mar: "pharmacy",
    dd_register: "pharmacy",
    ward_cabinet: "pharmacy",
    restock_queue: "pharmacy",
    ward_stock_report: "pharmacy",
    inventory_management: "pharmacy",
    medication_management: "pharmacy",
    inventory_warehouses: "pharmacy",
    inventory_destroyed: "pharmacy",
    dosage_forms: "pharmacy",
    drug_categories: "pharmacy",
    administration_routes: "pharmacy",
    amount_units: "pharmacy",

    // Procurement, Non-Pharma Supplies & CSSD
    supply_catalog: "procurement_supplies",
    goods_receipt: "procurement_supplies",
    cssd: "procurement_supplies",
    pharmacy_requisitions: "procurement_supplies",
    pharmacy_purchase_orders: "procurement_supplies",
    pharmacy_receiving: "procurement_supplies",
    pharmacy_suppliers: "procurement_supplies",
    pharmacy_supplier_prices: "procurement_supplies",
    pharmacy_supplier_invoices: "procurement_supplies",
    pharmacy_supplier_returns: "procurement_supplies",
    pharmacy_payables: "procurement_supplies",
    pharmacy_stock_transfers: "procurement_supplies",
    pharmacy_medicine_ledger: "procurement_supplies",
    pharmacy_lot_trace: "procurement_supplies",
    pharmacy_stock_levels: "procurement_supplies",
    pharmacy_stock_counts: "procurement_supplies",
    pharmacy_procurement_reports: "procurement_supplies",

    // Billing, Cashiering & Revenue Cycle
    inpatient_billing: "billing_finance",
    split_cashiering: "billing_finance",
    patient_deposits: "billing_finance",
    fee_sheet: "billing_finance",
    checkout: "billing_finance",
    payment: "billing_finance",
    portal_payments: "billing_finance",
    batch_payments: "billing_finance",
    posting_payments: "billing_finance",
    refund_authorization: "billing_finance",
    billing_manager: "billing_finance",
    claim_denials: "billing_finance",
    ar_aging: "billing_finance",
    tariff_master: "billing_finance",
    facility_billings: "billing_finance",
    edi_history: "billing_finance",
    billing: "billing_finance",
    popup_superbill: "billing_finance",
    popup_payment: "billing_finance",
    popup_checkout: "billing_finance",

    // Reports, Executive BI & Regulatory
    clinic_quality_dashboard: "reports_analytics",
    clinic_safety_scorecard: "reports_analytics",
    reports_financial_bi: "reports_analytics",
    reports_departmental_profitability: "reports_analytics",
    reports_claim_denial_pareto: "reports_analytics",
    reports_financial_sales: "reports_analytics",
    reports_financial_cash_rec: "reports_analytics",
    reports_financial_collections: "reports_analytics",
    reports_financial_summary_service_code: "reports_analytics",
    reports_financial_payment_processing: "reports_analytics",
    reports_financial_prepayment_balances: "reports_analytics",
    reports_financial_pat_ledger: "reports_analytics",
    reports_financial_front_rec: "reports_analytics",
    reports_financial_pmt_method: "reports_analytics",
    clinical_reports: "reports_analytics",
    clinic_incident_log: "reports_analytics",
    clinic_critical_tat: "reports_analytics",
    clinic_hai_ssi: "reports_analytics",
    clinic_readmission_mortality: "reports_analytics",
    clinic_surgical_safety: "reports_analytics",
    clinic_alerts_log: "reports_analytics",
    clinic_report_results: "reports_analytics",
    clinic_standard_measures: "reports_analytics",
    clinic_automated_measures: "reports_analytics",
    clinic_real_world_testing: "reports_analytics",
    regulatory_disease_surveillance: "reports_analytics",
    regulatory_ahsr_export: "reports_analytics",
    immunization_registry: "reports_analytics",
    reports_visits_daily: "reports_analytics",
    reports_visits_encounters: "reports_analytics",
    reports_visits_appointments: "reports_analytics",
    reports_visits_flow_board: "reports_analytics",
    reports_visits_chart_activity: "reports_analytics",
    reports_visits_charts_out: "reports_analytics",
    reports_visits_services: "reports_analytics",
    reports_visits_superbill: "reports_analytics",
    reports_visits_eligibility: "reports_analytics",
    reports_visits_eligibility_response: "reports_analytics",
    reports_visits_syndromic_surveillance: "reports_analytics",
    reports_visits_appt_enc: "reports_analytics",
    reports_inventory_list: "reports_analytics",
    reports_inventory_activity: "reports_analytics",
    reports_inventory_transactions: "reports_analytics",
    clients_list: "reports_analytics",
    clients_rx: "reports_analytics",
    patient_list_creation: "reports_analytics",
    message_list: "reports_analytics",
    referrals_reports: "reports_analytics",
    reports_procedures_pending_res: "reports_analytics",
    reports_procedures_statistics: "reports_analytics",
    reports_insurance_distribution: "reports_analytics",
    reports_insurance_indigents: "reports_analytics",
    reports_insurance_unique_sp: "reports_analytics",
    services_background: "reports_analytics",
    services_direct_message_log: "reports_analytics",
    services_ip_tracker: "reports_analytics",

    // HIPAA Compliance & Security Governance
    hipaa_officers: "hipaa_compliance",
    hipaa_audit: "hipaa_compliance",
    audit_trail_diffs: "hipaa_compliance",
    security_incidents: "hipaa_compliance",
    misc_security_incidents: "hipaa_compliance",
    business_associates: "hipaa_compliance",
    drs_requests: "hipaa_compliance",
    amendments: "hipaa_compliance",
    backup_recovery: "hipaa_compliance",
    workforce_governance: "hipaa_compliance",
    safe_harbor: "hipaa_compliance",
    misc_disclosures: "hipaa_compliance",

    // Human Resources & Payroll
    attendance: "hr_workforce",
    leave_management: "hr_workforce",
    salary_structures: "hr_workforce",
    payroll: "hr_workforce",
    cme: "hr_workforce",
    life_support: "hr_workforce",
    performance_evaluations: "hr_workforce",

    // Biomedical Assets & TV Queue Displays
    equipment_assets: "equipment_facilities",
    display_devices: "equipment_facilities",
    department_org: "equipment_facilities",

    // Patient Portal & Online Check-in
    portal_checkins: "patient_portal",
    portal_proxy_requests: "patient_portal",
    portal_explanations: "patient_portal",
    portal_diagnosis_guides: "patient_portal",
    portal_uploads: "patient_portal",
    portal_insurance_requests: "patient_portal",
    portal_questionnaires: "patient_portal",
    portal_care_gaps: "patient_portal",
    portal_estimates: "patient_portal",
    portal_fastpass: "patient_portal",
    portal_evisits: "patient_portal",
    portal_chart: "patient_portal",
    portal_reading_imports: "patient_portal",
    misc_portal_dashboard: "patient_portal"
};

let modulesCache = null;
let presetsCache = [];
let enabledMap = new Map();

function hydrateFromStorage() {
    if (modulesCache) return;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            setModulesState(parsed, false);
        }
    } catch (_) {
        // ignore storage errors
    }
}

function setModulesState(modules, persist = true) {
    modulesCache = Array.isArray(modules) ? modules : [];
    enabledMap = new Map();
    for (const m of modulesCache) {
        enabledMap.set(m.module_key, m.is_core ? true : Boolean(m.is_enabled));
    }
    if (persist) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(modulesCache));
        } catch (_) {
            // ignore storage errors
        }
    }
}

export function getCachedModules() {
    hydrateFromStorage();
    return modulesCache || [];
}

export function getCachedPresets() {
    return presetsCache;
}

export function getModuleKeyForTab(tabId) {
    return TAB_TO_MODULE[tabId] || null;
}

export function isModuleEnabled(moduleKey) {
    hydrateFromStorage();
    if (!moduleKey) return true;
    if (enabledMap.size === 0) return true;
    return enabledMap.get(moduleKey) !== false;
}

export function isTabEnabled(tabId) {
    if (!tabId) return true;
    if (tabId === "manage_modules") return true;
    const key = getModuleKeyForTab(tabId);
    return isModuleEnabled(key);
}

export async function loadBusinessModules(forceRefresh = false) {
    hydrateFromStorage();
    if (!forceRefresh && modulesCache && modulesCache.length > 0 && presetsCache.length > 0) {
        return { modules: modulesCache, presets: presetsCache };
    }

    const res = await api("/business-modules", { method: "GET" });
    if (res && res.success && res.data) {
        setModulesState(res.data.modules || [], true);
        presetsCache = res.data.presets || [];
        applyModuleVisibilityToNavbar();
        return { modules: modulesCache, presets: presetsCache };
    }

    return { modules: modulesCache || [], presets: presetsCache };
}

export async function saveBusinessModules(moduleStates) {
    const res = await api("/business-modules", {
        method: "PUT",
        body: JSON.stringify({ modules: moduleStates })
    });

    if (res && res.success && res.data?.modules) {
        setModulesState(res.data.modules, true);
        applyModuleVisibilityToNavbar();
        window.dispatchEvent(new CustomEvent("businessModulesUpdated", { detail: modulesCache }));
    }

    return res;
}

export async function applyBusinessModulePreset(presetKey) {
    const res = await api("/business-modules/preset", {
        method: "POST",
        body: JSON.stringify({ preset: presetKey })
    });

    if (res && res.success && res.data?.modules) {
        setModulesState(res.data.modules, true);
        applyModuleVisibilityToNavbar();
        window.dispatchEvent(new CustomEvent("businessModulesUpdated", { detail: modulesCache }));
    }

    return res;
}

/**
 * Hides disabled module links, empty split-menu tabs/panes, and empty top-level
 * dropdown hubs from #navbarLinks so users only see modules enabled for this business.
 */
export function applyModuleVisibilityToNavbar() {
    hydrateFromStorage();
    const linksRoot = document.getElementById("navbarLinks");
    if (!linksRoot) return;

    // 1. Toggle individual links
    linksRoot.querySelectorAll("a[data-tab]").forEach((a) => {
        const tabId = a.getAttribute("data-tab");
        const enabled = isTabEnabled(tabId);
        a.classList.toggle("module-disabled-hidden", !enabled);
    });

    // 2. Update split-menu panes & left-rail category tabs
    linksRoot.querySelectorAll(".nav-split-menu").forEach((menu) => {
        let firstVisibleTab = null;
        let activeTabStillVisible = false;

        menu.querySelectorAll(".nav-split-pane").forEach((pane) => {
            const paneId = pane.getAttribute("data-split-pane");
            const tabBtn = menu.querySelector(`.nav-split-tab[data-split-target="${paneId}"]`);
            const visibleCount = pane.querySelectorAll("a[data-tab]:not(.module-disabled-hidden)").length;

            if (tabBtn) {
                const countEl = tabBtn.querySelector(".nav-split-tab-count");
                if (countEl) countEl.textContent = String(visibleCount);

                const showSection = visibleCount > 0;
                tabBtn.classList.toggle("module-disabled-hidden", !showSection);
                pane.classList.toggle("module-disabled-hidden", !showSection);

                if (showSection && !firstVisibleTab) {
                    firstVisibleTab = tabBtn;
                }
                if (showSection && tabBtn.classList.contains("is-active")) {
                    activeTabStillVisible = true;
                }
            }
        });

        // If the active tab was hidden, activate the first visible tab automatically
        if (!activeTabStillVisible && firstVisibleTab) {
            const targetId = firstVisibleTab.getAttribute("data-split-target");
            menu.querySelectorAll(".nav-split-tab").forEach((t) => t.classList.toggle("is-active", t === firstVisibleTab));
            menu.querySelectorAll(".nav-split-pane").forEach((p) => p.classList.toggle("is-active", p.getAttribute("data-split-pane") === targetId));
        }
    });

    // 3. Hide any top-level dropdown hub that has zero visible links left
    linksRoot.querySelectorAll(".nav-dropdown:not(.nav-more)").forEach((dd) => {
        const visibleLinks = dd.querySelectorAll("a[data-tab]:not(.module-disabled-hidden)").length;
        dd.classList.toggle("module-disabled-hidden", visibleLinks === 0);
    });

    // Notify overflow engine to re-measure navbar width
    window.dispatchEvent(new Event("resize"));
}
