#!/bin/bash
# ============================================================
# KarDinaL_Solutions - Script de build
# Génère l'arborescence complète et crée l'archive ZIP
# ============================================================

set -e

PROJECT_NAME="KarDinaL_Solutions"
ZIP_NAME="${PROJECT_NAME}_site.zip"

echo "🚀 Création du projet ${PROJECT_NAME}..."

# Création de l'arborescence
mkdir -p "${PROJECT_NAME}/assets/css"
mkdir -p "${PROJECT_NAME}/assets/js"
mkdir -p "${PROJECT_NAME}/assets/img"

# ============================================================
# config.js - Configuration centralisée
# ============================================================
cat << 'EOF' > "${PROJECT_NAME}/assets/js/config.js"
/**
 * KarDinaL_Solutions - Configuration centralisée
 * Modifier les valeurs ci-dessous selon vos besoins
 */
const CONFIG = {
    // Informations de contact
    contact: {
        email: 'contact@kardinal-solutions.re', // À remplacer par votre email professionnel
        phone: '', // Optionnel : '+262 693 XX XX XX'
        location: 'Saint-Denis, La Réunion'
    },

    // Réseaux sociaux (ajouter/supprimer selon besoins)
    social: {
        github: 'https://github.com/ALFClarel',
        linkedin: 'https://www.linkedin.com/in/clarel-grondin-336894282/',
        // instagram: '',
        // facebook: '',
        // twitter: '',
    },

    // Informations légales
    legal: {
        brandName: 'KarDinaL_Solutions',
        ownerName: 'GRONDIN Clarel',
        siret: '', // À compléter si applicable
    },

    // SEO
    seo: {
        siteUrl: 'https://kardinal-solutions.re', // À remplacer par votre domaine
        title: 'KarDinaL_Solutions | Développeur Web & Services PC',
        description: 'Développeur d\'applications web Symfony et services informatiques à La Réunion. Sites vitrines, applications web, APIs, assemblage et réparation PC.',
    }
};

// Export pour utilisation dans main.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
EOF

# ============================================================
# styles.css - Feuille de styles principale
# ============================================================
cat << 'EOF' > "${PROJECT_NAME}/assets/css/styles.css"
/**
 * KarDinaL_Solutions - Styles
 * Design moderne, premium, tech
 * Couleur d'accent : vert sauge
 */

/* ============================================================
   CSS Custom Properties (Variables)
   ============================================================ */
:root {
    /* Couleurs - Thème clair */
    --color-bg-primary: #ffffff;
    --color-bg-secondary: #f8f9fa;
    --color-bg-tertiary: #e9ecef;
    --color-text-primary: #1a1a2e;
    --color-text-secondary: #4a4a5a;
    --color-text-muted: #6c757d;
    
    /* Vert sauge - Accent */
    --color-accent: #7c9a82;
    --color-accent-light: #9db4a2;
    --color-accent-dark: #5c7a62;
    --color-accent-rgb: 124, 154, 130;
    
    /* Surfaces et bordures */
    --color-border: #dee2e6;
    --color-card-bg: #ffffff;
    --color-card-shadow: rgba(0, 0, 0, 0.08);
    
    /* Typographie */
    --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    
    /* Espacements */
    --spacing-xs: 0.25rem;
    --spacing-sm: 0.5rem;
    --spacing-md: 1rem;
    --spacing-lg: 1.5rem;
    --spacing-xl: 2rem;
    --spacing-2xl: 3rem;
    --spacing-3xl: 4rem;
    
    /* Bordures */
    --radius-sm: 4px;
    --radius-md: 8px;
    --radius-lg: 12px;
    --radius-xl: 16px;
    --radius-full: 9999px;
    
    /* Transitions */
    --transition-fast: 150ms ease;
    --transition-base: 250ms ease;
    --transition-slow: 400ms ease;
    
    /* Largeurs */
    --max-width: 1200px;
    --max-width-narrow: 800px;
    
    /* Header */
    --header-height: 70px;
}

/* Thème sombre */
[data-theme="dark"] {
    --color-bg-primary: #0d1117;
    --color-bg-secondary: #161b22;
    --color-bg-tertiary: #21262d;
    --color-text-primary: #f0f6fc;
    --color-text-secondary: #c9d1d9;
    --color-text-muted: #8b949e;
    --color-accent: #8fbc8f;
    --color-accent-light: #a8d4a8;
    --color-accent-dark: #6a9a6a;
    --color-accent-rgb: 143, 188, 143;
    --color-border: #30363d;
    --color-card-bg: #161b22;
    --color-card-shadow: rgba(0, 0, 0, 0.3);
}

/* ============================================================
   Reset et Base
   ============================================================ */
*,
*::before,
*::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

html {
    scroll-behavior: smooth;
    scroll-padding-top: var(--header-height);
}

@media (prefers-reduced-motion: reduce) {
    html {
        scroll-behavior: auto;
    }
    
    *,
    *::before,
    *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}

body {
    font-family: var(--font-primary);
    font-size: 16px;
    line-height: 1.6;
    color: var(--color-text-primary);
    background-color: var(--color-bg-primary);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden;
}

/* ============================================================
   Typographie
   ============================================================ */
h1, h2, h3, h4, h5, h6 {
    font-weight: 600;
    line-height: 1.3;
    color: var(--color-text-primary);
}

h1 { font-size: clamp(2rem, 5vw, 3rem); }
h2 { font-size: clamp(1.5rem, 4vw, 2.25rem); }
h3 { font-size: clamp(1.25rem, 3vw, 1.5rem); }

p {
    color: var(--color-text-secondary);
    margin-bottom: var(--spacing-md);
}

a {
    color: var(--color-accent);
    text-decoration: none;
    transition: color var(--transition-fast);
}

a:hover,
a:focus {
    color: var(--color-accent-dark);
}

a:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
}

/* ============================================================
   Utilitaires
   ============================================================ */
