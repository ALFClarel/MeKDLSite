/**
 * KarDinaL_Solutions - Script principal
 * Gestion du thème, navigation, animations et formulaire
 */

(function() {
    'use strict';

    // ========================================================
    // Gestion du thème (clair/sombre)
    // ========================================================
    const ThemeManager = {
        STORAGE_KEY: 'kardinal-theme',
        
        init() {
            const savedTheme = localStorage.getItem(this.STORAGE_KEY);
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const theme = savedTheme || (prefersDark ? 'dark' : 'light');
            
            this.setTheme(theme, false);
            this.bindEvents();
        },
        
        setTheme(theme, save = true) {
            document.documentElement.setAttribute('data-theme', theme);
            if (save) {
                localStorage.setItem(this.STORAGE_KEY, theme);
            }
            
            // Mise à jour de l'accessibilité du bouton
            const toggle = document.querySelector('.theme-toggle');
            if (toggle) {
                toggle.setAttribute('aria-label', 
                    theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'
                );
            }
        },
        
        toggle() {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            this.setTheme(next);
        },
        
        bindEvents() {
            const toggle = document.querySelector('.theme-toggle');
            if (toggle) {
                toggle.addEventListener('click', () => this.toggle());
            }
            
            // Écoute les changements de préférence système
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (!localStorage.getItem(this.STORAGE_KEY)) {
                    this.setTheme(e.matches ? 'dark' : 'light', false);
                }
            });
        }
    };

    // ========================================================
    // Navigation mobile
    // ========================================================
    const MobileNav = {
        init() {
            this.toggle = document.querySelector('.nav__toggle');
            this.menu = document.querySelector('.nav__list');
            this.links = document.querySelectorAll('.nav__link');
            
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
        }
    };

    // ========================================================
    // Navigation active sur scroll
    // ========================================================
    const ScrollSpy = {
        init() {
            this.sections = document.querySelectorAll('section[id]');
            this.navLinks = document.querySelectorAll('.nav__link[href^="#"]');
            
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
                const top = section.offsetTop;
                const height = section.offsetHeight;
                const id = section.getAttribute('id');
                
                if (scrollPos >= top && scrollPos < top + height) {
                    this.navLinks.forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === `#${id}`) {
                            link.classList.add('active');
                        }
                    });
                }
            });
        }
    };

    // ========================================================
    // Animations au scroll (Intersection Observer)
    // ========================================================
    const ScrollReveal = {
        init() {
            if ('IntersectionObserver' in window && !this.prefersReducedMotion()) {
                this.observe();
            } else {
                // Fallback : afficher tous les éléments
                document.querySelectorAll('.reveal').forEach(el => {
                    el.classList.add('visible');
                });
            }
        },
        
        prefersReducedMotion() {
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
                rootMargin: '0px 0px -50px 0px'
            });
            
            document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
        }
    };

    // ========================================================
    // Formulaire de contact (mailto)
    // ========================================================
    const ContactForm = {
        init() {
            this.form = document.querySelector('.contact__form');
            if (this.form) {
                this.bindEvents();
            }
        },
        
        bindEvents() {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        },
        
        handleSubmit(e) {
            e.preventDefault();
            
            const formData = new FormData(this.form);
            const name = formData.get('name') || '';
            const email = formData.get('email') || '';
            const subject = formData.get('subject') || 'Contact depuis le site';
            const message = formData.get('message') || '';
            
            // Construction du mailto
            const contactEmail = typeof CONFIG !== 'undefined' ? CONFIG.contact.email : 'contact@kardinal-solutions.re';
            const body = `Nom: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;
            const mailtoLink = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            
            window.location.href = mailtoLink;
        }
    };

    // ========================================================
    // Smooth scroll pour les ancres
    // ========================================================
    const SmoothScroll = {
        init() {
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', (e) => {
                    const targetId = anchor.getAttribute('href');
                    if (targetId === '#') return;
                    
                    const target = document.querySelector(targetId);
                    if (target) {
                        e.preventDefault();
                        target.scrollIntoView({
                            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
                        });
                        
                        // Mise à jour de l'URL sans scroll
                        history.pushState(null, null, targetId);
                    }
                });
            });
        }
    };

    // ========================================================
    // Initialisation
    // ========================================================
    document.addEventListener('DOMContentLoaded', () => {
        ThemeManager.init();
        MobileNav.init();
        ScrollSpy.init();
        ScrollReveal.init();
        ContactForm.init();
        SmoothScroll.init();
    });

})();
