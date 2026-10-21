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
    createBed,
    fetchDischargeSummary,
    saveDischargeSummaryDraft,
    finalizeDischargeSummary,
    getDischargeSummaryPrintUrl,
    acceptTransferHandover,
    fetchTransferDetail,
    fetchPendingHandovers,
    fetchDailyRounds,
    fetchDailyRound,
    fetchDailyRoundOptions,
    saveDailyRound,
    updateDailyRound,
    deleteDailyRound,
    fetchProgressNotes,
    fetchProgressNote,
    fetchProgressNoteOptions,
    saveProgressNote,
    updateProgressNote,
    cosignProgressNote,
    deleteProgressNote,
    fetchCarePlans,
    fetchCarePlan,
    fetchCarePlanOptions,
    saveCarePlan,
    updateCarePlan,
    evaluateCarePlan,
    deleteCarePlan,
    fetchFluidBalance,
    fetchFluidBalanceEntry,
    saveFluidBalance,
    updateFluidBalance,
    deleteFluidBalance,
    fetchShiftHandovers,
    fetchShiftHandover,
    saveShiftHandover,
    updateShiftHandover,
    signIncomingShiftHandover,
    deleteShiftHandover
} from './inpatient-admissions.service.js?v=9';
import { showToast } from '../../core/toast.js';
import { populatePatientSelector, calculateAgeFromDob } from '../../core/patient-chart-helper.js?v=41';
import { systemNow } from "../../core/timezone.js";
import { getUser } from "../../core/session.js?v=5";
const LAB_ORDER_ROLES = ["admin", "doctor", "clinician", "nurse", "charge_nurse"];

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
        const now = systemNow();
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
    const now = systemNow();
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
                fsBtn.textContent = 'âœ– Exit Whiteboard';
            } else {
                fsBtn.textContent = 'ðŸ–¥ï¸ Whiteboard Mode';
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

    // Modal Daily Ward Round Tabs
    const tabBtnNewRound = document.getElementById('tabBtnNewRound');
    const tabBtnRoundHistory = document.getElementById('tabBtnRoundHistory');
    const paneNewRound = document.getElementById('paneNewRound');
    const paneRoundHistory = document.getElementById('paneRoundHistory');

    if (tabBtnNewRound && tabBtnRoundHistory) {
        tabBtnNewRound.onclick = () => {
            tabBtnNewRound.classList.add('active');
            tabBtnNewRound.style.color = '#2563eb';
            tabBtnNewRound.style.borderBottom = '2px solid #2563eb';
            tabBtnRoundHistory.classList.remove('active');
            tabBtnRoundHistory.style.color = '#64748b';
            tabBtnRoundHistory.style.borderBottom = '2px solid transparent';
            if (paneNewRound) paneNewRound.style.display = 'block';
            if (paneRoundHistory) paneRoundHistory.style.display = 'none';
        };

        tabBtnRoundHistory.onclick = () => {
            tabBtnRoundHistory.classList.add('active');
            tabBtnRoundHistory.style.color = '#2563eb';
            tabBtnRoundHistory.style.borderBottom = '2px solid #2563eb';
            tabBtnNewRound.classList.remove('active');
            tabBtnNewRound.style.color = '#64748b';
            tabBtnNewRound.style.borderBottom = '2px solid transparent';
            if (paneNewRound) paneNewRound.style.display = 'none';
            if (paneRoundHistory) paneRoundHistory.style.display = 'block';
        };
    }

    // Modal Daily Ward Round Trajectory Buttons
    const trajectoryButtonGroup = document.getElementById('roundTrajectoryButtonGroup');
    if (trajectoryButtonGroup) {
        trajectoryButtonGroup.querySelectorAll('.trajectory-btn').forEach(btn => {
            btn.onclick = () => {
                const val = btn.getAttribute('data-val');
                selectTrajectoryButton(val);
            };
        });
    }

    // Modal Daily Ward Round -> Open Multidisciplinary Notes
    const btnRoundViewMpn = document.getElementById('btnRoundViewMpn');
    if (btnRoundViewMpn) {
        btnRoundViewMpn.onclick = () => {
            if (currentRoundsAdmissionId) {
                openMultidisciplinaryNotesModal(currentRoundsAdmissionId);
            }
        };
    }

    // Modal Multidisciplinary Progress Notes Tabs
    const tabBtnMpnTimeline = document.getElementById('tabBtnMpnTimeline');
    const tabBtnMpnNewNote = document.getElementById('tabBtnMpnNewNote');
    const paneMpnTimeline = document.getElementById('paneMpnTimeline');
    const paneMpnNewNote = document.getElementById('paneMpnNewNote');

    if (tabBtnMpnTimeline && tabBtnMpnNewNote) {
        tabBtnMpnTimeline.onclick = () => {
            tabBtnMpnTimeline.classList.add('active');
            tabBtnMpnTimeline.style.color = '#0d9488';
            tabBtnMpnTimeline.style.borderBottom = '2px solid #0d9488';
            tabBtnMpnNewNote.classList.remove('active');
            tabBtnMpnNewNote.style.color = '#64748b';
            tabBtnMpnNewNote.style.borderBottom = '2px solid transparent';
            if (paneMpnTimeline) paneMpnTimeline.style.display = 'block';
            if (paneMpnNewNote) paneMpnNewNote.style.display = 'none';
        };

        tabBtnMpnNewNote.onclick = () => {
            tabBtnMpnNewNote.classList.add('active');
            tabBtnMpnNewNote.style.color = '#0d9488';
            tabBtnMpnNewNote.style.borderBottom = '2px solid #0d9488';
            tabBtnMpnTimeline.classList.remove('active');
            tabBtnMpnTimeline.style.color = '#64748b';
            tabBtnMpnTimeline.style.borderBottom = '2px solid transparent';
            if (paneMpnTimeline) paneMpnTimeline.style.display = 'none';
            if (paneMpnNewNote) paneMpnNewNote.style.display = 'block';
        };
    }

    const btnQuickNewMpn = document.getElementById('btnQuickNewMpn');
    if (btnQuickNewMpn) {
        btnQuickNewMpn.onclick = () => {
            resetMpnFormForNew();
            if (tabBtnMpnNewNote) tabBtnMpnNewNote.click();
        };
    }

    const btnCancelMpnForm = document.getElementById('btnCancelMpnForm');
    if (btnCancelMpnForm) {
        btnCancelMpnForm.onclick = () => {
            if (tabBtnMpnTimeline) tabBtnMpnTimeline.click();
        };
    }

    // Discipline Filter Chips in Multidisciplinary Modal
    const filterBar = document.getElementById('mpnDisciplineFilterBar');
    if (filterBar) {
        filterBar.querySelectorAll('.mpn-filter-chip').forEach(chip => {
            chip.onclick = () => {
                const disc = chip.getAttribute('data-discipline');
                activeMpnDisciplineFilter = disc;

                filterBar.querySelectorAll('.mpn-filter-chip').forEach(c => {
                    c.classList.remove('active-chip');
                    c.style.border = '1px solid #cbd5e1';
                    c.style.background = '#fff';
                    c.style.color = '#1e293b';
                });
                chip.classList.add('active-chip');
                chip.style.border = '1px solid #0d9488';
                chip.style.background = '#0d9488';
                chip.style.color = '#fff';

                if (currentMpnAdmissionId) {
                    loadMultidisciplinaryTimeline(currentMpnAdmissionId, disc);
                }
            };
        });
    }

    // Auto-suggest role when discipline changes in form
    const formDiscSelect = document.getElementById('mpnFormDiscipline');
    if (formDiscSelect) {
        formDiscSelect.onchange = () => {
            const disc = formDiscSelect.value;
            const roleInput = document.getElementById('mpnFormProviderRole');
            const defaultRoles = {
                'Physical Therapy': 'Physical Therapist (DPT)',
                'Occupational Therapy': 'Occupational Therapist (OTR/L)',
                'Clinical Nutrition': 'Registered Dietitian / Nutritionist (RD)',
                'Clinical Pharmacy': 'Clinical Specialist Pharmacist (PharmD)',
                'Medical Social Work': 'Medical Social Worker (LCSW)',
                'Respiratory Therapy': 'Respiratory Therapist (RRT)',
                'Speech-Language Pathology': 'Speech-Language Pathologist (CCC-SLP)',
                'Wound Care': 'Wound & Ostomy Care Nurse (CWOCN)',
                'General Allied Health': 'Allied Health Practitioner'
            };
            if (roleInput && (!roleInput.value || Object.values(defaultRoles).includes(roleInput.value))) {
                roleInput.value = defaultRoles[disc] || '';
            }
        };
    }

    // Modal Daily Ward Round -> Open Nursing Care Plans
    const btnRoundViewNcp = document.getElementById('btnRoundViewNcp');
    if (btnRoundViewNcp) {
        btnRoundViewNcp.onclick = () => {
            if (currentRoundsAdmissionId) {
                openNursingCarePlansModal(currentRoundsAdmissionId);
            }
        };
    }

    // Modal Structured Nursing Care Plans Tabs
    const tabBtnNcpList = document.getElementById('tabBtnNcpList');
    const tabBtnNcpForm = document.getElementById('tabBtnNcpForm');
    const paneNcpList = document.getElementById('paneNcpList');
    const paneNcpForm = document.getElementById('paneNcpForm');

    if (tabBtnNcpList && tabBtnNcpForm) {
        tabBtnNcpList.onclick = () => {
            tabBtnNcpList.classList.add('active');
            tabBtnNcpList.style.color = '#4338ca';
            tabBtnNcpList.style.borderBottom = '2px solid #4338ca';
            tabBtnNcpForm.classList.remove('active');
            tabBtnNcpForm.style.color = '#64748b';
            tabBtnNcpForm.style.borderBottom = '2px solid transparent';
            if (paneNcpList) paneNcpList.style.display = 'block';
            if (paneNcpForm) paneNcpForm.style.display = 'none';
        };

        tabBtnNcpForm.onclick = () => {
            tabBtnNcpForm.classList.add('active');
            tabBtnNcpForm.style.color = '#4338ca';
            tabBtnNcpForm.style.borderBottom = '2px solid #4338ca';
            tabBtnNcpList.classList.remove('active');
            tabBtnNcpList.style.color = '#64748b';
            tabBtnNcpList.style.borderBottom = '2px solid transparent';
            if (paneNcpList) paneNcpList.style.display = 'none';
            if (paneNcpForm) paneNcpForm.style.display = 'block';
        };
    }

    const btnQuickNewNcp = document.getElementById('btnQuickNewNcp');
    if (btnQuickNewNcp) {
        btnQuickNewNcp.onclick = () => {
            resetNcpFormForNew();
            if (tabBtnNcpForm) tabBtnNcpForm.click();
        };
    }

    const btnCancelNcpForm = document.getElementById('btnCancelNcpForm');
    if (btnCancelNcpForm) {
        btnCancelNcpForm.onclick = () => {
            if (tabBtnNcpList) tabBtnNcpList.click();
        };
    }

    // Evaluation State Filter Chips in Nursing Care Plan Modal
    const ncpEvalFilterBar = document.getElementById('ncpEvalFilterBar');
    if (ncpEvalFilterBar) {
        ncpEvalFilterBar.querySelectorAll('.ncp-filter-chip').forEach(chip => {
            chip.onclick = () => {
                const evalState = chip.getAttribute('data-eval');
                activeNcpEvalFilter = evalState;

                ncpEvalFilterBar.querySelectorAll('.ncp-filter-chip').forEach(c => {
                    c.classList.remove('active-chip');
                    c.style.border = '1px solid #cbd5e1';
                    c.style.background = '#fff';
                    c.style.color = '#1e293b';
                });
                chip.classList.add('active-chip');
                chip.style.border = '1px solid #4338ca';
                chip.style.background = '#4338ca';
                chip.style.color = '#fff';

                if (currentNcpAdmissionId) {
                    loadNursingCarePlans(currentNcpAdmissionId, evalState);
                }
            };
        });
    }

    // NANDA-I Template Picker auto-fill
    const ncpTemplateSelect = document.getElementById('ncpTemplateSelect');
    if (ncpTemplateSelect) {
        ncpTemplateSelect.onchange = () => {
            const idx = ncpTemplateSelect.value;
            if (idx === '' || !cachedNandaTemplates[idx]) return;
            const tpl = cachedNandaTemplates[idx];
            document.getElementById('ncpFormNandaCode').value = tpl.code || '';
            document.getElementById('ncpFormNandaDomain').value = tpl.domain || '';
            document.getElementById('ncpFormDiagnosis').value = tpl.diagnosis || '';
            document.getElementById('ncpFormPriority').value = tpl.priority || 'Medium / Standard';
            document.getElementById('ncpFormRelatedTo').value = tpl.related_to || '';
            document.getElementById('ncpFormAeb').value = tpl.as_evidenced_by || '';
            document.getElementById('ncpFormGoals').value = tpl.measurable_goals || '';
            document.getElementById('ncpFormInterventions').value = tpl.nursing_interventions || '';
            document.getElementById('ncpFormRationale').value = tpl.rationale || '';
        };
    }

    // Modal Daily Ward Round -> Open 24-Hour Fluid Balance Chart
    const btnRoundViewFluid = document.getElementById('btnRoundViewFluid');
    if (btnRoundViewFluid) {
        btnRoundViewFluid.onclick = () => {
            if (currentRoundsAdmissionId) {
                openFluidBalanceModal(currentRoundsAdmissionId);
            }
        };
    }

    // Modal 24-Hour Fluid Balance Tabs
    const tabBtnFbcChart = document.getElementById('tabBtnFbcChart');
    const tabBtnFbcRecord = document.getElementById('tabBtnFbcRecord');
    const paneFbcChart = document.getElementById('paneFbcChart');
    const paneFbcRecord = document.getElementById('paneFbcRecord');

    if (tabBtnFbcChart && tabBtnFbcRecord) {
        tabBtnFbcChart.onclick = () => {
            tabBtnFbcChart.classList.add('active');
            tabBtnFbcChart.style.color = '#0284c7';
            tabBtnFbcChart.style.borderBottom = '2px solid #0284c7';
            tabBtnFbcRecord.classList.remove('active');
            tabBtnFbcRecord.style.color = '#64748b';
            tabBtnFbcRecord.style.borderBottom = '2px solid transparent';
            if (paneFbcChart) paneFbcChart.style.display = 'block';
            if (paneFbcRecord) paneFbcRecord.style.display = 'none';
        };

        tabBtnFbcRecord.onclick = () => {
            tabBtnFbcRecord.classList.add('active');
            tabBtnFbcRecord.style.color = '#0284c7';
            tabBtnFbcRecord.style.borderBottom = '2px solid #0284c7';
            tabBtnFbcChart.classList.remove('active');
            tabBtnFbcChart.style.color = '#64748b';
            tabBtnFbcChart.style.borderBottom = '2px solid transparent';
            if (paneFbcChart) paneFbcChart.style.display = 'none';
            if (paneFbcRecord) paneFbcRecord.style.display = 'block';
        };
    }

    const btnQuickNewFbc = document.getElementById('btnQuickNewFbc');
    if (btnQuickNewFbc) {
        btnQuickNewFbc.onclick = () => {
            resetFbcFormForNew();
            if (tabBtnFbcRecord) tabBtnFbcRecord.click();
        };
    }

    const btnCancelFbcForm = document.getElementById('btnCancelFbcForm');
    if (btnCancelFbcForm) {
        btnCancelFbcForm.onclick = () => {
            if (tabBtnFbcChart) tabBtnFbcChart.click();
        };
    }

    // Live subtotal and entry net calculator on Fluid Balance volume inputs
    document.querySelectorAll('#formFluidBalance .fbc-vol-input').forEach(inp => {
        inp.addEventListener('input', () => recalculateLiveFbcForm());
    });

    // Modal Daily Ward Round -> Open SBAR Nurse Shift Handovers
    const btnRoundViewSbar = document.getElementById('btnRoundViewSbar');
    if (btnRoundViewSbar) {
        btnRoundViewSbar.onclick = () => {
            if (currentRoundsAdmissionId) {
                openShiftHandoverModal(currentRoundsAdmissionId);
            }
        };
    }

    // Modal SBAR Nurse Shift Handovers Tabs & Filter Chips
    const tabBtnSbarLog = document.getElementById('tabBtnSbarLog');
    const tabBtnSbarNew = document.getElementById('tabBtnSbarNew');
    const paneSbarLog = document.getElementById('paneSbarLog');
    const paneSbarForm = document.getElementById('paneSbarForm');
    const sbarFilterBar = document.getElementById('sbarStatusFilterBar');

    if (tabBtnSbarLog && tabBtnSbarNew) {
        tabBtnSbarLog.onclick = () => {
            tabBtnSbarLog.classList.add('active');
            tabBtnSbarLog.style.color = '#4f46e5';
            tabBtnSbarLog.style.borderBottom = '2px solid #4f46e5';
            tabBtnSbarNew.classList.remove('active');
            tabBtnSbarNew.style.color = '#64748b';
            tabBtnSbarNew.style.borderBottom = '2px solid transparent';
            if (paneSbarLog) paneSbarLog.style.display = 'block';
            if (paneSbarForm) paneSbarForm.style.display = 'none';
            if (sbarFilterBar) sbarFilterBar.style.display = 'flex';
        };

        tabBtnSbarNew.onclick = () => {
            tabBtnSbarNew.classList.add('active');
            tabBtnSbarNew.style.color = '#4f46e5';
            tabBtnSbarNew.style.borderBottom = '2px solid #4f46e5';
            tabBtnSbarLog.classList.remove('active');
            tabBtnSbarLog.style.color = '#64748b';
            tabBtnSbarLog.style.borderBottom = '2px solid transparent';
            if (paneSbarLog) paneSbarLog.style.display = 'none';
            if (paneSbarForm) paneSbarForm.style.display = 'block';
            if (sbarFilterBar) sbarFilterBar.style.display = 'none';
        };
    }

    if (sbarFilterBar) {
        sbarFilterBar.querySelectorAll('.sbar-filter-chip').forEach(chip => {
            chip.onclick = () => {
                const statusVal = chip.getAttribute('data-status') || 'all';
                activeSbarStatusFilter = statusVal;
                sbarFilterBar.querySelectorAll('.sbar-filter-chip').forEach(c => {
                    c.classList.remove('active');
                    c.style.border = '1px solid #cbd5e1';
                    c.style.background = '#fff';
                    c.style.color = '#475569';
                });
                chip.classList.add('active');
                chip.style.border = '1px solid #4f46e5';
                chip.style.background = '#4f46e5';
                chip.style.color = '#fff';

                if (currentSbarAdmissionId) {
                    loadShiftHandovers(currentSbarAdmissionId, statusVal);
                }
            };
        });
    }

    const btnCancelSbarForm = document.getElementById('btnCancelSbarForm');
    if (btnCancelSbarForm) {
        btnCancelSbarForm.onclick = () => {
            if (tabBtnSbarLog) tabBtnSbarLog.click();
        };
    }

    const btnAutofillSbarChart = document.getElementById('btnAutofillSbarChart');
    if (btnAutofillSbarChart) {
        btnAutofillSbarChart.onclick = () => {
            autofillSbarFromChart();
        };
    }

    const sbarOutNameInput = document.getElementById('sbarOutgoingNurseName');
    if (sbarOutNameInput) {
        sbarOutNameInput.addEventListener('input', () => {
            const preview = document.getElementById('sbarOutgoingSigPreview');
            if (!preview) return;
            const val = sbarOutNameInput.value.trim();
            if (val) {
                const stamp = val.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
                preview.textContent = `🔒 ESIGN_OUTGOING_RN_${stamp}`;
            } else {
                preview.textContent = '🔒 Digital Stamp: Will be signed upon submission';
            }
        });
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
                txt.textContent = `${bed.ward_name} (${bed.ward_code}) â€” Room ${bed.room_number}, Bed ${bed.bed_number}`;

                // Auto-suggest SBAR Situation & Background if not already populated
                const sitEl = document.getElementById('sbarSituation');
                if (sitEl && !sitEl.value) {
                    sitEl.value = `Transfer from ${bed.ward_name} [${bed.bed_number}] to destination bed for ${bed.patient_name}.`;
                }
                const bgEl = document.getElementById('sbarBackground');
                if (bgEl && !bgEl.value) {
                    bgEl.value = `Admission Date: ${bed.admission_date || '--'} (${bed.los_days || 0}d LOS). Admitting Diagnosis: ${bed.admitting_diagnosis || '--'}. Isolation: ${bed.isolation_precautions || 'Standard'}.`;
                }
            }
        };
    }

    // Bedside Co-Sign Toggle
    const cosignToggle = document.getElementById('transferBedsideCosignToggle');
    const cosignSection = document.getElementById('transferBedsideCosignSection');
    if (cosignToggle && cosignSection) {
        cosignToggle.onchange = () => {
            cosignSection.style.display = cosignToggle.checked ? 'block' : 'none';
        };
    }

    // Print Handover Record Button
    const btnPrintHandover = document.getElementById('btnPrintHandoverRecord');
    if (btnPrintHandover) {
        btnPrintHandover.onclick = () => {
            const content = document.getElementById('transferHandoverReportContent')?.innerHTML;
            if (!content) return;
            const printWindow = window.open('', '_blank', 'width=850,height=900');
            if (printWindow) {
                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Nursing Clinical Handover Record</title>
                        <style>
                            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 24px; color: #0f172a; line-height: 1.5; }
                            h1, h2, h3, h4 { margin-top: 0; }
                            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
                            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 13px; text-align: left; }
                            th { background: #f8fafc; font-weight: 600; }
                            @media print {
                                body { padding: 0; }
                            }
                        </style>
                    </head>
                    <body>
                        ${content}
                        <script>
                            window.onload = function() { window.print(); };
                        <\/script>
                    </body>
                    </html>
                `);
                printWindow.document.close();
            }
        };
    }

    // KPI Card Pending Handovers Click
    const kpiPendingCard = document.getElementById('kpiCardPendingHandovers');
    if (kpiPendingCard) {
        kpiPendingCard.onclick = async () => {
            try {
                const res = await fetchPendingHandovers();
                if (res && res.success && res.data && res.data.length > 0) {
                    openAcceptHandoverModal(res.data[0].id);
                } else {
                    showToast('No transfer handovers are currently awaiting nurse acceptance.', 'info');
                }
            } catch (err) {
                showToast('Unable to fetch pending handovers: ' + err.message, 'error');
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

    // 2. Form Transfer Patient & SBAR Handover Sign-Off
    const formTransfer = document.getElementById('formTransferPatient');
    if (formTransfer) {
        formTransfer.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(formTransfer);
            const payload = Object.fromEntries(formData.entries());

            // Structure vitals_at_transfer
            payload.vitals_at_transfer = {
                bp: document.getElementById('transferVitalsBp')?.value || '',
                hr: document.getElementById('transferVitalsHr')?.value || '',
                rr: document.getElementById('transferVitalsRr')?.value || '',
                temp: document.getElementById('transferVitalsTemp')?.value || '',
                spo2: document.getElementById('transferVitalsSpo2')?.value || '',
                pain: document.getElementById('transferVitalsPain')?.value || ''
            };

            // Electronic Signature for Sending Nurse
            if (payload.sending_nurse_name) {
                payload.sending_nurse_signature = `ELECTRONICALLY_SIGNED_BY_${payload.sending_nurse_name.toUpperCase().replace(/\s+/g, '_')}`;
            }

            // Bedside Co-Sign Verification
            const isCosigning = document.getElementById('transferBedsideCosignToggle')?.checked;
            if (isCosigning && payload.receiving_nurse_name) {
                payload.receiving_nurse_signature = `ELECTRONICALLY_SIGNED_BY_${payload.receiving_nurse_name.toUpperCase().replace(/\s+/g, '_')}`;
            } else {
                delete payload.receiving_nurse_name;
                delete payload.receiving_acceptance_notes;
                delete payload.receiving_nurse_signature;
            }

            try {
                const res = await transferPatient(payload);
                if (res && res.success) {
                    const msg = isCosigning && payload.receiving_nurse_signature
                        ? 'Dual-signed transfer completed and accepted at bedside!'
                        : 'Patient transfer initiated with SBAR handover! Pending receiving nurse acceptance.';
                    showToast(msg, 'success');
                    document.getElementById('modalTransferPatient')?.classList.remove('open');
                    formTransfer.reset();
                    const cosignSec = document.getElementById('transferBedsideCosignSection');
                    if (cosignSec) cosignSec.style.display = 'none';
                    await fetchWhiteboard();
                } else {
                    showToast('Transfer failed: ' + (res?.message || 'Unknown error'), 'error');
                }
            } catch (err) {
                showToast('Transfer error: ' + (err.message || 'Server error'), 'error');
            }
        };
    }

    // 3. Form Discharge Patient & Clinical Discharge Summary
    const formDischarge = document.getElementById('formDischargePatient');
    if (formDischarge) {
        // Direct Print / Export PDF Action
        document.getElementById('btnPrintDischargeSummaryPdf')?.addEventListener('click', () => {
            const admId = document.getElementById('dischargeAdmissionId')?.value;
            if (admId) {
                window.open(getDischargeSummaryPrintUrl(admId), '_blank');
            } else {
                showToast('No active admission selected.', 'error');
            }
        });

        // Save Draft Action
        document.getElementById('btnSaveDischargeDraft')?.addEventListener('click', async () => {
            const formData = new FormData(formDischarge);
            const payload = Object.fromEntries(formData.entries());

            try {
                const res = await saveDischargeSummaryDraft(payload);
                if (res && res.success) {
                    showToast('Discharge summary draft saved successfully.', 'success');
                    if (res.data?.summary_number) {
                        const docBox = document.getElementById('dischargeDocNumber');
                        if (docBox) docBox.textContent = res.data.summary_number;
                    }
                } else {
                    showToast('Draft save failed: ' + (res?.message || 'Failed to save draft'), 'error');
                }
            } catch (err) {
                showToast('Draft save error: ' + (err.message || 'Server error'), 'error');
            }
        });

        // Finalize Discharge Action
        formDischarge.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(formDischarge);
            const payload = Object.fromEntries(formData.entries());

            try {
                const res = await finalizeDischargeSummary(payload);
                if (res && res.success) {
                    showToast('Clinical discharge summary signed & finalized! Bed marked as Dirty / Turnover.', 'success');
                    document.getElementById('modalDischargePatient')?.classList.remove('open');
                    formDischarge.reset();
                    await fetchWhiteboard();

                    const admId = payload.admission_id;
                    if (admId) {
                        setTimeout(() => {
                            if (confirm('Discharge finalized! Would you like to view/print the official Clinical Discharge Summary PDF now?')) {
                                window.open(getDischargeSummaryPrintUrl(admId), '_blank');
                            }
                        }, 300);
                    }
                } else {
                    showToast('Discharge finalization failed: ' + (res?.message || 'Unknown error'), 'error');
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

    // 7. Form Accept Transfer Handover (Receiving Nurse Bedside Sign-Off)
    const formAcceptHandover = document.getElementById('formAcceptHandover');
    if (formAcceptHandover) {
        formAcceptHandover.onsubmit = async (e) => {
            e.preventDefault();
            const transferId = document.getElementById('acceptTransferId')?.value;
            const handoverStatus = document.getElementById('acceptHandoverStatus')?.value || 'Accepted';
            const receivingNurseName = document.getElementById('acceptReceivingNurseName')?.value;
            const receivingNotes = document.getElementById('acceptReceivingNotes')?.value || '';

            if (!transferId) {
                showToast('Invalid transfer record', 'error');
                return;
            }

            if (!receivingNurseName) {
                showToast('Please enter your full name & credentials to sign', 'error');
                return;
            }

            const payload = {
                transfer_id: transferId,
                handover_status: handoverStatus,
                receiving_nurse_name: receivingNurseName,
                receiving_nurse_signature: `ELECTRONICALLY_SIGNED_BY_${receivingNurseName.toUpperCase().replace(/\s+/g, '_')}`,
                receiving_acceptance_notes: receivingNotes
            };

            try {
                const res = await acceptTransferHandover(payload);
                if (res && res.success) {
                    showToast(handoverStatus === 'Accepted' ? 'Bedside handover accepted and dual-signed successfully!' : 'Transfer handover status updated.', 'success');
                    document.getElementById('modalAcceptTransferHandover')?.classList.remove('open');
                    formAcceptHandover.reset();
                    await fetchWhiteboard();
                } else {
                    showToast('Handover sign-off failed: ' + (res?.message || 'Unknown error'), 'error');
                }
            } catch (err) {
                showToast('Handover sign-off error: ' + (err.message || 'Server error'), 'error');
            }
        };
    }

    // 7. Form Daily Doctor Ward Round (inpatient_daily_rounds)
    const formRound = document.getElementById('formDailyWardRound');
    if (formRound) {
        formRound.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(formRound);
            const payload = Object.fromEntries(formData.entries());

            if (!payload.assessment || !payload.assessment.trim()) {
                showToast('Clinical Assessment is required.', 'error');
                return;
            }
            if (!payload.plan || !payload.plan.trim()) {
                showToast('Daily Treatment Plan is required.', 'error');
                return;
            }

            const isEdit = Boolean(payload.id && Number(payload.id) > 0);
            const submitBtn = document.getElementById('btnSubmitDailyRound');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = isEdit ? 'Updating Round...' : 'Saving Round...';
            }

            try {
                const res = isEdit ? await updateDailyRound(payload) : await saveDailyRound(payload);
                if (res && res.success) {
                    showToast(isEdit ? 'Ward round updated successfully!' : 'Daily ward round documented successfully!', 'success');
                    document.getElementById('modalDailyWardRound')?.classList.remove('open');
                    formRound.reset();
                    await fetchWhiteboard();
                } else {
                    showToast('Failed to save ward round: ' + (res?.message || 'Unknown error'), 'error');
                }
            } catch (err) {
                showToast('Error saving ward round: ' + (err.message || 'Server error'), 'error');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = '💾 Save Ward Round';
                }
            }
        };
    }

    // 8. Form Multidisciplinary Progress Note (inpatient_progress_notes)
    const formMpn = document.getElementById('formMultidisciplinaryNote');
    if (formMpn) {
        formMpn.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(formMpn);
            const payload = Object.fromEntries(formData.entries());

            if (!payload.plan || !payload.plan.trim()) {
                showToast('Intervention Treatment Plan & Goals are required.', 'error');
                return;
            }

            const isEdit = Boolean(payload.id && Number(payload.id) > 0);
            const submitBtn = document.getElementById('btnSubmitMpnForm');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = isEdit ? 'Updating Note...' : 'Saving Note...';
            }

            try {
                const res = isEdit ? await updateProgressNote(payload) : await saveProgressNote(payload);
                if (res && res.success) {
                    showToast(isEdit ? 'Progress note updated successfully!' : 'Allied health progress note documented successfully!', 'success');
                    resetMpnFormForNew();
                    const tabTimeline = document.getElementById('tabBtnMpnTimeline');
                    if (tabTimeline) tabTimeline.click();
                    if (payload.admission_id) {
                        await loadMultidisciplinaryTimeline(payload.admission_id, activeMpnDisciplineFilter);
                    }
                } else {
                    showToast('Failed to save progress note: ' + (res?.message || 'Unknown error'), 'error');
                }
            } catch (err) {
                showToast('Error saving progress note: ' + (err.message || 'Server error'), 'error');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = '💾 Save Progress Note';
                }
            }
        };
    }

    // 9. Form Structured Nursing Care Plan (inpatient_care_plans)
    const formNcp = document.getElementById('formNursingCarePlan');
    if (formNcp) {
        formNcp.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(formNcp);
            const payload = Object.fromEntries(formData.entries());

            if (!payload.nursing_diagnosis || !payload.nursing_diagnosis.trim()) {
                showToast('NANDA Nursing Diagnosis statement is required.', 'error');
                return;
            }
            if (!payload.measurable_goals || !payload.measurable_goals.trim()) {
                showToast('Measurable Patient Goals (NOC / SMART) are required.', 'error');
                return;
            }
            if (!payload.nursing_interventions || !payload.nursing_interventions.trim()) {
                showToast('Nursing Interventions (NIC) are required.', 'error');
                return;
            }

            const isEdit = Boolean(payload.id && Number(payload.id) > 0);
            const submitBtn = document.getElementById('btnSubmitNcpForm');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = isEdit ? 'Updating Care Plan...' : 'Saving Care Plan...';
            }

            try {
                const res = isEdit ? await updateCarePlan(payload) : await saveCarePlan(payload);
                if (res && res.success) {
                    showToast(isEdit ? 'Nursing care plan updated successfully!' : 'Structured NANDA nursing care plan documented!', 'success');
                    resetNcpFormForNew();
                    const tabList = document.getElementById('tabBtnNcpList');
                    if (tabList) tabList.click();
                    if (payload.admission_id) {
                        await loadNursingCarePlans(payload.admission_id, activeNcpEvalFilter);
                    }
                } else {
                    showToast('Failed to save care plan: ' + (res?.message || 'Unknown error'), 'error');
                }
            } catch (err) {
                showToast('Error saving care plan: ' + (err.message || 'Server error'), 'error');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = '💾 Save Nursing Care Plan';
                }
            }
        };
    }

    // 10. Form 24-Hour Fluid Balance (inpatient_fluid_balance)
    const formFbc = document.getElementById('formFluidBalance');
    if (formFbc) {
        formFbc.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(formFbc);
            const payload = Object.fromEntries(formData.entries());

            const inSum = (Number(payload.intake_oral_ml) || 0)
                + (Number(payload.intake_iv_ml) || 0)
                + (Number(payload.intake_blood_ml) || 0)
                + (Number(payload.intake_enteral_ml) || 0)
                + (Number(payload.intake_other_ml) || 0);

            const outSum = (Number(payload.output_urine_ml) || 0)
                + (Number(payload.output_drain_ml) || 0)
                + (Number(payload.output_emesis_ml) || 0)
                + (Number(payload.output_ng_ml) || 0)
                + (Number(payload.output_chest_tube_ml) || 0)
                + (Number(payload.output_stool_other_ml) || 0);

            if (inSum <= 0 && outSum <= 0) {
                showToast('Please enter at least one fluid Intake or Output volume (mL) greater than 0.', 'error');
                return;
            }

            const isEdit = Boolean(payload.id && Number(payload.id) > 0);
            const submitBtn = document.getElementById('btnSubmitFbcForm');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = isEdit ? 'Updating Entry...' : 'Saving Entry...';
            }

            try {
                const res = isEdit ? await updateFluidBalance(payload) : await saveFluidBalance(payload);
                if (res && res.success) {
                    const alertLvl = res.data?.balance_alert_level || '';
                    if (alertLvl && alertLvl !== 'Normal / Euvolemic') {
                        showToast(`Fluid I&O saved — ${alertLvl} (${res.data.running_24h_net_ml >= 0 ? '+' : ''}${res.data.running_24h_net_ml} mL/24h)`, 'warning');
                    } else {
                        showToast(isEdit ? 'Fluid balance entry updated!' : 'Fluid Intake & Output entry recorded!', 'success');
                    }
                    resetFbcFormForNew();
                    const tabChart = document.getElementById('tabBtnFbcChart');
                    if (tabChart) tabChart.click();
                    if (payload.admission_id) {
                        await loadFluidBalanceChart(payload.admission_id);
                    }
                } else {
                    showToast('Failed to save fluid balance: ' + (res?.message || 'Unknown error'), 'error');
                }
            } catch (err) {
                showToast('Error saving fluid balance: ' + (err.message || 'Server error'), 'error');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = '💾 Save Fluid I&O Entry';
                }
            }
        };
    }

    // 11. Form SBAR Nurse Shift Handover (nursing_shift_handovers)
    const formSbar = document.getElementById('formShiftHandover');
    if (formSbar) {
        formSbar.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(formSbar);
            const payload = Object.fromEntries(formData.entries());

            if (!payload.sbar_situation?.trim() || !payload.sbar_background?.trim() || !payload.sbar_assessment?.trim() || !payload.sbar_recommendation?.trim()) {
                showToast('Please complete all four SBAR sections (Situation, Background, Assessment, Recommendation).', 'error');
                return;
            }
            if (!payload.outgoing_nurse_name?.trim()) {
                showToast('Outgoing Nurse name and credentials are required for digital sign-off.', 'error');
                return;
            }

            // Collect checked bedside safety verification items
            const checkedSafety = [];
            formSbar.querySelectorAll('.sbar-safety-chk:checked').forEach(chk => {
                checkedSafety.push(chk.value);
            });
            payload.safety_checks = checkedSafety;

            const isEdit = Boolean(payload.id && Number(payload.id) > 0);
            const submitBtn = document.getElementById('btnSubmitSbarForm');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = isEdit ? 'Updating Handover...' : 'Signing & Saving Handover...';
            }

            try {
                const res = isEdit ? await updateShiftHandover(payload) : await saveShiftHandover(payload);
                if (res && res.success) {
                    const isDual = res.data?.handover_status === 'Dual-Signed / Completed';
                    showToast(
                        isDual
                            ? 'SBAR shift handover completed with Dual Digital Sign-Off (Outgoing & Incoming RN)!'
                            : 'SBAR shift handover signed by Outgoing RN — awaiting Incoming RN sign-off.',
                        'success'
                    );
                    resetSbarFormForNew();
                    const tabLog = document.getElementById('tabBtnSbarLog');
                    if (tabLog) tabLog.click();
                    if (payload.admission_id) {
                        await loadShiftHandovers(payload.admission_id, activeSbarStatusFilter);
                    }
                    await fetchWhiteboard(true);
                } else {
                    showToast('Failed to save shift handover: ' + (res?.message || 'Unknown error'), 'error');
                }
            } catch (err) {
                showToast('Error saving shift handover: ' + (err.message || 'Server error'), 'error');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = '✍️ Sign & Submit SBAR Shift Handover';
                }
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
    setVal('kpiPendingHandovers', kpis.pending_handovers_count || 0);

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
            const matchStr = `${b.bed_number} ${b.room_number} ${b.patient_name || ''} ${b.patient_mrn || ''} ${b.attending_physician || ''} ${b.admitting_diagnosis || ''} ${b.shift_nurse_name || ''} ${b.shift_cna_name || ''}`.toLowerCase();
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
                <div style="font-size: 32px; margin-bottom: 8px;">ðŸ›ï¸</div>
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
                        <span>ðŸ“ ${esc(ward.floor_location)}</span>
                        <span>ðŸ‘©â€âš•ï¸ Head Nurse: ${esc(ward.head_nurse || 'Charge Nurse On-Duty')}</span>
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
    let statusText = 'ðŸŸ¢ Available & Sanitized';

    if (bed.status === 'Occupied') {
        cardClass = 'bed-card-occupied';
        statusPillClass = 'status-pill-occupied';
        statusText = 'ðŸ”´ Occupied';
    } else if (bed.status === 'Pending Discharge') {
        cardClass = 'bed-card-pending-discharge';
        statusPillClass = 'status-pill-pending-discharge';
        statusText = 'ðŸŸ¡ Pending Discharge';
    } else if (bed.status === 'Dirty / Turnover') {
        cardClass = 'bed-card-dirty';
        statusPillClass = 'status-pill-dirty';
        statusText = 'ðŸŸ  Dirty / Turnover';
    } else if (bed.status === 'Maintenance' || bed.status === 'Blocked') {
        cardClass = 'bed-card-maintenance';
        statusPillClass = 'status-pill-maintenance';
        statusText = 'âš™ï¸ Maintenance';
    }

    let patientHtml = '';
    if (bed.status === 'Occupied' || bed.status === 'Pending Discharge') {
        let isoBadge = '';
        if (bed.isolation_precautions && bed.isolation_precautions !== 'Standard') {
            let isoClass = 'iso-contact';
            if (bed.isolation_precautions === 'Droplet') isoClass = 'iso-droplet';
            else if (bed.isolation_precautions === 'Airborne') isoClass = 'iso-airborne';
            else if (bed.isolation_precautions === 'Strict Protective Neutropenic') isoClass = 'iso-strict';

            isoBadge = `<div class="isolation-badge ${isoClass}">âš ï¸ ${esc(bed.isolation_precautions)}</div>`;
        }

        const formattedAdmDate = bed.admission_date ? bed.admission_date.substring(0, 16).replace('T', ' ') : '--';

        patientHtml = `
            <div class="bed-patient-info">
                <div class="bed-patient-name">
                    <a href="javascript:void(0)" class="patient-chart-link" data-mrn="${esc(bed.patient_mrn)}">
                        ðŸ‘¤ ${esc(bed.patient_name)}
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
                    <div class="bed-detail-row">
                        <span class="bed-detail-label">Nurse (shift):</span>
                        <span class="bed-detail-val">${bed.shift_nurse_name ? esc(bed.shift_nurse_name) : '<span style="color:#b45309;font-weight:600">Not assigned</span>'}</span>
                    </div>
                    <div class="bed-detail-row">
                        <span class="bed-detail-label">CNA (shift):</span>
                        <span class="bed-detail-val">${bed.shift_cna_name ? esc(bed.shift_cna_name) : '--'}</span>
                    </div>
                    ${bed.vitals_state ? `
                    <div class="bed-detail-row">
                        <span class="bed-detail-label">Vitals:</span>
                        <span class="bed-detail-val">${vitalsLabel(bed)}</span>
                    </div>` : ''}
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
                    ðŸ§¹ Turnover Cleaning Mandate
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
                    âš™ï¸ Out of Service Hold
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
                    âœ¨ Sanitized & Ready
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
                âž• Admit Patient
            </button>
        `;
    } else if (bed.status === 'Occupied') {
        actionsHtml = `
            <button class="bed-action-btn" style="background:#0284c7;color:#fff;border-color:#0284c7;font-weight:700" data-act="ward-round" data-adm-id="${bed.admission_id}" aria-label="Document daily doctor ward round">
                🩺 Doctor Round
            </button>
            <button class="bed-action-btn" style="background:#0d9488;color:#fff;border-color:#0d9488;font-weight:700" data-act="progress-notes" data-adm-id="${bed.admission_id}" aria-label="Multidisciplinary progress notes and treatment logs">
                🤝 Allied Notes
            </button>
            <button class="bed-action-btn" style="background:#4338ca;color:#fff;border-color:#4338ca;font-weight:700" data-act="care-plan" data-adm-id="${bed.admission_id}" aria-label="Structured NANDA nursing care plans">
                📋 Care Plan
            </button>
            <button class="bed-action-btn" style="background:#0369a1;color:#fff;border-color:#0369a1;font-weight:700" data-act="fluid-balance" data-adm-id="${bed.admission_id}" aria-label="24-hour fluid balance intake and output chart">
                💧 Fluid I&amp;O
            </button>
            <button class="bed-action-btn" style="background:#4f46e5;color:#fff;border-color:#4f46e5;font-weight:700" data-act="shift-handover" data-adm-id="${bed.admission_id}" aria-label="SBAR nurse shift handover with dual digital sign-off">
                🔁 SBAR Handover
            </button>
            <button class="bed-action-btn btn-act-transfer" data-act="transfer" data-adm-id="${bed.admission_id}">
                🔄 Transfer
            </button>
            <button class="bed-action-btn btn-act-pending" data-act="pending" data-adm-id="${bed.admission_id}">
                🟡 Pending DC
            </button>
            <button class="bed-action-btn btn-act-discharge" data-act="discharge" data-adm-id="${bed.admission_id}">
                🚪 Discharge
            </button>
            ${LAB_ORDER_ROLES.includes(getUser()?.role) ? `<button class="bed-action-btn" data-act="labs" data-adm-id="${bed.admission_id}" aria-label="Order lab tests for this patient">🧪 Labs</button>
            <button class="bed-action-btn" data-act="imaging" data-adm-id="${bed.admission_id}" aria-label="Order imaging for this patient">🩻 Imaging</button>` : ''}
            <button class="bed-action-btn" style="width:100%;justify-content:center;background:#1d4ed8;color:#fff;border-color:#1d4ed8;font-weight:800" data-act="codeblue" data-adm-id="${bed.admission_id}" aria-label="Call a Code Blue for this bed">
                Code Blue
            </button>
        `;
    } else if (bed.status === 'Pending Discharge') {
        actionsHtml = `
            <button class="bed-action-btn" style="background:#0284c7;color:#fff;border-color:#0284c7;font-weight:700" data-act="ward-round" data-adm-id="${bed.admission_id}" aria-label="Document daily doctor ward round">
                🩺 Doctor Round
            </button>
            <button class="bed-action-btn" style="background:#0d9488;color:#fff;border-color:#0d9488;font-weight:700" data-act="progress-notes" data-adm-id="${bed.admission_id}" aria-label="Multidisciplinary progress notes and treatment logs">
                🤝 Allied Notes
            </button>
            <button class="bed-action-btn" style="background:#4338ca;color:#fff;border-color:#4338ca;font-weight:700" data-act="care-plan" data-adm-id="${bed.admission_id}" aria-label="Structured NANDA nursing care plans">
                📋 Care Plan
            </button>
            <button class="bed-action-btn" style="background:#0369a1;color:#fff;border-color:#0369a1;font-weight:700" data-act="fluid-balance" data-adm-id="${bed.admission_id}" aria-label="24-hour fluid balance intake and output chart">
                💧 Fluid I&amp;O
            </button>
            <button class="bed-action-btn" style="background:#4f46e5;color:#fff;border-color:#4f46e5;font-weight:700" data-act="shift-handover" data-adm-id="${bed.admission_id}" aria-label="SBAR nurse shift handover with dual digital sign-off">
                🔁 SBAR Handover
            </button>
            <button class="bed-action-btn btn-act-discharge" style="width: 100%; justify-content: center; padding: 7px;" data-act="discharge" data-adm-id="${bed.admission_id}">
                🚪 Complete Discharge Orders
            </button>
            <button class="bed-action-btn" style="width:100%;justify-content:center;background:#1d4ed8;color:#fff;border-color:#1d4ed8;font-weight:800" data-act="codeblue" data-adm-id="${bed.admission_id}" aria-label="Call a Code Blue for this bed">
                Code Blue
            </button>
        `;
    } else if (bed.status === 'Dirty / Turnover') {
        actionsHtml = `
            <button class="bed-action-btn btn-act-sanitize" data-act="sanitize" data-bed-id="${bed.id}" data-bed-no="${esc(bed.bed_number)}">
                ðŸ§¹ Terminal Sanitize & Release Bed
            </button>
        `;
    } else {
        actionsHtml = `
            <button class="bed-action-btn btn-act-maint" style="width: 100%; justify-content: center; padding: 7px;" data-act="return-service" data-bed-id="${bed.id}">
                âœ… Return to Service
            </button>
        `;
    }

    return `
        <div class="inpatient-bed-card ${cardClass}" data-bed-id="${bed.id}">
            <div class="bed-card-top">
                <div class="bed-number-box">
                    <span class="bed-number">${esc(bed.bed_number)}</span>
                    <span class="bed-room">${esc(bed.room_number)} â€¢ ${esc(bed.bed_type)}</span>
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
                <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                    <button class="bed-action-btn" style="background:#0284c7;color:#fff;border-color:#0284c7;font-weight:700" data-act="ward-round" data-adm-id="${bed.admission_id}">🩺 Round</button>
                    <button class="bed-action-btn" style="background:#0d9488;color:#fff;border-color:#0d9488;font-weight:700" data-act="progress-notes" data-adm-id="${bed.admission_id}">🤝 Notes</button>
                    <button class="bed-action-btn" style="background:#4338ca;color:#fff;border-color:#4338ca;font-weight:700" data-act="care-plan" data-adm-id="${bed.admission_id}">📋 Care Plan</button>
                    <button class="bed-action-btn" style="background:#0369a1;color:#fff;border-color:#0369a1;font-weight:700" data-act="fluid-balance" data-adm-id="${bed.admission_id}">💧 Fluid I&amp;O</button>
                    <button class="bed-action-btn" style="background:#4f46e5;color:#fff;border-color:#4f46e5;font-weight:700" data-act="shift-handover" data-adm-id="${bed.admission_id}">🔁 SBAR</button>
                    <button class="bed-action-btn btn-act-transfer" data-act="transfer" data-adm-id="${bed.admission_id}">Transfer</button>
                    <button class="bed-action-btn btn-act-discharge" data-act="discharge" data-adm-id="${bed.admission_id}">Discharge</button>
                    ${LAB_ORDER_ROLES.includes(getUser()?.role) ? `<button class="bed-action-btn" data-act="labs" data-adm-id="${bed.admission_id}">Labs</button>
                    <button class="bed-action-btn" data-act="imaging" data-adm-id="${bed.admission_id}">Imaging</button>` : ''}
                    <button class="bed-action-btn" style="background:#1d4ed8;color:#fff;border-color:#1d4ed8;font-weight:800" data-act="codeblue" data-adm-id="${bed.admission_id}" aria-label="Call a Code Blue for this bed">Code Blue</button>
                </div>
            `;
        } else if (bed.status === 'Pending Discharge') {
            actionBtns = `<div style="display: flex; gap: 4px; flex-wrap: wrap;"><button class="bed-action-btn" style="background:#0284c7;color:#fff;border-color:#0284c7;font-weight:700" data-act="ward-round" data-adm-id="${bed.admission_id}">🩺 Round</button><button class="bed-action-btn" style="background:#0d9488;color:#fff;border-color:#0d9488;font-weight:700" data-act="progress-notes" data-adm-id="${bed.admission_id}">🤝 Notes</button><button class="bed-action-btn" style="background:#4338ca;color:#fff;border-color:#4338ca;font-weight:700" data-act="care-plan" data-adm-id="${bed.admission_id}">📋 Care Plan</button><button class="bed-action-btn" style="background:#0369a1;color:#fff;border-color:#0369a1;font-weight:700" data-act="fluid-balance" data-adm-id="${bed.admission_id}">💧 Fluid I&amp;O</button><button class="bed-action-btn" style="background:#4f46e5;color:#fff;border-color:#4f46e5;font-weight:700" data-act="shift-handover" data-adm-id="${bed.admission_id}">🔁 SBAR</button><button class="bed-action-btn btn-act-discharge" data-act="discharge" data-adm-id="${bed.admission_id}">Complete DC</button>
                <button class="bed-action-btn" style="background:#1d4ed8;color:#fff;border-color:#1d4ed8;font-weight:800" data-act="codeblue" data-adm-id="${bed.admission_id}" aria-label="Call a Code Blue for this bed">Code Blue</button></div>`;
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
                <td>${esc(bed.attending_physician || '--')}${bed.patient_name ? `<br><span style="font-size: 11px; color: #64748b;">RN: ${esc(bed.shift_nurse_name || 'not assigned')}${bed.shift_cna_name ? ` Â· CNA: ${esc(bed.shift_cna_name)}` : ''}</span>` : ''}${bed.vitals_state ? `<br><span style="font-size: 11px;">Vitals: ${vitalsLabel(bed)}</span>` : ''}</td>
                <td>${bed.admission_date ? `${bed.admission_date.substring(0, 10)} (${bed.los_days || 0}d)` : '--'}</td>
                <td>
                    ${bed.admitting_diagnosis ? esc(bed.admitting_diagnosis) : '--'}
                    ${bed.isolation_precautions && bed.isolation_precautions !== 'Standard' ? `<br><span style="font-size: 10px; color: #dc2626; font-weight: 700;">âš ï¸ ${esc(bed.isolation_precautions)}</span>` : ''}
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
    transfers.slice(0, 10).forEach(t => {
        const timeFormatted = t.transfer_time ? t.transfer_time.substring(11, 16) : '';
        const isPending = t.handover_status === 'Pending Acceptance';
        const isAccepted = t.handover_status === 'Accepted';

        let statusBadge = '';
        let actionButtons = '';

        if (isPending) {
            statusBadge = `<span style="font-size: 11px; padding: 2px 7px; border-radius: 4px; font-weight: 700; background: #fef3c7; color: #b45309; border: 1px solid #fde68a;">Pending Acceptance</span>`;
            actionButtons = `
                <button class="bed-action-btn btn-act-accept-handover" data-transfer-id="${t.id}" style="background: #10b981; color: #fff; border-color: #10b981; padding: 4px 8px;">ðŸ¤ Accept & Sign</button>
                <button class="bed-action-btn btn-act-view-handover" data-transfer-id="${t.id}" style="background: #e0e7ff; color: #4338ca; border-color: #c7d2fe; padding: 4px 8px;">ðŸ“œ SBAR</button>
            `;
        } else if (isAccepted) {
            statusBadge = `<span style="font-size: 11px; padding: 2px 7px; border-radius: 4px; font-weight: 700; background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0;">Dual Signed</span>`;
            actionButtons = `
                <button class="bed-action-btn btn-act-view-handover" data-transfer-id="${t.id}" style="background: #f1f5f9; color: #334155; border-color: #cbd5e1; padding: 4px 8px;">ðŸ“œ Certificate</button>
            `;
        } else if (t.handover_status === 'Rejected') {
            statusBadge = `<span style="font-size: 11px; padding: 2px 7px; border-radius: 4px; font-weight: 700; background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5;">Disputed</span>`;
            actionButtons = `
                <button class="bed-action-btn btn-act-view-handover" data-transfer-id="${t.id}" style="background: #f1f5f9; color: #334155; border-color: #cbd5e1; padding: 4px 8px;">ðŸ“œ Review</button>
            `;
        }

        html += `
            <div class="activity-item" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
                <div class="activity-icon icon-transfer" style="margin-right: 4px;">ðŸ”„</div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #0f172a; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <span>${esc(t.patient_name)} (${esc(t.patient_mrn || '')})</span>
                        <span>${esc(t.from_ward_name)} [${esc(t.from_bed_number)}] âž” ${esc(t.to_ward_name)} [${esc(t.to_bed_number)}]</span>
                        ${statusBadge}
                    </div>
                    <div style="font-size: 11.5px; color: #64748b; margin-top: 2px;">
                        Reason: ${esc(t.transfer_reason || 'Clinical transfer')} â€¢ Sending RN: ${esc(t.sending_nurse_name || t.transferred_by || 'Staff')}
                        ${t.receiving_nurse_name ? ` â€¢ Receiving RN: ${esc(t.receiving_nurse_name)}` : ''}
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="font-size: 11px; color: #94a3b8; font-family: monospace; margin-right: 4px;">${timeFormatted}</span>
                    ${actionButtons}
                </div>
            </div>
        `;
    });

    listEl.innerHTML = html;

    listEl.querySelectorAll('.btn-act-accept-handover').forEach(btn => {
        btn.onclick = () => {
            const transferId = btn.getAttribute('data-transfer-id');
            if (transferId) openAcceptHandoverModal(transferId);
        };
    });

    listEl.querySelectorAll('.btn-act-view-handover').forEach(btn => {
        btn.onclick = () => {
            const transferId = btn.getAttribute('data-transfer-id');
            if (transferId) openHandoverReportModal(transferId);
        };
    });
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
    container.querySelectorAll('[data-act="ward-round"]').forEach(btn => {
        btn.onclick = () => {
            const admId = btn.getAttribute('data-adm-id');
            openDailyWardRoundModal(admId);
        };
    });
    container.querySelectorAll('[data-act="progress-notes"]').forEach(btn => {
        btn.onclick = () => {
            const admId = btn.getAttribute('data-adm-id');
            openMultidisciplinaryNotesModal(admId);
        };
    });
    container.querySelectorAll('[data-act="care-plan"]').forEach(btn => {
        btn.onclick = () => {
            const admId = btn.getAttribute('data-adm-id');
            openNursingCarePlansModal(admId);
        };
    });
    container.querySelectorAll('[data-act="fluid-balance"]').forEach(btn => {
        btn.onclick = () => {
            const admId = btn.getAttribute('data-adm-id');
            openFluidBalanceModal(admId);
        };
    });
    container.querySelectorAll('[data-act="shift-handover"]').forEach(btn => {
        btn.onclick = () => {
            const admId = btn.getAttribute('data-adm-id');
            openShiftHandoverModal(admId);
        };
    });
    container.querySelectorAll('[data-act="codeblue"]').forEach(btn => {
        btn.addEventListener('click', () => {
            import('../code-blue/code-blue.js?v=6').then((m) => m.openCallCodeBlue({ admission_id: Number(btn.dataset.admId), from: 'census' }));
        });
    });
    container.querySelectorAll('[data-act="labs"]').forEach(btn => {
        btn.addEventListener('click', () => {
            import('../lab/lab-order.js?v=6').then((m) => m.openLabOrder({ admission_id: Number(btn.dataset.admId) }));
        });
    });
    container.querySelectorAll('[data-act="imaging"]').forEach(btn => {
        btn.addEventListener('click', () => {
            import('../radiology/rad-order.js?v=6').then((m) => m.openRadOrder({ admission_id: Number(btn.dataset.admId) }));
        });
    });
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
                opt.textContent = `${b.ward_name} (${b.ward_code}) â€” Room ${b.room_number}, Bed ${b.bed_number} [${b.bed_type}]`;
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
                opt.textContent = `${b.patient_name} (${b.patient_mrn || 'NO MRN'}) â€” Current: ${b.ward_code} ${b.bed_number}`;
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
                opt.textContent = `${b.ward_name} (${b.ward_code}) â€” Room ${b.room_number}, Bed ${b.bed_number} [${b.bed_type}]`;
                toBedSel.appendChild(opt);
            }
        });
    }

    // Pre-populate sending nurse name and timestamp
    const sendingNurseInput = document.getElementById('transferSendingNurseName');
    if (sendingNurseInput && (!sendingNurseInput.value || sendingNurseInput.value.trim() === '')) {
        const u = getUser() || currentUser;
        if (u?.name) {
            sendingNurseInput.value = u.name;
        }
    }
    const tsInput = document.getElementById('transferSendingNurseTimestamp');
    if (tsInput) {
        tsInput.value = systemNow().toLocaleString();
    }

    // Reset bedside co-sign section
    const cosignToggle = document.getElementById('transferBedsideCosignToggle');
    if (cosignToggle) cosignToggle.checked = false;
    const cosignSection = document.getElementById('transferBedsideCosignSection');
    if (cosignSection) cosignSection.style.display = 'none';

    modal.classList.add('open');
}

export async function openAcceptHandoverModal(transferId) {
    const modal = document.getElementById('modalAcceptTransferHandover');
    if (!modal) return;

    try {
        const res = await fetchTransferDetail(transferId);
        if (!res || !res.success || !res.data) {
            showToast('Unable to load transfer details: ' + (res?.message || 'Not found'), 'error');
            return;
        }

        const t = res.data;
        document.getElementById('acceptTransferId').value = t.id;

        const bannerEl = document.getElementById('acceptTransferBanner');
        if (bannerEl) {
            bannerEl.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div>
                        <span style="font-size: 15px; font-weight: 700; color: #0f172a;">${esc(t.patient_name)}</span>
                        <span style="font-size: 12px; color: #64748b; margin-left: 8px;">MRN: <strong>${esc(t.patient_mrn || '--')}</strong></span>
                    </div>
                    <span style="font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 700; background: ${t.handover_status === 'Accepted' ? '#dcfce7' : '#fef3c7'}; color: ${t.handover_status === 'Accepted' ? '#15803d' : '#b45309'}; border: 1px solid ${t.handover_status === 'Accepted' ? '#bbf7d0' : '#fde68a'};">
                        ${esc(t.handover_status)}
                    </span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; font-size: 12px;">
                    <div><strong>From:</strong> ${esc(t.from_ward_name)} [Bed ${esc(t.from_bed_number)}]</div>
                    <div><strong>To:</strong> ${esc(t.to_ward_name)} [Bed ${esc(t.to_bed_number)}]</div>
                    <div><strong>Transferred:</strong> ${esc(t.transfer_time || '--')}</div>
                    <div><strong>Sending Nurse:</strong> ${esc(t.sending_nurse_name || t.transferred_by || '--')}</div>
                </div>
            `;
        }

        document.getElementById('acceptSbarSituation').textContent = t.sbar_situation || 'No situation notes provided.';
        document.getElementById('acceptSbarBackground').textContent = t.sbar_background || 'No background notes provided.';
        document.getElementById('acceptSbarAssessment').textContent = t.sbar_assessment || 'No assessment notes provided.';
        document.getElementById('acceptSbarRecommendation').textContent = t.sbar_recommendation || 'No recommendations provided.';

        // Vitals
        const vitalsContainer = document.getElementById('acceptVitalsRow');
        if (vitalsContainer) {
            let vitals = t.vitals_at_transfer;
            if (typeof vitals === 'string') {
                try { vitals = JSON.parse(vitals); } catch (e) { vitals = null; }
            }
            if (vitals && Object.keys(vitals).length > 0) {
                vitalsContainer.innerHTML = `
                    <div style="font-weight: 600; color: #334155; margin-bottom: 4px;">Transfer Vital Signs:</div>
                    <div style="display: flex; gap: 12px; flex-wrap: wrap; background: #f8fafc; padding: 6px 10px; border-radius: 4px; border: 1px solid #e2e8f0; font-size: 11.5px;">
                        <div><strong>BP:</strong> ${esc(vitals.bp || '--')}</div>
                        <div><strong>HR:</strong> ${esc(vitals.hr || '--')} bpm</div>
                        <div><strong>RR:</strong> ${esc(vitals.rr || '--')} /min</div>
                        <div><strong>Temp:</strong> ${esc(vitals.temp || '--')} Â°C</div>
                        <div><strong>SpO2:</strong> ${esc(vitals.spo2 || '--')}%</div>
                        <div><strong>Pain:</strong> ${esc(vitals.pain || '--')}</div>
                    </div>
                `;
            } else {
                vitalsContainer.innerHTML = '';
            }
        }

        // Prefill nurse name if current user
        const nurseInput = document.getElementById('acceptReceivingNurseName');
        if (nurseInput && (!nurseInput.value || nurseInput.value.trim() === '')) {
            const u = getUser() || currentUser;
            if (u?.name) {
                nurseInput.value = u.name;
            }
        }

        // Reset checklist checkboxes
        ['chkAcceptIdBand', 'chkAcceptVitals', 'chkAcceptInfusions'].forEach(id => {
            const chk = document.getElementById(id);
            if (chk) chk.checked = true;
        });

        modal.classList.add('open');
    } catch (err) {
        showToast('Error opening handover: ' + (err.message || 'Unknown error'), 'error');
    }
}

