/**
 * Auth.js
 * Handles login, registration, logout, and session checking.
 */

const SESSION_KEY = 'shardeen_session';
const USER_LOGIN_API = "https://api.alloy.shardeen.com/api/v1.0/app/user-manager/login";
const authToken = "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJJZCI6IjM1YjAzYTNmLTU5MTUtNGQ2OC1iODA3LWVkNDI1OGM0NTgzMCIsImp0aSI6IjNlYzNjNzRjLTczYTAtNDEyZC04YmJmLTAzODI5NjFkNWQyZiIsIm5hbWVpZCI6IjRiMjI4OGQyLWE4ZDctNGUwOC05NWIxLTExYjZmZWQyYTg3MCIsInVuaXF1ZV9uYW1lIjoiRU1QMDAwMDAyIiwiZW1haWwiOiJkZXZlbG9wZXJAc2hhcmRlZW4uY29tIiwiT3JnYW5pemF0aW9uSWQiOiIxNSIsIkNvbXBhbnlJZCI6IjE2Iiwicm9sZSI6WyJPcmdhbml6YXRpb24gQWRtaW4iLCJFbXBsb3llZSJdLCJuYmYiOjE3NzEyMTg0ODYsImV4cCI6MTc3MTMwNDg4NiwiaWF0IjoxNzcxMjE4NDg2LCJpc3MiOiJzaGFyZGVlbi1hbGxveS1pc3N1ZXIxIiwiYXVkIjoic2hhcmRlZW4tYWxsb3ktYXVkaWVuY2UxIn0.xYhxjgFLFAedTrJwc0N89WrQH2W3No5aEb10SvpnSGD4kVcck56kqFSg5nFtjNf8FWpRugENCkUx8A-XKLt0bA";

/**
 * Check if user is logged in
 * @returns {boolean} true if logged in
 */
function isAuthenticated() {
    return !!localStorage.getItem(SESSION_KEY);
}

// Local storage user management removed as we are using API now.

// Registration logic removed as per user request

/**
 * Handle Login Form Submission
 * @param {Event} e - Submit event
 */
async function handleLogin(e) {
    e.preventDefault();

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (username && password) {
        try {
            const response = await fetch(USER_LOGIN_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userName: username,
                    password: password
                })
            });

            if (response.ok) {
                const data = await response.json();
                // Assuming the token is in data.token or data directly if it's just the token string
                // But typically it's an object with a token field. 
                // Adjusting based on common patterns, but will dump to console to be safe.
                console.log('Login success:', data);

                // Store the token. If data is just the token string, use data. 
                // If it's { token: "..." }, use data.token.
                const token = data.token || data.accessToken || (typeof data === 'string' ? data : null);

                if (token) {
                    localStorage.setItem(SESSION_KEY, token);
                    // Redirect to dashboard
                    window.location.href = 'dashboard.html';
                } else {
                    console.error("Token not found in response:", data);
                    localStorage.setItem(SESSION_KEY, JSON.stringify(data)); // Fallback: store whole object
                    window.location.href = 'dashboard.html';
                }

            } else {
                const errorText = await response.text();
                console.error('Login failed:', errorText);
                alert('Invalid username or password.');
            }
        } catch (error) {
            console.error('Network Error:', error);
            alert('Network error. Please check your connection.');
        }
    } else {
        alert('Please enter valid credentials.');
    }
}

/**
 * Handle Logout
 */
function logout() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = 'index.html';
}

/**
 * Initialize Event Listeners
 */
document.addEventListener('DOMContentLoaded', () => {
    // Auth Check
    const isLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/');
    if (isLoginPage && isAuthenticated()) {
        window.location.href = 'dashboard.html';
    }

    const isDashboard = window.location.pathname.endsWith('dashboard.html');
    if (isDashboard && !isAuthenticated()) {
        window.location.href = 'index.html';
    }

    // Login Form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Registration Form logic removed

    // Forgot Password
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            alert('Please contact your administrator to reset your password.');
        });
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
});
