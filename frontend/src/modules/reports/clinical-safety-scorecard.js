import { api } from '../../core/api.js?v=10';
import { todayISO } from '../../core/timezone.js?v=3';

let cachedScorecard = null;
let cachedDeliveries = [];

export async function initClinicalSafetyScorecard() {
    setupDateDefaults();
    setupEventListeners();
    await loadScorecardData();
}

function setupDateDefaults() {
    const today = todayISO ? todayISO() : new Date().toISOString().split('T')[0];
    const toInput = document.getElementById('cqsDateTo');
    const fromInput = document.getElementById('cqsDateFrom');

    if (toInput && !toInput.value) {
        toInput.value = today;
    }
    if (fromInput && !fromInput.value) {
        const d = new Date();
        d.setDate(d.getDate() - 59); // default 60 days
        fromInput.value = d.toISOString().split('T')[0];
    }
}

function setupEventListeners() {
    // Quick Range Pills
    const pills = document.querySelectorAll('.cqs-btn-pill');
    pills.forEach(pill => {
        pill.addEventListener('click', (e) => {
            pills.forEach(p => p.classList.remove('active'));
            e.currentTarget.classList.add('active');
            const days = parseInt(e.currentTarget.dataset.days, 10);
            applyQuickRange(days);
        });
    });

    // Refresh Scorecard Button
    const applyBtn = document.getElementById('cqsFilterApplyBtn');
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            loadScorecardData();
        });
    }

    // Print Button
    const printBtn = document.getElementById('cqsPrintBtn');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }

    // Modal Triggers
    const openModalBtn = document.getElementById('cqsNewDeliveryBtn');
    const modalBackdrop = document.getElementById('cqsDeliveryModal');
    const closeModalBtn = document.getElementById('cqsModalCloseBtn');
    const cancelModalBtn = document.getElementById('cqsModalCancelBtn');

    if (openModalBtn && modalBackdrop) {
        openModalBtn.addEventListener('click', () => {
            // Set default delivery_datetime
            const dtInput = document.querySelector('input[name="delivery_datetime"]');
            if (dtInput) {
                const now = new Date();
                now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                dtInput.value = now.toISOString().slice(0, 16);
            }
            modalBackdrop.style.display = 'flex';
        });
    }

    const hideModal = () => {
        if (modalBackdrop) modalBackdrop.style.display = 'none';
    };

    if (closeModalBtn) closeModalBtn.addEventListener('click', hideModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', hideModal);

    // Form Submit
    const form = document.getElementById('cqsDeliveryForm');
    if (form) {
        form.addEventListener('submit', handleDeliverySubmit);
    }
}

function applyQuickRange(days) {
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - (days - 1));

    const toInput = document.getElementById('cqsDateTo');
    const fromInput = document.getElementById('cqsDateFrom');

    if (toInput) toInput.value = toDate.toISOString().split('T')[0];
    if (fromInput) fromInput.value = fromDate.toISOString().split('T')[0];

    loadScorecardData();
}

async function loadScorecardData() {
    const from = document.getElementById('cqsDateFrom')?.value || '';
    const to = document.getElementById('cqsDateTo')?.value || '';

    await Promise.all([
        fetchOverview(from, to),
        fetchDeliveries()
    ]);
}

async function fetchOverview(from, to) {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);

    try {
        const res = await api(`/reports/clinical-safety-scorecard/overview?${params.toString()}`);
        if (res && res.success && res.data) {
            cachedScorecard = res.data;
            renderScorecard(res.data);
        }
    } catch (err) {
        console.error('Failed to fetch clinical safety scorecard', err);
    }
}

async function fetchDeliveries() {
    try {
        const res = await api('/reports/clinical-safety-scorecard/deliveries?limit=50');
        if (res && res.success && res.data) {
            cachedDeliveries = res.data;
            renderDeliveriesTable(res.data);
        }
    } catch (err) {
        console.error('Failed to fetch deliveries', err);
    }
}

