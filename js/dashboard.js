// Dashboard — role-aware stats, activity, quick actions

const auth = requireAuth();
if (!auth) throw new Error('no auth');

seedDemoData();
recomputeOverdue();

const books    = loadBooks();
const members  = loadMembers();
const activity = loadActivity();

// --- Greeting ---
document.getElementById('greetName').textContent = auth.username;
document.getElementById('greetRole').textContent = auth.role;
document.getElementById('navUser').textContent   = '@' + auth.username;

// --- Stats ---
function buildStats() {
    let html = '';

    if (auth.role === 'admin' || auth.role === 'librarian') {
        const totalBooks   = books.length;
        const totalMembers = members.length;
        const issuedBooks  = books.filter(b => b.issuedTo !== null).length;
        const overdue      = activity.filter(a => a.status === 'Overdue').length;

        html = `
            <div class="stat-card stat-card--blue">
                <div class="stat-card__icon">&#128214;</div>
                <div class="stat-card__num">${totalBooks}</div>
                <div class="stat-card__label">Total Books</div>
            </div>
            <div class="stat-card stat-card--green">
                <div class="stat-card__icon">&#128101;</div>
                <div class="stat-card__num">${totalMembers}</div>
                <div class="stat-card__label">Total Members</div>
            </div>
            <div class="stat-card stat-card--gold">
                <div class="stat-card__icon">&#128260;</div>
                <div class="stat-card__num">${issuedBooks}</div>
                <div class="stat-card__label">Books Issued</div>
            </div>
            <div class="stat-card stat-card--red">
                <div class="stat-card__icon">&#9888;</div>
                <div class="stat-card__num">${overdue}</div>
                <div class="stat-card__label">Overdue</div>
            </div>
        `;
    } else {
        const myBooks    = books.filter(b => b.issuedTo === auth.username);
        const myOverdue  = activity.filter(a => a.member === auth.username && a.status === 'Overdue').length;
        const myReturned = activity.filter(a => a.member === auth.username && a.action === 'Returned').length;

        html = `
            <div class="stat-card stat-card--blue">
                <div class="stat-card__icon">&#128214;</div>
                <div class="stat-card__num">${myBooks.length}</div>
                <div class="stat-card__label">Currently Borrowed</div>
            </div>
            <div class="stat-card stat-card--gold">
                <div class="stat-card__icon">&#128337;</div>
                <div class="stat-card__num">${myOverdue}</div>
                <div class="stat-card__label">Overdue</div>
            </div>
            <div class="stat-card stat-card--green">
                <div class="stat-card__icon">&#9989;</div>
                <div class="stat-card__num">${myReturned}</div>
                <div class="stat-card__label">Returned</div>
            </div>
            <div class="stat-card stat-card--red">
                <div class="stat-card__icon">&#128176;</div>
                <div class="stat-card__num">${myOverdue * 5}</div>
                <div class="stat-card__label">Fine (₹)</div>
            </div>
        `;
    }
    document.getElementById('statsGrid').innerHTML = html;
}
buildStats();

// --- Quick actions ---
function buildActions() {
    let html = '';
    if (auth.role === 'admin' || auth.role === 'librarian') {
        html = `
            <a href="books.html" class="qa-btn">
                <span class="qa-btn__icon">&#128214;</span>
                <span>Manage Books</span>
            </a>
            <a href="members.html" class="qa-btn">
                <span class="qa-btn__icon">&#128101;</span>
                <span>Manage Members</span>
            </a>
            <button class="qa-btn" id="issueBtn">
                <span class="qa-btn__icon">&#128260;</span>
                <span>Issue Book</span>
            </button>
            <button class="qa-btn" id="returnBtn">
                <span class="qa-btn__icon">&#8617;</span>
                <span>Return Book</span>
            </button>
        `;
        if (auth.role === 'admin') {
            html += `
                <button class="qa-btn qa-btn--admin" id="clearBtn">
                    <span class="qa-btn__icon">&#128465;</span>
                    <span>Reset Demo Data</span>
                </button>
            `;
        }
    } else {
        html = `
            <a href="books.html" class="qa-btn">
                <span class="qa-btn__icon">&#128269;</span>
                <span>Browse Books</span>
            </a>
            <button class="qa-btn" id="historyBtn">
                <span class="qa-btn__icon">&#128221;</span>
                <span>My History</span>
            </button>
        `;
    }
    document.getElementById('qaGrid').innerHTML = html;
}
buildActions();

// --- Activity table with search ---
function renderActivity(filterText) {
    let rows = (auth.role === 'member')
        ? activity.filter(a => a.member === auth.username)
        : activity.slice();

    if (filterText) {
        const q = filterText.toLowerCase();
        rows = rows.filter(a =>
            a.bookTitle.toLowerCase().includes(q) ||
            a.member.toLowerCase().includes(q) ||
            a.action.toLowerCase().includes(q) ||
            a.status.toLowerCase().includes(q)
        );
    }

    const body = document.getElementById('activityBody');
    if (rows.length === 0) {
        body.innerHTML = '<tr><td colspan="6" class="activity__empty">No activity found.</td></tr>';
        return;
    }

    const today = todayISO();
    body.innerHTML = rows.map(a => {
        let dueCol = '-';
        if (a.dueDate) {
            if (a.action === 'Returned') {
                dueCol = a.dueDate;
            } else if (a.status === 'Overdue') {
                const days = daysBetween(a.dueDate, today);
                dueCol = a.dueDate + ' <span class="pill pill--overdue">-' + days + 'd</span>';
            } else {
                const days = daysBetween(today, a.dueDate);
                dueCol = a.dueDate + ' <span class="pill pill--active">' + days + 'd left</span>';
            }
        }
        return `
            <tr>
                <td>${a.date}</td>
                <td>${a.bookTitle}</td>
                <td>${a.member}</td>
                <td>${a.action}</td>
                <td>${dueCol}</td>
                <td><span class="pill pill--${a.status.toLowerCase()}">${a.status}</span></td>
            </tr>
        `;
    }).join('');
}
renderActivity('');

