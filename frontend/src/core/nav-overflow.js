/**
 * Enterprise Navbar Dropdown & Priority+ Overflow Engine
 *
 * Keeps the dashboard top navbar usable and rock-solid:
 *  1. Priority+ Overflow: Top-level items that exceed available width are moved into a "More" dropdown.
 *  2. Scroll-Safe Dropdowns: Long menus (Modules, Pharmacy, Admin, Reports) scroll smoothly without
 *     closing or jumping. Wheel events are contained so the background page never scrolls under them.
 *  3. Hover Grace Period & Click-to-Lock: Prevents dropdowns from closing abruptly when scrolling or
 *     moving the mouse diagonally. Users can also click any dropdown to lock it open while browsing.
 *  4. Submenu Positioning: Flyout submenus use fixed coordinate positioning so they are never clipped
 *     by parent scroll containers and automatically adjust if near the viewport edges.
 */

const EDGE_MARGIN = 8;
const CHEVRON = `<svg class="nav-more-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg>`;

let observedNavbar = null;
let resizeObserver = null;
let layoutQueued = false;

// Dropdown State
let activeDropdown = null;
let lockedDropdown = null;
let dropdownCloseTimer = null;

// Submenu State
let activeSubmenu = null;
let submenuCloseTimer = null;

export function initNavOverflow() {
    const links = document.getElementById("navbarLinks");
    const navbar = links?.closest(".top-navbar");

    if (!links || !navbar) return;

    ensureMoreMenu(links);
    layoutNav();

    if (observedNavbar !== navbar) {
        resizeObserver?.disconnect();
        resizeObserver = new ResizeObserver(queueLayout);
        resizeObserver.observe(navbar);
        observedNavbar = navbar;

        setupDropdownInteractions(navbar);
    }
}

function queueLayout() {
    if (layoutQueued) return;
    layoutQueued = true;
    requestAnimationFrame(() => {
        layoutQueued = false;
        layoutNav();
    });
}

function ensureMoreMenu(links) {
    if (links.querySelector(":scope > .nav-more")) return;

    [...links.children].forEach((item, index) => { item.dataset.navOrder = String(index); });

    const more = document.createElement("div");
    more.className = "nav-dropdown nav-more is-empty";
    more.innerHTML = `<span>More${CHEVRON}</span><div class="dropdown-content dropdown-right nav-more-menu"></div>`;
    links.appendChild(more);
}

function layoutNav() {
    const links = document.getElementById("navbarLinks");
    const more = links?.querySelector(":scope > .nav-more");

    if (!links || !more || !links.offsetParent) return;

    const menu = more.querySelector(".nav-more-menu");

    // Put everything back in its original order, then measure the full row.
    const items = [...links.children, ...menu.children]
        .filter((el) => el !== more)
        .sort((a, b) => Number(a.dataset.navOrder) - Number(b.dataset.navOrder));

    items.forEach((item) => links.insertBefore(item, more));
    more.classList.add("is-empty");

    const visible = items.filter((item) => item.getClientRects().length > 0);
    const limit = links.getBoundingClientRect().right;

    if (!visible.length || visible[visible.length - 1].getBoundingClientRect().right <= limit) {
        return;
    }

    more.classList.remove("is-empty");
    const available = limit - more.getBoundingClientRect().width;
    const firstHidden = visible.findIndex((item) => item.getBoundingClientRect().right > available);

    if (firstHidden === -1) {
        visible.slice(-1).forEach((item) => menu.appendChild(item));
    } else {
        visible.slice(firstHidden).forEach((item) => menu.appendChild(item));
    }

    more.classList.toggle("has-active", Boolean(menu.querySelector("a.active")));
}

/* -------------------------------------------------------------------------- */
/* Dropdown & Submenu Robust Interaction Engine                                */
/* -------------------------------------------------------------------------- */

