// student.js - Student Dashboard Functions

// Check authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    const auth = checkAuth();
    if (!auth || auth.userType !== 'student') {
        window.location.href = 'login.html';
        return;
    }

    // Load user information
    loadStudentProfile();
});

/**
 * Load student profile information
 */
function loadStudentProfile() {
    const userInfo = loadUserInfo();
    const studentData = userInfo.studentData;

    if (studentData) {
        // Update profile display
        document.getElementById('studentUserName').textContent = studentData.name;
        document.getElementById('profileName').textContent = studentData.name;
        document.getElementById('profileEmail').textContent = userInfo.email;
        document.getElementById('profileStudentId').textContent = 'Student ID: ' + studentData.studentId;
        document.getElementById('profileFaculty').textContent = getFacultyFullName(studentData.faculty);
        document.getElementById('profileProgram').textContent = studentData.program;
        document.getElementById('profileSemester').textContent = studentData.semester;

        // Update edit form
        document.getElementById('editName').value = studentData.name;
        document.getElementById('editFaculty').value = studentData.faculty;
        document.getElementById('editProgram').value = studentData.program;
        document.getElementById('editSemester').value = studentData.semester;
    }
}

/**
 * Get full faculty name from code
 */
function getFacultyFullName(code) {
    const faculties = {
        'FSKM': 'Faculty of Computer and Mathematical Sciences',
        'FPP': 'Faculty of Business Management',
        'FPPS': 'Faculty of Administrative Science and Policy Studies',
        'FKM': 'Faculty of Communication and Media Studies'
    };
    return faculties[code] || code;
}

/**
 * Show specific student section
 * @param {string} section - Section name to display
 */
function showStudentSection(section) {
    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(s => s.classList.remove('active'));

    // Remove active class from all nav links
    const navLinks = document.querySelectorAll('.nav-menu a');
    navLinks.forEach(link => link.classList.remove('active'));

    // Show selected section
    const sectionId = 'student' + section.charAt(0).toUpperCase() + section.slice(1) + 'Section';
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Update page title
    const titles = {
        'dashboard': 'Dashboard',
        'explore': 'Explore Clubs',
        'myApplications': 'My Applications',
        'profile': 'Profile'
    };
    document.getElementById('studentPageTitle').textContent = titles[section] || 'Dashboard';

    // Update active nav link
    event.target.classList.add('active');
}

/**
 * Search clubs
 */
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

/**
 * Filter clubs by category
 * @param {string} category - Category to filter by
 */
function filterByCategory(category) {
    const clubCards = document.querySelectorAll('.club-card');
    const categoryBtns = document.querySelectorAll('.category-btn');

    // Update active button
    categoryBtns.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // Filter clubs
    clubCards.forEach(card => {
        if (category === 'all' || card.dataset.category === category) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

/**
 * Apply to join a club
 * @param {number} clubId - ID of the club
 */
function applyToClub(clubId) {
    if (confirm('Do you want to apply to join this club?')) {
        alert('Application submitted successfully! Please wait for approval from the club admin.');
        // In real app, this would send request to backend
    }
}

/**
 * View club details
 * @param {number} clubId - ID of the club
 */
function viewClubDetails(clubId) {
    alert('Club details page would open here. This will be implemented with backend integration.');
    // In real app, this would open a modal or navigate to club details page
}

/**
 * Cancel application
 * @param {number} applicationId - ID of the application
 */
function cancelApplication(applicationId) {
    if (confirm('Are you sure you want to cancel this application?')) {
        alert('Application cancelled successfully!');
        // In real app, this would send request to backend
        // Refresh the applications table
    }
}

/**
 * View club from applications
 * @param {number} clubId - ID of the club
 */
function viewClub(clubId) {
    alert('Club page would open here.');
    // In real app, navigate to club page
}

/**
 * Toggle edit profile form
 */
function toggleEditProfile() {
    const editForm = document.getElementById('editProfileForm');
    const profileDetails = document.querySelector('.profile-details');

    if (editForm.style.display === 'none' || !editForm.style.display) {
        editForm.style.display = 'block';
        profileDetails.style.display = 'none';
    } else {
        editForm.style.display = 'none';
        profileDetails.style.display = 'grid';
    }
}

/**
 * Save profile changes
 * @param {Event} event - Form submit event
 */
function saveProfile(event) {
    event.preventDefault();

    const name = document.getElementById('editName').value;
    const faculty = document.getElementById('editFaculty').value;
    const program = document.getElementById('editProgram').value;
    const semester = document.getElementById('editSemester').value;

    // Update student data in session
    const userInfo = loadUserInfo();
    const studentData = userInfo.studentData;
    studentData.name = name;
    studentData.faculty = faculty;
    studentData.program = program;
    studentData.semester = semester;

    sessionStorage.setItem('studentData', JSON.stringify(studentData));

    // Update display
    loadStudentProfile();

    // Hide edit form
    toggleEditProfile();

    alert('Profile updated successfully!');
}

// Auth functions are loaded from auth.js