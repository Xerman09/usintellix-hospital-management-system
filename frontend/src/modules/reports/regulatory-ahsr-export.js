import { api } from '../../core/api.js?v=10';

export function initRegulatoryAhsrExport() {
    let latestExportResult = null;

    const kpiMorbidityTotal = document.getElementById('ahsrKpiMorbidityTotal');
    const kpiMorbiditySub = document.getElementById('ahsrKpiMorbiditySub');
    const kpiMortalityTotal = document.getElementById('ahsrKpiMortalityTotal');
    const kpiMortalitySub = document.getElementById('ahsrKpiMortalitySub');
    const kpiSurgeriesTotal = document.getElementById('ahsrKpiSurgeriesTotal');
    const kpiSurgeriesSub = document.getElementById('ahsrKpiSurgeriesSub');
    const kpiDeliveriesTotal = document.getElementById('ahsrKpiDeliveriesTotal');
    const kpiDeliveriesSub = document.getElementById('ahsrKpiDeliveriesSub');

    const morbidityBody = document.getElementById('ahsrMorbidityTableBody');
    const mortalityBody = document.getElementById('ahsrMortalityTableBody');
    const surgicalObstetricBody = document.getElementById('ahsrSurgicalObstetricBody');
    const exportBatchesBody = document.getElementById('ahsrExportBatchesBody');

    const exportModal = document.getElementById('ahsrExportModal');
    const exportModalTitle = document.getElementById('ahsrExportModalTitle');
    const exportMetaBar = document.getElementById('ahsrExportMetaBar');
    const exportPayloadPre = document.getElementById('ahsrExportPayloadPre');
    const downloadRawBtn = document.getElementById('ahsrDownloadRawBtn');
    const downloadEncBtn = document.getElementById('ahsrDownloadEncBtn');
    const closeExportModalBtn = document.getElementById('ahsrCloseExportModalBtn');

    function escapeHtml(val) {
        const div = document.createElement('div');
        div.textContent = val ?? '';
        return div.innerHTML;
    }

    async function loadAhsrDashboard() {
        try {
            const res = await api('reports/regulatory-ahsr?year=2026');
            if (!res || !res.success || !res.data) {
                throw new Error(res?.message || 'Failed to load AHSR data.');
            }
            const { kpis, morbidity_top10, mortality_top10, surgical_obstetric, export_batches } = res.data;
            renderKpis(kpis || {});
            renderMorbidityTop10(morbidity_top10 || []);
            renderMortalityTop10(mortality_top10 || []);
            renderSurgicalObstetric(surgical_obstetric || []);
            renderExportBatches(export_batches || []);
        } catch (err) {
            console.error('Error loading AHSR dashboard:', err);
            if (morbidityBody) {
                morbidityBody.innerHTML = `<tr><td colspan="7" style="color:#dc2626; padding:18px; text-align:center;">${escapeHtml(err.message)}</td></tr>`;
            }
        }
    }

    function renderKpis(k) {
        if (kpiMorbidityTotal) {
            kpiMorbidityTotal.textContent = Number(k.morbidity_top10_total ?? 0).toLocaleString();
        }
        if (kpiMorbiditySub) {
            kpiMorbiditySub.innerHTML = `<strong>${Number(k.total_inpatient_discharges ?? 0).toLocaleString()}</strong> Discharges • BOR <strong>${k.bed_occupancy_rate_pct ?? 0}%</strong> • ALOS <strong>${k.average_los_days ?? 0}d</strong>`;
        }
        if (kpiMortalityTotal) {
            kpiMortalityTotal.textContent = `${k.mortality_top10_total ?? 0} Deaths`;
        }
        if (kpiMortalitySub) {
            kpiMortalitySub.innerHTML = `Gross: <strong>${k.gross_mortality_rate_pct ?? 0}%</strong> • Net (≥48h): <strong style="color:#dc2626;">${k.net_mortality_rate_pct ?? 0}%</strong> (${k.deaths_over_48h_net ?? 0} Net / ${k.deaths_under_48h ?? 0} &lt;48h)`;
        }
        if (kpiSurgeriesTotal) {
            kpiSurgeriesTotal.textContent = `${Number(k.total_surgeries_count ?? 0).toLocaleString()} Ops`;
        }
        if (kpiSurgeriesSub) {
            kpiSurgeriesSub.innerHTML = `<strong style="color:#7c3aed;">${Number(k.major_surgeries_count ?? 0).toLocaleString()} Major</strong> (${k.major_surgery_share_pct ?? 0}%) vs <strong>${Number(k.minor_surgeries_count ?? 0).toLocaleString()} Minor</strong>`;
        }
        if (kpiDeliveriesTotal) {
            kpiDeliveriesTotal.textContent = `${Number(k.total_deliveries_count ?? 0).toLocaleString()} Births`;
        }
        if (kpiDeliveriesSub) {
            kpiDeliveriesSub.innerHTML = `<strong style="color:#059669;">${Number(k.normal_deliveries_nsvd ?? 0).toLocaleString()} NSVD</strong> vs <strong>${Number(k.caesarean_deliveries_cs ?? 0).toLocaleString()} C-Section (${k.caesarean_section_rate_pct ?? 0}%)</strong>`;
        }
    }

    function renderMorbidityTop10(rows) {
        if (!morbidityBody) return;
        morbidityBody.innerHTML = rows.map(r => `
            <tr>
                <td><span style="display:inline-flex; width:24px; height:24px; align-items:center; justify-content:center; border-radius:999px; background:#eff6ff; color:#1d4ed8; font-weight:800; font-size:11.5px;">#${r.rank_no}</span></td>
                <td><strong style="font-family:monospace; background:#0f172a; color:#ffffff; padding:2px 6px; border-radius:4px;">${escapeHtml(r.icd10_code)}</strong></td>
                <td>
                    <div style="font-weight:700; color:#0f172a;">${escapeHtml(r.disease_description)}</div>
                    <div style="font-size:11px; color:#64748b;">${escapeHtml(r.clinical_category)} • ALOS ${r.average_los_days}d</div>
                </td>
                <td style="font-size:11.5px; white-space:nowrap;">${r.male_cases}M / ${r.female_cases}F</td>
                <td style="font-size:11.5px; color:#475569; white-space:nowrap;">${r.pediatric_under_18} / ${r.adult_18_to_59} / ${r.geriatric_60_plus}</td>
                <td style="font-weight:800; color:#0f172a;">${Number(r.total_discharges).toLocaleString()}</td>
                <td><span style="font-weight:700; color:#2563eb;">${r.share_of_morbidity_pct}%</span></td>
            </tr>
        `).join('');
    }

    function renderMortalityTop10(rows) {
        if (!mortalityBody) return;
        mortalityBody.innerHTML = rows.map(r => `
            <tr>
                <td><span style="display:inline-flex; width:24px; height:24px; align-items:center; justify-content:center; border-radius:999px; background:#fef2f2; color:#b91c1c; font-weight:800; font-size:11.5px;">#${r.rank_no}</span></td>
                <td><strong style="font-family:monospace; background:#7f1d1d; color:#ffffff; padding:2px 6px; border-radius:4px;">${escapeHtml(r.icd10_code)}</strong></td>
                <td>
                    <div style="font-weight:700; color:#0f172a;">${escapeHtml(r.underlying_cause_of_death)}</div>
                    <div style="font-size:11px; color:#64748b;">${escapeHtml(r.clinical_department)}</div>
                </td>
                <td style="font-size:11.5px; white-space:nowrap;">${r.male_deaths}M / ${r.female_deaths}F</td>
                <td style="font-size:11.5px; white-space:nowrap;">
                    <span style="color:#64748b;">${r.deaths_under_48h_er_inpatient}</span> /
                    <strong style="color:#dc2626;">${r.deaths_over_48h_net_institutional} Net</strong>
                </td>
                <td style="font-weight:800; color:#dc2626;">${r.total_deaths}</td>
                <td><span style="font-weight:700; color:#991b1b;">${r.case_fatality_rate_pct}%</span></td>
            </tr>
        `).join('');
    }

    function renderSurgicalObstetric(rows) {
        if (!surgicalObstetricBody) return;
        surgicalObstetricBody.innerHTML = rows.map(r => {
            const isSurg = String(r.category_group).includes('Surgical');
            const badge = isSurg
                ? `<span style="padding:3px 8px; border-radius:6px; font-size:11px; font-weight:700; background:#ede9fe; color:#5b21b6;">🔪 Surgical Output</span>`
                : `<span style="padding:3px 8px; border-radius:6px; font-size:11px; font-weight:700; background:#d1fae5; color:#065f46;">🤱 Obstetric Delivery</span>`;
            return `
                <tr>
                    <td>${badge}</td>
                    <td style="font-weight:700; color:#0f172a;">${escapeHtml(r.procedure_classification)}</td>
                    <td style="color:#475569;">${escapeHtml(r.specialty_department)}</td>
                    <td style="font-weight:600;">${Number(r.elective_scheduled_count).toLocaleString()}</td>
                    <td style="font-weight:600; color:#d97706;">${Number(r.emergency_stat_count).toLocaleString()}</td>
                    <td style="font-weight:800; font-size:14px; color:#0f172a;">${Number(r.total_procedures_count).toLocaleString()}</td>
                    <td><strong style="color:#2563eb;">${r.share_of_group_pct}%</strong></td>
                    <td><span style="color:#15803d; font-weight:700;">${r.complication_or_ssi_rate_pct}%</span></td>
                    <td style="font-size:11.5px; color:#64748b;">${escapeHtml(r.regulatory_benchmark_note || '')}</td>
                </tr>
            `;
        }).join('');
    }

    function renderExportBatches(batches) {
        if (!exportBatchesBody) return;
        exportBatchesBody.innerHTML = batches.map(b => {
            let fmtColor = '#2563eb';
            if (b.export_format === 'XML') fmtColor = '#7c3aed';
            if (b.export_format === 'CSV') fmtColor = '#059669';

            return `
                <tr>
                    <td>
                        <div style="font-family:monospace; font-weight:800; color:#0f172a;">${escapeHtml(b.batch_reference_no)}</div>
                        <div style="font-size:11px; color:#64748b;">${escapeHtml(b.reporting_period)} • LTO: ${escapeHtml(b.facility_license_no)}</div>
                    </td>
                    <td>
                        <span style="display:inline-block; padding:2px 8px; border-radius:4px; font-weight:800; font-size:11px; background:${fmtColor}; color:#fff;">
                            ${escapeHtml(b.export_format)}
                        </span>
                        <div style="font-size:11px; color:#475569; margin-top:3px;">🔐 ${escapeHtml(b.encryption_standard)}</div>
                    </td>
                    <td style="font-weight:600; color:#1e293b;">${escapeHtml(b.target_authority)}</td>
                    <td style="font-size:11.5px;">
                        Morb: <strong>${Number(b.total_morbidity_cases_top10).toLocaleString()}</strong> •
                        Mort: <strong>${b.total_mortality_deaths_top10}</strong> •
                        Surg: <strong>${Number(b.total_surgeries_count).toLocaleString()}</strong> (${b.major_surgeries_count} Maj / ${b.minor_surgeries_count} Min) •
                        Deliv: <strong>${Number(b.total_deliveries_count).toLocaleString()}</strong> (${b.caesarean_section_rate_pct}% CS)
                    </td>
                    <td>
                        <code style="font-size:11px; background:#f1f5f9; padding:3px 6px; border-radius:4px; color:#0f172a;">
                            ${escapeHtml(String(b.payload_sha256_hash || '').substring(0, 20))}...
                        </code>
                    </td>
                    <td>
                        <span style="display:inline-block; padding:3px 8px; border-radius:6px; font-size:11px; font-weight:700; background:#dcfce7; color:#166534;">
                            ✅ ${escapeHtml(b.portal_submission_status)}
                        </span>
                        ${b.portal_acknowledgment_no ? `<div style="font-size:11px; font-family:monospace; color:#15803d; margin-top:3px;">Ack: ${escapeHtml(b.portal_acknowledgment_no)}</div>` : ''}
                    </td>
                    <td style="font-size:11.5px; color:#475569;">${escapeHtml(b.compiled_at)}</td>
                </tr>
            `;
        }).join('');
    }

    async function triggerOneClickExport(format) {
        const encryptChecked = document.getElementById('ahsrEncryptToggle')?.checked ?? true;
        try {
            const res = await api('reports/regulatory-ahsr/export', {
                method: 'POST',
                body: JSON.stringify({
                    year: 2026,
                    format,
                    encrypt: encryptChecked
                })
            });
            if (!res || !res.success || !res.data) {
                throw new Error(res?.message || 'Failed to generate export batch.');
            }

            latestExportResult = res.data;
            await loadAhsrDashboard();

            if (exportModalTitle) {
                exportModalTitle.textContent = `${latestExportResult.batch_reference_no} (${latestExportResult.export_format})`;
            }
            if (exportMetaBar) {
                exportMetaBar.innerHTML = `
                    <div style="background:#f8fafc; border:1px solid #cbd5e1; padding:8px 12px; border-radius:6px;">
                        <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase;">Portal Acknowledgment</div>
                        <div style="font-size:13px; font-weight:800; color:#15803d; font-family:monospace;">${escapeHtml(latestExportResult.portal_acknowledgment)}</div>
                    </div>
                    <div style="background:#f8fafc; border:1px solid #cbd5e1; padding:8px 12px; border-radius:6px;">
                        <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase;">Cryptographic Standard</div>
                        <div style="font-size:12.5px; font-weight:700; color:#0f172a;">${escapeHtml(latestExportResult.encryption_standard)}</div>
                    </div>
                    <div style="background:#f8fafc; border:1px solid #cbd5e1; padding:8px 12px; border-radius:6px;">
                        <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase;">SHA-256 Digest</div>
                        <div style="font-size:11px; font-weight:700; color:#1e40af; font-family:monospace; word-break:break-all;">${escapeHtml(latestExportResult.payload_sha256_hash)}</div>
                    </div>
                `;
            }
            if (exportPayloadPre) {
                exportPayloadPre.textContent = latestExportResult.raw_content || '';
            }
            if (exportModal) {
                exportModal.style.display = 'flex';
            }
        } catch (err) {
            alert('Failed to compile AHSR export batch: ' + err.message);
        }
    }

    function downloadBlob(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    document.querySelectorAll('.ahsr-export-trigger').forEach(btn => {
        btn.addEventListener('click', () => {
            const fmt = btn.getAttribute('data-format') || 'JSON';
            triggerOneClickExport(fmt);
        });
    });

    if (downloadRawBtn) {
        downloadRawBtn.addEventListener('click', () => {
            if (!latestExportResult) return;
            downloadBlob(
                latestExportResult.raw_content,
                latestExportResult.file_name,
                latestExportResult.mime_type || 'text/plain'
            );
        });
    }

    if (downloadEncBtn) {
        downloadEncBtn.addEventListener('click', () => {
            if (!latestExportResult) return;
            const envelopeJson = JSON.stringify({
                batch_reference_no: latestExportResult.batch_reference_no,
                export_format: latestExportResult.export_format,
                encryption_standard: latestExportResult.encryption_standard,
                payload_sha256_hash: latestExportResult.payload_sha256_hash,
                ciphertext_aes256_gcm_base64: latestExportResult.encrypted_envelope_b64
            }, null, 2);
            downloadBlob(
                envelopeJson,
                `${latestExportResult.file_name}.enc.json`,
                'application/json'
            );
        });
    }

    if (closeExportModalBtn) {
        closeExportModalBtn.addEventListener('click', () => {
            if (exportModal) exportModal.style.display = 'none';
        });
    }

    loadAhsrDashboard();
}
