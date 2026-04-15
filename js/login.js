// Login page — role tabs, password toggle, demo buttons, form submit

// --- Role Tab Switching ---
const roleBtns = document.querySelectorAll('.login__role');
roleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        roleBtns.forEach(b => b.classList.remove('login__role--active'));
        btn.classList.add('login__role--active');
    });
});

// --- Password Toggle ---
const toggleBtn     = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');
toggleBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    toggleBtn.innerHTML = isPassword ? '&#128064;' : '&#128065;';
});

// --- Demo Buttons ---
const demoBtns = document.querySelectorAll('.login__demo-btn');
demoBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById('username').value = btn.dataset.user;
        document.getElementById('password').value = btn.dataset.pass;
        const role = btn.dataset.user === 'librarian' ? 'librarian'
                   : btn.dataset.user === 'member'    ? 'member'
                   : 'admin';
        roleBtns.forEach(b => b.classList.remove('login__role--active'));
        document.querySelector('[data-role="' + role + '"]').classList.add('login__role--active');
    });
});

// --- Login Form Submit ---
const loginForm  = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

const validUsers = {
    admin:     { password: 'admin123', role: 'admin'     },
    librarian: { password: 'lib123',   role: 'librarian' },
    member:    { password: 'mem123',   role: 'member'    }
};

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearFieldErrors(loginForm);

    const unameInput = document.getElementById('username');
    const passInput  = document.getElementById('password');
    unameInput.name = 'username';
    passInput.name  = 'password';

    const username = unameInput.value.trim();
    const password = passInput.value;

    // Basic validation
    let ok = true;
    if (username.length < 3) {
        showFieldError(loginForm, 'username', 'Username must be at least 3 characters');
        ok = false;
    }
    if (password.length < 4) {
        showFieldError(loginForm, 'password', 'Password must be at least 4 characters');
        ok = false;
    }
    if (!ok) return;

    const user = validUsers[username];
    if (user && user.password === password) {
        localStorage.setItem('lv_auth', JSON.stringify({
            username: username,
            role: user.role,
            loggedInAt: new Date().toISOString()
        }));
        window.location.href = 'dashboard.html';
    } else {
        loginError.classList.add('login__error--show');
        setTimeout(() => loginError.classList.remove('login__error--show'), 3000);
    }
});
