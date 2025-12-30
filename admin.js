// admin.js - Student Affairs Admin Dashboard Functions

// Check authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    const auth = checkAuth();
    if (!auth || auth.userType !== 'admin') {
        window.location.href = 'index.html';
        return;
    }
});

/**
 * Show specific admin section
 * @param {string} section - Section name to display
 */
function showAdminSection(section) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(s => s.classList.remove('active'));

    const navLinks = document.querySelectorAll('.nav-menu a');
    navLinks.forEach(link => link.classList.remove('active'));

    const sectionId = 'admin' + section.charAt(0).toUpperCase() + section.slice(1) + 'Section';
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    const titles = {
        'clubs': 'All Clubs',
        'students': 'All Students',
        'announcements': 'All Announcements',
        'events': 'All Events'
    };
    document.getElementById('adminPageTitle').textContent = titles[section] || 'All Clubs';

    event.target.classList.add('active');
}

/**
 * Show add club form
 */
function showAddClubForm() {
    document.getElementById('addClubForm').style.display = 'block';
}

/**
 * Hide add club form
 */
function hideAddClubForm() {
    document.getElementById('addClubForm').style.display = 'none';
    // Reset form
    document.getElementById('newClubName').value = '';
    document.getElementById('newClubCategory').value = '';
    document.getElementById('newClubMission').value = '';
    document.getElementById('newClubEmail').value = '';
    document.getElementById('newClubPhone').value = '';
    document.getElementById('newClubAdvisor').value = '';
    document.getElementById('newClubAdvisorEmail').value = '';
}

/**
 * Add new club
 * @param {Event} event - Form submit event
 */
function addNewClub(event) {
    event.preventDefault();

    const name = document.getElementById('newClubName').value;
    const category = document.getElementById('newClubCategory').value;
    const mission = document.getElementById('newClubMission').value;
    const email = document.getElementById('newClubEmail').value;
    const phone = document.getElementById('newClubPhone').value;
    const advisor = document.getElementById('newClubAdvisor').value;
    const advisorEmail = document.getElementById('newClubAdvisorEmail').value;

    // Get clubs table body
    const tableBody = document.querySelector('#adminClubsSection tbody');
    const newRow = tableBody.insertRow(0);

    newRow.innerHTML = `
        <td>${name}</td>
        <td><span class="status-badge general">${category.charAt(0).toUpperCase() + category.slice(1)}</span></td>
        <td>0</td>
        <td>${advisor}</td>
        <td>
            <button class="btn-small" onclick="viewClubDetails(${Date.now()})">View</button>
            <button class="btn-small btn-danger" onclick="deleteClub(${Date.now()})">Delete</button>
        </td>
    `;

    hideAddClubForm();
    alert('New club added successfully!');
}

/**
 * View club details
 * @param {number} clubId - ID of club
 */
function viewClubDetails(clubId) {
    alert('Club details would open here. This will be implemented with backend integration.');
}

/**
 * Delete club
 * @param {number} clubId - ID of club
 */
function deleteClub(clubId) {
    if (confirm('Are you sure you want to delete this club? This action cannot be undone.')) {
        event.target.closest('tr').remove();
        alert('Club deleted successfully!');
    }
}

/**
 * View student details
 * @param {number} studentId - ID of student
 */
function viewStudentDetails(studentId) {
    alert('Student details would open here. This will be implemented with backend integration.');
}

/**
 * Delete student
 * @param {number} studentId - ID of student
 */
function deleteStudent(studentId) {
    if (confirm('Are you sure you want to delete this student account? This action cannot be undone.')) {
        event.target.closest('tr').remove();
        alert('Student account deleted successfully!');
    }
}

/**
 * Delete announcement (admin)
 * @param {number} announcementId - ID of announcement
 */
function deleteAnnouncementAdmin(announcementId) {
    if (confirm('Are you sure you want to delete this announcement?')) {
        event.target.closest('tr').remove();
        alert('Announcement deleted successfully!');
    }
}

/**
 * View event details
 * @param {number} eventId - ID of event
 */
function viewEventDetails(eventId) {
    alert('Event details would open here. This will be implemented with backend integration.');
}

// Auth functions are loaded from auth.js