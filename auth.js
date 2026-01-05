// auth.js - Authentication Functions for UiTM ClubSphere

async function handleLogin(event) {
    event.preventDefault();
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
            // Save Session
            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('userEmail', result.user.email);
            sessionStorage.setItem('userType', result.user.type);
            sessionStorage.setItem('userName', result.user.name);

            alert(`✅ Welcome back, ${result.user.name}!`);

            // Redirect based on role
            const dashboardMap = {
                'student': 'student-dashboard.html',
                'admin': 'admin-dashboard.html',
                'club_admin': 'club-admin-dashboard.html'
            };

            window.location.href = dashboardMap[result.user.type];
        } else {
            alert("❌ " + (result.message || "Login Failed"));
        }
    } catch (error) {
        alert("🚨 Connection Error: Check if server.js is running.");
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;

    if (password !== confirmPassword) {
        alert('⚠️ Passwords do not match!');
        return;
    }

    const registrationData = {
        user_type: 'student', // Strictly for student registration
        user_name: document.getElementById('regName').value,
        user_email: document.getElementById('regEmail').value,
        user_password: password,
        student_number: document.getElementById('regStudentId').value,
        student_faculty: document.getElementById('regFaculty').value,
        student_program: document.getElementById('regProgram').value,
        student_semester: document.getElementById('regSemester').value
    };

    try {
        const response = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registrationData)
        });

        if (response.ok) {
            alert(`✅ Student account created! Please login.`);
            window.location.href = 'login.html';
        } else {
            const result = await response.json();
            alert("❌ " + result.message);
        }
    } catch (error) {
        alert("🚨 Connection Error.");
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        sessionStorage.clear();
        window.location.href = 'login.html';
    }
}

function checkAuth() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    const userType = sessionStorage.getItem('userType');
    if (!isLoggedIn || isLoggedIn !== 'true') {
        window.location.href = 'login.html';
        return false;
    }
    return { isLoggedIn: true, userType: userType };
}