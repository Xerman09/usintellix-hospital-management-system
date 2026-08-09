export class TabManager {
    constructor(tabBarId, tabContentId) {
        this.tabBar = document.getElementById(tabBarId);
        this.tabContent = document.getElementById(tabContentId);
        this.tabs = new Map(); // id -> { title, id, contentFn }
        this.activeTabId = null;
    }

    saveState() {
        const tabIds = Array.from(this.tabs.keys());
        localStorage.setItem('tabsState', JSON.stringify({
            tabs: tabIds,
            active: this.activeTabId
        }));
    }

    openTab(id, title, renderFn, activate = true) {
        if (this.tabs.has(id)) {
            if (activate) this.switchTab(id);
            return;
        }

        this.tabs.set(id, {
            id,
            title,
            renderFn
        });

        this.renderTabBar();

        if (activate) {
            this.switchTab(id);
        }

        this.saveState();
    }

    // Like openTab, but always overwrites an existing tab's title/renderFn
    // and re-renders it in place instead of no-op-switching. Used for tabs
    // that show a single shared "current item" (e.g. the patient chart tab)
    // whose content must refresh even when the tab id already exists.
    openOrReplaceTab(id, title, renderFn, activate = true) {
        this.tabs.set(id, {
            id,
            title,
            renderFn
        });

        this.renderTabBar();

        if (activate) {
            this.switchTab(id);
        }

        this.saveState();
    }

    closeTab(id, event) {
        if (event) event.stopPropagation();

        if (!this.tabs.has(id)) return;
        
        this.tabs.delete(id);
        
        if (this.activeTabId === id) {
            // Pick another tab to activate
            const remainingTabs = Array.from(this.tabs.keys());
            if (remainingTabs.length > 0) {
                this.switchTab(remainingTabs[remainingTabs.length - 1]);
            } else {
                this.activeTabId = null;
                this.tabContent.innerHTML = '<div style="text-align:center; padding: 50px; color:#9ca3af;">Select an item from the menu</div>';
                this.renderTabBar();
            }
        } else {
            this.renderTabBar();
        }
        this.saveState();
    }

    switchTab(id) {
        if (!this.tabs.has(id)) return;

        this.activeTabId = id;
        this.renderTabBar();

        const tab = this.tabs.get(id);
        this.tabContent.innerHTML = tab.renderFn();
        this.saveState();
    }

    // Re-renders just this one tab's content (re-running its renderFn, same
    // as switchTab already does) without touching any other open tab's
    // state. If the tab isn't the active one, this also switches to it --
    // tabContent is a single shared container, so a background tab has no
    // rendered content to refresh in place.
    refreshTab(id, event) {
        if (event) event.stopPropagation();

        if (!this.tabs.has(id)) return;

        this.switchTab(id);
    }

    renderTabBar() {
        this.tabBar.innerHTML = '';

        for (const [id, tab] of this.tabs.entries()) {
            const isActive = this.activeTabId === id;

            const tabEl = document.createElement('div');
            tabEl.className = `tab-item ${isActive ? 'active' : ''}`;
            tabEl.onclick = () => this.switchTab(id);

            tabEl.innerHTML = `
                <span>${tab.title}</span>
                <div class="refresh-tab" title="Refresh" onclick="event.stopPropagation(); window.tabManager.refreshTab('${id}', event)">⟳</div>
                <div class="close-tab" title="Close" onclick="event.stopPropagation(); window.tabManager.closeTab('${id}', event)">✕</div>
            `;

            this.tabBar.appendChild(tabEl);
        }
    }
}
