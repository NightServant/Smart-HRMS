FROM php:8.4-cli-bookworm

ENV APP_ENV=production \
    COMPOSER_ALLOW_SUPERUSER=1 \
    IWR_PYTHON_PATH=/opt/venv/bin/python \
    PPE_PYTHON_PATH=/opt/venv/bin/python \
    ATRE_PYTHON_PATH=/opt/venv/bin/python \
    FLATFAT_PYTHON_PATH=/opt/venv/bin/python

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    gnupg \
    libfreetype6-dev \
    libicu-dev \
    libjpeg62-turbo-dev \
    libonig-dev \
    libpng-dev \
    libxml2-dev \
    libzip-dev \
    python3 \
    python3-pip \
    python3-venv \
    unzip \
    zip \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update && apt-get install -y --no-install-recommends nodejs \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" bcmath gd intl mbstring pcntl pdo_mysql zip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY composer.json composer.lock package.json package-lock.json ./
COPY python ./python

RUN composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader --no-scripts
RUN npm ci
RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir --upgrade pip setuptools wheel \
    && /opt/venv/bin/pip install --no-cache-dir \
        -r python/iwr/requirements.txt \
        -r python/ppe/requirements.txt \
        -r python/atre/requirements.txt

COPY . .

RUN composer dump-autoload --optimize --no-dev \
    && php artisan package:discover --ansi
RUN npm run build

EXPOSE 8080

CMD ["sh", "./start-server.sh"]
