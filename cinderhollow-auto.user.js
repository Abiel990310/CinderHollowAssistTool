// ==UserScript==
// @name         Cinderhollow Studio Auto Loader
// @namespace    https://github.com/Abiel990310/CinderHollowAssistTool
// @version      1.0.0
// @description  Load the latest Cinderhollow Studio automatically on the game page.
// @match        https://p4zox.github.io/cinderhollow
// @match        https://p4zox.github.io/cinderhollow/*
// @run-at       document-idle
// @noframes
// @grant        none
// @inject-into  auto
// @downloadURL  https://raw.githubusercontent.com/Abiel990310/CinderHollowAssistTool/main/cinderhollow-auto.user.js
// @updateURL    https://raw.githubusercontent.com/Abiel990310/CinderHollowAssistTool/main/cinderhollow-auto.user.js
// ==/UserScript==

(() => {
  'use strict';
  if (window.__CINDERHOLLOW_STUDIO_AUTO_LOADING__) return;
  window.__CINDERHOLLOW_STUDIO_AUTO_LOADING__ = true;

  const url = 'https://raw.githubusercontent.com/Abiel990310/CinderHollowAssistTool/main/cinderhollow-op-loader.js';
  fetch(url + '?t=' + Date.now(), { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error('GitHub returned ' + response.status);
      return response.text();
    })
    .then(code => (0, eval)(code))
    .catch(error => {
      window.__CINDERHOLLOW_STUDIO_AUTO_LOADING__ = false;
      console.error('[Cinderhollow Studio auto loader]', error);
      const badge = document.createElement('div');
      badge.textContent = 'Cinderhollow Studio did not load: ' + error.message;
      badge.style.cssText = 'position:fixed;right:12px;top:12px;z-index:2147483647;max-width:340px;padding:10px 12px;border:1px solid #9b5151;border-radius:6px;background:#201317;color:#f0c7c7;font:12px sans-serif';
      document.body.appendChild(badge);
    });
})();
