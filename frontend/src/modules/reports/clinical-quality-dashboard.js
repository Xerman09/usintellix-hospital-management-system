import { api } from '../../core/api.js?v=10';
import { todayISO } from '../../core/timezone.js?v=3';

let activeChartType = 'bor';
let cachedSummary = null;
let cachedTrends = [];
let cachedWards = [];

export async function initClinicalQualityDashboard() {
    setupDateDefaults();
    setupEventListeners();
    await loadAllDashboardData();
}

function setupDateDefaults() {
    const today = todayISO ? todayISO() : new Date().toISOString().split('T')[0];
    const toInput = document.getElementById('cqdDateTo');
    const fromInput = document.getElementById('cqdDateFrom');

    if (toInput && !toInput.value) {
        toInput.value = today;
    }
    if (fromInput && !fromInput.value) {
        const d = new Date();
        d.setDate(d.getDate() - 29);
        fromInput.value = d.toISOString().split('T')[0];
    }
}

function setupEventListeners() {
    // Quick Range Pills
    const pills = document.querySelectorAll('.cqd-btn-pill');
    pills.forEach(pill => {
        pill.addEventListener('click', (e) => {
            pills.forEach(p => p.classList.remove('active'));
            e.currentTarget.classList.add('active');
            const days = parseInt(e.currentTarget.dataset.days, 10);
            applyQuickRange(days);
        });
    });

    // Apply Filter Button
    const applyBtn = document.getElementById('cqdFilterApplyBtn');
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            loadAllDashboardData();
        });
    }

    // Chart Tab Buttons
    const chartTabs = document.querySelectorAll('.cqd-tab-btn');
    chartTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            chartTabs.forEach(t => t.classList.remove('active'));
            e.currentTarget.classList.add('active');
            activeChartType = e.currentTarget.dataset.chart;
            renderChart();
        });
    });

    // Manual Aggregation Button (Run Census Engine Now)
    const runAggBtn = document.getElementById('cqdRunAggregationBtn');
    if (runAggBtn) {
        runAggBtn.addEventListener('click', handleManualAggregation);
    }

    // Print Button
    const printBtn = document.getElementById('cqdPrintBtn');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }

    // Ward select change triggers reload
    const wardSelect = document.getElementById('cqdWardSelect');
    if (wardSelect) {
        wardSelect.addEventListener('change', () => {
            loadAllDashboardData();
        });
    }
}

function applyQuickRange(days) {
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - (days - 1));

    const toInput = document.getElementById('cqdDateTo');
    const fromInput = document.getElementById('cqdDateFrom');

    if (toInput) toInput.value = toDate.toISOString().split('T')[0];
    if (fromInput) fromInput.value = fromDate.toISOString().split('T')[0];

    loadAllDashboardData();
}

async function loadAllDashboardData() {
    const from = document.getElementById('cqdDateFrom')?.value || '';
    const to = document.getElementById('cqdDateTo')?.value || '';
    const wardId = document.getElementById('cqdWardSelect')?.value || '0';

    await Promise.all([
        fetchSummary(from, to, wardId),
        fetchTrends(from, to, wardId),
        fetchWardBreakdown(from, to)
    ]);
}

async function fetchSummary(from, to, wardId) {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (wardId !== undefined && wardId !== '') params.append('ward_id', wardId);

    try {
        const res = await api(`/reports/clinical-quality/summary?${params.toString()}`);
        if (res && res.success && res.data) {
            cachedSummary = res.data;
            renderSummary(res.data);
        }
    } catch (err) {
        console.error('Failed to fetch clinical quality summary', err);
    }
}

