
(function () {
  'use strict';

  var STORAGE_KEY = 'ost_consent_given';
  var CONSENT_VERSION = '2026-10-07-v1';
  var adsScriptPromise = null;

  var COPY = {
    en: {
      title: 'Cookies & ads',
      body: 'OpenStackTools processes your files only in this browser. To keep the tools free, we can show Google AdSense ads after you opt in. Ads use third-party cookies. Your files are never uploaded.',
      accept: 'Accept ads',
      reject: 'Reject ads',
      privacy: 'Privacy',
      cookies: 'Cookies',
      gdpr: 'GDPR / KVKK',
      settings: 'Cookie settings',
      langEn: 'EN',
      langTr: 'TR',
      adsOff: 'Ads off — tools still run locally'
    },
    tr: {
      title: 'Çerezler ve reklamlar',
      body: 'OpenStackTools dosyalarınızı yalnızca bu tarayıcıda işler. Araçları ücretsiz tutmak için, onayınızdan sonra Google AdSense reklamları gösterebiliriz. Reklamlar üçüncü taraf çerez kullanır. Dosyalarınız asla yüklenmez.',
      accept: 'Reklamları kabul et',
      reject: 'Reklamları reddet',
      privacy: 'Gizlilik',
      cookies: 'Çerezler',
      gdpr: 'GDPR / KVKK',
      settings: 'Çerez ayarları',
      langEn: 'EN',
      langTr: 'TR',
      adsOff: 'Reklamlar kapalı — araçlar yerelde çalışır'
    }
  };

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

  window.gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    wait_for_update: 500
  });

  function currentLang() {
    try {
      var params = new URLSearchParams(window.location.search);
      var q = params.get('lang');
      if (q === 'en' || q === 'tr') return q;
      var stored = localStorage.getItem('ost_lang');
      if (stored === 'en' || stored === 'tr') return stored;
    } catch (e) {}
    var nav = (navigator.language || 'en').toLowerCase();
    return nav.indexOf('tr') === 0 ? 'tr' : 'en';
  }

  function readChoice() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      if (!v) return null;
      var consent = JSON.parse(v);
      if (consent.version !== CONSENT_VERSION || typeof consent.granted !== 'boolean') return null;
      return consent.granted;
    } catch (e) {  }
    return null;
  }

  function writeChoice(granted) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: CONSENT_VERSION,
        timestamp: new Date().toISOString(),
        granted: granted,
        purposes: { advertising: granted }
      }));
    } catch (e) {  }
  }

  function updateConsentMode(granted) {
    window.gtag('consent', 'update', {
      ad_storage: granted ? 'granted' : 'denied',
      ad_user_data: granted ? 'granted' : 'denied',
      ad_personalization: granted ? 'granted' : 'denied',
      analytics_storage: 'denied'
    });
  }

  function hydrateAbsoluteUrls() {
    var origin = window.location.origin;
    var path = window.location.pathname;
    if (!path.endsWith('/') && path.indexOf('.') === -1) path += '/';

    function abs(href) {
      if (!href) return origin + path;
      if (/^https?:\/\//i.test(href)) return href;
      if (href.charAt(0) === '/') return origin + href;
      return origin + path + href;
    }

    var canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', abs(canonical.getAttribute('href') || path));

    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(function (el) {
      var hl = el.getAttribute('hreflang');
      var base = origin + path;
      if (hl === 'x-default') el.setAttribute('href', base);
      else el.setAttribute('href', base + (base.indexOf('?') >= 0 ? '&' : '?') + 'lang=' + encodeURIComponent(hl));
    });

    var og = document.querySelector('meta[property="og:url"]');
    if (og) og.setAttribute('content', abs(og.getAttribute('content') || path));
  }

  function loadAdSense() {
    var client = '__ADSENSE_PUBLISHER_ID__';
    if (typeof client !== 'string' || !/^ca-pub-\d+$/.test(client)) {
      console.error('AdSense is disabled: a valid deployment-provided publisher ID is required.');
      return;
    }

    document.querySelectorAll('.adsense-slot[data-ad-slot]').forEach(function (container) {
      var slotId = container.getAttribute('data-ad-slot');
      if (!/^\d+$/.test(slotId || '')) {
        console.error('AdSense slot is disabled: invalid data-ad-slot value.', container);
        return;
      }
      if (container.querySelector('ins.adsbygoogle')) return;

      var ad = document.createElement('ins');
      ad.className = 'adsbygoogle';
      ad.style.display = 'block';
      ad.setAttribute('data-ad-client', client);
      ad.setAttribute('data-ad-slot', slotId);
      ad.setAttribute('data-ad-format', 'auto');
      ad.setAttribute('data-full-width-responsive', 'true');
      container.appendChild(ad);
    });

    if (!adsScriptPromise) {
      adsScriptPromise = new Promise(function (resolve, reject) {
        var script = document.createElement('script');
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' +
          encodeURIComponent(client);
        script.onload = resolve;
        script.onerror = function () {
          script.remove();
          reject(new Error('The AdSense script failed to load.'));
        };
        document.head.appendChild(script);
      }).catch(function (error) {
        adsScriptPromise = null;
        console.error(error);
        throw error;
      });
    }

    adsScriptPromise.then(function () {
      if (readChoice() !== true) return;
      document.querySelectorAll('ins.adsbygoogle:not([data-ost-pushed])').forEach(function (slot) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        slot.setAttribute('data-ost-pushed', 'true');
      });
    }).catch(function (error) {
      console.error('AdSense initialization failed.', error);
    });

    document.querySelectorAll('.adsense-slot').forEach(function (el) {
      el.classList.remove('is-consent-blocked');
    });
  }

  function markSlotsBlocked(lang) {
    var t = COPY[lang] || COPY.en;
    document.querySelectorAll('.adsense-slot ins.adsbygoogle').forEach(function (slot) {
      slot.remove();
    });
    document.querySelectorAll('.adsense-slot').forEach(function (el) {
      el.classList.add('is-consent-blocked');
      if (!el.querySelector('.ost-ads-paused')) {
        var n = document.createElement('div');
        n.className = 'ost-ads-paused text-[10px] font-mono uppercase tracking-widest text-zinc-500 px-3 py-6 text-center';
        n.textContent = t.adsOff;
        el.appendChild(n);
      }
    });
  }

  function applyChoice(granted, lang) {
    updateConsentMode(granted);
    if (granted) {
      document.querySelectorAll('.ost-ads-paused').forEach(function (n) { n.remove(); });
      document.querySelectorAll('.adsense-slot').forEach(function (el) {
        el.classList.remove('is-consent-blocked');
      });
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
    var root = document.getElementById('ost-consent-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'ost-consent-root';
      document.body.appendChild(root);
    }

    root.innerHTML =
      '<button type="button" id="ost-consent-reopen" class="ost-consent-reopen" aria-haspopup="dialog">' +
        dict.settings +
      '</button>' +
      '<div id="ost-consent-dialog" class="ost-consent-dialog' + (showDialog ? ' is-open' : '') + '" role="dialog" aria-modal="true" aria-labelledby="ost-consent-title">' +
        '<div class="ost-consent-card">' +
          '<div class="ost-consent-head">' +
            '<h2 id="ost-consent-title">' + dict.title + '</h2>' +
            '<div class="ost-consent-langs" role="group" aria-label="Language">' +
              '<button type="button" data-ost-lang="en"' + (lang === 'en' ? ' aria-pressed="true"' : ' aria-pressed="false"') + '>' + dict.langEn + '</button>' +
              '<button type="button" data-ost-lang="tr"' + (lang === 'tr' ? ' aria-pressed="true"' : ' aria-pressed="false"') + '>' + dict.langTr + '</button>' +
            '</div>' +
          '</div>' +
          '<p>' + dict.body + '</p>' +
          '<div class="ost-consent-links">' +
            '<a href="/privacy-policy/">' + dict.privacy + '</a>' +
            '<a href="/cookie-policy/">' + dict.cookies + '</a>' +
            '<a href="/gdpr-kvkk/">' + dict.gdpr + '</a>' +
          '</div>' +
          '<div class="ost-consent-actions">' +
            '<button type="button" id="ost-consent-reject" class="ost-btn-ghost">' + dict.reject + '</button>' +
            '<button type="button" id="ost-consent-accept" class="ost-btn-solid">' + dict.accept + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';

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
  }

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
    open: function () { render(currentLang(), true); },
    getChoice: readChoice,
    storageKey: STORAGE_KEY
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('languageChanged', function (ev) {
    var lang = (ev.detail && ev.detail.lang) || currentLang();
    var dialog = document.getElementById('ost-consent-dialog');
    var open = dialog && dialog.classList.contains('is-open');
    render(lang, !!open);
  });
})();
