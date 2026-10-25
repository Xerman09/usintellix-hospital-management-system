import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let state = {
    view: "batch_prep", // "batch_prep" | "kitchen" | "orders" | "prescriptions" | "npo_watchlist" | "guidelines"
    diet_category: "",
    status: "active",
    meal_date: new Date().toISOString().slice(0, 10),
    meal_type: "",
    ward: "",
    has_food_allergies: "",
    q: ""
};

let data = null;

export function DietaryView() {
    return `<div class="diet-root" id="dietaryRoot"><div class="diet-empty">Loading Dietary & Nutrition Services…</div></div>`;
}

export async function initDietary() {
    ensureCss();
    await load();
}

async function load(quiet = false) {
    const root = document.getElementById("dietaryRoot");
    if (!root) return;

    if (state.view === "batch_prep") {
        const q = new URLSearchParams(Object.entries({
            meal_date: state.meal_date,
            meal_type: state.meal_type,
            ward: state.ward || ""
        }).filter(([, v]) => v));

        const [censusRes, statsRes] = await Promise.all([
            api(`/dietary/kitchen/batch-prep?${q}`).catch(() => null),
            api(`/dietary/stats`).catch(() => null)
        ]);

        if (!censusRes?.success) {
            if (!quiet) root.innerHTML = `<div class="diet-empty">${esc(censusRes?.message || "Failed to compile kitchen batch prep census.")}</div>`;
            return;
        }

        data = {
            census: censusRes.data || {},
            stats: statsRes?.data || {}
        };
        return render(root);
    }

    if (state.view === "orders") {
        const q = new URLSearchParams(Object.entries({
            meal_date: state.meal_date,
            meal_type: state.meal_type,
            q: state.q
        }).filter(([, v]) => v));

        const [ordersRes, statsRes, patientsRes] = await Promise.all([
            api(`/dietary/meal-orders?${q}`).catch(() => null),
            api(`/dietary/stats`).catch(() => null),
            api(`/patients?limit=50`).catch(() => null)
        ]);

        if (!ordersRes?.success) {
            if (!quiet) root.innerHTML = `<div class="diet-empty">${esc(ordersRes?.message || "Failed to load meal orders.")}</div>`;
            return;
        }

        data = {
            orders: ordersRes.data?.items || [],
            stats: statsRes?.data || {},
            patients: patientsRes?.data?.data || patientsRes?.data || []
        };
        return render(root);
    }

    if (state.view === "kitchen") {
        const q = new URLSearchParams(Object.entries({
            meal_date: state.meal_date,
            meal_type: state.meal_type,
            has_food_allergies: state.has_food_allergies,
            q: state.q
        }).filter(([, v]) => v));

        const [traysRes, statsRes] = await Promise.all([
            api(`/dietary/trays?${q}`).catch(() => null),
            api(`/dietary/stats`).catch(() => null)
        ]);

        if (!traysRes?.success) {
            if (!quiet) root.innerHTML = `<div class="diet-empty">${esc(traysRes?.message || "Failed to load kitchen trays.")}</div>`;
            return;
        }

        data = {
            trays: traysRes.data?.items || [],
            stats: statsRes?.data || {}
        };
        return render(root);
    }

    // Default or Prescriptions / NPO Watchlist
    const q = new URLSearchParams(Object.entries({
        diet_category: state.view === "npo_watchlist" ? "npo" : state.diet_category,
        status: state.view === "npo_watchlist" ? "active" : state.status,
        q: state.q
    }).filter(([, v]) => v));

    const [rxRes, statsRes, patientsRes] = await Promise.all([
        api(`/dietary/prescriptions?${q}`).catch(() => null),
        api(`/dietary/stats`).catch(() => null),
        api(`/patients?limit=50`).catch(() => null)
    ]);

    if (!rxRes?.success) {
        if (!quiet) root.innerHTML = `<div class="diet-empty">${esc(rxRes?.message || "Failed to load diet prescriptions.")}</div>`;
        return;
    }

    data = {
        prescriptions: rxRes.data?.items || [],
        stats: statsRes?.data || {},
        patients: patientsRes?.data?.data || patientsRes?.data || []
    };
    render(root);
}

function render(root) {
    const isBatchPrep = state.view === "batch_prep";
    const isRx = state.view === "prescriptions";
    const isOrders = state.view === "orders";
    const isKitchen = state.view === "kitchen";
    const isNpo = state.view === "npo_watchlist";
    const isGuides = state.view === "guidelines";

    const s = data.stats || {};
    const tab = (v, l) => `<button type="button" class="diet-tab-btn ${state.view === v ? "active" : ""}" data-diet-view="${v}">${l}</button>`;

    root.innerHTML = `
        <div class="diet-head">
            <div>
                <h1>Dietary &amp; Nutrition Services</h1>
                <div class="diet-sub">Hospital kitchen census compilation, clinical diet batch prep lists, bedside meal tray delivery slips with allergy warnings, and automated diet lockouts.</div>
            </div>
            <div style="display:flex;gap:8px;">
                ${isBatchPrep ? `<button type="button" class="diet-btn blue" id="batchPrintSlipsHeadBtn">🖨️ Batch Print Tray Slips</button>` : ""}
                ${isOrders ? `<button type="button" class="diet-btn blue" id="dietOrderMealBtn">🍽️ Place Bedside Meal Order (Auto Lockouts)</button>` : ""}
                ${!isOrders && !isBatchPrep ? `<button type="button" class="diet-btn blue" id="dietPrescribeBtn">+ Prescribe Clinical Diet</button>` : ""}
            </div>
        </div>

        <div class="diet-nav-tabs">
            ${tab("batch_prep", "📋 Kitchen Supervisor Census & Batch Prep")}
            ${tab("kitchen", "Tray Assembly & Delivery")}
            ${tab("orders", "Patient Meal Ordering & Lockouts")}
            ${tab("prescriptions", "Clinical Diet Orders")}
            ${tab("npo_watchlist", `NPO Fasting Watchlist ${s.npo_fasting_patients ? `(${s.npo_fasting_patients})` : ""}`)}
            ${tab("guidelines", "Diet & Dysphagia Guidelines")}
        </div>

        ${renderKpi(s)}

        ${!isGuides ? `
            <div class="diet-tools">
                ${isBatchPrep ? `
                    <label style="font-size:12.5px;font-weight:700;">Date:</label>
                    <input type="date" id="dietMealDate" value="${esc(state.meal_date)}">

                    <select id="dietMealType">
                        <option value="">All Services (Breakfast, Lunch, Dinner)</option>
                        <option value="breakfast" ${state.meal_type === "breakfast" ? "selected" : ""}>Breakfast</option>
                        <option value="lunch" ${state.meal_type === "lunch" ? "selected" : ""}>Lunch</option>
                        <option value="dinner" ${state.meal_type === "dinner" ? "selected" : ""}>Dinner</option>
                    </select>

                    <select id="dietFilterWard">
                        <option value="">All Hospital Wards / Units</option>
                        <option value="ICU" ${state.ward === "ICU" ? "selected" : ""}>Intensive Care Unit (ICU)</option>
                        <option value="SURG" ${state.ward === "SURG" ? "selected" : ""}>Surgical Inpatient Ward</option>
                        <option value="MED" ${state.ward === "MED" ? "selected" : ""}>Medical Inpatient Ward</option>
                        <option value="PED" ${state.ward === "PED" ? "selected" : ""}>Pediatric Care Unit</option>
                        <option value="ISOL" ${state.ward === "ISOL" ? "selected" : ""}>Isolation Negative Pressure</option>
                    </select>

                    <button type="button" class="diet-btn blue" id="batchPrintSlipsBtn">🖨️ Batch Print Delivery Slips</button>
                    <button type="button" class="diet-btn" id="batchAdvancePrepBtn">⚡ Start Kitchen Prep</button>
                    <button type="button" class="diet-btn" id="batchAssembleClearBtn">✓ Batch Assemble &amp; Clear</button>
                    <button type="button" class="diet-btn" id="seedDemoCensusBtn" title="Seed realistic hospital census demo counts">🌱 Seed Demo Census</button>
                ` : ""}

                ${isRx ? `
                    <select id="dietFilterCat">
                        <option value="">All Diet Categories</option>
                        <option value="regular" ${state.diet_category === "regular" ? "selected" : ""}>Regular Hospital Diet</option>
                        <option value="diabetic" ${state.diet_category === "diabetic" ? "selected" : ""}>Diabetic / Low Carb</option>
                        <option value="low_sodium" ${state.diet_category === "low_sodium" ? "selected" : ""}>Low Sodium (Cardiac DASH)</option>
                        <option value="renal" ${state.diet_category === "renal" ? "selected" : ""}>Renal (Low K/Phos/Protein)</option>
                        <option value="pureed_soft" ${state.diet_category === "pureed_soft" ? "selected" : ""}>Pureed / Mechanical Soft</option>
                        <option value="full_liquid" ${state.diet_category === "full_liquid" ? "selected" : ""}>Full Liquid</option>
                        <option value="clear_liquid" ${state.diet_category === "clear_liquid" ? "selected" : ""}>Clear Liquid</option>
                        <option value="npo" ${state.diet_category === "npo" ? "selected" : ""}>NPO (Nothing by Mouth)</option>
                        <option value="enteral_tube" ${state.diet_category === "enteral_tube" ? "selected" : ""}>Enteral Tube Feed</option>
                    </select>

                    <select id="dietFilterStatus">
                        <option value="">All Statuses</option>
                        <option value="active" ${state.status === "active" ? "selected" : ""}>Active Diets</option>
                        <option value="completed" ${state.status === "completed" ? "selected" : ""}>Completed / Superseded</option>
                        <option value="discontinued" ${state.status === "discontinued" ? "selected" : ""}>Discontinued</option>
                    </select>
                ` : ""}

                ${isOrders ? `
                    <label style="font-size:12.5px;font-weight:700;">Date:</label>
                    <input type="date" id="dietMealDate" value="${esc(state.meal_date)}">
                    
                    <select id="dietMealType">
                        <option value="">All Meals (B/L/D)</option>
                        <option value="breakfast" ${state.meal_type === "breakfast" ? "selected" : ""}>Breakfast</option>
                        <option value="lunch" ${state.meal_type === "lunch" ? "selected" : ""}>Lunch</option>
                        <option value="dinner" ${state.meal_type === "dinner" ? "selected" : ""}>Dinner</option>
                    </select>
                ` : ""}

                ${isKitchen ? `
                    <label style="font-size:12.5px;font-weight:700;">Date:</label>
                    <input type="date" id="dietMealDate" value="${esc(state.meal_date)}">
                    
                    <select id="dietMealType">
                        <option value="">All Meals (B/L/D)</option>
                        <option value="breakfast" ${state.meal_type === "breakfast" ? "selected" : ""}>Breakfast</option>
                        <option value="lunch" ${state.meal_type === "lunch" ? "selected" : ""}>Lunch</option>
                        <option value="dinner" ${state.meal_type === "dinner" ? "selected" : ""}>Dinner</option>
                    </select>

                    <select id="dietFilterAllergy">
                        <option value="">All Patient Trays</option>
                        <option value="1" ${state.has_food_allergies === "1" ? "selected" : ""}>🚨 Trays with Food Allergies</option>
                    </select>
                ` : ""}

                ${!isBatchPrep ? `<input type="search" id="dietSearch" value="${esc(state.q)}" placeholder="${isOrders ? "Search order #, patient name, bed..." : isKitchen ? "Search tray #, patient, room/bed..." : "Search prescription #, patient name, room..."}">` : ""}
            </div>
        ` : ""}

        ${isBatchPrep ? renderBatchPrepView(data.census, s) : isRx ? renderPrescriptionsList(data.prescriptions) : isOrders ? renderMealOrdersList(data.orders) : isKitchen ? renderKitchenTraysList(data.trays) : isNpo ? renderNpoWatchlist(data.prescriptions) : renderGuidelinesView()}
    `;

    // Tab buttons
    root.querySelectorAll("[data-diet-view]").forEach(btn => {
        btn.onclick = () => {
            state.view = btn.dataset.dietView;
            load();
        };
    });

    if (root.querySelector("#dietPrescribeBtn")) root.querySelector("#dietPrescribeBtn").onclick = () => openPrescribeDietModal(data.patients);
    if (root.querySelector("#dietOrderMealBtn")) root.querySelector("#dietOrderMealBtn").onclick = () => openPlaceMealOrderModal(data.patients);

    if (root.querySelector("#dietFilterCat")) root.querySelector("#dietFilterCat").onchange = (e) => { state.diet_category = e.target.value; load(); };
    if (root.querySelector("#dietFilterStatus")) root.querySelector("#dietFilterStatus").onchange = (e) => { state.status = e.target.value; load(); };
    if (root.querySelector("#dietMealDate")) root.querySelector("#dietMealDate").onchange = (e) => { state.meal_date = e.target.value; load(); };
    if (root.querySelector("#dietMealType")) root.querySelector("#dietMealType").onchange = (e) => { state.meal_type = e.target.value; load(); };
    if (root.querySelector("#dietFilterWard")) root.querySelector("#dietFilterWard").onchange = (e) => { state.ward = e.target.value; load(); };
    if (root.querySelector("#dietFilterAllergy")) root.querySelector("#dietFilterAllergy").onchange = (e) => { state.has_food_allergies = e.target.value; load(); };

    // Batch Prep Actions
    if (root.querySelector("#batchPrintSlipsBtn")) {
        root.querySelector("#batchPrintSlipsBtn").onclick = async () => {
            const q = new URLSearchParams(Object.entries({
                meal_date: state.meal_date,
                meal_type: state.meal_type,
                ward: state.ward || ""
            }).filter(([, v]) => v));

            const res = await api(`/dietary/kitchen/tray-slips?${q}`).catch(() => null);
            if (!res?.success || !res?.data?.length) {
                return showToast("No tray slips found for selected meal and ward filters.", "info");
            }
            openTraySlipsPrintModal(res.data, `Hospital Bedside Meal Tray Delivery Slips (${res.data.length} Slips)`);
        };
    }
    if (root.querySelector("#batchPrintSlipsHeadBtn")) {
        root.querySelector("#batchPrintSlipsHeadBtn").onclick = () => {
            if (root.querySelector("#batchPrintSlipsBtn")) root.querySelector("#batchPrintSlipsBtn").click();
        };
    }
    if (root.querySelector("#batchPrintSlipsTopBtn")) {
        root.querySelector("#batchPrintSlipsTopBtn").onclick = () => {
            if (root.querySelector("#batchPrintSlipsBtn")) root.querySelector("#batchPrintSlipsBtn").click();
        };
    }

    if (root.querySelector("#batchAdvancePrepBtn")) {
        root.querySelector("#batchAdvancePrepBtn").onclick = async () => {
            const q = new URLSearchParams(Object.entries({
                meal_date: state.meal_date,
                meal_type: state.meal_type,
                ward: state.ward || ""
            }).filter(([, v]) => v));
            const slipsRes = await api(`/dietary/kitchen/tray-slips?${q}`).catch(() => null);
            const scheduledIds = (slipsRes?.data || []).filter(t => t.status === "scheduled").map(t => t.tray_id);
            if (!scheduledIds.length) {
                return showToast("No scheduled trays currently pending kitchen prep.", "info");
            }
            if (confirm(`Advance ${scheduledIds.length} scheduled trays to Kitchen Prep station?`)) {
                const res = await api("/dietary/kitchen/batch-update-status", {
                    method: "POST",
                    body: JSON.stringify({ tray_ids: scheduledIds, status: "prep_in_kitchen", notes: "Batch started by supervisor" })
                });
                if (res?.success) {
                    showToast(res.message, "success");
                    load();
                } else {
                    showToast(res?.message || "Batch update failed.", "error");
                }
            }
        };
    }
    if (root.querySelector("#batchAdvancePrepTopBtn")) {
        root.querySelector("#batchAdvancePrepTopBtn").onclick = () => {
            if (root.querySelector("#batchAdvancePrepBtn")) root.querySelector("#batchAdvancePrepBtn").click();
        };
    }

    if (root.querySelector("#batchAssembleClearBtn")) {
        root.querySelector("#batchAssembleClearBtn").onclick = async () => {
            const q = new URLSearchParams(Object.entries({
                meal_date: state.meal_date,
                meal_type: state.meal_type,
                ward: state.ward || ""
            }).filter(([, v]) => v));
            const slipsRes = await api(`/dietary/kitchen/tray-slips?${q}`).catch(() => null);
            const prepIds = (slipsRes?.data || []).filter(t => t.status === "prep_in_kitchen").map(t => t.tray_id);
            if (!prepIds.length) {
                return showToast("No trays currently in kitchen prep to assemble.", "info");
            }
            if (confirm(`Assemble ${prepIds.length} trays and certify kitchen allergen clearance?`)) {
                const res = await api("/dietary/kitchen/batch-update-status", {
                    method: "POST",
                    body: JSON.stringify({ tray_ids: prepIds, status: "tray_assembled", notes: "Supervisor batch assembly and allergy clearance certification" })
                });
                if (res?.success) {
                    showToast(res.message, "success");
                    load();
                } else {
                    showToast(res?.message || "Batch assemble failed.", "error");
                }
            }
        };
    }

    if (root.querySelector("#seedDemoCensusBtn")) {
        root.querySelector("#seedDemoCensusBtn").onclick = async () => {
            const res = await api("/dietary/kitchen/seed-census", {
                method: "POST",
                body: JSON.stringify({ target_date: state.meal_date })
            });
            if (res?.success) {
                showToast(res.message || "Hospital census demo data loaded.", "success");
                load();
            } else {
                showToast(res?.message || "Failed to seed demo census.", "error");
            }
        };
    }

    let t = null;
    const searchInput = root.querySelector("#dietSearch");
    if (searchInput) {
        searchInput.oninput = (e) => {
            clearTimeout(t);
            t = setTimeout(() => {
                state.q = e.target.value.trim();
                load();
            }, 300);
        };
    }

    root.onclick = async (e) => {
        const printSlipBtn = e.target.closest("[data-print-slip]");
        if (printSlipBtn) {
            openSingleTraySlip(Number(printSlipBtn.dataset.printSlip));
            return;
        }

        const printWardBtn = e.target.closest("[data-print-ward-slips]");
        if (printWardBtn) {
            openWardTraySlips(printWardBtn.dataset.printWardSlips);
            return;
        }

        const filterDietBtn = e.target.closest("[data-filter-diet]");
        if (filterDietBtn) {
            state.diet_category = filterDietBtn.dataset.filterDiet;
            state.view = "kitchen";
            load();
            return;
        }

        const viewRxBtn = e.target.closest("[data-view-rx]");
        if (viewRxBtn) {
            openDietDetailModal(Number(viewRxBtn.dataset.viewRx));
            return;
        }

        const viewOrderBtn = e.target.closest("[data-view-order]");
        if (viewOrderBtn) {
            openMealOrderDetailModal(Number(viewOrderBtn.dataset.viewOrder));
            return;
        }

        const discRxBtn = e.target.closest("[data-discontinue-rx]");
        if (discRxBtn) {
            const id = Number(discRxBtn.dataset.discontinueRx);
            const reason = prompt("Enter clinical reason for discontinuing or updating this diet order:");
            if (reason) {
                const res = await api("/dietary/prescriptions/discontinue", {
                    method: "POST",
                    body: JSON.stringify({ prescription_id: id, reason })
                });
                if (res?.success) {
                    showToast(res.message, "success");
                    load();
                } else {
                    showToast(res?.message || "Failed to discontinue diet.", "error");
                }
            }
            return;
        }

        const prepTrayBtn = e.target.closest("[data-prep-tray]");
        if (prepTrayBtn) {
            const id = Number(prepTrayBtn.dataset.prepTray);
            await api("/dietary/trays/status", {
                method: "POST",
                body: JSON.stringify({ tray_id: id, status: "prep_in_kitchen" })
            });
            showToast("Tray moved to kitchen prep station.", "success");
            load();
            return;
        }

        const assembleTrayBtn = e.target.closest("[data-assemble-tray]");
        if (assembleTrayBtn) {
            openTrayAllergyClearanceModal(Number(assembleTrayBtn.dataset.assembleTray));
            return;
        }

        const deliverTrayBtn = e.target.closest("[data-deliver-tray]");
        if (deliverTrayBtn) {
            const id = Number(deliverTrayBtn.dataset.deliverTray);
            const deliveredBy = prompt("Enter staff / nurse name confirming bedside delivery:", "Floor Nurse");
            if (deliveredBy) {
                await api("/dietary/trays/status", {
                    method: "POST",
                    body: JSON.stringify({ tray_id: id, status: "delivered", delivered_by: deliveredBy })
                });
                showToast("Meal tray confirmed delivered to patient bedside.", "success");
                load();
            }
            return;
        }
    };
}

