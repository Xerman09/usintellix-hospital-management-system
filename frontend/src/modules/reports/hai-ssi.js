import { api } from '../../core/api.js';
import { logReportRun } from './report-history.js';
import { populatePatientSelector, calculateAgeFromDob } from '../../core/patient-chart-helper.js?v=1';

let currentRecords = [];

export async function initHAISSI() {
    setupEventListeners();
    setupPatientPicker();
    await fetchHAI();
}

function setupPatientPicker() {
    const sel = document.getElementById('haiFPatientSelect');
    if (!sel) return;
    populatePatientSelector(sel, (p, isManual) => {
        const idEl   = document.getElementById('haiFPatientId');
        const nameEl = document.getElementById('haiFPatientName');
        const mrnEl  = document.getElementById('haiFPatientMrn');
        const ageEl  = document.getElementById('haiFAge');

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
    });
}

function setupEventListeners() {
    const applyBtn = document.getElementById('haiApplyBtn');
    if (applyBtn) applyBtn.addEventListener('click', () => fetchHAI());

    const resetBtn = document.getElementById('haiResetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            ['haiDateFrom','haiDateTo','haiSearchInput'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            ['haiTypeFilter','haiDeptFilter','haiSeverityFilter','haiStatusFilter'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            fetchHAI();
        });
    }

    const printBtn = document.getElementById('haiPrintBtn');
    if (printBtn) printBtn.addEventListener('click', () => window.print());

    // Add Modal
    const addBtn = document.getElementById('haiAddBtn');
    const addModal = document.getElementById('haiAddModal');
    const cancelBtn = document.getElementById('haiCancelAddBtn');
    const cancelBtn2 = document.getElementById('haiCancelAddBtn2');
    if (addBtn && addModal) addBtn.addEventListener('click', () => {
        // Set default dates
        const today = new Date().toISOString().split('T')[0];
        const repDate = document.getElementById('haiFReportDate');
        const onsetDate = document.getElementById('haiFOnsetDate');
        if (repDate && !repDate.value) repDate.value = today;
        if (onsetDate && !onsetDate.value) onsetDate.value = today;
        addModal.style.display = 'flex';
    });
    if (cancelBtn && addModal) cancelBtn.addEventListener('click', () => { addModal.style.display = 'none'; });
    if (cancelBtn2 && addModal) cancelBtn2.addEventListener('click', () => { addModal.style.display = 'none'; });
    if (addModal) addModal.addEventListener('click', e => { if (e.target === addModal) addModal.style.display = 'none'; });

    const addForm = document.getElementById('haiAddForm');
    if (addForm) addForm.addEventListener('submit', handleAddSubmit);

    // Detail Modal
    const detailModal = document.getElementById('haiDetailModal');
    const closeDetail1 = document.getElementById('haiCloseDetailModal');
    const closeDetail2 = document.getElementById('haiCloseDetailBtn');
    if (closeDetail1 && detailModal) closeDetail1.addEventListener('click', () => { detailModal.style.display = 'none'; });
    if (closeDetail2 && detailModal) closeDetail2.addEventListener('click', () => { detailModal.style.display = 'none'; });
    if (detailModal) detailModal.addEventListener('click', e => { if (e.target === detailModal) detailModal.style.display = 'none'; });

    const detailForm = document.getElementById('haiDetailForm');
    if (detailForm) detailForm.addEventListener('submit', handleDetailSubmit);
}

