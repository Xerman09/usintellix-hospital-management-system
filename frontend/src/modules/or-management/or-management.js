import { api } from '../../core/api.js?v=10';
import { populatePatientSelector, calculateAgeFromDob } from '../../core/patient-chart-helper.js?v=42';
import { systemNow, todayISO, toDateInput } from "../../core/timezone.js?v=3";
import { showToast } from "../../core/toast.js";
import { openOrCase } from "../or-board/or-case-panel.js?v=7";

let currentScheduleData = {
    cases: [],
    suites: [],
    kpis: {},
    specialties: [],
    surgeons: []
};

// Specializations, surgery types and staff for booking (GET /or-management/options).
let bookingOptions = { specializations: [], surgeries: [], doctors: [], staff: [] };

let clockIntervalId = null;
let autoRefreshIntervalId = null;
let activeViewMode = 'whiteboard'; // 'whiteboard' | 'table'

export async function initOrManagement() {
    setupLiveClock();
    setupEventListeners();
    setupPatientPicker();
    setupBookingPickers();
    setDefaultDate();
    await fetchSchedule();
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

function getInitials(name) {
    if (!name) return 'PT';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function setDefaultDate() {
    const dateInput = document.getElementById('orFilterDate');
    if (dateInput && !dateInput.value) {
        const today = todayISO();
        dateInput.value = today;
    }
    updateDateDisplay();
}

function updateDateDisplay() {
    const dateInput = document.getElementById('orFilterDate');
    const dateStrEl = document.getElementById('orLiveDateStr');
    if (!dateStrEl) return;

    let targetDate = systemNow();
    if (dateInput && dateInput.value) {
        const [y, m, d] = dateInput.value.split('-').map(Number);
        targetDate = new Date(y, m - 1, d);
    }
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    dateStrEl.textContent = targetDate.toLocaleDateString('en-US', options);
}

function setupLiveClock() {
    if (clockIntervalId) clearInterval(clockIntervalId);
    
    function updateClock() {
        const clockEl = document.getElementById('orLiveClock');
        if (!clockEl) return;
        const now = systemNow();
        const hrs = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const sec = String(now.getSeconds()).padStart(2, '0');
        clockEl.textContent = `${hrs}:${min}:${sec}`;
    }

    updateClock();
    clockIntervalId = setInterval(updateClock, 1000);
}

function setupAutoRefresh() {
    if (autoRefreshIntervalId) clearInterval(autoRefreshIntervalId);
    autoRefreshIntervalId = setInterval(() => {
        // Only auto refresh if no modal is currently open
        const anyModalOpen = document.querySelector('.or-modal-overlay[style*="display: flex"], .or-modal-overlay[style*="display: block"]');
        if (!anyModalOpen && document.getElementById('orWrapper')) {
            fetchSchedule(true);
        }
    }, 30000);
}

function setupPatientPicker() {
    const sel = document.getElementById('orFPatientSelect');
    if (!sel) return;

    populatePatientSelector(sel, (p, isManual) => {
        const idEl   = document.getElementById('orFPatientId');
        const nameEl = document.getElementById('orFPatientName');
        const mrnEl  = document.getElementById('orFPatientMrn');
        const ageEl  = document.getElementById('orFPatientAge');
        const genEl  = document.getElementById('orFGender');

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
    // Date navigation
    const dateInput = document.getElementById('orFilterDate');
    const prevBtn = document.getElementById('orDatePrevBtn');
    const todayBtn = document.getElementById('orDateTodayBtn');
    const nextBtn = document.getElementById('orDateNextBtn');

    if (dateInput) {
        dateInput.addEventListener('change', () => {
            updateDateDisplay();
            fetchSchedule();
        });
    }

    if (prevBtn && dateInput) {
        prevBtn.addEventListener('click', () => {
            const cur = dateInput.value ? new Date(`${dateInput.value}T00:00:00`) : systemNow();
            cur.setDate(cur.getDate() - 1);
            dateInput.value = toDateInput(cur);
            updateDateDisplay();
            fetchSchedule();
        });
    }

    if (todayBtn && dateInput) {
        todayBtn.addEventListener('click', () => {
            dateInput.value = todayISO();
            updateDateDisplay();
            fetchSchedule();
        });
    }

    if (nextBtn && dateInput) {
        nextBtn.addEventListener('click', () => {
            const cur = dateInput.value ? new Date(`${dateInput.value}T00:00:00`) : systemNow();
            cur.setDate(cur.getDate() + 1);
            dateInput.value = toDateInput(cur);
            updateDateDisplay();
            fetchSchedule();
        });
    }

    // Theater / Fullscreen Mode Toggle
    const fullBtn = document.getElementById('orFullscreenBtn');
    const wrapper = document.getElementById('orWrapper');
    if (fullBtn && wrapper) {
        fullBtn.addEventListener('click', () => {
            const isFull = wrapper.classList.toggle('or-fullscreen');
            fullBtn.innerHTML = isFull ? '<span>&#x2715;</span> Exit Theater' : '<span>&#x26F6;</span> Theater Mode';
        });
    }

    // Search Box and Clear Button
    const searchInput = document.getElementById('orSearchInput');
    const searchClear = document.getElementById('orSearchClearBtn');
    if (searchInput && searchClear) {
        searchInput.addEventListener('input', () => {
            searchClear.style.display = searchInput.value ? 'block' : 'none';
            renderFilteredViews();
        });
        searchClear.addEventListener('click', () => {
            searchInput.value = '';
            searchClear.style.display = 'none';
            searchInput.focus();
            renderFilteredViews();
        });
    }

    // Filters
    const suiteFilter = document.getElementById('orSuiteFilter');
    if (suiteFilter) suiteFilter.addEventListener('change', () => renderFilteredViews());

    const specialtyFilter = document.getElementById('orSpecialtyFilter');
    if (specialtyFilter) specialtyFilter.addEventListener('change', () => renderFilteredViews());

    const priorityFilter = document.getElementById('orPriorityFilter');
    if (priorityFilter) priorityFilter.addEventListener('change', () => renderFilteredViews());

    const stageFilter = document.getElementById('orStageFilter');
    if (stageFilter) stageFilter.addEventListener('change', () => renderFilteredViews());

    const resetBtn = document.getElementById('orResetFilterBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (suiteFilter) suiteFilter.value = 'all';
            if (specialtyFilter) specialtyFilter.value = 'all';
            if (priorityFilter) priorityFilter.value = 'all';
            if (stageFilter) stageFilter.value = 'all';
            if (searchInput) {
                searchInput.value = '';
                if (searchClear) searchClear.style.display = 'none';
            }
            setDefaultDate();
            fetchSchedule();
        });
    }

    // View Switcher
    const whiteboardBtn = document.getElementById('orViewWhiteboardBtn');
    const tableBtn = document.getElementById('orViewTableBtn');
    const wbContainer = document.getElementById('orWhiteboardContainer');
    const tblContainer = document.getElementById('orTableContainer');

    if (whiteboardBtn && tableBtn) {
        whiteboardBtn.addEventListener('click', () => {
            activeViewMode = 'whiteboard';
            whiteboardBtn.classList.add('active');
            tableBtn.classList.remove('active');
            if (wbContainer) wbContainer.style.display = 'block';
            if (tblContainer) tblContainer.style.display = 'none';
        });

        tableBtn.addEventListener('click', () => {
            activeViewMode = 'table';
            tableBtn.classList.add('active');
            whiteboardBtn.classList.remove('active');
            if (wbContainer) wbContainer.style.display = 'none';
            if (tblContainer) tblContainer.style.display = 'block';
        });
    }

    // Print
    const printBtn = document.getElementById('orPrintBtn');
    if (printBtn) printBtn.addEventListener('click', () => window.print());

    // Book Case Modal Triggers
    const bookBtn = document.getElementById('orBookCaseBtn');
    const bookModal = document.getElementById('orBookModal');
    const closeBookX = document.getElementById('orCloseBookModal');
    const cancelBookBtn = document.getElementById('orCancelBookBtn');
    const bookForm = document.getElementById('orBookForm');

    const openBookModal = async (preselectedSuiteId = null) => {
        const curDate = document.getElementById('orFilterDate')?.value || todayISO();
        const fDate = document.getElementById('orFDate');
        if (fDate) fDate.value = curDate;
        populateSuiteSelect('orFSuiteId', preselectedSuiteId);
        clearBookErrors();
        await loadBookingOptions();
        if (bookModal) bookModal.style.display = 'flex';
    };

    if (bookBtn && bookModal) {
        bookBtn.addEventListener('click', () => openBookModal());
    }

    const closeBook = () => { if (bookModal) bookModal.style.display = 'none'; };
    if (closeBookX) closeBookX.addEventListener('click', closeBook);
    if (cancelBookBtn) cancelBookBtn.addEventListener('click', closeBook);
    if (bookModal) bookModal.addEventListener('click', (e) => { if (e.target === bookModal) closeBook(); });

    if (bookForm) bookForm.addEventListener('submit', handleBookSubmit);

    // Stage Transition Modal Triggers
    const stageModal = document.getElementById('orStageModal');
    const closeStageX = document.getElementById('orCloseStageModal');
    const cancelStageBtn = document.getElementById('orCancelStageBtn');
    const stageForm = document.getElementById('orStageForm');
    const stageSelect = document.getElementById('orStageSelect');

    const closeStage = () => { if (stageModal) stageModal.style.display = 'none'; };
    if (closeStageX) closeStageX.addEventListener('click', closeStage);
    if (cancelStageBtn) cancelStageBtn.addEventListener('click', closeStage);
    if (stageModal) stageModal.addEventListener('click', (e) => { if (e.target === stageModal) closeStage(); });

    if (stageSelect) {
        stageSelect.addEventListener('change', () => {
            toggleStageSpecificFields(stageSelect.value);
        });
    }

    if (stageForm) stageForm.addEventListener('submit', handleStageSubmit);

    // Detail Modal Triggers
    const detailModal = document.getElementById('orDetailModal');
    const closeDetailX = document.getElementById('orCloseDetailModal');
    const closeDetailBtn = document.getElementById('orCloseDetailBtn');
    const closeDetail = () => { if (detailModal) detailModal.style.display = 'none'; };
    if (closeDetailX) closeDetailX.addEventListener('click', closeDetail);
    if (closeDetailBtn) closeDetailBtn.addEventListener('click', closeDetail);
    if (detailModal) detailModal.addEventListener('click', (e) => { if (e.target === detailModal) closeDetail(); });

    // Suite Status Modal Triggers
    const suiteBtn = document.getElementById('orSuiteStatusBtn');
    const suiteModal = document.getElementById('orSuiteModal');
    const closeSuiteX = document.getElementById('orCloseSuiteModal');
    const closeSuiteBtn = document.getElementById('orCloseSuiteBtn');
    const openSuiteModal = () => {
        renderSuiteStatusList();
        if (suiteModal) suiteModal.style.display = 'flex';
    };
    const closeSuite = () => { if (suiteModal) suiteModal.style.display = 'none'; };

    if (suiteBtn) suiteBtn.addEventListener('click', openSuiteModal);
    if (closeSuiteX) closeSuiteX.addEventListener('click', closeSuite);
    if (closeSuiteBtn) closeSuiteBtn.addEventListener('click', closeSuite);
    if (suiteModal) suiteModal.addEventListener('click', (e) => { if (e.target === suiteModal) closeSuite(); });

    // Register OR Suite Modal Triggers
    const regSuiteBtn = document.getElementById('orRegisterSuiteBtn');
    const regSuiteModal = document.getElementById('orRegisterSuiteModal');
    const closeRegSuiteX = document.getElementById('orCloseRegSuiteModal');
    const cancelRegSuiteBtn = document.getElementById('orCancelRegSuiteBtn');
    const closeRegListBtn = document.getElementById('orCloseRegSuiteListBtn');
    const regSuiteForm = document.getElementById('orRegisterSuiteForm');

    const openRegSuiteModal = () => {
        resetRegSuiteForm();
        switchRegSuiteTab('new');
        if (regSuiteModal) regSuiteModal.style.display = 'flex';
    };
    const closeRegSuite = () => { if (regSuiteModal) regSuiteModal.style.display = 'none'; };

    if (regSuiteBtn) regSuiteBtn.addEventListener('click', openRegSuiteModal);
    if (closeRegSuiteX) closeRegSuiteX.addEventListener('click', closeRegSuite);
    if (cancelRegSuiteBtn) cancelRegSuiteBtn.addEventListener('click', closeRegSuite);
    if (closeRegListBtn) closeRegListBtn.addEventListener('click', closeRegSuite);
    if (regSuiteModal) regSuiteModal.addEventListener('click', (e) => { if (e.target === regSuiteModal) closeRegSuite(); });

    const tabNew = document.getElementById('orTabRegSuiteNew');
    const tabList = document.getElementById('orTabRegSuiteList');
    if (tabNew) tabNew.addEventListener('click', () => switchRegSuiteTab('new'));
    if (tabList) tabList.addEventListener('click', () => switchRegSuiteTab('list'));

    if (regSuiteForm) regSuiteForm.addEventListener('submit', handleRegisterSuiteSubmit);

    // Electronic Anesthesia Record Modal Triggers
    setupAnesthesiaModal();
    // Surgical Sponge, Sharps & Needle Count Reconciliation Modal Triggers
    setupSpongeCountModal();

    // Expose global helpers
    // Details and Advance open the case record (stages in order, WHO checklist, intra-op record).
    window.__orOpenDetail = (id) => openOrCase(Number(id), { onChange: () => fetchSchedule(true) });
    window.__orOpenStage = (id) => openOrCase(Number(id), { onChange: () => fetchSchedule(true) });
    window.__orOpenAnesthesia = (id) => openAnesthesiaModal(Number(id));
    window.__orOpenSpongeCount = (id) => openSpongeCountModal(Number(id));
    window.__orOpenSuiteStatus = openSuiteModal;
    window.__orOpenBookForSuite = openBookModal;
    window.__orOpenRegisterSuite = openRegSuiteModal;
    window.__orEditSuite = editSuiteRecord;
}

function toggleStageSpecificFields(stage) {
    const pacuFields = document.getElementById('orStagePacuFields');
    const dischFields = document.getElementById('orStageDischargeFields');
    const cancelFields = document.getElementById('orStageCancelFields');

    if (pacuFields) pacuFields.style.display = (stage === 'In PACU') ? 'block' : 'none';
    if (dischFields) dischFields.style.display = (stage === 'Transferred / Discharged') ? 'block' : 'none';
    if (cancelFields) cancelFields.style.display = (stage === 'Cancelled') ? 'block' : 'none';
}

async function fetchSchedule(silent = false) {
    const dateInput = document.getElementById('orFilterDate');
    const selectedDate = dateInput ? dateInput.value : '';

    if (!silent) {
        const suitesGrid = document.getElementById('orSuitesGrid');
        if (suitesGrid && !suitesGrid.children.length) {
            suitesGrid.innerHTML = '<div style="padding: 30px; text-align: center; color: #64748b; font-style: italic; grid-column: 1 / -1;">Loading Operating Room Suites...</div>';
        }
    }

    try {
        const res = await api(`/or-management/schedule?date=${encodeURIComponent(selectedDate)}`);
        if (res.success && res.data) {
            currentScheduleData = res.data;
            updateKpis(res.data.kpis);
            renderSuitesGrid(res.data.suites || []);
            populateSuiteFilterDropdown(res.data.suites || []);
            populateSpecialtyFilterDropdown(res.data.specialties || []);
            renderFilteredViews();
        } else {
            console.error('Failed to fetch OR schedule:', res.message);
        }
    } catch (err) {
        console.error('Error fetching OR schedule:', err);
    }
}

function updateKpis(kpis = {}) {
    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = (val !== null && val !== undefined) ? val : '--';
    };

    set('orKpiTotalCases', kpis.total_cases ?? 0);
    const elecEl = document.getElementById('orKpiElectiveCount');
    if (elecEl) elecEl.textContent = `${kpis.elective_cases ?? 0} elective booked`;

    set('orKpiInProgress', kpis.in_progress ?? 0);
    set('orKpiInPacu', kpis.in_pacu ?? 0);
    set('orKpiUtilization', `${kpis.utilization_rate ?? 0}%`);
    set('orKpiTurnover', `${kpis.avg_turnover_minutes ?? 0} min`);
    set('orKpiUrgent', kpis.urgent_emergency ?? 0);
}

function renderSuitesGrid(suites) {
    const grid = document.getElementById('orSuitesGrid');
    if (!grid) return;

    if (!suites.length) {
        grid.innerHTML = '<div style="padding: 20px; text-align: center; color: #64748b; grid-column: 1 / -1;">No OR suites configured.</div>';
        return;
    }

    grid.innerHTML = suites.map(s => {
        const isSurgery = s.status === 'In Surgery';
        const isTurnover = s.status === 'Cleaning / Turnover';
        const isAvail = s.status === 'Available';
        const isMaint = s.status === 'Maintenance';

        let cardStatusClass = 'status-available';
        let badgeClass = 'available';
        let badgeIcon = '&#10003;';
        if (isSurgery) {
            cardStatusClass = 'status-in-surgery';
            badgeClass = 'in-surgery';
            badgeIcon = '<span class="or-pulse-dot"></span>';
        } else if (isTurnover) {
            cardStatusClass = 'status-turnover';
            badgeClass = 'turnover';
            badgeIcon = '&#129529;';
        } else if (isMaint) {
            cardStatusClass = 'status-maintenance';
            badgeClass = 'maintenance';
            badgeIcon = '&#9888;';
        }

        // Active Case Content
        let activeBoxHtml = '';
        let actionButtonsHtml = '';

        if (isSurgery && s.active_case) {
            const ac = s.active_case;
            let elapsedMin = 0;
            if (ac.actual_incision_time) {
                elapsedMin = Math.max(0, Math.floor((systemNow() - new Date(ac.actual_incision_time)) / 60000));
            } else if (ac.actual_in_room_time) {
                elapsedMin = Math.max(0, Math.floor((systemNow() - new Date(ac.actual_in_room_time)) / 60000));
            }
            const estMin = 120; // default estimated
            const pct = Math.min(100, Math.round((elapsedMin / estMin) * 100));

            activeBoxHtml = `
                <div class="or-suite-active-box surgery">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                        <span style="font-size:11px;font-weight:700;color:#ef4444;text-transform:uppercase;">
                            &#9889; ${esc(ac.perioperative_stage || 'In Surgery')}
                        </span>
                        <span style="font-family:monospace;font-size:11px;font-weight:700;color:#0284c7;">
                            ${esc(ac.case_number)}
                        </span>
                    </div>
                    <div style="font-weight:700;font-size:13px;color:#0f172a;line-height:1.2;margin-bottom:4px;">
                        ${esc(ac.procedure_name)}
                    </div>
                    <div style="font-size:12px;color:#475569;margin-bottom:4px;">
                        <a href="javascript:void(0)" onclick="window.__openPatientChartFromReport('${esc(ac.patient_mrn)}')" style="color:#0284c7;font-weight:700;text-decoration:none;" title="Open EHR Patient Chart">
                            &#128100; ${esc(ac.patient_name)}
                        </a>
                        <small style="color:#64748b;">(${esc(ac.patient_mrn)})</small>
                    </div>
                    <div style="font-size:11px;color:#64748b;display:flex;justify-content:space-between;align-items:center;">
                        <span>Surgeon: <strong style="color:#334155;">${esc(ac.lead_surgeon)}</strong></span>
                        <span style="font-weight:700;color:#ef4444;">⏱ ${elapsedMin}m elapsed</span>
                    </div>
                    <div class="or-suite-progress-track">
                        <div class="or-suite-progress-fill" style="width: ${pct}%;"></div>
                    </div>
                </div>
            `;

            actionButtonsHtml = `
                <button type="button" class="or-btn-view" onclick="window.__orOpenDetail(${s.current_case_id})" style="padding:4px 9px;font-size:11px;">
                    Case Details
                </button>
                <button type="button" class="or-btn-view" onclick="window.__orOpenAnesthesia(${s.current_case_id})" style="padding:4px 9px;font-size:11px;background:#f5f3ff;color:#6d28d9;border-color:#ddd6fe;" title="Open Electronic Anesthesia Record">
                    &#128137; Anesthesia
                </button>
                <button type="button" class="or-btn-view" onclick="window.__orOpenSpongeCount(${s.current_case_id})" style="padding:4px 9px;font-size:11px;background:#f0fdfa;color:#0f766e;border-color:#99f6e4;" title="Open Sponge, Sharps &amp; Needle Count Reconciliation">
                    &#129527; Counts
                </button>
                <button type="button" class="or-btn-advance" onclick="window.__orOpenStage(${s.current_case_id}, '${esc(ac.perioperative_stage)}')" style="padding:4px 10px;font-size:11px;">
                    Advance &rarr;
                </button>
            `;
        } else if (isTurnover) {
            let elMin = 0;
            if (s.turnover_started_at) {
                elMin = Math.max(0, Math.floor((systemNow() - new Date(s.turnover_started_at)) / 60000));
            }
            activeBoxHtml = `
                <div class="or-suite-active-box turnover">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;">
                            &#129529; Room Turnover in Progress
                        </span>
                        <span style="font-weight:700;color:#d97706;font-size:11px;">${elMin}m elapsed</span>
                    </div>
                    <div style="font-size:11px;color:#78350f;margin-top:4px;">
                        Environmental cleaning and terminal disinfection underway.
                    </div>
                </div>
            `;
            actionButtonsHtml = `
                <button type="button" onclick="window.__orQuickReady(${s.id})" class="or-btn-primary" style="background:linear-gradient(135deg, #10b981, #059669);font-size:11px;padding:4px 10px;">
                    &#10003; Mark Sterile &amp; Ready
                </button>
            `;
        } else if (isAvail) {
            activeBoxHtml = `
                <div class="or-suite-active-box available">
                    <div style="font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;">
                        &#10003; Sterile &amp; Available
                    </div>
                    <div style="font-size:11px;color:#15803d;margin-top:2px;">
                        Terminal sanitation verified. Ready for patient induction.
                    </div>
                </div>
            `;
            actionButtonsHtml = `
                <button type="button" onclick="window.__orOpenBookForSuite(${s.id})" class="or-btn-primary" style="font-size:11px;padding:4px 10px;">
                    + Book Case in this OR
                </button>
            `;
        } else {
            activeBoxHtml = `
                <div class="or-suite-active-box maintenance">
                    <div style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;">
                        &#9888; Maintenance Hold
                    </div>
                    <div style="font-size:11px;color:#64748b;margin-top:2px;">
                        Biomedical engineering / HVAC inspection in progress.
                    </div>
                </div>
            `;
            actionButtonsHtml = `
                <button type="button" onclick="window.__orQuickReady(${s.id})" class="or-btn-secondary" style="font-size:11px;padding:4px 8px;">
                    Clear Hold
                </button>
            `;
        }

        // Next Case Snippet
        let nextCaseHtml = '';
        if (s.next_case) {
            nextCaseHtml = `
                <div class="or-suite-next-box">
                    <span style="font-weight:700;color:#0284c7;">Next Up:</span>
                    <strong style="color:#0f172a;">${esc(s.next_case.scheduled_start_time?.substring(0, 5) || '')}</strong>
                    <span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(s.next_case.procedure_name)}</span>
                </div>
            `;
        }

        return `
            <div class="or-suite-card ${cardStatusClass}">
                <div>
                    <div class="or-suite-top">
                        <div>
                            <span class="or-suite-code">${esc(s.suite_code)}</span>
                            <div class="or-suite-name">${esc(s.suite_name)}</div>
                            <div class="or-suite-floor">${esc(s.floor_location || 'OR Wing')} &bull; ${esc(s.specialty_capabilities || 'General')}</div>
                        </div>
                        <div class="or-suite-status-badge ${badgeClass}">
                            ${badgeIcon}
                            <span>${esc(s.status)}</span>
                        </div>
                    </div>
                    ${activeBoxHtml}
                    ${nextCaseHtml}
                </div>
                <div style="margin-top:12px;padding-top:10px;border-top:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;">
                    <button type="button" onclick="window.__orOpenSuiteStatus()" style="background:none;border:none;font-size:11px;color:#64748b;cursor:pointer;font-weight:600;padding:0;">
                        &#9881; Room State
                    </button>
                    <div style="display:flex;gap:6px;">
                        ${actionButtonsHtml}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    window.__orQuickReady = async (suiteId) => {
        try {
            const res = await api('/or-management/suites/status', {
                method: 'POST',
                body: JSON.stringify({ suite_id: suiteId, status: 'Available' })
            });
            if (res.success) {
                fetchSchedule(true);
            } else {
                showToast(res.message || 'Could not update the room.', 'error');
            }
        } catch (err) {
            console.error(err);
        }
    };
}

function populateSuiteFilterDropdown(suites) {
    const filter = document.getElementById('orSuiteFilter');
    if (!filter) return;
    const curVal = filter.value;
    filter.innerHTML = '<option value="all">All OR Suites</option>' +
        suites.map(s => `<option value="${s.id}">${esc(s.suite_code)} - ${esc(s.suite_name)}</option>`).join('');
    if (curVal) filter.value = curVal;
}

function populateSpecialtyFilterDropdown(specialties) {
    const filter = document.getElementById('orSpecialtyFilter');
    if (!filter) return;
    const curVal = filter.value;
    filter.innerHTML = '<option value="all">All Specialties</option>' +
        specialties.map(sp => `<option value="${esc(sp)}">${esc(sp)}</option>`).join('');
    if (curVal) filter.value = curVal;
}

function populateSuiteSelect(selectId, preselectedId = null) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const suites = currentScheduleData.suites || [];
    sel.innerHTML = '<option value="">-- Select OR Suite --</option>' +
        suites.map(s => `<option value="${s.id}">${esc(s.suite_code)} &mdash; ${esc(s.suite_name)} (${esc(s.status)})</option>`).join('');
    if (preselectedId) sel.value = preselectedId;
}

function renderFilteredViews() {
    const cases = currentScheduleData.cases || [];
    
    const suiteFilter = document.getElementById('orSuiteFilter')?.value || 'all';
    const specialtyFilter = document.getElementById('orSpecialtyFilter')?.value || 'all';
    const priorityFilter = document.getElementById('orPriorityFilter')?.value || 'all';
    const stageFilter = document.getElementById('orStageFilter')?.value || 'all';
    const searchVal = (document.getElementById('orSearchInput')?.value || '').toLowerCase().trim();

    const filtered = cases.filter(c => {
        if (suiteFilter !== 'all' && String(c.or_suite_id) !== String(suiteFilter)) return false;
        if (specialtyFilter !== 'all' && c.surgical_specialty !== specialtyFilter) return false;
        if (priorityFilter !== 'all' && c.case_priority !== priorityFilter) return false;
        if (stageFilter !== 'all' && c.perioperative_stage !== stageFilter) return false;
        if (searchVal) {
            const haystack = [
                c.case_number,
                c.patient_name,
                c.patient_mrn,
                c.procedure_name,
                c.lead_surgeon,
                c.anesthesiologist,
                c.or_suite_name
            ].filter(Boolean).join(' ').toLowerCase();
            if (!haystack.includes(searchVal)) return false;
        }
        return true;
    });

    renderWhiteboardKanban(filtered);
    renderScheduleTable(filtered);
}

function renderWhiteboardKanban(cases) {
    const columns = {
        'Scheduled':             document.getElementById('orColScheduled'),
        'Pre-Op Holding':        document.getElementById('orColPreOp'),
        'In Room / Induction':   document.getElementById('orColInRoom'),
        'Incision / In Progress':document.getElementById('orColIncision'),
        'In PACU':               document.getElementById('orColPACU'),
        'Transferred / Discharged': document.getElementById('orColDone'),
    };

    const counts = {
        'Scheduled':             document.getElementById('orCountScheduled'),
        'Pre-Op Holding':        document.getElementById('orCountPreOp'),
        'In Room / Induction':   document.getElementById('orCountInRoom'),
        'Incision / In Progress':document.getElementById('orCountIncision'),
        'In PACU':               document.getElementById('orCountPACU'),
        'Transferred / Discharged': document.getElementById('orCountDone'),
    };

    // Reset columns
    Object.keys(columns).forEach(k => {
        if (columns[k]) columns[k].innerHTML = '';
        if (counts[k]) counts[k].textContent = '0';
    });

    const colGroups = {
        'Scheduled': [],
        'Pre-Op Holding': [],
        'In Room / Induction': [],
        'Incision / In Progress': [],
        'In PACU': [],
        'Transferred / Discharged': []
    };

    cases.forEach(c => {
        let stage = c.perioperative_stage;
        if (stage === 'Closing / Extubation') stage = 'Incision / In Progress';
        if (colGroups[stage]) {
            colGroups[stage].push(c);
        } else if (stage === 'Transferred / Discharged' || stage === 'Cancelled') {
            colGroups['Transferred / Discharged'].push(c);
        }
    });

    Object.keys(colGroups).forEach(stageKey => {
        const colEl = columns[stageKey];
        const countEl = counts[stageKey];
        const list = colGroups[stageKey];

        if (countEl) countEl.textContent = list.length;
        if (!colEl) return;

        if (!list.length) {
            colEl.innerHTML = '<div style="padding: 24px 10px; text-align: center; color: #94a3b8; font-size: 11px; font-style: italic;">No cases in this stage</div>';
            return;
        }

        colEl.innerHTML = list.map(c => {
            let priorityClass = 'priority-elective';
            let priorityChip = 'or-chip-blue';
            if (c.case_priority === 'Emergency / STAT') {
                priorityClass = 'priority-emergency';
                priorityChip = 'or-chip-red';
            } else if (c.case_priority === 'Urgent') {
                priorityClass = 'priority-urgent';
                priorityChip = 'or-chip-amber';
            }

            const startTime = c.scheduled_start_time ? c.scheduled_start_time.substring(0, 5) : '--:--';
            const duration = c.estimated_duration_minutes ? `${c.estimated_duration_minutes}m` : '';

            // Readiness badge
            let readyChip = '';
            if (c.preop_cleared && c.consent_signed) {
                readyChip = '<span class="or-chip or-chip-green" title="Consent Signed &amp; Pre-Op Clearance Complete">&#10003; Ready</span>';
            } else {
                readyChip = '<span class="or-chip or-chip-amber" title="Readiness Clearance Incomplete">&#9888; Cleared?</span>';
            }

            // Elapsed time indicator for active surgery
            let liveTimerChip = '';
            if (c.perioperative_stage === 'Incision / In Progress' && c.actual_incision_time) {
                const el = Math.max(0, Math.floor((systemNow() - new Date(c.actual_incision_time)) / 60000));
                liveTimerChip = `<span class="or-chip or-chip-red" style="animation: orPulse 1.5s infinite;">⏱ ${el}m incised</span>`;
            } else if (c.perioperative_stage === 'In PACU' && c.actual_out_room_time) {
                const el = Math.max(0, Math.floor((systemNow() - new Date(c.actual_out_room_time)) / 60000));
                liveTimerChip = `<span class="or-chip or-chip-purple">⏱ ${el}m PACU</span>`;
            }

            const initials = getInitials(c.patient_name);

            let anesChip = '';
            if (c.anesthesia_record) {
                const ar = c.anesthesia_record;
                const asaTxt = `${ar.asa_status || 'ASA II'}${Number(ar.asa_emergency_modifier) ? '-E' : ''}`;
                anesChip = `<span class="or-chip or-chip-purple" title="Electronic Anesthesia Record: ${esc(asaTxt)} &bull; Mallampati ${esc(ar.mallampati_class || 'Class I')} &bull; Aldrete ${ar.aldrete_total_score ?? 10}/10">&#128137; ${esc(asaTxt)} &bull; M-${esc((ar.mallampati_class || 'I').replace('Class ', ''))}</span>`;
            }

            let countChip = '';
            if (c.sponge_count_record) {
                const cr = c.sponge_count_record;
                if (Number(cr.has_discrepancy)) {
                    countChip = `<span class="or-chip or-chip-red" title="Sponge/Needle Count Discrepancy">${esc('🚨 Count Discrepancy')}</span>`;
                } else if (cr.overall_reconciliation_status === 'All Counts Correct & Dual-Signed') {
                    countChip = `<span class="or-chip or-chip-green" title="Sponge, Sharps &amp; Needle Counts Reconciled &amp; Dual-Signed">&#129527; Counts Dual-Signed</span>`;
                } else {
                    countChip = `<span class="or-chip or-chip-amber" title="Sponge &amp; Needle Count In Progress">&#129527; Count In Progress</span>`;
                }
            }

            return `
                <div class="or-case-card ${priorityClass}">
                    <div class="or-card-header">
                        <span class="or-card-num" onclick="window.__orOpenDetail(${c.id})" style="cursor:pointer;" title="View Details">${esc(c.case_number)}</span>
                        <span class="or-card-suite">${esc(c.suite_code || c.or_suite_name || 'OR')} &bull; ${startTime}</span>
                    </div>
                    
                    <div class="or-card-patient-row">
                        <div class="or-avatar-pill">${initials}</div>
                        <div>
                            <div class="or-card-patient-name">
                                <a href="javascript:void(0)" onclick="window.__openPatientChartFromReport('${esc(c.patient_mrn)}')" style="color:inherit;text-decoration:none;" title="Open EHR Patient Chart">
                                    ${esc(c.patient_name)}
                                </a>
                            </div>
                            <div class="or-card-patient-meta">
                                ${esc(c.patient_mrn || '')} ${c.patient_age ? `&bull; ${c.patient_age}y` : ''} ${c.gender ? `/${c.gender[0]}` : ''}
                            </div>
                        </div>
                    </div>

                    <div class="or-card-proc" title="${esc(c.procedure_name)}">${esc(c.procedure_name)}</div>
                    <div class="or-card-surgeon">&#129658; <strong>${esc(c.lead_surgeon)}</strong></div>
                    
                    <div class="or-card-chips">
                        <span class="or-chip ${priorityChip}">${esc(c.case_priority)}</span>
                        <span class="or-chip or-chip-blue">${esc(c.surgical_specialty)}</span>
                        ${readyChip}
                        ${anesChip}
                        ${countChip}
                        ${liveTimerChip}
                    </div>

                    <div class="or-card-actions">
                        <button type="button" class="or-btn-view" onclick="window.__orOpenDetail(${c.id})">Details</button>
                        <button type="button" class="or-btn-view" onclick="window.__orOpenAnesthesia(${c.id})" style="background:#f5f3ff;color:#6d28d9;border-color:#ddd6fe;" title="Electronic Anesthesia Record">&#128137; Anesthesia</button>
                        <button type="button" class="or-btn-view" onclick="window.__orOpenSpongeCount(${c.id})" style="background:#f0fdfa;color:#0f766e;border-color:#99f6e4;" title="Surgical Sponge, Sharps &amp; Needle Count Reconciliation">&#129527; Counts</button>
                        <button type="button" class="or-btn-advance" onclick="window.__orOpenStage(${c.id}, '${esc(c.perioperative_stage)}')">Advance &rarr;</button>
                    </div>
                </div>
            `;
        }).join('');
    });
}

