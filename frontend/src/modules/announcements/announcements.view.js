export function AnnouncementsView(user) {
    return `
<style>
.ann-page {
    padding: 24px 32px;
    max-width: 1400px;
    margin: 0 auto;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    color: var(--text-primary, #0f172a);
}

.ann-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 24px;
    gap: 16px;
}

.ann-title-wrap h1 {
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.02em;
    margin: 0 0 6px 0;
    color: var(--text-primary, #0f172a);
}

.ann-subtitle {
    margin: 0;
    color: var(--text-muted, #64748b);
    font-size: 14px;
}

.ann-btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0 18px;
    background: #2563eb;
    color: #ffffff;
    font-size: 14px;
    font-weight: 600;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(37, 99, 235, 0.2);
    transition: all 0.15s ease;
}

.ann-btn-primary:hover {
    background: #1d4ed8;
}

.ann-btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 38px;
    padding: 0 16px;
    background: var(--bg-surface, #ffffff);
    color: var(--text-primary, #0f172a);
    font-size: 14px;
    font-weight: 500;
    border-radius: 6px;
    border: 1px solid var(--border-color, #e2e8f0);
    cursor: pointer;
    transition: all 0.15s ease;
}

.ann-btn-secondary:hover {
    background: var(--bg-surface-alt, #f8fafc);
}

/* Stats row */
.ann-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
}

.ann-stat-card {
    background: var(--bg-surface, #ffffff);
    border: 1px solid var(--border-color, #e2e8f0);
    border-radius: 8px;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
}

.ann-stat-label {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted, #64748b);
}

.ann-stat-value {
    font-size: 26px;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
}

/* Filter bar */
.ann-filter-bar {
    background: var(--bg-surface, #ffffff);
    border: 1px solid var(--border-color, #e2e8f0);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 20px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
}

.ann-search-box {
    flex: 1;
    min-width: 240px;
    position: relative;
}

.ann-search-box svg {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: var(--text-muted, #94a3b8);
}

.ann-search-input {
    width: 100%;
    height: 38px;
    padding: 0 12px 0 36px;
    border: 1px solid var(--border-color, #cbd5e1);
    border-radius: 6px;
    background: var(--bg-surface, #ffffff);
    color: var(--text-primary, #0f172a);
    font-size: 14px;
    box-sizing: border-box;
}

.ann-search-input:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37,99,235,0.15);
}

.ann-select {
    height: 38px;
    padding: 0 32px 0 12px;
    border: 1px solid var(--border-color, #cbd5e1);
    border-radius: 6px;
    background: var(--bg-surface, #ffffff);
    color: var(--text-primary, #0f172a);
    font-size: 14px;
    cursor: pointer;
}

/* Announcements Grid / List */
.ann-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 20px;
}

.ann-card {
    background: var(--bg-surface, #ffffff);
    border: 1px solid var(--border-color, #e2e8f0);
    border-radius: 10px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 2px 4px rgba(0,0,0,0.03);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.ann-card:hover {
    box-shadow: 0 6px 16px rgba(0,0,0,0.06);
    transform: translateY(-2px);
}

.ann-card-media {
    position: relative;
    width: 100%;
    height: 180px;
    background: var(--bg-surface-alt, #f1f5f9);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}

.ann-card-media img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.2s ease;
}

.ann-card:hover .ann-card-media img {
    transform: scale(1.03);
}

.ann-card-no-img {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: var(--text-muted, #94a3b8);
}

.ann-card-no-img svg {
    width: 38px;
    height: 38px;
    stroke-width: 1.5;
}

.ann-card-badges {
    position: absolute;
    top: 12px;
    left: 12px;
    right: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    pointer-events: none;
}

.ann-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding: 3px 8px;
    border-radius: 20px;
    backdrop-filter: blur(8px);
}

.ann-badge-active { background: rgba(16, 185, 129, 0.9); color: #ffffff; }
.ann-badge-scheduled { background: rgba(59, 130, 246, 0.9); color: #ffffff; }
.ann-badge-expired { background: rgba(100, 116, 139, 0.9); color: #ffffff; }
.ann-badge-inactive { background: rgba(239, 68, 68, 0.9); color: #ffffff; }

.ann-priority-badge {
    padding: 3px 8px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
}
.ann-priority-normal { background: rgba(241, 245, 249, 0.9); color: #475569; }
.ann-priority-important { background: rgba(254, 240, 138, 0.95); color: #854d0e; }
.ann-priority-urgent { background: rgba(254, 226, 226, 0.95); color: #991b1b; }

.ann-card-body {
    padding: 16px;
    display: flex;
    flex-direction: column;
    flex: 1;
}

.ann-card-title {
    font-size: 16px;
    font-weight: 600;
    line-height: 1.35;
    margin: 0 0 8px 0;
    color: var(--text-primary, #0f172a);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.ann-card-content {
    font-size: 13px;
    color: var(--text-muted, #64748b);
    line-height: 1.5;
    margin: 0 0 14px 0;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    flex: 1;
}

.ann-card-meta {
    border-top: 1px solid var(--border-color, #f1f5f9);
    padding-top: 12px;
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 12px;
    color: var(--text-muted, #64748b);
}

.ann-meta-row {
    display: flex;
    align-items: center;
    gap: 6px;
}

.ann-meta-row svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
}

.ann-roles-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.ann-role-chip {
    font-size: 11px;
    font-weight: 500;
    padding: 2px 7px;
    border-radius: 4px;
    background: var(--bg-surface-alt, #f1f5f9);
    color: var(--text-primary, #334155);
    text-transform: capitalize;
}

.ann-card-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 16px;
    background: var(--bg-surface-alt, #f8fafc);
    border-top: 1px solid var(--border-color, #e2e8f0);
}

.ann-action-btn {
    padding: 5px 10px;
    font-size: 12px;
    font-weight: 500;
    border-radius: 5px;
    border: 1px solid var(--border-color, #cbd5e1);
    background: var(--bg-surface, #ffffff);
    color: var(--text-primary, #334155);
    cursor: pointer;
    transition: all 0.15s ease;
}

.ann-action-btn:hover {
    background: #e2e8f0;
}

.ann-action-btn.delete {
    color: #dc2626;
    border-color: #fecaca;
}
.ann-action-btn.delete:hover {
    background: #fee2e2;
}

/* Empty State */
.ann-empty-wrap {
    grid-column: 1 / -1;
    text-align: center;
    padding: 60px 20px;
    background: var(--bg-surface, #ffffff);
    border: 1px dashed var(--border-color, #cbd5e1);
    border-radius: 10px;
}

.ann-empty-wrap svg {
    width: 48px;
    height: 48px;
    color: var(--text-muted, #94a3b8);
    margin-bottom: 12px;
}

.ann-empty-title {
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 6px 0;
}

.ann-empty-desc {
    color: var(--text-muted, #64748b);
    font-size: 14px;
    margin: 0 0 16px 0;
}

/* Modal styling */
.ann-modal-overlay {
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

.ann-modal-overlay.open {
    display: flex;
}

.ann-modal-box {
    background: var(--bg-surface, #ffffff);
    border: 1px solid var(--border-color, #e2e8f0);
    border-radius: 12px;
    width: 100%;
    max-width: 700px;
    max-height: min(92vh, 850px);
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
    overflow: hidden;
    margin: auto;
}

#annViewModalOverlay .ann-modal-box {
    max-height: min(90vh, 850px);
}

#annViewModalOverlay .ann-modal-body {
    padding: 0;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
}

#announcementForm {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
}

.ann-modal-header {
    padding: 18px 24px;
    border-bottom: 1px solid var(--border-color, #e2e8f0);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
}

.ann-modal-header h2 {
    font-size: 18px;
    font-weight: 700;
    margin: 0;
}

.ann-modal-close {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: var(--text-muted, #94a3b8);
    line-height: 1;
    padding: 0 4px;
}

.ann-modal-close:hover {
    color: var(--text-primary, #0f172a);
}

.ann-modal-body {
    padding: 20px 24px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.ann-form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.ann-form-group label {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary, #334155);
}

.ann-form-group input[type="text"],
.ann-form-group input[type="datetime-local"],
.ann-form-group select,
.ann-form-group textarea {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--border-color, #cbd5e1);
    border-radius: 6px;
    background: var(--bg-surface, #ffffff);
    color: var(--text-primary, #0f172a);
    font-size: 14px;
    box-sizing: border-box;
    font-family: inherit;
}

.ann-form-group textarea {
    resize: vertical;
    min-height: 100px;
}

.ann-form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}

/* Image upload dropzone */
.ann-dropzone {
    border: 2px dashed var(--border-color, #cbd5e1);
    border-radius: 8px;
    padding: 20px;
    text-align: center;
    background: var(--bg-surface-alt, #f8fafc);
    cursor: pointer;
    transition: all 0.2s ease;
}

.ann-dropzone:hover {
    border-color: #2563eb;
    background: #f0f7ff;
}

.ann-dropzone-inner svg {
    width: 32px;
    height: 32px;
    color: #2563eb;
    margin-bottom: 8px;
}

.ann-img-preview-wrap {
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    max-height: 200px;
    background: #000;
    display: none;
    margin-top: 8px;
}

.ann-img-preview-wrap img {
    width: 100%;
    max-height: 200px;
    object-fit: cover;
    display: block;
}

.ann-img-remove-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    background: rgba(220, 38, 38, 0.9);
    color: white;
    border: none;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
}

/* Roles selector */
.ann-roles-container {
    border: 1px solid var(--border-color, #cbd5e1);
    border-radius: 8px;
    padding: 12px 14px;
    background: var(--bg-surface, #ffffff);
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.ann-roles-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 8px 12px;
    padding-top: 10px;
    border-top: 1px dashed var(--border-color, #e2e8f0);
}

.ann-checkbox-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    cursor: pointer;
}

.ann-modal-footer {
    padding: 16px 24px;
    border-top: 1px solid var(--border-color, #e2e8f0);
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    background: var(--bg-surface-alt, #f8fafc);
    flex-shrink: 0;
}

/* View details modal styling */
.ann-view-hero {
    width: 100%;
    max-height: 280px;
    overflow: hidden;
    background: var(--bg-surface-alt, #f1f5f9);
}

.ann-view-hero img {
    width: 100%;
    max-height: 280px;
    object-fit: cover;
    display: block;
}

.ann-view-body {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.ann-view-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    font-size: 13px;
    color: var(--text-muted, #64748b);
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-color, #e2e8f0);
}

.ann-view-text {
    font-size: 15px;
    line-height: 1.6;
    color: var(--text-primary, #1e293b);
    white-space: pre-wrap;
    word-break: break-word;
}
</style>

<div class="ann-page">
    <div class="ann-header">
        <div class="ann-title-wrap">
            <h1>Announcements</h1>
            <p class="ann-subtitle">Create, schedule, and broadcast hospital announcements with images and role targeting.</p>
        </div>
        <button type="button" class="ann-btn-primary" id="annOpenCreateBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            New Announcement
        </button>
    </div>

    <!-- Stats Cards -->
    <div class="ann-stats-grid">
        <div class="ann-stat-card">
            <div class="ann-stat-label">Total Announcements</div>
            <div class="ann-stat-value" id="annStatTotal">-</div>
        </div>
        <div class="ann-stat-card">
            <div class="ann-stat-label" style="color: #10b981;">Active Now</div>
            <div class="ann-stat-value" id="annStatActive" style="color: #10b981;">-</div>
        </div>
        <div class="ann-stat-card">
            <div class="ann-stat-label" style="color: #3b82f6;">Scheduled (Upcoming)</div>
            <div class="ann-stat-value" id="annStatScheduled" style="color: #3b82f6;">-</div>
        </div>
        <div class="ann-stat-card">
            <div class="ann-stat-label" style="color: #64748b;">Expired / Inactive</div>
            <div class="ann-stat-value" id="annStatExpired">-</div>
        </div>
    </div>

    <!-- Filter Bar -->
    <div class="ann-filter-bar">
        <div class="ann-search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" class="ann-search-input" id="annSearchInput" placeholder="Search announcements by title or content...">
        </div>
        <select class="ann-select" id="annStatusFilter">
            <option value="all">All Statuses</option>
            <option value="active">Active Now</option>
            <option value="scheduled">Scheduled</option>
            <option value="expired">Expired</option>
            <option value="inactive">Inactive</option>
        </select>
        <select class="ann-select" id="annRoleFilter">
            <option value="all">All Roles</option>
        </select>
        <button type="button" class="ann-btn-secondary" id="annResetFiltersBtn">
            Reset
        </button>
    </div>

    <!-- Announcements Grid -->
    <div class="ann-grid" id="announcementsGrid">
        <div class="ann-empty-wrap">
            <div style="font-weight: 500;">Loading announcements...</div>
        </div>
    </div>
</div>

<!-- CREATE / EDIT MODAL -->
<div class="ann-modal-overlay" id="annFormModalOverlay">
    <div class="ann-modal-box">
        <div class="ann-modal-header">
            <h2 id="annFormModalTitle">New Announcement</h2>
            <button type="button" class="ann-modal-close" id="annFormModalClose">&times;</button>
        </div>
        <form id="announcementForm">
            <input type="hidden" id="annIdInput" name="id" value="">
            <input type="hidden" id="annRemoveImageInput" name="remove_image" value="0">
            <div class="ann-modal-body">
                <div class="ann-form-group">
                    <label for="annTitleInput">Announcement Title <span style="color: #dc2626;">*</span></label>
                    <input type="text" id="annTitleInput" name="title" placeholder="e.g. Annual Health & Safety Inspection" required maxlength="255">
                </div>

                <div class="ann-form-row">
                    <div class="ann-form-group">
                        <label for="annPrioritySelect">Priority Level</label>
                        <select id="annPrioritySelect" name="priority">
                            <option value="normal">Normal</option>
                            <option value="important">Important</option>
                            <option value="urgent">Urgent Alert</option>
                        </select>
                    </div>
                    <div class="ann-form-group">
                        <label for="annStatusSelect">Status</label>
                        <select id="annStatusSelect" name="status">
                            <option value="active">Active</option>
                            <option value="inactive">Inactive / Draft</option>
                        </select>
                    </div>
                </div>

                <div class="ann-form-row">
                    <div class="ann-form-group">
                        <label for="annStartDateInput">Start Date & Time <span style="color: #dc2626;">*</span></label>
                        <input type="datetime-local" id="annStartDateInput" name="start_date" required>
                    </div>
                    <div class="ann-form-group">
                        <label for="annEndDateInput">End Date & Time <span style="font-size: 11px; font-weight: 400; color: #64748b;">(Optional)</span></label>
                        <input type="datetime-local" id="annEndDateInput" name="end_date">
                    </div>
                </div>

                <!-- Roles Multi-Select Checkboxes -->
                <div class="ann-form-group">
                    <label>Target Audience (Who can see this announcement?) <span style="color: #dc2626;">*</span></label>
                    <div class="ann-roles-container">
                        <label class="ann-checkbox-label" style="font-weight: 600;">
                            <input type="checkbox" id="annRoleAllCheckbox" checked>
                            All Roles (Everyone)
                        </label>
                        <div class="ann-roles-grid" id="annRolesCheckboxesGrid">
                            <!-- Dynamic checkboxes for admin, doctor, receptionist, patient, etc. -->
                        </div>
                    </div>
                </div>

                <!-- Image Upload -->
                <div class="ann-form-group">
                    <label>Announcement Image <span style="font-size: 11px; font-weight: 400; color: #64748b;">(Optional - JPG, PNG, WEBP, GIF up to 10MB)</span></label>
                    <input type="file" id="annImageFileInput" name="image" accept="image/*" style="display: none;">
                    
                    <div class="ann-dropzone" id="annImageDropzone">
                        <div class="ann-dropzone-inner">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                            <div style="font-weight: 600; font-size: 13px;">Click to upload an image</div>
                            <div style="font-size: 12px; color: #64748b;">or drag and drop here</div>
                        </div>
                    </div>

                    <div class="ann-img-preview-wrap" id="annImagePreviewWrap">
                        <img id="annImagePreviewTag" src="" alt="Announcement Preview">
                        <button type="button" class="ann-img-remove-btn" id="annRemoveImageBtn">Remove Image</button>
                    </div>
                </div>

                <!-- Content Textarea -->
                <div class="ann-form-group">
                    <label for="annContentInput">Announcement Message <span style="color: #dc2626;">*</span></label>
                    <textarea id="annContentInput" name="content" rows="5" placeholder="Write full announcement details, instructions, or notices here..." required></textarea>
                </div>
            </div>
            <div class="ann-modal-footer">
                <button type="button" class="ann-btn-secondary" id="annFormCancelBtn">Cancel</button>
                <button type="submit" class="ann-btn-primary" id="annFormSubmitBtn">Save Announcement</button>
            </div>
        </form>
    </div>
</div>

<!-- VIEW DETAILS MODAL -->
<div class="ann-modal-overlay" id="annViewModalOverlay">
    <div class="ann-modal-box" style="max-width: 720px;">
        <div class="ann-modal-header">
            <h2 id="annViewModalTitle">Announcement Details</h2>
            <button type="button" class="ann-modal-close" id="annViewModalClose">&times;</button>
        </div>
        <div class="ann-modal-body" style="padding: 0;">
            <div class="ann-view-hero" id="annViewHero" style="display: none;">
                <img id="annViewHeroImg" src="" alt="Announcement image">
            </div>
            <div class="ann-view-body">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
                    <h2 id="annViewTitle" style="font-size: 20px; font-weight: 700; margin: 0; color: #0f172a;"></h2>
                    <div id="annViewStatusBadge"></div>
                </div>

                <div class="ann-view-meta">
                    <div><strong>Start:</strong> <span id="annViewStart"></span></div>
                    <div><strong>End:</strong> <span id="annViewEnd"></span></div>
                    <div><strong>Priority:</strong> <span id="annViewPriority" style="text-transform: capitalize;"></span></div>
                    <div><strong>Audience:</strong> <span id="annViewAudience"></span></div>
                    <div><strong>Posted By:</strong> <span id="annViewAuthor"></span></div>
                </div>

                <div class="ann-view-text" id="annViewContent"></div>
            </div>
        </div>
        <div class="ann-modal-footer">
            <button type="button" class="ann-btn-secondary" id="annViewCloseBtn">Close</button>
        </div>
    </div>
</div>
`;
}