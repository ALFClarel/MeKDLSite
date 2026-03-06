/**
 * Clarel Grondin — main.js
 * Gestion du thème, navigation, animations, formulaire.
 */
(function () {
  'use strict';

  // ── Préférences système ──────────────────────────────────────────
  const media = {
    darkScheme: window.matchMedia('(prefers-color-scheme: dark)'),
  };

  // ── Gestionnaire de thème ────────────────────────────────────────
  const Theme = {
    KEY: 'clarel-theme',
    btn: document.getElementById('theme-toggle'),

    init() {
      const saved     = localStorage.getItem(this.KEY);
      const preferred = media.darkScheme.matches ? 'dark' : 'light';
      this.apply(saved || preferred, false);

      if (this.btn) {
        this.btn.addEventListener('click', () => this.toggle());
      }
      // Suit les changements de préférence système (sans choix sauvegardé)
      media.darkScheme.addEventListener('change', (e) => {
        if (!localStorage.getItem(this.KEY)) {
          this.apply(e.matches ? 'dark' : 'light', false);
        }
      });
    },

    apply(theme, save = true) {
      if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
      if (save) localStorage.setItem(this.KEY, theme);
      if (this.btn) {
        this.btn.setAttribute('aria-label',
          theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'
        );
      }
    },

    toggle() {
      const current = document.documentElement.getAttribute('data-theme');
      this.apply(current === 'light' ? 'dark' : 'light');
    },
  };

  // ── Bordure header au scroll ─────────────────────────────────────
  const header = document.getElementById('header');
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });

  // ── Navigation mobile (hamburger) ────────────────────────────────
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('nav-links');

  hamburger.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', isOpen);
  });
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });

  // ── Révélation au scroll (IntersectionObserver) ──────────────────
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const siblings = entry.target.parentElement.querySelectorAll('.reveal');
      siblings.forEach((el, idx) => {
        if (el === entry.target) setTimeout(() => el.classList.add('visible'), idx * 60);
      });
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  // ── Formulaire de contact ────────────────────────────────────────
  document.querySelector('.contact-form').addEventListener('submit', (e) => {
    e.preventDefault();
  });

  // ── Initialisation ───────────────────────────────────────────────
  Theme.init();

}());
