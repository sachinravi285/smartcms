// Enterprise CMS Dashboard v1.1
const contentDisplay = document.getElementById('content-display');
const sidebarLinks = document.getElementById('sidebar-links');
const pageTitle = document.getElementById('page-title');
const userNameDisplay = document.getElementById('user-name-display');

let socket;

async function initDashboard(user) {
    currentUser = user;
    userNameDisplay.innerText = user.name;
    document.getElementById('user-avatar').src = `https://ui-avatars.com/api/?name=${user.name}&background=4f46e5&color=fff`;

    await fetchBranding();
    renderSidebar(user.role);
    loadSection('dashboard');
    initNotifications();
}

function initNotifications() {
    const isProduction = window.location.hostname !== 'localhost';

    if (typeof io === 'undefined' || isProduction) {
        console.log('📶 CMS: Using polling mode for stability');
        setInterval(refreshNotifCount, 15000); // Check every 15s
        refreshNotifCount();
        return;
    }

    socket = io({
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        timeout: 5000
    });

    socket.on('connect', () => {
        console.log('⚡ CMS: Socket Connected');
        socket.emit('join', currentUser._id);
        if (currentUser.role === 'admin' || currentUser.role === 'super-admin') {
            socket.emit('join_admins');
        }
    });

    socket.on('notification', (notif) => {
        showLiveNotification(notif);
        refreshNotifCount();
    });

    socket.on('admin_notification', (data) => {
        showLiveNotification(data, 'info');
        refreshNotifCount();
        if (pageTitle.innerText === 'Management Center' || pageTitle.innerText === 'Manage Complaints') {
            renderManageComplaints();
        }
    });

    refreshNotifCount();
}

async function refreshNotifCount() {
    try {
        const notifs = await fetchAPI('/api/notifications');
        const unread = notifs.filter(n => !n.isRead).length;
        const countBadge = document.getElementById('notif-count');
        if (unread > 0) {
            countBadge.innerText = unread;
            countBadge.style.display = 'flex';
        } else {
            countBadge.style.display = 'none';
        }
    } catch (err) { console.error('Notif fetch fail'); }
}