.container {
    width: 100%;
    max-width: var(--max-width);
    margin: 0 auto;
    padding: 0 var(--spacing-lg);
}

.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}

/* ============================================================
   Header & Navigation
   ============================================================ */
.header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: var(--header-height);
    background-color: rgba(var(--color-bg-primary), 0.95);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--color-border);
    z-index: 1000;
    transition: background-color var(--transition-base), border-color var(--transition-base);
}

[data-theme="dark"] .header {
    background-color: rgba(13, 17, 23, 0.95);
}

[data-theme="light"] .header {
    background-color: rgba(255, 255, 255, 0.95);
}

.header__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 100%;
    max-width: var(--max-width);
    margin: 0 auto;
    padding: 0 var(--spacing-lg);
}

.header__logo {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-text-primary);
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.header__logo-icon {
    width: 32px;
    height: 32px;
    color: var(--color-accent);
}

.nav {
    display: flex;
    align-items: center;
    gap: var(--spacing-xl);
}

.nav__list {
    display: flex;
    align-items: center;
    gap: var(--spacing-lg);
    list-style: none;
}

.nav__link {
    position: relative;
    color: var(--color-text-secondary);
    font-weight: 500;
    font-size: 0.9375rem;
    padding: var(--spacing-sm) 0;
    transition: color var(--transition-fast);
}

.nav__link:hover,
.nav__link:focus,
.nav__link.active {
    color: var(--color-accent);
}

.nav__link::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 0;
    height: 2px;
    background-color: var(--color-accent);
    transition: width var(--transition-base);
}

.nav__link:hover::after,
.nav__link:focus::after,
.nav__link.active::after {
    width: 100%;
}

/* Theme Toggle */
.theme-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    color: var(--color-text-secondary);
    transition: all var(--transition-fast);
}

.theme-toggle:hover,
.theme-toggle:focus {
    color: var(--color-accent);
    border-color: var(--color-accent);
}

.theme-toggle__icon {
    width: 20px;
    height: 20px;
}

.theme-toggle__icon--moon {
    display: none;
}

[data-theme="dark"] .theme-toggle__icon--sun {
    display: none;
}

[data-theme="dark"] .theme-toggle__icon--moon {
    display: block;
}

/* Mobile Menu */
.nav__toggle {
    display: none;
    flex-direction: column;
    justify-content: center;
    gap: 5px;
    width: 40px;
    height: 40px;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: var(--spacing-sm);
}

.nav__toggle-line {
    width: 24px;
    height: 2px;
    background-color: var(--color-text-primary);
    border-radius: 2px;
    transition: all var(--transition-fast);
}

.nav__toggle[aria-expanded="true"] .nav__toggle-line:nth-child(1) {
    transform: rotate(45deg) translate(5px, 5px);
}

.nav__toggle[aria-expanded="true"] .nav__toggle-line:nth-child(2) {
    opacity: 0;
}

.nav__toggle[aria-expanded="true"] .nav__toggle-line:nth-child(3) {
    transform: rotate(-45deg) translate(5px, -5px);
}

@media (max-width: 768px) {
    .nav__toggle {
        display: flex;
    }
    
    .nav__list {
        position: fixed;
        top: var(--header-height);
        left: 0;
        right: 0;
        flex-direction: column;
        background-color: var(--color-bg-primary);
        border-bottom: 1px solid var(--color-border);
        padding: var(--spacing-lg);
        gap: var(--spacing-md);
        transform: translateY(-100%);
        opacity: 0;
        visibility: hidden;
        transition: all var(--transition-base);
    }
    
    .nav__list.active {
        transform: translateY(0);
        opacity: 1;
        visibility: visible;
    }
    
    .nav__link {
        display: block;
        padding: var(--spacing-md);
        text-align: center;
    }
}

/* ============================================================
   Hero Section
   ============================================================ */
.hero {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: calc(var(--header-height) + var(--spacing-3xl)) var(--spacing-lg) var(--spacing-3xl);
    background: linear-gradient(135deg, var(--color-bg-primary) 0%, var(--color-bg-secondary) 100%);
    position: relative;
    overflow: hidden;
}

.hero::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: 
        radial-gradient(circle at 20% 50%, rgba(var(--color-accent-rgb), 0.08) 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, rgba(var(--color-accent-rgb), 0.05) 0%, transparent 40%);
    pointer-events: none;
}

.hero__content {
    max-width: var(--max-width-narrow);
    text-align: center;
    position: relative;
    z-index: 1;
}

.hero__badge {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    background-color: rgba(var(--color-accent-rgb), 0.1);
    border: 1px solid rgba(var(--color-accent-rgb), 0.2);
    border-radius: var(--radius-full);
    font-size: 0.875rem;
    color: var(--color-accent);
    margin-bottom: var(--spacing-xl);
}

.hero__badge-icon {
    width: 16px;
    height: 16px;
}

.hero__title {
    margin-bottom: var(--spacing-lg);
}

.hero__title-accent {
    color: var(--color-accent);
}

.hero__description {
    font-size: 1.125rem;
    max-width: 600px;
    margin: 0 auto var(--spacing-xl);
}

.hero__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--spacing-md);
}

/* Buttons */
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md) var(--spacing-xl);
    font-family: inherit;
    font-size: 1rem;
    font-weight: 500;
    text-decoration: none;
    border-radius: var(--radius-md);
    border: 2px solid transparent;
    cursor: pointer;
    transition: all var(--transition-fast);
}

.btn:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
}

.btn--primary {
    background-color: var(--color-accent);
    color: #ffffff;
    border-color: var(--color-accent);
}

.btn--primary:hover,
.btn--primary:focus {
    background-color: var(--color-accent-dark);
    border-color: var(--color-accent-dark);
    color: #ffffff;
}

.btn--secondary {
    background-color: transparent;
    color: var(--color-text-primary);
    border-color: var(--color-border);
}

