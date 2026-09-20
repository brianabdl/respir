#!/bin/sh
set -e

# Runtime env is only known here, so cache config/routes/views/events per container.
php artisan optimize

exec "$@"
