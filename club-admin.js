// club-admin.js - Club Admin Dashboard Functions with Backend Integration

const API_URL = 'http://localhost:3000/api';
let currentClubId = null;
let currentClubName = null;

// Check authentication on page load
document.addEventListener('DOMContentLoaded', function () {
    const auth = checkAuth();
    if (!auth || auth.userType !== 'club_admin') {
        window.location.href = 'login.html';
        return;
    }

    loadClubAdminInfo();
    loadDashboardData();
});

/**
 * Load club admin information
 */
async function loadClubAdminInfo() {
    const userEmail = getUserData('userEmail');
    const userName = getUserData('userName');

    document.getElementById('clubAdminUserName').textContent = userName || userEmail.split('@')[0];

    try {
        // Get club profile
        const response = await fetch(`${API_URL}/club-admin/profile/${userEmail}`);
        const club = await response.json();

        if (response.ok) {
            currentClubId = club.CLUB_ID;
            currentClubName = club.CLUB_NAME;
            document.querySelector('.user-badge').textContent = club.CLUB_NAME;

            // Update club profile section
            document.getElementById('clubMission').textContent = club.CLUB_MISSION || 'Not set';
            document.getElementById('clubVision').textContent = club.CLUB_VISION || 'Not set';
            document.getElementById('clubEmail').textContent = club.CLUB_EMAIL || 'Not set';
            document.getElementById('clubPhone').textContent = club.CLUB_PHONE || 'Not set';
            document.getElementById('clubAdvisor').textContent = `${club.ADVISOR_NAME || 'Not assigned'} (${club.ADVISOR_EMAIL || 'N/A'})`;

            // Set form values
            document.getElementById('editClubMission').value = club.CLUB_MISSION || '';
            document.getElementById('editClubVision').value = club.CLUB_VISION || '';
            document.getElementById('editClubEmail').value = club.CLUB_EMAIL || '';
            document.getElementById('editClubPhone').value = club.CLUB_PHONE || '';
        }
    } catch (error) {
        console.error('Error loading club info:', error);
    }
}

/**
 * Load dashboard data
 */
