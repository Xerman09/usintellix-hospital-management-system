import { api } from '../../core/api.js?v=10';

let activeChartType = 'revpab';
let cachedOverview = null;
let cachedTrends = [];

export async function initFinancialBiDashboard() {
    setupEventListeners();
    await loadAllData();
}

function setupEventListeners() {
    // Month Dropdown Change
    const monthSelect = document.getElementById('fbiMonthSelect');
    if (monthSelect) {
        monthSelect.addEventListener('change', (e) => {
            loadAllData(e.target.value);
        });
    }

    // Refresh Button
    const refreshBtn = document.getElementById('fbiRefreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            const m = document.getElementById('fbiMonthSelect')?.value || '';
            loadAllData(m);
        });
    }

    // Print Button
    const printBtn = document.getElementById('fbiPrintBtn');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }

    // Chart Tabs
    const tabs = document.querySelectorAll('.fbi-tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            tabs.forEach(t => t.classList.remove('active'));
            e.currentTarget.classList.add('active');
            activeChartType = e.currentTarget.dataset.chart;
            renderChart();
        });
    });
}

async function loadAllData(targetMonth = '') {
    await Promise.all([
        loadOverview(targetMonth),
        loadCostCenterMargins(targetMonth),
        loadTrends()
    ]);
}

async function loadCostCenterMargins(month = '') {
    const params = new URLSearchParams();
    if (month) params.append('month', month);

    try {
        const res = await api(`/reports/financial-bi/cost-center-margins?${params.toString()}`);
        if (res && res.success && res.data) {
            renderCostCenterMarginsTable(res.data);
        }
    } catch (err) {
        console.error('Failed to load cost center margins', err);
    }
}

function renderCostCenterMarginsTable(data) {
    const tbody = document.getElementById('fbiCostCenterTableBody');
    const summaryLabel = document.getElementById('fbiCostCenterSummaryLabel');
    const totals = data.hospital_totals || {};
    const depts = data.departments || [];

    if (summaryLabel && totals.contribution_margin_pct !== undefined) {
        summaryLabel.textContent = `Hospital Contribution Margin: ${parseFloat(totals.contribution_margin_pct).toFixed(2)}% (${formatCurrency(totals.contribution_margin_amount)})`;
    }

    if (!tbody) return;
    if (depts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:20px; color:#94a3b8;">No cost center records found.</td></tr>`;
        return;
    }

    tbody.innerHTML = depts.map(d => {
        const cmAmt = parseFloat(d.contribution_margin_amount) || 0;
        const cmPct = parseFloat(d.contribution_margin_pct) || 0;
        const isDeficit = cmAmt < 0;

        const statusBadge = isDeficit
            ? `<span style="background:#fee2e2; color:#991b1b; padding:2px 8px; border-radius:4px; font-weight:700; font-size:11px;">${escapeHtml(d.profitability_status)}</span>`
            : `<span style="background:#dcfce7; color:#166534; padding:2px 8px; border-radius:4px; font-weight:600; font-size:11px;">${escapeHtml(d.profitability_status)}</span>`;

        return `
            <tr style="${isDeficit ? 'background:#fffbfa;' : ''}">
                <td>
                    <strong style="color:#0f172a;">${escapeHtml(d.department_name)}</strong>
                    <div style="font-size:11px; color:#64748b; font-family:monospace;">${escapeHtml(d.cost_center_code)}</div>
                </td>
                <td><span style="font-size:11px; color:#475569;">${escapeHtml(d.cost_center_type)}</span></td>
                <td style="text-align:right; font-weight:700;">${formatCurrency(d.gross_collections)}</td>
                <td style="text-align:right; color:#0284c7;">${formatCurrency(d.cost_staff_salaries)}</td>
                <td style="text-align:right; color:#059669;">${formatCurrency(d.cost_medications)}</td>
                <td style="text-align:right; color:#d97706;">${formatCurrency(d.cost_surgical_supplies)}</td>
                <td style="text-align:right; font-weight:600; color:#475569;">${formatCurrency(d.total_direct_operational_costs)}</td>
                <td style="text-align:right; font-weight:800; color:${isDeficit ? '#dc2626' : '#059669'};">${formatCurrency(cmAmt)}</td>
                <td style="text-align:right; font-weight:800; color:${isDeficit ? '#dc2626' : '#059669'};">${cmPct.toFixed(2)}%</td>
                <td style="text-align:center;">${statusBadge}</td>
            </tr>
        `;
    }).join('');
}

