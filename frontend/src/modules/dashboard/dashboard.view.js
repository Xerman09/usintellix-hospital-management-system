export function DashboardView()
{
    return `
<div class="dashboard-container">
    <nav class="top-navbar">
        <div class="navbar-logo">
            <img src="/assets/logo.png" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'28\\' height=\\'28\\'><rect width=\\'28\\' height=\\'28\\' fill=\\'%234f46e5\\' rx=\\'4\\'/></svg>'">
            <span>Intellix</span>
        </div>
        
        <div class="navbar-links" id="navbarLinks">
            <a data-tab="patients">Patients</a>
            <a data-tab="employees">Employees</a>
            <div class="nav-dropdown">
                <span data-tab="procedures" data-subtab="providers">Procedures</span>
                <div class="dropdown-content">
                    <a data-tab="procedures" data-subtab="providers">Providers</a>
                </div>
            </div>
            <a data-tab="companies">Companies</a>
        </div>

        <div class="navbar-right">
            <input type="text" class="nav-search" placeholder="Search by any demographic...">
            <div class="nav-profile nav-dropdown">
                <div class="avatar" id="avatarLetter">A</div>
                <div class="dropdown-content dropdown-right profile-dropdown">
                    <div class="profile-header">
                        <strong id="profileName">User Name</strong>
                        <div id="profileRole" style="text-transform: capitalize;">Role</div>
                    </div>
                    <hr>
                    <a data-tab="settings" style="cursor: pointer;">Settings</a>
                    <a id="logoutBtn" style="cursor: pointer; color: #dc2626;">Logout</a>
                </div>
            </div>
        </div>
    </nav>

    <div class="tab-bar" id="tabBar">
        <!-- Tabs will be rendered here dynamically -->
    </div>

    <main class="tab-content-area" id="tabContent">
        <!-- Active tab content goes here -->
    </main>
</div>
`;
}