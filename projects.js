/**
 * projects.js
 * Adds the interactive flourishes for the Projects page:
 *   - Staggered reveal of project cards on scroll into view
 *   - Pointer-tracked glow that follows the cursor over each card
 *   - Subtle magnetic tilt on hover
 *
 * Re-runs when the SPA shell swaps a new <main> into place by watching
 * the DOM for the .projects-grid root being inserted.
 */
(function () {
  'use strict';

  function initCard(card) {
    if (card.dataset.initialised === '1') return;
    card.dataset.initialised = '1';

    /* Pointer-tracked glow: write the cursor coords into CSS vars so the
       ::after gradient can position itself. */
    card.addEventListener('pointermove', function (e) {
      var rect = card.getBoundingClientRect();
      var x = ((e.clientX - rect.left) / rect.width) * 100;
      var y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--mx', x + '%');
      card.style.setProperty('--my', y + '%');

      /* Magnetic tilt — clamp to a gentle ±4° */
      var nx = (e.clientX - rect.left) / rect.width - 0.5;
      var ny = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.setProperty('--rx', (ny * -4).toFixed(2) + 'deg');
      card.style.setProperty('--ry', (nx * 4).toFixed(2) + 'deg');
    });

    card.addEventListener('pointerleave', function () {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  }

  function reveal(grid) {
    var cards = grid.querySelectorAll('.project-card');
    if (!('IntersectionObserver' in window)) {
      cards.forEach(function (c) { c.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    cards.forEach(function (c) { io.observe(c); });
  }

  function initCompetition(card) {
    if (!card || card.dataset.initialised === '1') return;
    card.dataset.initialised = '1';

    card.addEventListener('pointermove', function (e) {
      var rect = card.getBoundingClientRect();
      var x = ((e.clientX - rect.left) / rect.width) * 100;
      var y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--mx', x + '%');
      card.style.setProperty('--my', y + '%');
    });
  }

  function init() {
    var grid = document.querySelector('.projects-grid');
    if (grid) {
      grid.querySelectorAll('.project-card').forEach(initCard);
      reveal(grid);
    }
    initCompetition(document.querySelector('.competition-card-v2'));
  }

  /* Initial run */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* Re-run after SPA navigation — watch <body> for a new .projects-grid */
  if ('MutationObserver' in window) {
    var mo = new MutationObserver(function () {
      if (document.querySelector('.projects-grid:not([data-init])')) {
        var g = document.querySelector('.projects-grid');
        if (g) g.setAttribute('data-init', '1');
        init();
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }
})();
