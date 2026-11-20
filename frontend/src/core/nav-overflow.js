/**
 * Enterprise Navbar Dropdown & Priority+ Overflow Engine
 *
 * Keeps the dashboard top navbar usable, rock-solid, and effortless to navigate:
 *  1. Priority+ Overflow: Top-level items that exceed available width are moved into a "More" dropdown.
 *  2. Nested Flyouts Inside "More": When a top-level dropdown (Modules, Pharmacy, Procedures, Admin,
 *     Reports, Miscellaneous, Popups, File Management) overflows into "More", hovering or clicking it
 *     keeps "More" open and positions the child flyout menu using `position: fixed` outside `.nav-more-menu`
 *     so it is NEVER clipped by `.nav-more-menu`'s scroll container or scrollbar.
 *  3. Intelligent Hover-Intent Triangle Engine: Prevents submenus and nested flyouts from prematurely
 *     collapsing when moving mouse diagonally across sibling items or parent links towards flyout content.
 *  4. Seamless Omni-directional Hit Bridges: 0px dead zones, 2px structural overlap, and 20px hit-slop
 *     bridges ensure the cursor never drops off into the page while hovering nested items.
 *  5. Click-to-Lock Support: Users can click any submenu or dropdown trigger to lock it open for effortless browsing.
 *  6. Scroll-Safe Dropdowns & Submenus: Long menus scroll smoothly with keyboard/wheel containment.
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
let lockedNestedDropdown = null;
let nestedDropdownCloseTimer = null;
let nestedDropdownSwitchTimer = null;

// Submenu Hierarchy State (.dropdown-submenu inside any dropdown or nested flyout)
let activeSubmenus = [];
let lockedSubmenu = null;
let submenuCloseTimer = null;
let submenuSwitchTimer = null;

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
        setupSplitMenus(navbar);
        setupQuickJumpPalette();
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
/* Submenu Hierarchy & Helpers                                                */
/* -------------------------------------------------------------------------- */

function getSubmenuAncestors(submenu) {
    const ancestors = [];
    let curr = submenu.parentElement?.closest(".dropdown-submenu");
    while (curr) {
        ancestors.unshift(curr);
        curr = curr.parentElement?.closest(".dropdown-submenu");
    }
    return ancestors;
}

function closeSubmenuElement(submenu) {
    if (!submenu) return;
    submenu.classList.remove("nav-open", "nav-locked");
    const menu = submenu.querySelector(":scope > .dropdown-submenu-content");
    if (menu) {
        menu.style.display = "";
        menu.style.top = "";
        menu.style.left = "";
        menu.style.right = "";
        menu.classList.remove("nav-flyout-left", "nav-flyout-right");
    }
}

function closeSubmenusExcept(keepSubmenu = null) {
    const keepList = keepSubmenu ? [keepSubmenu, ...getSubmenuAncestors(keepSubmenu)] : [];
    const remaining = [];
    for (const sm of activeSubmenus) {
        if (keepList.includes(sm)) {
            remaining.push(sm);
        } else {
            if (lockedSubmenu === sm && keepSubmenu !== null) {
                lockedSubmenu = null;
            }
            closeSubmenuElement(sm);
        }
    }
    activeSubmenus = remaining;
    if (lockedSubmenu && !activeSubmenus.includes(lockedSubmenu)) {
        lockedSubmenu = null;
    }
}

function openSubmenu(submenu) {
    clearTimeout(submenuCloseTimer);
    clearTimeout(submenuSwitchTimer);

    // Keep all ancestors open, close un-related branches
    closeSubmenusExcept(submenu.parentElement?.closest(".dropdown-submenu"));

    if (!activeSubmenus.includes(submenu)) {
        activeSubmenus.push(submenu);
    }

    submenu.classList.add("nav-open");

    const menu = submenu.querySelector(":scope > .dropdown-submenu-content");
    const trigger = submenu.querySelector(":scope > .dropdown-submenu-trigger");
    if (menu && trigger) {
        positionFlyoutFixed(trigger, menu);
    }
}

