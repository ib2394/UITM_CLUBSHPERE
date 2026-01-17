// auth.js - Improved Authentication with Better Error Handling

async function handleLogin(event) {
    event.preventDefault();

    // Get form values
    const userType = document.getElementById('userType').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Validate inputs
    if (!userType) {
        alert('⚠️ Please select a user type');
        return;
    }

    if (!email || !password) {
        alert('⚠️ Please enter both email and password');
        return;
    }

    const data = {
        user_type: userType,
        user_email: email,
        user_password: password
    };

    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    try {
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok && result.user) {
            // Store user session data
            const userData = {
                isLoggedIn: 'true',
                userEmail: result.user.email,
                userType: result.user.type,
                userName: result.user.name,
                userId: result.user.id
            };

            // Save to storage (using in-memory object as fallback)
            Object.keys(userData).forEach(key => {
                try {
                    sessionStorage.setItem(key, userData[key]);
                } catch (e) {
                    console.warn('SessionStorage not available, using in-memory storage');
                    window._authData = window._authData || {};
                    window._authData[key] = userData[key];
                }
            });

            alert(`✅ Welcome back, ${result.user.name}!`);

            // Redirect based on user type
            redirectToDashboard(result.user.type);
        } else {
            // Handle different error scenarios
            handleLoginError(response.status, result);
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('🚨 Connection Error: Unable to reach server. Please check if server is running on port 3000.');
    } finally {
        // Restore button state
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

function redirectToDashboard(userType) {
    const dashboardMap = {
        'student': 'student-dashboard.html',
        'admin': 'admin-dashboard.html',
        'club_admin': 'club-admin-dashboard.html'
    };

    const dashboard = dashboardMap[userType];

    if (dashboard) {
        window.location.href = dashboard;
    } else {
        alert('❌ Unknown user type. Please contact administrator.');
        console.error('Unknown user type:', userType);
    }
}

function handleLoginError(status, result) {
    switch (status) {
        case 401:
            alert('❌ Invalid credentials. Please check your email, password, and user type.');
            break;
        case 404:
            alert('❌ User not found. Please register first.');
            break;
        case 500:
            alert('❌ Server error. Please try again later.');
            console.error('Server error:', result.message);
            break;
        default:
            alert(`❌ ${result.message || 'Login failed. Please try again.'}`);
    }
}

async function handleRegister(event) {
    event.preventDefault();

    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;

    // Password validation
    if (password !== confirmPassword) {
        alert('⚠️ Passwords do not match!');
        return;
    }

    if (password.length < 6) {
        alert('⚠️ Password must be at least 6 characters long');
        return;
    }

    const registrationData = {
        user_type: 'student',
        user_name: document.getElementById('regName').value,
        user_email: document.getElementById('regEmail').value,
        user_password: password,
        student_number: document.getElementById('regStudentId').value,
        student_faculty: document.getElementById('regFaculty').value,
        student_program: document.getElementById('regProgram').value,
        student_semester: document.getElementById('regSemester').value
    };

    // Validate required fields
    const requiredFields = ['user_name', 'user_email', 'student_number', 'student_faculty', 'student_program', 'student_semester'];
    const missingFields = requiredFields.filter(field => !registrationData[field]);

    if (missingFields.length > 0) {
        alert('⚠️ Please fill in all required fields');
        return;
    }

    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';

    try {
        const response = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registrationData)
        });

        const result = await response.json();

        if (response.ok) {
            alert('✅ Student account created successfully! Please login.');
            window.location.href = 'login.html';
        } else {
            handleRegistrationError(response.status, result);
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('🚨 Connection Error: Unable to reach server.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

function handleRegistrationError(status, result) {
    switch (status) {
        case 409:
            alert('❌ Email already exists. Please use a different email or login.');
            break;
        case 400:
            alert('❌ Invalid data. Please check all fields.');
            break;
        case 500:
            alert('❌ Server error. Please try again later.');
            console.error('Server error:', result.message);
            break;
        default:
            alert(`❌ ${result.message || 'Registration failed. Please try again.'}`);
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear session storage
        try {
            sessionStorage.clear();
        } catch (e) {
            // Clear in-memory storage as fallback
            window._authData = null;
        }
        window.location.href = 'login.html';
    }
}

function checkAuth() {
    // Don't check auth on login/register pages to prevent redirect loops
    const currentPage = window.location.pathname;
    if (currentPage.includes('login.html') || currentPage.includes('register.html') || currentPage === '/') {
        return null;
    }

    let isLoggedIn, userType;

    // Try to get from sessionStorage first
    try {
        isLoggedIn = sessionStorage.getItem('isLoggedIn');
        userType = sessionStorage.getItem('userType');
    } catch (e) {
        // Fallback to in-memory storage
        isLoggedIn = window._authData?.isLoggedIn;
        userType = window._authData?.userType;
    }

    if (!isLoggedIn || isLoggedIn !== 'true') {
        window.location.href = 'login.html';
        return false;
    }

    return {
        isLoggedIn: true,
        userType: userType,
        userEmail: getUserData('userEmail'),
        userName: getUserData('userName'),
        userId: getUserData('userId')
    };
}

// Helper function to get user data from storage
function getUserData(key) {
    try {
        return sessionStorage.getItem(key);
    } catch (e) {
        return window._authData?.[key];
    }
}

// Helper function to set user data
function setUserData(key, value) {
    try {
        sessionStorage.setItem(key, value);
    } catch (e) {
        window._authData = window._authData || {};
        window._authData[key] = value;
    }
}

// Auto-logout on session expiry (optional)
function setupSessionTimeout(minutes = 30) {
    const timeout = minutes * 60 * 1000;
    let timeoutId;

    function resetTimeout() {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            alert('Session expired. Please login again.');
            handleLogout();
        }, timeout);
    }

    // Reset timeout on user activity
    ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
        document.addEventListener(event, resetTimeout, { passive: true });
    });

    resetTimeout();
}

// Don't run checkAuth or setup timeout on login/register pages
const currentPage = window.location.pathname;
const isAuthPage = currentPage.includes('login.html') ||
    currentPage.includes('register.html') ||
    currentPage === '/' ||
    currentPage === '';

if (!isAuthPage) {
    // Only initialize on protected pages after DOM loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            const authStatus = checkAuth();
            if (authStatus && authStatus.isLoggedIn) {
                setupSessionTimeout(30);
            }
        });
    } else {
        const authStatus = checkAuth();
        if (authStatus && authStatus.isLoggedIn) {
            setupSessionTimeout(30);
        }
    }
}