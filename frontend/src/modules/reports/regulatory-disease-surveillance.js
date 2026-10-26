import { api } from '../../core/api.js?v=10';

export function initRegulatoryDiseaseSurveillance() {
    let activeCategory = 'ALL';
    let activeCaseForCif = null;
    let cachedCasesById = {};

    const kpiCat1Total = document.getElementById('rdsKpiCat1Total');
    const kpiCat1Sub = document.getElementById('rdsKpiCat1Sub');
    const kpiSlaRate = document.getElementById('rdsKpiSlaRate');
    const kpiOverdueSub = document.getElementById('rdsKpiOverdueSub');
    const kpiCat2Total = document.getElementById('rdsKpiCat2Total');
    const kpiLabConfirmed = document.getElementById('rdsKpiLabConfirmed');
    const kpiLabRateSub = document.getElementById('rdsKpiLabRateSub');
    const kpiAutoDetected = document.getElementById('rdsKpiAutoDetected');
    const kpiContactsSub = document.getElementById('rdsKpiContactsSub');

    const diseaseBreakdownBody = document.getElementById('rdsDiseaseBreakdownBody');
    const catalogBody = document.getElementById('rdsCatalogBody');
    const registryTableBody = document.getElementById('rdsRegistryTableBody');

    const statusFilter = document.getElementById('rdsStatusFilter');
    const searchInput = document.getElementById('rdsSearchInput');
    const refreshBtn = document.getElementById('rdsRefreshBtn');
    const scanIcd10Btn = document.getElementById('rdsScanIcd10Btn');
    const newCaseBtn = document.getElementById('rdsNewCaseBtn');

    const cifModal = document.getElementById('rdsCifModal');
    const cifPrintableArea = document.getElementById('rdsCifPrintableArea');
    const closeCifModalBtn = document.getElementById('rdsCloseCifModalBtn');
    const printCifBtn = document.getElementById('rdsPrintCifBtn');
    const transmitFromCifBtn = document.getElementById('rdsTransmitFromCifBtn');

    const newCaseModal = document.getElementById('rdsNewCaseModal');
    const newCaseForm = document.getElementById('rdsNewCaseForm');
    const closeNewCaseModalBtn = document.getElementById('rdsCloseNewCaseModalBtn');
    const cancelNewCaseBtn = document.getElementById('rdsCancelNewCaseBtn');

    function escapeHtml(val) {
        const div = document.createElement('div');
        div.textContent = val ?? '';
        return div.innerHTML;
    }

    async function loadSurveillanceData() {
        try {
            const params = new URLSearchParams();
            if (activeCategory && activeCategory !== 'ALL') {
                params.set('category', activeCategory);
            }
            if (statusFilter && statusFilter.value && statusFilter.value !== 'ALL') {
                params.set('status', statusFilter.value);
            }
            if (searchInput && searchInput.value.trim() !== '') {
                params.set('search', searchInput.value.trim());
            }

            const res = await api(`reports/regulatory-disease-surveillance?${params.toString()}`);
            if (!res || !res.success || !res.data) {
                throw new Error(res?.message || 'Failed to load surveillance data.');
            }

            const { kpis, disease_breakdown, icd10_catalog, cases } = res.data;
            renderKpis(kpis || {});
            renderDiseaseBreakdown(disease_breakdown || []);
            renderCatalog(icd10_catalog || []);
            renderRegistryTable(cases || []);
        } catch (err) {
            console.error('Error loading Notifiable Disease Surveillance:', err);
            if (registryTableBody) {
                registryTableBody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align:center; padding: 24px; color: #dc2626; font-weight: 600;">
                            Unable to load Notifiable Disease Surveillance Registry: ${escapeHtml(err.message)}
                        </td>
                    </tr>
                `;
            }
        }
    }

    function renderKpis(kpis) {
        if (kpiCat1Total) kpiCat1Total.textContent = `${kpis.category_1_stat_total ?? 0} Cases`;
        if (kpiCat1Sub) {
            kpiCat1Sub.innerHTML = `<span style="color:#d97706; font-weight:700;">${kpis.category_1_pending ?? 0} Pending</span> • Immediate 24h Notification`;
        }
        if (kpiSlaRate) {
            const rate = Number(kpis.category_1_sla_compliance ?? 100).toFixed(1);
            kpiSlaRate.textContent = `${rate}%`;
            kpiSlaRate.style.color = (kpis.category_1_overdue_24h > 0) ? '#dc2626' : '#16a34a';
        }
        if (kpiOverdueSub) {
            const overdue = Number(kpis.category_1_overdue_24h ?? 0);
            kpiOverdueSub.innerHTML = overdue > 0
                ? `<span style="color:#dc2626; font-weight:700;">🚨 ${overdue} Overdue &gt;24h STAT Alert</span>`
                : `<span style="color:#16a34a; font-weight:700;">✅ Zero overdue 24h notifications</span>`;
        }
        if (kpiCat2Total) kpiCat2Total.textContent = `${kpis.category_2_weekly_total ?? 0} Cases`;
        if (kpiLabConfirmed) kpiLabConfirmed.textContent = `${kpis.lab_confirmed_cases ?? 0} / ${kpis.total_surveillance_cases ?? 0}`;
        if (kpiLabRateSub) {
            kpiLabRateSub.textContent = `${kpis.lab_confirmation_rate ?? 0}% Lab-Confirmed (RITM / RT-PCR)`;
        }
        if (kpiAutoDetected) kpiAutoDetected.textContent = `${kpis.automated_icd10_detections ?? 0} Auto-Flagged`;
        if (kpiContactsSub) {
            kpiContactsSub.textContent = `${kpis.total_contacts_traced ?? 0} Close Contacts Under Tracing`;
        }
    }

    function renderDiseaseBreakdown(rows) {
        if (!diseaseBreakdownBody) return;
        if (!rows.length) {
            diseaseBreakdownBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:18px; color:#64748b;">No active disease surveillance cases.</td></tr>`;
            return;
        }
        diseaseBreakdownBody.innerHTML = rows.map(r => {
            const isCat1 = String(r.surveillance_category).includes('Category 1');
            const catBadge = isCat1
                ? `<span style="display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:700; background:#fee2e2; color:#991b1b; border:1px solid #fecaca;">🔴 Cat 1 STAT (24h)</span>`
                : `<span style="display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:700; background:#dbeafe; color:#1e40af; border:1px solid #bfdbfe;">🔵 Cat 2 (Weekly)</span>`;
            return `
                <tr>
                    <td><strong style="font-family:monospace; background:#f1f5f9; padding:2px 6px; border-radius:4px;">${escapeHtml(r.icd10_code)}</strong></td>
                    <td style="font-weight:700; color:#0f172a;">${escapeHtml(r.disease_name)}</td>
                    <td>${catBadge}</td>
                    <td style="font-weight:800;">${r.total_cases}</td>
                    <td>
                        <span style="color:#16a34a; font-weight:700;">${r.lab_confirmed} Confirmed</span>
                        <span style="color:#64748b; font-size:11.5px;"> (${r.probable_suspected} Prob/Susp)</span>
                    </td>
                    <td>
                        <span style="color:#0f172a; font-weight:700;">${r.transmitted_to_doh} Sent</span>
                        ${r.pending_or_overdue > 0 ? `<span style="color:#dc2626; font-weight:700; font-size:11.5px;"> • ${r.pending_or_overdue} Action Req</span>` : ''}
                    </td>
                </tr>
            `;
        }).join('');
    }

    function renderCatalog(rows) {
        if (!catalogBody) return;
        catalogBody.innerHTML = rows.map(c => {
            const isCat1 = String(c.surveillance_category).includes('Category 1');
            return `
                <tr>
                    <td><strong style="font-family:monospace; color:#0f172a;">${escapeHtml(c.icd10_code)}</strong></td>
                    <td>
                        <div style="font-weight:700; color:#0f172a;">${escapeHtml(c.disease_name)}</div>
                        <div style="font-size:11.5px; color:#64748b;">Specimen: ${escapeHtml(c.required_specimen_type)}</div>
                    </td>
                    <td>
                        <span style="font-weight:700; font-size:11.5px; color:${isCat1 ? '#dc2626' : '#2563eb'};">
                            ${isCat1 ? '⚡ ≤ 24 Hours STAT' : '📅 ≤ 7 Days Weekly'}
                        </span>
                    </td>
                    <td style="font-size:11.5px; color:#334155;">${escapeHtml(c.biosafety_isolation_protocol)}</td>
                </tr>
            `;
        }).join('');
    }

    function renderRegistryTable(cases) {
        if (!registryTableBody) return;
        cachedCasesById = {};
        if (!cases.length) {
            registryTableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center; padding:30px; color:#64748b;">
                        No surveillance cases match the selected filter criteria.
                    </td>
                </tr>
            `;
            return;
        }

        registryTableBody.innerHTML = cases.map(row => {
            cachedCasesById[row.id] = row;
            const isCat1 = String(row.surveillance_category).includes('Category 1');
            const catBadge = isCat1
                ? `<div style="display:inline-block; padding:3px 9px; border-radius:6px; font-size:11px; font-weight:800; background:#fee2e2; color:#991b1b; border:1px solid #fca5a5;">🔴 CATEGORY 1 STAT (24H)</div>`
                : `<div style="display:inline-block; padding:3px 9px; border-radius:6px; font-size:11px; font-weight:700; background:#dbeafe; color:#1e40af; border:1px solid #93c5fd;">🔵 CATEGORY 2 (WEEKLY)</div>`;

            // SLA timer calculation
            const minsLeft = Number(row.minutes_until_deadline ?? 0);
            let slaLine = '';
            if (row.reported_to_health_authority_at) {
                slaLine = `<div style="font-size:11.5px; color:#16a34a; font-weight:700; margin-top:5px;">✓ Reported in ${row.elapsed_hours ?? 0}h (Within SLA)</div>`;
            } else if (minsLeft < 0) {
                const hrsOver = Math.abs(Math.round(minsLeft / 60));
                slaLine = `<div style="font-size:11.5px; color:#dc2626; font-weight:800; margin-top:5px;">🚨 OVERDUE BY ${hrsOver}h (Deadline: ${escapeHtml(row.notification_deadline)})</div>`;
            } else {
                const hrsRem = Math.floor(minsLeft / 60);
                const minsRem = Math.abs(minsLeft % 60);
                slaLine = `<div style="font-size:11.5px; color:#d97706; font-weight:700; margin-top:5px;">⏱️ ${hrsRem}h ${minsRem}m remaining until deadline</div>`;
            }

            let classBadgeColor = '#fef3c7; color:#92400e; border:1px solid #fde68a;';
            if (row.clinical_classification === 'Lab-Confirmed') {
                classBadgeColor = '#dcfce7; color:#166534; border:1px solid #86efac;';
            } else if (row.clinical_classification === 'Probable') {
                classBadgeColor = '#ffedd5; color:#9a3412; border:1px solid #fdba74;';
            }

            let statusBadge = '';
            if (row.reporting_status === 'Overdue >24h Alert') {
                statusBadge = `<span style="display:inline-block; padding:4px 9px; border-radius:6px; font-size:11.5px; font-weight:800; background:#dc2626; color:#ffffff;">🚨 Overdue &gt;24h Alert</span>`;
            } else if (row.reporting_status === 'Pending Notification') {
                statusBadge = `<span style="display:inline-block; padding:4px 9px; border-radius:6px; font-size:11.5px; font-weight:700; background:#fef3c7; color:#92400e; border:1px solid #fcd34d;">⏳ Pending Notification</span>`;
            } else if (row.reporting_status === 'Submitted - CIF Transmitted') {
                statusBadge = `<span style="display:inline-block; padding:4px 9px; border-radius:6px; font-size:11.5px; font-weight:700; background:#e0f2fe; color:#0369a1; border:1px solid #7dd3fc;">📤 CIF Transmitted</span>`;
            } else {
                statusBadge = `<span style="display:inline-block; padding:4px 9px; border-radius:6px; font-size:11.5px; font-weight:700; background:#dcfce7; color:#15803d; border:1px solid #86efac;">✅ DOH Acknowledged</span>`;
            }

            const canTransmit = (row.reporting_status === 'Pending Notification' || row.reporting_status === 'Overdue >24h Alert');

            return `
                <tr>
                    <td>
                        <div style="font-weight:800; color:#0f172a; font-family:monospace; font-size:13px;">${escapeHtml(row.case_number)}</div>
                        <div style="font-size:11.5px; color:#475569; font-family:monospace;">${escapeHtml(row.epi_id_number)}</div>
                        <div style="font-size:11px; color:#64748b; margin-top:3px;">Form: ${escapeHtml(row.cif_form_code)}</div>
                    </td>
                    <td>
                        <div style="font-weight:700; color:#0f172a;">${escapeHtml(row.patient_name)}</div>
                        <div style="font-size:11.5px; color:#475569;">${escapeHtml(row.patient_mrn)} • ${row.patient_age}y / ${escapeHtml(row.patient_sex)}</div>
                        <div style="font-size:11.5px; color:#0369a1; font-weight:600; margin-top:2px;">📍 ${escapeHtml(row.barangay_municipality)}</div>
                        <div style="font-size:11px; color:#64748b;">🛏️ ${escapeHtml(row.ward_bed)}</div>
                    </td>
                    <td>
                        <div style="display:flex; align-items:center; gap:6px; margin-bottom:3px;">
                            <span style="font-family:monospace; font-weight:800; background:#0f172a; color:#ffffff; padding:2px 7px; border-radius:4px; font-size:12px;">${escapeHtml(row.icd10_code)}</span>
                            <span style="font-size:11px; background:#f1f5f9; color:#475569; padding:2px 6px; border-radius:4px;">${escapeHtml(row.detection_source)}</span>
                        </div>
                        <div style="font-weight:700; color:#0f172a; font-size:13.5px;">${escapeHtml(row.disease_name)}</div>
                        <div style="font-size:11.5px; color:#64748b; margin-top:2px;">Onset: ${escapeHtml(row.symptom_onset_date)} • Dx: ${escapeHtml(row.diagnosis_datetime)}</div>
                    </td>
                    <td>
                        ${catBadge}
                        ${slaLine}
                    </td>
                    <td>
                        <span style="display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:700; background:${classBadgeColor}">
                            ${escapeHtml(row.clinical_classification)}
                        </span>
                        <div style="font-size:12px; font-weight:600; color:#1e293b; margin-top:4px;">🔬 ${escapeHtml(row.lab_confirmation_status)}</div>
                        <div style="font-size:11px; color:#64748b;">${escapeHtml(row.specimen_type || '')} (${escapeHtml(row.specimen_accession_no || 'N/A')})</div>
                    </td>
                    <td>
                        <div style="font-size:11.5px; font-weight:700; color:#7c2d12; background:#ffedd5; padding:3px 7px; border-radius:5px; display:inline-block;">
                            🛡️ ${escapeHtml(row.biosafety_isolation_protocol || 'Standard Isolation')}
                        </div>
                        <div style="font-size:11.5px; color:#334155; margin-top:4px;">
                            👥 <strong>${row.close_contacts_identified ?? 0}</strong> Close Contacts Traced • Vaccine: <strong>${escapeHtml(row.vaccination_status)}</strong>
                        </div>
                    </td>
                    <td>
                        ${statusBadge}
                        ${row.doh_acknowledgment_receipt_no ? `
                            <div style="font-size:11px; font-family:monospace; color:#15803d; font-weight:700; margin-top:5px;">
                                Rcpt: ${escapeHtml(row.doh_acknowledgment_receipt_no)}
                            </div>
                        ` : ''}
                        <div style="font-size:11px; color:#64748b; margin-top:2px;">${escapeHtml(row.doh_receiving_unit)}</div>
                    </td>
                    <td style="text-align:right; white-space:nowrap;">
                        <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end;">
                            <button class="rds-btn rds-btn-secondary rds-open-cif-btn" data-id="${row.id}" style="padding:6px 11px; font-size:12px;">
                                📋 View / Print Official CIF
                            </button>
                            ${canTransmit ? `
                                <button class="rds-btn rds-btn-primary rds-transmit-btn" data-id="${row.id}" style="padding:5px 11px; font-size:11.5px; background:#16a34a;">
                                    📡 Transmit 24h STAT CIF
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        registryTableBody.querySelectorAll('.rds-open-cif-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = Number(btn.getAttribute('data-id'));
                openCifModal(id);
            });
        });

        registryTableBody.querySelectorAll('.rds-transmit-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = Number(btn.getAttribute('data-id'));
                await transmitCaseCif(id);
            });
        });
    }

    async function openCifModal(id) {
        let c = cachedCasesById[id];
        try {
            const res = await api(`reports/regulatory-disease-surveillance/cif-form?id=${id}`);
            if (res && res.success && res.data) {
                c = res.data;
            }
        } catch (err) {
            console.warn('Using cached CIF record:', err);
        }
        if (!c) return;

        activeCaseForCif = c;
        const isCat1 = String(c.surveillance_category).includes('Category 1');

        if (cifPrintableArea) {
            cifPrintableArea.innerHTML = `
                <div style="border: 2px solid #0f172a; padding: 20px; border-radius: 8px;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 14px;">
                        <div>
                            <div style="font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:0.06em; color:#475569;">
                                Republic of the Philippines • Department of Health • Epidemiology Bureau
                            </div>
                            <h2 style="margin:4px 0; font-size:20px; font-weight:900; color:#0f172a;">
                                PHILIPPINE INTEGRATED DISEASE SURVEILLANCE &amp; RESPONSE (PIDSR)
                            </h2>
                            <div style="font-size:14px; font-weight:800; color:#dc2626;">
                                OFFICIAL EPIDEMIOLOGICAL CASE INVESTIGATION FORM (${escapeHtml(c.cif_form_code)})
                            </div>
                        </div>
                        <div style="text-align:right; font-family:monospace; background:#f8fafc; padding:10px 14px; border:1px solid #cbd5e1; border-radius:6px;">
                            <div style="font-size:11px; color:#64748b;">CIF REGISTRY NO:</div>
                            <div style="font-size:15px; font-weight:900; color:#0f172a;">${escapeHtml(c.case_number)}</div>
                            <div style="font-size:11px; color:#475569; margin-top:2px;">EPI-ID: ${escapeHtml(c.epi_id_number)}</div>
                        </div>
                    </div>

                    <!-- Section I: Statutory Surveillance Classification -->
                    <div class="cif-section-header">I. Statutory Notifiable Disease &amp; Surveillance Mandate (R.A. 11332)</div>
                    <div class="cif-grid">
                        <div class="cif-field">
                            <div class="cif-field-label">Reportable ICD-10 Code &amp; Disease</div>
                            <div class="cif-field-value" style="color:#dc2626; font-size:14px;">[${escapeHtml(c.icd10_code)}] ${escapeHtml(c.disease_name)}</div>
                        </div>
                        <div class="cif-field">
                            <div class="cif-field-label">Surveillance Category</div>
                            <div class="cif-field-value">${escapeHtml(c.surveillance_category)} (${isCat1 ? 'Mandatory ≤24h' : 'Weekly Rollup'})</div>
                        </div>
                        <div class="cif-field">
                            <div class="cif-field-label">Detection Trigger Source</div>
                            <div class="cif-field-value">${escapeHtml(c.detection_source)}</div>
                        </div>
                        <div class="cif-field">
                            <div class="cif-field-label">Case Classification</div>
                            <div class="cif-field-value" style="color:#15803d;">${escapeHtml(c.clinical_classification)}</div>
                        </div>
                    </div>

                    <!-- Section II: Patient Demographics & Geolocation -->
                    <div class="cif-section-header">II. Patient Identification &amp; Epidemiological Geolocation</div>
                    <div class="cif-grid">
                        <div class="cif-field">
                            <div class="cif-field-label">Patient Full Name</div>
                            <div class="cif-field-value">${escapeHtml(c.patient_name)}</div>
                        </div>
                        <div class="cif-field">
                            <div class="cif-field-label">Medical Record No (MRN)</div>
                            <div class="cif-field-value">${escapeHtml(c.patient_mrn)}</div>
                        </div>
                        <div class="cif-field">
                            <div class="cif-field-label">Age / Sex / DOB</div>
                            <div class="cif-field-value">${c.patient_age} yrs / ${escapeHtml(c.patient_sex)} ${c.patient_dob ? `(${escapeHtml(c.patient_dob)})` : ''}</div>
                        </div>
                        <div class="cif-field">
                            <div class="cif-field-label">Contact Telephone</div>
                            <div class="cif-field-value">${escapeHtml(c.contact_phone || 'N/A')}</div>
                        </div>
                        <div class="cif-field" style="grid-column: span 2;">
                            <div class="cif-field-label">Permanent Residential Street &amp; Barangay</div>
                            <div class="cif-field-value">${escapeHtml(c.patient_address)}, ${escapeHtml(c.barangay_municipality)}, ${escapeHtml(c.province_region)}</div>
                        </div>
                        <div class="cif-field">
                            <div class="cif-field-label">Diagnosing Department</div>
                            <div class="cif-field-value">${escapeHtml(c.diagnosing_department)}</div>
                        </div>
                        <div class="cif-field">
                            <div class="cif-field-label">Isolation Ward / Bed Assignment</div>
                            <div class="cif-field-value">${escapeHtml(c.ward_bed)}</div>
                        </div>
                    </div>

                    <!-- Section III: Clinical Presentation, Timeline & Case Definition -->
                    <div class="cif-section-header">III. Clinical History, Symptom Onset &amp; Biosafety Isolation</div>
                    <div class="cif-grid" style="margin-bottom:10px;">
                        <div class="cif-field">
                            <div class="cif-field-label">Date of Symptom Onset</div>
                            <div class="cif-field-value">${escapeHtml(c.symptom_onset_date)}</div>
                        </div>
                        <div class="cif-field">
                            <div class="cif-field-label">Date/Time of Clinical Diagnosis</div>
                            <div class="cif-field-value">${escapeHtml(c.diagnosis_datetime)}</div>
                        </div>
                        <div class="cif-field">
                            <div class="cif-field-label">Statutory Notification Deadline</div>
                            <div class="cif-field-value" style="color:#dc2626;">${escapeHtml(c.notification_deadline)}</div>
                        </div>
                        <div class="cif-field">
                            <div class="cif-field-label">Current Patient Outcome / Disposition</div>
                            <div class="cif-field-value">${escapeHtml(c.patient_outcome)}</div>
                        </div>
                    </div>
                    <div class="cif-field" style="margin-bottom:8px;">
                        <div class="cif-field-label">Clinical Signs, Symptoms &amp; Physical Examination Findings</div>
                        <div class="cif-field-value" style="font-weight:500;">${escapeHtml(c.clinical_symptoms)}</div>
                    </div>
                    <div class="cif-field">
                        <div class="cif-field-label">Mandatory Infection Control &amp; Biosafety Isolation Protocol</div>
                        <div class="cif-field-value" style="color:#9a3412;">🛡️ ${escapeHtml(c.biosafety_isolation_protocol || 'Standard & Droplet Precautions')}</div>
                    </div>

                    <!-- Section IV: Laboratory Confirmation & Specimen Tracking -->
                    <div class="cif-section-header">IV. National Reference Laboratory Confirmation &amp; Specimen Chain-of-Custody</div>
                    <div class="cif-grid" style="margin-bottom:10px;">
                        <div class="cif-field">
                            <div class="cif-field-label">Laboratory Confirmation Status</div>
                            <div class="cif-field-value" style="color:#15803d;">🔬 ${escapeHtml(c.lab_confirmation_status)}</div>
                        </div>
                        <div class="cif-field">
                            <div class="cif-field-label">Specimen Type &amp; Accession No</div>
                            <div class="cif-field-value">${escapeHtml(c.specimen_type || 'N/A')} (${escapeHtml(c.specimen_accession_no || 'Pending')})</div>
                        </div>
                        <div class="cif-field">
                            <div class="cif-field-label">Specimen Collection Date</div>
                            <div class="cif-field-value">${escapeHtml(c.specimen_collection_date || 'N/A')}</div>
                        </div>
                        <div class="cif-field">
                            <div class="cif-field-label">Reference Laboratory</div>
                            <div class="cif-field-value">${escapeHtml(c.reference_laboratory)}</div>
                        </div>
                    </div>
                    <div class="cif-field">
                        <div class="cif-field-label">Molecular / Serological / Microbiological Assay Results</div>
                        <div class="cif-field-value" style="font-weight:500;">${escapeHtml(c.lab_result_details || 'Pending confirmatory assay report.')}</div>
                    </div>

                    <!-- Section V: Epidemiological Exposure, Vaccination & Contact Tracing -->
                    <div class="cif-section-header">V. Exposure History, Immunization Status &amp; Contact Tracing</div>
                    <div class="cif-grid" style="margin-bottom:10px;">
                        <div class="cif-field">
                            <div class="cif-field-label">Vaccination Status</div>
                            <div class="cif-field-value">${escapeHtml(c.vaccination_status)} (${escapeHtml(c.vaccine_details || 'N/A')})</div>
                        </div>
                        <div class="cif-field">
                            <div class="cif-field-label">Close Contacts Identified</div>
                            <div class="cif-field-value">${c.close_contacts_identified ?? 0} Contacts Enumerated</div>
                        </div>
                        <div class="cif-field" style="grid-column: span 2;">
                            <div class="cif-field-label">Exposure &amp; Travel History (14-21 Days Prior to Onset)</div>
                            <div class="cif-field-value" style="font-weight:500;">${escapeHtml(c.exposure_travel_history || 'None reported')}</div>
                        </div>
                    </div>
                    <div class="cif-field">
                        <div class="cif-field-label">Public Health Contact Tracing &amp; Chemoprophylaxis Actions</div>
                        <div class="cif-field-value" style="font-weight:500;">${escapeHtml(c.contact_tracing_notes || 'Household contact tracing active.')}</div>
                    </div>

                    <!-- Section VI: Public Health Authority Transmission & Attestation -->
                    <div class="cif-section-header">VI. Hospital Epidemiology Attestation &amp; DOH RESU Transmission</div>
                    <div class="cif-grid">
                        <div class="cif-field">
                            <div class="cif-field-label">Attending Physician</div>
                            <div class="cif-field-value">${escapeHtml(c.attending_physician)}</div>
                        </div>
                        <div class="cif-field">
                            <div class="cif-field-label">Hospital Epidemiology Officer</div>
                            <div class="cif-field-value">${escapeHtml(c.epidemiology_officer)}</div>
                        </div>
                        <div class="cif-field">
                            <div class="cif-field-label">Receiving Public Health Unit</div>
                            <div class="cif-field-value">${escapeHtml(c.doh_receiving_unit)}</div>
                        </div>
                        <div class="cif-field">
                            <div class="cif-field-label">DOH Transmission Receipt &amp; Timestamp</div>
                            <div class="cif-field-value" style="color:#15803d; font-family:monospace;">
                                ${c.doh_acknowledgment_receipt_no
                                    ? `${escapeHtml(c.doh_acknowledgment_receipt_no)} (${escapeHtml(c.reported_to_health_authority_at)})`
                                    : 'PENDING ELECTRONIC TRANSMISSION'}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (cifModal) {
            cifModal.style.display = 'flex';
        }
    }

    async function transmitCaseCif(id) {
        try {
            const res = await api('reports/regulatory-disease-surveillance/transmit-cif', {
                method: 'POST',
                body: JSON.stringify({
                    id,
                    reporting_status: 'Acknowledged by Health Authority'
                })
            });
            if (res && res.success) {
                await loadSurveillanceData();
                if (activeCaseForCif && Number(activeCaseForCif.id) === Number(id)) {
                    await openCifModal(id);
                }
            }
        } catch (err) {
            alert('Error transmitting CIF to DOH RESU: ' + err.message);
        }
    }

    // Wire Category Tabs
    const tabContainer = document.getElementById('rdsCategoryTabs');
    if (tabContainer) {
        tabContainer.querySelectorAll('.rds-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                tabContainer.querySelectorAll('.rds-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeCategory = btn.getAttribute('data-category') || 'ALL';
                loadSurveillanceData();
            });
        });
    }

    if (statusFilter) statusFilter.addEventListener('change', loadSurveillanceData);
    if (searchInput) {
        let timer = null;
        searchInput.addEventListener('input', () => {
            clearTimeout(timer);
            timer = setTimeout(loadSurveillanceData, 250);
        });
    }
    if (refreshBtn) refreshBtn.addEventListener('click', loadSurveillanceData);

    // Wire Automated ICD-10 Scanner
    if (scanIcd10Btn) {
        scanIcd10Btn.addEventListener('click', async () => {
            const origText = scanIcd10Btn.textContent;
            scanIcd10Btn.disabled = true;
            scanIcd10Btn.textContent = '⏳ Scanning Clinical Encounters for Notifiable ICD-10...';
            try {
                const res = await api('reports/regulatory-disease-surveillance/scan-icd10', {
                    method: 'POST',
                    body: JSON.stringify({})
                });
                await loadSurveillanceData();
                const d = res?.data || {};
                alert(`Automated ICD-10 Surveillance Scan Complete!\n• Catalog Codes Monitored: ${d.scanned_catalog_codes ?? 12}\n• Newly Auto-Enrolled Cases: ${d.newly_flagged_cases ?? 0}\n• 24-Hour STAT Timers Updated.`);
            } catch (err) {
                alert('ICD-10 Surveillance Scan failed: ' + err.message);
            } finally {
                scanIcd10Btn.disabled = false;
                scanIcd10Btn.textContent = origText;
            }
        });
    }

    // Wire CIF Modal Controls
    if (closeCifModalBtn) {
        closeCifModalBtn.addEventListener('click', () => {
            if (cifModal) cifModal.style.display = 'none';
        });
    }
    if (printCifBtn) {
        printCifBtn.addEventListener('click', () => {
            if (!cifPrintableArea) return;
            const win = window.open('', '_blank', 'width=960,height=800');
            if (!win) {
                window.print();
                return;
            }
            win.document.write(`
                <html>
                <head>
                    <title>Epidemiological CIF - ${activeCaseForCif?.case_number || 'PIDSR'}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; color: #0f172a; }
                        .cif-section-header { background: #0f172a; color: #fff; padding: 6px 10px; font-size: 11px; font-weight: bold; text-transform: uppercase; margin-top: 14px; margin-bottom: 8px; }
                        .cif-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
                        .cif-field { border: 1px solid #cbd5e1; padding: 6px 8px; border-radius: 4px; }
                        .cif-field-label { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #475569; }
                        .cif-field-value { font-size: 12px; font-weight: bold; color: #0f172a; margin-top: 2px; }
                    </style>
                </head>
                <body>
                    ${cifPrintableArea.innerHTML}
                    <script>window.onload = function() { window.print(); };<\/script>
                </body>
                </html>
            `);
            win.document.close();
        });
    }
    if (transmitFromCifBtn) {
        transmitFromCifBtn.addEventListener('click', async () => {
            if (!activeCaseForCif) return;
            await transmitCaseCif(activeCaseForCif.id);
        });
    }

    // Wire New Case Modal
    if (newCaseBtn) {
        newCaseBtn.addEventListener('click', () => {
            const mrnField = document.getElementById('rdsFormPatientMrn');
            if (mrnField && !mrnField.value) {
                mrnField.value = 'MRN-2026-' + Math.floor(1000 + Math.random() * 9000);
            }
            if (newCaseModal) newCaseModal.style.display = 'flex';
        });
    }
    const closeNewModal = () => {
        if (newCaseModal) newCaseModal.style.display = 'none';
    };
    if (closeNewCaseModalBtn) closeNewCaseModalBtn.addEventListener('click', closeNewModal);
    if (cancelNewCaseBtn) cancelNewCaseBtn.addEventListener('click', closeNewModal);

    if (newCaseForm) {
        newCaseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                icd10_code: document.getElementById('rdsFormIcd10')?.value,
                detection_source: document.getElementById('rdsFormDetectionSource')?.value,
                patient_name: document.getElementById('rdsFormPatientName')?.value,
                patient_mrn: document.getElementById('rdsFormPatientMrn')?.value,
                patient_age: Number(document.getElementById('rdsFormPatientAge')?.value || 30),
                patient_sex: document.getElementById('rdsFormPatientSex')?.value,
                patient_address: document.getElementById('rdsFormAddress')?.value,
                barangay_municipality: document.getElementById('rdsFormMunicipality')?.value,
                ward_bed: document.getElementById('rdsFormWardBed')?.value,
                clinical_classification: document.getElementById('rdsFormClinicalClass')?.value,
                lab_confirmation_status: document.getElementById('rdsFormLabStatus')?.value,
                close_contacts_identified: Number(document.getElementById('rdsFormCloseContacts')?.value || 0),
                clinical_symptoms: document.getElementById('rdsFormSymptoms')?.value,
                exposure_travel_history: document.getElementById('rdsFormExposure')?.value,
                contact_tracing_notes: document.getElementById('rdsFormExposure')?.value
            };

            try {
                const res = await api('reports/regulatory-disease-surveillance/cases', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                if (res && res.success) {
                    closeNewModal();
                    newCaseForm.reset();
                    await loadSurveillanceData();
                    if (res.data && res.data.id) {
                        await openCifModal(res.data.id);
                    }
                }
            } catch (err) {
                alert('Failed to register notifiable disease case: ' + err.message);
            }
        });
    }

    loadSurveillanceData();
}
