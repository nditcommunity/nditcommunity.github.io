$(document).ready(function () {
  loadSavedTheme();
  updateThemeColors();

  $(".theme-icon").on("click", function () {
    toggleTheme();
  });

  function applyTheme(theme) {
    const $body = $("body");

    if (theme === "dark") {
      $body.removeClass("light-mode").addClass("dark-mode");
    } else {
      $body.removeClass("dark-mode").addClass("light-mode");
    }
  }

  function loadSavedTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";

    if (savedTheme === "light") {
      $(".sun-icon").addClass("hidden");
      $(".moon-icon").removeClass("hidden");

    } else {
      $(".moon-icon").addClass("hidden");
      $(".sun-icon").removeClass("hidden");
    }
    
    applyTheme(savedTheme);
  }

  function toggleTheme() {
    $(".sun-icon, .moon-icon").toggleClass("hidden");
    saveThemePreference();
    updateThemeColors();

    function saveThemePreference() {
      const newTheme = $(".sun-icon").is(":visible") ? "dark" : "light";
      localStorage.setItem("theme", newTheme);
    }
  }

  function updateThemeColors() {
    const theme = $(".sun-icon").is(":visible") ? "dark" : "light";

    if (theme === "dark") {
      color1 = "white";
      color2 = "black";
    } else {
      color1 = "black";
      color2 = "white";
    }

    applyTheme(theme);
  }
});
