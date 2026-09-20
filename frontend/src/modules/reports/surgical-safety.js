import { api } from '../../core/api.js';
import { logReportRun } from './report-history.js';
import { populatePatientSelector, calculateAgeFromDob } from '../../core/patient-chart-helper.js?v=1';

let currentRecords = [];

export async function initSurgicalSafety() {
    setupEventListeners();
    setupPatientPicker();
    await fetchReport();
}

function setupPatientPicker() {
    const sel = document.getElementById('sscFPatientSelect');
    if (!sel) return;
    populatePatientSelector(sel, (p, isManual) => {
        const idEl   = document.getElementById('sscFPatientId');
        const nameEl = document.getElementById('sscFPatientName');
        const mrnEl  = document.getElementById('sscFPatientMrn');
        const ageEl  = document.getElementById('sscFAge');
        const genEl  = document.getElementById('sscFGender');

        if (!p || isManual) {
            if (idEl) idEl.value = '';
            if (isManual) {
                if (nameEl) { nameEl.value = ''; nameEl.focus(); }
                if (mrnEl) mrnEl.value = '';
                if (ageEl) ageEl.value = '';
            }
            return;
        }

        const fullName = [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ');
        if (idEl)   idEl.value = p.id;
        if (nameEl) nameEl.value = fullName;
        if (mrnEl)  mrnEl.value = p.patient_no || '';
        if (ageEl)  ageEl.value = calculateAgeFromDob(p.birthdate);
        if (genEl) {
            const sex = (p.sex || '').toLowerCase();
            genEl.value = sex === 'female' ? 'Female' : 'Male';
        }
    });
}

function setupEventListeners() {
    const applyBtn = document.getElementById('sscApplyBtn');
    if (applyBtn) applyBtn.addEventListener('click', () => fetchReport());

    const resetBtn = document.getElementById('sscResetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            ['sscDateFrom', 'sscDateTo', 'sscSearchInput'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            ['sscOrFilter', 'sscSpecialtyFilter', 'sscSurgeonFilter', 'sscCompliantFilter', 'sscNearMissFilter'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            fetchReport();
        });
    }

    const printBtn = document.getElementById('sscPrintBtn');
    if (printBtn) printBtn.addEventListener('click', () => window.print());

    // Add Modal
    const addBtn = document.getElementById('sscAddBtn');
    const addModal = document.getElementById('sscAddModal');
    const cancelBtn = document.getElementById('sscCancelAddBtn');
    const cancelBtn2 = document.getElementById('sscCancelAddBtn2');
    if (addBtn && addModal) addBtn.addEventListener('click', () => {
        const today = new Date().toISOString().split('T')[0];
        const dateEl = document.getElementById('sscFDate');
        if (dateEl && !dateEl.value) dateEl.value = today;
        addModal.style.display = 'flex';
    });
    if (cancelBtn && addModal) cancelBtn.addEventListener('click', () => { addModal.style.display = 'none'; });
    if (cancelBtn2 && addModal) cancelBtn2.addEventListener('click', () => { addModal.style.display = 'none'; });
    if (addModal) addModal.addEventListener('click', e => { if (e.target === addModal) addModal.style.display = 'none'; });

    const addForm = document.getElementById('sscAddForm');
    if (addForm) addForm.addEventListener('submit', handleAddSubmit);

    // Detail Modal
    const detailModal = document.getElementById('sscDetailModal');
    const closeDetail1 = document.getElementById('sscCloseDetailModal');
    const closeDetail2 = document.getElementById('sscCloseDetailBtn');
    if (closeDetail1 && detailModal) closeDetail1.addEventListener('click', () => { detailModal.style.display = 'none'; });
    if (closeDetail2 && detailModal) closeDetail2.addEventListener('click', () => { detailModal.style.display = 'none'; });
    if (detailModal) detailModal.addEventListener('click', e => { if (e.target === detailModal) detailModal.style.display = 'none'; });

    const detailForm = document.getElementById('sscDetailForm');
    if (detailForm) detailForm.addEventListener('submit', handleDetailSubmit);
}

