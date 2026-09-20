export function initPrivacyPolicy(options = {}) {
    setupPrintAction();
    setupNavigationScroll();
    setupBackAction();
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