function setupDropdownInteractions(navbar) {
    // 1. Mouseenter on navbar (capture phase for fast response)
    navbar.addEventListener("mouseenter", (e) => {
        const dropdown = e.target.closest?.(".nav-dropdown:not(.nav-profile)");
        if (dropdown) {
            clearTimeout(dropdownCloseTimer);
            if (activeDropdown && activeDropdown !== dropdown && lockedDropdown !== activeDropdown) {
                closeDropdown(activeDropdown);
            }
            if (!lockedDropdown || lockedDropdown === dropdown) {
                openDropdown(dropdown, false);
            }
        }
    }, true);

    // 2. Mouseleave on dropdowns (with 320ms grace period so scrolling or moving doesn't close it)
    navbar.addEventListener("mouseleave", (e) => {
        const dropdown = e.target.closest?.(".nav-dropdown:not(.nav-profile)");
        if (dropdown && dropdown === activeDropdown) {
            scheduleCloseDropdown(dropdown, 320);
        }
    }, true);

    // 3. Click to toggle / lock open
    navbar.addEventListener("click", (e) => {
        // Did the user click a tab link? Close everything!
        if (e.target.closest("a[data-tab]")) {
            closeAllMenus();
            return;
        }

        // Did the user click a dropdown trigger span?
        const triggerSpan = e.target.closest(".nav-dropdown:not(.nav-profile) > span");
        if (triggerSpan) {
            e.preventDefault();
            e.stopPropagation();
            const dropdown = triggerSpan.closest(".nav-dropdown");
            if (lockedDropdown === dropdown) {
                // Unlock and close
                lockedDropdown = null;
                closeDropdown(dropdown);
            } else {
                // Lock this dropdown open
                if (lockedDropdown && lockedDropdown !== dropdown) {
                    closeDropdown(lockedDropdown);
                }
                openDropdown(dropdown, true);
            }
            return;
        }

        // Submenu trigger click
        const submenuTrigger = e.target.closest(".dropdown-submenu-trigger");
        if (submenuTrigger) {
            e.preventDefault();
            e.stopPropagation();
            const submenu = submenuTrigger.closest(".dropdown-submenu");
            if (submenu) {
                if (activeSubmenu === submenu) {
                    closeSubmenu(submenu);
                } else {
                    openSubmenu(submenu);
                }
            }
        }
    });

    // 4. Submenu mouseenter / mouseleave
    navbar.addEventListener("mouseover", (e) => {
        const submenu = e.target.closest?.(".dropdown-submenu");
        if (submenu) {
            clearTimeout(submenuCloseTimer);
            if (activeSubmenu && activeSubmenu !== submenu) {
                closeSubmenu(activeSubmenu);
            }
            openSubmenu(submenu);
        }
    });

    navbar.addEventListener("mouseout", (e) => {
        const submenu = e.target.closest?.(".dropdown-submenu");
        if (submenu && !submenu.contains(e.relatedTarget)) {
            scheduleCloseSubmenu(submenu, 250);
        }
    });

    // 5. Wheel scroll containment: scrolling over dropdowns scrolls the menu smoothly, never the page!
    navbar.addEventListener("wheel", (e) => {
        const scrollMenu = e.target.closest(".dropdown-content, .dropdown-submenu-content");
        if (scrollMenu) {
            const hasScroll = scrollMenu.scrollHeight > scrollMenu.clientHeight;
            if (hasScroll) {
                const delta = e.deltaY;
                const atTop = scrollMenu.scrollTop <= 0 && delta < 0;
                const atBottom = Math.ceil(scrollMenu.scrollTop + scrollMenu.clientHeight) >= scrollMenu.scrollHeight && delta > 0;
                // If hitting the limits, prevent bubbling so the background page never scrolls/jumps!
                if (atTop || atBottom) {
                    e.preventDefault();
                }
            } else {
                e.preventDefault();
            }
        }
    }, { passive: false });

    // 6. Outside click closes all menus
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".nav-dropdown") && !e.target.closest(".dropdown-submenu-content")) {
            closeAllMenus();
        }
    });

    // 7. Escape key closes menus
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeAllMenus();
        }
    });
}

function openDropdown(dropdown, isClick = false) {
    clearTimeout(dropdownCloseTimer);
    activeDropdown = dropdown;

    if (isClick) {
        lockedDropdown = dropdown;
        dropdown.classList.add("nav-locked");
    }

    dropdown.classList.add("nav-open");

    const menu = dropdown.querySelector(":scope > .dropdown-content");
    if (menu) {
        positionDropdown(dropdown, menu);
    }
}

function scheduleCloseDropdown(dropdown, delay = 320) {
    if (lockedDropdown === dropdown) return; // Keep locked menus open while browsing

    clearTimeout(dropdownCloseTimer);
    dropdownCloseTimer = setTimeout(() => {
        if (activeDropdown === dropdown && lockedDropdown !== dropdown) {
            closeDropdown(dropdown);
        }
    }, delay);
}