async function loadDashboardData() {
    const userEmail = getUserData('userEmail');

    try {
        // Get statistics
        const statsResponse = await fetch(`${API_URL}/club-admin/stats/${userEmail}`);
        const stats = await statsResponse.json();

        if (statsResponse.ok) {
            document.querySelector('.stat-card:nth-child(1) .stat-number').textContent = stats.MEMBERS || 0;
            document.querySelector('.stat-card:nth-child(2) .stat-number').textContent = stats.PENDING_APPS || 0;
            document.querySelector('.stat-card:nth-child(3) .stat-number').textContent = stats.UPCOMING_EVENTS || 0;
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

/**
 * Show specific club admin section
 */
function showClubAdminSection(section) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(s => s.classList.remove('active'));

    const navLinks = document.querySelectorAll('.nav-menu a');
    navLinks.forEach(link => link.classList.remove('active'));

    const sectionId = 'clubAdmin' + section.charAt(0).toUpperCase() + section.slice(1) + 'Section';
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    const titles = {
        'dashboard': 'Dashboard',
        'announcements': 'Announcements',
        'events': 'Events',
        'members': 'Members',
        'applicants': 'Applicants',
        'clubProfile': 'Club Profile'
    };
    document.getElementById('clubAdminPageTitle').textContent = titles[section] || 'Dashboard';

    event.target.classList.add('active');

    // Load data for the section
    switch (section) {
        case 'announcements':
            loadAnnouncements();
            break;
        case 'events':
            loadEvents();
            break;
        case 'members':
            loadMembers();
            break;
        case 'applicants':
            loadApplicants();
            break;
    }
}

/* ===== ANNOUNCEMENTS ===== */

async function loadAnnouncements() {
    const userEmail = getUserData('userEmail');

    try {
        const response = await fetch(`${API_URL}/club-admin/announcements/${userEmail}`);
        const announcements = await response.json();

        const tbody = document.getElementById('announcementsTableBody');
        tbody.innerHTML = '';

        if (announcements.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem; color: #999;">No announcements yet</td></tr>';
            return;
        }

        announcements.forEach(ann => {
            const date = new Date(ann.ANNC_DATE).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${ann.ANNC_TITLE}</td>
                <td><span class="status-badge ${ann.ANNC_TYPE.toLowerCase()}">${ann.ANNC_TYPE}</span></td>
                <td>${date}</td>
                <td>
                    <button class="btn-small btn-danger" onclick="deleteAnnouncement(${ann.ANNC_ID})">Delete</button>
                </td>
            `;
        });
    } catch (error) {
        console.error('Error loading announcements:', error);
        alert('Error loading announcements. Please try again.');
    }
}

function showAddAnnouncementForm() {
    document.getElementById('addAnnouncementForm').style.display = 'block';
}

function hideAddAnnouncementForm() {
    document.getElementById('addAnnouncementForm').style.display = 'none';
    document.getElementById('annTitle').value = '';
    document.getElementById('annContent').value = '';
    document.getElementById('annType').value = 'general';
}

async function addAnnouncement(event) {
    event.preventDefault();

    const title = document.getElementById('annTitle').value;
    const content = document.getElementById('annContent').value;
    const type = document.getElementById('annType').value;
    const userEmail = getUserData('userEmail');

    try {
        const response = await fetch(`${API_URL}/club-admin/announcements`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: userEmail,
                title,
                content,
                type
            })
        });

        const result = await response.json();

        if (response.ok) {
            alert('✅ Announcement posted successfully!');
            hideAddAnnouncementForm();
            loadAnnouncements();
        } else {
            alert('❌ ' + result.message);
        }
    } catch (error) {
        console.error('Error adding announcement:', error);
        alert('🚨 Error adding announcement. Please try again.');
    }
}

async function deleteAnnouncement(announcementId) {
    if (!confirm('Are you sure you want to delete this announcement?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/club-admin/announcements/${announcementId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (response.ok) {
            alert('✅ Announcement deleted successfully!');
            loadAnnouncements();
        } else {
            alert('❌ ' + result.message);
        }
    } catch (error) {
        console.error('Error deleting announcement:', error);
        alert('🚨 Error deleting announcement. Please try again.');
    }
}

/* ===== EVENTS ===== */

async function loadEvents() {
    const userEmail = getUserData('userEmail');

    try {
        const response = await fetch(`${API_URL}/club-admin/events/${userEmail}`);
        const events = await response.json();

        const tbody = document.getElementById('eventsTableBody');
        tbody.innerHTML = '';

        if (events.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem; color: #999;">No events yet</td></tr>';
            return;
        }

        events.forEach(evt => {
            const eventDate = new Date(evt.EVENT_DATETIME);
            const formattedDate = eventDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            const formattedTime = eventDate.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });

            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${evt.EVENT_NAME}</td>
                <td><span class="status-badge general">${evt.EVENT_TYPE}</span></td>
                <td>${formattedDate} - ${formattedTime}</td>
                <td>
                    <button class="btn-small btn-danger" onclick="deleteEvent(${evt.EVENT_ID})">Delete</button>
                </td>
            `;
        });
    } catch (error) {
        console.error('Error loading events:', error);
        alert('Error loading events. Please try again.');
    }
}

function showAddEventForm() {
    document.getElementById('addEventForm').style.display = 'block';
}

function hideAddEventForm() {
    document.getElementById('addEventForm').style.display = 'none';
    document.getElementById('eventName').value = '';
    document.getElementById('eventDesc').value = '';
    document.getElementById('eventType').value = 'workshop';
    document.getElementById('eventDateTime').value = '';
}

async function addEvent(event) {
    event.preventDefault();

    const name = document.getElementById('eventName').value;
    const desc = document.getElementById('eventDesc').value;
    const type = document.getElementById('eventType').value;
    const dateTime = document.getElementById('eventDateTime').value;
    const userEmail = getUserData('userEmail');

    try {
        const response = await fetch(`${API_URL}/club-admin/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: userEmail,
                name,
                description: desc,
                type,
                datetime: dateTime
            })
        });

        const result = await response.json();

        if (response.ok) {
            alert('✅ Event created successfully!');
            hideAddEventForm();
            loadEvents();
            loadDashboardData(); // Refresh stats
        } else {
            alert('❌ ' + result.message);
        }
    } catch (error) {
        console.error('Error adding event:', error);
        alert('🚨 Error adding event. Please try again.');
    }
}

async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/club-admin/events/${eventId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (response.ok) {
            alert('✅ Event deleted successfully!');
            loadEvents();
            loadDashboardData(); // Refresh stats
        } else {
            alert('❌ ' + result.message);
        }
    } catch (error) {
        console.error('Error deleting event:', error);
        alert('🚨 Error deleting event. Please try again.');
    }
}

/* ===== MEMBERS ===== */

async function loadMembers() {
    const userEmail = getUserData('userEmail');

    try {
        const response = await fetch(`${API_URL}/club-admin/members/${userEmail}`);
        const members = await response.json();

        const tbody = document.querySelector('#clubAdminMembersSection tbody');
        tbody.innerHTML = '';

        if (members.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: #999;">No members yet</td></tr>';
            return;
        }

        members.forEach(member => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${member.USER_NAME}</td>
                <td>${member.STUDENT_NUMBER}</td>
                <td>${member.STUDENT_FACULTY}</td>
                <td>Member</td>
                <td>
                    <button class="btn-small" onclick="viewMemberProfile(${member.USER_ID})">View</button>
                    <button class="btn-small btn-danger" onclick="removeMember(${member.USER_ID})">Remove</button>
                </td>
            `;
        });
    } catch (error) {
        console.error('Error loading members:', error);
        alert('Error loading members. Please try again.');
    }
}

function viewMemberProfile(memberId) {
    alert('Member profile view will be implemented. Member ID: ' + memberId);
}

async function removeMember(memberId) {
    if (!confirm('Are you sure you want to remove this member from the club?')) {
        return;
    }

    const userEmail = getUserData('userEmail');

    try {
        const response = await fetch(`${API_URL}/club-admin/members/${memberId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail })
        });

        const result = await response.json();

        if (response.ok) {
            alert('✅ Member removed successfully!');
            loadMembers();
            loadDashboardData(); // Refresh stats
        } else {
            alert('❌ ' + result.message);
        }
    } catch (error) {
        console.error('Error removing member:', error);
        alert('🚨 Error removing member. Please try again.');
    }
}

/* ===== APPLICANTS ===== */

async function loadApplicants() {
    const userEmail = getUserData('userEmail');

    try {
        const response = await fetch(`${API_URL}/club-admin/applicants/${userEmail}`);
        const applicants = await response.json();

        const tbody = document.querySelector('#clubAdminApplicantsSection tbody');
        tbody.innerHTML = '';

        if (applicants.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: #999;">No pending applications</td></tr>';
            return;
        }

        applicants.forEach(app => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${app.USER_NAME}</td>
                <td>${app.STUDENT_NUMBER}</td>
                <td>${app.STUDENT_FACULTY}</td>
                <td>Pending</td>
                <td>
                    <button class="btn-small btn-success" onclick="approveApplicant(${app.APPLICATION_ID})">Approve</button>
                    <button class="btn-small btn-danger" onclick="rejectApplicant(${app.APPLICATION_ID})">Reject</button>
                </td>
            `;
        });
    } catch (error) {
        console.error('Error loading applicants:', error);
        alert('Error loading applicants. Please try again.');
    }
}

