// student.js - Student Dashboard Functionality

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function () {
    const auth = checkAuth();
    if (!auth || !auth.isLoggedIn) {
        return; // checkAuth will redirect to login
    }

    // Load initial data
    loadStudentData();
    loadDashboardStats();
    loadAnnouncements('all'); // Default: show all (public + my clubs' private)
    loadEvents('all'); // Default: show all events
    loadClubs();
    loadApplications();
});

// Store current filters
let currentAnnouncementFilter = 'all';
let currentEventFilter = 'all';

// Filter announcements
function filterAnnouncements(filter) {
    currentAnnouncementFilter = filter;

    // Update button states
    document.querySelectorAll('.dashboard-section .filter-btn[data-filter]').forEach(btn => {
        if (btn.getAttribute('onclick').includes('Announcements')) {
            if (btn.getAttribute('data-filter') === filter) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    });

    // Reload announcements with filter
    loadAnnouncements(filter);
}

// Filter events
function filterEvents(filter) {
    currentEventFilter = filter;

    // Update button states
    document.querySelectorAll('.dashboard-section .filter-btn[data-filter]').forEach(btn => {
        if (btn.getAttribute('onclick').includes('Events')) {
            if (btn.getAttribute('data-filter') === filter) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    });

    // Reload events with filter
    loadEvents(filter);
}

// Navigation function with style updates
function showStudentSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    // Remove active class from all nav links
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.classList.remove('active');
    });

    // Show selected section
    const sectionMap = {
        'dashboard': 'studentDashboardSection',
        'explore': 'studentExploreSection',
        'myApplications': 'studentMyApplicationsSection',
        'profile': 'studentProfileSection'
    };

    const targetSection = document.getElementById(sectionMap[sectionName]);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Update page title
    const titleMap = {
        'dashboard': 'Dashboard',
        'explore': 'Explore Clubs',
        'myApplications': 'My Applications',
        'profile': 'Profile'
    };

    const pageTitle = document.getElementById('studentPageTitle');
    if (pageTitle) {
        pageTitle.textContent = titleMap[sectionName] || 'Dashboard';
    }

    // Add active class to clicked nav link
    const clickedLink = event?.target;
    if (clickedLink && clickedLink.tagName === 'A') {
        clickedLink.classList.add('active');
    } else {
        // If event is not available, find and activate the link by section name
        const navLinks = document.querySelectorAll('.nav-menu a');
        navLinks.forEach(link => {
            const onclick = link.getAttribute('onclick');
            if (onclick && onclick.includes(`'${sectionName}'`)) {
                link.classList.add('active');
            }
        });
    }

    // Reload data when switching sections
    switch (sectionName) {
        case 'explore':
            loadClubs();
            break;
        case 'myApplications':
            loadApplications();
            break;
        case 'profile':
            loadProfile();
            break;
        case 'dashboard':
            loadDashboardStats();
            loadAnnouncements(currentAnnouncementFilter);
            loadEvents(currentEventFilter);
            break;
    }
}

// Load student data and display name
async function loadStudentData() {
    const auth = checkAuth();
    if (!auth) return;

    const userNameDisplay = document.getElementById('studentUserName');
    if (userNameDisplay) {
        userNameDisplay.textContent = auth.userName || 'Student';
    }
}

