export function PatientMedicationsView() {
    return `
<style>
.pmed-page {
    padding: 32px 40px;
    font-family: 'Inter', sans-serif;
}

.pmed-title {
    font-size: 24px;
    font-weight: normal;
    margin-top: 0;
    margin-bottom: 24px;
    color: #1e293b;
}

.pmed-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
    font-size: 14px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.pmed-table thead {
    background: #f1f5f9;
    border-bottom: 1px solid #e2e8f0;
}

.pmed-table th {
    padding: 12px 16px;
    font-weight: 600;
    color: #475569;
}

.pmed-table td {
    padding: 12px 16px;
    color: #334155;
    border-bottom: 1px solid #e2e8f0;
}

.pmed-empty {
    color: #64748b;
}

.pmed-error {
    color: #ef4444;
}

:root[data-theme="dark"] .pmed-title {
    color: var(--text-primary);
}

:root[data-theme="dark"] .pmed-table {
    background: var(--bg-surface);
    border-color: var(--border-color);
    box-shadow: none;
}

:root[data-theme="dark"] .pmed-table thead {
    background: var(--bg-surface-alt);
    border-bottom-color: var(--border-color);
}

:root[data-theme="dark"] .pmed-table th {
    color: var(--text-muted);
}

:root[data-theme="dark"] .pmed-table td {
    color: var(--text-primary);
    border-bottom-color: var(--border-color);
}

:root[data-theme="dark"] .pmed-empty {
    color: var(--text-muted);
}
</style>
<div class="pmed-page">
    <h2 class="pmed-title">My Medications</h2>
    <div id="patientMedicationsList">Loading medications...</div>
</div>
    `;
}