.btn--secondary:hover,
.btn--secondary:focus {
    border-color: var(--color-accent);
    color: var(--color-accent);
}

.btn__icon {
    width: 18px;
    height: 18px;
}

/* ============================================================
   Sections communes
   ============================================================ */
.section {
    padding: var(--spacing-3xl) var(--spacing-lg);
}

.section--alt {
    background-color: var(--color-bg-secondary);
}

.section__header {
    text-align: center;
    max-width: var(--max-width-narrow);
    margin: 0 auto var(--spacing-2xl);
}

.section__title {
    margin-bottom: var(--spacing-md);
}

.section__subtitle {
    color: var(--color-text-muted);
    font-size: 1.0625rem;
}

/* ============================================================
   Services Grid
   ============================================================ */
.services-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--spacing-xl);
    max-width: var(--max-width);
    margin: 0 auto;
}

.service-card {
    background-color: var(--color-card-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-xl);
    transition: all var(--transition-base);
}

.service-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px var(--color-card-shadow);
    border-color: var(--color-accent);
}

@media (prefers-reduced-motion: reduce) {
    .service-card:hover {
        transform: none;
    }
}

.service-card__icon {
    width: 48px;
    height: 48px;
    color: var(--color-accent);
    margin-bottom: var(--spacing-md);
}

.service-card__title {
    font-size: 1.125rem;
    margin-bottom: var(--spacing-sm);
}

.service-card__description {
    font-size: 0.9375rem;
    color: var(--color-text-muted);
    margin-bottom: 0;
}

/* ============================================================
   Technologies / Skills
   ============================================================ */
.tech-stack {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--spacing-md);
    margin-top: var(--spacing-xl);
}

.tech-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    background-color: var(--color-bg-tertiary);
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-secondary);
    transition: all var(--transition-fast);
}

.tech-badge:hover {
    background-color: rgba(var(--color-accent-rgb), 0.1);
    color: var(--color-accent);
}

.tech-badge__icon {
    width: 20px;
    height: 20px;
}

/* ============================================================
   Portfolio
   ============================================================ */
.portfolio-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: var(--spacing-xl);
    max-width: var(--max-width);
    margin: 0 auto;
}

.portfolio-card {
    position: relative;
    background-color: var(--color-card-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: all var(--transition-base);
}

.portfolio-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px var(--color-card-shadow);
}

@media (prefers-reduced-motion: reduce) {
    .portfolio-card:hover {
        transform: none;
    }
}

.portfolio-card__image {
    width: 100%;
    aspect-ratio: 16 / 10;
    background-color: var(--color-bg-tertiary);
    display: flex;
    align-items: center;
    justify-content: center;
}

.portfolio-card__placeholder {
    width: 64px;
    height: 64px;
    color: var(--color-text-muted);
    opacity: 0.5;
}

.portfolio-card__content {
    padding: var(--spacing-lg);
}

.portfolio-card__title {
    font-size: 1.125rem;
    margin-bottom: var(--spacing-sm);
}

.portfolio-card__description {
    font-size: 0.9375rem;
    color: var(--color-text-muted);
    margin-bottom: var(--spacing-md);
}

.portfolio-card__tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-sm);
}

.portfolio-card__tag {
    font-size: 0.75rem;
    padding: var(--spacing-xs) var(--spacing-sm);
    background-color: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
}

/* GitHub CTA */
.github-cta {
    text-align: center;
    margin-top: var(--spacing-2xl);
    padding: var(--spacing-xl);
    background: linear-gradient(135deg, rgba(var(--color-accent-rgb), 0.05) 0%, rgba(var(--color-accent-rgb), 0.1) 100%);
    border-radius: var(--radius-lg);
    border: 1px solid rgba(var(--color-accent-rgb), 0.2);
}

.github-cta__text {
    margin-bottom: var(--spacing-md);
    color: var(--color-text-secondary);
}

/* ============================================================
   About / Compétences additionnelles
   ============================================================ */
.about-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--spacing-xl);
    max-width: var(--max-width);
    margin: 0 auto;
}

.about-card {
    text-align: center;
    padding: var(--spacing-xl);
}

.about-card__icon {
    width: 56px;
    height: 56px;
    color: var(--color-accent);
    margin-bottom: var(--spacing-md);
}

.about-card__title {
    font-size: 1rem;
    margin-bottom: var(--spacing-sm);
}

.about-card__text {
    font-size: 0.9375rem;
    color: var(--color-text-muted);
    margin-bottom: 0;
}

/* ============================================================
   Contact Section
   ============================================================ */
.contact {
    text-align: center;
}

.contact__form {
    max-width: 500px;
    margin: 0 auto;
}

.form-group {
    margin-bottom: var(--spacing-md);
    text-align: left;
}

.form-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-primary);
    margin-bottom: var(--spacing-sm);
}

.form-input,
.form-textarea {
    width: 100%;
    padding: var(--spacing-md);
    font-family: inherit;
    font-size: 1rem;
    color: var(--color-text-primary);
    background-color: var(--color-bg-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.form-input:focus,
.form-textarea:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px rgba(var(--color-accent-rgb), 0.1);
}

.form-textarea {
    min-height: 150px;
    resize: vertical;
}

.contact__info {
    margin-top: var(--spacing-2xl);
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--spacing-xl);
}

.contact__info-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    color: var(--color-text-secondary);
}

.contact__info-icon {
    width: 20px;
    height: 20px;
    color: var(--color-accent);
}

/* ============================================================
   Footer
   ============================================================ */
.footer {
    background-color: var(--color-bg-secondary);
    border-top: 1px solid var(--color-border);
    padding: var(--spacing-2xl) var(--spacing-lg) var(--spacing-xl);
}

.footer__inner {
    max-width: var(--max-width);
    margin: 0 auto;
}