function renderSummary(data) {
    const snap = data.current_snapshot || {};
    const metrics = data.metrics || {};

    // 1. Snapshot Strip
    const snapDateEl = document.getElementById('cqdSnapDate');
    if (snapDateEl) snapDateEl.textContent = snap.date || 'Today';

    const snapAvail = document.getElementById('cqdSnapAvail');
    if (snapAvail) snapAvail.textContent = snap.available_beds ?? '-';

    const snapOcc = document.getElementById('cqdSnapOccupied');
    if (snapOcc) snapOcc.textContent = snap.occupied_beds ?? '-';

    const snapVac = document.getElementById('cqdSnapVacant');
    if (snapVac) snapVac.textContent = snap.vacant_beds ?? '-';

    const snapBlk = document.getElementById('cqdSnapBlocked');
    if (snapBlk) snapBlk.textContent = snap.blocked_beds ?? '-';

    const snapBor = document.getElementById('cqdSnapBor');
    if (snapBor) snapBor.textContent = (snap.bor_today !== undefined ? snap.bor_today : 0) + '%';

    // 2. Core KPIs
    // BOR %
    const borEl = document.getElementById('cqdKpiBor');
    if (borEl) borEl.textContent = metrics.bed_occupancy_rate ?? '--';
    const occDaysEl = document.getElementById('cqdOccDays');
    if (occDaysEl) occDaysEl.textContent = (metrics.total_occupied_bed_days || 0).toLocaleString();
    const availDaysEl = document.getElementById('cqdAvailDays');
    if (availDaysEl) availDaysEl.textContent = (metrics.total_available_bed_days || 0).toLocaleString();

    const borBadge = document.getElementById('cqdBorBadge');
    if (borBadge) {
        const bor = metrics.bed_occupancy_rate || 0;
        if (bor >= 75 && bor <= 85) {
            borBadge.className = 'cqd-kpi-badge status-optimal';
            borBadge.textContent = 'Optimal (75-85%)';
        } else if (bor < 75) {
            borBadge.className = 'cqd-kpi-badge status-warning';
            borBadge.textContent = 'Underutilized (<75%)';
        } else {
            borBadge.className = 'cqd-kpi-badge status-danger';
            borBadge.textContent = 'High Surge (>85%)';
        }
    }

    // ALOS
    const alosEl = document.getElementById('cqdKpiAlos');
    if (alosEl) alosEl.textContent = metrics.average_length_of_stay ?? '--';
    const stayDaysEl = document.getElementById('cqdStayDays');
    if (stayDaysEl) stayDaysEl.textContent = (metrics.total_discharge_stay_days || 0).toLocaleString();
    const dischEl = document.getElementById('cqdDischarges');
    if (dischEl) dischEl.textContent = (metrics.total_discharges || 0).toLocaleString();

    const alosBadge = document.getElementById('cqdAlosBadge');
    if (alosBadge) {
        const alos = metrics.average_length_of_stay || 0;
        if (alos <= 5.0) {
            alosBadge.className = 'cqd-kpi-badge status-optimal';
            alosBadge.textContent = 'Target Met (<= 5d)';
        } else {
            alosBadge.className = 'cqd-kpi-badge status-warning';
            alosBadge.textContent = 'Extended Stay (> 5d)';
        }
    }

    // BTI
    const btiEl = document.getElementById('cqdKpiBti');
    if (btiEl) btiEl.textContent = metrics.bed_turnover_interval_days ?? '--';
    const vacDaysEl = document.getElementById('cqdVacantDays');
    if (vacDaysEl) vacDaysEl.textContent = (metrics.total_vacant_bed_days || 0).toLocaleString();

    // Readmission %
    const readmEl = document.getElementById('cqdKpiReadm');
    if (readmEl) readmEl.textContent = metrics.readmission_rate_pct ?? '--';
    const readmCountEl = document.getElementById('cqdReadmCount');
    if (readmCountEl) readmCountEl.textContent = metrics.total_readmissions_30d ?? 0;

    const readmBadge = document.getElementById('cqdReadmBadge');
    if (readmBadge) {
        const rRate = metrics.readmission_rate_pct || 0;
        if (rRate <= 8.0) {
            readmBadge.className = 'cqd-kpi-badge status-optimal';
            readmBadge.textContent = 'CMS Compliant (< 8%)';
        } else {
            readmBadge.className = 'cqd-kpi-badge status-danger';
            readmBadge.textContent = 'Above Benchmark';
        }
    }

    // Mortality %
    const mortEl = document.getElementById('cqdKpiMort');
    if (mortEl) mortEl.textContent = metrics.mortality_rate_pct ?? '--';
    const mortCountEl = document.getElementById('cqdMortCount');
    if (mortCountEl) mortCountEl.textContent = metrics.total_deaths ?? 0;

    // HAI / SSI
    const haiEl = document.getElementById('cqdKpiHai');
    if (haiEl) haiEl.textContent = metrics.total_hai_ssi_cases ?? 0;
    const haiRateEl = document.getElementById('cqdHaiRate');
    if (haiRateEl) haiRateEl.textContent = metrics.hai_rate_per_1000 ?? '0.0';
}

