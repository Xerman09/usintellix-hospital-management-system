export function initHelp() {
    document.querySelectorAll('.help-page-container [data-tab]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = link.getAttribute('data-tab');
            if (typeof window.__openDashboardTab === 'function') {
                window.__openDashboardTab(tabId, 'Privacy Policy & HIPAA Notice');
            }
        });
    });
}