function showLiveNotification(notif, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'animate-fade-up';
    toast.style = `
        position: fixed; top: 1rem; right: 1rem; z-index: 9999;
        background: white; padding: 1rem 1.5rem; border-radius: 1rem;
        box-shadow: var(--shadow-xl); border-left: 5px solid ${type === 'success' ? 'var(--success)' : 'var(--primary)'};
        display: flex; align-items: center; gap: 1rem; min-width: 300px;
    `;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-bell'}" style="color: ${type === 'success' ? 'var(--success)' : 'var(--primary)'}; font-size: 1.5rem;"></i>
        <div>
            <div style="font-weight: 700; font-size: 0.9rem;">New Alert</div>
            <div style="font-size: 0.85rem; color: var(--text-muted);">${notif.message}</div>
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

async function fetchBranding() {
    try {
        const settings = await (await fetch('/api/settings/public')).json();
        if (settings && settings.appName) {
            document.title = settings.appName;
            const logoText = document.querySelector('.sidebar-logo span');
            if (logoText) logoText.innerText = settings.appName;
        }
    } catch (err) { console.error('Branding load fail'); }
}

function renderSidebar(role) {
    let links = '';
    // Base links for everyone
    links += `<li class="nav-item"><a href="#" class="nav-link active" onclick="loadSection('dashboard')"><i class="fas fa-chart-line"></i> ${ (role === 'staff' || role === 'dept-admin') ? 'My Dept' : 'Analytics'}</a></li>`;
    
    // Management links for departmental staff and global admins
    links += `<li class="nav-item"><a href="#" class="nav-link" onclick="loadSection('manage-complaints')"><i class="fas fa-tasks"></i> ${ (role === 'admin' || role === 'super-admin') ? 'Manage All' : 'Manage Dept'}</a></li>`;



    // User Management links
    if (role === 'dept-admin') {
        links += `<li class="nav-item"><a href="#" class="nav-link" onclick="loadSection('users')"><i class="fas fa-users-cog"></i> My Staff</a></li>`;
    }

    // System management links
    if (role === 'admin' || role === 'super-admin') {
        links += `<li class="nav-item"><a href="#" class="nav-link" onclick="loadSection('users')"><i class="fas fa-users"></i> Users</a></li>`;
        links += `<li class="nav-item"><a href="#" class="nav-link" onclick="loadSection('departments')"><i class="fas fa-building"></i> Departments</a></li>`;
    }

    if (role === 'super-admin') {
        links += `<li class="nav-item"><a href="#" class="nav-link" onclick="loadSection('settings')"><i class="fas fa-cog"></i> System Settings</a></li>`;
    }

    links += `<li class="nav-item"><a href="#" class="nav-link" onclick="loadSection('profile')"><i class="fas fa-user-circle"></i> Profile</a></li>`;
    
    sidebarLinks.innerHTML = links;

    // Add click listeners to toggle active class
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function () {
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

async function loadSection(section) {
    window.scrollTo(0, 0);
    // Add Bell Click Listener
    const bell = document.getElementById('notification-bell');
    if (bell) bell.onclick = toggleNotifications;

    contentDisplay.innerHTML = '<div style="text-align: center; padding: 3rem;"><i class="fas fa-spinner fa-spin fa-3x"></i></div>';

    switch (section) {
        case 'dashboard':
            // Both Staff and Admins now see the Analytics Dashboard (scoped to their dept)
            await renderAdminDashboard();
            break;
        case 'file-complaint':
            renderFileComplaint(); // Synchronous HTML injection
            break;
        case 'my-complaints':
            await renderMyComplaints();
            break;
        case 'manage-complaints':
            await renderManageComplaints();
            break;
        case 'track':
            renderTrackComplaint();
            break;
        case 'users':
            await renderUsers();
            break;
        case 'departments':
            await renderDepartments();
            break;
        case 'profile':
            await renderProfile();
            break;
        case 'settings':
            await renderSettings();
            break;
    }
    setupScrollAnimations();
    if (window.innerWidth <= 992) closeSidebar();
}

window.toggleSidebar = () => {
    const sidebar = document.querySelector('.sidebar');
    const burger = document.querySelector('.dashboard-hamburger');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('active');
    burger.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
};

window.closeSidebar = () => {
    const sidebar = document.querySelector('.sidebar');
    const burger = document.querySelector('.dashboard-hamburger');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.remove('active');
    burger.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
};


// --- User Sections ---

async function renderUserDashboard() {
    pageTitle.innerText = 'Personal Dashboard';
    try {
        const complaints = await fetchAPI('/api/complaints/my') || [];

        const stats = {
            total: complaints.length,
            resolved: complaints.filter(c => c.status === 'Resolved').length,
            pending: complaints.filter(c => c.status === 'Pending').length
        };

        contentDisplay.innerHTML = `
            <div class="stats-grid">
                <div class="card animate-fade-up" style="animation-delay: 0.1s;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <div class="card-title">Total Submitted</div>
                            <div class="card-value">${stats.total}</div>
                        </div>
                        <div style="background: var(--primary-light); color: var(--primary); padding: 0.75rem; border-radius: 1rem;">
                            <i class="fas fa-file-invoice fa-2x"></i>
                        </div>
                    </div>
                </div>
                <div class="card animate-fade-up" style="animation-delay: 0.2s;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <div class="card-title">Pending</div>
                            <div class="card-value" style="color: var(--danger);">${stats.pending}</div>
                        </div>
                        <div style="background: #fff1f2; color: var(--danger); padding: 0.75rem; border-radius: 1rem;">
                            <i class="fas fa-clock fa-2x"></i>
                        </div>
                    </div>
                </div>
                <div class="card animate-fade-up" style="animation-delay: 0.3s;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <div class="card-title">Resolved</div>
                            <div class="card-value" style="color: var(--success);">${stats.resolved}</div>
                        </div>
                        <div style="background: #f0fdf4; color: var(--success); padding: 0.75rem; border-radius: 1rem;">
                            <i class="fas fa-check-circle fa-2x"></i>
                        </div>
                    </div>
                </div>
            </div>
            <div class="card animate-fade-up" style="animation-delay: 0.4s;">
                <h3 style="margin-bottom: 1.5rem;">Recent Activity</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Tracking ID</th>
                                <th>Title</th>
                                <th>Category</th>
                                <th>Status</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${complaints.length > 0 ? complaints.slice(0, 5).map(c => `
                                <tr>
                                    <td style="font-weight: 600;">${c.trackingId}</td>
                                    <td>${c.title}</td>
                                    <td>${c.category}</td>
                                    <td><span class="badge badge-${c.status.toLowerCase().replace(' ', '')}">${c.status}</span></td>
                                    <td>${new Date(c.createdAt).toLocaleDateString()}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="5" style="text-align: center; padding: 2rem;">No complaints found</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (err) {
        console.error('User dashboard rendering error:', err);
        contentDisplay.innerHTML = `<div class="card" style="text-align: center; padding: 3rem; color: var(--danger);"><h3>Error loading dashboard</h3><p>${err.message}</p></div>`;
    }
}

function renderFileComplaint() {
    pageTitle.innerText = 'Submit New Complaint';
    contentDisplay.innerHTML = `
        <div class="card animate-fade-up" style="max-width: 800px; margin: 0 auto;">
            <form id="complaint-form">
                <div class="form-group">
                    <label class="form-label">Subject / Title</label>
                    <input type="text" class="form-input" id="c-title" required placeholder="Briefly describe the issue">
                </div>
                <div class="stats-grid" style="gap: 1rem; margin-bottom: 0;">
                    <div class="form-group">
                        <label class="form-label">Category / Department</label>
                        <select class="form-input" id="c-category" required>
                            <option value="" disabled selected>Loading departments...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Priority</label>
                        <select class="form-input" id="c-priority" required>
                            <option value="Low">Low</option>
                            <option value="Medium" selected>Medium</option>
                            <option value="High">High</option>
                            <option value="Critical">Critical</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Detailed Description</label>
                    <textarea class="form-input" id="c-desc" rows="5" required style="resize: vertical;"></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Attachments (Max 5)</label>
                    <input type="file" class="form-input" id="c-files" multiple accept="image/png, image/jpeg, image/jpg">
                </div>
                <button type="submit" id="submit-btn" class="btn btn-primary" style="width: 100%;">Submit Complaint</button>
            </form>
        </div>
    `;

    // Populate departments dynamically
    loadDepartmentsIntoSelect('c-category');

    document.getElementById('complaint-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submit-btn');
        const originalBtnText = submitBtn.innerHTML;

        // Show Loading State
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Successfully Submitting...';

        const formData = new FormData();
        formData.append('title', document.getElementById('c-title').value);
        formData.append('category', document.getElementById('c-category').value);
        formData.append('priority', document.getElementById('c-priority').value);
        formData.append('description', document.getElementById('c-desc').value);

        const files = document.getElementById('c-files').files;
        for (let i = 0; i < files.length; i++) {
            formData.append('attachments', files[i]);
        }

        try {
            const res = await fetch('/api/complaints', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: formData
            });
            if (res.ok) {
                const data = await res.json();
                showModal(`
                    <div style="text-align: center; padding: 2rem;">
                        <div style="font-size: 4rem; color: #10b981; margin-bottom: 1rem;">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <h2 style="color: var(--primary); margin-bottom: 0.5rem;">Successfully Submitted!</h2>
                        <p style="color: grey; margin-bottom: 1.5rem;">Your tracking ID is ready and confirmation emails have been sent to you and the admin.</p>
                        
                        <div style="background: var(--bg-color); padding: 1.5rem; border-radius: 12px; border: 2px dashed var(--primary); margin-bottom: 2rem;">
                            <span style="display: block; font-size: 0.8rem; color: var(--primary); font-weight: bold; text-transform: uppercase;">Tracking ID</span>
                            <span style="font-size: 2rem; font-family: monospace; letter-spacing: 3px; color: var(--text-color);">${data.trackingId}</span>
                        </div>
                        
                        <button class="btn btn-primary" onclick="closeModal(); loadSection('my-complaints')" style="width: 100%;">
                            Go to My Complaints
                        </button>
                    </div>
                `);
            } else {
                const data = await res.json();
                alert('Error: ' + data.message);
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        } catch (err) {
            alert('Error submitting complaint');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });
}

async function renderMyComplaints() {
    pageTitle.innerText = 'All My Complaints';
    const complaints = await fetchAPI('/api/complaints/my');

    contentDisplay.innerHTML = `
        <div class="card">
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Tracking ID</th>
                            <th>Title</th>
                            <th>Category</th>
                            <th>Priority</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${complaints.map(c => `
                            <tr>
                                <td style="font-weight: 600;">${c.trackingId}</td>
                                <td>${c.title}</td>
                                <td>${c.category}</td>
                                <td>${c.priority}</td>
                                <td><span class="badge badge-${c.status.toLowerCase().replace(' ', '')}">${c.status}</span></td>
                                <td>${new Date(c.createdAt).toLocaleDateString()}</td>
                                <td>
                                    ${c.status === 'Resolved' || c.status === 'Closed' ?
            `<button class="btn btn-primary" style="padding: 0.4rem 0.8rem;" onclick="reopenComplaint('${c._id}')">Reopen</button>` :
            '--'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

window.reopenComplaint = async (id) => {
    if (!confirm('Are you sure you want to reopen this complaint?')) return;
    try {
        const res = await fetch(`/api/complaints/${id}/reopen`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
            alert('Complaint reopened successfully');
            loadSection('my-complaints');
        }
    } catch (err) { alert('Error reopening complaint'); }
};

// --- Admin Sections ---

async function renderAdminDashboard() {
    const roleLabels = {
        'super-admin': 'Global Controller',
        'admin': 'Admin Control',
        'dept-admin': 'Dept Manager',
        'staff': 'Department Staff'
    };
    const roleLabel = roleLabels[currentUser.role] || 'Analytics';
    const deptInfo = currentUser.departmentName ? ` (${currentUser.departmentName})` : '';
    pageTitle.innerHTML = `<i class="fas fa-microchip"></i> ${roleLabel}${deptInfo}`;
    try {
        const data = await fetchAPI('/api/admin/analytics');

        const stats = {
            total: data.total || 0,
            pending: data.pending || 0,
            resolved: data.resolved || 0,
            categoryData: data.categoryData || [],
            priorityData: data.priorityData || [],
            monthlyData: data.monthlyData || []
        };

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        contentDisplay.innerHTML = `
            <div class="stats-grid">
                <div class="card animate-fade-up">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <div class="card-title">Total Complaints</div>
                            <div class="card-value">${stats.total}</div>
                        </div>
                        <div style="background: var(--primary-light); color: var(--primary); padding: 0.75rem; border-radius: 1rem;">
                            <i class="fas fa-database fa-2x"></i>
                        </div>
                    </div>
                </div>
                <div class="card animate-fade-up" style="animation-delay: 0.1s;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <div class="card-title">Awaiting Action</div>
                            <div class="card-value" style="color: var(--danger);">${stats.pending}</div>
                        </div>
                        <div style="background: #fff1f2; color: var(--danger); padding: 0.75rem; border-radius: 1rem;">
                            <i class="fas fa-exclamation-circle fa-2x"></i>
                        </div>
                    </div>
                </div>
                <div class="card animate-fade-up" style="animation-delay: 0.2s;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <div class="card-title">Resolved Cases</div>
                            <div class="card-value" style="color: var(--success);">${stats.resolved}</div>
                        </div>
                        <div style="background: #f0fdf4; color: var(--success); padding: 0.75rem; border-radius: 1rem;">
                            <i class="fas fa-award fa-2x"></i>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card animate-fade-up" style="margin-top: 2rem; animation-delay: 0.3s;">
                <h4 style="margin-bottom: 1rem;"><i class="fas fa-chart-line"></i> Complaint Volume Trends</h4>
                <canvas id="volumeChart" style="max-height: 250px;"></canvas>
            </div>

            <div class="stats-grid" style="margin-top: 2rem;">
                <div class="card animate-fade-up" style="animation-delay: 0.4s;">
                    <canvas id="categoryChart"></canvas>
                </div>
                <div class="card animate-fade-up" style="animation-delay: 0.5s;">
                    <canvas id="priorityChart"></canvas>
                </div>
            </div>
        `;

        // Volume Chart
        new Chart(document.getElementById('volumeChart'), {
            type: 'line',
            data: {
                labels: stats.monthlyData.map(d => monthNames[d._id - 1]),
                datasets: [{
                    label: 'Complaints',
                    data: stats.monthlyData.map(d => d.count),
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });

        // Category Chart
        if (stats.categoryData.length > 0) {
            new Chart(document.getElementById('categoryChart'), {
                type: 'doughnut',
                data: {
                    labels: stats.categoryData.map(d => d._id || 'Other'),
                    datasets: [{
                        data: stats.categoryData.map(d => d.count),
                        backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#64748b', '#06b6d4']
                    }]
                },
                options: { plugins: { title: { display: true, text: 'By Category' } } }
            });
        }

        // Priority Chart
        if (stats.priorityData.length > 0) {
            new Chart(document.getElementById('priorityChart'), {
                type: 'bar',
                data: {
                    labels: stats.priorityData.map(d => d._id || 'Normal'),
                    datasets: [{
                        label: 'Volume',
                        data: stats.priorityData.map(d => d.count),
                        backgroundColor: '#4f46e5'
                    }]
                },
                options: { plugins: { title: { display: true, text: 'By Priority' } } }
            });
        }
    } catch (err) {
        console.error('Analytics error:', err);
        contentDisplay.innerHTML = '<div class="card"><h4>Unable to load analytics data</h4><p>Check console for details.</p></div>';
    }
}

async function renderManageComplaints() {
    pageTitle.innerText = 'Management Center';
    const complaints = await fetchAPI('/api/admin/complaints') || [];

    if (complaints.length === 0 && (currentUser.role === 'staff' || currentUser.role === 'dept-admin' || currentUser.role === 'admin') && !currentUser.department && currentUser.role !== 'super-admin') {
        const roleDisplay = currentUser.role.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
        contentDisplay.innerHTML = `
            <div class="card animate-fade-up" style="text-align: center; padding: 4rem 2rem;">
                <div style="font-size: 5rem; color: var(--warning); margin-bottom: 2rem;">
                    <i class="fas fa-lock"></i>
                </div>
                <h2 style="margin-bottom: 1rem; color: var(--text-main);">Visibility Restricted</h2>
                <p style="color: var(--text-muted); max-width: 500px; margin: 0 auto 2rem;">
                    Your account is set as <b>${roleDisplay}</b>, but you haven't been assigned to a department yet. 
                    Please contact a <b>Super Admin</b> to link your account to a department.
                </p>
                <button class="btn btn-primary" onclick="loadSection('dashboard')">Back to Analytics</button>
            </div>
        `;
        return;
    }

    contentDisplay.innerHTML = `
        <div class="card">
            <div class="action-bar">
                <input type="text" class="form-input" id="complaint-search" placeholder="Search by ID or Title...">
                
                ${currentUser.role === 'staff' ? `
                    <div class="filter-group">
                        <label>
                            <input type="checkbox" id="my-assigned-filter"> Assigned to Me
                        </label>
                    </div>
                ` : ''}

                <button class="btn btn-primary" onclick="window.open('/api/admin/export', '_blank')" style="white-space: nowrap;">
                    <i class="fas fa-file-excel"></i> Export All (Excel)
                </button>
            </div>
            <div class="table-container">
                <table id="complaints-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Complainant</th>
                            <th>Category</th>
                            <th>Priority</th>
                            <th>Status</th>
                            <th>Assignee</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${complaints.map(c => `
                            <tr class="complaint-row" data-assigned-to="${c.assignedTo ? c.assignedTo._id : ''}">
                                <td style="font-weight: 600;">${c.trackingId}</td>
                                <td>${c.user ? c.user.name : (c.guestName || '<span style="color: grey;">Guest</span>')}</td>
                                <td>${c.category}</td>
                                <td><span style="color: ${c.priority === 'Critical' ? 'red' : 'inherit'}">${c.priority}</span></td>
                                <td><span class="badge badge-${c.status.toLowerCase().replace(' ', '')}">${c.status}</span></td>
                                <td style="font-size: 0.85rem; color: var(--text-muted);">${c.assignedTo ? c.assignedTo.name : '<span style="color: #cbd5e1;">Unassigned</span>'}</td>
                                <td><button class="btn btn-primary" style="padding: 0.4rem 0.8rem;" onclick="viewComplaintDetails('${c._id}')">Update</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    const searchInput = document.getElementById('complaint-search');
    const myFilter = document.getElementById('my-assigned-filter');

    const filterRows = () => {
        const term = searchInput.value.toLowerCase();
        const rows = document.querySelectorAll('.complaint-row');
        const onlyMine = myFilter ? myFilter.checked : false;

        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            const assignedId = row.getAttribute('data-assigned-to');
            const matchesSearch = text.includes(term);
            const matchesMine = !onlyMine || assignedId === currentUser._id;
            
            row.style.display = (matchesSearch && matchesMine) ? '' : 'none';
        });
    };

    searchInput.addEventListener('input', filterRows);
    if (myFilter) myFilter.addEventListener('change', filterRows);
}

async function viewComplaintDetails(id) {
    showModal('<div style="text-align: center; padding: 2rem;"><i class="fas fa-spinner fa-spin fa-3x" style="color: var(--primary);"></i><p style="margin-top: 1rem; color: var(--text-muted);">Fetching details...</p></div>');

    try {
        const c = await fetchAPI(`/api/admin/complaints/${id}`);
        const comments = await fetchAPI(`/api/complaints/${id}/comments`);
        const departments = await fetchAPI('/api/admin/departments');
        const users = await fetchAPI('/api/admin/users');

        showModal(`
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3>Complaint: ${c.trackingId}</h3>
                <span class="badge badge-${c.status.toLowerCase().replace(' ', '')}">${c.status}</span>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
                <div>
                    <div class="card" style="padding: 1rem; margin-bottom: 1rem; background: #f8fafc;">
                        <p><strong>Subject:</strong> ${c.title}</p>
                        <p style="margin-top: 0.5rem;"><strong>Description:</strong></p>
                        <p style="white-space: pre-wrap; font-size: 0.9rem; color: #475569;">${c.description}</p>
                        ${c.attachments && c.attachments.length ? `
                            <div style="margin-top: 1rem;">
                                <p><strong>Attachments:</strong></p>
                                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem;">
                                    ${c.attachments.map(a => `<a href="${a.url}" target="_blank" class="badge" style="background: var(--primary); color: white;">File.${a.format}</a>`).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    <h4>Timeline & History</h4>
                    <div style="margin-top: 0.5rem; max-height: 200px; overflow-y: auto; border: 1px solid var(--border); border-radius: 8px; padding: 1rem;">
                        ${c.timeline.slice().reverse().map(step => `
                            <div style="padding-bottom: 1rem; border-left: 2px solid var(--primary); padding-left: 1rem; position: relative; margin-left: 10px;">
                                <div style="position: absolute; left: -7px; top: 0; width: 12px; height: 12px; border-radius: 50%; background: var(--primary);"></div>
                                <div style="font-size: 0.75rem; color: #64748b;">${new Date(step.timestamp).toLocaleString()}</div>
                                <div style="font-weight: 600; font-size: 0.85rem;">${step.status}</div>
                                <div style="font-size: 0.85rem;">${step.description}</div>
                                <div style="font-size: 0.75rem; color: #94a3b8;">By: ${step.updatedBy ? step.updatedBy.name : 'System'}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div>
                    <h4>Quick Action Center</h4>
                    <div style="margin-top: 1rem;">
                        <label class="form-label">Update Status</label>
                        <select class="form-input" id="new-status" style="margin-bottom: 0.5rem;">
                            <option value="Pending" ${c.status === 'Pending' ? 'selected' : ''}>Pending</option>
                            <option value="In Progress" ${c.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                            <option value="Resolved" ${c.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                            <option value="Closed" ${c.status === 'Closed' ? 'selected' : ''}>Closed</option>
                        </select>
                        <textarea class="form-input" id="status-note" placeholder="Add a status update note..." style="height: 60px;"></textarea>
                        <button class="btn btn-primary" onclick="updateStatus('${c._id}')" style="width: 100%; margin-top: 0.5rem;">Update Status</button>
                    </div>

                    <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border); ${currentUser.role === 'staff' ? 'display: none;' : ''}">
                        <label class="form-label">Assign to Department</label>
                        <select class="form-input" id="assign-dept" style="margin-bottom: 0.5rem;" ${currentUser.role === 'dept-admin' ? 'disabled' : ''}>
                            <option value="">-- Unassigned --</option>
                            ${departments.map(d => `<option value="${d._id}" ${ (c.department && (c.department._id === d._id || c.department === d._id)) ? 'selected' : ''}>${d.name}</option>`).join('')}
                        </select>
                        <label class="form-label">Assign to ${currentUser.role === 'dept-admin' ? 'My Staff' : 'Staff Member'}</label>
                        <select class="form-input" id="assign-staff">
                            <option value="">-- Unassigned --</option>
                            ${users.filter(u => u.role !== 'super-admin').map(u => `<option value="${u._id}" ${ (c.assignedTo && (c.assignedTo._id === u._id || c.assignedTo === u._id)) ? 'selected' : ''}>${u.name} [${u.role}]</option>`).join('')}
                        </select>
                        <textarea class="form-input" id="assign-note" placeholder="Add an assignment reason..." style="height: 60px; margin-top: 0.5rem;"></textarea>
                        <button class="btn btn-outline" onclick="assignComplaint('${c._id}')" style="width: 100%; margin-top: 0.5rem;">Save Assignment</button>
                    </div>

                    <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border);">
                        <label class="form-label">Discussion</label>
                        <div id="comments-list" style="max-height: 150px; overflow-y: auto; margin-bottom: 0.5rem; padding: 0.5rem; background: #f1f5f9; border-radius: 4px;">
                            ${comments.length ? comments.map(comm => `
                                <div style="font-size: 0.8rem; margin-bottom: 0.4rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.2rem;">
                                    <strong>${comm.user ? comm.user.name : 'Unknown'}</strong>: ${comm.text}
                                </div>
                            `).join('') : '<p style="font-size: 0.75rem; color: #94a3b8;">No comments.</p>'}
                        </div>
                        <div style="display: flex; gap: 0.3rem;">
                            <input type="text" id="comment-text" class="form-input" placeholder="Quick chat...">
                            <button class="btn btn-primary" style="padding: 0.5rem;" onclick="addComment('${c._id}')"><i class="fas fa-paper-plane"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        `);
    } catch (err) {
        showModal(`<p style="color: red;">Error: ${err.message}</p>`);
    }
}

window.updateStatus = async (id) => {
    const status = document.getElementById('new-status').value;
    const description = document.getElementById('status-note').value;
    if (!description) return alert('Please add a status update note.');

    const res = await fetch(`/api/admin/complaints/${id}/status`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status, description })
    });
    if (res.ok) {
        viewComplaintDetails(id);
        renderManageComplaints(); // Update table in background
    }
};

window.assignComplaint = async (id) => {
    const departmentId = document.getElementById('assign-dept').value;
    const staffId = document.getElementById('assign-staff').value;
    const note = document.getElementById('assign-note').value;

    const res = await fetch(`/api/admin/complaints/${id}/assign`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ departmentId, staffId, note })
    });
    if (res.ok) {
        alert('Assignment updated successfully!');
        viewComplaintDetails(id);
        renderManageComplaints(); // Refresh main table in background
    } else {
        const data = await res.json();
        alert('Assignment failed: ' + data.message);
    }
};

window.addComment = async (id) => {
    const text = document.getElementById('comment-text').value;
    if (!text) return;
    try {
        const res = await fetch(`/api/complaints/${id}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ text })
        });
        if (res.ok) {
            viewComplaintDetails(id); // Reload modal
            renderManageComplaints(); // Refresh table background if needed
        } else {
            const data = await res.json();
            alert('Comment Error: ' + data.message);
        }
    } catch (err) { alert('Error adding comment'); }
};

async function renderUsers() {
    const isDeptManager = currentUser.role === 'dept-admin';
    pageTitle.innerText = isDeptManager ? 'My Department Staff' : 'Account Management';
    try {
        const users = await fetchAPI('/api/admin/users');
        const depts = (currentUser.role === 'admin' || currentUser.role === 'super-admin') ? await fetchAPI('/api/admin/departments') : [];

        contentDisplay.innerHTML = `
        ${(isDeptManager && !currentUser.department) ? `
            <div class="card" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); margin-bottom: 2rem;">
                <h4 style="color: #ef4444; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-exclamation-triangle"></i> No Department Assigned
                </h4>
                <p style="color: var(--text-muted); margin-top: 0.5rem; font-size: 0.9rem;">
                    As a Department Admin, you must be assigned to a specific department to add staff members. 
                    Please contact a Super Admin to assign you to a department head role.
                </p>
            </div>
        ` : ''}
        <div class="card animate-fade-up reveal" style="margin-bottom: 2rem; animation-delay: 0.1s;">
            <h3>${isDeptManager ? 'Add New Staff Member' : 'Add New User'}</h3>
            <form id="create-user-form" style="margin-top: 1rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; align-items: end;">
                <div class="form-group">
                    <label class="form-label">Full Name</label>
                    <input type="text" id="cu-name" class="form-input" required placeholder="User Name">
                </div>
                <div class="form-group">
                    <label class="form-label">Email Address</label>
                    <input type="email" id="cu-email" class="form-input" required placeholder="email@example.com">
                </div>
                <div class="form-group">
                    <label class="form-label">Password</label>
                    <input type="password" id="cu-password" class="form-input" required placeholder="••••••••">
                </div>
                <div class="form-group">
                    <label class="form-label">Role</label>
                    <select id="cu-role" class="form-input" required ${isDeptManager ? 'disabled' : ''}>
                        <option value="staff" selected>Staff Member</option>
                        ${!isDeptManager ? `
                        <option value="dept-admin">Dept Admin</option>
                        <option value="admin">Admin</option>
                        <option value="super-admin">Super Admin</option>
                        ` : ''}
                    </select>
                </div>
                ${!isDeptManager ? `
                <div class="form-group" id="dept-select-group">
                    <label class="form-label">Department</label>
                    <select id="cu-dept" class="form-input">
                        <option value="">None / Global</option>
                        ${depts.map(d => `<option value="${d._id}">${d.name}</option>`).join('')}
                    </select>
                </div>
                ` : ''}
                <button type="submit" class="btn btn-primary" style="height: 42px;">Add User</button>
            </form>
        </div>

        <div class="card animate-fade-up" style="animation-delay: 0.2s;">
            <div class="table-container" style="max-height: 500px; overflow-y: auto;">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Dept</th>
                            <th>Role</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(u => `
                            <tr>
                                <td>${u.name}</td>
                                <td>${u.email}</td>
                                <td>
                                    ${(!isDeptManager && (currentUser.role === 'admin' || currentUser.role === 'super-admin')) ? `
                                        <select class="form-input" style="padding: 0.2rem; font-size: 0.8rem;" onchange="updateUserDept('${u._id}', this.value)">
                                            <option value="">None / Global</option>
                                            ${depts.map(d => `<option value="${d._id}" ${u.department && u.department._id === d._id ? 'selected' : ''}>${d.name}</option>`).join('')}
                                        </select>
                                    ` : (u.department ? `<span class="badge badge-info" style="font-size:0.7rem;">${u.department.name}</span>` : '-')}
                                </td>
                                <td>
                                    ${(isDeptManager || u.role === 'super-admin' || (u.role === 'admin' && currentUser.role !== 'super-admin')) ? 
                                        `<span class="badge" style="background: var(--bg-main); color: var(--text-muted); text-transform: capitalize; font-size: 0.8rem;">${u.role}</span>` : 
                                        `<select onchange="updateUserRole('${u._id}', this.value)" class="form-input" style="padding: 0.2rem; min-width: 100px; font-size: 0.8rem;">
                                            <option value="staff" ${u.role === 'staff' ? 'selected' : ''}>Staff</option>
                                            <option value="dept-admin" ${u.role === 'dept-admin' ? 'selected' : ''}>Dept Admin</option>
                                            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                                            <option value="super-admin" ${u.role === 'super-admin' ? 'selected' : ''}>Super Admin</option>
                                        </select>`
                                    }
                                </td>
                                <td>
                                    <button class="btn btn-danger" style="padding: 0.4rem;" onclick="deleteUser('${u._id}')"><i class="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

        document.getElementById('create-user-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const body = {
                name: document.getElementById('cu-name').value,
                email: document.getElementById('cu-email').value,
                password: document.getElementById('cu-password').value,
                role: document.getElementById('cu-role').value,
                department: document.getElementById('cu-dept') ? document.getElementById('cu-dept').value : null
            };

            console.log('Sending Create User Request:', body);

            try {
                const res = await fetch('/api/admin/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(body)
                });

                if (res.ok) {
                    alert('User created successfully');
                    renderUsers();
                } else {
                    const data = await res.json();
                    alert('Error (' + res.status + '): ' + (data.message || 'Unknown error during creation'));
                }
            } catch (err) { alert('Error creating user: ' + err.message); }
        });
    } catch (err) {
        contentDisplay.innerHTML = `<div class="card"><h3 style="color:var(--danger)">Failed to Load Users</h3><p>${err.message}</p><button class="btn btn-primary" onclick="renderUsers()" style="margin-top:1rem">Retry</button></div>`;
    }
}

window.updateUserRole = async (id, role) => {
    try {
        const res = await fetch(`/api/admin/users/${id}/role`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ role })
        });
        if (res.ok) {
            alert('User role updated');
            renderUsers();
        } else {
            const data = await res.json();
            alert('Role update failed: ' + data.message);
            renderUsers();
        }
    } catch (err) { alert('Error updating role'); renderUsers(); }
};

window.updateUserDept = async (id, deptId) => {
    try {
        const res = await fetch(`/api/admin/users/${id}/role`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ department: deptId })
        });
        if (res.ok) {
            alert('User department updated');
            renderUsers();
        } else {
            const data = await res.json();
            alert('Department update failed: ' + data.message);
            renderUsers();
        }
    } catch (err) { alert('Error updating department'); renderUsers(); }
};

window.deleteUser = async (id) => {
    if (!confirm('Are you sure? This cannot be undone.')) return;
    try {
        const res = await fetch(`/api/admin/users/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) renderUsers();
    } catch (err) { alert('Error deleting user'); }
};

async function renderDepartments() {
    pageTitle.innerText = 'Department Management';
    try {
        const departments = await fetchAPI('/api/admin/departments') || [];
        const users = await fetchAPI('/api/admin/users') || [];

        if (!Array.isArray(departments)) {
            throw new Error('Departments data is not in the correct format');
        }

        contentDisplay.innerHTML = `
        <div class="card animate-fade-up" style="margin-bottom: 2rem;">
            <h3>Add New Department</h3>
            <form id="dept-form" style="margin-top: 1rem;">
                <div class="stats-grid" style="gap: 1rem; margin-bottom: 1rem; align-items: start;">
                    <div class="form-group">
                        <label class="form-label">Department Name</label>
                        <input type="text" id="d-name" class="form-input" required placeholder="e.g. IT Department">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Department Head</label>
                        <select id="d-head" class="form-input" required>
                            <option value="">Select Head...</option>
                            ${(Array.isArray(users) ? users : []).map(u => `<option value="${u._id}">${u.name} (${u.role})</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label class="form-label">Description</label>
                    <textarea id="d-desc" class="form-input" rows="2" placeholder="What issues does this department handle?"></textarea>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.8rem; font-weight: 600;">Add Dept</button>
            </form>
        </div>

        <div class="card">
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Dept Name</th>
                            <th>Description</th>
                            <th>Head Info</th>
                            <th style="text-align: center;">Complaints</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${departments.length === 0 ? '<tr><td colspan="5" style="text-align: center; padding: 2rem;">No departments found. Add one above!</td></tr>' : 
                          departments.map(d => `
                            <tr>
                                <td style="font-weight: 600;">${d.name || 'Unknown'}</td>
                                <td style="font-size: 0.85rem; color: var(--text-muted); max-width: 250px;">${d.description || 'N/A'}</td>
                                <td>
                                    <div style="font-weight: 600;">${d.head ? d.head.name : 'N/A'}</div>
                                    <div style="font-size: 0.75rem; color: var(--text-muted);">${d.head ? d.head.email : ''}</div>
                                </td>
                                <td style="text-align: center;">
                                    <span class="badge" style="background: var(--primary-light); color: var(--primary); width: auto; padding: 0.4rem 1rem; min-width: 50px;">
                                        ${d.complaintCount || 0}
                                    </span>
                                </td>
                                <td>
                                    <button class="btn btn-danger" style="padding: 0.4rem;" onclick="window.deleteDept('${d._id}')">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

        document.getElementById('dept-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const body = {
                name: document.getElementById('d-name').value,
                head: document.getElementById('d-head').value,
                description: document.getElementById('d-desc').value
            };

            try {
                const res = await fetch('/api/admin/departments', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(body)
                });
                if (res.ok) {
                    renderDepartments();
                } else {
                    const data = await res.json();
                    alert('Error: ' + data.message);
                }
            } catch (err) { alert('Error adding department: ' + err.message); }
        });
    } catch (err) {
        console.error('Render Departments Error:', err);
        contentDisplay.innerHTML = `
            <div class="card" style="text-align: center; padding: 3rem;">
                <h3 style="color:var(--danger)">Failed to Load Departments</h3>
                <p>${err.message}</p>
                <button class="btn btn-primary" onclick="renderDepartments()" style="margin-top:1rem">Retry</button>
            </div>`;
    }
}

// --- Landing Page Specific Functions (Accessible without login) ---

window.showPublicRegisterForm = () => {
    window.scrollTo(0, 0);
    authContainer.innerHTML = `
        <div class="auth-page">
            <div class="auth-card animate-fade-up" style="max-width: 800px;">
                <div style="margin-bottom: 1.5rem;">
                    <a href="/" onclick="event.preventDefault(); showHome(); history.pushState(null, '', '/');" style="color: var(--text-muted); text-decoration: none; font-size: 0.9rem;">
                        <i class="fas fa-arrow-left"></i> Back to Home
                    </a>
                </div>
                <h2 style="margin-bottom: 2rem; text-align: center;">Register New Complaint</h2>
                <form id="public-complaint-form">
                    <div class="stats-grid" style="gap: 1rem; margin-bottom: 0;">
                        <div class="form-group">
                            <label class="form-label">Full Name</label>
                            <input type="text" class="form-input" id="g-name" required placeholder="John Doe">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Email Address</label>
                            <input type="email" class="form-input" id="g-email" required placeholder="john@example.com">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Subject / Title</label>
                        <input type="text" class="form-input" id="c-title" required placeholder="Briefly describe the issue">
                    </div>
                    <div class="stats-grid" style="gap: 1rem; margin-bottom: 0;">
                        <div class="form-group">
                            <label class="form-label">Category / Department</label>
                            <select class="form-input" id="c-category" required>
                                <option value="" disabled selected>Loading departments...</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Priority</label>
                            <select class="form-input" id="c-priority" required>
                                <option value="Low">Low</option>
                                <option value="Medium" selected>Medium</option>
                                <option value="High">High</option>
                                <option value="Critical">Critical</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Detailed Description</label>
                        <textarea class="form-input" id="c-desc" rows="5" required style="resize: vertical;"></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Attachments (Max 5)</label>
                        <input type="file" class="form-input" id="c-files" multiple accept="image/png, image/jpeg, image/jpg">
                    </div>
                    <button type="submit" id="submit-btn" class="btn btn-primary" style="width: 100%;">Submit Complaint</button>
                </form>
            </div>
        </div>
    `;

    // Populate departments dynamically
    loadDepartmentsIntoSelect('c-category');

    document.getElementById('public-complaint-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submit-btn');
        const originalBtnText = submitBtn.innerHTML;

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

        const formData = new FormData();
        formData.append('guestName', document.getElementById('g-name').value);
        formData.append('guestEmail', document.getElementById('g-email').value);
        formData.append('title', document.getElementById('c-title').value);
        formData.append('category', document.getElementById('c-category').value);
        formData.append('priority', document.getElementById('c-priority').value);
        formData.append('description', document.getElementById('c-desc').value);

        const files = document.getElementById('c-files').files;
        for (let i = 0; i < files.length; i++) {
            formData.append('attachments', files[i]);
        }

        try {
            const res = await fetch('/api/complaints', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                showModal(`
                    <div style="text-align: center; padding: 2rem;">
                        <div style="font-size: 4rem; color: #10b981; margin-bottom: 1rem;">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <h2 style="color: var(--primary); margin-bottom: 0.5rem;">Submitted!</h2>
                        <p style="color: grey; margin-bottom: 1.5rem;">Your tracking ID is ready. Please save it to track progress.</p>
                        
                        <div style="background: #f8fafc; padding: 1.5rem; border-radius: 12px; border: 2px dashed var(--primary); margin-bottom: 2rem;">
                            <span style="display: block; font-size: 0.8rem; color: var(--primary); font-weight: bold; text-transform: uppercase;">Tracking ID</span>
                            <span style="font-size: 2rem; font-family: monospace; letter-spacing: 3px;">${data.trackingId}</span>
                        </div>
                        
                        <button class="btn btn-primary" onclick="closeModal(); showHome(); history.pushState(null, '', '/');" style="width: 100%;">
                            Return to Home
                        </button>
                    </div>
                `);
            } else {
                alert('Error: ' + data.message);
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        } catch (err) {
            alert('Error submitting complaint');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });
};

window.showTrackInterface = () => {
    window.scrollTo(0, 0);
    authContainer.innerHTML = `
        <div class="auth-page">
            <div class="auth-card animate-fade-up" style="max-width: 600px;">
                <div style="margin-bottom: 1.5rem;">
                    <a href="/" onclick="event.preventDefault(); showHome(); history.pushState(null, '', '/');" style="color: var(--text-muted); text-decoration: none; font-size: 0.9rem;">
                        <i class="fas fa-arrow-left"></i> Back to Home
                    </a>
                </div>
                <h2 style="margin-bottom: 2rem; text-align: center;">Track Complaint</h2>
                <div class="form-group">
                    <label class="form-label">Enter your Tracking ID</label>
                    <div style="display: flex; gap: 0.5rem;">
                        <input type="text" class="form-input" id="public-track-id" placeholder="CMP-XXXXXX-XXXX">
                        <button class="btn btn-primary" onclick="handlePublicTrack()">Track</button>
                    </div>
                </div>
                <div id="public-track-result" style="margin-top: 2rem;"></div>
            </div>
        </div>
    `;
};

window.handlePublicTrack = async () => {
    const trackId = document.getElementById('public-track-id').value;
    if (!trackId) return;

    const resultDiv = document.getElementById('public-track-result');
    resultDiv.innerHTML = '<div style="text-align: center;"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';

    try {
        const res = await fetch(`/api/complaints/track/${trackId}`);
        const data = await res.json();

        if (!res.ok) {
            resultDiv.innerHTML = `<p style="color: var(--danger); text-align: center;">${data.message}</p>`;
            return;
        }

        resultDiv.innerHTML = `
            <div class="card animate-fade-up" style="border: 1px solid #e2e8f0; padding: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <div>
                        <h4 style="margin:0;">${data.title}</h4>
                        <small style="color: grey;">${data.trackingId}</small>
                    </div>
                    <span class="badge badge-${data.status.toLowerCase().replace(' ', '')}">${data.status}</span>
                </div>
                <p><strong>Category:</strong> ${data.category}</p>
                <p><strong>Priority:</strong> ${data.priority}</p>
                <hr style="margin: 1rem 0; border: 0; border-top: 1px solid #eee;">
                <h5>Progress Timeline</h5>
                <div style="max-height: 300px; overflow-y: auto;">
                    ${data.timeline.map(t => `
                        <div style="margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #f8fafc;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
                                <span style="font-weight: 600;">${t.status}</span>
                                <span style="color: grey;">${new Date(t.timestamp).toLocaleDateString()}</span>
                            </div>
                            <p style="font-size: 0.9rem; margin: 0.2rem 0;">${t.description}</p>
                            ${t.updatedBy ? `<small style="color: #4f46e5;">Updated by: ${t.updatedBy.name} (${t.updatedBy.role})</small>` : ''}
                        </div>
                    `).reverse().join('')}
                </div>
            </div>
        `;
    } catch (err) {
        resultDiv.innerHTML = '<p style="color: var(--danger); text-align: center;">Error fetching tracking details</p>';
    }
};

window.deleteDept = async (id) => {
    if (!confirm('Are you sure?')) return;
    try {
        const res = await fetch(`/api/admin/departments/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) renderDepartments();
    } catch (err) { alert('Error deleting department'); }
};

function renderTrackComplaint() {
    pageTitle.innerText = 'Track Your Complaint';
    contentDisplay.innerHTML = `
        <div class="card reveal" style="max-width: 500px; margin: 0 auto;">
            <div class="form-group">
                <label class="form-label">Enter Tracking ID</label>
                <div style="display: flex; gap: 0.5rem;">
                    <input type="text" class="form-input" id="track-id-input" placeholder="CMP-XXXXXX-XXXX">
                    <button class="btn btn-primary" onclick="handleTrack()">Track</button>
                </div>
            </div>
            <div id="track-result" style="margin-top: 2rem;"></div>
        </div>
    `;
}

window.handleTrack = async () => {
    const trackId = document.getElementById('track-id-input').value;
    const res = await fetch(`/api/complaints/track/${trackId}`);
    const data = await res.json();

    const resultDiv = document.getElementById('track-result');
    if (!res.ok) {
        resultDiv.innerHTML = `<p style="color: var(--danger); text-align: center;">${data.message}</p>`;
        return;
    }

    resultDiv.innerHTML = `
        <div style="border-left: 4px solid var(--primary); padding-left: 1rem;">
            <p><strong>Status:</strong> <span class="badge badge-${data.status.toLowerCase().replace(' ', '')}">${data.status}</span></p>
            <p><strong>Category:</strong> ${data.category}</p>
            <p><strong>Submitted On:</strong> ${new Date(data.createdAt).toLocaleString()}</p>
        </div>
        <h4 style="margin: 1.5rem 0 0.5rem;">Timeline</h4>
        <div class="timeline" style="font-size: 0.875rem;">
            ${data.timeline.map(t => `
                <div style="margin-bottom: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">
                    <div style="display: flex; justify-content: space-between; font-weight: 600;">
                        <span>${t.status}</span>
                        <span style="color: var(--text-muted); font-size: 0.75rem;">${new Date(t.timestamp).toLocaleString()}</span>
                    </div>
                    <p style="color: var(--text-muted);">${t.description}</p>
                </div>
            `).join('')}
        </div>
    `;
};

// --- Utils ---

async function renderProfile() {
    pageTitle.innerText = 'Profile Settings';
    const user = await fetchAPI('/api/auth/profile');

    contentDisplay.innerHTML = `
        <div class="card" style="max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 2rem;">
                <img src="https://ui-avatars.com/api/?name=${user.name}&background=4f46e5&color=fff&size=128" style="width: 120px; border-radius: 50%; border: 4px solid var(--primary-light);">
                <h2 style="margin-top: 1rem;">${user.name}</h2>
                <span class="badge badge-resolved" style="text-transform: uppercase;">${user.role}</span>
            </div>
            <form id="profile-update-form">
                <div class="form-group">
                    <label class="form-label">Full Name</label>
                    <input type="text" id="p-name" class="form-input" value="${user.name}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Email Address</label>
                    <input type="email" id="p-email" class="form-input" value="${user.email}" disabled>
                    <small style="color: grey;">Email cannot be changed.</small>
                </div>
                <div class="form-group">
                    <label class="form-label">New Password (leave blank to keep current)</label>
                    <input type="password" id="p-password" class="form-input" placeholder="••••••••">
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%;">Update Profile</button>
            </form>
        </div>
    `;

    document.getElementById('profile-update-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('p-name').value;
        const password = document.getElementById('p-password').value;

        try {
            const res = await fetch('/api/auth/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ name, password })
            });
            if (res.ok) {
                const updated = await res.json();
                localStorage.setItem('user', JSON.stringify(updated));
                currentUser = updated;
                userNameDisplay.innerText = updated.name;
                alert('Profile updated successfully');
                renderProfile();
            }
        } catch (err) { alert('Error updating profile'); }
    });
}

async function renderSettings() {
    pageTitle.innerText = 'System Settings';
    const settings = await fetchAPI('/api/settings');

    contentDisplay.innerHTML = `
        <div class="card" style="max-width: 600px; margin: 0 auto;">
            <div style="margin-bottom: 2rem;">
                <h3 style="color: var(--primary);"><i class="fas fa-toolbox"></i> Global Configuration</h3>
                <p style="color: grey; font-size: 0.9rem;">Approve system-wide changes here.</p>
            </div>
            <form id="settings-form">
                <div class="form-group">
                    <label class="form-label">Application Name</label>
                    <input type="text" id="s-appname" class="form-input" value="${settings.appName}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Contact Email Address (Admin Notification)</label>
                    <input type="email" id="s-email" class="form-input" value="${settings.contactEmail}" required>
                </div>
                
                <h4 style="margin: 2rem 0 1rem; color: var(--primary); border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
                    <i class="fas fa-envelope"></i> SMTP Configuration
                </h4>
                <div class="form-group">
                    <label class="form-label">SMTP Host</label>
                    <input type="text" id="s-smtphost" class="form-input" value="${settings.smtpHost || ''}" placeholder="smtp.gmail.com">
                </div>
                <div class="stats-grid" style="gap: 1rem; margin-bottom: 0;">
                    <div class="form-group">
                        <label class="form-label">SMTP Port</label>
                        <input type="text" id="s-smtpport" class="form-input" value="${settings.smtpPort || '587'}" placeholder="587">
                    </div>
                    <div class="form-group">
                        <label class="form-label">SMTP User</label>
                        <input type="text" id="s-smtpuser" class="form-input" value="${settings.smtpUser || ''}" placeholder="your-email@gmail.com">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">SMTP Password</label>
                    <div style="position: relative;">
                        <input type="password" id="s-smtppass" class="form-input" value="${settings.smtpPass || ''}" placeholder="••••••••" style="padding-right: 2.5rem;">
                        <i class="fas fa-eye" id="toggle-smtp-pass" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); cursor: pointer; color: grey;"></i>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Sender Email (From)</label>
                    <input type="email" id="s-smtpfrom" class="form-input" value="${settings.smtpFrom || ''}" placeholder="noreply@yourdomain.com">
                </div>
                <div class="form-group">
                    <label class="form-label">Mail Encryption</label>
                    <select id="s-smtpencryption" class="form-input">
                        <option value="tls" ${settings.smtpEncryption === 'tls' ? 'selected' : ''}>tls</option>
                        <option value="ssl" ${settings.smtpEncryption === 'ssl' ? 'selected' : ''}>ssl</option>
                        <option value="starttls" ${settings.smtpEncryption === 'starttls' ? 'selected' : ''}>starttls</option>
                        <option value="none" ${settings.smtpEncryption === 'none' ? 'selected' : ''}>none</option>
                    </select>
                </div>

                <h4 style="margin: 2rem 0 1rem; color: var(--primary); border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
                    <i class="fas fa-sliders-h"></i> General Toggles
                </h4>
                <div class="form-group" style="display: flex; gap: 1rem; align-items: center; margin-top: 1rem;">
                    <label class="form-label" style="margin-bottom: 0;">Allow New Registrations</label>
                    <input type="checkbox" id="s-registration" ${settings.allowRegistration ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
                </div>
                <div class="form-group" style="display: flex; gap: 1rem; align-items: center; margin-top: 1rem;">
                    <label class="form-label" style="margin-bottom: 0; color: #ef4444;">Maintenance Mode</label>
                    <input type="checkbox" id="s-maintenance" ${settings.maintenanceMode ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
                </div>
                <hr style="margin: 2rem 0; border: 0; border-top: 1px solid var(--border-color);">
                <button type="submit" class="btn btn-primary" style="width: 100%;">
                    <i class="fas fa-save"></i> Save System & Email Config
                </button>
            </form>
        </div>
    `;

    document.getElementById('toggle-smtp-pass').addEventListener('click', function () {
        const passInput = document.getElementById('s-smtppass');
        const type = passInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passInput.setAttribute('type', type);
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });

    document.getElementById('settings-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = {
            appName: document.getElementById('s-appname').value,
            contactEmail: document.getElementById('s-email').value,
            allowRegistration: document.getElementById('s-registration').checked,
            maintenanceMode: document.getElementById('s-maintenance').checked,
            smtpHost: document.getElementById('s-smtphost').value,
            smtpPort: document.getElementById('s-smtpport').value,
            smtpUser: document.getElementById('s-smtpuser').value,
            smtpPass: document.getElementById('s-smtppass').value,
            smtpFrom: document.getElementById('s-smtpfrom').value,
            smtpEncryption: document.getElementById('s-smtpencryption').value
        };

        try {
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                alert('System settings updated successfully!');
                await fetchBranding();
                renderSettings();
            } else {
                const data = await res.json();
                alert('Error: ' + data.message);
            }
        } catch (err) { alert('Error updating settings'); }
    });
}

