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
