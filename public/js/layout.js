document.addEventListener('DOMContentLoaded', () => {
    const navContainer = document.getElementById('navbar-container');
    if (!navContainer) return;

    const currentPath = window.location.pathname;

    const tabs = [
        { path: '/inventory.html', icon: 'package-2',    label: 'Inventory',  color: '#10b981' },
        { path: '/scan.html',      icon: 'scan-barcode', label: 'Scan',       color: '#6366f1' },
        { path: '/alerts.html',    icon: 'bell',         label: 'Alerts',     color: '#ef4444', hasAlert: true },
        { path: '/analytics.html', icon: 'bar-chart-3',  label: 'Analytics',  color: '#6366f1' },
    ];

    const isActive = (tab) =>
        currentPath === tab.path ||
        currentPath.endsWith(tab.path) ||
        (currentPath === '/' && tab.path === '/inventory.html');

    // ── Mobile bottom nav ──────────────────────────────────
    const mobileNav = `
        <nav class="sg-nav">
            ${tabs.map(tab => `
                <a href="${tab.path}" class="sg-nav-tab ${isActive(tab) ? 'active' : ''}">
                    <div class="sg-nav-tab-icon">
                        <i data-lucide="${tab.icon}" style="width:20px;height:20px;stroke-width:${isActive(tab) ? 2 : 1.6};"></i>
                        ${tab.hasAlert ? '<span id="nav-alert-badge" class="sg-nav-badge" style="display:none;"></span>' : ''}
                    </div>
                    <span class="sg-nav-tab-label">${tab.label}</span>
                </a>
            `).join('')}
        </nav>`;

    // ── Desktop sidebar ────────────────────────────────────
    const desktopSidebar = `
        <aside class="sg-sidebar">
            <div class="sg-sidebar-brand">
                <div class="sg-sidebar-brand-icon">
                    <i data-lucide="shield-check" style="width:20px;height:20px;"></i>
                </div>
                <div class="sg-sidebar-brand-text">
                    <div class="sg-sidebar-brand-name">Shelf Guardian</div>
                    <div class="sg-sidebar-brand-sub">Inventory Pro</div>
                </div>
            </div>

            <nav class="sg-sidebar-nav">
                ${tabs.map(tab => `
                    <a href="${tab.path}" class="sg-sidebar-item ${isActive(tab) ? 'active' : ''}">
                        <div class="sg-sidebar-item-icon">
                            <i data-lucide="${tab.icon}" style="width:18px;height:18px;stroke-width:${isActive(tab) ? 2.2 : 1.7};"></i>
                        </div>
                        ${tab.label}
                        ${tab.hasAlert ? '<span id="sidebar-alert-badge" class="sg-sidebar-badge" style="display:none;"></span>' : ''}
                    </a>
                `).join('')}
            </nav>

            <div class="sg-sidebar-footer">
                <div class="sg-sidebar-footer-info">
                    <div class="sg-sidebar-avatar user-avatar-display">U</div>
                    <div style="flex: 1; min-width: 0;">
                        <div class="sg-sidebar-user-name user-name-display truncate">User</div>
                        <div class="sg-sidebar-user-role">Member</div>
                    </div>
                    <button class="logout-btn" title="Logout" style="background:none;border:none;color:var(--txt-3);cursor:pointer;padding:5px;display:flex;align-items:center;justify-content:center;border-radius:6px;transition:all .2s;">
                        <i data-lucide="log-out" style="width:16px;height:16px;"></i>
                    </button>
                </div>
            </div>
        </aside>`;

    // ── Wrap page in desktop frame ─────────────────────────
    const pageEl = document.querySelector('.page');
    if (pageEl) {
        const frame = document.createElement('div');
        frame.className = 'sg-desktop-frame';
        frame.innerHTML = desktopSidebar;

        const mainWrapper = document.createElement('div');
        mainWrapper.className = 'sg-desktop-main';
        pageEl.parentNode.insertBefore(frame, pageEl);
        mainWrapper.appendChild(pageEl);
        frame.appendChild(mainWrapper);

        // Add logout icon to mobile header if exists
        const headerInner = pageEl.querySelector('.sg-header-inner');
        if (headerInner && !headerInner.querySelector('.logout-btn')) {
            const logoutMobile = document.createElement('button');
            logoutMobile.className = 'sg-header-action logout-btn mobile-only';
            logoutMobile.style.marginLeft = 'auto';
            logoutMobile.innerHTML = '<i data-lucide="log-out" style="width:17px;height:17px;"></i>';
            headerInner.appendChild(logoutMobile);
        }
    }

    navContainer.innerHTML = mobileNav;

    if (window.lucide) lucide.createIcons();

    // ── Smart alert badge ──────────────────────────────────
    fetch('/api/inventory')
        .then(r => {
            if (!r.ok) return [];
            return r.json();
        })
        .then(items => {
            if (!Array.isArray(items)) return;
            const count = items.filter(i => {
                const d = new Date(i.expiry_date);
                d.setHours(0,0,0,0);
                const t = new Date(); t.setHours(0,0,0,0);
                return Math.floor((d - t) / 86400000) <= 3;
            }).length;

            if (count > 0) {
                const label = count > 9 ? '9+' : String(count);
                const mobileBadge = document.getElementById('nav-alert-badge');
                if (mobileBadge) { mobileBadge.textContent = label; mobileBadge.style.display = 'flex'; }
                const desktopBadge = document.getElementById('sidebar-alert-badge');
                if (desktopBadge) { desktopBadge.textContent = label; desktopBadge.style.display = 'flex'; }
            }
        })
        .catch(() => {});
});