// Search box
const search = document.getElementById('searchActivity');
if (search) {
    search.addEventListener('input', (e) => renderActivity(e.target.value));
}


// --- Issue book (modal) ---
const issueBtn = document.getElementById('issueBtn');
if (issueBtn) {
    issueBtn.addEventListener('click', () => {
        const available = books.filter(b => b.issuedTo === null);
        if (available.length === 0) { toast('No books available to issue', 'error'); return; }

        const bookOptions   = available.map(b => `<option value="${b.id}">${b.title}</option>`).join('');
        const memberOptions = members.map(m => `<option value="${m.username}">${m.name} (@${m.username})</option>`).join('');

        openModal('Issue Book', `
            <div class="form-group">
                <label class="form-label">Book</label>
                <select name="bookId" class="form__input" required>${bookOptions}</select>
            </div>
            <div class="form-group">
                <label class="form-label">Member</label>
                <select name="member" class="form__input" required>${memberOptions}</select>
            </div>
            <div class="form-group">
                <label class="form-label">Loan period (days)</label>
                <input type="number" name="days" class="form__input" value="14" min="1" max="60" required>
            </div>
        `, (data, form) => {
            const book = books.find(b => b.id === parseInt(data.bookId, 10));
            if (!book) { toast('Book not found', 'error'); return false; }
            const days = parseInt(data.days, 10);
            if (isNaN(days) || days < 1 || days > 60) {
                showFieldError(form, 'days', 'Enter a number between 1 and 60');
                return false;
            }
            book.issuedTo = data.member;
            saveBooks(books);
            const act = loadActivity();
            act.unshift({
                date: todayISO(),
                bookTitle: book.title,
                member: data.member,
                action: 'Issued',
                status: 'Active',
                dueDate: addDaysISO(todayISO(), days)
            });
            saveActivity(act);
            toast('Book issued to @' + data.member, 'success');
            setTimeout(() => location.reload(), 600);
        }, 'Issue');
    });
}


// --- Return book (modal) ---
const returnBtn = document.getElementById('returnBtn');
if (returnBtn) {
    returnBtn.addEventListener('click', () => {
        const issued = books.filter(b => b.issuedTo !== null);
        if (issued.length === 0) { toast('No books currently issued', 'error'); return; }

        const options = issued.map(b => `<option value="${b.id}">${b.title} — @${b.issuedTo}</option>`).join('');

        openModal('Return Book', `
            <div class="form-group">
                <label class="form-label">Book to return</label>
                <select name="bookId" class="form__input" required>${options}</select>
            </div>
        `, (data) => {
            const book = books.find(b => b.id === parseInt(data.bookId, 10));
            if (!book) { toast('Book not found', 'error'); return false; }
            const member = book.issuedTo;
            book.issuedTo = null;
            saveBooks(books);
            const act = loadActivity();
            // Find matching open issue entry (if any) and mark it Complete too
            const openEntry = act.find(a => a.bookTitle === book.title && a.member === member && a.action === 'Issued' && a.status !== 'Complete');
            if (openEntry) openEntry.status = 'Complete';
            act.unshift({
                date: todayISO(),
                bookTitle: book.title,
                member: member,
                action: 'Returned',
                status: 'Complete',
                dueDate: openEntry ? openEntry.dueDate : ''
            });
            saveActivity(act);
            toast('Returned: ' + book.title, 'success');
            setTimeout(() => location.reload(), 600);
        }, 'Return');
    });
}


// --- Reset demo data (admin) ---
const clearBtn = document.getElementById('clearBtn');
if (clearBtn) {
    clearBtn.addEventListener('click', () => {
        if (!confirm('Reset all demo data (books, members, activity)? Your login stays.')) return;
        localStorage.removeItem('lv_books');
        localStorage.removeItem('lv_members');
        localStorage.removeItem('lv_activity');
        toast('Demo data reset', 'success');
        setTimeout(() => location.reload(), 600);
    });
}


// --- Member: browse / history ---
const historyBtn = document.getElementById('historyBtn');
if (historyBtn) {
    historyBtn.addEventListener('click', () => {
        const mine = activity.filter(a => a.member === auth.username);
        if (mine.length === 0) { toast('No history yet', 'info'); return; }
        const rows = mine.map(a => `
            <tr>
                <td>${a.date}</td>
                <td>${a.bookTitle}</td>
                <td>${a.action}</td>
                <td>${a.dueDate || '-'}</td>
                <td><span class="pill pill--${a.status.toLowerCase()}">${a.status}</span></td>
            </tr>
        `).join('');
        openModal('My History', `
            <div class="modal__table-wrap">
                <table class="activity__table">
                    <thead><tr><th>Date</th><th>Book</th><th>Action</th><th>Due</th><th>Status</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `, () => true, 'Close');
    });
}


// --- Logout ---
document.getElementById('logoutBtn').addEventListener('click', logout);

// --- Theme toggle ---
const themeBtn = document.getElementById('themeToggle');
if (themeBtn) {
    const current = localStorage.getItem('lv_theme') || 'light';
    themeBtn.innerHTML = current === 'dark' ? '&#9728;' : '&#127769;';
    themeBtn.addEventListener('click', toggleTheme);
}
