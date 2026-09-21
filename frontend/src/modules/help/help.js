export function initHelp() {
    document.querySelectorAll('.help-page-container [data-tab]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = link.getAttribute('data-tab');
            const title = link.getAttribute('data-tab-title') || (tabId === 'terms_conditions' ? 'Terms & Conditions' : 'Privacy Policy & HIPAA Notice');
            if (typeof window.__openDashboardTab === 'function') {
                window.__openDashboardTab(tabId, title);
            }
        });
    });
}
