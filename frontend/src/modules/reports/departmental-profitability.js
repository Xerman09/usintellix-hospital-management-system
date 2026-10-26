import { api } from '../../core/api.js?v=10';

let cachedCostCenters = null;

export async function initDepartmentalProfitability() {
    setupEventListeners();
    await loadCostCenterMargins();
}

function setupEventListeners() {
    const applyBtn = document.getElementById('dpmApplyBtn');
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            loadCostCenterMargins();
        });
    }

    const monthSelect = document.getElementById('dpmMonthSelect');
    if (monthSelect) {
        monthSelect.addEventListener('change', () => {
            loadCostCenterMargins();
        });
    }

    const typeSelect = document.getElementById('dpmTypeSelect');
    if (typeSelect) {
        typeSelect.addEventListener('change', () => {
            loadCostCenterMargins();
        });
    }

    const recalcBtn = document.getElementById('dpmRecalcBtn');
    if (recalcBtn) {
        recalcBtn.addEventListener('click', handleRecalculate);
    }

    const printBtn = document.getElementById('dpmPrintBtn');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }
}

async function loadCostCenterMargins() {
    const month = document.getElementById('dpmMonthSelect')?.value || '';
    const ctype = document.getElementById('dpmTypeSelect')?.value || '';

    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (ctype) params.append('cost_center_type', ctype);

    try {
        const res = await api(`/reports/financial-bi/cost-center-margins?${params.toString()}`);
        if (res && res.success && res.data) {
            cachedCostCenters = res.data;
            populateMonthDropdown(res.data.available_months || [], res.data.summary_month);
            renderDashboard(res.data);
        }
    } catch (err) {
        console.error('Failed to load departmental cost center margins', err);
    }
}

function populateMonthDropdown(months, selectedMonth) {
    const sel = document.getElementById('dpmMonthSelect');
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
    const parts = (ym || '').split('-');
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
    const sign = val < 0 ? '-' : '';
    const abs = Math.abs(val);
    if (abs >= 1000000) {
        return sign + '₱' + (abs / 1000000).toFixed(2) + 'M';
    }
    if (abs >= 1000) {
        return sign + '₱' + (abs / 1000).toFixed(1) + 'k';
    }
    return sign + '₱' + abs.toFixed(2);
}

