/**
 * Enterprise Navbar Dropdown & Priority+ Overflow Engine
 *
 * Keeps the dashboard top navbar usable and rock-solid:
 *  1. Priority+ Overflow: Top-level items that exceed available width are moved into a "More" dropdown.
 *  2. Nested Flyouts Inside "More": When a top-level dropdown (Modules, Pharmacy, Procedures, Admin,
 *     Reports, Miscellaneous, Popups, File Management) overflows into "More", hovering or clicking it
 *     keeps "More" open and positions the child flyout menu using `position: fixed` outside `.nav-more-menu`
 *     so it is NEVER clipped by `.nav-more-menu`'s scroll container or scrollbar.
 *  3. Scroll-Safe Dropdowns & Submenus: Long menus scroll smoothly without closing or jumping.
 */

const EDGE_MARGIN = 8;
const CHEVRON = `<svg class="nav-more-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg>`;

let observedNavbar = null;
let resizeObserver = null;
let layoutQueued = false;

// Top-level Dropdown State (including .nav-more)
let activeDropdown = null;
let lockedDropdown = null;
let dropdownCloseTimer = null;

// Nested Flyout Dropdown State (a .nav-dropdown inside .nav-more-menu)
let activeNestedDropdown = null;
let nestedDropdownCloseTimer = null;

// Third-level Submenu State (.dropdown-submenu inside any dropdown)
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

    items.forEach((item) => {
        // Reset any inline fixed coordinates if an item moves back to the top bar
        const sub = item.querySelector?.(":scope > .dropdown-content");
        if (sub) {
            sub.style.position = "";
            sub.style.top = "";
            sub.style.left = "";
            sub.style.right = "";
            sub.style.maxHeight = "";
        }
        links.insertBefore(item, more);
    });
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
/* Dropdown, Nested Flyout & Submenu Interaction Engine                        */
/* -------------------------------------------------------------------------- */

function isNestedInMore(dropdown) {
    return Boolean(dropdown && dropdown.parentElement?.classList.contains("nav-more-menu"));
}

function setupDropdownInteractions(navbar) {
    // 1. Mouseover (bubbling) handles both top-level dropdowns, nested dropdowns inside "More", and submenus
    navbar.addEventListener("mouseover", (e) => {
        // A. Check if hovering a 3rd-level .dropdown-submenu
        const submenu = e.target.closest?.(".dropdown-submenu");
        if (submenu) {
            clearTimeout(submenuCloseTimer);
            clearTimeout(nestedDropdownCloseTimer);
            clearTimeout(dropdownCloseTimer);
            if (activeSubmenu && activeSubmenu !== submenu) {
                closeSubmenu(activeSubmenu);
            }
            openSubmenu(submenu);
            return;
        }

        // B. Check if hovering a .nav-dropdown inside .nav-more-menu (e.g. Modules, Pharmacy, Reports)
        // or a direct link inside a dropdown that is NOT inside a .dropdown-submenu
        const dropdown = e.target.closest?.(".nav-dropdown:not(.nav-profile)");
        if (!dropdown) return;

        // If hovering anywhere inside a dropdown (like a direct <a> link or empty padding) outside of any .dropdown-submenu,
        // close any open 3rd-level submenu immediately so it never lingers on screen!
        if (activeSubmenu && !e.target.closest?.(".dropdown-submenu")) {
            closeSubmenu(activeSubmenu);
        }

        if (isNestedInMore(dropdown)) {
            clearTimeout(dropdownCloseTimer);
            clearTimeout(nestedDropdownCloseTimer);

            const moreDropdown = dropdown.closest(".nav-more");
            if (moreDropdown && activeDropdown !== moreDropdown) {
                openDropdown(moreDropdown, false);
            }

            if (activeNestedDropdown && activeNestedDropdown !== dropdown) {
                closeNestedDropdown(activeNestedDropdown);
            }
            openNestedDropdown(dropdown);
            return;
        }

        // C. Hovering a top-level .nav-dropdown (or .nav-more itself outside of its child .nav-dropdown items)
        if (dropdown.classList.contains("nav-more") && activeNestedDropdown && !e.target.closest?.(".nav-more-menu > .nav-dropdown")) {
            closeNestedDropdown(activeNestedDropdown);
        }

        clearTimeout(dropdownCloseTimer);
        if (activeDropdown && activeDropdown !== dropdown && lockedDropdown !== activeDropdown) {
            closeDropdown(activeDropdown);
        }
        if (!lockedDropdown || lockedDropdown === dropdown) {
            openDropdown(dropdown, false);
        }
    });

    // 2. Mouseout (with grace period so diagonal mouse movement to flyouts never closes the parent)
    navbar.addEventListener("mouseout", (e) => {
        const related = e.relatedTarget;

        const submenu = e.target.closest?.(".dropdown-submenu");
        if (submenu && (!related || !submenu.contains(related))) {
            scheduleCloseSubmenu(submenu, 260);
        }

        const nested = e.target.closest?.(".nav-more-menu > .nav-dropdown");
        if (nested && (!related || !nested.contains(related))) {
            scheduleCloseNestedDropdown(nested, 280);
        }

        const topDropdown = e.target.closest?.("#navbarLinks > .nav-dropdown:not(.nav-profile)");
        if (topDropdown && (!related || !topDropdown.contains(related))) {
            scheduleCloseDropdown(topDropdown, 320);
        }
    });

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

            // If this dropdown is inside "More", toggle its flyout without closing "More"!
            if (isNestedInMore(dropdown)) {
                const moreDropdown = dropdown.closest(".nav-more");
                if (moreDropdown) {
                    openDropdown(moreDropdown, true);
                }
                if (activeNestedDropdown === dropdown && dropdown.classList.contains("nav-open")) {
                    closeNestedDropdown(dropdown);
                } else {
                    if (activeNestedDropdown && activeNestedDropdown !== dropdown) {
                        closeNestedDropdown(activeNestedDropdown);
                    }
                    openNestedDropdown(dropdown);
                }
                return;
            }

            // Otherwise it's a top-level dropdown (or "More" itself)
            if (lockedDropdown === dropdown) {
                lockedDropdown = null;
                closeDropdown(dropdown);
            } else {
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
                    if (activeSubmenu && activeSubmenu !== submenu) {
                        closeSubmenu(activeSubmenu);
                    }
                    openSubmenu(submenu);
                }
            }
        }
    });

    // 4. Wheel scroll containment: scrolling over dropdowns scrolls the menu smoothly, never the page!
    navbar.addEventListener("wheel", (e) => {
        const scrollMenu = e.target.closest(".dropdown-content, .dropdown-submenu-content");
        if (scrollMenu) {
            const hasScroll = scrollMenu.scrollHeight > scrollMenu.clientHeight;
            if (hasScroll) {
                const delta = e.deltaY;
                const atTop = scrollMenu.scrollTop <= 0 && delta < 0;
                const atBottom = Math.ceil(scrollMenu.scrollTop + scrollMenu.clientHeight) >= scrollMenu.scrollHeight && delta > 0;
                if (atTop || atBottom) {
                    e.preventDefault();
                }
            } else {
                e.preventDefault();
            }
        }
    }, { passive: false });

    // 5. Outside click closes all menus
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".nav-dropdown") && !e.target.closest(".dropdown-submenu-content")) {
            closeAllMenus();
        }
    });

    // 6. Escape key closes menus
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
        positionTopDropdown(dropdown, menu);
    }
}

