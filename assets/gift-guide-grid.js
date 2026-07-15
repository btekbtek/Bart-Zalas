/**
 * Gift Guide Grid – product popup, dynamic variants, and add to cart.
 * Vanilla JS only.
 */
(function () {
  'use strict';

  var COLOR_KEYWORDS = ['color', 'colour'];
  var SIZE_KEYWORDS = ['size'];

  /**
   * @param {string} name
   * @returns {boolean}
   */
  function isColorOption(name) {
    return COLOR_KEYWORDS.indexOf(name.toLowerCase()) !== -1;
  }

  /**
   * @param {string} name
   * @returns {boolean}
   */
  function isSizeOption(name) {
    return SIZE_KEYWORDS.indexOf(name.toLowerCase()) !== -1;
  }

  /**
   * @param {object} product
   * @returns {{ colorIndex: number, sizeIndex: number, colorOption: object|null, sizeOption: object|null }}
   */
  function resolveOptionIndexes(product) {
    var colorIndex = -1;
    var sizeIndex = -1;
    var colorOption = null;
    var sizeOption = null;

    product.options.forEach(function (option, index) {
      if (isColorOption(option.name)) {
        colorIndex = index;
        colorOption = option;
      } else if (isSizeOption(option.name)) {
        sizeIndex = index;
        sizeOption = option;
      }
    });

    // Fallback: first option = color, second = size when labels differ
    if (colorIndex === -1 && product.options.length > 0) {
      colorIndex = 0;
      colorOption = product.options[0];
    }
    if (sizeIndex === -1 && product.options.length > 1) {
      sizeIndex = 1;
      sizeOption = product.options[1];
    }

    return { colorIndex: colorIndex, sizeIndex: sizeIndex, colorOption: colorOption, sizeOption: sizeOption };
  }

  /**
   * @param {object} variant
   * @param {number} colorIndex
   * @param {number} sizeIndex
   * @returns {{ color: string, size: string }}
   */
  function getVariantSelections(variant, colorIndex, sizeIndex) {
    var options = [variant.option1, variant.option2, variant.option3];
    return {
      color: colorIndex >= 0 ? options[colorIndex] || '' : '',
      size: sizeIndex >= 0 ? options[sizeIndex] || '' : '',
    };
  }

  /**
   * @param {object[]} variants
   * @param {number} colorIndex
   * @param {number} sizeIndex
   * @param {string} color
   * @param {string} [size]
   * @returns {object|null}
   */
  function findVariant(variants, colorIndex, sizeIndex, color, size) {
    return (
      variants.find(function (variant) {
        var selections = getVariantSelections(variant, colorIndex, sizeIndex);
        var colorMatch = !color || selections.color === color;
        var sizeMatch = !size || selections.size === size;
        return colorMatch && sizeMatch && variant.available;
      }) ||
      variants.find(function (variant) {
        var selections = getVariantSelections(variant, colorIndex, sizeIndex);
        var colorMatch = !color || selections.color === color;
        var sizeMatch = !size || selections.size === size;
        return colorMatch && sizeMatch;
      }) ||
      null
    );
  }

  /**
   * @param {number} variantId
   * @param {number} [quantity]
   * @returns {Promise<object>}
   */
  function addVariantToCart(variantId, quantity) {
    return fetch(window.routes.cart_add_url + '.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        items: [{ id: variantId, quantity: quantity || 1 }],
      }),
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok) {
          throw new Error(data.description || data.message || 'Could not add to cart');
        }
        return data;
      });
    });
  }

  /**
   * @param {HTMLElement} section
   */
  function GiftGuideGrid(section) {
    this.section = section;
    this.overlay = section.querySelector('[data-gift-guide-overlay]');
    this.popup = section.querySelector('[data-gift-guide-popup]');
    this.closeBtn = section.querySelector('[data-gift-guide-close]');
    this.titleEl = section.querySelector('[data-gift-guide-product-title]');
    this.priceEl = section.querySelector('[data-gift-guide-product-price]');
    this.descriptionEl = section.querySelector('[data-gift-guide-product-description]');
    this.thumbEl = section.querySelector('[data-gift-guide-product-thumb]');
    this.colorGroup = section.querySelector('[data-gift-guide-color-group]');
    this.colorOptionsEl = section.querySelector('[data-gift-guide-color-options]');
    this.sizeGroup = section.querySelector('[data-gift-guide-size-group]');
    this.sizeDropdown = section.querySelector('[data-gift-guide-size-dropdown]');
    this.sizeTrigger = section.querySelector('[data-gift-guide-size-trigger]');
    this.sizeLabel = section.querySelector('[data-gift-guide-size-label]');
    this.sizeList = section.querySelector('[data-gift-guide-size-list]');
    this.addBtn = section.querySelector('[data-gift-guide-add-btn]');
    this.messageEl = section.querySelector('[data-gift-guide-message]');

    this.product = null;
    this.activeHotspot = null;
    this.optionIndexes = null;
    this.selectedColor = '';
    this.selectedSize = '';

    this.bonusProduct = null;
    var bonusJsonEl = section.querySelector('[data-bonus-product-json]');
    if (bonusJsonEl) {
      try {
        this.bonusProduct = JSON.parse(bonusJsonEl.textContent);
        bonusJsonEl.remove();
      } catch (error) {
        this.bonusProduct = null;
      }
    }

    this.bindEvents();
  }

  GiftGuideGrid.prototype.bindEvents = function () {
    var self = this;

    this.section.querySelectorAll('[data-gift-guide-hotspot]').forEach(function (hotspot) {
      hotspot.addEventListener('click', function () {
        var item = hotspot.closest('[data-gift-guide-item]');
        if (!item) return;

        var productData = item.getAttribute('data-product');
        if (!productData) return;

        try {
          self.openPopup(JSON.parse(productData), hotspot);
        } catch (error) {
          console.error('Invalid product data', error);
        }
      });
    });

    this.closeBtn.addEventListener('click', function () {
      self.closePopup();
    });

    this.overlay.addEventListener('click', function (event) {
      if (event.target === self.overlay) {
        self.closePopup();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && self.overlay.classList.contains('is-open')) {
        self.closePopup();
      }
    });

    this.addBtn.addEventListener('click', function () {
      self.handleAddToCart();
    });

    if (this.sizeTrigger) {
      this.sizeTrigger.addEventListener('click', function (event) {
        event.stopPropagation();
        self.toggleSizeDropdown();
      });
    }

    document.addEventListener('click', function (event) {
      if (!self.sizeDropdown || !self.sizeDropdown.classList.contains('is-open')) return;
      if (!self.sizeDropdown.contains(event.target)) {
        self.closeSizeDropdown();
      }
    });
  };

  GiftGuideGrid.prototype.toggleSizeDropdown = function () {
    if (!this.sizeDropdown) return;
    if (this.sizeDropdown.classList.contains('is-open')) {
      this.closeSizeDropdown();
    } else {
      this.openSizeDropdown();
    }
  };

  GiftGuideGrid.prototype.openSizeDropdown = function () {
    if (!this.sizeDropdown) return;
    this.sizeDropdown.classList.add('is-open');
    if (this.popup) this.popup.classList.add('is-size-open');
    this.sizeList.hidden = false;
    this.sizeTrigger.setAttribute('aria-expanded', 'true');
  };

  GiftGuideGrid.prototype.closeSizeDropdown = function () {
    if (!this.sizeDropdown) return;
    this.sizeDropdown.classList.remove('is-open');
    if (this.popup) this.popup.classList.remove('is-size-open');
    this.sizeList.hidden = true;
    this.sizeTrigger.setAttribute('aria-expanded', 'false');
  };

  /**
   * @param {object} product
   * @param {HTMLElement} [hotspot]
   */
  GiftGuideGrid.prototype.openPopup = function (product, hotspot) {
    this.product = product;
    this.optionIndexes = resolveOptionIndexes(product);
    this.selectedColor = '';
    this.selectedSize = '';
    this.closeSizeDropdown();
    this.clearMessage();
    this.setActiveHotspot(hotspot || null);

    this.titleEl.textContent = product.title;
    this.priceEl.textContent = product.price_formatted || '';
    this.descriptionEl.textContent = product.description || '';

    if (product.featured_image) {
      this.thumbEl.src = product.featured_image;
      this.thumbEl.alt = product.title;
      this.thumbEl.hidden = false;
    } else {
      this.thumbEl.hidden = true;
    }

    this.renderColorOptions();
    this.renderSizeOptions();
    this.updateAddButton();

    this.overlay.classList.add('is-open');
    this.overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  GiftGuideGrid.prototype.closePopup = function () {
    this.closeSizeDropdown();
    this.clearActiveHotspot();
    this.overlay.classList.remove('is-open');
    this.overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    this.product = null;
    this.clearMessage();
  };

  GiftGuideGrid.prototype.setActiveHotspot = function (hotspot) {
    this.clearActiveHotspot();
    if (!hotspot) return;
    this.activeHotspot = hotspot;
    this.activeHotspot.classList.add('is-active');
    this.activeHotspot.textContent = '−';
    this.activeHotspot.setAttribute('aria-expanded', 'true');
  };

  GiftGuideGrid.prototype.clearActiveHotspot = function () {
    if (!this.activeHotspot) return;
    this.activeHotspot.classList.remove('is-active');
    this.activeHotspot.textContent = '+';
    this.activeHotspot.setAttribute('aria-expanded', 'false');
    this.activeHotspot = null;
  };

  GiftGuideGrid.prototype.renderColorOptions = function () {
    var self = this;
    var colorOption = this.optionIndexes.colorOption;

    if (!colorOption || colorOption.values.length === 0) {
      this.colorGroup.hidden = true;
      return;
    }

    this.colorGroup.hidden = false;
    this.colorOptionsEl.innerHTML = '';

    colorOption.values.forEach(function (value, index) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'gift-guide-grid__color-btn';
      button.setAttribute('data-color-value', value);
      button.style.setProperty('--swatch-color', self.resolveSwatchColor(value));

      var chip = document.createElement('span');
      chip.className = 'gift-guide-grid__swatch-chip';
      chip.setAttribute('aria-hidden', 'true');
      chip.style.backgroundColor = self.resolveSwatchColor(value);

      var name = document.createElement('span');
      name.className = 'gift-guide-grid__swatch-name';
      name.textContent = value;

      button.appendChild(chip);
      button.appendChild(name);

      if (index === 0) {
        button.classList.add('is-selected');
        button.setAttribute('aria-pressed', 'true');
        self.selectedColor = value;
      } else {
        button.setAttribute('aria-pressed', 'false');
      }

      button.addEventListener('click', function () {
        self.colorOptionsEl.querySelectorAll('.gift-guide-grid__color-btn').forEach(function (btn) {
          btn.classList.remove('is-selected');
          btn.setAttribute('aria-pressed', 'false');
        });
        button.classList.add('is-selected');
        button.setAttribute('aria-pressed', 'true');
        self.selectedColor = value;
        self.renderSizeOptions();
        self.updateAddButton();
      });

      self.colorOptionsEl.appendChild(button);
    });
  };

  /**
   * Maps variant color names to a CSS color for the selected swatch strip.
   * @param {string} name
   * @returns {string}
   */
  GiftGuideGrid.prototype.resolveSwatchColor = function (name) {
    var key = String(name || '').toLowerCase().trim();
    var map = {
      blue: '#2563eb',
      black: '#000000',
      white: '#f3f3f3',
      red: '#b91c1c',
      green: '#15803d',
      navy: '#1e3a8a',
      grey: '#9ca3af',
      gray: '#9ca3af',
    };

    return map[key] || '#9ca3af';
  };

  GiftGuideGrid.prototype.renderSizeOptions = function () {
    var self = this;
    var sizeOption = this.optionIndexes.sizeOption;

    if (!sizeOption || sizeOption.values.length === 0) {
      this.sizeGroup.hidden = true;
      this.selectedSize = '';
      this.closeSizeDropdown();
      return;
    }

    this.sizeGroup.hidden = false;
    this.selectedSize = '';
    this.sizeLabel.textContent = 'Choose your size';
    this.sizeList.innerHTML = '';
    this.closeSizeDropdown();

    var availableSizes = sizeOption.values.filter(function (size) {
      return findVariant(
        self.product.variants,
        self.optionIndexes.colorIndex,
        self.optionIndexes.sizeIndex,
        self.selectedColor,
        size
      );
    });

    availableSizes.forEach(function (size) {
      var item = document.createElement('li');
      item.setAttribute('role', 'none');

      var optionBtn = document.createElement('button');
      optionBtn.type = 'button';
      optionBtn.className = 'gift-guide-grid__size-option';
      optionBtn.setAttribute('role', 'option');
      optionBtn.setAttribute('data-size-value', size);
      optionBtn.textContent = size;

      optionBtn.addEventListener('click', function (event) {
        event.stopPropagation();
        self.selectSize(size);
      });

      item.appendChild(optionBtn);
      self.sizeList.appendChild(item);
    });
  };

  /**
   * @param {string} size
   */
  GiftGuideGrid.prototype.selectSize = function (size) {
    var self = this;
    this.selectedSize = size;
    this.sizeLabel.textContent = size;

    this.sizeList.querySelectorAll('.gift-guide-grid__size-option').forEach(function (btn) {
      var isMatch = btn.getAttribute('data-size-value') === size;
      btn.classList.toggle('is-selected', isMatch);
      btn.setAttribute('aria-selected', isMatch ? 'true' : 'false');
    });

    this.closeSizeDropdown();
    this.updateAddButton();
    this.clearMessage();
  };

  GiftGuideGrid.prototype.getSelectedVariant = function () {
    if (!this.product) return null;

    if (this.product.variants.length === 1) {
      return this.product.variants[0];
    }

    return findVariant(
      this.product.variants,
      this.optionIndexes.colorIndex,
      this.optionIndexes.sizeIndex,
      this.selectedColor,
      this.selectedSize
    );
  };

  GiftGuideGrid.prototype.updatePrice = function () {
    var variant = this.getSelectedVariant();
    if (variant && variant.price_formatted) {
      this.priceEl.textContent = variant.price_formatted;
    } else if (this.product && this.product.price_formatted) {
      this.priceEl.textContent = this.product.price_formatted;
    }
  };

  GiftGuideGrid.prototype.updateAddButton = function () {
    var variant = this.getSelectedVariant();
    var needsSize = this.optionIndexes.sizeOption && this.optionIndexes.sizeOption.values.length > 0;

    this.updatePrice();

    if (needsSize && !this.selectedSize) {
      this.addBtn.disabled = true;
      return;
    }

    if (!variant) {
      this.addBtn.disabled = true;
      return;
    }

    this.addBtn.disabled = !variant.available;
    this.addBtn.querySelector('[data-gift-guide-add-label]').textContent = variant.available
      ? 'ADD TO CART'
      : 'SOLD OUT';
  };

  GiftGuideGrid.prototype.clearMessage = function () {
    this.messageEl.textContent = '';
    this.messageEl.className = 'gift-guide-grid__message';
  };

  GiftGuideGrid.prototype.showMessage = function (text, type) {
    this.messageEl.textContent = text;
    this.messageEl.className = 'gift-guide-grid__message gift-guide-grid__message--' + type;
  };

  /**
   * Adds Soft Winter Jacket when Black + Medium is selected.
   * @param {string} color
   * @param {string} size
   * @returns {Promise<void>}
   */
  GiftGuideGrid.prototype.maybeAddBonusProduct = function (color, size) {
    if (!this.bonusProduct || !this.bonusProduct.variants) {
      return Promise.resolve();
    }

    var isBlack = color && color.toLowerCase() === 'black';
    var isMedium = size && size.toLowerCase() === 'medium';

    if (!isBlack || !isMedium) {
      return Promise.resolve();
    }

    var bonusVariant =
      this.bonusProduct.variants.find(function (variant) {
        return variant.available;
      }) || this.bonusProduct.variants[0];

    if (!bonusVariant) {
      return Promise.resolve();
    }

    return addVariantToCart(bonusVariant.id, 1);
  };

  GiftGuideGrid.prototype.handleAddToCart = function () {
    var self = this;
    var variant = this.getSelectedVariant();

    if (!variant) {
      this.showMessage('Please select all options.', 'error');
      return;
    }

    this.addBtn.disabled = true;
    this.clearMessage();

    addVariantToCart(variant.id, 1)
      .then(function () {
        return self.maybeAddBonusProduct(self.selectedColor, self.selectedSize);
      })
      .then(function () {
        self.showMessage('Added to cart!', 'success');
        self.addBtn.disabled = false;
      })
      .catch(function (error) {
        self.showMessage(error.message || 'Could not add to cart.', 'error');
        self.updateAddButton();
      });
  };

  function init() {
    document.querySelectorAll('[data-gift-guide-grid]').forEach(function (section) {
      if (section.dataset.giftGuideGridInit === 'true') return;
      section.dataset.giftGuideGridInit = 'true';
      new GiftGuideGrid(section);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', function (event) {
    if (event.target.querySelector('[data-gift-guide-grid]')) {
      init();
    }
  });
})();