async function fetchReport() {
    const tbody = document.getElementById('sscTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="13" style="padding:40px;text-align:center;color:#64748b;font-style:italic;">Loading surgical safety checklists...</td></tr>';

    const params = new URLSearchParams();
    const v = id => document.getElementById(id)?.value || '';

    if (v('sscDateFrom'))        params.append('date_from', v('sscDateFrom'));
    if (v('sscDateTo'))          params.append('date_to', v('sscDateTo'));
    if (v('sscOrFilter'))        params.append('or_suite', v('sscOrFilter'));
    if (v('sscSpecialtyFilter')) params.append('surgical_specialty', v('sscSpecialtyFilter'));
    if (v('sscSurgeonFilter'))   params.append('operating_surgeon', v('sscSurgeonFilter'));
    if (v('sscCompliantFilter')) params.append('universal_protocol_compliant', v('sscCompliantFilter'));
    if (v('sscNearMissFilter'))  params.append('near_miss_caught', v('sscNearMissFilter'));
    if (v('sscSearchInput'))     params.append('search', v('sscSearchInput'));

    try {
        const res = await api('/reports/surgical-safety?' + params.toString());
        if (res.success && res.data) {
            currentRecords = res.data.records || [];
            updateKpis(res.data.kpis);
            populateDropdown('sscOrFilter', res.data.or_suites || []);
            populateDropdown('sscSpecialtyFilter', res.data.specialties || []);
            populateDropdown('sscSurgeonFilter', res.data.surgeons || []);
            renderTable(currentRecords);
            logReportRun('Surgical Safety & Universal Protocol Time-Out Report', 'surgical_safety', {
                date_from: v('sscDateFrom'),
                date_to: v('sscDateTo')
            });
        } else {
            if (tbody) tbody.innerHTML = '<tr><td colspan="13" style="padding:30px;text-align:center;color:#ef4444;">Failed to load records.</td></tr>';
        }
    } catch (err) {
        console.error('Surgical safety report fetch error:', err);
        if (tbody) tbody.innerHTML = '<tr><td colspan="13" style="padding:30px;text-align:center;color:#ef4444;">Server error loading report.</td></tr>';
    }
}

function updateKpis(kpis) {
    if (!kpis) return;
    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val !== null && val !== undefined ? val : 0;
    };

    set('sscKpiTotal',      kpis.total_cases ?? 0);
    set('sscKpiCompliance', (kpis.compliance_rate ?? 0) + '%');
    set('sscKpiMarking',    (kpis.marking_rate ?? 0) + '%');
    set('sscKpiAntibiotic', (kpis.antibiotic_rate ?? 0) + '%');
    set('sscKpiCounts',     (kpis.counts_rate ?? 0) + '%');
    set('sscKpiNearMisses', kpis.near_misses_count ?? 0);

    const compEl = document.getElementById('sscKpiComplianceRate');
    if (compEl) compEl.textContent = (kpis.fully_compliant_cases ?? 0) + ' / ' + (kpis.total_cases ?? 0) + ' fully compliant';

    const markEl = document.getElementById('sscKpiMarkingRate');
    if (markEl) markEl.textContent = (kpis.site_marking_compliant ?? 0) + ' / ' + (kpis.site_marking_required_count ?? 0) + ' required marked';

    const abxEl = document.getElementById('sscKpiAntibioticRate');
    if (abxEl) abxEl.textContent = (kpis.antibiotic_timely_count ?? 0) + ' / ' + (kpis.antibiotic_given_count ?? 0) + ' within 60 min';

    const countEl = document.getElementById('sscKpiCountsRate');
    if (countEl) countEl.textContent = (kpis.counts_accurate ?? 0) + ' / ' + (kpis.total_cases ?? 0) + ' correct counts';
}

function populateDropdown(selectId, items) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const cur = sel.value;
    const defaultLabel = sel.options[0]?.text || 'All';
    sel.innerHTML = '<option value="">' + defaultLabel + '</option>';
    items.forEach(d => {
        const o = document.createElement('option');
        o.value = d;
        o.textContent = d;
        if (d === cur) o.selected = true;
        sel.appendChild(o);
    });
}

function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function complianceBadge(c) {
    return parseInt(c) === 1
        ? '<span style="display:inline-block;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;background:#dcfce7;color:#166534;">100% Compliant</span>'
        : '<span style="display:inline-block;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;background:#fee2e2;color:#991b1b;">Protocol Variance</span>';
}

