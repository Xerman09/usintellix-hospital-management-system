import { api } from '../../core/api.js';
import { logReportRun } from './report-history.js';

let currentRecords = [];

export async function initReadmissionMortality() {
    setupEventListeners();
    await fetchReport();
}

function setupEventListeners() {
    const applyBtn = document.getElementById('rmApplyBtn');
    if (applyBtn) applyBtn.addEventListener('click', () => fetchReport());

    const resetBtn = document.getElementById('rmResetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            ['rmDateFrom', 'rmDateTo', 'rmSearchInput'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            ['rmDeptFilter', 'rmReadmStatusFilter', 'rmMortStatusFilter', 'rmRiskFilter', 'rmStatusFilter'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            fetchReport();
        });
    }

    const printBtn = document.getElementById('rmPrintBtn');
    if (printBtn) printBtn.addEventListener('click', () => window.print());

    // Add Modal
    const addBtn = document.getElementById('rmAddBtn');
    const addModal = document.getElementById('rmAddModal');
    const cancelBtn = document.getElementById('rmCancelAddBtn');
    const cancelBtn2 = document.getElementById('rmCancelAddBtn2');
    if (addBtn && addModal) addBtn.addEventListener('click', () => {
        const today = new Date().toISOString().split('T')[0];
        const dischEl = document.getElementById('rmFDischDate');
        const admEl = document.getElementById('rmFAdmDate');
        if (dischEl && !dischEl.value) dischEl.value = today;
        if (admEl && !admEl.value) admEl.value = today;
        addModal.style.display = 'flex';
    });
    if (cancelBtn && addModal) cancelBtn.addEventListener('click', () => { addModal.style.display = 'none'; });
    if (cancelBtn2 && addModal) cancelBtn2.addEventListener('click', () => { addModal.style.display = 'none'; });
    if (addModal) addModal.addEventListener('click', e => { if (e.target === addModal) addModal.style.display = 'none'; });

    const addForm = document.getElementById('rmAddForm');
    if (addForm) addForm.addEventListener('submit', handleAddSubmit);

    // Detail Modal
    const detailModal = document.getElementById('rmDetailModal');
    const closeDetail1 = document.getElementById('rmCloseDetailModal');
    const closeDetail2 = document.getElementById('rmCloseDetailBtn');
    if (closeDetail1 && detailModal) closeDetail1.addEventListener('click', () => { detailModal.style.display = 'none'; });
    if (closeDetail2 && detailModal) closeDetail2.addEventListener('click', () => { detailModal.style.display = 'none'; });
    if (detailModal) detailModal.addEventListener('click', e => { if (e.target === detailModal) detailModal.style.display = 'none'; });

    const detailForm = document.getElementById('rmDetailForm');
    if (detailForm) detailForm.addEventListener('submit', handleDetailSubmit);
}

async function fetchReport() {
    const tbody = document.getElementById('rmTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="13" style="padding:40px;text-align:center;color:#64748b;font-style:italic;">Loading readmission &amp; mortality records...</td></tr>';

    const params = new URLSearchParams();
    const v = id => document.getElementById(id)?.value || '';

    if (v('rmDateFrom'))           params.append('date_from', v('rmDateFrom'));
    if (v('rmDateTo'))             params.append('date_to', v('rmDateTo'));
    if (v('rmDeptFilter'))         params.append('department', v('rmDeptFilter'));
    if (v('rmReadmStatusFilter'))  params.append('readmission_status', v('rmReadmStatusFilter'));
    if (v('rmMortStatusFilter'))   params.append('mortality_status', v('rmMortStatusFilter'));
    if (v('rmRiskFilter'))         params.append('risk_score', v('rmRiskFilter'));
    if (v('rmStatusFilter'))       params.append('status', v('rmStatusFilter'));
    if (v('rmSearchInput'))        params.append('search', v('rmSearchInput'));

    try {
        const res = await api('/reports/readmission-mortality?' + params.toString());
        if (res.success && res.data) {
            currentRecords = res.data.records || [];
            updateKpis(res.data.kpis);
            populateDeptSelect(res.data.departments || []);
            renderTable(currentRecords);
            logReportRun('30-Day Readmission & Mortality Report', 'readmission_mortality', {
                date_from: v('rmDateFrom'),
                date_to: v('rmDateTo')
            });
        } else {
            if (tbody) tbody.innerHTML = '<tr><td colspan="13" style="padding:30px;text-align:center;color:#ef4444;">Failed to load records.</td></tr>';
        }
    } catch (err) {
        console.error('Readmission report fetch error:', err);
        if (tbody) tbody.innerHTML = '<tr><td colspan="13" style="padding:30px;text-align:center;color:#ef4444;">Server error loading report.</td></tr>';
    }
}

function updateKpis(kpis) {
    if (!kpis) return;
    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val !== null && val !== undefined ? val : 0;
    };

    set('rmKpiTotal',       kpis.total_discharges ?? 0);
    set('rmKpiReadm',       kpis.unplanned_readmissions ?? 0);
    set('rmKpiPreventable', kpis.preventable_readmissions ?? 0);
    set('rmKpiMort',        kpis.total_mortalities ?? 0);
    set('rmKpiMedRec',      kpis.med_rec_completed ?? 0);
    set('rmKpiFollowup',    kpis.followup_calls_completed ?? 0);

    const readmRateEl = document.getElementById('rmKpiReadmRate');
    if (readmRateEl) readmRateEl.textContent = (kpis.readmission_rate ?? 0) + '% return rate';

    const mortRateEl = document.getElementById('rmKpiMortRate');
    if (mortRateEl) mortRateEl.textContent = (kpis.mortality_rate ?? 0) + '% overall mortality';

    const medRecRateEl = document.getElementById('rmKpiMedRecRate');
    if (medRecRateEl) medRecRateEl.textContent = (kpis.med_rec_rate ?? 0) + '% NPSG compliance';

    const followupRateEl = document.getElementById('rmKpiFollowupRate');
    if (followupRateEl) followupRateEl.textContent = (kpis.followup_rate ?? 0) + '% outreach rate';
}

