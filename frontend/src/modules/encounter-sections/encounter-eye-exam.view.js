/**
 * Eye Exam View component HTML template and CSS styles.
 * Comprehensive Ophthalmology/Optometry clinical examination documentation.
 */

export const EYE_EXAM_STYLES = `
/* Eye Exam Form Styles */
.eye-exam-container {
    background: var(--bg-surface, #ffffff);
    border: 1px solid var(--border-color, #e2e8f0);
    border-radius: 8px;
    padding: 16px;
    margin-top: 12px;
    font-size: 13px;
    color: var(--text-primary, #1e293b);
}

.eye-exam-top-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--bg-surface-alt, #f8fafc);
    border: 1px solid var(--border-color, #e2e8f0);
    border-radius: 8px;
    padding: 14px 16px;
    margin-bottom: 18px;
    flex-wrap: wrap;
    gap: 14px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}

.eye-exam-header-title-wrap {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1 1 500px;
}

.eye-exam-header-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
    display: inline-flex;
    align-items: center;
    gap: 8px;
    letter-spacing: -0.2px;
}

.eye-exam-title-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: var(--accent-light, #eff6ff);
    color: var(--accent, #1d4ed8);
    flex-shrink: 0;
}

.eye-exam-header-badge {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    padding: 2px 8px;
    border-radius: 9999px;
    background: #dbeafe;
    color: #1e40af;
    border: 1px solid #bfdbfe;
    display: inline-flex;
    align-items: center;
    line-height: 1.4;
}

.eye-exam-meta-strip {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 8px;
    font-size: 12px;
    line-height: 1.4;
}

.eye-exam-meta-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--bg-surface, #ffffff);
    border: 1px solid var(--border-color, #e2e8f0);
    padding: 3px 9px;
    border-radius: 6px;
    font-size: 11.5px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.eye-exam-meta-label {
    color: var(--text-muted, #64748b);
    font-weight: 600;
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 0.3px;
}

.eye-exam-meta-val {
    color: var(--text-primary, #1e293b);
    font-weight: 600;
}

.eye-exam-meta-chip-reason {
    max-width: 320px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.eye-exam-subnav {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
    border-bottom: 1px solid var(--border-color, #e2e8f0);
    padding-bottom: 8px;
}

.eye-exam-subnav-btn {
    background: var(--bg-surface-alt, #f8fafc);
    border: 1px solid var(--border-color, #cbd5e1);
    border-radius: 6px;
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted, #64748b);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
}

.eye-exam-subnav-btn:hover {
    background: var(--accent-light, #eff6ff);
    color: var(--accent-text, #1d4ed8);
}

.eye-exam-subnav-btn.active {
    background: var(--accent, #1d4ed8);
    color: #ffffff;
    border-color: var(--accent, #1d4ed8);
}

.eye-exam-btn-close {
    cursor: pointer;
    font-size: 11px;
    padding: 2px 5px;
    border-radius: 4px;
    line-height: 1;
}

.eye-exam-btn-close:hover {
    background: rgba(0, 0, 0, 0.15);
}

.eye-exam-action-bar {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
}

.eye-exam-btn {
    background: var(--bg-surface-alt, #f1f5f9);
    border: 1px solid var(--border-color, #cbd5e1);
    border-radius: 5px;
    padding: 6px 13px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary, #334155);
    cursor: pointer;
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    gap: 5px;
}

.eye-exam-btn:hover {
    background: var(--accent-light, #e2e8f0);
    border-color: var(--accent-border, #93c5fd);
    color: var(--accent-text, #1d4ed8);
}

.eye-exam-btn-primary {
    background: var(--accent, #1d4ed8);
    color: #ffffff;
    border-color: var(--accent, #1d4ed8);
    box-shadow: 0 1px 2px rgba(29, 78, 216, 0.2);
}

/* Eye Exam Clinical Menubar */
.eye-exam-menubar {
    display: flex;
    align-items: center;
    background: #dbeafe;
    border: 1px solid #bfdbfe;
    border-radius: 6px;
    padding: 2px 8px;
    margin-bottom: 12px;
    font-size: 13px;
    gap: 4px;
    user-select: none;
}

.eye-exam-menu-brand {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    color: #1e3a8a;
    padding: 6px 12px 6px 6px;
    margin-right: 4px;
    border-right: 1px solid #bfdbfe;
    font-size: 13px;
}

.eye-exam-menu-dropdown {
    position: relative;
    display: inline-block;
}

.eye-exam-menu-trigger {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 10px;
    border-radius: 4px;
    border: 1px solid transparent;
    background: transparent;
    color: #1e3a8a;
    font-weight: 500;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s ease;
}

.eye-exam-menu-trigger:hover,
.eye-exam-menu-trigger.active {
    background: #2563eb;
    color: #ffffff;
}

.eye-exam-menu-popover {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 4px;
    min-width: 190px;
    background: #e0f2fe;
    border: 1px solid #93c5fd;
    border-radius: 6px;
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.15);
    z-index: 999;
    padding: 4px 0;
}

.eye-exam-menu-dropdown.open .eye-exam-menu-popover {
    display: block;
}

.eye-exam-menu-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 7px 14px;
    font-size: 12.5px;
    color: #1e293b;
    border: none;
    background: transparent;
    text-align: left;
    gap: 12px;
    box-sizing: border-box;
}

.eye-exam-menu-item.disabled {
    color: #64748b;
    cursor: not-allowed;
    opacity: 0.85;
}

.eye-exam-menu-item.disabled:hover {
    background: rgba(147, 197, 253, 0.35);
}

.eye-exam-menu-item .menu-shortcut {
    font-size: 11px;
    color: #475569;
    font-family: inherit;
    font-weight: 500;
}

.eye-exam-menu-item .menu-icon {
    display: inline-flex;
    align-items: center;
    font-size: 12px;
    color: #475569;
}

/* Eye Exam Side Navigation Rail Layout */
.eye-exam-workspace {
    display: flex;
    gap: 16px;
    align-items: flex-start;
}

.eye-exam-nav-rail {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 68px;
    flex-shrink: 0;
    position: sticky;
    top: 16px;
    z-index: 10;
}

.eye-exam-nav-tab {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 7px 4px 7px 8px;
    background: #eef6ff;
    border: 1px solid #bfdbfe;
    border-left: 3.5px solid #cbd5e1;
    border-radius: 4px;
    font-size: 11.5px;
    font-weight: 700;
    color: #475569;
    cursor: pointer;
    text-decoration: none;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    transition: all 0.15s ease;
    user-select: none;
    text-align: center;
    opacity: 0.7;
}

.eye-exam-nav-tab:hover {
    background: #dbeafe;
    border-color: #93c5fd;
    color: #1e40af;
    opacity: 0.95;
    transform: translateX(1px);
}

.eye-exam-nav-tab.active {
    background: #2563eb;
    border-color: #1d4ed8;
    border-left: 3.5px solid #1e3a8a;
    color: #ffffff;
    box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);
    opacity: 1;
}

.eye-exam-nav-tab.active:hover {
    background: #1d4ed8;
    color: #ffffff;
}

.eye-exam-content-area {
    flex: 1;
    min-width: 0;
}

@media (max-width: 768px) {
    .eye-exam-workspace {
        flex-direction: column;
    }
    .eye-exam-nav-rail {
        flex-direction: row;
        width: 100%;
        overflow-x: auto;
        position: static;
        padding-bottom: 4px;
    }
    .eye-exam-nav-tab {
        flex: 1;
        min-width: 55px;
        padding: 6px;
        border-left-width: 1px;
        border-top: 3px solid #2563eb;
    }
}

.eye-exam-btn-primary:hover {
    background: var(--accent-hover, #1e40af);
    border-color: var(--accent-hover, #1e40af);
    color: #ffffff;
}

:root[data-theme="dark"] .eye-exam-menubar {
    background: #172554;
    border-color: #1e3a8a;
}

:root[data-theme="dark"] .eye-exam-menu-brand {
    color: #93c5fd;
    border-right-color: #1e3a8a;
}

:root[data-theme="dark"] .eye-exam-menu-trigger {
    color: #bfdbfe;
}

:root[data-theme="dark"] .eye-exam-menu-trigger:hover,
:root[data-theme="dark"] .eye-exam-menu-trigger.active {
    background: #2563eb;
    color: #ffffff;
}

:root[data-theme="dark"] .eye-exam-menu-popover {
    background: #0f172a;
    border-color: #1e3a8a;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
}

:root[data-theme="dark"] .eye-exam-menu-item {
    color: #cbd5e1;
}

:root[data-theme="dark"] .eye-exam-menu-item.disabled {
    color: #94a3b8;
}

:root[data-theme="dark"] .eye-exam-menu-item.disabled:hover {
    background: rgba(30, 58, 138, 0.4);
}

:root[data-theme="dark"] .eye-exam-menu-item .menu-shortcut,
:root[data-theme="dark"] .eye-exam-menu-item .menu-icon {
    color: #64748b;
}

:root[data-theme="dark"] .eye-exam-nav-tab {
    background: #0f172a;
    border-color: #334155;
    border-left-color: #475569;
    color: #94a3b8;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    opacity: 0.7;
}

:root[data-theme="dark"] .eye-exam-nav-tab:hover {
    background: #1e293b;
    border-color: #475569;
    border-left-color: #60a5fa;
    color: #93c5fd;
    opacity: 0.95;
}

:root[data-theme="dark"] .eye-exam-nav-tab.active {
    background: #2563eb;
    border-color: #3b82f6;
    border-left-color: #93c5fd;
    color: #ffffff;
    opacity: 1;
}

:root[data-theme="dark"] .eye-exam-nav-tab.active:hover {
    background: #1d4ed8;
    color: #ffffff;
}

:root[data-theme="dark"] .eye-exam-top-actions {
    background: var(--bg-surface-alt, #0f172a);
    border-color: var(--border-color, #334155);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

:root[data-theme="dark"] .eye-exam-header-title {
    color: var(--text-primary, #f8fafc);
}

:root[data-theme="dark"] .eye-exam-title-icon {
    background: rgba(37, 99, 235, 0.2);
    color: #60a5fa;
}

:root[data-theme="dark"] .eye-exam-header-badge {
    background: rgba(30, 58, 138, 0.4);
    border-color: #2563eb;
    color: #93c5fd;
}

:root[data-theme="dark"] .eye-exam-meta-chip {
    background: var(--bg-surface, #1e293b);
    border-color: var(--border-color, #334155);
}

:root[data-theme="dark"] .eye-exam-meta-label {
    color: var(--text-muted, #94a3b8);
}

:root[data-theme="dark"] .eye-exam-meta-val {
    color: var(--text-primary, #f1f5f9);
}

:root[data-theme="dark"] .eye-exam-btn {
    background: var(--bg-surface-alt, #1e293b);
    border-color: var(--border-color, #334155);
    color: var(--text-primary, #e2e8f0);
}

:root[data-theme="dark"] .eye-exam-btn:hover {
    background: rgba(37, 99, 235, 0.2);
    border-color: #3b82f6;
    color: #93c5fd;
}

:root[data-theme="dark"] .eye-exam-btn-primary {
    background: var(--accent, #2563eb);
    color: #ffffff;
    border-color: #3b82f6;
}

:root[data-theme="dark"] .eye-exam-btn-primary:hover {
    background: #1d4ed8;
    color: #ffffff;
}

.eye-exam-card {
    background: var(--bg-surface, #ffffff);
    border: 1px solid var(--border-color, #e2e8f0);
    border-radius: 6px;
    margin-bottom: 16px;
}

.eye-exam-card-header {
    background: var(--bg-surface-alt, #f8fafc);
    border-bottom: 1px solid var(--border-color, #e2e8f0);
    padding: 10px 14px;
    font-weight: 700;
    font-size: 13px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--text-primary, #0f172a);
    position: relative;
}

.eye-exam-card-actions {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    position: relative;
}

.eye-exam-header-icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 4px;
    border: none;
    background: transparent;
    color: var(--text-primary, #0f172a);
    cursor: pointer;
    padding: 0;
    transition: all 0.15s ease;
}

.eye-exam-header-icon-btn:hover {
    background: rgba(37, 99, 235, 0.12);
    color: var(--accent, #1d4ed8);
}

:root[data-theme="dark"] .eye-exam-header-icon-btn {
    color: var(--text-primary, #f1f5f9);
}

:root[data-theme="dark"] .eye-exam-header-icon-btn:hover {
    background: rgba(37, 99, 235, 0.25);
    color: #93c5fd;
}

/* Eye Exam Shorthand Floating Popup */
.eye-shorthand-popup {
    position: absolute;
    background: var(--bg-surface, #ffffff);
    border: 1px solid var(--border-color, #cbd5e1);
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.08);
    width: 250px;
    z-index: 1000;
    padding: 12px 14px 14px 14px;
    display: none;
    animation: eyePopupFadeIn 0.15s ease-out;
}

@keyframes eyePopupFadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
}

.eye-shorthand-popup-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
}

.eye-shorthand-popup-title {
    font-size: 14.5px;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    letter-spacing: -0.2px;
}

.eye-shorthand-info-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 17px;
    height: 17px;
    border-radius: 50%;
    background: #0f172a;
    color: #ffffff;
    font-size: 11px;
    font-weight: 700;
    font-family: serif;
    cursor: pointer;
    border: none;
    line-height: 1;
    transition: all 0.15s ease;
}

.eye-shorthand-info-btn:hover {
    background: #2563eb;
    transform: scale(1.08);
}

.eye-shorthand-popup-close {
    background: none;
    border: none;
    font-size: 16px;
    cursor: pointer;
    color: var(--text-muted, #64748b);
    line-height: 1;
    padding: 2px 4px;
    border-radius: 4px;
}

.eye-shorthand-popup-close:hover {
    color: var(--text-primary, #0f172a);
    background: rgba(0, 0, 0, 0.06);
}

.eye-shorthand-textarea {
    width: 100%;
    height: 100px;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 6px;
    padding: 8px 10px;
    font-size: 12.5px;
    color: #1e293b;
    box-sizing: border-box;
    resize: vertical;
    outline: none;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.04);
}

.eye-shorthand-textarea:focus {
    border-color: #f59e0b;
    box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
}

:root[data-theme="dark"] .eye-shorthand-popup {
    background: #1e293b;
    border-color: #334155;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
}

:root[data-theme="dark"] .eye-shorthand-info-btn {
    background: #38bdf8;
    color: #0f172a;
}

:root[data-theme="dark"] .eye-shorthand-textarea {
    background: #292524;
    border-color: #57534e;
    color: #fef3c7;
}

/* Shorthand Help Modal */
.eye-help-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(2px);
    z-index: 9999;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.eye-help-modal-overlay.open {
    display: flex;
}

.eye-help-modal-content {
    background: var(--bg-surface, #ffffff);
    border-radius: 8px;
    border: 1px solid var(--border-color, #cbd5e1);
    max-width: 760px;
    width: 100%;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.25);
    overflow: hidden;
}

.eye-help-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    background: var(--bg-surface-alt, #f8fafc);
    border-bottom: 1px solid var(--border-color, #e2e8f0);
}

.eye-help-modal-header h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary, #0f172a);
    display: flex;
    align-items: center;
    gap: 8px;
}

.eye-help-nav-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 10px 18px;
    background: #f1f5f9;
    border-bottom: 1px solid var(--border-color, #e2e8f0);
}

.eye-help-tab-link {
    padding: 4px 10px;
    font-size: 11.5px;
    font-weight: 600;
    color: #1d4ed8;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.15s ease;
}

.eye-help-tab-link:hover {
    background: #dbeafe;
}

.eye-help-tab-link.active {
    background: #2563eb;
    color: #ffffff;
}

.eye-help-modal-body {
    padding: 18px;
    overflow-y: auto;
    font-size: 13px;
    line-height: 1.6;
    color: var(--text-primary, #1e293b);
}

.eye-help-quote {
    font-style: italic;
    color: #1e3a8a;
    background: #eff6ff;
    padding: 10px 14px;
    border-left: 4px solid #3b82f6;
    border-radius: 4px;
    margin-bottom: 14px;
}

.eye-help-code-block {
    background: var(--bg-surface-alt, #f8fafc);
    border: 1px solid var(--border-color, #e2e8f0);
    border-radius: 6px;
    padding: 10px 14px;
    font-family: monospace;
    font-size: 12px;
    margin: 10px 0;
    color: #0f172a;
}

:root[data-theme="dark"] .eye-help-modal-content {
    background: #1e293b;
    border-color: #334155;
}

:root[data-theme="dark"] .eye-help-modal-header {
    background: #0f172a;
    border-bottom-color: #334155;
}

:root[data-theme="dark"] .eye-help-nav-tabs {
    background: #0f172a;
    border-bottom-color: #334155;
}

:root[data-theme="dark"] .eye-help-tab-link {
    color: #93c5fd;
}

:root[data-theme="dark"] .eye-help-tab-link:hover {
    background: #1e3a8a;
}

:root[data-theme="dark"] .eye-help-tab-link.active {
    background: #2563eb;
    color: #ffffff;
}

:root[data-theme="dark"] .eye-help-quote {
    background: #172554;
    color: #bfdbfe;
    border-left-color: #2563eb;
}

:root[data-theme="dark"] .eye-help-code-block {
    background: #0f172a;
    border-color: #334155;
    color: #f1f5f9;
}

/* PMSFH List View Modal */
.eye-pmsfh-list-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(2px);
    z-index: 9999;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.eye-pmsfh-list-overlay.open {
    display: flex;
}

.eye-pmsfh-list-content {
    background: var(--bg-surface, #ffffff);
    border-radius: 8px;
    border: 1px solid var(--border-color, #cbd5e1);
    max-width: 860px;
    width: 100%;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.25);
    overflow: hidden;
}

.eye-pmsfh-list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 18px;
    background: var(--bg-surface-alt, #f8fafc);
    border-bottom: 1px solid var(--border-color, #e2e8f0);
}

.eye-pmsfh-list-header h3 {
    margin: 0;
    font-size: 14.5px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-primary, #0f172a);
}

.eye-pmsfh-list-nav-tabs {
    display: flex;
    gap: 4px;
    padding: 8px 16px;
    background: var(--bg-surface-alt, #f1f5f9);
    border-bottom: 1px solid var(--border-color, #e2e8f0);
    overflow-x: auto;
}

.eye-pmsfh-list-tab {
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 600;
    border: none;
    background: transparent;
    color: var(--text-muted, #64748b);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
}

.eye-pmsfh-list-tab:hover {
    background: rgba(148, 163, 184, 0.18);
    color: var(--text-primary, #0f172a);
}

.eye-pmsfh-list-tab.active {
    background: #0284c7;
    color: #ffffff;
}

.eye-pmsfh-list-body {
    padding: 16px;
    overflow-y: auto;
    flex: 1;
}

.eye-pmsfh-list-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
}

.eye-pmsfh-list-table th {
    background: var(--bg-surface-alt, #f8fafc);
    text-align: left;
    padding: 8px 10px;
    font-weight: 700;
    border-bottom: 2px solid var(--border-color, #cbd5e1);
    color: var(--text-secondary, #475569);
    white-space: nowrap;
}

.eye-pmsfh-list-table td {
    padding: 8px 10px;
    border-bottom: 1px solid var(--border-color, #e2e8f0);
    vertical-align: middle;
    color: var(--text-primary, #1e293b);
}

.eye-pmsfh-list-table tr:hover td {
    background: rgba(2, 132, 199, 0.04);
}

.eye-pmsfh-list-badge {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
}

.eye-pmsfh-list-badge.badge-poh { background: #dbeafe; color: #1e40af; }
.eye-pmsfh-list-badge.badge-pos { background: #e0e7ff; color: #3730a3; }
.eye-pmsfh-list-badge.badge-eyem { background: #ccfbf1; color: #115e59; }
.eye-pmsfh-list-badge.badge-pmh { background: #fef3c7; color: #92400e; }
.eye-pmsfh-list-badge.badge-surg { background: #fed7aa; color: #9a3412; }
.eye-pmsfh-list-badge.badge-meds { background: #dcfce7; color: #166534; }
.eye-pmsfh-list-badge.badge-all { background: #fee2e2; color: #991b1b; }
.eye-pmsfh-list-badge.badge-soc { background: #f3e8ff; color: #6b21a8; }
.eye-pmsfh-list-badge.badge-fh { background: #f1f5f9; color: #475569; }
.eye-pmsfh-list-badge.badge-ros { background: #e2e8f0; color: #334155; }

.eye-pmsfh-list-action-btn {
    padding: 3px 8px;
    font-size: 11px;
    border-radius: 4px;
    border: 1px solid #cbd5e1;
    background: var(--bg-surface, #ffffff);
    color: var(--text-primary, #0f172a);
    cursor: pointer;
    font-weight: 600;
}

.eye-pmsfh-list-action-btn:hover {
    background: #0284c7;
    color: #ffffff;
    border-color: #0284c7;
}

:root[data-theme="dark"] .eye-pmsfh-list-content {
    background: #1e293b;
    border-color: #334155;
}

:root[data-theme="dark"] .eye-pmsfh-list-header {
    background: #0f172a;
    border-bottom-color: #334155;
}

:root[data-theme="dark"] .eye-pmsfh-list-header h3 {
    color: #f1f5f9;
}

:root[data-theme="dark"] .eye-pmsfh-list-nav-tabs {
    background: #0f172a;
    border-bottom-color: #334155;
}

:root[data-theme="dark"] .eye-pmsfh-list-tab {
    color: #94a3b8;
}

:root[data-theme="dark"] .eye-pmsfh-list-tab:hover {
    background: #1e293b;
    color: #f1f5f9;
}

:root[data-theme="dark"] .eye-pmsfh-list-tab.active {
    background: #0284c7;
    color: #ffffff;
}

:root[data-theme="dark"] .eye-pmsfh-list-table th {
    background: #0f172a;
    border-bottom-color: #334155;
    color: #94a3b8;
}

:root[data-theme="dark"] .eye-pmsfh-list-table td {
    border-bottom-color: #334155;
    color: #f1f5f9;
}

:root[data-theme="dark"] .eye-pmsfh-list-table tr:hover td {
    background: rgba(2, 132, 199, 0.12);
}

:root[data-theme="dark"] .eye-pmsfh-list-action-btn {
    background: #0f172a;
    border-color: #475569;
    color: #e2e8f0;
}

:root[data-theme="dark"] .eye-pmsfh-list-action-btn:hover {
    background: #0284c7;
    color: #ffffff;
    border-color: #0284c7;
}

.eye-exam-card-body {
    padding: 14px;
}

.eye-exam-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}

@media (max-width: 1024px) {
    .eye-exam-grid-2 {
        grid-template-columns: 1fr;
    }
}

.eye-exam-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    margin-top: 6px;
}

.eye-exam-table th, .eye-exam-table td {
    border: 1px solid var(--border-color, #cbd5e1);
    padding: 6px 8px;
    text-align: left;
    vertical-align: middle;
}

.eye-exam-table th {
    background: var(--bg-surface-alt, #f1f5f9);
    font-weight: 600;
    color: var(--text-primary, #334155);
}

.eye-exam-input {
    width: 100%;
    background: var(--bg-surface, #ffffff);
    border: 1px solid var(--border-color, #cbd5e1);
    border-radius: 4px;
    padding: 5px 8px;
    font-size: 12px;
    color: var(--text-primary, #1e293b);
    box-sizing: border-box;
}

.eye-exam-input:focus {
    outline: none;
    border-color: var(--accent, #1d4ed8);
}

.eye-exam-radio-group {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    margin-bottom: 10px;
    font-size: 12px;
}

.eye-exam-radio-label {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    font-weight: 500;
}

.eye-exam-pill-tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 8px;
}

.eye-exam-pill {
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 600;
    border-radius: 4px;
    background: var(--bg-surface-alt, #f1f5f9);
    border: 1px solid var(--border-color, #cbd5e1);
    cursor: pointer;
    color: var(--text-muted, #64748b);
}

.eye-exam-pill.active {
    background: var(--accent, #1d4ed8);
    color: #ffffff;
    border-color: var(--accent, #1d4ed8);
}

.eye-exam-strip {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding: 10px 0;
    margin-bottom: 16px;
}

.eye-exam-strip-box {
    flex: 1;
    min-width: 200px;
    background: var(--bg-surface-alt, #f8fafc);
    border: 1px solid var(--border-color, #e2e8f0);
    border-radius: 6px;
    padding: 10px;
}

.eye-exam-strip-title {
    font-weight: 700;
    font-size: 12px;
    margin-bottom: 8px;
    color: var(--text-primary, #1e293b);
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.eye-od-badge {
    background: #dbeafe;
    color: #1e40af;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 5px;
    border-radius: 3px;
    display: inline-block;
}

.eye-os-badge {
    background: #fef3c7;
    color: #92400e;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 5px;
    border-radius: 3px;
    display: inline-block;
}

:root[data-theme="dark"] .eye-od-badge {
    background: #1e3a8a;
    color: #bfdbfe;
}

:root[data-theme="dark"] .eye-os-badge {
    background: #78350f;
    color: #fde68a;
}

/* HPI Elements Card Box Styling (Toggled by Database Button) */
.eye-hpi-elements-card {
    background: #fdfbf7;
    border: 1px solid #e7dfd5;
    border-radius: 6px;
    margin-bottom: 16px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    overflow: hidden;
    position: relative;
    font-size: 13px;
    color: #1e293b;
    display: none;
}

:root[data-theme="dark"] .eye-hpi-elements-card {
    background: #1e293b;
    border-color: #334155;
    color: #f1f5f9;
}

.eye-hpi-elements-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px 6px 16px;
    background: #fbf8f1;
}

:root[data-theme="dark"] .eye-hpi-elements-header {
    background: #0f172a;
}

.eye-hpi-elements-title {
    font-weight: 700;
    font-size: 14px;
    color: #0f172a;
}

:root[data-theme="dark"] .eye-hpi-elements-title {
    color: #f8fafc;
}

.eye-hpi-elements-tabs {
    display: flex;
    gap: 4px;
    padding: 0 16px 8px 16px;
    background: #fbf8f1;
    border-bottom: 1px solid #e7dfd5;
}

:root[data-theme="dark"] .eye-hpi-elements-tabs {
    background: #0f172a;
    border-color: #334155;
}

.eye-hpi-tab-btn {
    padding: 4px 14px;
    font-size: 12px;
    font-weight: 600;
    border-radius: 4px 4px 0 0;
    border: 1px solid #cbd5e1;
    border-bottom: none;
    background: #cbd5e1;
    color: #475569;
    cursor: pointer;
    transition: all 0.15s ease;
}

.eye-hpi-tab-btn.active {
    background: #ffffff;
    color: #1d4ed8;
    border-color: #cbd5e1;
    font-weight: 700;
}

:root[data-theme="dark"] .eye-hpi-tab-btn {
    background: #334155;
    color: #94a3b8;
    border-color: #475569;
}

:root[data-theme="dark"] .eye-hpi-tab-btn.active {
    background: #1e293b;
    color: #60a5fa;
    border-color: #475569;
}

.eye-hpi-elements-body {
    padding: 16px 18px;
    background: #ffffff;
    max-height: 75vh;
    overflow-y: auto;
}

:root[data-theme="dark"] .eye-hpi-elements-body {
    background: #1e293b;
}

.eye-hpi-element-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
}

.eye-hpi-element-label {
    width: 82px;
    font-weight: 700;
    font-size: 12px;
    text-align: right;
    color: #0f172a;
    flex-shrink: 0;
}

:root[data-theme="dark"] .eye-hpi-element-label {
    color: #e2e8f0;
}

.eye-hpi-element-input {
    flex: 1;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 5px;
    padding: 6px 10px;
    font-size: 12px;
    color: #1e293b;
    outline: none;
    resize: none;
    height: 32px;
    box-sizing: border-box;
    transition: border-color 0.15s ease;
}

.eye-hpi-element-input:focus {
    border-color: #f59e0b;
    box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
}

:root[data-theme="dark"] .eye-hpi-element-input {
    background: #292524;
    border-color: #57534e;
    color: #fef3c7;
}

.eye-hpi-element-hint {
    width: 220px;
    font-size: 11.5px;
    font-style: italic;
    color: #64748b;
    flex-shrink: 0;
}

:root[data-theme="dark"] .eye-hpi-element-hint {
    color: #94a3b8;
}

.eye-hpi-elements-footer {
    padding: 8px 16px 12px 16px;
    font-size: 11px;
    text-align: center;
    color: #64748b;
    background: #ffffff;
    border-top: 1px solid #f1f5f9;
}

:root[data-theme="dark"] .eye-hpi-elements-footer {
    background: #1e293b;
    border-color: #334155;
    color: #94a3b8;
}

/* HPI Drawing & Sketchpad Card Box */
.eye-hpi-draw-card {
    background: #fbf5e8;
    background-image: radial-gradient(#eadbc8 1px, transparent 1px);
    background-size: 8px 8px;
    border: 1px solid #dcd1be;
    border-radius: 8px;
    padding: 8px 10px 12px 10px;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
    display: none;
    animation: eyePopupFadeIn 0.2s ease-out;
}

:root[data-theme="dark"] .eye-hpi-draw-card {
    background: #1c1917;
    background-image: radial-gradient(#292524 1px, transparent 1px);
    border-color: #44403c;
}

.eye-hpi-draw-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding: 2px 4px 6px 4px;
    position: relative;
    user-select: none;
}

.eye-hpi-draw-toolbar {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    flex-wrap: wrap;
}

.eye-hpi-draw-eraser-block {
    width: 24px;
    height: 30px;
    background: #18181b;
    border: 1px solid #09090b;
    border-radius: 2px 2px 0 0;
    position: relative;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    transition: transform 0.1s ease;
}

.eye-hpi-draw-eraser-block:hover {
    transform: translateY(-2px);
}

.eye-hpi-draw-eraser-block::before {
    content: '';
    position: absolute;
    top: -8px;
    left: 4px;
    right: 4px;
    height: 8px;
    background: #d4a373;
    clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
}

.eye-hpi-draw-pencils {
    display: flex;
    align-items: flex-end;
    gap: 3px;
    padding-bottom: 2px;
}

.eye-draw-pencil {
    width: 10px;
    height: 26px;
    border-radius: 2px 2px 0 0;
    position: relative;
    cursor: pointer;
    transition: transform 0.12s ease, filter 0.12s ease;
    border: 1px solid rgba(0,0,0,0.15);
}

.eye-draw-pencil::before {
    content: '';
    position: absolute;
    top: -7px;
    left: 1px;
    right: 1px;
    height: 7px;
    background: #fde047;
    clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
}

.eye-draw-pencil::after {
    content: '';
    position: absolute;
    top: -7px;
    left: 3px;
    right: 3px;
    height: 3px;
    background: inherit;
    clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
}

.eye-draw-pencil:hover {
    transform: translateY(-3px);
}

.eye-draw-pencil.active {
    transform: translateY(-5px);
    box-shadow: 0 4px 6px rgba(0,0,0,0.25);
    outline: 2px solid #2563eb;
    outline-offset: 1px;
}

.eye-hpi-draw-sizes {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-left: 6px;
    padding: 0 4px 4px 4px;
}

.eye-draw-size-dot {
    background: #18181b;
    border-radius: 50%;
    cursor: pointer;
    transition: transform 0.1s ease, background 0.1s ease;
}

:root[data-theme="dark"] .eye-draw-size-dot {
    background: #f4f4f5;
}

.eye-draw-size-dot:hover {
    transform: scale(1.2);
}

.eye-draw-size-dot.active {
    box-shadow: 0 0 0 2px #2563eb;
}

.eye-hpi-draw-canvas-container {
    background: #ffffff;
    border: 1px solid #dcd1be;
    border-radius: 6px;
    box-shadow: inset 0 1px 3px rgba(0,0,0,0.06);
    position: relative;
    overflow: hidden;
}

:root[data-theme="dark"] .eye-hpi-draw-canvas-container {
    background: #ffffff; /* keep paper canvas light for medical diagram drawing */
    border-color: #57534e;
}

.eye-hpi-draw-paper {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    padding: 12px 16px;
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #0f172a;
    user-select: none;
}

.eye-draw-paper-header {
    font-size: 11px;
    font-weight: 700;
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 8px;
    color: #1e293b;
}

.eye-draw-paper-field {
    font-size: 11px;
    font-weight: 700;
    margin-bottom: 14px;
    color: #1e293b;
}

.eye-draw-paper-line {
    border-bottom: 1.5px solid #1e293b;
    display: inline-block;
    min-width: 240px;
    height: 12px;
    vertical-align: middle;
    margin-left: 6px;
}

.eye-draw-canvas-elem {
    display: block;
    width: 100%;
    height: 215px;
    cursor: crosshair;
    touch-action: none;
}

.eye-hpi-draw-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-top: 10px;
}

.eye-draw-action-btn {
    background: #e0f2fe;
    border: 1px solid #bae6fd;
    color: #0369a1;
    font-size: 11.5px;
    font-weight: 600;
    border-radius: 4px;
    padding: 4px 16px;
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(3, 105, 161, 0.08);
    transition: all 0.15s ease;
}

.eye-draw-action-btn:hover {
    background: #bae6fd;
    border-color: #7dd3fc;
    color: #0284c7;
}

.eye-draw-action-btn:active {
    transform: translateY(1px);
}

:root[data-theme="dark"] .eye-draw-action-btn {
    background: #075985;
    border-color: #0284c7;
    color: #e0f2fe;
}

:root[data-theme="dark"] .eye-draw-action-btn:hover {
    background: #0284c7;
}

/* HPI CC Card custom yellow surface styling */
.eye-hpi-cream-surface {
    background: #fffbeb;
    border: 1px solid #fde68a;
}

:root[data-theme="dark"] .eye-hpi-cream-surface {
    background: #292524;
    border-color: #57534e;
    color: #fef3c7;
}

.eye-pmh-cream-box {
    background: #fef9c3;
    border: 1px solid #fef08a;
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 12px;
}

:root[data-theme="dark"] .eye-pmh-cream-box {
    background: #292524;
    border-color: #44403c;
}

.eye-pmh-save-btn {
    background: #2563eb;
    color: #ffffff;
    border: 1px solid #1d4ed8;
    border-radius: 5px;
    padding: 6px 18px;
    font-size: 12.5px;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    box-shadow: 0 1px 3px rgba(37, 99, 235, 0.25);
    transition: all 0.15s ease;
}

.eye-pmh-save-btn:hover {
    background: #1d4ed8;
    box-shadow: 0 2px 6px rgba(29, 78, 216, 0.35);
}

.eye-draw-paper-pmsfh {
    display: none;
}

.eye-hpi-draw-card[data-paper="pmh"] .eye-draw-paper-hpi {
    display: none;
}

.eye-hpi-draw-card[data-paper="pmh"] .eye-draw-paper-pmsfh {
    display: block;
}

/* PMSFH Elements / History Card Box (Toggled by Database Button) */
.eye-pmsfh-elements-card {
    background: #fbf5e8;
    background-image: radial-gradient(#eadbc8 1px, transparent 1px);
    background-size: 8px 8px;
    border: 1px solid #dcd1be;
    border-radius: 8px;
    padding: 10px;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
    display: none;
    animation: eyePopupFadeIn 0.2s ease-out;
}

:root[data-theme="dark"] .eye-pmsfh-elements-card {
    background: #1c1917;
    background-image: radial-gradient(#292524 1px, transparent 1px);
    border-color: #44403c;
}

.eye-pmsfh-elements-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    align-items: start;
}

.eye-pmsfh-col-card {
    background: #ffffff;
    border: 1.5px solid #94a3b8;
    border-radius: 8px;
    padding: 10px 12px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
}

:root[data-theme="dark"] .eye-pmsfh-col-card {
    background: #1e293b;
    border-color: #475569;
}

.eye-pmsfh-item-row {
    margin-bottom: 8px;
}

.eye-pmsfh-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 3px;
}

.eye-pmsfh-item-label {
    font-size: 11.5px;
    font-weight: 800;
    color: #0f172a;
}

:root[data-theme="dark"] .eye-pmsfh-item-label {
    color: #f1f5f9;
}

.eye-pmsfh-new-link {
    font-size: 10.5px;
    font-weight: 600;
    color: #2563eb;
    text-decoration: none;
    cursor: pointer;
}

.eye-pmsfh-new-link:hover {
    text-decoration: underline;
    color: #1d4ed8;
}

:root[data-theme="dark"] .eye-pmsfh-new-link {
    color: #60a5fa;
}

.eye-pmsfh-cream-input {
    width: 100%;
    box-sizing: border-box;
    background: #fffdf0;
    border: 1.2px solid #64748b;
    border-radius: 5px;
    padding: 5px 8px;
    font-size: 11.5px;
    color: #1e293b;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.08);
    resize: none;
    outline: none;
    transition: border-color 0.15s ease;
    font-family: inherit;
    line-height: 1.35;
}

.eye-pmsfh-cream-input:focus {
    border-color: #f59e0b;
    box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
}

:root[data-theme="dark"] .eye-pmsfh-cream-input {
    background: #292524;
    border-color: #57534e;
    color: #fef3c7;
}

.eye-pmsfh-allergy-input {
    color: #dc2626 !important;
    font-weight: 600;
}

:root[data-theme="dark"] .eye-pmsfh-allergy-input {
    color: #f87171 !important;
}

/* Dynamic Grid Expansion when PMSFH has an open companion (draw card or elements card) */
.eye-exam-grid-2.pmsfh-companion-active,
.eye-exam-grid-2:has(#eyeExamSecPmh.has-open-companion) {
    grid-template-columns: minmax(280px, 320px) 1fr;
    align-items: start;
}

.eye-exam-grid-2.pmsfh-companion-active #eyeExamSecHpi,
.eye-exam-grid-2:has(#eyeExamSecPmh.has-open-companion) #eyeExamSecHpi {
    grid-column: 1 / -1;
}

.eye-exam-grid-2.pmsfh-companion-active #eyeExamSecPmh,
.eye-exam-grid-2:has(#eyeExamSecPmh.has-open-companion) #eyeExamSecPmh {
    grid-column: 1;
    width: 100%;
}

.eye-exam-grid-2.pmsfh-companion-active .eye-pmsfh-elements-card.active-companion,
.eye-exam-grid-2.pmsfh-companion-active .eye-pmsfh-draw-card.active-companion,
.eye-exam-grid-2:has(#eyeExamSecPmh.has-open-companion) .eye-pmsfh-elements-card.active-companion,
.eye-exam-grid-2:has(#eyeExamSecPmh.has-open-companion) .eye-pmsfh-draw-card.active-companion {
    grid-column: 2;
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
}

.eye-pmsfh-draw-card {
    max-width: 100%;
    box-sizing: border-box;
    overflow: hidden;
}

/* Eye Exam Main Layout & Vertical PMSFH History Sidebar */
.eye-exam-body-layout {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    width: 100%;
}

.eye-exam-main-col {
    flex: 1;
    min-width: 0;
}

.eye-pmsfh-sidebar {
    width: 180px;
    flex: 0 0 180px;
    background: #fbf7e6;
    border: 1px solid #dcd1be;
    border-radius: 6px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: inherit;
    box-sizing: border-box;
    position: sticky;
    top: 12px;
    align-self: flex-start;
    max-height: calc(100vh - 80px);
    z-index: 20;
}

:root[data-theme="dark"] .eye-pmsfh-sidebar {
    background: #1c1917;
    border-color: #44403c;
}

.eye-pmsfh-sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 8px;
    background: #f5eed7;
    border-bottom: 1px solid #e6dcbe;
    flex-shrink: 0;
}

:root[data-theme="dark"] .eye-pmsfh-sidebar-header {
    background: #292524;
    border-color: #44403c;
}

.eye-sidebar-icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: none;
    background: transparent;
    color: #1e293b;
    cursor: pointer;
    border-radius: 3px;
    padding: 0;
    transition: background 0.12s ease;
}

.eye-sidebar-icon-btn:hover {
    background: rgba(0, 0, 0, 0.08);
    color: #2563eb;
}

:root[data-theme="dark"] .eye-sidebar-icon-btn {
    color: #f1f5f9;
}

:root[data-theme="dark"] .eye-sidebar-icon-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #60a5fa;
}

.eye-pmsfh-sidebar-body {
    padding: 6px 8px;
    overflow-y: auto;
    flex: 1;
    max-height: calc(100vh - 130px);
    font-size: 11px;
}

.eye-pmsfh-sidebar-body::-webkit-scrollbar {
    width: 6px;
}

.eye-pmsfh-sidebar-body::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.05);
}

.eye-pmsfh-sidebar-body::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
}

.eye-pmsfh-sidebar-body::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
}

:root[data-theme="dark"] .eye-pmsfh-sidebar-body::-webkit-scrollbar-thumb {
    background: #475569;
}

.eye-sidebar-item {
    margin-bottom: 8px;
}

.eye-sidebar-item-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2px;
}

.eye-sidebar-item-label {
    font-size: 11.5px;
    font-weight: 700;
    text-decoration: underline;
    color: #0f172a;
    cursor: pointer;
}

.eye-sidebar-item-label:hover {
    color: #2563eb;
}

:root[data-theme="dark"] .eye-sidebar-item-label {
    color: #f1f5f9;
}

:root[data-theme="dark"] .eye-sidebar-item-label:hover {
    color: #60a5fa;
}

.eye-sidebar-add-btn {
    font-size: 10px;
    color: #475569;
    text-decoration: none;
    cursor: pointer;
    padding: 1px 4px;
    border-radius: 2px;
}

.eye-sidebar-add-btn:hover {
    background: rgba(37, 99, 235, 0.1);
    color: #2563eb;
}

:root[data-theme="dark"] .eye-sidebar-add-btn {
    color: #94a3b8;
}

.eye-sidebar-item-val {
    font-size: 11px;
    color: #1e293b;
    line-height: 1.3;
}

.eye-sidebar-item-val.muted {
    color: #94a3b8;
}

:root[data-theme="dark"] .eye-sidebar-item-val {
    color: #cbd5e1;
}

:root[data-theme="dark"] .eye-sidebar-item-val.muted {
    color: #64748b;
}

.eye-sidebar-item-val.allergy {
    color: #dc2626 !important;
    font-weight: 600;
}

:root[data-theme="dark"] .eye-sidebar-item-val.allergy {
    color: #f87171 !important;
}
`;

