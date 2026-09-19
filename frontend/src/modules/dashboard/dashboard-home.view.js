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
    /* Validated 4-slot categorical order (see dataviz skill) for the
       Appointments-by-Status chart -- passes CVD/contrast checks in this
       exact adjacent sequence; reordering these requires re-validating. */
    --dh-status-scheduled: #2a78d6;
    --dh-status-completed: #eb6834;
    --dh-status-cancelled: #1baf7a;
    --dh-status-no_show: #eda100;
}

@media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) .dh-page {
        --dh-status-scheduled: #3987e5;
        --dh-status-completed: #d95926;
        --dh-status-cancelled: #199e70;
        --dh-status-no_show: #c98500;
    }
}

:root[data-theme="dark"] .dh-page {
    --dh-status-scheduled: #3987e5;
    --dh-status-completed: #d95926;
    --dh-status-cancelled: #199e70;
    --dh-status-no_show: #c98500;
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
.status-badge.cancelled { background: #fee2e2; color: #991b1b; }
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

/* Charts */
.dh-charts-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
    margin-bottom: 24px;
}

.dh-charts-grid.two-col {
    grid-template-columns: 1.3fr 1fr;
}

.dh-chart-panel {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 20px 24px 16px;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
}

.dh-chart-title {
    margin: 0 0 2px;
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
}

.dh-chart-subtitle {
    margin: 0 0 16px;
    font-size: 12px;
    color: #64748b;
}

.dh-chart-wrap {
    position: relative;
}

.dh-chart-svg {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
}

.dh-chart-empty {
    padding: 40px 0;
    text-align: center;
    color: #94a3b8;
    font-size: 13px;
}

.dh-line-path {
    fill: none;
    stroke: var(--accent, #1d4ed8);
    stroke-width: 2;
    stroke-linejoin: round;
    stroke-linecap: round;
}

.dh-line-area {
    fill: var(--accent, #1d4ed8);
    opacity: 0.08;
}

.dh-line-baseline {
    stroke: #e1e0d9;
    stroke-width: 1;
}

.dh-line-crosshair {
    stroke: #c3c2b7;
    stroke-width: 1;
    opacity: 0;
    pointer-events: none;
}

.dh-line-dot {
    fill: var(--accent, #1d4ed8);
    stroke: #ffffff;
    stroke-width: 2;
    opacity: 0;
    pointer-events: none;
}

.dh-line-endlabel {
    font-size: 12px;
    font-weight: 700;
    fill: #0f172a;
}

.dh-line-axislabel {
    font-size: 10px;
    fill: #898781;
}

.dh-line-hit {
    fill: transparent;
    cursor: crosshair;
}

.dh-line-hit:focus-visible {
    outline: none;
}

.dh-chart-tooltip {
    position: absolute;
    pointer-events: none;
    background: #0f172a;
    color: #ffffff;
    font-size: 12px;
    line-height: 1.4;
    padding: 6px 10px;
    border-radius: 6px;
    white-space: nowrap;
    opacity: 0;
    transform: translate(-50%, -100%);
    transition: opacity .08s;
    z-index: 5;
}

.dh-chart-tooltip.visible {
    opacity: 1;
}

.dh-chart-tooltip strong {
    font-weight: 700;
}

.dh-bars {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.dh-bar-row {
    display: grid;
    grid-template-columns: 84px 1fr 34px;
    align-items: center;
    gap: 10px;
}

.dh-bar-row.is-hovered .dh-bar-track {
    background: #e2e8f0;
}

.dh-bar-label {
    font-size: 12.5px;
    font-weight: 600;
    color: #334155;
}

.dh-bar-track {
    position: relative;
    height: 16px;
    background: #f1f5f9;
    border-radius: 4px;
    overflow: hidden;
    transition: background-color .12s;
}

.dh-bar-fill {
    position: absolute;
    inset: 0 auto 0 0;
    border-radius: 4px;
    transition: width .3s ease;
}

.dh-bar-value {
    font-size: 12.5px;
    font-weight: 700;
    color: #0f172a;
    text-align: right;
    font-variant-numeric: tabular-nums;
}

@media (max-width: 900px) {
    .dh-charts-grid.two-col { grid-template-columns: 1fr; }
}

:root[data-theme="dark"] .dh-chart-panel { background: var(--bg-surface); border-color: var(--border-color); }
:root[data-theme="dark"] .dh-chart-title { color: var(--text-primary); }
:root[data-theme="dark"] .dh-chart-subtitle { color: var(--text-muted); }
:root[data-theme="dark"] .dh-line-baseline { stroke: var(--border-color); }
:root[data-theme="dark"] .dh-line-crosshair { stroke: var(--border-color); }
:root[data-theme="dark"] .dh-line-dot { stroke: var(--bg-surface); }
:root[data-theme="dark"] .dh-line-endlabel { fill: var(--text-primary); }
:root[data-theme="dark"] .dh-line-axislabel { fill: var(--text-muted); }
:root[data-theme="dark"] .dh-bar-label { color: var(--text-primary); }
:root[data-theme="dark"] .dh-bar-track { background: var(--bg-surface-alt); }
:root[data-theme="dark"] .dh-bar-row.is-hovered .dh-bar-track { background: var(--border-color); }
:root[data-theme="dark"] .dh-bar-value { color: var(--text-primary); }
:root[data-theme="dark"] .dh-chart-empty { color: var(--text-muted); }

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
:root[data-theme="dark"] .dh-empty-row { color: var(--text-muted); }

/* Announcements Section on Dashboard */
.dh-announcements-section {
    background: var(--bg-surface, #ffffff);
    border: 1px solid var(--border-color, #e2e8f0);
    border-radius: 12px;
    padding: 20px 24px;
    margin-bottom: 28px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
}

:root[data-theme="dark"] .dh-announcements-section {
    background: var(--bg-surface, #1e293b);
    border-color: var(--border-color, #334155);
}

.dh-announcements-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--border-color, #f1f5f9);
    flex-wrap: wrap;
    gap: 12px;
}

:root[data-theme="dark"] .dh-announcements-header {
    border-bottom-color: var(--border-color, #334155);
}

.dh-announcements-title-wrap {
    display: flex;
    align-items: center;
    gap: 12px;
}

.dh-announcements-icon {
    width: 38px;
    height: 38px;
    border-radius: 8px;
    background: #eff6ff;
    color: #2563eb;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

:root[data-theme="dark"] .dh-announcements-icon {
    background: rgba(37, 99, 235, 0.15);
    color: #60a5fa;
}

.dh-announcements-title {
    font-size: 17px;
    font-weight: 700;
    margin: 0;
    color: var(--text-primary, #0f172a);
    display: flex;
    align-items: center;
    gap: 8px;
}

.dh-announcements-count-badge {
    font-size: 11px;
    font-weight: 600;
    background: #dbeafe;
    color: #1e40af;
    padding: 2px 8px;
    border-radius: 12px;
}

:root[data-theme="dark"] .dh-announcements-count-badge {
    background: rgba(59, 130, 246, 0.2);
    color: #93c5fd;
}

.dh-announcements-subtitle {
    margin: 2px 0 0 0;
    font-size: 13px;
    color: var(--text-muted, #64748b);
}

.dh-announcements-actions {
    display: flex;
    align-items: center;
    gap: 10px;
}

.dh-announcements-link {
    font-size: 13px;
    font-weight: 600;
    color: #2563eb;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    background: none;
    border: none;
    padding: 6px 10px;
    border-radius: 6px;
    transition: all 0.15s ease;
}

.dh-announcements-link:hover {
    background: #f1f5f9;
}

:root[data-theme="dark"] .dh-announcements-link:hover {
    background: #334155;
}

.dh-announcements-post-btn {
    font-size: 13px;
    font-weight: 600;
    color: #ffffff;
    background: #0f172a;
    border: none;
    padding: 6px 14px;
    border-radius: 6px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: background 0.15s ease;
}

.dh-announcements-post-btn:hover {
    background: #1e293b;
}

/* Grid of cards */
.dh-announcements-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;
}

.dh-announcement-card {
    background: var(--bg-surface, #ffffff);
    border: 1px solid var(--border-color, #e2e8f0);
    border-left: 4px solid #3b82f6;
    border-radius: 10px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}

:root[data-theme="dark"] .dh-announcement-card {
    background: var(--bg-surface-alt, #0f172a);
    border-color: var(--border-color, #334155);
}

.dh-announcement-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 18px rgba(0,0,0,0.06);
    border-color: #cbd5e1;
}

.dh-announcement-card.priority-important {
    border-left-color: #f59e0b;
}

.dh-announcement-card.priority-urgent {
    border-left-color: #ef4444;
}

.dh-announcement-body {
    display: flex;
    gap: 14px;
    align-items: flex-start;
}

.dh-announcement-img {
    width: 68px;
    height: 68px;
    border-radius: 8px;
    object-fit: cover;
    flex-shrink: 0;
    background: #f1f5f9;
    border: 1px solid rgba(0,0,0,0.06);
}

.dh-announcement-main {
    flex: 1;
    min-width: 0;
}

.dh-announcement-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    flex-wrap: wrap;
}

.dh-announcement-priority {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 2px 7px;
    border-radius: 10px;
}

.dh-announcement-priority.urgent { background: #fee2e2; color: #991b1b; }
.dh-announcement-priority.important { background: #fef3c7; color: #92400e; }
.dh-announcement-priority.normal { background: #e0f2fe; color: #0369a1; }

.dh-announcement-date {
    font-size: 11px;
    color: var(--text-muted, #64748b);
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.dh-announcement-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary, #0f172a);
    margin: 0 0 4px 0;
    line-height: 1.35;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.dh-announcement-snippet {
    font-size: 13px;
    color: var(--text-muted, #64748b);
    margin: 0;
    line-height: 1.45;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.dh-announcement-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid var(--border-color, #f1f5f9);
    padding-top: 10px;
    margin-top: 4px;
}

:root[data-theme="dark"] .dh-announcement-footer {
    border-top-color: var(--border-color, #334155);
}

.dh-announcement-audience {
    font-size: 11px;
    color: var(--text-muted, #64748b);
    background: var(--bg-surface-alt, #f1f5f9);
    padding: 2px 8px;
    border-radius: 4px;
    max-width: 180px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.dh-announcement-read-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    font-weight: 600;
    color: #2563eb;
}

/* Empty State inside section */
.dh-announcements-empty {
    text-align: center;
    padding: 32px 16px;
    background: var(--bg-surface-alt, #f8fafc);
    border: 1px dashed var(--border-color, #cbd5e1);
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
}

:root[data-theme="dark"] .dh-announcements-empty {
    background: rgba(255,255,255,0.02);
    border-color: #334155;
}

.dh-announcements-empty svg {
    color: #94a3b8;
    margin-bottom: 2px;
}

.dh-announcements-empty-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary, #334155);
    margin: 0;
}

.dh-announcements-empty-desc {
    font-size: 13px;
    color: var(--text-muted, #64748b);
    margin: 0 0 8px 0;
}

/* Quick Reader Modal */
.dh-reader-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(4px);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 20px 16px;
    box-sizing: border-box;
    overflow-y: auto;
}

.dh-reader-overlay.open {
    display: flex;
}

.dh-reader-box {
    background: var(--bg-surface, #ffffff);
    border: 1px solid var(--border-color, #e2e8f0);
    border-radius: 12px;
    width: 100%;
    max-width: 680px;
    max-height: min(90vh, 800px);
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
    overflow: hidden;
    margin: auto;
}

.dh-reader-header {
    padding: 18px 24px;
    border-bottom: 1px solid var(--border-color, #e2e8f0);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
}

.dh-reader-header h2 {
    font-size: 18px;
    font-weight: 700;
    margin: 0;
}

.dh-reader-close {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: var(--text-muted, #94a3b8);
    line-height: 1;
    padding: 0 4px;
}

.dh-reader-close:hover {
    color: var(--text-primary, #0f172a);
}

.dh-reader-body {
    padding: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    flex: 1;
    min-height: 0;
}

.dh-reader-hero {
    width: 100%;
    max-height: 280px;
    overflow: hidden;
    background: #f1f5f9;
}

.dh-reader-hero img {
    width: 100%;
    max-height: 280px;
    object-fit: cover;
    display: block;
}

.dh-reader-content-wrap {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.dh-reader-footer {
    padding: 16px 24px;
    border-top: 1px solid var(--border-color, #e2e8f0);
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    background: var(--bg-surface-alt, #f8fafc);
    flex-shrink: 0;
}
</style>

<div class="dh-page">
    <div class="dh-header-wrap">
        <div class="dh-header-text">
            <h1>Executive Overview</h1>
            <p class="dh-subtitle" id="dhSubtitle">Loading real-time metrics...</p>
        </div>
        <div class="dh-header-actions" id="dhHeaderActions"></div>
    </div>

    <!-- HOSPITAL ANNOUNCEMENTS SECTION -->
    <div class="dh-announcements-section" id="dhAnnouncementsSection">
        <div class="dh-announcements-header">
            <div class="dh-announcements-title-wrap">
                <div class="dh-announcements-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                </div>
                <div>
                    <h2 class="dh-announcements-title">
                        Hospital Announcements
                        <span class="dh-announcements-count-badge" id="dhAnnouncementsCountBadge" style="display: none;">0 Active</span>
                    </h2>
                    <p class="dh-announcements-subtitle">Official broadcasts, notices, and scheduled updates for hospital staff &amp; patients</p>
                </div>
            </div>
            <div class="dh-announcements-actions" id="dhAnnouncementsActions">
                <button type="button" class="dh-announcements-link" id="dhAnnouncementsViewAllBtn">
                    View All
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
            </div>
        </div>

        <div id="dhAnnouncementsSlot">
            <div style="display: flex; gap: 16px;">
                <div class="skeleton" style="height: 100px; flex: 1; border-radius: 8px;"></div>
                <div class="skeleton" style="height: 100px; flex: 1; border-radius: 8px;"></div>
            </div>
        </div>
    </div>

    <!-- QUICK ANNOUNCEMENT READER MODAL -->
    <div class="dh-reader-overlay" id="dhReaderOverlay">
        <div class="dh-reader-box">
            <div class="dh-reader-header">
                <h2 id="dhReaderModalTitle">Announcement</h2>
                <button type="button" class="dh-reader-close" id="dhReaderModalClose">&times;</button>
            </div>
            <div class="dh-reader-body">
                <div class="dh-reader-hero" id="dhReaderHero" style="display: none;">
                    <img id="dhReaderHeroImg" src="" alt="Announcement banner">
                </div>
                <div class="dh-reader-content-wrap">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                        <span id="dhReaderPriorityBadge" class="dh-announcement-priority normal">Normal</span>
                        <span id="dhReaderScheduleDate" style="font-size: 12px; color: #64748b;"></span>
                    </div>
                    <h3 id="dhReaderMainTitle" style="font-size: 19px; font-weight: 700; color: #0f172a; margin: 0; line-height: 1.35;"></h3>
                    <div style="display: flex; gap: 16px; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; flex-wrap: wrap;">
                        <div>Audience: <strong id="dhReaderAudience" style="color: #334155;">All Roles</strong></div>
                        <div>Posted by: <strong id="dhReaderAuthor" style="color: #334155;">Hospital Staff</strong></div>
                    </div>
                    <div id="dhReaderContentText" style="font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-wrap;"></div>
                </div>
            </div>
            <div class="dh-reader-footer">
                <button type="button" class="dh-action-btn" id="dhReaderCloseBtn">Close</button>
                <button type="button" class="dh-action-btn primary" id="dhReaderGoToModuleBtn">Go to Announcements</button>
            </div>
        </div>
    </div>

    <div id="dhHighlightSlot"></div>

    <div class="dh-stats-grid" id="dhStatsGrid">
        <div class="dh-stat-card"><div class="dh-stat-header"><div class="dh-stat-label">Initializing</div></div><div class="dh-stat-body"><div class="dh-stat-value skeleton"></div></div></div>
        <div class="dh-stat-card"><div class="dh-stat-header"><div class="dh-stat-label">Initializing</div></div><div class="dh-stat-body"><div class="dh-stat-value skeleton"></div></div></div>
        <div class="dh-stat-card"><div class="dh-stat-header"><div class="dh-stat-label">Initializing</div></div><div class="dh-stat-body"><div class="dh-stat-value skeleton"></div></div></div>
    </div>

    <div class="dh-charts-grid" id="dhChartsGrid"></div>

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
