// ============================================
// admin.js
// ============================================

const API_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    const auth = checkAuth();
    if (!auth || auth.userType !== 'admin') {
        window.location.href = 'login.html';
        return;
    }
    loadClubs();
    loadCategories();
});

async function loadCategories() {
    const res = await fetch(`${API_URL}/categories`);
    const cats = await res.json();
    const select = document.getElementById('newClubCategory');
    if (select) {
        select.innerHTML = '<option value="">Select category</option>' +
            cats.map(c => `<option value="${c.CATEGORY_ID}">${c.CATEGORY_NAME}</option>`).join('');
    }
}

async function loadClubs() {
    const response = await fetch(`${API_URL}/admin/clubs`);
    const clubs = await response.json();
    const tableBody = document.getElementById('clubsTableBody');
    if (tableBody) {
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
}

async function loadStudents() {
    const response = await fetch(`${API_URL}/admin/students`);
    const students = await response.json();
    const tableBody = document.getElementById('studentsTableBody');
    if (tableBody) {
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
}

async function deleteClub(id) {
    if (confirm("🚨 DELETE CLUB?\nThis will remove all history permanently.")) {
        const res = await fetch(`${API_URL}/admin/clubs/${id}`, { method: 'DELETE' });
        if (res.ok) { alert("Club deleted."); loadClubs(); }
    }
}

async function deleteStudent(id) {
    if (confirm("⚠️ DELETE STUDENT?\nThis account will be permanently removed.")) {
        const res = await fetch(`${API_URL}/admin/students/${id}`, { method: 'DELETE' });
        if (res.ok) { alert("Student deleted."); loadStudents(); }
    }
}

function viewClubDetails(name, advisor) { alert(`🏢 CLUB INFO\nName: ${name}\nAdvisor: ${advisor}`); }
function viewStudentDetails(name, id, faculty) { alert(`👤 STUDENT INFO\nName: ${name}\nID: ${id}\nFaculty: ${faculty}`); }

function showAdminSection(section) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-menu a').forEach(link => link.classList.remove('active'));

    const targetSection = document.getElementById('admin' + section.charAt(0).toUpperCase() + section.slice(1) + 'Section');
    if (targetSection) targetSection.classList.add('active');

    document.getElementById('adminPageTitle').textContent = section.charAt(0).toUpperCase() + section.slice(1);

    if (event && event.currentTarget) event.currentTarget.classList.add('active');

    if (section === 'clubs') loadClubs();
    if (section === 'students') loadStudents();
}

function showAddClubForm() {
    document.getElementById('addClubForm').style.display = 'block';
}

function hideAddClubForm() {
    document.getElementById('addClubForm').style.display = 'none';
    // Reset form
    document.getElementById('addClubFormElement').reset();
}

async function addNewClub(event) {
    event.preventDefault();

    // Get form values
    const clubName = document.getElementById('newClubName').value;
    const categoryId = document.getElementById('newClubCategory').value;
    const clubMission = document.getElementById('newClubMission').value;
    const clubVision = document.getElementById('newClubVision').value;
    const clubEmail = document.getElementById('newClubEmail').value;
    const clubPhone = document.getElementById('newClubPhone').value;
    const advisorName = document.getElementById('newClubAdvisor').value;
    const advisorEmail = document.getElementById('newClubAdvisorEmail').value;

    // Club admin credentials
    const clubAdminName = document.getElementById('newClubAdminName').value;
    const clubAdminEmail = document.getElementById('newClubAdminEmail').value;
    const clubAdminPassword = document.getElementById('newClubAdminPassword').value;

    const data = {
        club_name: clubName,
        category_id: categoryId,
        club_mission: clubMission,
        club_vision: clubVision,
        club_email: clubEmail,
        club_phone: clubPhone,
        advisor_name: advisorName,
        advisor_email: advisorEmail,
        // Fixed field names to match server expectations:
        admin_name: clubAdminName,
        admin_email: clubAdminEmail,
        admin_password: clubAdminPassword
    };

    const res = await fetch(`${API_URL}/admin/clubs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    const result = await res.json();

    if (res.ok) {
        alert(`✅ Club added successfully!\n\nClub Admin Login Details:\nEmail: ${clubAdminEmail}\nPassword: ${clubAdminPassword}\n\nPlease share these credentials with the club admin.`);
        hideAddClubForm();
        loadClubs();
    } else {
        alert('❌ ' + result.message);
    }
}