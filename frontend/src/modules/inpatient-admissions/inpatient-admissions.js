import {
    fetchWhiteboard as apiFetchWhiteboard,
    fetchWards,
    fetchBeds,
    fetchAdmissionDetails,
    admitPatient,
    transferPatient,
    markPendingDischarge,
    dischargePatient,
    updateBedStatus,
    createWard,
    createBed
} from './inpatient-admissions.service.js?v=2';
import { showToast } from '../../core/toast.js';
import { populatePatientSelector, calculateAgeFromDob } from '../../core/patient-chart-helper.js?v=1';

let currentUser = null;
let currentCensusData = {
    wards: [],
    beds: [],
    kpis: {},
    recent_transfers: []
};

let activeWardFilter = 'all';
let activeViewMode = 'floorplan'; // 'floorplan' | 'table'
let clockIntervalId = null;
let autoRefreshIntervalId = null;

export async function initInpatientAdmissions(user = null) {
    currentUser = user;
    setupLiveClock();
    setupEventListeners();
    setupPatientPicker();
    setupDefaultDates();
    await fetchWhiteboard();
    setupAutoRefresh();
}

function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function setupLiveClock() {
    if (clockIntervalId) clearInterval(clockIntervalId);

    function update() {
        const now = new Date();
        const clockEl = document.getElementById('inpatientLiveClock');
        const dateEl = document.getElementById('inpatientLiveDate');

        if (clockEl) {
            clockEl.textContent = now.toTimeString().split(' ')[0];
        }
        if (dateEl) {
            dateEl.textContent = now.toLocaleDateString(undefined, {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
    }

    update();
    clockIntervalId = setInterval(update, 1000);
}

function setupAutoRefresh() {
    if (autoRefreshIntervalId) clearInterval(autoRefreshIntervalId);
    // Auto-refresh census every 30 seconds
    autoRefreshIntervalId = setInterval(() => {
        fetchWhiteboard(true);
    }, 30000);
}

function setupDefaultDates() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const localIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const admitDateInput = document.getElementById('admitDateInput');
    if (admitDateInput && !admitDateInput.value) {
        admitDateInput.value = localIso;
    }

    const dischargeDateInput = document.getElementById('dischargeDateInput');
    if (dischargeDateInput && !dischargeDateInput.value) {
        dischargeDateInput.value = localIso;
    }
}

function setupPatientPicker() {
    const sel = document.getElementById('admitPatientSelect');
    if (!sel) return;

    populatePatientSelector(sel, (p, isManual) => {
        const nameEl = document.getElementById('admitPatientName');
        const mrnEl  = document.getElementById('admitPatientMrn');
        const ageEl  = document.getElementById('admitPatientAge');
        const genEl  = document.getElementById('admitPatientGender');

        if (!p || isManual) {
            if (isManual) {
                if (nameEl) { nameEl.value = ''; nameEl.focus(); }
                if (mrnEl) mrnEl.value = '';
                if (ageEl) ageEl.value = '';
            }
            return;
        }

        const fullName = [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ');
        if (nameEl) nameEl.value = fullName;
        if (mrnEl)  mrnEl.value = p.patient_no || p.mrn || '';
        if (genEl) {
            const sx = (p.sex || '').toLowerCase();
            genEl.value = sx === 'male' ? 'Male' : (sx === 'female' ? 'Female' : 'Other');
        }
        if (ageEl && p.birthdate) {
            ageEl.value = calculateAgeFromDob(p.birthdate);
        }
    });
}

function setupEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('btnInpatientRefresh');
    if (refreshBtn) {
        refreshBtn.onclick = () => fetchWhiteboard();
    }

    // Status filter
    const statusSelect = document.getElementById('inpatientStatusFilter');
    if (statusSelect) {
        statusSelect.onchange = () => filterAndRenderBeds();
    }

    // Search input
    const searchInput = document.getElementById('inpatientSearch');
    if (searchInput) {
        let debounceTimer = null;
        searchInput.oninput = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => filterAndRenderBeds(), 250);
        };
    }

    // View switcher
    const btnFloorplan = document.getElementById('viewModeFloorplan');
    const btnTable = document.getElementById('viewModeTable');
    if (btnFloorplan && btnTable) {
        btnFloorplan.onclick = () => {
            activeViewMode = 'floorplan';
            btnFloorplan.classList.add('active');
            btnTable.classList.remove('active');
            document.getElementById('inpatientFloorplanContainer').style.display = 'block';
            document.getElementById('inpatientTableContainer').style.display = 'none';
        };
        btnTable.onclick = () => {
            activeViewMode = 'table';
            btnTable.classList.add('active');
            btnFloorplan.classList.remove('active');
            document.getElementById('inpatientFloorplanContainer').style.display = 'none';
            document.getElementById('inpatientTableContainer').style.display = 'block';
            renderTable(currentCensusData.beds);
        };
    }

    // Fullscreen Whiteboard Mode
    const fsBtn = document.getElementById('btnInpatientFullscreen');
    if (fsBtn) {
        fsBtn.onclick = () => {
            const wrapper = document.getElementById('inpatientWrapper');
            if (!wrapper) return;
            wrapper.classList.toggle('inpatient-fullscreen');
            if (wrapper.classList.contains('inpatient-fullscreen')) {
                fsBtn.textContent = '✖ Exit Whiteboard';
            } else {
                fsBtn.textContent = '🖥️ Whiteboard Mode';
            }
        };
    }

    // Modal Close Buttons
    document.querySelectorAll('#inpatientWrapper [data-close-modal]').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.inpatient-modal-backdrop').forEach(m => m.classList.remove('open'));
        };
    });

    // Modal Backdrop click to dismiss
    document.querySelectorAll('.inpatient-modal-backdrop').forEach(modal => {
        modal.onclick = (e) => {
            if (e.target === modal) modal.classList.remove('open');
        };
    });

    // Open Admit Modal Button
    const btnAdmit = document.getElementById('btnOpenAdmitModal');
    if (btnAdmit) {
        btnAdmit.onclick = () => openAdmitModal();
    }

    // Open Transfer Modal Button
    const btnTransfer = document.getElementById('btnOpenTransferModal');
    if (btnTransfer) {
        btnTransfer.onclick = () => openTransferModal();
    }

    // Open Config Modal Button
    const btnConfig = document.getElementById('btnOpenConfigModal');
    if (btnConfig) {
        btnConfig.onclick = () => openConfigModal();
    }

    // Modal Config Tabs (New Bed vs New Ward)
    const btnTabNewBed = document.getElementById('btnTabNewBed');
    const btnTabNewWard = document.getElementById('btnTabNewWard');
    const formNewBed = document.getElementById('formNewBed');
    const formNewWard = document.getElementById('formNewWard');

    if (btnTabNewBed && btnTabNewWard) {
        btnTabNewBed.onclick = () => {
            btnTabNewBed.className = 'btn-inpatient btn-inpatient-primary';
            btnTabNewWard.className = 'btn-inpatient btn-inpatient-secondary';
            formNewBed.style.display = 'block';
            formNewWard.style.display = 'none';
        };
        btnTabNewWard.onclick = () => {
            btnTabNewWard.className = 'btn-inpatient btn-inpatient-primary';
            btnTabNewBed.className = 'btn-inpatient btn-inpatient-secondary';
            formNewBed.style.display = 'none';
            formNewWard.style.display = 'block';
        };
    }

    // Transfer Admission Select Change
    const transAdmSel = document.getElementById('transferAdmissionSelect');
    if (transAdmSel) {
        transAdmSel.onchange = () => {
            const admId = parseInt(transAdmSel.value);
            const box = document.getElementById('transferCurrentLocationBox');
            const txt = document.getElementById('transferCurrentLocText');
            if (!admId) {
                if (box) box.style.display = 'none';
                return;
            }
            const bed = currentCensusData.beds.find(b => b.admission_id == admId);
            if (bed && box && txt) {
                box.style.display = 'block';
                txt.textContent = `${bed.ward_name} (${bed.ward_code}) — Room ${bed.room_number}, Bed ${bed.bed_number}`;
            }
        };
    }

    // Form Submissions
    setupFormSubmissions();
}