function renderKpi(s) {
    return `
        <div class="diet-counts">
            <div class="good"><b>${s.active_prescriptions || 0}</b>Active Diet Orders</div>
            <div class="${s.npo_fasting_patients ? "bad" : ""}"><b>${s.npo_fasting_patients || 0}</b>NPO Fasting (Locked)</div>
            <div><b>${s.meal_orders_today || 0}</b>Meal Orders Placed Today</div>
            <div><b>${s.diabetic_patients || 0}</b>Diabetic / Low Carb</div>
            <div><b>${s.renal_patients || 0}</b>Renal Patients</div>
            <div><b>${s.cardiac_patients || 0}</b>Cardiac (Low Sodium)</div>
            <div class="${s.trays_with_food_allergies ? "warn" : ""}"><b>${s.trays_with_food_allergies || 0}</b>Trays With Food Allergies</div>
            <div><b>${s.trays_delivered_today || 0} / ${s.trays_today || 0}</b>Trays Delivered Today</div>
        </div>
    `;
}

function renderPrescriptionsList(rxs) {
    if (!rxs.length) return `<div class="diet-empty">No clinical diet prescriptions found.</div>`;
    return `<div class="diet-list">${rxs.map(prescriptionCard).join("")}</div>`;
}

function renderMealOrdersList(orders) {
    if (!orders.length) return `<div class="diet-empty">No patient meal orders placed for this date. Click "🍽️ Place Bedside Meal Order" to select compliant meals.</div>`;
    return `<div class="diet-list">${orders.map(mealOrderCard).join("")}</div>`;
}

function renderKitchenTraysList(trays) {
    if (!trays.length) return `<div class="diet-empty">No meal trays scheduled for this date. Click "+ Prescribe Clinical Diet" to order meals for patients.</div>`;
    return `<div class="diet-list">${trays.map(kitchenTrayCard).join("")}</div>`;
}

function renderNpoWatchlist(rxs) {
    const npoList = rxs.filter(r => r.diet_category === "npo" && r.status === "active");
    if (!npoList.length) {
        return `
            <div class="diet-empty" style="background:#f0fdf4;border-color:#bbf7d0;color:#166534;">
                <b>✓ No Inpatients on Active NPO Fasting:</b> All admitted patients are cleared for oral nutritional intake.
            </div>
        `;
    }

    return `
        <div style="background:#fee2e2;border:1px solid #f87171;padding:10px 14px;border-radius:8px;font-size:13px;color:#991b1b;margin-bottom:12px;">
            <b>⚠️ CRITICAL SURGICAL / PROCEDURAL FASTING SAFETY:</b> The following patients have active NPO orders. All kitchen food trays are automatically blocked. Nursing staff must verify nil per os compliance prior to sedation or surgery.
        </div>
        <div class="diet-list">${npoList.map(prescriptionCard).join("")}</div>
    `;
}

function mealOrderCard(order) {
    return `
        <div class="diet-card">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
                <div>
                    <span class="diet-badge good">✓ 100% DIET COMPLIANT</span>
                    <b style="font-family:monospace;font-size:14px;color:#2563eb;margin-left:6px;">${esc(order.order_number)}</b>
                    <span style="font-weight:700;font-size:12px;margin-left:6px;padding:2px 7px;border-radius:4px;background:#fef3c7;color:#b45309;">
                        🍽️ ${esc(order.meal_type.toUpperCase())}
                    </span>
                    <h3 style="margin:4px 0 2px;font-size:16px;">
                        Patient: <b>${esc(order.patient_name)}</b> (${esc(order.patient_mrn)}) · Bed: <b style="color:#2563eb;">${esc(order.ward_room_bed || "Ward")}</b>
                    </h3>
                    <div class="diet-muted">
                        Prescription: <b style="color:#b45309;">${esc(order.diet_category.toUpperCase())}</b> (${esc(order.prescription_number)}) · Ordered by: <b>${esc(order.ordered_by_name || "Bedside")}</b> on ${esc(order.created_at)}
                    </div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:13px;font-weight:700;color:#059669;">${order.items_count} Menu Items Selected</div>
                    <div style="font-size:12px;margin-top:2px;" class="diet-muted">Meal Date: <b>${esc(order.meal_date)}</b></div>
                </div>
            </div>

            <div style="background:var(--bg-muted, #f8fafc);padding:8px 10px;border-radius:6px;font-size:12px;margin:8px 0;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                <div>
                    <b>Nutritional Totals:</b>
                    · Calories: <b style="color:#1d4ed8;">${order.total_calories} kcal</b>
                    · Sodium: <b>${order.total_sodium_mg} mg</b>
                    · Carbs: <b>${order.total_carbs_g} g</b>
                    · Protein: <b>${order.total_protein_g} g</b>
                    · Potassium: <b>${order.total_potassium_mg} mg</b>
                </div>
                ${order.special_requests ? `<div><b>Requests:</b> ${esc(order.special_requests)}</div>` : ""}
            </div>

            <div style="display:flex;justify-content:flex-end;gap:6px;">
                <button type="button" class="diet-btn sm" data-view-order="${order.id}">👁️ View Ordered Items &amp; Nutrients</button>
            </div>
        </div>
    `;
}

