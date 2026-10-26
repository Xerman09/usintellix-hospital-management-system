import { api } from '../../core/api.js?v=10';

export async function initClaimDenialPareto() {
    setupEventListeners();
    await loadDenialParetoData();
}

function setupEventListeners() {
    const applyBtn = document.getElementById('cdpApplyBtn');
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            loadDenialParetoData();
        });
    }

    const payerSelect = document.getElementById('cdpPayerSelect');
    if (payerSelect) {
        payerSelect.addEventListener('change', () => {
            loadDenialParetoData();
        });
    }

    const statusSelect = document.getElementById('cdpStatusSelect');
    if (statusSelect) {
        statusSelect.addEventListener('change', () => {
            loadDenialParetoData();
        });
    }

    const printBtn = document.getElementById('cdpPrintBtn');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }
}

async function loadDenialParetoData() {
    const payer = document.getElementById('cdpPayerSelect')?.value || '';
    const status = document.getElementById('cdpStatusSelect')?.value || '';

    const params = new URLSearchParams();
    if (payer) params.append('payer', payer);
    if (status) params.append('status', status);

    try {
        const res = await api(`/reports/financial-bi/claim-denial-pareto?${params.toString()}`);
        if (res && res.success && res.data) {
            populatePayerDropdown(res.data.available_payers || []);
            renderParetoDashboard(res.data);
        }
    } catch (err) {
        console.error('Failed to load claim denial Pareto analytics', err);
    }
}

function populatePayerDropdown(payers) {
    const sel = document.getElementById('cdpPayerSelect');
    if (!sel || sel.options.length > 1) return;

    payers.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        sel.appendChild(opt);
    });
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

function renderParetoDashboard(data) {
    const kpis = data.kpis || {};
    const pareto = data.pareto_root_causes || [];
    const worklist = data.denial_worklist || [];

    // 1. KPI Cards
    const denialRateEl = document.getElementById('cdpKpiDenialRate');
    if (denialRateEl) denialRateEl.textContent = parseFloat(kpis.gross_claim_denial_rate_pct || 0).toFixed(2) + '%';

    const deniedCntEl = document.getElementById('cdpKpiDeniedCount');
    if (deniedCntEl) deniedCntEl.textContent = (kpis.total_claims_denied || 0).toLocaleString();

    const subCntEl = document.getElementById('cdpKpiTotalSubmitted');
    if (subCntEl) subCntEl.textContent = (kpis.total_claims_submitted || 0).toLocaleString();

    const dollarDenialEl = document.getElementById('cdpKpiDollarDenialRate');
    if (dollarDenialEl) dollarDenialEl.textContent = parseFloat(kpis.gross_dollar_denial_rate_pct || 0).toFixed(2) + '%';

    const deniedAmtEl = document.getElementById('cdpKpiDeniedAmount');
    if (deniedAmtEl) deniedAmtEl.textContent = formatCurrency(kpis.active_pareto_denied_amount);

    const cleanRateEl = document.getElementById('cdpKpiCleanClaimRate');
    if (cleanRateEl) cleanRateEl.textContent = parseFloat(kpis.clean_claim_rate_pct || 0).toFixed(2) + '%';

    const cleanCntEl = document.getElementById('cdpKpiCleanCount');
    if (cleanCntEl) cleanCntEl.textContent = (kpis.clean_claims_paid_first_pass || 0).toLocaleString();

    // Top 2 Root-Cause Drivers (e.g. Prior Auth + Medical Necessity)
    const topTwoShareEl = document.getElementById('cdpKpiTopTwoShare');
    const topTwoDetailEl = document.getElementById('cdpKpiTopTwoDetail');
    if (pareto.length >= 2) {
        const first = pareto[0];
        const second = pareto[1];
        const combined = (parseFloat(first.dollar_share_pct) + parseFloat(second.dollar_share_pct)).toFixed(1);
        if (topTwoShareEl) topTwoShareEl.textContent = `${combined}%`;
        if (topTwoDetailEl) {
            topTwoDetailEl.innerHTML = `<strong>${first.dollar_share_pct}%</strong> Prior Auth + <strong>${second.dollar_share_pct}%</strong> Med Necessity`;
        }
    } else if (pareto.length === 1) {
        if (topTwoShareEl) topTwoShareEl.textContent = `${pareto[0].dollar_share_pct}%`;
        if (topTwoDetailEl) topTwoDetailEl.textContent = pareto[0].category_label;
    }

    const recRateEl = document.getElementById('cdpKpiRecoveryRate');
    if (recRateEl) recRateEl.textContent = parseFloat(kpis.appeal_recovery_rate_pct || 0).toFixed(1) + '%';

    const recAmtEl = document.getElementById('cdpKpiRecoveredAmt');
    if (recAmtEl) recAmtEl.textContent = formatCurrency(kpis.active_recovered_amount);

    // 2. Render SVG Dual-Axis CARC Pareto Chart
    renderParetoSvgChart(pareto);

    // 3. Render Pareto Matrix Table
    renderParetoTable(pareto);

    // 4. Render Denied Claims Worklist
    renderWorklistTable(worklist);
}

