// Home page — mobile menu toggle + contact form validation

document.querySelector('.navbar__toggle').addEventListener('click', function () {
    document.querySelector('.navbar__links').classList.toggle('navbar__links--open');
});

// Contact form validation
const contactForm = document.querySelector('.contact__form');
if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
        e.preventDefault();
        clearFieldErrors(contactForm);
        const name    = contactForm.querySelector('input[type="text"]');
        const email   = contactForm.querySelector('input[type="email"]');
        const message = contactForm.querySelector('textarea');

        // give them a name so validation helpers work
        name.name    = 'name';
        email.name   = 'email';
        message.name = 'message';

        let ok = true;
        if (name.value.trim().length < 2) {
            showFieldError(contactForm, 'name', 'Please enter your name');
            ok = false;
        }
        if (!isValidEmail(email.value.trim())) {
            showFieldError(contactForm, 'email', 'Enter a valid email address');
            ok = false;
        }
        if (message.value.trim().length < 5) {
            showFieldError(contactForm, 'message', 'Message is too short');
            ok = false;
        }
        if (ok) {
            toast('Message sent. Thanks for reaching out!', 'success');
            contactForm.reset();
        }
    });
}
