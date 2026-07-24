export function DashboardHomeView(user)
{
    const firstName = user?.first_name || user?.username || "there";

    return `
<style>
.dh-page {
    width: 100%;
}

.dh-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 28px;
}

.dh-header h1 {
    margin: 0 0 6px;
    font-size: 26px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.dh-subtitle {
    margin: 0;
    color: #71809b;
    font-size: 14.5px;
}

.dh-header-actions {
    display: flex;
    gap: 12px;
    flex-shrink: 0;
}

.dh-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 44px;
    padding: 0 20px;
    border: none;
    border-radius: 12px;
    background: linear-gradient(90deg, #4f46e5, #2563eb);
    color: white;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    text-decoration: none;
    box-shadow: 0 10px 24px rgba(37,99,235,.24);
    transition: .18s;
    white-space: nowrap;
}

.dh-action-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(37,99,235,.3);
}

.dh-action-btn svg {
    width: 16px;
    height: 16px;
}

.dh-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 18px;
    margin-bottom: 28px;
}

.dh-stat-card {
    background: white;
    border: 1px solid #eef1f7;
    border-radius: 18px;
    padding: 22px;
    display: flex;
    align-items: flex-start;
    gap: 16px;
    box-shadow: 0 10px 30px rgba(15,23,42,.04);
    animation: dh-card-in .3s ease both;
}

@keyframes dh-card-in {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
}

.dh-stat-icon {
    flex-shrink: 0;
    width: 46px;
    height: 46px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #4f46e5, #2563eb);
    box-shadow: 0 8px 18px rgba(79,70,229,.24);
}

.dh-stat-icon svg {
    width: 22px;
    height: 22px;
    color: white;
}

.dh-stat-icon.alt {
    background: linear-gradient(135deg, #22c55e, #15803d);
    box-shadow: 0 8px 18px rgba(34,197,94,.24);
}

.dh-stat-icon.warn {
    background: linear-gradient(135deg, #f59e0b, #d97706);
    box-shadow: 0 8px 18px rgba(245,158,11,.24);
}

.dh-stat-body {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.dh-stat-value {
    font-size: 28px;
    font-weight: 700;
    color: #1a2338;
    line-height: 1.1;
}

.dh-stat-value.skeleton {
    width: 48px;
    height: 26px;
    border-radius: 6px;
    background: linear-gradient(90deg, #f0f2f8 25%, #e6e9f2 37%, #f0f2f8 63%);
    background-size: 400% 100%;
    animation: dh-shimmer 1.4s ease infinite;
}

@keyframes dh-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

.dh-stat-label {
    margin-top: 4px;
    font-size: 13px;
    font-weight: 600;
    color: #71809b;
}

.dh-highlight-card {
    background: linear-gradient(135deg, #4f46e5, #2563eb);
    border-radius: 18px;
    padding: 24px 26px;
    color: white;
    margin-bottom: 28px;
    box-shadow: 0 16px 40px rgba(37,99,235,.28);
}

.dh-highlight-label {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .6px;
    opacity: .85;
    margin-bottom: 8px;
}

.dh-highlight-main {
    font-size: 22px;
    font-weight: 700;
    margin-bottom: 4px;
}

.dh-highlight-sub {
    font-size: 14px;
    opacity: .9;
}

.dh-panel {
    background: white;
    border: 1px solid #eef1f7;
    border-radius: 18px;
    padding: 26px;
    box-shadow: 0 10px 30px rgba(15,23,42,.04);
}

.dh-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 18px;
}

.dh-panel-header h2 {
    margin: 0;
    font-size: 17px;
    color: #1a2338;
}

.dh-table-wrap {
    overflow-x: auto;
    border: 1px solid #eef1f7;
    border-radius: 14px;
}

.dh-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13.5px;
}

.dh-table th {
    text-align: left;
    padding: 12px 16px;
    color: #71809b;
    font-weight: 700;
    font-size: 11.5px;
    text-transform: uppercase;
    letter-spacing: .4px;
    background: #f8fafc;
    border-bottom: 1px solid #eef1f7;
    white-space: nowrap;
}

.dh-table td {
    padding: 12px 16px;
    border-bottom: 1px solid #eef1f7;
    color: #25324b;
    vertical-align: middle;
}

.dh-table tbody tr:last-child td {
    border-bottom: none;
}

.dh-table tbody tr {
    animation: dh-row-in .25s ease both;
}

@keyframes dh-row-in {
    from { opacity: 0; }
    to { opacity: 1; }
}

.dh-table tbody tr:hover {
    background: #fafbff;
}

.dh-empty-row {
    text-align: center;
    color: #a2aec4;
    padding: 40px 16px !important;
}

.dh-skeleton-bar {
    height: 12px;
    border-radius: 6px;
    background: linear-gradient(90deg, #f0f2f8 25%, #e6e9f2 37%, #f0f2f8 63%);
    background-size: 400% 100%;
    animation: dh-shimmer 1.4s ease infinite;
}

@media (max-width: 640px) {
    .dh-header { flex-direction: column; }
    .dh-header-actions { width: 100%; }
    .dh-action-btn { flex: 1; justify-content: center; }
}
</style>

<div class="dh-page">
    <div class="dh-header">
        <div>
            <h1>Welcome back, ${escapeHtml(firstName)}</h1>
            <p class="dh-subtitle" id="dhSubtitle">Loading your overview&hellip;</p>
        </div>
        <div class="dh-header-actions" id="dhHeaderActions"></div>
    </div>

    <div id="dhHighlightSlot"></div>

    <div class="dh-stats-grid" id="dhStatsGrid">
        <div class="dh-stat-card"><div class="dh-stat-icon"><svg viewBox="0 0 24 24"></svg></div><div class="dh-stat-body"><div class="dh-stat-value skeleton"></div><div class="dh-stat-label">&nbsp;</div></div></div>
        <div class="dh-stat-card"><div class="dh-stat-icon"><svg viewBox="0 0 24 24"></svg></div><div class="dh-stat-body"><div class="dh-stat-value skeleton"></div><div class="dh-stat-label">&nbsp;</div></div></div>
        <div class="dh-stat-card"><div class="dh-stat-icon"><svg viewBox="0 0 24 24"></svg></div><div class="dh-stat-body"><div class="dh-stat-value skeleton"></div><div class="dh-stat-label">&nbsp;</div></div></div>
    </div>

    <div class="dh-panel">
        <div class="dh-panel-header">
            <h2 id="dhActivityTitle">Recent Appointments</h2>
        </div>
        <div class="dh-table-wrap">
            <table class="dh-table">
                <thead id="dhTableHead"></thead>
                <tbody id="dhTableBody">
                    <tr><td colspan="4" style="padding: 16px;"><div class="dh-skeleton-bar" style="width: 70%;"></div></td></tr>
                    <tr><td colspan="4" style="padding: 16px;"><div class="dh-skeleton-bar" style="width: 55%;"></div></td></tr>
                    <tr><td colspan="4" style="padding: 16px;"><div class="dh-skeleton-bar" style="width: 65%;"></div></td></tr>
                </tbody>
            </table>
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
