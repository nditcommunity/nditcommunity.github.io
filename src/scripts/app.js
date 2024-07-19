// theme management

$(document).ready(() => {

  const applyTheme = (themeClass) => {

    // update theme class
    $("body").removeClass("dark-mode light-mode").addClass(themeClass);

    // update theme icons
    const isDarkMode = themeClass === "dark-mode";
    $(".sun-icon").toggleClass("hidden", !isDarkMode);
    $(".moon-icon").toggleClass("hidden", isDarkMode);
  };

  // load previously saved theme
  const savedTheme = localStorage.getItem("theme") || "light-mode";
  applyTheme(savedTheme);

  // toggle new theme
  $(".theme-icon").on("click", () => {

    // determine which theme to apply
    const currentTheme = $("body").hasClass("dark-mode")
      ? "dark-mode"
      : "light-mode";

    const newTheme = currentTheme === "dark-mode"
      ? "light-mode"
      : "dark-mode";

    // save and apply new theme
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
  });
});
