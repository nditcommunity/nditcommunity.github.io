$(document).ready(() => {
  const applyTheme = (themeClass) => {
    // update theme class
    $('body').removeClass('night-mode day-mode').addClass(themeClass);

    // update theme icons
    const isDarkMode = themeClass === 'night-mode';
    $('.sun-icon').toggleClass('hidden', !isDarkMode);
    $('.moon-icon').toggleClass('hidden', isDarkMode);

    // update all social icons dynamically
    $('.social-icon').each(function () {
      const src = $(this).attr('src');
      const newSrc = src.replace(/-(black|white)\.png$/, `-${isDarkMode ? 'white' : 'black'}.png`);
      $(this).attr('src', newSrc);
    });
  };

  // load previously saved theme or set default to night-mode
  const savedTheme = localStorage.getItem('theme') || 'day-mode';
  applyTheme(savedTheme);

  // toggle new theme
  $('.theme-icon').on('click', () => {
    // determine which theme to apply
    const currentTheme = $('body').hasClass('night-mode') ? 'night-mode' : 'day-mode';
    const newTheme = currentTheme === 'night-mode' ? 'day-mode' : 'night-mode';

    // save and apply new theme
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  });
});
