document.addEventListener('DOMContentLoaded', function() {
    const auth = checkAuth();
    const userEmail = sessionStorage.getItem('userEmail');
    if (!auth || auth.userType !== 'student' || !userEmail) {
        window.location.href = 'login.html';
        return;
    }

    // Initial Data Load
    loadStudentProfileFromDB(userEmail);
    loadDashboardStats(userEmail);
    loadAnnouncements(userEmail);
    loadExploreClubs();
    loadMyApplications(userEmail);
});

async function loadStudentProfileFromDB(email) {
    const res = await fetch(`http://localhost:3000/api/profile/${email}`);
    const data = await res.json();
    if (res.ok) {
        document.getElementById('studentUserName').textContent = data.USER_NAME;
        document.getElementById('profileName').textContent = data.USER_NAME;
        document.getElementById('profileEmail').textContent = data.USER_EMAIL;
        document.getElementById('profileStudentId').textContent = 'Student ID: ' + data.STUDENT_NUMBER;
        document.getElementById('profileFaculty').textContent = data.STUDENT_FACULTY;
        document.getElementById('profileProgram').textContent = data.STUDENT_PROGRAM;
        document.getElementById('profileSemester').textContent = data.STUDENT_SEMESTER;
    }
}

async function loadDashboardStats(email) {
    const res = await fetch(`http://localhost:3000/api/student/stats/${email}`);
    const stats = await res.json();
    document.getElementById('statJoinedClubs').textContent = stats.JOINED;
    document.getElementById('statApps').textContent = stats.APPS;
    document.getElementById('statEvents').textContent = stats.EVENTS;
}

async function loadAnnouncements(email) {
    const res = await fetch(`http://localhost:3000/api/student/announcements/${email}`);
    const anncs = await res.json();
    const container = document.getElementById('dynamicAnnouncements');
    container.innerHTML = anncs.map(a => `
        <div class="announcement-item">
            <div class="announcement-header">
                <strong>${a.CLUB_NAME}</strong>
                <span class="date">${new Date(a.ANNC_DATE).toLocaleDateString()}</span>
            </div>
            <p>${a.ANNC_TITLE}</p>
        </div>`).join('');
}

async function loadExploreClubs() {
    const res = await fetch(`http://localhost:3000/api/student/clubs`);
    const clubs = await res.json();
    const grid = document.getElementById('clubsGrid');
    grid.innerHTML = clubs.map(c => `
        <div class="club-card" data-category="${c.CATEGORY_NAME ? c.CATEGORY_NAME.toLowerCase() : 'none'}">
            <div class="club-card-header"><h3>${c.CLUB_NAME}</h3><span class="club-category">${c.CATEGORY_NAME}</span></div>
            <div class="club-card-body"><p><strong>Advisor:</strong> ${c.ADVISOR_NAME}</p></div>
            <div class="club-card-footer"><button class="btn-primary" onclick="alert('Applied to ${c.CLUB_NAME}!')">Apply Now</button></div>
        </div>`).join('');
}

async function loadMyApplications(email) {
    const res = await fetch(`http://localhost:3000/api/student/applications/${email}`);
    const apps = await res.json();
    const tbody = document.getElementById('studentApplicationsTableBody');
    tbody.innerHTML = apps.map(a => `
        <tr>
            <td>${a.CLUB_NAME}</td>
            <td>${new Date(a.APP_DATE).toLocaleDateString()}</td>
            <td><span class="status-badge ${a.APPLICATION_STATUS.toLowerCase()}">${a.APPLICATION_STATUS}</span></td>
            <td><button class="btn-small btn-danger">Cancel</button></td>
        </tr>`).join('');
}

function showStudentSection(section) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-menu a').forEach(link => link.classList.remove('active'));
    
    document.getElementById('student' + section.charAt(0).toUpperCase() + section.slice(1) + 'Section').classList.add('active');
    document.getElementById('studentPageTitle').textContent = section.charAt(0).toUpperCase() + section.slice(1);
    
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
}