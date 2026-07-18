FROM php:8.2-apache

# Installer les extensions PHP nécessaires
RUN apt-get update && apt-get install -y \
    libpq-dev \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    zip \
    unzip \
    && docker-php-ext-install pdo pdo_pgsql \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install gd \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Activer mod_rewrite
RUN a2enmod rewrite headers

# Copier les fichiers du projet
COPY . /var/www/html/

# Créer et sécuriser le dossier uploads
RUN mkdir -p /var/www/html/api/uploads/pdf \
             /var/www/html/api/uploads/video \
    && chown -R www-data:www-data /var/www/html/api/uploads \
    && chmod -R 775 /var/www/html/api/uploads

# Configuration Apache
RUN echo '<Directory /var/www/html/>\n\
    Options Indexes FollowSymLinks\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>' > /etc/apache2/conf-available/lms-pro.conf \
    && a2enconf lms-pro

EXPOSE 80

CMD ["apache2-foreground"]
