(function () {
  function getTheme() {
    return document.documentElement.getAttribute("data-theme") || "light";
  }
  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
    try { localStorage.setItem("theme", theme); } catch (e) {}
    var icon = document.getElementById("theme-toggle-icon");
    if (icon) icon.textContent = (theme === "dark") ? "☀️" : "🌙";
  }

  // Set initial icon (theme may already be set in head/custom.html)
  setTheme(getTheme());

  var btn = document.getElementById("theme-toggle");
  if (!btn) return;
  btn.addEventListener("click", function () {
    setTheme(getTheme() === "dark" ? "light" : "dark");
  });
})();
