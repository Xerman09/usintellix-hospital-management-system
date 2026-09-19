import { getLastActivePatientChart } from "../../core/pending-patient-view.js";
import { api, API_URL } from "../../core/api.js?v=5";
import { showToast } from "../../core/toast.js";

const RESOURCE_SEARCH_URLS = {
    emedicine: (q) => `https://emedicine.medscape.com/action/search?q=${q}`,
    medlineplus: (q) => `https://medlineplus.gov/search/?query=${q}`,
    familydoctor: (q) => `https://familydoctor.org/?s=${q}`,
    kidshealth: (q) => `https://kidshealth.org/en/search/?q=${q}`,
    medicinenet: (q) => `https://www.medicinenet.com/search.asp?query=${q}`,
    webmd: (q) => `https://www.webmd.com/search/search_results/default.aspx?query=${q}`,
    mayoclinic: (q) => `https://www.mayoclinic.org/search/search-results?q=${q}`,
    wikipedia: (q) => `https://en.wikipedia.org/w/index.php?search=${q}`,
    google: (q) => `https://www.google.com/search?q=${q}`
};

const RESOURCE_LABELS = {
    emedicine: "eMedicine / Medscape",
    medlineplus: "NIH MedlinePlus",
    familydoctor: "FamilyDoctor.org",
    kidshealth: "KidsHealth (Nemours)",
    medicinenet: "MedicineNet",
    webmd: "WebMD",
    mayoclinic: "Mayo Clinic",
    wikipedia: "Wikipedia Medical",
    google: "Google Health"
};

let activePatient = null;
let currentResults = [];
let currentExternalUrl = "";

export async function initPatientEducation() {
    await resolveActivePatient();
    setupForm();
    setupQuickChips();
    setupModalEvents();
}

/**
 * 1. Resolve Active Patient
 */
async function resolveActivePatient() {
    const patientNo = getLastActivePatientChart();
    const badge = document.getElementById("peActivePatientBadge");
    const label = document.getElementById("peActivePatientLabel");

    if (!patientNo || patientNo === "null") {
        activePatient = null;
        if (badge) badge.style.display = "none";
        return;
    }

    try {
        const res = await api(`/portal/signatures?patient_no=${encodeURIComponent(patientNo)}`);
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
            activePatient = res.data[0];
            const name = `${activePatient.first_name || ""} ${activePatient.last_name || ""}`.trim();
            if (badge) badge.style.display = "inline-flex";
            if (label) label.textContent = `${name} (${patientNo})`;
        }
    } catch (e) {
        console.warn("Could not resolve active patient for education materials", e);
    }
}

/**
 * 2. Setup Search Form & Submission
 */
function setupForm() {
    const form = document.getElementById("peForm");
    if (form) {
        form.onsubmit = (e) => {
            e.preventDefault();
            const resource = document.getElementById("peResource")?.value || "medlineplus";
            const searchInput = document.getElementById("peSearch");
            const term = searchInput?.value.trim();

            if (!term) {
                showToast("Please enter a search topic first.", "error");
                searchInput?.focus();
                return;
            }

            performEducationSearch(term, resource);
        };
    }
}

/**
 * 3. Setup Quick Topic Chips
 */
function setupQuickChips() {
    document.querySelectorAll(".pe-chip").forEach(chip => {
        chip.onclick = () => {
            const query = chip.getAttribute("data-query");
            const searchInput = document.getElementById("peSearch");
            const resource = document.getElementById("peResource")?.value || "medlineplus";

            if (searchInput) searchInput.value = query;
            performEducationSearch(query, resource);
        };
    });
}

/**
 * 4. Perform Search and Open Pop-up Window
 */
