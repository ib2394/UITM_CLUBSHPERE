// auth.js - Authentication Functions for UiTM ClubSphere

/**
 * Handle user login
 * Connects to Node.js API to verify credentials against Oracle USERS table
 */
async function handleLogin(event) {
    event.preventDefault();
    
    // Grabs values from the login form IDs
    const data = {
        user_type: document.getElementById('userType').value,
        user_email: document.getElementById('email').value,
        user_password: document.getElementById('password').value
    };

    try {
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            // Store session info for dashboard personalization
            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('userEmail', result.user.email);
            sessionStorage.setItem('userType', result.user.type);
            sessionStorage.setItem('userName', result.user.name);

            alert(`✅ Welcome back, ${result.user.name}!`);
            
            // Redirects to dashboard (e.g., student-dashboard.html) based on DB USER_TYPE
            window.location.href = result.user.type + '-dashboard.html';
        } else {
            alert("❌ " + (result.message || "Login Failed"));
        }
    } catch (error) {
        console.error("Login Error:", error);
        alert("🚨 Connection Error: Is your server.js running?");
    }
}

/**
 * Handle user registration
 * Captures role and student info to populate USERS and STUDENT_INFO tables
 */
async function handleRegister(event) {
    event.preventDefault();
    
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;

    // GUI Validation: Passwords must match before sending to server
    if (password !== confirmPassword) {
        alert('⚠️ Passwords do not match!');
        return;
    }

    // Matches the 3NF schema structure for USERS and STUDENT_INFO
    const registrationData = {
        user_type: document.getElementById('regUserType').value, // Matches new register.html dropdown
        user_name: document.getElementById('regName').value,
        user_email: document.getElementById('regEmail').value,
        user_password: password,
        // Optional student fields (will be empty/null for Admin users)
        student_number: document.getElementById('regStudentId').value || null,
        student_faculty: document.getElementById('regFaculty').value || null,
        student_program: document.getElementById('regProgram').value || null,
        student_semester: document.getElementById('regSemester').value || null
    };

    try {
        const response = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registrationData)
        });

        const result = await response.json();

        if (response.ok) {
            alert(`✅ Registration successful as ${registrationData.user_type}!`);
            window.location.href = 'login.html';
        } else {
            alert("❌ " + (result.message || "Registration Failed"));
        }
    } catch (error) {
        console.error("Registration Error:", error);
        alert("🚨 Connection Error: Could not reach the server.");
    }
}

/**
 * Handle logout
 */
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        sessionStorage.clear();
        window.location.href = 'login.html';
    }
}

/**
 * Check if user is authenticated (Call this on dashboard load)
 */
function checkAuth() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    const userType = sessionStorage.getItem('userType');
    
    if (!isLoggedIn || isLoggedIn !== 'true') {
        window.location.href = 'login.html';
        return false;
    }
    
    return { isLoggedIn: true, userType: userType };
}