function renderDashboard(data) {
    const totals = data.hospital_totals || {};
    const comp = data.direct_cost_composition || {};
    const depts = data.departments || [];

    // 1. KPI Cards
    const colEl = document.getElementById('dpmKpiCollections');
    if (colEl) colEl.textContent = formatCompactCurrency(totals.gross_collections);
    const cashEl = document.getElementById('dpmKpiCash');
    if (cashEl) cashEl.textContent = formatCompactCurrency(totals.cash_collections);
    const insEl = document.getElementById('dpmKpiIns');
    if (insEl) insEl.textContent = formatCompactCurrency(totals.insurance_collections);

    const dirEl = document.getElementById('dpmKpiDirectCosts');
    if (dirEl) dirEl.textContent = formatCompactCurrency(totals.total_direct_operational_costs);

    const cmPctEl = document.getElementById('dpmKpiContribPct');
    if (cmPctEl) {
        const pct = parseFloat(totals.contribution_margin_pct) || 0;
        cmPctEl.textContent = pct.toFixed(2) + '%';
        cmPctEl.style.color = pct >= 0 ? '#059669' : '#dc2626';
    }
    const cmAmtEl = document.getElementById('dpmKpiContribAmt');
    if (cmAmtEl) cmAmtEl.textContent = formatCurrency(totals.contribution_margin_amount);

    const netIncEl = document.getElementById('dpmKpiNetIncome');
    if (netIncEl) netIncEl.textContent = formatCompactCurrency(totals.net_operating_income);
    const netPctEl = document.getElementById('dpmKpiNetPct');
    if (netPctEl) netPctEl.textContent = parseFloat(totals.net_operating_margin_pct || 0).toFixed(2) + '%';
    const profCountEl = document.getElementById('dpmProfitableCount');
    if (profCountEl) profCountEl.textContent = `${totals.profitable_depts_count || 0} / ${depts.length}`;

    // 2. Direct Cost Drivers Stacked Bar
    const totCostLabel = document.getElementById('dpmDriversTotalCost');
    if (totCostLabel) totCostLabel.textContent = formatCurrency(totals.total_direct_operational_costs);

    const barSal = document.getElementById('dpmBarSalaries');
    if (barSal) barSal.style.width = `${comp.staff_salaries_pct || 48}%`;
    const barMeds = document.getElementById('dpmBarMeds');
    if (barMeds) barMeds.style.width = `${comp.medications_pct || 24}%`;
    const barSup = document.getElementById('dpmBarSupplies');
    if (barSup) barSup.style.width = `${comp.surgical_supplies_pct || 24}%`;
    const barMaint = document.getElementById('dpmBarMaint');
    if (barMaint) barMaint.style.width = `${comp.equipment_maintenance_pct || 4}%`;

    const cSal = document.getElementById('dpmCostSalaries');
    if (cSal) cSal.textContent = formatCurrency(totals.cost_staff_salaries);
    const pSal = document.getElementById('dpmPctSalaries');
    if (pSal) pSal.textContent = `${comp.staff_salaries_pct || 0}%`;

    const cMeds = document.getElementById('dpmCostMeds');
    if (cMeds) cMeds.textContent = formatCurrency(totals.cost_medications);
    const pMeds = document.getElementById('dpmPctMeds');
    if (pMeds) pMeds.textContent = `${comp.medications_pct || 0}%`;

    const cSup = document.getElementById('dpmCostSupplies');
    if (cSup) cSup.textContent = formatCurrency(totals.cost_surgical_supplies);
    const pSup = document.getElementById('dpmPctSupplies');
    if (pSup) pSup.textContent = `${comp.surgical_supplies_pct || 0}%`;

    const cMaint = document.getElementById('dpmCostMaint');
    if (cMaint) cMaint.textContent = formatCurrency(totals.cost_equipment_maintenance);
    const pMaint = document.getElementById('dpmPctMaint');
    if (pMaint) pMaint.textContent = `${comp.equipment_maintenance_pct || 0}%`;

    // 3. Render Horizontal Bar Chart
    renderContributionChart(depts);

    // 4. Render Table
    renderCostCenterTable(depts);
}

function renderContributionChart(depts) {
    const wrap = document.getElementById('dpmChartWrap');
    if (!wrap) return;

    const clinicalDepts = depts.filter(d => parseFloat(d.gross_collections) > 0);
    if (clinicalDepts.length === 0) {
        wrap.innerHTML = `<div style="text-align:center; padding:30px; color:#94a3b8;">No revenue-generating cost centers to chart.</div>`;
        return;
    }

    const rowH = 32;
    const svgWidth = 860;
    const svgHeight = clinicalDepts.length * rowH + 40;
    const zeroX = 340; // Zero line X coordinate
    const scaleW = 420; // Width for +60%

    let svgRows = '';

    // Zero reference line
    svgRows += `<line x1="${zeroX}" y1="10" x2="${zeroX}" y2="${svgHeight - 25}" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3,3" />`;

    clinicalDepts.forEach((d, idx) => {
        const y = 18 + idx * rowH;
        const pct = parseFloat(d.contribution_margin_pct) || 0;
        const barW = Math.min(scaleW, (Math.abs(pct) / 60.0) * scaleW);
        const isPos = pct >= 0;
        const barX = isPos ? zeroX : zeroX - barW;
        const barColor = pct >= 35 ? '#059669' : (pct >= 15 ? '#2563eb' : (pct >= 0 ? '#d97706' : '#dc2626'));

        svgRows += `
            <text x="10" y="${y + 15}" fill="#1e293b" font-size="12" font-weight="600">${escapeHtml(d.department_name)} (${escapeHtml(d.department_code)})</text>
            <rect x="${barX.toFixed(1)}" y="${y + 3}" width="${Math.max(4, barW).toFixed(1)}" height="18" rx="4" fill="${barColor}">
                <title>${escapeHtml(d.department_name)}: ${pct.toFixed(2)}% Contribution Margin (${formatCurrency(d.contribution_margin_amount)})</title>
            </rect>
            <text x="${(isPos ? barX + barW + 8 : barX - 8).toFixed(1)}" y="${y + 16}" fill="${barColor}" font-size="11.5" font-weight="700" text-anchor="${isPos ? 'start' : 'end'}">
                ${pct > 0 ? '+' : ''}${pct.toFixed(1)}% (${formatCompactCurrency(d.contribution_margin_amount)})
            </text>
        `;
    });

    wrap.innerHTML = `
        <svg viewBox="0 0 ${svgWidth} ${svgHeight}" style="width:100%; height:auto; display:block;">
            ${svgRows}
        </svg>
    `;
}

