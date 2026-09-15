#!/bin/bash
# Clear cached packages.php and services.php to avoid stale service providers
rm -f /var/www/bootstrap/cache/packages.php
rm -f /var/www/bootstrap/cache/services.php

# Clear config cache
php artisan config:clear 2>/dev/null || true

# Execute the main command
exec "$@"