function scheduleCloseSubmenus(delay = 320) {
    if (lockedSubmenu) return;
    clearTimeout(submenuCloseTimer);
    submenuCloseTimer = setTimeout(() => {
        if (!lockedSubmenu) {
            closeSubmenusExcept(null);
        }
    }, delay);
}

/* -------------------------------------------------------------------------- */
/* Dropdown, Nested Flyout & Submenu Interaction Engine                        */
/* -------------------------------------------------------------------------- */

function isNestedInMore(dropdown) {
    return Boolean(dropdown && dropdown.parentElement?.classList.contains("nav-more-menu"));
}

function setupDropdownInteractions(navbar) {
    // 1. Mouseover with smart hover intent for deep nested menus
    navbar.addEventListener("mouseover", (e) => {
        // A. Check if hovering inside a .dropdown-submenu (any nesting level)
        const submenu = e.target.closest?.(".dropdown-submenu");
        if (submenu) {
            clearTimeout(submenuCloseTimer);
            clearTimeout(nestedDropdownCloseTimer);
            clearTimeout(dropdownCloseTimer);

            if (activeSubmenus.length > 0) {
                const currentActive = activeSubmenus[activeSubmenus.length - 1];

                // Hovering within currently open submenu or its flyout content
                if (currentActive === submenu || currentActive.contains(e.target)) {
                    clearTimeout(submenuSwitchTimer);
                    return;
                }

                // Hovering a nested child submenu inside current active
                if (currentActive.contains(submenu)) {
                    clearTimeout(submenuSwitchTimer);
                    openSubmenu(submenu);
                    return;
                }

                // Hovering an ancestor submenu (moving back outward)
                if (activeSubmenus.includes(submenu)) {
                    clearTimeout(submenuSwitchTimer);
                    submenuSwitchTimer = setTimeout(() => {
                        closeSubmenusExcept(submenu);
                    }, 180);
                    return;
                }

                // Hovering a sibling or different submenu:
                // Apply generous hover-intent delay so diagonal movement towards the open flyout does not close it!
                clearTimeout(submenuSwitchTimer);
                submenuSwitchTimer = setTimeout(() => {
                    if (!lockedSubmenu || !lockedSubmenu.contains(submenu)) {
                        openSubmenu(submenu);
                    }
                }, 170);
                return;
            }

            // No active submenu open: open immediately
            openSubmenu(submenu);
            return;
        }

        // B. Hovering outside any .dropdown-submenu
        const dropdown = e.target.closest?.(".nav-dropdown:not(.nav-profile)");
        if (!dropdown) return;

        // If hovering a direct link or padding inside a dropdown (outside any submenu),
        // use a grace timer so moving diagonally across links to reach a submenu never breaks it!
        if (activeSubmenus.length > 0 && !lockedSubmenu) {
            clearTimeout(submenuSwitchTimer);
            clearTimeout(submenuCloseTimer);
            submenuCloseTimer = setTimeout(() => {
                if (!lockedSubmenu) {
                    closeSubmenusExcept(null);
                }
            }, 220);
        }

        // C. Hovering inside .nav-more-menu (nested flyouts)
        if (isNestedInMore(dropdown)) {
            clearTimeout(dropdownCloseTimer);
            clearTimeout(nestedDropdownCloseTimer);

            const moreDropdown = dropdown.closest(".nav-more");
            if (moreDropdown && activeDropdown !== moreDropdown) {
                openDropdown(moreDropdown, false);
            }

            if (activeNestedDropdown && activeNestedDropdown !== dropdown && lockedNestedDropdown !== activeNestedDropdown) {
                clearTimeout(nestedDropdownSwitchTimer);
                nestedDropdownSwitchTimer = setTimeout(() => {
                    if (lockedNestedDropdown !== activeNestedDropdown) {
                        closeNestedDropdown(activeNestedDropdown);
                        openNestedDropdown(dropdown);
                    }
                }, 170);
                return;
            }

            if (!activeNestedDropdown) {
                openNestedDropdown(dropdown);
            }
            return;
        }

        // D. Hovering inside .nav-more outside its items
        if (dropdown.classList.contains("nav-more") && activeNestedDropdown) {
            if (!e.target.closest?.(".nav-more-menu > .nav-dropdown")) {
                clearTimeout(nestedDropdownCloseTimer);
                nestedDropdownCloseTimer = setTimeout(() => {
                    if (!lockedNestedDropdown) {
                        closeNestedDropdown(activeNestedDropdown);
                    }
                }, 220);
            }
        }

        // E. Top-level dropdown
        clearTimeout(dropdownCloseTimer);
        if (activeDropdown && activeDropdown !== dropdown && lockedDropdown !== activeDropdown) {
            closeDropdown(activeDropdown);
        }
        if (!lockedDropdown || lockedDropdown === dropdown) {
            openDropdown(dropdown, false);
        }
    });

    // 2. Mouseout (with generous grace period so diagonal mouse paths to flyouts never drop off)
    navbar.addEventListener("mouseout", (e) => {
        const related = e.relatedTarget;

        const submenu = e.target.closest?.(".dropdown-submenu");
        if (submenu && (!related || !submenu.contains(related))) {
            const isStayingInSubmenu = related && (
                related.closest?.(".dropdown-submenu") ||
                related.closest?.(".dropdown-submenu-content")
            );
            if (!isStayingInSubmenu && !lockedSubmenu) {
                scheduleCloseSubmenus(320);
            }
        }

        const nested = e.target.closest?.(".nav-more-menu > .nav-dropdown");
        if (nested && (!related || !nested.contains(related))) {
            if (!lockedNestedDropdown) {
                scheduleCloseNestedDropdown(nested, 320);
            }
        }

        const topDropdown = e.target.closest?.("#navbarLinks > .nav-dropdown:not(.nav-profile)");
        if (topDropdown && (!related || !topDropdown.contains(related))) {
            if (!lockedDropdown) {
                scheduleCloseDropdown(topDropdown, 350);
            }
        }
    });

    // 3. Click to toggle / lock open
    navbar.addEventListener("click", (e) => {
        // Tab link clicked? Close all menus!
        if (e.target.closest("a[data-tab]")) {
            closeAllMenus();
            return;
        }

        // Submenu trigger clicked: lock or unlock submenu open
        const submenuTrigger = e.target.closest(".dropdown-submenu-trigger");
        if (submenuTrigger) {
            e.preventDefault();
            e.stopPropagation();
            const submenu = submenuTrigger.closest(".dropdown-submenu");
            if (submenu) {
                if (lockedSubmenu === submenu) {
                    lockedSubmenu = null;
                    submenu.classList.remove("nav-locked");
                    closeSubmenusExcept(submenu.parentElement?.closest(".dropdown-submenu"));
                } else {
                    if (lockedSubmenu && !lockedSubmenu.contains(submenu) && !submenu.contains(lockedSubmenu)) {
                        lockedSubmenu.classList.remove("nav-locked");
                    }
                    lockedSubmenu = submenu;
                    submenu.classList.add("nav-locked");
                    openSubmenu(submenu);
                }
            }
            return;
        }

        // Dropdown trigger clicked
        const triggerSpan = e.target.closest(".nav-dropdown:not(.nav-profile) > span");
        if (triggerSpan) {
            e.preventDefault();
            e.stopPropagation();
            const dropdown = triggerSpan.closest(".nav-dropdown");

            if (isNestedInMore(dropdown)) {
                const moreDropdown = dropdown.closest(".nav-more");
                if (moreDropdown) {
                    openDropdown(moreDropdown, true);
                }
                if (lockedNestedDropdown === dropdown) {
                    lockedNestedDropdown = null;
                    dropdown.classList.remove("nav-locked");
                    closeNestedDropdown(dropdown);
                } else {
                    if (lockedNestedDropdown && lockedNestedDropdown !== dropdown) {
                        lockedNestedDropdown.classList.remove("nav-locked");
                        closeNestedDropdown(lockedNestedDropdown);
                    }
                    lockedNestedDropdown = dropdown;
                    dropdown.classList.add("nav-locked");
                    openNestedDropdown(dropdown);
                }
                return;
            }

            // Top-level dropdown
            if (lockedDropdown === dropdown) {
                lockedDropdown = null;
                dropdown.classList.remove("nav-locked");
                closeDropdown(dropdown);
            } else {
                if (lockedDropdown && lockedDropdown !== dropdown) {
                    closeDropdown(lockedDropdown);
                }
                openDropdown(dropdown, true);
            }
            return;
        }
    });

    // 4. Wheel scroll containment: scrolling over menus scrolls them smoothly without moving the page
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

    // 6. Escape key closes all menus
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

function scheduleCloseDropdown(dropdown, delay = 350) {
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
    closeSubmenusExcept(null);

    const menu = dropdown.querySelector(":scope > .dropdown-content");
    if (menu) {
        menu.classList.remove("nav-open-left", "nav-open-right");
    }
}

function openNestedDropdown(dropdown) {
    clearTimeout(nestedDropdownCloseTimer);
    clearTimeout(nestedDropdownSwitchTimer);

    closeSubmenusExcept(null);

    document.querySelectorAll(".nav-more-menu > .nav-dropdown.nav-open").forEach((other) => {
        if (other !== dropdown && other !== lockedNestedDropdown) {
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

function scheduleCloseNestedDropdown(dropdown, delay = 320) {
    if (lockedNestedDropdown === dropdown) return;
    clearTimeout(nestedDropdownCloseTimer);
    nestedDropdownCloseTimer = setTimeout(() => {
        if (activeNestedDropdown === dropdown && lockedNestedDropdown !== dropdown) {
            closeNestedDropdown(dropdown);
        }
    }, delay);
}

function closeNestedDropdown(dropdown) {
    if (!dropdown) return;
    dropdown.classList.remove("nav-open", "nav-locked");
    if (activeNestedDropdown === dropdown) activeNestedDropdown = null;
    if (lockedNestedDropdown === dropdown) lockedNestedDropdown = null;

    closeSubmenusExcept(null);

    const menu = dropdown.querySelector(":scope > .dropdown-content");
    if (menu) {
        if (menu.classList.contains("nav-split-menu")) {
            resetSplitMenuFilter(menu);
        }
        menu.style.display = "";
        menu.style.position = "";
        menu.style.top = "";
        menu.style.left = "";
        menu.style.right = "";
        menu.style.maxWidth = "";
        menu.classList.remove("nav-flyout-left", "nav-flyout-right", "nav-open-left", "nav-open-right");
    }
}

function closeAllMenus() {
    clearTimeout(dropdownCloseTimer);
    clearTimeout(nestedDropdownCloseTimer);
    clearTimeout(nestedDropdownSwitchTimer);
    clearTimeout(submenuCloseTimer);
    clearTimeout(submenuSwitchTimer);

    closeSubmenusExcept(null);
    lockedSubmenu = null;

    if (activeNestedDropdown) closeNestedDropdown(activeNestedDropdown);
    lockedNestedDropdown = null;

    if (activeDropdown) closeDropdown(activeDropdown);
    if (lockedDropdown) closeDropdown(lockedDropdown);

    document.querySelectorAll(".nav-dropdown.nav-open, .nav-dropdown.nav-locked").forEach(d => {
        d.classList.remove("nav-open", "nav-locked");
        const m = d.querySelector(":scope > .dropdown-content");
        if (m) {
            m.style.display = "";
            m.style.position = "";
            m.style.top = "";
            m.style.left = "";
            m.style.right = "";
            m.style.maxWidth = "";
            m.classList.remove("nav-flyout-left", "nav-flyout-right", "nav-open-left", "nav-open-right");
        }
    });
    document.querySelectorAll(".dropdown-submenu.nav-open, .dropdown-submenu.nav-locked").forEach(s => {
        s.classList.remove("nav-open", "nav-locked");
        const sm = s.querySelector(":scope > .dropdown-submenu-content");
        if (sm) {
            sm.style.display = "";
            sm.classList.remove("nav-flyout-left", "nav-flyout-right");
        }
    });
}

function positionTopDropdown(owner, menu) {
    const navBottom = owner.closest(".top-navbar")?.getBoundingClientRect().bottom ?? 56;
    const viewportH = window.innerHeight;
    const viewportW = document.documentElement.clientWidth;

    menu.style.position = "absolute";
    menu.style.top = "100%";
    menu.style.left = "";
    menu.style.right = "";
    menu.classList.remove("nav-open-left", "nav-open-right");

    const maxW = viewportW - EDGE_MARGIN * 2;
    menu.style.maxWidth = `${Math.floor(maxW)}px`;

    const availableH = viewportH - navBottom - EDGE_MARGIN * 2;
    menu.style.maxHeight = `${Math.floor(availableH)}px`;
    menu.style.overflowY = "auto";
    menu.style.overscrollBehavior = "contain";

    const rect = menu.getBoundingClientRect();
    if (rect.right > viewportW - EDGE_MARGIN) {
        menu.classList.add("nav-open-left");
        const newRect = menu.getBoundingClientRect();
        if (newRect.left < EDGE_MARGIN) {
            const shift = EDGE_MARGIN - newRect.left;
            menu.style.right = `-${shift}px`;
        }
    } else if (rect.left < EDGE_MARGIN) {
        menu.classList.add("nav-open-right");
        const newRect = menu.getBoundingClientRect();
        if (newRect.right > viewportW - EDGE_MARGIN) {
            const shift = newRect.right - (viewportW - EDGE_MARGIN);
            menu.style.left = `-${shift}px`;
        }
    }
}

function getSubmenuDepth(element) {
    let depth = 1;
    let curr = element;
    while (curr) {
        if (curr.classList && (curr.classList.contains("dropdown-submenu") || curr.classList.contains("nav-dropdown"))) {
            depth++;
        }
        curr = curr.parentElement;
    }
    return depth;
}

/**
 * Positions any flyout menu using `position: fixed` with 2px structural overlap
 * so there is zero gap between trigger containers, preventing mouseout drops.
 */
function positionFlyoutFixed(trigger, menu) {
    const parentMenu = trigger.closest(".dropdown-content, .dropdown-submenu-content");
    const parentRect = parentMenu ? parentMenu.getBoundingClientRect() : trigger.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const viewportW = document.documentElement.clientWidth;

    menu.style.position = "fixed";
    menu.style.display = "flex";

    // Dynamic z-index based on nesting depth so nested submenus always appear on top
    const depth = getSubmenuDepth(trigger);
    menu.style.zIndex = String(1000 + depth * 10);

    const menuWidth = menu.offsetWidth || 240;
    const menuHeight = menu.offsetHeight || 300;

    // Prefer opening to the LEFT if inside "More" or right-aligned dropdown, provided there is room on the left;
    // otherwise open to the RIGHT of the parent menu container.
    const preferLeft = Boolean(trigger.closest(".nav-more-menu") || trigger.closest(".dropdown-right"));
    let left;
    let isLeft = false;

    // Overlap by 2px to eliminate any gap between parent and child menus
    if (preferLeft) {
        if (parentRect.left - menuWidth + 2 >= EDGE_MARGIN) {
            left = parentRect.left - menuWidth + 2;
            isLeft = true;
        } else if (parentRect.right + menuWidth - 2 <= viewportW - EDGE_MARGIN) {
            left = parentRect.right - 2;
            isLeft = false;
        } else {
            left = Math.max(EDGE_MARGIN, parentRect.left - menuWidth + 2);
            isLeft = true;
        }
    } else {
        if (parentRect.right + menuWidth - 2 <= viewportW - EDGE_MARGIN) {
            left = parentRect.right - 2;
            isLeft = false;
        } else if (parentRect.left - menuWidth + 2 >= EDGE_MARGIN) {
            left = parentRect.left - menuWidth + 2;
            isLeft = true;
        } else {
            left = Math.max(EDGE_MARGIN, parentRect.left - menuWidth + 2);
            isLeft = true;
        }
    }

    if (isLeft) {
        menu.classList.add("nav-flyout-left");
        menu.classList.remove("nav-flyout-right");
    } else {
        menu.classList.add("nav-flyout-right");
        menu.classList.remove("nav-flyout-left");
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
    menu.style.overscrollBehavior = "contain";
}

/* -------------------------------------------------------------------------- */
/* Split Mega-Menu Tabs & Live Inline Filter                                  */
/* -------------------------------------------------------------------------- */

function resetSplitMenuFilter(menu) {
    if (!menu) return;
    const filter = menu.querySelector(".nav-split-filter");
    const results = menu.querySelector(".nav-split-search-results");
    if (filter && filter.value) {
        filter.value = "";
    }
    if (results) {
        results.style.display = "none";
        results.innerHTML = "";
    }
    menu.classList.remove("is-filtering");
}

function activateSplitTab(tab) {
    const menu = tab.closest(".nav-split-menu");
    if (!menu) return;
    const targetId = tab.getAttribute("data-split-target");
    if (!targetId) return;

    menu.querySelectorAll(".nav-split-tab").forEach((t) => {
        t.classList.toggle("is-active", t === tab);
    });
    menu.querySelectorAll(".nav-split-pane").forEach((p) => {
        p.classList.toggle("is-active", p.getAttribute("data-split-pane") === targetId);
    });
}

function setupSplitMenus(navbar) {
    // Hovering a left-rail category tab switches the right-side pane immediately
    navbar.addEventListener("mouseover", (e) => {
        const tab = e.target.closest?.(".nav-split-tab");
        if (!tab) return;
        const menu = tab.closest(".nav-split-menu");
        if (menu?.classList.contains("is-filtering")) return;
        activateSplitTab(tab);
    });

    // Clicking a left-rail category tab switches & clears any active filter
    navbar.addEventListener("click", (e) => {
        const tab = e.target.closest?.(".nav-split-tab");
        if (tab) {
            e.preventDefault();
            e.stopPropagation();
            resetSplitMenuFilter(tab.closest(".nav-split-menu"));
            activateSplitTab(tab);
            return;
        }

        const filter = e.target.closest?.(".nav-split-filter");
        if (filter) {
            e.stopPropagation();
            const dropdown = filter.closest(".nav-dropdown");
            if (dropdown) {
                openDropdown(dropdown, true);
            }
            return;
        }

        // Clicking a search result inside the split menu delegates to the real link
        const searchHit = e.target.closest?.(".nav-split-hit");
        if (searchHit) {
            e.preventDefault();
            e.stopPropagation();
            const tabId = searchHit.getAttribute("data-target-tab");
            const menu = searchHit.closest(".nav-split-menu");
            resetSplitMenuFilter(menu);
            closeAllMenus();
            const realLink = menu?.querySelector(`a[data-tab="${CSS.escape(tabId)}"]`) || document.querySelector(`#navbarLinks a[data-tab="${CSS.escape(tabId)}"]`);
            if (realLink) {
                realLink.click();
            } else if (typeof window.__openDashboardTab === "function") {
                window.__openDashboardTab(tabId, searchHit.dataset.targetTitle || tabId);
            }
        }
    });

    // Live filtering across all panes in the current split menu
    navbar.addEventListener("input", (e) => {
        const filter = e.target.closest?.(".nav-split-filter");
        if (!filter) return;

        const menu = filter.closest(".nav-split-menu");
        const resultsEl = menu?.querySelector(".nav-split-search-results");
        if (!menu || !resultsEl) return;

        const q = filter.value.trim().toLowerCase();
        if (!q) {
            resetSplitMenuFilter(menu);
            return;
        }

        menu.classList.add("is-filtering");
        const hits = [];
        menu.querySelectorAll(".nav-split-pane:not(.module-disabled-hidden)").forEach((pane) => {
            const sectionName = pane.getAttribute("data-section-name") || "";
            pane.querySelectorAll("a[data-tab]:not(.module-disabled-hidden)").forEach((link) => {
                const text = link.textContent.trim();
                if (text.toLowerCase().includes(q) || sectionName.toLowerCase().includes(q)) {
                    hits.push({
                        tabId: link.getAttribute("data-tab"),
                        text,
                        section: sectionName,
                        disabled: link.classList.contains("disabled-nav-link")
                    });
                }
            });
        });

        if (!hits.length) {
            resultsEl.innerHTML = `<div class="nav-split-empty">No matching pages found for &ldquo;${escapeHtml(filter.value.trim())}&rdquo;</div>`;
        } else {
            resultsEl.innerHTML = `
                <div class="nav-split-pane-header">Matching Pages (${hits.length})</div>
                <div class="nav-split-grid two-col">
                    ${hits.map((h) => `
                        <button type="button" class="nav-split-hit${h.disabled ? " is-disabled" : ""}" data-target-tab="${escapeHtml(h.tabId)}" data-target-title="${escapeHtml(h.text)}" ${h.disabled ? "disabled" : ""}>
                            <span class="nav-split-hit-title">${escapeHtml(h.text)}</span>
                            <span class="nav-split-hit-sec">${escapeHtml(h.section)}</span>
                        </button>
                    `).join("")}
                </div>
            `;
        }
        resultsEl.style.display = "block";
    });
}

/* -------------------------------------------------------------------------- */
/* Global Ctrl+K Quick Jump Command Palette                                   */
/* -------------------------------------------------------------------------- */

let quickJumpBound = false;

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function collectNavIndex() {
    const linksRoot = document.getElementById("navbarLinks");
    if (!linksRoot) return [];

    const seen = new Set();
    const items = [];

    linksRoot.querySelectorAll("a[data-tab]:not(.module-disabled-hidden)").forEach((a) => {
        const tabId = a.getAttribute("data-tab");
        const title = a.textContent.trim();
        if (!tabId || !title) return;

        const key = `${tabId}::${title}`;
        if (seen.has(key)) return;
        seen.add(key);

        const topDropdown = a.closest("#navbarLinks > .nav-dropdown:not(.nav-more)");
        const topLabel = topDropdown
            ? (topDropdown.querySelector(":scope > span")?.textContent.trim() || "")
            : "Quick Access";

        const pane = a.closest(".nav-split-pane");
        const sectionLabel = pane?.getAttribute("data-section-name")
            || a.closest(".dropdown-content")?.querySelector(".dropdown-section-label")?.textContent.trim()
            || "";

        const breadcrumb = sectionLabel && sectionLabel !== topLabel
            ? `${topLabel} › ${sectionLabel}`
            : topLabel;

        items.push({
            tabId,
            title,
            breadcrumb,
            disabled: a.classList.contains("disabled-nav-link"),
            el: a
        });
    });

    return items;
}

function openQuickJumpModal() {
    closeAllMenus();

    let overlay = document.getElementById("navQuickJumpOverlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "navQuickJumpOverlay";
        overlay.className = "nav-qj-overlay";
        overlay.innerHTML = `
            <div class="nav-qj-modal" role="dialog" aria-modal="true" aria-label="Quick Jump Navigation">
                <div class="nav-qj-input-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>
                    <input type="text" id="navQuickJumpInput" class="nav-qj-input" placeholder="Type a page, report, or module name..." autocomplete="off">
                    <kbd class="nav-qj-esc">ESC</kbd>
                </div>
                <div class="nav-qj-list" id="navQuickJumpList"></div>
                <div class="nav-qj-footer">
                    <span><kbd>↑</kbd> <kbd>↓</kbd> Navigate</span>
                    <span><kbd>Enter</kbd> Open</span>
                    <span><kbd>Esc</kbd> Close</span>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) closeQuickJumpModal();
        });
    }

    const input = overlay.querySelector("#navQuickJumpInput");
    const listEl = overlay.querySelector("#navQuickJumpList");
    const allItems = collectNavIndex();
    let activeIdx = 0;
    let currentMatches = allItems.slice(0, 14);

    function renderMatches() {
        if (!currentMatches.length) {
            listEl.innerHTML = `<div class="nav-qj-empty">No matching navigation pages found.</div>`;
            return;
        }
        listEl.innerHTML = currentMatches.map((item, idx) => `
            <button type="button" class="nav-qj-item${idx === activeIdx ? " is-selected" : ""}${item.disabled ? " is-disabled" : ""}" data-qj-idx="${idx}" ${item.disabled ? "disabled" : ""}>
                <span class="nav-qj-title">${escapeHtml(item.title)}</span>
                <span class="nav-qj-crumb">${escapeHtml(item.breadcrumb)}</span>
            </button>
        `).join("");

        const selectedEl = listEl.querySelector(".nav-qj-item.is-selected");
        selectedEl?.scrollIntoView({ block: "nearest" });
    }

    function launchIndex(idx) {
        const item = currentMatches[idx];
        if (!item || item.disabled) return;
        closeQuickJumpModal();
        if (item.el && document.contains(item.el)) {
            item.el.click();
        } else if (typeof window.__openDashboardTab === "function") {
            window.__openDashboardTab(item.tabId, item.title);
        }
    }

    input.value = "";
    input.oninput = () => {
        const q = input.value.trim().toLowerCase();
        if (!q) {
            currentMatches = allItems.slice(0, 14);
        } else {
            const terms = q.split(/\s+/).filter(Boolean);
            currentMatches = allItems
                .filter((it) => {
                    const hay = `${it.title} ${it.breadcrumb} ${it.tabId}`.toLowerCase();
                    return terms.every((t) => hay.includes(t));
                })
                .slice(0, 24);
        }
        activeIdx = 0;
        renderMatches();
    };

    input.onkeydown = (e) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (currentMatches.length) {
                activeIdx = (activeIdx + 1) % currentMatches.length;
                renderMatches();
            }
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (currentMatches.length) {
                activeIdx = (activeIdx - 1 + currentMatches.length) % currentMatches.length;
                renderMatches();
            }
        } else if (e.key === "Enter") {
            e.preventDefault();
            launchIndex(activeIdx);
        } else if (e.key === "Escape") {
            e.preventDefault();
            closeQuickJumpModal();
        }
    };

    listEl.onclick = (e) => {
        const btn = e.target.closest(".nav-qj-item");
        if (!btn) return;
        launchIndex(Number(btn.getAttribute("data-qj-idx")));
    };

    renderMatches();
    overlay.classList.add("is-open");
    setTimeout(() => input.focus(), 10);
}

function closeQuickJumpModal() {
    const overlay = document.getElementById("navQuickJumpOverlay");
    if (overlay) overlay.classList.remove("is-open");
}

function setupQuickJumpPalette() {
    const btn = document.getElementById("navQuickJumpBtn");
    if (btn && !btn.dataset.qjBound) {
        btn.dataset.qjBound = "1";
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            openQuickJumpModal();
        });
    }

    if (!quickJumpBound) {
        quickJumpBound = true;
        document.addEventListener("keydown", (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                const overlay = document.getElementById("navQuickJumpOverlay");
                if (overlay?.classList.contains("is-open")) {
                    closeQuickJumpModal();
                } else {
                    openQuickJumpModal();
                }
            }
        });
    }
}