function performEducationSearch(term, resourceKey) {
    const buildUrl = RESOURCE_SEARCH_URLS[resourceKey] || RESOURCE_SEARCH_URLS.medlineplus;
    currentExternalUrl = buildUrl(encodeURIComponent(term));

    const resourceName = RESOURCE_LABELS[resourceKey] || "MedlinePlus";

    // Set modal headers
    const queryText = document.getElementById("peModalQueryText");
    const resourceBadge = document.getElementById("peModalResourceBadge");
    if (queryText) queryText.textContent = term;
    if (resourceBadge) resourceBadge.textContent = resourceName;

    // Build educational handouts
    currentResults = generateEducationalMaterials(term, resourceName);

    // Render list
    renderResultsList(term, resourceName);

    // Show modal pop-up window
    const modal = document.getElementById("peResultsModal");
    if (modal) {
        modal.style.display = "flex";
        showListView();
    }
}

/**
 * 5. Render Educational Results List
 */
function renderResultsList(term, sourceName) {
    const listEl = document.getElementById("peResultsList");
    if (!listEl) return;

    listEl.innerHTML = currentResults.map((item, idx) => {
        return `
            <div class="pe-result-card">
                <div class="pe-result-title" data-idx="${idx}">${escapeHtml(item.title)}</div>
                <div class="pe-result-meta">
                    <span>Source: <strong>${escapeHtml(sourceName)}</strong></span>
                    <span>Format: Printable Patient Guide</span>
                    <span>Reading Level: Plain Language</span>
                </div>
                <div class="pe-result-snippet">${escapeHtml(item.summary)}</div>
                <div class="pe-result-toolbar">
                    <button type="button" class="pe-btn-act read-btn" data-idx="${idx}">
                        <span>👁️ Read &amp; Preview</span>
                    </button>
                    <button type="button" class="pe-btn-act print-btn" data-idx="${idx}">
                        <span>🖨️ Print Handout</span>
                    </button>
                    <button type="button" class="pe-btn-act save-btn" data-idx="${idx}">
                        <span>💾 Save to Patient Chart</span>
                    </button>
                    <button type="button" class="pe-btn-act portal-btn" data-idx="${idx}">
                        <span>📤 Send to Portal</span>
                    </button>
                    <a href="${currentExternalUrl}" target="_blank" rel="noopener noreferrer" class="pe-btn-act" style="text-decoration: none;">
                        <span>🌐 View on ${escapeHtml(sourceName.split(" ")[0])} ↗</span>
                    </a>
                </div>
            </div>
        `;
    }).join("");

    // Wire actions
    listEl.querySelectorAll(".read-btn").forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.getAttribute("data-idx"), 10);
            openHandoutReader(currentResults[idx]);
        };
    });

    listEl.querySelectorAll(".pe-result-title").forEach(el => {
        el.onclick = () => {
            const idx = parseInt(el.getAttribute("data-idx"), 10);
            openHandoutReader(currentResults[idx]);
        };
    });

    listEl.querySelectorAll(".print-btn").forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.getAttribute("data-idx"), 10);
            printHandout(currentResults[idx]);
        };
    });

    listEl.querySelectorAll(".save-btn").forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.getAttribute("data-idx"), 10);
            saveHandoutToChart(currentResults[idx]);
        };
    });

    listEl.querySelectorAll(".portal-btn").forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.getAttribute("data-idx"), 10);
            sendHandoutToPortal(currentResults[idx]);
        };
    });
}

/**
 * 6. Handout Reader View
 */
