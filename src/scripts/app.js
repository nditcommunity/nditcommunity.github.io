// theme management

$(document).ready(() => {
  const applyTheme = (themeClass) => {
    // update theme class
    $("body").removeClass("night-mode day-mode").addClass(themeClass);

    // update theme icons
    const isDarkMode = themeClass === "night-mode";
    $(".sun-icon").toggleClass("hidden", !isDarkMode);
    $(".moon-icon").toggleClass("hidden", isDarkMode);
  };

  // load previously saved theme or set default to night-mode
  const savedTheme = localStorage.getItem("theme") || "night-mode";
  applyTheme(savedTheme);

  // toggle new theme
  $(".theme-icon").on("click", () => {
    // determine which theme to apply
    const currentTheme = $("body").hasClass("night-mode") ? "night-mode" : "day-mode";

    const newTheme = currentTheme === "night-mode" ? "day-mode" : "night-mode";

    // save and apply new theme
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
  });
});
