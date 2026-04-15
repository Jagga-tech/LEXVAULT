// LexVault — shared helpers
// Used by all pages. Handles modals, toasts, theme, validation, CSV export.


// --- Auth helper ---
function getAuth() {
    const raw = localStorage.getItem('lv_auth');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
}

function requireAuth(allowedRoles) {
    const auth = getAuth();
    if (!auth) {
        window.location.href = 'login.html';
        return null;
    }
    if (allowedRoles && !allowedRoles.includes(auth.role)) {
        alert('You do not have permission to access this page.');
        window.location.href = 'dashboard.html';
        return null;
    }
    return auth;
}

function logout() {
    localStorage.removeItem('lv_auth');
    window.location.href = 'login.html';
}


// --- Data loaders ---
function loadBooks()    { return JSON.parse(localStorage.getItem('lv_books')    || '[]'); }
function loadMembers()  { return JSON.parse(localStorage.getItem('lv_members')  || '[]'); }
function loadActivity() { return JSON.parse(localStorage.getItem('lv_activity') || '[]'); }

function saveBooks(data)    { localStorage.setItem('lv_books',    JSON.stringify(data)); }
function saveMembers(data)  { localStorage.setItem('lv_members',  JSON.stringify(data)); }
function saveActivity(data) { localStorage.setItem('lv_activity', JSON.stringify(data)); }


// --- Seed demo data (first visit) ---
function seedDemoData() {
    if (!localStorage.getItem('lv_books')) {
        saveBooks([
            { id: 1, title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', isbn: '9780743273565', issuedTo: null },
            { id: 2, title: 'Clean Code', author: 'Robert C. Martin', isbn: '9780132350884', issuedTo: 'amit' },
            { id: 3, title: 'Introduction to Algorithms', author: 'Cormen et al.', isbn: '9780262033848', issuedTo: 'member' },
            { id: 4, title: 'The Pragmatic Programmer', author: 'Hunt & Thomas', isbn: '9780201616224', issuedTo: 'priya' },
            { id: 5, title: '1984', author: 'George Orwell', isbn: '9780451524935', issuedTo: null },
            { id: 6, title: 'Sapiens', author: 'Yuval Noah Harari', isbn: '9780062316097', issuedTo: 'ravi' },
            { id: 7, title: 'Atomic Habits', author: 'James Clear', isbn: '9780735211292', issuedTo: 'member' },
            { id: 8, title: 'Design Patterns', author: 'GoF', isbn: '9780201633610', issuedTo: null }
        ]);
    }

    if (!localStorage.getItem('lv_members')) {
        saveMembers([
            { id: 1, username: 'amit',   name: 'Amit Sharma',  email: 'amit@example.com',  joined: '2026-01-15' },
            { id: 2, username: 'priya',  name: 'Priya Patel',  email: 'priya@example.com', joined: '2026-02-03' },
            { id: 3, username: 'ravi',   name: 'Ravi Kumar',   email: 'ravi@example.com',  joined: '2026-02-18' },
            { id: 4, username: 'neha',   name: 'Neha Singh',   email: 'neha@example.com',  joined: '2026-03-01' },
            { id: 5, username: 'rahul',  name: 'Rahul Gupta',  email: 'rahul@example.com', joined: '2026-03-12' },
            { id: 6, username: 'member', name: 'Demo Member',  email: 'demo@example.com',  joined: '2026-03-20' }
        ]);
    }

    if (!localStorage.getItem('lv_activity')) {
        saveActivity([
            { date: '2026-04-13', bookTitle: 'Introduction to Algorithms', member: 'member', action: 'Issued',   status: 'Active',   dueDate: '2026-04-27' },
            { date: '2026-04-12', bookTitle: 'Clean Code',                 member: 'amit',   action: 'Issued',   status: 'Active',   dueDate: '2026-04-26' },
            { date: '2026-04-11', bookTitle: 'The Pragmatic Programmer',   member: 'priya',  action: 'Issued',   status: 'Overdue',  dueDate: '2026-04-13' },
            { date: '2026-04-10', bookTitle: 'Sapiens',                    member: 'ravi',   action: 'Issued',   status: 'Active',   dueDate: '2026-04-24' },
            { date: '2026-04-09', bookTitle: 'Atomic Habits',              member: 'member', action: 'Issued',   status: 'Overdue',  dueDate: '2026-04-12' },
            { date: '2026-04-08', bookTitle: '1984',                       member: 'neha',   action: 'Returned', status: 'Complete', dueDate: '2026-04-15' },
            { date: '2026-04-05', bookTitle: 'Atomic Habits',              member: 'rahul',  action: 'Returned', status: 'Complete', dueDate: '2026-04-12' },
            { date: '2026-04-02', bookTitle: 'The Great Gatsby',           member: 'member', action: 'Returned', status: 'Complete', dueDate: '2026-04-10' }
        ]);
    }
}


// --- Theme (dark mode) ---
function applyTheme() {
    const theme = localStorage.getItem('lv_theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme() {
    const current = localStorage.getItem('lv_theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    localStorage.setItem('lv_theme', next);
    applyTheme();
    // Update button icon if present
    const btn = document.getElementById('themeToggle');
    if (btn) btn.innerHTML = next === 'dark' ? '&#9728;' : '&#127769;'; // sun / moon
}

// Apply on script load (avoid flash)
applyTheme();


// --- Toast notifications ---
function toast(message, type) {
    type = type || 'info'; // info | success | error
    let wrap = document.getElementById('toastWrap');
    if (!wrap) {
        wrap = document.createElement('div');
        wrap.id = 'toastWrap';
        wrap.className = 'toast-wrap';
        document.body.appendChild(wrap);
    }
    const t = document.createElement('div');
    t.className = 'toast toast--' + type;
    t.textContent = message;
    wrap.appendChild(t);
    // fade out after 2.5s
    setTimeout(() => {
        t.classList.add('toast--leaving');
        setTimeout(() => t.remove(), 300);
    }, 2500);
}


// --- Modal (simple, one-at-a-time) ---
function openModal(title, bodyHTML, onSubmit, submitText) {
    closeModal(); // only one modal at a time

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modalOverlay';
    overlay.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true">
            <div class="modal__header">
                <h3 class="modal__title">${title}</h3>
                <button type="button" class="modal__close" aria-label="Close">&times;</button>
            </div>
            <form class="modal__body" id="modalForm">
                ${bodyHTML}
                <div class="modal__footer">
                    <button type="button" class="btn btn--ghost" id="modalCancel">Cancel</button>
                    <button type="submit" class="btn btn--primary">${submitText || 'Save'}</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(overlay);
    document.body.classList.add('no-scroll');

    const close = () => closeModal();
    overlay.querySelector('.modal__close').addEventListener('click', close);
    overlay.querySelector('#modalCancel').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    overlay.querySelector('#modalForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const form = e.target;
        const data = {};
        form.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.name) data[el.name] = el.value.trim();
        });
        const ok = onSubmit(data, form);
        if (ok !== false) close();
    });

    // focus first input
    const firstInput = overlay.querySelector('input, select, textarea');
    if (firstInput) firstInput.focus();

    // escape to close
    document.addEventListener('keydown', escClose);
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.remove();
    document.body.classList.remove('no-scroll');
    document.removeEventListener('keydown', escClose);
}