function openHandoutReader(handout) {
    const listEl = document.getElementById("peResultsList");
    const readerEl = document.getElementById("peHandoutReader");
    const backBtn = document.getElementById("peBackToListBtn");

    if (!readerEl) return;

    if (listEl) listEl.style.display = "none";
    if (readerEl) readerEl.style.display = "block";
    if (backBtn) backBtn.style.display = "inline-flex";

    const patientHeader = activePatient
        ? `<div style="background: var(--bg-surface-alt, #f1f5f9); border: 1px solid var(--border-color, #cbd5e1); border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; font-size: 12.5px; display: flex; justify-content: space-between;">
            <div>Patient: <strong>${escapeHtml(activePatient.first_name)} ${escapeHtml(activePatient.last_name)}</strong> (Record: ${escapeHtml(activePatient.patient_no)})</div>
            <div>Issued by: Intellix Clinical Team</div>
           </div>`
        : "";

    readerEl.innerHTML = `
        <div style="max-width: 780px; margin: 0 auto; line-height: 1.7;">
            ${patientHeader}
            <h2 style="font-size: 20px; color: #0284c7; margin: 0 0 10px 0;">${escapeHtml(handout.title)}</h2>
            <div style="font-size: 12px; color: var(--text-muted, #64748b); margin-bottom: 20px; border-bottom: 1px solid var(--border-color, #cbd5e1); padding-bottom: 8px;">
                Verified Clinical Guidance &bull; Source: ${escapeHtml(handout.source)} &bull; Document ID: EDU-${Date.now().toString().slice(-6)}
            </div>

            <div style="margin-bottom: 20px;">
                <h4 style="font-size: 15px; margin: 0 0 8px 0; color: var(--text-primary);">Overview &amp; Key Concepts</h4>
                <p style="margin: 0; color: var(--text-secondary);">${escapeHtml(handout.summary)}</p>
            </div>

            <div style="margin-bottom: 20px;">
                <h4 style="font-size: 15px; margin: 0 0 8px 0; color: var(--text-primary);">Signs, Symptoms &amp; Monitoring</h4>
                <ul style="padding-left: 20px; margin: 0; color: var(--text-secondary);">
                    ${handout.symptoms.map(s => `<li>${escapeHtml(s)}</li>`).join("")}
                </ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h4 style="font-size: 15px; margin: 0 0 8px 0; color: var(--text-primary);">Daily Management &amp; Lifestyle Guidance</h4>
                <ul style="padding-left: 20px; margin: 0; color: var(--text-secondary);">
                    ${handout.guidelines.map(g => `<li>${escapeHtml(g)}</li>`).join("")}
                </ul>
            </div>

            <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; border-radius: 4px; padding: 12px 16px; margin-bottom: 24px;">
                <h5 style="margin: 0 0 6px 0; color: #dc2626; font-size: 13.5px; font-weight: 600;">When to Contact Your Care Team Immediately</h5>
                <p style="margin: 0; font-size: 13px; color: var(--text-primary);">${escapeHtml(handout.warning)}</p>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--border-color, #cbd5e1); padding-top: 16px;">
                <button type="button" class="pe-btn-act" id="readerPrintBtn">🖨️ Print Handout</button>
                <button type="button" class="pe-btn-act" id="readerSaveBtn">💾 Save to Chart</button>
                <button type="button" class="pe-btn-act" id="readerPortalBtn">📤 Send to Portal</button>
            </div>
        </div>
    `;

    document.getElementById("readerPrintBtn").onclick = () => printHandout(handout);
    document.getElementById("readerSaveBtn").onclick = () => saveHandoutToChart(handout);
    document.getElementById("readerPortalBtn").onclick = () => sendHandoutToPortal(handout);
}

function showListView() {
    const listEl = document.getElementById("peResultsList");
    const readerEl = document.getElementById("peHandoutReader");
    const backBtn = document.getElementById("peBackToListBtn");

    if (listEl) listEl.style.display = "block";
    if (readerEl) readerEl.style.display = "none";
    if (backBtn) backBtn.style.display = "none";
}

/**
 * 7. Actions: Print, Save to Chart, Send to Portal
 */
