(() => {
  let theme;

  try {
    theme = localStorage.getItem('theme');
  } catch {
    theme = null;
  }

  if (theme === 'night-mode') {
    theme = 'dark-mode';
  } else if (theme === 'day-mode') {
    theme = 'light-mode';
  }

  const preferredTheme =
    theme ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark-mode' : 'light-mode');

  document.documentElement.classList.add(preferredTheme);
})();
