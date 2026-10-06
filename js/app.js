import { setLanguage, currentLang, updateDOM } from "./i18n.js";

document.addEventListener("DOMContentLoaded", () => {
  try {
    updateDOM();
  } catch (err) {
    console.warn("i18n updateDOM notice:", err);
  }

  const langBtn = document.getElementById("lang-toggle-btn");
  if (langBtn) {
    langBtn.addEventListener("click", () => {
      const nextLang = currentLang === "en" ? "tr" : "en";
      setLanguage(nextLang);
    });
  }

  const themeBtn = document.getElementById("ost-theme-toggle-btn");
  const themeIcon = document.getElementById("ost-theme-icon");

  function applyTheme(theme) {
    const isDark = theme === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    if (themeIcon) {
      themeIcon.textContent = isDark ? "Light" : "Dark";
    }
    localStorage.setItem("ost_theme", theme);
  }

  let storedTheme = localStorage.getItem("ost_theme");
  if (!storedTheme) {
    storedTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  applyTheme(storedTheme);

  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const isCurrentlyDark =
        document.documentElement.classList.contains("dark");
      applyTheme(isCurrentlyDark ? "light" : "dark");
    });
  }

  const fontSlider = document.getElementById("ost-font-scale-slider");
  const fontVal = document.getElementById("ost-font-scale-val");

  function applyFontScale(value) {
    const pct = parseInt(value, 10);
    const targets = document.querySelectorAll(
      "main, section, article, aside, footer",
    );
    targets.forEach((el) => {
      el.style.fontSize = `${pct}%`;
    });
    if (fontVal) fontVal.textContent = `${pct}%`;
    localStorage.setItem("ost_font_scale", String(pct));
  }

  let storedScale = localStorage.getItem("ost_font_scale") || "100";

  if (fontSlider) {
    fontSlider.style.width = "80px";
    fontSlider.style.flexShrink = "0";
    fontSlider.value = storedScale;
    fontSlider.addEventListener("input", (e) => {
      applyFontScale(e.target.value);
    });
  }

  applyFontScale(storedScale);

  const donationSelect = document.getElementById("donation-select");
  const donateLink = document.getElementById("donate-link");
  const donationUrls = {
    kreosus: "https://kreosus.com/aridigital/about",
    bmc: "https://buymeacoffee.com/mustafagoksal",
  };
  if (donationSelect && donateLink) {
    donationSelect.addEventListener("change", () => {
      const url = donationUrls[donationSelect.value];
      if (url) donateLink.href = url;
    });
  }

  const legalTabBtns = document.querySelectorAll(".legal-tab-btn");
  const legalSections = document.querySelectorAll(".legal-section");

  if (legalTabBtns.length > 0) {
    legalTabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetDoc = btn.getAttribute("data-doc");

        legalTabBtns.forEach((b) => {
          b.classList.remove("border-zinc-100", "text-zinc-100");
          b.classList.add(
            "border-transparent",
            "text-zinc-500",
            "hover:text-zinc-300",
          );
        });

        btn.classList.add("border-zinc-100", "text-zinc-100");
        btn.classList.remove("border-transparent", "text-zinc-500");

        legalSections.forEach((sec) => {
          if (sec.id === `doc-${targetDoc}`) {
            sec.classList.remove("hidden");
          } else {
            sec.classList.add("hidden");
          }
        });
      });
    });
  }
});