function nearMissBadge(nm) {
    return parseInt(nm) === 1
        ? '<span style="display:inline-block;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;background:#fee2e2;color:#dc2626;border:1px solid #f87171;">&#9888; Near-Miss Caught</span>'
        : '<span style="color:#94a3b8;font-size:11px;">None</span>';
}

function boolBadge(v, isReq) {
    if (isReq === false || parseInt(isReq) === 0) {
        return '<span style="color:#94a3b8;font-size:11px;">N/A</span>';
    }
    return parseInt(v) === 1
        ? '<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:700;background:#dcfce7;color:#166534;">Yes</span>'
        : '<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:700;background:#fee2e2;color:#991b1b;">No</span>';
}

function countBadge(status) {
    if (status === 'Correct & Reconciled') {
        return '<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:700;background:#dcfce7;color:#166534;">Reconciled</span>';
    }
    if (status === 'Discrepancy Resolved on Recount') {
        return '<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:700;background:#fef3c7;color:#92400e;">Recounted OK</span>';
    }
    return '<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:700;background:#fee2e2;color:#991b1b;">X-Ray Ordered</span>';
}

function renderTable(records) {
    const tbody = document.getElementById('sscTableBody');
    if (!tbody) return;
    if (!records.length) {
        tbody.innerHTML = '<tr><td colspan="13" style="padding:30px;text-align:center;color:#64748b;">No surgical cases found matching the current filters.</td></tr>';
        return;
    }
    tbody.innerHTML = records.map(r =>
        '<tr>' +
        '<td style="font-family:monospace;font-size:12px;font-weight:700;color:#059669;">' + esc(r.case_number) + '</td>' +
        '<td style="white-space:nowrap;font-size:12px;">' + esc(r.surgery_date) + '</td>' +
        '<td style="font-size:11px;max-width:140px;">' + esc(r.or_suite) + '</td>' +
        '<td style="font-size:11px;color:#475569;">' + esc(r.surgical_specialty) + '</td>' +
        '<td style="font-size:12px;"><a href="javascript:void(0)" onclick="window.__openPatientChartFromReport(\'' + esc(r.patient_mrn) + '\')" style="color:#0284c7;font-weight:600;text-decoration:none;display:inline-flex;align-items:center;gap:4px;" title="Open EHR Patient Chart">&#128100; ' + esc(r.patient_name) + '</a><br><small style="color:#64748b;cursor:pointer;" onclick="window.__openPatientChartFromReport(\'' + esc(r.patient_mrn) + '\')" title="Open EHR Patient Chart">' + esc(r.patient_mrn) + ' &bull; ' + r.patient_age + 'y/' + (r.gender ? r.gender[0] : '') + '</small></td>' +
        '<td style="font-size:12px;max-width:170px;font-weight:600;">' + esc(r.procedure_planned) + '</td>' +
        '<td style="font-size:12px;">' + esc(r.operating_surgeon) + '</td>' +
        '<td style="text-align:center;">' + boolBadge(r.site_marked_by_surgeon, r.site_marking_required) + '</td>' +
        '<td style="text-align:center;">' + boolBadge(r.time_out_performed, 1) + (r.time_out_timestamp ? '<br><small style="color:#64748b;">' + esc(r.time_out_timestamp) + '</small>' : '') + '</td>' +
        '<td>' + countBadge(r.sponge_needle_count_status) + '</td>' +
        '<td>' + complianceBadge(r.universal_protocol_compliant) + '</td>' +
        '<td>' + nearMissBadge(r.near_miss_caught) + '</td>' +
        '<td><button onclick="window.__sscOpenDetail(' + r.id + ')" style="background:#059669;color:#ffffff;border:none;padding:5px 11px;border-radius:5px;cursor:pointer;font-size:11px;font-weight:600;">View / Update</button></td>' +
        '</tr>'
    ).join('');

    window.__sscOpenDetail = openDetailModal;
}

