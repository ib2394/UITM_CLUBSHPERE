let allClubsData = [];
let isEditMode = false;

document.addEventListener('DOMContentLoaded', function() {
    const auth = checkAuth();
    const userEmail = sessionStorage.getItem('userEmail');
    if (!auth || auth.userType !== 'student' || !userEmail) {
        window.location.href = 'login.html';
        return;
    }
    loadStudentProfileFromDB(userEmail);
    loadDashboardStats(userEmail);
    loadAnnouncements(userEmail);
    loadExploreClubs();
    loadMyApplications(userEmail);
});

async function loadStudentProfileFromDB(email) {
    const res = await fetch(`http://localhost:3000/api/profile/${email}?t=${Date.now()}`);
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
    try {
        const res = await fetch(`http://localhost:3000/api/student/stats/${email}?t=${Date.now()}`);
        if (res.ok) {
            const stats = await res.json();
            document.getElementById('statJoinedClubs').textContent = stats.JOINED ?? 0;
            document.getElementById('statApps').textContent = stats.APPS ?? 0;
            document.getElementById('statEvents').textContent = stats.EVENTS ?? 0;
        }
    } catch (err) { console.error(err); }
}

function toggleEditProfile() {
    const editBtn = document.querySelector('.profile-header .btn-primary');
    if (!isEditMode) {
        const fields = ['profileName', 'profileStudentId', 'profileFaculty', 'profileProgram', 'profileSemester'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            const val = id === 'profileStudentId' ? el.textContent.replace('Student ID: ', '') : el.textContent;
            el.innerHTML = `<input type="${id === 'profileSemester' ? 'number' : 'text'}" id="edit_${id}" value="${val}" class="edit-input">`;
        });
        editBtn.textContent = "Save Profile";
        editBtn.onclick = saveProfile;
        isEditMode = true;
    }
}

async function saveProfile() {
    const email = sessionStorage.getItem('userEmail');
    const updateData = {
        email: email,
        name: document.getElementById('edit_profileName').value,
        student_number: document.getElementById('edit_profileStudentId').value,
        faculty: document.getElementById('edit_profileFaculty').value,
        program: document.getElementById('edit_profileProgram').value,
        semester: document.getElementById('edit_profileSemester').value
    };

    const res = await fetch('http://localhost:3000/api/profile/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
    });

    if (res.ok) {
        alert("✅ Profile updated!");
        isEditMode = false;
        const editBtn = document.querySelector('.profile-header .btn-primary');
        editBtn.textContent = "Edit Profile";
        editBtn.onclick = toggleEditProfile;
        loadStudentProfileFromDB(email);
    }
}

async function loadMyApplications(email) {
    const res = await fetch(`http://localhost:3000/api/student/applications/${email}?t=${Date.now()}`);
    const apps = await res.json();
    const tbody = document.getElementById('studentApplicationsTableBody');
    tbody.innerHTML = apps.length ? apps.map(a => `<tr><td>${a.CLUB_NAME}</td><td>${new Date(a.APP_DATE).toLocaleDateString()}</td><td><span class="status-badge ${a.APPLICATION_STATUS.toLowerCase()}">${a.APPLICATION_STATUS}</span></td><td><button class="btn-small btn-danger" onclick="cancelApplication(${a.APPLICATION_ID})">Cancel</button></td></tr>`).join('') : '<tr><td colspan="4">No applications found.</td></tr>';
}

async function cancelApplication(appId) {
    if(!confirm('Cancel?')) return;
    const res = await fetch(`http://localhost:3000/api/student/application/${appId}`, { method: 'DELETE' });
    if (res.ok) { alert("✅ Cancelled"); loadMyApplications(sessionStorage.getItem('userEmail')); loadDashboardStats(sessionStorage.getItem('userEmail')); }
}

async function applyToClub(clubId, clubName) {
    if(!confirm(`Apply to ${clubName}?`)) return;
    const res = await fetch('http://localhost:3000/api/student/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_email: sessionStorage.getItem('userEmail'), club_id: clubId }) });
    if (res.ok) { alert("✅ Applied"); loadMyApplications(sessionStorage.getItem('userEmail')); loadDashboardStats(sessionStorage.getItem('userEmail')); }
}

async function loadExploreClubs() {
    const res = await fetch(`http://localhost:3000/api/student/clubs`);
    const clubs = await res.json();
    allClubsData = clubs;
    renderClubs(clubs);
}

function renderClubs(clubs) {
    const grid = document.getElementById('clubsGrid');
    grid.innerHTML = clubs.length ? clubs.map(c => `<div class="club-card"><h3>${c.CLUB_NAME}</h3><p>${c.CATEGORY_NAME}</p><button class="btn-primary" onclick="applyToClub(${c.CLUB_ID}, '${c.CLUB_NAME}')">Apply</button></div>`).join('') : '<p>None found</p>';
}

function searchClubs() {
    const q = document.getElementById('clubSearchInput').value.toLowerCase();
    renderClubs(allClubsData.filter(c => c.CLUB_NAME.toLowerCase().includes(q)));
}

function showStudentSection(section) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById('student' + section.charAt(0).toUpperCase() + section.slice(1) + 'Section').classList.add('active');
}