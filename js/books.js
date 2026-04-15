// Books page — list, search, add, edit, delete, CSV export

const auth = requireAuth();
if (!auth) throw new Error('no auth');

seedDemoData();
recomputeOverdue();

document.getElementById('navUser').textContent = '@' + auth.username;

// Hide admin-only buttons for members
if (auth.role === 'member') {
    document.querySelectorAll('[data-role-gate]').forEach(el => {
        const allowed = el.getAttribute('data-role-gate').split(',');
        if (!allowed.includes(auth.role)) el.style.display = 'none';
    });
}

let books = loadBooks();

function render(filter) {
    const q = (filter || '').trim().toLowerCase();
    const filtered = !q ? books : books.filter(b =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        (b.isbn || '').toLowerCase().includes(q)
    );

    const countLine = document.getElementById('countLine');
    countLine.textContent = filtered.length + ' of ' + books.length + ' books';

    const tbody = document.getElementById('tbody');
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="activity__empty">No books found.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map((b, i) => {
        const statusPill = b.issuedTo
            ? '<span class="pill pill--overdue">Issued to @' + b.issuedTo + '</span>'
            : '<span class="pill pill--complete">Available</span>';

        // Member can only see list; librarian/admin can edit/delete
        let actions = '';
        if (auth.role === 'admin' || auth.role === 'librarian') {
            actions = `
                <button class="btn-icon" data-action="edit"   data-id="${b.id}">Edit</button>
                <button class="btn-icon btn-icon--danger" data-action="delete" data-id="${b.id}">Delete</button>
            `;
        } else {
            actions = '<span style="color:var(--gray-500);font-size:0.85rem;">view only</span>';
        }

        return `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${escapeHtml(b.title)}</strong></td>
                <td>${escapeHtml(b.author)}</td>
                <td>${escapeHtml(b.isbn || '-')}</td>
                <td>${statusPill}</td>
                <td><div class="row-actions">${actions}</div></td>
            </tr>
        `;
    }).join('');
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

render('');

// Search
document.getElementById('searchBox').addEventListener('input', e => render(e.target.value));

// Delegated table clicks (edit/delete)
document.getElementById('tbody').addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = parseInt(btn.dataset.id, 10);
    const action = btn.dataset.action;

    if (action === 'edit')   editBook(id);
    if (action === 'delete') deleteBook(id);
});

function editBook(id) {
    const book = books.find(b => b.id === id);
    if (!book) return;
    openModal('Edit Book', `
        <div class="form-group">
            <label class="form-label">Title</label>
            <input type="text" name="title" class="form__input" value="${escapeHtml(book.title)}" required>
        </div>
        <div class="form-group">
            <label class="form-label">Author</label>
            <input type="text" name="author" class="form__input" value="${escapeHtml(book.author)}" required>
        </div>
        <div class="form-group">
            <label class="form-label">ISBN</label>
            <input type="text" name="isbn" class="form__input" value="${escapeHtml(book.isbn || '')}">
        </div>
    `, (data, form) => {
        clearFieldErrors(form);
        let ok = true;
        if (data.title.length < 2)  { showFieldError(form, 'title',  'Title is too short');  ok = false; }
        if (data.author.length < 2) { showFieldError(form, 'author', 'Author is too short'); ok = false; }
        if (!ok) return false;
        book.title  = data.title;
        book.author = data.author;
        book.isbn   = data.isbn;
        saveBooks(books);
        toast('Book updated', 'success');
        render(document.getElementById('searchBox').value);
    }, 'Save');
}

function deleteBook(id) {
    const book = books.find(b => b.id === id);
    if (!book) return;
    if (book.issuedTo) { toast('Cannot delete an issued book. Return it first.', 'error'); return; }
    if (!confirm('Delete "' + book.title + '"? This cannot be undone.')) return;
    books = books.filter(b => b.id !== id);
    saveBooks(books);
    toast('Book deleted', 'success');
    render(document.getElementById('searchBox').value);
}

// Add book
const addBtn = document.getElementById('addBtn');
if (addBtn) {
    addBtn.addEventListener('click', () => {
        openModal('Add New Book', `
            <div class="form-group">
                <label class="form-label">Title</label>
                <input type="text" name="title" class="form__input" placeholder="e.g. The Hobbit" required>
            </div>
            <div class="form-group">
                <label class="form-label">Author</label>
                <input type="text" name="author" class="form__input" placeholder="e.g. J.R.R. Tolkien" required>
            </div>
            <div class="form-group">
                <label class="form-label">ISBN (optional)</label>
                <input type="text" name="isbn" class="form__input" placeholder="e.g. 9780547928227">
            </div>
        `, (data, form) => {
            clearFieldErrors(form);
            let ok = true;
            if (data.title.length < 2)  { showFieldError(form, 'title',  'Title is too short');  ok = false; }
            if (data.author.length < 2) { showFieldError(form, 'author', 'Author is too short'); ok = false; }
            if (!ok) return false;
            books.push({
                id: Date.now(),
                title: data.title,
                author: data.author,
                isbn: data.isbn || '',
                issuedTo: null
            });
            saveBooks(books);
            toast('Book added', 'success');
            render(document.getElementById('searchBox').value);
        }, 'Add');
    });
}

// CSV export
document.getElementById('exportBtn').addEventListener('click', () => {
    exportCSV('lexvault-books.csv', books.map(b => ({
        ID: b.id,
        Title: b.title,
        Author: b.author,
        ISBN: b.isbn || '',
        Status: b.issuedTo ? ('Issued to ' + b.issuedTo) : 'Available'
    })));
});

// Theme toggle
const themeBtn = document.getElementById('themeToggle');
if (themeBtn) {
    const current = localStorage.getItem('lv_theme') || 'light';
    themeBtn.innerHTML = current === 'dark' ? '&#9728;' : '&#127769;';
    themeBtn.addEventListener('click', toggleTheme);
}

// Logout
document.getElementById('logoutBtn').addEventListener('click', logout);

// Hide Members nav link for members
if (auth.role === 'member') {
    const nm = document.getElementById('navMembers');
    if (nm) nm.style.display = 'none';
}