.footer__top {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-xl);
    margin-bottom: var(--spacing-xl);
    padding-bottom: var(--spacing-xl);
    border-bottom: 1px solid var(--color-border);
}

.footer__brand {
    max-width: 300px;
}

.footer__logo {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-text-primary);
    margin-bottom: var(--spacing-md);
}

.footer__description {
    font-size: 0.875rem;
    color: var(--color-text-muted);
    margin-bottom: 0;
}

.footer__section-title {
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-primary);
    margin-bottom: var(--spacing-md);
}

.footer__links {
    list-style: none;
}

.footer__link {
    display: block;
    font-size: 0.9375rem;
    color: var(--color-text-muted);
    padding: var(--spacing-xs) 0;
    transition: color var(--transition-fast);
}

.footer__link:hover,
.footer__link:focus {
    color: var(--color-accent);
}

.footer__social {
    display: flex;
    gap: var(--spacing-md);
}

.footer__social-link {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    color: var(--color-text-muted);
    background-color: var(--color-bg-tertiary);
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
}

.footer__social-link:hover,
.footer__social-link:focus {
    color: #ffffff;
    background-color: var(--color-accent);
}

.footer__social-icon {
    width: 20px;
    height: 20px;
}

.footer__bottom {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-md);
}

.footer__copyright {
    font-size: 0.875rem;
    color: var(--color-text-muted);
}

.footer__legal {
    display: flex;
    gap: var(--spacing-lg);
}

.footer__legal-link {
    font-size: 0.875rem;
    color: var(--color-text-muted);
}

/* ============================================================
   Animations
   ============================================================ */
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.animate-fade-in-up {
    animation: fadeInUp 0.6s ease forwards;
    opacity: 0;
}

.animate-delay-1 { animation-delay: 0.1s; }
.animate-delay-2 { animation-delay: 0.2s; }
.animate-delay-3 { animation-delay: 0.3s; }
.animate-delay-4 { animation-delay: 0.4s; }

@media (prefers-reduced-motion: reduce) {
    .animate-fade-in-up {
        animation: none;
        opacity: 1;
    }
}

/* ============================================================
   Scroll animations (IntersectionObserver)
   ============================================================ */
.reveal {
    opacity: 0;
    transform: translateY(30px);
    transition: opacity 0.6s ease, transform 0.6s ease;
}

.reveal.visible {
    opacity: 1;
    transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
    .reveal {
        opacity: 1;
        transform: none;
        transition: none;
    }
}

/* ============================================================
   Print Styles
   ============================================================ */
@media print {
    .header,
    .theme-toggle,
    .nav__toggle,
    .btn,
    .footer__social {
        display: none !important;
    }
    
    body {
        color: #000;
        background: #fff;
    }
    
    a {
        color: #000;
        text-decoration: underline;
    }
}
EOF

# ============================================================
# main.js - Script principal
# ============================================================
cat << 'EOF' > "${PROJECT_NAME}/assets/js/main.js"
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
EOF

# ============================================================
# index.html - Page principale
# ============================================================
cat << 'EOF' > "${PROJECT_NAME}/index.html"
<!DOCTYPE html>
<html lang="fr" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    
    <!-- SEO -->
    <title>KarDinaL_Solutions | Développeur Web & Services PC à La Réunion</title>
    <meta name="description" content="Développeur d'applications web Symfony et services informatiques à Saint-Denis, La Réunion. Sites vitrines, applications web, APIs, assemblage et réparation PC pour particuliers.">
    <meta name="keywords" content="développeur web, Symfony, PHP, La Réunion, Saint-Denis, assemblage PC, réparation ordinateur, site vitrine, application web">
    <meta name="author" content="GRONDIN Clarel">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://kardinal-solutions.re/">
    
    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://kardinal-solutions.re/">
    <meta property="og:title" content="KarDinaL_Solutions | Développeur Web & Services PC">
    <meta property="og:description" content="Développeur d'applications web et services informatiques à La Réunion. Sites vitrines, APIs, assemblage et réparation PC.">
    <meta property="og:locale" content="fr_FR">
    <meta property="og:site_name" content="KarDinaL_Solutions">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="KarDinaL_Solutions | Développeur Web & Services PC">
    <meta name="twitter:description" content="Développeur d'applications web et services informatiques à La Réunion.">
    
    <!-- Favicon -->
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💻</text></svg>">
    
    <!-- Preload fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preload" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" as="style">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- Styles -->
    <link rel="stylesheet" href="assets/css/styles.css">
    
    <!-- JSON-LD Structured Data -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "ProfessionalService",
        "name": "KarDinaL_Solutions",
        "description": "Développeur d'applications web Symfony et services informatiques à La Réunion",
        "url": "https://kardinal-solutions.re",
        "address": {
            "@type": "PostalAddress",
            "addressLocality": "Saint-Denis",
            "addressRegion": "La Réunion",
            "addressCountry": "FR"
        },
        "areaServed": {
            "@type": "Place",
            "name": "La Réunion"
        },
        "priceRange": "Sur devis",
        "serviceType": ["Développement web", "Assemblage PC", "Réparation informatique"],
        "sameAs": [
            "https://github.com/ALFClarel",
            "https://www.linkedin.com/in/clarel-grondin-336894282/"
        ]
    }
    </script>
