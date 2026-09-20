export function RoomManagementView(user) {
    const isAdmin = user && user.role === "admin";
    const isRecep = user && user.role === "receptionist";

    return `
    <div class="rm-wrapper" id="roomManagementWrapper">
        <style>
            .rm-wrapper {
                padding: 24px;
                color: var(--text-primary, #1e293b);
                background: var(--bg-page, #f8fafc);
                min-height: calc(100vh - 60px);
                box-sizing: border-box;
            }

            /* Header Section */
            .rm-header-strip {
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 16px;
                margin-bottom: 20px;
            }

            .rm-title-group h2 {
                margin: 0 0 4px 0;
                font-size: 22px;
                font-weight: 800;
                color: var(--text-primary);
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .rm-title-group p {
                margin: 0;
                font-size: 13px;
                color: var(--text-muted);
            }

            .rm-actions-group {
                display: flex;
                align-items: center;
                gap: 10px;
                flex-wrap: wrap;
            }

            .rm-btn {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 8px 14px;
                font-size: 12.5px;
                font-weight: 600;
                border-radius: 6px;
                border: 1px solid var(--border-color);
                background: var(--bg-surface);
                color: var(--text-primary);
                cursor: pointer;
                transition: all 0.15s ease;
                text-decoration: none;
            }

            .rm-btn:hover {
                background: var(--bg-surface-alt);
                border-color: var(--accent);
            }

            .rm-btn-primary {
                background: var(--accent, #1d4ed8);
                color: #ffffff;
                border-color: var(--accent, #1d4ed8);
            }

            .rm-btn-primary:hover {
                background: var(--accent-hover, #1742b0);
                color: #ffffff;
            }

            .rm-btn-success {
                background: #10b981;
                color: #ffffff;
                border-color: #10b981;
            }

            .rm-btn-success:hover {
                background: #059669;
                color: #ffffff;
            }

            .rm-btn-accent {
                background: #0ea5e9;
                color: #ffffff;
                border-color: #0ea5e9;
            }

            .rm-btn-accent:hover {
                background: #0284c7;
                color: #ffffff;
            }

            /* KPI Cards Strip */
            .rm-kpis-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                gap: 12px;
                margin-bottom: 22px;
            }

            .rm-kpi-card {
                background: var(--bg-surface);
                border: 1px solid var(--border-color);
                border-radius: 10px;
                padding: 14px 16px;
                position: relative;
                overflow: hidden;
                box-shadow: 0 1px 3px rgba(0,0,0,0.03);
                transition: transform 0.15s ease, box-shadow 0.15s ease;
            }

            .rm-kpi-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 10px rgba(0,0,0,0.06);
            }

            .rm-kpi-label {
                font-size: 11px;
                font-weight: 700;
                color: var(--text-muted);
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 6px;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .rm-kpi-val {
                font-size: 24px;
                font-weight: 800;
                color: var(--text-primary);
                line-height: 1.1;
                display: flex;
                align-items: baseline;
                gap: 4px;
            }

            .rm-kpi-sub {
                font-size: 11px;
                color: var(--text-muted);
                margin-top: 4px;
            }

            .rm-kpi-bar {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 3.5px;
            }

            .bar-blue   { background: #3b82f6; }
            .bar-green  { background: #10b981; }
            .bar-red    { background: #ef4444; }
            .bar-purple { background: #8b5cf6; }
            .bar-amber  { background: #f59e0b; }
            .bar-slate  { background: #64748b; }
            .bar-indigo { background: #6366f1; }

            /* Navigation Mode Switcher Tabs */
            .rm-tabs-bar {
                display: flex;
                align-items: center;
                gap: 4px;
                border-bottom: 1px solid var(--border-color);
                margin-bottom: 18px;
                overflow-x: auto;
            }

            .rm-tab-btn {
                padding: 10px 18px;
                font-size: 13px;
                font-weight: 600;
                color: var(--text-muted);
                border: none;
                background: none;
                cursor: pointer;
                border-bottom: 2px solid transparent;
                transition: all 0.15s ease;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                white-space: nowrap;
            }

            .rm-tab-btn:hover {
                color: var(--text-primary);
            }

            .rm-tab-btn.active {
                color: var(--accent);
                border-bottom-color: var(--accent);
                font-weight: 700;
            }

            .rm-tab-badge {
                font-size: 11px;
                background: var(--bg-surface-alt);
                border: 1px solid var(--border-color);
                color: var(--text-primary);
                padding: 1px 7px;
                border-radius: 12px;
            }

            /* Filter Bar */
            .rm-filter-bar {
                background: var(--bg-surface);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 12px 16px;
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 12px;
            }

            .rm-filter-group {
                display: flex;
                align-items: center;
                gap: 10px;
                flex-wrap: wrap;
                flex: 1;
            }

            .rm-filter-control {
                height: 36px;
                padding: 0 10px;
                font-size: 12.5px;
                border: 1px solid var(--border-color);
                border-radius: 6px;
                background: var(--bg-surface-alt);
                color: var(--text-primary);
                outline: none;
            }

            .rm-filter-control:focus {
                border-color: var(--accent);
            }

            .rm-search-box {
                min-width: 240px;
                flex: 1;
                max-width: 380px;
            }

            /* Visual Monitor: Buildings & Floors */
            .rm-bldg-section {
                margin-bottom: 28px;
            }

            .rm-bldg-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: var(--bg-surface-alt);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 10px 16px;
                margin-bottom: 14px;
            }

            .rm-bldg-title {
                font-size: 15px;
                font-weight: 700;
                color: var(--text-primary);
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .rm-bldg-desc {
                font-size: 12px;
                color: var(--text-muted);
                margin-top: 2px;
            }

            .rm-floor-section {
                margin-bottom: 20px;
                padding-left: 12px;
                border-left: 2px solid var(--accent);
            }

            .rm-floor-title {
                font-size: 13.5px;
                font-weight: 700;
                color: var(--text-primary);
                margin-bottom: 12px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            /* Rooms Grid */
            .rm-rooms-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                gap: 14px;
            }

            .rm-room-card {
                background: var(--bg-surface);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 14px;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                box-shadow: 0 1px 2px rgba(0,0,0,0.02);
                transition: transform 0.12s ease, border-color 0.12s ease;
            }

            .rm-room-card:hover {
                border-color: var(--accent);
                transform: translateY(-1px);
            }

            .rm-room-top {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 8px;
            }

            .rm-room-number-wrap {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .rm-room-number {
                font-size: 15px;
                font-weight: 800;
                color: var(--text-primary);
            }

            .rm-room-type-badge {
                font-size: 10.5px;
                font-weight: 600;
                padding: 2px 7px;
                border-radius: 4px;
                background: var(--bg-surface-alt);
                border: 1px solid var(--border-color);
                color: var(--text-muted);
            }

            .rm-room-rate-badge {
                font-size: 11px;
                font-weight: 700;
                color: #10b981;
                background: rgba(16, 185, 129, 0.1);
                border: 1px solid rgba(16, 185, 129, 0.25);
                padding: 2px 8px;
                border-radius: 4px;
                white-space: nowrap;
            }

            .rm-room-details {
                font-size: 12px;
                color: var(--text-muted);
                margin-bottom: 12px;
                line-height: 1.4;
            }

            .rm-room-amenities {
                font-size: 11px;
                color: var(--text-muted);
                font-style: italic;
                margin-bottom: 12px;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }

            /* Bed chips inside room */
            .rm-beds-container {
                display: flex;
                flex-direction: column;
                gap: 6px;
                border-top: 1px solid var(--border-color);
                padding-top: 10px;
                margin-top: auto;
            }

            .rm-bed-chip {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 11.5px;
                border: 1px solid transparent;
                cursor: pointer;
                transition: all 0.12s ease;
            }

            .rm-bed-chip:hover {
                filter: brightness(0.95);
            }

            .rm-bed-chip-avail {
                background: rgba(16, 185, 129, 0.1);
                border-color: rgba(16, 185, 129, 0.3);
                color: #059669;
            }
            :root[data-theme="dark"] .rm-bed-chip-avail {
                background: rgba(16, 185, 129, 0.15);
                color: #34d399;
            }

            .rm-bed-chip-occ {
                background: rgba(59, 130, 246, 0.1);
                border-color: rgba(59, 130, 246, 0.3);
                color: #1d4ed8;
            }
            :root[data-theme="dark"] .rm-bed-chip-occ {
                background: rgba(59, 130, 246, 0.15);
                color: #93c5fd;
            }

            .rm-bed-chip-res {
                background: rgba(139, 92, 246, 0.1);
                border-color: rgba(139, 92, 246, 0.3);
                color: #6d28d9;
            }
            :root[data-theme="dark"] .rm-bed-chip-res {
                background: rgba(139, 92, 246, 0.15);
                color: #c4b5fd;
            }

            .rm-bed-chip-dirty {
                background: rgba(245, 158, 11, 0.1);
                border-color: rgba(245, 158, 11, 0.3);
                color: #b45309;
            }
            :root[data-theme="dark"] .rm-bed-chip-dirty {
                background: rgba(245, 158, 11, 0.15);
                color: #fcd34d;
            }

            .rm-bed-chip-maint {
                background: rgba(239, 68, 68, 0.1);
                border-color: rgba(239, 68, 68, 0.3);
                color: #b91c1c;
            }
            :root[data-theme="dark"] .rm-bed-chip-maint {
                background: rgba(239, 68, 68, 0.15);
                color: #fca5a5;
            }

            /* Status Badges */
            .rm-badge {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                font-size: 11px;
                font-weight: 700;
                padding: 2px 8px;
                border-radius: 12px;
                text-transform: capitalize;
            }

            .rm-badge-green  { background: #dcfce7; color: #166534; }
            .rm-badge-yellow { background: #fef9c3; color: #854d0e; }
            .rm-badge-red    { background: #fee2e2; color: #991b1b; }
            .rm-badge-amber  { background: #ffedd5; color: #9a3412; }
            .rm-badge-gray   { background: #f1f5f9; color: #475569; }

            :root[data-theme="dark"] .rm-badge-green  { background: rgba(16, 185, 129, 0.2); color: #6ee7b7; }
            :root[data-theme="dark"] .rm-badge-yellow { background: rgba(234, 179, 8, 0.2); color: #fde047; }
            :root[data-theme="dark"] .rm-badge-red    { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }
            :root[data-theme="dark"] .rm-badge-amber  { background: rgba(249, 115, 22, 0.2); color: #fdba74; }
            :root[data-theme="dark"] .rm-badge-gray   { background: rgba(100, 116, 139, 0.2); color: #cbd5e1; }

            /* Data Tables */
            .rm-table-card {
                background: var(--bg-surface);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                overflow: hidden;
            }

            .rm-table-card table {
                width: 100%;
                border-collapse: collapse;
                font-size: 13px;
            }

            .rm-table-card th {
                background: var(--bg-surface-alt);
                color: var(--text-muted);
                font-weight: 600;
                text-align: left;
                padding: 10px 14px;
                border-bottom: 1px solid var(--border-color);
                font-size: 11.5px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .rm-table-card td {
                padding: 11px 14px;
                border-bottom: 1px solid var(--border-color);
                color: var(--text-primary);
                vertical-align: middle;
            }

            .rm-table-card tr:last-child td {
                border-bottom: none;
            }

            .rm-table-card tr:hover td {
                background: var(--bg-surface-alt);
            }

            /* Modal Framework */
            .rm-modal-backdrop {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(15, 23, 42, 0.65);
                backdrop-filter: blur(2px);
                z-index: 10000;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }

            .rm-modal-backdrop.open {
                display: flex;
            }

            .rm-modal-content {
                background: var(--bg-surface);
                border: 1px solid var(--border-color);
                border-radius: 10px;
                width: 100%;
                max-width: 600px;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
            }

            .rm-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                border-bottom: 1px solid var(--border-color);
            }

            .rm-modal-header h3 {
                margin: 0;
                font-size: 16px;
                font-weight: 700;
                color: var(--text-primary);
            }

            .rm-modal-close {
                background: none;
                border: none;
                font-size: 22px;
                line-height: 1;
                color: var(--text-muted);
                cursor: pointer;
            }

            .rm-modal-close:hover {
                color: var(--text-primary);
            }

            .rm-modal-body {
                padding: 20px;
            }

            .rm-modal-footer {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                padding: 14px 20px;
                border-top: 1px solid var(--border-color);
                background: var(--bg-surface-alt);
            }

            .rm-form-group {
                margin-bottom: 14px;
            }

            .rm-form-group label {
                display: block;
                font-size: 12px;
                font-weight: 600;
                color: var(--text-primary);
                margin-bottom: 5px;
            }

            .rm-form-grid-2 {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
            }

            .rm-form-input {
                width: 100%;
                box-sizing: border-box;
                height: 36px;
                padding: 0 10px;
                font-size: 13px;
                border: 1px solid var(--border-color);
                border-radius: 6px;
                background: var(--bg-surface-alt);
                color: var(--text-primary);
                outline: none;
            }

            .rm-form-input:focus {
                border-color: var(--accent);
                background: var(--bg-surface);
            }

            textarea.rm-form-input {
                height: auto;
                padding: 8px 10px;
                resize: vertical;
            }
        </style>

        <!-- Top Header Strip -->
        <div class="rm-header-strip">
            <div class="rm-title-group">
                <h2>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><path d="M3 21h18M3 7v14M21 7v14M6 7V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v4M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"></path><circle cx="9" cy="9" r="1"></circle><circle cx="15" cy="9" r="1"></circle></svg>
                    Hospital Room & Bed Management
                </h2>
                <p>Campus buildings, room hierarchy, and real-time hospital bed availability monitor</p>
            </div>
            <div class="rm-actions-group">
                <button type="button" class="rm-btn" id="rmBtnRefresh">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path></svg>
                    Refresh
                </button>
                <button type="button" class="rm-btn rm-btn-accent" id="rmBtnQuickFinder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
                    Quick Bed Finder
                </button>
                ${isAdmin ? `
                    <button type="button" class="rm-btn rm-btn-primary" id="rmBtnAddRoom">
                        + New Room
                    </button>
                    <button type="button" class="rm-btn rm-btn-secondary" id="rmBtnAddBuilding">
                        + New Building
                    </button>
                    <button type="button" class="rm-btn rm-btn-secondary" id="rmBtnAddBed">
                        + New Bed
                    </button>
                ` : ""}
            </div>
        </div>

        <!-- KPI Statistic Strip -->
        <div class="rm-kpis-grid" id="rmKpiGrid">
            <div class="rm-kpi-card">
                <div class="rm-kpi-label">Total Beds</div>
                <div class="rm-kpi-val" id="kpiTotalBeds">--</div>
                <div class="rm-kpi-sub"><span id="kpiTotalRooms">--</span> registered rooms</div>
                <div class="rm-kpi-bar bar-blue"></div>
            </div>
            <div class="rm-kpi-card">
                <div class="rm-kpi-label">Available Beds</div>
                <div class="rm-kpi-val" style="color: #10b981;" id="kpiAvailableBeds">--</div>
                <div class="rm-kpi-sub" id="kpiAvailablePercent">--% available now</div>
                <div class="rm-kpi-bar bar-green"></div>
            </div>
            <div class="rm-kpi-card">
                <div class="rm-kpi-label">Occupied Beds</div>
                <div class="rm-kpi-val" style="color: #3b82f6;" id="kpiOccupiedBeds">--</div>
                <div class="rm-kpi-sub" id="kpiOccupancyRate">--% occupancy rate</div>
                <div class="rm-kpi-bar bar-indigo"></div>
            </div>
            <div class="rm-kpi-card">
                <div class="rm-kpi-label">Reserved Beds</div>
                <div class="rm-kpi-val" style="color: #8b5cf6;" id="kpiReservedBeds">--</div>
                <div class="rm-kpi-sub">Upcoming admissions</div>
                <div class="rm-kpi-bar bar-purple"></div>
            </div>
            <div class="rm-kpi-card">
                <div class="rm-kpi-label">Turnover / Cleaning</div>
                <div class="rm-kpi-val" style="color: #f59e0b;" id="kpiDirtyBeds">--</div>
                <div class="rm-kpi-sub">Housekeeping pending</div>
                <div class="rm-kpi-bar bar-amber"></div>
            </div>
            <div class="rm-kpi-card">
                <div class="rm-kpi-label">Under Maintenance</div>
                <div class="rm-kpi-val" style="color: #ef4444;" id="kpiMaintenanceBeds">--</div>
                <div class="rm-kpi-sub">Blocked / repair</div>
                <div class="rm-kpi-bar bar-red"></div>
            </div>
        </div>

        <!-- Navigation Tabs Bar -->
        <div class="rm-tabs-bar" id="rmTabsBar">
            <button type="button" class="rm-tab-btn active" data-rm-tab="monitor">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                Availability & Floor Map
            </button>
            <button type="button" class="rm-tab-btn" data-rm-tab="beds">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"></path></svg>
                Beds Directory
                <span class="rm-tab-badge" id="tabBadgeBeds">--</span>
            </button>
            <button type="button" class="rm-tab-btn" data-rm-tab="rooms">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M3 21h18M3 7v14M21 7v14M6 7V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v4"></path></svg>
                Rooms Directory
                <span class="rm-tab-badge" id="tabBadgeRooms">--</span>
            </button>
            <button type="button" class="rm-tab-btn" data-rm-tab="buildings">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"></path><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"></path><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"></path><path d="M10 6h4M10 10h4M10 14h4M10 18h4"></path></svg>
                Buildings
                <span class="rm-tab-badge" id="tabBadgeBuildings">--</span>
            </button>
        </div>

        <!-- Filter Bar -->
        <div class="rm-filter-bar" id="rmFilterBar">
            <div class="rm-filter-group">
                <select class="rm-filter-control" id="rmFilterBuilding">
                    <option value="">All Buildings</option>
                </select>
                <select class="rm-filter-control" id="rmFilterRoomType">
                    <option value="">All Room Types</option>
                    <option value="General Ward">General Ward</option>
                    <option value="Semi-Private">Semi-Private</option>
                    <option value="Private">Private</option>
                    <option value="Deluxe Suite">Deluxe Suite</option>
                    <option value="ICU">ICU</option>
                    <option value="Isolation">Isolation</option>
                    <option value="Emergency Bay">Emergency Bay</option>
                </select>
                <select class="rm-filter-control" id="rmFilterStatus">
                    <option value="">All Statuses</option>
                    <option value="Available">Available (Vacant)</option>
                    <option value="Partially Occupied">Partially Occupied</option>
                    <option value="Occupied">Occupied (Full)</option>
                    <option value="Dirty / Turnover">Dirty / Turnover</option>
                    <option value="Maintenance">Maintenance</option>
                </select>
                <input type="text" class="rm-filter-control rm-search-box" id="rmSearchInput" placeholder="Search room #, bed #, or patient..." />
            </div>
        </div>

        <!-- CONTENT TAB 1: Availability & Floor Map -->
        <div class="rm-tab-content" id="rmTabContentMonitor">
            <div id="rmMonitorContainer">
                <p style="text-align: center; padding: 40px; color: var(--text-muted);">Loading hospital availability map...</p>
            </div>
        </div>

        <!-- CONTENT TAB 2: Beds Directory -->
        <div class="rm-tab-content" id="rmTabContentBeds" style="display: none;">
            <div class="rm-table-card">
                <table>
                    <thead>
                        <tr>
                            <th>Bed Number</th>
                            <th>Building & Room</th>
                            <th>Floor</th>
                            <th>Bed Type</th>
                            <th>Daily Rate</th>
                            <th>Status</th>
                            <th>Current Occupant</th>
                            <th style="text-align: right;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="rmBedsTableBody">
                        <tr><td colspan="8" style="text-align: center; padding: 30px; color: var(--text-muted);">Loading beds...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- CONTENT TAB 3: Rooms Directory -->
        <div class="rm-tab-content" id="rmTabContentRooms" style="display: none;">
            <div class="rm-table-card">
                <table>
                    <thead>
                        <tr>
                            <th>Room #</th>
                            <th>Building & Floor</th>
                            <th>Classification</th>
                            <th>Daily Rate</th>
                            <th>Capacity / Beds</th>
                            <th>Status</th>
                            <th>Amenities</th>
                            <th style="text-align: right;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="rmRoomsTableBody">
                        <tr><td colspan="8" style="text-align: center; padding: 30px; color: var(--text-muted);">Loading rooms...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- CONTENT TAB 4: Buildings Directory -->
        <div class="rm-tab-content" id="rmTabContentBuildings" style="display: none;">
            <div class="rm-table-card">
                <table>
                    <thead>
                        <tr>
                            <th>Building Code</th>
                            <th>Building Name</th>
                            <th>Floors</th>
                            <th>Rooms</th>
                            <th>Beds</th>
                            <th>Status</th>
                            <th>Location / Description</th>
                            <th style="text-align: right;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="rmBuildingsTableBody">
                        <tr><td colspan="8" style="text-align: center; padding: 30px; color: var(--text-muted);">Loading buildings...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- ============================================================== -->
        <!-- MODAL: QUICK BED FINDER (RECEPTIONIST)                         -->
        <!-- ============================================================== -->
        <div class="rm-modal-backdrop" id="rmModalQuickFinder">
            <div class="rm-modal-content" style="max-width: 680px;">
                <div class="rm-modal-header">
                    <h3>🔍 Quick Bed Finder (Front Desk / Reception)</h3>
                    <button type="button" class="rm-modal-close" data-close-rm-modal>&times;</button>
                </div>
                <div class="rm-modal-body">
                    <p style="margin: 0 0 14px 0; font-size: 13px; color: var(--text-muted);">
                        Find an immediately available room and bed for patient admission or front-desk quotation.
                    </p>
                    <div class="rm-form-grid-2" style="margin-bottom: 14px;">
                        <div class="rm-form-group" style="margin-bottom: 0;">
                            <label>Room Classification</label>
                            <select class="rm-form-input" id="qfRoomType">
                                <option value="">-- Any Room Type --</option>
                                <option value="Private">Private Single</option>
                                <option value="Semi-Private">Semi-Private (2-Bed)</option>
                                <option value="General Ward">General Ward</option>
                                <option value="Deluxe Suite">Deluxe Suite</option>
                                <option value="ICU">ICU</option>
                                <option value="Isolation">Isolation</option>
                            </select>
                        </div>
                        <div class="rm-form-group" style="margin-bottom: 0;">
                            <label>Target Building</label>
                            <select class="rm-form-input" id="qfBuilding">
                                <option value="">-- Any Building --</option>
                            </select>
                        </div>
                    </div>
                    <div id="qfResultsList" style="max-height: 320px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px; padding: 6px;">
                        <p style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 12.5px;">Click Search to find available beds.</p>
                    </div>
                </div>
                <div class="rm-modal-footer">
                    <button type="button" class="rm-btn" data-close-rm-modal>Close</button>
                    <button type="button" class="rm-btn rm-btn-accent" id="qfExecuteSearch">Search Available Beds</button>
                </div>
            </div>
        </div>

        <!-- ============================================================== -->
        <!-- MODAL: REGISTER / EDIT BUILDING                                -->
        <!-- ============================================================== -->
        <div class="rm-modal-backdrop" id="rmModalBuilding">
            <div class="rm-modal-content">
                <div class="rm-modal-header">
                    <h3 id="rmModalBuildingTitle">Register Hospital Building</h3>
                    <button type="button" class="rm-modal-close" data-close-rm-modal>&times;</button>
                </div>
                <form id="rmFormBuilding">
                    <input type="hidden" id="bldgFormId" />
                    <div class="rm-modal-body">
                        <div class="rm-form-grid-2">
                            <div class="rm-form-group">
                                <label>Building Code <span style="color: red;">*</span></label>
                                <input type="text" class="rm-form-input" id="bldgFormCode" placeholder="e.g. TWR-B, WEST" required />
                            </div>
                            <div class="rm-form-group">
                                <label>Total Floors <span style="color: red;">*</span></label>
                                <input type="number" class="rm-form-input" id="bldgFormFloors" min="1" max="50" value="4" required />
                            </div>
                        </div>
                        <div class="rm-form-group">
                            <label>Building Display Name <span style="color: red;">*</span></label>
                            <input type="text" class="rm-form-input" id="bldgFormName" placeholder="e.g. Surgical Pavillion" required />
                        </div>
                        <div class="rm-form-group">
                            <label>Campus Location / Description</label>
                            <textarea class="rm-form-input" id="bldgFormDesc" rows="3" placeholder="Notes on location, units housed, or access points"></textarea>
                        </div>
                    </div>
                    <div class="rm-modal-footer">
                        <button type="button" class="rm-btn" data-close-rm-modal>Cancel</button>
                        <button type="submit" class="rm-btn rm-btn-primary">Save Building</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- ============================================================== -->
        <!-- MODAL: REGISTER / EDIT ROOM                                    -->
        <!-- ============================================================== -->
        <div class="rm-modal-backdrop" id="rmModalRoom">
            <div class="rm-modal-content" style="max-width: 620px;">
                <div class="rm-modal-header">
                    <h3 id="rmModalRoomTitle">Register Hospital Room</h3>
                    <button type="button" class="rm-modal-close" data-close-rm-modal>&times;</button>
                </div>
                <form id="rmFormRoom">
                    <input type="hidden" id="roomFormId" />
                    <div class="rm-modal-body">
                        <div class="rm-form-grid-2">
                            <div class="rm-form-group">
                                <label>Building <span style="color: red;">*</span></label>
                                <select class="rm-form-input" id="roomFormBuilding" required></select>
                            </div>
                            <div class="rm-form-group">
                                <label>Floor Number <span style="color: red;">*</span></label>
                                <input type="text" class="rm-form-input" id="roomFormFloor" placeholder="e.g. 2nd Floor, Ground Floor" required />
                            </div>
                        </div>
                        <div class="rm-form-grid-2">
                            <div class="rm-form-group">
                                <label>Room Number / Code <span style="color: red;">*</span></label>
                                <input type="text" class="rm-form-input" id="roomFormNumber" placeholder="e.g. Room 205, ICU-02" required />
                            </div>
                            <div class="rm-form-group">
                                <label>Room Display Name</label>
                                <input type="text" class="rm-form-input" id="roomFormName" placeholder="e.g. Semi-Private 205" />
                            </div>
                        </div>
                        <div class="rm-form-grid-2">
                            <div class="rm-form-group">
                                <label>Room Classification <span style="color: red;">*</span></label>
                                <select class="rm-form-input" id="roomFormType" required>
                                    <option value="General Ward">General Ward</option>
                                    <option value="Semi-Private">Semi-Private (2-Bed)</option>
                                    <option value="Private">Private Single</option>
                                    <option value="Deluxe Suite">Deluxe Suite</option>
                                    <option value="ICU">Intensive Care Unit (ICU)</option>
                                    <option value="Isolation">Isolation / Negative Pressure</option>
                                    <option value="Emergency Bay">Emergency Bay</option>
                                </select>
                            </div>
                            <div class="rm-form-group">
                                <label>Daily Room Rate ($) <span style="color: red;">*</span></label>
                                <input type="number" class="rm-form-input" id="roomFormRate" step="0.01" min="0" placeholder="0.00" required />
                            </div>
                        </div>
                        <div class="rm-form-grid-2">
                            <div class="rm-form-group">
                                <label>Max Bed Capacity <span style="color: red;">*</span></label>
                                <input type="number" class="rm-form-input" id="roomFormMaxBeds" min="1" max="20" value="1" required />
                            </div>
                            <div class="rm-form-group">
                                <label>Gender Restriction</label>
                                <select class="rm-form-input" id="roomFormGender">
                                    <option value="All">All / Co-ed</option>
                                    <option value="Male Only">Male Only</option>
                                    <option value="Female Only">Female Only</option>
                                    <option value="Pediatric">Pediatric</option>
                                </select>
                            </div>
                        </div>
                        <div class="rm-form-group">
                            <label>Room Amenities & Features</label>
                            <input type="text" class="rm-form-input" id="roomFormAmenities" placeholder="e.g. Central O2, En-Suite Bath, Cable TV, Recliner, WiFi" />
                        </div>
                        <div class="rm-form-group" id="wrapAutoBeds">
                            <label style="display: flex; align-items: center; gap: 8px; font-weight: normal; cursor: pointer;">
                                <input type="checkbox" id="roomFormAutoBeds" checked style="accent-color: var(--accent);" />
                                <span>Automatically generate bed records for this room based on capacity</span>
                            </label>
                        </div>
                    </div>
                    <div class="rm-modal-footer">
                        <button type="button" class="rm-btn" data-close-rm-modal>Cancel</button>
                        <button type="submit" class="rm-btn rm-btn-primary">Save Room</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- ============================================================== -->
        <!-- MODAL: REGISTER / EDIT BED                                     -->
        <!-- ============================================================== -->
        <div class="rm-modal-backdrop" id="rmModalBed">
            <div class="rm-modal-content">
                <div class="rm-modal-header">
                    <h3 id="rmModalBedTitle">Register Hospital Bed</h3>
                    <button type="button" class="rm-modal-close" data-close-rm-modal>&times;</button>
                </div>
                <form id="rmFormBed">
                    <input type="hidden" id="bedFormId" />
                    <div class="rm-modal-body">
                        <div class="rm-form-group">
                            <label>Assigned Room <span style="color: red;">*</span></label>
                            <select class="rm-form-input" id="bedFormRoom" required></select>
                        </div>
                        <div class="rm-form-grid-2">
                            <div class="rm-form-group">
                                <label>Bed Number / Identifier <span style="color: red;">*</span></label>
                                <input type="text" class="rm-form-input" id="bedFormNumber" placeholder="e.g. MED-205-A" required />
                            </div>
                            <div class="rm-form-group">
                                <label>Bed Classification Type <span style="color: red;">*</span></label>
                                <select class="rm-form-input" id="bedFormType" required>
                                    <option value="Standard Acute Bed">Standard Acute Bed</option>
                                    <option value="ICU Monitor Bed">ICU Monitor Bed</option>
                                    <option value="Negative Pressure Isolation">Negative Pressure Isolation</option>
                                    <option value="Stepdown Bed">Stepdown Bed</option>
                                    <option value="Pediatric Crib">Pediatric Crib</option>
                                    <option value="Labor & Delivery Bed">Labor & Delivery Bed</option>
                                </select>
                            </div>
                        </div>
                        <div class="rm-form-grid-2">
                            <div class="rm-form-group">
                                <label>Operational Status</label>
                                <select class="rm-form-input" id="bedFormStatus">
                                    <option value="Available">Available</option>
                                    <option value="Reserved">Reserved</option>
                                    <option value="Dirty / Turnover">Dirty / Turnover</option>
                                    <option value="Maintenance">Maintenance</option>
                                    <option value="Blocked">Blocked</option>
                                </select>
                            </div>
                            <div class="rm-form-group">
                                <label>Custom Daily Surcharge ($)</label>
                                <input type="number" class="rm-form-input" id="bedFormRate" step="0.01" min="0" placeholder="Optional" />
                            </div>
                        </div>
                        <div class="rm-form-group">
                            <label>Special Features / Equipment</label>
                            <input type="text" class="rm-form-input" id="bedFormFeatures" placeholder="e.g. Ventilator, Central Telemetry, Bariatric" />
                        </div>
                    </div>
                    <div class="rm-modal-footer">
                        <button type="button" class="rm-btn" data-close-rm-modal>Cancel</button>
                        <button type="submit" class="rm-btn rm-btn-primary">Save Bed</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- ============================================================== -->
        <!-- MODAL: BED QUICK ACTION (STATUS UPDATE / TURNOVER)              -->
        <!-- ============================================================== -->
        <div class="rm-modal-backdrop" id="rmModalBedAction">
            <div class="rm-modal-content" style="max-width: 480px;">
                <div class="rm-modal-header">
                    <h3 id="rmBedActionTitle">Bed Status & Operational Action</h3>
                    <button type="button" class="rm-modal-close" data-close-rm-modal>&times;</button>
                </div>
                <div class="rm-modal-body">
                    <input type="hidden" id="actionBedId" />
                    <div id="actionBedDetails" style="background: var(--bg-surface-alt); border: 1px solid var(--border-color); border-radius: 6px; padding: 12px; margin-bottom: 14px; font-size: 13px;"></div>
                    <div class="rm-form-group">
                        <label>Update Operational Status</label>
                        <select class="rm-form-input" id="actionBedStatusSelect">
                            <option value="Available">🟢 Available (Clean & Vacant)</option>
                            <option value="Reserved">🟣 Reserved (Held for Patient)</option>
                            <option value="Dirty / Turnover">🟠 Dirty / Turnover (Housekeeping Needed)</option>
                            <option value="Maintenance">🔴 Maintenance / Out of Service</option>
                            <option value="Blocked">⚪ Blocked</option>
                        </select>
                    </div>
                </div>
                <div class="rm-modal-footer">
                    <button type="button" class="rm-btn" data-close-rm-modal>Cancel</button>
                    <button type="button" class="rm-btn rm-btn-primary" id="btnSaveBedAction">Update Status</button>
                </div>
            </div>
        </div>

    </div>
    `;
}
