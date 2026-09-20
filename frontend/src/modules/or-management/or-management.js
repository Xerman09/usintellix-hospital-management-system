import { api } from '../../core/api.js';
import { populatePatientSelector, calculateAgeFromDob } from '../../core/patient-chart-helper.js?v=1';

let currentScheduleData = {
    cases: [],
    suites: [],
    kpis: {},
    specialties: [],
    surgeons: []
};

let clockIntervalId = null;
let autoRefreshIntervalId = null;
let activeViewMode = 'whiteboard'; // 'whiteboard' | 'table'

export async function initOrManagement() {
    setupLiveClock();
    setupEventListeners();
    setupPatientPicker();
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
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }
    updateDateDisplay();
}

function updateDateDisplay() {
    const dateInput = document.getElementById('orFilterDate');
    const dateStrEl = document.getElementById('orLiveDateStr');
    if (!dateStrEl) return;

    let targetDate = new Date();
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
        const now = new Date();
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
            const cur = dateInput.value ? new Date(dateInput.value) : new Date();
            cur.setDate(cur.getDate() - 1);
            dateInput.value = cur.toISOString().split('T')[0];
            updateDateDisplay();
            fetchSchedule();
        });
    }

    if (todayBtn && dateInput) {
        todayBtn.addEventListener('click', () => {
            dateInput.value = new Date().toISOString().split('T')[0];
            updateDateDisplay();
            fetchSchedule();
        });
    }

    if (nextBtn && dateInput) {
        nextBtn.addEventListener('click', () => {
            const cur = dateInput.value ? new Date(dateInput.value) : new Date();
            cur.setDate(cur.getDate() + 1);
            dateInput.value = cur.toISOString().split('T')[0];
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

    const openBookModal = (preselectedSuiteId = null) => {
        const curDate = document.getElementById('orFilterDate')?.value || new Date().toISOString().split('T')[0];
        const fDate = document.getElementById('orFDate');
        if (fDate) fDate.value = curDate;
        populateSuiteSelect('orFSuiteId', preselectedSuiteId);
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

    // Expose global helpers
    window.__orOpenDetail = openDetailModal;
    window.__orOpenStage = openStageModal;
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
                elapsedMin = Math.max(0, Math.floor((new Date() - new Date(ac.actual_incision_time)) / 60000));
            } else if (ac.actual_in_room_time) {
                elapsedMin = Math.max(0, Math.floor((new Date() - new Date(ac.actual_in_room_time)) / 60000));
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
                <button type="button" class="or-btn-advance" onclick="window.__orOpenStage(${s.current_case_id}, '${esc(ac.perioperative_stage)}')" style="padding:4px 10px;font-size:11px;">
                    Advance &rarr;
                </button>
            `;
        } else if (isTurnover) {
            let elMin = 0;
            if (s.turnover_started_at) {
                elMin = Math.max(0, Math.floor((new Date() - new Date(s.turnover_started_at)) / 60000));
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
                const el = Math.max(0, Math.floor((new Date() - new Date(c.actual_incision_time)) / 60000));
                liveTimerChip = `<span class="or-chip or-chip-red" style="animation: orPulse 1.5s infinite;">⏱ ${el}m incised</span>`;
            } else if (c.perioperative_stage === 'In PACU' && c.actual_out_room_time) {
                const el = Math.max(0, Math.floor((new Date() - new Date(c.actual_out_room_time)) / 60000));
                liveTimerChip = `<span class="or-chip or-chip-purple">⏱ ${el}m PACU</span>`;
            }

            const initials = getInitials(c.patient_name);

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
                        ${liveTimerChip}
                    </div>

                    <div class="or-card-actions">
                        <button type="button" class="or-btn-view" onclick="window.__orOpenDetail(${c.id})">Details</button>
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
                </td>
                <td>${priorityBadge}</td>
                <td>
                    <span style="font-size:11px;font-weight:700;color:#0f172a;">${esc(c.perioperative_stage)}</span>
                    <div class="or-stepper-dots">${dotsHtml}</div>
                </td>
                <td style="font-size:11px;white-space:nowrap;">${readinessIcons}</td>
                <td style="text-align:right;white-space:nowrap;">
                    <button type="button" class="or-btn-view" onclick="window.__orOpenDetail(${c.id})" style="padding:3px 8px;font-size:11px;margin-right:4px;">Details</button>
                    <button type="button" class="or-btn-advance" onclick="window.__orOpenStage(${c.id}, '${esc(c.perioperative_stage)}')" style="padding:3px 9px;font-size:11px;">Advance</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function handleBookSubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('orSubmitBookBtn');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Scheduling...'; }

    const g = id => document.getElementById(id)?.value || '';
    const chk = id => document.getElementById(id)?.checked ? 1 : 0;

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
        perioperative_stage:        g('orFStage'),
        surgical_specialty:         g('orFSpecialty'),
        procedure_name:             g('orFProcedure'),
        preop_diagnosis:            g('orFPreopDiag'),
        lead_surgeon:               g('orFSurgeon'),
        assistant_surgeon:          g('orFAssistant'),
        anesthesiologist:           g('orFAnesthesiologist'),
        anesthesia_type:            g('orFAnesthesiaType'),
        scrub_nurse:                g('orFScrub'),
        circulating_nurse:          g('orFCirculator'),
        preop_cleared:              chk('orFPreopCleared'),
        consent_signed:             chk('orFConsentSigned'),
        blood_reserved:             chk('orFBloodReserved'),
        implants_required:          chk('orFImplantsRequired'),
        notes:                      g('orFNotes'),
    };

    try {
        const res = await api('/or-management/cases', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (res.success) {
            alert(`Surgical Case Booked Successfully! Case Number: ${res.data?.case_number || ''}`);
            const modal = document.getElementById('orBookModal');
            if (modal) modal.style.display = 'none';
            document.getElementById('orBookForm')?.reset();
            await fetchSchedule();
        } else {
            alert('Error: ' + (res.message || 'Failed to book surgical case.'));
        }
    } catch (err) {
        console.error(err);
        alert('An unexpected error occurred while scheduling case.');
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Confirm & Schedule Case'; }
    }
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
            alert('Error updating stage: ' + (res.message || 'Operation failed.'));
        }
    } catch (err) {
        console.error(err);
        alert('An unexpected error occurred while updating stage.');
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
            alert('Unable to load surgical case details.');
        }
    } catch (err) {
        console.error(err);
        alert('An error occurred while loading case details.');
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
                    <button type="button" onclick="window.__openDashboardTab('surgical_safety', 'Surgical Safety Checklist')" class="or-btn-primary" style="background:#059669;font-size:11px;padding:6px 12px;">
                        Open Checklist &rarr;
                    </button>
                </div>
            `;
        } else {
            safetyLinkEl.innerHTML = `
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;display:flex;justify-content:space-between;align-items:center;">
                    <div style="font-size:12px;color:#64748b;">No linked Universal Protocol Time-Out checklist yet recorded.</div>
                    <button type="button" onclick="window.__openDashboardTab('surgical_safety', 'Surgical Safety Checklist')" class="or-btn-secondary" style="font-size:11px;padding:6px 12px;">
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
                alert('Error: ' + (res.message || 'Failed to update suite status.'));
            }
        } catch (err) {
            console.error(err);
            alert('An unexpected error occurred while updating suite status.');
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
            alert(editId ? 'OR Suite updated successfully!' : `New OR Suite registered successfully: ${res.data?.suite_code || ''}`);
            const modal = document.getElementById('orRegisterSuiteModal');
            if (modal) modal.style.display = 'none';
            resetRegSuiteForm();
            await fetchSchedule();
        } else {
            alert('Error: ' + (res.message || 'Operation failed.'));
        }
    } catch (err) {
        console.error(err);
        alert('An unexpected error occurred while saving suite.');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = editId ? 'Update OR Suite Configuration' : 'Save & Register OR Suite';
        }
    }
}
