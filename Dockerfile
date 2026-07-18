FROM php:8.2-apache

# Installer les extensions PHP nécessaires pour MySQL et les fichiers
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    zip \
    unzip \
    && docker-php-ext-install pdo pdo_mysql \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install gd \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Activer mod_rewrite d'Apache pour les URLs propres
RUN a2enmod rewrite

# Copier tous les fichiers du projet dans le répertoire web d'Apache
COPY . /var/www/html/

# Donner les bons droits au dossier uploads (pour les fichiers uploadés)
RUN mkdir -p /var/www/html/api/uploads \
    && chown -R www-data:www-data /var/www/html/api/uploads \
    && chmod -R 775 /var/www/html/api/uploads

# Configurer Apache pour autoriser .htaccess et les options de réécriture
RUN echo '<Directory /var/www/html/>\n\
    Options Indexes FollowSymLinks\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>' > /etc/apache2/conf-available/lms-pro.conf \
    && a2enconf lms-pro

# Le port 80 est utilisé par Apache par défaut
EXPOSE 80

# Démarrer Apache en avant-plan
CMD ["apache2-foreground"]
