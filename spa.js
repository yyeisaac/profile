/**
 * spa.js
 * Lightweight client-side navigation so the WebGL background canvas
 * (and any other body-level state) survives across page transitions.
 * Intercepts clicks on internal links, fetches the target HTML, and
 * swaps only <main> + <title> + body className. Each .html file still
 * works as a standalone document on direct load / refresh.
 */
(function () {
  'use strict';

  var PAGES = new Set([
    'index.html',
    'about.html',
    'professional-background.html',
    'skills.html',
    'projects.html',
    '',
    '/',
  ]);

  function pathOf(href) {
    /* Resolve relative href against current location, then return the
       last path segment (e.g. "about.html") or "" for root. */
    try {
      var u = new URL(href, window.location.href);
      if (u.origin !== window.location.origin) return null;
      var segs = u.pathname.split('/');
      return segs[segs.length - 1] || '';
    } catch (e) {
      return null;
    }
  }

  function isInternalPageLink(a) {
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return false;
    var raw = a.getAttribute('href');
    if (!raw || raw.charAt(0) === '#') return false;
    if (/^(mailto:|tel:|javascript:)/i.test(raw)) return false;
    var p = pathOf(a.href);
    return p !== null && PAGES.has(p);
  }

  var navigating = false;

  function navigate(url, push) {
    if (navigating) return;
    navigating = true;

    fetch(url, { credentials: 'same-origin' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var newMain  = doc.querySelector('main');
        var newTitle = doc.querySelector('title');
        if (!newMain) throw new Error('no <main> in fetched document');

        var oldMain = document.querySelector('main');
        if (oldMain) {
          oldMain.replaceWith(newMain);
        } else {
          document.body.appendChild(newMain);
        }

        if (newTitle) document.title = newTitle.textContent || document.title;
        document.body.className = doc.body.className || '';

        /* Update aria-current on nav links */
        var here = pathOf(url);
        document.querySelectorAll('.site-menu a').forEach(function (a) {
          if (pathOf(a.href) === here) {
            a.setAttribute('aria-current', 'page');
          } else {
            a.removeAttribute('aria-current');
          }
        });

        /* Close mobile menu if open */
        var menu = document.getElementById('site-menu');
        var toggle = document.getElementById('menu-toggle');
        if (menu && menu.classList.contains('open')) {
          menu.classList.remove('open');
          if (toggle) {
            toggle.classList.remove('active');
            toggle.setAttribute('aria-expanded', 'false');
          }
        }

        if (push) {
          window.history.pushState({ spa: true }, '', url);
        }
        window.scrollTo(0, 0);
      })
      .catch(function () {
        /* Fall back to a full navigation if anything goes wrong. */
        window.location.href = url;
      })
      .then(function () { navigating = false; });
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a');
    if (!isInternalPageLink(a)) return;
    e.preventDefault();
    navigate(a.href, true);
  });

  window.addEventListener('popstate', function () {
    navigate(window.location.href, false);
  });
})();
