const themeToggle = document.querySelector('.theme-toggle');
const sunIcon = document.querySelector('.sun-icon');
const moonIcon = document.querySelector('.moon-icon');

const normalizeTheme = (theme) => {
  if (theme === 'night-mode') return 'dark-mode';
  if (theme === 'day-mode') return 'light-mode';
  return theme;
};

const applyTheme = (theme) => {
  const isDarkMode = theme === 'dark-mode';

  document.documentElement.classList.toggle('dark-mode', isDarkMode);
  document.documentElement.classList.toggle('light-mode', !isDarkMode);
  document.body.classList.toggle('dark-mode', isDarkMode);
  document.body.classList.toggle('light-mode', !isDarkMode);

  sunIcon?.classList.toggle('hidden', !isDarkMode);
  moonIcon?.classList.toggle('hidden', isDarkMode);

  if (themeToggle) {
    const action = isDarkMode ? 'Switch to light mode' : 'Switch to dark mode';
    themeToggle.setAttribute('aria-label', action);
    themeToggle.setAttribute('title', action);
    themeToggle.setAttribute('aria-pressed', String(isDarkMode));
  }

  const themeColor = document.querySelector('meta[name="theme-color"]');
  themeColor?.setAttribute('content', isDarkMode ? '#121016' : '#f7f5fa');
};

let savedTheme;

try {
  savedTheme = normalizeTheme(localStorage.getItem('theme'));
} catch {
  savedTheme = null;
}

const preferredTheme =
  savedTheme ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark-mode' : 'light-mode');

applyTheme(preferredTheme);

themeToggle?.addEventListener('click', () => {
  const newTheme = document.body.classList.contains('dark-mode') ? 'light-mode' : 'dark-mode';

  try {
    localStorage.setItem('theme', newTheme);
  } catch {
    // The theme still changes when storage is unavailable.
  }

  const updateTheme = () => applyTheme(newTheme);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (document.startViewTransition && !reduceMotion) {
    document.startViewTransition(updateTheme);
  } else {
    updateTheme();
  }
});