async function fetchHAI() {
    const tbody = document.getElementById('haiTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="12" style="padding:40px;text-align:center;color:#64748b;font-style:italic;">Loading infection records...</td></tr>';

    const params = new URLSearchParams();
    const v = id => document.getElementById(id)?.value || '';

    if (v('haiDateFrom'))       params.append('date_from', v('haiDateFrom'));
    if (v('haiDateTo'))         params.append('date_to', v('haiDateTo'));
    if (v('haiTypeFilter'))     params.append('infection_type', v('haiTypeFilter'));
    if (v('haiDeptFilter'))     params.append('department', v('haiDeptFilter'));
    if (v('haiSeverityFilter')) params.append('severity', v('haiSeverityFilter'));
    if (v('haiStatusFilter'))   params.append('status', v('haiStatusFilter'));
    if (v('haiSearchInput'))    params.append('search', v('haiSearchInput'));

    try {
        const res = await api('/reports/hai-ssi?' + params.toString());
        if (res.success && res.data) {
            currentRecords = res.data.records || [];
            updateKpis(res.data.kpis);
            populateDeptSelect(res.data.departments || []);
            renderTable(currentRecords);
            logReportRun('HAI & SSI Infection Report', 'hai_ssi', {
                date_from: v('haiDateFrom'),
                date_to: v('haiDateTo')
            });
        } else {
            if (tbody) tbody.innerHTML = '<tr><td colspan="12" style="padding:30px;text-align:center;color:#ef4444;">Failed to load records.</td></tr>';
        }
    } catch (err) {
        console.error('HAI fetch error:', err);
        if (tbody) tbody.innerHTML = '<tr><td colspan="12" style="padding:30px;text-align:center;color:#ef4444;">Server error loading report.</td></tr>';
    }
}

function updateKpis(kpis) {
    if (!kpis) return;
    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val !== null && val !== undefined ? val : 0;
    };
    set('haiKpiTotal',  kpis.total_cases ?? 0);
    set('haiKpiSSI',    kpis.ssi_count ?? 0);
    set('haiKpiDevice', kpis.device_associated_count ?? 0);
    set('haiKpiSevere', kpis.severe_count ?? 0);
    set('haiKpiActive', kpis.active_cases ?? 0);
    set('haiKpiBundle', kpis.bundle_compliant ?? 0);

    const rateEl = document.getElementById('haiKpiBundleRate');
    if (rateEl) {
        rateEl.textContent = (kpis.bundle_compliance_rate ?? 0) + '% compliance rate';
    }
}