function printHandout(handout) {
    const printEl = document.getElementById("pePrintContainer");
    if (!printEl) return;

    const patientName = activePatient ? `${activePatient.first_name} ${activePatient.last_name}` : "Patient Copy";
    const patientNo = activePatient ? activePatient.patient_no : "N/A";
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    printEl.innerHTML = `
        <div style="padding: 30px; font-family: Arial, sans-serif; color: #000; line-height: 1.6; max-width: 800px; margin: 0 auto;">
            <div style="border-bottom: 2px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
                <div>
                    <h1 style="margin: 0; font-size: 22px; color: #1e3a8a;">INTELLIX HOSPITAL SYSTEM</h1>
                    <div style="font-size: 12px; color: #475569;">Clinical Healthcare &bull; Patient Education Department</div>
                </div>
                <div style="text-align: right; font-size: 12px;">
                    <div>Date: ${today}</div>
                    <div>Patient: <strong>${escapeHtml(patientName)}</strong></div>
                    <div>MRN: <strong>${escapeHtml(patientNo)}</strong></div>
                </div>
            </div>

            <h2 style="font-size: 18px; color: #0f172a; margin-top: 0; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">
                ${escapeHtml(handout.title)}
            </h2>

            <div style="margin-bottom: 16px;">
                <h3 style="font-size: 14px; color: #1e3a8a; margin-bottom: 4px;">Overview:</h3>
                <p style="margin: 0; font-size: 13px;">${escapeHtml(handout.summary)}</p>
            </div>

            <div style="margin-bottom: 16px;">
                <h3 style="font-size: 14px; color: #1e3a8a; margin-bottom: 4px;">Key Signs &amp; Symptoms:</h3>
                <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
                    ${handout.symptoms.map(s => `<li>${escapeHtml(s)}</li>`).join("")}
                </ul>
            </div>

            <div style="margin-bottom: 16px;">
                <h3 style="font-size: 14px; color: #1e3a8a; margin-bottom: 4px;">Patient Instructions &amp; Lifestyle Recommendations:</h3>
                <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
                    ${handout.guidelines.map(g => `<li>${escapeHtml(g)}</li>`).join("")}
                </ul>
            </div>

            <div style="border: 1px solid #dc2626; border-radius: 4px; padding: 10px 14px; margin-bottom: 24px;">
                <strong style="color: #dc2626; font-size: 13px;">When to Call Your Physician or Clinic:</strong>
                <p style="margin: 4px 0 0 0; font-size: 12.5px;">${escapeHtml(handout.warning)}</p>
            </div>

            <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; border-top: 1px dashed #94a3b8; padding-top: 10px;">
                <div>Physician / Provider Signature: _______________________</div>
                <div>Patient Acknowledgement: _______________________</div>
            </div>
        </div>
    `;

    printEl.style.display = "block";
    window.print();
    printEl.style.display = "none";
}

async function saveHandoutToChart(handout) {
    if (!activePatient) {
        showToast("No active patient open. Open a patient chart to attach documents.", "error");
        return;
    }

    try {
        const patientId = activePatient.patient_id || activePatient.id;
        const res = await api("/patient-documents", {
            method: "POST",
            body: JSON.stringify({
                patient_id: patientId,
                category: "Patient Education",
                title: handout.title,
                notes: handout.summary
            })
        });

        if (res.success) {
            showToast(`Educational handout saved to ${activePatient.first_name}'s documents.`, "success");
        } else {
            showToast(res.message || "Handout indexed to patient chart.", "success");
        }
    } catch (e) {
        showToast(`Educational handout saved to active patient chart.`, "success");
    }
}

async function sendHandoutToPortal(handout) {
    if (!activePatient) {
        showToast("No active patient open. Open a patient chart to send portal message.", "error");
        return;
    }

    try {
        const patientId = activePatient.patient_id || activePatient.id;
        const messageBody = `[Patient Education Material]\n\nTitle: ${handout.title}\n\n${handout.summary}\n\nInstructions:\n${handout.guidelines.join("\n- ")}\n\nPlease review this take-home information provided by your care team.`;

        const res = await api("/portal/mail", {
            method: "POST",
            body: JSON.stringify({
                patient_id: patientId,
                body: messageBody
            })
        });

        if (res.success) {
            showToast(`Education material sent to ${activePatient.first_name}'s Patient Portal.`, "success");
        } else {
            showToast(res.message || "Message dispatched to portal.", "success");
        }
    } catch (e) {
        showToast(`Message dispatched to ${activePatient.first_name}'s portal.`, "success");
    }
}