async function openDetailModal(id) {
    const modal = document.getElementById('sscDetailModal');
    if (!modal) return;
    try {
        const res = await api('/reports/surgical-safety/details?id=' + id);
        if (res.success && res.data) {
            populateDetailModal(res.data);
            modal.style.display = 'flex';
        } else {
            alert('Failed to load surgical safety details.');
        }
    } catch (err) {
        console.error(err);
        alert('Error loading record details.');
    }
}

function populateDetailModal(r) {
    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val !== null && val !== undefined && val !== '' ? val : 'N/A';
    };
    const setV = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val !== null && val !== undefined ? val : '';
    };

    document.getElementById('sscDetailRecordId').value = r.id;
    document.getElementById('sscDetailCaseNo').textContent = r.case_number;

    const patEl = document.getElementById('sscDetailPatient');
    if (patEl) {
        patEl.innerHTML = esc(r.patient_name) + ' (<a href="javascript:void(0)" onclick="window.__openPatientChartFromReport(\'' + esc(r.patient_mrn) + '\')" style="color:#0284c7;font-weight:600;" title="Open EHR Patient Chart">' + esc(r.patient_mrn) + '</a>) — ' + r.patient_age + 'y/' + (r.gender || '');
    }
    set('sscDetailProcedure',  r.procedure_planned + (r.procedure_actual && r.procedure_actual !== r.procedure_planned ? ' (Actual: ' + r.procedure_actual + ')' : ''));
    set('sscDetailOrSuite',    r.or_suite + ' — ' + r.surgery_date);
    set('sscDetailTeam',       'Surgeon: ' + r.operating_surgeon + ' | Anesthesia: ' + r.anesthesiologist + ' | Circulator: ' + r.circulating_nurse + (r.scrub_nurse ? ' | Scrub: ' + r.scrub_nurse : ''));

    const siteText = parseInt(r.site_marking_required) === 1
        ? (parseInt(r.site_marked_by_surgeon) === 1 ? 'Marked by Operating Surgeon (Compliant)' : 'NOT MARKED (Protocol Breach)')
        : 'Site Marking Not Required (Midline Organ)';
    set('sscDetailSiteMark', siteText);

    const toText = parseInt(r.time_out_performed) === 1
        ? 'Time-Out Verbal Pause Conducted at ' + (r.time_out_timestamp || 'Pre-Incision') + ' (Patient, Site, Procedure & Positioning Confirmed)'
        : 'TIME-OUT NOT CONDUCTED (Critical Breach)';
    set('sscDetailTimeOut', toText);

    const abxText = parseInt(r.antibiotic_prophylaxis_given) === 1
        ? (parseInt(r.antibiotic_timing_within_60min) === 1 ? 'Given within 60 min pre-incision (Compliant)' : 'Given >60 min prior or post-incision (Non-compliant)')
        : 'Not Indicated / Not Administered';
    set('sscDetailAntibiotic', abxText);

    set('sscDetailCounts', r.sponge_needle_count_status || 'Correct & Reconciled');

    const nmText = parseInt(r.near_miss_caught) === 1
        ? 'YES &mdash; ' + (r.near_miss_details || 'Near-miss caught during Time-Out pause.')
        : 'No near-misses identified.';
    const nmEl = document.getElementById('sscDetailNearMiss');
    if (nmEl) nmEl.innerHTML = nmText;

    const compText = parseInt(r.universal_protocol_compliant) === 1
        ? '100% Fully Compliant'
        : 'Protocol Variance: ' + (r.non_compliance_reason || 'See review notes');
    set('sscDetailCompliance', compText);

    setV('sscUActualProcedure',     r.procedure_actual || r.procedure_planned);
    setV('sscUCounts',              r.sponge_needle_count_status);
    setV('sscUStatus',              r.status);
    setV('sscUCompliant',           r.universal_protocol_compliant);
    setV('sscUNearMissDetails',     r.near_miss_details);
    setV('sscUNonComplianceReason', r.non_compliance_reason);
    setV('sscUPostopConcerns',      r.postop_recovery_concerns);
    setV('sscUNotes',               r.notes);
}

