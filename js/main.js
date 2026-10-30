/**
 * My Gallery — progressive enhancements.
 * The page is fully usable without JavaScript; this file adds:
 *   - header scroll state + scroll-spy for the active nav link
 *   - accessible mobile navigation
 *   - viewport-triggered reveal animations
 *   - a keyboard/touch friendly lightbox built on <dialog>
 */
(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------------------------------------------------------------------
     Header scroll state & scroll-spy (single rAF-throttled scroll handler)
     --------------------------------------------------------------------- */
  function initScrollState() {
    const header = document.querySelector('[data-header]');
    const sections = [...document.querySelectorAll('[data-section]')];
    const links = new Map(
      [...document.querySelectorAll('.nav__link')].map((link) => [link.hash.slice(1), link])
    );
    let ticking = false;
    let activeId = null;

    const setActive = (id) => {
      if (id === activeId) return;
      activeId = id;
      links.forEach((link, linkId) => {
        if (linkId === id) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    };

    const update = () => {
      ticking = false;
      header.classList.toggle('is-scrolled', window.scrollY > 24);

      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom) {
        setActive(sections[sections.length - 1].id);
        return;
      }

      const probe = window.innerHeight * 0.4;
      let current = sections[0];
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= probe) current = section;
      }
      setActive(current.id);
    };

    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    update();
  }

  /* ---------------------------------------------------------------------
     Mobile navigation
     --------------------------------------------------------------------- */
  function initNav() {
    const header = document.querySelector('[data-header]');
    const toggle = document.querySelector('[data-nav-toggle]');
    const menu = document.querySelector('[data-nav-menu]');
    const label = toggle.querySelector('.visually-hidden');
    const desktop = window.matchMedia('(min-width: 48em)');

    const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      label.textContent = open ? 'Close menu' : 'Open menu';
      menu.classList.toggle('is-open', open);
      header.classList.toggle('is-open', open);
    };

    toggle.addEventListener('click', () => setOpen(!isOpen()));

    menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen()) {
        setOpen(false);
        toggle.focus();
      }
    });

    document.addEventListener('click', (event) => {
      if (isOpen() && !header.contains(event.target)) setOpen(false);
    });

    desktop.addEventListener('change', (event) => {
      if (event.matches) setOpen(false);
    });
  }

  /* ---------------------------------------------------------------------
     Reveal on scroll — elements entering together are staggered
     --------------------------------------------------------------------- */
  function initReveal() {
    const items = document.querySelectorAll('[data-reveal]');

    // Hand the element back to its own transitions once revealed
    const finish = (el) => {
      el.removeAttribute('data-reveal');
      el.classList.remove('is-visible');
      el.style.removeProperty('--reveal-delay');
    };

    const show = (el, delay) => {
      el.style.setProperty('--reveal-delay', `${delay}ms`);
      el.addEventListener('transitionend', () => finish(el), { once: true });
      el.classList.add('is-visible');
    };

    if (!('IntersectionObserver' in window) || reducedMotion.matches) {
      items.forEach(finish);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries
          .filter((entry) => entry.isIntersecting)
          .forEach((entry, index) => {
            observer.unobserve(entry.target);
            show(entry.target, Math.min(index * 90, 450));
          });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );

    items.forEach((el) => observer.observe(el));
  }

  /* ---------------------------------------------------------------------
     Lightbox
     --------------------------------------------------------------------- */
  function initLightbox() {
    const dialog = document.querySelector('[data-lightbox-dialog]');
    const triggers = [...document.querySelectorAll('[data-lightbox]')];
    if (!dialog || typeof dialog.showModal !== 'function' || triggers.length === 0) return;

    const media = dialog.querySelector('[data-lightbox-media]');
    const title = dialog.querySelector('[data-lightbox-title]');
    const counter = dialog.querySelector('[data-lightbox-counter]');
    const inner = dialog.querySelector('.lightbox__inner');
    const LIGHTBOX_SIZES = '(min-width: 72rem) 1125px, 100vw';
    let current = 0;
    let lastTrigger = null;

    const render = (index, animate) => {
      current = (index + triggers.length) % triggers.length;
      const trigger = triggers[current];
      const picture = trigger.querySelector('picture').cloneNode(true);

      picture.querySelectorAll('source').forEach((source) => {
        source.sizes = LIGHTBOX_SIZES;
      });
      const img = picture.querySelector('img');
      img.sizes = LIGHTBOX_SIZES;
      img.loading = 'eager';
      img.removeAttribute('class');

      media.replaceChildren(picture);
      title.textContent = trigger.dataset.title || img.alt;
      counter.textContent = `${current + 1} / ${triggers.length}`;

      if (animate && !reducedMotion.matches) {
        media.classList.remove('is-changing');
        void media.offsetWidth; // restart the animation
        media.classList.add('is-changing');
      }
    };

    triggers.forEach((trigger, index) => {
      trigger.addEventListener('click', (event) => {
        // Let modified clicks (new tab/window) behave natively
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        lastTrigger = trigger;
        render(index, false);
        dialog.showModal();
      });
    });

    dialog.querySelector('[data-lightbox-close]').addEventListener('click', () => dialog.close());
    dialog.querySelector('[data-lightbox-prev]').addEventListener('click', () => render(current - 1, true));
    dialog.querySelector('[data-lightbox-next]').addEventListener('click', () => render(current + 1, true));

    dialog.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') render(current - 1, true);
      else if (event.key === 'ArrowRight') render(current + 1, true);
    });

    // Clicking the empty area around the image closes the viewer
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog || event.target === inner) dialog.close();
    });

    dialog.addEventListener('close', () => {
      media.replaceChildren();
      if (lastTrigger) lastTrigger.focus({ preventScroll: true });
    });

    let touchStartX = null;
    media.addEventListener('touchstart', (event) => {
      touchStartX = event.changedTouches[0].clientX;
    }, { passive: true });
    media.addEventListener('touchend', (event) => {
      if (touchStartX === null) return;
      const deltaX = event.changedTouches[0].clientX - touchStartX;
      touchStartX = null;
      if (Math.abs(deltaX) > 50) render(current + (deltaX < 0 ? 1 : -1), true);
    }, { passive: true });
  }

  initScrollState();
  initNav();
  initReveal();
  initLightbox();
})();