async function fetchTrends(from, to, wardId) {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (wardId !== undefined && wardId !== '') params.append('ward_id', wardId);

    try {
        const res = await api(`/reports/clinical-quality/trends?${params.toString()}`);
        if (res && res.success && res.data) {
            cachedTrends = res.data.series || [];
            const labelEl = document.getElementById('cqdChartPeriodLabel');
            if (labelEl) {
                labelEl.textContent = `${res.data.from} to ${res.data.to} (${cachedTrends.length} data points)`;
            }
            renderChart();
            renderLedgerTable(cachedTrends);
        }
    } catch (err) {
        console.error('Failed to fetch clinical quality trends', err);
    }
}

async function fetchWardBreakdown(from, to) {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);

    try {
        const res = await api(`/reports/clinical-quality/ward-breakdown?${params.toString()}`);
        if (res && res.success && res.data) {
            cachedWards = res.data.wards || [];
            populateWardDropdown(cachedWards);
            renderWardTable(cachedWards);
        }
    } catch (err) {
        console.error('Failed to fetch ward breakdown', err);
    }
}

function populateWardDropdown(wards) {
    const sel = document.getElementById('cqdWardSelect');
    if (!sel || sel.options.length > 1) return;

    wards.forEach(w => {
        const opt = document.createElement('option');
        opt.value = w.ward_id;
        opt.textContent = `${w.ward_name} (${w.ward_code})`;
        sel.appendChild(opt);
    });
}

function renderWardTable(wards) {
    const tbody = document.getElementById('cqdWardTableBody');
    const countLabel = document.getElementById('cqdWardCountLabel');
    if (countLabel) countLabel.textContent = `${wards.length} Active Hospital Units`;

    if (!tbody) return;
    if (!wards || wards.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:20px; color:#94a3b8;">No ward metrics found.</td></tr>`;
        return;
    }

    tbody.innerHTML = wards.map(w => {
        const bor = parseFloat(w.avg_bor_percentage) || 0;
        let barColor = '#10b981';
        let statusBadge = '<span class="cqd-kpi-badge status-optimal">Optimal</span>';
        if (bor < 60) {
            barColor = '#f59e0b';
            statusBadge = '<span class="cqd-kpi-badge status-warning">Low Census</span>';
        } else if (bor > 85) {
            barColor = '#ef4444';
            statusBadge = '<span class="cqd-kpi-badge status-danger">Near Surge</span>';
        }

        return `
            <tr>
                <td>
                    <strong style="color: #0f172a;">${escapeHtml(w.ward_name)}</strong>
                    <div style="font-size: 11px; color: #64748b;">Code: ${escapeHtml(w.ward_code)}</div>
                </td>
                <td>
                    <span style="font-size: 11px; background: #f1f5f9; padding: 2px 7px; border-radius: 4px; font-weight: 500; color: #475569;">
                        ${escapeHtml(w.ward_type || 'General')}
                    </span>
                </td>
                <td style="text-align: center; font-weight: 600;">${w.capacity_beds} beds</td>
                <td class="cqd-bar-cell">
                    <div style="display:flex; justify-content:space-between; font-weight:600; font-size:12px;">
                        <span>${bor.toFixed(1)}%</span>
                        <span style="color:#64748b; font-weight:normal;">${w.total_patient_days} pt-days</span>
                    </div>
                    <div class="cqd-bar-track">
                        <div class="cqd-bar-fill" style="width: ${Math.min(100, bor)}%; background: ${barColor};"></div>
                    </div>
                </td>
                <td style="text-align: right; font-weight: 600;">${w.avg_alos_days} d</td>
                <td style="text-align: right; font-weight: 600;">${w.avg_bti_days} d</td>
                <td style="text-align: center;">
                    <span style="color:#059669; font-weight:600;">+${w.total_admissions}</span> / 
                    <span style="color:#2563eb; font-weight:600;">-${w.total_discharges}</span>
                </td>
                <td style="text-align: center;">
                    <span style="color:#f59e0b; font-weight:600;">${w.total_readmissions}</span> / 
                    <span style="color:#ef4444; font-weight:600;">${w.total_deaths}</span>
                </td>
                <td style="text-align: center;">
                    ${statusBadge}
                </td>
            </tr>
        `;
    }).join('');
}