function prescriptionCard(rx) {
    const isActive = rx.status === "active";
    const isNpo = rx.diet_category === "npo";
    const isRenal = rx.diet_category === "renal";
    const isDiabetic = rx.diet_category === "diabetic";
    const isCardiac = rx.diet_category === "low_sodium";

    const badgeClass = isNpo ? "diet-badge bad" : isActive ? "diet-badge good" : "diet-badge";
    const catLabel = rx.diet_category.replace("_", " ").toUpperCase();

    return `
        <div class="diet-card ${isNpo ? "bad" : isRenal || isDiabetic || isCardiac ? "warn" : ""}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
                <div>
                    <span class="${badgeClass}">${esc(rx.status.toUpperCase())}</span>
                    <b style="font-family:monospace;font-size:14px;color:#2563eb;margin-left:6px;">${esc(rx.prescription_number)}</b>
                    <span style="font-weight:700;font-size:13px;margin-left:6px;padding:2px 8px;border-radius:4px;background:#fef3c7;color:#b45309;">
                        🍽️ ${esc(catLabel)}
                    </span>
                    <h3 style="margin:4px 0 2px;font-size:16px;">
                        Patient: <b>${esc(rx.patient_name)}</b> (${esc(rx.patient_mrn)}) · Location: <b style="color:#2563eb;">${esc(rx.ward_room_bed || "Unassigned")}</b>
                    </h3>
                    <div class="diet-muted">
                        Prescribed by: <b>${esc(rx.prescribing_doctor_name)}</b> · Effective: <b>${esc(rx.effective_from)}</b>${rx.clinical_indication ? ` · Indication: <b>${esc(rx.clinical_indication)}</b>` : ""}
                    </div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:12px;" class="diet-muted">Texture: <b>${esc(rx.texture_consistency)}</b></div>
                    <div style="font-size:12px;" class="diet-muted">Liquids: <b>${esc(rx.liquid_consistency)}</b></div>
                </div>
            </div>

            ${rx.has_food_allergies ? `
                <div style="background:#fee2e2;border:1px solid #fca5a5;padding:7px 10px;border-radius:6px;font-size:12px;margin:8px 0;color:#991b1b;">
                    <b>🚨 Documented Food Allergies:</b> ${esc(rx.allergy_alert_string)} — <span style="font-weight:700;">Enforced on Kitchen Meal Trays</span>
                </div>
            ` : ""}

            <div style="background:var(--bg-muted, #f8fafc);padding:8px 10px;border-radius:6px;font-size:12px;margin:8px 0;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                <div>
                    <b>Nutritional Restrictions:</b>
                    ${rx.calorie_target_kcal ? `· Target: <b>${rx.calorie_target_kcal} kcal</b>` : ""}
                    ${rx.sodium_limit_mg ? `· Sodium limit: <b>&lt;${rx.sodium_limit_mg} mg</b>` : ""}
                    ${rx.fluid_restriction_ml ? `· Fluid: <b>&lt;${rx.fluid_restriction_ml} mL/24h</b>` : ""}
                    ${rx.protein_limit_g ? `· Protein: <b>&lt;${rx.protein_limit_g} g</b>` : ""}
                    ${rx.potassium_limit_mg ? `· Potassium: <b>&lt;${rx.potassium_limit_mg} mg</b>` : ""}
                </div>
                <div>
                    ${rx.special_instructions ? `<span><b>Special Notes:</b> ${esc(rx.special_instructions)}</span>` : `<span class="diet-muted">Standard protocol</span>`}
                </div>
            </div>

            <div style="display:flex;justify-content:flex-end;gap:6px;">
                <button type="button" class="diet-btn sm" data-view-rx="${rx.id}">👁️ View Diet Details</button>
                ${isActive ? `<button type="button" class="diet-btn sm" data-discontinue-rx="${rx.id}">Discontinue / Change Diet…</button>` : ""}
            </div>
        </div>
    `;
}

function kitchenTrayCard(tray) {
    const isNpo = tray.status === "held_npo";
    const isDelivered = tray.status === "delivered";
    const isAssembled = tray.status === "tray_assembled";
    const isPrep = tray.status === "prep_in_kitchen";

    const badgeClass = isNpo ? "diet-badge bad" : isDelivered ? "diet-badge good" : isAssembled ? "diet-badge warn" : "diet-badge";
    const statusLabel = isNpo ? "HELD (NPO FASTING)" : isDelivered ? "✓ DELIVERED TO BEDSIDE" : isAssembled ? "TRAY ASSEMBLED (READY)" : isPrep ? "PREPPING IN KITCHEN" : "SCHEDULED";

    return `
        <div class="diet-card ${tray.has_food_allergies ? "bad" : ""}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
                <div>
                    <span class="${badgeClass}">${statusLabel}</span>
                    <b style="font-family:monospace;font-size:14px;color:#2563eb;margin-left:6px;">${esc(tray.tray_number)}</b>
                    <span style="font-weight:700;font-size:12px;margin-left:6px;padding:2px 7px;border-radius:4px;background:#e0e7ff;color:#3730a3;">
                        🍴 ${esc(tray.meal_type.toUpperCase())}
                    </span>
                    <h3 style="margin:4px 0 2px;font-size:16px;">
                        ${esc(tray.patient_name)} (${esc(tray.patient_mrn)}) · Bed: <b style="color:#1d4ed8;">${esc(tray.ward_room_bed || "Ward")}</b>
                    </h3>
                    <div class="diet-muted">
                        Prescription Diet: <b style="color:#b45309;">${esc(tray.diet_category.toUpperCase())}</b> (${esc(tray.texture_consistency)} texture, ${esc(tray.liquid_consistency)} liquids)
                    </div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:12px;">Meal Date: <b>${esc(tray.meal_date)}</b></div>
                    ${tray.delivered_at ? `<div style="font-size:11px;color:#059669;">Delivered at ${esc(tray.delivered_at)} by ${esc(tray.delivered_by || "Staff")}</div>` : ""}
                </div>
            </div>

            ${tray.has_food_allergies ? `
                <div style="background:#fee2e2;border:2px solid #ef4444;padding:8px 12px;border-radius:6px;font-size:12.5px;margin:8px 0;color:#991b1b;">
                    <div style="font-weight:800;font-size:13px;">🚨 CRITICAL FOOD ALLERGY ALERT ON TRAY:</div>
                    <div style="font-weight:700;margin-top:2px;">${esc(tray.allergy_alerts)}</div>
                    <div style="font-size:11.5px;margin-top:3px;">
                        Kitchen Status: ${tray.allergy_cleared_by_kitchen ? `<b style="color:#059669;">✓ Cleared by Chef (${esc(tray.prepared_by || "Kitchen Chef")})</b>` : `<b style="color:#dc2626;">⚠️ Awaiting Chef Allergen Clearance Sign-Off</b>`}
                    </div>
                </div>
            ` : ""}

            ${tray.kitchen_prep_notes ? `<div style="font-size:12px;color:var(--text-muted);margin:4px 0;"><b>Prep Notes:</b> ${esc(tray.kitchen_prep_notes)}</div>` : ""}

            <div style="display:flex;justify-content:flex-end;gap:6px;margin-top:6px;">
                <button type="button" class="diet-btn sm" data-print-slip="${tray.id}">🏷️ Print Tray Slip</button>
                ${tray.status === "scheduled" ? `<button type="button" class="diet-btn sm" data-prep-tray="${tray.id}">🍳 Start Kitchen Prep</button>` : ""}
                ${tray.status === "prep_in_kitchen" ? `<button type="button" class="diet-btn sm blue" data-assemble-tray="${tray.id}">✓ Assemble Tray &amp; Sign Allergy Check</button>` : ""}
                ${tray.status === "tray_assembled" ? `<button type="button" class="diet-btn sm blue" data-deliver-tray="${tray.id}">🚚 Deliver to Bedside</button>` : ""}
            </div>
        </div>
    `;
}

function renderGuidelinesView() {
    return `
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:12px;">
            <div class="diet-card">
                <h3 style="margin:0 0 6px;color:#1e40af;">Renal Diet Management (CKD &amp; Dialysis)</h3>
                <p style="font-size:12.5px;color:var(--text-muted);line-height:1.4;">
                    Protects failing nephrons and prevents life-threatening hyperkalemia, hyperphosphatemia, and fluid overload.
                </p>
                <ul style="font-size:12px;padding-left:18px;margin:6px 0;">
                    <li><b>Potassium:</b> Limit &lt; 2,000 mg/day (Avoid oranges, bananas, potatoes, tomatoes).</li>
                    <li><b>Phosphorus:</b> Limit &lt; 800–1,000 mg/day (Restrict dark sodas, dairy, nuts).</li>
                    <li><b>Sodium:</b> &lt; 2,000 mg/day to control hypertension and edema.</li>
                    <li><b>Fluid Restriction:</b> Typically 1,000–1,500 mL/24h.</li>
                </ul>
            </div>

            <div class="diet-card">
                <h3 style="margin:0 0 6px;color:#b45309;">Diabetic / Consistent Carbohydrate Diet</h3>
                <p style="font-size:12.5px;color:var(--text-muted);line-height:1.4;">
                    Maintains glycemic control and avoids postprandial hyperglycemia and insulin-induced hypoglycemia.
                </p>
                <ul style="font-size:12px;padding-left:18px;margin:6px 0;">
                    <li><b>Carbohydrate Consistency:</b> 45–60g carbs per meal (3–4 carb choices).</li>
                    <li><b>Calorie Targets:</b> Typically 1,800 to 2,000 kcal standard.</li>
                    <li><b>Glycemic Index:</b> Focus on whole grains, non-starchy vegetables, and lean proteins.</li>
                </ul>
            </div>

            <div class="diet-card">
                <h3 style="margin:0 0 6px;color:#059669;">IDDSI Framework for Dysphagia &amp; Swallowing</h3>
                <p style="font-size:12.5px;color:var(--text-muted);line-height:1.4;">
                    Prevents choking and silent aspiration pneumonia following stroke or traumatic brain injury.
                </p>
                <ul style="font-size:12px;padding-left:18px;margin:6px 0;">
                    <li><b>Level 4 (Pureed):</b> Smooth, cohesive, no lumps, spoon-thick.</li>
                    <li><b>Level 5 (Minced &amp; Moist):</b> Soft and moist, small lumps &lt; 4mm.</li>
                    <li><b>Level 6 (Soft &amp; Bite-Sized):</b> Tender, chewable, bite size &lt; 15mm.</li>
                    <li><b>Liquids:</b> Thin (0), Nectar (2), Honey (3), Pudding-thick (4).</li>
                </ul>
            </div>

            <div class="diet-card bad">
                <h3 style="margin:0 0 6px;color:#b91c1c;">NPO (Nil Per Os) Protocol</h3>
                <p style="font-size:12.5px;color:var(--text-muted);line-height:1.4;">
                    Strict pre-operative and diagnostic procedural fasting to prevent pulmonary aspiration under anesthesia.
                </p>
                <ul style="font-size:12px;padding-left:18px;margin:6px 0;">
                    <li><b>Solids &amp; Full Meals:</b> Fast at least 6 to 8 hours prior to surgery.</li>
                    <li><b>Clear Liquids:</b> Up to 2 hours prior to induction per ASA guidelines.</li>
                    <li><b>Safety Lock:</b> Kitchen trays automatically suppressed while NPO active.</li>
                </ul>
            </div>
        </div>
    `;
}

/**
 * Render Kitchen Supervisor Dashboard & Batch Prep View
 */