async function fetchAPI(url) {
    try {
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (res.status === 401) {
            console.error('Session expired or invalid token. Redirecting to login...');
            logout();
            return;
        }

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'API Error');
        return data;
    } catch (err) {
        console.error('API Fail:', err);
        throw err;
    }
}

async function loadDepartmentsIntoSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    try {
        const response = await fetch('/api/settings/departments');
        const departments = await response.json();

        if (Array.isArray(departments) && departments.length > 0) {
            select.innerHTML = departments.map(d => `<option value="${d.name}">${d.name}</option>`).join('');
            // Add "Other" as fallback
            select.innerHTML += '<option value="Other">Other / General</option>';
        } else {
            select.innerHTML = `
                <option value="General">General</option>
                <option value="IT Support">IT Support</option>
                <option value="Infrastructure">Infrastructure</option>
                <option value="Academic">Academic</option>
                <option value="Other">Other</option>
            `;
        }
    } catch (err) {
        console.error('Failed to load departments:', err);
        select.innerHTML = '<option value="Other">Other / General</option>';
    }
}

// --- Export Modals ---
window.showModal = (content) => {
    const modal = document.getElementById('modal-container');
    document.getElementById('modal-content').innerHTML = content;
    modal.classList.add('show');
};

window.closeModal = () => {
    const modal = document.getElementById('modal-container');
    modal.classList.remove('show');
};

