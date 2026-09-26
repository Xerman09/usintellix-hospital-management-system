import { api } from "../../core/api.js";

export function initPrivacyPolicy(options = {}) {
    setupPrintAction();
    setupNavigationScroll();
    setupBackAction();
    loadOfficerDesignations();
}

async function loadOfficerDesignations() {
    try {
        const res = await api('/hipaa-officers/public');
        if (res && res.success && res.data) {
            const priv = res.data.privacy_officer;
            const sec = res.data.security_officer;

            if (priv) {
                const nameEl = document.getElementById('nppPrivacyOfficerName');
                if (nameEl && priv.full_name) nameEl.textContent = priv.full_name;

                const titleEl = document.getElementById('nppPrivacyOfficerTitle');
                if (titleEl && priv.title) titleEl.textContent = priv.title;

                const phoneEl = document.getElementById('nppPrivacyOfficerPhone');
                if (phoneEl && priv.phone) {
                    phoneEl.textContent = priv.phone + (priv.extension ? ` / Ext. ${priv.extension}` : '');
                }

                const emailEl = document.getElementById('nppPrivacyOfficerEmail');
                if (emailEl && priv.email) emailEl.textContent = priv.email;

                const addrEl = document.getElementById('nppPrivacyOfficerAddress');
                if (addrEl && priv.physical_office_address) addrEl.textContent = priv.physical_office_address;
            }

            if (sec) {
                const sNameEl = document.getElementById('nppSecurityOfficerName');
                if (sNameEl && sec.full_name) sNameEl.textContent = sec.full_name;

                const sTitleEl = document.getElementById('nppSecurityOfficerTitle');
                if (sTitleEl && sec.title) sTitleEl.textContent = sec.title;

                const sPhoneEl = document.getElementById('nppSecurityOfficerPhone');
                if (sPhoneEl && sec.phone) {
                    sPhoneEl.textContent = sec.phone + (sec.extension ? ` / Ext. ${sec.extension}` : '');
                }

                const sEmailEl = document.getElementById('nppSecurityOfficerEmail');
                if (sEmailEl && sec.email) sEmailEl.textContent = sec.email;

                const sDateEl = document.getElementById('nppSecurityOfficerDate');
                if (sDateEl && sec.appointment_date) {
                    sDateEl.textContent = `Appointed ${sec.appointment_date} (${sec.statutory_citation})`;
                }
            }
        }
    } catch (e) {
        console.warn('Failed to dynamically fetch HIPAA officer designations:', e);
    }
}

function setupPrintAction() {
    const printBtn = document.getElementById('btnPrivacyPrint');
    if (printBtn) {
        printBtn.onclick = () => {
            window.print();
        };
    }
}

function setupBackAction() {
    const backBtn = document.getElementById('btnPrivacyBack');
    if (backBtn) {
        backBtn.onclick = (e) => {
            e.preventDefault();
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.hash = '#/login';
            }
        };
    }
}

function setupNavigationScroll() {
    const navItems = document.querySelectorAll('.privacy-nav-item a');
    if (!navItems.length) return;

    navItems.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            if (!targetId || targetId === '#') return;

            const targetEl = document.querySelector(targetId);
            if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

                // Update active state in sidebar
                document.querySelectorAll('.privacy-nav-item').forEach(item => {
                    item.classList.remove('active');
                });
                link.closest('.privacy-nav-item')?.classList.add('active');
            }
        });
    });

    // Intersection observer to highlight current section while scrolling
    const sections = document.querySelectorAll('.privacy-section');
    if ('IntersectionObserver' in window && sections.length) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    document.querySelectorAll('.privacy-nav-item').forEach(item => {
                        const anchor = item.querySelector('a');
                        if (anchor && anchor.getAttribute('href') === `#${id}`) {
                            item.classList.add('active');
                        } else {
                            item.classList.remove('active');
                        }
                    });
                }
            });
        }, {
            rootMargin: '-10% 0px -70% 0px'
        });

        sections.forEach(s => observer.observe(s));
    }
}
