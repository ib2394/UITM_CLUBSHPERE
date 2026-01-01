// club-admin.js - Club Admin Dashboard Functions

// Check authentication on page load
document.addEventListener('DOMContentLoaded', function () {
    const auth = checkAuth();
    if (!auth || auth.userType !== 'club_admin') {
        window.location.href = 'index.html';
        return;
    }

    loadClubAdminInfo();
});

/**
 * Load club admin information
 */
function loadClubAdminInfo() {
    const userInfo = loadUserInfo();
    document.getElementById('clubAdminUserName').textContent = userInfo.email.split('@')[0];
}

/**
 * Show specific club admin section
 * @param {string} section - Section name to display
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
}

/**
 * Show add announcement form
 */
function showAddAnnouncementForm() {
    document.getElementById('addAnnouncementForm').style.display = 'block';
}

/**
 * Hide add announcement form
 */
function hideAddAnnouncementForm() {
    document.getElementById('addAnnouncementForm').style.display = 'none';
    document.getElementById('annTitle').value = '';
    document.getElementById('annContent').value = '';
}

/**
 * Add new announcement
 * @param {Event} event - Form submit event
 */
function addAnnouncement(event) {
    event.preventDefault();

    const title = document.getElementById('annTitle').value;
    const content = document.getElementById('annContent').value;
    const type = document.getElementById('annType').value;

    // In real app, send to backend
    const tableBody = document.getElementById('announcementsTableBody');
    const newRow = tableBody.insertRow(0);

    const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    newRow.innerHTML = `
        <td>${title}</td>
        <td><span class="status-badge ${type}">${type.charAt(0).toUpperCase() + type.slice(1)}</span></td>
        <td>${currentDate}</td>
        <td>
            <button class="btn-small btn-danger" onclick="deleteAnnouncement(${Date.now()})">Delete</button>
        </td>
    `;

    hideAddAnnouncementForm();
    alert('Announcement posted successfully!');
}

/**
 * Delete announcement
 * @param {number} announcementId - ID of announcement
 */
function deleteAnnouncement(announcementId) {
    if (confirm('Are you sure you want to delete this announcement?')) {
        event.target.closest('tr').remove();
        alert('Announcement deleted successfully!');
    }
}

/**
 * Show add event form
 */
function showAddEventForm() {
    document.getElementById('addEventForm').style.display = 'block';
}

/**
 * Hide add event form
 */
function hideAddEventForm() {
    document.getElementById('addEventForm').style.display = 'none';
    document.getElementById('eventName').value = '';
    document.getElementById('eventDesc').value = '';
    document.getElementById('eventDateTime').value = '';
    document.getElementById('eventVenue').value = '';
}

/**
 * Add new event
 * @param {Event} event - Form submit event
 */
function addEvent(event) {
    event.preventDefault();

    const name = document.getElementById('eventName').value;
    const desc = document.getElementById('eventDesc').value;
    const type = document.getElementById('eventType').value;
    const dateTime = document.getElementById('eventDateTime').value;
    const venue = document.getElementById('eventVenue').value;

    const tableBody = document.getElementById('eventsTableBody');
    const newRow = tableBody.insertRow(0);

    // Format date
    const eventDate = new Date(dateTime);
    const formattedDate = eventDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    const formattedTime = eventDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });

    newRow.innerHTML = `
        <td>${name}</td>
        <td><span class="status-badge general">${type.charAt(0).toUpperCase() + type.slice(1)}</span></td>
        <td>${formattedDate} - ${formattedTime}</td>
        <td>${venue}</td>
        <td>
            <button class="btn-small btn-danger" onclick="deleteEvent(${Date.now()})">Delete</button>
        </td>
    `;

    hideAddEventForm();
    alert('Event created successfully!');
}

/**
 * Delete event
 * @param {number} eventId - ID of event
 */
function deleteEvent(eventId) {
    if (confirm('Are you sure you want to delete this event?')) {
        event.target.closest('tr').remove();
        alert('Event deleted successfully!');
    }
}

/**
 * View member profile
 * @param {number} memberId - ID of member
 */
function viewMemberProfile(memberId) {
    alert('Member profile would open here. This will be implemented with backend integration.');
}

/**
 * Remove member
 * @param {number} memberId - ID of member
 */
function removeMember(memberId) {
    if (confirm('Are you sure you want to remove this member from the club?')) {
        event.target.closest('tr').remove();
        alert('Member removed successfully!');
    }
}

/**
 * Approve applicant
 * @param {number} applicantId - ID of applicant
 */
function approveApplicant(applicantId) {
    if (confirm('Approve this application?')) {
        event.target.closest('tr').remove();
        alert('Application approved! The student has been added to the members list.');
    }
}

/**
 * Reject applicant
 * @param {number} applicantId - ID of applicant
 */
function rejectApplicant(applicantId) {
    if (confirm('Reject this application?')) {
        event.target.closest('tr').remove();
        alert('Application rejected.');
    }
}

/**
 * Toggle edit club profile form
 */
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

/**
 * Save club profile changes
 * @param {Event} event - Form submit event
 */
function saveClubProfile(event) {
    event.preventDefault();

    const mission = document.getElementById('editClubMission').value;
    const vision = document.getElementById('editClubVision').value;
    const email = document.getElementById('editClubEmail').value;
    const phone = document.getElementById('editClubPhone').value;

    // Update display
    document.getElementById('clubMission').textContent = mission;
    document.getElementById('clubVision').textContent = vision;
    document.getElementById('clubEmail').textContent = email;
    document.getElementById('clubPhone').textContent = phone;

    toggleEditClubProfile();
    alert('Club profile updated successfully!');
}

// Auth functions are loaded from auth.js