function setupFormSubmissions() {
    // 1. Form Admit Patient
    const formAdmit = document.getElementById('formAdmitPatient');
    if (formAdmit) {
        formAdmit.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(formAdmit);
            const payload = Object.fromEntries(formData.entries());

            try {
                const res = await admitPatient(payload);
                if (res && res.success) {
                    showToast('Patient admitted successfully!', 'success');
                    document.getElementById('modalAdmitPatient')?.classList.remove('open');
                    formAdmit.reset();
                    await fetchWhiteboard();
                } else {
                    showToast('Admission failed: ' + (res?.message || 'Unknown error'), 'error');
                }
            } catch (err) {
                showToast('Admission error: ' + (err.message || 'Server error'), 'error');
            }
        };
    }

    // 2. Form Transfer Patient
    const formTransfer = document.getElementById('formTransferPatient');
    if (formTransfer) {
        formTransfer.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(formTransfer);
            const payload = Object.fromEntries(formData.entries());

            try {
                const res = await transferPatient(payload);
                if (res && res.success) {
                    showToast('Patient transfer completed successfully! Vacated bed marked for terminal sanitization.', 'success');
                    document.getElementById('modalTransferPatient')?.classList.remove('open');
                    formTransfer.reset();
                    await fetchWhiteboard();
                } else {
                    showToast('Transfer failed: ' + (res?.message || 'Unknown error'), 'error');
                }
            } catch (err) {
                showToast('Transfer error: ' + (err.message || 'Server error'), 'error');
            }
        };
    }

    // 3. Form Discharge Patient
    const formDischarge = document.getElementById('formDischargePatient');
    if (formDischarge) {
        formDischarge.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(formDischarge);
            const payload = Object.fromEntries(formData.entries());

            try {
                const res = await dischargePatient(payload);
                if (res && res.success) {
                    showToast('Patient discharged successfully! Bed vacated and marked as Dirty / Turnover.', 'success');
                    document.getElementById('modalDischargePatient')?.classList.remove('open');
                    formDischarge.reset();
                    await fetchWhiteboard();
                } else {
                    showToast('Discharge failed: ' + (res?.message || 'Unknown error'), 'error');
                }
            } catch (err) {
                showToast('Discharge error: ' + (err.message || 'Server error'), 'error');
            }
        };
    }

    // 4. Form Housekeeping Terminal Sanitization
    const formSanitize = document.getElementById('formSanitizeBed');
    if (formSanitize) {
        formSanitize.onsubmit = async (e) => {
            e.preventDefault();
            const bedId = document.getElementById('sanitizeBedId').value;
            const staff = formSanitize.querySelector('[name="staff_name"]').value;

            try {
                const res = await updateBedStatus({
                    bed_id: bedId,
                    status: 'Available',
                    notes: `Housekeeping terminal sanitization completed by ${staff}`
                });
                if (res && res.success) {
                    showToast('Bed sanitized and certified Available for new patient admission!', 'success');
                    document.getElementById('modalSanitizeBed')?.classList.remove('open');
                    formSanitize.reset();
                    await fetchWhiteboard();
                } else {
                    showToast('Failed to update bed status: ' + (res?.message || 'Unknown error'), 'error');
                }
            } catch (err) {
                showToast('Sanitization sign-off error: ' + (err.message || 'Server error'), 'error');
            }
        };
    }

    // 5. Form New Bed
    const formNewBed = document.getElementById('formNewBed');
    if (formNewBed) {
        formNewBed.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(formNewBed);
            const payload = Object.fromEntries(formData.entries());

            try {
                const res = await createBed(payload);
                if (res && res.success) {
                    showToast('New bed registered successfully!', 'success');
                    document.getElementById('modalConfigWardBed')?.classList.remove('open');
                    formNewBed.reset();
                    await fetchWhiteboard();
                } else {
                    showToast('Failed to register bed: ' + (res?.message || 'Unknown error'), 'error');
                }
            } catch (err) {
                showToast('Registration error: ' + (err.message || 'Server error'), 'error');
            }
        };
    }

    // 6. Form New Ward
    const formNewWard = document.getElementById('formNewWard');
    if (formNewWard) {
        formNewWard.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(formNewWard);
            const payload = Object.fromEntries(formData.entries());

            try {
                const res = await createWard(payload);
                if (res && res.success) {
                    showToast('New hospital ward created successfully!', 'success');
                    document.getElementById('modalConfigWardBed')?.classList.remove('open');
                    formNewWard.reset();
                    await fetchWhiteboard();
                } else {
                    showToast('Failed to create ward: ' + (res?.message || 'Unknown error'), 'error');
                }
            } catch (err) {
                showToast('Ward creation error: ' + (err.message || 'Server error'), 'error');
            }
        };
    }
}

