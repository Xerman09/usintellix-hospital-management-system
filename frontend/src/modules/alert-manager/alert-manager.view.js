export function AlertManagerView()
{
    return `
<style>
.am-page {
    width: 100%;
    font-size: 13.5px;
}

.am-page h1 {
    margin: 0 0 12px;
    font-size: 24px;
    font-weight: 400;
    color: #1a2338;
}

.am-toolbar {
    display: flex;
    gap: 10px;
    padding-bottom: 16px;
    margin-bottom: 16px;
    border-bottom: 1px solid #e5e9f0;
}

.am-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 20px;
    border: none;
    border-radius: 6px;
    background: var(--accent);
    color: white;
    font-weight: 600;
    font-size: 13.5px;
    cursor: pointer;
}

.am-btn:hover {
    background: #1742b0;
}

.am-btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 20px;
    border: 1px solid #cfd4dc;
    border-radius: 6px;
    background: #eef1f5;
    color: #1c2534;
    font-weight: 600;
    font-size: 13.5px;
    cursor: pointer;
}

.am-btn-secondary:hover {
    background: #e2e7ee;
}

.am-table-wrap {
    overflow-x: auto;
    border: 1px solid #d7dee8;
    border-radius: 6px;
}

.am-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.am-table th {
    text-align: left;
    padding: 10px 14px;
    background: #f8fafc;
    color: #1a2338;
    font-weight: 700;
    border-bottom: 1px solid #1a2338;
    white-space: nowrap;
}

.am-table th.am-center, .am-table td.am-center {
    text-align: center;
}

.am-table td {
    padding: 10px 14px;
    border-bottom: 1px solid #eef1f5;
    color: #1a2338;
    vertical-align: middle;
}

.am-table tbody tr:hover {
    background: #fafbff;
}

.am-title-cell {
    min-width: 200px;
    max-width: 280px;
}

.am-checkbox {
    width: 16px;
    height: 16px;
    cursor: pointer;
}

.am-acl-select {
    width: 100%;
    min-width: 320px;
    height: 32px;
    padding: 0 8px;
    border-radius: 5px;
    border: 1px solid #cfd4dc;
    font-size: 12.5px;
}

.am-loading, .am-empty {
    text-align: center;
    padding: 50px;
    color: #71809b;
}
</style>

<div class="am-page">
    <h1>Clinical Decision Rules Alert Manager</h1>

    <div class="am-toolbar">
        <button type="button" class="am-btn" id="amSaveBtn">Save</button>
        <button type="button" class="am-btn-secondary" id="amResetBtn">Reset</button>
    </div>

    <div id="amFormAlert"></div>

    <div class="am-table-wrap">
        <table class="am-table">
            <thead>
                <tr>
                    <th>Title</th>
                    <th class="am-center">Active Alert</th>
                    <th class="am-center">Passive Alert</th>
                    <th class="am-center">Patient Reminder</th>
                    <th>Access Control</th>
                </tr>
            </thead>
            <tbody id="amTableBody">
                <tr><td colspan="5" class="am-loading">Loading...</td></tr>
            </tbody>
        </table>
    </div>
</div>
`;
}