function closeDropdown(dropdown) {
    if (!dropdown) return;
    dropdown.classList.remove("nav-open", "nav-locked");
    if (activeDropdown === dropdown) activeDropdown = null;
    if (lockedDropdown === dropdown) lockedDropdown = null;

    if (activeSubmenu && dropdown.contains(activeSubmenu)) {
        closeSubmenu(activeSubmenu);
    }

    const menu = dropdown.querySelector(":scope > .dropdown-content");
    if (menu) {
        menu.classList.remove("nav-open-left", "nav-open-right");
    }
}

function openSubmenu(submenu) {
    clearTimeout(submenuCloseTimer);
    activeSubmenu = submenu;
    submenu.classList.add("nav-open");

    const menu = submenu.querySelector(":scope > .dropdown-submenu-content");
    const trigger = submenu.querySelector(":scope > .dropdown-submenu-trigger");
    if (menu && trigger) {
        positionSubmenu(trigger, menu);
    }
}

function scheduleCloseSubmenu(submenu, delay = 250) {
    clearTimeout(submenuCloseTimer);
    submenuCloseTimer = setTimeout(() => {
        if (activeSubmenu === submenu) {
            closeSubmenu(submenu);
        }
    }, delay);
}

function closeSubmenu(submenu) {
    if (!submenu) return;
    submenu.classList.remove("nav-open");
    if (activeSubmenu === submenu) activeSubmenu = null;

    const menu = submenu.querySelector(":scope > .dropdown-submenu-content");
    if (menu) {
        menu.style.top = "";
        menu.style.left = "";
        menu.style.right = "";
    }
}

function closeAllMenus() {
    clearTimeout(dropdownCloseTimer);
    clearTimeout(submenuCloseTimer);

    if (activeSubmenu) closeSubmenu(activeSubmenu);
    if (activeDropdown) closeDropdown(activeDropdown);
    if (lockedDropdown) closeDropdown(lockedDropdown);

    document.querySelectorAll(".nav-dropdown.nav-open, .nav-dropdown.nav-locked").forEach(d => {
        d.classList.remove("nav-open", "nav-locked");
    });
    document.querySelectorAll(".dropdown-submenu.nav-open").forEach(s => {
        s.classList.remove("nav-open");
    });
}

function positionDropdown(owner, menu) {
    const isFlyout = Boolean(owner.closest(".nav-more-menu"));
    const navBottom = owner.closest(".top-navbar")?.getBoundingClientRect().bottom ?? 56;
    const viewportH = window.innerHeight;
    const viewportW = document.documentElement.clientWidth;

    menu.classList.remove("nav-open-left", "nav-open-right");

    // Dynamic Max Height so it always stays within viewport and scrolls vertically
    const availableH = isFlyout
        ? viewportH - navBottom - EDGE_MARGIN * 2
        : viewportH - navBottom - EDGE_MARGIN;

    menu.style.maxHeight = `${Math.floor(availableH)}px`;
    menu.style.overflowY = "auto";

    // Horizontal Boundary Check
    const rect = menu.getBoundingClientRect();
    if (rect.right > viewportW - EDGE_MARGIN) {
        menu.classList.add("nav-open-left");
    } else if (rect.left < EDGE_MARGIN) {
        menu.classList.add("nav-open-right");
    }
}

function positionSubmenu(trigger, menu) {
    const triggerRect = trigger.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const viewportW = document.documentElement.clientWidth;

    // Fixed Positioning (Never clipped by parent overflow-y: auto)
    menu.style.position = "fixed";

    // Measure menu dimensions
    menu.style.display = "flex";
    const menuWidth = menu.offsetWidth || 210;
    const menuHeight = menu.offsetHeight || 280;

    // Horizontal placement:
    // If opening to the right runs off-screen or if parent is right-aligned / inside nav-more-menu:
    let left = triggerRect.right + 2;
    if (left + menuWidth > viewportW - EDGE_MARGIN || trigger.closest(".dropdown-right") || trigger.closest(".nav-more-menu")) {
        left = Math.max(EDGE_MARGIN, triggerRect.left - menuWidth - 2);
    }

    // Vertical placement:
    // Align with trigger top, adjust upward if it would overflow the bottom of the screen
    let top = triggerRect.top - 4;
    if (top + menuHeight > viewportH - EDGE_MARGIN) {
        top = Math.max(EDGE_MARGIN, viewportH - menuHeight - EDGE_MARGIN);
    }

    menu.style.top = `${Math.floor(top)}px`;
    menu.style.left = `${Math.floor(left)}px`;
    menu.style.right = "auto";
    menu.style.maxHeight = `${Math.floor(viewportH - EDGE_MARGIN * 2)}px`;
    menu.style.overflowY = "auto";
}
