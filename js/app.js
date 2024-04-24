$(document).ready(function() {

  // theme toggle

  const updateThemeColors = () => {
    const isVisible = !$(".sun-icon").hasClass("hidden");
    const [color1, color2] = isVisible ? ["white", "black"] : ["black", "white"];
    $(":root").css({"--black": color1, "--white": color2});
  };

  updateThemeColors();

  $(".theme-icon").on("click", function() {
    $(".sun-icon, .moon-icon").toggleClass("hidden");
    updateThemeColors();
  });

  // show & hide pages

  $(".navbar-item").on("click", function(e) {
    e.preventDefault();
    const page = $(this).data("section");
    $("." + page).removeClass("hidden").siblings('section').addClass("hidden");
  });
});
