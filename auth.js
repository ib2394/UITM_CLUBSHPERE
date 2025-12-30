// auth.js - Authentication Functions

/**
 * Handle user login
 * @param {Event} event - Form submit event
 */
function handleLogin(event) {
    event.preventDefault();
    
    const userType = document.getElementById('userType').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Validate form fields
    if (!userType || !email || !password) {
        alert('Please fill in all fields');
        return;
    }

    // Store user information in sessionStorage
    sessionStorage.setItem('isLoggedIn', 'true');
    sessionStorage.setItem('userType', userType);
    sessionStorage.setItem('userEmail', email);

    // Redirect based on user type
    switch(userType) {
        case 'student':
            window.location.href = 'student-dashboard.html';
            break;
        case 'club_admin':
            window.location.href = 'club-admin-dashboard.html';
            break;
        case 'admin':
            window.location.href = 'admin-dashboard.html';
            break;
        default:
            alert('Invalid user type');
    }
}

/**
 * Handle student registration
 * @param {Event} event - Form submit event
 */
function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('regName').value;
    const studentId = document.getElementById('regStudentId').value;
    const email = document.getElementById('regEmail').value;
    const faculty = document.getElementById('regFaculty').value;
    const program = document.getElementById('regProgram').value;
    const semester = document.getElementById('regSemester').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;

    // Validate passwords match
    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }

    // Validate all fields are filled
    if (!name || !studentId || !email || !faculty || !program || !semester || !password) {
        alert('Please fill in all fields');
        return;
    }

    // Store registration data (in real app, this would go to backend)
    const studentData = {
        name: name,
        studentId: studentId,
        email: email,
        faculty: faculty,
        program: program,
        semester: semester
    };

    // Store in sessionStorage temporarily
    sessionStorage.setItem('studentData', JSON.stringify(studentData));

    // Show success message and redirect to login
    alert('Registration successful! Please login with your credentials.');
    window.location.href = 'login.html';
}

/**
 * Handle logout
 */
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear session storage
        sessionStorage.clear();
        
        // Redirect to login page
        window.location.href = 'login.html';
    }
}

/**
 * Check if user is authenticated
 * Call this on page load for protected pages
 */
function checkAuth() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    const userType = sessionStorage.getItem('userType');
    
    if (!isLoggedIn || isLoggedIn !== 'true') {
        // Redirect to login if not authenticated
        window.location.href = 'login.html';
        return false;
    }
    
    return { isLoggedIn: true, userType: userType };
}

/**
 * Load user information from session
 */
function loadUserInfo() {
    const userEmail = sessionStorage.getItem('userEmail');
    const userType = sessionStorage.getItem('userType');
    const studentData = JSON.parse(sessionStorage.getItem('studentData'));
    
    return {
        email: userEmail,
        type: userType,
        studentData: studentData
    };
}