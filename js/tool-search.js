import { t } from "./i18n.js?v=crypto-ads-hotfix-20261021";

document.addEventListener("DOMContentLoaded", () => {
  const dialog = document.getElementById("tool-search-dialog");
  const input = document.getElementById("tool-search-input");
  const results = document.getElementById("tool-search-results");
  const status = document.getElementById("tool-search-status");

  if (!dialog || !input || !results || !status) return;

  const cards = [...document.querySelectorAll("#tools-grid .tool-card")];
  const openers = [...document.querySelectorAll("[data-open-tool-search]")];
  let previousFocus = null;

  function renderResults() {
    const query = input.value.trim().toLocaleLowerCase();
    const matches = cards.filter((card) => {
      const content = [
        card.querySelector("h3")?.textContent,
        card.querySelector("p")?.textContent,
        card.dataset.keywords,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();
      return !query || content.includes(query);
    });

    results.replaceChildren();
    matches.forEach((card) => {
      const sourceLink = card;
      const link = document.createElement("a");
      link.href = sourceLink.href;
      link.className = "tool-search-result";

      const title = document.createElement("span");
      title.className = "tool-search-result-title";
      title.textContent = card.querySelector("h3")?.textContent.trim() || "";

      const description = document.createElement("span");
      description.className = "tool-search-result-description";
      description.textContent =
        card.querySelector("p")?.textContent.trim() || "";

      link.append(title, description);
      const item = document.createElement("li");
      item.append(link);
      results.append(item);
    });

    status.textContent = matches.length ? "" : t("search_no_results");
  }

  function openSearch(opener = document.activeElement) {
    previousFocus = opener;
    if (!dialog.open) dialog.showModal();
    input.value = "";
    renderResults();
    input.focus();
  }

  openers.forEach((opener) => {
    opener.addEventListener("click", () => openSearch(opener));
  });

  dialog
    .querySelector("[data-close-tool-search]")
    ?.addEventListener("click", () => {
      dialog.close();
    });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    dialog.close();
  });

  dialog.addEventListener("close", () => {
    if (previousFocus instanceof HTMLElement) previousFocus.focus();
  });

  input.addEventListener("input", renderResults);
  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      results.querySelector("a")?.focus();
    }
  });

  results.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const links = [...results.querySelectorAll("a")];
    const currentIndex = links.indexOf(document.activeElement);
    const nextIndex =
      event.key === "ArrowDown" ? currentIndex + 1 : currentIndex - 1;
    event.preventDefault();
    if (nextIndex < 0) input.focus();
    else links[Math.min(nextIndex, links.length - 1)]?.focus();
  });

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      if (!dialog.open) openSearch();
    }
  });

  window.addEventListener("languageChanged", renderResults);
  renderResults();
});