function renderLedgerTable(records) {
    const tbody = document.getElementById('cqdLedgerTableBody');
    if (!tbody) return;

    if (!records || records.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:20px; color:#94a3b8;">No census ledger records found.</td></tr>`;
        return;
    }

    // Show in reverse chronological order
    const sorted = [...records].reverse();

    tbody.innerHTML = sorted.map(r => `
        <tr>
            <td><strong style="color:#0f172a;">${escapeHtml(r.census_date)}</strong></td>
            <td><span style="font-size:12px; color:#475569;">${escapeHtml(r.ward_name || 'Hospital')}</span></td>
            <td style="text-align:right;">${r.total_available_beds}</td>
            <td style="text-align:right; font-weight:600; color:#f59e0b;">${r.occupied_beds}</td>
            <td style="text-align:right; font-weight:600; color:#10b981;">${r.vacant_beds}</td>
            <td style="text-align:right; color:#059669;">+${r.admissions_count}</td>
            <td style="text-align:right; color:#2563eb;">-${r.discharges_count}</td>
            <td style="text-align:right; font-weight:700;">${parseFloat(r.bor_percentage).toFixed(1)}%</td>
            <td style="text-align:right;">${parseFloat(r.alos_days).toFixed(1)}</td>
            <td style="text-align:right;">${parseFloat(r.bti_days).toFixed(1)}</td>
            <td><span style="font-size:11px; background:#f1f5f9; padding:2px 6px; border-radius:4px; color:#64748b;">Cron/Agg</span></td>
        </tr>
    `).join('');
}

