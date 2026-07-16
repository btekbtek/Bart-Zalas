/**
 * Gift Guide Banner – mobile menu toggle.
 * Button hover color swaps are handled in CSS (300ms ease-out).
 * Vanilla JS only.
 */
(function () {
  'use strict';

  /**
   * Toggles the mobile hamburger / close icon state.
   * @param {HTMLElement} section
   */
  function initMobileMenu(section) {
    var menuBtn = section.querySelector('[data-gift-guide-menu]');
    if (!menuBtn) return;

    menuBtn.addEventListener('click', function () {
      var isOpen = menuBtn.classList.toggle('is-open');
      section.classList.toggle('is-menu-open', isOpen);
      menuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      menuBtn.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    });
  }

  function init() {
    document.querySelectorAll('[data-gift-guide-banner]').forEach(function (section) {
      initMobileMenu(section);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', function (event) {
    if (event.target.querySelector('[data-gift-guide-banner]')) {
      init();
    }
  });
})();