export async function fetchWhiteboard(isSilent = false) {
    try {
        const res = await apiFetchWhiteboard();
        if (res && res.success && res.data) {
            currentCensusData = res.data;
            renderKpis(currentCensusData.kpis);
            renderWardPills(currentCensusData.wards);
            filterAndRenderBeds();
            renderActivityFeed(currentCensusData.recent_transfers);
        }
    } catch (err) {
        if (!isSilent) {
            console.error('Failed to load inpatient census whiteboard:', err);
        }
    }
}

function renderKpis(kpis) {
    if (!kpis) return;

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val !== null && val !== undefined ? val : '--';
    };

    setVal('kpiTotalBeds', kpis.total_beds);
    setVal('kpiBorRate', `${kpis.bed_occupancy_rate}%`);
    setVal('kpiActiveInpatients', `${kpis.active_inpatients} Admitted`);
    setVal('kpiAvailableBeds', kpis.available_count);
    setVal('kpiOccupiedBeds', kpis.occupied_count);
    setVal('kpiPendingBeds', kpis.pending_discharge_count);
    setVal('kpiDirtyBeds', kpis.dirty_turnover_count);
    setVal('kpiIsolationCases', kpis.isolation_count);

    const alosEl = document.getElementById('kpiAlos');
    if (alosEl) {
        alosEl.innerHTML = `${kpis.alos_days} <span style="font-size: 13px; font-weight: 500;">Days</span>`;
    }
}