function scheduleCloseDropdown(dropdown, delay = 320) {
    if (lockedDropdown === dropdown) return;

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

    if (activeNestedDropdown && dropdown.contains(activeNestedDropdown)) {
        closeNestedDropdown(activeNestedDropdown);
    }
    if (activeSubmenu && dropdown.contains(activeSubmenu)) {
        closeSubmenu(activeSubmenu);
    }

    const menu = dropdown.querySelector(":scope > .dropdown-content");
    if (menu) {
        menu.classList.remove("nav-open-left", "nav-open-right");
    }
}

function openNestedDropdown(dropdown) {
    clearTimeout(nestedDropdownCloseTimer);

    // Ensure all sibling nested dropdowns inside .nav-more-menu and any open 3rd-level submenus are closed first
    if (activeSubmenu && !dropdown.contains(activeSubmenu)) {
        closeSubmenu(activeSubmenu);
    }
    document.querySelectorAll(".nav-more-menu > .nav-dropdown.nav-open").forEach((other) => {
        if (other !== dropdown) {
            closeNestedDropdown(other);
        }
    });

    activeNestedDropdown = dropdown;
    dropdown.classList.add("nav-open");

    const trigger = dropdown.querySelector(":scope > span");
    const menu = dropdown.querySelector(":scope > .dropdown-content");
    if (trigger && menu) {
        positionFlyoutFixed(trigger, menu);
    }
}

function scheduleCloseNestedDropdown(dropdown, delay = 280) {
    clearTimeout(nestedDropdownCloseTimer);
    nestedDropdownCloseTimer = setTimeout(() => {
        if (activeNestedDropdown === dropdown) {
            closeNestedDropdown(dropdown);
        }
    }, delay);
}

function closeNestedDropdown(dropdown) {
    if (!dropdown) return;
    dropdown.classList.remove("nav-open", "nav-locked");
    if (activeNestedDropdown === dropdown) activeNestedDropdown = null;

    if (activeSubmenu && dropdown.contains(activeSubmenu)) {
        closeSubmenu(activeSubmenu);
    }

    const menu = dropdown.querySelector(":scope > .dropdown-content");
    if (menu) {
        menu.style.display = "";
        menu.style.position = "";
        menu.style.top = "";
        menu.style.left = "";
        menu.style.right = "";
    }
}

