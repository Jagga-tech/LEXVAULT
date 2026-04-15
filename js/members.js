// Members page — admin/librarian only

const auth = requireAuth(['admin', 'librarian']);
if (!auth) throw new Error('no auth');

seedDemoData();

document.getElementById('navUser').textContent = '@' + auth.username;

let members = loadMembers();
const books = loadBooks();

function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function booksBorrowedBy(username) {
    return books.filter(b => b.issuedTo === username).length;
}

function render(filter) {
    const q = (filter || '').trim().toLowerCase();
    const filtered = !q ? members : members.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.username.toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q)
    );

    document.getElementById('countLine').textContent = filtered.length + ' of ' + members.length + ' members';

    const tbody = document.getElementById('tbody');
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="activity__empty">No members found.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map((m, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><strong>${escapeHtml(m.name)}</strong></td>
            <td>@${escapeHtml(m.username)}</td>
            <td>${escapeHtml(m.email || '-')}</td>
            <td>${m.joined}</td>
            <td>${booksBorrowedBy(m.username)}</td>
            <td>
                <div class="row-actions">
                    <button class="btn-icon" data-action="edit"   data-id="${m.id}">Edit</button>
                    <button class="btn-icon btn-icon--danger" data-action="delete" data-id="${m.id}">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

render('');

document.getElementById('searchBox').addEventListener('input', e => render(e.target.value));

document.getElementById('tbody').addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = parseInt(btn.dataset.id, 10);
    if (btn.dataset.action === 'edit')   editMember(id);
    if (btn.dataset.action === 'delete') deleteMember(id);
});

function editMember(id) {
    const m = members.find(x => x.id === id);
    if (!m) return;
    openModal('Edit Member', `
        <div class="form-group">
            <label class="form-label">Full Name</label>
            <input type="text" name="name" class="form__input" value="${escapeHtml(m.name)}" required>
        </div>
        <div class="form-group">
            <label class="form-label">Username</label>
            <input type="text" name="username" class="form__input" value="${escapeHtml(m.username)}" required>
        </div>
        <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" name="email" class="form__input" value="${escapeHtml(m.email || '')}">
        </div>
    `, (data, form) => {
        clearFieldErrors(form);
        let ok = true;
        if (data.name.length < 2)       { showFieldError(form, 'name',     'Name is too short'); ok = false; }
        if (data.username.length < 3)   { showFieldError(form, 'username', 'Username must be at least 3 chars'); ok = false; }
        if (data.email && !isValidEmail(data.email)) {
            showFieldError(form, 'email', 'Enter a valid email address'); ok = false;
        }
        if (members.some(x => x.username === data.username && x.id !== id)) {
            showFieldError(form, 'username', 'Username already in use'); ok = false;
        }
        if (!ok) return false;
        m.name     = data.name;
        m.username = data.username;
        m.email    = data.email;
        saveMembers(members);
        toast('Member updated', 'success');
        render(document.getElementById('searchBox').value);
    }, 'Save');
}

function deleteMember(id) {
    const m = members.find(x => x.id === id);
    if (!m) return;
    if (booksBorrowedBy(m.username) > 0) {
        toast('Cannot delete — member has borrowed books.', 'error');
        return;
    }
    if (!confirm('Delete member "' + m.name + '"? This cannot be undone.')) return;
    members = members.filter(x => x.id !== id);
    saveMembers(members);
    toast('Member deleted', 'success');
    render(document.getElementById('searchBox').value);
}

document.getElementById('addBtn').addEventListener('click', () => {
    openModal('Add New Member', `
        <div class="form-group">
            <label class="form-label">Full Name</label>
            <input type="text" name="name" class="form__input" placeholder="e.g. Ramesh Kumar" required>
        </div>
        <div class="form-group">
            <label class="form-label">Username</label>
            <input type="text" name="username" class="form__input" placeholder="e.g. ramesh" required>
        </div>
        <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" name="email" class="form__input" placeholder="e.g. ramesh@example.com">
        </div>
    `, (data, form) => {
        clearFieldErrors(form);
        let ok = true;
        if (data.name.length < 2)     { showFieldError(form, 'name',     'Name is too short'); ok = false; }
        if (data.username.length < 3) { showFieldError(form, 'username', 'Username must be at least 3 chars'); ok = false; }
        if (data.email && !isValidEmail(data.email)) {
            showFieldError(form, 'email', 'Enter a valid email address'); ok = false;
        }
        if (members.some(x => x.username === data.username)) {
            showFieldError(form, 'username', 'Username already in use'); ok = false;
        }
        if (!ok) return false;
        members.push({
            id: Date.now(),
            name: data.name,
            username: data.username,
            email: data.email || '',
            joined: todayISO()
        });
        saveMembers(members);
        toast('Member added', 'success');
        render(document.getElementById('searchBox').value);
    }, 'Add');
});

document.getElementById('exportBtn').addEventListener('click', () => {
    exportCSV('lexvault-members.csv', members.map(m => ({
        ID: m.id,
        Name: m.name,
        Username: m.username,
        Email: m.email || '',
        Joined: m.joined,
        BooksBorrowed: booksBorrowedBy(m.username)
    })));
});

const themeBtn = document.getElementById('themeToggle');
if (themeBtn) {
    const current = localStorage.getItem('lv_theme') || 'light';
    themeBtn.innerHTML = current === 'dark' ? '&#9728;' : '&#127769;';
    themeBtn.addEventListener('click', toggleTheme);
}

document.getElementById('logoutBtn').addEventListener('click', logout);
