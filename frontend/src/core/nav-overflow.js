/**
 * Keeps the dashboard's top navbar usable no matter how many menus a
 * role has:
 *
 *  1. "Priority+" overflow -- top-level items that don't fit between the
 *     logo and the search/profile block are moved (as live DOM nodes, so
 *     their click listeners keep working) into a "More" dropdown at the
 *     end of #navbarLinks, and moved back when there's room again.
 *  2. Menu positioning -- every time a dropdown or flyout opens, it is
 *     measured and, if needed, split into columns (too tall for the
 *     screen), opened to the other side (would run off the left/right
 *     edge), or nudged upward (a flyout running off the bottom).
 *
 * The "More" menu lives inside #navbarLinks, so any code that queries
 * `#navbarLinks a[data-tab]` still finds every link.
 */

const EDGE_MARGIN = 8;
const MAX_COLUMNS = 4;

const CHEVRON = `<svg class="nav-more-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg>`;

let observedNavbar = null;
let resizeObserver = null;
let layoutQueued = false;

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

        // mouseenter doesn't bubble, but it does run in the capture phase
        // for every element the pointer enters inside the navbar.
        navbar.addEventListener("mouseenter", onMenuEnter, true);
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

    visible.slice(Math.max(firstHidden, 0)).forEach((item) => menu.appendChild(item));

    more.classList.toggle("has-active", Boolean(menu.querySelector("a.active")));
}

function onMenuEnter(event) {
    const owner = event.target;

    if (!(owner instanceof Element) || !owner.matches(".nav-dropdown:not(.nav-profile), .dropdown-submenu")) return;

    const menu = owner.querySelector(":scope > .dropdown-content, :scope > .dropdown-submenu-content");

    if (!menu) return;

    positionMenu(owner, menu);
}

function positionMenu(owner, menu) {
    menu.classList.remove("nav-mega", "nav-scroll", "nav-open-left", "nav-open-right");
    menu.style.columnCount = "";
    menu.style.maxHeight = "";
    menu.style.top = "";

    if (!menu.getClientRects().length) return;

    const isFlyout = menu.classList.contains("dropdown-submenu-content") || Boolean(owner.closest(".nav-more-menu"));
    const navBottom = owner.closest(".top-navbar")?.getBoundingClientRect().bottom ?? 0;
    const viewportH = window.innerHeight;
    const viewportW = document.documentElement.clientWidth;

    // 1. Too tall: spread into columns, and only scroll as a last resort
    //    (a scrolling menu clips its own flyouts).
    let rect = menu.getBoundingClientRect();
    const availableH = isFlyout
        ? viewportH - navBottom - EDGE_MARGIN * 2
        : viewportH - rect.top - EDGE_MARGIN;

    if (rect.height > availableH) {
        menu.classList.add("nav-mega");
        menu.style.columnCount = String(Math.min(MAX_COLUMNS, Math.ceil(rect.height / availableH)));
        rect = menu.getBoundingClientRect();

        if (rect.height > availableH) {
            menu.classList.add("nav-scroll");
            menu.style.maxHeight = `${Math.floor(availableH)}px`;
        }
    }

    // 2. Flyouts running off the bottom slide up (never above the navbar).
    if (isFlyout) {
        rect = menu.getBoundingClientRect();
        const overflowBottom = rect.bottom - (viewportH - EDGE_MARGIN);

        if (overflowBottom > 0) {
            const room = rect.top - navBottom - EDGE_MARGIN;
            menu.style.top = `${-Math.max(0, Math.min(overflowBottom, room))}px`;
        }
    }

    // 3. Keep it on screen horizontally.
    rect = menu.getBoundingClientRect();

    if (rect.right > viewportW - EDGE_MARGIN) {
        menu.classList.add("nav-open-left");
    } else if (rect.left < EDGE_MARGIN) {
        menu.classList.add("nav-open-right");
    }
}