function renderBatchPrepView(census, s) {
    if (!census) return `<div class="diet-empty">No census compiled. Click "🌱 Seed Demo Census" or select another date.</div>`;

    const sm = census.summary || {};
    const diets = census.diet_counts || [];
    const textures = census.texture_counts || [];
    const liquids = census.liquid_counts || [];
    const allergies = census.allergy_summary || {};
    const wards = census.ward_distribution || [];
    const prepItems = census.production_prep_list || [];

    return `
        <!-- Supervisor Census KPI Overview -->
        <div style="background:var(--bg-surface);border:1px solid var(--border-color);border-radius:12px;padding:16px;margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;border-bottom:1px solid var(--border-color);padding-bottom:12px;margin-bottom:12px;">
                <div>
                    <h2 style="margin:0;font-size:18px;color:#1e3a8a;">Hospital-Wide Kitchen Census &amp; Meal Batch Compilation</h2>
                    <div style="font-size:12.5px;color:var(--text-muted);margin-top:2px;">
                        Date: <b>${esc(census.meal_date)}</b> · Service: <b style="text-transform:uppercase;color:#b45309;">${esc(census.meal_type)}</b> · Ward Filter: <b>${esc(census.ward_filter.toUpperCase())}</b>
                    </div>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button type="button" class="diet-btn blue" id="batchPrintSlipsTopBtn">🖨️ Batch Print Delivery Slips</button>
                    <button type="button" class="diet-btn" id="batchAdvancePrepTopBtn">⚡ Start Kitchen Prep</button>
                </div>
            </div>

            <div class="diet-counts" style="margin-bottom:0;">
                <div style="background:#f0fdf4;border-color:#bbf7d0;"><b style="color:#16a34a;">${sm.total_scheduled_trays || 0}</b>Total Inpatient Trays</div>
                <div class="good"><b>${sm.meals_to_cook_and_prep || 0}</b>Active Meals to Cook &amp; Plate</div>
                <div class="${sm.npo_fasting_locked ? 'bad' : ''}"><b>${sm.npo_fasting_locked || 0}</b>Strict NPO Fasting (Locked)</div>
                <div class="${sm.trays_with_food_allergies ? 'warn' : ''}"><b>${sm.trays_with_food_allergies || 0}</b>Trays With Food Allergies</div>
                <div><b>${sm.in_kitchen_prep || 0}</b>Currently In Kitchen Prep</div>
                <div><b>${sm.trays_assembled || 0}</b>Assembled &amp; Ready</div>
                <div class="good"><b>${sm.trays_delivered || 0}</b>Delivered to Bedside</div>
            </div>
        </div>

        <!-- 1. HOSPITAL-WIDE MEAL COUNTS COMPILATION (e.g. 90 Regular, 45 Diabetic, 30 Renal, 12 NPO) -->
        <div style="margin-bottom:18px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <h3 style="margin:0;font-size:16px;">1. Hospital-Wide Meal Counts by Clinical Diet Category</h3>
                <span style="font-size:12px;color:var(--text-muted);">Total Inpatients: <b>${sm.total_scheduled_trays || 0}</b></span>
            </div>

            <div class="diet-census-grid">
                ${diets.map(d => `
                    <div class="diet-census-card ${d.category === 'npo' ? 'npo' : ''}" style="border-top: 4px solid ${d.color};">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                            <span class="diet-census-num" style="color:${d.color};">${d.count}</span>
                            <span style="font-size:11px;font-weight:700;padding:2px 6px;border-radius:4px;background:#f1f5f9;color:#475569;">${d.code}</span>
                        </div>
                        <div class="diet-census-label">${esc(d.label)}</div>
                        <div class="diet-census-desc">${esc(d.description)}</div>
                        <div class="diet-census-progress">
                            <div class="diet-census-bar" style="width:${d.percentage}%;background:${d.color};"></div>
                        </div>
                        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;display:flex;justify-content:space-between;">
                            <span>${d.percentage}% of census</span>
                            <a href="javascript:void(0)" data-filter-diet="${d.category}" style="color:${d.color};font-weight:700;text-decoration:none;">View Trays &rarr;</a>
                        </div>
                    </div>
                `).join("")}
            </div>
        </div>

        <!-- 2. DYSPHAGIA CONSISTENCY BALANCE (IDDSI) -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:12px;margin-bottom:18px;">
            <div class="diet-card">
                <h4 style="margin:0 0 8px;font-size:14px;color:#1e40af;">Texture Consistencies (IDDSI Framework)</h4>
                <div style="display:grid;gap:6px;">
                    ${textures.map(tx => `
                        <div style="display:flex;justify-content:space-between;align-items:center;font-size:12.5px;padding:4px 0;border-bottom:1px dashed var(--border-color);">
                            <span><b>${esc(tx.label)}</b></span>
                            <span style="font-weight:700;font-family:monospace;background:#f1f5f9;padding:2px 8px;border-radius:4px;">${tx.count} trays (${tx.percentage}%)</span>
                        </div>
                    `).join("")}
                </div>
            </div>

            <div class="diet-card">
                <h4 style="margin:0 0 8px;font-size:14px;color:#0d9488;">Liquid Consistencies (IDDSI Viscosity)</h4>
                <div style="display:grid;gap:6px;">
                    ${liquids.map(lq => `
                        <div style="display:flex;justify-content:space-between;align-items:center;font-size:12.5px;padding:4px 0;border-bottom:1px dashed var(--border-color);">
                            <span><b>${esc(lq.label)}</b></span>
                            <span style="font-weight:700;font-family:monospace;background:#f1f5f9;padding:2px 8px;border-radius:4px;">${lq.count} trays (${lq.percentage}%)</span>
                        </div>
                    `).join("")}
                </div>
            </div>
        </div>

        <!-- 3. FOOD ALLERGY VIGILANCE & HAZARD TABLE -->
        <div style="margin-bottom:18px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <h3 style="margin:0;font-size:16px;color:#991b1b;">2. Food Allergy Vigilance &amp; Cross-Contamination Warning Log</h3>
                <span class="diet-badge bad">${allergies.total_allergy_trays || 0} Allergy-Flagged Trays</span>
            </div>

            ${allergies.total_allergy_trays > 0 ? `
                <div style="background:#fef2f2;border:1px solid #f87171;border-radius:8px;padding:12px;margin-bottom:10px;">
                    <div style="font-size:12.5px;font-weight:800;color:#991b1b;margin-bottom:6px;">
                        🚨 TOP DETECTED ALLERGENS ON TODAY'S TRAYS:
                    </div>
                    <div style="display:flex;flex-wrap:wrap;gap:6px;">
                        ${(allergies.top_allergens || []).map(al => `
                            <span style="background:#fee2e2;border:1px solid #ef4444;color:#991b1b;padding:3px 9px;border-radius:12px;font-size:12px;font-weight:700;">
                                ⚠️ ${esc(al.allergen)}: <b>${al.count}</b>
                            </span>
                        `).join("")}
                    </div>
                </div>

                <div class="diet-card" style="padding:0;overflow:hidden;">
                    <table class="diet-table">
                        <thead>
                            <tr>
                                <th>Tray #</th>
                                <th>Patient Name (MRN)</th>
                                <th>Location</th>
                                <th>Prescribed Diet</th>
                                <th>Documented Food Allergies</th>
                                <th>Kitchen Clearance</th>
                                <th style="text-align:right;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(allergies.allergy_trays || []).map(alt => `
                                <tr>
                                    <td style="font-family:monospace;font-weight:700;color:#2563eb;">${esc(alt.tray_number)}</td>
                                    <td><b>${esc(alt.patient_name)}</b> (${esc(alt.patient_mrn)})</td>
                                    <td><b style="color:#1d4ed8;">${esc(alt.ward_room_bed)}</b></td>
                                    <td><span class="diet-badge">${esc(alt.diet_category.toUpperCase())}</span></td>
                                    <td><b style="color:#dc2626;">${esc(alt.allergy_alerts)}</b></td>
                                    <td>
                                        ${alt.cleared_by_kitchen ? `<span style="color:#059669;font-weight:700;">✓ Cleared by Chef</span>` : `<span style="color:#dc2626;font-weight:700;">⚠️ Needs Clearance</span>`}
                                    </td>
                                    <td style="text-align:right;">
                                        <button type="button" class="diet-btn sm" data-print-slip="${alt.tray_id}">🏷️ Slip</button>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            ` : `
                <div class="diet-empty" style="background:#f0fdf4;border-color:#bbf7d0;color:#166534;">
                    <b>✓ No Documented Food Allergies for This Meal Service:</b> Standard preparation protocol applies.
                </div>
            `}
        </div>

        <!-- 4. WARD & NURSING UNIT DISTRIBUTION MATRIX -->
        <div style="margin-bottom:18px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <h3 style="margin:0;font-size:16px;">3. Nursing Unit / Ward Tray Cart Distribution</h3>
                <span style="font-size:12px;color:var(--text-muted);">${wards.length} Inpatient Units</span>
            </div>

            <div class="diet-card" style="padding:0;overflow:hidden;">
                <table class="diet-table">
                    <thead>
                        <tr>
                            <th>Nursing Unit / Floor</th>
                            <th style="text-align:center;">Total Trays</th>
                            <th style="text-align:center;">Regular</th>
                            <th style="text-align:center;">Diabetic</th>
                            <th style="text-align:center;">Renal</th>
                            <th style="text-align:center;">Cardiac</th>
                            <th style="text-align:center;">NPO (Locked)</th>
                            <th style="text-align:center;">Allergies</th>
                            <th style="text-align:right;">Ward Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${wards.length ? wards.map(w => `
                            <tr>
                                <td><b>${esc(w.ward_name)}</b></td>
                                <td style="text-align:center;font-weight:800;color:#1e40af;">${w.total_trays}</td>
                                <td style="text-align:center;">${w.regular_count}</td>
                                <td style="text-align:center;">${w.diabetic_count}</td>
                                <td style="text-align:center;">${w.renal_count}</td>
                                <td style="text-align:center;">${w.cardiac_count}</td>
                                <td style="text-align:center;color:${w.npo_count ? '#dc2626' : 'inherit'};font-weight:${w.npo_count ? '700' : 'normal'};">${w.npo_count}</td>
                                <td style="text-align:center;color:${w.allergy_count ? '#dc2626' : 'inherit'};font-weight:${w.allergy_count ? '700' : 'normal'};">${w.allergy_count}</td>
                                <td style="text-align:right;">
                                    <button type="button" class="diet-btn sm" data-print-ward-slips="${esc(w.ward_name)}">🖨️ Print Ward Slips</button>
                                </td>
                            </tr>
                        `).join("") : `
                            <tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:16px;">No ward census data available.</td></tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- 5. KITCHEN BATCH COOKING PRODUCTION PREP SHEET -->
        <div style="margin-bottom:18px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <div>
                    <h3 style="margin:0;font-size:16px;color:#1e3a8a;">4. Kitchen Batch Cooking &amp; Production Prep Sheet</h3>
                    <div style="font-size:12.5px;color:var(--text-muted);margin-top:2px;">
                        Compiled kitchen portion requirements for confirmed patient meal orders.
                    </div>
                </div>
            </div>

            <div class="diet-card" style="padding:0;overflow:hidden;">
                ${prepItems.length ? `
                    <table class="diet-table">
                        <thead>
                            <tr>
                                <th>Item Code</th>
                                <th>Dish / Menu Item</th>
                                <th>Category</th>
                                <th>IDDSI Texture</th>
                                <th style="text-align:center;background:#fef3c7;color:#92400e;">Batch Portions to Cook</th>
                                <th style="text-align:right;">Total Calories</th>
                                <th>Allergen Safeguards</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${prepItems.map(pi => `
                                <tr>
                                    <td style="font-family:monospace;font-weight:700;color:#2563eb;">${esc(pi.item_code || "FOOD")}</td>
                                    <td><b>${esc(pi.item_name)}</b></td>
                                    <td><span class="diet-tag-sm">${esc(pi.item_category)}</span></td>
                                    <td><span class="diet-badge">${esc(pi.texture_level)}</span></td>
                                    <td style="text-align:center;font-weight:900;font-size:15px;background:#fffbeb;color:#b45309;">
                                        ${pi.batch_portions} portions
                                    </td>
                                    <td style="text-align:right;font-family:monospace;">${pi.total_calories || 0} kcal</td>
                                    <td>
                                        ${pi.contains_peanuts ? `<span style="color:#dc2626;font-size:11px;font-weight:700;">Contains Peanuts!</span>` : ""}
                                        ${pi.contains_shellfish ? `<span style="color:#dc2626;font-size:11px;font-weight:700;">Contains Shellfish!</span>` : ""}
                                        ${pi.contains_milk ? `<span style="color:#d97706;font-size:11px;font-weight:700;">Contains Dairy</span>` : ""}
                                        ${!pi.contains_peanuts && !pi.contains_shellfish && !pi.contains_milk ? `<span style="color:#16a34a;font-size:11px;font-weight:700;">✓ Allergen Safe</span>` : ""}
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                ` : `
                    <div class="diet-empty" style="padding:20px;">
                        No custom bedside meal orders submitted yet for this meal. The kitchen will prepare standard balanced hospital plates based on the diet counts compiled above (${sm.meals_to_cook_and_prep || 0} total active meals).
                    </div>
                `}
            </div>
        </div>
    `;
}

/**
 * Place Bedside Meal Order Modal with Automatic Prohibited Food Lockouts
 */
function openPlaceMealOrderModal(patients = []) {
    let currentSelectedItems = {}; // { itemId: quantity }
    let currentMenuData = null;

    const html = `
        <div class="diet-modal-body">
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
                <div>
                    <label>Patient ID (Numeric) *</label>
                    <input type="number" id="moPid" value="1" required placeholder="Patient ID">
                </div>
                <div>
                    <label>Meal Date *</label>
                    <input type="date" id="moDate" value="${new Date().toISOString().slice(0, 10)}" required>
                </div>
                <div>
                    <label>Meal Type *</label>
                    <select id="moType" required>
                        <option value="lunch">Lunch</option>
                        <option value="breakfast">Breakfast</option>
                        <option value="dinner">Dinner</option>
                    </select>
                </div>
            </div>

            <div id="moPrescriptionBanner" style="margin-top:8px;">
                <div class="diet-muted">Checking patient diet plan and active lockouts…</div>
            </div>

            <div style="margin-top:10px;">
                <h4 style="margin:0 0 6px;font-size:14px;">Select Hospital Menu Items (Prohibited Foods Auto-Locked):</h4>
                <div id="moMenuContainer" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:8px;max-height:360px;overflow-y:auto;padding:4px;">
                    <div class="diet-empty">Loading menu items…</div>
                </div>
            </div>

            <div id="moCartSummary" style="background:#f8fafc;border:1px solid var(--border-color);padding:10px;border-radius:8px;margin-top:10px;font-size:12.5px;">
                <div style="display:flex;justify-content:space-between;font-weight:700;">
                    <span>Selected Tray Items: <span id="moCartCount">0</span></span>
                    <span>Total Nutrients: <span id="moCartCals">0</span> kcal · <span id="moCartNa">0</span> mg Na · <span id="moCartCarbs">0</span>g Carbs</span>
                </div>
                <div id="moCartList" style="margin-top:4px;font-size:12px;color:var(--text-muted);">No items selected yet.</div>
            </div>

            <div style="margin-top:8px;">
                <label>Special Requests / Prep Notes</label>
                <input type="text" id="moNotes" placeholder="e.g. Extra napkin, warm broth first">
            </div>

            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
                <button type="button" class="diet-btn" id="moCancel">Cancel</button>
                <button type="button" class="diet-btn blue" id="moSubmit">Submit Compliant Meal Order to Kitchen</button>
            </div>
        </div>
    `;

    const ov = document.createElement("div");
    ov.className = "diet-modal-ov";
    ov.innerHTML = `
        <div class="diet-modal" style="max-width:880px;">
            <div class="diet-modal-head">
                <h3>Bedside Patient Meal Ordering &amp; Menu Lockouts</h3>
                <button type="button" class="diet-close" id="moClose">&times;</button>
            </div>
            ${html}
        </div>
    `;
    document.body.appendChild(ov);

    const close = () => ov.remove();
    ov.querySelector("#moClose").onclick = close;
    ov.querySelector("#moCancel").onclick = close;

    const pidInput = ov.querySelector("#moPid");
    const typeSelect = ov.querySelector("#moType");
    const bannerBox = ov.querySelector("#moPrescriptionBanner");
    const menuContainer = ov.querySelector("#moMenuContainer");
    const submitBtn = ov.querySelector("#moSubmit");

    const updateCartDisplay = () => {
        if (!currentMenuData) return;
        const selectedIds = Object.keys(currentSelectedItems).filter(id => currentSelectedItems[id] > 0);
        let count = 0;
        let cals = 0;
        let na = 0;
        let carbs = 0;
        let names = [];

        selectedIds.forEach(id => {
            const item = currentMenuData.menu_items.find(m => String(m.id) === String(id));
            if (item) {
                const qty = currentSelectedItems[id];
                count += qty;
                cals += item.calories * qty;
                na += item.sodium_mg * qty;
                carbs += Number(item.carbs_g) * qty;
                names.push(`${item.name} (${qty})`);
            }
        });

        ov.querySelector("#moCartCount").textContent = count;
        ov.querySelector("#moCartCals").textContent = cals;
        ov.querySelector("#moCartNa").textContent = na;
        ov.querySelector("#moCartCarbs").textContent = carbs.toFixed(1);
        ov.querySelector("#moCartList").textContent = names.length ? names.join(", ") : "No items selected yet.";
    };

    const loadMenu = async () => {
        const pid = Number(pidInput.value);
        const mtype = typeSelect.value;
        currentSelectedItems = {};
        updateCartDisplay();

        if (pid <= 0) return;

        menuContainer.innerHTML = `<div class="diet-empty">Loading compliant menu…</div>`;
        const res = await api(`/dietary/patient-menu?patient_id=${pid}&meal_type=${mtype}`).catch(() => null);

        if (!res?.success) {
            bannerBox.innerHTML = `<div style="color:#b91c1c;font-size:12px;">Failed to load patient diet plan.</div>`;
            menuContainer.innerHTML = `<div class="diet-empty">Could not load menu.</div>`;
            return;
        }

        currentMenuData = res.data;
        const { diet_prescription, diet_category, is_npo, food_allergies, menu_items } = res.data;

        if (is_npo) {
            bannerBox.innerHTML = `
                <div style="background:#fee2e2;border:2px solid #ef4444;padding:10px 14px;border-radius:8px;color:#991b1b;font-weight:700;font-size:13px;">
                    🚨 PATIENT IS STRICTLY NPO (NOTHING BY MOUTH): Meal ordering is automatically locked out for upcoming procedure / surgery.
                </div>
            `;
            menuContainer.innerHTML = `<div class="diet-empty" style="color:#b91c1c;font-weight:700;">All foods are locked out while patient is on NPO status.</div>`;
            submitBtn.disabled = true;
            submitBtn.style.opacity = "0.5";
            submitBtn.style.cursor = "not-allowed";
            return;
        }

        submitBtn.disabled = false;
        submitBtn.style.opacity = "1";
        submitBtn.style.cursor = "pointer";

        const allergyStr = food_allergies.has_food_allergies ? `<span style="color:#dc2626;font-weight:700;">🚨 Documented Allergies: ${esc(food_allergies.alert_string)}</span>` : `<span style="color:#059669;">No documented food allergies</span>`;

        bannerBox.innerHTML = `
            <div style="background:#eff6ff;border:1px solid #bfdbfe;padding:8px 12px;border-radius:6px;font-size:12.5px;color:#1e40af;">
                <div>Active Diet Order: <b style="color:#1d4ed8;">${esc(diet_category.toUpperCase())}</b> · Prescribed by: <b>${esc(diet_prescription?.prescribing_doctor_name || "Doctor")}</b></div>
                <div style="margin-top:2px;">${allergyStr}</div>
            </div>
        `;

        if (!menu_items.length) {
            menuContainer.innerHTML = `<div class="diet-empty">No menu items available for this meal type.</div>`;
            return;
        }

        menuContainer.innerHTML = menu_items.map(item => {
            const isLocked = item.is_locked;
            const cardBg = isLocked ? "#f8fafc" : "#ffffff";
            const borderCol = isLocked ? "#fca5a5" : "var(--border-color)";

            return `
                <div class="diet-card" style="background:${cardBg};border-color:${borderCol};padding:10px;display:flex;flex-direction:column;justify-content:space-between;">
                    <div>
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                            <span style="font-size:11px;font-weight:700;padding:1px 6px;border-radius:4px;background:#e2e8f0;color:#334155;">${esc(item.category.toUpperCase())}</span>
                            <span style="font-size:12px;font-weight:700;color:#1d4ed8;">${item.calories} kcal</span>
                        </div>
                        <h4 style="margin:4px 0 2px;font-size:14px;color:${isLocked ? "#64748b" : "inherit"};">${esc(item.name)}</h4>
                        <div style="font-size:11.5px;color:var(--text-muted);">${esc(item.description || "")}</div>
                        
                        <div style="font-size:11px;margin-top:4px;" class="diet-muted">
                            Na: <b>${item.sodium_mg}mg</b> · Carbs: <b>${item.carbs_g}g</b> · K: <b>${item.potassium_mg}mg</b>
                        </div>
                    </div>

                    <div style="margin-top:8px;">
                        ${isLocked ? `
                            <div style="background:#fee2e2;color:#991b1b;border:1px solid #f87171;padding:4px 6px;border-radius:4px;font-size:11px;font-weight:700;margin-bottom:6px;">
                                ⛔ ${esc(item.lockout_reason)}
                            </div>
                            <button type="button" class="diet-btn sm" disabled style="width:100%;opacity:0.4;cursor:not-allowed;background:#e2e8f0;">Prohibited on Diet Plan</button>
                        ` : `
                            <div style="display:flex;align-items:center;justify-content:space-between;">
                                <span style="font-size:11px;color:#059669;font-weight:700;">✓ Compliant</span>
                                <div style="display:flex;gap:4px;align-items:center;">
                                    <button type="button" class="diet-btn sm" data-add-item="${item.id}">+ Add</button>
                                </div>
                            </div>
                        `}
                    </div>
                </div>
            `;
        }).join("");

        menuContainer.querySelectorAll("[data-add-item]").forEach(btn => {
            btn.onclick = () => {
                const id = btn.dataset.addItem;
                currentSelectedItems[id] = (currentSelectedItems[id] || 0) + 1;
                btn.textContent = `+ Add (${currentSelectedItems[id]})`;
                btn.style.background = "#dcfce7";
                btn.style.color = "#15803d";
                updateCartDisplay();
            };
        });
    };

    pidInput.onchange = loadMenu;
    typeSelect.onchange = loadMenu;
    loadMenu();

    submitBtn.onclick = async () => {
        const selectedIds = Object.keys(currentSelectedItems).filter(id => currentSelectedItems[id] > 0);
        if (!selectedIds.length) return showToast("Please select at least one compliant menu item.", "error");

        const items = selectedIds.map(id => ({
            menu_item_id: Number(id),
            quantity: currentSelectedItems[id]
        }));

        const payload = {
            patient_id: Number(pidInput.value),
            meal_date: ov.querySelector("#moDate").value,
            meal_type: typeSelect.value,
            ordered_by_type: "patient_bedside",
            ordered_by_name: "Bedside Tablet",
            special_requests: ov.querySelector("#moNotes").value.trim(),
            items: items
        };

        const res = await api("/dietary/meal-orders", {
            method: "POST",
            body: JSON.stringify(payload)
        }).catch(() => null);

        if (!res?.success) return showToast(res?.message || "Failed to place meal order.", "error", 8000);
        showToast(res.message, "success", 7000);
        close();
        load();
    };
}

/**
 * View Placed Meal Order Details Modal
 */
async function openMealOrderDetailModal(orderId) {
    const res = await api(`/dietary/meal-orders/detail?id=${orderId}`).catch(() => null);
    if (!res?.success) return showToast("Could not load meal order details.", "error");

    const o = res.data;
    const items = o.items || [];

    const html = `
        <div class="diet-modal-body">
            <div style="background:var(--bg-muted, #f8fafc);padding:10px;border-radius:8px;font-size:12.5px;">
                <div style="display:flex;justify-content:space-between;">
                    <div><b>Patient:</b> ${esc(o.patient_name)} (${esc(o.patient_mrn)}) · Bed: <b>${esc(o.ward_room_bed)}</b></div>
                    <div><b>Order #:</b> <span style="font-family:monospace;color:#2563eb;font-weight:700;">${esc(o.order_number)}</span></div>
                </div>
                <div style="display:flex;justify-content:space-between;margin-top:4px;">
                    <div>Meal: <b>${esc(o.meal_type.toUpperCase())}</b> (${esc(o.meal_date)}) · Prescribed: <b style="color:#b45309;">${esc(o.diet_category.toUpperCase())}</b></div>
                    <div>Compliance: <span class="diet-badge good">${esc(o.diet_compliance_status.toUpperCase())}</span></div>
                </div>
            </div>

            <h4 style="margin:12px 0 6px;font-size:14px;">Ordered Menu Items:</h4>
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
                <thead>
                    <tr style="background:var(--bg-muted, #f1f5f9);text-align:left;border-bottom:1px solid var(--border-color);">
                        <th style="padding:6px;">Item Code</th>
                        <th style="padding:6px;">Menu Item</th>
                        <th style="padding:6px;">Category</th>
                        <th style="padding:6px;">Qty</th>
                        <th style="padding:6px;">Calories</th>
                        <th style="padding:6px;">Sodium</th>
                        <th style="padding:6px;">Carbs</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(it => `
                        <tr style="border-bottom:1px solid var(--border-color);">
                            <td style="padding:6px;font-family:monospace;">${esc(it.item_code || "—")}</td>
                            <td style="padding:6px;font-weight:600;">${esc(it.item_name)}</td>
                            <td style="padding:6px;"><span class="diet-badge">${esc(it.item_category)}</span></td>
                            <td style="padding:6px;">${it.quantity}</td>
                            <td style="padding:6px;font-weight:700;color:#1d4ed8;">${it.calories * it.quantity} kcal</td>
                            <td style="padding:6px;">${it.sodium_mg * it.quantity} mg</td>
                            <td style="padding:6px;">${(Number(it.carbs_g) * it.quantity).toFixed(1)} g</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>

            <div style="background:#eff6ff;padding:8px 10px;border-radius:6px;font-size:12px;margin-top:10px;display:flex;justify-content:space-between;font-weight:700;color:#1e40af;">
                <span>Total Tray Energy: ${o.total_calories} kcal</span>
                <span>Sodium: ${o.total_sodium_mg} mg · Carbs: ${o.total_carbs_g} g · Protein: ${o.total_protein_g} g · Potassium: ${o.total_potassium_mg} mg</span>
            </div>

            ${o.special_requests ? `<div style="font-size:12px;margin-top:8px;"><b>Special Requests:</b> ${esc(o.special_requests)}</div>` : ""}

            <div style="display:flex;justify-content:flex-end;margin-top:14px;">
                <button type="button" class="diet-btn" id="modCloseBtn">Close</button>
            </div>
        </div>
    `;

    const ov = document.createElement("div");
    ov.className = "diet-modal-ov";
    ov.innerHTML = `
        <div class="diet-modal" style="max-width:760px;">
            <div class="diet-modal-head">
                <h3>Meal Order Details &amp; Nutritional Summary</h3>
                <button type="button" class="diet-close" id="modClose">&times;</button>
            </div>
            ${html}
        </div>
    `;
    document.body.appendChild(ov);

    const close = () => ov.remove();
    ov.querySelector("#modClose").onclick = close;
    ov.querySelector("#modCloseBtn").onclick = close;
}

/**
 * Prescribe Clinical Diet Modal
 */
function openPrescribeDietModal(patients = []) {
    const html = `
        <div class="diet-modal-body">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div>
                    <label>Patient ID (Numeric) *</label>
                    <input type="number" id="dpPid" value="1" required placeholder="Patient ID">
                </div>
                <div>
                    <label>Ward / Room / Bed Assignment</label>
                    <input type="text" id="dpBed" placeholder="e.g. Ward 3B · Room 312 · Bed 2">
                </div>
            </div>

            <div id="dpAllergyBanner" style="display:none;background:#fee2e2;border:1px solid #f87171;padding:6px 10px;border-radius:6px;font-size:12px;color:#991b1b;margin-top:6px;">
                <b>Detected Patient Food Allergies:</b> <span id="dpAllergyText">None</span>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
                <div>
                    <label>Clinical Diet Category *</label>
                    <select id="dpCat" required>
                        <option value="regular">Regular Hospital Diet</option>
                        <option value="diabetic">Diabetic / Low Carb / Consistent Carb</option>
                        <option value="low_sodium">Low Sodium / Cardiac (DASH &lt;2g Na)</option>
                        <option value="renal">Renal (Low Protein, Low K, Low Phos)</option>
                        <option value="pureed_soft">Pureed / Mechanical Soft (Dysphagia)</option>
                        <option value="full_liquid">Full Liquid (Soups, Puddings)</option>
                        <option value="clear_liquid">Clear Liquid (Broth, Gelatin)</option>
                        <option value="npo">NPO (Nothing by Mouth - Fasting)</option>
                        <option value="enteral_tube">Enteral Tube Feed (Glucerna/Jevity)</option>
                        <option value="low_fat">Low Fat / Gallbladder Diet</option>
                        <option value="high_protein">High Protein (Wound/Burn Recovery)</option>
                    </select>
                </div>
                <div>
                    <label>Prescribing Physician Name *</label>
                    <input type="text" id="dpDoc" value="Dr. Robert Chase, MD" required>
                </div>
            </div>

            <fieldset style="margin-top:8px;">
                <legend>Dysphagia Swallowing Consistencies (IDDSI)</legend>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                    <div>
                        <label>Food Texture</label>
                        <select id="dpTex">
                            <option value="regular">Regular Food</option>
                            <option value="soft_bite_sized">Soft &amp; Bite-Sized (IDDSI 6)</option>
                            <option value="minced_moist">Minced &amp; Moist (IDDSI 5)</option>
                            <option value="pureed">Pureed (IDDSI 4)</option>
                            <option value="liquidized">Liquidized (IDDSI 3)</option>
                        </select>
                    </div>
                    <div>
                        <label>Liquid Thickness</label>
                        <select id="dpLiq">
                            <option value="thin">Thin Liquids</option>
                            <option value="mildly_thick_nectar">Mildly Thick (Nectar)</option>
                            <option value="moderately_thick_honey">Moderately Thick (Honey)</option>
                            <option value="extremely_thick_pudding">Extremely Thick (Pudding)</option>
                        </select>
                    </div>
                </div>
            </fieldset>

            <fieldset style="margin-top:8px;">
                <legend>Nutritional Constraints &amp; Targets</legend>
                <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:6px;">
                    <div><label>Calorie (kcal)</label><input type="number" id="dpKcal" placeholder="e.g. 1800"></div>
                    <div><label>Sodium (mg)</label><input type="number" id="dpNa" placeholder="e.g. 2000"></div>
                    <div><label>Fluid (mL/24h)</label><input type="number" id="dpFluid" placeholder="e.g. 1500"></div>
                </div>
                <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:6px;margin-top:4px;">
                    <div><label>Protein (g)</label><input type="number" id="dpProt" placeholder="e.g. 60"></div>
                    <div><label>Potassium (mg)</label><input type="number" id="dpK" placeholder="e.g. 2000"></div>
                    <div><label>Phosphorus (mg)</label><input type="number" id="dpPhos" placeholder="e.g. 800"></div>
                </div>
            </fieldset>

            <div style="margin-top:8px;">
                <label>Clinical Indication / Diagnosis</label>
                <input type="text" id="dpInd" placeholder="e.g. Stage 4 CKD, Type 2 DM, Post-Op Hemicolectomy">
            </div>

            <div style="margin-top:6px;">
                <label>Special Instructions &amp; Food Restrictions</label>
                <input type="text" id="dpNotes" placeholder="e.g. No citrus, double check for peanut allergy, warm trays only">
            </div>

            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
                <button type="button" class="diet-btn" id="dpCancel">Cancel</button>
                <button type="button" class="diet-btn blue" id="dpSave">Prescribe Diet &amp; Generate Meal Trays</button>
            </div>
        </div>
    `;

    const ov = document.createElement("div");
    ov.className = "diet-modal-ov";
    ov.innerHTML = `
        <div class="diet-modal">
            <div class="diet-modal-head">
                <h3>Prescribe Clinical Inpatient Diet</h3>
                <button type="button" class="diet-close" id="dpClose">&times;</button>
            </div>
            ${html}
        </div>
    `;
    document.body.appendChild(ov);

    const close = () => ov.remove();
    ov.querySelector("#dpClose").onclick = close;
    ov.querySelector("#dpCancel").onclick = close;

    // Auto-check allergies when patient ID changes
    const pidInput = ov.querySelector("#dpPid");
    const checkAllergies = async () => {
        const pid = Number(pidInput.value);
        if (pid > 0) {
            const res = await api(`/dietary/patient-allergies?patient_id=${pid}`).catch(() => null);
            if (res?.success && res.data?.has_food_allergies) {
                ov.querySelector("#dpAllergyBanner").style.display = "block";
                ov.querySelector("#dpAllergyText").textContent = res.data.alert_string;
            } else {
                ov.querySelector("#dpAllergyBanner").style.display = "none";
            }
        }
    };
    pidInput.onblur = checkAllergies;
    checkAllergies();

    ov.querySelector("#dpSave").onclick = async () => {
        const payload = {
            patient_id: Number(ov.querySelector("#dpPid").value),
            ward_room_bed: ov.querySelector("#dpBed").value.trim(),
            diet_category: ov.querySelector("#dpCat").value,
            prescribing_doctor_name: ov.querySelector("#dpDoc").value.trim(),
            texture_consistency: ov.querySelector("#dpTex").value,
            liquid_consistency: ov.querySelector("#dpLiq").value,
            calorie_target_kcal: ov.querySelector("#dpKcal").value ? Number(ov.querySelector("#dpKcal").value) : null,
            sodium_limit_mg: ov.querySelector("#dpNa").value ? Number(ov.querySelector("#dpNa").value) : null,
            fluid_restriction_ml: ov.querySelector("#dpFluid").value ? Number(ov.querySelector("#dpFluid").value) : null,
            protein_limit_g: ov.querySelector("#dpProt").value ? Number(ov.querySelector("#dpProt").value) : null,
            potassium_limit_mg: ov.querySelector("#dpK").value ? Number(ov.querySelector("#dpK").value) : null,
            phosphorus_limit_mg: ov.querySelector("#dpPhos").value ? Number(ov.querySelector("#dpPhos").value) : null,
            clinical_indication: ov.querySelector("#dpInd").value.trim(),
            special_instructions: ov.querySelector("#dpNotes").value.trim()
        };

        const res = await api("/dietary/prescriptions/save", {
            method: "POST",
            body: JSON.stringify(payload)
        }).catch(() => null);

        if (!res?.success) return showToast(res?.message || "Failed to prescribe diet.", "error");
        showToast(res.message, "success", 7000);
        close();
        load();
    };
}

/**
 * Tray Allergy Clearance & Assembly Modal
 */
async function openTrayAllergyClearanceModal(trayId) {
    const res = await api(`/dietary/trays/detail?id=${trayId}`).catch(() => null);
    if (!res?.success) return showToast("Could not load tray details.", "error");

    const tray = res.data;

    const html = `
        <div class="diet-modal-body">
            <div style="background:var(--bg-muted, #f8fafc);padding:10px;border-radius:8px;font-size:12.5px;margin-bottom:8px;">
                <div><b>Tray #:</b> <span style="font-family:monospace;color:#2563eb;font-weight:700;">${esc(tray.tray_number)}</span> · Meal: <b>${esc(tray.meal_type.toUpperCase())}</b></div>
                <div style="margin-top:3px;"><b>Patient:</b> ${esc(tray.patient_name)} (${esc(tray.patient_mrn)}) · Bed: <b>${esc(tray.ward_room_bed)}</b></div>
                <div style="margin-top:3px;"><b>Prescribed Diet:</b> <span style="color:#b45309;font-weight:700;">${esc(tray.diet_category.toUpperCase())}</span></div>
            </div>

            ${tray.has_food_allergies ? `
                <div style="background:#fee2e2;border:2px solid #ef4444;padding:10px;border-radius:8px;color:#991b1b;margin-bottom:10px;">
                    <div style="font-weight:800;font-size:13px;">🚨 MANDATORY CHEF ALLERGEN VERIFICATION:</div>
                    <div style="font-size:13px;font-weight:700;margin-top:3px;">Patient Allergies: ${esc(tray.allergy_alerts)}</div>
                    <div style="font-size:11.5px;margin-top:4px;">
                        Kitchen prep staff must verify that all ingredients, sauces, and cookware are 100% free of listed allergens.
                    </div>
                </div>

                <label style="display:flex;align-items:center;gap:6px;font-weight:700;cursor:pointer;color:#991b1b;margin-bottom:8px;">
                    <input type="checkbox" id="ckAllergyClear" checked>
                    ✓ I verify this meal tray was prepared strictly in compliance with the patient's food allergy alerts.
                </label>
            ` : ""}

            <div>
                <label>Kitchen Chef / Food Service Tech Name *</label>
                <input type="text" id="ckChef" value="Chef Marco Pierre (Executive Chef)" required>
            </div>

            <div style="margin-top:6px;">
                <label>Kitchen Assembly Notes</label>
                <input type="text" id="ckNotes" value="Prepared in sterile allergy bay; gluten-free & nut-free certified" placeholder="Notes">
            </div>

            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
                <button type="button" class="diet-btn" id="ckCancel">Cancel</button>
                <button type="button" class="diet-btn blue" id="ckSave">Confirm Assembly &amp; Ready for Delivery</button>
            </div>
        </div>
    `;

    const ov = document.createElement("div");
    ov.className = "diet-modal-ov";
    ov.innerHTML = `
        <div class="diet-modal">
            <div class="diet-modal-head">
                <h3>Kitchen Meal Tray Assembly &amp; Quality Sign-Off</h3>
                <button type="button" class="diet-close" id="ckClose">&times;</button>
            </div>
            ${html}
        </div>
    `;
    document.body.appendChild(ov);

    const close = () => ov.remove();
    ov.querySelector("#ckClose").onclick = close;
    ov.querySelector("#ckCancel").onclick = close;

    ov.querySelector("#ckSave").onclick = async () => {
        const payload = {
            tray_id: trayId,
            status: "tray_assembled",
            allergy_cleared_by_kitchen: ov.querySelector("#ckAllergyClear") ? (ov.querySelector("#ckAllergyClear").checked ? 1 : 0) : 1,
            prepared_by: ov.querySelector("#ckChef").value.trim(),
            kitchen_prep_notes: ov.querySelector("#ckNotes").value.trim()
        };

        const res = await api("/dietary/trays/status", {
            method: "POST",
            body: JSON.stringify(payload)
        }).catch(() => null);

        if (!res?.success) return showToast(res?.message || "Failed to assemble tray.", "error");
        showToast(res.message, "success", 7000);
        close();
        load();
    };
}

/**
 * View Detailed Diet Prescription & Trays Log Modal
 */
async function openDietDetailModal(prescriptionId) {
    const res = await api(`/dietary/prescriptions/detail?id=${prescriptionId}`).catch(() => null);
    if (!res?.success) return showToast("Could not load prescription details.", "error");

    const rx = res.data;
    const trays = rx.recent_trays || [];

    const html = `
        <div class="diet-modal-body">
            <div style="background:var(--bg-muted, #f8fafc);padding:10px;border-radius:8px;font-size:12.5px;">
                <div style="display:flex;justify-content:space-between;">
                    <div><b>Patient:</b> ${esc(rx.patient_name)} (${esc(rx.patient_mrn)}) · Blood Group: <b>${esc(rx.patient_blood_type || "N/A")}</b></div>
                    <div><b>Prescription #:</b> <span style="font-family:monospace;color:#2563eb;font-weight:700;">${esc(rx.prescription_number)}</span></div>
                </div>
                <div style="display:flex;justify-content:space-between;margin-top:4px;">
                    <div>Location: <b>${esc(rx.ward_room_bed)}</b> · Physician: <b>${esc(rx.prescribing_doctor_name)}</b></div>
                    <div>Status: <span class="diet-badge">${esc(rx.status.toUpperCase())}</span></div>
                </div>
            </div>

            <div style="margin-top:10px;font-size:12.5px;">
                <div><b>Prescribed Diet:</b> <span style="color:#b45309;font-weight:700;">${esc(rx.diet_category.toUpperCase())}</span></div>
                <div><b>Consistencies:</b> ${esc(rx.texture_consistency)} texture · ${esc(rx.liquid_consistency)} liquids</div>
                ${rx.clinical_indication ? `<div><b>Clinical Indication:</b> ${esc(rx.clinical_indication)}</div>` : ""}
                ${rx.special_instructions ? `<div><b>Special Instructions:</b> ${esc(rx.special_instructions)}</div>` : ""}
            </div>

            ${rx.allergies?.has_food_allergies ? `
                <div style="background:#fee2e2;border:1px solid #f87171;padding:8px 10px;border-radius:6px;font-size:12px;color:#991b1b;margin-top:10px;">
                    <b>Documented Patient Food Allergies:</b> ${esc(rx.allergies.alert_string)}
                </div>
            ` : ""}

            <h4 style="margin:12px 0 4px;font-size:14px;">Recent Meal Trays Generated</h4>
            ${trays.length ? `
                <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:6px;">
                    <thead>
                        <tr style="background:var(--bg-muted, #f1f5f9);text-align:left;border-bottom:1px solid var(--border-color);">
                            <th style="padding:6px;">Tray #</th>
                            <th style="padding:6px;">Date</th>
                            <th style="padding:6px;">Meal</th>
                            <th style="padding:6px;">Status</th>
                            <th style="padding:6px;">Allergy Cleared</th>
                            <th style="padding:6px;">Prepared By</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${trays.map(t => `
                            <tr style="border-bottom:1px solid var(--border-color);">
                                <td style="padding:6px;font-family:monospace;font-weight:700;">${esc(t.tray_number)}</td>
                                <td style="padding:6px;">${esc(t.meal_date)}</td>
                                <td style="padding:6px;font-weight:600;">${esc(t.meal_type.toUpperCase())}</td>
                                <td style="padding:6px;"><span class="diet-badge">${esc(t.status.toUpperCase())}</span></td>
                                <td style="padding:6px;">${t.allergy_cleared_by_kitchen ? `<span style="color:#059669;font-weight:700;">✓ Cleared</span>` : `<span style="color:#64748b;">N/A</span>`}</td>
                                <td style="padding:6px;font-size:11px;">${esc(t.prepared_by || "—")}</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            ` : `<div class="diet-empty" style="margin-top:8px;">No meal trays generated for this prescription yet.</div>`}

            <div style="display:flex;justify-content:flex-end;margin-top:14px;">
                <button type="button" class="diet-btn" id="rxModalCloseBtn">Close</button>
            </div>
        </div>
    `;

    const ov = document.createElement("div");
    ov.className = "diet-modal-ov";
    ov.innerHTML = `
        <div class="diet-modal" style="max-width:760px;">
            <div class="diet-modal-head">
                <h3>Clinical Diet Order &amp; Tray Summary</h3>
                <button type="button" class="diet-close" id="rxModalClose">&times;</button>
            </div>
            ${html}
        </div>
    `;
    document.body.appendChild(ov);

    const close = () => ov.remove();
    ov.querySelector("#rxModalClose").onclick = close;
    ov.querySelector("#rxModalCloseBtn").onclick = close;
}

/**
 * Open Single Tray Delivery Slip Modal
 */
async function openSingleTraySlip(trayId) {
    const res = await api(`/dietary/kitchen/tray-slips?tray_id=${trayId}`).catch(() => null);
    if (!res?.success || !res?.data?.length) {
        return showToast("Could not load bedside tray slip.", "error");
    }
    openTraySlipsPrintModal(res.data, `Bedside Meal Tray Slip — ${res.data[0].tray_number}`);
}

/**
 * Open Ward-Wide Tray Delivery Slips for Batch Printing
 */
async function openWardTraySlips(wardName) {
    const q = new URLSearchParams(Object.entries({
        meal_date: state.meal_date,
        meal_type: state.meal_type,
        ward: wardName
    }).filter(([, v]) => v));

    const res = await api(`/dietary/kitchen/tray-slips?${q}`).catch(() => null);
    if (!res?.success || !res?.data?.length) {
        return showToast(`No tray slips found for unit "${wardName}".`, "info");
    }
    openTraySlipsPrintModal(res.data, `${wardName} — Bedside Meal Tray Delivery Slips (${res.data.length} Slips)`);
}

/**
 * Open Modal Displaying Printable Bedside Meal Tray Delivery Slips
 */
function openTraySlipsPrintModal(slips, title) {
    if (!slips || !slips.length) {
        return showToast("No slips to display.", "info");
    }

    const ov = document.createElement("div");
    ov.className = "diet-modal-ov";
    ov.innerHTML = `
        <div class="diet-modal" style="max-width:880px;width:95%;">
            <div class="diet-modal-head diet-no-print">
                <div>
                    <h3 style="margin:0;">🖨️ ${esc(title || "Bedside Meal Tray Delivery Slips")}</h3>
                    <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">
                        Showing ${slips.length} patient tray delivery slips. Formatted for thermal 4"x6" / half-sheet bed cards with allergy warning banners.
                    </div>
                </div>
                <div style="display:flex;gap:8px;">
                    <button type="button" class="diet-btn blue" id="triggerPrintBtn">🖨️ Print Slips (Browser)</button>
                    <button type="button" class="diet-close" id="slipsCloseBtn">&times;</button>
                </div>
            </div>

            <div class="diet-no-print" style="background:#eff6ff;border:1px solid #bfdbfe;padding:8px 12px;border-radius:6px;font-size:12px;color:#1e40af;margin-bottom:12px;">
                <b>💡 Printing Instructions:</b> Click <b>"Print Slips"</b> to launch the print dialog. Each slip automatically page-breaks cleanly onto its own card. High-risk food allergy banners and strict diet categories are clearly marked for patient bedside verification.
            </div>

            <div id="printableSlipsContainer">
                ${slips.map(renderTraySlipHtml).join("")}
            </div>

            <div class="diet-no-print" style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;border-top:1px solid var(--border-color);padding-top:10px;">
                <button type="button" class="diet-btn" id="slipsCloseBottomBtn">Close</button>
                <button type="button" class="diet-btn blue" id="triggerPrintBottomBtn">🖨️ Print Slips Now</button>
            </div>
        </div>
    `;
    document.body.appendChild(ov);

    const close = () => ov.remove();
    ov.querySelector("#slipsCloseBtn").onclick = close;
    ov.querySelector("#slipsCloseBottomBtn").onclick = close;

    const doPrint = () => {
        window.print();
    };
    ov.querySelector("#triggerPrintBtn").onclick = doPrint;
    ov.querySelector("#triggerPrintBottomBtn").onclick = doPrint;
}

/**
 * Render HTML for an Individual Bedside Meal Tray Delivery Slip
 */
function renderTraySlipHtml(slip) {
    const isNpo = slip.is_npo;
    const hasAllergies = slip.has_food_allergies;

    return `
        <div class="diet-tray-slip ${hasAllergies ? 'has-allergy' : ''}">
            <!-- Slip Header -->
            <div class="diet-slip-header">
                <div class="diet-slip-org">
                    <div style="font-size:11px;font-weight:800;letter-spacing:1px;color:#1e3a8a;">USINTELLIX HEALTHCARE SYSTEM</div>
                    <div style="font-size:15px;font-weight:900;letter-spacing:0.5px;color:#0f172a;">BEDSIDE MEAL TRAY DELIVERY SLIP</div>
                    <div style="font-size:11px;color:#64748b;">Clinical Dietary &amp; Nutrition Services</div>
                </div>
                <div class="diet-slip-meta" style="text-align:right;">
                    <div style="font-family:monospace;font-size:15px;font-weight:800;color:#2563eb;">${esc(slip.tray_number)}</div>
                    <div style="font-size:11px;font-weight:700;color:#475569;margin-top:2px;">
                        🍽️ ${esc(slip.meal_type_display.toUpperCase())} SERVICE · ${esc(slip.meal_date)}
                    </div>
                    <div style="font-size:10px;color:#94a3b8;font-family:monospace;">BARCODE: ${esc(slip.barcode_string)}</div>
                </div>
            </div>

            <!-- Patient Identification Block (Prominent) -->
            <div class="diet-slip-patient-box">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:6px;">
                    <div>
                        <div style="font-size:10.5px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;font-weight:700;">Patient Full Name / MRN</div>
                        <div style="font-size:18px;font-weight:900;color:#0f172a;letter-spacing:-0.2px;">
                            ${esc(slip.patient_name.toUpperCase())}
                        </div>
                        <div style="font-size:12px;font-weight:700;color:#334155;margin-top:2px;">
                            MRN: <span style="font-family:monospace;">${esc(slip.patient_mrn)}</span> · DOB: ${esc(slip.patient_dob || "N/A")} ${slip.patient_age !== null ? `(${slip.patient_age} yrs)` : ""} · Sex: ${esc(slip.patient_gender || "N/A")}
                        </div>
                    </div>
                    <div style="text-align:right;background:#eff6ff;border:2px solid #3b82f6;border-radius:8px;padding:6px 14px;">
                        <div style="font-size:10px;text-transform:uppercase;font-weight:800;color:#1e40af;">BEDSIDE LOCATION</div>
                        <div style="font-size:16px;font-weight:900;color:#1e3a8a;">
                            ${esc(slip.ward_room_bed)}
                        </div>
                        <div style="font-size:10.5px;color:#3b82f6;font-weight:700;">Admission: ${esc(slip.admission_number)}</div>
                    </div>
                </div>
            </div>

            <!-- Diet Category Clinical Banner -->
            <div class="diet-slip-banner ${isNpo ? 'npo' : slip.diet_category}">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;">
                    <div>
                        <span style="font-size:10.5px;letter-spacing:1px;font-weight:800;opacity:0.9;">PRESCRIBED CLINICAL DIET:</span>
                        <div style="font-size:15px;font-weight:900;letter-spacing:0.3px;">
                            ${esc(slip.diet_category_display)}
                        </div>
                    </div>
                    <div style="text-align:right;font-size:11.5px;font-weight:700;">
                        <div>Texture: <b>${esc(slip.texture_display)}</b></div>
                        <div>Liquids: <b>${esc(slip.liquid_display)}</b></div>
                    </div>
                </div>
            </div>

            <!-- FOOD ALLERGY WARNING BANNER -->
            ${hasAllergies ? `
                <div class="diet-slip-allergy-alert">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="font-size:22px;">⚠️</span>
                        <div>
                            <div style="font-size:11.5px;font-weight:900;letter-spacing:0.8px;text-transform:uppercase;color:#7f1d1d;">
                                CRITICAL PATIENT FOOD ALLERGY WARNING — STRICT CONTAMINATION PREVENTION
                            </div>
                            <div style="font-size:13.5px;font-weight:800;color:#991b1b;margin-top:1px;">
                                ${esc(slip.allergy_alerts)}
                            </div>
                        </div>
                    </div>
                    <div style="margin-top:4px;font-size:10.5px;color:#7f1d1d;font-weight:600;">
                        Notice to Kitchen &amp; Nursing: Tray must NOT contain any traces of above allergens. Kitchen allergen barrier certified.
                    </div>
                </div>
            ` : `
                <div class="diet-slip-allergy-ok">
                    ✓ NO DOCUMENTED FOOD ALLERGIES ON RECORD FOR THIS PATIENT
                </div>
            `}

            <!-- Tray Contents / Line Items Table -->
            <div class="diet-slip-contents">
                ${isNpo ? `
                    <div style="background:#fee2e2;border:2px dashed #dc2626;padding:16px;text-align:center;border-radius:6px;color:#991b1b;margin-bottom:10px;">
                        <div style="font-size:18px;font-weight:900;">⛔ STRICT NPO: DO NOT DELIVER FOOD OR FLUIDS</div>
                        <div style="font-size:12.5px;font-weight:700;margin-top:4px;">Patient is under STRICT NPO (Nil Per Os) fasting orders for pre-op / procedural hold.</div>
                        <div style="font-size:11px;margin-top:2px;color:#7f1d1d;">Suppressed at kitchen level. Keep water pitcher away from bedside.</div>
                    </div>
                ` : `
                    <table class="diet-slip-table">
                        <thead>
                            <tr>
                                <th style="width:55%;">Dish / Food Item on Tray</th>
                                <th style="width:15%;text-align:center;">Qty</th>
                                <th style="width:15%;text-align:right;">Calories</th>
                                <th style="width:15%;text-align:right;">Sodium</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${slip.items.length ? slip.items.map(it => `
                                <tr>
                                    <td>
                                        <b>${esc(it.item_name)}</b>
                                        ${it.item_category ? `<span class="diet-tag-sm">${esc(it.item_category)}</span>` : ""}
                                    </td>
                                    <td style="text-align:center;font-weight:700;">${it.quantity}x</td>
                                    <td style="text-align:right;font-family:monospace;">${it.calories || 0} kcal</td>
                                    <td style="text-align:right;font-family:monospace;">${it.sodium_mg || 0} mg</td>
                                </tr>
                            `).join("") : `
                                <tr>
                                    <td colspan="4" style="text-align:center;color:#64748b;font-style:italic;padding:8px;">Standard compliant tray preparation for ${esc(slip.diet_category_display)}</td>
                                </tr>
                            `}
                        </tbody>
                    </table>

                    <!-- Nutritional Totals Gauge -->
                    <div class="diet-slip-totals-bar">
                        <div><b>Nutritional Totals:</b></div>
                        <div>Calories: <b>${slip.nutritional_totals?.calories || 0} kcal</b></div>
                        <div>Sodium: <b>${slip.nutritional_totals?.sodium_mg || 0} mg</b></div>
                        <div>Carbs: <b>${slip.nutritional_totals?.carbs_g || 0} g</b></div>
                        <div>Protein: <b>${slip.nutritional_totals?.protein_g || 0} g</b></div>
                        <div>Potassium: <b>${slip.nutritional_totals?.potassium_mg || 0} mg</b></div>
                    </div>
                `}
            </div>

            <!-- Physician Order & Special Instructions -->
            <div class="diet-slip-instructions">
                <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;">
                    <div>
                        <b>Prescribing Physician:</b> ${esc(slip.prescribing_doctor_name || "Staff Physician")} · Rx #: <span style="font-family:monospace;">${esc(slip.prescription_number)}</span>
                        ${slip.clinical_indication ? `<div><b>Indication:</b> ${esc(slip.clinical_indication)}</div>` : ""}
                    </div>
                    <div style="text-align:right;">
                        ${slip.special_instructions ? `<div><b>Special Notes:</b> <span style="color:#b45309;font-weight:700;">${esc(slip.special_instructions)}</span></div>` : ""}
                    </div>
                </div>
            </div>

            <!-- Triple Verification & Sign-Off Block -->
            <div class="diet-slip-signoff">
                <div class="diet-sign-col">
                    <div class="sign-title">1. Kitchen Prep &amp; Allergy Clearance</div>
                    <div class="sign-line">Cook/Chef: <b>${esc(slip.prepared_by || "____________________")}</b></div>
                    <div class="sign-line">Allergen Zone: [ ${slip.allergy_cleared_by_kitchen ? '✓' : '  '} ] Cleared</div>
                    <div class="sign-line">Time: ___________________</div>
                </div>
                <div class="diet-sign-col">
                    <div class="sign-title">2. Tray Cart Assembly &amp; Temp Check</div>
                    <div class="sign-line">Tray Checker: ____________________</div>
                    <div class="sign-line">Temp: Hot &ge; 60°C / Cold &le; 4°C: [  ]</div>
                    <div class="sign-line">Cart Number: _________________</div>
                </div>
                <div class="diet-sign-col">
                    <div class="sign-title">3. Bedside 2-Identifier Delivery Check</div>
                    <div class="sign-line">Delivered by: <b>${esc(slip.delivered_by || "____________________")}</b></div>
                    <div class="sign-line">Wristband ID Checked: [  ] Verified</div>
                    <div class="sign-line">Delivery Time: _________________</div>
                </div>
            </div>
        </div>
    `;
}

function ensureCss() {
    if (document.getElementById("dietaryStyles")) return;
    const style = document.createElement("style");
    style.id = "dietaryStyles";
    style.textContent = `
        .diet-root { padding: 20px 24px 40px; max-width: 1400px; margin: 0 auto; color: var(--text-primary); font-family: inherit; }
        .diet-head { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
        .diet-head h1 { margin: 0; font-size: 22px; font-weight: 700; }
        .diet-sub { color: var(--text-muted); font-size: 13px; margin-top: 3px; }
        .diet-nav-tabs { display: flex; gap: 6px; border-bottom: 2px solid var(--border-color); margin-bottom: 14px; overflow-x: auto; }
        .diet-tab-btn { border: none; background: none; padding: 8px 16px; font: inherit; font-size: 13px; font-weight: 700; color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; white-space: nowrap; }
        .diet-tab-btn.active { color: #b45309; border-bottom-color: #b45309; }
        .diet-btn { border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary); border-radius: 8px; padding: 7px 14px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
        .diet-btn.blue { background: #b45309; border-color: #b45309; color: #fff; }
        .diet-btn.sm { padding: 4px 10px; font-size: 12px; }
        .diet-counts { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
        .diet-counts div { border: 1px solid var(--border-color); border-radius: 8px; padding: 6px 12px; background: var(--bg-surface); font-size: 12px; }
        .diet-counts b { font-size: 17px; margin-right: 5px; font-variant-numeric: tabular-nums; }
        .diet-counts .good b { color: #059669; }
        .diet-counts .warn b { color: #d97706; }
        .diet-counts .bad b { color: #dc2626; }
        .diet-tools { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 14px; }
        .diet-tools select, .diet-tools input { border: 1px solid var(--border-color); border-radius: 6px; padding: 7px 9px; font: inherit; font-size: 13px; background: var(--bg-surface); color: var(--text-primary); }
        .diet-tools input[type=search] { min-width: 280px; }
        .diet-list { display: grid; gap: 10px; }
        .diet-card { border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); padding: 12px 14px; }
        .diet-card.bad { border-left: 4px solid #dc2626; }
        .diet-card.warn { border-left: 4px solid #d97706; }
        .diet-muted { color: var(--text-muted); font-size: 13px; }
        .diet-empty { padding: 24px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 10px; }
        .diet-badge { display: inline-block; padding: 2px 7px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #f1f5f9; color: #475569; }
        .diet-badge.good { background: #dcfce7; color: #15803d; }
        .diet-badge.warn { background: #fef3c7; color: #b45309; }
        .diet-badge.bad { background: #fee2e2; color: #b91c1c; }
        .diet-tag-sm { display: inline-block; font-size: 10px; text-transform: uppercase; background: #e2e8f0; color: #334155; padding: 1px 5px; border-radius: 3px; font-weight: 700; margin-left: 4px; }
        
        /* Census Grid & Progress */
        .diet-census-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 10px; margin-bottom: 16px; }
        .diet-census-card { border: 1px solid var(--border-color); border-radius: 10px; background: var(--bg-surface); padding: 12px; position: relative; overflow: hidden; }
        .diet-census-card.npo { border-color: #ef4444; background: #fff5f5; }
        .diet-census-num { font-size: 26px; font-weight: 900; line-height: 1; }
        .diet-census-label { font-size: 13px; font-weight: 700; margin: 4px 0 2px; }
        .diet-census-desc { font-size: 11px; color: var(--text-muted); }
        .diet-census-progress { height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; margin-top: 8px; }
        .diet-census-bar { height: 100%; border-radius: 3px; }
        
        .diet-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
        .diet-table th { background: var(--bg-muted, #f8fafc); padding: 8px 10px; text-align: left; border-bottom: 1px solid var(--border-color); font-weight: 700; }
        .diet-table td { padding: 8px 10px; border-bottom: 1px solid var(--border-color); vertical-align: middle; }

        /* Modal Overlay */
        .diet-modal-ov { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 16px; }
        .diet-modal { background: var(--bg-surface, #fff); border-radius: 12px; width: 100%; max-width: 740px; max-height: 90vh; overflow-y: auto; padding: 16px 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
        .diet-modal-head { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; margin-bottom: 12px; }
        .diet-modal-head h3 { margin: 0; font-size: 17px; }
        .diet-close { background: none; border: none; font-size: 22px; cursor: pointer; color: var(--text-muted); }
        .diet-modal-body label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 2px; }
        .diet-modal-body input[type=text], .diet-modal-body input[type=date], .diet-modal-body input[type=number], .diet-modal-body select { width: 100%; box-sizing: border-box; border: 1px solid var(--border-color); border-radius: 6px; padding: 6px 8px; font: inherit; font-size: 13px; }
        .diet-modal-body fieldset { border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; margin-top: 8px; }
        .diet-modal-body legend { font-weight: 700; font-size: 12.5px; padding: 0 4px; }

        /* Bedside Tray Slip Styling */
        .diet-tray-slip { border: 2px solid #1e293b; border-radius: 8px; padding: 16px; background: #fff; color: #0f172a; margin-bottom: 16px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
        .diet-tray-slip.has-allergy { border: 3px solid #dc2626 !important; }
        .diet-slip-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 10px; }
        .diet-slip-patient-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; margin-bottom: 10px; background: #f8fafc; }
        .diet-slip-banner { padding: 8px 12px; border-radius: 6px; color: #fff; margin-bottom: 10px; }
        .diet-slip-banner.regular { background: #059669; }
        .diet-slip-banner.diabetic { background: #2563eb; }
        .diet-slip-banner.renal { background: #7c3aed; }
        .diet-slip-banner.low_sodium { background: #db2777; }
        .diet-slip-banner.pureed_soft { background: #d97706; }
        .diet-slip-banner.clear_liquid { background: #0891b2; }
        .diet-slip-banner.full_liquid { background: #0d9488; }
        .diet-slip-banner.npo { background: #dc2626; }
        .diet-slip-banner.enteral_tube { background: #475569; }
        .diet-slip-banner.low_fat { background: #4f46e5; }
        .diet-slip-banner.high_protein { background: #ea580c; }
        .diet-slip-banner.custom { background: #4b5563; }
        
        .diet-slip-allergy-alert { background: #fef2f2; border: 2px solid #dc2626; border-radius: 6px; padding: 8px 12px; margin-bottom: 10px; color: #991b1b; }
        .diet-slip-allergy-ok { background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 6px 10px; font-size: 11.5px; font-weight: 700; color: #166534; margin-bottom: 10px; }
        .diet-slip-table { width: 100%; border-collapse: collapse; font-size: 12px; margin: 8px 0; }
        .diet-slip-table th { background: #f1f5f9; border-bottom: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
        .diet-slip-table td { border-bottom: 1px solid #e2e8f0; padding: 6px 8px; }
        .diet-slip-totals-bar { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; font-size: 11.5px; display: flex; gap: 12px; flex-wrap: wrap; margin: 6px 0 10px; }
        .diet-slip-instructions { border-top: 1px dashed #cbd5e1; padding-top: 6px; font-size: 11.5px; margin-bottom: 10px; color: #334155; }
        .diet-slip-signoff { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; border-top: 2px solid #0f172a; padding-top: 8px; font-size: 10.5px; }
        .diet-sign-col { border: 1px solid #cbd5e1; border-radius: 4px; padding: 6px; background: #f8fafc; }
        .sign-title { font-weight: 800; text-transform: uppercase; margin-bottom: 4px; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; }
        .sign-line { margin-top: 3px; color: #475569; }

        /* Print Media Styles */
        @media print {
            body * { visibility: hidden !important; }
            #printableSlipsContainer, #printableSlipsContainer * { visibility: visible !important; }
            #printableSlipsContainer {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            .diet-tray-slip {
                page-break-after: always !important;
                break-after: page !important;
                border: 2px solid #000 !important;
                margin: 0 0 20px 0 !important;
                padding: 16px !important;
                box-shadow: none !important;
                width: 100% !important;
                box-sizing: border-box !important;
            }
            .diet-modal-ov {
                position: static !important;
                background: none !important;
                padding: 0 !important;
            }
            .diet-modal {
                max-width: 100% !important;
                max-height: none !important;
                box-shadow: none !important;
                padding: 0 !important;
                overflow: visible !important;
            }
            .diet-no-print {
                display: none !important;
            }
        }
    `;
    document.head.appendChild(style);
}