async function loadOverview(month = '') {
    const params = new URLSearchParams();
    if (month) params.append('month', month);

    try {
        const res = await api(`/reports/financial-bi/overview?${params.toString()}`);
        if (res && res.success && res.data) {
            cachedOverview = res.data;
            populateMonthDropdown(res.data.available_months || [], res.data.summary_month);
            renderOverview(res.data);
        }
    } catch (err) {
        console.error('Failed to load financial BI overview', err);
    }
}

async function loadTrends() {
    try {
        const res = await api('/reports/financial-bi/trends?limit=6');
        if (res && res.success && res.data) {
            cachedTrends = res.data.trend_series || [];
            renderChart();
        }
    } catch (err) {
        console.error('Failed to load financial BI trends', err);
    }
}

function populateMonthDropdown(months, selectedMonth) {
    const sel = document.getElementById('fbiMonthSelect');
    if (!sel || sel.options.length > 0) return;

    months.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = formatMonthLabel(m);
        if (m === selectedMonth) opt.selected = true;
        sel.appendChild(opt);
    });
}

function formatMonthLabel(ym) {
    const parts = ym.split('-');
    if (parts.length < 2) return ym;
    const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

function formatCurrency(num) {
    const val = parseFloat(num) || 0;
    return '₱' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCompactCurrency(num) {
    const val = parseFloat(num) || 0;
    if (Math.abs(val) >= 1000000) {
        return '₱' + (val / 1000000).toFixed(2) + 'M';
    }
    if (Math.abs(val) >= 1000) {
        return '₱' + (val / 1000).toFixed(1) + 'k';
    }
    return '₱' + val.toFixed(2);
}

function renderOverview(data) {
    const kpis = data.hospital_kpis || {};
    const split = data.cash_vs_accruals || {};
    const perf = data.department_performance || {};
    const classes = data.ward_class_benchmarks || [];
    const rankings = data.ward_yield_rankings || [];

    // Header label
    const pDetail = document.getElementById('fbiPeriodDetail');
    if (pDetail) pDetail.textContent = `Fiscal Period: ${formatMonthLabel(data.summary_month)}`;

    // 1. RevPAB Card
    const revpabVal = document.getElementById('fbiRevpabVal');
    if (revpabVal) revpabVal.textContent = formatCurrency(kpis.revpab);
    const availDays = document.getElementById('fbiAvailBedDays');
    if (availDays) availDays.textContent = (kpis.available_bed_days || 0).toLocaleString();
    const revpabTier = document.getElementById('fbiRevpabTier');
    if (revpabTier) revpabTier.textContent = kpis.productivity_tier || 'High Yield';

    // 2. RevPOB Card
    const revpobVal = document.getElementById('fbiRevpobVal');
    if (revpobVal) revpobVal.textContent = formatCurrency(kpis.revpob);
    const occDays = document.getElementById('fbiOccBedDays');
    if (occDays) occDays.textContent = (kpis.occupied_bed_days || 0).toLocaleString();
    const borPct = document.getElementById('fbiBorPct');
    if (borPct) borPct.textContent = parseFloat(kpis.bed_occupancy_rate || 0).toFixed(1);

    // 3. Net Revenue Card
    const netRevVal = document.getElementById('fbiNetRevVal');
    if (netRevVal) netRevVal.textContent = formatCompactCurrency(kpis.net_inpatient_revenue);
    const grossRevVal = document.getElementById('fbiGrossRevVal');
    if (grossRevVal) grossRevVal.textContent = formatCompactCurrency(kpis.total_inpatient_revenue);
    const discVal = document.getElementById('fbiDiscountsVal');
    if (discVal) discVal.textContent = formatCompactCurrency(split.discounts_allowances);

    // 4. Margin Card
    const marginPctVal = document.getElementById('fbiMarginPctVal');
    if (marginPctVal) marginPctVal.textContent = parseFloat(kpis.hospital_margin_pct || 0).toFixed(1) + '%';
    const marginAmtVal = document.getElementById('fbiMarginAmtVal');
    if (marginAmtVal) marginAmtVal.textContent = formatCurrency(kpis.hospital_margin_amount);

    const marginBadge = document.getElementById('fbiMarginBadge');
    if (marginBadge) {
        const m = parseFloat(kpis.hospital_margin_pct) || 0;
        if (m >= 25) {
            marginBadge.className = 'fbi-kpi-badge fbi-optimal';
            marginBadge.textContent = 'High Profitability';
        } else if (m >= 10) {
            marginBadge.className = 'fbi-kpi-badge fbi-warning';
            marginBadge.textContent = 'Moderate Margin';
        } else {
            marginBadge.className = 'fbi-kpi-badge fbi-danger';
            marginBadge.textContent = 'Margin Strain';
        }
    }

    // 5. Cash vs Accruals Split
    const splitTotal = document.getElementById('fbiSplitTotalRevenue');
    if (splitTotal) splitTotal.textContent = formatCurrency(kpis.total_inpatient_revenue);

    const insBar = document.getElementById('fbiSplitBarIns');
    if (insBar) insBar.style.width = `${split.insurance_share_pct || 70}%`;
    const cashBar = document.getElementById('fbiSplitBarCash');
    if (cashBar) cashBar.style.width = `${split.cash_share_pct || 30}%`;

    const insAmt = document.getElementById('fbiInsAccruedAmt');
    if (insAmt) insAmt.textContent = formatCurrency(split.insurance_accrued_amount);
    const insPct = document.getElementById('fbiInsPct');
    if (insPct) insPct.textContent = `${split.insurance_share_pct}% Claims Accruals`;

    const cashAmt = document.getElementById('fbiCashAmt');
    if (cashAmt) cashAmt.textContent = formatCurrency(split.cash_collected_amount);
    const cashPct = document.getElementById('fbiCashPct');
    if (cashPct) cashPct.textContent = `${split.cash_share_pct}% Direct Cash`;

    // 6. Loss-Making Departments Banner
    const lossBanner = document.getElementById('fbiLossBanner');
    if (lossBanner) {
        if (perf.loss_making_units_count > 0) {
            lossBanner.style.display = 'flex';
            const countEl = document.getElementById('fbiLossCount');
            if (countEl) countEl.textContent = perf.loss_making_units_count;

            const defEl = document.getElementById('fbiTotalDeficit');
            if (defEl) defEl.textContent = formatCurrency(perf.total_loss_deficit);

            const listEl = document.getElementById('fbiLossUnitsList');
            if (listEl && perf.loss_making_units) {
                listEl.innerHTML = perf.loss_making_units.map(u => `
                    <div style="background:#ffffff; border:1px solid #fca5a5; padding:8px 12px; border-radius:6px; font-size:12px;">
                        <strong style="color:#991b1b;">${escapeHtml(u.ward_name)} (${escapeHtml(u.ward_code)})</strong>
                        <div style="color:#7f1d1d; margin-top:2px;">
                            Deficit: <strong>${formatCurrency(u.margin_amount)}</strong> (${u.margin_pct.toFixed(1)}% margin)
                        </div>
                        <div style="font-size:11px; color:#b91c1c; font-style:italic;">${escapeHtml(u.deficit_reason)}</div>
                    </div>
                `).join('');
            }
        } else {
            lossBanner.style.display = 'none';
        }
    }

    // 7. Ward Class Benchmarks Table
    renderClassTable(classes);

    // 8. Detailed Ward Rankings Table
    renderWardTable(rankings);
}

function renderClassTable(classes) {
    const tbody = document.getElementById('fbiClassTableBody');
    if (!tbody) return;

    if (!classes || classes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:20px; color:#94a3b8;">No facility tier benchmarks available.</td></tr>`;
        return;
    }

    tbody.innerHTML = classes.map(c => {
        const marginPct = parseFloat(c.class_margin_pct) || 0;
        let badgeHtml = '<span class="fbi-kpi-badge fbi-optimal" style="position:static;">High Yield</span>';
        if (marginPct < 0) {
            badgeHtml = '<span class="fbi-kpi-badge fbi-danger" style="position:static;">Loss Maker</span>';
        } else if (marginPct < 15) {
            badgeHtml = '<span class="fbi-kpi-badge fbi-warning" style="position:static;">Moderate</span>';
        }

        return `
            <tr>
                <td>
                    <strong style="color:#0f172a;">${escapeHtml(c.ward_class)}</strong>
                    <div style="font-size:11px; color:#64748b;">${c.units_count} unit(s)</div>
                </td>
                <td style="text-align:center; font-weight:600;">${c.total_beds}</td>
                <td style="text-align:right;">${(parseInt(c.total_available_bed_days, 10) || 0).toLocaleString()}</td>
                <td style="text-align:right; font-weight:600;">${parseFloat(c.avg_occupancy_rate || 0).toFixed(1)}%</td>
                <td style="text-align:right; font-weight:700; color:#0284c7;">${formatCurrency(c.class_revpab)}</td>
                <td style="text-align:right; font-weight:600;">${formatCurrency(c.class_revpob)}</td>
                <td style="text-align:right;">${formatCompactCurrency(c.net_revenue)}</td>
                <td style="text-align:right; color:#64748b;">${formatCompactCurrency(c.total_cost)}</td>
                <td style="text-align:right; font-weight:700; color:${marginPct >= 0 ? '#059669' : '#dc2626'};">
                    ${formatCompactCurrency(c.total_margin)} (${marginPct.toFixed(1)}%)
                </td>
                <td style="text-align:center;">${badgeHtml}</td>
            </tr>
        `;
    }).join('');
}

function renderWardTable(wards) {
    const tbody = document.getElementById('fbiWardTableBody');
    const label = document.getElementById('fbiWardCountLabel');
    if (label) label.textContent = `${wards.length} Units Ranked by RevPAB`;

    if (!tbody) return;
    if (!wards || wards.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:20px; color:#94a3b8;">No ward financial records found.</td></tr>`;
        return;
    }

    tbody.innerHTML = wards.map((w, idx) => {
        const marginPct = parseFloat(w.department_margin_pct) || 0;
        const isLoss = parseInt(w.is_loss_making, 10) === 1 || marginPct < 0;

        let statusBadge = isLoss
            ? `<span style="background:#fee2e2; color:#991b1b; padding:2px 8px; border-radius:4px; font-weight:700; font-size:11px;">Deficit / Loss</span>`
            : `<span style="background:#dcfce7; color:#166534; padding:2px 8px; border-radius:4px; font-weight:600; font-size:11px;">Profitable</span>`;

        return `
            <tr style="${isLoss ? 'background: #fffbfa;' : ''}">
                <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:11px; font-weight:700; color:#94a3b8; width:16px;">#${idx + 1}</span>
                        <div>
                            <strong style="color:#0f172a;">${escapeHtml(w.ward_name)}</strong>
                            <div style="font-size:11px; color:#64748b;">Code: ${escapeHtml(w.ward_code)}</div>
                        </div>
                    </div>
                </td>
                <td><span style="font-size:11px; color:#475569;">${escapeHtml(w.ward_class)}</span></td>
                <td style="text-align:center; font-weight:600;">${w.total_beds} beds</td>
                <td style="text-align:right; font-weight:600; color:${parseFloat(w.bed_occupancy_rate) < 60 ? '#d97706' : '#1e293b'};">
                    ${parseFloat(w.bed_occupancy_rate).toFixed(1)}%
                </td>
                <td style="text-align:right; font-weight:800; color:#0284c7;">${formatCurrency(w.revpab)}</td>
                <td style="text-align:right; font-weight:600;">${formatCurrency(w.revpob)}</td>
                <td style="text-align:right; font-weight:600;">${formatCurrency(w.total_inpatient_revenue)}</td>
                <td style="text-align:right; color:#64748b;">${formatCurrency(w.total_operating_cost)}</td>
                <td style="text-align:right; font-weight:700; color:${isLoss ? '#dc2626' : '#059669'};">
                    ${formatCurrency(w.department_margin_amount)}<br>
                    <span style="font-size:11px; font-weight:normal;">(${marginPct.toFixed(1)}%)</span>
                </td>
                <td style="text-align:center;">${statusBadge}</td>
            </tr>
        `;
    }).join('');
}

function renderChart() {
    const wrap = document.getElementById('fbiChartWrap');
    if (!wrap) return;

    if (!cachedTrends || cachedTrends.length === 0) {
        wrap.innerHTML = `<div style="text-align:center; padding:60px 20px; color:#94a3b8;">No historical trend data available.</div>`;
        return;
    }

    const svgWidth = 900;
    const svgHeight = 280;
    const padL = 65;
    const padR = 25;
    const padT = 25;
    const padB = 40;
    const chartW = svgWidth - padL - padR;
    const chartH = svgHeight - padT - padB;

    const data = cachedTrends;
    const n = data.length;

    let svgInner = '';

    if (activeChartType === 'revpab') {
        // RevPAB Trend (₱/day)
        const maxVal = Math.max(15000, ...data.map(d => parseFloat(d.revpab) || 0));
        const maxY = Math.ceil(maxVal * 1.15);
        const getY = (val) => padT + chartH - (Math.max(0, val) / maxY) * chartH;
        const getX = (i) => padL + (n > 1 ? (i / (n - 1)) * chartW : chartW / 2);

        // Y Grid
        for (let i = 0; i <= 4; i++) {
            const tick = Math.round((maxY / 4) * i);
            const y = getY(tick);
            svgInner += `
                <line x1="${padL}" y1="${y}" x2="${padL + chartW}" y2="${y}" stroke="#f1f5f9" stroke-width="1" />
                <text x="${padL - 8}" y="${y + 4}" fill="#94a3b8" font-size="10" text-anchor="end">₱${(tick/1000).toFixed(0)}k</text>
            `;
        }

        const points = data.map((d, i) => `${getX(i).toFixed(1)},${getY(parseFloat(d.revpab) || 0).toFixed(1)}`).join(' ');
        const areaPoints = `${padL},${getY(0)} ${points} ${getX(n - 1)},${getY(0)}`;

        svgInner += `
            <polygon points="${areaPoints}" fill="rgba(2, 132, 199, 0.08)" />
            <polyline fill="none" stroke="#0284c7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${points}" />
        `;

        data.forEach((d, i) => {
            const x = getX(i);
            const val = parseFloat(d.revpab) || 0;
            const y = getY(val);
            svgInner += `
                <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" fill="#ffffff" stroke="#0284c7" stroke-width="2.5">
                    <title>${d.summary_month}: ${formatCurrency(val)} / bed-day</title>
                </circle>
            `;
        });

    } else if (activeChartType === 'revenue_cost') {
        // Revenue vs Operating Cost & Margin
        const maxVal = Math.max(25000000, ...data.map(d => parseFloat(d.total_inpatient_revenue) || 0));
        const maxY = Math.ceil(maxVal * 1.15);
        const getY = (val) => padT + chartH - (Math.max(0, val) / maxY) * chartH;
        const getX = (i) => padL + (n > 1 ? (i / (n - 1)) * chartW : chartW / 2);

        for (let i = 0; i <= 4; i++) {
            const tick = Math.round((maxY / 4) * i);
            const y = getY(tick);
            svgInner += `
                <line x1="${padL}" y1="${y}" x2="${padL + chartW}" y2="${y}" stroke="#f1f5f9" stroke-width="1" />
                <text x="${padL - 8}" y="${y + 4}" fill="#94a3b8" font-size="10" text-anchor="end">₱${(tick/1000000).toFixed(1)}M</text>
            `;
        }

        const revPoints = data.map((d, i) => `${getX(i).toFixed(1)},${getY(parseFloat(d.total_inpatient_revenue) || 0).toFixed(1)}`).join(' ');
        const costPoints = data.map((d, i) => `${getX(i).toFixed(1)},${getY(parseFloat(d.total_operating_cost) || 0).toFixed(1)}`).join(' ');

        svgInner += `<polyline fill="none" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round" points="${revPoints}" />`;
        svgInner += `<polyline fill="none" stroke="#ef4444" stroke-width="2.5" stroke-dasharray="4,4" stroke-linecap="round" points="${costPoints}" />`;

        data.forEach((d, i) => {
            const x = getX(i);
            const rev = parseFloat(d.total_inpatient_revenue) || 0;
            const cost = parseFloat(d.total_operating_cost) || 0;
            svgInner += `
                <circle cx="${x.toFixed(1)}" cy="${getY(rev).toFixed(1)}" r="4" fill="#0284c7"><title>${d.summary_month} Inpatient Revenue: ${formatCurrency(rev)}</title></circle>
                <circle cx="${x.toFixed(1)}" cy="${getY(cost).toFixed(1)}" r="4" fill="#ef4444"><title>${d.summary_month} Operating Cost: ${formatCurrency(cost)}</title></circle>
            `;
        });

    } else if (activeChartType === 'accruals') {
        // Cash vs Insurance Accruals
        const maxVal = Math.max(20000000, ...data.map(d => Math.max(parseFloat(d.insurance_accrued_revenue) || 0, parseFloat(d.cash_collected_revenue) || 0)));
        const maxY = Math.ceil(maxVal * 1.2);
        const getY = (val) => padT + chartH - (Math.max(0, val) / maxY) * chartH;
        const getX = (i) => padL + (n > 1 ? (i / (n - 1)) * chartW : chartW / 2);

        for (let i = 0; i <= 4; i++) {
            const tick = Math.round((maxY / 4) * i);
            const y = getY(tick);
            svgInner += `
                <line x1="${padL}" y1="${y}" x2="${padL + chartW}" y2="${y}" stroke="#f1f5f9" stroke-width="1" />
                <text x="${padL - 8}" y="${y + 4}" fill="#94a3b8" font-size="10" text-anchor="end">₱${(tick/1000000).toFixed(1)}M</text>
            `;
        }

        const insPoints = data.map((d, i) => `${getX(i).toFixed(1)},${getY(parseFloat(d.insurance_accrued_revenue) || 0).toFixed(1)}`).join(' ');
        const cashPoints = data.map((d, i) => `${getX(i).toFixed(1)},${getY(parseFloat(d.cash_collected_revenue) || 0).toFixed(1)}`).join(' ');

        svgInner += `<polyline fill="none" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round" points="${insPoints}" />`;
        svgInner += `<polyline fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" points="${cashPoints}" />`;

        data.forEach((d, i) => {
            const x = getX(i);
            const ins = parseFloat(d.insurance_accrued_revenue) || 0;
            const cash = parseFloat(d.cash_collected_revenue) || 0;
            svgInner += `
                <circle cx="${x.toFixed(1)}" cy="${getY(ins).toFixed(1)}" r="4" fill="#0284c7"><title>${d.summary_month} Insurance AR: ${formatCurrency(ins)}</title></circle>
                <circle cx="${x.toFixed(1)}" cy="${getY(cash).toFixed(1)}" r="4" fill="#10b981"><title>${d.summary_month} Cash Collections: ${formatCurrency(cash)}</title></circle>
            `;
        });
    }

    // X Axis Labels
    data.forEach((d, i) => {
        const x = padL + (n > 1 ? (i / (n - 1)) * chartW : chartW / 2);
        svgInner += `
            <text x="${x.toFixed(1)}" y="${svgHeight - 12}" fill="#64748b" font-size="11" text-anchor="middle">${d.summary_month}</text>
            <line x1="${x.toFixed(1)}" y1="${padT + chartH}" x2="${x.toFixed(1)}" y2="${padT + chartH + 5}" stroke="#cbd5e1" stroke-width="1" />
        `;
    });

    let legendHtml = '';
    if (activeChartType === 'revpab') {
        legendHtml = `
            <div style="display:flex; justify-content:center; gap:20px; font-size:12px; margin-top:8px;">
                <span style="display:flex; align-items:center; gap:6px;"><span style="width:12px; height:3px; background:#0284c7; display:inline-block;"></span> RevPAB (Revenue Per Available Bed-Day)</span>
            </div>
        `;
    } else if (activeChartType === 'revenue_cost') {
        legendHtml = `
            <div style="display:flex; justify-content:center; gap:20px; font-size:12px; margin-top:8px;">
                <span style="display:flex; align-items:center; gap:6px;"><span style="width:12px; height:3px; background:#0284c7; display:inline-block;"></span> Total Inpatient Revenue</span>
                <span style="display:flex; align-items:center; gap:6px;"><span style="width:12px; height:3px; background:#ef4444; display:inline-block;"></span> Total Allocated Operating Costs</span>
            </div>
        `;
    } else if (activeChartType === 'accruals') {
        legendHtml = `
            <div style="display:flex; justify-content:center; gap:20px; font-size:12px; margin-top:8px;">
                <span style="display:flex; align-items:center; gap:6px;"><span style="width:12px; height:3px; background:#0284c7; display:inline-block;"></span> Insurance / HMO Claims Accruals</span>
                <span style="display:flex; align-items:center; gap:6px;"><span style="width:12px; height:3px; background:#10b981; display:inline-block;"></span> Cash / Copayment Collections</span>
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

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