function renderChart() {
    const wrap = document.getElementById('cqdChartWrap');
    if (!wrap) return;

    if (!cachedTrends || cachedTrends.length === 0) {
        wrap.innerHTML = `<div style="text-align:center; padding:60px 20px; color:#94a3b8;">No trend series data available for the selected filters.</div>`;
        return;
    }

    const svgWidth = 900;
    const svgHeight = 280;
    const padL = 55;
    const padR = 25;
    const padT = 25;
    const padB = 40;
    const chartW = svgWidth - padL - padR;
    const chartH = svgHeight - padT - padB;

    const data = cachedTrends;
    const n = data.length;

    let svgInner = '';

    if (activeChartType === 'bor') {
        // Bed Occupancy Rate (BOR %) Trend
        const maxY = 100;
        const getY = (val) => padT + chartH - (Math.max(0, Math.min(maxY, val)) / maxY) * chartH;
        const getX = (i) => padL + (n > 1 ? (i / (n - 1)) * chartW : chartW / 2);

        // Optimal Zone Shading (75% to 85%)
        const y75 = getY(75);
        const y85 = getY(85);
        svgInner += `
            <rect x="${padL}" y="${y85}" width="${chartW}" height="${y75 - y85}" fill="rgba(16, 185, 129, 0.12)" />
            <line x1="${padL}" y1="${y85}" x2="${padL + chartW}" y2="${y85}" stroke="#10b981" stroke-dasharray="4,4" stroke-width="1" />
            <line x1="${padL}" y1="${y75}" x2="${padL + chartW}" y2="${y75}" stroke="#10b981" stroke-dasharray="4,4" stroke-width="1" />
            <text x="${padL + chartW - 5}" y="${y85 - 4}" fill="#059669" font-size="10" font-weight="600" text-anchor="end">Optimal Upper (85%)</text>
            <text x="${padL + chartW - 5}" y="${y75 + 12}" fill="#059669" font-size="10" font-weight="600" text-anchor="end">Optimal Lower (75%)</text>
        `;

        // Grid lines (0, 25, 50, 75, 100)
        [0, 25, 50, 75, 100].forEach(tick => {
            const y = getY(tick);
            svgInner += `
                <line x1="${padL}" y1="${y}" x2="${padL + chartW}" y2="${y}" stroke="#f1f5f9" stroke-width="1" />
                <text x="${padL - 8}" y="${y + 4}" fill="#94a3b8" font-size="10" text-anchor="end">${tick}%</text>
            `;
        });

        // Path
        const points = data.map((d, i) => `${getX(i).toFixed(1)},${getY(parseFloat(d.bor_percentage) || 0).toFixed(1)}`).join(' ');
        const areaPoints = `${padL},${getY(0)} ${points} ${getX(n - 1)},${getY(0)}`;

        svgInner += `
            <polygon points="${areaPoints}" fill="rgba(37, 99, 235, 0.08)" />
            <polyline fill="none" stroke="#2563eb" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${points}" />
        `;

        // Points and Tooltips
        data.forEach((d, i) => {
            const x = getX(i);
            const val = parseFloat(d.bor_percentage) || 0;
            const y = getY(val);
            svgInner += `
                <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="#ffffff" stroke="#2563eb" stroke-width="2">
                    <title>${d.census_date}: ${val.toFixed(1)}% BOR (${d.occupied_beds}/${d.total_available_beds} beds)</title>
                </circle>
            `;
        });

    } else if (activeChartType === 'alos_bti') {
        // ALOS vs BTI Trend
        const maxVal = Math.max(10, ...data.map(d => Math.max(parseFloat(d.alos_days) || 0, parseFloat(d.bti_days) || 0)));
        const maxY = Math.ceil(maxVal * 1.15);
        const getY = (val) => padT + chartH - (Math.max(0, Math.min(maxY, val)) / maxY) * chartH;
        const getX = (i) => padL + (n > 1 ? (i / (n - 1)) * chartW : chartW / 2);

        // Grid lines
        for (let i = 0; i <= 4; i++) {
            const tick = Math.round((maxY / 4) * i * 10) / 10;
            const y = getY(tick);
            svgInner += `
                <line x1="${padL}" y1="${y}" x2="${padL + chartW}" y2="${y}" stroke="#f1f5f9" stroke-width="1" />
                <text x="${padL - 8}" y="${y + 4}" fill="#94a3b8" font-size="10" text-anchor="end">${tick}d</text>
            `;
        }

        // ALOS line (Blue)
        const alosPoints = data.map((d, i) => `${getX(i).toFixed(1)},${getY(parseFloat(d.alos_days) || 0).toFixed(1)}`).join(' ');
        svgInner += `<polyline fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${alosPoints}" />`;

        // BTI line (Purple)
        const btiPoints = data.map((d, i) => `${getX(i).toFixed(1)},${getY(parseFloat(d.bti_days) || 0).toFixed(1)}`).join(' ');
        svgInner += `<polyline fill="none" stroke="#8b5cf6" stroke-width="2.5" stroke-dasharray="4,3" stroke-linecap="round" stroke-linejoin="round" points="${btiPoints}" />`;

        // Points
        data.forEach((d, i) => {
            const x = getX(i);
            const alos = parseFloat(d.alos_days) || 0;
            const bti = parseFloat(d.bti_days) || 0;
            svgInner += `
                <circle cx="${x.toFixed(1)}" cy="${getY(alos).toFixed(1)}" r="3.5" fill="#2563eb">
                    <title>${d.census_date} ALOS: ${alos.toFixed(1)} days</title>
                </circle>
                <circle cx="${x.toFixed(1)}" cy="${getY(bti).toFixed(1)}" r="3.5" fill="#8b5cf6">
                    <title>${d.census_date} BTI: ${bti.toFixed(1)} days</title>
                </circle>
            `;
        });

    } else if (activeChartType === 'flow') {
        // Admissions vs Discharges Bar/Point flow
        const maxVal = Math.max(5, ...data.map(d => Math.max(parseInt(d.admissions_count, 10) || 0, parseInt(d.discharges_count, 10) || 0)));
        const maxY = Math.ceil(maxVal * 1.2);
        const getY = (val) => padT + chartH - (Math.max(0, Math.min(maxY, val)) / maxY) * chartH;
        const getX = (i) => padL + (n > 1 ? (i / (n - 1)) * chartW : chartW / 2);

        // Grid lines
        for (let i = 0; i <= 4; i++) {
            const tick = Math.round((maxY / 4) * i);
            const y = getY(tick);
            svgInner += `
                <line x1="${padL}" y1="${y}" x2="${padL + chartW}" y2="${y}" stroke="#f1f5f9" stroke-width="1" />
                <text x="${padL - 8}" y="${y + 4}" fill="#94a3b8" font-size="10" text-anchor="end">${tick}</text>
            `;
        }

        // Admissions (Green line)
        const admPoints = data.map((d, i) => `${getX(i).toFixed(1)},${getY(parseInt(d.admissions_count, 10) || 0).toFixed(1)}`).join(' ');
        svgInner += `<polyline fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" points="${admPoints}" />`;

        // Discharges (Blue line)
        const dischPoints = data.map((d, i) => `${getX(i).toFixed(1)},${getY(parseInt(d.discharges_count, 10) || 0).toFixed(1)}`).join(' ');
        svgInner += `<polyline fill="none" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round" points="${dischPoints}" />`;

        // Points
        data.forEach((d, i) => {
            const x = getX(i);
            const adm = parseInt(d.admissions_count, 10) || 0;
            const dis = parseInt(d.discharges_count, 10) || 0;
            svgInner += `
                <circle cx="${x.toFixed(1)}" cy="${getY(adm).toFixed(1)}" r="4" fill="#10b981"><title>${d.census_date} Admissions: ${adm}</title></circle>
                <circle cx="${x.toFixed(1)}" cy="${getY(dis).toFixed(1)}" r="4" fill="#0284c7"><title>${d.census_date} Discharges: ${dis}</title></circle>
            `;
        });

    } else if (activeChartType === 'quality') {
        // Readmission Rate % & Mortality Rate %
        const maxVal = Math.max(10, ...data.map(d => Math.max(parseFloat(d.readmission_rate_pct) || 0, parseFloat(d.mortality_rate_pct) || 0)));
        const maxY = Math.ceil(maxVal * 1.2);
        const getY = (val) => padT + chartH - (Math.max(0, Math.min(maxY, val)) / maxY) * chartH;
        const getX = (i) => padL + (n > 1 ? (i / (n - 1)) * chartW : chartW / 2);

        // Grid lines
        for (let i = 0; i <= 4; i++) {
            const tick = Math.round((maxY / 4) * i * 10) / 10;
            const y = getY(tick);
            svgInner += `
                <line x1="${padL}" y1="${y}" x2="${padL + chartW}" y2="${y}" stroke="#f1f5f9" stroke-width="1" />
                <text x="${padL - 8}" y="${y + 4}" fill="#94a3b8" font-size="10" text-anchor="end">${tick}%</text>
            `;
        }

        // Readmission line (Amber)
        const readmPoints = data.map((d, i) => `${getX(i).toFixed(1)},${getY(parseFloat(d.readmission_rate_pct) || 0).toFixed(1)}`).join(' ');
        svgInner += `<polyline fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" points="${readmPoints}" />`;

        // Mortality line (Red)
        const mortPoints = data.map((d, i) => `${getX(i).toFixed(1)},${getY(parseFloat(d.mortality_rate_pct) || 0).toFixed(1)}`).join(' ');
        svgInner += `<polyline fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" points="${mortPoints}" />`;

        // Points
        data.forEach((d, i) => {
            const x = getX(i);
            const rRate = parseFloat(d.readmission_rate_pct) || 0;
            const mRate = parseFloat(d.mortality_rate_pct) || 0;
            svgInner += `
                <circle cx="${x.toFixed(1)}" cy="${getY(rRate).toFixed(1)}" r="3.5" fill="#f59e0b"><title>${d.census_date} Readmission: ${rRate.toFixed(1)}%</title></circle>
                <circle cx="${x.toFixed(1)}" cy="${getY(mRate).toFixed(1)}" r="3.5" fill="#ef4444"><title>${d.census_date} Mortality: ${mRate.toFixed(1)}%</title></circle>
            `;
        });
    }

    // X Axis Labels (sample 5 to 7 dates across range)
    const step = Math.max(1, Math.floor(n / 6));
    for (let i = 0; i < n; i += step) {
        const x = padL + (n > 1 ? (i / (n - 1)) * chartW : chartW / 2);
        const dtLabel = data[i].census_date.substring(5); // MM-DD
        svgInner += `
            <text x="${x.toFixed(1)}" y="${svgHeight - 12}" fill="#64748b" font-size="11" text-anchor="middle">${dtLabel}</text>
            <line x1="${x.toFixed(1)}" y1="${padT + chartH}" x2="${x.toFixed(1)}" y2="${padT + chartH + 5}" stroke="#cbd5e1" stroke-width="1" />
        `;
    }

    // Legend
    let legendHtml = '';
    if (activeChartType === 'bor') {
        legendHtml = `
            <div style="display:flex; justify-content:center; gap:20px; font-size:12px; margin-top:8px;">
                <span style="display:flex; align-items:center; gap:6px;"><span style="width:12px; height:3px; background:#2563eb; display:inline-block;"></span> Bed Occupancy Rate (BOR %)</span>
                <span style="display:flex; align-items:center; gap:6px;"><span style="width:12px; height:8px; background:rgba(16,185,129,0.25); display:inline-block; border:1px dashed #10b981;"></span> Target Optimal Range (75% - 85%)</span>
            </div>
        `;
    } else if (activeChartType === 'alos_bti') {
        legendHtml = `
            <div style="display:flex; justify-content:center; gap:20px; font-size:12px; margin-top:8px;">
                <span style="display:flex; align-items:center; gap:6px;"><span style="width:12px; height:3px; background:#2563eb; display:inline-block;"></span> Average Length of Stay (ALOS days)</span>
                <span style="display:flex; align-items:center; gap:6px;"><span style="width:12px; height:3px; background:#8b5cf6; display:inline-block;"></span> Bed Turnover Interval (BTI days)</span>
            </div>
        `;
    } else if (activeChartType === 'flow') {
        legendHtml = `
            <div style="display:flex; justify-content:center; gap:20px; font-size:12px; margin-top:8px;">
                <span style="display:flex; align-items:center; gap:6px;"><span style="width:12px; height:3px; background:#10b981; display:inline-block;"></span> Daily Admissions</span>
                <span style="display:flex; align-items:center; gap:6px;"><span style="width:12px; height:3px; background:#0284c7; display:inline-block;"></span> Daily Discharges</span>
            </div>
        `;
    } else if (activeChartType === 'quality') {
        legendHtml = `
            <div style="display:flex; justify-content:center; gap:20px; font-size:12px; margin-top:8px;">
                <span style="display:flex; align-items:center; gap:6px;"><span style="width:12px; height:3px; background:#f59e0b; display:inline-block;"></span> 30-Day Readmission Rate %</span>
                <span style="display:flex; align-items:center; gap:6px;"><span style="width:12px; height:3px; background:#ef4444; display:inline-block;"></span> Inpatient Mortality Rate %</span>
            </div>
        `;
    }

    wrap.innerHTML = `
        <svg viewBox="0 0 ${svgWidth} ${svgHeight}" style="width:100%; height:auto; display:block;">
            ${svgInner}
        </svg>
        ${legendHtml}
    `;
}

async function handleManualAggregation() {
    const btn = document.getElementById('cqdRunAggregationBtn');
    if (!btn) return;

    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="cqd-spinner"></span> <span>Running Engine...</span>`;

    try {
        const res = await api('/reports/clinical-quality/run-aggregation', {
            method: 'POST',
            body: JSON.stringify({ days: 30 })
        });

        if (res && res.success) {
            alert(res.message || 'Clinical Quality bed census and utilization engine completed successfully.');
            await loadAllDashboardData();
        } else {
            alert('Failed to run census engine: ' + (res?.message || 'Unknown error'));
        }
    } catch (err) {
        console.error('Aggregation error', err);
        alert('An error occurred while running the aggregation engine.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalContent;
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