function renderParetoSvgChart(pareto) {
    const wrap = document.getElementById('cdpParetoSvgWrap');
    if (!wrap) return;

    if (!pareto || pareto.length === 0) {
        wrap.innerHTML = `<div style="text-align:center; padding:50px; color:#94a3b8;">No denial data matching current filters.</div>`;
        return;
    }

    const svgWidth = 920;
    const svgHeight = 310;
    const padL = 60;
    const padR = 60;
    const padT = 30;
    const padB = 55;
    const chartW = svgWidth - padL - padR;
    const chartH = svgHeight - padT - padB;

    const n = pareto.length;
    const colW = chartW / n;
    const barW = Math.min(72, colW * 0.56);

    const getY = (pct) => padT + chartH - (Math.max(0, Math.min(100, pct)) / 100.0) * chartH;

    let svgInner = '';

    // Horizontal Grid Lines (0%, 20%, 40%, 60%, 80%, 100%)
    [0, 20, 40, 60, 80, 100].forEach(tick => {
        const y = getY(tick);
        const isPareto80 = tick === 80;
        svgInner += `
            <line x1="${padL}" y1="${y.toFixed(1)}" x2="${(padL + chartW).toFixed(1)}" y2="${y.toFixed(1)}"
                  stroke="${isPareto80 ? '#f59e0b' : '#f1f5f9'}"
                  stroke-width="${isPareto80 ? '1.8' : '1'}"
                  ${isPareto80 ? 'stroke-dasharray="6,4"' : ''} />
            <text x="${padL - 10}" y="${(y + 4).toFixed(1)}" fill="#64748b" font-size="10.5" text-anchor="end">${tick}%</text>
            <text x="${padL + chartW + 10}" y="${(y + 4).toFixed(1)}" fill="${isPareto80 ? '#d97706' : '#94a3b8'}" font-weight="${isPareto80 ? '700' : '400'}" font-size="10.5" text-anchor="start">${tick}%</text>
        `;
    });

    // 80% Pareto Cut-off Callout Label
    svgInner += `
        <text x="${padL + chartW - 8}" y="${(getY(80) - 6).toFixed(1)}" fill="#d97706" font-size="11" font-weight="700" text-anchor="end">
            80% Pareto Vital Few Cutoff
        </text>
    `;

    // Bars (Individual Root-Cause Denial Share %)
    const linePoints = [];

    pareto.forEach((item, i) => {
        const centerX = padL + i * colW + colW / 2;
        const sharePct = parseFloat(item.dollar_share_pct) || 0;
        const cumPct = parseFloat(item.cumulative_pareto_pct) || 0;

        const barY = getY(sharePct);
        const barH = (padT + chartH) - barY;
        const barColor = i === 0 ? '#dc2626' : (i === 1 ? '#ea580c' : (i === 2 ? '#2563eb' : '#64748b'));

        svgInner += `
            <rect x="${(centerX - barW / 2).toFixed(1)}" y="${barY.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(4, barH).toFixed(1)}" rx="5" fill="${barColor}">
                <title>${escapeHtml(item.category_label)} (${escapeHtml(item.carc_codes)}): ${sharePct}% of Denied Dollars (${formatCurrency(item.denied_amount)})</title>
            </rect>
            <text x="${centerX.toFixed(1)}" y="${(barY - 7).toFixed(1)}" fill="${barColor}" font-size="12" font-weight="800" text-anchor="middle">
                ${sharePct}%
            </text>
            <text x="${centerX.toFixed(1)}" y="${svgHeight - 30}" fill="#0f172a" font-size="11" font-weight="700" text-anchor="middle">
                ${escapeHtml(item.carc_codes)}
            </text>
            <text x="${centerX.toFixed(1)}" y="${svgHeight - 14}" fill="#475569" font-size="10.5" text-anchor="middle">
                ${escapeHtml(item.category_label.split('/')[0].trim())}
            </text>
        `;

        linePoints.push({ x: centerX, y: getY(cumPct), cumPct, label: item.category_label });
    });

    // Cumulative Pareto Curve Line
    const polyPoints = linePoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    svgInner += `
        <polyline fill="none" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${polyPoints}" />
    `;

    linePoints.forEach(p => {
        svgInner += `
            <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5" fill="#ffffff" stroke="#d97706" stroke-width="3">
                <title>Cumulative Pareto Share: ${p.cumPct}%</title>
            </circle>
            <text x="${p.x.toFixed(1)}" y="${(p.y - 10).toFixed(1)}" fill="#b45309" font-size="10.5" font-weight="700" text-anchor="middle">
                ${p.cumPct}%
            </text>
        `;
    });

    wrap.innerHTML = `
        <svg viewBox="0 0 ${svgWidth} ${svgHeight}" style="width:100%; height:auto; display:block;">
            ${svgInner}
        </svg>
        <div style="display:flex; justify-content:center; gap:24px; font-size:12px; margin-top:8px;">
            <span style="display:flex; align-items:center; gap:6px;"><span style="width:12px; height:12px; background:#dc2626; border-radius:3px; display:inline-block;"></span> Root-Cause Share of Denied Dollars (%)</span>
            <span style="display:flex; align-items:center; gap:6px;"><span style="width:16px; height:3px; background:#f59e0b; display:inline-block;"></span> Cumulative Pareto Curve (%)</span>
            <span style="display:flex; align-items:center; gap:6px;"><span style="width:16px; height:0; border-top:2px dashed #f59e0b; display:inline-block;"></span> 80% Pareto Threshold</span>
        </div>
    `;
}