function openSubmenu(submenu) {
    clearTimeout(submenuCloseTimer);

    // Close all other open 3rd-level submenus so two submenus can never overlap
    document.querySelectorAll(".dropdown-submenu.nav-open").forEach((other) => {
        if (other !== submenu && !other.contains(submenu)) {
            closeSubmenu(other);
        }
    });

    activeSubmenu = submenu;
    submenu.classList.add("nav-open");

    const menu = submenu.querySelector(":scope > .dropdown-submenu-content");
    const trigger = submenu.querySelector(":scope > .dropdown-submenu-trigger");
    if (menu && trigger) {
        positionFlyoutFixed(trigger, menu);
    }
}

function scheduleCloseSubmenu(submenu, delay = 260) {
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
        menu.style.display = "";
        menu.style.top = "";
        menu.style.left = "";
        menu.style.right = "";
    }
}

function closeAllMenus() {
    clearTimeout(dropdownCloseTimer);
    clearTimeout(nestedDropdownCloseTimer);
    clearTimeout(submenuCloseTimer);

    if (activeSubmenu) closeSubmenu(activeSubmenu);
    if (activeNestedDropdown) closeNestedDropdown(activeNestedDropdown);
    if (activeDropdown) closeDropdown(activeDropdown);
    if (lockedDropdown) closeDropdown(lockedDropdown);

    document.querySelectorAll(".nav-dropdown.nav-open, .nav-dropdown.nav-locked").forEach(d => {
        d.classList.remove("nav-open", "nav-locked");
        const m = d.querySelector(":scope > .dropdown-content");
        if (m) m.style.display = "";
    });
    document.querySelectorAll(".dropdown-submenu.nav-open").forEach(s => {
        s.classList.remove("nav-open");
        const sm = s.querySelector(":scope > .dropdown-submenu-content");
        if (sm) sm.style.display = "";
    });
}

function positionTopDropdown(owner, menu) {
    const navBottom = owner.closest(".top-navbar")?.getBoundingClientRect().bottom ?? 56;
    const viewportH = window.innerHeight;
    const viewportW = document.documentElement.clientWidth;

    menu.style.position = "absolute";
    menu.style.top = "100%";
    menu.classList.remove("nav-open-left", "nav-open-right");

    const availableH = viewportH - navBottom - EDGE_MARGIN * 2;
    menu.style.maxHeight = `${Math.floor(availableH)}px`;
    menu.style.overflowY = "auto";

    const rect = menu.getBoundingClientRect();
    if (rect.right > viewportW - EDGE_MARGIN) {
        menu.classList.add("nav-open-left");
    } else if (rect.left < EDGE_MARGIN) {
        menu.classList.add("nav-open-right");
    }
}

/**
 * Positions any flyout menu (either a `.nav-dropdown > .dropdown-content` inside "More",
 * or a `.dropdown-submenu > .dropdown-submenu-content`) using `position: fixed` so it is
 * never clipped by a parent's `overflow-y: auto` scrollbar and never overlaps its parent trigger list.
 */
function positionFlyoutFixed(trigger, menu) {
    const parentMenu = trigger.closest(".dropdown-content, .dropdown-submenu-content");
    const parentRect = parentMenu ? parentMenu.getBoundingClientRect() : trigger.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const viewportW = document.documentElement.clientWidth;

    menu.style.position = "fixed";
    menu.style.display = "flex";
    menu.style.zIndex = trigger.closest(".dropdown-submenu") ? "112" : "108";

    const menuWidth = menu.offsetWidth || 240;
    const menuHeight = menu.offsetHeight || 300;

    // Prefer opening to the LEFT if inside "More" or right-aligned dropdown, provided there is room on the left;
    // otherwise open to the RIGHT of the parent menu container (never overlapping the parent list!).
    const preferLeft = Boolean(trigger.closest(".nav-more-menu") || trigger.closest(".dropdown-right"));
    let left;

    if (preferLeft) {
        if (parentRect.left - menuWidth - 4 >= EDGE_MARGIN) {
            left = parentRect.left - menuWidth - 4;
        } else if (parentRect.right + menuWidth + 4 <= viewportW - EDGE_MARGIN) {
            left = parentRect.right + 4;
        } else {
            left = Math.max(EDGE_MARGIN, parentRect.left - menuWidth - 4);
        }
    } else {
        if (parentRect.right + menuWidth + 4 <= viewportW - EDGE_MARGIN) {
            left = parentRect.right + 4;
        } else {
            left = Math.max(EDGE_MARGIN, parentRect.left - menuWidth - 4);
        }
    }

    let top = triggerRect.top - 4;
    if (top + menuHeight > viewportH - EDGE_MARGIN) {
        top = Math.max(EDGE_MARGIN + 56, viewportH - menuHeight - EDGE_MARGIN);
    }

    menu.style.top = `${Math.floor(top)}px`;
    menu.style.left = `${Math.floor(left)}px`;
    menu.style.right = "auto";
    menu.style.maxHeight = `${Math.floor(viewportH - 64 - EDGE_MARGIN)}px`;
    menu.style.overflowY = "auto";
}