export async function openHandoverReportModal(transferId) {
    const modal = document.getElementById('modalTransferHandoverReport');
    const container = document.getElementById('transferHandoverReportContent');
    if (!modal || !container) return;

    modal.classList.add('open');
    container.innerHTML = '<div style="text-align: center; padding: 40px; color: #64748b;">Loading handover record...</div>';

    try {
        const res = await fetchTransferDetail(transferId);
        if (!res || !res.success || !res.data) {
            container.innerHTML = '<div style="color: #ef4444; padding: 20px; text-align: center;">Failed to load handover details.</div>';
            return;
        }

        const t = res.data;
        let vitals = t.vitals_at_transfer;
        if (typeof vitals === 'string') {
            try { vitals = JSON.parse(vitals); } catch (e) { vitals = null; }
        }

        const isAccepted = t.handover_status === 'Accepted';
        const isPending = t.handover_status === 'Pending Acceptance';

        container.innerHTML = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #1e293b;">
                <!-- Hospital & Document Header -->
                <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end;">
                    <div>
                        <div style="font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">USINTELLIX HEALTH SYSTEM</div>
                        <div style="font-size: 13px; font-weight: 600; color: #475569;">INPATIENT CLINICAL TRANSFER &amp; NURSE HANDOVER CERTIFICATE</div>
                        <div style="font-size: 11px; color: #64748b;">JCAHO Standard NPSG.02.05.01 â€¢ Structured Bedside SBAR Protocol</div>
                    </div>
                    <div style="text-align: right;">
                        <span style="display: inline-block; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; ${isAccepted ? 'background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0;' : isPending ? 'background: #fef3c7; color: #b45309; border: 1px solid #fde68a;' : 'background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5;'}">
                            ${esc(t.handover_status)}
                        </span>
                        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Transfer ID: #${t.id}</div>
                    </div>
                </div>

                <!-- Patient & Transfer Overview Table -->
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
                    <tbody>
                        <tr style="background: #f8fafc;">
                            <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: 600; width: 20%;">Patient Name:</td>
                            <td style="padding: 8px 12px; border: 1px solid #cbd5e1; width: 30%; font-weight: 700; color: #0f172a;">${esc(t.patient_name)}</td>
                            <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: 600; width: 20%;">MRN / Patient ID:</td>
                            <td style="padding: 8px 12px; border: 1px solid #cbd5e1; width: 30%; font-family: monospace;">${esc(t.patient_mrn || '--')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: 600;">Departing Unit:</td>
                            <td style="padding: 8px 12px; border: 1px solid #cbd5e1;">${esc(t.from_ward_name)} [Bed ${esc(t.from_bed_number)}]</td>
                            <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: 600;">Destination Unit:</td>
                            <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: 600; color: #0369a1;">${esc(t.to_ward_name)} [Bed ${esc(t.to_bed_number)}]</td>
                        </tr>
                        <tr style="background: #f8fafc;">
                            <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: 600;">Transfer Time:</td>
                            <td style="padding: 8px 12px; border: 1px solid #cbd5e1;">${esc(t.transfer_time || '--')}</td>
                            <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: 600;">Transfer Reason:</td>
                            <td style="padding: 8px 12px; border: 1px solid #cbd5e1;">${esc(t.transfer_reason || '--')}</td>
                        </tr>
                    </tbody>
                </table>

                <!-- SBAR Structured Clinical Handover Box -->
                <div style="border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; margin-bottom: 16px;">
                    <div style="background: #f1f5f9; padding: 8px 14px; font-weight: 700; font-size: 13px; color: #0f172a; border-bottom: 1px solid #cbd5e1;">
                        Structured SBAR Clinical Handover Report
                    </div>
                    <div style="padding: 12px 14px; font-size: 13px; line-height: 1.5;">
                        <div style="margin-bottom: 10px;">
                            <strong style="color: #0369a1;">S â€” Situation:</strong>
                            <div style="margin-top: 2px; color: #334155;">${esc(t.sbar_situation || 'No situation provided.')}</div>
                        </div>
                        <div style="margin-bottom: 10px;">
                            <strong style="color: #0369a1;">B â€” Background:</strong>
                            <div style="margin-top: 2px; color: #334155;">${esc(t.sbar_background || 'No background provided.')}</div>
                        </div>
                        <div style="margin-bottom: 10px;">
                            <strong style="color: #0369a1;">A â€” Assessment &amp; Bedside Vitals:</strong>
                            <div style="margin-top: 2px; color: #334155;">${esc(t.sbar_assessment || 'No clinical assessment provided.')}</div>
                            ${vitals ? `
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(95px, 1fr)); gap: 6px; background: #f8fafc; padding: 8px; border-radius: 4px; border: 1px solid #e2e8f0; margin-top: 6px; font-size: 12px;">
                                    <div><span style="color:#64748b;">BP:</span> <strong>${esc(vitals.bp || '--')}</strong></div>
                                    <div><span style="color:#64748b;">HR:</span> <strong>${esc(vitals.hr || '--')}</strong></div>
                                    <div><span style="color:#64748b;">RR:</span> <strong>${esc(vitals.rr || '--')}</strong></div>
                                    <div><span style="color:#64748b;">Temp:</span> <strong>${esc(vitals.temp || '--')}Â°C</strong></div>
                                    <div><span style="color:#64748b;">SpO2:</span> <strong>${esc(vitals.spo2 || '--')}%</strong></div>
                                    <div><span style="color:#64748b;">Pain:</span> <strong>${esc(vitals.pain || '--')}</strong></div>
                                </div>
                            ` : ''}
                        </div>
                        <div>
                            <strong style="color: #0369a1;">R â€” Recommendation &amp; Next Actions:</strong>
                            <div style="margin-top: 2px; color: #334155;">${esc(t.sbar_recommendation || 'No recommendations provided.')}</div>
                        </div>
                    </div>
                </div>

                <!-- Dual Electronic Signatures Strip -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px;">
                    <!-- Sending Nurse Signature Box -->
                    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px;">
                        <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 6px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px;">
                            1. Sending Ward Handover Sign-off
                        </div>
                        <div style="font-size: 12.5px; margin-bottom: 4px;"><strong>Nurse:</strong> ${esc(t.sending_nurse_name || t.transferred_by || '--')}</div>
                        <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">Signed: ${esc(t.sending_nurse_signed_at || t.created_at || '--')}</div>
                        <div style="font-family: monospace; font-size: 10px; color: #059669; word-break: break-all; background: #ecfdf5; padding: 4px 6px; border-radius: 4px; border: 1px solid #a7f3d0;">
                            âœ“ ${esc(t.sending_nurse_signature || 'ELECTRONICALLY_SIGNED')}
                        </div>
                    </div>

                    <!-- Receiving Nurse Signature Box -->
                    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px;">
                        <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 6px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px;">
                            2. Receiving Ward Acceptance Sign-off
                        </div>
                        ${isAccepted ? `
                            <div style="font-size: 12.5px; margin-bottom: 4px;"><strong>Nurse:</strong> ${esc(t.receiving_nurse_name || '--')}</div>
                            <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">Signed: ${esc(t.receiving_nurse_signed_at || '--')}</div>
                            <div style="font-family: monospace; font-size: 10px; color: #059669; word-break: break-all; background: #ecfdf5; padding: 4px 6px; border-radius: 4px; border: 1px solid #a7f3d0; margin-bottom: 6px;">
                                âœ“ ${esc(t.receiving_nurse_signature || 'ELECTRONICALLY_SIGNED')}
                            </div>
                            ${t.receiving_acceptance_notes ? `<div style="font-size: 11.5px; color: #475569; font-style: italic;">"${esc(t.receiving_acceptance_notes)}"</div>` : ''}
                        ` : isPending ? `
                            <div style="text-align: center; padding: 16px 8px; color: #b45309;">
                                <div style="font-size: 13px; font-weight: 700;">â³ Awaiting Acceptance</div>
                                <div style="font-size: 11px; margin-top: 4px;">Receiving nurse bedside sign-off has not yet been executed.</div>
                            </div>
                        ` : `
                            <div style="text-align: center; padding: 16px 8px; color: #b91c1c;">
                                <div style="font-size: 13px; font-weight: 700;">âŒ Disputed / Rejected</div>
                                <div style="font-size: 11.5px; margin-top: 4px;">${esc(t.receiving_acceptance_notes || 'Handover rejected.')}</div>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<div style="color: #ef4444; padding: 20px; text-align: center;">Error loading handover details: ${esc(err.message)}</div>`;
    }
}

async function openDischargeModal(admissionId) {
    const modal = document.getElementById('modalDischargePatient');
    if (!modal) return;

    const bed = currentCensusData.beds.find(b => b.admission_id == admissionId);
    if (!bed) return;

    document.getElementById('dischargeAdmissionId').value = admissionId;
    document.getElementById('dischargePatientName').textContent = bed.patient_name;
    document.getElementById('dischargeAdmissionNo').textContent = bed.admission_number || '--';
    document.getElementById('dischargeBedNo').textContent = `${bed.ward_code} - ${bed.bed_number}`;
    document.getElementById('dischargeLos').textContent = `${bed.los_days || 0} days`;

    setupDefaultDates();
    modal.classList.add('open');

    const docBox = document.getElementById('dischargeDocNumber');
    if (docBox) docBox.textContent = 'Loading...';
    const statusBadge = document.getElementById('dischargeSummaryStatusBadge');
    if (statusBadge) {
        statusBadge.textContent = 'Loading...';
        statusBadge.style.background = '#e2e8f0';
        statusBadge.style.color = '#475569';
    }

    try {
        const res = await fetchDischargeSummary(admissionId);
        if (res && res.success && res.data?.summary) {
            const s = res.data.summary;
            if (docBox) docBox.textContent = s.summary_number || 'New Draft';
            
            if (statusBadge) {
                if (s.is_finalized) {
                    statusBadge.textContent = 'Finalized & Electronically Signed';
                    statusBadge.style.background = '#dcfce7';
                    statusBadge.style.color = '#15803d';
                } else {
                    statusBadge.textContent = 'Draft In-Progress';
                    statusBadge.style.background = '#fef3c7';
                    statusBadge.style.color = '#b45309';
                }
            }

            const setVal = (id, val) => {
                const el = document.getElementById(id);
                if (el && val !== undefined && val !== null) el.value = val;
            };

            setVal('dischargeDateInput', s.discharge_date ? s.discharge_date.replace(' ', 'T').substring(0, 16) : '');
            setVal('dischargeConditionSelect', s.discharge_condition || 'Improved');
            setVal('dischargeDispositionSelect', s.discharge_disposition || 'Discharged Home with Self-Care');
            setVal('dischargeAdmittingDiagnosis', s.admitting_diagnosis || bed.admitting_diagnosis || '');
            setVal('dischargeFinalDiagnosis', s.discharge_diagnosis || bed.admitting_diagnosis || '');
            setVal('dischargeHospitalCourse', s.hospital_course_summary || '');
            setVal('dischargeProcedures', s.significant_procedures || 'None performed.');
            setVal('dischargeMedications', s.discharge_medications || '');
            setVal('dischargeDietInstructions', s.diet_instructions || 'Regular as tolerated');
            setVal('dischargeActivityRestrictions', s.activity_restrictions || 'Ambulation as tolerated');
            setVal('dischargeFollowUpInstructions', s.follow_up_instructions || '');
            setVal('dischargePhysicianName', s.attending_physician_name || bed.attending_physician || '');
            setVal('dischargePhysicianLicense', s.physician_license_number || '');

            const stampEl = document.getElementById('dischargeSignatureStamp');
            if (stampEl) {
                if (s.electronic_signature) {
                    stampEl.textContent = s.electronic_signature;
                    stampEl.style.color = '#059669';
                } else {
                    stampEl.textContent = 'Signature status: Pending electronic certification on finalization.';
                    stampEl.style.color = '#475569';
                }
            }
        }
    } catch (err) {
        console.debug('Error pre-populating discharge summary:', err);
    }
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

/** Census: vital-signs due status (icon + words, never color alone). */
function vitalsLabel(bed) {
    const t = String(bed.vitals_next_due || '').slice(11, 16);
    const map = {
        overdue: ['#b91c1c', 'â° Overdue'],
        due: ['#b45309', 'â— Due now'],
        due_soon: ['inherit', `â—” Due ${t}`],
        ok: ['#15803d', `âœ“ Next ${t}`],
    };
    const [color, label] = map[bed.vitals_state] || map.ok;
    const news = bed.news2_score == null ? '' : bed.news2_risk === 'high' ? ` <span style="background:#dc2626;color:#fff;border-radius:8px;padding:0 6px;font-weight:700">âš  NEWS2 ${bed.news2_score}</span>`
        : ['medium', 'low_medium'].includes(bed.news2_risk) ? ` <span style="color:#c2410c;font-weight:700">â–² NEWS2 ${bed.news2_score}</span>` : ` <span style="color:#64748b">NEWS2 ${bed.news2_score}</span>`;
    return `<span style="font-weight:700;color:${color}">${label}</span>${news}${bed.vitals_every_hours ? ` <span style="color:#64748b;font-weight:400">(every ${bed.vitals_every_hours} h)</span>` : ''}`;
}


/**
 * Daily Doctor Ward Rounds (inpatient_daily_rounds)
 */
let currentRoundsAdmissionId = null;

async function openDailyWardRoundModal(admissionId) {
    const modal = document.getElementById('modalDailyWardRound');
    if (!modal) return;

    const bed = (currentCensusData.beds || []).find(b => b.admission_id == admissionId);
    if (!bed) {
        showToast('Inpatient admission data not found', 'error');
        return;
    }

    currentRoundsAdmissionId = admissionId;

    // Reset Form
    const form = document.getElementById('formDailyWardRound');
    if (form) form.reset();

    // Populate Banner Info
    document.getElementById('roundAdmissionId').value = admissionId;
    document.getElementById('roundPatientId').value = bed.patient_id || '';
    document.getElementById('roundRecordId').value = '';
    document.getElementById('roundPatientName').textContent = bed.patient_name || 'Patient';
    document.getElementById('roundPatientMrn').textContent = bed.patient_mrn || bed.patient_id || '--';
    document.getElementById('roundPatientAgeGender').textContent = `${bed.patient_age ? bed.patient_age + 'y' : '--'} / ${bed.patient_gender || bed.gender || '--'}`;
    document.getElementById('roundBedNo').textContent = `${bed.ward_code || ''} - ${bed.bed_number || '--'}`;
    document.getElementById('roundLos').textContent = `${bed.los_days != null ? bed.los_days : 0} days`;
    document.getElementById('roundAdmittingDiag').textContent = bed.admitting_diagnosis || 'Under Observation';
    document.getElementById('roundAttendingPhysician').textContent = bed.attending_physician || 'Attending Physician';
    document.getElementById('dailyRoundNumberBadge').textContent = 'New Round';

    // Set Default Round DateTime to now
    const nowIso = systemNow ? systemNow().slice(0, 16) : new Date().toISOString().slice(0, 16);
    document.getElementById('roundDateTimeInput').value = nowIso;

    // Prefill Physician Name
    const u = currentUser || getUser();
    const docName = (u?.first_name || u?.last_name) ? `Dr. ${((u.first_name || '') + ' ' + (u.last_name || '')).trim()}` : (bed.attending_physician || '');
    document.getElementById('roundPhysicianNameInput').value = docName;

    // Prefill Target Discharge Date if available
    if (bed.expected_discharge_date) {
        document.getElementById('roundTargetDischargeInput').value = bed.expected_discharge_date.slice(0, 10);
    } else {
        document.getElementById('roundTargetDischargeInput').value = '';
    }

    // Reset Trajectory buttons to Stable
    selectTrajectoryButton('Stable');

    // Default to Tab 1
    const tab1 = document.getElementById('tabBtnNewRound');
    if (tab1) tab1.click();

    // Open Modal
    modal.classList.add('open');

    // Load Previous Rounds
    await loadDailyRoundHistory(admissionId);
}

function selectTrajectoryButton(val) {
    const trajectoryButtonGroup = document.getElementById('roundTrajectoryButtonGroup');
    if (!trajectoryButtonGroup) return;

    const input = document.getElementById('roundTrajectoryInput');
    if (input) input.value = val;

    const trajectoryDescriptions = {
        'Critical': 'Unstable vital signs or organ failure risk; intensive monitoring required.',
        'Guarded': 'Serious condition; high risk of acute complication or clinical change.',
        'Stable': 'Vital signs stable, acute symptoms controlled, progressing on regimen.',
        'Improving': 'Clear objective clinical recovery, positive response to inpatient treatment.',
        'Discharge Ready': 'Clinical discharge criteria achieved; pending final discharge processing.'
    };
    const trajectoryColors = {
        'Critical': { border: '#dc2626', bg: '#fee2e2', text: '#991b1b' },
        'Guarded': { border: '#ea580c', bg: '#ffedd5', text: '#9a3412' },
        'Stable': { border: '#ca8a04', bg: '#fef9c3', text: '#854d0e' },
        'Improving': { border: '#16a34a', bg: '#dcfce7', text: '#166534' },
        'Discharge Ready': { border: '#0284c7', bg: '#e0f2fe', text: '#075985' }
    };

    trajectoryButtonGroup.querySelectorAll('.trajectory-btn').forEach(btn => {
        const bVal = btn.getAttribute('data-val');
        if (bVal === val) {
            const cfg = trajectoryColors[val] || { border: '#2563eb', bg: '#eff6ff', text: '#1d4ed8' };
            btn.classList.add('active-trajectory');
            btn.style.border = `2px solid ${cfg.border}`;
            btn.style.background = cfg.bg;
            btn.style.color = cfg.text;
        } else {
            btn.classList.remove('active-trajectory');
            btn.style.border = '2px solid #e2e8f0';
            btn.style.background = '#fff';
            const defaultTextColors = {
                'Critical': '#dc2626',
                'Guarded': '#ea580c',
                'Stable': '#ca8a04',
                'Improving': '#16a34a',
                'Discharge Ready': '#0284c7'
            };
            btn.style.color = defaultTextColors[bVal] || '#475569';
        }
    });

    const descBox = document.getElementById('roundTrajectoryDesc');
    if (descBox) {
        descBox.textContent = trajectoryDescriptions[val] || '';
    }
}

async function loadDailyRoundHistory(admissionId) {
    const listEl = document.getElementById('dailyRoundHistoryList');
    const countEl = document.getElementById('roundHistoryCount');
    if (!listEl) return;

    listEl.innerHTML = '<div style="text-align: center; color: #64748b; padding: 20px;">⏳ Loading daily round history...</div>';

    try {
        const res = await fetchDailyRounds(admissionId);
        const rounds = (res && res.success && res.data?.rounds) ? res.data.rounds : [];
        if (countEl) countEl.textContent = rounds.length;

        if (rounds.length === 0) {
            listEl.innerHTML = `
                <div style="text-align: center; padding: 32px 16px; color: #64748b; background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1;">
                    <div style="font-size: 28px; margin-bottom: 8px;">📋</div>
                    <div style="font-weight: 600; font-size: 14px; color: #334155;">No Previous Daily Rounds Documented</div>
                    <div style="font-size: 12px; margin-top: 4px;">Use the "Document Today\'s Round" tab to record the initial doctor ward round for this admission.</div>
                </div>
            `;
            return;
        }

        const trajectoryBadges = {
            'Critical': '<span style="background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 12px; font-weight: 700; font-size: 11px;">🔴 Critical</span>',
            'Guarded': '<span style="background: #ffedd5; color: #9a3412; padding: 2px 8px; border-radius: 12px; font-weight: 700; font-size: 11px;">🟠 Guarded</span>',
            'Stable': '<span style="background: #fef9c3; color: #854d0e; padding: 2px 8px; border-radius: 12px; font-weight: 700; font-size: 11px;">🟡 Stable</span>',
            'Improving': '<span style="background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 12px; font-weight: 700; font-size: 11px;">🟢 Improving</span>',
            'Discharge Ready': '<span style="background: #e0f2fe; color: #075985; padding: 2px 8px; border-radius: 12px; font-weight: 700; font-size: 11px;">🔵 Discharge Ready</span>'
        };

        let html = '<div style="display: flex; flex-direction: column; gap: 14px;">';
        rounds.forEach((rnd) => {
            const dt = rnd.round_datetime ? new Date(rnd.round_datetime).toLocaleString() : '--';
            const badge = trajectoryBadges[rnd.clinical_trajectory] || `<span style="background:#e2e8f0;padding:2px 8px;border-radius:12px;font-size:11px;">${esc(rnd.clinical_trajectory)}</span>`;

            html += `
                <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 12px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-weight: 700; color: #0f172a; font-size: 14px;">#${esc(rnd.round_number || `RND-${rnd.id}`)}</span>
                            ${badge}
                            <span style="font-size: 12px; color: #64748b;">🕒 ${esc(dt)}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 12px; font-weight: 600; color: #334155;">👨‍⚕️ ${esc(rnd.rounding_physician_name || 'Physician')}</span>
                            <button type="button" class="btn-inpatient btn-inpatient-secondary btn-edit-round" data-round-id="${rnd.id}" style="padding: 3px 8px; font-size: 11px;">✏️ Edit</button>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; font-size: 12px;">
                        <div style="background: #f8fafc; padding: 8px 12px; border-radius: 6px;">
                            <strong style="color: #475569;">Diet:</strong> ${esc(rnd.diet_order || 'Regular Diet')}
                        </div>
                        <div style="background: #f8fafc; padding: 8px 12px; border-radius: 6px;">
                            <strong style="color: #475569;">Activity:</strong> ${esc(rnd.activity_order || 'Ambulate as tolerated')}
                        </div>
                    </div>

                    ${rnd.subjective ? `
                        <div style="margin-bottom: 8px; font-size: 12px;">
                            <strong style="color: #334155;">🗣️ Subjective:</strong>
                            <div style="color: #475569; margin-top: 2px; white-space: pre-line; background: #fafafa; padding: 6px 10px; border-radius: 4px;">${esc(rnd.subjective)}</div>
                        </div>
                    ` : ''}

                    ${rnd.objective ? `
                        <div style="margin-bottom: 8px; font-size: 12px;">
                            <strong style="color: #334155;">🔬 Objective / Physical Exam:</strong>
                            <div style="color: #475569; margin-top: 2px; white-space: pre-line; background: #fafafa; padding: 6px 10px; border-radius: 4px;">${esc(rnd.objective)}</div>
                        </div>
                    ` : ''}

                    <div style="margin-bottom: 8px; font-size: 12px;">
                        <strong style="color: #1e293b;">🧠 Assessment:</strong>
                        <div style="color: #0f172a; font-weight: 500; margin-top: 2px; white-space: pre-line; background: #f0fdf4; border-left: 3px solid #22c55e; padding: 6px 10px; border-radius: 0 4px 4px 0;">${esc(rnd.assessment)}</div>
                    </div>

                    <div style="font-size: 12px;">
                        <strong style="color: #1e293b;">📋 Daily Treatment Plan:</strong>
                        <div style="color: #0f172a; margin-top: 2px; white-space: pre-line; background: #eff6ff; border-left: 3px solid #3b82f6; padding: 6px 10px; border-radius: 0 4px 4px 0;">${esc(rnd.plan)}</div>
                    </div>

                    ${rnd.target_discharge_date ? `
                        <div style="margin-top: 8px; font-size: 11px; color: #64748b; text-align: right;">
                            🎯 Target Discharge Date: <strong style="color: #0f172a;">${esc(rnd.target_discharge_date)}</strong>
                        </div>
                    ` : ''}
                </div>
            `;
        });
        html += '</div>';

        listEl.innerHTML = html;

        // Wire Edit buttons
        listEl.querySelectorAll('.btn-edit-round').forEach(btn => {
            btn.onclick = () => {
                const rId = btn.getAttribute('data-round-id');
                const targetRound = rounds.find(r => r.id == rId);
                if (targetRound) {
                    populateRoundForEdit(targetRound);
                }
            };
        });

    } catch (err) {
        listEl.innerHTML = `<div style="color: #ef4444; padding: 20px; text-align: center;">Error loading rounds history: ${esc(err.message)}</div>`;
    }
}

function populateRoundForEdit(rnd) {
    document.getElementById('roundRecordId').value = rnd.id;
    document.getElementById('dailyRoundNumberBadge').textContent = rnd.round_number ? `Edit ${rnd.round_number}` : `Edit Round #${rnd.id}`;

    if (rnd.round_datetime) {
        document.getElementById('roundDateTimeInput').value = rnd.round_datetime.replace(' ', 'T').slice(0, 16);
    }
    if (rnd.rounding_physician_name) {
        document.getElementById('roundPhysicianNameInput').value = rnd.rounding_physician_name;
    }
    if (rnd.target_discharge_date) {
        document.getElementById('roundTargetDischargeInput').value = rnd.target_discharge_date.slice(0, 10);
    }
    if (rnd.diet_order) {
        document.getElementById('roundDietSelect').value = rnd.diet_order;
    }
    if (rnd.activity_order) {
        document.getElementById('roundActivitySelect').value = rnd.activity_order;
    }
    document.getElementById('roundSubjectiveInput').value = rnd.subjective || '';
    document.getElementById('roundObjectiveInput').value = rnd.objective || '';
    document.getElementById('roundAssessmentInput').value = rnd.assessment || '';
    document.getElementById('roundPlanInput').value = rnd.plan || '';

    selectTrajectoryButton(rnd.clinical_trajectory || 'Stable');

    // Switch to Document tab
    const tab1 = document.getElementById('tabBtnNewRound');
    if (tab1) tab1.click();
}



/**
 * Multidisciplinary Progress Notes & Treatment Logs (inpatient_progress_notes)
 */
let currentMpnAdmissionId = null;
let activeMpnDisciplineFilter = 'all';

const MPN_DISCIPLINE_META = {
    'Physical Therapy': { icon: '🏃', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', short: 'PT' },
    'Occupational Therapy': { icon: '🖐️', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', short: 'OT' },
    'Clinical Nutrition': { icon: '🥗', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', short: 'RD' },
    'Clinical Pharmacy': { icon: '💊', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', short: 'PharmD' },
    'Medical Social Work': { icon: '🤝', color: '#d97706', bg: '#fffbeb', border: '#fde68a', short: 'SW' },
    'Respiratory Therapy': { icon: '🫁', color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe', short: 'RT' },
    'Speech-Language Pathology': { icon: '🗣️', color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8', short: 'SLP' },
    'Wound Care': { icon: '🩹', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', short: 'WOCN' },
    'General Allied Health': { icon: '📋', color: '#475569', bg: '#f8fafc', border: '#e2e8f0', short: 'AHP' }
};

async function openMultidisciplinaryNotesModal(admissionId) {
    const modal = document.getElementById('modalMultidisciplinaryNotes');
    if (!modal) return;

    const bed = (currentCensusData.beds || []).find(b => b.admission_id == admissionId);
    if (!bed) {
        showToast('Inpatient admission data not found', 'error');
        return;
    }

    currentMpnAdmissionId = admissionId;
    activeMpnDisciplineFilter = 'all';

    // Populate Patient Demographic Banner
    document.getElementById('mpnPatientName').textContent = bed.patient_name || 'Patient';
    document.getElementById('mpnPatientMrn').textContent = bed.patient_mrn || bed.patient_id || '--';
    document.getElementById('mpnPatientAgeGender').textContent = `${bed.patient_age ? bed.patient_age + 'y' : '--'} / ${bed.patient_gender || bed.gender || '--'}`;
    document.getElementById('mpnBedNo').textContent = `${bed.ward_code || ''} - ${bed.bed_number || '--'}`;
    document.getElementById('mpnLos').textContent = `${bed.los_days != null ? bed.los_days : 0} days`;
    document.getElementById('mpnAdmittingDiag').textContent = bed.admitting_diagnosis || 'Under Observation';
    document.getElementById('mpnAttendingPhysician').textContent = bed.attending_physician || 'Attending Physician';

    // Reset filter chips to 'all'
    const filterBar = document.getElementById('mpnDisciplineFilterBar');
    if (filterBar) {
        filterBar.querySelectorAll('.mpn-filter-chip').forEach(c => {
            const isAll = c.getAttribute('data-discipline') === 'all';
            c.classList.toggle('active-chip', isAll);
            c.style.border = isAll ? '1px solid #0d9488' : '1px solid #cbd5e1';
            c.style.background = isAll ? '#0d9488' : '#fff';
            c.style.color = isAll ? '#fff' : '#1e293b';
        });
    }

    // Prepare New Note Form defaults
    resetMpnFormForNew(bed);

    // Default to Timeline Tab
    const tabTimeline = document.getElementById('tabBtnMpnTimeline');
    if (tabTimeline) tabTimeline.click();

    modal.classList.add('open');

    await loadMultidisciplinaryTimeline(admissionId, 'all');
}

function resetMpnFormForNew(bed = null) {
    const form = document.getElementById('formMultidisciplinaryNote');
    if (form) form.reset();

    if (!bed && currentMpnAdmissionId) {
        bed = (currentCensusData.beds || []).find(b => b.admission_id == currentMpnAdmissionId);
    }

    const admInput = document.getElementById('mpnFormAdmissionId');
    if (admInput) admInput.value = currentMpnAdmissionId || '';

    const patInput = document.getElementById('mpnFormPatientId');
    if (patInput) patInput.value = bed?.patient_id || '';

    const recInput = document.getElementById('mpnFormRecordId');
    if (recInput) recInput.value = '';

    const nowIso = systemNow ? systemNow().slice(0, 16) : new Date().toISOString().slice(0, 16);
    const dtInput = document.getElementById('mpnFormDateTime');
    if (dtInput) dtInput.value = nowIso;

    const u = currentUser || getUser();
    const provName = (u?.first_name || u?.last_name)
        ? `${(u.first_name || '')} ${(u.last_name || '')}`.trim()
        : (u?.username || '');
    const provInput = document.getElementById('mpnFormProviderName');
    if (provInput) provInput.value = provName;

    const roleInput = document.getElementById('mpnFormProviderRole');
    if (roleInput) roleInput.value = 'Physical Therapist (DPT)';

    const submitBtn = document.getElementById('btnSubmitMpnForm');
    if (submitBtn) submitBtn.textContent = '💾 Save Progress Note';
}

async function loadMultidisciplinaryTimeline(admissionId, discipline = 'all') {
    const container = document.getElementById('mpnTimelineContainer');
    const badge = document.getElementById('mpnTotalBadge');
    if (!container) return;

    container.innerHTML = '<div style="text-align: center; color: #64748b; padding: 30px;">⏳ Loading multidisciplinary clinical timeline...</div>';

    try {
        const res = await fetchProgressNotes(admissionId, discipline);
        const notes = (res && res.success && res.data?.notes) ? res.data.notes : [];
        if (badge) badge.textContent = `${notes.length} ${notes.length === 1 ? 'Note' : 'Notes'}`;

        if (notes.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; background: #fff; border-radius: 10px; border: 1px dashed #cbd5e1; color: #64748b;">
                    <div style="font-size: 32px; margin-bottom: 10px;">🤝</div>
                    <div style="font-weight: 700; font-size: 15px; color: #1e293b;">No Multidisciplinary Interventions Logged${discipline && discipline !== 'all' ? ` for ${esc(discipline)}` : ''}</div>
                    <div style="font-size: 12.5px; margin-top: 6px; max-width: 460px; margin-left: auto; margin-right: auto;">
                        Allied health professionals (Physical Therapy, Nutrition, Pharmacy, Social Work, Respiratory Therapy) can log their assessments and daily interventions here.
                    </div>
                </div>
            `;
            return;
        }

        const u = currentUser || getUser();
        const canCosign = ['admin', 'doctor', 'clinician'].includes(u?.role);

        let html = '<div style="position: relative; padding-left: 26px; border-left: 3px solid #cbd5e1; margin-left: 10px; display: flex; flex-direction: column; gap: 18px;">';

        notes.forEach(note => {
            const meta = MPN_DISCIPLINE_META[note.discipline] || MPN_DISCIPLINE_META['General Allied Health'];
            const dt = note.note_datetime ? new Date(note.note_datetime).toLocaleString() : '--';
            const isCosigned = Number(note.is_cosigned) === 1;

            html += `
                <div style="position: relative; background: #fff; border: 1px solid ${meta.border}; border-radius: 10px; padding: 16px 18px; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
                    <!-- Timeline Node Dot -->
                    <div style="position: absolute; left: -37px; top: 18px; width: 18px; height: 18px; border-radius: 50%; background: ${meta.color}; border: 3px solid #fff; box-shadow: 0 0 0 2px ${meta.border};"></div>

                    <!-- Top Header -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 12px;">
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <span style="background: ${meta.bg}; color: ${meta.color}; border: 1px solid ${meta.border}; padding: 3px 10px; border-radius: 14px; font-weight: 700; font-size: 12px;">
                                ${meta.icon} ${esc(note.discipline)}
                            </span>
                            <span style="background: #f1f5f9; color: #334155; padding: 3px 9px; border-radius: 6px; font-weight: 600; font-size: 11px;">
                                ${esc(note.note_type || 'Daily Intervention')}
                            </span>
                            <span style="font-family: monospace; font-size: 11px; color: #64748b;">#${esc(note.note_number || `MPN-${note.id}`)}</span>
                            <span style="font-size: 12px; color: #64748b;">🕒 ${esc(dt)}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            ${isCosigned
                                ? `<span style="background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700;">✓ Cosigned by ${esc(note.cosigned_by_name || 'MD')}</span>`
                                : (canCosign ? `<button type="button" class="btn-inpatient btn-cosign-mpn" data-note-id="${note.id}" style="padding: 3px 8px; font-size: 11px; background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; cursor: pointer;">✒️ Cosign</button>` : '')
                            }
                            <button type="button" class="btn-inpatient btn-inpatient-secondary btn-edit-mpn" data-note-id="${note.id}" style="padding: 3px 8px; font-size: 11px;">✏️ Edit</button>
                            ${canCosign ? `<button type="button" class="btn-inpatient btn-delete-mpn" data-note-id="${note.id}" style="padding: 3px 8px; font-size: 11px; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; cursor: pointer;">🗑️</button>` : ''}
                        </div>
                    </div>

                    <!-- Provider Attribution -->
                    <div style="font-size: 12px; color: #475569; margin-bottom: 10px;">
                        👩‍⚕️ Documented by: <strong style="color: #0f172a;">${esc(note.provider_name)}</strong>
                        ${note.provider_role ? `<span style="color: #64748b;">(${esc(note.provider_role)})</span>` : ''}
                    </div>

                    <!-- Clinical Content Grid -->
                    <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12.5px;">
                        ${note.subjective ? `
                            <div>
                                <strong style="color: #334155;">🗣️ Subjective &amp; Tolerance:</strong>
                                <div style="color: #475569; margin-top: 2px; white-space: pre-line; background: #f8fafc; padding: 6px 10px; border-radius: 6px;">${esc(note.subjective)}</div>
                            </div>
                        ` : ''}

                        ${note.objective ? `
                            <div>
                                <strong style="color: #334155;">🔬 Objective Interventions &amp; Metrics:</strong>
                                <div style="color: #0f172a; margin-top: 2px; white-space: pre-line; background: #f8fafc; padding: 6px 10px; border-radius: 6px; border-left: 3px solid ${meta.color};">${esc(note.objective)}</div>
                            </div>
                        ` : ''}

                        ${note.assessment ? `
                            <div>
                                <strong style="color: #334155;">🧠 Clinical Assessment:</strong>
                                <div style="color: #334155; margin-top: 2px; white-space: pre-line; background: #f8fafc; padding: 6px 10px; border-radius: 6px;">${esc(note.assessment)}</div>
                            </div>
                        ` : ''}

                        <div>
                            <strong style="color: #0f172a;">📋 Treatment Plan &amp; Goals:</strong>
                            <div style="color: #0f172a; font-weight: 500; margin-top: 2px; white-space: pre-line; background: ${meta.bg}; border-left: 3px solid ${meta.color}; padding: 7px 10px; border-radius: 0 6px 6px 0;">${esc(note.plan)}</div>
                        </div>

                        ${note.recommendations ? `
                            <div style="margin-top: 4px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 8px 12px;">
                                <strong style="color: #b45309; font-size: 11.5px; text-transform: uppercase;">💡 Actionable Recommendation for Medical / Nursing Team:</strong>
                                <div style="color: #92400e; font-weight: 600; margin-top: 2px; white-space: pre-line;">${esc(note.recommendations)}</div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

        // Wire Edit buttons
        container.querySelectorAll('.btn-edit-mpn').forEach(btn => {
            btn.onclick = () => {
                const nId = btn.getAttribute('data-note-id');
                const target = notes.find(n => n.id == nId);
                if (target) populateProgressNoteForEdit(target);
            };
        });

        // Wire Cosign buttons
        container.querySelectorAll('.btn-cosign-mpn').forEach(btn => {
            btn.onclick = async () => {
                const nId = btn.getAttribute('data-note-id');
                try {
                    const cRes = await cosignProgressNote(nId);
                    if (cRes && cRes.success) {
                        showToast('Progress note cosigned!', 'success');
                        await loadMultidisciplinaryTimeline(admissionId, activeMpnDisciplineFilter);
                    } else {
                        showToast('Cosign failed: ' + (cRes?.message || 'Error'), 'error');
                    }
                } catch (err) {
                    showToast('Cosign error: ' + err.message, 'error');
                }
            };
        });

        // Wire Delete buttons
        container.querySelectorAll('.btn-delete-mpn').forEach(btn => {
            btn.onclick = async () => {
                const nId = btn.getAttribute('data-note-id');
                if (!confirm('Remove this multidisciplinary progress note from the timeline?')) return;
                try {
                    const dRes = await deleteProgressNote(nId);
                    if (dRes && dRes.success) {
                        showToast('Progress note removed', 'success');
                        await loadMultidisciplinaryTimeline(admissionId, activeMpnDisciplineFilter);
                    } else {
                        showToast('Delete failed: ' + (dRes?.message || 'Error'), 'error');
                    }
                } catch (err) {
                    showToast('Delete error: ' + err.message, 'error');
                }
            };
        });

    } catch (err) {
        container.innerHTML = `<div style="color: #ef4444; padding: 20px; text-align: center;">Error loading multidisciplinary timeline: ${esc(err.message)}</div>`;
    }
}

function populateProgressNoteForEdit(note) {
    document.getElementById('mpnFormRecordId').value = note.id;
    document.getElementById('mpnFormAdmissionId').value = note.admission_id;
    document.getElementById('mpnFormPatientId').value = note.patient_id || '';
    document.getElementById('mpnFormDiscipline').value = note.discipline || 'Physical Therapy';
    document.getElementById('mpnFormNoteType').value = note.note_type || 'Daily Treatment / Intervention';

    if (note.note_datetime) {
        document.getElementById('mpnFormDateTime').value = note.note_datetime.replace(' ', 'T').slice(0, 16);
    }
    document.getElementById('mpnFormProviderName').value = note.provider_name || '';
    document.getElementById('mpnFormProviderRole').value = note.provider_role || '';
    document.getElementById('mpnFormSubjective').value = note.subjective || '';
    document.getElementById('mpnFormObjective').value = note.objective || '';
    document.getElementById('mpnFormAssessment').value = note.assessment || '';
    document.getElementById('mpnFormPlan').value = note.plan || '';
    document.getElementById('mpnFormRecommendations').value = note.recommendations || '';

    const submitBtn = document.getElementById('btnSubmitMpnForm');
    if (submitBtn) submitBtn.textContent = `💾 Update Note (${note.note_number || '#' + note.id})`;

    const tabNew = document.getElementById('tabBtnMpnNewNote');
    if (tabNew) tabNew.click();
}



/**
 * Structured Nursing Care Plans (inpatient_care_plans)
 */
let currentNcpAdmissionId = null;
let activeNcpEvalFilter = 'all';
let cachedNandaTemplates = [];

const NCP_EVAL_META = {
    'In Progress': { icon: '🔵', color: '#0284c7', bg: '#e0f2fe', border: '#bae6fd' },
    'Goal Met': { icon: '🟢', color: '#16a34a', bg: '#dcfce7', border: '#bbf7d0' },
    'Partially Met': { icon: '🟡', color: '#ca8a04', bg: '#fef9c3', border: '#fde047' },
    'Unmet/Revised': { icon: '🔴', color: '#dc2626', bg: '#fee2e2', border: '#fecaca' }
};

async function openNursingCarePlansModal(admissionId) {
    const modal = document.getElementById('modalNursingCarePlans');
    if (!modal) return;

    const bed = (currentCensusData.beds || []).find(b => b.admission_id == admissionId);
    if (!bed) {
        showToast('Inpatient admission data not found', 'error');
        return;
    }

    currentNcpAdmissionId = admissionId;
    activeNcpEvalFilter = 'all';

    // Populate Patient Demographic Banner
    document.getElementById('ncpPatientName').textContent = bed.patient_name || 'Patient';
    document.getElementById('ncpPatientMrn').textContent = bed.patient_mrn || bed.patient_id || '--';
    document.getElementById('ncpPatientAgeGender').textContent = `${bed.patient_age ? bed.patient_age + 'y' : '--'} / ${bed.patient_gender || bed.gender || '--'}`;
    document.getElementById('ncpBedNo').textContent = `${bed.ward_code || ''} - ${bed.bed_number || '--'}`;
    document.getElementById('ncpLos').textContent = `${bed.los_days != null ? bed.los_days : 0} days`;

    // Reset filter chips to 'all'
    const filterBar = document.getElementById('ncpEvalFilterBar');
    if (filterBar) {
        filterBar.querySelectorAll('.ncp-filter-chip').forEach(c => {
            const isAll = c.getAttribute('data-eval') === 'all';
            c.classList.toggle('active-chip', isAll);
            c.style.border = isAll ? '1px solid #4338ca' : '1px solid #cbd5e1';
            c.style.background = isAll ? '#4338ca' : '#fff';
            c.style.color = isAll ? '#fff' : '#1e293b';
        });
    }

    resetNcpFormForNew(bed);

    const tabList = document.getElementById('tabBtnNcpList');
    if (tabList) tabList.click();

    modal.classList.add('open');

    await loadNursingCarePlans(admissionId, 'all');
}

function resetNcpFormForNew(bed = null) {
    const form = document.getElementById('formNursingCarePlan');
    if (form) form.reset();

    if (!bed && currentNcpAdmissionId) {
        bed = (currentCensusData.beds || []).find(b => b.admission_id == currentNcpAdmissionId);
    }

    const admInput = document.getElementById('ncpFormAdmissionId');
    if (admInput) admInput.value = currentNcpAdmissionId || '';

    const patInput = document.getElementById('ncpFormPatientId');
    if (patInput) patInput.value = bed?.patient_id || '';

    const recInput = document.getElementById('ncpFormRecordId');
    if (recInput) recInput.value = '';

    const nowIso = systemNow ? systemNow().slice(0, 16) : new Date().toISOString().slice(0, 16);
    const dtInput = document.getElementById('ncpFormDateTime');
    if (dtInput) dtInput.value = nowIso;

    const u = currentUser || getUser();
    const nurseName = (u?.first_name || u?.last_name)
        ? `${(u.first_name || '')} ${(u.last_name || '')}`.trim()
        : (bed?.shift_nurse_name || bed?.primary_nurse || u?.username || 'Registered Nurse, RN');
    const nurseInput = document.getElementById('ncpFormNurseName');
    if (nurseInput) nurseInput.value = nurseName;

    const tplSelect = document.getElementById('ncpTemplateSelect');
    if (tplSelect) tplSelect.value = '';

    const submitBtn = document.getElementById('btnSubmitNcpForm');
    if (submitBtn) submitBtn.textContent = '💾 Save Nursing Care Plan';
}

function populateNandaTemplateDropdown(templates) {
    if (!Array.isArray(templates) || templates.length === 0) return;
    cachedNandaTemplates = templates;
    const select = document.getElementById('ncpTemplateSelect');
    if (!select) return;

    select.innerHTML = '<option value="">-- Choose a Standard NANDA-I Nursing Diagnosis Template (or type custom below) --</option>';
    templates.forEach((tpl, idx) => {
        const opt = document.createElement('option');
        opt.value = String(idx);
        opt.textContent = `[NANDA ${tpl.code}] ${tpl.diagnosis} — (${tpl.domain})`;
        select.appendChild(opt);
    });
}

async function loadNursingCarePlans(admissionId, evalStatus = 'all') {
    const container = document.getElementById('ncpListContainer');
    const badge = document.getElementById('ncpTotalBadge');
    if (!container) return;

    container.innerHTML = '<div style="text-align: center; color: #64748b; padding: 30px;">⏳ Loading structured nursing care plans...</div>';

    try {
        const res = await fetchCarePlans(admissionId, evalStatus);
        const plans = (res && res.success && res.data?.plans) ? res.data.plans : [];
        const options = (res && res.success && res.data?.options) ? res.data.options : null;

        if (options?.nanda_templates) {
            populateNandaTemplateDropdown(options.nanda_templates);
        }

        if (badge) badge.textContent = `${plans.length} ${plans.length === 1 ? 'Care Plan' : 'Care Plans'}`;

        // Update KPI counters when viewing all plans
        if (!evalStatus || evalStatus === 'all') {
            const countMet = plans.filter(p => p.evaluation_status === 'Goal Met').length;
            const countPartial = plans.filter(p => p.evaluation_status === 'Partially Met').length;
            const countUnmet = plans.filter(p => p.evaluation_status === 'Unmet/Revised').length;
            const elMet = document.getElementById('ncpCountMet');
            const elPartial = document.getElementById('ncpCountPartial');
            const elUnmet = document.getElementById('ncpCountUnmet');
            if (elMet) elMet.textContent = countMet;
            if (elPartial) elPartial.textContent = countPartial;
            if (elUnmet) elUnmet.textContent = countUnmet;
        }

        if (plans.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; background: #fff; border-radius: 10px; border: 1px dashed #cbd5e1; color: #64748b;">
                    <div style="font-size: 32px; margin-bottom: 10px;">📋</div>
                    <div style="font-weight: 700; font-size: 15px; color: #1e293b;">No Nursing Care Plans Documented${evalStatus && evalStatus !== 'all' ? ` with state "${esc(evalStatus)}"` : ''}</div>
                    <div style="font-size: 12.5px; margin-top: 6px; max-width: 480px; margin-left: auto; margin-right: auto;">
                        Use the "Document / Revise NANDA Care Plan" tab to initiate an accredited nursing care plan with NANDA-I diagnosis, measurable SMART goals, and shift evaluations.
                    </div>
                </div>
            `;
            return;
        }

        const priorityStyles = {
            'High / Acute': 'background: #fee2e2; color: #991b1b; border: 1px solid #fecaca;',
            'Medium / Standard': 'background: #fef3c7; color: #92400e; border: 1px solid #fde68a;',
            'Low / Maintenance': 'background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1;'
        };

        let html = '<div style="display: flex; flex-direction: column; gap: 16px;">';

        plans.forEach(plan => {
            const evalMeta = NCP_EVAL_META[plan.evaluation_status] || NCP_EVAL_META['In Progress'];
            const pStyle = priorityStyles[plan.priority_level] || priorityStyles['Medium / Standard'];
            const dt = plan.plan_datetime ? new Date(plan.plan_datetime).toLocaleString() : '--';
            const evalDt = plan.evaluated_at ? new Date(plan.evaluated_at).toLocaleString() : null;

            html += `
                <div style="background: #fff; border: 1px solid #e2e8f0; border-left: 4px solid ${evalMeta.color}; border-radius: 10px; padding: 16px 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
                    <!-- Card Header -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 12px;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                ${plan.nanda_code ? `<span style="background: #eef2ff; color: #312e81; border: 1px solid #c7d2fe; padding: 2px 8px; border-radius: 6px; font-family: monospace; font-weight: 700; font-size: 11px;">NANDA ${esc(plan.nanda_code)}</span>` : ''}
                                <span style="font-size: 15px; font-weight: 800; color: #0f172a;">${esc(plan.nursing_diagnosis)}</span>
                                <span style="${pStyle} padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700;">${esc(plan.priority_level)}</span>
                            </div>
                            <div style="font-size: 11.5px; color: #64748b; margin-top: 4px;">
                                ${plan.nanda_domain ? `<strong>${esc(plan.nanda_domain)}</strong> • ` : ''}
                                Plan #${esc(plan.care_plan_number || `NCP-${plan.id}`)} • ${esc(plan.shift || '')} • Initiated by <strong>${esc(plan.nurse_name)}</strong> (${esc(dt)})
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="background: ${evalMeta.bg}; color: ${evalMeta.color}; border: 1px solid ${evalMeta.border}; padding: 4px 10px; border-radius: 14px; font-size: 12px; font-weight: 800;">
                                ${evalMeta.icon} ${esc(plan.evaluation_status)}
                            </span>
                            <button type="button" class="btn-inpatient btn-inpatient-secondary btn-edit-ncp" data-plan-id="${plan.id}" style="padding: 4px 9px; font-size: 11px;">✏️ Edit</button>
                            <button type="button" class="btn-inpatient btn-delete-ncp" data-plan-id="${plan.id}" style="padding: 4px 8px; font-size: 11px; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; cursor: pointer;">🗑️</button>
                        </div>
                    </div>

                    <!-- Etiology (R/T) & Defining Characteristics (AEB) -->
                    ${(plan.related_to || plan.as_evidenced_by) ? `
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; font-size: 12px;">
                            <div style="background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #f1f5f9;">
                                <strong style="color: #475569;">Related To (R/T):</strong>
                                <div style="color: #1e293b; margin-top: 2px;">${esc(plan.related_to || 'Not specified')}</div>
                            </div>
                            <div style="background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #f1f5f9;">
                                <strong style="color: #475569;">As Evidenced By (AEB):</strong>
                                <div style="color: #1e293b; margin-top: 2px;">${esc(plan.as_evidenced_by || 'Not specified')}</div>
                            </div>
                        </div>
                    ` : ''}

                    <!-- Goals & Interventions Grid -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 12px; font-size: 12.5px;">
                        <div>
                            <strong style="color: #1e1b4b; display: block; margin-bottom: 4px;">🎯 Measurable Patient Goals (NOC / SMART):</strong>
                            <div style="background: #f0fdf4; border-left: 3px solid #16a34a; padding: 8px 12px; border-radius: 0 6px 6px 0; color: #0f172a; white-space: pre-line;">${esc(plan.measurable_goals)}</div>
                        </div>
                        <div>
                            <strong style="color: #1e1b4b; display: block; margin-bottom: 4px;">🩺 Nursing Interventions (NIC):</strong>
                            <div style="background: #eff6ff; border-left: 3px solid #2563eb; padding: 8px 12px; border-radius: 0 6px 6px 0; color: #0f172a; white-space: pre-line;">${esc(plan.nursing_interventions)}</div>
                        </div>
                    </div>

                    ${plan.rationale ? `
                        <div style="font-size: 12px; color: #475569; background: #f8fafc; padding: 7px 12px; border-radius: 6px; margin-bottom: 12px;">
                            <strong>🔬 Clinical Rationale:</strong> ${esc(plan.rationale)}
                        </div>
                    ` : ''}

                    <!-- Interactive Shift Outcome Evaluation Box -->
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                            <div style="font-size: 12px; font-weight: 700; color: #1e293b;">
                                📊 Shift Outcome Evaluation
                                ${evalDt ? `<span style="font-weight: 400; font-size: 11px; color: #64748b; margin-left: 6px;">(Last evaluated by ${esc(plan.evaluated_by_name || 'RN')} at ${esc(evalDt)})</span>` : ''}
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                <button type="button" class="btn-quick-eval-ncp" data-plan-id="${plan.id}" data-status="Goal Met" style="padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; border: 1px solid #16a34a; background: ${plan.evaluation_status === 'Goal Met' ? '#16a34a' : '#fff'}; color: ${plan.evaluation_status === 'Goal Met' ? '#fff' : '#16a34a'};">
                                    🟢 Goal Met
                                </button>
                                <button type="button" class="btn-quick-eval-ncp" data-plan-id="${plan.id}" data-status="Partially Met" style="padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; border: 1px solid #ca8a04; background: ${plan.evaluation_status === 'Partially Met' ? '#ca8a04' : '#fff'}; color: ${plan.evaluation_status === 'Partially Met' ? '#fff' : '#854d0e'};">
                                    🟡 Partially Met
                                </button>
                                <button type="button" class="btn-quick-eval-ncp" data-plan-id="${plan.id}" data-status="Unmet/Revised" style="padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; border: 1px solid #dc2626; background: ${plan.evaluation_status === 'Unmet/Revised' ? '#dc2626' : '#fff'}; color: ${plan.evaluation_status === 'Unmet/Revised' ? '#fff' : '#dc2626'};">
                                    🔴 Unmet/Revised
                                </button>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <input type="text" id="ncpEvalNoteInput_${plan.id}" value="${esc(plan.shift_evaluation_notes || '')}" placeholder="Enter shift evaluation findings, patient response, or care plan revision notes..." style="flex: 1; padding: 6px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 12px; background: #fff;" />
                            <button type="button" class="btn-inpatient btn-inpatient-secondary btn-save-eval-note-ncp" data-plan-id="${plan.id}" data-current-status="${esc(plan.evaluation_status)}" style="padding: 5px 10px; font-size: 11px; white-space: nowrap;">
                                💾 Save Eval Note
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

        // Wire Quick Evaluation State Buttons (Goal Met, Partially Met, Unmet/Revised)
        container.querySelectorAll('.btn-quick-eval-ncp').forEach(btn => {
            btn.onclick = async () => {
                const pId = btn.getAttribute('data-plan-id');
                const newStatus = btn.getAttribute('data-status');
                const noteInput = document.getElementById(`ncpEvalNoteInput_${pId}`);
                const evalNotes = noteInput ? noteInput.value : '';

                try {
                    const eRes = await evaluateCarePlan({
                        id: pId,
                        evaluation_status: newStatus,
                        shift_evaluation_notes: evalNotes
                    });
                    if (eRes && eRes.success) {
                        showToast(`Care plan evaluated as "${newStatus}"`, 'success');
                        await loadNursingCarePlans(admissionId, activeNcpEvalFilter);
                    } else {
                        showToast('Evaluation update failed: ' + (eRes?.message || 'Error'), 'error');
                    }
                } catch (err) {
                    showToast('Evaluation error: ' + err.message, 'error');
                }
            };
        });

        // Wire Save Eval Note Button
        container.querySelectorAll('.btn-save-eval-note-ncp').forEach(btn => {
            btn.onclick = async () => {
                const pId = btn.getAttribute('data-plan-id');
                const currentStatus = btn.getAttribute('data-current-status') || 'In Progress';
                const noteInput = document.getElementById(`ncpEvalNoteInput_${pId}`);
                const evalNotes = noteInput ? noteInput.value : '';

                try {
                    const eRes = await evaluateCarePlan({
                        id: pId,
                        evaluation_status: currentStatus,
                        shift_evaluation_notes: evalNotes
                    });
                    if (eRes && eRes.success) {
                        showToast('Shift evaluation note saved', 'success');
                        await loadNursingCarePlans(admissionId, activeNcpEvalFilter);
                    } else {
                        showToast('Failed to save evaluation note: ' + (eRes?.message || 'Error'), 'error');
                    }
                } catch (err) {
                    showToast('Error saving evaluation note: ' + err.message, 'error');
                }
            };
        });

        // Wire Edit Buttons
        container.querySelectorAll('.btn-edit-ncp').forEach(btn => {
            btn.onclick = () => {
                const pId = btn.getAttribute('data-plan-id');
                const target = plans.find(p => p.id == pId);
                if (target) populateCarePlanForEdit(target);
            };
        });

        // Wire Delete Buttons
        container.querySelectorAll('.btn-delete-ncp').forEach(btn => {
            btn.onclick = async () => {
                const pId = btn.getAttribute('data-plan-id');
                if (!confirm('Remove this nursing care plan?')) return;
                try {
                    const dRes = await deleteCarePlan(pId);
                    if (dRes && dRes.success) {
                        showToast('Nursing care plan removed', 'success');
                        await loadNursingCarePlans(admissionId, activeNcpEvalFilter);
                    } else {
                        showToast('Delete failed: ' + (dRes?.message || 'Error'), 'error');
                    }
                } catch (err) {
                    showToast('Delete error: ' + err.message, 'error');
                }
            };
        });

    } catch (err) {
        container.innerHTML = `<div style="color: #ef4444; padding: 20px; text-align: center;">Error loading nursing care plans: ${esc(err.message)}</div>`;
    }
}

function populateCarePlanForEdit(plan) {
    document.getElementById('ncpFormRecordId').value = plan.id;
    document.getElementById('ncpFormAdmissionId').value = plan.admission_id;
    document.getElementById('ncpFormPatientId').value = plan.patient_id || '';

    if (plan.plan_datetime) {
        document.getElementById('ncpFormDateTime').value = plan.plan_datetime.replace(' ', 'T').slice(0, 16);
    }
    document.getElementById('ncpFormShift').value = plan.shift || 'Day Shift (07:00-15:00)';
    document.getElementById('ncpFormPriority').value = plan.priority_level || 'Medium / Standard';
    document.getElementById('ncpFormNurseName').value = plan.nurse_name || '';
    document.getElementById('ncpFormNandaCode').value = plan.nanda_code || '';
    document.getElementById('ncpFormNandaDomain').value = plan.nanda_domain || '';
    document.getElementById('ncpFormDiagnosis').value = plan.nursing_diagnosis || '';
    document.getElementById('ncpFormRelatedTo').value = plan.related_to || '';
    document.getElementById('ncpFormAeb').value = plan.as_evidenced_by || '';
    document.getElementById('ncpFormGoals').value = plan.measurable_goals || '';
    document.getElementById('ncpFormInterventions').value = plan.nursing_interventions || '';
    document.getElementById('ncpFormRationale').value = plan.rationale || '';
    document.getElementById('ncpFormEvalStatus').value = plan.evaluation_status || 'In Progress';
    document.getElementById('ncpFormEvalNotes').value = plan.shift_evaluation_notes || '';

    const submitBtn = document.getElementById('btnSubmitNcpForm');
    if (submitBtn) submitBtn.textContent = `💾 Update Care Plan (${plan.care_plan_number || '#' + plan.id})`;

    const tabForm = document.getElementById('tabBtnNcpForm');
    if (tabForm) tabForm.click();
}



/**
 * 24-Hour Fluid Balance Charts (Intake & Output / I&O — inpatient_fluid_balance)
 */
let currentFbcAdmissionId = null;

export async function openFluidBalanceModal(admissionId) {
    const modal = document.getElementById('modalFluidBalance');
    if (!modal) return;

    const bed = (currentCensusData.beds || []).find(b => b.admission_id == admissionId);

    currentFbcAdmissionId = admissionId;

    // Populate Patient Demographic Banner
    document.getElementById('fbcPatientName').textContent = bed?.patient_name || 'Inpatient';
    document.getElementById('fbcPatientMrn').textContent = bed?.patient_mrn || bed?.patient_id || '--';
    document.getElementById('fbcPatientAgeGender').textContent = `${bed?.patient_age ? bed.patient_age + 'y' : '--'} / ${bed?.patient_gender || bed?.gender || '--'}`;
    document.getElementById('fbcBedNo').textContent = `${bed?.ward_code || ''} - ${bed?.bed_number || '--'}`;
    document.getElementById('fbcLos').textContent = `${bed?.los_days != null ? bed.los_days : 0} days`;
    document.getElementById('fbcAdmittingDiag').textContent = bed?.admitting_diagnosis || 'Under Observation';
    document.getElementById('fbcAttendingPhysician').textContent = bed?.attending_physician || 'Attending Physician';

    resetFbcFormForNew(bed);

    const tabChart = document.getElementById('tabBtnFbcChart');
    if (tabChart) tabChart.click();

    modal.classList.add('open');

    await loadFluidBalanceChart(admissionId);
}

function resetFbcFormForNew(bed = null) {
    const form = document.getElementById('formFluidBalance');
    if (form) form.reset();

    if (!bed && currentFbcAdmissionId) {
        bed = (currentCensusData.beds || []).find(b => b.admission_id == currentFbcAdmissionId);
    }

    const admInput = document.getElementById('fbcFormAdmissionId');
    if (admInput) admInput.value = currentFbcAdmissionId || '';

    const patInput = document.getElementById('fbcFormPatientId');
    if (patInput) patInput.value = bed?.patient_id || '';

    const recInput = document.getElementById('fbcFormRecordId');
    if (recInput) recInput.value = '';

    const nowIso = systemNow ? systemNow().slice(0, 16) : new Date().toISOString().slice(0, 16);
    const dtInput = document.getElementById('fbcFormDateTime');
    if (dtInput) dtInput.value = nowIso;

    const u = currentUser || getUser();
    const nurseName = (u?.first_name || u?.last_name)
        ? `${(u.first_name || '')} ${(u.last_name || '')}`.trim()
        : (bed?.shift_nurse_name || bed?.primary_nurse || u?.username || 'Registered Nurse, RN');
    const nurseInput = document.getElementById('fbcFormNurseName');
    if (nurseInput) nurseInput.value = nurseName;

    ['fbcInOral', 'fbcInIv', 'fbcInBlood', 'fbcInEnteral', 'fbcInOther',
     'fbcOutUrine', 'fbcOutDrain', 'fbcOutEmesis', 'fbcOutNg', 'fbcOutChest', 'fbcOutStool'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '0';
    });

    const submitBtn = document.getElementById('btnSubmitFbcForm');
    if (submitBtn) submitBtn.textContent = '💾 Save Fluid I&O Entry';

    recalculateLiveFbcForm();
}

function recalculateLiveFbcForm() {
    const inSum = (Number(document.getElementById('fbcInOral')?.value) || 0)
        + (Number(document.getElementById('fbcInIv')?.value) || 0)
        + (Number(document.getElementById('fbcInBlood')?.value) || 0)
        + (Number(document.getElementById('fbcInEnteral')?.value) || 0)
        + (Number(document.getElementById('fbcInOther')?.value) || 0);

    const outSum = (Number(document.getElementById('fbcOutUrine')?.value) || 0)
        + (Number(document.getElementById('fbcOutDrain')?.value) || 0)
        + (Number(document.getElementById('fbcOutEmesis')?.value) || 0)
        + (Number(document.getElementById('fbcOutNg')?.value) || 0)
        + (Number(document.getElementById('fbcOutChest')?.value) || 0)
        + (Number(document.getElementById('fbcOutStool')?.value) || 0);

    const net = inSum - outSum;

    const inEl = document.getElementById('fbcLiveIntakeSum');
    if (inEl) inEl.textContent = `Subtotal: ${inSum.toLocaleString()} mL`;

    const outEl = document.getElementById('fbcLiveOutputSum');
    if (outEl) outEl.textContent = `Subtotal: ${outSum.toLocaleString()} mL`;

    const netEl = document.getElementById('fbcLiveEntryNet');
    if (netEl) {
        netEl.textContent = `${net > 0 ? '+' : ''}${net.toLocaleString()} mL`;
        netEl.style.color = net > 500 ? '#ea580c' : net < -500 ? '#ca8a04' : '#0f172a';
    }
}

async function loadFluidBalanceChart(admissionId) {
    const container = document.getElementById('fbcFlowsheetContainer');
    const countEl = document.getElementById('fbcEntryCount');
    if (!container) return;

    container.innerHTML = '<div style="text-align: center; color: #64748b; padding: 30px;">⏳ Loading 24-hour fluid balance flowsheet...</div>';

    try {
        const res = await fetchFluidBalance(admissionId);
        const entries = (res && res.success && res.data?.entries) ? res.data.entries : [];
        const s = (res && res.success && res.data?.summary_24h) ? res.data.summary_24h : null;

        if (countEl) countEl.textContent = entries.length;

        // Update 24h Running Summary Cards & Alert Banner
        if (s) {
            const inTotal = s.intake_24h?.total_ml || 0;
            const outTotal = s.output_24h?.total_ml || 0;
            const net24h = s.net_balance_24h_ml || 0;
            const meta = s.alert_meta || {
                label: 'Normal / Euvolemic',
                icon: '🟢',
                color: '#16a34a',
                bg: '#dcfce7',
                border: '#bbf7d0',
                message: '24-hour fluid intake and output are balanced within physiological target range.'
            };

            const inTotalEl = document.getElementById('fbcSummaryIntakeTotal');
            if (inTotalEl) inTotalEl.textContent = `${inTotal.toLocaleString()} mL`;

            const inSubEl = document.getElementById('fbcSummaryIntakeSub');
            if (inSubEl) {
                inSubEl.textContent = `Oral: ${s.intake_24h.oral_ml} · IV: ${s.intake_24h.iv_ml} · Blood: ${s.intake_24h.blood_ml} · Tube: ${s.intake_24h.enteral_ml}${s.intake_24h.other_ml ? ` · Other: ${s.intake_24h.other_ml}` : ''} mL`;
            }

            const outTotalEl = document.getElementById('fbcSummaryOutputTotal');
            if (outTotalEl) outTotalEl.textContent = `${outTotal.toLocaleString()} mL`;

            const outSubEl = document.getElementById('fbcSummaryOutputSub');
            if (outSubEl) {
                outSubEl.textContent = `Urine: ${s.output_24h.urine_ml} · Drain: ${s.output_24h.drain_ml} · Emesis: ${s.output_24h.emesis_ml} · NG: ${s.output_24h.ng_ml} · Chest: ${s.output_24h.chest_tube_ml} mL`;
            }

            const netTotalEl = document.getElementById('fbcSummaryNetTotal');
            if (netTotalEl) {
                netTotalEl.textContent = `${net24h > 0 ? '+' : ''}${net24h.toLocaleString()} mL`;
                netTotalEl.style.color = meta.color;
            }

            const netCard = document.getElementById('fbcNetBalanceCard');
            if (netCard) {
                netCard.style.background = meta.bg;
                netCard.style.borderColor = meta.border;
            }

            const msgEl = document.getElementById('fbcAlertMessageText');
            if (msgEl) {
                msgEl.textContent = `${meta.icon} ${meta.message}`;
                msgEl.style.color = meta.color;
            }

            const badgeEl = document.getElementById('fbcAlertBadge');
            if (badgeEl) {
                badgeEl.textContent = `${meta.icon} ${meta.label}`;
                badgeEl.style.background = meta.bg;
                badgeEl.style.color = meta.color;
            }
        }

        if (entries.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; background: #fff; border-radius: 10px; border: 1px dashed #cbd5e1; color: #64748b;">
                    <div style="font-size: 32px; margin-bottom: 10px;">💧</div>
                    <div style="font-weight: 700; font-size: 15px; color: #1e293b;">No Fluid Intake &amp; Output (I&amp;O) Entries Recorded</div>
                    <div style="font-size: 12.5px; margin-top: 6px; max-width: 480px; margin-left: auto; margin-right: auto;">
                        Use the "Record Intake &amp; Output (I&amp;O)" tab to log oral fluids, IV infusions, blood products, tube feedings, urinary catheter output, surgical drains, and chest tube volumes.
                    </div>
                </div>
            `;
            return;
        }

        const alertPills = {
            'Normal / Euvolemic': '<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:10px;font-size:10.5px;font-weight:700;">🟢 Euvolemic</span>',
            'Fluid Overload Warning': '<span style="background:#ffedd5;color:#9a3412;padding:2px 8px;border-radius:10px;font-size:10.5px;font-weight:700;">🟠 Overload Warn</span>',
            'Critical Fluid Overload': '<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:10px;font-size:10.5px;font-weight:700;">🔴 Critical Overload</span>',
            'Negative Balance / Dehydration Warning': '<span style="background:#fef9c3;color:#854d0e;padding:2px 8px;border-radius:10px;font-size:10.5px;font-weight:700;">🟡 Negative Bal</span>',
            'Critical Negative Balance / Oliguria': '<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:10px;font-size:10.5px;font-weight:700;">🔴 Critical Deficit</span>'
        };

        let html = `
            <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; overflow-x: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead>
                        <tr style="background: #f1f5f9; color: #334155; text-align: left; border-bottom: 2px solid #cbd5e1;">
                            <th style="padding: 10px 12px; white-space: nowrap;">Date / Time &amp; Shift</th>
                            <th style="padding: 10px 10px; background: #e0f2fe; color: #0c4a6e;">📥 Intake Breakdown (mL)</th>
                            <th style="padding: 10px 10px; background: #bae6fd; color: #0c4a6e; text-align: right; white-space: nowrap;">∑ Intake</th>
                            <th style="padding: 10px 10px; background: #fef3c7; color: #92400e;">📤 Output Breakdown (mL)</th>
                            <th style="padding: 10px 10px; background: #fde68a; color: #92400e; text-align: right; white-space: nowrap;">∑ Output</th>
                            <th style="padding: 10px 10px; text-align: right; white-space: nowrap;">Entry Net</th>
                            <th style="padding: 10px 10px; text-align: right; white-space: nowrap;">24h Running Net</th>
                            <th style="padding: 10px 10px;">RN &amp; Notes</th>
                            <th style="padding: 10px 10px; text-align: right;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        entries.forEach(row => {
            const dt = row.recorded_at ? new Date(row.recorded_at).toLocaleString() : '--';
            const inParts = [];
            if (Number(row.intake_oral_ml) > 0) inParts.push(`Oral: <b>${row.intake_oral_ml}</b>`);
            if (Number(row.intake_iv_ml) > 0) inParts.push(`IV: <b>${row.intake_iv_ml}</b>`);
            if (Number(row.intake_blood_ml) > 0) inParts.push(`Blood: <b>${row.intake_blood_ml}</b>`);
            if (Number(row.intake_enteral_ml) > 0) inParts.push(`Tube: <b>${row.intake_enteral_ml}</b>`);
            if (Number(row.intake_other_ml) > 0) inParts.push(`Other: <b>${row.intake_other_ml}</b>`);

            const outParts = [];
            if (Number(row.output_urine_ml) > 0) outParts.push(`Urine: <b>${row.output_urine_ml}</b>`);
            if (Number(row.output_drain_ml) > 0) outParts.push(`Drain (JP/Hemo): <b>${row.output_drain_ml}</b>`);
            if (Number(row.output_emesis_ml) > 0) outParts.push(`Emesis: <b>${row.output_emesis_ml}</b>`);
            if (Number(row.output_ng_ml) > 0) outParts.push(`NG: <b>${row.output_ng_ml}</b>`);
            if (Number(row.output_chest_tube_ml) > 0) outParts.push(`Chest: <b>${row.output_chest_tube_ml}</b>`);
            if (Number(row.output_stool_other_ml) > 0) outParts.push(`Other: <b>${row.output_stool_other_ml}</b>`);

            const eNet = Number(row.entry_net_ml) || 0;
            const rNet = Number(row.running_24h_net_ml) || 0;
            const pill = alertPills[row.balance_alert_level] || '';

            html += `
                <tr style="border-bottom: 1px solid #e2e8f0; vertical-align: top;">
                    <td style="padding: 9px 12px; white-space: nowrap;">
                        <div style="font-weight: 700; color: #0f172a;">${esc(dt)}</div>
                        <div style="font-size: 11px; color: #64748b;">${esc(row.shift || '')} · <span style="font-family:monospace;">#${esc(row.entry_number || row.id)}</span></div>
                    </td>
                    <td style="padding: 9px 10px; background: #f8fafc;">
                        <div>${inParts.length ? inParts.join(' · ') : '<span style="color:#94a3b8;">0 mL</span>'}</div>
                        ${row.intake_details ? `<div style="font-size: 11px; color: #0369a1; margin-top: 2px;">${esc(row.intake_details)}</div>` : ''}
                    </td>
                    <td style="padding: 9px 10px; text-align: right; font-family: monospace; font-weight: 800; color: #0369a1; background: #f0f9ff; white-space: nowrap;">
                        ${Number(row.intake_total_ml || 0).toLocaleString()} mL
                    </td>
                    <td style="padding: 9px 10px; background: #f8fafc;">
                        <div>${outParts.length ? outParts.join(' · ') : '<span style="color:#94a3b8;">0 mL</span>'}</div>
                        ${row.output_details ? `<div style="font-size: 11px; color: #b45309; margin-top: 2px;">${esc(row.output_details)}</div>` : ''}
                    </td>
                    <td style="padding: 9px 10px; text-align: right; font-family: monospace; font-weight: 800; color: #b45309; background: #fffbeb; white-space: nowrap;">
                        ${Number(row.output_total_ml || 0).toLocaleString()} mL
                    </td>
                    <td style="padding: 9px 10px; text-align: right; font-family: monospace; font-weight: 700; color: ${eNet > 0 ? '#0284c7' : eNet < 0 ? '#b45309' : '#334155'}; white-space: nowrap;">
                        ${eNet > 0 ? '+' : ''}${eNet.toLocaleString()} mL
                    </td>
                    <td style="padding: 9px 10px; text-align: right; white-space: nowrap;">
                        <div style="font-family: monospace; font-weight: 800; font-size: 13px; color: #0f172a;">${rNet > 0 ? '+' : ''}${rNet.toLocaleString()} mL</div>
                        <div style="margin-top: 2px;">${pill}</div>
                    </td>
                    <td style="padding: 9px 10px;">
                        <div style="font-weight: 600; color: #334155;">👩‍⚕️ ${esc(row.recorded_by_name || 'RN')}</div>
                        ${row.clinical_notes ? `<div style="font-size: 11px; color: #475569; margin-top: 2px;">${esc(row.clinical_notes)}</div>` : ''}
                    </td>
                    <td style="padding: 9px 10px; text-align: right; white-space: nowrap;">
                        <button type="button" class="btn-inpatient btn-inpatient-secondary btn-edit-fbc" data-entry-id="${row.id}" style="padding: 3px 7px; font-size: 11px;">✏️</button>
                        <button type="button" class="btn-inpatient btn-delete-fbc" data-entry-id="${row.id}" style="padding: 3px 7px; font-size: 11px; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; cursor: pointer;">🗑️</button>
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;

        // Wire Edit buttons
        container.querySelectorAll('.btn-edit-fbc').forEach(btn => {
            btn.onclick = () => {
                const eId = btn.getAttribute('data-entry-id');
                const target = entries.find(x => x.id == eId);
                if (target) populateFluidEntryForEdit(target);
            };
        });

        // Wire Delete buttons
        container.querySelectorAll('.btn-delete-fbc').forEach(btn => {
            btn.onclick = async () => {
                const eId = btn.getAttribute('data-entry-id');
                if (!confirm('Remove this fluid balance entry from the 24-hour flowsheet?')) return;
                try {
                    const dRes = await deleteFluidBalance(eId);
                    if (dRes && dRes.success) {
                        showToast('Fluid balance entry removed', 'success');
                        await loadFluidBalanceChart(admissionId);
                    } else {
                        showToast('Delete failed: ' + (dRes?.message || 'Error'), 'error');
                    }
                } catch (err) {
                    showToast('Delete error: ' + err.message, 'error');
                }
            };
        });

    } catch (err) {
        container.innerHTML = `<div style="color: #ef4444; padding: 20px; text-align: center;">Error loading 24-hour fluid balance chart: ${esc(err.message)}</div>`;
    }
}

function populateFluidEntryForEdit(row) {
    document.getElementById('fbcFormRecordId').value = row.id;
    document.getElementById('fbcFormAdmissionId').value = row.admission_id;
    document.getElementById('fbcFormPatientId').value = row.patient_id || '';

    if (row.recorded_at) {
        document.getElementById('fbcFormDateTime').value = row.recorded_at.replace(' ', 'T').slice(0, 16);
    }
    document.getElementById('fbcFormShift').value = row.shift || 'Day Shift (07:00-15:00)';
    document.getElementById('fbcFormNurseName').value = row.recorded_by_name || '';

    document.getElementById('fbcInOral').value = row.intake_oral_ml ?? 0;
    document.getElementById('fbcInIv').value = row.intake_iv_ml ?? 0;
    document.getElementById('fbcInBlood').value = row.intake_blood_ml ?? 0;
    document.getElementById('fbcInEnteral').value = row.intake_enteral_ml ?? 0;
    document.getElementById('fbcInOther').value = row.intake_other_ml ?? 0;
    document.getElementById('fbcInDetails').value = row.intake_details || '';

    document.getElementById('fbcOutUrine').value = row.output_urine_ml ?? 0;
    document.getElementById('fbcOutDrain').value = row.output_drain_ml ?? 0;
    document.getElementById('fbcOutEmesis').value = row.output_emesis_ml ?? 0;
    document.getElementById('fbcOutNg').value = row.output_ng_ml ?? 0;
    document.getElementById('fbcOutChest').value = row.output_chest_tube_ml ?? 0;
    document.getElementById('fbcOutStool').value = row.output_stool_other_ml ?? 0;
    document.getElementById('fbcOutDetails').value = row.output_details || '';

    document.getElementById('fbcFormNotes').value = row.clinical_notes || '';

    recalculateLiveFbcForm();

    const submitBtn = document.getElementById('btnSubmitFbcForm');
    if (submitBtn) submitBtn.textContent = `💾 Update Fluid Entry (${row.entry_number || '#' + row.id})`;

    const tabRec = document.getElementById('tabBtnFbcRecord');
    if (tabRec) tabRec.click();
}


/**
 * SBAR Nurse Shift Handovers (nursing_shift_handovers)
 * Standardized Situation, Background, Assessment, Recommendation with Dual Digital Sign-Off
 */
let currentSbarAdmissionId = null;
let activeSbarStatusFilter = 'all';
let cachedSbarClinicalContext = null;

async function openShiftHandoverModal(admissionId) {
    const modal = document.getElementById('modalShiftHandover');
    if (!modal) return;

    const bed = (currentCensusData.beds || []).find(b => b.admission_id == admissionId);
    if (!bed) {
        showToast('Inpatient admission data not found', 'error');
        return;
    }

    currentSbarAdmissionId = admissionId;
    activeSbarStatusFilter = 'all';

    // Populate Patient Demographic Banner
    document.getElementById('sbarPatientName').textContent = bed.patient_name || 'Patient';
    document.getElementById('sbarPatientMrn').textContent = bed.patient_mrn || bed.patient_id || '--';
    document.getElementById('sbarPatientAgeGender').textContent = `${bed.patient_age ? bed.patient_age + 'y' : '--'} / ${bed.patient_gender || bed.gender || '--'}`;
    document.getElementById('sbarBedNo').textContent = `${bed.ward_code || ''} - ${bed.bed_number || '--'}`;
    document.getElementById('sbarLos').textContent = `${bed.los_days != null ? bed.los_days : 0} days`;
    document.getElementById('sbarAdmittingDiag').textContent = bed.admitting_diagnosis || 'Under Observation';
    document.getElementById('sbarAttendingPhysician').textContent = bed.attending_physician || 'Attending Physician';
    document.getElementById('sbarCurrentNurse').textContent = bed.shift_nurse_name || bed.primary_nurse || 'Nurse On-Duty';

    // Reset filter chips to 'all'
    const filterBar = document.getElementById('sbarStatusFilterBar');
    if (filterBar) {
        filterBar.querySelectorAll('.sbar-filter-chip').forEach(c => {
            const isAll = c.getAttribute('data-status') === 'all';
            c.classList.toggle('active', isAll);
            c.style.border = isAll ? '1px solid #4f46e5' : '1px solid #cbd5e1';
            c.style.background = isAll ? '#4f46e5' : '#fff';
            c.style.color = isAll ? '#fff' : '#475569';
        });
    }

    resetSbarFormForNew(bed);

    const tabLog = document.getElementById('tabBtnSbarLog');
    if (tabLog) tabLog.click();

    modal.classList.add('open');

    await loadShiftHandovers(admissionId, 'all');
}

function resetSbarFormForNew(bed = null) {
    const form = document.getElementById('formShiftHandover');
    if (form) form.reset();

    if (!bed && currentSbarAdmissionId) {
        bed = (currentCensusData.beds || []).find(b => b.admission_id == currentSbarAdmissionId);
    }

    document.getElementById('sbarFormRecordId').value = '';
    document.getElementById('sbarFormAdmissionId').value = currentSbarAdmissionId || (bed ? bed.admission_id : '');
    document.getElementById('sbarFormPatientId').value = bed?.patient_id || '';

    const now = systemNow();
    const dtInput = document.getElementById('sbarDateTime');
    if (dtInput) {
        const pad = n => String(n).padStart(2, '0');
        dtInput.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    }

    // Default shift transition based on current hour
    const hr = now.getHours();
    const transSel = document.getElementById('sbarShiftTransition');
    if (transSel) {
        if (hr >= 6 && hr < 14) {
            transSel.value = 'Morning to Afternoon (07:00 → 15:00)';
        } else if (hr >= 14 && hr < 22) {
            transSel.value = 'Afternoon to Night (15:00 → 23:00)';
        } else {
            transSel.value = 'Night to Morning (23:00 → 07:00)';
        }
    }

    if (bed) {
        const isoInput = document.getElementById('sbarIsolation');
        if (isoInput) isoInput.value = bed.isolation_precautions || 'Standard';
    }

    const outNameInput = document.getElementById('sbarOutgoingNurseName');
    const preview = document.getElementById('sbarOutgoingSigPreview');
    if (outNameInput) {
        const defaultNurse = currentUser?.full_name || currentUser?.name || bed?.shift_nurse_name || bed?.primary_nurse || '';
        outNameInput.value = defaultNurse ? (defaultNurse.includes('RN') ? defaultNurse : `${defaultNurse}, RN`) : '';
        if (preview) {
            if (outNameInput.value) {
                const stamp = outNameInput.value.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
                preview.textContent = `🔒 ESIGN_OUTGOING_RN_${stamp}`;
            } else {
                preview.textContent = '🔒 Digital Stamp: Will be signed upon submission';
            }
        }
    }

    document.querySelectorAll('#formShiftHandover .sbar-safety-chk').forEach(chk => {
        chk.checked = true;
    });

    const submitBtn = document.getElementById('btnSubmitSbarForm');
    if (submitBtn) submitBtn.textContent = '✍️ Sign & Submit SBAR Shift Handover';
}

function autofillSbarFromChart() {
    const bed = (currentCensusData.beds || []).find(b => b.admission_id == currentSbarAdmissionId);
    const ctx = cachedSbarClinicalContext || {};
    const rnd = ctx.latest_round || null;
    const fb = ctx.fluid_24h_summary || null;
    const cps = ctx.active_care_plans || [];

    const ptName = bed?.patient_name || 'Patient';
    const ageSex = `${bed?.patient_age ? bed.patient_age + 'y' : ''}/${bed?.patient_gender || ''}`;
    const dx = bed?.admitting_diagnosis || ctx.admission?.admitting_diagnosis || 'Inpatient medical management';
    const los = bed?.los_days != null ? `${bed.los_days} day(s)` : 'active stay';
    const traj = rnd?.clinical_trajectory || 'Stable';

    // S - Situation
    const sitText = `${ptName} (${ageSex}) admitted to ${bed?.ward_name || 'Ward'} [${bed?.bed_number || '--'}] for ${dx} (LOS: ${los}). Current clinical trajectory per rounding physician (${rnd?.rounding_physician_name || bed?.attending_physician || 'Attending MD'}): ${traj}. Isolation: ${bed?.isolation_precautions || 'Standard'}.`;

    // B - Background
    const diet = rnd?.diet_order || 'Regular / Per Orders';
    const activity = rnd?.activity_order || 'As tolerated';
    const bgText = `Admitted under ${bed?.attending_physician || 'Attending Physician'}. Diet Order: ${diet}. Activity Order: ${activity}. Patent peripheral IV access maintained; scheduled MAR medications up to date.${rnd?.assessment ? ' Physician Round Summary: ' + rnd.assessment : ''}`;

    // A - Assessment
    let fluidStr = '24h Fluid Balance: Monitoring active.';
    if (fb) {
        const netSign = fb.net_24h_ml > 0 ? '+' : '';
        fluidStr = `24h Fluid I&O Summary: Intake ${fb.intake_24h_ml} mL | Output ${fb.output_24h_ml} mL (Urine: ${fb.urine_24h_ml} mL) | Running 24h Net Balance: ${netSign}${fb.net_24h_ml} mL.`;
    }
    const vitalsStr = bed?.vitals_state ? `Vitals Status: ${bed.vitals_state}.` : 'Vital signs stable and charted on schedule.';
    const assText = `${vitalsStr} ${fluidStr} Patient alert, oriented, pain controlled, call bell and fall precautions in place.`;

    // R - Recommendation
    const recParts = [];
    if (rnd?.plan) {
        recParts.push(`Daily MD Plan: ${rnd.plan}`);
    }
    if (cps.length > 0) {
        const cpSummary = cps.map(c => `${c.nursing_diagnosis} (${c.evaluation_status || 'In Progress'})`).join('; ');
        recParts.push(`Continue NANDA Care Plans: ${cpSummary}.`);
    }
    if (rnd?.target_discharge_date) {
        recParts.push(`Target Discharge Date: ${rnd.target_discharge_date}.`);
    }
    recParts.push('Continue scheduled vital signs, strict I&O charting, and notify on-call physician for acute deterioration or NEWS2 ≥ 5.');

    document.getElementById('sbarInputSituation').value = sitText;
    document.getElementById('sbarInputBackground').value = bgText;
    document.getElementById('sbarInputAssessment').value = assText;
    document.getElementById('sbarInputRecommendation').value = recParts.join('\n');

    showToast('SBAR sections auto-populated from live inpatient chart!', 'success');
}

async function loadShiftHandovers(admissionId, statusFilter = 'all') {
    const container = document.getElementById('sbarHandoverListContainer');
    if (!container) return;

    container.innerHTML = `<div style="text-align: center; padding: 30px; color: #64748b;">Loading SBAR shift handovers...</div>`;

    try {
        const res = await fetchShiftHandovers(admissionId, statusFilter);
        if (!res || !res.success || !res.data) {
            container.innerHTML = `<div style="color: #ef4444; padding: 20px; text-align: center;">Failed to load SBAR shift handovers.</div>`;
            return;
        }

        const { handovers = [], summary = {}, clinical_autofill = null } = res.data;
        cachedSbarClinicalContext = clinical_autofill;

        // Update KPI strip
        document.getElementById('sbarKpiTotal').textContent = summary.total_count ?? 0;
        document.getElementById('sbarKpiDualSigned').textContent = summary.dual_signed_count ?? 0;
        document.getElementById('sbarKpiPending').textContent = summary.pending_count ?? 0;
        document.getElementById('sbarKpiClarify').textContent = summary.clarification_count ?? 0;
        document.getElementById('sbarLogCountBadge').textContent = handovers.length;

        if (handovers.length === 0) {
            container.innerHTML = `
                <div style="background: #fff; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 36px 24px; text-align: center;">
                    <div style="font-size: 34px; margin-bottom: 8px;">🔁</div>
                    <div style="font-size: 15px; font-weight: 700; color: #1e293b;">No SBAR Nurse Shift Handovers Recorded Yet</div>
                    <p style="font-size: 12.5px; color: #64748b; max-width: 520px; margin: 6px auto 14px;">
                        Ensure uninterrupted continuity of care across Morning → Afternoon → Night shifts by documenting a standardized SBAR handover with outgoing and incoming nurse digital sign-offs.
                    </p>
                    <button type="button" class="btn-inpatient btn-inpatient-primary" id="btnEmptySbarStart" style="background: #4f46e5; border-color: #4f46e5;">
                        ➕ Document First SBAR Shift Handover
                    </button>
                </div>
            `;
            document.getElementById('btnEmptySbarStart')?.addEventListener('click', () => {
                document.getElementById('tabBtnSbarNew')?.click();
            });
            return;
        }

        let html = `<div style="display: flex; flex-direction: column; gap: 14px;">`;

        handovers.forEach(h => {
            const dt = h.handover_datetime ? new Date(h.handover_datetime).toLocaleString() : '--';
            const isDualSigned = h.handover_status === 'Dual-Signed / Completed';
            const isPending = h.handover_status === 'Pending Incoming Sign-Off';
            const isClarify = h.handover_status === 'Clarification Requested';

            let statusBadge = `<span style="background: #fef3c7; color: #b45309; border: 1px solid #fde68a; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 800;">⏳ Pending Incoming Sign-Off</span>`;
            if (isDualSigned) {
                statusBadge = `<span style="background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 800;">✅ Dual-Signed &amp; Verified</span>`;
            } else if (isClarify) {
                statusBadge = `<span style="background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 800;">⚠️ Clarification Requested</span>`;
            }

            const safetyList = Array.isArray(h.safety_checks) ? h.safety_checks : [];
            const safetyPills = safetyList.map(item =>
                `<span style="font-size: 10.5px; background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 2px 8px; border-radius: 10px;">✔️ ${esc(item)}</span>`
            ).join(' ');

            html += `
                <div style="background: #fff; border: 1px solid ${isPending ? '#fcd34d' : '#cbd5e1'}; border-radius: 10px; padding: 16px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                    <!-- Card Header -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 12px;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                <span style="font-family: monospace; font-size: 12px; font-weight: 800; background: #eef2ff; color: #4338ca; padding: 2px 8px; border-radius: 6px;">${esc(h.handover_number)}</span>
                                <span style="font-size: 14px; font-weight: 800; color: #0f172a;">${esc(h.shift_transition)}</span>
                                ${statusBadge}
                            </div>
                            <div style="font-size: 11.5px; color: #64748b; margin-top: 4px;">
                                🕒 ${esc(dt)} · Acuity: <strong style="color: #1e293b;">${esc(h.acuity_level)}</strong> · Code: <strong>${esc(h.code_status)}</strong> · Fall Risk: <strong>${esc(h.fall_risk_level)}</strong> · Allergies: <strong>${esc(h.allergies_summary || 'NKDA')}</strong>
                            </div>
                        </div>
                        <div style="display: flex; gap: 6px;">
                            <button type="button" class="btn-inpatient btn-inpatient-secondary btn-edit-sbar" data-handover-id="${h.id}" style="padding: 4px 9px; font-size: 11.5px;">✏️ Edit</button>
                            <button type="button" class="btn-inpatient btn-delete-sbar" data-handover-id="${h.id}" style="padding: 4px 9px; font-size: 11.5px; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; cursor: pointer;">🗑️</button>
                        </div>
                    </div>

                    <!-- 4-Quadrant SBAR Display Grid -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                        <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 8px 12px; border-radius: 0 6px 6px 0;">
                            <div style="font-size: 11px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; margin-bottom: 3px;">🟦 S — Situation</div>
                            <div style="font-size: 12.5px; color: #1e293b; white-space: pre-line;">${esc(h.sbar_situation)}</div>
                        </div>
                        <div style="background: #f5f3ff; border-left: 4px solid #7c3aed; padding: 8px 12px; border-radius: 0 6px 6px 0;">
                            <div style="font-size: 11px; font-weight: 800; color: #4c1d95; text-transform: uppercase; margin-bottom: 3px;">🟪 B — Background</div>
                            <div style="font-size: 12.5px; color: #1e293b; white-space: pre-line;">${esc(h.sbar_background)}</div>
                        </div>
                        <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 8px 12px; border-radius: 0 6px 6px 0;">
                            <div style="font-size: 11px; font-weight: 800; color: #14532d; text-transform: uppercase; margin-bottom: 3px;">🟩 A — Assessment</div>
                            <div style="font-size: 12.5px; color: #1e293b; white-space: pre-line;">${esc(h.sbar_assessment)}</div>
                        </div>
                        <div style="background: #fffbeb; border-left: 4px solid #d97706; padding: 8px 12px; border-radius: 0 6px 6px 0;">
                            <div style="font-size: 11px; font-weight: 800; color: #78350f; text-transform: uppercase; margin-bottom: 3px;">🟧 R — Recommendation</div>
                            <div style="font-size: 12.5px; color: #1e293b; white-space: pre-line;">${esc(h.sbar_recommendation)}</div>
                        </div>
                    </div>

                    ${safetyPills ? `
                        <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px;">
                            ${safetyPills}
                        </div>
                    ` : ''}

                    <!-- Dual Digital Sign-Off Audit Box -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px;">
                        <!-- Outgoing Nurse Signature -->
                        <div style="border-right: 1px solid #e2e8f0; padding-right: 10px;">
                            <div style="font-size: 10.5px; font-weight: 800; color: #0369a1; text-transform: uppercase;">1. Outgoing Shift Nurse (${esc(h.outgoing_shift)})</div>
                            <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px;">👩‍⚕️ ${esc(h.outgoing_nurse_name)}</div>
                            <div style="font-size: 10.5px; font-family: monospace; color: #0284c7; margin-top: 2px;">🔒 ${esc(h.outgoing_nurse_signature)}</div>
                            <div style="font-size: 10.5px; color: #64748b;">Signed: ${esc(h.outgoing_signed_at || dt)}</div>
                        </div>

                        <!-- Incoming Nurse Signature or Interactive Co-Sign Box -->
                        <div>
                            <div style="font-size: 10.5px; font-weight: 800; color: #15803d; text-transform: uppercase;">2. Incoming Shift Nurse (${esc(h.incoming_shift)})</div>
                            ${isDualSigned ? `
                                <div style="font-size: 13px; font-weight: 700; color: #166534; margin-top: 2px;">👩‍⚕️ ${esc(h.incoming_nurse_name)}</div>
                                <div style="font-size: 10.5px; font-family: monospace; color: #15803d; margin-top: 2px;">🔒 ${esc(h.incoming_nurse_signature)}</div>
                                <div style="font-size: 10.5px; color: #64748b;">Co-Signed: ${esc(h.incoming_signed_at || '--')}</div>
                                ${h.incoming_acknowledgment_notes ? `<div style="font-size: 11px; color: #334155; margin-top: 3px; font-style: italic;">"${esc(h.incoming_acknowledgment_notes)}"</div>` : ''}
                            ` : `
                                <div style="margin-top: 6px; background: #fff; border: 1px solid #86efac; border-radius: 6px; padding: 8px 10px;">
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 6px;">
                                        <input type="text" class="form-control inp-cosign-name" data-handover-id="${h.id}" placeholder="Incoming Nurse Name, RN *" value="${esc(currentUser?.full_name || currentUser?.name || '')}" style="padding: 5px 8px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 4px;" />
                                        <input type="text" class="form-control inp-cosign-notes" data-handover-id="${h.id}" placeholder="Bedside verification remarks..." value="${esc(h.incoming_acknowledgment_notes || '')}" style="padding: 5px 8px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 4px;" />
                                    </div>
                                    <div style="display: flex; justify-content: flex-end; gap: 6px;">
                                        <button type="button" class="btn-inpatient btn-cosign-clarify" data-handover-id="${h.id}" style="padding: 4px 9px; font-size: 11px; background: #fffbeb; color: #b45309; border: 1px solid #fcd34d; cursor: pointer;">⚠️ Request Clarification</button>
                                        <button type="button" class="btn-inpatient btn-cosign-accept" data-handover-id="${h.id}" style="padding: 4px 11px; font-size: 11px; background: #16a34a; color: #fff; border: 1px solid #16a34a; font-weight: 700; cursor: pointer;">✍️ Co-Sign &amp; Accept Shift Handover</button>
                                    </div>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;

        // Wire Incoming Nurse Co-Sign Accept buttons
        container.querySelectorAll('.btn-cosign-accept').forEach(btn => {
            btn.onclick = async () => {
                const hId = btn.getAttribute('data-handover-id');
                const nameInp = container.querySelector(`.inp-cosign-name[data-handover-id="${hId}"]`);
                const notesInp = container.querySelector(`.inp-cosign-notes[data-handover-id="${hId}"]`);
                const incName = nameInp?.value?.trim() || '';

                if (!incName) {
                    showToast('Please enter the Incoming Nurse Full Name & Credentials to digitally co-sign.', 'error');
                    nameInp?.focus();
                    return;
                }

                btn.disabled = true;
                btn.textContent = 'Signing...';
                try {
                    const sRes = await signIncomingShiftHandover({
                        id: hId,
                        incoming_nurse_name: incName,
                        incoming_acknowledgment_notes: notesInp?.value?.trim() || 'Bedside SBAR reviewed and patient accepted for incoming shift.',
                        handover_status: 'Dual-Signed / Completed'
                    });
                    if (sRes && sRes.success) {
                        showToast('Dual Digital Sign-Off completed! Incoming shift nurse updated.', 'success');
                        await loadShiftHandovers(admissionId, activeSbarStatusFilter);
                        await fetchWhiteboard(true);
                    } else {
                        showToast('Co-sign failed: ' + (sRes?.message || 'Error'), 'error');
                        btn.disabled = false;
                        btn.textContent = '✍️ Co-Sign & Accept Shift Handover';
                    }
                } catch (err) {
                    showToast('Co-sign error: ' + err.message, 'error');
                    btn.disabled = false;
                    btn.textContent = '✍️ Co-Sign & Accept Shift Handover';
                }
            };
        });

        // Wire Request Clarification buttons
        container.querySelectorAll('.btn-cosign-clarify').forEach(btn => {
            btn.onclick = async () => {
                const hId = btn.getAttribute('data-handover-id');
                const nameInp = container.querySelector(`.inp-cosign-name[data-handover-id="${hId}"]`);
                const notesInp = container.querySelector(`.inp-cosign-notes[data-handover-id="${hId}"]`);
                const incName = nameInp?.value?.trim() || '';

                if (!incName) {
                    showToast('Please enter Incoming Nurse Name to log clarification request.', 'error');
                    nameInp?.focus();
                    return;
                }

                try {
                    const sRes = await signIncomingShiftHandover({
                        id: hId,
                        incoming_nurse_name: incName,
                        incoming_acknowledgment_notes: notesInp?.value?.trim() || 'Clarification requested at shift change.',
                        handover_status: 'Clarification Requested'
                    });
                    if (sRes && sRes.success) {
                        showToast('Handover flagged for clinical clarification.', 'warning');
                        await loadShiftHandovers(admissionId, activeSbarStatusFilter);
                    }
                } catch (err) {
                    showToast('Error: ' + err.message, 'error');
                }
            };
        });

        // Wire Edit buttons
        container.querySelectorAll('.btn-edit-sbar').forEach(btn => {
            btn.onclick = () => {
                const hId = btn.getAttribute('data-handover-id');
                const target = handovers.find(x => x.id == hId);
                if (target) populateHandoverForEdit(target);
            };
        });

        // Wire Delete buttons
        container.querySelectorAll('.btn-delete-sbar').forEach(btn => {
            btn.onclick = async () => {
                const hId = btn.getAttribute('data-handover-id');
                if (!confirm('Delete this SBAR shift handover record?')) return;
                try {
                    const dRes = await deleteShiftHandover(hId);
                    if (dRes && dRes.success) {
                        showToast('Shift handover record deleted', 'success');
                        await loadShiftHandovers(admissionId, activeSbarStatusFilter);
                    } else {
                        showToast('Delete failed: ' + (dRes?.message || 'Error'), 'error');
                    }
                } catch (err) {
                    showToast('Delete error: ' + err.message, 'error');
                }
            };
        });

    } catch (err) {
        container.innerHTML = `<div style="color: #ef4444; padding: 20px; text-align: center;">Error loading SBAR shift handovers: ${esc(err.message)}</div>`;
    }
}

function populateHandoverForEdit(row) {
    document.getElementById('sbarFormRecordId').value = row.id;
    document.getElementById('sbarFormAdmissionId').value = row.admission_id;
    document.getElementById('sbarFormPatientId').value = row.patient_id || '';

    if (row.handover_datetime) {
        document.getElementById('sbarDateTime').value = row.handover_datetime.replace(' ', 'T').slice(0, 16);
    }
    document.getElementById('sbarShiftTransition').value = row.shift_transition || 'Morning to Afternoon (07:00 → 15:00)';
    document.getElementById('sbarAcuityLevel').value = row.acuity_level || 'Level 2 - Moderate Acuity';
    document.getElementById('sbarFallRisk').value = row.fall_risk_level || 'Low';
    document.getElementById('sbarCodeStatus').value = row.code_status || 'Full Code';
    document.getElementById('sbarIsolation').value = row.isolation_precautions || 'Standard';
    document.getElementById('sbarAllergies').value = row.allergies_summary || 'NKDA';

    document.getElementById('sbarInputSituation').value = row.sbar_situation || '';
    document.getElementById('sbarInputBackground').value = row.sbar_background || '';
    document.getElementById('sbarInputAssessment').value = row.sbar_assessment || '';
    document.getElementById('sbarInputRecommendation').value = row.sbar_recommendation || '';

    document.getElementById('sbarOutgoingNurseName').value = row.outgoing_nurse_name || '';
    document.getElementById('sbarIncomingNurseName').value = row.incoming_nurse_name || '';
    document.getElementById('sbarIncomingNotes').value = row.incoming_acknowledgment_notes || '';

    const safetySet = new Set(Array.isArray(row.safety_checks) ? row.safety_checks : []);
    document.querySelectorAll('#formShiftHandover .sbar-safety-chk').forEach(chk => {
        chk.checked = safetySet.size === 0 ? true : safetySet.has(chk.value);
    });

    const submitBtn = document.getElementById('btnSubmitSbarForm');
    if (submitBtn) submitBtn.textContent = `💾 Update SBAR Handover (${row.handover_number || '#' + row.id})`;

    const tabNew = document.getElementById('tabBtnSbarNew');
    if (tabNew) tabNew.click();
}
