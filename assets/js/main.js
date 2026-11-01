/**
 * TeddyPups U.A.E. - Client-Side Interactive Controller
 * Pure Vanilla JavaScript (Zero Dependencies)
 * Handles mobile navigation, FAQ accordions & search, puppy catalog filtering,
 * photo gallery sliders, and smooth transitions.
 */

(function () {
  'use strict';

  // Run image sanitizer immediately to intercept early renders
  initImageSanitizer();

  document.addEventListener('DOMContentLoaded', () => {
    initImageSanitizer();
    initMobileMenu();
    initFaqAccordion();
    initPuppiesFilter();
    initPuppyDetailGallery();
    initSmoothCurtainLinks();
  });

  /* ==========================================================================
     0. Static Image Sanitizer (Fixes static hosting image display)
     ========================================================================== */
  function sanitizeImage(img) {
    if (!img) return;
    const currentSrc = img.getAttribute('src');
    if (currentSrc && currentSrc.includes('/_next/image')) {
      const match = currentSrc.match(/[?&]url=([^&]+)/);
      if (match) {
        const decoded = decodeURIComponent(match[1]);
        img.setAttribute('src', decoded);
      }
    }
    const currentSrcset = img.getAttribute('srcset') || img.getAttribute('srcSet');
    if (currentSrcset && currentSrcset.includes('/_next/image')) {
      const cleaned = currentSrcset.replace(/\/_next\/image\?url=([^&\s]+)[^,\s]*/g, function (_, u) {
        return decodeURIComponent(u);
      });
      img.setAttribute('srcset', cleaned);
    }
  }

  function initImageSanitizer() {
    document.querySelectorAll('img').forEach(sanitizeImage);

    if (window.MutationObserver && !window._tpImgObserverActive) {
      window._tpImgObserverActive = true;
      const observer = new MutationObserver(function (mutations) {
        for (let i = 0; i < mutations.length; i++) {
          const m = mutations[i];
          if (m.type === 'childList') {
            for (let j = 0; j < m.addedNodes.length; j++) {
              const node = m.addedNodes[j];
              if (node.nodeType === 1) {
                if (node.tagName === 'IMG') sanitizeImage(node);
                else if (typeof node.querySelectorAll === 'function') {
                  node.querySelectorAll('img').forEach(sanitizeImage);
                }
              }
            }
          } else if (m.type === 'attributes' && m.target.tagName === 'IMG') {
            sanitizeImage(m.target);
          }
        }
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src', 'srcset', 'srcSet']
      });
    }
  }

  /* ==========================================================================
     1. Mobile Navigation Menu
     ========================================================================== */
  function initMobileMenu() {
    const dialog = document.querySelector('dialog');
    if (!dialog) return;

    // Find Open Menu button (often marked with "Menu" or svg hamburger)
    const openBtns = Array.from(document.querySelectorAll('button')).filter(b => {
      const text = b.textContent.trim().toLowerCase();
      return text === 'menu' || b.getAttribute('aria-label') === 'Open menu';
    });

    openBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof dialog.showModal === 'function') {
          dialog.showModal();
        } else {
          dialog.setAttribute('open', '');
        }
        document.body.style.overflow = 'hidden';
      });
    });

    // Close button
    const closeBtns = Array.from(dialog.querySelectorAll('button')).filter(b => {
      return b.textContent.trim().toLowerCase() === 'close' || b.getAttribute('aria-label') === 'Close menu';
    });

    closeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        closeDialog();
      });
    });

    // Close when clicking nav links inside dialog
    dialog.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        closeDialog();
      });
    });

    // Close when clicking outside dialog contents (backdrop)
    dialog.addEventListener('click', (e) => {
      const rect = dialog.getBoundingClientRect();
      const inDialog = (
        rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX && e.clientX <= rect.left + rect.width
      );
      if (!inDialog) {
        closeDialog();
      }
    });

    function closeDialog() {
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
      document.body.style.overflow = '';
    }
  }

  /* ==========================================================================
     2. FAQ Accordion & Search
     ========================================================================== */
  function initFaqAccordion() {
    const notes = Array.from(document.querySelectorAll('.tp-note'));
    if (!notes.length) return;

    notes.forEach(note => {
      const btn = note.querySelector('.tp-note__q button');
      const answer = note.querySelector('.tp-note__answer');
      if (!btn || !answer) return;

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const isOpen = note.hasAttribute('data-unfolded') || btn.getAttribute('aria-expanded') === 'true';

        if (isOpen) {
          note.removeAttribute('data-unfolded');
          btn.setAttribute('aria-expanded', 'false');
          answer.setAttribute('inert', '');
        } else {
          // Open this one
          note.setAttribute('data-unfolded', '');
          btn.setAttribute('aria-expanded', 'true');
          answer.removeAttribute('inert');
        }
      });
    });

    // FAQ Search Box
    const searchInput = document.querySelector('.tp-notes__search input');
    const counterEl = document.querySelector('.tp-notes__count');

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();
        let visibleCount = 0;

        notes.forEach(note => {
          const qText = (note.querySelector('.tp-note__q')?.textContent || '').toLowerCase();
          const aText = (note.querySelector('.tp-note__answer')?.textContent || '').toLowerCase();
          const matches = !query || qText.includes(query) || aText.includes(query);

          if (matches) {
            note.style.display = '';
            visibleCount++;
          } else {
            note.style.display = 'none';
          }
        });

        if (counterEl) {
          counterEl.textContent = `${visibleCount} note${visibleCount === 1 ? '' : 's'} on the board`;
        }
      });
    }
  }

  /* ==========================================================================
     3. Puppies Catalog Filtering
     ========================================================================== */
  function initPuppiesFilter() {
    const cards = Array.from(document.querySelectorAll('.tp-sketches li'));
    if (!cards.length) return;

    // Filter state
    const state = {
      where: null,  // 'imported', 'korean-teacup'
      breed: null,  // 'maltipoo', 'pomeranian', 'poodle', 'cavapoo', 'shih tzu'
      gender: null  // 'boys', 'girls'
    };

    // Find all buttons in the filter box
    const allButtons = Array.from(document.querySelectorAll('button'));
    const filterButtons = allButtons.filter(b => {
      const text = b.textContent.trim().toLowerCase();
      return [
        'everywhere', 'imported', 'korean teacup',
        'maltipoo', 'pomeranian', 'poodle', 'cavapoo', 'shih tzu',
        'boys', 'girls'
      ].includes(text);
    });

    if (!filterButtons.length) return;

    filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const text = btn.textContent.trim().toLowerCase();

        // Categorize button
        if (text === 'everywhere') {
          state.where = null;
        } else if (['imported', 'korean teacup'].includes(text)) {
          state.where = state.where === text ? null : text;
        } else if (['maltipoo', 'pomeranian', 'poodle', 'cavapoo', 'shih tzu'].includes(text)) {
          state.breed = state.breed === text ? null : text;
        } else if (['boys', 'girls'].includes(text)) {
          state.gender = state.gender === text ? null : text;
        }

        applyFilters();
      });
    });

    // Check URL parameters on load (e.g., ?breed=maltipoo or ?origin=imported)
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('breed')) state.breed = params.get('breed').toLowerCase().replace('-', ' ');
      if (params.get('origin')) {
        const orig = params.get('origin').toLowerCase();
        state.where = orig === 'korean' ? 'korean teacup' : orig;
      }
      if (params.get('gender')) state.gender = params.get('gender').toLowerCase();
      applyFilters();
    } catch (e) {}

    function applyFilters() {
      // Update button visual styles
      filterButtons.forEach(btn => {
        const text = btn.textContent.trim().toLowerCase();
        let isActive = false;
        if (text === 'everywhere' && !state.where) isActive = true;
        else if (state.where === text) isActive = true;
        else if (state.breed === text) isActive = true;
        else if (state.gender === text) isActive = true;

        if (isActive) {
          btn.classList.add('bg-cocoa', 'text-milk');
          btn.classList.remove('bg-milk', 'text-cocoa');
          btn.setAttribute('data-active', 'true');
        } else {
          btn.classList.remove('bg-cocoa', 'text-milk');
          btn.classList.add('bg-milk', 'text-cocoa');
          btn.removeAttribute('data-active');
        }
      });

      // Filter cards
      let matchCount = 0;
      cards.forEach(card => {
        const label = (card.querySelector('a')?.getAttribute('aria-label') || card.textContent || '').toLowerCase();
        const href = (card.querySelector('a')?.getAttribute('href') || '').toLowerCase();
        const fullInfo = `${label} ${href}`;

        let matchesWhere = true;
        if (state.where === 'imported') {
          matchesWhere = fullInfo.includes('imported') || !fullInfo.includes('korean');
        } else if (state.where === 'korean teacup') {
          matchesWhere = fullInfo.includes('korean');
        }

        let matchesBreed = true;
        if (state.breed) {
          const b = state.breed.replace('-', ' ');
          matchesBreed = fullInfo.includes(b) || (b === 'shih tzu' && fullInfo.includes('shitzu'));
        }

        let matchesGender = true;
        if (state.gender) {
          const g = state.gender === 'boys' ? 'boy' : 'girl';
          matchesGender = fullInfo.includes(g) || fullInfo.includes(state.gender);
        }

        if (matchesWhere && matchesBreed && matchesGender) {
          card.style.display = '';
          matchCount++;
        } else {
          card.style.display = 'none';
        }
      });

      // Update match count label if present
      const countHeader = Array.from(document.querySelectorAll('h2, h3, p, span')).find(el => 
        /(\d+\s+puppies\s+looking|\d+\s+puppies\s+match)/i.test(el.textContent)
      );
      if (countHeader) {
        countHeader.textContent = `${matchCount} pupp${matchCount === 1 ? 'y' : 'ies'} match`;
      }
    }
  }

  /* ==========================================================================
     4. Puppy Detail Gallery / Photo Slider
     ========================================================================== */
  function initPuppyDetailGallery() {
    const thumbBtns = Array.from(document.querySelectorAll('button[aria-label*="photo"], button[aria-label*="video"]'));
    if (!thumbBtns.length) return;

    const mainImg = document.querySelector('.tp-sketch__wash img, [class*="gallery"] img, main img[sizes]');
    if (!mainImg) return;

    thumbBtns.forEach((btn, idx) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const thumbImg = btn.querySelector('img');
        if (thumbImg) {
          mainImg.src = thumbImg.src;
          if (mainImg.srcset) mainImg.srcset = thumbImg.src;
        }

        thumbBtns.forEach(b => {
          b.setAttribute('aria-current', 'false');
          b.classList.remove('border-cocoa');
        });
        btn.setAttribute('aria-current', 'true');
        btn.classList.add('border-cocoa');
      });
    });

    // Prev / Next arrows
    const arrowBtns = Array.from(document.querySelectorAll('button.grid.size-12'));
    if (arrowBtns.length >= 2) {
      const prevBtn = arrowBtns[0];
      const nextBtn = arrowBtns[1];

      prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const currentIdx = thumbBtns.findIndex(b => b.getAttribute('aria-current') === 'true');
        const prevIdx = (currentIdx - 1 + thumbBtns.length) % thumbBtns.length;
        thumbBtns[prevIdx]?.click();
      });

      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const currentIdx = thumbBtns.findIndex(b => b.getAttribute('aria-current') === 'true');
        const nextIdx = (currentIdx + 1) % thumbBtns.length;
        thumbBtns[nextIdx]?.click();
      });
    }
  }

  /* ==========================================================================
     5. Smooth Transition & Link Enhancements
     ========================================================================== */
  function initSmoothCurtainLinks() {
    const curtain = document.querySelector('.tp-curtain');
    if (!curtain) return;

    document.querySelectorAll('a[href^="/"]').forEach(link => {
      const href = link.getAttribute('href');
      // Skip external, anchors, mailto, tel
      if (!href || href.startsWith('//') || href.includes(':') || href.startsWith('/#')) return;

      link.addEventListener('click', (e) => {
        // Only enhance if local link
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        curtain.setAttribute('data-state', 'covered');
      });
    });
  }
})();