</head>
<body>
    <!-- Skip Link -->
    <a href="#main" class="sr-only">Aller au contenu principal</a>

    <!-- Header -->
    <header class="header" role="banner">
        <div class="header__inner">
            <a href="#" class="header__logo" aria-label="KarDinaL_Solutions - Accueil">
                <!-- Logo placeholder - remplacer par votre logo -->
                <svg class="header__logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="16 18 22 12 16 6"></polyline>
                    <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
                <span>KarDinaL_Solutions</span>
            </a>
            
            <nav class="nav" role="navigation" aria-label="Navigation principale">
                <button class="nav__toggle" aria-expanded="false" aria-controls="nav-menu" aria-label="Menu de navigation">
                    <span class="nav__toggle-line"></span>
                    <span class="nav__toggle-line"></span>
                    <span class="nav__toggle-line"></span>
                </button>
                
                <ul class="nav__list" id="nav-menu">
                    <li><a href="#services-web" class="nav__link">Services Web</a></li>
                    <li><a href="#services-pc" class="nav__link">Services PC</a></li>
                    <li><a href="#competences" class="nav__link">Compétences</a></li>
                    <li><a href="#portfolio" class="nav__link">Portfolio</a></li>
                    <li><a href="#contact" class="nav__link">Contact</a></li>
                </ul>
                
                <button class="theme-toggle" aria-label="Activer le mode sombre" type="button">
                    <svg class="theme-toggle__icon theme-toggle__icon--sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="5"></circle>
                        <line x1="12" y1="1" x2="12" y2="3"></line>
                        <line x1="12" y1="21" x2="12" y2="23"></line>
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                        <line x1="1" y1="12" x2="3" y2="12"></line>
                        <line x1="21" y1="12" x2="23" y2="12"></line>
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                    </svg>
                    <svg class="theme-toggle__icon theme-toggle__icon--moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                    </svg>
                </button>
            </nav>
        </div>
    </header>

    <!-- Main Content -->
    <main id="main">
        <!-- Hero Section -->
        <section class="hero" id="hero">
            <div class="hero__content">
                <span class="hero__badge animate-fade-in-up">
                    <svg class="hero__badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                        <path d="M2 17l10 5 10-5"></path>
                        <path d="M2 12l10 5 10-5"></path>
                    </svg>
                    Freelance à La Réunion
                </span>
                
                <h1 class="hero__title animate-fade-in-up animate-delay-1">
                    Développeur Web<br>
                    <span class="hero__title-accent">& Services PC</span>
                </h1>
                
                <p class="hero__description animate-fade-in-up animate-delay-2">
                    Conception d'applications web sur mesure avec Symfony et PHP. 
                    Assemblage, réparation et maintenance de PC pour particuliers à Saint-Denis.
                </p>
                
                <div class="hero__actions animate-fade-in-up animate-delay-3">
                    <a href="#contact" class="btn btn--primary">
                        <svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                            <polyline points="22,6 12,13 2,6"></polyline>
                        </svg>
                        Contact
                    </a>
                    <a href="https://github.com/ALFClarel" target="_blank" rel="noopener noreferrer" class="btn btn--secondary">
                        <svg class="btn__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        GitHub
                    </a>
                </div>
            </div>
        </section>

        <!-- Services Web Section -->
        <section class="section section--alt" id="services-web">
            <div class="container">
                <div class="section__header reveal">
                    <h2 class="section__title">Services Web</h2>
                    <p class="section__subtitle">
                        Développement d'applications web professionnelles, de la conception au déploiement.
                    </p>
                </div>
                
                <div class="services-grid">
                    <article class="service-card reveal">
                        <svg class="service-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                            <line x1="8" y1="21" x2="16" y2="21"></line>
                            <line x1="12" y1="17" x2="12" y2="21"></line>
                        </svg>
                        <h3 class="service-card__title">Site Vitrine</h3>
                        <p class="service-card__description">
                            Sites web modernes et responsive pour présenter votre activité et attirer de nouveaux clients.
                        </p>
                    </article>
                    
                    <article class="service-card reveal">
                        <svg class="service-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                            <polyline points="2 17 12 22 22 17"></polyline>
                            <polyline points="2 12 12 17 22 12"></polyline>
                        </svg>
                        <h3 class="service-card__title">Application Web</h3>
                        <p class="service-card__description">
                            Applications métier sur mesure avec Symfony pour automatiser et optimiser vos processus.
                        </p>
                    </article>
                    
                    <article class="service-card reveal">
                        <svg class="service-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
                        </svg>
                        <h3 class="service-card__title">API</h3>
                        <p class="service-card__description">
                            Développement d'APIs RESTful pour connecter vos applications et services.
                        </p>
                    </article>
                    
                    <article class="service-card reveal">
                        <svg class="service-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        <h3 class="service-card__title">Refonte</h3>
                        <p class="service-card__description">
                            Modernisation de sites existants : design, performances, accessibilité et SEO.
                        </p>
                    </article>
                    
                    <article class="service-card reveal">
                        <svg class="service-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                            <line x1="6" y1="6" x2="6.01" y2="6"></line>
                            <line x1="6" y1="18" x2="6.01" y2="18"></line>
                        </svg>
                        <h3 class="service-card__title">Hébergement</h3>
                        <p class="service-card__description">
                            Mise en place et gestion d'hébergement sur serveurs Linux, configuration DNS et SSL.
                        </p>
                    </article>
                    
                    <article class="service-card reveal">
                        <svg class="service-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <polyline points="16 18 22 12 16 6"></polyline>
                            <polyline points="8 6 2 12 8 18"></polyline>
                        </svg>
                        <h3 class="service-card__title">Intégration</h3>
                        <p class="service-card__description">
                            Intégration de maquettes, SDKs tiers, APIs et connecteurs avec vos outils métier.
                        </p>
                    </article>
                </div>
                
                <div class="tech-stack reveal">
                    <span class="tech-badge">
                        <svg class="tech-badge__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                        </svg>
                        Symfony
                    </span>
                    <span class="tech-badge">
                        <svg class="tech-badge__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        PHP
                    </span>
                    <span class="tech-badge">
                        <svg class="tech-badge__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                        </svg>
                        MySQL
                    </span>
                    <span class="tech-badge">
                        <svg class="tech-badge__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 18.5L4 16V9l8 4v7.5zm1-8.77L5.5 8 12 4.5 18.5 8 13 11.73z"/>
                        </svg>
                        Linux
                    </span>
                </div>
                
                <p class="section__subtitle reveal" style="margin-top: var(--spacing-xl); text-align: center;">
                    <strong>Tarification sur devis</strong> — Chaque projet est unique.
                </p>
            </div>
        </section>

        <!-- Services PC Section -->
        <section class="section" id="services-pc">
            <div class="container">
                <div class="section__header reveal">
                    <h2 class="section__title">Services PC</h2>
                    <p class="section__subtitle">
                        Assemblage sur mesure et maintenance informatique pour particuliers.
                    </p>
                </div>
                
                <div class="services-grid">
                    <article class="service-card reveal">
                        <svg class="service-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                            <rect x="9" y="9" width="6" height="6"></rect>
                            <line x1="9" y1="1" x2="9" y2="4"></line>
                            <line x1="15" y1="1" x2="15" y2="4"></line>
                            <line x1="9" y1="20" x2="9" y2="23"></line>
                            <line x1="15" y1="20" x2="15" y2="23"></line>
                            <line x1="20" y1="9" x2="23" y2="9"></line>
                            <line x1="20" y1="14" x2="23" y2="14"></line>
                            <line x1="1" y1="9" x2="4" y2="9"></line>
                            <line x1="1" y1="14" x2="4" y2="14"></line>
                        </svg>
                        <h3 class="service-card__title">Assemblage PC</h3>
                        <p class="service-card__description">
                            Montage de configurations sur mesure adaptées à vos besoins : gaming, bureautique, création.
                        </p>
                    </article>
                    
                    <article class="service-card reveal">
                        <svg class="service-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                            <polyline points="17 6 23 6 23 12"></polyline>
                        </svg>
                        <h3 class="service-card__title">Upgrade</h3>
                        <p class="service-card__description">
                            Amélioration des performances : RAM, SSD, carte graphique, alimentation.
                        </p>
                    </article>
                    
                    <article class="service-card reveal">
                        <svg class="service-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <h3 class="service-card__title">Diagnostic</h3>
                        <p class="service-card__description">
                            Identification des pannes matérielles et logicielles, tests de composants.
                        </p>
                    </article>
                    
                    <article class="service-card reveal">
                        <svg class="service-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                        </svg>
                        <h3 class="service-card__title">Réparation</h3>
                        <p class="service-card__description">
                            Remplacement de composants défectueux, réparation de connexions, récupération de données.
                        </p>
                    </article>
                    
                    <article class="service-card reveal">
                        <svg class="service-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                        </svg>
                        <h3 class="service-card__title">Nettoyage</h3>
                        <p class="service-card__description">
                            Dépoussiérage complet, changement de pâte thermique, optimisation du refroidissement.
                        </p>
                    </article>
                    
                    <article class="service-card reveal">
                        <svg class="service-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                            <line x1="8" y1="21" x2="16" y2="21"></line>
                            <line x1="12" y1="17" x2="12" y2="21"></line>
                        </svg>
                        <h3 class="service-card__title">Réinstallation OS</h3>
                        <p class="service-card__description">
                            Installation propre de Windows ou Linux, configuration et mise à jour des pilotes.
                        </p>
                    </article>
                </div>
                
                <div class="github-cta reveal">
                    <p class="github-cta__text">
                        <strong>Service Pickup disponible</strong> — Récupération de votre PC à domicile sur Saint-Denis et environs.
                    </p>
                    <p class="section__subtitle" style="margin-bottom: 0;">
                        <strong>Tarification sur devis</strong> — Contactez-moi pour un diagnostic gratuit.
                    </p>
                </div>
            </div>
        </section>

        <!-- Compétences additionnelles -->
        <section class="section section--alt" id="competences">
            <div class="container">
                <div class="section__header reveal">
                    <h2 class="section__title">Compétences Techniques</h2>
                    <p class="section__subtitle">
                        Formation BTS Électronique et expérience en développement d'applications.
                    </p>
                </div>
                
                <div class="about-grid">
                    <article class="about-card reveal">
                        <svg class="about-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                            <rect x="9" y="9" width="6" height="6"></rect>
                            <line x1="9" y1="1" x2="9" y2="4"></line>
                            <line x1="15" y1="1" x2="15" y2="4"></line>
                        </svg>
                        <h3 class="about-card__title">Électronique</h3>
                        <p class="about-card__text">
                            Microcontrôleurs, PCB, soudure. Utilisation de KiCAD, LTSpice, Fritzing.
                        </p>
                    </article>
                    
                    <article class="about-card reveal">
                        <svg class="about-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
                            <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
                            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                            <line x1="12" y1="20" x2="12.01" y2="20"></line>
                        </svg>
                        <h3 class="about-card__title">RadioFréquences</h3>
                        <p class="about-card__text">
                            LoRa 868/433 MHz, GPS, Bluetooth, WiFi. Systèmes IoT et communications sans fil.
                        </p>
                    </article>
                    
                    <article class="about-card reveal">
                        <svg class="about-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <polyline points="4 17 10 11 4 5"></polyline>
                            <line x1="12" y1="19" x2="20" y2="19"></line>
                        </svg>
                        <h3 class="about-card__title">Ligne de Commande</h3>
                        <p class="about-card__text">
                            Linux, PowerShell, Bash. Administration de serveurs et VPS, automatisation.
                        </p>
                    </article>
                    
                    <article class="about-card reveal">
                        <svg class="about-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                            <path d="M2 17l10 5 10-5"></path>
                            <path d="M2 12l10 5 10-5"></path>
                        </svg>
                        <h3 class="about-card__title">Logiciels EBP</h3>
                        <p class="about-card__text">
                            SDK EBP, requêtage SQL, import/export de données. Développement d'applications métier.
                        </p>
                    </article>
                </div>
                
                <div class="tech-stack reveal" style="margin-top: var(--spacing-2xl);">
                    <span class="tech-badge">Python</span>
                    <span class="tech-badge">JavaScript</span>
                    <span class="tech-badge">HTML/CSS</span>
                    <span class="tech-badge">C/C++ (Arduino)</span>
                    <span class="tech-badge">Flutter</span>
                    <span class="tech-badge">Git</span>
                    <span class="tech-badge">WordPress</span>
                </div>
            </div>
        </section>

        <!-- Portfolio Section -->
        <section class="section" id="portfolio">
            <div class="container">
                <div class="section__header reveal">
                    <h2 class="section__title">Portfolio</h2>
                    <p class="section__subtitle">
                        Quelques réalisations récentes.
                    </p>
                </div>
                
                <div class="portfolio-grid">
                    <article class="portfolio-card reveal">
                        <div class="portfolio-card__image">
                            <svg class="portfolio-card__placeholder" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                            </svg>
                        </div>
                        <div class="portfolio-card__content">
                            <h3 class="portfolio-card__title">Application de Gestion</h3>
                            <p class="portfolio-card__description">
                                Application web métier développée avec Symfony pour la gestion de données clients et facturation.
                            </p>
                            <div class="portfolio-card__tags">
                                <span class="portfolio-card__tag">Symfony</span>
                                <span class="portfolio-card__tag">PHP</span>
                                <span class="portfolio-card__tag">MySQL</span>
                            </div>
                        </div>
                    </article>
                    
                    <article class="portfolio-card reveal">
                        <div class="portfolio-card__image">
                            <svg class="portfolio-card__placeholder" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                            </svg>
                        </div>
                        <div class="portfolio-card__content">
                            <h3 class="portfolio-card__title">Site E-commerce</h3>
                            <p class="portfolio-card__description">
                                Boutique en ligne avec gestion de catalogue, panier et paiement sécurisé.
                            </p>
                            <div class="portfolio-card__tags">
                                <span class="portfolio-card__tag">WordPress</span>
                                <span class="portfolio-card__tag">WooCommerce</span>
                                <span class="portfolio-card__tag">PHP</span>
                            </div>
                        </div>
                    </article>
                    
                    <article class="portfolio-card reveal">
                        <div class="portfolio-card__image">
                            <svg class="portfolio-card__placeholder" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                <polyline points="21 15 16 10 5 21"></polyline>
                            </svg>
                        </div>
                        <div class="portfolio-card__content">
                            <h3 class="portfolio-card__title">API RESTful</h3>
                            <p class="portfolio-card__description">
                                API de synchronisation de données entre logiciel EBP et application web personnalisée.
                            </p>
                            <div class="portfolio-card__tags">
                                <span class="portfolio-card__tag">Symfony</span>
                                <span class="portfolio-card__tag">API Platform</span>
                                <span class="portfolio-card__tag">SDK EBP</span>
                            </div>
                        </div>
                    </article>
                </div>
                
                <div class="github-cta reveal">
                    <p class="github-cta__text">
                        Retrouvez mes projets et contributions open source sur GitHub.
                    </p>
                    <a href="https://github.com/ALFClarel" target="_blank" rel="noopener noreferrer" class="btn btn--primary">
                        <svg class="btn__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        Voir mon GitHub
                    </a>
                </div>
            </div>
        </section>

        <!-- Contact Section -->
        <section class="section section--alt contact" id="contact">
            <div class="container">
                <div class="section__header reveal">
                    <h2 class="section__title">Contact</h2>
                    <p class="section__subtitle">
                        Un projet en tête ? Discutons-en.
                    </p>
                </div>
                
                <form class="contact__form reveal" action="#" method="POST">
                    <div class="form-group">
                        <label for="name" class="form-label">Nom</label>
                        <input type="text" id="name" name="name" class="form-input" required autocomplete="name">
                    </div>
                    
                    <div class="form-group">
                        <label for="email" class="form-label">Email</label>
                        <input type="email" id="email" name="email" class="form-input" required autocomplete="email">
                    </div>
                    
                    <div class="form-group">
                        <label for="subject" class="form-label">Sujet</label>
                        <input type="text" id="subject" name="subject" class="form-input" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="message" class="form-label">Message</label>
                        <textarea id="message" name="message" class="form-textarea" required></textarea>
                    </div>
                    
                    <button type="submit" class="btn btn--primary" style="width: 100%;">
                        <svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                        Envoyer
                    </button>
                </form>
                
                <div class="contact__info reveal">
                    <div class="contact__info-item">
                        <svg class="contact__info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        <span>Saint-Denis, La Réunion</span>
                    </div>
                    <div class="contact__info-item">
                        <svg class="contact__info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                            <polyline points="22,6 12,13 2,6"></polyline>
                        </svg>
                        <!-- Remplacer par votre email professionnel -->
                        <a href="mailto:contact@kardinal-solutions.re">contact@kardinal-solutions.re</a>
                    </div>
                </div>
            </div>
        </section>
    </main>

    <!-- Footer -->
    <footer class="footer" role="contentinfo">
        <div class="footer__inner">
            <div class="footer__top">
                <div class="footer__brand">
                    <div class="footer__logo">KarDinaL_Solutions</div>
                    <p class="footer__description">
                        Développeur d'applications web et services informatiques à La Réunion.
                    </p>
                </div>
                
                <div class="footer__section">
                    <h3 class="footer__section-title">Navigation</h3>
                    <ul class="footer__links">
                        <li><a href="#services-web" class="footer__link">Services Web</a></li>
                        <li><a href="#services-pc" class="footer__link">Services PC</a></li>
                        <li><a href="#competences" class="footer__link">Compétences</a></li>
                        <li><a href="#portfolio" class="footer__link">Portfolio</a></li>
                        <li><a href="#contact" class="footer__link">Contact</a></li>
                    </ul>
                </div>
                
                <div class="footer__section">
                    <h3 class="footer__section-title">Réseaux</h3>
                    <div class="footer__social">
                        <a href="https://github.com/ALFClarel" target="_blank" rel="noopener noreferrer" class="footer__social-link" aria-label="GitHub">
                            <svg class="footer__social-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                            </svg>
                        </a>
                        <a href="https://www.linkedin.com/in/clarel-grondin-336894282/" target="_blank" rel="noopener noreferrer" class="footer__social-link" aria-label="LinkedIn">
                            <svg class="footer__social-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                            </svg>
                        </a>
                        <!-- Ajoutez d'autres réseaux ici si nécessaire -->
                    </div>
                </div>
            </div>
            
            <div class="footer__bottom">
                <p class="footer__copyright">
                    © <span id="current-year">2025</span> KarDinaL_Solutions — GRONDIN Clarel. Tous droits réservés.
                </p>
                <div class="footer__legal">
                    <!-- Ajouter liens légaux si nécessaire -->
                </div>
            </div>
        </div>
    </footer>
    
    <!-- Scripts -->
    <script src="assets/js/config.js"></script>
    <script src="assets/js/main.js"></script>
    <script>
        // Mise à jour automatique de l'année
        document.getElementById('current-year').textContent = new Date().getFullYear();
    </script>