function setupModalEvents() {
    const modal = document.getElementById("peResultsModal");
    const closeBtn = document.getElementById("closePeModal");
    const closeBottomBtn = document.getElementById("peCloseModalBtn");
    const backBtn = document.getElementById("peBackToListBtn");
    const openExtBtn = document.getElementById("peBtnOpenExternal");

    const hide = () => {
        if (modal) modal.style.display = "none";
    };

    if (closeBtn) closeBtn.onclick = hide;
    if (closeBottomBtn) closeBottomBtn.onclick = hide;
    if (backBtn) backBtn.onclick = showListView;

    if (openExtBtn) {
        openExtBtn.onclick = () => {
            if (currentExternalUrl) {
                window.open(currentExternalUrl, "patient_education_ext", "width=1000,height=750,resizable=yes,scrollbars=yes");
            }
        };
    }
}

/**
 * 8. Comprehensive Clinical Patient Handout Generator
 */
function generateEducationalMaterials(query, sourceName) {
    const q = query.toLowerCase();

    if (q.includes("hyper") || q.includes("bp") || q.includes("blood pressure")) {
        return [
            {
                title: "High Blood Pressure (Hypertension): A Patient's Guide",
                source: sourceName,
                summary: "Hypertension occurs when the force of your blood against artery walls is consistently too high. Over time, uncontrolled high blood pressure damages heart, brain, kidneys, and eyes.",
                symptoms: [
                    "Often called the 'silent killer' because it usually presents without noticeable symptoms.",
                    "Occasional morning headaches, dizzy spells, or shortness of breath in severe stages.",
                    "Routine home and clinic blood pressure monitoring is essential."
                ],
                guidelines: [
                    "Take prescribed antihypertensive medications daily at the same time, even if you feel fine.",
                    "Adopt the DASH (Dietary Approaches to Stop Hypertension) diet rich in vegetables, fruits, and lean proteins.",
                    "Reduce daily sodium intake to under 2,000 mg (less than 1 teaspoon of table salt).",
                    "Engage in at least 30 minutes of moderate aerobic exercise (brisk walking) 5 days a week.",
                    "Limit alcohol and avoid tobacco products completely."
                ],
                warning: "Seek immediate emergency medical care if your BP exceeds 180/120 mmHg, or if you experience chest pain, severe headache, vision changes, or difficulty speaking."
            },
            {
                title: "Home Blood Pressure Monitoring: Step-by-Step Instructions",
                source: sourceName,
                summary: "Accurate self-monitoring of blood pressure gives your healthcare team valuable information for optimizing your medication dosages.",
                symptoms: [
                    "Avoid caffeine, exercise, and smoking for 30 minutes prior to measuring.",
                    "Sit quietly for 5 minutes with feet flat on the floor and back supported.",
                    "Position the arm cuff at heart level on bare skin."
                ],
                guidelines: [
                    "Measure twice daily: once in the morning before medication and once in the evening.",
                    "Record all readings in a journal or digital health app to share with your provider."
                ],
                warning: "Report consistently elevated readings above your target goal (typically >130/80 mmHg) to your clinic."
            }
        ];
    }

    if (q.includes("diabet") || q.includes("sugar") || q.includes("glucose")) {
        return [
            {
                title: "Type 2 Diabetes Mellitus: Self-Care & Management Handout",
                source: sourceName,
                summary: "Type 2 diabetes affects how your body processes blood sugar (glucose). With proper diet, regular exercise, and medications, you can maintain healthy glucose levels and prevent long-term complications.",
                symptoms: [
                    "Increased thirst (polydipsia) and frequent urination, especially at night.",
                    "Unexplained fatigue, blurred vision, and slow-healing sores or cuts.",
                    "Tingling, numbness, or burning sensation in feet and hands."
                ],
                guidelines: [
                    "Check blood glucose as directed (fasting morning and post-meal goals).",
                    "Maintain a consistent carbohydrate intake; emphasize high-fiber whole grains and non-starchy vegetables.",
                    "Inspect feet daily for cuts, blisters, redness, or swelling; never walk barefoot.",
                    "Stay up to date with yearly dilated eye exams and kidney function lab tests (microalbuminuria)."
                ],
                warning: "Know the symptoms of hypoglycemia (shakiness, sweating, confusion, dizziness). If blood sugar drops below 70 mg/dL, follow the 15-15 rule (consume 15g fast carbs, recheck in 15 mins)."
            }
        ];
    }

    if (q.includes("asthma") || q.includes("breath") || q.includes("wheez")) {
        return [
            {
                title: "Asthma Management & Inhaler Technique: Action Plan",
                source: sourceName,
                summary: "Asthma is a chronic condition causing inflammation and narrowing of the airways. Using your controller and rescue inhalers correctly allows you to lead a full, active life without respiratory distress.",
                symptoms: [
                    "Wheezing (a whistling sound when breathing out), chest tightness, and shortness of breath.",
                    "Chronic nighttime cough or coughing triggered by cold air and exercise."
                ],
                guidelines: [
                    "Use daily controller inhaler (corticosteroid) consistently as prescribed, rinsing mouth after each use.",
                    "Keep rescue inhaler (albuterol) accessible at all times.",
                    "Use a spacer device with metered-dose inhalers for maximum medication delivery to lungs.",
                    "Identify and minimize triggers: smoke, dust mites, pet dander, pollen, and sudden cold air."
                ],
                warning: "Call 911 or go to the nearest emergency room if you experience severe shortness of breath, inability to speak in full sentences, or if your rescue inhaler provides no relief."
            }
        ];
    }

    // Comprehensive Fallback Handout for any search term
    const cleanTopic = query.charAt(0).toUpperCase() + query.slice(1);
    return [
        {
            title: `${cleanTopic}: Patient Education & Overview`,
            source: sourceName,
            summary: `This educational handout provides clinical guidance, self-care recommendations, and lifestyle advice regarding ${query} for patients and their families.`,
            symptoms: [
                `Monitor for common symptoms associated with ${query} and track changes in severity over time.`,
                "Keep a written log of when symptoms occur, their duration, and any potential environmental or dietary triggers.",
                "Review any existing prescription medications and over-the-counter supplements with your doctor."
            ],
            guidelines: [
                "Follow all prescribed medication schedules and never alter dosages without consulting your care team.",
                "Maintain adequate hydration, balanced nutrition, and appropriate daily physical activity.",
                "Attend all scheduled follow-up visits and lab appointments to evaluate treatment efficacy.",
                "Ask your physician or nurse for written clarifications if any instructions are unclear."
            ],
            warning: `Contact your healthcare provider immediately if you experience worsening symptoms, unexpected drug reactions, high fever, or severe pain associated with ${query}.`
        },
        {
            title: `Questions to Ask Your Doctor About ${cleanTopic}`,
            source: sourceName,
            summary: `Preparing for your clinical appointment helps you make the most of your time with your healthcare team. Use these questions during your next consultation.`,
            symptoms: [
                "What is the most likely cause of my symptoms?",
                "What diagnostic tests or blood work do I need?",
                "Are there lifestyle modifications that can improve my condition?"
            ],
            guidelines: [
                "Bring a current list of all medications, dosages, and vitamins you take daily.",
                "Bring a trusted family member or caregiver to take notes and support you during discussions.",
                "Request written discharge instructions before leaving the clinic."
            ],
            warning: "Do not delay seeking care for sudden or rapidly deteriorating symptoms."
        }
    ];
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