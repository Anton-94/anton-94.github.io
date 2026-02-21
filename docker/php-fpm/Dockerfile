FROM php:8.4-fpm

RUN apt update && \
    apt-get install -y --no-install-recommends libssl-dev zlib1g-dev curl git unzip libxml2-dev libpq-dev libzip-dev && \
    docker-php-ext-install intl opcache pdo pdo_mysql && \
    pecl install apcu && \
    docker-php-ext-configure pgsql -with-pgsql=/usr/local/pgsql && \
    docker-php-ext-install -j$(nproc) zip opcache intl pdo_pgsql pgsql bcmath && \
    docker-php-ext-enable apcu pdo_pgsql sodium

# Установка системных зависимостей и ImageMagick
RUN apt-get update \
    && apt-get install -y libmagickwand-dev --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

RUN apt-get update \
    && apt-get install -y libfreetype6-dev libjpeg62-turbo-dev libpng-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) gd

# Установка и активация расширения Imagick
RUN pecl install imagick \
    && docker-php-ext-enable imagick

COPY policy.xml /etc/ImageMagick-6/
# Копирование PHP-конфигурационного файла с настройками Imagick
#COPY php.ini /usr/local/etc/php/conf.d/imagick.ini

# Install Composer
RUN curl -sS https://getcomposer.org/installer | php -- \
    --install-dir=/usr/bin --filename=composer && chmod +x /usr/bin/composer

COPY php.ini /usr/local/etc/php

WORKDIR /var/www

EXPOSE 9000