export function renderEyeExamHtml(encounter, patient) {
    const pName = [patient?.first_name, patient?.middle_name, patient?.last_name].filter(Boolean).join(" ") || "Patient";
    const dob = patient?.birthdate ? patient.birthdate.slice(0, 10) : (patient?.date_of_birth ? patient.date_of_birth.slice(0, 10) : "-");
    const dos = encounter?.date_of_service ? encounter.date_of_service.slice(0, 10) : "-";
    const provider = encounter?.encounter_provider_name || encounter?.provider_name || "Unassigned";
    const reason = encounter?.reason_for_visit || encounter?.reason || "Comprehensive Eye Exam";
    const mrn = patient?.patient_no || "";

    return `
    <style id="eyeExamDynamicStyles">
        ${EYE_EXAM_STYLES}
    </style>

    <div id="eyeExamAlert"></div>

    <div class="eye-exam-container" id="eyeExamMainContainer">
        <!-- Clinical Eye Exam Menubar (Temporarily disabled items) -->
        <div class="eye-exam-menubar" id="eyeExamClinicalMenubar">
            <span class="eye-exam-menu-brand">
                <span class="eye-exam-caduceus-icon" style="font-size: 14px;">⚕</span>
                <span>Eye Exam</span>
            </span>

            <!-- File Dropdown -->
            <div class="eye-exam-menu-dropdown" id="eyeExamMenuDropdownFile">
                <button type="button" class="eye-exam-menu-trigger" data-menu="file">
                    <span>File</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"></path></svg>
                </button>
                <div class="eye-exam-menu-popover">
                    <button type="button" class="eye-exam-menu-item disabled" title="Feature temporarily unavailable">
                        <span>Print Report</span>
                    </button>
                    <button type="button" class="eye-exam-menu-item disabled" title="Feature temporarily unavailable">
                        <span>Save Report as PDF</span>
                    </button>
                </div>
            </div>

            <!-- Edit Dropdown -->
            <div class="eye-exam-menu-dropdown" id="eyeExamMenuDropdownEdit">
                <button type="button" class="eye-exam-menu-trigger" data-menu="edit">
                    <span>Edit</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"></path></svg>
                </button>
                <div class="eye-exam-menu-popover">
                    <button type="button" class="eye-exam-menu-item disabled" title="Feature temporarily unavailable">
                        <span>Default Values</span>
                        <span class="menu-icon">&#9998;</span>
                    </button>
                    <button type="button" class="eye-exam-menu-item disabled" title="Feature temporarily unavailable">
                        <span>Text</span>
                        <span class="menu-shortcut">Ctl-T</span>
                    </button>
                    <button type="button" class="eye-exam-menu-item disabled" title="Feature temporarily unavailable">
                        <span>Draw</span>
                        <span class="menu-shortcut">Ctl-D</span>
                    </button>
                    <button type="button" class="eye-exam-menu-item disabled" title="Feature temporarily unavailable">
                        <span>Quick Picks</span>
                        <span class="menu-shortcut">Ctl-B</span>
                    </button>
                    <button type="button" class="eye-exam-menu-item disabled" title="Feature temporarily unavailable">
                        <span>Prior Visits</span>
                        <span class="menu-shortcut">Ctl-P</span>
                    </button>
                    <button type="button" class="eye-exam-menu-item disabled" title="Feature temporarily unavailable">
                        <span>Shorthand</span>
                        <span class="menu-shortcut">Ctl-K</span>
                    </button>
                    <button type="button" class="eye-exam-menu-item disabled" title="Feature temporarily unavailable">
                        <span>Fullscreen</span>
                    </button>
                </div>
            </div>

            <!-- View Dropdown -->
            <div class="eye-exam-menu-dropdown" id="eyeExamMenuDropdownView">
                <button type="button" class="eye-exam-menu-trigger" data-menu="view">
                    <span>View</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"></path></svg>
                </button>
                <div class="eye-exam-menu-popover">
                    <button type="button" class="eye-exam-menu-item disabled" title="Feature temporarily unavailable">
                        <span>HPI</span>
                    </button>
                    <button type="button" class="eye-exam-menu-item disabled" title="Feature temporarily unavailable">
                        <span>PMH</span>
                    </button>
                    <button type="button" class="eye-exam-menu-item disabled" title="Feature temporarily unavailable">
                        <span>External</span>
                    </button>
                    <button type="button" class="eye-exam-menu-item disabled" title="Feature temporarily unavailable">
                        <span>Anterior Segment</span>
                    </button>
                    <button type="button" class="eye-exam-menu-item disabled" title="Feature temporarily unavailable">
                        <span>Posterior Segment</span>
                    </button>
                    <button type="button" class="eye-exam-menu-item disabled" title="Feature temporarily unavailable">
                        <span>Neuro</span>
                    </button>
                    <button type="button" class="eye-exam-menu-item disabled" title="Feature temporarily unavailable">
                        <span>Imp Plan</span>
                    </button>
                    <div style="border-top: 1px solid rgba(147, 197, 253, 0.4); margin: 3px 0;"></div>
                    <button type="button" class="eye-exam-menu-item disabled" title="Feature temporarily unavailable">
                        <span>PMSFH Panel</span>
                        <span class="menu-icon">&#9776;</span>
                    </button>
                    <button type="button" class="eye-exam-menu-item disabled" title="Feature temporarily unavailable">
                        <span>Chart View</span>
                        <span class="menu-icon">&#128100;</span>
                    </button>
                </div>
            </div>

            <!-- Library Dropdown -->
            <div class="eye-exam-menu-dropdown" id="eyeExamMenuDropdownLibrary">
                <button type="button" class="eye-exam-menu-trigger" data-menu="library">
                    <span>Library</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"></path></svg>
                </button>
                <div class="eye-exam-menu-popover">
                    <button type="button" class="eye-exam-menu-item disabled" title="Feature temporarily unavailable">
                        <span>IOP Graph</span>
                    </button>
                </div>
            </div>

            <!-- Help Dropdown -->
            <div class="eye-exam-menu-dropdown" id="eyeExamMenuDropdownHelp">
                <button type="button" class="eye-exam-menu-trigger" data-menu="help">
                    <span>Help</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"></path></svg>
                </button>
                <div class="eye-exam-menu-popover">
                    <button type="button" class="eye-exam-menu-item disabled" title="Feature temporarily unavailable">
                        <span>Clinical Documentation Guide</span>
                    </button>
                    <button type="button" class="eye-exam-menu-item disabled" title="Feature temporarily unavailable">
                        <span>Keyboard Shortcuts</span>
                    </button>
                    <button type="button" class="eye-exam-menu-item disabled" title="Feature temporarily unavailable">
                        <span>About Eye Exam</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Main Layout Row with Optional Vertical PMSFH History Sidebar -->
        <div class="eye-exam-body-layout">
            <div class="eye-exam-main-col">
                <!-- Top Toolbar & Header Banner -->
                <div class="eye-exam-top-actions">
            <div class="eye-exam-header-title-wrap">
                <div class="eye-exam-header-title">
                    <span class="eye-exam-title-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </span>
                    <span class="eye-exam-title-text">Eye Examination &amp; Clinical Vision Documentation</span>
                    <span class="eye-exam-header-badge">Ophthalmology</span>
                </div>
                <div class="eye-exam-meta-strip">
                    <span class="eye-exam-meta-chip">
                        <span class="eye-exam-meta-label">Patient</span>
                        <span class="eye-exam-meta-val">${pName}</span>
                    </span>
                    ${mrn ? `
                    <span class="eye-exam-meta-chip">
                        <span class="eye-exam-meta-label">MRN</span>
                        <span class="eye-exam-meta-val">${mrn}</span>
                    </span>` : ""}
                    <span class="eye-exam-meta-chip">
                        <span class="eye-exam-meta-label">DOB</span>
                        <span class="eye-exam-meta-val">${dob}</span>
                    </span>
                    <span class="eye-exam-meta-chip">
                        <span class="eye-exam-meta-label">DOS</span>
                        <span class="eye-exam-meta-val">${dos}</span>
                    </span>
                    <span class="eye-exam-meta-chip">
                        <span class="eye-exam-meta-label">Provider</span>
                        <span class="eye-exam-meta-val">${provider}</span>
                    </span>
                    <span class="eye-exam-meta-chip eye-exam-meta-chip-reason">
                        <span class="eye-exam-meta-label">Reason</span>
                        <span class="eye-exam-meta-val">${reason}</span>
                    </span>
                </div>
            </div>
            <div class="eye-exam-action-bar">
                <button type="button" class="eye-exam-btn" id="eyeExamDefaultsBtn" title="Fill normal/default findings">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 15 6 6m-6-6v4.8m0-4.8h4.8M9 9l-6-6m6 6V4.2M9 9H4.2"></path></svg>
                    <span>Defaults</span>
                </button>
                <button type="button" class="eye-exam-btn" id="eyeExamQuickPicksBtn" title="Select quick picks">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                    <span>Quick Picks</span>
                </button>
                <button type="button" class="eye-exam-btn" id="eyeExamFirstVisitBtn" title="Set initial baseline visit findings">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                    <span>First Visit: No Prior Records</span>
                </button>
                <button type="button" class="eye-exam-btn eye-exam-btn-primary" id="eyeExamSaveBtn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                    <span>Save Eye Exam</span>
                </button>
            </div>
        </div>

        <!-- Workspace with Side Navigation Rail & Content Area -->
        <div class="eye-exam-workspace">
            <!-- Left Side Navigation Buttons (HPI, PMH, Ext, Ant, Retina, Neuro, Imp) -->
            <nav class="eye-exam-nav-rail" aria-label="Eye Exam Sections">
                <button type="button" class="eye-exam-nav-tab active" data-target="eyeExamSecHpi" title="Click to show/hide HPI section">HPI</button>
                <button type="button" class="eye-exam-nav-tab active" data-target="eyeExamSecPmh" title="Click to show/hide PMH & Meds section">PMH</button>
                <button type="button" class="eye-exam-nav-tab active" data-target="eyeExamSecExt" title="Click to show/hide External Examination">Ext</button>
                <button type="button" class="eye-exam-nav-tab active" data-target="eyeExamSecAnt" title="Click to show/hide Anterior Segment (Slit Lamp)">Ant</button>
                <button type="button" class="eye-exam-nav-tab active" data-target="eyeExamSecRetina" title="Click to show/hide Retina & Posterior Pole">Retina</button>
                <button type="button" class="eye-exam-nav-tab active" data-target="eyeExamSecNeuro" title="Click to show/hide Neuro-Ophthalmology & Motility">Neuro</button>
                <button type="button" class="eye-exam-nav-tab active" data-target="eyeExamSecImp" title="Click to show/hide Impression & Plan">Imp</button>
            </nav>

            <!-- Main Content Area -->
            <div class="eye-exam-content-area">
                <!-- SECTION 1: HPI & PMSFH -->
                <div class="eye-exam-grid-2">
                    <!-- HPI Card -->
                    <div class="eye-exam-card" id="eyeExamSecHpi">
                        <div class="eye-exam-card-header">
                            <span>HPI:</span>
                            <div class="eye-exam-card-actions">
                                <button type="button" class="eye-exam-header-icon-btn" id="eyeExamHpiDoctorBtn" title="Shorthand entry">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="12" cy="7" r="4"></circle>
                                        <path d="M10 19v2m4-2v2"></path>
                                    </svg>
                                </button>
                                <!-- Shorthand Floating Popup -->
                                <div class="eye-shorthand-popup" id="eyeExamShorthandPopup" style="top: 36px; right: 0;">
                                    <div class="eye-shorthand-popup-header">
                                        <div class="eye-shorthand-popup-title">
                                            <span>Shorthand</span>
                                            <button type="button" class="eye-shorthand-info-btn" id="eyeExamShorthandInfoBtn" title="Shorthand Help & Reference">i</button>
                                        </div>
                                        <button type="button" class="eye-shorthand-popup-close" id="eyeExamShorthandCloseBtn" title="Close Shorthand">&times;</button>
                                    </div>
                                    <textarea class="eye-shorthand-textarea" id="eyeExamShorthandInput" placeholder="Field:text;Field:text;"></textarea>
                                </div>
                                <button type="button" class="eye-exam-header-icon-btn" id="eyeExamHpiHistoryBtn" title="HPI Elements / Database">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                                        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                                        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                                    </svg>
                                </button>
                                <button type="button" class="eye-exam-header-icon-btn" id="eyeExamHpiDrawBtn" title="Drawing / Annotation Tool">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"></path>
                                        <path d="M7.07 14.94c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92.92 2.25 1.06 3.12 1 1.86-.14 3.88-1.5 3.88-3.5 0-.83-.67-1.5-1.5-1.5H7.07Z"></path>
                                    </svg>
                                </button>
                                <button type="button" class="eye-exam-header-icon-btn" id="eyeExamHpiClearBtn" title="Hide / Toggle HPI">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <line x1="8" y1="12" x2="16" y2="12" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"></line>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div class="eye-exam-card-body">
                            <div class="eye-exam-pill-tabs" id="eyeExamCcTabs" style="margin-bottom: 12px;">
                                <button type="button" class="eye-exam-pill active" data-tab="cc1">&#10003; CC 1</button>
                                <button type="button" class="eye-exam-pill" data-tab="cc2">CC 2</button>
                                <button type="button" class="eye-exam-pill" data-tab="cc3">CC 3</button>
                            </div>
                            
                            <!-- CC 1 View Panel -->
                            <div class="eye-hpi-view-panel" data-ccpanel="cc1">
                                <div style="margin-bottom: 10px;">
                                    <label style="font-size: 11px; font-weight: 700; display: block; margin-bottom: 3px;" id="eyeExamCcLabel">Chief Complaint 1:</label>
                                    <textarea class="eye-exam-input" id="eyeExam_cc" rows="2" placeholder="Primary complaint (e.g. blurry vision, dryness, eye strain)..."></textarea>
                                </div>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                    <div>
                                        <label style="font-size: 11px; font-weight: 700; display: block; margin-bottom: 3px;">HPI:</label>
                                        <textarea class="eye-exam-input" id="eyeExam_hpi_text" rows="6" placeholder="Onset, location, duration, characteristics, aggravating/relieving factors..."></textarea>
                                    </div>
                                    <div>
                                        <label style="font-size: 11px; font-weight: 700; display: block; margin-bottom: 3px;">Chronic Problems:</label>
                                        <div style="display: flex; flex-direction: column; gap: 6px;">
                                            <div>
                                                <span style="font-size: 9.5px; font-weight: 700; color: #dc2626; display: block; text-align: right;">CHRONIC 1</span>
                                                <textarea class="eye-exam-input" id="eyeExam_chronic_1" rows="1" placeholder="Hypertension..."></textarea>
                                            </div>
                                            <div>
                                                <span style="font-size: 9.5px; font-weight: 700; color: #dc2626; display: block; text-align: right;">CHRONIC 2</span>
                                                <textarea class="eye-exam-input" id="eyeExam_chronic_2" rows="1" placeholder="Diabetes mellitus..."></textarea>
                                            </div>
                                            <div>
                                                <span style="font-size: 9.5px; font-weight: 700; color: #dc2626; display: block; text-align: right;">CHRONIC 3</span>
                                                <textarea class="eye-exam-input" id="eyeExam_chronic_3" rows="1" placeholder="Glaucoma suspect..."></textarea>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div style="text-align: center; font-size: 10.5px; color: #64748b; margin-top: 10px;">
                                    Detailed HPI: &gt; 3 HPI elements OR the status of three chronic/inactive problems
                                </div>
                            </div>

                            <!-- CC 2 View Panel -->
                            <div class="eye-hpi-view-panel" data-ccpanel="cc2" style="display: none;">
                                <div style="margin-bottom: 10px;">
                                    <label style="font-size: 11px; font-weight: 700; display: block; margin-bottom: 3px;">Chief Complaint 2:</label>
                                    <textarea class="eye-exam-input" id="eyeExam_cc2" rows="2" placeholder="Second complaint..."></textarea>
                                </div>
                                <div>
                                    <label style="font-size: 11px; font-weight: 700; display: block; margin-bottom: 3px;">HPI 2:</label>
                                    <textarea class="eye-exam-input" id="eyeExam_hpi2_text" rows="6" placeholder="HPI details for complaint 2..."></textarea>
                                </div>
                            </div>

                            <!-- CC 3 View Panel -->
                            <div class="eye-hpi-view-panel" data-ccpanel="cc3" style="display: none;">
                                <div style="margin-bottom: 10px;">
                                    <label style="font-size: 11px; font-weight: 700; display: block; margin-bottom: 3px;">Chief Complaint 3:</label>
                                    <textarea class="eye-exam-input" id="eyeExam_cc3" rows="2" placeholder="Third complaint..."></textarea>
                                </div>
                                <div>
                                    <label style="font-size: 11px; font-weight: 700; display: block; margin-bottom: 3px;">HPI 3:</label>
                                    <textarea class="eye-exam-input" id="eyeExam_hpi3_text" rows="6" placeholder="HPI details for complaint 3..."></textarea>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- HPI Elements Box (Toggled by Database Button) -->
                    <div class="eye-hpi-elements-card" id="eyeExamHpiElementsCard">
                        <div class="eye-hpi-elements-header">
                            <span class="eye-hpi-elements-title">HPI Elements:</span>
                            <button type="button" class="eye-shorthand-popup-close" id="eyeExamHpiElementsCloseBtn" title="Close HPI Elements">&times;</button>
                        </div>
                        <div class="eye-hpi-elements-tabs" id="eyeExamHpiElementsTabs">
                            <button type="button" class="eye-hpi-tab-btn active" data-hpitab="1">HPI 1</button>
                            <button type="button" class="eye-hpi-tab-btn" data-hpitab="2">HPI 2</button>
                            <button type="button" class="eye-hpi-tab-btn" data-hpitab="3">HPI 3</button>
                        </div>
                        <div class="eye-hpi-elements-body">
                            <!-- HPI 1 Panel -->
                            <div class="eye-hpi-elements-panel" data-hpipanel="1">
                                <div class="eye-hpi-element-row">
                                    <span class="eye-hpi-element-label">Timing:</span>
                                    <textarea class="eye-hpi-element-input" id="eyeExam_elem_timing_1" rows="1"></textarea>
                                    <span class="eye-hpi-element-hint">When and how often?</span>
                                </div>
                                <div class="eye-hpi-element-row">
                                    <span class="eye-hpi-element-label">Context:</span>
                                    <textarea class="eye-hpi-element-input" id="eyeExam_elem_context_1" rows="1"></textarea>
                                    <span class="eye-hpi-element-hint">Does it occur in certain situations?</span>
                                </div>
                                <div class="eye-hpi-element-row">
                                    <span class="eye-hpi-element-label">Severity:</span>
                                    <textarea class="eye-hpi-element-input" id="eyeExam_elem_severity_1" rows="1"></textarea>
                                    <span class="eye-hpi-element-hint">How bad is it? 0-10, mild, mod, severe?</span>
                                </div>
                                <div class="eye-hpi-element-row">
                                    <span class="eye-hpi-element-label">Modifying:</span>
                                    <textarea class="eye-hpi-element-input" id="eyeExam_elem_modifying_1" rows="1"></textarea>
                                    <span class="eye-hpi-element-hint">Does anything make it better? Worse?</span>
                                </div>
                                <div class="eye-hpi-element-row">
                                    <span class="eye-hpi-element-label">Associated:</span>
                                    <textarea class="eye-hpi-element-input" id="eyeExam_elem_associated_1" rows="1"></textarea>
                                    <span class="eye-hpi-element-hint">Anything else occur at the same time?</span>
                                </div>
                                <div class="eye-hpi-element-row">
                                    <span class="eye-hpi-element-label">Location:</span>
                                    <textarea class="eye-hpi-element-input" id="eyeExam_elem_location_1" rows="1"></textarea>
                                    <span class="eye-hpi-element-hint">Where on your body does it occur?</span>
                                </div>
                                <div class="eye-hpi-element-row">
                                    <span class="eye-hpi-element-label">Quality:</span>
                                    <textarea class="eye-hpi-element-input" id="eyeExam_elem_quality_1" rows="1"></textarea>
                                    <span class="eye-hpi-element-hint">eg. aching, burning, radiating pain</span>
                                </div>
                                <div class="eye-hpi-element-row">
                                    <span class="eye-hpi-element-label">Duration:</span>
                                    <textarea class="eye-hpi-element-input" id="eyeExam_elem_duration_1" rows="1"></textarea>
                                    <span class="eye-hpi-element-hint">How long does it last?</span>
                                </div>
                            </div>

                            <!-- HPI 2 Panel -->
                            <div class="eye-hpi-elements-panel" data-hpipanel="2" style="display: none;">
                                <div class="eye-hpi-element-row">
                                    <span class="eye-hpi-element-label">Timing:</span>
                                    <textarea class="eye-hpi-element-input" id="eyeExam_elem_timing_2" rows="1"></textarea>
                                    <span class="eye-hpi-element-hint">When and how often?</span>
                                </div>
                                <div class="eye-hpi-element-row">
                                    <span class="eye-hpi-element-label">Context:</span>
                                    <textarea class="eye-hpi-element-input" id="eyeExam_elem_context_2" rows="1"></textarea>
                                    <span class="eye-hpi-element-hint">Does it occur in certain situations?</span>
                                </div>
                                <div class="eye-hpi-element-row">
                                    <span class="eye-hpi-element-label">Severity:</span>
                                    <textarea class="eye-hpi-element-input" id="eyeExam_elem_severity_2" rows="1"></textarea>
                                    <span class="eye-hpi-element-hint">How bad is it? 0-10, mild, mod, severe?</span>
                                </div>
                                <div class="eye-hpi-element-row">
                                    <span class="eye-hpi-element-label">Modifying:</span>
                                    <textarea class="eye-hpi-element-input" id="eyeExam_elem_modifying_2" rows="1"></textarea>
                                    <span class="eye-hpi-element-hint">Does anything make it better? Worse?</span>
                                </div>
                                <div class="eye-hpi-element-row">
                                    <span class="eye-hpi-element-label">Associated:</span>
                                    <textarea class="eye-hpi-element-input" id="eyeExam_elem_associated_2" rows="1"></textarea>
                                    <span class="eye-hpi-element-hint">Anything else occur at the same time?</span>
                                </div>
                                <div class="eye-hpi-element-row">
                                    <span class="eye-hpi-element-label">Location:</span>
                                    <textarea class="eye-hpi-element-input" id="eyeExam_elem_location_2" rows="1"></textarea>
                                    <span class="eye-hpi-element-hint">Where on your body does it occur?</span>
                                </div>
                                <div class="eye-hpi-element-row">
                                    <span class="eye-hpi-element-label">Quality:</span>
                                    <textarea class="eye-hpi-element-input" id="eyeExam_elem_quality_2" rows="1"></textarea>
                                    <span class="eye-hpi-element-hint">eg. aching, burning, radiating pain</span>
                                </div>
                                <div class="eye-hpi-element-row">
                                    <span class="eye-hpi-element-label">Duration:</span>
                                    <textarea class="eye-hpi-element-input" id="eyeExam_elem_duration_2" rows="1"></textarea>
                                    <span class="eye-hpi-element-hint">How long does it last?</span>
                                </div>
                            </div>

                            <!-- HPI 3 Panel -->
                            <div class="eye-hpi-elements-panel" data-hpipanel="3" style="display: none;">
                                <div class="eye-hpi-element-row">
                                    <span class="eye-hpi-element-label">Timing:</span>
                                    <textarea class="eye-hpi-element-input" id="eyeExam_elem_timing_3" rows="1"></textarea>
                                    <span class="eye-hpi-element-hint">When and how often?</span>
                                </div>
                                <div class="eye-hpi-element-row">
                                    <span class="eye-hpi-element-label">Context:</span>
                                    <textarea class="eye-hpi-element-input" id="eyeExam_elem_context_3" rows="1"></textarea>
                                    <span class="eye-hpi-element-hint">Does it occur in certain situations?</span>
                                </div>
                                <div class="eye-hpi-element-row">
                                    <span class="eye-hpi-element-label">Severity:</span>
                                    <textarea class="eye-hpi-element-input" id="eyeExam_elem_severity_3" rows="1"></textarea>
                                    <span class="eye-hpi-element-hint">How bad is it? 0-10, mild, mod, severe?</span>
                                </div>
                                <div class="eye-hpi-element-row">
                                    <span class="eye-hpi-element-label">Modifying:</span>
                                    <textarea class="eye-hpi-element-input" id="eyeExam_elem_modifying_3" rows="1"></textarea>
                                    <span class="eye-hpi-element-hint">Does anything make it better? Worse?</span>
                                </div>
                                <div class="eye-hpi-element-row">
                                    <span class="eye-hpi-element-label">Associated:</span>
                                    <textarea class="eye-hpi-element-input" id="eyeExam_elem_associated_3" rows="1"></textarea>
                                    <span class="eye-hpi-element-hint">Anything else occur at the same time?</span>
                                </div>
                                <div class="eye-hpi-element-row">
                                    <span class="eye-hpi-element-label">Location:</span>
                                    <textarea class="eye-hpi-element-input" id="eyeExam_elem_location_3" rows="1"></textarea>
                                    <span class="eye-hpi-element-hint">Where on your body does it occur?</span>
                                </div>
                                <div class="eye-hpi-element-row">
                                    <span class="eye-hpi-element-label">Quality:</span>
                                    <textarea class="eye-hpi-element-input" id="eyeExam_elem_quality_3" rows="1"></textarea>
                                    <span class="eye-hpi-element-hint">eg. aching, burning, radiating pain</span>
                                </div>
                                <div class="eye-hpi-element-row">
                                    <span class="eye-hpi-element-label">Duration:</span>
                                    <textarea class="eye-hpi-element-input" id="eyeExam_elem_duration_3" rows="1"></textarea>
                                    <span class="eye-hpi-element-hint">How long does it last?</span>
                                </div>
                            </div>
                        </div>
                        <div class="eye-hpi-elements-footer">
                            Detailed HPI: &gt; 3 HPI elements OR the status of three chronic/inactive problems
                        </div>
                    </div>

                    <!-- HPI Drawing / Sketchpad Card (Toggled by Pencil Button) -->
                    <div class="eye-hpi-draw-card" id="eyeExamHpiDrawCard">
                        <div class="eye-hpi-draw-header">
                            <div class="eye-hpi-draw-toolbar">
                                <!-- Big eraser block tool on the left -->
                                <div class="eye-hpi-draw-eraser-block" id="eyeExamDrawEraser" title="Eraser tool"></div>

                                <!-- Colored pencil tips -->
                                <div class="eye-hpi-draw-pencils" id="eyeExamDrawPencils">
                                    <div class="eye-draw-pencil" data-color="#0284c7" style="background: #0284c7;" title="Cyan/Blue pencil"></div>
                                    <div class="eye-draw-pencil" data-color="#eab308" style="background: #eab308;" title="Yellow pencil"></div>
                                    <div class="eye-draw-pencil" data-color="#ea580c" style="background: #ea580c;" title="Orange pencil"></div>
                                    <div class="eye-draw-pencil" data-color="#854d0e" style="background: #854d0e;" title="Brown pencil"></div>
                                    <div class="eye-draw-pencil" data-color="#dc2626" style="background: #dc2626;" title="Red pencil"></div>
                                    <div class="eye-draw-pencil active" data-color="#18181b" style="background: #18181b;" title="Black pencil"></div>
                                    <div class="eye-draw-pencil" data-color="#ffffff" style="background: #ffffff; border: 1px solid #cbd5e1;" title="White pencil / Cover"></div>
                                </div>

                                <!-- Brush stroke size dots -->
                                <div class="eye-hpi-draw-sizes" id="eyeExamDrawSizes">
                                    <span class="eye-draw-size-dot" data-size="1" style="width: 3px; height: 3px;" title="Fine line (1px)"></span>
                                    <span class="eye-draw-size-dot active" data-size="2.5" style="width: 6px; height: 6px;" title="Normal line (2.5px)"></span>
                                    <span class="eye-draw-size-dot" data-size="4.5" style="width: 8px; height: 8px;" title="Medium line (4.5px)"></span>
                                    <span class="eye-draw-size-dot" data-size="7" style="width: 10px; height: 10px;" title="Thick line (7px)"></span>
                                    <span class="eye-draw-size-dot" data-size="11" style="width: 13px; height: 13px;" title="Extra thick line (11px)"></span>
                                </div>
                            </div>

                            <!-- Header right action icons matching screenshot -->
                            <div class="eye-exam-card-actions" style="margin-bottom: 4px;">
                                <button type="button" class="eye-exam-header-icon-btn" title="Doctor Shorthand">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                </button>
                                <button type="button" class="eye-exam-header-icon-btn" title="Database Elements">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
                                </button>
                                <button type="button" class="eye-exam-header-icon-btn" id="eyeExamHpiDrawCloseBtn" title="Close Drawing Card">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                                </button>
                            </div>
                        </div>

                        <!-- Canvas Workspace with medical template overlay -->
                        <div class="eye-hpi-draw-canvas-container" id="eyeExamHpiCanvasContainer">
                            <!-- HPI Paper Template -->
                            <div class="eye-hpi-draw-paper eye-draw-paper-hpi">
                                <div class="eye-draw-paper-header">
                                    <span>NP</span>
                                    <span>CONSULT</span>
                                    <span>OBS</span>
                                    <span>P/O</span>
                                    <span>OTHER: <span style="border-bottom: 1.5px solid #1e293b; display: inline-block; width: 60px; height: 10px;"></span></span>
                                </div>
                                <div class="eye-draw-paper-field">
                                    Chief complaint:
                                    <span class="eye-draw-paper-line" style="width: calc(100% - 120px);"></span>
                                </div>
                                <div class="eye-draw-paper-field" style="margin-bottom: 60px;">
                                    History:
                                </div>
                                <div style="margin-bottom: 12px;">
                                    <span class="eye-draw-paper-line" style="width: 75%; margin-left: 0; min-width: 200px;"></span>
                                </div>
                                <div class="eye-draw-paper-field" style="display: flex; align-items: center; gap: 8px; margin-bottom: 0;">
                                    <span>ROS:</span>
                                    <span style="display: inline-block; width: 14px; height: 14px; border: 1.8px solid #0f172a; border-radius: 2px;"></span>
                                    <span style="font-weight: 500;">Reviewed</span>
                                </div>
                            </div>

                            <!-- PMSFH Paper Template -->
                            <div class="eye-hpi-draw-paper eye-draw-paper-pmsfh">
                                <div class="eye-draw-paper-field" style="margin-bottom: 10px;">
                                    Referred by:
                                    <span class="eye-draw-paper-line" style="width: calc(100% - 110px); min-width: 200px;"></span>
                                </div>
                                <div class="eye-draw-paper-field" style="display: flex; align-items: center; gap: 8px; margin-bottom: 14px;">
                                    <span style="display: inline-block; width: 14px; height: 14px; border: 1.8px solid #0f172a; border-radius: 2px;"></span>
                                    <span style="font-size: 11px; font-weight: 700;">PMSH/FH/MEDS/ALL/FH/ROS same as</span>
                                    <span style="border-bottom: 1.5px solid #1e293b; display: inline-block; width: 30px; height: 12px;"></span>
                                    <span>/</span>
                                    <span style="border-bottom: 1.5px solid #1e293b; display: inline-block; width: 30px; height: 12px;"></span>
                                    <span>/</span>
                                    <span style="border-bottom: 1.5px solid #1e293b; display: inline-block; width: 30px; height: 12px;"></span>
                                </div>
                                <div style="display: grid; grid-template-columns: 1fr 1fr 1.3fr; gap: 10px; font-size: 11px; font-weight: 700; color: #1e293b; margin-bottom: 16px;">
                                    <div>
                                        <div>PMH:</div>
                                        <div style="margin-top: 36px;">PSH:</div>
                                    </div>
                                    <div>
                                        <div>Meds:</div>
                                        <div style="margin-top: 36px;">FH:</div>
                                    </div>
                                    <div>
                                        <div style="display: flex; align-items: center; justify-content: space-between;">
                                            <span>SocHx:</span>
                                            <span>cigs: <span style="border-bottom: 1.2px solid #1e293b; display: inline-block; width: 20px;"></span>/<span style="border-bottom: 1.2px solid #1e293b; display: inline-block; width: 20px;"></span></span>
                                            <span>ETOH: <span style="border-bottom: 1.2px solid #1e293b; display: inline-block; width: 20px;"></span>/<span style="border-bottom: 1.2px solid #1e293b; display: inline-block; width: 20px;"></span></span>
                                        </div>
                                        <div style="margin-top: 36px;">ALL:</div>
                                    </div>
                                </div>
                            </div>

                            <canvas class="eye-draw-canvas-elem" id="eyeExamHpiDrawCanvas" width="600" height="215"></canvas>
                        </div>

                        <!-- Bottom Action Buttons: Undo, Redo, Revert, New, Blank -->
                        <div class="eye-hpi-draw-footer">
                            <button type="button" class="eye-draw-action-btn" id="eyeExamDrawUndoBtn">Undo</button>
                            <button type="button" class="eye-draw-action-btn" id="eyeExamDrawRedoBtn">Redo</button>
                            <button type="button" class="eye-draw-action-btn" id="eyeExamDrawRevertBtn">Revert</button>
                            <button type="button" class="eye-draw-action-btn" id="eyeExamDrawNewBtn">New</button>
                            <button type="button" class="eye-draw-action-btn" id="eyeExamDrawBlankBtn">Blank</button>
                        </div>
                    </div>

            <!-- PMSFH Card -->
            <div class="eye-exam-card" id="eyeExamSecPmh">
                <div class="eye-exam-card-header">
                    <span>PMSFH:</span>
                    <div class="eye-exam-card-actions">
                        <button type="button" class="eye-exam-header-icon-btn" id="eyeExamPmhDoctorBtn" title="Doctor Shorthand">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                                <path d="M10 19v2m4-2v2"></path>
                            </svg>
                        </button>
                        <button type="button" class="eye-exam-header-icon-btn" id="eyeExamPmhHistoryBtn" title="PMSFH Elements / Database">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                            </svg>
                        </button>
                        <button type="button" class="eye-exam-header-icon-btn" id="eyeExamPmhDrawBtn" title="Drawing / Annotation Tool">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"></path>
                                <path d="M7.07 14.94c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92.92 2.25 1.06 3.12 1 1.86-.14 3.88-1.5 3.88-3.5 0-.83-.67-1.5-1.5-1.5H7.07Z"></path>
                            </svg>
                        </button>
                        <button type="button" class="eye-exam-header-icon-btn" id="eyeExamPmhListBtn" title="List View">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="8" y1="6" x2="21" y2="6"></line>
                                <line x1="8" y1="12" x2="21" y2="12"></line>
                                <line x1="8" y1="18" x2="21" y2="18"></line>
                                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                                <line x1="3" y1="18" x2="3.01" y2="18"></line>
                            </svg>
                        </button>
                        <button type="button" class="eye-exam-header-icon-btn" id="eyeExamPmhClearBtn" title="Collapse / Hide PMSFH">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="8" y1="12" x2="16" y2="12" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"></line>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="eye-exam-card-body">
                    <div class="eye-exam-radio-group">
                        <label class="eye-exam-radio-label"><input type="radio" name="eyeExamPmsfhCat" value="POH" checked> POH</label>
                        <label class="eye-exam-radio-label"><input type="radio" name="eyeExamPmsfhCat" value="POS"> POS</label>
                        <label class="eye-exam-radio-label"><input type="radio" name="eyeExamPmsfhCat" value="EyeM"> EyeM</label>
                        <label class="eye-exam-radio-label"><input type="radio" name="eyeExamPmsfhCat" value="PMH"> PMH</label>
                        <label class="eye-exam-radio-label"><input type="radio" name="eyeExamPmsfhCat" value="Meds"> Meds</label>
                        <label class="eye-exam-radio-label"><input type="radio" name="eyeExamPmsfhCat" value="Surg"> Surg</label>
                        <label class="eye-exam-radio-label"><input type="radio" name="eyeExamPmsfhCat" value="All"> All</label>
                        <label class="eye-exam-radio-label"><input type="radio" name="eyeExamPmsfhCat" value="FH"> FH</label>
                        <label class="eye-exam-radio-label"><input type="radio" name="eyeExamPmsfhCat" value="Soc"> Soc</label>
                        <label class="eye-exam-radio-label"><input type="radio" name="eyeExamPmsfhCat" value="ROS"> ROS</label>
                    </div>

                    <div class="eye-pmh-cream-box">
                        <div style="margin-bottom: 8px;">
                            <label style="font-size: 11px; font-weight: 700; display: block; margin-bottom: 3px;">Medication:</label>
                            <input type="text" class="eye-exam-input" id="eyeExam_medication" placeholder="Name / condition">
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                            <div>
                                <label style="font-size: 11px; font-weight: 700; display: block; margin-bottom: 3px;">Start:</label>
                                <input type="date" class="eye-exam-input" id="eyeExam_med_start">
                            </div>
                            <div>
                                <label style="font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; margin-bottom: 3px;">
                                    <input type="checkbox" id="eyeExam_med_finish_check"> Finish:
                                </label>
                                <input type="date" class="eye-exam-input" id="eyeExam_med_finish">
                            </div>
                        </div>
                        <div style="margin-bottom: 8px;">
                            <label class="eye-exam-radio-label" style="font-weight: 700;"><input type="checkbox" id="eyeExam_is_eye_med"> Eye Med</label>
                        </div>
                        <div>
                            <label style="font-size: 11px; font-weight: 700; display: block; margin-bottom: 3px;">Comments:</label>
                            <textarea class="eye-exam-input" id="eyeExam_pmsfh_comments" rows="3" placeholder="Dosage, instructions, compliance..."></textarea>
                        </div>
                    </div>

                    <button type="button" class="eye-pmh-save-btn" id="eyeExamPmsfhSaveBtn">
                        <span>&#10003; Save</span>
                    </button>
                </div>
            </div>

            <!-- PMSFH Elements / History Card (Toggled by 2nd Button) -->
            <div class="eye-pmsfh-elements-card" id="eyeExamPmsfhElementsCard">
                <div class="eye-pmsfh-elements-grid">
                    <!-- Left Column Card -->
                    <div class="eye-pmsfh-col-card">
                        <div class="eye-pmsfh-item-row">
                            <div class="eye-pmsfh-item-header">
                                <span class="eye-pmsfh-item-label">POH</span>
                                <a href="javascript:void(0)" class="eye-pmsfh-new-link" data-cat="POH">New</a>
                            </div>
                            <textarea class="eye-pmsfh-cream-input" id="eyeExam_elem_poh" rows="1">None</textarea>
                        </div>
                        <div class="eye-pmsfh-item-row">
                            <div class="eye-pmsfh-item-header">
                                <span class="eye-pmsfh-item-label">POS</span>
                                <a href="javascript:void(0)" class="eye-pmsfh-new-link" data-cat="POS">New</a>
                            </div>
                            <textarea class="eye-pmsfh-cream-input" id="eyeExam_elem_pos" rows="1">None</textarea>
                        </div>
                        <div class="eye-pmsfh-item-row">
                            <div class="eye-pmsfh-item-header">
                                <span class="eye-pmsfh-item-label">Eye Medications</span>
                                <a href="javascript:void(0)" class="eye-pmsfh-new-link" data-cat="EyeM">New</a>
                            </div>
                            <textarea class="eye-pmsfh-cream-input" id="eyeExam_elem_eyemeds" rows="1">None</textarea>
                        </div>
                        <div class="eye-pmsfh-item-row" style="margin-bottom: 0;">
                            <div class="eye-pmsfh-item-header">
                                <span class="eye-pmsfh-item-label">Past Medical History</span>
                                <a href="javascript:void(0)" class="eye-pmsfh-new-link" data-cat="PMH">New</a>
                            </div>
                            <textarea class="eye-pmsfh-cream-input" id="eyeExam_elem_pmh" rows="3">Chronic Renal Insufficiency&#10;HTN</textarea>
                        </div>
                    </div>

                    <!-- Right Column Card -->
                    <div class="eye-pmsfh-col-card">
                        <div class="eye-pmsfh-item-row">
                            <div class="eye-pmsfh-item-header">
                                <span class="eye-pmsfh-item-label">Past Surgical History</span>
                                <a href="javascript:void(0)" class="eye-pmsfh-new-link" data-cat="Surg">New</a>
                            </div>
                            <textarea class="eye-pmsfh-cream-input" id="eyeExam_elem_surg" rows="1">None</textarea>
                        </div>
                        <div class="eye-pmsfh-item-row">
                            <div class="eye-pmsfh-item-header">
                                <span class="eye-pmsfh-item-label">Medications</span>
                                <a href="javascript:void(0)" class="eye-pmsfh-new-link" data-cat="Meds">New</a>
                            </div>
                            <textarea class="eye-pmsfh-cream-input" id="eyeExam_elem_meds" rows="2">Lisinopril&#10;Norvasc</textarea>
                        </div>
                        <div class="eye-pmsfh-item-row">
                            <div class="eye-pmsfh-item-header">
                                <span class="eye-pmsfh-item-label">Allergies</span>
                                <a href="javascript:void(0)" class="eye-pmsfh-new-link" data-cat="All">New</a>
                            </div>
                            <textarea class="eye-pmsfh-cream-input eye-pmsfh-allergy-input" id="eyeExam_elem_allergies" rows="1">penicillin</textarea>
                        </div>
                        <div class="eye-pmsfh-item-row">
                            <div class="eye-pmsfh-item-header">
                                <span class="eye-pmsfh-item-label">FH</span>
                                <a href="javascript:void(0)" class="eye-pmsfh-new-link" data-cat="FH">New</a>
                            </div>
                            <textarea class="eye-pmsfh-cream-input" id="eyeExam_elem_fh" rows="1">Negative</textarea>
                        </div>
                        <div class="eye-pmsfh-item-row">
                            <div class="eye-pmsfh-item-header">
                                <span class="eye-pmsfh-item-label">Social</span>
                                <a href="javascript:void(0)" class="eye-pmsfh-new-link" data-cat="Soc">New</a>
                            </div>
                            <textarea class="eye-pmsfh-cream-input" id="eyeExam_elem_soc" rows="2">Marital: single&#10;Occupation: Pen User</textarea>
                        </div>
                        <div class="eye-pmsfh-item-row" style="margin-bottom: 0;">
                            <div class="eye-pmsfh-item-header">
                                <span class="eye-pmsfh-item-label">ROS</span>
                                <a href="javascript:void(0)" class="eye-pmsfh-new-link" data-cat="ROS">New</a>
                            </div>
                            <textarea class="eye-pmsfh-cream-input" id="eyeExam_elem_ros" rows="1">Negative</textarea>
                        </div>
                    </div>
                </div>
            </div>

            <!-- PMSFH Drawing / Sketchpad Card (Toggled by 3rd Button) -->
            <div class="eye-hpi-draw-card eye-pmsfh-draw-card" id="eyeExamPmsfhDrawCard">
                <div class="eye-hpi-draw-header">
                            <div class="eye-hpi-draw-toolbar">
                                <!-- Eraser block tool on the left -->
                                <div class="eye-hpi-draw-eraser-block" id="eyeExamPmsfhDrawEraser" title="Eraser tool"></div>

                                <!-- Colored pencil tips -->
                                <div class="eye-hpi-draw-pencils" id="eyeExamPmsfhDrawPencils">
                                    <div class="eye-draw-pencil" data-color="#0284c7" style="background: #0284c7;" title="Cyan/Blue pencil"></div>
                                    <div class="eye-draw-pencil" data-color="#eab308" style="background: #eab308;" title="Yellow pencil"></div>
                                    <div class="eye-draw-pencil" data-color="#ea580c" style="background: #ea580c;" title="Orange pencil"></div>
                                    <div class="eye-draw-pencil" data-color="#854d0e" style="background: #854d0e;" title="Brown pencil"></div>
                                    <div class="eye-draw-pencil" data-color="#dc2626" style="background: #dc2626;" title="Red pencil"></div>
                                    <div class="eye-draw-pencil active" data-color="#18181b" style="background: #18181b;" title="Black pencil"></div>
                                    <div class="eye-draw-pencil" data-color="#ffffff" style="background: #ffffff; border: 1px solid #cbd5e1;" title="White pencil / Cover"></div>
                                </div>

                                <!-- Brush stroke size dots -->
                                <div class="eye-hpi-draw-sizes" id="eyeExamPmsfhDrawSizes">
                                    <span class="eye-draw-size-dot" data-size="1" style="width: 3px; height: 3px;" title="Fine line (1px)"></span>
                                    <span class="eye-draw-size-dot active" data-size="2.5" style="width: 6px; height: 6px;" title="Normal line (2.5px)"></span>
                                    <span class="eye-draw-size-dot" data-size="4.5" style="width: 8px; height: 8px;" title="Medium line (4.5px)"></span>
                                    <span class="eye-draw-size-dot" data-size="7" style="width: 10px; height: 10px;" title="Thick line (7px)"></span>
                                    <span class="eye-draw-size-dot" data-size="11" style="width: 13px; height: 13px;" title="Extra thick line (11px)"></span>
                                </div>
                            </div>

                            <!-- Header right action icons matching screenshot -->
                            <div class="eye-exam-card-actions" style="margin-bottom: 4px;">
                                <button type="button" class="eye-exam-header-icon-btn" id="eyeExamPmsfhDrawDoctorBtn" title="Doctor Shorthand">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                </button>
                                <button type="button" class="eye-exam-header-icon-btn" id="eyeExamPmsfhDrawHistoryBtn" title="PMSFH Elements / Database">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
                                </button>
                                <button type="button" class="eye-exam-header-icon-btn" id="eyeExamPmsfhDrawCloseBtn" title="Close Drawing Card">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                                </button>
                            </div>
                        </div>

                        <!-- Canvas Workspace with PMSFH medical template overlay -->
                        <div class="eye-hpi-draw-canvas-container" id="eyeExamPmsfhCanvasContainer" style="border: 1.5px solid #94a3b8; border-radius: 8px;">
                            <!-- PMSFH Paper Template matching user screenshot -->
                            <div class="eye-hpi-draw-paper" style="padding: 14px 18px;">
                                <div class="eye-draw-paper-field" style="margin-bottom: 12px;">
                                    Referred by:
                                    <span class="eye-draw-paper-line" style="width: calc(100% - 90px); min-width: 120px;"></span>
                                </div>
                                <div class="eye-draw-paper-field" style="display: flex; align-items: center; gap: 6px; margin-bottom: 14px;">
                                    <span style="display: inline-block; width: 14px; height: 14px; border: 1.8px solid #0f172a; border-radius: 2px;"></span>
                                    <span style="font-size: 10.5px; font-weight: 700; white-space: nowrap;">PMSH/FH/MEDS/ALL/FH/ROS same as</span>
                                    <span style="border-bottom: 1.5px solid #1e293b; display: inline-block; width: 24px; height: 12px;"></span>
                                    <span>/</span>
                                    <span style="border-bottom: 1.5px solid #1e293b; display: inline-block; width: 24px; height: 12px;"></span>
                                    <span>/</span>
                                    <span style="border-bottom: 1.5px solid #1e293b; display: inline-block; width: 24px; height: 12px;"></span>
                                </div>
                                <div style="display: grid; grid-template-columns: 1fr 1fr 1.2fr; gap: 6px; font-size: 10.5px; font-weight: 700; color: #1e293b; margin-bottom: 10px;">
                                    <div>
                                        <div>PMH:</div>
                                        <div style="margin-top: 38px;">PSH:</div>
                                    </div>
                                    <div>
                                        <div>Meds:</div>
                                    </div>
                                    <div>
                                        <div style="display: flex; align-items: center; justify-content: space-between;">
                                            <span>SocHx:</span>
                                            <span>cigs: <span style="border-bottom: 1.2px solid #1e293b; display: inline-block; width: 20px;"></span>/<span style="border-bottom: 1.2px solid #1e293b; display: inline-block; width: 20px;"></span></span>
                                            <span>ETOH: <span style="border-bottom: 1.2px solid #1e293b; display: inline-block; width: 20px;"></span>/<span style="border-bottom: 1.2px solid #1e293b; display: inline-block; width: 20px;"></span></span>
                                        </div>
                                        <div style="margin-top: 26px;">FH:</div>
                                        <div style="margin-top: 10px;">ALL:</div>
                                    </div>
                                </div>
                                <div style="border-bottom: 2px solid #18181b; margin-top: 20px;"></div>
                            </div>

                            <canvas class="eye-draw-canvas-elem" id="eyeExamPmsfhDrawCanvas" width="600" height="215"></canvas>
                        </div>

                        <!-- Bottom Action Buttons: Undo, Redo, Revert, New, Blank -->
                        <div class="eye-hpi-draw-footer">
                            <button type="button" class="eye-draw-action-btn" id="eyeExamPmsfhDrawUndoBtn">Undo</button>
                            <button type="button" class="eye-draw-action-btn" id="eyeExamPmsfhDrawRedoBtn">Redo</button>
                            <button type="button" class="eye-draw-action-btn" id="eyeExamPmsfhDrawRevertBtn">Revert</button>
                            <button type="button" class="eye-draw-action-btn" id="eyeExamPmsfhDrawNewBtn">New</button>
                            <button type="button" class="eye-draw-action-btn" id="eyeExamPmsfhDrawBlankBtn">Blank</button>
                        </div>
                    </div>
                </div>

        <!-- SECTION 2: Physical Exam Strip (Mental Status, Vision, Tension, Amsler, Fields, Pupils) -->
        <div class="eye-exam-card">
            <div class="eye-exam-card-header">
                <span>Physical Exam Strip: Vision, Tension, Visual Fields & Pupils</span>
            </div>
            <div class="eye-exam-card-body" style="padding: 10px;">
                <div class="eye-exam-strip">
                    <!-- Mental Status -->
                    <div class="eye-exam-strip-box">
                        <div class="eye-exam-strip-title">Mental Status</div>
                        <div style="display: flex; flex-direction: column; gap: 6px;">
                            <label class="eye-exam-radio-label"><input type="checkbox" id="eyeExam_ms_alert" checked> Alert</label>
                            <label class="eye-exam-radio-label"><input type="checkbox" id="eyeExam_ms_oriented" checked> Oriented TPP</label>
                            <label class="eye-exam-radio-label"><input type="checkbox" id="eyeExam_ms_mood" checked> Mood/Affect Nml</label>
                        </div>
                    </div>

                    <!-- Vision Table -->
                    <div class="eye-exam-strip-box" style="flex: 2; min-width: 380px;">
                        <div class="eye-exam-strip-title">
                            <span>Vision / Refraction</span>
                            <span style="font-size: 10px; font-weight: normal; color: var(--text-muted);">OD (Right) / OS (Left)</span>
                        </div>
                        <table class="eye-exam-table">
                            <thead>
                                <tr>
                                    <th>Eye</th>
                                    <th>SC</th>
                                    <th>CC</th>
                                    <th>PH</th>
                                    <th>MR / AR</th>
                                    <th>Add</th>
                                    <th>VA</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><span class="eye-od-badge">OD</span></td>
                                    <td><input type="text" class="eye-exam-input" id="eyeExam_vis_sc_od" placeholder="20/40"></td>
                                    <td><input type="text" class="eye-exam-input" id="eyeExam_vis_cc_od" placeholder="20/20"></td>
                                    <td><input type="text" class="eye-exam-input" id="eyeExam_vis_ph_od" placeholder="20/20"></td>
                                    <td><input type="text" class="eye-exam-input" id="eyeExam_vis_mr_od" placeholder="-1.50 -0.50x180"></td>
                                    <td><input type="text" class="eye-exam-input" id="eyeExam_vis_add_od" placeholder="+2.00"></td>
                                    <td><input type="text" class="eye-exam-input" id="eyeExam_vis_va_od" placeholder="20/20"></td>
                                </tr>
                                <tr>
                                    <td><span class="eye-os-badge">OS</span></td>
                                    <td><input type="text" class="eye-exam-input" id="eyeExam_vis_sc_os" placeholder="20/50"></td>
                                    <td><input type="text" class="eye-exam-input" id="eyeExam_vis_cc_os" placeholder="20/20"></td>
                                    <td><input type="text" class="eye-exam-input" id="eyeExam_vis_ph_os" placeholder="20/20"></td>
                                    <td><input type="text" class="eye-exam-input" id="eyeExam_vis_mr_os" placeholder="-1.75 -0.25x175"></td>
                                    <td><input type="text" class="eye-exam-input" id="eyeExam_vis_add_os" placeholder="+2.00"></td>
                                    <td><input type="text" class="eye-exam-input" id="eyeExam_vis_va_os" placeholder="20/20"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Tension / IOP -->
                    <div class="eye-exam-strip-box">
                        <div class="eye-exam-strip-title">Tension (IOP)</div>
                        <div style="margin-bottom: 6px;">
                            <label style="font-size: 11px;">Time:</label>
                            <input type="time" class="eye-exam-input" id="eyeExam_tension_time">
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                            <div>
                                <span class="eye-od-badge">OD</span>
                                <input type="text" class="eye-exam-input" id="eyeExam_tension_od" placeholder="15 mmHg">
                            </div>
                            <div>
                                <span class="eye-os-badge">OS</span>
                                <input type="text" class="eye-exam-input" id="eyeExam_tension_os" placeholder="16 mmHg">
                            </div>
                        </div>
                    </div>

                    <!-- Visual Fields & Amsler -->
                    <div class="eye-exam-strip-box">
                        <div class="eye-exam-strip-title">Fields & Amsler</div>
                        <div style="display: flex; flex-direction: column; gap: 6px; font-size: 11px;">
                            <label class="eye-exam-radio-label"><input type="checkbox" id="eyeExam_fields_ftcf" checked> FTCF Full OD/OS</label>
                            <label class="eye-exam-radio-label"><input type="checkbox" id="eyeExam_amsler_normal" checked> Amsler Normal</label>
                            <input type="text" class="eye-exam-input" id="eyeExam_fields_notes" placeholder="Confrontation notes...">
                        </div>
                    </div>

                    <!-- Pupils -->
                    <div class="eye-exam-strip-box">
                        <div class="eye-exam-strip-title">Pupils (PERRLA)</div>
                        <div style="display: flex; flex-direction: column; gap: 6px; font-size: 11px;">
                            <label class="eye-exam-radio-label"><input type="checkbox" id="eyeExam_pupils_normal" checked> PERRL, No APD</label>
                            <div style="display: flex; gap: 4px; align-items: center;">
                                <span>Size:</span>
                                <input type="text" class="eye-exam-input" id="eyeExam_pupils_od_size" placeholder="OD mm" style="width: 50px;">
                                <span>/</span>
                                <input type="text" class="eye-exam-input" id="eyeExam_pupils_os_size" placeholder="OS mm" style="width: 50px;">
                            </div>
                            <input type="text" class="eye-exam-input" id="eyeExam_pupils_apd" placeholder="APD: None / Trace">
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- SECTION 3: External Exam & Anterior Segment -->
        <div class="eye-exam-grid-2">
            <!-- External Exam Card -->
            <div class="eye-exam-card" id="eyeExamSecExt">
                <div class="eye-exam-card-header">
                    <span>External Exam</span>
                </div>
                <div class="eye-exam-card-body">
                    <table class="eye-exam-table">
                        <thead>
                            <tr>
                                <th>Structure</th>
                                <th style="width: 45%;"><span class="eye-od-badge">OD</span></th>
                                <th style="width: 45%;"><span class="eye-os-badge">OS</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Brow</td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ext_od_brow" value="Normal"></td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ext_os_brow" value="Normal"></td>
                            </tr>
                            <tr>
                                <td>Upper Lids</td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ext_od_upper_lids" value="Normal"></td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ext_os_upper_lids" value="Normal"></td>
                            </tr>
                            <tr>
                                <td>Lower Lids</td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ext_od_lower_lids" value="Normal"></td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ext_os_lower_lids" value="Normal"></td>
                            </tr>
                            <tr>
                                <td>Medial Canthi</td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ext_od_canthi" value="Normal"></td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ext_os_canthi" value="Normal"></td>
                            </tr>
                            <tr>
                                <td>Adnexa</td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ext_od_adnoxa" value="Normal"></td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ext_os_adnoxa" value="Normal"></td>
                            </tr>
                        </tbody>
                    </table>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 8px;">
                        <div>
                            <label style="font-size: 11px;">Lev Fn:</label>
                            <input type="text" class="eye-exam-input" id="eyeExam_ext_lev_fn" placeholder="mm">
                        </div>
                        <div>
                            <label style="font-size: 11px;">MRD:</label>
                            <input type="text" class="eye-exam-input" id="eyeExam_ext_mrd" placeholder="mm">
                        </div>
                        <div>
                            <label style="font-size: 11px;">Vert Fissure:</label>
                            <input type="text" class="eye-exam-input" id="eyeExam_ext_vert_fissure" placeholder="mm">
                        </div>
                    </div>
                    <div style="margin-top: 8px;">
                        <textarea class="eye-exam-input" id="eyeExam_ext_comments" rows="2" placeholder="External exam comments / cranial nerves notes..."></textarea>
                    </div>
                </div>
            </div>

            <!-- Anterior Segment Card -->
            <div class="eye-exam-card" id="eyeExamSecAnt">
                <div class="eye-exam-card-header">
                    <span>Anterior Segment (Slit Lamp)</span>
                </div>
                <div class="eye-exam-card-body">
                    <table class="eye-exam-table">
                        <thead>
                            <tr>
                                <th>Structure</th>
                                <th style="width: 45%;"><span class="eye-od-badge">OD</span></th>
                                <th style="width: 45%;"><span class="eye-os-badge">OS</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Conj / Sclera</td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ant_od_conj" value="Clear / White"></td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ant_os_conj" value="Clear / White"></td>
                            </tr>
                            <tr>
                                <td>Cornea</td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ant_od_cornea" value="Clear, no infiltrate"></td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ant_os_cornea" value="Clear, no infiltrate"></td>
                            </tr>
                            <tr>
                                <td>A/C</td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ant_od_ac" value="Deep & Quiet, no C/F"></td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ant_os_ac" value="Deep & Quiet, no C/F"></td>
                            </tr>
                            <tr>
                                <td>Lens</td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ant_od_lens" value="Clear"></td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ant_os_lens" value="Clear"></td>
                            </tr>
                            <tr>
                                <td>Iris</td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ant_od_iris" value="Flat & Intact, round pupil"></td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ant_os_iris" value="Flat & Intact, round pupil"></td>
                            </tr>
                        </tbody>
                    </table>
                    <div style="margin-top: 8px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                        <span style="font-weight: 600; font-size: 11px;">Dilation:</span>
                        <label class="eye-exam-radio-label"><input type="checkbox" id="eyeExam_dil_trop"> Tropicamide 1%</label>
                        <label class="eye-exam-radio-label"><input type="checkbox" id="eyeExam_dil_phen"> Phenylephrine 2.5%</label>
                        <label class="eye-exam-radio-label"><input type="checkbox" id="eyeExam_dil_cyclo"> Cyclopentolate 1%</label>
                        <input type="time" class="eye-exam-input" id="eyeExam_dil_time" style="width: 100px;">
                    </div>
                    <div style="margin-top: 8px;">
                        <textarea class="eye-exam-input" id="eyeExam_ant_comments" rows="2" placeholder="TBUT, Pachymetry, Gonioscopy, Anterior segment comments..."></textarea>
                    </div>
                </div>
            </div>
        </div>

        <!-- SECTION 4: Retina & Neuro Exam -->
        <div class="eye-exam-grid-2">
            <!-- Retina Card -->
            <div class="eye-exam-card" id="eyeExamSecRetina">
                <div class="eye-exam-card-header">
                    <span>Retina / Posterior Pole</span>
                </div>
                <div class="eye-exam-card-body">
                    <table class="eye-exam-table">
                        <thead>
                            <tr>
                                <th>Structure</th>
                                <th style="width: 45%;"><span class="eye-od-badge">OD</span></th>
                                <th style="width: 45%;"><span class="eye-os-badge">OS</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Optic Disc</td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ret_od_disc" value="Pink, Sharp Margins"></td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ret_os_disc" value="Pink, Sharp Margins"></td>
                            </tr>
                            <tr>
                                <td>C/D Ratio</td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ret_od_cd" value="0.30"></td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ret_os_cd" value="0.30"></td>
                            </tr>
                            <tr>
                                <td>Macula</td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ret_od_macula" value="Normal flat, +foveal reflex"></td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ret_os_macula" value="Normal flat, +foveal reflex"></td>
                            </tr>
                            <tr>
                                <td>Vessels</td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ret_od_vessels" value="Normal caliber & course"></td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ret_os_vessels" value="Normal caliber & course"></td>
                            </tr>
                            <tr>
                                <td>Vitreous</td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ret_od_vitreous" value="Clear, syneresis neg"></td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ret_os_vitreous" value="Clear, syneresis neg"></td>
                            </tr>
                            <tr>
                                <td>Periphery</td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ret_od_periph" value="Attached 360, no tears/holes"></td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_ret_os_periph" value="Attached 360, no tears/holes"></td>
                            </tr>
                        </tbody>
                    </table>
                    <div style="margin-top: 8px;">
                        <textarea class="eye-exam-input" id="eyeExam_ret_comments" rows="2" placeholder="Retina findings, OCT CMT, Scleral depression notes..."></textarea>
                    </div>
                </div>
            </div>

            <!-- Neuro & Motility Card -->
            <div class="eye-exam-card" id="eyeExamSecNeuro">
                <div class="eye-exam-card-header">
                    <span>Neuro-Ophthalmology & Motility</span>
                </div>
                <div class="eye-exam-card-body">
                    <div style="display: flex; gap: 12px; margin-bottom: 8px; flex-wrap: wrap;">
                        <label class="eye-exam-radio-label"><input type="checkbox" id="eyeExam_neuro_motility_normal" checked> EOM Full & Smooth (Motility Normal)</label>
                        <label class="eye-exam-radio-label"><input type="checkbox" id="eyeExam_neuro_ortho" checked> Alternate Cover Test: Ortho</label>
                    </div>
                    <table class="eye-exam-table">
                        <thead>
                            <tr>
                                <th>Test</th>
                                <th style="width: 45%;"><span class="eye-od-badge">OD</span></th>
                                <th style="width: 45%;"><span class="eye-os-badge">OS</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Color (Ishihara)</td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_neuro_od_color" value="14/14 Ishihara"></td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_neuro_os_color" value="14/14 Ishihara"></td>
                            </tr>
                            <tr>
                                <td>Red Desaturation</td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_neuro_od_red" value="100%"></td>
                                <td><input type="text" class="eye-exam-input" id="eyeExam_neuro_os_red" value="100%"></td>
                            </tr>
                            <tr>
                                <td>Stereopsis</td>
                                <td colspan="2"><input type="text" class="eye-exam-input" id="eyeExam_neuro_stereopsis" value="40 sec of arc (Circles 9/9)"></td>
                            </tr>
                        </tbody>
                    </table>
                    <div style="margin-top: 8px;">
                        <textarea class="eye-exam-input" id="eyeExam_neuro_comments" rows="2" placeholder="NPA, NPC, amplitudes of convergence/divergence, comments..."></textarea>
                    </div>
                </div>
            </div>
        </div>

        <!-- SECTION 5: Impression & Plan -->
        <div class="eye-exam-card" id="eyeExamSecImp">
            <div class="eye-exam-card-header">
                <span>Impression & Plan</span>
            </div>
            <div class="eye-exam-card-body">
                <div class="eye-exam-grid-2">
                    <div>
                        <label style="font-size: 11px; font-weight: 600; display: block; margin-bottom: 3px;">Diagnoses / Impression (New Dx):</label>
                        <textarea class="eye-exam-input" id="eyeExam_impression_new_dx" rows="4" placeholder="1. Myopia with astigmatism (H52.203)&#10;2. Presbyopia (H52.4)&#10;3. Dry eye syndrome (H04.123)"></textarea>
                    </div>
                    <div>
                        <label style="font-size: 11px; font-weight: 600; display: block; margin-bottom: 3px;">Treatment Plan & Next Visit Orders:</label>
                        <textarea class="eye-exam-input" id="eyeExam_impression_orders" rows="4" placeholder="1. Prescribe updated spectacle Rx (OD -1.50 -0.50x180, OS -1.75 -0.25x175, Add +2.00)&#10;2. Artificial tears QID PRN dry eye&#10;3. RTC in 1 year for annual comprehensive exam"></textarea>
                    </div>
                </div>
                <div style="display: flex; justify-content: flex-end; margin-top: 14px; gap: 8px;">
                    <button type="button" class="eye-exam-btn" id="eyeExamCancelBtn">Cancel</button>
                    <button type="button" class="eye-exam-btn eye-exam-btn-primary" id="eyeExamSaveBottomBtn">Save Eye Exam</button>
                </div>
            </div>
        </div>
            </div><!-- /.eye-exam-content-area -->
        </div><!-- /.eye-exam-workspace -->
    </div><!-- /.eye-exam-main-col -->

    <!-- Right: Vertical PMSFH History Sidebar Docked on the Right -->
    <div class="eye-pmsfh-sidebar" id="eyeExamPmsfhSidebar" style="display: none;">
        <div class="eye-pmsfh-sidebar-header">
            <button type="button" class="eye-sidebar-icon-btn" id="eyeExamSidebarDocBtn" title="Document View">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
            </button>
            <button type="button" class="eye-sidebar-icon-btn" id="eyeExamSidebarDbBtn" title="Database History">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
            </button>
            <button type="button" class="eye-sidebar-icon-btn" id="eyeExamSidebarPencilBtn" title="Pencil / Draw">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"></path><path d="M7.07 14.94c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92.92 2.25 1.06 3.12 1 1.86-.14 3.88-1.5 3.88-3.5 0-.83-.67-1.5-1.5-1.5H7.07Z"></path></svg>
            </button>
            <button type="button" class="eye-sidebar-icon-btn" id="eyeExamSidebarDoctorBtn" title="Doctor Shorthand">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle><path d="M10 19v2m4-2v2"></path></svg>
            </button>
            <button type="button" class="eye-sidebar-icon-btn" id="eyeExamSidebarCloseBtn" title="Close Sidebar">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
        <div class="eye-pmsfh-sidebar-body">
            <div class="eye-sidebar-item">
                <div class="eye-sidebar-item-header">
                    <span class="eye-sidebar-item-label" data-cat="POH">POH:</span>
                    <a href="javascript:void(0)" class="eye-sidebar-add-btn" data-cat="POH">Add</a>
                </div>
                <div class="eye-sidebar-item-val muted" id="eyeExam_side_poh">None</div>
            </div>
            <div class="eye-sidebar-item">
                <div class="eye-sidebar-item-header">
                    <span class="eye-sidebar-item-label" data-cat="POS">POS:</span>
                    <a href="javascript:void(0)" class="eye-sidebar-add-btn" data-cat="POS">Add</a>
                </div>
                <div class="eye-sidebar-item-val muted" id="eyeExam_side_pos">None</div>
            </div>
            <div class="eye-sidebar-item">
                <div class="eye-sidebar-item-header">
                    <span class="eye-sidebar-item-label" data-cat="EyeM">Eye Meds:</span>
                    <a href="javascript:void(0)" class="eye-sidebar-add-btn" data-cat="EyeM">Add</a>
                </div>
                <div class="eye-sidebar-item-val muted" id="eyeExam_side_eyemeds">None</div>
            </div>
            <div class="eye-sidebar-item">
                <div class="eye-sidebar-item-header">
                    <span class="eye-sidebar-item-label" data-cat="PMH">PMH:</span>
                    <a href="javascript:void(0)" class="eye-sidebar-add-btn" data-cat="PMH">Add</a>
                </div>
                <div class="eye-sidebar-item-val" id="eyeExam_side_pmh">Chronic Renal<br>Insufficiency<br>HTN</div>
            </div>
            <div class="eye-sidebar-item">
                <div class="eye-sidebar-item-header">
                    <span class="eye-sidebar-item-label" data-cat="Surg">Surgery:</span>
                    <a href="javascript:void(0)" class="eye-sidebar-add-btn" data-cat="Surg">Add</a>
                </div>
                <div class="eye-sidebar-item-val muted" id="eyeExam_side_surg">None</div>
            </div>
            <div class="eye-sidebar-item">
                <div class="eye-sidebar-item-header">
                    <span class="eye-sidebar-item-label" data-cat="Meds">Medication:</span>
                    <a href="javascript:void(0)" class="eye-sidebar-add-btn" data-cat="Meds">Add</a>
                </div>
                <div class="eye-sidebar-item-val" id="eyeExam_side_meds">Lisinopril<br>Norvasc</div>
            </div>
            <div class="eye-sidebar-item">
                <div class="eye-sidebar-item-header">
                    <span class="eye-sidebar-item-label" data-cat="All">Allergy:</span>
                    <a href="javascript:void(0)" class="eye-sidebar-add-btn" data-cat="All">Add</a>
                </div>
                <div class="eye-sidebar-item-val allergy" id="eyeExam_side_allergies" style="color: #dc2626; font-weight: 600;">penicillin</div>
            </div>
            <div class="eye-sidebar-item">
                <div class="eye-sidebar-item-header">
                    <span class="eye-sidebar-item-label" data-cat="Soc">Soc Hx:</span>
                    <a href="javascript:void(0)" class="eye-sidebar-add-btn" data-cat="Soc">Add</a>
                </div>
                <div class="eye-sidebar-item-val" id="eyeExam_side_soc">Marital: single<br>Occupation: Pen User</div>
            </div>
            <div class="eye-sidebar-item">
                <div class="eye-sidebar-item-header">
                    <span class="eye-sidebar-item-label" data-cat="FH">FH:</span>
                    <a href="javascript:void(0)" class="eye-sidebar-add-btn" data-cat="FH">Add</a>
                </div>
                <div class="eye-sidebar-item-val muted" id="eyeExam_side_fh">Negative</div>
            </div>
            <div class="eye-sidebar-item" style="margin-bottom: 0;">
                <div class="eye-sidebar-item-header">
                    <span class="eye-sidebar-item-label" data-cat="ROS">ROS:</span>
                    <a href="javascript:void(0)" class="eye-sidebar-add-btn" data-cat="ROS">Add</a>
                </div>
                <div class="eye-sidebar-item-val muted" id="eyeExam_side_ros">Negative</div>
            </div>
        </div>
    </div><!-- /.eye-pmsfh-sidebar -->
</div><!-- /.eye-exam-body-layout -->

        <!-- Eye Exam Shorthand Help Modal -->
        <div class="eye-help-modal-overlay" id="eyeExamShorthandHelpModal">
            <div class="eye-help-modal-content">
                <div class="eye-help-modal-header">
                    <h3>
                        <span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:#2563eb;color:#ffffff;font-size:12px;font-family:serif;">i</span>
                        <span>Eye Exam Shorthand Help</span>
                    </h3>
                    <button type="button" class="eye-shorthand-popup-close" id="eyeExamHelpModalCloseBtn" style="font-size: 20px; padding: 4px 8px;" title="Close Help">&times;</button>
                </div>
                <div class="eye-help-nav-tabs" id="eyeExamHelpTabs">
                    <button type="button" class="eye-help-tab-link active" data-tab="intro">Introduction (current)</button>
                    <button type="button" class="eye-help-tab-link" data-tab="hpi">HPI</button>
                    <button type="button" class="eye-help-tab-link" data-tab="pmh">PMH</button>
                    <button type="button" class="eye-help-tab-link" data-tab="external">External</button>
                    <button type="button" class="eye-help-tab-link" data-tab="anterior">Anterior Segment</button>
                    <button type="button" class="eye-help-tab-link" data-tab="retina">Retina</button>
                    <button type="button" class="eye-help-tab-link" data-tab="neuro">Neuro</button>
                </div>
                <div class="eye-help-modal-body" id="eyeExamHelpContent">
                    <div class="eye-help-panel" data-panel="intro">
                        <div class="eye-help-quote">
                            "Documenting an exam on paper is faster because we develop our own shorthand."
                        </div>
                        <p>Starting with this "paper" shorthand, we forged an electronic Shorthand, specifically designed for rapid data entry. Using Shorthand, all your findings are entered in one box and automatically distributed across the form upon entry.</p>
                        
                        <h4 style="margin: 14px 0 6px 0; font-size: 13.5px; font-weight: 700;">Syntax:</h4>
                        <div class="eye-help-code-block">
                            Field:text;Field:text;Field:text
                        </div>
                        <p style="margin-bottom: 8px;">The basic syntax is <strong>Field</strong>, followed by a <strong>colon (:)</strong>, followed by your <strong>text findings</strong>, and terminated with a <strong>semi-colon (;)</strong>.</p>
                        <p style="margin-bottom: 8px;">For convenience, pressing <strong>ENTER</strong> automatically converts to a semicolon. Semicolons can also separate multiple findings for the same field.</p>

                        <h4 style="margin: 14px 0 6px 0; font-size: 13.5px; font-weight: 700;">Examples:</h4>
                        <div class="eye-help-code-block" style="line-height: 1.5;">
                            cc:blurred vision; [Enter]<br>
                            hpi:gradual onset over 2 months, worse with reading; [Enter]<br>
                            va:od 20/25, os 20/30; [Enter]<br>
                            iop:od 15, os 16;
                        </div>
                        <p style="margin-top: 10px; font-size: 12px; color: var(--text-muted, #64748b);">Click the tabs above to view specific field codes for HPI, PMH, External, Anterior Segment, Retina, and Neuro sections.</p>
                    </div>

                    <div class="eye-help-panel" data-panel="hpi" style="display: none;">
                        <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700;">HPI Shorthand Fields</h4>
                        <table class="eye-exam-table" style="margin-bottom: 12px;">
                            <thead>
                                <tr><th>Code</th><th>Target Field</th><th>Example</th></tr>
                            </thead>
                            <tbody>
                                <tr><td><code>cc:</code></td><td>Chief Complaint</td><td><code>cc:Distance blur with spectacles;</code></td></tr>
                                <tr><td><code>hpi:</code></td><td>HPI Narrative Details</td><td><code>hpi:Started 2 weeks ago OD only;</code></td></tr>
                                <tr><td><code>chr:</code> / <code>chronic:</code></td><td>Chronic Problems</td><td><code>chr:HTN x 10 yrs, DM type 2;</code></td></tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="eye-help-panel" data-panel="pmh" style="display: none;">
                        <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700;">PMH & Medications Shorthand Fields</h4>
                        <table class="eye-exam-table" style="margin-bottom: 12px;">
                            <thead>
                                <tr><th>Code</th><th>Target Field</th><th>Example</th></tr>
                            </thead>
                            <tbody>
                                <tr><td><code>med:</code> / <code>meds:</code></td><td>Eye Medications</td><td><code>med:Latanoprost 1 gtt QHS OU;</code></td></tr>
                                <tr><td><code>allergies:</code></td><td>Allergies</td><td><code>allergies:NKDA;</code></td></tr>
                                <tr><td><code>fhx:</code></td><td>Family Eye History</td><td><code>fhx:Maternal glaucoma;</code></td></tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="eye-help-panel" data-panel="external" style="display: none;">
                        <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700;">External Exam Shorthand Fields</h4>
                        <table class="eye-exam-table" style="margin-bottom: 12px;">
                            <thead>
                                <tr><th>Code</th><th>Target Field</th><th>Example</th></tr>
                            </thead>
                            <tbody>
                                <tr><td><code>lids:</code></td><td>Lids & Lashes</td><td><code>lids:Clear, no ptosis OU;</code></td></tr>
                                <tr><td><code>conj:</code></td><td>Conjunctiva & Sclera</td><td><code>conj:White and quiet OU;</code></td></tr>
                                <tr><td><code>pupils:</code></td><td>Pupils</td><td><code>pupils:PERRL, no APD;</code></td></tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="eye-help-panel" data-panel="anterior" style="display: none;">
                        <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700;">Anterior Segment (Slit Lamp) Fields</h4>
                        <table class="eye-exam-table" style="margin-bottom: 12px;">
                            <thead>
                                <tr><th>Code</th><th>Target Field</th><th>Example</th></tr>
                            </thead>
                            <tbody>
                                <tr><td><code>cornea:</code></td><td>Cornea findings</td><td><code>cornea:Clear central, no infiltrates;</code></td></tr>
                                <tr><td><code>ac:</code></td><td>Anterior Chamber</td><td><code>ac:Deep and quiet, no cell or flare;</code></td></tr>
                                <tr><td><code>lens:</code></td><td>Lens</td><td><code>lens:1+ NS OU, clear cortex;</code></td></tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="eye-help-panel" data-panel="retina" style="display: none;">
                        <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700;">Retina & Posterior Pole Fields</h4>
                        <table class="eye-exam-table" style="margin-bottom: 12px;">
                            <thead>
                                <tr><th>Code</th><th>Target Field</th><th>Example</th></tr>
                            </thead>
                            <tbody>
                                <tr><td><code>disc:</code> / <code>cd:</code></td><td>Optic Disc / C/D Ratio</td><td><code>disc:Pink, sharp margins, 0.3 OU;</code></td></tr>
                                <tr><td><code>macula:</code></td><td>Macula</td><td><code>macula:Flat, good foveal reflex;</code></td></tr>
                                <tr><td><code>periph:</code></td><td>Periphery</td><td><code>periph:360 flat, no tears or holes;</code></td></tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="eye-help-panel" data-panel="neuro" style="display: none;">
                        <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700;">Neuro-Ophthalmology Fields</h4>
                        <table class="eye-exam-table" style="margin-bottom: 12px;">
                            <thead>
                                <tr><th>Code</th><th>Target Field</th><th>Example</th></tr>
                            </thead>
                            <tbody>
                                <tr><td><code>eom:</code></td><td>Extraocular Motility</td><td><code>eom:Full and smooth, orthophoric;</code></td></tr>
                                <tr><td><code>color:</code></td><td>Color Vision (Ishihara)</td><td><code>color:14/14 Ishihara plates OU;</code></td></tr>
                                <tr><td><code>stereo:</code></td><td>Stereopsis</td><td><code>stereo:40 seconds of arc;</code></td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div><!-- /.eye-help-modal-overlay -->

        <!-- PMSFH Medical History List View Modal -->
        <div class="eye-pmsfh-list-overlay" id="eyeExamPmsfhListModal">
            <div class="eye-pmsfh-list-content">
                <div class="eye-pmsfh-list-header">
                    <h3>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="8" y1="6" x2="21" y2="6"></line>
                            <line x1="8" y1="12" x2="21" y2="12"></line>
                            <line x1="8" y1="18" x2="21" y2="18"></line>
                            <line x1="3" y1="6" x2="3.01" y2="6"></line>
                            <line x1="3" y1="12" x2="3.01" y2="12"></line>
                            <line x1="3" y1="18" x2="3.01" y2="18"></line>
                        </svg>
                        <span>PMSFH Records &amp; Medical History List</span>
                    </h3>
                    <button type="button" class="eye-shorthand-popup-close" id="eyeExamPmsfhListCloseBtn" style="font-size: 20px; padding: 4px 8px;" title="Close List">&times;</button>
                </div>
                <div class="eye-pmsfh-list-nav-tabs" id="eyeExamPmsfhListTabs">
                    <button type="button" class="eye-pmsfh-list-tab active" data-cat="all">All Records</button>
                    <button type="button" class="eye-pmsfh-list-tab" data-cat="POH">POH</button>
                    <button type="button" class="eye-pmsfh-list-tab" data-cat="POS">POS</button>
                    <button type="button" class="eye-pmsfh-list-tab" data-cat="EyeM">Eye Meds</button>
                    <button type="button" class="eye-pmsfh-list-tab" data-cat="PMH">PMH</button>
                    <button type="button" class="eye-pmsfh-list-tab" data-cat="Surg">Surgery</button>
                    <button type="button" class="eye-pmsfh-list-tab" data-cat="Meds">Medications</button>
                    <button type="button" class="eye-pmsfh-list-tab" data-cat="All">Allergies</button>
                    <button type="button" class="eye-pmsfh-list-tab" data-cat="Soc">Social</button>
                    <button type="button" class="eye-pmsfh-list-tab" data-cat="FH">FH</button>
                    <button type="button" class="eye-pmsfh-list-tab" data-cat="ROS">ROS</button>
                </div>
                <div class="eye-pmsfh-list-body">
                    <table class="eye-pmsfh-list-table">
                        <thead>
                            <tr>
                                <th style="width: 110px;">Category</th>
                                <th style="width: 220px;">Name / Condition</th>
                                <th style="width: 140px;">Dates</th>
                                <th>Details / Instructions</th>
                                <th style="width: 90px; text-align: center;">Action</th>
                            </tr>
                        </thead>
                        <tbody id="eyeExamPmsfhListTableBody">
                            <!-- Populated dynamically via JS or initial defaults -->
                            <tr data-cat="PMH">
                                <td><span class="eye-pmsfh-list-badge badge-pmh">PMH</span></td>
                                <td><strong>Chronic Renal Insufficiency</strong></td>
                                <td>Onset: 2021-03-15</td>
                                <td>Managed by Nephrology, stable</td>
                                <td style="text-align: center;"><button type="button" class="eye-pmsfh-list-action-btn" data-cat="PMH" data-val="Chronic Renal Insufficiency">Select</button></td>
                            </tr>
                            <tr data-cat="PMH">
                                <td><span class="eye-pmsfh-list-badge badge-pmh">PMH</span></td>
                                <td><strong>Hypertension (HTN)</strong></td>
                                <td>Onset: 2018-06-10</td>
                                <td>Monitored, blood pressure under control</td>
                                <td style="text-align: center;"><button type="button" class="eye-pmsfh-list-action-btn" data-cat="PMH" data-val="HTN">Select</button></td>
                            </tr>
                            <tr data-cat="Meds">
                                <td><span class="eye-pmsfh-list-badge badge-meds">Meds</span></td>
                                <td><strong>Lisinopril</strong></td>
                                <td>Start: 2019-01-01</td>
                                <td>10mg daily oral</td>
                                <td style="text-align: center;"><button type="button" class="eye-pmsfh-list-action-btn" data-cat="Meds" data-val="Lisinopril 10mg daily">Select</button></td>
                            </tr>
                            <tr data-cat="Meds">
                                <td><span class="eye-pmsfh-list-badge badge-meds">Meds</span></td>
                                <td><strong>Norvasc (Amlodipine)</strong></td>
                                <td>Start: 2020-04-12</td>
                                <td>5mg daily oral</td>
                                <td style="text-align: center;"><button type="button" class="eye-pmsfh-list-action-btn" data-cat="Meds" data-val="Norvasc 5mg daily">Select</button></td>
                            </tr>
                            <tr data-cat="All">
                                <td><span class="eye-pmsfh-list-badge badge-all">Allergies</span></td>
                                <td><strong>Penicillin</strong></td>
                                <td>Reported: 2015</td>
                                <td>Rash, hives</td>
                                <td style="text-align: center;"><button type="button" class="eye-pmsfh-list-action-btn" data-cat="All" data-val="Penicillin (rash)">Select</button></td>
                            </tr>
                            <tr data-cat="Soc">
                                <td><span class="eye-pmsfh-list-badge badge-soc">Social</span></td>
                                <td><strong>Marital &amp; Occupational</strong></td>
                                <td>Active</td>
                                <td>Single, Occupation: Pen User, cigs: 0, ETOH: occasional</td>
                                <td style="text-align: center;"><button type="button" class="eye-pmsfh-list-action-btn" data-cat="Soc" data-val="Marital: single, Occupation: Pen User">Select</button></td>
                            </tr>
                            <tr data-cat="FH">
                                <td><span class="eye-pmsfh-list-badge badge-fh">FH</span></td>
                                <td><strong>Family Eye History</strong></td>
                                <td>Reviewed</td>
                                <td>Negative for glaucoma, macular degeneration, or blindness</td>
                                <td style="text-align: center;"><button type="button" class="eye-pmsfh-list-action-btn" data-cat="FH" data-val="Negative">Select</button></td>
                            </tr>
                            <tr data-cat="ROS">
                                <td><span class="eye-pmsfh-list-badge badge-ros">ROS</span></td>
                                <td><strong>Review of Systems</strong></td>
                                <td>Reviewed</td>
                                <td>Negative except as noted in HPI</td>
                                <td style="text-align: center;"><button type="button" class="eye-pmsfh-list-action-btn" data-cat="ROS" data-val="Negative">Select</button></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div><!-- /.eye-pmsfh-list-overlay -->
    </div>
    `;
}
