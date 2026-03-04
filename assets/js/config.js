/**
 * KarDinaL_Solutions - Configuration centralisée
 * Modifier les valeurs ci-dessous selon vos besoins
 */
const CONFIG = {
    // Informations de contact
    contact: {
        email: 'kardinalalpha@protonmail.com', // À remplacer par votre email professionnel
        phone: '', // Optionnel : '+262 693 20 57 27'
        location: 'Saint-Denis, La Réunion',
        // Formspree : créez un compte gratuit sur https://formspree.io
        // puis remplacez la valeur ci-dessous par votre endpoint (ex: 'https://formspree.io/f/XXXXXXXX')
        formspree: '', // Laisser vide = fallback mailto
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
        siteUrl: 'https://me.kdlsolutions.re', // À remplacer par votre domaine
        title: 'KarDinaL_Solutions | Développeur Web & Services PC',
        description: 'Développeur d\'applications web Symfony et services informatiques à La Réunion. Sites vitrines, applications web, APIs, assemblage et réparation PC.',
    }
};

// Export pour utilisation dans main.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
