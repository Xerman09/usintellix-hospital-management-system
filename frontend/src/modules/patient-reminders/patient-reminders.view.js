export function PatientRemindersView()
{
    return `
<style>
.prm-page {
    width: 100%;
    font-size: 13.5px;
}

.prm-page h1 {
    margin: 0 0 16px;
    font-size: 22px;
    font-weight: 400;
    color: #1a2338;
}

.prm-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 14px;
    flex-wrap: wrap;
}

.prm-actions {
    display: flex;
    gap: 10px;
}

.prm-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
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

.prm-action-btn:hover {
    background: #1742b0;
}

.prm-action-btn:disabled {
    background: #c3cbd8;
    cursor: not-allowed;
}

.prm-pagination {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: #34435c;
}

.prm-page-btn {
    background: none;
    border: none;
    color: var(--accent);
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    padding: 4px 6px;
}

.prm-page-btn:disabled {
    color: #c3cbd8;
    cursor: not-allowed;
}

.prm-table-wrap {
    overflow-x: auto;
    border: 1px solid #e5e9f0;
    border-radius: 8px;
}

.prm-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.prm-table th {
    background: #f8fafc;
    color: #4a5568;
    font-weight: 700;
    font-size: 11.5px;
    text-transform: uppercase;
    letter-spacing: .3px;
    padding: 10px 14px;
    border-bottom: 1px solid #e5e9f0;
    white-space: nowrap;
    text-align: left;
    cursor: pointer;
    user-select: none;
}

.prm-table th:hover {
    background: #eef1f5;
}

.prm-sort-arrow {
    display: inline-block;
    margin-left: 4px;
    font-size: 10px;
    color: var(--accent);
}

.prm-table td {
    padding: 10px 14px;
    border-bottom: 1px solid #eef1f7;
    color: #29323f;
    white-space: nowrap;
}

.prm-table tbody tr:hover {
    background: #fafbff;
}

.prm-due-badge {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 11.5px;
    font-weight: 700;
}

.prm-due-badge.past_due {
    background: #fee2e2;
    color: #b91c1c;
}

.prm-due-badge.due {
    background: #fef3c7;
    color: #92400e;
}

.prm-yes {
    color: #15803d;
    font-weight: 700;
}

.prm-no {
    color: #94a3b8;
}

.prm-not-sent {
    color: #94a3b8;
    font-style: italic;
}

.prm-empty-state {
    text-align: center;
    padding: 64px 20px !important;
    white-space: normal;
}

.prm-empty-state .prm-empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    border-radius: 16px;
    background: #f1f4fa;
    display: flex;
    align-items: center;
    justify-content: center;
}

.prm-empty-state .prm-empty-icon svg {
    width: 26px;
    height: 26px;
    color: #a2aec4;
}

.prm-empty-state strong {
    display: block;
    color: #34435c;
    font-size: 15px;
    margin-bottom: 6px;
}

.prm-empty-state p {
    margin: 0;
    color: #71809b;
    font-size: 14px;
}

.prm-loading-row td {
    text-align: center;
    padding: 40px !important;
    color: #71809b;
}

@media (max-width: 700px) {
    .prm-toolbar { flex-direction: column; align-items: stretch; }
}
</style>

<div class="prm-page">
    <h1>Patient Reminders</h1>

    <div class="prm-toolbar">
        <div class="prm-actions">
            <button type="button" class="prm-action-btn" id="prmProcessBtn">Process Reminders</button>
            <button type="button" class="prm-action-btn" id="prmProcessSendBtn">Process and Send Reminders</button>
        </div>
        <div class="prm-pagination">
            <button type="button" class="prm-page-btn" id="prmPrevBtn">&laquo;</button>
            <span id="prmPageText">0 of 0</span>
            <button type="button" class="prm-page-btn" id="prmNextBtn">&raquo;</button>
        </div>
    </div>

    <div class="prm-table-wrap">
        <table class="prm-table">
            <thead>
                <tr>
                    <th data-sort="item">Item</th>
                    <th data-sort="patient">Patient</th>
                    <th data-sort="due_status">Due Status</th>
                    <th data-sort="date_created">Date Created</th>
                    <th data-sort="email_auth">Email Auth</th>
                    <th data-sort="sms_auth">SMS Auth</th>
                    <th data-sort="date_sent">Date Sent</th>
                    <th data-sort="voice_sent">Voice Sent</th>
                    <th data-sort="email_sent">Email Sent</th>
                    <th data-sort="sms_sent">SMS Sent</th>
                    <th data-sort="mail_sent">Mail Sent</th>
                </tr>
            </thead>
            <tbody id="prmTableBody">
                <tr class="prm-loading-row"><td colspan="11">Loading...</td></tr>
            </tbody>
        </table>
    </div>
</div>
`;
}
