/**
 * KarDinaL_Solutions - Script principal
 * Gestion du thème, navigation, animations et formulaire
 */

(function() {
    'use strict';

    // ========================================================
    // Media queries centralisées (Refactor #2)
    // Évite les appels dupliqués à window.matchMedia()
    // ========================================================
    const media = {
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
        darkScheme:    window.matchMedia('(prefers-color-scheme: dark)'),
    };

    // ========================================================
    // Gestion du thème (clair/sombre)
    // ========================================================
    const ThemeManager = {
        STORAGE_KEY: 'kardinal-theme',

        cacheDom() {
            this.toggle = document.querySelector('.theme-toggle');
        },

        init() {
            this.cacheDom();
            const savedTheme = localStorage.getItem(this.STORAGE_KEY);
            const theme = savedTheme || (media.darkScheme.matches ? 'dark' : 'light');
            this.setTheme(theme, false);
            this.bindEvents();
        },

        setTheme(theme, save = true) {
            document.documentElement.setAttribute('data-theme', theme);
            if (save) {
                localStorage.setItem(this.STORAGE_KEY, theme);
            }

            // Mise à jour de l'accessibilité du bouton
            if (this.toggle) {
                this.toggle.setAttribute('aria-label',
                    theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'
                );
            }
        },

        toggle() {
            const current = document.documentElement.getAttribute('data-theme');
            this.setTheme(current === 'dark' ? 'light' : 'dark');
        },

        bindEvents() {
            if (this.toggle) {
                this.toggle.addEventListener('click', () => this.toggle());
            }

            // Écoute les changements de préférence système
            media.darkScheme.addEventListener('change', (e) => {
                if (!localStorage.getItem(this.STORAGE_KEY)) {
                    this.setTheme(e.matches ? 'dark' : 'light', false);
                }
            });
        },
    };

    // ========================================================
    // Navigation mobile
    // ========================================================
    const MobileNav = {
        cacheDom() {
            this.toggle = document.querySelector('.nav__toggle');
            this.menu   = document.querySelector('.nav__list');
            this.links  = document.querySelectorAll('.nav__link');
        },

        init() {
            this.cacheDom();
            if (this.toggle && this.menu) {
                this.bindEvents();
            }
        },

        bindEvents() {
            this.toggle.addEventListener('click', () => this.toggleMenu());

            // Fermer le menu au clic sur un lien
            this.links.forEach(link => {
                link.addEventListener('click', () => this.closeMenu());
            });

            // Fermer le menu au clic à l'extérieur
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.nav') && this.isOpen()) {
                    this.closeMenu();
                }
            });

            // Fermer le menu avec Escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen()) {
                    this.closeMenu();
                    this.toggle.focus();
                }
            });
        },

        isOpen() {
            return this.menu.classList.contains('active');
        },

        toggleMenu() {
            const isOpen = this.isOpen();
            this.menu.classList.toggle('active');
            this.toggle.setAttribute('aria-expanded', !isOpen);
        },

        closeMenu() {
            this.menu.classList.remove('active');
            this.toggle.setAttribute('aria-expanded', 'false');
        },
    };

    // ========================================================
    // Navigation active sur scroll
    // ========================================================
    const ScrollSpy = {
        cacheDom() {
            this.sections = document.querySelectorAll('section[id]');
            this.navLinks = document.querySelectorAll('.nav__link[href^="#"]');
        },

        init() {
            this.cacheDom();
            if (this.sections.length && this.navLinks.length) {
                this.bindEvents();
                this.update();
            }
        },

        bindEvents() {
            let ticking = false;

            window.addEventListener('scroll', () => {
                if (!ticking) {
                    requestAnimationFrame(() => {
                        this.update();
                        ticking = false;
                    });
                    ticking = true;
                }
            });
        },

        update() {
            const scrollPos = window.scrollY + 100;

            this.sections.forEach(section => {
                const top    = section.offsetTop;
                const height = section.offsetHeight;
                const id     = section.getAttribute('id');

                if (scrollPos >= top && scrollPos < top + height) {
                    this.navLinks.forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === `#${id}`) {
                            link.classList.add('active');
                        }
                    });
                }
            });
        },
    };

    // ========================================================
    // Animations au scroll (Intersection Observer)
    // ========================================================
    const ScrollReveal = {
        init() {
            if ('IntersectionObserver' in window && !media.reducedMotion.matches) {
                this.observe();
            } else {
                // Fallback : afficher tous les éléments
                document.querySelectorAll('.reveal').forEach(el => {
                    el.classList.add('visible');
                });
            }
        },

        observe() {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px',
            });

            document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
        },
    };

    // ========================================================
    // Toast notification
    // ========================================================
    const Toast = {
        show(message, type = 'success') {
            const toast = document.getElementById('toast');
            const msg   = document.getElementById('toast-message');
            const icon  = document.getElementById('toast-icon');
            if (!toast || !msg || !icon) return;

            toast.className = `toast toast--${type}`;
            msg.textContent = message;

            if (type === 'success') {
                icon.innerHTML = '<polyline points="20 6 9 17 4 12"></polyline>';
            } else {
                icon.innerHTML = '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>';
            }

            toast.classList.add('toast--show');
            clearTimeout(this._timer);
            this._timer = setTimeout(() => toast.classList.remove('toast--show'), 4000);
        },
    };

    // ========================================================
    // Formulaire de contact (Formspree)
    // ========================================================
    const ContactForm = {
        cacheDom() {
            this.form = document.querySelector('.contact__form');
        },

        init() {
            this.cacheDom();
            if (this.form) {
                this.bindEvents();
            }
        },

        bindEvents() {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        },

        async handleSubmit(e) {
            e.preventDefault();

            // Protection DOM : s'assure que le bouton existe (Refactor #3)
            const btn = this.form.querySelector('[type="submit"]');
            if (!btn) return;

            const originalText = btn.innerHTML;
            btn.disabled  = true;
            btn.innerHTML = '<svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Envoi en cours…';

            // Récupère l'endpoint Formspree depuis config.js
            const endpoint = (typeof CONFIG !== 'undefined' && CONFIG.contact.formspree)
                ? CONFIG.contact.formspree
                : null;

            if (!endpoint) {
                // Fallback mailto si pas encore configuré
                const formData     = new FormData(this.form);
                const name         = formData.get('name')    || '';
                const email        = formData.get('email')   || '';
                const subject      = formData.get('subject') || 'Contact depuis le site';
                const message      = formData.get('message') || '';
                const contactEmail = typeof CONFIG !== 'undefined' ? CONFIG.contact.email : 'kardinalalpha@protonmail.com';
                const body         = `Nom: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;
                window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                btn.disabled  = false;
                btn.innerHTML = originalText;
                return;
            }

            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    body: new FormData(this.form),
                    headers: { 'Accept': 'application/json' },
                });

                if (response.ok) {
                    Toast.show('Message envoyé avec succès ! Je vous répondrai rapidement.', 'success');
                    this.form.reset();
                } else {
                    throw new Error('Erreur serveur');
                }
            } catch {
                Toast.show('Une erreur est survenue. Veuillez réessayer ou m\'écrire directement par email.', 'error');
            } finally {
                btn.disabled  = false;
                btn.innerHTML = originalText;
            }
        },
    };

    // ========================================================
    // Bouton retour en haut
    // ========================================================
    const BackToTop = {
        cacheDom() {
            this.btn = document.getElementById('back-to-top');
        },

        init() {
            this.cacheDom();
            if (!this.btn) return;
            this.bindEvents();
        },

        bindEvents() {
            window.addEventListener('scroll', () => {
                this.btn.classList.toggle('visible', window.scrollY > 400);
            }, { passive: true });

            this.btn.addEventListener('click', () => {
                window.scrollTo({
                    top: 0,
                    behavior: media.reducedMotion.matches ? 'auto' : 'smooth',
                });
            });
        },
    };

    // ========================================================
    // Typewriter dans le héro
    // ========================================================
    const Typewriter = {
        phrases: ['Développeur Web', 'Développeur Symfony', 'Technicien PC', 'Freelance IoT'],
        current: 0,
        charIndex: 0,
        deleting: false,
        SPEED_TYPE:   80,
        SPEED_DELETE: 45,
        PAUSE_END:    2000,
        PAUSE_START:  400,

        cacheDom() {
            this.el = document.getElementById('typewriter-text');
        },

        init() {
            this.cacheDom();
            if (!this.el || media.reducedMotion.matches) return;
            this.tick();
        },

        tick() {
            const phrase = this.phrases[this.current];

            if (this.deleting) {
                this.charIndex--;
                this.el.textContent = phrase.substring(0, this.charIndex);
            } else {
                this.charIndex++;
                this.el.textContent = phrase.substring(0, this.charIndex);
            }

            let delay = this.deleting ? this.SPEED_DELETE : this.SPEED_TYPE;

            if (!this.deleting && this.charIndex === phrase.length) {
                delay = this.PAUSE_END;
                this.deleting = true;
            } else if (this.deleting && this.charIndex === 0) {
                this.deleting = false;
                this.current  = (this.current + 1) % this.phrases.length;
                delay         = this.PAUSE_START;
            }

            setTimeout(() => this.tick(), delay);
        },
    };

    // ========================================================
    // Smooth scroll pour les ancres (event delegation — Refactor #4)
    // Un seul listener sur document au lieu d'un listener par lien
    // ========================================================
    const SmoothScroll = {
        init() {
            document.addEventListener('click', (e) => {
                const anchor = e.target.closest('a[href^="#"]');
                if (!anchor) return;

                const targetId = anchor.getAttribute('href');
                if (targetId === '#') return;

                const target = document.querySelector(targetId);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({
                        behavior: media.reducedMotion.matches ? 'auto' : 'smooth',
                    });

                    // Mise à jour de l'URL sans scroll
                    history.pushState(null, null, targetId);
                }
            });
        },
    };

    // ========================================================
    // Initialisation
    // ========================================================
    document.addEventListener('DOMContentLoaded', () => {
        // Mise à jour de l'année courante (Refactor #1 — suppression du script inline HTML)
        const yearEl = document.getElementById('current-year');
        if (yearEl) yearEl.textContent = new Date().getFullYear();

        ThemeManager.init();
        MobileNav.init();
        ScrollSpy.init();
        ScrollReveal.init();
        ContactForm.init();
        SmoothScroll.init();
        BackToTop.init();
        Typewriter.init();
    });

})();
