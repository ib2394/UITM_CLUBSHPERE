// admin.js - Student Affairs Admin Dashboard Functions

const API_URL = 'http://localhost:3000/api';

// Check authentication on page load
document.addEventListener('DOMContentLoaded', function () {
    const auth = checkAuth();
    if (!auth || auth.userType !== 'admin') {
        window.location.href = 'index.html';
        return;
    }

    // Load initial data
    loadClubs();
    loadCategories();
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

    // Load data for the selected section
    switch (section) {
        case 'clubs':
            loadClubs();
            break;
        case 'students':
            loadStudents();
            break;
        case 'announcements':
            loadAnnouncements();
            break;
        case 'events':
            loadEvents();
            break;
    }
}

/**
 * Load all clubs from database
 */
async function loadClubs() {
    try {
        const response = await fetch(`${API_URL}/admin/clubs`);
        const clubs = await response.json();

        const tableBody = document.querySelector('#adminClubsSection tbody');
        tableBody.innerHTML = '';

        if (clubs.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No clubs found</td></tr>';
            return;
        }

        clubs.forEach(club => {
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td>${club.CLUB_NAME || 'N/A'}</td>
                <td><span class="status-badge general">${club.CATEGORY_NAME || 'Uncategorized'}</span></td>
                <td>${club.MEMBER_COUNT || 0}</td>
                <td>${club.ADVISOR_NAME || 'N/A'}</td>
                <td>
                    <button class="btn-small" onclick="viewClubDetails(${club.CLUB_ID})">View</button>
                    <button class="btn-small btn-danger" onclick="deleteClub(${club.CLUB_ID})">Delete</button>
                </td>
            `;
        });
    } catch (error) {
        console.error('Error loading clubs:', error);
        alert('Failed to load clubs. Please try again.');
    }
}

/**
 * Load all students from database
 */
async function loadStudents() {
    try {
        const response = await fetch(`${API_URL}/admin/students`);
        const students = await response.json();

        const tableBody = document.querySelector('#adminStudentsSection tbody');
        tableBody.innerHTML = '';

        if (students.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No students found</td></tr>';
            return;
        }

        students.forEach(student => {
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td>${student.USER_NAME || 'N/A'}</td>
                <td>${student.STUDENT_NUMBER || 'N/A'}</td>
                <td>${student.STUDENT_FACULTY || 'N/A'}</td>
                <td>${student.STUDENT_PROGRAM || 'N/A'}</td>
                <td>${student.CLUBS_JOINED || 0}</td>
                <td>
                    <button class="btn-small" onclick="viewStudentDetails(${student.USER_ID})">View</button>
                    <button class="btn-small btn-danger" onclick="deleteStudent(${student.USER_ID})">Delete</button>
                </td>
            `;
        });
    } catch (error) {
        console.error('Error loading students:', error);
        alert('Failed to load students. Please try again.');
    }
}

/**
 * Load all announcements from database
 */
async function loadAnnouncements() {
    try {
        const response = await fetch(`${API_URL}/admin/announcements`);
        const announcements = await response.json();

        const tableBody = document.querySelector('#adminAnnouncementsSection tbody');
        tableBody.innerHTML = '';

        if (announcements.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No announcements found</td></tr>';
            return;
        }

        announcements.forEach(annc => {
            const date = new Date(annc.ANNC_DATE);
            const formattedDate = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            const row = tableBody.insertRow();
            row.innerHTML = `
                <td>${annc.ANNC_TITLE || 'N/A'}</td>
                <td>${annc.CLUB_NAME || 'N/A'}</td>
                <td><span class="status-badge ${annc.ANNC_TYPE === 'urgent' ? 'urgent' : 'general'}">${annc.ANNC_TYPE || 'General'}</span></td>
                <td>${formattedDate}</td>
                <td>
                    <button class="btn-small" onclick="viewAnnouncementDetails(${annc.ANNC_ID})">View</button>
                    <button class="btn-small btn-danger" onclick="deleteAnnouncementAdmin(${annc.ANNC_ID})">Delete</button>
                </td>
            `;
        });
    } catch (error) {
        console.error('Error loading announcements:', error);
        alert('Failed to load announcements. Please try again.');
    }
}

/**
 * Load all events from database
 */
async function loadEvents() {
    try {
        const response = await fetch(`${API_URL}/admin/events`);
        const events = await response.json();

        const tableBody = document.querySelector('#adminEventsSection tbody');
        tableBody.innerHTML = '';

        if (events.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No events found</td></tr>';
            return;
        }

        events.forEach(event => {
            const datetime = new Date(event.EVENT_DATETIME);
            const formattedDateTime = datetime.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }) + ' - ' + datetime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });

            const row = tableBody.insertRow();
            row.innerHTML = `
                <td>${event.EVENT_NAME || 'N/A'}</td>
                <td>${event.CLUB_NAME || 'N/A'}</td>
                <td><span class="status-badge general">${event.EVENT_TYPE || 'Event'}</span></td>
                <td>${formattedDateTime}</td>
                <td>${event.EVENT_DESC || 'N/A'}</td>
                <td>
                    <button class="btn-small" onclick="viewEventDetails(${event.EVENT_ID})">View</button>
                    <button class="btn-small btn-danger" onclick="deleteEvent(${event.EVENT_ID})">Delete</button>
                </td>
            `;
        });
    } catch (error) {
        console.error('Error loading events:', error);
        alert('Failed to load events. Please try again.');
    }
}

