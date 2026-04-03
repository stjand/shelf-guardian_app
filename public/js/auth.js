// Auth helper for Shelf Guardian
async function checkAuth() {
    try {
        const res = await fetch('/api/me');
        if (!res.ok) {
            // Not logged in or session expired
            if (!window.location.pathname.includes('login.html') && 
                !window.location.pathname.includes('register.html')) {
                window.location.href = '/login.html';
            }
            return null;
        }
        const data = await res.json();
        updateUIForUser(data.user);
        return data.user;
    } catch (err) {
        console.error('Auth check failed:', err);
        return null;
    }
}

function updateUIForUser(user) {
    if (!user) return;
    
    // Update any user name elements
    const userNames = document.querySelectorAll('.sg-sidebar-user-name, .user-name-display');
    userNames.forEach(el => el.textContent = user.username);
    
    // Update avatars with first letter
    const avatars = document.querySelectorAll('.sg-sidebar-avatar, .user-avatar-display');
    avatars.forEach(el => el.textContent = user.username.charAt(0).toUpperCase());
    
    // Set up logout buttons
    const logoutBtns = document.querySelectorAll('.logout-btn, #logout-action');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/login.html';
        });
    });
}

// Automatically check auth on page load
document.addEventListener('DOMContentLoaded', () => {
    // Skip auth check on login/register pages
    if (!window.location.pathname.includes('login.html') && 
        !window.location.pathname.includes('register.html')) {
        checkAuth();
    }
});
