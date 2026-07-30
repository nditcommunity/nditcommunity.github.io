const themeToggle = document.querySelector('.theme-toggle');
const sunIcon = document.querySelector('.sun-icon');
const moonIcon = document.querySelector('.moon-icon');
const socialIcons = document.querySelectorAll('.social-icon');

const applyTheme = (theme) => {
  const isDarkMode = theme === 'night-mode';

  document.documentElement.classList.toggle('night-mode', isDarkMode);
  document.documentElement.classList.toggle('day-mode', !isDarkMode);
  document.body.classList.toggle('night-mode', isDarkMode);
  document.body.classList.toggle('day-mode', !isDarkMode);

  sunIcon?.classList.toggle('hidden', !isDarkMode);
  moonIcon?.classList.toggle('hidden', isDarkMode);

  if (themeToggle) {
    const action = isDarkMode ? 'Switch to light mode' : 'Switch to dark mode';
    themeToggle.setAttribute('aria-label', action);
    themeToggle.setAttribute('title', action);
    themeToggle.setAttribute('aria-pressed', String(isDarkMode));
  }

  socialIcons.forEach((icon) => {
    icon.src = icon.src.replace(/-(black|white)\.png$/, `-${isDarkMode ? 'white' : 'black'}.png`);
  });

  const themeColor = document.querySelector('meta[name="theme-color"]');
  themeColor?.setAttribute('content', isDarkMode ? '#121016' : '#f7f5fa');
};

let savedTheme;

try {
  savedTheme = localStorage.getItem('theme');
} catch {
  savedTheme = null;
}

const preferredTheme =
  savedTheme ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night-mode' : 'day-mode');

applyTheme(preferredTheme);

themeToggle?.addEventListener('click', () => {
  const newTheme = document.body.classList.contains('night-mode') ? 'day-mode' : 'night-mode';

  try {
    localStorage.setItem('theme', newTheme);
  } catch {
    // The theme still changes when storage is unavailable.
  }

  applyTheme(newTheme);
});

const contactForm = document.querySelector('.contact-form');
const contactFormResponse = document.querySelector('[name="contact-form-response"]');
const formStatus = document.querySelector('.form-status');
const formSubmit = contactForm?.querySelector('.form-submit');
let contactFormSubmitted = false;
let contactFormTimeout;

contactForm?.addEventListener('submit', () => {
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

const calendar = document.querySelector('.calendar');
const calendarStatus = document.querySelector('.calendar-status');
let calendarTimeout;

calendar?.addEventListener('load', () => {
  clearTimeout(calendarTimeout);
  calendarStatus.classList.add('hidden');
});

calendar?.addEventListener('error', () => {
  clearTimeout(calendarTimeout);
  calendarStatus.classList.remove('hidden');
  calendarStatus.textContent = 'The calendar could not load. Use the link above to open it in a new tab.';
});

if (calendar) {
  calendarTimeout = setTimeout(() => {
    if (!calendarStatus.classList.contains('hidden')) {
      calendarStatus.textContent =
        'The calendar is taking longer than expected. You can open it in a new tab.';
    }
  }, 10000);
}
