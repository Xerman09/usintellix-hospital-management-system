export function PatientMedicationsView() {
    return `
<style>
/* ========================================================
   PATIENT MEDICATIONS - LAYOUT & ALIGNMENT
   Uses standard portal page structure (.pt-appt-page, -24px margin)
   ======================================================== */
.pmed-portal-page {
    display: flex;
    flex-direction: column;
    margin: -24px;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #1e293b;
    min-height: calc(100vh - 120px);
}

:root[data-theme="dark"] .pmed-portal-page {
    color: var(--text-primary);
    background: var(--bg-page);
}

/* Standard Portal Topbar */
.pmed-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 24px;
    border-bottom: 1px solid #e5e9f0;
    background: #ffffff;
    flex-wrap: wrap;
    gap: 16px;
}

:root[data-theme="dark"] .pmed-topbar {
    background: var(--bg-surface);
    border-bottom-color: var(--border-color);
}

.pmed-topbar-title h1 {
    margin: 0;
    font-size: 19px;
    font-weight: 700;
    color: #14181f;
    letter-spacing: -0.01em;
}

.pmed-topbar-title p {
    margin: 4px 0 0;
    font-size: 13px;
    color: #64748b;
}

:root[data-theme="dark"] .pmed-topbar-title h1 {
    color: var(--text-primary);
}

:root[data-theme="dark"] .pmed-topbar-title p {
    color: var(--text-muted);
}

.pmed-topbar-actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

/* Portal Body Container */
.pmed-body {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    flex: 1;
}

/* ========================================================
   BUTTONS
   ======================================================== */
.pmed-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 16px;
    height: 36px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    border: 1px solid transparent;
    text-decoration: none;
    line-height: 1;
    box-sizing: border-box;
    white-space: nowrap;
}

.pmed-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.pmed-btn-primary {
    background: #0284c7;
    color: #ffffff;
    border-color: #0284c7;
}

.pmed-btn-primary:hover:not(:disabled) {
    background: #0369a1;
    border-color: #0369a1;
}

.pmed-btn-outline {
    background: #ffffff;
    color: #334155;
    border-color: #cbd5e1;
}

.pmed-btn-outline:hover:not(:disabled) {
    background: #f8fafc;
    border-color: #94a3b8;
    color: #0f172a;
}

:root[data-theme="dark"] .pmed-btn-outline {
    background: var(--bg-surface-alt);
    color: var(--text-primary);
    border-color: var(--border-color);
}

:root[data-theme="dark"] .pmed-btn-outline:hover:not(:disabled) {
    background: var(--bg-surface);
    border-color: #64748b;
    color: #ffffff;
}

.pmed-btn-danger {
    background: #ffffff;
    color: #dc2626;
    border-color: #fecaca;
}

.pmed-btn-danger:hover:not(:disabled) {
    background: #fef2f2;
    border-color: #f87171;
}

:root[data-theme="dark"] .pmed-btn-danger {
    background: rgba(239, 68, 68, 0.12);
    color: #f87171;
    border-color: rgba(239, 68, 68, 0.3);
}

:root[data-theme="dark"] .pmed-btn-danger:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.22);
    border-color: #f87171;
    color: #fca5a5;
}

.pmed-btn-refill {
    background: #0284c7;
    color: #ffffff;
    border-color: #0284c7;
}

.pmed-btn-refill:hover:not(:disabled) {
    background: #0369a1;
    border-color: #0369a1;
}

/* ========================================================
   CONTROLS BAR (SEARCH & FILTER TABS)
   ======================================================== */
.pmed-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    background: #ffffff;
    padding: 12px 16px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 2px rgba(0,0,0,0.03);
}

:root[data-theme="dark"] .pmed-controls {
    background: var(--bg-surface);
    border-color: var(--border-color);
    box-shadow: none;
}

.pmed-search-wrap {
    position: relative;
    flex: 1;
    min-width: 250px;
    max-width: 420px;
}

.pmed-search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
    pointer-events: none;
    display: flex;
    align-items: center;
}

:root[data-theme="dark"] .pmed-search-icon {
    color: var(--text-muted);
}

.pmed-search-input {
    width: 100%;
    height: 38px;
    padding: 0 12px 0 38px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 13.5px;
    background: #f8fafc;
    color: #1e293b;
    outline: none;
    transition: all 0.15s ease;
    box-sizing: border-box;
    font-family: inherit;
}

.pmed-search-input:focus {
    background: #ffffff;
    border-color: #0284c7;
    box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
}

:root[data-theme="dark"] .pmed-search-input {
    background: var(--bg-surface-alt);
    border-color: var(--border-color);
    color: var(--text-primary);
}

:root[data-theme="dark"] .pmed-search-input:focus {
    background: var(--bg-surface-alt);
    border-color: #38bdf8;
    box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
}

.pmed-filter-tabs {
    display: flex;
    gap: 4px;
    background: #f1f5f9;
    padding: 4px;
    border-radius: 6px;
    overflow-x: auto;
    border: 1px solid #e2e8f0;
}

:root[data-theme="dark"] .pmed-filter-tabs {
    background: var(--bg-surface-alt);
    border-color: var(--border-color);
}

.pmed-filter-btn {
    padding: 6px 14px;
    height: 30px;
    border: 1px solid transparent;
    background: transparent;
    font-size: 12.5px;
    font-weight: 600;
    color: #64748b;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    box-sizing: border-box;
}

.pmed-filter-btn:hover {
    color: #0f172a;
}

:root[data-theme="dark"] .pmed-filter-btn {
    color: var(--text-muted);
}

:root[data-theme="dark"] .pmed-filter-btn:hover {
    color: var(--text-primary);
}

.pmed-filter-btn.active {
    background: #ffffff;
    color: #0284c7;
    border-color: #e2e8f0;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

:root[data-theme="dark"] .pmed-filter-btn.active {
    background: var(--bg-surface);
    color: #38bdf8;
    border-color: var(--border-color);
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.pmed-count-pill {
    background: #e2e8f0;
    color: #475569;
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 10px;
    font-weight: 700;
    line-height: 1.2;
}

.pmed-filter-btn.active .pmed-count-pill {
    background: #e0f2fe;
    color: #0284c7;
}

:root[data-theme="dark"] .pmed-count-pill {
    background: #334155;
    color: #94a3b8;
}

:root[data-theme="dark"] .pmed-filter-btn.active .pmed-count-pill {
    background: rgba(56, 189, 248, 0.2);
    color: #38bdf8;
}

/* ========================================================
   MEDICATION CARDS LIST
   ======================================================== */
.pmed-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.pmed-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 20px 24px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    transition: all 0.15s ease;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.pmed-card:hover {
    border-color: #cbd5e1;
    box-shadow: 0 4px 12px rgba(0,0,0,0.06);
}

:root[data-theme="dark"] .pmed-card {
    background: var(--bg-surface);
    border-color: var(--border-color);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
}

:root[data-theme="dark"] .pmed-card:hover {
    border-color: #475569;
}

.pmed-card.inactive {
    opacity: 0.85;
}

:root[data-theme="dark"] .pmed-card.inactive {
    background: var(--bg-surface-alt);
}

/* Card Header */
.pmed-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
}

.pmed-card-title-wrap {
    display: flex;
    align-items: center;
    gap: 14px;
    flex: 1;
}

.pmed-pill-icon {
    width: 44px;
    height: 44px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.pmed-pill-icon.prescription {
    background: #e0f2fe;
    color: #0284c7;
}

:root[data-theme="dark"] .pmed-pill-icon.prescription {
    background: rgba(2, 132, 199, 0.18);
    color: #38bdf8;
    border: 1px solid rgba(56, 189, 248, 0.3);
}

.pmed-pill-icon.medication {
    background: #ecfdf5;
    color: #059669;
}

:root[data-theme="dark"] .pmed-pill-icon.medication {
    background: rgba(16, 185, 129, 0.18);
    color: #34d399;
    border: 1px solid rgba(52, 211, 153, 0.3);
}

.pmed-pill-icon.completed {
    background: #f1f5f9;
    color: #94a3b8;
}

:root[data-theme="dark"] .pmed-pill-icon.completed {
    background: rgba(148, 163, 184, 0.12);
    color: #94a3b8;
    border: 1px solid var(--border-color);
}

.pmed-card-titles {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.pmed-card-titles h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.3;
}

:root[data-theme="dark"] .pmed-card-titles h3 {
    color: var(--text-primary);
}

.pmed-badges-row {
    display: flex;
    gap: 6px;
    align-items: center;
    flex-wrap: wrap;
}

/* Badges */
.pmed-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11.5px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 4px;
    line-height: 1.4;
}

.pmed-badge-rx {
    background: #e0e7ff;
    color: #4338ca;
}

:root[data-theme="dark"] .pmed-badge-rx {
    background: rgba(99, 102, 241, 0.18);
    color: #a5b4fc;
    border: 1px solid rgba(165, 180, 252, 0.3);
}

.pmed-badge-otc {
    background: #ecfdf5;
    color: #047857;
}

:root[data-theme="dark"] .pmed-badge-otc {
    background: rgba(16, 185, 129, 0.18);
    color: #6ee7b7;
    border: 1px solid rgba(110, 231, 183, 0.3);
}

.pmed-badge-active {
    background: #dcfce7;
    color: #15803d;
}

:root[data-theme="dark"] .pmed-badge-active {
    background: rgba(34, 197, 94, 0.18);
    color: #86efac;
    border: 1px solid rgba(134, 239, 172, 0.3);
}

.pmed-badge-completed {
    background: #f1f5f9;
    color: #64748b;
}

:root[data-theme="dark"] .pmed-badge-completed {
    background: rgba(148, 163, 184, 0.15);
    color: #cbd5e1;
    border: 1px solid var(--border-color);
}

.pmed-badge-cancelled {
    background: #fee2e2;
    color: #b91c1c;
}

:root[data-theme="dark"] .pmed-badge-cancelled {
    background: rgba(239, 68, 68, 0.18);
    color: #fca5a5;
    border: 1px solid rgba(252, 165, 165, 0.3);
}

.pmed-badge-refill-pending {
    background: #fef3c7;
    color: #b45309;
    border: 1px solid #fde68a;
    animation: pulse 2s infinite;
}

:root[data-theme="dark"] .pmed-badge-refill-pending {
    background: rgba(245, 158, 11, 0.2);
    color: #fde68a;
    border: 1px solid rgba(253, 230, 138, 0.3);
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}

/* Card Body Grid */
.pmed-card-body {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px 20px;
    padding: 16px 0;
    border-top: 1px solid #f1f5f9;
    border-bottom: 1px solid #f1f5f9;
}

@media (max-width: 960px) {
    .pmed-card-body {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 560px) {
    .pmed-card-body {
        grid-template-columns: 1fr;
    }
}

:root[data-theme="dark"] .pmed-card-body {
    border-top-color: var(--border-color);
    border-bottom-color: var(--border-color);
}

.pmed-info-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.pmed-info-item label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #64748b;
    margin: 0;
}

:root[data-theme="dark"] .pmed-info-item label {
    color: var(--text-muted);
}

.pmed-info-item span,
.pmed-info-item p {
    margin: 0;
    font-size: 13.5px;
    font-weight: 500;
    color: #1e293b;
    line-height: 1.4;
}

:root[data-theme="dark"] .pmed-info-item span,
:root[data-theme="dark"] .pmed-info-item p {
    color: var(--text-primary);
}

/* Directions Block */
.pmed-directions {
    grid-column: 1 / -1;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-left: 3px solid #0284c7;
    padding: 12px 16px;
    border-radius: 6px;
    font-size: 13px;
    color: #334155;
    line-height: 1.5;
}

.pmed-directions strong {
    color: #0f172a;
}

:root[data-theme="dark"] .pmed-directions {
    background: var(--bg-surface-alt);
    border-color: var(--border-color);
    border-left: 3px solid #38bdf8;
    color: var(--text-primary);
}

:root[data-theme="dark"] .pmed-directions strong {
    color: #38bdf8;
}

/* Card Footer */
.pmed-card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
}

.pmed-refill-status {
    font-size: 13px;
    color: #64748b;
    display: flex;
    align-items: center;
    gap: 6px;
}

.pmed-refill-status strong {
    color: #0f172a;
}

:root[data-theme="dark"] .pmed-refill-status {
    color: var(--text-muted);
}

:root[data-theme="dark"] .pmed-refill-status strong {
    color: var(--text-primary);
}

.pmed-card-actions {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-left: auto;
}

/* Empty State */
.pmed-empty-state {
    text-align: center;
    padding: 56px 24px;
    background: #ffffff;
    border: 1px dashed #cbd5e1;
    border-radius: 10px;
    color: #64748b;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

:root[data-theme="dark"] .pmed-empty-state {
    background: var(--bg-surface);
    border-color: var(--border-color);
    color: var(--text-muted);
}

.pmed-empty-state svg {
    margin-bottom: 12px;
    color: #94a3b8;
}

.pmed-empty-state h3 {
    margin: 0 0 6px 0;
    font-size: 17px;
    color: #0f172a;
}

:root[data-theme="dark"] .pmed-empty-state h3 {
    color: var(--text-primary);
}

.pmed-empty-state p {
    margin: 0 0 16px 0;
    font-size: 13.5px;
    max-width: 440px;
}

/* ========================================================
   MODALS (RECORD / REFILL / DETAILS)
   ======================================================== */
.pmed-modal-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(2px);
    z-index: 1050;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.pmed-modal-overlay.open {
    display: flex;
}

.pmed-modal-box {
    background: #ffffff;
    border-radius: 10px;
    width: 100%;
    max-width: 540px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
    border: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
}

:root[data-theme="dark"] .pmed-modal-box {
    background: var(--bg-surface);
    border-color: var(--border-color);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.pmed-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 18px 24px;
    border-bottom: 1px solid #e2e8f0;
}

:root[data-theme="dark"] .pmed-modal-header {
    border-bottom-color: var(--border-color);
}

.pmed-modal-header h3 {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: #0f172a;
}

:root[data-theme="dark"] .pmed-modal-header h3 {
    color: var(--text-primary);
}

.pmed-modal-close {
    background: none;
    border: none;
    font-size: 22px;
    cursor: pointer;
    color: #94a3b8;
    line-height: 1;
    padding: 4px;
    border-radius: 4px;
    transition: color 0.15s ease;
}

.pmed-modal-close:hover {
    color: #0f172a;
}

:root[data-theme="dark"] .pmed-modal-close:hover {
    color: #ffffff;
}

.pmed-modal-body {
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow-y: auto;
}

.pmed-modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 16px 24px;
    border-top: 1px solid #e2e8f0;
    background: #f8fafc;
    border-radius: 0 0 10px 10px;
}

:root[data-theme="dark"] .pmed-modal-footer {
    background: var(--bg-surface-alt);
    border-top-color: var(--border-color);
}

.pmed-form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.pmed-form-group label {
    font-size: 13px;
    font-weight: 600;
    color: #334155;
    margin: 0;
}

:root[data-theme="dark"] .pmed-form-group label {
    color: var(--text-primary);
}

.pmed-form-group label .req {
    color: #ef4444;
}

.pmed-form-control {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 13.5px;
    color: #1e293b;
    box-sizing: border-box;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
    font-family: inherit;
    background: #ffffff;
}

.pmed-form-control:focus {
    outline: none;
    border-color: #0284c7;
    box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
}

:root[data-theme="dark"] .pmed-form-control {
    background: var(--bg-surface-alt);
    border-color: var(--border-color);
    color: var(--text-primary);
}

:root[data-theme="dark"] .pmed-form-control:focus {
    border-color: #38bdf8;
    box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
}

.pmed-form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
}

@media (max-width: 500px) {
    .pmed-form-row {
        grid-template-columns: 1fr;
    }
}

/* Callout Box inside Modals */
.pmed-callout {
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: 8px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

:root[data-theme="dark"] .pmed-callout {
    background: rgba(2, 132, 199, 0.15);
    border-color: rgba(56, 189, 248, 0.3);
}

.pmed-callout-title {
    font-weight: 700;
    color: #0369a1;
    font-size: 15px;
}

:root[data-theme="dark"] .pmed-callout-title {
    color: #38bdf8;
}

.pmed-callout-info {
    font-size: 13px;
    color: #0c4a6e;
}

:root[data-theme="dark"] .pmed-callout-info {
    color: #93c5fd;
}

/* Details Modal Grid */
.pmed-details-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    font-size: 13px;
}

@media (max-width: 500px) {
    .pmed-details-grid {
        grid-template-columns: 1fr;
    }
}

.pmed-details-item {
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.pmed-details-item label {
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
}

:root[data-theme="dark"] .pmed-details-item label {
    color: var(--text-muted);
}

.pmed-details-item .val {
    font-weight: 500;
    color: #1e293b;
}

:root[data-theme="dark"] .pmed-details-item .val {
    color: var(--text-primary);
}
</style>

<div class="pt-appt-page pmed-portal-page">
    <!-- Topbar: standard portal header -->
    <div class="pmed-topbar">
        <div class="pmed-topbar-title">
            <h1>My Medications</h1>
            <p>Review your active prescriptions, dosage instructions, and manage medication refills.</p>
        </div>
        <div class="pmed-topbar-actions">
            <button type="button" class="pmed-btn pmed-btn-primary" id="btnOpenRecordModal">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Record Medication
            </button>
        </div>
    </div>

    <!-- Body Container -->
    <div class="pmed-body">
        <!-- Controls: Search & Filter Tabs -->
        <div class="pmed-controls">
            <div class="pmed-search-wrap">
                <span class="pmed-search-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                </span>
                <input type="text" class="pmed-search-input" id="pmedSearchInput" placeholder="Search by medication, prescriber, or Rx #...">
            </div>

            <div class="pmed-filter-tabs" id="pmedFilterTabs">
                <button type="button" class="pmed-filter-btn active" data-filter="all">
                    All <span class="pmed-count-pill" id="countAll">0</span>
                </button>
                <button type="button" class="pmed-filter-btn" data-filter="active">
                    Active <span class="pmed-count-pill" id="countActive">0</span>
                </button>
                <button type="button" class="pmed-filter-btn" data-filter="prescription">
                    Prescriptions <span class="pmed-count-pill" id="countRx">0</span>
                </button>
                <button type="button" class="pmed-filter-btn" data-filter="medication">
                    Home / OTC <span class="pmed-count-pill" id="countOtc">0</span>
                </button>
                <button type="button" class="pmed-filter-btn" data-filter="completed">
                    Completed <span class="pmed-count-pill" id="countCompleted">0</span>
                </button>
            </div>
        </div>

        <!-- Medication Cards List -->
        <div id="patientMedicationsList">
            <div class="pmed-empty-state">
                <p>Loading your medications...</p>
            </div>
        </div>
    </div>
</div>

<!-- Modal: Record / Edit Home Medication -->
<div class="pmed-modal-overlay" id="pmedRecordModal">
    <div class="pmed-modal-box">
        <div class="pmed-modal-header">
            <h3 id="pmedRecordModalTitle">Record Medication</h3>
            <button type="button" class="pmed-modal-close" id="pmedCloseRecordModal">&times;</button>
        </div>
        <form id="pmedRecordForm">
            <input type="hidden" id="pmedRecordId" value="">
            <div class="pmed-modal-body">
                <div class="pmed-form-group">
                    <label for="pmedFormTitle">Medication Name / Supplement <span class="req">*</span></label>
                    <input type="text" id="pmedFormTitle" class="pmed-form-control" placeholder="e.g. Vitamin D3, Melatonin, Fish Oil" required>
                </div>
                <div class="pmed-form-row">
                    <div class="pmed-form-group">
                        <label for="pmedFormDosage">Dosage / Strength</label>
                        <input type="text" id="pmedFormDosage" class="pmed-form-control" placeholder="e.g. 500 mg, 2000 IU">
                    </div>
                    <div class="pmed-form-group">
                        <label for="pmedFormFrequency">Frequency / Usage</label>
                        <input type="text" id="pmedFormFrequency" class="pmed-form-control" placeholder="e.g. Once daily, As needed">
                    </div>
                </div>
                <div class="pmed-form-row">
                    <div class="pmed-form-group">
                        <label for="pmedFormStartDate">Start Date</label>
                        <input type="date" id="pmedFormStartDate" class="pmed-form-control">
                    </div>
                    <div class="pmed-form-group">
                        <label for="pmedFormEndDate">End Date (optional)</label>
                        <input type="date" id="pmedFormEndDate" class="pmed-form-control">
                    </div>
                </div>
                <div class="pmed-form-group">
                    <label for="pmedFormComments">Directions / Notes</label>
                    <textarea id="pmedFormComments" class="pmed-form-control" rows="3" placeholder="e.g. Take with food in the morning."></textarea>
                </div>
            </div>
            <div class="pmed-modal-footer">
                <button type="button" class="pmed-btn pmed-btn-outline" id="pmedCancelRecordModal">Cancel</button>
                <button type="submit" class="pmed-btn pmed-btn-primary" id="pmedSaveRecordBtn">Save Medication</button>
            </div>
        </form>
    </div>
</div>

<!-- Modal: Refill Request -->
<div class="pmed-modal-overlay" id="pmedRefillModal">
    <div class="pmed-modal-box">
        <div class="pmed-modal-header">
            <h3>Request Prescription Refill</h3>
            <button type="button" class="pmed-modal-close" id="pmedCloseRefillModal">&times;</button>
        </div>
        <form id="pmedRefillForm">
            <input type="hidden" id="pmedRefillRxId" value="">
            <div class="pmed-modal-body">
                <div class="pmed-callout">
                    <div class="pmed-callout-title" id="pmedRefillMedTitle"></div>
                    <div class="pmed-callout-info" id="pmedRefillMedInfo"></div>
                </div>
                <div class="pmed-form-group">
                    <label for="pmedRefillNotes">Notes for Pharmacy or Care Team (Optional)</label>
                    <textarea id="pmedRefillNotes" class="pmed-form-control" rows="3" placeholder="Optional notes, e.g., preferred pickup day, current symptoms, or change in contact number."></textarea>
                </div>
                <p style="font-size:12px; color:var(--text-muted, #64748b); margin:0; line-height:1.4;">
                    Your refill request will be sent directly to your assigned care provider and pharmacy for review and fulfillment.
                </p>
            </div>
            <div class="pmed-modal-footer">
                <button type="button" class="pmed-btn pmed-btn-outline" id="pmedCancelRefillModal">Cancel</button>
                <button type="submit" class="pmed-btn pmed-btn-primary" id="pmedSubmitRefillBtn">Submit Refill Request</button>
            </div>
        </form>
    </div>
</div>

<!-- Modal: Medication Details -->
<div class="pmed-modal-overlay" id="pmedDetailsModal">
    <div class="pmed-modal-box">
        <div class="pmed-modal-header">
            <h3 id="pmedDetailsTitle">Medication Details</h3>
            <button type="button" class="pmed-modal-close" id="pmedCloseDetailsModal">&times;</button>
        </div>
        <div class="pmed-modal-body" id="pmedDetailsContent">
            <!-- Dynamic content -->
        </div>
        <div class="pmed-modal-footer">
            <button type="button" class="pmed-btn pmed-btn-outline" id="pmedCloseDetailsBtn">Close</button>
        </div>
    </div>
</div>
    `;
}