async function toggleNotifications() {
    const notifs = await fetchAPI('/api/notifications');
    
    showModal(`
        <div style="padding: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h2 style="margin: 0;">Recent Notifications</h2>
                <button class="btn btn-primary" style="padding: 0.5rem 1rem;" onclick="markAllNotificationsRead()">Mark all as read</button>
            </div>
            <div id="notif-list" style="max-height: 400px; overflow-y: auto;">
                ${notifs.length === 0 ? '<p style="text-align: center; color: var(--text-muted); padding: 2rem;">No notifications yet</p>' : 
                  notifs.map(n => `
                    <div class="card" style="margin-bottom: 1rem; padding: 1.25rem; border-left: 4px solid ${n.isRead ? 'var(--border)' : 'var(--primary)'}; cursor: pointer; transform: none; box-shadow: var(--shadow-sm);" onclick="handleNotifClick('${n._id}', '${n.complaintId}')">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div style="font-weight: ${n.isRead ? '500' : '700'}; color: ${n.isRead ? 'var(--text-muted)' : 'var(--text-main)'}">${n.message}</div>
                            ${!n.isRead ? '<span style="width: 8px; height: 8px; border-radius: 50%; background: var(--primary); margin-top: 5px;"></span>' : ''}
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem;">${new Date(n.createdAt).toLocaleString()}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `);
}

window.handleNotifClick = async (notifId, complaintId) => {
    try {
        await fetch(`/api/notifications/${notifId}/read`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        closeModal();
        refreshNotifCount();
        if (complaintId) {
            loadSection(currentUser.role === 'staff' ? 'my-complaints' : 'manage-complaints');
        } else {
            toggleNotifications();
        }
    } catch (err) { console.error('Notif click fail'); }
};

window.markAllNotificationsRead = async () => {
    try {
        await fetch('/api/notifications/read-all', {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        refreshNotifCount();
        toggleNotifications(); // Refresh list
    } catch (err) { console.error('Mark all fail'); }
};

