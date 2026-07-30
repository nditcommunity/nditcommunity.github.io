(() => {
  let theme;

  try {
    theme = localStorage.getItem('theme');
  } catch {
    theme = null;
  }

  const preferredTheme =
    theme ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night-mode' : 'day-mode');

  document.documentElement.classList.add(preferredTheme);
})();