function renderCostCenterTable(depts) {
    const tbody = document.getElementById('dpmTableBody');
    const countLabel = document.getElementById('dpmDeptCountLabel');
    if (countLabel) countLabel.textContent = `${depts.length} Cost Centers Evaluated`;

    if (!tbody) return;
    if (!depts || depts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:24px; color:#94a3b8;">No cost center records found.</td></tr>`;
        return;
    }

    tbody.innerHTML = depts.map(d => {
        const cmAmt = parseFloat(d.contribution_margin_amount) || 0;
        const cmPct = parseFloat(d.contribution_margin_pct) || 0;
        const status = d.profitability_status || 'Profitable';

        let badgeClass = 'dpm-badge-profit';
        if (status === 'High Margin Leader') badgeClass = 'dpm-badge-leader';
        else if (status === 'Break-Even / Thin') badgeClass = 'dpm-badge-thin';
        else if (status === 'Loss-Making / Deficit') badgeClass = 'dpm-badge-loss';
        else if (status === 'Overhead Cost Center') badgeClass = 'dpm-badge-overhd';

        return `
            <tr style="${cmAmt < 0 ? 'background:#fffbfa;' : ''}">
                <td>
                    <strong style="color:#0f172a;">${escapeHtml(d.department_name)}</strong>
                    <div style="font-size:11px; color:#64748b; font-family:monospace;">${escapeHtml(d.cost_center_code)}</div>
                </td>
                <td>
                    <span style="font-size:11px; background:#f1f5f9; padding:2px 7px; border-radius:4px; color:#475569;">
                        ${escapeHtml(d.cost_center_type)}
                    </span>
                </td>
                <td style="text-align:center; font-weight:600;">${(parseInt(d.patient_volume, 10) || 0).toLocaleString()}</td>
                <td style="text-align:right; font-weight:700; color:#0f172a;">${formatCurrency(d.gross_collections)}</td>
                <td style="text-align:right; color:#2563eb;">${formatCurrency(d.cost_staff_salaries)}</td>
                <td style="text-align:right; color:#059669;">${formatCurrency(d.cost_medications)}</td>
                <td style="text-align:right; color:#d97706;">${formatCurrency(d.cost_surgical_supplies)}</td>
                <td style="text-align:right; font-weight:600; color:#475569;">${formatCurrency(d.total_direct_operational_costs)}</td>
                <td style="text-align:right; font-weight:800; color:${cmAmt >= 0 ? '#059669' : '#dc2626'};">
                    ${formatCurrency(cmAmt)}
                </td>
                <td style="text-align:right; font-weight:800; color:${cmPct >= 0 ? '#059669' : '#dc2626'};">
                    ${cmPct.toFixed(2)}%
                    <div style="font-size:10px; font-weight:normal; color:#64748b;">Target: ${parseFloat(d.budget_target_margin_pct).toFixed(0)}%</div>
                </td>
                <td style="text-align:center;">
                    <span class="dpm-kpi-badge ${badgeClass}" style="position:static; white-space:nowrap;">
                        ${escapeHtml(status)}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

async function handleRecalculate() {
    const btn = document.getElementById('dpmRecalcBtn');
    if (!btn) return;

    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = 'Recalculating...';

    const month = document.getElementById('dpmMonthSelect')?.value || '';

    try {
        const res = await api('/reports/financial-bi/cost-center-margins/recalculate', {
            method: 'POST',
            body: JSON.stringify({ month })
        });
        if (res && res.success && res.data) {
            renderDashboard(res.data);
        }
    } catch (err) {
        console.error('Failed to recalculate cost center margins', err);
    } finally {
        btn.disabled = false;
        btn.innerHTML = orig;
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
