export function PatientFinderView()
{
    return `
<style>
.fnd-page {
    width: 100%;
    font-size: 13.5px;
}

.fnd-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 4px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e5e9f0;
}

.fnd-icon-badge {
    flex-shrink: 0;
    width: 34px;
    height: 34px;
    border-radius: 7px;
    border: 1px solid #dbe1ea;
    background: #f8fafc;
    display: flex;
    align-items: center;
    justify-content: center;
}

.fnd-icon-badge svg {
    width: 18px;
    height: 18px;
    color: #42536b;
}

.fnd-header h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #14181f;
    letter-spacing: -.2px;
}

.fnd-header p {
    margin: 1px 0 0;
    font-size: 12.5px;
    color: #6b7787;
}

.fnd-search-wrap {
    position: relative;
    max-width: 420px;
    margin: 18px 0 16px;
}

.fnd-search-wrap svg {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 15px;
    height: 15px;
    color: #96a2b8;
    pointer-events: none;
}

.fnd-search-input {
    width: 100%;
    height: 38px;
    padding: 0 14px 0 36px;
    border-radius: 7px;
    border: 1px solid #d7dee8;
    outline: none;
    font-size: 14px;
    color: #1c2534;
    background: white;
    transition: border-color .12s;
}

.fnd-search-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(var(--accent-rgb),.12);
}

.fnd-table-wrap {
    overflow-x: auto;
    border: 1px solid #e5e9f0;
    border-radius: 8px;
}

.fnd-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.fnd-table th {
    text-align: left;
    padding: 9px 14px;
    color: #6b7787;
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .3px;
    background: #f8fafc;
    border-bottom: 1px solid #e5e9f0;
    white-space: nowrap;
}

.fnd-table td {
    padding: 9px 14px;
    border-bottom: 1px solid #eef1f5;
    color: #29323f;
    vertical-align: middle;
}

.fnd-table tbody tr:last-child td {
    border-bottom: none;
}

.fnd-table tbody tr.fnd-row {
    cursor: pointer;
}

.fnd-table tbody tr.fnd-row:hover {
    background: #f8fafc;
}

.fnd-name-cell {
    display: flex;
    align-items: center;
    gap: 10px;
}

.fnd-avatar {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: var(--accent);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 12px;
    overflow: hidden;
}

.fnd-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.fnd-name {
    font-weight: 600;
    color: #14181f;
}

.fnd-patient-no {
    font-family: "SFMono-Regular", Consolas, "Courier New", monospace;
    font-size: 12px;
    color: #55647c;
}

.fnd-muted {
    color: #6b7787;
}

.fnd-muted.empty {
    color: #a3adbd;
}

.fnd-tag {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    color: #3b475a;
    font-size: 11.5px;
    font-weight: 600;
}

.fnd-tag.empty {
    background: none;
    border-color: transparent;
    color: #a3adbd;
    font-weight: 400;
    padding: 2px 0;
}

.fnd-view-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: 1px solid transparent;
    border-radius: 6px;
    background: none;
    padding: 5px 9px;
    font-size: 12px;
    font-weight: 600;
    color: var(--accent);
    cursor: pointer;
    transition: background-color .1s, border-color .1s;
}

.fnd-view-btn:hover {
    background: var(--accent-light);
    border-color: var(--accent-border);
}

.fnd-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 48px 20px;
    color: #6b7787;
}

.fnd-empty-state svg {
    width: 32px;
    height: 32px;
    color: #a2aec4;
    margin-bottom: 10px;
}

.fnd-empty-state strong {
    display: block;
    color: #29323f;
    font-size: 13.5px;
    font-weight: 600;
    margin-bottom: 2px;
}

.fnd-empty-state p {
    margin: 0;
    font-size: 13px;
}
</style>

<div class="fnd-page">
    <div class="fnd-header">
        <div class="fnd-icon-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>
        </div>
        <div>
            <h1>Finder</h1>
            <p>Quickly search for a patient to open their chart.</p>
        </div>
    </div>

    <div class="fnd-search-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>
        <input type="text" id="finderSearchInput" class="fnd-search-input" placeholder="Search by name or patient number..." autocomplete="off">
    </div>

    <div class="fnd-table-wrap">
        <table class="fnd-table">
            <thead>
                <tr>
                    <th>Patient No.</th>
                    <th>Name</th>
                    <th>Sex</th>
                    <th>Birthdate</th>
                    <th>Provider</th>
                    <th></th>
                </tr>
            </thead>
            <tbody id="finderResultsBody"></tbody>
        </table>
    </div>
</div>
`;
}
