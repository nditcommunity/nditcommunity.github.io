$(document).ready(function() {
  $(".theme-icon").on("click", function() {
    $(".sun-icon, .moon-icon").toggleClass("hidden");

    const [color1, color2] = $(".sun-icon").is(":visible") ? ["black", "white"] : ["white", "black"];
    $(":root").css({"--black": color1, "--white": color2});
  });
});