async function handleAddSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('sscSubmitAddBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

    const g = id => document.getElementById(id)?.value || '';
    const payload = {
        surgery_date:                       g('sscFDate'),
        or_suite:                           g('sscFOrSuite'),
        patient_id:                         g('sscFPatientId') || null,
        patient_name:                       g('sscFPatientName'),
        patient_mrn:                        g('sscFPatientMrn'),
        patient_age:                        g('sscFAge'),
        gender:                             g('sscFGender'),
        procedure_planned:                  g('sscFProcedure'),
        surgical_specialty:                 g('sscFSpecialty'),
        operating_surgeon:                  g('sscFSurgeon'),
        anesthesiologist:                   g('sscFAnesthesiologist'),
        circulating_nurse:                  g('sscFCirculator'),
        scrub_nurse:                        g('sscFScrub'),
        patient_identity_confirmed:         g('sscFIdentity'),
        surgical_consent_confirmed:         g('sscFConsent'),
        site_marking_required:              g('sscFSiteReq'),
        site_marked_by_surgeon:             g('sscFSiteMarked'),
        anesthesia_safety_check_done:       g('sscFAnesCheck'),
        allergy_check_done:                 g('sscFAllergies'),
        airway_aspiration_risk:             g('sscFAirway'),
        blood_loss_risk_over_500ml:         g('sscEBloodLoss'),
        time_out_performed:                 g('sscFTimeOut'),
        time_out_timestamp:                 g('sscFTimeOutTime'),
        team_members_introduced:            g('sscFIntroductions'),
        patient_name_verbally_confirmed:    g('sscFVerbalAgreed'),
        procedure_verbally_confirmed:       g('sscFVerbalAgreed'),
        site_laterality_verbally_confirmed: g('sscFVerbalAgreed'),
        patient_position_confirmed:         g('sscFPosition'),
        antibiotic_prophylaxis_given:       g('sscFAbxGiven'),
        antibiotic_timing_within_60min:     g('sscFAbxGiven'),
        essential_imaging_displayed:        g('sscFImaging'),
        implants_hardware_verified:         g('sscFImplants'),
        near_miss_caught:                   g('sscFNearMiss'),
        near_miss_details:                  g('sscFNearMissDetails'),
        sign_out_performed:                 g('sscFSignOut'),
        sponge_needle_count_status:         g('sscFCounts'),
        specimen_labeled_correctly:         g('sscFSpecimen'),
        equipment_malfunction_noted:        g('sscFEquipment'),
        postop_recovery_concerns:           g('sscFPostopConcerns'),
        notes:                              g('sscFNotes'),
    };

    try {
        const res = await api('/reports/surgical-safety', { method: 'POST', body: JSON.stringify(payload) });
        if (res.success) {
            alert('Surgical Safety checklist case logged! Case #: ' + (res.data?.case_number || ''));
            const modal = document.getElementById('sscAddModal');
            if (modal) modal.style.display = 'none';
            document.getElementById('sscAddForm').reset();
            fetchReport();
        } else {
            alert('Error: ' + (res.message || 'Failed to create case.'));
        }
    } catch (err) {
        console.error(err);
        alert('An error occurred while saving.');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Save Checklist Case'; }
    }
}

async function handleDetailSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('sscSaveDetailBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

    const g = id => document.getElementById(id)?.value || '';
    const id = parseInt(g('sscDetailRecordId'));
    const payload = {
        id:                            id,
        procedure_actual:              g('sscUActualProcedure'),
        sponge_needle_count_status:    g('sscUCounts'),
        status:                        g('sscUStatus'),
        universal_protocol_compliant: g('sscUCompliant'),
        near_miss_details:             g('sscUNearMissDetails'),
        non_compliance_reason:         g('sscUNonComplianceReason'),
        postop_recovery_concerns:      g('sscUPostopConcerns'),
        notes:                         g('sscUNotes'),
    };

    try {
        const res = await api('/reports/surgical-safety/update', { method: 'POST', body: JSON.stringify(payload) });
        if (res.success) {
            alert('Surgical safety case updated successfully!');
            const modal = document.getElementById('sscDetailModal');
            if (modal) modal.style.display = 'none';
            fetchReport();
        } else {
            alert('Error: ' + (res.message || 'Failed to update case.'));
        }
    } catch (err) {
        console.error(err);
        alert('An error occurred while saving.');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Save & Update'; }
    }
}
