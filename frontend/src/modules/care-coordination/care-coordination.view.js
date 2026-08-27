export function CareCoordinationView() {
    return `
    <div class="report-wrapper fade-in" style="padding: 24px; max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px;">
        <!-- Top Tabs -->
        <div style="border-bottom: 1px solid #cbd5e1; margin-bottom: 8px;">
            <div style="display: flex; gap: 8px;">
                <button type="button" class="tab-btn active" style="padding: 8px 16px; border: 1px solid #cbd5e1; border-bottom: none; background: white; color: #3b82f6; cursor: pointer;">Export</button>
                <button type="button" class="tab-btn" style="padding: 8px 16px; border: 1px solid transparent; background: transparent; color: #64748b; cursor: pointer;">Import</button>
            </div>
        </div>

        <!-- Sub Tabs -->
        <div id="careCoordinationSubTabs" style="display: flex; gap: 16px; border-bottom: 1px solid #cbd5e1; padding-bottom: 0px; margin-bottom: 8px;">
            <a href="javascript:void(0)" data-target="ccda-qrda" class="sub-tab-link active" style="color: #3b82f6; text-decoration: none; font-weight: 500; border-bottom: 2px solid #3b82f6; padding-bottom: 7px;">CCDA or QRDA</a>
            <a href="javascript:void(0)" data-target="immunization" class="sub-tab-link" style="color: #64748b; text-decoration: none; padding-bottom: 7px;">Immunization</a>
            <a href="javascript:void(0)" data-target="syndromic" class="sub-tab-link" style="color: #64748b; text-decoration: none; padding-bottom: 7px;">Syndromic Surveillance</a>
        </div>

        <!-- CCDA or QRDA Content -->
        <div id="content-ccda-qrda" class="tab-content" style="display: block;">
            <!-- Action Bar -->
            <div style="display: flex; justify-content: space-between; align-items: center; background-color: #f1f5f9; padding: 12px 16px; border: 1px solid #e2e8f0; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <button type="button" class="btn-primary" style="background-color: #3b82f6; padding: 6px 16px;">SEARCH</button>
                    <button type="button" class="btn-primary" style="background-color: #3b82f6; padding: 6px 16px;">SEND TO</button>
                    <label style="display: flex; align-items: center; gap: 8px; font-weight: 500;">
                        Export Documents
                        <input type="checkbox" style="width: 16px; height: 16px;">
                    </label>
                </div>
                <div>
                    <button type="button" style="background: white; border: 1px solid #cbd5e1; border-radius: 4px; padding: 6px 8px; cursor: pointer;">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                    </button>
                </div>
                <div style="display: flex; align-items: center; gap: 12px; font-size: 13px; color: #475569;">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        Show <input type="number" value="500" class="form-input" style="width: 60px; padding: 4px;"> Encounters
                    </div>
                    <div style="display: flex; gap: 4px; align-items: center;">
                        <button style="border: 1px solid #cbd5e1; background: #f8fafc; padding: 2px 6px; color: #a3e635; cursor: pointer;">|<</button>
                        <button style="border: 1px solid #cbd5e1; background: #f8fafc; padding: 2px 6px; color: #a3e635; cursor: pointer;"><</button>
                        <button style="border: 1px solid #cbd5e1; background: #f8fafc; padding: 2px 6px; color: #a3e635; cursor: pointer;">></button>
                        <button style="border: 1px solid #cbd5e1; background: #f8fafc; padding: 2px 6px; color: #a3e635; cursor: pointer;">>|</button>
                    </div>
                    <div>Page 1 - of 1</div>
                </div>
            </div>

            <!-- Table -->
            <div class="table-wrap" style="background: white;">
                <table class="data-table" style="width: 100%;">
                    <thead style="background-color: #f1f5f9;">
                        <tr>
                            <th style="width: 40px; text-align: center;">▶</th>
                            <th style="width: 50px;">#</th>
                            <th style="width: 80px;">PID</th>
                            <th>Name</th>
                            <th>Encounter Count</th>
                            <th>Total Transfers</th>
                            <th>Successful Transfers</th>
                            <th>Last Visit</th>
                            <th>Creation Date</th>
                            <th style="width: 50px; text-align: center;"><input type="checkbox"></th>
                            <th style="width: 80px; text-align: center;">Views</th>
                        </tr>
                    </thead>
                    <tbody id="careCoordinationTableBody">
                        <!-- Populated by JS -->
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Immunization Content -->
        <div id="content-immunization" class="tab-content" style="display: none;">
            <div style="display: flex; align-items: center; background-color: #f1f5f9; padding: 12px 16px; border: 1px solid #e2e8f0; margin-bottom: 16px;">
                <button type="button" class="btn-primary" id="btn-search-immunization" style="background-color: #3b82f6; padding: 6px 16px;">SEARCH</button>
            </div>
            
            <div class="table-wrap" style="background: white;">
                <table class="data-table" style="width: 100%;">
                    <thead style="background-color: #f1f5f9;">
                        <tr>
                            <th style="width: 80px;">PID</th>
                            <th>Patient Name</th>
                            <th>CVX Code</th>
                            <th>Immunization Title</th>
                            <th>Date Given</th>
                        </tr>
                    </thead>
                    <tbody id="immunizationTableBody">
                        <tr><td colspan="5" style="text-align: center; color: #64748b; padding: 32px;">Nothing to display</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Syndromic Surveillance Content -->
        <div id="content-syndromic" class="tab-content" style="display: none;">
            <div style="display: flex; align-items: center; background-color: #f1f5f9; padding: 12px 16px; border: 1px solid #e2e8f0; margin-bottom: 16px;">
                <button type="button" class="btn-primary" id="btn-search-syndromic" style="background-color: #3b82f6; padding: 6px 16px;">SEARCH</button>
            </div>
            
            <div class="table-wrap" style="background: white;">
                <table class="data-table" style="width: 100%;">
                    <thead style="background-color: #f1f5f9;">
                        <tr>
                            <th style="width: 100px;">PID</th>
                            <th>Patient Name</th>
                            <th style="width: 100px;">Issue ID</th>
                            <th>Diagnosis Code</th>
                            <th>Issue Title</th>
                            <th>Issue Date</th>
                        </tr>
                    </thead>
                    <tbody id="syndromicTableBody">
                        <tr><td colspan="6" style="text-align: center; color: #64748b; padding: 32px;">Nothing to display</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    `;
}
