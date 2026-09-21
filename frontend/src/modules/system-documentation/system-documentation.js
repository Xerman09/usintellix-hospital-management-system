export function initSystemDocumentation(options = {}) {
    setupPrintAction();
    setupBackAction();
    setupNavigationScroll();
    setupSearchFilter();
}

function setupPrintAction() {
    const printBtn = document.getElementById('btnSysdocPrint');
    if (printBtn) {
        printBtn.onclick = () => {
            window.print();
        };
    }
}

function setupBackAction() {
    const backBtn = document.getElementById('btnSysdocBack');
    if (backBtn) {
        backBtn.onclick = (e) => {
            e.preventDefault();
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.hash = '#/dashboard';
            }
        };
    }
}

function setupNavigationScroll() {
    const navItems = document.querySelectorAll('.sysdoc-sidebar a.sysdoc-nav-item');
    if (!navItems.length) return;

    navItems.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            if (!targetId || targetId === '#') return;

            const targetEl = document.querySelector(targetId);
            if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

                navItems.forEach(item => item.classList.remove('active'));
                link.classList.add('active');
            }
        });
    });

    // IntersectionObserver to highlight current active section while scrolling
    const sections = document.querySelectorAll('.sysdoc-content section');
    if ('IntersectionObserver' in window && sections.length) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    navItems.forEach(item => {
                        if (item.getAttribute('href') === `#${id}`) {
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

function setupSearchFilter() {
    const searchInput = document.getElementById('sysdocSearchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const sections = document.querySelectorAll('.sysdoc-content section');
        const navItems = document.querySelectorAll('.sysdoc-sidebar a.sysdoc-nav-item');

        if (!query) {
            sections.forEach(s => s.style.display = '');
            navItems.forEach(n => n.style.display = '');
            return;
        }

        sections.forEach(section => {
            const text = section.innerText.toLowerCase();
            const matches = text.includes(query);
            section.style.display = matches ? '' : 'none';
        });

        navItems.forEach(item => {
            const text = item.innerText.toLowerCase();
            const matches = text.includes(query);
            item.style.display = matches ? '' : 'none';
        });
    });
}