async function approveApplicant(applicationId) {
    if (!confirm('Approve this application?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/club-admin/applicants/${applicationId}/approve`, {
            method: 'PUT'
        });

        const result = await response.json();

        if (response.ok) {
            alert('✅ Application approved! The student has been added to the members list.');
            loadApplicants();
            loadDashboardData(); // Refresh stats
        } else {
            alert('❌ ' + result.message);
        }
    } catch (error) {
        console.error('Error approving applicant:', error);
        alert('🚨 Error approving application. Please try again.');
    }
}

async function rejectApplicant(applicationId) {
    if (!confirm('Reject this application?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/club-admin/applicants/${applicationId}/reject`, {
            method: 'PUT'
        });

        const result = await response.json();

        if (response.ok) {
            alert('✅ Application rejected.');
            loadApplicants();
            loadDashboardData(); // Refresh stats
        } else {
            alert('❌ ' + result.message);
        }
    } catch (error) {
        console.error('Error rejecting applicant:', error);
        alert('🚨 Error rejecting application. Please try again.');
    }
}

/* ===== CLUB PROFILE ===== */

function toggleEditClubProfile() {
    const editForm = document.getElementById('editClubProfileForm');
    const profileDetails = document.querySelector('.club-profile-details');

    if (editForm.style.display === 'none' || !editForm.style.display) {
        editForm.style.display = 'block';
        profileDetails.style.display = 'none';
    } else {
        editForm.style.display = 'none';
        profileDetails.style.display = 'flex';
    }
}

async function saveClubProfile(event) {
    event.preventDefault();

    const mission = document.getElementById('editClubMission').value;
    const vision = document.getElementById('editClubVision').value;
    const email = document.getElementById('editClubEmail').value;
    const phone = document.getElementById('editClubPhone').value;
    const userEmail = getUserData('userEmail');

    try {
        const response = await fetch(`${API_URL}/club-admin/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: userEmail,
                mission,
                vision,
                club_email: email,
                club_phone: phone
            })
        });

        const result = await response.json();

        if (response.ok) {
            // Update display
            document.getElementById('clubMission').textContent = mission;
            document.getElementById('clubVision').textContent = vision;
            document.getElementById('clubEmail').textContent = email;
            document.getElementById('clubPhone').textContent = phone;

            toggleEditClubProfile();
            alert('✅ Club profile updated successfully!');
        } else {
            alert('❌ ' + result.message);
        }
    } catch (error) {
        console.error('Error updating club profile:', error);
        alert('🚨 Error updating profile. Please try again.');
    }
}