function escClose(e) { if (e.key === 'Escape') closeModal(); }


// --- Validation helpers ---
function showFieldError(form, fieldName, message) {
    const input = form.querySelector('[name="' + fieldName + '"]');
    if (!input) return;
    input.classList.add('input--error');
    let errEl = input.parentElement.querySelector('.field-error');
    if (!errEl) {
        errEl = document.createElement('span');
        errEl.className = 'field-error';
        input.parentElement.appendChild(errEl);
    }
    errEl.textContent = message;
}

function clearFieldErrors(form) {
    form.querySelectorAll('.input--error').forEach(el => el.classList.remove('input--error'));
    form.querySelectorAll('.field-error').forEach(el => el.remove());
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}


// --- CSV export ---
function exportCSV(filename, rows) {
    if (!rows || rows.length === 0) { toast('Nothing to export', 'error'); return; }
    const keys = Object.keys(rows[0]);
    const escape = (v) => {
        if (v === null || v === undefined) return '';
        const s = String(v);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const lines = [keys.join(',')];
    rows.forEach(r => lines.push(keys.map(k => escape(r[k])).join(',')));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast('Exported ' + filename, 'success');
}


// --- Due-date helpers ---
function todayISO() { return new Date().toISOString().slice(0, 10); }

function addDaysISO(iso, days) {
    const d = new Date(iso);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

function daysBetween(aISO, bISO) {
    const a = new Date(aISO), b = new Date(bISO);
    return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

// Recompute Overdue status for active issues based on today
function recomputeOverdue() {
    const activity = loadActivity();
    const today = todayISO();
    let changed = false;
    activity.forEach(a => {
        if (a.action === 'Issued' && a.status === 'Active' && a.dueDate && a.dueDate < today) {
            a.status = 'Overdue';
            changed = true;
        }
    });
    if (changed) saveActivity(activity);
}
