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
    if(select) {
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
}

async function addNewClub(event) {
    event.preventDefault();
    const data = {
        club_name: document.getElementById('newClubName').value,
        category_id: document.getElementById('newClubCategory').value,
        club_mission: document.getElementById('newClubMission').value,
        club_vision: document.getElementById('newClubVision').value,
        club_email: document.getElementById('newClubEmail').value,
        club_phone: document.getElementById('newClubPhone').value,
        advisor_name: document.getElementById('newClubAdvisor').value,
        advisor_email: document.getElementById('newClubAdvisorEmail').value,
        advisor_phone: "" 
    };

    const res = await fetch(`${API_URL}/admin/clubs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (res.ok) {
        alert("✅ Club added!");
        hideAddClubForm();
        loadClubs();
    }
}