function populateDeptSelect(depts) {
    const sel = document.getElementById('haiDeptFilter');
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
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function typeBadge(t) {
    const map = {
        'SSI':       'background:#fee2e2;color:#991b1b',
        'CLABSI':    'background:#fef3c7;color:#92400e',
        'CAUTI':     'background:#fef3c7;color:#92400e',
        'VAP':       'background:#ede9fe;color:#5b21b6',
        'MRSA':      'background:#fee2e2;color:#7f1d1d',
        'CDI':       'background:#f3e8ff;color:#7e22ce',
        'Other HAI': 'background:#f1f5f9;color:#475569'
    };
    const s = map[t] || 'background:#f1f5f9;color:#475569';
    return '<span style="display:inline-block;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;' + s + ';">' + esc(t) + '</span>';
}

function sevBadge(s) {
    const map = {
        'Mild':     'background:#dcfce7;color:#166534',
        'Moderate': 'background:#fef3c7;color:#92400e',
        'Severe':   'background:#fee2e2;color:#991b1b',
        'Critical': 'background:#1e293b;color:#f87171'
    };
    const style = map[s] || 'background:#f1f5f9;color:#475569';
    return '<span style="display:inline-block;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;' + style + ';">' + esc(s) + '</span>';
}

function statusBadge(s) {
    const map = {
        'Active':              'background:#fee2e2;color:#991b1b',
        'Under Investigation': 'background:#fef3c7;color:#92400e',
        'Resolved':            'background:#dcfce7;color:#166534',
        'Reported':            'background:#dbeafe;color:#1e40af',
        'Closed':              'background:#f1f5f9;color:#475569'
    };
    const style = map[s] || 'background:#f1f5f9;color:#475569';
    return '<span style="display:inline-block;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;' + style + ';">' + esc(s) + '</span>';
}

function boolBadge(v) {
    return parseInt(v) === 1
        ? '<span style="display:inline-block;padding:3px 7px;border-radius:4px;font-size:11px;font-weight:700;background:#dcfce7;color:#166534;">Yes</span>'
        : '<span style="display:inline-block;padding:3px 7px;border-radius:4px;font-size:11px;font-weight:700;background:#f1f5f9;color:#64748b;">No</span>';
}

function renderTable(records) {
    const tbody = document.getElementById('haiTableBody');
    if (!tbody) return;
    if (!records.length) {
        tbody.innerHTML = '<tr><td colspan="12" style="padding:30px;text-align:center;color:#64748b;">No infection records found matching the current filters.</td></tr>';
        return;
    }
    tbody.innerHTML = records.map(r =>
        '<tr>' +
        '<td style="font-family:monospace;font-size:12px;font-weight:700;color:#dc2626;">' + esc(r.tracking_number) + '</td>' +
        '<td style="white-space:nowrap;font-size:12px;">' + ((r.report_date || '').split(' ')[0]) + '</td>' +
        '<td>' + typeBadge(r.infection_type) + '</td>' +
        '<td style="font-size:11px;color:#475569;max-width:120px;">' + esc(r.infection_category) + '</td>' +
        '<td style="font-size:12px;max-width:160px;">' + esc(r.department) + (r.ward_bed ? '<br><small style="color:#94a3b8;">' + esc(r.ward_bed) + '</small>' : '') + '</td>' +
        '<td style="font-size:12px;">' + (r.patient_name ? '<a href="javascript:void(0)" onclick="window.__openPatientChartFromReport(\'' + esc(r.patient_mrn) + '\')" style="color:#0284c7;font-weight:600;text-decoration:none;display:inline-flex;align-items:center;gap:4px;" title="Open EHR Patient Chart">&#128100; ' + esc(r.patient_name) + '</a>' + (r.patient_mrn ? '<br><small style="color:#64748b;cursor:pointer;" onclick="window.__openPatientChartFromReport(\'' + esc(r.patient_mrn) + '\')" title="Open EHR Patient Chart">' + esc(r.patient_mrn) + (r.patient_age ? ' &bull; ' + r.patient_age + 'y' : '') + '</small>' : '') : '<span style="color:#94a3b8;">Anonymous</span>') + '</td>' +
        '<td style="font-size:11px;font-weight:600;color:#b91c1c;max-width:150px;">' + (r.pathogen_isolated ? esc(r.pathogen_isolated) + (r.antibiotic_resistance ? '<br><small style="color:#7c3aed;">' + esc(r.antibiotic_resistance) + '</small>' : '') : '<span style="color:#94a3b8;">Pending culture</span>') + '</td>' +
        '<td>' + sevBadge(r.severity) + '</td>' +
        '<td style="text-align:center;">' + boolBadge(r.bundle_compliance) + '</td>' +
        '<td style="text-align:center;">' + boolBadge(r.reported_to_cdc) + '</td>' +
        '<td>' + statusBadge(r.status) + '</td>' +
        '<td><button onclick="window.__haiOpenDetail(' + r.id + ')" style="background:#dc2626;color:#ffffff;border:none;padding:5px 11px;border-radius:5px;cursor:pointer;font-size:11px;font-weight:600;">View / Update</button></td>' +
        '</tr>'
    ).join('');

    window.__haiOpenDetail = openDetailModal;
}

async function openDetailModal(id) {
    const modal = document.getElementById('haiDetailModal');
    if (!modal) return;
    try {
        const res = await api('/reports/hai-ssi/details?id=' + id);
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

    document.getElementById('haiDetailRecordId').value = r.id;
    document.getElementById('haiDetailTracking').textContent = r.tracking_number;
    set('haiDetailType',       r.infection_type + ' — ' + r.infection_category);
    set('haiDetailDept',       r.department + (r.ward_bed ? ' | ' + r.ward_bed : ''));
    const patHtml = r.patient_name ? esc(r.patient_name) + ' (<a href="javascript:void(0)" onclick="window.__openPatientChartFromReport(\'' + esc(r.patient_mrn) + '\')" style="color:#0284c7;font-weight:600;" title="Open EHR Patient Chart">' + esc(r.patient_mrn || 'N/A') + '</a>)' + (r.patient_age ? ', Age ' + r.patient_age : '') : 'No patient linked';
    const patEl = document.getElementById('haiDetailPatient');
    if (patEl) patEl.innerHTML = patHtml;
    set('haiDetailRisk',       r.patient_risk_factors || 'None documented');
    set('haiDetailOnset',      r.onset_date || 'N/A');
    set('haiDetailProcedure',  r.procedure_type ? r.procedure_type + (r.surgery_date ? ' (' + r.surgery_date + ')' : '') + (r.days_post_op !== null ? ' — Day ' + r.days_post_op + ' post-op' : '') : 'N/A (not SSI)');
    set('haiDetailPathogen',   r.pathogen_isolated || 'Pending culture');
    set('haiDetailResistance', r.antibiotic_resistance || 'Not determined');
    set('haiDetailDevice',     parseInt(r.device_associated) === 1 ? (r.device_type || 'Yes') + (r.device_days ? ' (' + r.device_days + ' device days)' : '') : 'No device associated');
    set('haiDetailTreatment',  r.treatment || 'Not documented');
    set('haiDetailIsolation',  r.isolation_precautions || 'Standard Precautions');
    set('haiDetailRootCause',  r.root_cause || 'Pending RCA');
    set('haiDetailCorrective', r.corrective_action || 'Pending CAPA');
    set('haiDetailIdentifier', r.identified_by + (r.identified_by_role ? ' (' + r.identified_by_role + ')' : ''));

    setV('haiUStatus',      r.status);
    setV('haiUSeverity',    r.severity);
    setV('haiUOutcome',     r.outcome);
    setV('haiUBundle',      r.bundle_compliance);
    setV('haiUCDC',         r.reported_to_cdc);
    setV('haiUPathogen',    r.pathogen_isolated);
    setV('haiUResistance',  r.antibiotic_resistance);
    setV('haiUProphylaxis', r.antibiotic_prophylaxis_given);
    setV('haiUTreatment',   r.treatment);
    setV('haiURootCause',   r.root_cause);
    setV('haiUCorrective',  r.corrective_action);
    setV('haiUNotes',       r.notes);
}

async function handleAddSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('haiSubmitAddBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Submitting...'; }

    const g = id => document.getElementById(id)?.value || '';
    const payload = {
        infection_type:               g('haiFType'),
        infection_category:           g('haiFCategory'),
        report_date:                  g('haiFReportDate'),
        onset_date:                   g('haiFOnsetDate'),
        procedure_type:               g('haiFProcedure'),
        surgery_date:                 g('haiFSurgeryDate'),
        surgeon_attending:            g('haiFSurgeon'),
        antibiotic_prophylaxis_given: g('haiFProphylaxis'),
        prophylaxis_timing_correct:   g('haiFProphylaxisTiming'),
        department:                   g('haiFDept'),
        ward_bed:                     g('haiFWardBed'),
        patient_id:                   g('haiFPatientId') || null,
        patient_name:                 g('haiFPatientName'),
        patient_mrn:                  g('haiFPatientMrn'),
        patient_age:                  g('haiFAge'),
        identified_by:                g('haiFIdentifiedBy'),
        identified_by_role:           g('haiFIdentifiedRole'),
        patient_risk_factors:         g('haiFRiskFactors'),
        pathogen_isolated:            g('haiFPathogen'),
        antibiotic_resistance:        g('haiFResistance'),
        device_associated:            g('haiFDeviceAssoc'),
        device_type:                  g('haiFDeviceType'),
        device_days:                  g('haiFDeviceDays'),
        isolation_precautions:        g('haiFIsolation'),
        severity:                     g('haiFSeverity'),
        outcome:                      g('haiFOutcome'),
        status:                       g('haiFStatus'),
        bundle_compliance:            g('haiFBundle'),
        reported_to_cdc:              g('haiFCDC'),
        treatment:                    g('haiFTreatment'),
        root_cause:                   g('haiFRootCause'),
        corrective_action:            g('haiFCorrectiveAction'),
        notes:                        g('haiFNotes'),
    };

    try {
        const res = await api('/reports/hai-ssi', { method: 'POST', body: JSON.stringify(payload) });
        if (res.success) {
            alert('Infection case logged! Tracking #: ' + (res.data?.tracking_number || ''));
            const modal = document.getElementById('haiAddModal');
            if (modal) modal.style.display = 'none';
            document.getElementById('haiAddForm').reset();
            fetchHAI();
        } else {
            alert('Error: ' + (res.message || 'Failed to log infection record.'));
        }
    } catch (err) {
        console.error(err);
        alert('An error occurred while submitting.');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Submit Report'; }
    }
}

async function handleDetailSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('haiSaveDetailBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

    const g = id => document.getElementById(id)?.value || '';
    const id = parseInt(g('haiDetailRecordId'));
    const payload = {
        id:                           id,
        status:                       g('haiUStatus'),
        severity:                     g('haiUSeverity'),
        outcome:                      g('haiUOutcome'),
        bundle_compliance:            g('haiUBundle'),
        reported_to_cdc:              g('haiUCDC'),
        pathogen_isolated:            g('haiUPathogen'),
        antibiotic_resistance:        g('haiUResistance'),
        antibiotic_prophylaxis_given: g('haiUProphylaxis'),
        treatment:                    g('haiUTreatment'),
        root_cause:                   g('haiURootCause'),
        corrective_action:            g('haiUCorrective'),
        notes:                        g('haiUNotes'),
    };

    try {
        const res = await api('/reports/hai-ssi/update', { method: 'POST', body: JSON.stringify(payload) });
        if (res.success) {
            alert('Record updated successfully!');
            const modal = document.getElementById('haiDetailModal');
            if (modal) modal.style.display = 'none';
            fetchHAI();
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