</body>
</html>
EOF

# ============================================================
# sitemap.xml
# ============================================================
cat << 'EOF' > "${PROJECT_NAME}/sitemap.xml"
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://kardinal-solutions.re/</loc>
        <lastmod>2025-01-01</lastmod>
        <changefreq>monthly</changefreq>
        <priority>1.0</priority>
    </url>
</urlset>
EOF

# ============================================================
# robots.txt
# ============================================================
cat << 'EOF' > "${PROJECT_NAME}/robots.txt"
# KarDinaL_Solutions - robots.txt
User-agent: *
Allow: /

Sitemap: https://kardinal-solutions.re/sitemap.xml
EOF

# ============================================================
# README_DEPLOY.md
# ============================================================
cat << 'EOF' > "${PROJECT_NAME}/README_DEPLOY.md"
# KarDinaL_Solutions - Guide de Déploiement

## Prérequis
- Serveur Linux avec Apache2
- Accès SSH au serveur

## Fichiers à personnaliser

### 1. Configuration (`assets/js/config.js`)
Modifier les informations suivantes :
- `contact.email` : Votre email professionnel
- `contact.phone` : Votre numéro (optionnel)
- `legal.siret` : Votre numéro SIRET (si applicable)
- `seo.siteUrl` : Votre nom de domaine

