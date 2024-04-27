// theme toggle

$(document).ready(function () {
  updateThemeColors();

  $('.theme-icon').on('click', function () {
    $('.sun-icon, .moon-icon').toggleClass('hidden');
    updateThemeColors();
  });

  function updateThemeColors() {
    const [color1, color2] = $('.sun-icon').is(':visible') ? ['white', 'black'] : ['black', 'white'];
    $(':root').css({ '--black': color1, '--white': color2 });
  }
});