function renderScorecard(data) {
    const sIndex = data.safety_index || {};
    const readm = data.readmission || {};
    const hai = data.hai_devices || {};
    const er = data.er_turnaround || {};
    const cs = data.csection || {};

    // 1. Composite Banner
    const scoreEl = document.getElementById('cqsCompositeScore');
    if (scoreEl) scoreEl.textContent = sIndex.composite_score ?? '--';

    const gradeEl = document.getElementById('cqsGradeLabel');
    if (gradeEl) gradeEl.textContent = sIndex.performance_grade || 'Evaluating...';

    const periodEl = document.getElementById('cqsPeriodLabel');
    if (periodEl) periodEl.textContent = `${data.period?.from} to ${data.period?.to} (${data.period?.days} days)`;

    const pts = sIndex.pillar_breakdown || {};
    const ptsR = document.getElementById('cqsPtsReadm');
    if (ptsR) ptsR.textContent = pts.readmission_points ?? 0;
    const ptsH = document.getElementById('cqsPtsHai');
    if (ptsH) ptsH.textContent = pts.hai_device_points ?? 0;
    const ptsE = document.getElementById('cqsPtsEr');
    if (ptsE) ptsE.textContent = pts.er_turnaround_pts ?? 0;
    const ptsC = document.getElementById('cqsPtsCs');
    if (ptsC) ptsC.textContent = pts.csection_points ?? 0;

    // 2. Pillar 1: Readmission
    const rRate = document.getElementById('cqsReadmRate');
    if (rRate) rRate.textContent = readm.readmission_rate_pct ?? '--';

    const rStatus = document.getElementById('cqsReadmStatus');
    if (rStatus) {
        rStatus.textContent = readm.status || 'Evaluated';
        rStatus.className = 'cqs-badge ' + (readm.readmission_rate_pct <= 8.0 ? 'badge-optimal' : 'badge-danger');
    }

    const rVar = document.getElementById('cqsReadmVariance');
    if (rVar) {
        const v = readm.variance_from_target || 0;
        rVar.textContent = (v > 0 ? `+${v}% over CMS benchmark` : `${Math.abs(v)}% under benchmark`);
        rVar.style.color = (v > 0 ? '#ef4444' : '#10b981');
    }

    const rCount = document.getElementById('cqsReadmCount');
    if (rCount) rCount.textContent = readm.total_readmissions ?? 0;
    const dischCount = document.getElementById('cqsDischargesCount');
    if (dischCount) dischCount.textContent = readm.total_discharges ?? 0;
    const prevCount = document.getElementById('cqsPreventableCount');
    if (prevCount) prevCount.textContent = readm.preventable_count ?? 0;

    // Top readmission causes
    const causesWrap = document.getElementById('cqsTopReadmCauses');
    if (causesWrap) {
        if (readm.top_causes && readm.top_causes.length > 0) {
            causesWrap.innerHTML = readm.top_causes.map(c => `
                <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:4px 8px; border-radius:4px;">
                    <span style="font-weight:500;">${escapeHtml(c.primary_diagnosis)}</span>
                    <span style="background:#e2e8f0; font-size:10px; font-weight:700; padding:1px 6px; border-radius:8px;">${c.cnt} cases</span>
                </div>
            `).join('');
        } else {
            causesWrap.innerHTML = `<span style="color:#94a3b8; font-style:italic;">No 30-day readmissions reported in this period.</span>`;
        }
    }

    // 3. Pillar 2: HAI Devices (CAUTI, CLABSI, VAP)
    const cauti = hai.cauti || {};
    const clabsi = hai.clabsi || {};
    const vap = hai.vap || {};

    const cautiRate = document.getElementById('cqsCautiRate');
    if (cautiRate) {
        cautiRate.textContent = cauti.rate_per_1000 ?? '--';
        cautiRate.style.color = cauti.rate_per_1000 <= 1.5 ? '#059669' : '#ef4444';
    }
    const cautiCases = document.getElementById('cqsCautiCases');
    if (cautiCases) cautiCases.textContent = cauti.cases ?? 0;
    const foleyDays = document.getElementById('cqsFoleyDays');
    if (foleyDays) foleyDays.textContent = cauti.device_days ?? 0;

    const clabsiRate = document.getElementById('cqsClabsiRate');
    if (clabsiRate) {
        clabsiRate.textContent = clabsi.rate_per_1000 ?? '--';
        clabsiRate.style.color = clabsi.rate_per_1000 <= 0.8 ? '#059669' : '#ef4444';
    }
    const clabsiCases = document.getElementById('cqsClabsiCases');
    if (clabsiCases) clabsiCases.textContent = clabsi.cases ?? 0;
    const clDays = document.getElementById('cqsClDays');
    if (clDays) clDays.textContent = clabsi.device_days ?? 0;

    const vapRate = document.getElementById('cqsVapRate');
    if (vapRate) {
        vapRate.textContent = vap.rate_per_1000 ?? '--';
        vapRate.style.color = vap.rate_per_1000 <= 1.0 ? '#059669' : '#ef4444';
    }
    const vapCases = document.getElementById('cqsVapCases');
    if (vapCases) vapCases.textContent = vap.cases ?? 0;
    const ventDays = document.getElementById('cqsVentDays');
    if (ventDays) ventDays.textContent = vap.device_days ?? 0;

    const compRate = document.getElementById('cqsCompositeHaiRate');
    if (compRate) compRate.textContent = `${hai.composite_device_rate_per_1000 ?? '0.00'} / 1,000 days`;
    const totDays = document.getElementById('cqsTotalDevDays');
    if (totDays) totDays.textContent = (hai.total_device_days || 0).toLocaleString();

    const haiStatus = document.getElementById('cqsHaiStatus');
    if (haiStatus) {
        haiStatus.textContent = `${hai.total_device_cases || 0} Device Infections`;
        haiStatus.className = 'cqs-badge ' + (hai.composite_device_rate_per_1000 <= 2.0 ? 'badge-optimal' : 'badge-warning');
    }

    // 4. Pillar 3: ER Turnaround
    const erMed = document.getElementById('cqsErMedian');
    if (erMed) erMed.textContent = er.median_door_to_doctor_mins ?? '--';
    const erP90 = document.getElementById('cqsErP90');
    if (erP90) erP90.textContent = (er.p90_door_to_doctor_mins ?? '--') + 'm';

    const erStatus = document.getElementById('cqsErStatus');
    if (erStatus) {
        erStatus.textContent = er.status || 'Evaluated';
        erStatus.className = 'cqs-badge ' + (er.median_door_to_doctor_mins <= 30.0 ? 'badge-optimal' : 'badge-warning');
    }

    // Acuity list
    const acuityWrap = document.getElementById('cqsAcuityList');
    if (acuityWrap && er.acuity_breakdown) {
        acuityWrap.innerHTML = er.acuity_breakdown.map(a => {
            const med = a.median_mins || 0;
            const target = a.target_mins;
            const pct = Math.min(100, Math.round((med / (target * 1.5)) * 100));
            const barColor = (med <= target) ? '#10b981' : '#ef4444';

            return `
                <div class="cqs-bar-item">
                    <span style="font-weight:600; color:#334155;">${escapeHtml(a.name.split(':')[0])}</span>
                    <div class="cqs-bar-track">
                        <div class="cqs-bar-fill" style="width:${Math.max(8, pct)}%; background:${barColor};"></div>
                    </div>
                    <span style="font-weight:700; text-align:right;">${med} min</span>
                    <span style="font-size:10px; color:#64748b; text-align:right;">Target &le;${target}m</span>
                </div>
            `;
        }).join('');
    }

    // 5. Pillar 4: C-Section Rate %
    const csOverall = document.getElementById('cqsCsOverall');
    if (csOverall) csOverall.textContent = cs.overall_csection_rate ?? '--';
    const totDeliv = document.getElementById('cqsTotalDeliveries');
    if (totDeliv) totDeliv.textContent = cs.total_deliveries ?? 0;

    const csStatus = document.getElementById('cqsCsStatus');
    if (csStatus) {
        csStatus.textContent = cs.status || 'Evaluated';
        csStatus.className = 'cqs-badge ' + (cs.overall_csection_rate <= 20.0 ? 'badge-optimal' : (cs.overall_csection_rate <= 30.0 ? 'badge-warning' : 'badge-danger'));
    }

    const ntsv = cs.ntsv || {};
    const ntsvRate = document.getElementById('cqsNtsvRate');
    if (ntsvRate) ntsvRate.textContent = (ntsv.ntsv_rate_pct ?? '--') + '%';
    const ntsvStat = document.getElementById('cqsNtsvStatus');
    if (ntsvStat) ntsvStat.textContent = `${ntsv.ntsv_csection || 0} / ${ntsv.ntsv_total || 0} NTSV Deliveries (${ntsv.status || 'Evaluated'})`;

    const bk = cs.breakdown || {};
    const vagSpont = document.getElementById('cqsVagSpont');
    if (vagSpont) vagSpont.textContent = bk.vaginal_spontaneous ?? 0;
    const csElec = document.getElementById('cqsCsElective');
    if (csElec) csElec.textContent = bk.cesarean_elective ?? 0;
    const csEmerg = document.getElementById('cqsCsEmergency');
    if (csEmerg) csEmerg.textContent = bk.cesarean_emergency ?? 0;
}

