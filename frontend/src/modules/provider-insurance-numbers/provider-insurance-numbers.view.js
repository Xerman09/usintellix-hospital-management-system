export function ProviderInsuranceNumbersView()
{
    return `
<style>
.pin-page {
    width: 100%;
    font-size: 13.5px;
}

.pin-page h1 {
    margin: 0 0 16px;
    font-size: 24px;
    font-weight: 400;
    color: #1a2338;
    padding-bottom: 12px;
    border-bottom: 1px solid #1a2338;
}

.pin-table-wrap {
    overflow-x: auto;
    border: 1px solid #e5e9f0;
    border-radius: 8px;
}

.pin-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13.5px;
}

.pin-table th {
    background: #f8fafc;
    color: #29323f;
    font-weight: 700;
    font-size: 13px;
    padding: 10px 16px;
    border-bottom: 1px solid #e5e9f0;
    text-align: left;
    white-space: nowrap;
}

.pin-table td {
    padding: 10px 16px;
    border-bottom: 1px solid #eef1f7;
    color: #29323f;
    white-space: nowrap;
}

.pin-table tbody tr:hover {
    background: #fafbff;
}

.pin-name-link {
    background: none;
    border: none;
    padding: 0;
    color: var(--accent);
    font-size: 13.5px;
    cursor: pointer;
    text-decoration: none;
}

.pin-name-link:hover {
    text-decoration: underline;
}

.pin-default {
    color: #94a3b8;
    font-style: italic;
}

.pin-loading, .pin-empty {
    text-align: center;
    padding: 50px;
    color: #71809b;
}
</style>

<div class="pin-page">
    <h1>Insurance Numbers</h1>

    <div id="pinFormAlert"></div>

    <div class="pin-table-wrap">
        <table class="pin-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Provider #</th>
                    <th>Rendering #</th>
                    <th>Group #</th>
                </tr>
            </thead>
            <tbody id="pinTableBody">
                <tr><td colspan="4" class="pin-loading">Loading...</td></tr>
            </tbody>
        </table>
    </div>
</div>

<div class="modal-overlay" id="pinModalOverlay">
    <div class="modal-box">
        <div class="modal-header">
            <h2 id="pinModalTitle">Edit Insurance Numbers</h2>
            <button type="button" class="modal-close" id="pinModalClose">&times;</button>
        </div>
        <p class="form-subtitle">These billing identifiers are used on claims submitted for this provider. Leave a field blank to use their default.</p>

        <div id="pinModalFormAlert"></div>

        <form id="pinForm">
            <input type="hidden" id="pin_provider_id">
            <div class="form-grid">
                <div class="form-group full">
                    <label>Provider #</label>
                    <input id="pin_provider_number" class="form-input" placeholder="Default">
                </div>

                <div class="form-group full">
                    <label>Rendering #</label>
                    <input id="pin_rendering_number" class="form-input" placeholder="Default">
                </div>

                <div class="form-group full">
                    <label>Group #</label>
                    <input id="pin_group_number" class="form-input" placeholder="Default">
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn-secondary" id="pinCancelBtn">Cancel</button>
                <button class="login-btn" type="submit">Save Changes</button>
            </div>
        </form>
    </div>
</div>
`;
}