### 2. SEO et Meta (`index.html`)
- Mettre à jour les balises `<link rel="canonical">` avec votre domaine
- Mettre à jour les balises Open Graph `og:url`
- Mettre à jour le JSON-LD avec votre URL

### 3. Sitemap (`sitemap.xml`)
- Remplacer `https://kardinal-solutions.re/` par votre domaine

### 4. Robots.txt
- Remplacer l'URL du sitemap par votre domaine

## Déploiement sur Apache

### 1. Copier les fichiers
```bash
scp -r KarDinaL_Solutions/* user@server:/var/www/html/kardinal-solutions/
```

### 2. Permissions
```bash
sudo chown -R www-data:www-data /var/www/html/kardinal-solutions/
sudo chmod -R 755 /var/www/html/kardinal-solutions/
```

### 3. Configuration Apache (VirtualHost)
```apache
<VirtualHost *:80>
    ServerName kardinal-solutions.re
    ServerAlias www.kardinal-solutions.re
    DocumentRoot /var/www/html/kardinal-solutions
    
    <Directory /var/www/html/kardinal-solutions>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    
    # Compression Gzip
    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml
    </IfModule>
    
    # Cache
    <IfModule mod_expires.c>
        ExpiresActive On
        ExpiresByType text/css "access plus 1 month"
        ExpiresByType application/javascript "access plus 1 month"
        ExpiresByType image/svg+xml "access plus 1 month"
    </IfModule>
    
    ErrorLog ${APACHE_LOG_DIR}/kardinal-error.log
    CustomLog ${APACHE_LOG_DIR}/kardinal-access.log combined
</VirtualHost>
```

