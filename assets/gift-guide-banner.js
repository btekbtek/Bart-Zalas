/**
 * Gift Guide Banner – button hover animations & mobile menu toggle.
 * Vanilla JS only.
 */
(function () {
  'use strict';

  /**
   * Enhances CTA buttons with a subtle press animation on click.
   * @param {HTMLElement} section
   */
  function initButtonAnimations(section) {
    var buttons = section.querySelectorAll('.gift-guide-banner__btn');

    buttons.forEach(function (button) {
      button.addEventListener('mousedown', function () {
        button.style.transform = 'scale(0.97) translateY(0)';
      });

      button.addEventListener('mouseup', function () {
        button.style.transform = '';
      });

      button.addEventListener('mouseleave', function () {
        button.style.transform = '';
      });
    });
  }

  /**
   * Toggles the mobile hamburger menu icon state.
   * @param {HTMLElement} section
   */
  function initMobileMenu(section) {
    var menuBtn = section.querySelector('[data-gift-guide-menu]');
    if (!menuBtn) return;

    menuBtn.addEventListener('click', function () {
      var isOpen = menuBtn.classList.toggle('is-open');
      menuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  function init() {
    document.querySelectorAll('[data-gift-guide-banner]').forEach(function (section) {
      initButtonAnimations(section);
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
