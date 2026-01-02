const API_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    const auth = checkAuth();
    if (!auth || auth.userType !== 'admin') {
        window.location.href = 'login.html';
        return;
    }
    loadClubs();
});

async function loadClubs() {
    const response = await fetch(`${API_URL}/admin/clubs`);
    const clubs = await response.json();
    const tableBody = document.querySelector('#adminClubsSection tbody');
    tableBody.innerHTML = clubs.map(club => `
        <tr>
            <td>${club.CLUB_NAME}</td>
            <td><span class="status-badge general">${club.CATEGORY_NAME || 'None'}</span></td>
            <td>${club.MEMBER_COUNT}</td>
            <td>${club.ADVISOR_NAME}</td>
            <td>
                <button class="btn-small" onclick="viewClubDetails('${club.CLUB_NAME}', '${club.ADVISOR_NAME}')">View</button>
                <button class="btn-small btn-danger" onclick="deleteClub(${club.CLUB_ID})">Delete</button>
            </td>
        </tr>`).join('');
}

async function loadStudents() {
    const response = await fetch(`${API_URL}/admin/students`);
    const students = await response.json();
    const tableBody = document.querySelector('#adminStudentsSection tbody');
    tableBody.innerHTML = students.map(s => `
        <tr>
            <td>${s.USER_NAME}</td>
            <td>${s.STUDENT_NUMBER}</td>
            <td>${s.STUDENT_FACULTY}</td>
            <td>${s.STUDENT_PROGRAM}</td>
            <td>${s.CLUBS_JOINED}</td>
            <td>
                <button class="btn-small" onclick="viewStudentDetails('${s.USER_NAME}', '${s.STUDENT_NUMBER}', '${s.STUDENT_FACULTY}')">View</button>
                <button class="btn-small btn-danger" onclick="deleteStudent(${s.USER_ID})">Delete</button>
            </td>
        </tr>`).join('');
}

async function deleteClub(id) {
    if (confirm("🚨 DELETE CLUB?\nThis will remove all members and history permanently.")) {
        const res = await fetch(`${API_URL}/admin/clubs/${id}`, { method: 'DELETE' });
        if (res.ok) { alert("Club deleted."); loadClubs(); }
    }
}

async function deleteStudent(id) {
    if (confirm("⚠️ DELETE STUDENT?\nThis will permanently remove this account.")) {
        const res = await fetch(`${API_URL}/admin/students/${id}`, { method: 'DELETE' });
        if (res.ok) { alert("Student deleted."); loadStudents(); }
    }
}

function viewClubDetails(name, advisor) {
    alert(`🏢 CLUB INFO\nName: ${name}\nAdvisor: ${advisor}`);
}

function viewStudentDetails(name, id, faculty) {
    alert(`👤 STUDENT INFO\nName: ${name}\nID: ${id}\nFaculty: ${faculty}`);
}

function showAdminSection(section) {
    // 1. Hide all content sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(s => s.classList.remove('active'));

    // 2. Remove 'active' class from ALL sidebar links
    const navLinks = document.querySelectorAll('.nav-menu a');
    navLinks.forEach(link => link.classList.remove('active'));

    // 3. Show the target section
    const sectionId = 'admin' + section.charAt(0).toUpperCase() + section.slice(1) + 'Section';
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // 4. Set the clicked link to active (using event.currentTarget)
    // IMPORTANT: Make sure the onclick in HTML passes 'event' if needed, 
    // or use this more robust selector:
    const activeLink = document.querySelector(`[onclick="showAdminSection('${section}')"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    // 5. Update page title
    const titles = {
        'clubs': 'All Clubs',
        'students': 'All Students',
        'announcements': 'All Announcements',
        'events': 'All Events'
    };
    document.getElementById('adminPageTitle').textContent = titles[section] || 'All Clubs';

    // Load data for the selected section
    if (section === 'clubs') loadClubs();
    if (section === 'students') loadStudents();
    if (section === 'announcements') loadAnnouncements();
    if (section === 'events') loadEvents();
}