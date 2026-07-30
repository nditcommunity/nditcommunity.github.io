const contactForm = document.querySelector('.contact-form');
const contactFormResponse = document.querySelector('[name="contact-form-response"]');
const formStatus = document.querySelector('.form-status');
const formSubmit = contactForm?.querySelector('.form-submit');
let contactFormSubmitted = false;
let contactFormTimeout;

contactForm?.addEventListener('submit', (event) => {
  if (!navigator.onLine) {
    event.preventDefault();
    formStatus.textContent = 'You appear to be offline. Reconnect, then try sending your message again.';
    return;
  }

  contactFormSubmitted = true;
  formSubmit.disabled = true;
  formStatus.textContent = 'Sending your message…';

  clearTimeout(contactFormTimeout);
  contactFormTimeout = setTimeout(() => {
    if (!contactFormSubmitted) {
      return;
    }

    formSubmit.disabled = false;
    formStatus.textContent =
      'We could not confirm that your message was sent. Please try the Google Form link.';
    contactFormSubmitted = false;
  }, 15000);
});

contactFormResponse?.addEventListener('load', () => {
  if (!contactFormSubmitted) {
    return;
  }

  clearTimeout(contactFormTimeout);
  contactForm.reset();
  formSubmit.disabled = false;
  formStatus.textContent = 'Thanks! Your message has been sent.';
  contactFormSubmitted = false;
});

contactFormResponse?.addEventListener('error', () => {
  if (!contactFormSubmitted) {
    return;
  }

  clearTimeout(contactFormTimeout);
  formSubmit.disabled = false;
  formStatus.textContent = 'Your message could not be sent. Please try again or use the Google Form link.';
  contactFormSubmitted = false;
});
