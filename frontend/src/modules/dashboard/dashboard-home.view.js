export function DashboardHomeView(user)
{
    const firstName = user?.first_name || user?.username || "Executive";

    return `
<style>
.dh-page {
    width: 100%;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    color: #0f172a;
    padding-bottom: 40px;
}

/* Header Area */
.dh-header-wrap {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 32px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 24px;
}

.dh-header-text h1 {
    font-size: 32px;
    font-weight: 700;
    letter-spacing: -0.02em;
    margin: 0 0 8px 0;
    color: #0f172a;
}

.dh-subtitle {
    margin: 0;
    color: #64748b;
    font-size: 15px;
    font-weight: 400;
}

.dh-header-actions {
    display: flex;
    gap: 12px;
}

.dh-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0 16px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    background: #ffffff;
    color: #0f172a;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.2s ease;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.dh-action-btn:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
}

.dh-action-btn.primary {
    background: #0f172a;
    color: #ffffff;
    border-color: #0f172a;
}

.dh-action-btn.primary:hover {
    background: #1e293b;
    border-color: #1e293b;
}

.dh-action-btn svg {
    width: 16px;
    height: 16px;
}

/* Stats Grid */
.dh-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 24px;
    margin-bottom: 32px;
}

.dh-stat-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02);
    position: relative;
    overflow: hidden;
}

.dh-stat-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: #3b82f6;
    border-top-left-radius: 8px;
    border-bottom-left-radius: 8px;
}

.dh-stat-card.alt::before { background: #10b981; }
.dh-stat-card.warn::before { background: #f59e0b; }

.dh-stat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.dh-stat-label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
    color: #64748b;
}

.dh-stat-icon {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    background: #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #475569;
}

.dh-stat-icon svg {
    width: 18px;
    height: 18px;
}

.dh-stat-body {
    display: flex;
    align-items: baseline;
    gap: 12px;
}

.dh-stat-value {
    font-family: 'JetBrains Mono', 'SF Mono', Consolas, monospace;
    font-size: 32px;
    font-weight: 700;
    color: #0f172a;
    line-height: 1;
    letter-spacing: -0.05em;
}

.dh-stat-trend {
    font-size: 13px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 12px;
    background: #dcfce7;
    color: #166534;
    display: flex;
    align-items: center;
    gap: 4px;
}

.dh-stat-trend.negative {
    background: #fee2e2;
    color: #991b1b;
}

.dh-stat-trend.neutral {
    background: #f1f5f9;
    color: #475569;
}

.dh-stat-value.skeleton {
    width: 80px;
    height: 32px;
    border-radius: 4px;
    background: linear-gradient(90deg, #e2e8f0 25%, #cbd5e1 37%, #e2e8f0 63%);
    background-size: 400% 100%;
    animation: dh-shimmer 1.4s ease infinite;
}

@keyframes dh-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

/* Layout Grid for Panels */
.dh-layout-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
}

/* Panels */
.dh-panel {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
}

.dh-panel-header {
    padding: 20px 24px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.dh-panel-header h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #0f172a;
}

.dh-panel-action {
    font-size: 13px;
    color: #3b82f6;
    text-decoration: none;
    font-weight: 500;
}

.dh-panel-action:hover {
    text-decoration: underline;
}

.dh-table-wrap {
    flex: 1;
    overflow-x: auto;
}

.dh-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.dh-table th {
    text-align: left;
    padding: 12px 24px;
    color: #64748b;
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
}

.dh-table td {
    padding: 16px 24px;
    border-bottom: 1px solid #f1f5f9;
    color: #334155;
    vertical-align: middle;
}

.dh-table tbody tr:last-child td {
    border-bottom: none;
}

.dh-table tbody tr:hover {
    background: #f8fafc;
}

.dh-empty-row {
    text-align: center;
    color: #94a3b8;
    padding: 48px 24px !important;
}

.status-badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.status-badge.scheduled { background: #e0f2fe; color: #0369a1; }
.status-badge.completed { background: #dcfce7; color: #166534; }
.status-badge.canceled { background: #fee2e2; color: #991b1b; }
.status-badge.no_show { background: #ffedd5; color: #9a3412; }


.dh-highlight-card {
    background: #0f172a;
    border-radius: 8px;
    padding: 24px;
    color: white;
    margin-bottom: 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.4);
}
.dh-highlight-info {
    flex: 1;
}
.dh-highlight-label {
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #94a3b8;
    margin-bottom: 8px;
}
.dh-highlight-main {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 4px;
}
.dh-highlight-sub {
    font-size: 15px;
    color: #cbd5e1;
}

@media (max-width: 640px) {
    .dh-header-wrap { flex-direction: column; align-items: flex-start; gap: 16px; }
    .dh-header-actions { width: 100%; }
    .dh-action-btn { flex: 1; justify-content: center; }
}

:root[data-theme="dark"] .dh-page { color: var(--text-primary); }
:root[data-theme="dark"] .dh-header-wrap { border-bottom-color: var(--border-color); }
:root[data-theme="dark"] .dh-header-text h1 { color: var(--text-primary); }
:root[data-theme="dark"] .dh-subtitle { color: var(--text-muted); }
:root[data-theme="dark"] .dh-action-btn {
    background: var(--bg-surface);
    border-color: var(--border-color);
    color: var(--text-primary);
}
:root[data-theme="dark"] .dh-action-btn:hover { background: var(--bg-surface-alt); }
:root[data-theme="dark"] .dh-stat-card,
:root[data-theme="dark"] .dh-panel {
    background: var(--bg-surface);
    border-color: var(--border-color);
}
:root[data-theme="dark"] .dh-stat-label { color: var(--text-muted); }
:root[data-theme="dark"] .dh-stat-icon { background: var(--bg-surface-alt); color: var(--text-muted); }
:root[data-theme="dark"] .dh-stat-value { color: var(--text-primary); }
:root[data-theme="dark"] .dh-stat-value.skeleton {
    background: linear-gradient(90deg, #2a3548 25%, #384258 37%, #2a3548 63%);
    background-size: 400% 100%;
}
:root[data-theme="dark"] .dh-panel-header { border-bottom-color: var(--border-color); }
:root[data-theme="dark"] .dh-panel-header h2 { color: var(--text-primary); }
:root[data-theme="dark"] .dh-table th {
    background: var(--bg-surface-alt);
    color: var(--text-muted);
    border-bottom-color: var(--border-color);
}
:root[data-theme="dark"] .dh-table td { color: var(--text-primary); border-bottom-color: var(--border-color); }
:root[data-theme="dark"] .dh-table tbody tr:hover { background: var(--bg-surface-alt); }
:root[data-theme="dark"] .dh-empty-row { color: var(--text-muted); }
</style>

<div class="dh-page">
    <div class="dh-header-wrap">
        <div class="dh-header-text">
            <h1>Executive Overview</h1>
            <p class="dh-subtitle" id="dhSubtitle">Loading real-time metrics...</p>
        </div>
        <div class="dh-header-actions" id="dhHeaderActions"></div>
    </div>

    <div id="dhHighlightSlot"></div>

    <div class="dh-stats-grid" id="dhStatsGrid">
        <div class="dh-stat-card"><div class="dh-stat-header"><div class="dh-stat-label">Initializing</div></div><div class="dh-stat-body"><div class="dh-stat-value skeleton"></div></div></div>
        <div class="dh-stat-card"><div class="dh-stat-header"><div class="dh-stat-label">Initializing</div></div><div class="dh-stat-body"><div class="dh-stat-value skeleton"></div></div></div>
        <div class="dh-stat-card"><div class="dh-stat-header"><div class="dh-stat-label">Initializing</div></div><div class="dh-stat-body"><div class="dh-stat-value skeleton"></div></div></div>
    </div>

    <div class="dh-layout-grid">
        <div class="dh-panel">
            <div class="dh-panel-header">
                <h2 id="dhActivityTitle">Recent Operations</h2>
                <a href="#" class="dh-panel-action" onclick="document.querySelector('[data-tab=appointments]')?.click(); return false;">View All</a>
            </div>
            <div class="dh-table-wrap">
                <table class="dh-table">
                    <thead id="dhTableHead"></thead>
                    <tbody id="dhTableBody">
                        <tr><td colspan="4" class="dh-empty-row">Loading operational data...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>


        <div class="dh-panel" id="dhAiReportPanel" style="display: none; margin-top: 16px;">
            <div class="dh-panel-header">
                <h2>AI Health Assessment</h2>
            </div>
            <div id="dhAiReportContent" style="padding: 20px;">
                <div style="display: flex; flex-direction: column; gap: 12px; color: #6b7787;">
                    <div style="font-weight: 600; color: #3b475a;">Analyzing your health records...</div>
                    <div class="skeleton" style="height: 16px; width: 100%; border-radius: 4px;"></div>
                    <div class="skeleton" style="height: 16px; width: 80%; border-radius: 4px;"></div>
                    <div class="skeleton" style="height: 16px; width: 90%; border-radius: 4px;"></div>
                </div>
            </div>
        </div>

    </div>
</div>
`;
}

function escapeHtml(value)
{
    const div = document.createElement("div");

    div.textContent = value ?? "";

    return div.innerHTML;
}