function renderWardPills(wards) {
    const pillsContainer = document.getElementById('inpatientWardPills');
    if (!pillsContainer || !wards) return;

    let html = `
        <button class="ward-pill-btn ${activeWardFilter === 'all' ? 'active' : ''}" data-ward="all">
            All Hospital Wards (${wards.reduce((sum, w) => sum + (parseInt(w.actual_bed_count) || 0), 0)})
        </button>
    `;

    wards.forEach(w => {
        const total = parseInt(w.actual_bed_count) || 0;
        const occ = (parseInt(w.occupied_beds) || 0) + (parseInt(w.pending_discharge_beds) || 0);
        html += `
            <button class="ward-pill-btn ${activeWardFilter === w.ward_code ? 'active' : ''}" data-ward="${esc(w.ward_code)}">
                ${esc(w.ward_name)} (${occ}/${total})
            </button>
        `;
    });

    pillsContainer.innerHTML = html;

    // Attach click events
    pillsContainer.querySelectorAll('.ward-pill-btn').forEach(btn => {
        btn.onclick = () => {
            activeWardFilter = btn.getAttribute('data-ward');
            pillsContainer.querySelectorAll('.ward-pill-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterAndRenderBeds();
        };
    });
}

function filterAndRenderBeds() {
    const statusFilter = document.getElementById('inpatientStatusFilter')?.value || 'all';
    const searchQuery = (document.getElementById('inpatientSearch')?.value || '').toLowerCase().trim();

    let filtered = (currentCensusData.beds || []).filter(b => {
        if (activeWardFilter !== 'all' && b.ward_code !== activeWardFilter) {
            return false;
        }
        if (statusFilter !== 'all' && b.status !== statusFilter) {
            return false;
        }
        if (searchQuery) {
            const matchStr = `${b.bed_number} ${b.room_number} ${b.patient_name || ''} ${b.patient_mrn || ''} ${b.attending_physician || ''} ${b.admitting_diagnosis || ''}`.toLowerCase();
            if (!matchStr.includes(searchQuery)) return false;
        }
        return true;
    });

    if (activeViewMode === 'floorplan') {
        renderFloorplan(currentCensusData.wards, filtered);
    } else {
        renderTable(filtered);
    }
}

function renderFloorplan(wards, beds) {
    const container = document.getElementById('inpatientFloorplanContainer');
    if (!container) return;

    if (!beds || beds.length === 0) {
        container.innerHTML = `
            <div style="background: #fff; padding: 40px; border-radius: 12px; text-align: center; border: 1px dashed #cbd5e1; color: #64748b;">
                <div style="font-size: 32px; margin-bottom: 8px;">🛏️</div>
                <div style="font-size: 16px; font-weight: 700; color: #1e293b;">No Hospital Beds Match Selection</div>
                <p style="font-size: 13px; margin: 4px 0 0 0;">Adjust your ward filter or search keywords to view census.</p>
            </div>
        `;
        return;
    }

    // Group beds by ward
    const bedsByWard = {};
    beds.forEach(bed => {
        if (!bedsByWard[bed.ward_id]) {
            bedsByWard[bed.ward_id] = [];
        }
        bedsByWard[bed.ward_id].push(bed);
    });

    let html = '';

    (wards || []).forEach(ward => {
        const wardBeds = bedsByWard[ward.id];
        if (!wardBeds || wardBeds.length === 0) return;

        const totalBeds = parseInt(ward.actual_bed_count) || wardBeds.length;
        const occupied = wardBeds.filter(b => b.status === 'Occupied' || b.status === 'Pending Discharge').length;
        const occupancyPct = totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : 0;

        let badgeClass = 'badge-medical';
        if (ward.ward_type === 'ICU') badgeClass = 'badge-icu';
        else if (ward.ward_type === 'Surgical') badgeClass = 'badge-surgical';
        else if (ward.ward_type === 'Pediatric') badgeClass = 'badge-pediatric';
        else if (ward.ward_type === 'Isolation') badgeClass = 'badge-isolation';

        html += `
            <div class="inpatient-ward-section">
                <div class="ward-header">
                    <div class="ward-header-title">
                        <h3>${esc(ward.ward_name)}</h3>
                        <span class="ward-type-badge ${badgeClass}">${esc(ward.ward_type)}</span>
                    </div>
                    <div class="ward-header-meta">
                        <span>📍 ${esc(ward.floor_location)}</span>
                        <span>👩‍⚕️ Head Nurse: ${esc(ward.head_nurse || 'Charge Nurse On-Duty')}</span>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span>${occupied}/${totalBeds} Beds (${occupancyPct}%)</span>
                            <div class="ward-meter-bar">
                                <div class="ward-meter-fill" style="width: ${occupancyPct}%;"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="inpatient-beds-grid">
                    ${wardBeds.map(b => renderBedCard(b)).join('')}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    attachBedCardListeners(container);
}

function renderBedCard(bed) {
    let cardClass = 'bed-card-available';
    let statusPillClass = 'status-pill-available';
    let statusText = '🟢 Available & Sanitized';

    if (bed.status === 'Occupied') {
        cardClass = 'bed-card-occupied';
        statusPillClass = 'status-pill-occupied';
        statusText = '🔴 Occupied';
    } else if (bed.status === 'Pending Discharge') {
        cardClass = 'bed-card-pending-discharge';
        statusPillClass = 'status-pill-pending-discharge';
        statusText = '🟡 Pending Discharge';
    } else if (bed.status === 'Dirty / Turnover') {
        cardClass = 'bed-card-dirty';
        statusPillClass = 'status-pill-dirty';
        statusText = '🟠 Dirty / Turnover';
    } else if (bed.status === 'Maintenance' || bed.status === 'Blocked') {
        cardClass = 'bed-card-maintenance';
        statusPillClass = 'status-pill-maintenance';
        statusText = '⚙️ Maintenance';
    }

    let patientHtml = '';
    if (bed.status === 'Occupied' || bed.status === 'Pending Discharge') {
        let isoBadge = '';
        if (bed.isolation_precautions && bed.isolation_precautions !== 'Standard') {
            let isoClass = 'iso-contact';
            if (bed.isolation_precautions === 'Droplet') isoClass = 'iso-droplet';
            else if (bed.isolation_precautions === 'Airborne') isoClass = 'iso-airborne';
            else if (bed.isolation_precautions === 'Strict Protective Neutropenic') isoClass = 'iso-strict';

            isoBadge = `<div class="isolation-badge ${isoClass}">⚠️ ${esc(bed.isolation_precautions)}</div>`;
        }

        const formattedAdmDate = bed.admission_date ? bed.admission_date.substring(0, 16).replace('T', ' ') : '--';

        patientHtml = `
            <div class="bed-patient-info">
                <div class="bed-patient-name">
                    <a href="javascript:void(0)" class="patient-chart-link" data-mrn="${esc(bed.patient_mrn)}">
                        👤 ${esc(bed.patient_name)}
                    </a>
                    <span class="bed-patient-mrn">${esc(bed.patient_mrn || 'NO MRN')}</span>
                </div>
                ${isoBadge}
                <div class="bed-details-list">
                    <div class="bed-detail-row">
                        <span class="bed-detail-label">Age / Sex:</span>
                        <span class="bed-detail-val">${bed.patient_age ? bed.patient_age + 'y' : '--'} / ${esc(bed.patient_gender || '--')}</span>
                    </div>
                    <div class="bed-detail-row">
                        <span class="bed-detail-label">Attending:</span>
                        <span class="bed-detail-val">${esc(bed.attending_physician)}</span>
                    </div>
                    <div class="bed-detail-row">
                        <span class="bed-detail-label">Diagnosis:</span>
                        <span class="bed-detail-val" title="${esc(bed.admitting_diagnosis)}">${esc(bed.admitting_diagnosis)}</span>
                    </div>
                    <div class="bed-detail-row">
                        <span class="bed-detail-label">Admitted / LOS:</span>
                        <span class="bed-detail-val">${formattedAdmDate} (${bed.los_days || 0}d)</span>
                    </div>
                    ${bed.primary_nurse ? `
                    <div class="bed-detail-row">
                        <span class="bed-detail-label">Primary Nurse:</span>
                        <span class="bed-detail-val">${esc(bed.primary_nurse)}</span>
                    </div>` : ''}
                </div>
            </div>
        `;
    } else if (bed.status === 'Dirty / Turnover') {
        patientHtml = `
            <div class="bed-patient-info" style="border-left: 3px solid #f97316;">
                <div style="font-size: 12px; font-weight: 700; color: #ea580c;">
                    🧹 Turnover Cleaning Mandate
                </div>
                <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
                    Bed vacated; terminal UV & chemical sanitization required per JCAHO infection control protocol before patient admission.
                </div>
            </div>
        `;
    } else if (bed.status === 'Maintenance' || bed.status === 'Blocked') {
        patientHtml = `
            <div class="bed-patient-info" style="border-left: 3px solid #64748b;">
                <div style="font-size: 12px; font-weight: 700; color: #475569;">
                    ⚙️ Out of Service Hold
                </div>
                <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
                    Facility maintenance or telemetry monitor repair underway.
                </div>
            </div>
        `;
    } else {
        patientHtml = `
            <div class="bed-patient-info" style="border-left: 3px solid #10b981;">
                <div style="font-size: 12px; font-weight: 700; color: #166534;">
                    ✨ Sanitized & Ready
                </div>
                <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
                    Features: ${esc(bed.features || 'Standard acute monitoring, nurse call, oxygen port')}
                </div>
            </div>
        `;
    }

    // Actions
    let actionsHtml = '';
    if (bed.status === 'Available') {
        actionsHtml = `
            <button class="bed-action-btn btn-act-admit" data-act="admit" data-bed-id="${bed.id}">
                ➕ Admit Patient
            </button>
        `;
    } else if (bed.status === 'Occupied') {
        actionsHtml = `
            <button class="bed-action-btn btn-act-transfer" data-act="transfer" data-adm-id="${bed.admission_id}">
                🔄 Transfer
            </button>
            <button class="bed-action-btn btn-act-pending" data-act="pending" data-adm-id="${bed.admission_id}">
                🟡 Pending DC
            </button>
            <button class="bed-action-btn btn-act-discharge" data-act="discharge" data-adm-id="${bed.admission_id}">
                🚪 Discharge
            </button>
        `;
    } else if (bed.status === 'Pending Discharge') {
        actionsHtml = `
            <button class="bed-action-btn btn-act-discharge" style="width: 100%; justify-content: center; padding: 7px;" data-act="discharge" data-adm-id="${bed.admission_id}">
                🚪 Complete Discharge Orders
            </button>
        `;
    } else if (bed.status === 'Dirty / Turnover') {
        actionsHtml = `
            <button class="bed-action-btn btn-act-sanitize" data-act="sanitize" data-bed-id="${bed.id}" data-bed-no="${esc(bed.bed_number)}">
                🧹 Terminal Sanitize & Release Bed
            </button>
        `;
    } else {
        actionsHtml = `
            <button class="bed-action-btn btn-act-maint" style="width: 100%; justify-content: center; padding: 7px;" data-act="return-service" data-bed-id="${bed.id}">
                ✅ Return to Service
            </button>
        `;
    }

    return `
        <div class="inpatient-bed-card ${cardClass}" data-bed-id="${bed.id}">
            <div class="bed-card-top">
                <div class="bed-number-box">
                    <span class="bed-number">${esc(bed.bed_number)}</span>
                    <span class="bed-room">${esc(bed.room_number)} • ${esc(bed.bed_type)}</span>
                </div>
                <span class="bed-status-pill ${statusPillClass}">${statusText}</span>
            </div>

            ${patientHtml}

            <div class="bed-card-actions">
                ${actionsHtml}
            </div>
        </div>
    `;
}

function renderTable(beds) {
    const tbody = document.getElementById('inpatientTableBody');
    if (!tbody) return;

    if (!beds || beds.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding: 30px; color: #64748b;">No hospital beds match the filter criteria.</td></tr>`;
        return;
    }

    let html = '';
    beds.forEach(bed => {
        let statusColor = '#10b981';
        if (bed.status === 'Occupied') statusColor = '#ef4444';
        else if (bed.status === 'Pending Discharge') statusColor = '#f59e0b';
        else if (bed.status === 'Dirty / Turnover') statusColor = '#f97316';
        else if (bed.status === 'Maintenance') statusColor = '#64748b';

        let actionBtns = '';
        if (bed.status === 'Available') {
            actionBtns = `<button class="bed-action-btn btn-act-admit" data-act="admit" data-bed-id="${bed.id}">Admit</button>`;
        } else if (bed.status === 'Occupied') {
            actionBtns = `
                <div style="display: flex; gap: 4px;">
                    <button class="bed-action-btn btn-act-transfer" data-act="transfer" data-adm-id="${bed.admission_id}">Transfer</button>
                    <button class="bed-action-btn btn-act-discharge" data-act="discharge" data-adm-id="${bed.admission_id}">Discharge</button>
                </div>
            `;
        } else if (bed.status === 'Pending Discharge') {
            actionBtns = `<button class="bed-action-btn btn-act-discharge" data-act="discharge" data-adm-id="${bed.admission_id}">Complete DC</button>`;
        } else if (bed.status === 'Dirty / Turnover') {
            actionBtns = `<button class="bed-action-btn btn-act-sanitize" data-act="sanitize" data-bed-id="${bed.id}" data-bed-no="${esc(bed.bed_number)}">Sanitize</button>`;
        } else {
            actionBtns = `<button class="bed-action-btn btn-act-maint" data-act="return-service" data-bed-id="${bed.id}">Restore</button>`;
        }

        html += `
            <tr>
                <td><strong>${esc(bed.ward_name)}</strong><br><span style="font-size: 11px; color: #64748b;">${esc(bed.ward_location || '')}</span></td>
                <td><strong>${esc(bed.bed_number)}</strong><br><span style="font-size: 11px; color: #64748b;">${esc(bed.room_number)}</span></td>
                <td><span style="font-size: 11px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${esc(bed.bed_type)}</span></td>
                <td><span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${statusColor}; margin-right: 5px;"></span><strong>${esc(bed.status)}</strong></td>
                <td>
                    ${bed.patient_name ? `
                        <a href="javascript:void(0)" class="patient-chart-link" data-mrn="${esc(bed.patient_mrn)}" style="font-weight: 700; color: #0284c7; text-decoration: none;">
                            ${esc(bed.patient_name)}
                        </a><br>
                        <span style="font-family: monospace; font-size: 11px; color: #64748b;">${esc(bed.patient_mrn || '')}</span>
                    ` : '<span style="color: #94a3b8;">-- Vacant --</span>'}
                </td>
                <td>${bed.patient_age ? `${bed.patient_age}y / ${esc(bed.patient_gender || '')}` : '--'}</td>
                <td>${esc(bed.attending_physician || '--')}</td>
                <td>${bed.admission_date ? `${bed.admission_date.substring(0, 10)} (${bed.los_days || 0}d)` : '--'}</td>
                <td>
                    ${bed.admitting_diagnosis ? esc(bed.admitting_diagnosis) : '--'}
                    ${bed.isolation_precautions && bed.isolation_precautions !== 'Standard' ? `<br><span style="font-size: 10px; color: #dc2626; font-weight: 700;">⚠️ ${esc(bed.isolation_precautions)}</span>` : ''}
                </td>
                <td>${actionBtns}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    attachBedCardListeners(tbody);
}

function renderActivityFeed(transfers) {
    const listEl = document.getElementById('inpatientRecentActivityList');
    if (!listEl) return;

    if (!transfers || transfers.length === 0) {
        listEl.innerHTML = `<div style="font-size: 12px; color: #94a3b8; padding: 10px 0;">No patient transfers recorded today.</div>`;
        return;
    }

    let html = '';
    transfers.slice(0, 5).forEach(t => {
        const timeFormatted = t.transfer_time ? t.transfer_time.substring(11, 16) : '';
        html += `
            <div class="activity-item">
                <div class="activity-icon icon-transfer">🔄</div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #0f172a;">
                        ${esc(t.patient_name)} (${esc(t.patient_mrn || '')}) transferred from <strong>${esc(t.from_ward_name)} [${esc(t.from_bed_number)}]</strong> ➔ <strong>${esc(t.to_ward_name)} [${esc(t.to_bed_number)}]</strong>
                    </div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                        Reason: ${esc(t.transfer_reason)} • Transferred by: ${esc(t.transferred_by || 'Nursing Staff')}
                    </div>
                </div>
                <div style="font-size: 11px; color: #94a3b8; font-family: monospace;">${timeFormatted}</div>
            </div>
        `;
    });

    listEl.innerHTML = html;
}

function attachBedCardListeners(container) {
    // Patient Chart Link
    container.querySelectorAll('.patient-chart-link').forEach(link => {
        link.onclick = (e) => {
            e.preventDefault();
            const mrn = link.getAttribute('data-mrn');
            if (mrn && window.__openPatientChartFromReport) {
                window.__openPatientChartFromReport(mrn);
            } else if (mrn && window.__openDashboardTab) {
                window.__openDashboardTab('patients', 'Patients');
            }
        };
    });

    // Admit Action
    container.querySelectorAll('[data-act="admit"]').forEach(btn => {
        btn.onclick = () => {
            const bedId = btn.getAttribute('data-bed-id');
            openAdmitModal(bedId);
        };
    });

    // Transfer Action
    container.querySelectorAll('[data-act="transfer"]').forEach(btn => {
        btn.onclick = () => {
            const admId = btn.getAttribute('data-adm-id');
            openTransferModal(admId);
        };
    });

    // Pending Discharge Action
    container.querySelectorAll('[data-act="pending"]').forEach(btn => {
        btn.onclick = async () => {
            const admId = btn.getAttribute('data-adm-id');
            if (!confirm('Mark this inpatient as Pending Discharge (discharge order written, awaiting final clearance)?')) return;
            try {
                const res = await markPendingDischarge({ admission_id: admId });
                if (res && res.success) {
                    showToast('Inpatient marked as pending discharge', 'success');
                    await fetchWhiteboard();
                } else {
                    showToast('Error: ' + (res?.message || 'Failed'), 'error');
                }
            } catch (err) {
                showToast('Error: ' + err.message, 'error');
            }
        };
    });

    // Discharge Action
    container.querySelectorAll('[data-act="discharge"]').forEach(btn => {
        btn.onclick = () => {
            const admId = btn.getAttribute('data-adm-id');
            openDischargeModal(admId);
        };
    });

    // Housekeeping Sanitize Action
    container.querySelectorAll('[data-act="sanitize"]').forEach(btn => {
        btn.onclick = () => {
            const bedId = btn.getAttribute('data-bed-id');
            const bedNo = btn.getAttribute('data-bed-no');
            openSanitizeModal(bedId, bedNo);
        };
    });

    // Return to Service Action
    container.querySelectorAll('[data-act="return-service"]').forEach(btn => {
        btn.onclick = async () => {
            const bedId = btn.getAttribute('data-bed-id');
            if (!confirm('Certify maintenance complete and return bed to Available status?')) return;
            try {
                const res = await updateBedStatus({
                    bed_id: bedId,
                    status: 'Available'
                });
                if (res && res.success) {
                    showToast('Bed returned to Available status', 'success');
                    await fetchWhiteboard();
                } else {
                    showToast('Error: ' + (res?.message || 'Failed'), 'error');
                }
            } catch (err) {
                showToast('Error: ' + err.message, 'error');
            }
        };
    });
}

function openAdmitModal(preselectedBedId = null) {
    const modal = document.getElementById('modalAdmitPatient');
    if (!modal) return;

    // Populate available beds
    const sel = document.getElementById('admitBedSelect');
    if (sel) {
        sel.innerHTML = '<option value="">-- Choose Available Bed --</option>';
        (currentCensusData.beds || []).forEach(b => {
            if (b.status === 'Available' || b.id == preselectedBedId) {
                const opt = document.createElement('option');
                opt.value = b.id;
                opt.textContent = `${b.ward_name} (${b.ward_code}) — Room ${b.room_number}, Bed ${b.bed_number} [${b.bed_type}]`;
                if (preselectedBedId && b.id == preselectedBedId) {
                    opt.selected = true;
                }
                sel.appendChild(opt);
            }
        });
    }

    setupDefaultDates();
    modal.classList.add('open');
}

function openTransferModal(preselectedAdmId = null) {
    const modal = document.getElementById('modalTransferPatient');
    if (!modal) return;

    // Populate active admissions
    const admSel = document.getElementById('transferAdmissionSelect');
    if (admSel) {
        admSel.innerHTML = '<option value="">-- Choose Admitted Patient --</option>';
        (currentCensusData.beds || []).forEach(b => {
            if (b.admission_id && (b.status === 'Occupied' || b.status === 'Pending Discharge')) {
                const opt = document.createElement('option');
                opt.value = b.admission_id;
                opt.textContent = `${b.patient_name} (${b.patient_mrn || 'NO MRN'}) — Current: ${b.ward_code} ${b.bed_number}`;
                if (preselectedAdmId && b.admission_id == preselectedAdmId) {
                    opt.selected = true;
                }
                admSel.appendChild(opt);
            }
        });
        admSel.dispatchEvent(new Event('change'));
    }

    // Populate available beds for transfer
    const toBedSel = document.getElementById('transferToBedSelect');
    if (toBedSel) {
        toBedSel.innerHTML = '<option value="">-- Choose Destination Bed --</option>';
        (currentCensusData.beds || []).forEach(b => {
            if (b.status === 'Available') {
                const opt = document.createElement('option');
                opt.value = b.id;
                opt.textContent = `${b.ward_name} (${b.ward_code}) — Room ${b.room_number}, Bed ${b.bed_number} [${b.bed_type}]`;
                toBedSel.appendChild(opt);
            }
        });
    }

    modal.classList.add('open');
}

function openDischargeModal(admissionId) {
    const modal = document.getElementById('modalDischargePatient');
    if (!modal) return;

    const bed = currentCensusData.beds.find(b => b.admission_id == admissionId);
    if (!bed) return;

    document.getElementById('dischargeAdmissionId').value = admissionId;
    document.getElementById('dischargePatientName').textContent = bed.patient_name;
    document.getElementById('dischargeAdmissionNo').textContent = bed.admission_number || '--';
    document.getElementById('dischargeBedNo').textContent = `${bed.ward_code} - ${bed.bed_number}`;
    document.getElementById('dischargeLos').textContent = `${bed.los_days || 0} days`;
    document.getElementById('dischargePhysician').value = bed.attending_physician || '';

    setupDefaultDates();
    modal.classList.add('open');
}

function openSanitizeModal(bedId, bedNumber) {
    const modal = document.getElementById('modalSanitizeBed');
    if (!modal) return;

    document.getElementById('sanitizeBedId').value = bedId;
    document.getElementById('sanitizeBedNumber').textContent = bedNumber || 'Bed';
    modal.classList.add('open');
}

function openConfigModal() {
    const modal = document.getElementById('modalConfigWardBed');
    if (!modal) return;

    // Populate ward options in new bed form
    const wardSel = document.getElementById('newBedWardSelect');
    if (wardSel) {
        wardSel.innerHTML = '<option value="">-- Choose Ward --</option>';
        (currentCensusData.wards || []).forEach(w => {
            const opt = document.createElement('option');
            opt.value = w.id;
            opt.textContent = `${w.ward_name} (${w.ward_code}) [${w.ward_type}]`;
            wardSel.appendChild(opt);
        });
    }

    modal.classList.add('open');
}