function populateDeptSelect(depts) {
    const sel = document.getElementById('rmDeptFilter');
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">All Departments</option>';
    depts.forEach(d => {
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

function readmBadge(status, days, preventable) {
    if (status === 'Unplanned Readmission (Within 30 Days)') {
        const prevTag = parseInt(preventable) === 1 ? '<br><small style="color:#dc2626;font-weight:700;">(Preventable)</small>' : '';
        return '<span style="display:inline-block;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;background:#fee2e2;color:#991b1b;">Readmitted (Day ' + (days ?? '?') + ')</span>' + prevTag;
    }
    if (status === 'Planned Readmission') {
        return '<span style="display:inline-block;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;background:#e0f2fe;color:#0369a1;">Planned (Day ' + (days ?? '?') + ')</span>';
    }
    if (status === 'Readmission (>30 Days)') {
        return '<span style="display:inline-block;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;background:#fef3c7;color:#92400e;">&gt;30 Days</span>';
    }
    return '<span style="display:inline-block;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;background:#dcfce7;color:#166534;">No Readmission</span>';
}

function mortBadge(status, days) {
    if (status === 'Inpatient Mortality') {
        return '<span style="display:inline-block;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;background:#1e293b;color:#f87171;">Inpatient Expired</span>';
    }
    if (status === '30-Day Post-Discharge Mortality') {
        return '<span style="display:inline-block;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;background:#450a0a;color:#fca5a5;">30d Expired (Day ' + (days ?? '?') + ')</span>';
    }
    return '<span style="display:inline-block;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;background:#f1f5f9;color:#475569;">Alive</span>';
}

function riskBadge(risk) {
    const map = {
        'Low':       'background:#dcfce7;color:#166534',
        'Medium':    'background:#fef3c7;color:#92400e',
        'High':      'background:#fee2e2;color:#991b1b',
        'Very High': 'background:#7f1d1d;color:#ffffff'
    };
    const style = map[risk] || 'background:#f1f5f9;color:#475569';
    return '<span style="display:inline-block;padding:2px 7px;border-radius:4px;font-size:11px;font-weight:700;' + style + ';">' + esc(risk) + '</span>';
}

function statusBadge(status) {
    const map = {
        'Under 30-Day Surveillance': 'background:#e0f2fe;color:#0369a1',
        'Readmitted':                'background:#fee2e2;color:#991b1b',
        'Closed - 30d Completed':    'background:#dcfce7;color:#166534',
        'Mortality Review':          'background:#1e293b;color:#fca5a5'
    };
    const style = map[status] || 'background:#f1f5f9;color:#475569';
    return '<span style="display:inline-block;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;' + style + ';">' + esc(status) + '</span>';
}

function boolBadge(v) {
    return parseInt(v) === 1
        ? '<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:700;background:#dcfce7;color:#166534;">Yes</span>'
        : '<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:700;background:#f1f5f9;color:#64748b;">No</span>';
}

function renderTable(records) {
    const tbody = document.getElementById('rmTableBody');
    if (!tbody) return;
    if (!records.length) {
        tbody.innerHTML = '<tr><td colspan="13" style="padding:30px;text-align:center;color:#64748b;">No records found matching the current filters.</td></tr>';
        return;
    }
    tbody.innerHTML = records.map(r =>
        '<tr>' +
        '<td style="font-family:monospace;font-size:12px;font-weight:700;color:#0284c7;">' + esc(r.record_number) + '</td>' +
        '<td style="white-space:nowrap;font-size:12px;">' + esc(r.index_discharge_date) + '</td>' +
        '<td style="font-size:12px;max-width:140px;">' + esc(r.department) + (r.ward_bed ? '<br><small style="color:#94a3b8;">' + esc(r.ward_bed) + '</small>' : '') + '</td>' +
        '<td style="font-size:12px;">' + esc(r.patient_name) + '<br><small style="color:#94a3b8;">' + esc(r.patient_mrn) + ' &bull; ' + r.patient_age + 'y/' + (r.gender ? r.gender[0] : '') + '</small></td>' +
        '<td style="font-size:12px;max-width:170px;">' + esc(r.primary_diagnosis) + (r.icd10_code ? '<br><small style="color:#0284c7;font-weight:600;">' + esc(r.icd10_code) + '</small>' : '') + '</td>' +
        '<td style="text-align:center;font-weight:700;">' + r.length_of_stay + 'd</td>' +
        '<td>' + readmBadge(r.readmission_status, r.days_to_readmission, r.readmission_preventable) + '</td>' +
        '<td>' + mortBadge(r.mortality_status, r.days_to_mortality) + '</td>' +
        '<td>' + riskBadge(r.risk_score) + '</td>' +
        '<td style="text-align:center;">' + boolBadge(r.medication_reconciliation_completed) + '</td>' +
        '<td style="text-align:center;">' + boolBadge(r.post_discharge_followup_call) + '</td>' +
        '<td>' + statusBadge(r.status) + '</td>' +
        '<td><button onclick="window.__rmOpenDetail(' + r.id + ')" style="background:#0284c7;color:#ffffff;border:none;padding:5px 11px;border-radius:5px;cursor:pointer;font-size:11px;font-weight:600;">View / Update</button></td>' +
        '</tr>'
    ).join('');

    window.__rmOpenDetail = openDetailModal;
}

async function openDetailModal(id) {
    const modal = document.getElementById('rmDetailModal');
    if (!modal) return;
    try {
        const res = await api('/reports/readmission-mortality/details?id=' + id);
        if (res.success && res.data) {
            populateDetailModal(res.data);
            modal.style.display = 'flex';
        } else {
            alert('Failed to load record details.');
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

    document.getElementById('rmDetailRecordId').value = r.id;
    document.getElementById('rmDetailRecordNo').textContent = r.record_number;

    set('rmDetailPatient',     r.patient_name + ' (' + r.patient_mrn + ') — ' + r.patient_age + 'y/' + (r.gender || ''));
    set('rmDetailDiag',        r.primary_diagnosis + (r.icd10_code ? ' [' + r.icd10_code + ']' : ''));
    set('rmDetailDept',        r.department + (r.ward_bed ? ' | ' + r.ward_bed : ''));
    set('rmDetailDates',       (r.index_admission_date || 'N/A') + ' to ' + (r.index_discharge_date || 'N/A'));
    set('rmDetailLos',         r.length_of_stay + ' days');
    set('rmDetailPhysician',   r.attending_physician || 'N/A');
    set('rmDetailDisposition', r.discharge_disposition || 'Home');

    const readmText = r.readmission_status + (r.days_to_readmission !== null ? ' (Day ' + r.days_to_readmission + ')' : '') + (r.readmission_diagnosis ? ' &bull; ' + r.readmission_diagnosis : '') + (parseInt(r.readmission_preventable) === 1 ? ' [Preventable]' : '');
    set('rmDetailReadmOutcome', readmText);

    const mortText = r.mortality_status + (r.days_to_mortality !== null ? ' (Day ' + r.days_to_mortality + ')' : '') + (r.cause_of_death ? ' &bull; Cause: ' + r.cause_of_death : '');
    set('rmDetailMortOutcome', mortText);

    setV('rmUReadmStatus',      r.readmission_status);
    setV('rmUReadmDate',        r.readmission_date);
    setV('rmUReadmDiag',        r.readmission_diagnosis);
    setV('rmUReadmDept',        r.readmission_department);
    setV('rmUReadmPreventable', r.readmission_preventable);
    setV('rmUMortStatus',       r.mortality_status);
    setV('rmUMortDate',         r.mortality_date);
    setV('rmUCauseDeath',       r.cause_of_death);
    setV('rmUMedRec',           r.medication_reconciliation_completed);
    setV('rmUFollowupCall',     r.post_discharge_followup_call);
    setV('rmUFollowupAppt',     r.followup_appointment_scheduled);
    setV('rmURisk',             r.risk_score);
    setV('rmUStatus',           r.status);
    setV('rmURootCause',        r.root_cause_analysis);
    setV('rmUIntervention',     r.intervention_plan);
    setV('rmUNotes',            r.notes);
}

async function handleAddSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('rmSubmitAddBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

    const g = id => document.getElementById(id)?.value || '';
    const payload = {
        patient_name:                        g('rmFPatientName'),
        patient_mrn:                         g('rmFPatientMrn'),
        patient_age:                         g('rmFAge'),
        gender:                              g('rmFGender'),
        index_admission_date:                g('rmFAdmDate'),
        index_discharge_date:                g('rmFDischDate'),
        department:                          g('rmFDept'),
        ward_bed:                            g('rmFWardBed'),
        primary_diagnosis:                   g('rmFDiagnosis'),
        icd10_code:                          g('rmFIcd10'),
        attending_physician:                 g('rmFPhysician'),
        discharge_disposition:               g('rmFDisposition'),
        medication_reconciliation_completed: g('rmFMedRec'),
        followup_appointment_scheduled:     g('rmFFollowupAppt'),
        post_discharge_followup_call:        g('rmFFollowupCall'),
        risk_score:                          g('rmFRisk'),
        readmission_status:                  g('rmFReadmStatus'),
        readmission_date:                    g('rmFReadmDate'),
        readmission_diagnosis:               g('rmFReadmDiag'),
        readmission_preventable:             g('rmFReadmPreventable'),
        mortality_status:                    g('rmFMortStatus'),
        cause_of_death:                      g('rmFCauseDeath'),
        status:                              g('rmFStatus'),
        root_cause_analysis:                 g('rmFRootCause'),
        intervention_plan:                   g('rmFIntervention'),
        notes:                               g('rmFNotes'),
    };

    try {
        const res = await api('/reports/readmission-mortality', { method: 'POST', body: JSON.stringify(payload) });
        if (res.success) {
            alert('Surveillance record created! Record #: ' + (res.data?.record_number || ''));
            const modal = document.getElementById('rmAddModal');
            if (modal) modal.style.display = 'none';
            document.getElementById('rmAddForm').reset();
            fetchReport();
        } else {
            alert('Error: ' + (res.message || 'Failed to create record.'));
        }
    } catch (err) {
        console.error(err);
        alert('An error occurred while saving.');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Save Record'; }
    }
}

async function handleDetailSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('rmSaveDetailBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

    const g = id => document.getElementById(id)?.value || '';
    const id = parseInt(g('rmDetailRecordId'));
    const payload = {
        id:                                  id,
        readmission_status:                  g('rmUReadmStatus'),
        readmission_date:                    g('rmUReadmDate'),
        readmission_diagnosis:               g('rmUReadmDiag'),
        readmission_department:              g('rmUReadmDept'),
        readmission_preventable:             g('rmUReadmPreventable'),
        mortality_status:                    g('rmUMortStatus'),
        mortality_date:                      g('rmUMortDate'),
        cause_of_death:                      g('rmUCauseDeath'),
        medication_reconciliation_completed: g('rmUMedRec'),
        post_discharge_followup_call:        g('rmUFollowupCall'),
        followup_appointment_scheduled:      g('rmUFollowupAppt'),
        risk_score:                          g('rmURisk'),
        status:                              g('rmUStatus'),
        root_cause_analysis:                 g('rmURootCause'),
        intervention_plan:                   g('rmUIntervention'),
        notes:                               g('rmUNotes'),
    };

    try {
        const res = await api('/reports/readmission-mortality/update', { method: 'POST', body: JSON.stringify(payload) });
        if (res.success) {
            alert('Record updated successfully!');
            const modal = document.getElementById('rmDetailModal');
            if (modal) modal.style.display = 'none';
            fetchReport();
        } else {
            alert('Error: ' + (res.message || 'Failed to update record.'));
        }
    } catch (err) {
        console.error(err);
        alert('An error occurred while saving.');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Save & Update'; }
    }
}
