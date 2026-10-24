import { api } from "../../core/api.js?v=10";
import { showToast } from "../../core/toast.js";

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let state = {
    view: "prescriptions", // "prescriptions" | "kitchen" | "npo_watchlist" | "guidelines"
    diet_category: "",
    status: "active",
    meal_date: new Date().toISOString().slice(0, 10),
    meal_type: "",
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
    const isRx = state.view === "prescriptions";
    const isKitchen = state.view === "kitchen";
    const isNpo = state.view === "npo_watchlist";
    const isGuides = state.view === "guidelines";

    const s = data.stats || {};
    const tab = (v, l) => `<button type="button" class="diet-tab-btn ${state.view === v ? "active" : ""}" data-diet-view="${v}">${l}</button>`;

    root.innerHTML = `
        <div class="diet-head">
            <div>
                <h1>Dietary &amp; Nutrition Services</h1>
                <div class="diet-sub">Clinical diet prescriptions (Diabetic, Renal, Low Sodium, Dysphagia, NPO), kitchen meal tray assembly, and automated food allergy safety alerts.</div>
            </div>
            <div style="display:flex;gap:8px;">
                <button type="button" class="diet-btn blue" id="dietPrescribeBtn">+ Prescribe Clinical Diet</button>
            </div>
        </div>

        <div class="diet-nav-tabs">
            ${tab("prescriptions", "Clinical Diet Orders")}
            ${tab("kitchen", "Kitchen Tray Assembly & Allergies")}
            ${tab("npo_watchlist", `NPO Fasting Watchlist ${s.npo_fasting_patients ? `(${s.npo_fasting_patients})` : ""}`)}
            ${tab("guidelines", "Diet & Dysphagia Guidelines")}
        </div>

        ${renderKpi(s)}

        ${!isGuides ? `
            <div class="diet-tools">
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

                <input type="search" id="dietSearch" value="${esc(state.q)}" placeholder="${isKitchen ? "Search tray #, patient, room/bed..." : "Search prescription #, patient name, room..."}">
            </div>
        ` : ""}

        ${isRx ? renderPrescriptionsList(data.prescriptions) : isKitchen ? renderKitchenTraysList(data.trays) : isNpo ? renderNpoWatchlist(data.prescriptions) : renderGuidelinesView()}
    `;

    // Tab buttons
    root.querySelectorAll("[data-diet-view]").forEach(btn => {
        btn.onclick = () => {
            state.view = btn.dataset.dietView;
            load();
        };
    });

    if (root.querySelector("#dietPrescribeBtn")) root.querySelector("#dietPrescribeBtn").onclick = () => openPrescribeDietModal(data.patients);

    if (root.querySelector("#dietFilterCat")) root.querySelector("#dietFilterCat").onchange = (e) => { state.diet_category = e.target.value; load(); };
    if (root.querySelector("#dietFilterStatus")) root.querySelector("#dietFilterStatus").onchange = (e) => { state.status = e.target.value; load(); };
    if (root.querySelector("#dietMealDate")) root.querySelector("#dietMealDate").onchange = (e) => { state.meal_date = e.target.value; load(); };
    if (root.querySelector("#dietMealType")) root.querySelector("#dietMealType").onchange = (e) => { state.meal_type = e.target.value; load(); };
    if (root.querySelector("#dietFilterAllergy")) root.querySelector("#dietFilterAllergy").onchange = (e) => { state.has_food_allergies = e.target.value; load(); };

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
        const viewRxBtn = e.target.closest("[data-view-rx]");
        if (viewRxBtn) {
            openDietDetailModal(Number(viewRxBtn.dataset.viewRx));
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
            <div class="${s.npo_fasting_patients ? "bad" : ""}"><b>${s.npo_fasting_patients || 0}</b>NPO Fasting (Tray Lock)</div>
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
        .diet-modal-ov { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 16px; }
        .diet-modal { background: var(--bg-surface, #fff); border-radius: 12px; width: 100%; max-width: 740px; max-height: 90vh; overflow-y: auto; padding: 16px 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
        .diet-modal-head { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; margin-bottom: 12px; }
        .diet-modal-head h3 { margin: 0; font-size: 17px; }
        .diet-close { background: none; border: none; font-size: 22px; cursor: pointer; color: var(--text-muted); }
        .diet-modal-body label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 2px; }
        .diet-modal-body input[type=text], .diet-modal-body input[type=date], .diet-modal-body input[type=number], .diet-modal-body select { width: 100%; box-sizing: border-box; border: 1px solid var(--border-color); border-radius: 6px; padding: 6px 8px; font: inherit; font-size: 13px; }
        .diet-modal-body fieldset { border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; margin-top: 8px; }
        .diet-modal-body legend { font-weight: 700; font-size: 12.5px; padding: 0 4px; }
    `;
    document.head.appendChild(style);
}