/**
 * Load categories for dropdown
 */
async function loadCategories() {
    try {
        const response = await fetch(`${API_URL}/categories`);
        const categories = await response.json();

        const select = document.getElementById('newClubCategory');
        select.innerHTML = '<option value="">Select category</option>';

        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.CATEGORY_ID;
            option.textContent = cat.CATEGORY_NAME;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading categories:', error);
    }
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
    document.getElementById('newClubName').value = '';
    document.getElementById('newClubCategory').value = '';
    document.getElementById('newClubMission').value = '';
    document.getElementById('newClubVision').value = '';
    document.getElementById('newClubEmail').value = '';
    document.getElementById('newClubPhone').value = '';
    document.getElementById('newClubAdvisor').value = '';
    document.getElementById('newClubAdvisorEmail').value = '';
}

/**
 * Add new club
 * @param {Event} event - Form submit event
 */
async function addNewClub(event) {
    event.preventDefault();

    const clubData = {
        club_name: document.getElementById('newClubName').value,
        category_id: document.getElementById('newClubCategory').value,
        club_mission: document.getElementById('newClubMission').value,
        club_vision: document.getElementById('newClubVision').value,
        club_email: document.getElementById('newClubEmail').value,
        club_phone: document.getElementById('newClubPhone').value,
        advisor_name: document.getElementById('newClubAdvisor').value,
        advisor_email: document.getElementById('newClubAdvisorEmail').value
    };

    try {
        const response = await fetch(`${API_URL}/admin/clubs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(clubData)
        });

        const result = await response.json();

        if (response.ok) {
            alert('New club added successfully!');
            hideAddClubForm();
            loadClubs();
        } else {
            alert('Failed to add club: ' + result.message);
        }
    } catch (error) {
        console.error('Error adding club:', error);
        alert('Failed to add club. Please try again.');
    }
}

/**
 * View club details
 * @param {number} clubId - ID of club
 */
function viewClubDetails(clubId) {
    alert(`Club details for ID ${clubId} would open here. This will be implemented with a detailed view modal.`);
}

/**
 * Delete club
 * @param {number} clubId - ID of club
 */
async function deleteClub(clubId) {
    if (!confirm('Are you sure you want to delete this club? This action cannot be undone and will remove all related data (members, events, announcements).')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/clubs/${clubId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (response.ok) {
            alert('Club deleted successfully!');
            loadClubs();
        } else {
            alert('Failed to delete club: ' + result.message);
        }
    } catch (error) {
        console.error('Error deleting club:', error);
        alert('Failed to delete club. Please try again.');
    }
}

/**
 * View student details
 * @param {number} studentId - ID of student
 */
function viewStudentDetails(studentId) {
    alert(`Student details for ID ${studentId} would open here. This will be implemented with a detailed view modal.`);
}

/**
 * Delete student
 * @param {number} studentId - ID of student
 */
async function deleteStudent(studentId) {
    if (!confirm('Are you sure you want to delete this student account? This action cannot be undone and will remove all related data.')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/students/${studentId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (response.ok) {
            alert('Student account deleted successfully!');
            loadStudents();
        } else {
            alert('Failed to delete student: ' + result.message);
        }
    } catch (error) {
        console.error('Error deleting student:', error);
        alert('Failed to delete student. Please try again.');
    }
}

/**
 * View announcement details
 * @param {number} announcementId - ID of announcement
 */
function viewAnnouncementDetails(announcementId) {
    alert(`Announcement details for ID ${announcementId} would open here. This will be implemented with a detailed view modal.`);
}

/**
 * Delete announcement (admin)
 * @param {number} announcementId - ID of announcement
 */
async function deleteAnnouncementAdmin(announcementId) {
    if (!confirm('Are you sure you want to delete this announcement?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/announcements/${announcementId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (response.ok) {
            alert('Announcement deleted successfully!');
            loadAnnouncements();
        } else {
            alert('Failed to delete announcement: ' + result.message);
        }
    } catch (error) {
        console.error('Error deleting announcement:', error);
        alert('Failed to delete announcement. Please try again.');
    }
}

/**
 * View event details
 * @param {number} eventId - ID of event
 */
function viewEventDetails(eventId) {
    alert(`Event details for ID ${eventId} would open here. This will be implemented with a detailed view modal.`);
}

/**
 * Delete event
 * @param {number} eventId - ID of event
 */
async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/events/${eventId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (response.ok) {
            alert('Event deleted successfully!');
            loadEvents();
        } else {
            alert('Failed to delete event: ' + result.message);
        }
    } catch (error) {
        console.error('Error deleting event:', error);
        alert('Failed to delete event. Please try again.');
    }
}

// Auth functions are loaded from auth.js