// Load dashboard statistics
async function loadDashboardStats() {
    const auth = checkAuth();
    if (!auth) return;

    try {
        const response = await fetch(`http://localhost:3000/api/student/stats/${auth.userEmail}`);
        if (response.ok) {
            const stats = await response.json();

            document.getElementById('statJoinedClubs').textContent = stats.JOINED || 0;
            document.getElementById('statEvents').textContent = stats.EVENTS || 0;
            document.getElementById('statApps').textContent = stats.APPS || 0;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load announcements with filter
async function loadAnnouncements(filter = 'all') {
    const auth = checkAuth();
    if (!auth) return;

    try {
        const response = await fetch(`http://localhost:3000/api/student/announcements/${auth.userEmail}?filter=${filter}`);
        if (response.ok) {
            const announcements = await response.json();
            displayAnnouncements(announcements);
        }
    } catch (error) {
        console.error('Error loading announcements:', error);
        displayAnnouncements([]);
    }
}

function displayAnnouncements(announcements) {
    const container = document.getElementById('dynamicAnnouncements');
    if (!container) return;

    if (announcements.length === 0) {
        const message = currentAnnouncementFilter === 'my-clubs'
            ? 'No announcements from your clubs yet.'
            : 'No announcements available. Join a club to see more!';
        container.innerHTML = `<p style="color: #999; text-align: center; padding: 2rem;">${message}</p>`;
        return;
    }

    container.innerHTML = announcements.slice(0, 10).map(annc => {
        const date = new Date(annc.ANNC_DATE);
        const formattedDate = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

        // Visibility badge (Public or Private from My Club)
        let visibilityBadge = '';
        if (annc.ANNC_TYPE === 'Public') {
            visibilityBadge = '<span class="status-badge general" style="font-size: 0.75rem;">🌐 Public</span>';
        } else if (annc.ANNC_TYPE === 'Private') {
            visibilityBadge = '<span class="status-badge" style="background: #fef3c7; color: #92400e; font-size: 0.75rem;">🔒 Members Only</span>';
        }

        // Source badge (if showing all announcements)
        let sourceBadge = '';
        if (currentAnnouncementFilter === 'all' && annc.SOURCE) {
            if (annc.SOURCE === 'My Club') {
                sourceBadge = '<span class="status-badge" style="background: #e0e7ff; color: #667eea; font-size: 0.75rem;">📌 My Club</span>';
            }
        }

        return `
            <div class="announcement-item">
                <div class="announcement-header">
                    <strong>${annc.ANNC_TITLE || 'Announcement'}</strong>
                    <span class="date">${formattedDate}</span>
                </div>
                <p style="margin: 0.5rem 0;">${annc.ANNC_CONTENT || 'No content'}</p>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
                    <small style="color: #666;">From: ${annc.CLUB_NAME || 'Club'}</small>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        ${sourceBadge}
                        ${visibilityBadge}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Load events with filter
async function loadEvents(filter = 'all') {
    const auth = checkAuth();
    if (!auth) return;

    try {
        const response = await fetch(`http://localhost:3000/api/student/events/${auth.userEmail}?filter=${filter}`);
        if (response.ok) {
            const events = await response.json();
            displayEvents(events);
        }
    } catch (error) {
        console.error('Error loading events:', error);
        displayEvents([]);
    }
}

function displayEvents(events) {
    const container = document.getElementById('dynamicEvents');
    if (!container) return;

    if (events.length === 0) {
        const message = currentEventFilter === 'my-clubs'
            ? 'No upcoming events from your clubs.'
            : 'No upcoming events available.';
        container.innerHTML = `<p style="color: #999; text-align: center; padding: 2rem;">${message}</p>`;
        return;
    }

    container.innerHTML = events.slice(0, 5).map(event => {
        const eventDate = new Date(event.EVENT_DATETIME);
        const day = eventDate.getDate();
        const month = eventDate.toLocaleDateString('en-GB', { month: 'short' });
        const time = eventDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

        // Visibility badge
        let visibilityBadge = '';
        if (event.EVENT_TYPE === 'Public') {
            visibilityBadge = '<span class="status-badge general" style="font-size: 0.75rem;">🌐 Open to All</span>';
        } else if (event.EVENT_TYPE === 'Private') {
            visibilityBadge = '<span class="status-badge" style="background: #fef3c7; color: #92400e; font-size: 0.75rem;">🔒 Members Only</span>';
        }

        // Source badge
        let sourceBadge = '';
        if (currentEventFilter === 'all' && event.SOURCE === 'My Club') {
            sourceBadge = '<span class="status-badge" style="background: #e0e7ff; color: #667eea; font-size: 0.75rem;">📌 My Club</span>';
        }

        return `
            <div class="event-item-simple">
                <div class="event-date-badge">
                    <div class="date-day">${day}</div>
                    <div class="date-month">${month}</div>
                </div>
                <div class="event-info" style="flex: 1;">
                    <strong>${event.EVENT_NAME}</strong>
                    <p>${event.EVENT_DESC || 'No description'}</p>
                    <small style="color: #999;">🕐 ${time} | 📍 ${event.CLUB_NAME}</small>
                    <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; flex-wrap: wrap;">
                        ${sourceBadge}
                        ${visibilityBadge}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Load all clubs
async function loadClubs() {
    try {
        const response = await fetch('http://localhost:3000/api/student/clubs');
        if (response.ok) {
            const clubs = await response.json();
            displayClubs(clubs);
            loadCategoryFilters(clubs);
        }
    } catch (error) {
        console.error('Error loading clubs:', error);
        displayClubs([]);
    }
}

function displayClubs(clubs) {
    const container = document.getElementById('clubsGrid');
    if (!container) return;

    if (clubs.length === 0) {
        container.innerHTML = '<p style="color: #999; text-align: center; grid-column: 1/-1;">No clubs available</p>';
        return;
    }

    container.innerHTML = clubs.map(club => `
        <div class="club-card" data-category="${club.CATEGORY_NAME || 'Other'}">
            <div class="club-card-header">
                <h3>${club.CLUB_NAME}</h3>
                <span class="club-category">${club.CATEGORY_NAME || 'General'}</span>
            </div>
            <div class="club-card-body">
                <p><strong>Advisor:</strong> ${club.ADVISOR_NAME || 'N/A'}</p>
            </div>
            <div class="club-card-footer">
                <button class="btn-primary" onclick="applyToClub(${club.CLUB_ID}, '${club.CLUB_NAME}')">Apply</button>
                <button class="btn-secondary" onclick="viewClubDetails(${club.CLUB_ID})">View Details</button>
            </div>
        </div>
    `).join('');
}

function loadCategoryFilters(clubs) {
    const container = document.getElementById('catFilters');
    if (!container) return;

    // Get unique categories
    const categories = [...new Set(clubs.map(club => club.CATEGORY_NAME || 'Other'))];

    container.innerHTML = `
        <button class="category-btn active" onclick="filterByCategory('all')">All Clubs</button>
        ${categories.map(cat => `
            <button class="category-btn" onclick="filterByCategory('${cat}')">${cat}</button>
        `).join('')}
    `;
}

function filterByCategory(category) {
    // Update active button
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Filter clubs
    const clubCards = document.querySelectorAll('.club-card');
    clubCards.forEach(card => {
        if (category === 'all' || card.dataset.category === category) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function searchClubs() {
    const searchTerm = document.getElementById('clubSearchInput').value.toLowerCase();
    const clubCards = document.querySelectorAll('.club-card');

    clubCards.forEach(card => {
        const clubName = card.querySelector('h3').textContent.toLowerCase();
        if (clubName.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Apply to club
async function applyToClub(clubId, clubName) {
    const auth = checkAuth();
    if (!auth) return;

    if (!confirm(`Do you want to apply to ${clubName}?`)) {
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/student/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_email: auth.userEmail,
                club_id: clubId
            })
        });

        const result = await response.json();

        if (response.ok) {
            alert('✅ Application submitted successfully!');
            loadApplications(); // Refresh applications list
            loadDashboardStats(); // Update stats
        } else {
            alert('❌ ' + result.message);
        }
    } catch (error) {
        console.error('Error applying to club:', error);
        alert('🚨 Error submitting application. Please try again.');
    }
}

function viewClubDetails(clubId) {
    // Store the club ID for the apply button
    window.currentClubId = clubId;

    // Fetch club details
    fetchClubDetails(clubId);

    // Show modal
    const modal = document.getElementById('clubDetailsModal');
    if (modal) {
        modal.classList.add('active');
    }
}

async function fetchClubDetails(clubId) {
    try {
        const response = await fetch(`http://localhost:3000/api/clubs/${clubId}`);
        if (response.ok) {
            const club = await response.json();
            displayClubDetailsModal(club);
        } else {
            alert('❌ Error loading club details');
            closeClubDetails();
        }
    } catch (error) {
        console.error('Error fetching club details:', error);
        alert('🚨 Error loading club details');
        closeClubDetails();
    }
}

function displayClubDetailsModal(club) {
    // Set basic info
    document.getElementById('modalClubName').textContent = club.CLUB_NAME || 'Club Name';
    document.getElementById('modalClubCategory').textContent = club.CATEGORY_NAME || 'General';
    document.getElementById('modalClubMission').textContent = club.CLUB_MISSION || 'No mission statement available';
    document.getElementById('modalClubVision').textContent = club.CLUB_VISION || 'No vision statement available';

    // Set advisor info
    document.getElementById('modalAdvisorName').textContent = club.ADVISOR_NAME || '-';
    document.getElementById('modalAdvisorEmail').textContent = club.ADVISOR_EMAIL || '-';
    document.getElementById('modalAdvisorPhone').textContent = club.ADVISOR_PHONE || '-';

    // Set contact info
    document.getElementById('modalClubEmail').textContent = club.CLUB_EMAIL || '-';
    document.getElementById('modalClubPhone').textContent = club.CLUB_PHONE || '-';
    document.getElementById('modalMemberCount').textContent = club.MEMBER_COUNT || '0';

    // Display events
    const eventsContainer = document.getElementById('modalClubEvents');
    if (!eventsContainer) return;

    if (!club.EVENTS || club.EVENTS.length === 0) {
        eventsContainer.innerHTML = '<p style="color: #999;">No upcoming events</p>';
    } else {
        eventsContainer.innerHTML = club.EVENTS.map(event => {
            const eventDate = new Date(event.EVENT_DATETIME);
            const formattedDate = eventDate.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
            const formattedTime = eventDate.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <div class="event-item-modal">
                    <strong>${event.EVENT_NAME}</strong>
                    <p>${event.EVENT_DESC || 'No description'}</p>
                    <p><strong>Type:</strong> ${event.EVENT_TYPE || 'Event'}</p>
                    <p><strong>Date & Time:</strong> ${formattedDate} at ${formattedTime}</p>
                </div>
            `;
        }).join('');
    }

    // Store club name for apply button
    const applyBtn = document.getElementById('modalApplyBtn');
    if (applyBtn) {
        applyBtn.setAttribute('data-club-name', club.CLUB_NAME);
    }
}

function closeClubDetails() {
    const modal = document.getElementById('clubDetailsModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function applyFromModal() {
    const clubId = window.currentClubId;
    const clubName = document.getElementById('modalApplyBtn')?.getAttribute('data-club-name') || 'this club';

    if (clubId) {
        closeClubDetails();
        applyToClub(clubId, clubName);
    }
}

// Close modal when clicking outside of it
window.addEventListener('click', function (event) {
    const modal = document.getElementById('clubDetailsModal');
    if (event.target === modal) {
        closeClubDetails();
    }
});

// Close modal with Escape key
window.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        closeClubDetails();
    }
});

// Load applications
async function loadApplications() {
    const auth = checkAuth();
    if (!auth) return;

    try {
        const response = await fetch(`http://localhost:3000/api/student/applications/${auth.userEmail}`);
        if (response.ok) {
            const applications = await response.json();
            displayApplications(applications);
        }
    } catch (error) {
        console.error('Error loading applications:', error);
        displayApplications([]);
    }
}

function displayApplications(applications) {
    const tbody = document.getElementById('studentApplicationsTableBody');
    if (!tbody) return;

    if (applications.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #999;">No applications yet</td></tr>';
        return;
    }

    tbody.innerHTML = applications.map(app => {
        const date = new Date(app.APP_DATE);
        const formattedDate = date.toLocaleDateString('en-GB');

        let statusClass = 'pending';
        if (app.APPLICATION_STATUS === 'Approved') statusClass = 'approved';
        if (app.APPLICATION_STATUS === 'Rejected') statusClass = 'rejected';

        return `
            <tr>
                <td>${app.CLUB_NAME}</td>
                <td>${formattedDate}</td>
                <td><span class="status-badge ${statusClass}">${app.APPLICATION_STATUS}</span></td>
                <td>
                    ${app.APPLICATION_STATUS === 'Pending' ?
                `<button class="btn-small btn-danger" onclick="cancelApplication(${app.APPLICATION_ID})">Cancel</button>` :
                '-'}
                </td>
            </tr>
        `;
    }).join('');
}

async function cancelApplication(appId) {
    if (!confirm('Are you sure you want to cancel this application?')) {
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/api/student/application/${appId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('✅ Application cancelled');
            loadApplications();
            loadDashboardStats();
        } else {
            alert('❌ Error cancelling application');
        }
    } catch (error) {
        console.error('Error cancelling application:', error);
        alert('🚨 Error cancelling application');
    }
}

// Load and display profile
async function loadProfile() {
    const auth = checkAuth();
    if (!auth) return;

    try {
        const response = await fetch(`http://localhost:3000/api/profile/${auth.userEmail}`);
        if (response.ok) {
            const profile = await response.json();
            displayProfile(profile);
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

function displayProfile(profile) {
    document.getElementById('profileName').textContent = profile.USER_NAME || 'N/A';
    document.getElementById('profileEmail').textContent = profile.USER_EMAIL || 'N/A';
    document.getElementById('profileStudentId').textContent = `Student ID: ${profile.STUDENT_NUMBER || 'N/A'}`;
    document.getElementById('profileFaculty').textContent = profile.STUDENT_FACULTY || 'N/A';
    document.getElementById('profileProgram').textContent = profile.STUDENT_PROGRAM || 'N/A';
    document.getElementById('profileSemester').textContent = `Semester ${profile.STUDENT_SEMESTER || 'N/A'}`;
}

function toggleEditProfile() {
    alert('Edit profile functionality can be implemented here!\n\nThis would show a form to update:\n- Name\n- Faculty\n- Program\n- Semester');
}