function renderScheduleTable(cases) {
    const tbody = document.getElementById('orTableBody');
    if (!tbody) return;

    if (!cases.length) {
        tbody.innerHTML = '<tr><td colspan="11" style="padding: 30px; text-align: center; color: #64748b;">No surgical cases matching criteria.</td></tr>';
        return;
    }

    const stagesList = [
        'Scheduled',
        'Pre-Op Holding',
        'In Room / Induction',
        'Incision / In Progress',
        'In PACU',
        'Transferred / Discharged'
    ];

    tbody.innerHTML = cases.map(c => {
        let pColor = '#0284c7';
        let pBg = '#e0f2fe';
        if (c.case_priority === 'Emergency / STAT') { pColor = '#991b1b'; pBg = '#fee2e2'; }
        else if (c.case_priority === 'Urgent') { pColor = '#92400e'; pBg = '#fef3c7'; }

        const priorityBadge = `<span style="font-size:10px;font-weight:700;padding:3px 8px;border-radius:12px;background:${pBg};color:${pColor};">${esc(c.case_priority)}</span>`;

        const curStageIdx = stagesList.indexOf(c.perioperative_stage);
        const dotsHtml = stagesList.map((st, i) => {
            let cls = '';
            if (i < curStageIdx) cls = 'done';
            else if (i === curStageIdx) cls = 'active';
            return `<span class="or-stepper-dot ${cls}" title="${st}"></span>`;
        }).join('');

        const readinessIcons = [
            c.preop_cleared ? '<span title="Clearance Complete" style="color:#16a34a;font-weight:700;">&#10003;Cl</span>' : '<span title="Clearance Pending" style="color:#dc2626;font-weight:700;">&#10007;Cl</span>',
            c.consent_signed ? '<span title="Consent Signed" style="color:#16a34a;font-weight:700;">&#10003;Co</span>' : '<span title="Consent Pending" style="color:#dc2626;font-weight:700;">&#10007;Co</span>',
            c.blood_reserved ? '<span title="Blood Bank Reserved" style="color:#dc2626;font-weight:700;">&#129656;</span>' : '',
            c.implants_required ? '<span title="Implants Verified" style="color:#0284c7;font-weight:700;">&#128295;</span>' : '',
        ].filter(Boolean).join(' ');

        const startTime = c.scheduled_start_time ? c.scheduled_start_time.substring(0, 5) : '--:--';
        const initials = getInitials(c.patient_name);

        return `
            <tr>
                <td style="font-family:monospace;font-weight:700;color:#0284c7;">
                    <a href="javascript:void(0)" onclick="window.__orOpenDetail(${c.id})" style="color:inherit;text-decoration:none;" title="View Details">
                        ${esc(c.case_number)}
                    </a>
                </td>
                <td style="white-space:nowrap;font-weight:600;">
                    ${startTime}
                    <small style="color:#64748b;display:block;">(${c.estimated_duration_minutes || 0}m)</small>
                </td>
                <td style="font-weight:700;color:#0f172a;">${esc(c.suite_code || c.or_suite_name)}</td>
                <td>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <div class="or-avatar-pill" style="width:22px;height:22px;font-size:9px;">${initials}</div>
                        <div>
                            <a href="javascript:void(0)" onclick="window.__openPatientChartFromReport('${esc(c.patient_mrn)}')" style="color:#0284c7;font-weight:700;text-decoration:none;" title="Open EHR Patient Chart">
                                ${esc(c.patient_name)}
                            </a>
                            <small style="display:block;color:#64748b;">${esc(c.patient_mrn || '')} &bull; ${c.patient_age || '--'}y/${c.gender ? c.gender[0] : ''}</small>
                        </div>
                    </div>
                </td>
                <td style="max-width:200px;">
                    <strong style="color:#0f172a;display:block;">${esc(c.procedure_name)}</strong>
                    <small style="color:#64748b;">${esc(c.surgical_specialty)}</small>
                </td>
                <td style="font-weight:600;color:#334155;">${esc(c.lead_surgeon)}</td>
                <td>
                    ${esc(c.anesthesia_type || 'General')}
                    <small style="display:block;color:#64748b;">${esc(c.anesthesiologist || '')}</small>
                    ${c.anesthesia_record ? `<span style="display:inline-block;margin-top:2px;font-size:10px;font-weight:700;padding:1px 6px;border-radius:999px;background:#f3e8ff;color:#6b21a8;">${esc(c.anesthesia_record.asa_status)}${Number(c.anesthesia_record.asa_emergency_modifier) ? '-E' : ''} &bull; ${esc(c.anesthesia_record.mallampati_class)} &bull; Aldrete ${c.anesthesia_record.aldrete_total_score ?? 10}/10</span>` : ''}
                </td>
                <td>${priorityBadge}</td>
                <td>
                    <span style="font-size:11px;font-weight:700;color:#0f172a;">${esc(c.perioperative_stage)}</span>
                    <div class="or-stepper-dots">${dotsHtml}</div>
                </td>
                <td style="font-size:11px;white-space:nowrap;">${readinessIcons}</td>
                <td style="text-align:right;white-space:nowrap;">
                    <button type="button" class="or-btn-view" onclick="window.__orOpenDetail(${c.id})" style="padding:3px 8px;font-size:11px;margin-right:4px;">Details</button>
                    <button type="button" class="or-btn-view" onclick="window.__orOpenAnesthesia(${c.id})" style="padding:3px 8px;font-size:11px;margin-right:4px;background:#f5f3ff;color:#6d28d9;border-color:#ddd6fe;">&#128137; Anesthesia</button>
                    <button type="button" class="or-btn-view" onclick="window.__orOpenSpongeCount(${c.id})" style="padding:3px 8px;font-size:11px;margin-right:4px;background:#f0fdfa;color:#0f766e;border-color:#99f6e4;">&#129527; Counts</button>
                    <button type="button" class="or-btn-advance" onclick="window.__orOpenStage(${c.id}, '${esc(c.perioperative_stage)}')" style="padding:3px 9px;font-size:11px;">Advance</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function handleBookSubmit(e) {
    e.preventDefault();
    // Block-time warnings are confirmed with the "Book anyway" box shown after the first try.
    const acknowledged = document.getElementById('orFAck')?.checked ? 1 : '';
    clearBookErrors();
    const submitBtn = document.getElementById('orSubmitBookBtn');

    const g = id => document.getElementById(id)?.value || '';
    const chk = id => document.getElementById(id)?.checked ? 1 : 0;
    const surgeryId = g('orFSurgery');

    const payload = {
        patient_id:                 g('orFPatientId') || null,
        patient_name:               g('orFPatientName'),
        patient_mrn:                g('orFPatientMrn'),
        patient_age:                g('orFPatientAge'),
        gender:                     g('orFGender'),
        or_suite_id:                g('orFSuiteId'),
        scheduled_date:             g('orFDate'),
        scheduled_start_time:       g('orFStartTime'),
        estimated_duration_minutes: g('orFDuration'),
        case_priority:              g('orFPriority'),
        specialization_id:          g('orFSpecialty'),
        surgery_id:                 surgeryId === 'other' ? '' : surgeryId,
        procedure_name:             surgeryId === 'other' ? g('orFProcedure') : '',
        laterality:                 g('orFLaterality'),
        preop_diagnosis:            g('orFPreopDiag'),
        lead_surgeon_user_id:       g('orFSurgeon'),
        assistant_surgeon_user_id:  g('orFAssistant'),
        anesthesiologist_user_id:   g('orFAnesthesiaType') === 'Local' ? '' : g('orFAnesthesiologist'),
        anesthesia_type:            g('orFAnesthesiaType'),
        scrub_nurse_user_id:        g('orFScrub'),
        circulating_nurse_user_id:  g('orFCirculator'),
        team_override_reason:       document.getElementById('orFOverrideWrap')?.hidden ? '' : g('orFOverrideReason').trim(),
        preop_cleared:              chk('orFPreopCleared'),
        consent_signed:             chk('orFConsentSigned'),
        blood_reserved:             chk('orFBloodReserved'),
        implants_required:          chk('orFImplantsRequired'),
        notes:                      g('orFNotes'),
        acknowledge_warnings:       acknowledged,
    };

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Scheduling...'; }
    try {
        const res = await api('/or-management/cases', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (res.success) {
            showToast(`Case ${res.data?.case_number || ''} booked.`, 'success');
            const modal = document.getElementById('orBookModal');
            if (modal) modal.style.display = 'none';
            document.getElementById('orBookForm')?.reset();
            refreshBookingPickers();
            await fetchSchedule();
        } else if (res.needs_ack) {
            const alertBox = document.getElementById('orFAlert');
            alertBox.innerHTML = `<div class="or-falert" style="background:#fffbeb;border-color:#fcd34d;color:#92400e;"><strong>Please confirm:</strong><br>${(res.warnings || []).map(esc).join('<br>')}
                <label style="display:flex;gap:6px;align-items:center;margin-top:8px;font-weight:600;"><input type="checkbox" id="orFAck"> Book anyway, then press Confirm again</label></div>`;
            alertBox.scrollIntoView({ block: 'nearest' });
        } else {
            showBookErrors(res.message || 'Failed to book the surgical case.', res.errors || {});
        }
    } catch (err) {
        console.error(err);
        showBookErrors('An unexpected error occurred while scheduling the case.', {});
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Confirm & Schedule Case'; }
    }
}

/* ---------------------------------------------------------------
 * Booking: specialization -> surgery -> team (flexible filtering)
 * ------------------------------------------------------------- */

async function loadBookingOptions() {
    if (bookingOptions.specializations.length) return;
    const res = await api('/or-management/options');
    if (!res?.success) {
        showBookErrors(res?.message || "Couldn't load the specializations and staff.", {});
        return;
    }
    bookingOptions = res.data;
    refreshBookingPickers();
}

function setupBookingPickers() {
    const on = (id, fn) => document.getElementById(id)?.addEventListener('change', fn);
    on('orFSpecialty', () => { renderSurgeryOptions(); renderTeamOptions(); applySurgery(); });
    on('orFSurgery', () => { applySurgery(); });
    on('orFSurgeon', updateOverride);
    on('orFAnesthesiologist', updateOverride);
    on('orFAnesthesiaType', () => { updateAnesthesiaRequired(); updateOverride(); });
}

/** Rebuilds every picker from the options (after loading, and after a booking resets the form). */
function refreshBookingPickers() {
    const spec = document.getElementById('orFSpecialty');
    if (!spec) return;
    const groups = [['surgical', 'Surgical'], ['anesthesiology', 'Anesthesiology'], ['medical', 'Medical'], ['other', 'Other']];
    spec.innerHTML = '<option value="">-- Choose the specialization --</option>' + groups.map(([cat, label]) => {
        const list = bookingOptions.specializations.filter(s => s.category === cat);
        return list.length ? `<optgroup label="${label}">${list.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</optgroup>` : '';
    }).join('');
    renderSurgeryOptions();
    renderTeamOptions();
    applySurgery();
}

function selectedSpec() {
    const id = Number(document.getElementById('orFSpecialty')?.value || 0);
    return bookingOptions.specializations.find(s => s.id === id) || null;
}

function selectedSurgery() {
    const id = Number(document.getElementById('orFSurgery')?.value || 0);
    return bookingOptions.surgeries.find(s => s.id === id) || null;
}

function renderSurgeryOptions() {
    const sel = document.getElementById('orFSurgery');
    const spec = selectedSpec();
    if (!sel) return;
    if (!spec) {
        sel.innerHTML = '<option value="">-- Choose the specialization first --</option>';
        return;
    }
    const list = bookingOptions.surgeries.filter(s => s.specialization_id === spec.id);
    sel.innerHTML = `<option value="">-- Choose the surgery (${list.length}) --</option>`
        + list.map(s => `<option value="${s.id}">${esc(s.name)}${s.code ? ` (${esc(s.code)})` : ''}</option>`).join('')
        + '<option value="other">Other — not in the list…</option>';
}

/** Doctors in the specialization first, everyone else under "Other doctors". */
function doctorOptions(matchFn, firstLabel, placeholder, includeNone) {
    const docs = bookingOptions.doctors;
    const match = docs.filter(matchFn);
    const rest = docs.filter(d => !matchFn(d));
    const opt = d => `<option value="${d.user_id}">${esc(d.name)}${d.specializations.length ? ` — ${esc(d.specializations.join(', '))}` : ''}</option>`;
    return `<option value="">${placeholder}</option>`
        + (match.length ? `<optgroup label="${esc(firstLabel)}">${match.map(opt).join('')}</optgroup>` : '')
        + (rest.length ? `<optgroup label="Other doctors (a reason is needed)">${rest.map(opt).join('')}</optgroup>` : '')
        + (includeNone ? '' : '');
}

function renderTeamOptions() {
    const spec = selectedSpec();
    const keep = id => document.getElementById(id)?.value || '';
    const set = (id, html) => {
        const el = document.getElementById(id);
        if (!el) return;
        const prev = el.value;
        el.innerHTML = html;
        if ([...el.options].some(o => o.value === prev)) el.value = prev;
    };
    const inSpec = d => spec && d.specialization_ids.includes(spec.id);
    const label = spec ? `${spec.name} surgeons` : 'Doctors';

    set('orFSurgeon', doctorOptions(inSpec, label, spec ? '-- Choose the surgeon --' : '-- Choose the specialization first --'));
    set('orFAssistant', doctorOptions(inSpec, label, '-- None --'));
    set('orFAnesthesiologist', doctorOptions(d => d.is_anesthesiologist, 'Anesthesiologists', '-- Choose the anesthesiologist --'));

    const staffOpt = s => `<option value="${s.user_id}">${esc(s.name)}${s.role ? ` (${esc(s.role)})` : ''}</option>`;
    const nurses = bookingOptions.staff.filter(s => !s.is_doctor);
    const doctors = bookingOptions.staff.filter(s => s.is_doctor);
    const staffHtml = '<option value="">-- None --</option>'
        + (nurses.length ? `<optgroup label="Staff">${nurses.map(staffOpt).join('')}</optgroup>` : '')
        + (doctors.length ? `<optgroup label="Doctors">${doctors.map(staffOpt).join('')}</optgroup>` : '');
    set('orFScrub', staffHtml);
    set('orFCirculator', staffHtml);
    void keep;
    updateAnesthesiaRequired();
    updateOverride();
}

/** Fills the booking defaults from the chosen surgery and shows what it usually needs. */
function applySurgery() {
    const surgery = selectedSurgery();
    const other = document.getElementById('orFSurgery')?.value === 'other';
    const procWrap = document.getElementById('orFProcedureWrap');
    if (procWrap) procWrap.hidden = !other;

    const side = document.getElementById('orFLateralityLabel');
    if (side) side.textContent = surgery?.requires_laterality ? 'Side *' : 'Side';

    const hints = [];
    if (surgery) {
        const dur = document.getElementById('orFDuration');
        if (dur) dur.value = surgery.default_duration_minutes;
        const anes = document.getElementById('orFAnesthesiaType');
        if (anes && surgery.default_anesthesia_type) anes.value = surgery.default_anesthesia_type;
        if (surgery.requires_laterality) hints.push('Say which side.');
        if (surgery.usually_needs_blood) hints.push('Usually needs blood — reserve it in the blood bank.');
        if (surgery.usually_needs_implants) hints.push('Usually needs implants — arrange them.');
        if (surgery.item_count) hints.push(`Preference card: ${surgery.item_count} item${surgery.item_count === 1 ? '' : 's'} (see Surgeries).`);
        hints.unshift(`${esc(surgery.category)} · usually ${surgery.default_duration_minutes} min${surgery.wound_class ? ` · ${esc(surgery.wound_class)}` : ''}`);
    }
    const box = document.getElementById('orFHints');
    if (box) {
        box.hidden = !hints.length;
        box.innerHTML = hints.join('<br>');
    }
    updateAnesthesiaRequired();
}

function updateAnesthesiaRequired() {
    const local = document.getElementById('orFAnesthesiaType')?.value === 'Local';
    const label = document.getElementById('orFAnesLabel');
    const sel = document.getElementById('orFAnesthesiologist');
    if (label) label.textContent = local ? 'Anesthesiologist (not needed for local)' : 'Anesthesiologist *';
    if (sel) sel.disabled = local;
}

/** A surgeon outside the specialization, or an anesthesiologist outside Anesthesiology, needs a reason. */
function updateOverride() {
    const spec = selectedSpec();
    const why = [];
    const surgeon = bookingOptions.doctors.find(d => String(d.user_id) === (document.getElementById('orFSurgeon')?.value || ''));
    if (surgeon && spec && !surgeon.specialization_ids.includes(spec.id)) why.push(`${surgeon.name} isn't listed under ${spec.name}.`);
    const local = document.getElementById('orFAnesthesiaType')?.value === 'Local';
    const anes = bookingOptions.doctors.find(d => String(d.user_id) === (document.getElementById('orFAnesthesiologist')?.value || ''));
    if (!local && anes && !anes.is_anesthesiologist) why.push(`${anes.name} isn't listed under Anesthesiology.`);
    const wrap = document.getElementById('orFOverrideWrap');
    if (wrap) wrap.hidden = !why.length;
    const text = document.getElementById('orFOverrideWhy');
    if (text) text.textContent = why.join(' ');
}

const BOOK_FIELD_IDS = {
    patient_name: 'orFPatientName', patient_id: 'orFPatientSelect', or_suite_id: 'orFSuiteId', scheduled_date: 'orFDate', scheduled_start_time: 'orFStartTime',
    estimated_duration_minutes: 'orFDuration', case_priority: 'orFPriority', specialization_id: 'orFSpecialty',
    surgery_id: 'orFSurgery', procedure_name: 'orFProcedure', laterality: 'orFLaterality', lead_surgeon_user_id: 'orFSurgeon',
    assistant_surgeon_user_id: 'orFAssistant', anesthesiologist_user_id: 'orFAnesthesiologist', anesthesia_type: 'orFAnesthesiaType',
    scrub_nurse_user_id: 'orFScrub', circulating_nurse_user_id: 'orFCirculator', team_override_reason: 'orFOverrideReason'
};

function clearBookErrors() {
    const alertBox = document.getElementById('orFAlert');
    if (alertBox) alertBox.innerHTML = '';
    document.querySelectorAll('#orBookForm [data-err]').forEach(el => { el.textContent = ''; });
    document.querySelectorAll('#orBookForm .has-error').forEach(el => el.classList.remove('has-error'));
}

function showBookErrors(message, errors) {
    const alertBox = document.getElementById('orFAlert');
    const unplaced = [];
    Object.entries(errors).forEach(([rawKey, msg]) => {
        // No surgery chosen at all: the message belongs under the surgery picker.
        const key = rawKey === 'procedure_name' && document.getElementById('orFProcedureWrap')?.hidden ? 'surgery_id' : rawKey;
        const slot = document.querySelector(`#orBookForm [data-err="${key}"]`);
        if (slot) {
            slot.textContent = msg;
            slot.closest('.or-form-group')?.classList.add('has-error');
        } else {
            unplaced.push(msg);
            document.getElementById(BOOK_FIELD_IDS[key] || '')?.closest('.or-form-group')?.classList.add('has-error');
        }
    });
    if (errors.team_override_reason) document.getElementById('orFOverrideWrap').hidden = false;
    if (alertBox) alertBox.innerHTML = `<div class="or-falert">${esc(message)}${unplaced.length ? `<br>${unplaced.map(esc).join('<br>')}` : ''}</div>`;
    alertBox?.scrollIntoView({ block: 'nearest' });
}

async function openStageModal(caseId, currentStage) {
    const modal = document.getElementById('orStageModal');
    if (!modal) return;

    const c = (currentScheduleData.cases || []).find(item => item.id == caseId);
    
    document.getElementById('orStageCaseId').value = caseId;
    if (c) {
        document.getElementById('orStageCaseNumber').textContent = c.case_number;
        document.getElementById('orStagePatient').textContent = c.patient_name;
        document.getElementById('orStageProcedure').textContent = c.procedure_name;
    }

    const select = document.getElementById('orStageSelect');
    if (select) {
        const stageSeq = [
            'Scheduled',
            'Pre-Op Holding',
            'In Room / Induction',
            'Incision / In Progress',
            'Closing / Extubation',
            'In PACU',
            'Transferred / Discharged'
        ];
        const curIdx = stageSeq.indexOf(currentStage);
        if (curIdx >= 0 && curIdx < stageSeq.length - 1) {
            select.value = stageSeq[curIdx + 1];
        } else {
            select.value = currentStage || 'Pre-Op Holding';
        }
        toggleStageSpecificFields(select.value);
    }

    modal.style.display = 'flex';
}

async function handleStageSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('orSubmitStageBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Updating...'; }

    const g = id => document.getElementById(id)?.value || '';
    const caseId = g('orStageCaseId');
    const stage = g('orStageSelect');

    const payload = {
        id:                  caseId,
        perioperative_stage: stage,
        pacu_bed_no:         g('orStagePacuBed'),
        estimated_blood_loss_ml: g('orStageEbl'),
        postop_diagnosis:    g('orStagePostopDiag'),
        pacu_aldrete_score:  g('orStageAldrete'),
        postop_disposition:  g('orStageDisposition'),
        cancellation_reason: g('orStageCancelReason'),
    };

    try {
        const res = await api('/or-management/cases/stage', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (res.success) {
            const modal = document.getElementById('orStageModal');
            if (modal) modal.style.display = 'none';
            await fetchSchedule();
        } else {
            showToast('Error updating stage: ' + (res.message || 'Operation failed.'), 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('An unexpected error occurred while updating stage.', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Update Stage'; }
    }
}

async function openDetailModal(caseId) {
    const modal = document.getElementById('orDetailModal');
    if (!modal) return;

    try {
        const res = await api(`/or-management/details?id=${caseId}`);
        if (res.success && res.data) {
            populateDetailModal(res.data);
            modal.style.display = 'flex';
        } else {
            showToast('Unable to load surgical case details.', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('An error occurred while loading case details.', 'error');
    }
}

function populateDetailModal(c) {
    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = (val !== null && val !== undefined && val !== '') ? val : '--';
    };

    set('orDCaseNumber', c.case_number);
    
    const badgeEl = document.getElementById('orDStageBadge');
    if (badgeEl) {
        badgeEl.textContent = c.perioperative_stage;
    }

    set('orDPatientName', c.patient_name);
    set('orDPatientDetails', `${c.patient_mrn || 'No MRN'} &bull; ${c.patient_age || '--'} yrs &bull; ${c.gender || '--'}`);
    
    const chartLinkEl = document.getElementById('orDPatientChartLink');
    if (chartLinkEl) {
        if (c.patient_mrn) {
            chartLinkEl.innerHTML = `<button type="button" class="or-btn-primary" onclick="window.__openPatientChartFromReport('${esc(c.patient_mrn)}')">&#128100; Open EHR Patient Chart</button>`;
        } else {
            chartLinkEl.innerHTML = '';
        }
    }

    set('orDProcedure', c.procedure_name);
    set('orDSuiteSpecialty', `${c.suite_code || c.or_suite_name} &bull; ${c.surgical_specialty}`);
    set('orDSurgeon', c.lead_surgeon + (c.assistant_surgeon ? ` (Asst: ${c.assistant_surgeon})` : ''));
    set('orDAnesthesia', `${c.anesthesia_type} &bull; ${c.anesthesiologist}`);

    // Milestones Timeline
    set('orDTimeScheduled', c.scheduled_start_time ? c.scheduled_start_time.substring(0, 5) : '--:--');
    set('orDTimeInRoom', c.actual_in_room_time ? c.actual_in_room_time.substring(11, 16) : '--:--');
    set('orDTimeIncision', c.actual_incision_time ? c.actual_incision_time.substring(11, 16) : '--:--');
    set('orDTimeClosing', c.actual_closing_time ? c.actual_closing_time.substring(11, 16) : '--:--');
    set('orDTimeOutRoom', c.actual_out_room_time ? c.actual_out_room_time.substring(11, 16) : '--:--');

    // PACU Recovery section
    set('orDPacuBed', c.pacu_bed_no || 'Pending assignment');
    set('orDAldrete', c.pacu_aldrete_score !== null ? `${c.pacu_aldrete_score} / 10` : 'Not evaluated');
    set('orDEbl', c.estimated_blood_loss_ml !== null ? `${c.estimated_blood_loss_ml} mL` : 'Not documented');
    set('orDDisposition', c.postop_disposition || 'Pending recovery milestone');

    // Linked Surgical Safety Checklist
    const safetyLinkEl = document.getElementById('orDSafetyChecklistLink');
    if (safetyLinkEl) {
        if (c.linked_safety_checklist) {
            const ssc = c.linked_safety_checklist;
            const compText = ssc.universal_protocol_compliant ? 'Compliant' : 'Variance Noted';
            safetyLinkEl.innerHTML = `
                <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:12px;display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <div style="font-size:11px;font-weight:700;color:#065f46;">&#10003; SURGICAL SAFETY TIME-OUT AUDIT LINKED</div>
                        <div style="font-size:12px;color:#047857;margin-top:2px;">
                            Checklist #${esc(ssc.case_number)} &bull; ${compText} &bull; ${esc(ssc.status)}
                        </div>
                    </div>
                    <button type="button" onclick="window.__openDashboardTab('clinic_surgical_safety', 'Surgical Safety & Time-Out')" class="or-btn-primary" style="background:#059669;font-size:11px;padding:6px 12px;">
                        Open Checklist &rarr;
                    </button>
                </div>
            `;
        } else {
            safetyLinkEl.innerHTML = `
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;display:flex;justify-content:space-between;align-items:center;">
                    <div style="font-size:12px;color:#64748b;">No linked Universal Protocol Time-Out checklist yet recorded.</div>
                    <button type="button" onclick="window.__openDashboardTab('clinic_surgical_safety', 'Surgical Safety & Time-Out')" class="or-btn-secondary" style="font-size:11px;padding:6px 12px;">
                        + Conduct Time-Out
                    </button>
                </div>
            `;
        }
    }

    // Notes
    const notesEl = document.getElementById('orDNotes');
    if (notesEl) {
        notesEl.textContent = c.notes || 'None documented.';
    }
}

function renderSuiteStatusList() {
    const list = document.getElementById('orSuiteStatusList');
    if (!list) return;

    const suites = currentScheduleData.suites || [];
    if (!suites.length) {
        list.innerHTML = '<div style="color:#64748b;font-style:italic;">No OR suites configured.</div>';
        return;
    }

    list.innerHTML = suites.map(s => {
        let curStatus = s.status;
        return `
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                <div>
                    <strong style="color:#0f172a;font-size:13px;">${esc(s.suite_code)} &mdash; ${esc(s.suite_name)}</strong>
                    <div style="font-size:11px;color:#64748b;margin-top:2px;">Current: <span style="font-weight:700;color:#0284c7;">${esc(curStatus)}</span> &bull; ${esc(s.specialty_capabilities || 'General')}</div>
                </div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                    <button type="button" onclick="window.__orSetSuiteStatus(${s.id}, 'Available')" style="padding:5px 9px;border-radius:5px;font-size:11px;font-weight:600;border:1px solid #86efac;background:#dcfce7;color:#166534;cursor:pointer;">
                        Available
                    </button>
                    <button type="button" onclick="window.__orSetSuiteStatus(${s.id}, 'Cleaning / Turnover')" style="padding:5px 9px;border-radius:5px;font-size:11px;font-weight:600;border:1px solid #fde68a;background:#fef3c7;color:#92400e;cursor:pointer;">
                        Turnover
                    </button>
                    <button type="button" onclick="window.__orSetSuiteStatus(${s.id}, 'Maintenance')" style="padding:5px 9px;border-radius:5px;font-size:11px;font-weight:600;border:1px solid #cbd5e1;background:#f1f5f9;color:#475569;cursor:pointer;">
                        Maintenance
                    </button>
                </div>
            </div>
        `;
    }).join('');

    window.__orSetSuiteStatus = async (suiteId, status) => {
        try {
            const res = await api('/or-management/suites/status', {
                method: 'POST',
                body: JSON.stringify({ suite_id: suiteId, status })
            });
            if (res.success) {
                await fetchSchedule(true);
                renderSuiteStatusList();
            } else {
                showToast('Error: ' + (res.message || 'Failed to update suite status.'), 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('An unexpected error occurred while updating suite status.', 'error');
        }
    };
}

function switchRegSuiteTab(tab) {
    const tabNew = document.getElementById('orTabRegSuiteNew');
    const tabList = document.getElementById('orTabRegSuiteList');
    const panelNew = document.getElementById('orPanelRegSuiteNew');
    const panelList = document.getElementById('orPanelRegSuiteList');

    if (tab === 'new') {
        if (tabNew) tabNew.classList.add('active');
        if (tabList) tabList.classList.remove('active');
        if (panelNew) panelNew.style.display = 'block';
        if (panelList) panelList.style.display = 'none';
    } else {
        if (tabList) tabList.classList.add('active');
        if (tabNew) tabNew.classList.remove('active');
        if (panelList) panelList.style.display = 'block';
        if (panelNew) panelNew.style.display = 'none';
        renderRegisteredSuitesDirectory();
    }
}

function resetRegSuiteForm() {
    const form = document.getElementById('orRegisterSuiteForm');
    if (form) form.reset();
    const idEl = document.getElementById('orRegEditSuiteId');
    if (idEl) idEl.value = '';
    const submitBtn = document.getElementById('orSubmitRegSuiteBtn');
    if (submitBtn) submitBtn.textContent = 'Save & Register OR Suite';

    const countEl = document.getElementById('orRegSuitesCount');
    if (countEl) countEl.textContent = (currentScheduleData.suites || []).length;
}

function renderRegisteredSuitesDirectory() {
    const tbody = document.getElementById('orRegSuitesTableBody');
    if (!tbody) return;

    const suites = currentScheduleData.suites || [];
    const countEl = document.getElementById('orRegSuitesCount');
    if (countEl) countEl.textContent = suites.length;

    if (!suites.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="padding:20px;text-align:center;color:#64748b;">No OR suites registered.</td></tr>';
        return;
    }

    tbody.innerHTML = suites.map(s => {
        let statusBadge = '<span class="or-chip or-chip-green">Available</span>';
        if (s.status === 'In Surgery') statusBadge = '<span class="or-chip or-chip-red">In Surgery</span>';
        else if (s.status === 'Cleaning / Turnover') statusBadge = '<span class="or-chip or-chip-amber">Turnover</span>';
        else if (s.status === 'Maintenance') statusBadge = '<span class="or-chip or-chip-blue">Maintenance</span>';

        return `
            <tr>
                <td style="font-family:monospace;font-weight:700;color:#0284c7;">${esc(s.suite_code)}</td>
                <td>
                    <strong style="color:#0f172a;">${esc(s.suite_name)}</strong>
                    <small style="display:block;color:#64748b;">${esc(s.floor_location || 'Surgical Wing')}</small>
                </td>
                <td><span class="or-chip or-chip-blue">${esc(s.suite_type || 'Major OR')}</span></td>
                <td style="max-width:200px;font-size:11px;color:#475569;">${esc(s.equipment_spec || 'Standard OR Specs')}</td>
                <td>${statusBadge}</td>
                <td style="text-align:right;">
                    <button type="button" onclick="window.__orEditSuite(${s.id})" class="or-btn-view" style="font-size:11px;padding:3px 8px;">
                        Edit &rarr;
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function editSuiteRecord(suiteId) {
    const s = (currentScheduleData.suites || []).find(item => item.id == suiteId);
    if (!s) return;

    switchRegSuiteTab('new');

    const idEl = document.getElementById('orRegEditSuiteId');
    const codeEl = document.getElementById('orRegSuiteCode');
    const nameEl = document.getElementById('orRegSuiteName');
    const typeEl = document.getElementById('orRegSuiteType');
    const floorEl = document.getElementById('orRegFloorLocation');
    const equipEl = document.getElementById('orRegEquipment');
    const submitBtn = document.getElementById('orSubmitRegSuiteBtn');

    if (idEl) idEl.value = s.id;
    if (codeEl) codeEl.value = s.suite_code || '';
    if (nameEl) nameEl.value = s.suite_name || '';
    if (typeEl) typeEl.value = s.suite_type || 'Major OR';
    if (floorEl) floorEl.value = s.floor_location || '';
    if (equipEl) equipEl.value = s.equipment_spec || '';
    if (submitBtn) submitBtn.textContent = 'Update OR Suite Configuration';
}

async function handleRegisterSuiteSubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('orSubmitRegSuiteBtn');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving...'; }

    const g = id => document.getElementById(id)?.value || '';
    const editId = g('orRegEditSuiteId');

    const payload = {
        suite_code:     g('orRegSuiteCode'),
        suite_name:     g('orRegSuiteName'),
        suite_type:     g('orRegSuiteType'),
        floor_location: g('orRegFloorLocation'),
        status:         g('orRegInitialStatus') || 'Available',
        equipment_spec: g('orRegEquipment'),
    };

    try {
        let res;
        if (editId) {
            payload.id = editId;
            res = await api('/or-management/suites/update', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        } else {
            res = await api('/or-management/suites', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        }

        if (res.success) {
            showToast(editId ? 'OR Suite updated.' : `New OR Suite registered: ${res.data?.suite_code || ''}`, 'success');
            const modal = document.getElementById('orRegisterSuiteModal');
            if (modal) modal.style.display = 'none';
            resetRegSuiteForm();
            await fetchSchedule();
        } else {
            showToast('Error: ' + (res.message || 'Operation failed.'), 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('An unexpected error occurred while saving suite.', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = editId ? 'Update OR Suite Configuration' : 'Save & Register OR Suite';
        }
    }
}


/* ============================================================================
 * ELECTRONIC ANESTHESIA RECORD WORKSPACE (or_anesthesia_records)
 * ASA I–VI + E, Mallampati Class I–IV, Modality, Drugs, EBL & PACU Aldrete 0–10
 * ============================================================================ */

function setupAnesthesiaModal() {
    const modal = document.getElementById('orAnesthesiaModal');
    const closeX = document.getElementById('orCloseAnesthesiaModal');
    const cancelBtn = document.getElementById('orCancelAnesthesiaBtn');
    const form = document.getElementById('orAnesthesiaForm');
    const finalizeBtn = document.getElementById('orFinalizeAnesthesiaBtn');

    const closeAnes = () => {
        if (modal) modal.style.display = 'none';
    };

    if (closeX) closeX.addEventListener('click', closeAnes);
    if (cancelBtn) cancelBtn.addEventListener('click', closeAnes);
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeAnes();
        });
    }

    // Live ASA Physical Status + Emergency 'E' badge
    const asaSelect = document.getElementById('orAnesAsaStatus');
    const asaEmerg = document.getElementById('orAnesAsaEmergency');
    if (asaSelect) asaSelect.addEventListener('change', updateAnesthesiaLiveCalculations);
    if (asaEmerg) asaEmerg.addEventListener('change', updateAnesthesiaLiveCalculations);

    // Live Intra-Op Fluid Net Balance calculation
    document.querySelectorAll('.or-anes-fluid-input').forEach((inp) => {
        inp.addEventListener('input', updateAnesthesiaLiveCalculations);
    });

    // Live 5-Domain PACU Aldrete Recovery Score (0-10) calculation
    document.querySelectorAll('.or-anes-aldrete-select').forEach((sel) => {
        sel.addEventListener('change', updateAnesthesiaLiveCalculations);
    });

    // 1-Click Clinical Protocol Presets
    document.querySelectorAll('.or-anes-preset-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const preset = btn.getAttribute('data-preset');
            if (preset) applyAnesthesiaPreset(preset);
        });
    });

    // Quick-Add Drug Chips
    document.querySelectorAll('.or-anes-drug-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
            const targetId = chip.getAttribute('data-target');
            const drugText = chip.getAttribute('data-drug');
            const targetEl = targetId ? document.getElementById(targetId) : null;
            if (!targetEl || !drugText) return;
            const cur = targetEl.value.trim();
            targetEl.value = cur ? `${cur}, ${drugText}` : drugText;
        });
    });

    if (form) {
        form.addEventListener('submit', (e) => handleAnesthesiaSubmit(e, false));
    }
    if (finalizeBtn) {
        finalizeBtn.addEventListener('click', (e) => handleAnesthesiaSubmit(e, true));
    }
}

function updateAnesthesiaLiveCalculations() {
    // 1. ASA Physical Status Badge
    const asa = document.getElementById('orAnesAsaStatus')?.value || 'ASA II';
    const isEmerg = document.getElementById('orAnesAsaEmergency')?.checked;
    const asaBadge = document.getElementById('orAnesAsaLiveBadge');
    if (asaBadge) {
        const display = `${asa}${isEmerg ? '-E' : ''}`;
        asaBadge.textContent = display;
        if (isEmerg || asa === 'ASA IV' || asa === 'ASA V' || asa === 'ASA VI') {
            asaBadge.style.background = '#fee2e2';
            asaBadge.style.color = '#991b1b';
        } else if (asa === 'ASA III') {
            asaBadge.style.background = '#fef3c7';
            asaBadge.style.color = '#92400e';
        } else {
            asaBadge.style.background = '#dbeafe';
            asaBadge.style.color = '#1e40af';
        }
    }

    // 2. Intra-Op Fluid Balance
    const num = (id) => Math.max(0, parseInt(document.getElementById(id)?.value || '0', 10) || 0);
    const ebl = num('orAnesEblMl');
    const urine = num('orAnesUrineMl');
    const cryst = num('orAnesCrystalloidsMl');
    const coll = num('orAnesColloidsMl');
    const blood = num('orAnesBloodProductsMl');

    const totalIn = cryst + coll + blood;
    const totalOut = ebl + urine;
    const net = totalIn - totalOut;

    const netBadge = document.getElementById('orAnesNetFluidBadge');
    if (netBadge) {
        const sign = net >= 0 ? '+' : '';
        netBadge.textContent = `${sign}${net} mL (In: ${totalIn} / Out: ${totalOut})`;
        if (ebl >= 1000 || net < -500) {
            netBadge.style.background = '#fef2f2';
            netBadge.style.color = '#991b1b';
            netBadge.style.borderColor = '#fecaca';
        } else {
            netBadge.style.background = '#ecfdf5';
            netBadge.style.color = '#065f46';
            netBadge.style.borderColor = '#a7f3d0';
        }
    }

    // 3. 5-Domain PACU Aldrete Score (0-10)
    const aldActivity = parseInt(document.getElementById('orAnesAldreteActivity')?.value ?? '2', 10) || 0;
    const aldResp = parseInt(document.getElementById('orAnesAldreteRespiration')?.value ?? '2', 10) || 0;
    const aldCirc = parseInt(document.getElementById('orAnesAldreteCirculation')?.value ?? '2', 10) || 0;
    const aldConsc = parseInt(document.getElementById('orAnesAldreteConsciousness')?.value ?? '2', 10) || 0;
    const aldOxy = parseInt(document.getElementById('orAnesAldreteOxygenation')?.value ?? '2', 10) || 0;

    const totalAldrete = aldActivity + aldResp + aldCirc + aldConsc + aldOxy;
    const aldBadge = document.getElementById('orAnesAldreteTotalBadge');
    const aldText = document.getElementById('orAnesAldreteReadinessText');

    if (aldBadge && aldText) {
        aldBadge.textContent = `Aldrete Score: ${totalAldrete} / 10`;
        if (totalAldrete >= 9) {
            aldBadge.style.background = '#16a34a';
            aldText.textContent = '✓ Ready for PACU Discharge (Score >= 9/10)';
            aldText.style.color = '#15803d';
        } else if (totalAldrete >= 7) {
            aldBadge.style.background = '#d97706';
            aldText.textContent = '⚠ Continued PACU Monitoring Required (Score 7–8/10)';
            aldText.style.color = '#b45309';
        } else {
            aldBadge.style.background = '#dc2626';
            aldText.textContent = '🚨 Critical Post-Op Recovery — Do Not Discharge (Score <= 6/10)';
            aldText.style.color = '#b91c1c';
        }
    }
}

function applyAnesthesiaPreset(preset) {
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    };

    if (preset === 'general_ett') {
        setVal('orAnesType', 'General');
        setVal('orAnesAirwayDevice', 'ETT Cuffed');
        setVal('orAnesEttSize', '7.5');
        setVal('orAnesEttDepth', '21');
        setVal('orAnesLaryngoscopy', 'Video Laryngoscope (GlideScope/C-MAC)');
        setVal('orAnesCormackGrade', 'Grade I');
        setVal('orAnesVentilatorMode', 'VCV / PCV (TV 450mL, RR 12, PEEP 5, FiO2 50%)');
        setVal('orAnesInductionDrugs', 'Midazolam 2mg IV, Fentanyl 100mcg IV, Lidocaine 1% 60mg IV, Propofol 160mg IV, Rocuronium 50mg IV');
        setVal('orAnesMaintenanceAgents', 'Sevoflurane 2.0% End-Tidal (1.0 MAC) in 50% O2/Air at 2L/min FGF; Fentanyl 50mcg IV bolus');
        setVal('orAnesRegionalDetails', 'N/A — General Endotracheal Anesthesia');
        setVal('orAnesReversalDrugs', 'Sugammadex 200mg IV (TOF ratio > 0.9), Ondansetron 4mg IV, Dexamethasone 8mg IV');
    } else if (preset === 'spinal_heavy') {
        setVal('orAnesType', 'Spinal');
        setVal('orAnesAirwayDevice', 'Nasal Cannula O2');
        setVal('orAnesEttSize', 'N/A');
        setVal('orAnesEttDepth', 'N/A');
        setVal('orAnesLaryngoscopy', 'N/A (No Laryngoscopy)');
        setVal('orAnesCormackGrade', 'N/A (Neuraxial/MAC)');
        setVal('orAnesVentilatorMode', 'Spontaneous Respiration on O2 2–3 L/min via Nasal Cannula');
        setVal('orAnesInductionDrugs', 'Midazolam 1.5mg IV anxiolysis; Cefazolin 2g IV prophylaxis');
        setVal('orAnesMaintenanceAgents', 'Spontaneous ventilation; Phenylephrine 50–100mcg IV PRN MAP >= 65 mmHg');
        setVal('orAnesRegionalDetails', 'Subarachnoid Block at L3-L4 midline, 25G Pencan spinal needle, Bupivacaine 0.5% Heavy 12.5mg (2.5mL) + Fentanyl 15mcg IT; Bilateral T4 sensory block achieved');
        setVal('orAnesReversalDrugs', 'Ondansetron 4mg IV, Ketorolac 30mg IV (neuraxial motor regression monitored in PACU)');
    } else if (preset === 'epidural_cse') {
        setVal('orAnesType', 'Combined Spinal-Epidural (CSE)');
        setVal('orAnesAirwayDevice', 'Nasal Cannula O2');
        setVal('orAnesEttSize', 'N/A');
        setVal('orAnesEttDepth', 'N/A');
        setVal('orAnesLaryngoscopy', 'N/A (No Laryngoscopy)');
        setVal('orAnesCormackGrade', 'N/A (Neuraxial/MAC)');
        setVal('orAnesVentilatorMode', 'Spontaneous Respiration on Nasal Cannula 2 L/min');
        setVal('orAnesInductionDrugs', 'Intrathecal Bupivacaine 0.5% Heavy 10mg + Morphine 100mcg IT');
        setVal('orAnesMaintenanceAgents', 'Epidural Ropivacaine 0.2% + Fentanyl 2mcg/mL at 6–8 mL/hr PCEA');
        setVal('orAnesRegionalDetails', 'L3-L4 Tuohy 18G Epidural Catheter threaded 4cm into epidural space (negative test dose w/ Lidocaine 1.5% + Epi 1:200k); sensory block T4');
        setVal('orAnesReversalDrugs', 'Ondansetron 4mg IV; Epidural catheter secured at 9cm skin mark for post-op analgesia');
    } else if (preset === 'mac_sedation') {
        setVal('orAnesType', 'MAC');
        setVal('orAnesAirwayDevice', 'Nasal Cannula O2');
        setVal('orAnesEttSize', 'N/A');
        setVal('orAnesEttDepth', 'N/A');
        setVal('orAnesLaryngoscopy', 'N/A (No Laryngoscopy)');
        setVal('orAnesCormackGrade', 'N/A (Neuraxial/MAC)');
        setVal('orAnesVentilatorMode', 'Spontaneous Respiration on Capnography Nasal Cannula O2 3 L/min');
        setVal('orAnesInductionDrugs', 'Midazolam 2mg IV, Fentanyl 50mcg IV, Propofol 40mg IV titrated bolus');
        setVal('orAnesMaintenanceAgents', 'Propofol Sedation Infusion 50–75 mcg/kg/min + Dexmedetomidine 0.4 mcg/kg/hr');
        setVal('orAnesRegionalDetails', 'Surgeon local field infiltration with 1% Lidocaine / 0.25% Bupivacaine');
        setVal('orAnesReversalDrugs', 'Ondansetron 4mg IV');
    }

    updateAnesthesiaLiveCalculations();
    showToast('Applied anesthesia clinical protocol preset.', 'info');
}

async function openAnesthesiaModal(caseId) {
    const modal = document.getElementById('orAnesthesiaModal');
    if (!modal || !caseId) return;

    try {
        const res = await api(`/or-management/anesthesia-records?surgical_case_id=${encodeURIComponent(caseId)}`);
        const payload = res?.data || {};
        const localCase = (currentScheduleData.cases || []).find((c) => Number(c.id) === Number(caseId)) || {};
        const surgicalCase = payload.surgical_case || localCase;
        const record = payload.record || null;

        populateAnesthesiaModal(surgicalCase, record);
        modal.style.display = 'flex';
    } catch (err) {
        console.error('Error loading Electronic Anesthesia Record:', err);
        const localCase = (currentScheduleData.cases || []).find((c) => Number(c.id) === Number(caseId)) || { id: caseId };
        populateAnesthesiaModal(localCase, null);
        modal.style.display = 'flex';
    }
}

function populateAnesthesiaModal(surgicalCase, record) {
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val !== null && val !== undefined ? val : '';
    };
    const setChk = (id, checked) => {
        const el = document.getElementById(id);
        if (el) el.checked = Boolean(checked);
    };

    const caseId = surgicalCase?.id || record?.surgical_case_id || '';
    const patientId = surgicalCase?.patient_id || record?.patient_id || '';
    setVal('orAnesSurgicalCaseId', caseId);
    setVal('orAnesPatientId', patientId);
    setVal('orAnesRecordId', record?.id || '');

    // Patient & Case Context Banner
    const patBanner = document.getElementById('orAnesPatientBanner');
    if (patBanner) {
        patBanner.textContent = `${surgicalCase?.patient_name || 'Patient'} (${surgicalCase?.patient_mrn || 'MRN'}) • ${surgicalCase?.case_number || `Case #${caseId}`}`;
    }
    const caseBanner = document.getElementById('orAnesCaseBanner');
    if (caseBanner) {
        caseBanner.textContent = `${surgicalCase?.procedure_name || 'Surgical Procedure'} • ${surgicalCase?.suite_code || surgicalCase?.or_suite_name || 'OR Suite'} • Surgeon: ${surgicalCase?.lead_surgeon || '--'} • Priority: ${surgicalCase?.case_priority || 'Elective'}`;
    }

    const numBadge = document.getElementById('orAnesRecordNumBadge');
    if (numBadge) {
        numBadge.textContent = record?.record_number || 'NEW ANESTHESIA RECORD';
    }
    const statusBadge = document.getElementById('orAnesStatusBadge');
    if (statusBadge) {
        const st = record?.record_status || 'Draft / Intra-Op';
        statusBadge.textContent = st;
        if (st === 'Signed & Finalized') {
            statusBadge.style.background = '#dcfce7';
            statusBadge.style.color = '#166534';
        } else {
            statusBadge.style.background = '#fef3c7';
            statusBadge.style.color = '#92400e';
        }
    }

    const isEmergencyCase = (surgicalCase?.case_priority || '').toLowerCase().includes('emergency');

    if (record) {
        setVal('orAnesAsaStatus', record.asa_status || 'ASA II');
        setChk('orAnesAsaEmergency', Number(record.asa_emergency_modifier) === 1);
        setVal('orAnesMallampati', record.mallampati_class || 'Class I');
        setVal('orAnesThyromental', record.thyromental_distance || '>= 6.5 cm (Normal)');
        setVal('orAnesNeckMobility', record.neck_mobility || 'Full Range of Motion');
        setVal('orAnesDentition', record.dentition_status || 'Intact / Normal');
        setVal('orAnesNpoHours', record.npo_status_hours ?? 8);
        setChk('orAnesDifficultAirway', Number(record.difficult_airway_anticipated) === 1);

        setVal('orAnesType', record.anesthesia_type || 'General');
        setVal('orAnesAirwayDevice', record.airway_device || 'ETT Cuffed');
        setVal('orAnesEttSize', record.ett_size_mm || '7.5');
        setVal('orAnesEttDepth', record.ett_depth_cm || '21');
        setVal('orAnesLaryngoscopy', record.laryngoscopy_type || 'Video Laryngoscope (GlideScope/C-MAC)');
        setVal('orAnesCormackGrade', record.cormack_lehane_grade || 'Grade I');
        setVal('orAnesIntubationAttempts', record.intubation_attempts ?? 1);
        setVal('orAnesVentilatorMode', record.ventilator_mode || 'VCV / PCV (TV 450mL, RR 12, PEEP 5, FiO2 50%)');

        setVal('orAnesInductionDrugs', record.induction_drugs || '');
        setVal('orAnesMaintenanceAgents', record.maintenance_agents || '');
        setVal('orAnesRegionalDetails', record.regional_neuraxial_details || '');
        setVal('orAnesReversalDrugs', record.reversal_emergence_drugs || '');

        setVal('orAnesEblMl', record.estimated_blood_loss_ml ?? 0);
        setVal('orAnesUrineMl', record.urine_output_ml ?? 0);
        setVal('orAnesCrystalloidsMl', record.crystalloids_ml ?? 1000);
        setVal('orAnesColloidsMl', record.colloids_ml ?? 0);
        setVal('orAnesBloodProductsMl', record.blood_products_ml ?? 0);

        setVal('orAnesAldreteActivity', String(record.aldrete_activity ?? 2));
        setVal('orAnesAldreteRespiration', String(record.aldrete_respiration ?? 2));
        setVal('orAnesAldreteCirculation', String(record.aldrete_circulation ?? 2));
        setVal('orAnesAldreteConsciousness', String(record.aldrete_consciousness ?? 2));
        setVal('orAnesAldreteOxygenation', String(record.aldrete_oxygenation ?? 2));
        setVal('orAnesPacuNotes', record.pacu_handoff_notes || '');

        setVal('orAnesStartTime', record.anesthesia_start_time ? record.anesthesia_start_time.replace(' ', 'T').substring(0, 16) : '');
        setVal('orAnesEndTime', record.anesthesia_end_time ? record.anesthesia_end_time.replace(' ', 'T').substring(0, 16) : '');
        setVal('orAnesAnesthesiologist', record.anesthesiologist_name || surgicalCase?.anesthesiologist || 'Dr. Elena Rostova (Anesthesiology)');
        setVal('orAnesComplications', record.intraop_complications || 'None — Hemodynamically stable throughout procedure');
        setVal('orAnesRecordStatus', record.record_status || 'Draft / Intra-Op');
        setVal('orAnesSignature', record.anesthesiologist_signature || '');
    } else {
        // Initialize from surgicalCase defaults
        setVal('orAnesAsaStatus', isEmergencyCase ? 'ASA III' : 'ASA II');
        setChk('orAnesAsaEmergency', isEmergencyCase);
        setVal('orAnesMallampati', 'Class I');
        setVal('orAnesThyromental', '>= 6.5 cm (Normal)');
        setVal('orAnesNeckMobility', 'Full Range of Motion');
        setVal('orAnesDentition', 'Intact / Normal');
        setVal('orAnesNpoHours', 8);
        setChk('orAnesDifficultAirway', false);

        const defaultModality = (surgicalCase?.anesthesia_type || 'General').includes('Spinal')
            ? 'Spinal'
            : (surgicalCase?.anesthesia_type || 'General').includes('Epidural')
                ? 'Epidural'
                : (surgicalCase?.anesthesia_type || 'General').includes('MAC')
                    ? 'MAC'
                    : (surgicalCase?.anesthesia_type || 'General').includes('Regional')
                        ? 'Regional Nerve Block'
                        : (surgicalCase?.anesthesia_type || 'General').includes('Local')
                            ? 'Local'
                            : 'General';

        setVal('orAnesType', defaultModality);
        setVal('orAnesAirwayDevice', defaultModality === 'General' ? 'ETT Cuffed' : 'Nasal Cannula O2');
        setVal('orAnesEttSize', defaultModality === 'General' ? '7.5' : 'N/A');
        setVal('orAnesEttDepth', defaultModality === 'General' ? '21' : 'N/A');
        setVal('orAnesLaryngoscopy', defaultModality === 'General' ? 'Video Laryngoscope (GlideScope/C-MAC)' : 'N/A (No Laryngoscopy)');
        setVal('orAnesCormackGrade', defaultModality === 'General' ? 'Grade I' : 'N/A (Neuraxial/MAC)');
        setVal('orAnesIntubationAttempts', defaultModality === 'General' ? 1 : 0);
        setVal('orAnesVentilatorMode', defaultModality === 'General' ? 'VCV / PCV (TV 450mL, RR 12, PEEP 5, FiO2 50%)' : 'Spontaneous Respiration on O2 2L/min');

        setVal('orAnesInductionDrugs', 'Midazolam 2mg IV, Fentanyl 100mcg IV, Lidocaine 60mg IV, Propofol 160mg IV, Rocuronium 50mg IV');
        setVal('orAnesMaintenanceAgents', 'Sevoflurane 2.0% End-Tidal (1.0 MAC) in 50% O2/Air');
        setVal('orAnesRegionalDetails', '');
        setVal('orAnesReversalDrugs', 'Sugammadex 200mg IV, Ondansetron 4mg IV, Dexamethasone 8mg IV');

        setVal('orAnesEblMl', surgicalCase?.estimated_blood_loss_ml ?? 150);
        setVal('orAnesUrineMl', 300);
        setVal('orAnesCrystalloidsMl', 1200);
        setVal('orAnesColloidsMl', 0);
        setVal('orAnesBloodProductsMl', 0);

        setVal('orAnesAldreteActivity', '2');
        setVal('orAnesAldreteRespiration', '2');
        setVal('orAnesAldreteCirculation', '2');
        setVal('orAnesAldreteConsciousness', '2');
        setVal('orAnesAldreteOxygenation', '2');
        setVal('orAnesPacuNotes', 'Maintain SpO2 > 94%, monitor vitals q15min in PACU, multimodal analgesia ordered.');

        const nowLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().substring(0, 16);
        setVal('orAnesStartTime', surgicalCase?.actual_in_room_time ? surgicalCase.actual_in_room_time.replace(' ', 'T').substring(0, 16) : nowLocal);
        setVal('orAnesEndTime', surgicalCase?.actual_out_room_time ? surgicalCase.actual_out_room_time.replace(' ', 'T').substring(0, 16) : '');
        setVal('orAnesAnesthesiologist', surgicalCase?.anesthesiologist || 'Dr. Elena Rostova (Anesthesiology)');
        setVal('orAnesComplications', 'None — Hemodynamically stable throughout procedure');
        setVal('orAnesRecordStatus', 'Draft / Intra-Op');
        setVal('orAnesSignature', '');
    }

    updateAnesthesiaLiveCalculations();
}

async function handleAnesthesiaSubmit(e, finalize = false) {
    if (e) e.preventDefault();

    const saveBtn = document.getElementById('orSaveAnesthesiaDraftBtn');
    const finBtn = document.getElementById('orFinalizeAnesthesiaBtn');
    const g = (id) => document.getElementById(id)?.value ?? '';
    const chk = (id) => (document.getElementById(id)?.checked ? 1 : 0);

    const surgicalCaseId = Number(g('orAnesSurgicalCaseId'));
    if (!surgicalCaseId) {
        showToast('Missing surgical case ID for Anesthesia Record.', 'error');
        return;
    }

    const statusVal = finalize ? 'Signed & Finalized' : (g('orAnesRecordStatus') || 'Draft / Intra-Op');

    const payload = {
        surgical_case_id:             surgicalCaseId,
        patient_id:                   g('orAnesPatientId') || null,
        asa_status:                   g('orAnesAsaStatus'),
        asa_emergency_modifier:       chk('orAnesAsaEmergency'),
        mallampati_class:             g('orAnesMallampati'),
        thyromental_distance:         g('orAnesThyromental'),
        neck_mobility:                g('orAnesNeckMobility'),
        dentition_status:             g('orAnesDentition'),
        npo_status_hours:             g('orAnesNpoHours'),
        difficult_airway_anticipated: chk('orAnesDifficultAirway'),
        anesthesia_type:              g('orAnesType'),
        airway_device:                g('orAnesAirwayDevice'),
        ett_size_mm:                  g('orAnesEttSize'),
        ett_depth_cm:                 g('orAnesEttDepth'),
        laryngoscopy_type:            g('orAnesLaryngoscopy'),
        cormack_lehane_grade:         g('orAnesCormackGrade'),
        intubation_attempts:          g('orAnesIntubationAttempts'),
        ventilator_mode:              g('orAnesVentilatorMode'),
        induction_drugs:              g('orAnesInductionDrugs'),
        maintenance_agents:           g('orAnesMaintenanceAgents'),
        regional_neuraxial_details:   g('orAnesRegionalDetails'),
        reversal_emergence_drugs:     g('orAnesReversalDrugs'),
        estimated_blood_loss_ml:      g('orAnesEblMl'),
        urine_output_ml:              g('orAnesUrineMl'),
        crystalloids_ml:              g('orAnesCrystalloidsMl'),
        colloids_ml:                  g('orAnesColloidsMl'),
        blood_products_ml:            g('orAnesBloodProductsMl'),
        aldrete_activity:             g('orAnesAldreteActivity'),
        aldrete_respiration:          g('orAnesAldreteRespiration'),
        aldrete_circulation:          g('orAnesAldreteCirculation'),
        aldrete_consciousness:        g('orAnesAldreteConsciousness'),
        aldrete_oxygenation:          g('orAnesAldreteOxygenation'),
        pacu_handoff_notes:           g('orAnesPacuNotes'),
        anesthesia_start_time:        g('orAnesStartTime'),
        anesthesia_end_time:          g('orAnesEndTime'),
        anesthesiologist_name:        g('orAnesAnesthesiologist'),
        intraop_complications:        g('orAnesComplications'),
        record_status:                statusVal,
        anesthesiologist_signature:   g('orAnesSignature'),
    };

    if (saveBtn) saveBtn.disabled = true;
    if (finBtn) finBtn.disabled = true;

    try {
        const res = await api('/or-management/anesthesia-records/save', {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        if (res && (res.success || res.data)) {
            const saved = res.data || {};
            showToast(
                finalize
                    ? `Electronic Anesthesia Record ${saved.record_number || ''} signed & finalized (Aldrete ${saved.aldrete_total_score ?? 10}/10).`
                    : `Electronic Anesthesia Record ${saved.record_number || ''} saved & synced to OR Case.`,
                'success'
            );
            const modal = document.getElementById('orAnesthesiaModal');
            if (modal) modal.style.display = 'none';
            await fetchSchedule(true);
        } else {
            showToast(res?.message || 'Failed to save Electronic Anesthesia Record.', 'error');
        }
    } catch (err) {
        console.error('Error saving Electronic Anesthesia Record:', err);
        showToast(err?.message || 'Error saving Electronic Anesthesia Record.', 'error');
    } finally {
        if (saveBtn) saveBtn.disabled = false;
        if (finBtn) finBtn.disabled = false;
    }
}


/* ============================================================================
 * SURGICAL SPONGE, SHARPS & NEEDLE COUNT RECONCILIATION (or_sponge_needle_counts)
 * Dual Scrub Nurse + Circulating Nurse Sign-Offs across Initial, Closure & Final Counts
 * ============================================================================ */

const SPONGE_COUNT_CATEGORIES = [
    'lap_sponges',
    'raytec_sponges',
    'suture_needles',
    'blades_sharps',
    'instruments',
];

function setupSpongeCountModal() {
    const modal = document.getElementById('orSpongeCountModal');
    const closeX = document.getElementById('orCloseSpongeCountModal');
    const cancelBtn = document.getElementById('orCancelSpongeCountBtn');
    const form = document.getElementById('orSpongeCountForm');
    const dualSignAllBtn = document.getElementById('orDualSignAllCountsBtn');
    const autoMatchBtn = document.getElementById('orCntAutoMatchAllBtn');

    const closeCnt = () => {
        if (modal) modal.style.display = 'none';
    };

    if (closeX) closeX.addEventListener('click', closeCnt);
    if (cancelBtn) cancelBtn.addEventListener('click', closeCnt);
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeCnt();
        });
    }

    // Live itemized expected & variance calculation
    document.querySelectorAll('.or-cnt-input').forEach((inp) => {
        inp.addEventListener('input', updateSpongeCountLiveCalculations);
    });

    // 1-Click Surgical Pack Presets
    document.querySelectorAll('.or-cnt-preset-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const preset = btn.getAttribute('data-preset');
            if (preset) applySpongeCountPreset(preset);
        });
    });

    // Reconcile All Closure & Final Counts to Expected Total
    if (autoMatchBtn) {
        autoMatchBtn.addEventListener('click', () => {
            SPONGE_COUNT_CATEGORIES.forEach((key) => {
                const init = Math.max(0, parseInt(document.getElementById(`orCnt_${key}_initial`)?.value || '0', 10) || 0);
                const add = Math.max(0, parseInt(document.getElementById(`orCnt_${key}_added`)?.value || '0', 10) || 0);
                const expected = init + add;
                const closEl = document.getElementById(`orCnt_${key}_closure_counted`);
                const finEl = document.getElementById(`orCnt_${key}_final_counted`);
                if (closEl) closEl.value = String(expected);
                if (finEl) finEl.value = String(expected);
            });
            updateSpongeCountLiveCalculations();
            showToast('Reconciled all Cavity Closure & Final Skin counts to Expected Totals.', 'success');
        });
    }

    // 1-Click Dual-Sign per Phase buttons (Scrub Nurse + Circulating Nurse)
    document.querySelectorAll('.or-cnt-sign-phase-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const phase = btn.getAttribute('data-phase');
            const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            if (phase === 'initial') {
                const sName = document.getElementById('orCntInitScrubName')?.value || 'RN Maria Santos';
                const cName = document.getElementById('orCntInitCircName')?.value || 'RN Angela Reyes';
                document.getElementById('orCntInitScrubSig').value = `Signed: ${sName} (${ts})`;
                document.getElementById('orCntInitCircSig').value = `Verified: ${cName} (${ts})`;
            } else if (phase === 'closure') {
                const sName = document.getElementById('orCntClosScrubName')?.value || 'RN Maria Santos';
                const cName = document.getElementById('orCntClosCircName')?.value || 'RN Angela Reyes';
                document.getElementById('orCntClosScrubSig').value = `Signed: ${sName} (${ts})`;
                document.getElementById('orCntClosCircSig').value = `Verified: ${cName} (${ts})`;
            } else if (phase === 'final') {
                const sName = document.getElementById('orCntFinScrubName')?.value || 'RN Maria Santos';
                const cName = document.getElementById('orCntFinCircName')?.value || 'RN Angela Reyes';
                document.getElementById('orCntFinScrubSig').value = `Signed: ${sName} (${ts})`;
                document.getElementById('orCntFinCircSig').value = `Verified: ${cName} (${ts})`;
            }
            updateSpongeCountLiveCalculations();
            showToast(`Dual Scrub & Circulating Nurse signatures applied for ${phase.toUpperCase()} count.`, 'info');
        });
    });

    if (form) {
        form.addEventListener('submit', (e) => handleSpongeCountSubmit(e, false));
    }
    if (dualSignAllBtn) {
        dualSignAllBtn.addEventListener('click', (e) => handleSpongeCountSubmit(e, true));
    }
}

function updateSpongeCountLiveCalculations() {
    let anyDiscrepancy = false;

    SPONGE_COUNT_CATEGORIES.forEach((key) => {
        const init = Math.max(0, parseInt(document.getElementById(`orCnt_${key}_initial`)?.value || '0', 10) || 0);
        const add = Math.max(0, parseInt(document.getElementById(`orCnt_${key}_added`)?.value || '0', 10) || 0);
        const expected = init + add;
        const clos = Math.max(0, parseInt(document.getElementById(`orCnt_${key}_closure_counted`)?.value || '0', 10) || 0);
        const fin = Math.max(0, parseInt(document.getElementById(`orCnt_${key}_final_counted`)?.value || '0', 10) || 0);

        const expEl = document.getElementById(`orCnt_${key}_expected`);
        if (expEl) expEl.textContent = String(expected);

        const closVar = clos - expected;
        const finVar = fin - expected;

        if (closVar !== 0 || finVar !== 0) {
            anyDiscrepancy = true;
        }

        const closBadge = document.getElementById(`orCnt_${key}_closure_badge`);
        if (closBadge) {
            if (closVar === 0) {
                closBadge.textContent = '✓ OK';
                closBadge.style.background = '#dcfce7';
                closBadge.style.color = '#166534';
            } else {
                closBadge.textContent = `🚨 ${closVar > 0 ? '+' : ''}${closVar}`;
                closBadge.style.background = '#fee2e2';
                closBadge.style.color = '#991b1b';
            }
        }

        const finBadge = document.getElementById(`orCnt_${key}_final_badge`);
        if (finBadge) {
            if (finVar === 0) {
                finBadge.textContent = '✓ OK';
                finBadge.style.background = '#dcfce7';
                finBadge.style.color = '#166534';
            } else {
                finBadge.textContent = `🚨 ${finVar > 0 ? '+' : ''}${finVar}`;
                finBadge.style.background = '#fee2e2';
                finBadge.style.color = '#991b1b';
            }
        }
    });

    const alertBox = document.getElementById('orCntDiscrepancyAlertBox');
    if (alertBox) {
        alertBox.style.display = anyDiscrepancy ? 'block' : 'none';
    }

    const statusBadge = document.getElementById('orCntOverallStatusBadge');
    if (statusBadge) {
        if (anyDiscrepancy) {
            statusBadge.textContent = '🚨 Count Discrepancy — X-Ray Protocol Active';
            statusBadge.style.background = '#fee2e2';
            statusBadge.style.color = '#991b1b';
        } else {
            const allSigned = [
                'orCntInitScrubSig', 'orCntInitCircSig',
                'orCntClosScrubSig', 'orCntClosCircSig',
                'orCntFinScrubSig', 'orCntFinCircSig'
            ].every((id) => (document.getElementById(id)?.value || '').trim() !== '');

            if (allSigned) {
                statusBadge.textContent = '✓ All Counts Correct & Dual-Signed';
                statusBadge.style.background = '#dcfce7';
                statusBadge.style.color = '#166534';
            } else {
                statusBadge.textContent = 'Counts Match — Awaiting Dual Signatures';
                statusBadge.style.background = '#fef3c7';
                statusBadge.style.color = '#92400e';
            }
        }
    }
}

function applySpongeCountPreset(preset) {
    const setRow = (key, init, add) => {
        const exp = init + add;
        const iEl = document.getElementById(`orCnt_${key}_initial`);
        const aEl = document.getElementById(`orCnt_${key}_added`);
        const cEl = document.getElementById(`orCnt_${key}_closure_counted`);
        const fEl = document.getElementById(`orCnt_${key}_final_counted`);
        if (iEl) iEl.value = String(init);
        if (aEl) aEl.value = String(add);
        if (cEl) cEl.value = String(exp);
        if (fEl) fEl.value = String(exp);
    };

    if (preset === 'major_laparotomy') {
        setRow('lap_sponges', 15, 5);
        setRow('raytec_sponges', 20, 10);
        setRow('suture_needles', 16, 4);
        setRow('blades_sharps', 4, 1);
        setRow('instruments', 60, 4);
    } else if (preset === 'laparoscopic') {
        setRow('lap_sponges', 5, 0);
        setRow('raytec_sponges', 10, 0);
        setRow('suture_needles', 6, 2);
        setRow('blades_sharps', 3, 0);
        setRow('instruments', 32, 0);
    } else if (preset === 'obgyn_cesarean') {
        setRow('lap_sponges', 10, 5);
        setRow('raytec_sponges', 10, 0);
        setRow('suture_needles', 12, 3);
        setRow('blades_sharps', 4, 0);
        setRow('instruments', 42, 0);
    }

    updateSpongeCountLiveCalculations();
    showToast('Applied surgical count pack preset.', 'info');
}

async function openSpongeCountModal(caseId) {
    const modal = document.getElementById('orSpongeCountModal');
    if (!modal || !caseId) return;

    try {
        const res = await api(`/or-management/sponge-counts?surgical_case_id=${encodeURIComponent(caseId)}`);
        const payload = res?.data || {};
        const localCase = (currentScheduleData.cases || []).find((c) => Number(c.id) === Number(caseId)) || {};
        const surgicalCase = payload.surgical_case || localCase;
        const record = payload.record || null;

        populateSpongeCountModal(surgicalCase, record);
        modal.style.display = 'flex';
    } catch (err) {
        console.error('Error loading Sponge Count Reconciliation:', err);
        const localCase = (currentScheduleData.cases || []).find((c) => Number(c.id) === Number(caseId)) || { id: caseId };
        populateSpongeCountModal(localCase, null);
        modal.style.display = 'flex';
    }
}

function populateSpongeCountModal(surgicalCase, record) {
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val !== null && val !== undefined ? val : '';
    };
    const setChk = (id, checked) => {
        const el = document.getElementById(id);
        if (el) el.checked = Boolean(checked);
    };

    const caseId = surgicalCase?.id || record?.surgical_case_id || '';
    const patientId = surgicalCase?.patient_id || record?.patient_id || '';
    setVal('orCntSurgicalCaseId', caseId);
    setVal('orCntPatientId', patientId);
    setVal('orCntRecordId', record?.id || '');

    const patBanner = document.getElementById('orCntPatientBanner');
    if (patBanner) {
        patBanner.textContent = `${surgicalCase?.patient_name || 'Patient'} (${surgicalCase?.patient_mrn || 'MRN'}) • ${surgicalCase?.case_number || `Case #${caseId}`}`;
    }
    const caseBanner = document.getElementById('orCntCaseBanner');
    if (caseBanner) {
        caseBanner.textContent = `${surgicalCase?.procedure_name || 'Surgical Procedure'} • ${surgicalCase?.suite_code || surgicalCase?.or_suite_name || 'OR Suite'} • Lead Surgeon: ${surgicalCase?.lead_surgeon || '--'}`;
    }

    const numBadge = document.getElementById('orCntRecordNumBadge');
    if (numBadge) {
        numBadge.textContent = record?.count_record_number || 'NEW COUNT SHEET';
    }

    const defaultScrub = surgicalCase?.scrub_nurse || 'RN Maria Santos (Scrub Nurse)';
    const defaultCirc = surgicalCase?.circulating_nurse || 'RN Angela Reyes (Circulating Nurse)';
    const defaultSurgeonAck = surgicalCase?.lead_surgeon
        ? `Verbal & Written Count Verification Acknowledged by ${surgicalCase.lead_surgeon}`
        : 'Verbal & Written Count Verification Acknowledged by Attending Surgeon';

    if (record) {
        SPONGE_COUNT_CATEGORIES.forEach((key) => {
            setVal(`orCnt_${key}_initial`, record[`${key}_initial`] ?? 0);
            setVal(`orCnt_${key}_added`, record[`${key}_added`] ?? 0);
            setVal(`orCnt_${key}_closure_counted`, record[`${key}_closure_counted`] ?? 0);
            setVal(`orCnt_${key}_final_counted`, record[`${key}_final_counted`] ?? 0);
        });

        setVal('orCntInitScrubName', record.initial_scrub_nurse_name || defaultScrub);
        setVal('orCntInitScrubSig', record.initial_scrub_signature || '');
        setVal('orCntInitCircName', record.initial_circulating_nurse_name || defaultCirc);
        setVal('orCntInitCircSig', record.initial_circulating_signature || '');

        setVal('orCntClosScrubName', record.closure_scrub_nurse_name || defaultScrub);
        setVal('orCntClosScrubSig', record.closure_scrub_signature || '');
        setVal('orCntClosCircName', record.closure_circulating_nurse_name || defaultCirc);
        setVal('orCntClosCircSig', record.closure_circulating_signature || '');

        setVal('orCntFinScrubName', record.final_scrub_nurse_name || defaultScrub);
        setVal('orCntFinScrubSig', record.final_scrub_signature || '');
        setVal('orCntFinCircName', record.final_circulating_nurse_name || defaultCirc);
        setVal('orCntFinCircSig', record.final_circulating_signature || '');

        setChk('orCntSurgeonNotified', Number(record.surgeon_notified_of_count ?? 1) === 1);
        setChk('orCntXrayOrdered', Number(record.intraop_xray_ordered ?? 0) === 1);
        setVal('orCntSurgeonAck', record.attending_surgeon_acknowledgment || defaultSurgeonAck);
        setVal('orCntXrayFindings', record.intraop_xray_findings || '');
        setVal('orCntResolutionNotes', record.discrepancy_resolution_notes || 'All surgical sponges, Raytec gauze, suture needles, blades/sharps, and instruments accounted for across Initial, Closure, and Final counts.');
    } else {
        const defaults = {
            lap_sponges: 10,
            raytec_sponges: 20,
            suture_needles: 12,
            blades_sharps: 4,
            instruments: 45,
        };
        SPONGE_COUNT_CATEGORIES.forEach((key) => {
            const v = defaults[key] ?? 10;
            setVal(`orCnt_${key}_initial`, v);
            setVal(`orCnt_${key}_added`, 0);
            setVal(`orCnt_${key}_closure_counted`, v);
            setVal(`orCnt_${key}_final_counted`, v);
        });

        setVal('orCntInitScrubName', defaultScrub);
        setVal('orCntInitScrubSig', `Signed: ${defaultScrub} [Initial]`);
        setVal('orCntInitCircName', defaultCirc);
        setVal('orCntInitCircSig', `Verified: ${defaultCirc} [Initial]`);

        setVal('orCntClosScrubName', defaultScrub);
        setVal('orCntClosScrubSig', '');
        setVal('orCntClosCircName', defaultCirc);
        setVal('orCntClosCircSig', '');

        setVal('orCntFinScrubName', defaultScrub);
        setVal('orCntFinScrubSig', '');
        setVal('orCntFinCircName', defaultCirc);
        setVal('orCntFinCircSig', '');

        setChk('orCntSurgeonNotified', true);
        setChk('orCntXrayOrdered', false);
        setVal('orCntSurgeonAck', defaultSurgeonAck);
        setVal('orCntXrayFindings', '');
        setVal('orCntResolutionNotes', 'All surgical sponges, Raytec gauze, suture needles, blades/sharps, and instruments accounted for across Initial, Closure, and Final counts.');
    }

    updateSpongeCountLiveCalculations();
}

async function handleSpongeCountSubmit(e, dualSignAllPhases = false) {
    if (e) e.preventDefault();

    const saveBtn = document.getElementById('orSaveSpongeCountBtn');
    const signAllBtn = document.getElementById('orDualSignAllCountsBtn');
    const g = (id) => document.getElementById(id)?.value ?? '';
    const chk = (id) => (document.getElementById(id)?.checked ? 1 : 0);

    const surgicalCaseId = Number(g('orCntSurgicalCaseId'));
    if (!surgicalCaseId) {
        showToast('Missing surgical case ID for Sponge Count Reconciliation.', 'error');
        return;
    }

    const payload = {
        surgical_case_id:                 surgicalCaseId,
        patient_id:                       g('orCntPatientId') || null,
        dual_sign_all_phases:             dualSignAllPhases ? 1 : 0,
        initial_scrub_nurse_name:         g('orCntInitScrubName'),
        initial_scrub_signature:          g('orCntInitScrubSig'),
        initial_circulating_nurse_name:   g('orCntInitCircName'),
        initial_circulating_signature:    g('orCntInitCircSig'),
        closure_scrub_nurse_name:         g('orCntClosScrubName'),
        closure_scrub_signature:          g('orCntClosScrubSig'),
        closure_circulating_nurse_name:   g('orCntClosCircName'),
        closure_circulating_signature:    g('orCntClosCircSig'),
        final_scrub_nurse_name:           g('orCntFinScrubName'),
        final_scrub_signature:            g('orCntFinScrubSig'),
        final_circulating_nurse_name:     g('orCntFinCircName'),
        final_circulating_signature:      g('orCntFinCircSig'),
        surgeon_notified_of_count:        chk('orCntSurgeonNotified'),
        intraop_xray_ordered:             chk('orCntXrayOrdered'),
        attending_surgeon_acknowledgment: g('orCntSurgeonAck'),
        intraop_xray_findings:            g('orCntXrayFindings'),
        discrepancy_resolution_notes:     g('orCntResolutionNotes'),
    };

    SPONGE_COUNT_CATEGORIES.forEach((key) => {
        payload[`${key}_initial`] = g(`orCnt_${key}_initial`);
        payload[`${key}_added`] = g(`orCnt_${key}_added`);
        payload[`${key}_closure_counted`] = g(`orCnt_${key}_closure_counted`);
        payload[`${key}_final_counted`] = g(`orCnt_${key}_final_counted`);
    });

    if (saveBtn) saveBtn.disabled = true;
    if (signAllBtn) signAllBtn.disabled = true;

    try {
        const res = await api('/or-management/sponge-counts/save', {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        if (res && (res.success || res.data)) {
            const saved = res.data || {};
            showToast(
                dualSignAllPhases
                    ? `Sponge, Sharps & Needle Count ${saved.count_record_number || ''} reconciled & dual-signed across Initial, Closure & Final counts!`
                    : `Sponge, Sharps & Needle Count ${saved.count_record_number || ''} saved (${saved.overall_reconciliation_status || 'Updated'}).`,
                Number(saved.has_discrepancy) ? 'warning' : 'success'
            );
            const modal = document.getElementById('orSpongeCountModal');
            if (modal) modal.style.display = 'none';
            await fetchSchedule(true);
        } else {
            showToast(res?.message || 'Failed to save Sponge Count Reconciliation.', 'error');
        }
    } catch (err) {
        console.error('Error saving Sponge Count Reconciliation:', err);
        showToast(err?.message || 'Error saving Sponge Count Reconciliation.', 'error');
    } finally {
        if (saveBtn) saveBtn.disabled = false;
        if (signAllBtn) signAllBtn.disabled = false;
    }
}
