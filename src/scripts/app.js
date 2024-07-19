$(document).ready(function () {
  loadSavedTheme();
  updateThemeColors();

  $(".theme-icon").on("click", function () {
    toggleTheme();
  });

  function applyTheme(theme) {
    const elements = [
      "body",
      ".title",
      "nav",
      ".nav-item",
      "footer"
    ];

    elements.forEach(selector => {
      const $el = $(selector);
      if (theme === "dark") {
        $el.addClass("dark-mode").removeClass("light-mode");
      } else {
        $el.addClass("light-mode").removeClass("dark-mode");
      }
    });
  }

  function loadSavedTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    if (savedTheme === "dark") {
      $(".sun-icon").addClass("hidden");
      $(".moon-icon").removeClass("hidden");
    } else {
      $(".moon-icon").addClass("hidden");
      $(".sun-icon").removeClass("hidden");
    }
    applyTheme(savedTheme);
  }

  function saveThemePreference() {
    const newTheme = $(".sun-icon").is(":visible") ? "dark" : "light";
    localStorage.setItem("theme", newTheme);
  }

  function toggleTheme() {
    $(".sun-icon, .moon-icon").toggleClass("hidden");
    saveThemePreference();
    updateThemeColors();
  }

  function updateThemeColors() {
    let color1, color2;
    const theme = $(".sun-icon").is(":visible") ? "dark" : "light";

    if (theme === "dark") {
      color1 = "white";
      color2 = "black";
    } else {
      color1 = "black";
      color2 = "white";
    }

    $(":root").css({ "--black": color1, "--white": color2 });
    applyTheme(theme);
  }
});
