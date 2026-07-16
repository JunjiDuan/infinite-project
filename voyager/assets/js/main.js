(() => {
const { supportedLanguages, translations } = window.InfiniteVoyagerI18n;

const root = document.documentElement;
const languageStorageKey = "infinite-voyager-language";
const themeStorageKey = "infinite-voyager-theme";

const readStorage = (key) => {
  try { return localStorage.getItem(key); } catch { return null; }
};

const writeStorage = (key, value) => {
  try { localStorage.setItem(key, value); } catch { /* Storage may be unavailable. */ }
};

const mapBrowserLanguage = (language = "") => {
  const normalized = language.trim().toLowerCase();
  if (/^zh(-(tw|hk|mo|hant))/.test(normalized)) return "zh-TW";
  if (/^zh(-(cn|sg|hans))/.test(normalized) || normalized === "zh") return "zh-CN";
  if (normalized === "fr" || normalized.startsWith("fr-")) return "fr";
  if (normalized === "es" || normalized.startsWith("es-")) return "es";
  return "en";
};

const getInitialLanguage = () => {
  const stored = readStorage(languageStorageKey);
  if (supportedLanguages.includes(stored)) return stored;

  const browserLanguages = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const language of browserLanguages) {
    const mapped = mapBrowserLanguage(language);
    if (mapped) return mapped;
  }
  return "en";
};

let currentLanguage = getInitialLanguage();
let currentTheme = readStorage(themeStorageKey)
  || (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light");

if (!['light', 'dark'].includes(currentTheme)) currentTheme = "light";
root.dataset.theme = currentTheme;

const themeToggle = document.querySelector("[data-theme-toggle]");
const menuButton = document.querySelector("[data-menu-button]");
const primaryMenu = document.querySelector("[data-menu]");
const languageButton = document.querySelector("[data-language-button]");
const languageMenu = document.querySelector("[data-language-menu]");
const languageOptions = [...document.querySelectorAll("[data-language]")];

const text = (key) => translations[currentLanguage][key] ?? translations.en[key] ?? key;

const syncThemeLabel = () => {
  const key = currentTheme === "dark" ? "themeLightLabel" : "themeDarkLabel";
  themeToggle?.setAttribute("aria-label", text(key));
  themeToggle?.setAttribute("title", text(key));
};

const syncMenuLabel = () => {
  const isOpen = menuButton?.getAttribute("aria-expanded") === "true";
  menuButton?.setAttribute("aria-label", text(isOpen ? "menuCloseLabel" : "menuOpenLabel"));
};

const applyLanguage = (language, { persist = true } = {}) => {
  currentLanguage = supportedLanguages.includes(language) ? language : "en";
  const dictionary = translations[currentLanguage];

  const isPrivacyPage = document.body.dataset.page === "privacy";
  root.lang = currentLanguage;
  document.title = isPrivacyPage ? dictionary.privacyMetaTitle : dictionary.metaTitle;
  document.querySelector('meta[name="description"]')?.setAttribute("content", isPrivacyPage ? dictionary.privacyMetaDescription : dictionary.metaDescription);
  document.querySelector('meta[property="og:title"]')?.setAttribute("content", dictionary.metaTitle);
  document.querySelector('meta[property="og:description"]')?.setAttribute("content", dictionary.ogDescription);

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const value = dictionary[element.dataset.i18n];
    if (value !== undefined) element.textContent = value;
  });
  document.querySelectorAll("[data-i18n-html]").forEach((element) => {
    const value = dictionary[element.dataset.i18nHtml];
    if (value !== undefined) element.innerHTML = value;
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    const value = dictionary[element.dataset.i18nAriaLabel];
    if (value !== undefined) element.setAttribute("aria-label", value);
  });
  document.querySelectorAll("[data-i18n-alt]").forEach((element) => {
    const value = dictionary[element.dataset.i18nAlt];
    if (value !== undefined) element.setAttribute("alt", value);
  });

  languageOptions.forEach((option) => {
    option.setAttribute("aria-checked", String(option.dataset.language === currentLanguage));
  });
  syncThemeLabel();
  syncMenuLabel();
  if (persist) writeStorage(languageStorageKey, currentLanguage);
};

const closePrimaryMenu = ({ returnFocus = false } = {}) => {
  if (menuButton?.getAttribute("aria-expanded") !== "true") return;
  menuButton.setAttribute("aria-expanded", "false");
  primaryMenu?.removeAttribute("data-open");
  syncMenuLabel();
  if (returnFocus) menuButton.focus();
};

const closeLanguageMenu = ({ returnFocus = true } = {}) => {
  if (languageMenu?.hidden !== false) return;
  languageMenu.hidden = true;
  languageButton?.setAttribute("aria-expanded", "false");
  if (returnFocus) languageButton?.focus();
};

const openLanguageMenu = () => {
  if (!languageMenu || !languageButton) return;
  closePrimaryMenu();
  languageMenu.hidden = false;
  languageButton.setAttribute("aria-expanded", "true");
  const selected = languageOptions.find((option) => option.getAttribute("aria-checked") === "true");
  selected?.focus();
};

themeToggle?.addEventListener("click", () => {
  currentTheme = currentTheme === "dark" ? "light" : "dark";
  root.dataset.theme = currentTheme;
  writeStorage(themeStorageKey, currentTheme);
  syncThemeLabel();
});

menuButton?.addEventListener("click", () => {
  const opening = menuButton.getAttribute("aria-expanded") !== "true";
  closeLanguageMenu({ returnFocus: false });
  menuButton.setAttribute("aria-expanded", String(opening));
  primaryMenu?.toggleAttribute("data-open", opening);
  syncMenuLabel();
});

primaryMenu?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => closePrimaryMenu());
});

languageButton?.addEventListener("click", () => {
  if (languageMenu?.hidden === false) closeLanguageMenu();
  else openLanguageMenu();
});

languageOptions.forEach((option, index) => {
  option.addEventListener("click", () => {
    applyLanguage(option.dataset.language);
    closeLanguageMenu();
  });

  option.addEventListener("keydown", (event) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let nextIndex = index;
    if (event.key === "ArrowDown") nextIndex = (index + 1) % languageOptions.length;
    if (event.key === "ArrowUp") nextIndex = (index - 1 + languageOptions.length) % languageOptions.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = languageOptions.length - 1;
    languageOptions[nextIndex].focus();
  });
});

document.addEventListener("click", (event) => {
  if (languageMenu?.hidden === false && !event.target.closest(".language-control")) {
    closeLanguageMenu();
  }
  if (primaryMenu?.hasAttribute("data-open") && !event.target.closest(".navbar")) {
    closePrimaryMenu();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (languageMenu?.hidden === false) {
    event.preventDefault();
    closeLanguageMenu();
    return;
  }
  if (primaryMenu?.hasAttribute("data-open")) {
    event.preventDefault();
    closePrimaryMenu({ returnFocus: true });
  }
});

const revealElements = document.querySelectorAll("[data-reveal]");
if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12 });
  root.classList.add("reveal-ready");
  revealElements.forEach((element) => observer.observe(element));
} else {
  revealElements.forEach((element) => element.classList.add("is-visible"));
}

document.querySelectorAll("[data-year]").forEach((element) => {
  element.textContent = new Date().getFullYear();
});

applyLanguage(currentLanguage, { persist: false });
})();
