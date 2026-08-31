export function LabDocumentsView()
{
    return `
<style>
.ld-page {
    width: 100%;
    font-size: 13.5px;
}

.ld-page h1 {
    margin: 0 0 16px;
    font-size: 22px;
    color: #1a2338;
    letter-spacing: -.3px;
}

.ld-toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 16px;
}

.ld-toolbar label {
    font-size: 13px;
    font-weight: 600;
    color: #34435c;
    white-space: nowrap;
}

.ld-date-input {
    height: 34px;
    padding: 0 10px;
    border-radius: 6px;
    border: 1px solid #d7dee8;
    outline: none;
    font-size: 13px;
    color: #1c2534;
    background: white;
}

.ld-date-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(var(--accent-rgb),.12);
}

.ld-refresh-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 34px;
    padding: 0 16px;
    border: none;
    border-radius: 6px;
    background: var(--accent);
    color: white;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
}

.ld-refresh-btn:hover {
    background: #1742b0;
}

.ld-refresh-btn svg {
    width: 14px;
    height: 14px;
}

.ld-table-wrap {
    overflow-x: auto;
    border: 1px solid #e5e9f0;
    border-radius: 8px;
}

.ld-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.ld-table th {
    text-align: left;
    padding: 9px 14px;
    color: #4a5568;
    font-weight: 700;
    font-size: 11.5px;
    text-transform: uppercase;
    letter-spacing: .3px;
    background: #eef1f5;
    border-bottom: 1px solid #e5e9f0;
    white-space: nowrap;
}

.ld-table td {
    padding: 10px 14px;
    border-bottom: 1px solid #eef1f5;
    color: #29323f;
    vertical-align: middle;
}

.ld-table tbody tr:last-child td {
    border-bottom: none;
}

.ld-table tbody tr:hover {
    background: #f8fafc;
}

.ld-name-link {
    color: var(--accent);
    text-decoration: none;
    font-weight: 600;
}

.ld-name-link:hover {
    text-decoration: underline;
}

.ld-muted {
    color: #8b98ac;
    font-style: italic;
}

.ld-empty-state {
    text-align: center;
    padding: 56px 20px !important;
}

.ld-empty-state .ld-empty-icon {
    width: 48px;
    height: 48px;
    margin: 0 auto 14px;
    border-radius: 14px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.ld-empty-state .ld-empty-icon svg {
    width: 22px;
    height: 22px;
    color: #a2aec4;
}

.ld-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 14px;
    margin-bottom: 4px;
}

.ld-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 13px;
}

.ld-skeleton-row td {
    padding: 14px;
}

.ld-skeleton-bar {
    height: 12px;
    border-radius: 4px;
    background: linear-gradient(90deg, #eef1f5 25%, #e4e8ee 37%, #eef1f5 63%);
    background-size: 400% 100%;
    animation: ld-shimmer 1.4s ease infinite;
}

@keyframes ld-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

@media (max-width: 640px) {
    .ld-toolbar { flex-direction: column; align-items: stretch; }
}
</style>

<div class="ld-page">
    <h1>Lab Documents</h1>

    <div class="ld-toolbar">
        <label for="ldFromDate">From:</label>
        <input type="date" id="ldFromDate" class="ld-date-input">
        <label for="ldToDate">To:</label>
        <input type="date" id="ldToDate" class="ld-date-input">
        <button type="button" class="ld-refresh-btn" id="ldRefreshBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15.5-6.36L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-15.5 6.36L3 16"></path><path d="M3 21v-5h5"></path></svg>
            Refresh
        </button>
    </div>

    <div class="ld-table-wrap">
        <table class="ld-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Name</th>
                    <th>Patient</th>
                    <th>Note</th>
                    <th>Encounter ID</th>
                </tr>
            </thead>
            <tbody id="ldTableBody">
                <tr class="ld-skeleton-row"><td colspan="5"><div class="ld-skeleton-bar" style="width: 60%;"></div></td></tr>
                <tr class="ld-skeleton-row"><td colspan="5"><div class="ld-skeleton-bar" style="width: 45%;"></div></td></tr>
                <tr class="ld-skeleton-row"><td colspan="5"><div class="ld-skeleton-bar" style="width: 70%;"></div></td></tr>
            </tbody>
        </table>
    </div>
</div>
`;
}
