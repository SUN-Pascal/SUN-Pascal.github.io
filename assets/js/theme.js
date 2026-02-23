/*
  Theme + mobile nav (built from scratch).
  - Stores preference in localStorage.
  - Defaults to system preference when unset.
*/
(function(){
  const storageKey = "theme";
  const root = document.documentElement;

  function systemPrefersDark(){
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function applyTheme(theme){
    if(theme === "dark") root.setAttribute("data-theme", "dark");
    else root.setAttribute("data-theme", "light");
  }

  function getTheme(){
    const saved = localStorage.getItem(storageKey);
    if(saved === "light" || saved === "dark") return saved;
    return systemPrefersDark() ? "dark" : "light";
  }

  // Apply ASAP (prevents flash)
  applyTheme(getTheme());

  window.addEventListener("DOMContentLoaded", () => {
    // Footer year
    const y = document.getElementById("year");
    if(y) y.textContent = new Date().getFullYear();

    // Theme toggle
    const btn = document.getElementById("themeToggle");
    if(btn){
      btn.addEventListener("click", () => {
        const now = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        localStorage.setItem(storageKey, now);
        applyTheme(now);
      });
    }

    // Mobile nav
    const toggle = document.querySelector(".nav-toggle");
    const nav = document.querySelector(".nav");
    if(toggle && nav){
      toggle.addEventListener("click", () => {
        const isOpen = nav.classList.toggle("open");
        toggle.setAttribute("aria-expanded", String(isOpen));
        toggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
      });
    }
  });
})();
