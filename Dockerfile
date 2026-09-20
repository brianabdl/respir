# syntax=docker/dockerfile:1

ARG PHP_VERSION=8.5

# ---- Shared PHP runtime: extensions + production php.ini / php-fpm pool ----
FROM php:${PHP_VERSION}-fpm-bookworm AS base

COPY --from=ghcr.io/mlocati/php-extension-installer:2 /usr/bin/install-php-extensions /usr/local/bin/
RUN install-php-extensions bcmath exif gd opcache pcntl pdo_pgsql pgsql redis

RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

COPY <<'EOF' /usr/local/etc/php/conf.d/zz-app.ini
expose_php = Off
memory_limit = 256M
max_execution_time = 120
upload_max_filesize = 64M
post_max_size = 66M
opcache.enable = 1
opcache.validate_timestamps = 0
opcache.memory_consumption = 192
opcache.interned_strings_buffer = 16
opcache.max_accelerated_files = 20000
realpath_cache_size = 4096K
realpath_cache_ttl = 600
EOF

COPY <<'EOF' /usr/local/etc/php-fpm.d/zz-app.conf
[www]
clear_env = no
pm = dynamic
pm.max_children = 20
pm.start_servers = 4
pm.min_spare_servers = 2
pm.max_spare_servers = 6
pm.max_requests = 500
EOF

WORKDIR /var/www

# ---- Composer dependencies (no dev) + optimized autoloader ----
FROM base AS vendor

ENV COMPOSER_ALLOW_SUPERUSER=1 COMPOSER_CACHE_DIR=/tmp/composer-cache
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
RUN install-php-extensions zip

COPY composer.json composer.lock ./
RUN --mount=type=cache,target=/tmp/composer-cache \
    composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

COPY . .
RUN mkdir -p bootstrap/cache storage/app/private storage/app/public storage/framework/cache/data \
        storage/framework/sessions storage/framework/views storage/logs \
    && composer dump-autoload --no-dev --optimize --no-interaction

# ---- JS dependencies ----
FROM oven/bun:1 AS js-deps

WORKDIR /app
COPY package.json bun.lock .npmrc ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

# ---- Frontend build (Vite bakes VITE_* in at build time; the Wayfinder plugin needs php + vendor) ----
FROM vendor AS assets

COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun
COPY --from=node:22-bookworm-slim /usr/local/bin/node /usr/local/bin/node
COPY --from=js-deps /app/node_modules ./node_modules

ARG VITE_APP_NAME=Laravel
ARG VITE_REVERB_APP_KEY
ARG VITE_REVERB_HOST
ARG VITE_REVERB_PORT=443
ARG VITE_REVERB_SCHEME=https
ENV VITE_APP_NAME=$VITE_APP_NAME \
    VITE_REVERB_APP_KEY=$VITE_REVERB_APP_KEY \
    VITE_REVERB_HOST=$VITE_REVERB_HOST \
    VITE_REVERB_PORT=$VITE_REVERB_PORT \
    VITE_REVERB_SCHEME=$VITE_REVERB_SCHEME

RUN bun run build

# ---- PHP app image: php-fpm, queue worker, reverb, migrate ----
FROM base AS app

COPY --from=vendor --chown=www-data:www-data /var/www /var/www
COPY --from=assets --chown=www-data:www-data /var/www/public /var/www/public
COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

USER www-data

EXPOSE 9000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["php-fpm"]

# ---- Edge: Caddy serves static assets and proxies PHP + WebSockets ----
FROM caddy:2-alpine AS web

COPY --from=app /var/www/public /var/www/public
