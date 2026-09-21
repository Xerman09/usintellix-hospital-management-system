export function initTermsConditions(options = {}) {
    setupPrintAction();
    setupNavigationScroll();
    setupBackAction();
}

function setupPrintAction() {
    const printBtn = document.getElementById('btnTermsPrint');
    if (printBtn) {
        printBtn.onclick = () => {
            window.print();
        };
    }
}

function setupBackAction() {
    const backBtn = document.getElementById('btnTermsBack');
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
    const navItems = document.querySelectorAll('.terms-nav-item a');
    if (!navItems.length) return;

    navItems.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            if (!targetId || targetId === '#') return;

            const targetEl = document.querySelector(targetId);
            if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

                document.querySelectorAll('.terms-nav-item').forEach(item => {
                    item.classList.remove('active');
                });
                link.closest('.terms-nav-item')?.classList.add('active');
            }
        });
    });

    const sections = document.querySelectorAll('.terms-section');
    if ('IntersectionObserver' in window && sections.length) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    document.querySelectorAll('.terms-nav-item').forEach(item => {
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
