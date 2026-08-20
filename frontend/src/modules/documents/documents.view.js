export function DocumentsView()
{
    return `
<div class="form-page">
    <div class="form-card form-card--wide" style="max-width: 960px;">
        <div class="panel-header-row">
            <div>
                <h1>Documents</h1>
                <p class="form-subtitle">Files your care team has shared with you</p>
            </div>
        </div>

        <div class="table-wrap">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Date</th>
                        <th>Size</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody id="docsTableBody">
                    <tr><td colspan="5" class="table-empty">Loading...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>
`;
}