function renderParetoTable(pareto) {
    const tbody = document.getElementById('cdpParetoTableBody');
    if (!tbody) return;

    if (!pareto || pareto.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:24px; color:#94a3b8;">No CARC Pareto categories found.</td></tr>`;
        return;
    }

    tbody.innerHTML = pareto.map((row, idx) => {
        const shareColor = idx === 0 ? '#dc2626' : (idx === 1 ? '#ea580c' : '#1e293b');
        return `
            <tr>
                <td><span class="cdp-carc-pill">${escapeHtml(row.carc_codes)}</span></td>
                <td>
                    <strong style="color:#0f172a;">${escapeHtml(row.category_label)}</strong>
                    <div style="font-size:11px; color:#64748b;">${escapeHtml(row.preventability)}</div>
                </td>
                <td style="text-align:center; font-weight:700;">${row.claims_count}</td>
                <td style="text-align:right; font-weight:700; color:#dc2626;">${formatCurrency(row.denied_amount)}</td>
                <td style="text-align:right; font-weight:800; font-size:13.5px; color:${shareColor};">${row.dollar_share_pct}%</td>
                <td style="text-align:right; font-weight:700; color:#d97706;">${row.cumulative_pareto_pct}%</td>
                <td style="text-align:right; font-weight:700; color:#059669;">${row.overturn_rate_pct}%</td>
                <td>
                    <span style="font-size:11.5px; font-weight:600; color:#334155;">${escapeHtml(row.responsible_owner)}</span>
                </td>
                <td style="max-width:340px;">
                    <div style="font-size:12px; color:#0f172a; line-height:1.4; background:#f0fdf4; border-left:3px solid #10b981; padding:6px 10px; border-radius:4px;">
                        ${escapeHtml(row.immediate_correction)}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderWorklistTable(worklist) {
    const tbody = document.getElementById('cdpWorklistTableBody');
    const countLabel = document.getElementById('cdpWorklistCountLabel');
    if (countLabel) countLabel.textContent = `${worklist.length} Remittance Denials`;

    if (!tbody) return;
    if (!worklist || worklist.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:24px; color:#94a3b8;">No denied claims matching filters.</td></tr>`;
        return;
    }

    tbody.innerHTML = worklist.map(d => {
        const st = d.status || 'pending_review';
        let badgeClass = 'cdp-badge-warning';
        if (st === 'overturned_won') badgeClass = 'cdp-badge-optimal';
        else if (st === 'upheld_lost' || st === 'written_off') badgeClass = 'cdp-badge-danger';
        else if (st.startsWith('appeal_')) badgeClass = 'cdp-badge-info';

        return `
            <tr>
                <td>
                    <strong style="color:#0f172a;">${escapeHtml(d.denial_number)}</strong>
                    <div style="font-size:11px; color:#64748b; font-family:monospace;">${escapeHtml(d.claim_number)}</div>
                </td>
                <td>
                    <div style="font-weight:600; color:#1e293b;">${escapeHtml(d.payer_name)}</div>
                    <div style="font-size:11px; color:#64748b;">EOB: ${escapeHtml(d.remittance_eob_number || 'N/A')}</div>
                </td>
                <td style="white-space:nowrap; font-size:12px;">
                    ${escapeHtml(d.denial_date)}
                    <div style="font-size:10.5px; color:#dc2626;">Limit: ${escapeHtml(d.timely_filing_deadline || '-')}</div>
                </td>
                <td>
                    <span class="cdp-carc-pill">${escapeHtml(d.carc_code)}</span>
                    ${d.rarc_code ? `<span style="font-size:11px; font-family:monospace; background:#e2e8f0; padding:2px 5px; border-radius:4px; margin-left:4px;">${escapeHtml(d.rarc_code)}</span>` : ''}
                    <div style="font-size:11px; color:#475569; margin-top:3px;">${escapeHtml(d.carc_description)}</div>
                </td>
                <td style="text-align:right; font-weight:700; color:#dc2626;">${formatCurrency(d.denied_amount)}</td>
                <td style="text-align:right; font-weight:700; color:#059669;">${formatCurrency(d.recovered_amount)}</td>
                <td style="max-width:250px; font-size:12px; color:#334155;">${escapeHtml(d.root_cause_analysis || '')}</td>
                <td style="max-width:250px; font-size:12px; color:#0f172a;">${escapeHtml(d.resolution_notes || '')}</td>
                <td style="text-align:center;">
                    <span class="cdp-kpi-badge ${badgeClass}" style="position:static; white-space:nowrap;">
                        ${escapeHtml(st.replace(/_/g, ' ').toUpperCase())}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
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