### 4. Activer le site
```bash
sudo a2ensite kardinal-solutions.conf
sudo a2enmod deflate expires headers
sudo systemctl reload apache2
```

### 5. SSL avec Certbot (recommandé)
```bash
sudo apt install certbot python3-certbot-apache
sudo certbot --apache -d kardinal-solutions.re -d www.kardinal-solutions.re
```

## Structure des fichiers
```
/var/www/html/kardinal-solutions/
├── index.html
├── assets/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── config.js
│   │   └── main.js
│   └── img/
├── sitemap.xml
└── robots.txt
```

## Vérifications post-déploiement
1. Tester le site sur mobile et desktop
2. Vérifier le thème clair/sombre
3. Tester le formulaire de contact
4. Vérifier les liens vers GitHub et LinkedIn
5. Tester avec Lighthouse (objectif > 90 partout)
6. Valider le HTML sur validator.w3.org

## Logo
Remplacer l'icône SVG dans le header par votre logo :
- Fichier : `index.html`
- Rechercher : `header__logo-icon`
- Remplacer le SVG par votre logo ou une balise `<img>`

## Support
Pour toute question, contactez le développeur.
EOF

# ============================================================
# Création de l'archive ZIP
# ============================================================
echo "📦 Création de l'archive ${ZIP_NAME}..."
zip -r "${ZIP_NAME}" "${PROJECT_NAME}"

echo ""
echo "✅ Build terminé avec succès !"
echo ""
echo "📁 Fichiers créés :"
find "${PROJECT_NAME}" -type f | sort
echo ""
echo "📦 Archive : ${ZIP_NAME}"
echo ""
echo "📖 Consultez README_DEPLOY.md pour les instructions de déploiement."
EOF

chmod +x /home/claude/KarDinaL_Solutions/build_zip.sh

echo "Script build_zip.sh créé avec succès !"
