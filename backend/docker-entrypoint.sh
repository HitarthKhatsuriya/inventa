#!/bin/bash
set -e

# Generate app key if not set
if [ -z "$APP_KEY" ]; then
    php artisan key:generate --force
fi

# Create SQLite database if using SQLite
if [ "$DB_CONNECTION" = "sqlite" ] || [ -z "$DB_CONNECTION" ]; then
    touch database/database.sqlite
    chown www-data:www-data database/database.sqlite
fi

# Ensure storage directories exist and have proper permissions
mkdir -p storage/logs storage/framework/cache/data storage/framework/sessions storage/framework/views storage/framework/testing
chown -R www-data:www-data storage bootstrap/cache database
chmod -R 775 storage bootstrap/cache database

# Clear and cache config
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Run migrations
php artisan migrate --force

# Seed database if it's empty (first deploy)
php artisan db:seed --force 2>/dev/null || true

# Cache config for production
php artisan config:cache
php artisan route:cache

echo "âœ… MEDIQ Backend ready!"

exec "$@"