function renderDeliveriesTable(deliveries) {
    const tbody = document.getElementById('cqsDeliveriesTableBody');
    const countLabel = document.getElementById('cqsDeliveryCountLabel');

    if (countLabel) countLabel.textContent = `${deliveries.length} Logged Deliveries`;
    if (!tbody) return;

    if (!deliveries || deliveries.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:20px; color:#94a3b8;">No obstetric deliveries logged. Click "+ Log Delivery Event" to add one.</td></tr>`;
        return;
    }

    tbody.innerHTML = deliveries.map(d => {
        const isCs = parseInt(d.is_cesarean, 10) === 1;
        const modeBadge = isCs
            ? `<span style="background:#fee2e2; color:#991b1b; padding:2px 7px; border-radius:4px; font-weight:600; font-size:11px;">${escapeHtml(d.delivery_type)}</span>`
            : `<span style="background:#dcfce7; color:#166534; padding:2px 7px; border-radius:4px; font-weight:600; font-size:11px;">${escapeHtml(d.delivery_type)}</span>`;

        return `
            <tr>
                <td><strong style="color:#0f172a;">${escapeHtml(d.delivery_number)}</strong></td>
                <td>
                    <div style="font-weight:600; color:#1e293b;">${escapeHtml(d.patient_name)}</div>
                    <div style="font-size:11px; color:#64748b;">${escapeHtml(d.patient_mrn || 'N/A')}</div>
                </td>
                <td style="font-size:12px; color:#475569;">${escapeHtml(d.delivery_datetime)}</td>
                <td style="font-weight:600;">${d.gestational_weeks} wks</td>
                <td>${modeBadge}</td>
                <td><span style="font-size:11px; color:#475569;">${escapeHtml(d.robson_group || 'Group 1')}</span></td>
                <td style="font-size:12px; color:#334155;">${escapeHtml(d.indication || 'Uncomplicated')}</td>
                <td style="font-size:12px; color:#1e293b;">${escapeHtml(d.attending_obstetrician)}</td>
                <td style="text-align:center;">
                    <span style="font-weight:600;">${d.birth_weight_grams}g</span>
                    <span style="font-size:11px; color:#64748b; margin-left:4px;">(${d.apgar_1min}/${d.apgar_5min})</span>
                </td>
            </tr>
        `;
    }).join('');
}

async function handleDeliverySubmit(e) {
    e.preventDefault();
    const form = e.target;
    const saveBtn = document.getElementById('cqsSaveDeliveryBtn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
    }

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
        const res = await api('/reports/clinical-safety-scorecard/deliveries', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (res && res.success) {
            alert('Obstetric delivery record saved successfully.');
            form.reset();
            const modal = document.getElementById('cqsDeliveryModal');
            if (modal) modal.style.display = 'none';
            await loadScorecardData();
        } else {
            alert('Failed to save delivery: ' + (res?.message || 'Unknown error'));
        }
    } catch (err) {
        console.error('Error saving delivery record', err);
        alert('An unexpected error occurred while saving the delivery record.');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Delivery Record';
        }
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
