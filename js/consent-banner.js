(function () {
  "use strict";

  var STORAGE_KEY = "ost_consent_given";
  var CONSENT_VERSION = "2026-10-07-v1";
  var adsScriptPromise = null;
  var adsInitialized = false;
  var adsScriptFailed = false;
  var consentOpener = null;
  var adStatusObserver = null;

  var COPY = {
    en: {
      title: "Cookies & ads",
      body: "OpenStackTools processes your files only in this browser. To keep the tools free, we can show Google AdSense ads after you opt in. Ads use third-party cookies. Your files are never uploaded.",
      accept: "Accept ads",
      reject: "Reject ads",
      privacy: "Privacy",
      cookies: "Cookies",
      gdpr: "GDPR / KVKK",
      settings: "Cookie settings",
      langEn: "EN",
      langTr: "TR",
      adsOff: "Ads off — tools still run locally",
    },
    tr: {
      title: "Çerezler ve reklamlar",
      body: "OpenStackTools dosyalarınızı yalnızca bu tarayıcıda işler. Araçları ücretsiz tutmak için, onayınızdan sonra Google AdSense reklamları gösterebiliriz. Reklamlar üçüncü taraf çerez kullanır. Dosyalarınız asla yüklenmez.",
      accept: "Reklamları kabul et",
      reject: "Reklamları reddet",
      privacy: "Gizlilik",
      cookies: "Çerezler",
      gdpr: "GDPR / KVKK",
      settings: "Çerez ayarları",
      langEn: "EN",
      langTr: "TR",
      adsOff: "Reklamlar kapalı — araçlar yerelde çalışır",
    },
  };

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function () {
      window.dataLayer.push(arguments);
    };

  window.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    wait_for_update: 500,
  });

  function currentLang() {
    try {
      var params = new URLSearchParams(window.location.search);
      var q = params.get("lang");
      if (q === "en" || q === "tr") return q;
      var stored = localStorage.getItem("ost_lang");
      if (stored === "en" || stored === "tr") return stored;
    } catch (e) {}
    var nav = (navigator.language || "en").toLowerCase();
    return nav.indexOf("tr") === 0 ? "tr" : "en";
  }

  function readChoice() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      if (!v) return null;
      var consent = JSON.parse(v);
      if (
        consent.version !== CONSENT_VERSION ||
        typeof consent.granted !== "boolean"
      )
        return null;
      return consent.granted;
    } catch (e) {}
    return null;
  }

  function writeChoice(granted) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: CONSENT_VERSION,
          timestamp: new Date().toISOString(),
          granted: granted,
          purposes: { advertising: granted },
        }),
      );
    } catch (e) {}
  }

  function updateConsentMode(granted) {
    window.gtag("consent", "update", {
      ad_storage: granted ? "granted" : "denied",
      ad_user_data: granted ? "granted" : "denied",
      ad_personalization: granted ? "granted" : "denied",
      analytics_storage: "denied",
    });
  }

  function hydrateAbsoluteUrls() {
    var origin = window.location.origin;
    var path = window.location.pathname;
    if (!path.endsWith("/") && path.indexOf(".") === -1) path += "/";

    function abs(href) {
      if (!href) return origin + path;
      if (/^https?:\/\//i.test(href)) return href;
      if (href.charAt(0) === "/") return origin + href;
      return origin + path + href;
    }

    var canonical = document.querySelector('link[rel="canonical"]');
    if (canonical)
      canonical.setAttribute(
        "href",
        abs(canonical.getAttribute("href") || path),
      );

    document
      .querySelectorAll('link[rel="alternate"][hreflang]')
      .forEach(function (el) {
        var hl = el.getAttribute("hreflang");
        var base = origin + path;
        if (hl === "x-default") el.setAttribute("href", base);
        else
          el.setAttribute(
            "href",
            base +
              (base.indexOf("?") >= 0 ? "&" : "?") +
              "lang=" +
              encodeURIComponent(hl),
          );
      });

    var og = document.querySelector('meta[property="og:url"]');
    if (og) og.setAttribute("content", abs(og.getAttribute("content") || path));
  }

  function loadAdSense() {
    if (adsInitialized) {
      document.querySelectorAll(".adsense-slot").forEach(function (slot) {
        if (adsScriptFailed) hidePlacement(slot);
        else placementState(slot);
      });
      return;
    }

    var client = "__ADSENSE_PUBLISHER_ID__";
    if (typeof client !== "string" || !/^ca-pub-\d+$/.test(client)) {
      document.querySelectorAll(".adsense-slot").forEach(hidePlacement);
      console.error(
        "AdSense is disabled: a valid deployment-provided publisher ID is required.",
      );
      return;
    }

    adsInitialized = true;

    document
      .querySelectorAll(".adsense-slot[data-ad-slot]")
      .forEach(function (container) {
        var slotId = container.getAttribute("data-ad-slot");
        if (!/^\d+$/.test(slotId || "")) {
          console.error(
            "AdSense slot is disabled: invalid data-ad-slot value.",
            container,
          );
          return;
        }
        if (container.querySelector("ins.adsbygoogle")) return;

        var ad = document.createElement("ins");
        ad.className = "adsbygoogle";
        ad.style.display = "block";
        ad.setAttribute("data-ad-client", client);
        ad.setAttribute("data-ad-slot", slotId);
        ad.setAttribute("data-ad-format", "auto");
        ad.setAttribute("data-full-width-responsive", "true");
        container.appendChild(ad);
        showPlacement(container);
      });

    observeAdStatus();

    if (!adsScriptPromise) {
      adsScriptPromise = new Promise(function (resolve, reject) {
        var script = document.createElement("script");
        script.async = true;
        script.crossOrigin = "anonymous";
        script.src =
          "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" +
          encodeURIComponent(client);
        script.onload = resolve;
        script.onerror = function () {
          script.remove();
          reject(new Error("The AdSense script failed to load."));
        };
        document.head.appendChild(script);
      }).catch(function (error) {
        adsScriptPromise = null;
        adsScriptFailed = true;
        console.error(error);
        throw error;
      });
    }

    adsScriptPromise
      .then(function () {
        if (readChoice() !== true) return;
        document
          .querySelectorAll("ins.adsbygoogle:not([data-ost-pushed])")
          .forEach(function (slot) {
            slot.setAttribute("data-ost-pushed", "true");
            try {
              (window.adsbygoogle = window.adsbygoogle || []).push({});
            } catch (error) {
              slot.removeAttribute("data-ost-pushed");
              hidePlacement(slot.closest(".adsense-slot"));
              console.error("AdSense slot initialization failed.", error);
            }
          });
      })
      .catch(function (error) {
        console.error("AdSense initialization failed.", error);
        document.querySelectorAll(".adsense-slot").forEach(function (slot) {
          var ad = slot.querySelector("ins.adsbygoogle");
          if (!ad || ad.getAttribute("data-ad-status") !== "filled") hidePlacement(slot);
        });
      });

  }

  function placementState(slot) {
    if (!slot) return;
    var ad = slot.querySelector("ins.adsbygoogle");
    if (!ad) {
      hidePlacement(slot);
      return;
    }
    var status = ad.getAttribute("data-ad-status");
    if (status === "unfilled") {
      hidePlacement(slot);
    } else if (status === "filled" || ad.querySelector("iframe")) {
      showPlacement(slot);
      slot.classList.remove("is-ad-pending");
      slot.classList.add("is-ad-filled");
    } else {
      showPlacement(slot);
    }
  }

  function showPlacement(slot) {
    if (!slot) return;
    slot.hidden = false;
    slot.classList.remove("is-ad-hidden", "is-consent-blocked");
    slot.classList.add("is-ad-pending");
    var parent = slot.parentElement;
    while (parent && parent !== document.body && parent !== document.querySelector("main")) {
      if (parent.hasAttribute("data-ad-collapsed")) {
        parent.hidden = false;
        parent.classList.remove("is-ad-hidden");
        parent.removeAttribute("data-ad-collapsed");
      }
      if (parent.tagName === "ASIDE") break;
      parent = parent.parentElement;
    }
  }

  function hidePlacement(slot) {
    if (!slot) return;
    slot.hidden = true;
    slot.classList.add("is-ad-hidden");
    slot.classList.remove("is-ad-pending", "is-ad-filled");
    var parent = slot.parentElement;
    while (parent && parent !== document.body && parent !== document.querySelector("main")) {
      if (parent.tagName === "ASIDE") {
        var nonAd = Array.prototype.some.call(parent.querySelectorAll("*:not(.adsense-slot)"), function (node) {
          return !node.closest(".adsense-slot") && node.children.length === 0 && node.textContent.trim().length > 0;
        });
        if (!nonAd && !parent.querySelector(".adsense-slot:not(.is-ad-hidden)")) {
          parent.hidden = true;
          parent.classList.add("is-ad-hidden");
          parent.setAttribute("data-ad-collapsed", "true");
        }
        break;
      }
      var children = Array.prototype.filter.call(parent.children, function (child) {
        return !child.hidden && !child.classList.contains("is-ad-hidden");
      });
      if (children.length === 0) {
        parent.hidden = true;
        parent.classList.add("is-ad-hidden");
        parent.setAttribute("data-ad-collapsed", "true");
      } else {
        break;
      }
      parent = parent.parentElement;
    }
  }

  function observeAdStatus() {
    if (adStatusObserver) return;
    adStatusObserver = new MutationObserver(function (records) {
      records.forEach(function (record) {
        var ad = record.target.matches && record.target.matches("ins.adsbygoogle")
          ? record.target
          : record.target.closest && record.target.closest("ins.adsbygoogle");
        var slot = ad && ad.closest(".adsense-slot");
        if (slot) placementState(slot);
      });
    });
    document.querySelectorAll(".adsense-slot").forEach(function (slot) {
      adStatusObserver.observe(slot, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-ad-status"] });
      placementState(slot);
    });
  }

  function markSlotsBlocked(lang) {
    document.querySelectorAll(".adsense-slot").forEach(function (el) {
      var ad = el.querySelector("ins.adsbygoogle");
      if (ad && (ad.getAttribute("data-ad-status") === "filled" || ad.querySelector("iframe"))) {
        showPlacement(el);
      } else {
        el.classList.add("is-consent-blocked");
        hidePlacement(el);
      }
    });
  }

  function applyChoice(granted, lang) {
    updateConsentMode(granted);
    if (granted) {
      loadAdSense();
    } else {
      markSlotsBlocked(lang || currentLang());
    }
  }

  function t(lang) {
    return COPY[lang] || COPY.en;
  }

  function render(lang, showDialog) {
    var dict = t(lang);
    var root = document.getElementById("ost-consent-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "ost-consent-root";
      document.body.appendChild(root);
    }

    var focusedLanguage = document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('data-ost-lang');
    root.innerHTML =
      '<button type="button" id="ost-consent-reopen" class="ost-consent-reopen" aria-haspopup="dialog">' +
      dict.settings +
      "</button>" +
      '<div id="ost-consent-dialog" class="ost-consent-dialog' +
      (showDialog ? " is-open" : "") +
      '" role="dialog" aria-modal="true" aria-labelledby="ost-consent-title">' +
      '<div class="ost-consent-card">' +
      '<div class="ost-consent-head">' +
      '<h2 id="ost-consent-title">' +
      dict.title +
      "</h2>" +
      '<div class="ost-consent-langs" role="group" aria-label="Language">' +
      '<button type="button" data-ost-lang="en"' +
      (lang === "en" ? ' aria-pressed="true"' : ' aria-pressed="false"') +
      ">" +
      dict.langEn +
      "</button>" +
      '<button type="button" data-ost-lang="tr"' +
      (lang === "tr" ? ' aria-pressed="true"' : ' aria-pressed="false"') +
      ">" +
      dict.langTr +
      "</button>" +
      "</div>" +
      "</div>" +
      "<p>" +
      dict.body +
      "</p>" +
      '<div class="ost-consent-links">' +
      '<a href="/privacy-policy/">' +
      dict.privacy +
      "</a>" +
      '<a href="/cookie-policy/">' +
      dict.cookies +
      "</a>" +
      '<a href="/gdpr-kvkk/">' +
      dict.gdpr +
      "</a>" +
      "</div>" +
      '<div class="ost-consent-actions">' +
      '<button type="button" id="ost-consent-reject" class="ost-btn-ghost">' +
      dict.reject +
      "</button>" +
      '<button type="button" id="ost-consent-accept" class="ost-btn-solid">' +
      dict.accept +
      "</button>" +
      "</div>" +
      "</div>" +
      "</div>";

    root.querySelector('#ost-consent-accept').addEventListener('click', function () {
      writeChoice(true);
      applyChoice(true, lang);
      render(lang, false);
    });
    root.querySelector('#ost-consent-reject').addEventListener('click', function () {
      writeChoice(false);
      applyChoice(false, lang);
      render(lang, false);
    });
    root.querySelector('#ost-consent-reopen').addEventListener('click', function () {
      consentOpener = this;
      render(currentLang(), true);
    });
    root.querySelectorAll('[data-ost-lang]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var next = btn.getAttribute('data-ost-lang');
        try { localStorage.setItem('ost_lang', next); } catch (e) {  }
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: next } }));
        render(next, true);
      });
    });

    if (showDialog) {
      var focusTarget = focusedLanguage
        ? root.querySelector('[data-ost-lang="' + focusedLanguage + '"]')
        : root.querySelector('#ost-consent-reject');
      window.requestAnimationFrame(function () { if (focusTarget) focusTarget.focus(); });
    } else {
      var returnTarget = root.querySelector('#ost-consent-reopen');
      window.requestAnimationFrame(function () {
        if (consentOpener && consentOpener.isConnected) consentOpener.focus();
        else if (returnTarget) returnTarget.focus();
        consentOpener = null;
      });
    }
  }

  document.addEventListener('keydown', function (event) {
    var dialog = document.getElementById('ost-consent-dialog');
    if (!dialog || !dialog.classList.contains('is-open')) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      writeChoice(false);
      applyChoice(false, currentLang());
      render(currentLang(), false);
      return;
    }

    if (event.key !== 'Tab') return;
    var focusable = Array.prototype.slice.call(dialog.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      .filter(function (element) { return element.getClientRects().length > 0; });
    if (!focusable.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  function init() {
    hydrateAbsoluteUrls();
    var lang = currentLang();
    var choice = readChoice();
    if (choice === true) {
      applyChoice(true, lang);
      render(lang, false);
      return;
    }
    if (choice === false) {
      applyChoice(false, lang);
      render(lang, false);
      return;
    }

    applyChoice(false, lang);
    render(lang, true);
  }

  window.OSTConsent = {
    open: function () {
      render(currentLang(), true);
    },
    getChoice: readChoice,
    storageKey: STORAGE_KEY,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.addEventListener("languageChanged", function (ev) {
    var lang = (ev.detail && ev.detail.lang) || currentLang();
    var dialog = document.getElementById("ost-consent-dialog");
    var open = dialog && dialog.classList.contains("is-open");
    render(lang, !!open);
  });
})();
